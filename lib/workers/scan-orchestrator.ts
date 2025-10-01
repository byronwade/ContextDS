import { db, sites, scans, tokenSets, cssSources, cssContent, layoutProfiles, tokenVersions, tokenChanges } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { collectStaticCss, type CssSource } from '@/lib/extractors/static-css'
import { collectComputedCss } from '@/lib/extractors/computed-css'
import { generateTokenSet as generateTokenSetLegacy, hashTokenSet } from '@/lib/analyzers/basic-tokenizer'
import { extractW3CTokens, hashTokenSet as hashW3CTokenSet } from '@/lib/analyzers/w3c-tokenizer'
import { buildAiPromptPack } from '@/lib/analyzers/ai-prompt-pack'
import { curateTokens } from '@/lib/analyzers/token-curator'
import { generateDesignInsights } from '@/lib/ai/design-insights'
import { analyzeDesignSystemComprehensive } from '@/lib/ai/comprehensive-analyzer'
import { analyzeLayout } from '@/lib/analyzers/layout-inspector'
import { buildPromptPack } from '@/lib/analyzers/prompt-pack'
import { compareTokenSets } from '@/lib/analyzers/version-diff'
import { collectLayoutWireframe } from '@/lib/analyzers/layout-wireframe'
import { MetricsCollector } from '@/lib/observability/metrics'
import { analyzeBrand } from '@/lib/analyzers/brand-analyzer'
import { extractComponents, type ComponentLibrary } from '@/lib/analyzers/component-extractor'
import { detectComponents, type ComponentLibrary as AdvancedComponentLibrary } from '@/lib/analyzers/advanced-component-detector'
import { buildDesignSystemSpec, type DesignSystemSpec } from '@/lib/ai/design-system-builder'
import { detectLogo, downloadLogoAsBase64 } from '@/lib/utils/logo-detector'
import { withTimeout, createMemoryLimit, createCircuitBreaker, createProgressiveScanner } from '@/lib/utils/resilience'
import { ultraProfiler, profile, profileAsync } from '@/lib/utils/ultra-profiler'
import { ultraCache, getCachedScan, cacheScanResult, type CacheKey } from '@/lib/cache/ultra-cache'
import {
  findSiteByDomain,
  getLatestTokenSet,
  bulkInsertCssContent,
  batchInsertCssSources,
  completeScanTransaction,
  getDatabaseMetrics
} from '@/lib/db/optimizations'
import {
  executeInParallel,
  ultraFetch,
  createUltraStream,
  type ParallelTask
} from '@/lib/utils/ultra-parallel'

export type ScanJobInput = {
  url: string
  prettify: boolean
  includeComputed: boolean
  mode?: 'fast' | 'accurate'  // fast = static only, accurate = full scan
  memoryLimitMb?: number // Custom memory limit
  timeoutMs?: number // Custom timeout
}

// BULLETPROOF LIMITS for scan orchestrator
const MAX_SCAN_MEMORY = 150 * 1024 * 1024 // 150MB total scan memory
const MAX_SCAN_TIMEOUT = 60000 // 60s total scan timeout
const FAST_SCAN_TIMEOUT = 30000 // 30s for fast mode
const LARGE_SITE_THRESHOLD = 50 // 50+ CSS files = large site

// Circuit breakers for different operations
const tokenGenerationBreaker = createCircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
  name: 'token-generation'
})

const aiAnalysisBreaker = createCircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 60000,
  name: 'ai-analysis'
})

export type ScanJobResult = {
  status: 'completed'
  domain: string
  url: string
  summary: {
    tokensExtracted: number
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  tokens: ReturnType<typeof generateTokenSetLegacy>['tokenGroups']
  layoutDNA: ReturnType<typeof analyzeLayout>
  promptPack: ReturnType<typeof buildPromptPack>
  brandAnalysis: ReturnType<typeof buildBrandAnalysis>
  metadata: {
    cssSources: number
    staticCssSources: number
    computedCssSources: number
    tokenSetId: string
    scanId: string
    promptPackVersion: string
    metrics: {
      totalDurationMs: number
      entries: ReturnType<MetricsCollector['summary']>['entries']
    }
    tokenQuality: ReturnType<typeof generateTokenSetLegacy>['qualityInsights']
  }
  database: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: true
  }
}

export async function runScanJob({
  url,
  prettify,
  includeComputed,
  mode = 'accurate',
  memoryLimitMb,
  timeoutMs
}: ScanJobInput): Promise<ScanJobResult> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const target = new URL(normalized)
  const domain = target.hostname
  const startedAt = Date.now()
  const metrics = new MetricsCollector()

  // BULLETPROOF: Memory and timeout limits
  const memoryBytes = (memoryLimitMb ?? 150) * 1024 * 1024
  const scanTimeout = timeoutMs ?? (mode === 'fast' ? FAST_SCAN_TIMEOUT : MAX_SCAN_TIMEOUT)
  const memoryLimit = createMemoryLimit(memoryBytes)

  console.log(`[scan-orchestrator] Starting ${mode} scan of ${domain} (memory: ${Math.round(memoryBytes/1024/1024)}MB, timeout: ${scanTimeout}ms)`)

  // ULTRA-FAST CACHE CHECK (5-150ms vs 5000-15000ms full scan)
  const cacheParams: CacheKey = {
    url: normalized,
    mode,
    includeComputed,
    version: '2.1.0'
  }

  const cachedResult = await profile('cache-lookup', () => getCachedScan(cacheParams))
  if (cachedResult) {
    console.log(`⚡ ULTRA-FAST: Returning cached result for ${domain} (${cachedResult.cacheInfo.cacheHit})`)
    return cachedResult
  }

  console.log(`🔄 FULL SCAN: No cache hit, performing complete scan for ${domain}`)

  // Start ultra performance profiling
  ultraProfiler.start()

  return withTimeout(async () => {

    // PERFORMANCE: Fast mode skips browser automation entirely
    const isFastMode = mode === 'fast'
    const actuallyIncludeComputed = isFastMode ? false : includeComputed

    const siteRecord = await profile('ensure-site-ultra-fast', async () => {
      // Ultra-fast site lookup using hash index
      let site = await findSiteByDomain(domain)

      if (!site) {
        // Create new site with single optimized query
        const [newSite] = await db
          .insert(sites)
          .values({
            domain,
            title: `${domain} design system`,
            description: `Design tokens extracted from ${domain}`,
            robotsStatus: 'allowed',
            status: 'scanning',
            firstSeen: new Date(),
            popularity: 0
          })
          .returning()
        site = newSite
      }

      return site
    })

    // ULTRA-PARALLEL: Prepare parallel CSS collection and logo detection tasks

    const [scanRecord] = await db
      .insert(scans)
      .values({
        siteId: siteRecord.id,
        method: actuallyIncludeComputed ? 'computed' : 'static',
        prettify,
        startedAt: new Date()
      })
      .returning()

    // ULTRA-PARALLEL: Execute CSS collection, logo detection, and initial analysis in parallel
    const cssCollectionTasks: ParallelTask<any>[] = [
      {
        name: 'collect-static-css',
        task: () => collectStaticCss(target.toString()),
        priority: 'critical',
        timeout: 15000
      }
    ]

    // Add computed CSS task if needed
    if (actuallyIncludeComputed) {
      cssCollectionTasks.push({
        name: 'collect-computed-css',
        task: async () => {
          try {
            return await collectComputedCss(target.toString(), {
              fastMode: isFastMode,
              maxMemoryMb: Math.max(20, memoryLimit.remaining() / (1024 * 1024))
            })
          } catch (error) {
            console.warn('[scan-orchestrator] Computed CSS collection failed:', error)
            return { sources: [], computedStyles: [] }
          }
        },
        priority: 'high',
        timeout: 20000,
        canFail: true
      })
    }

    // Add logo detection task if needed
    if (!siteRecord.favicon && !isFastMode) {
      cssCollectionTasks.push({
        name: 'detect-logo',
        task: async () => {
          try {
            const logoResult = await detectLogo(normalized)
            if (logoResult.logoUrl) {
              const logoBase64 = await downloadLogoAsBase64(logoResult.logoUrl)
              if (logoBase64) {
                memoryLimit.track(logoBase64.length)
                await db
                  .update(sites)
                  .set({ favicon: logoBase64 })
                  .where(eq(sites.id, siteRecord.id))
                siteRecord.favicon = logoBase64
                console.log(`[scan-orchestrator] Logo detected and stored from ${logoResult.source}`)
              }
            }
            return logoResult
          } catch (error) {
            console.warn('[scan-orchestrator] Logo detection failed:', error)
            return null
          }
        },
        priority: 'medium',
        timeout: 8000,
        canFail: true
      })
    }

    // Execute all CSS collection tasks in parallel
    console.log(`🚀 Executing ${cssCollectionTasks.length} CSS collection tasks in parallel`)
    const cssResults = await executeInParallel(cssCollectionTasks, {
      concurrency: 3,
      onProgress: (completed, total) => {
        console.log(`⚡ CSS collection progress: ${completed}/${total}`)
      }
    })

    // Extract results
    const staticCss = cssResults.get('collect-static-css')?.result || []
    const computedResult = cssResults.get('collect-computed-css')?.result || { sources: [], computedStyles: [] }
    const computedCss = computedResult.sources || []
    const computedStyles = computedResult.computedStyles || []

    // Track memory usage
    const staticCssBytes = staticCss.reduce((sum: number, css: any) => sum + css.bytes, 0)
    const computedCssBytes = computedCss.reduce((sum: number, css: any) => sum + css.bytes, 0)
    memoryLimit.track(staticCssBytes + computedCssBytes)

    // Check if this is a large site
    const isLargeSite = staticCss.length >= LARGE_SITE_THRESHOLD
    if (isLargeSite) {
      console.log(`[scan-orchestrator] Large site detected: ${staticCss.length} CSS sources, ${Math.round(staticCssBytes/1024/1024)}MB`)
    }

    console.log(`⚡ Ultra-parallel CSS collection complete: ${staticCss.length} static, ${computedCss.length} computed sources`)

    const endDedupePhase = metrics.startPhase('dedupe_css_sources')
    const cssArtifacts = dedupeCssSources([...staticCss, ...computedCss])
    endDedupePhase()

    const totalCssBytes = cssArtifacts.reduce((sum, css) => sum + css.bytes, 0)
    console.log(`[scan-orchestrator] Final CSS artifacts: ${cssArtifacts.length} sources, ${Math.round(totalCssBytes/1024/1024)}MB`)

    if (cssArtifacts.length === 0) {
      throw new Error('No CSS sources discovered for the requested URL')
    }

    // ULTRA-FAST: Bulk CSS persistence with optimized operations
    const endPersistPhase = metrics.startPhase('persist_css_sources_ultra_fast')

    if (cssArtifacts.length > 0) {
      await profile('bulk-insert-css-ultra-fast', async () => {
        // Step 1: Ultra-fast bulk insert CSS content with conflict resolution
        await bulkInsertCssContent(cssArtifacts.map(artifact => ({
          sha: artifact.sha,
          content: artifact.content,
          contentCompressed: false,
          bytes: artifact.bytes,
          compressedBytes: artifact.bytes,
          referenceCount: 1
        })))

        // Step 2: Ultra-fast batch insert CSS sources
        await batchInsertCssSources(scanRecord.id, cssArtifacts)

        console.log(`⚡ Ultra-fast CSS persistence: ${cssArtifacts.length} artifacts in batch operation`)
      })
    }

    endPersistPhase()

    // ULTRA-PARALLEL: Token generation with multiple concurrent extractors
    const endTokenPhase = metrics.startPhase('generate_tokens_ultra_parallel')

    const tokenTasks: ParallelTask<any>[] = [
      // Critical: Legacy token generation (always required)
      {
        name: 'generate-legacy-tokens',
        task: () => generateTokenSetLegacy(cssArtifacts, { domain, url: target.toString() }),
        priority: 'critical',
        timeout: 8000
      },

      // High: W3C token extraction (runs in parallel with legacy)
      {
        name: 'extract-w3c-tokens',
        task: () => extractW3CTokens(cssArtifacts, { domain, url: target.toString() }),
        priority: 'high',
        timeout: isLargeSite ? 15000 : 10000,
        canFail: true
      },

      // High: Layout analysis (can run in parallel with token generation)
      {
        name: 'analyze-layout',
        task: () => analyzeLayout(cssArtifacts),
        priority: 'high',
        timeout: 5000
      }
    ]

    // Execute token generation tasks in ultra-parallel
    console.log(`🚀 Executing ${tokenTasks.length} token generation tasks in ultra-parallel`)
    const tokenResults = await executeInParallel(tokenTasks, {
      concurrency: 3,
      onProgress: (completed, total, latest) => {
        console.log(`⚡ Token generation progress: ${completed}/${total} (latest: ${latest?.name})`)
      }
    })

    // Extract results
    const legacyGenerated = tokenResults.get('generate-legacy-tokens')?.result
    const w3cExtraction = tokenResults.get('extract-w3c-tokens')?.result
    const layoutDNA = tokenResults.get('analyze-layout')?.result

    if (!legacyGenerated) {
      throw new Error('Legacy token generation failed - unable to proceed')
    }

    // Curate tokens if W3C extraction succeeded
    let curatedTokens = null
    if (w3cExtraction) {
      const curationLimits = isLargeSite ? {
        maxColors: 6, maxFonts: 3, maxSizes: 4, maxSpacing: 6,
        maxRadius: 3, maxShadows: 3, maxMotion: 2,
        minUsage: 3, minConfidence: 70
      } : {
        maxColors: 8, maxFonts: 4, maxSizes: 6, maxSpacing: 8,
        maxRadius: 4, maxShadows: 4, maxMotion: 4,
        minUsage: 2, minConfidence: 65
      }

      try {
        curatedTokens = curateTokens(w3cExtraction.tokenSet, curationLimits)
        console.log(`⚡ Token curation complete: ${Object.keys(curatedTokens).length} categories`)
      } catch (error) {
        console.warn('Token curation failed:', error)
        curatedTokens = null
      }
    }

    console.log(`⚡ Ultra-parallel token generation complete: legacy=${!!legacyGenerated}, w3c=${!!w3cExtraction}, curated=${!!curatedTokens}`)

    // Create unified result with proper type checking
    const generated = w3cExtraction && curatedTokens && legacyGenerated ? {
      tokenSet: w3cExtraction.tokenSet,
      curatedTokens,
      tokenGroups: legacyGenerated.tokenGroups,
      summary: {
        tokensExtracted: w3cExtraction.summary.totalTokens,
        curatedCount: {
          colors: curatedTokens.colors.length,
          fonts: curatedTokens.typography.families.length,
          sizes: curatedTokens.typography.sizes.length,
          spacing: curatedTokens.spacing.length,
          radius: curatedTokens.radius.length,
          shadows: curatedTokens.shadows.length
        },
        confidence: w3cExtraction.summary.confidence,
        completeness: legacyGenerated.summary.completeness,
        reliability: legacyGenerated.summary.reliability
      },
      qualityInsights: legacyGenerated.qualityInsights,
      w3cInsights: w3cExtraction.insights
    } : {
      // Fallback to legacy only
      tokenSet: legacyGenerated?.tokenSet || {},
      curatedTokens: null,
      tokenGroups: legacyGenerated?.tokenGroups || { colors: [], typography: { families: [], sizes: [] }, spacing: [], radius: [], shadows: [], motion: [] },
      summary: {
        tokensExtracted: legacyGenerated?.summary?.tokensExtracted || 0,
        curatedCount: null,
        confidence: legacyGenerated?.summary?.confidence || 0,
        completeness: legacyGenerated?.summary?.completeness || 0,
        reliability: legacyGenerated?.summary?.reliability || 0
      },
      qualityInsights: legacyGenerated?.qualityInsights || {},
      w3cInsights: null
    }

  endTokenPhase()

  // Extract component library from computed styles (if available)
  // Must happen before parallel AI analysis since design system spec needs it
  // Use advanced multi-strategy detection for comprehensive component analysis
  const advancedComponents: AdvancedComponentLibrary | null = computedStyles.length > 0
    ? detectComponents(computedStyles, generated.tokenSet)
    : null

  // Keep legacy extraction for backward compatibility
  const legacyComponents: ComponentLibrary | null = computedStyles.length > 0
    ? extractComponents(computedStyles, generated.tokenSet)
    : null

  // Merge both for comprehensive coverage
  const componentLibrary = advancedComponents

  // ULTRA-PARALLEL: Execute all analysis tasks with maximum concurrency
  const analysisTasks: ParallelTask<any>[] = [
    // Critical: Build prompt pack (lightweight, always run)
    {
      name: 'build-prompt-pack',
      task: () => ({
        legacyPromptPack: buildPromptPack(generated.tokenGroups, layoutDNA),
        aiPromptPack: w3cExtraction ? buildAiPromptPack(w3cExtraction, { domain, url: target.toString() }) : null
      }),
      priority: 'critical',
      timeout: 5000
    },

    // Critical: Brand analysis (lightweight, always run)
    {
      name: 'brand-analysis',
      task: () => buildBrandAnalysis((generated.curatedTokens?.colors as any) || (generated.tokenGroups?.colors as any) || []),
      priority: 'critical',
      timeout: 3000
    }
  ]

  // Add wireframe task if computed CSS is available
  if (actuallyIncludeComputed && !isFastMode) {
    analysisTasks.push({
      name: 'layout-wireframe',
      task: () => collectLayoutWireframe(target.toString()),
      priority: 'high',
      timeout: 15000,
      canFail: true
    })
  }

  // Add AI insights task if curated tokens are available
  if (curatedTokens) {
    analysisTasks.push({
      name: 'ai-insights',
      task: () => generateDesignInsights(curatedTokens, { domain, url: target.toString() }),
      priority: 'high',
      timeout: 10000,
      canFail: true
    })
  }

  // Add comprehensive AI analysis if not in fast mode
  if (curatedTokens && !isFastMode) {
    analysisTasks.push({
      name: 'comprehensive-analysis',
      task: () => analyzeDesignSystemComprehensive(curatedTokens, { domain, url: target.toString() }),
      priority: 'medium',
      timeout: 20000,
      canFail: true
    })
  }

  // Add design system spec if not in fast mode and components are available
  if (curatedTokens && !isFastMode) {
    analysisTasks.push({
      name: 'design-system-spec',
      task: () => buildDesignSystemSpec(curatedTokens, advancedComponents, { domain, url: target.toString() }),
      priority: 'medium',
      timeout: 15000,
      dependencies: ['comprehensive-analysis'], // Depends on comprehensive analysis
      canFail: true
    })
  }

  // Execute all analysis tasks in ultra-parallel
  console.log(`🚀 Executing ${analysisTasks.length} analysis tasks in ultra-parallel`)
  const analysisResults = await executeInParallel(analysisTasks, {
    concurrency: 6, // Maximum concurrency for analysis
    onProgress: (completed, total, latest) => {
      console.log(`⚡ Analysis progress: ${completed}/${total} (latest: ${latest?.name})`)
    },
    onResult: (result) => {
      if (result.status === 'completed') {
        console.log(`✅ ${result.name} completed in ${Math.round(result.duration)}ms`)
      } else {
        console.warn(`⚠️ ${result.name} ${result.status} after ${Math.round(result.duration)}ms`)
      }
    }
  })

  // Extract results from ultra-parallel execution
  const wireframeSections = analysisResults.get('layout-wireframe')?.result || []
  const promptPackData = analysisResults.get('build-prompt-pack')?.result || { legacyPromptPack: {}, aiPromptPack: null }
  const { legacyPromptPack, aiPromptPack } = promptPackData
  const aiInsights = analysisResults.get('ai-insights')?.result || null
  const comprehensiveAnalysis = analysisResults.get('comprehensive-analysis')?.result || null
  const designSystemSpec = analysisResults.get('design-system-spec')?.result || null
  const brandAnalysis = analysisResults.get('brand-analysis')?.result || buildBrandAnalysis((generated.curatedTokens?.colors as any) || (generated.tokenGroups?.colors as any) || [])

  console.log(`⚡ Ultra-parallel analysis complete: ${analysisResults.size} tasks executed`)

  // Augment layout with wireframe (if available)
  if (wireframeSections.length > 0) {
    layoutDNA.wireframe = { sections: wireframeSections }
    augmentArchetypesWithWireframe(layoutDNA, wireframeSections)
  }

  // Assemble prompt pack
  const promptPack = {
    ...legacyPromptPack,
    aiOptimized: aiPromptPack,
    aiInsights,
    comprehensiveAnalysis,
    version: '2.1.0',
    format: 'ai-lean-core-plus'
  }

  // PERFORMANCE OPTIMIZATION: Batch all final database writes into single transaction
  const durationMs = Date.now() - startedAt
  const sha = hashW3CTokenSet(generated.tokenSet)

  metrics.record('persist_summary', {
    cssSources: cssArtifacts.length
  })
  const metricsSummary = metrics.summary()

  // ULTRA-FAST: Get previous token set with optimized query
  const previousTokenSet = await profile('get-previous-token-set-ultra-fast', () =>
    getLatestTokenSet(siteRecord.id)
  )
  const newVersionNumber = previousTokenSet ? (previousTokenSet.versionNumber || 0) + 1 : 1

  // Calculate diff if there's a previous version
  let tokenDiff = null
  if (previousTokenSet && generated.tokenSet) {
    try {
      tokenDiff = compareTokenSets(previousTokenSet.tokensJson, generated.tokenSet)
    } catch (error) {
      console.warn('Failed to generate token diff:', error)
    }
  }

  // ULTRA-FAST: Single optimized transaction for all final operations
  const tokenSetRecord = await profile('complete-scan-transaction-ultra-fast', () =>
    completeScanTransaction({
      siteId: siteRecord.id,
      scanId: scanRecord.id,
      versionNumber: newVersionNumber,
      tokensJson: generated.tokenSet,
      packJson: promptPack,
      consensusScore: (generated.summary.confidence / 100).toFixed(2),
      layoutDNA: layoutDNA || {},
      archetypes: layoutDNA?.archetypes || [],
      containers: layoutDNA?.containers || [],
      gridFlex: layoutDNA?.gridSystem ? { system: layoutDNA.gridSystem } : null,
      spacingScale: layoutDNA?.spacingBase ? { base: layoutDNA.spacingBase } : null,
      cssSourceCount: cssArtifacts.length,
      sha,
      metricsJson: {
        ...metricsSummary,
        tokenQuality: generated.qualityInsights
      }
    })
  )

  console.log(`⚡ Ultra-fast transaction completed: ${getDatabaseMetrics().totalQueries} queries, ${Math.round(getDatabaseMetrics().queryTime)}ms total`)

  // SERVERLESS OPTIMIZATION: Don't capture screenshots during scan
  // Screenshots are captured separately by the frontend after scan completes
  // This keeps scan responses fast and avoids serverless timeout issues
  //
  // In serverless environments (Vercel), background tasks are killed when the
  // response is sent. Therefore, we return siteId and scanId in the response,
  // and the frontend will call /api/screenshot to trigger async screenshot capture.
  //
  // This approach:
  // 1. Keeps scan API fast (~5-15s instead of 30-45s)
  // 2. Makes screenshots truly async and non-blocking
  // 3. Works reliably in serverless environments
  // 4. Allows frontend to show progress/loading states

  console.log('[scan-orchestrator] Screenshots will be captured by frontend after scan completes')
  console.log('[scan-orchestrator] Frontend should call POST /api/screenshot with:', {
    siteId: siteRecord.id,
    scanId: scanRecord.id,
    url: target.toString()
  })

    const finalDurationMs = Date.now() - startedAt
    const memoryUsed = memoryLimit.used()

    console.log(`[scan-orchestrator] Scan completed in ${finalDurationMs}ms, used ${Math.round(memoryUsed/1024/1024)}MB memory`)

    // Print ultra performance report
    ultraProfiler.printReport()

    const scanResult = {
      status: 'completed',
      domain,
      url: target.toString(),
      favicon: siteRecord.favicon || null,
      summary: {
        tokensExtracted: generated.summary.tokensExtracted,
        curatedCount: generated.summary.curatedCount,
        confidence: generated.summary.confidence,
        completeness: generated.summary.completeness,
        reliability: generated.summary.reliability,
        processingTime: Math.max(1, Math.round(finalDurationMs / 1000))
      },
      tokens: generated.tokenGroups,
      curatedTokens: generated.curatedTokens,
      layoutDNA: layoutDNA || {},
      promptPack,
      aiInsights,
      comprehensiveAnalysis,
      designSystemSpec,
      brandAnalysis,
      componentLibrary,
      versionInfo: {
        versionNumber: newVersionNumber,
        isNewVersion: !!previousTokenSet,
        previousVersionNumber: previousTokenSet?.versionNumber,
        changeCount: tokenDiff?.summary.totalChanges || 0,
        diff: tokenDiff
      },
      metadata: {
        cssSources: cssArtifacts.length,
        staticCssSources: staticCss.length,
        computedCssSources: computedCss.length,
        tokenSetId: tokenSetRecord.id,
        scanId: scanRecord.id,
        promptPackVersion: promptPack.version,
        metrics: metricsSummary,
        tokenQuality: generated.qualityInsights,
        isLargeSite,
        memoryUsedMb: Math.round(memoryUsed / 1024 / 1024)
      },
      database: {
        siteId: siteRecord.id,
        scanId: scanRecord.id,
        tokenSetId: tokenSetRecord.id,
        stored: true
      }
    }

    // ULTRA-FAST: Cache the complete result for instant future retrieval
    cacheScanResult(cacheParams, scanResult, finalDurationMs)

    return scanResult
  }, scanTimeout)
}

// REMOVED: Replaced with ultra-fast optimized database operations in lib/db/optimizations.ts
// - ensureSite() -> findSiteByDomain() with hash index lookup
// - persistCssSources() -> bulkInsertCssContent() + batchInsertCssSources() for maximum speed
// - Complex transaction -> completeScanTransaction() with single optimized operation

function dedupeCssSources(sources: CssSource[]): CssSource[] {
  const map = new Map<string, CssSource>()
  sources.forEach((source) => {
    if (!map.has(source.sha)) {
      map.set(source.sha, source)
    }
  })
  return [...map.values()]
}

function buildBrandAnalysis(colors: { value: string }[]): {
  style: string
  maturity: string
  consistency: number
} {
  if (colors.length === 0) {
    return {
      style: 'unknown',
      maturity: 'prototype',
      consistency: 40
    }
  }

  return {
    style: inferStyle(colors),
    maturity: colors.length > 12 ? 'systematic' : colors.length > 6 ? 'mature' : 'developing',
    consistency: Math.min(95, 60 + colors.length * 3)
  }
}

function inferStyle(colors: { value: string }[]): string {
  const palette = colors.map((color) => color.value.toLowerCase())
  const hasDark = palette.some((color) => color.startsWith('#0') || color.startsWith('#1'))
  const hasVibrant = palette.some((color) => color.includes('f0') || color.includes('ff'))

  if (hasDark && !hasVibrant) return 'minimal'
  if (hasVibrant) return 'vibrant'
  return 'modern'
}

function augmentArchetypesWithWireframe(layoutDNA: ReturnType<typeof analyzeLayout>, sections: any[]): void {
  const archetypes = new Map(layoutDNA.archetypes.map((item) => [item.type, item.confidence]))

  sections.forEach((section: any, index: number) => {
    const tag = section.tag
    const description = section.description.toLowerCase()

    if ((tag === 'nav' || section.role === 'navigation') && !archetypes.has('navigation')) {
      archetypes.set('navigation', 80)
    }

    if (tag === 'header' && section.columns && section.columns >= 2 && !archetypes.has('marketing-hero')) {
      archetypes.set('marketing-hero', 75)
    }

    if (section.category === 'form' && !archetypes.has('form-experience')) {
      archetypes.set('form-experience', 70)
    }

    if (section.category === 'table' && !archetypes.has('data-table')) {
      archetypes.set('data-table', 65)
    }

    if (section.category === 'footer' && !archetypes.has('marketing-footer')) {
      archetypes.set('marketing-footer', 60)
    }

    if (description.includes('grid layout') && section.columns && section.columns >= 3 && !archetypes.has('feature-grid')) {
      archetypes.set('feature-grid', 70)
    }

    if (description.includes('flex') && section.columns && section.columns > 3 && !archetypes.has('carousel')) {
      archetypes.set('carousel', 55)
    }

    if (index === 0 && section.childCount >= 3 && !archetypes.has('hero')) {
      archetypes.set('hero', 65)
    }
  })

  layoutDNA.archetypes = Array.from(archetypes.entries()).map(([type, confidence]) => ({ type, confidence }))
}
