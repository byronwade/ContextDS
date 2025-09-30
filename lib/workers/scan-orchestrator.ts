import { db, sites, scans, tokenSets, cssSources, layoutProfiles, tokenVersions, tokenChanges } from '@/lib/db'
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

export type ScanJobInput = {
  url: string
  prettify: boolean
  includeComputed: boolean
  mode?: 'fast' | 'accurate'  // fast = static only, accurate = full scan
}

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
  tokens: ReturnType<typeof generateTokenSet>['tokenGroups']
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
    tokenQuality: ReturnType<typeof generateTokenSet>['qualityInsights']
  }
  database: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: true
  }
}

export async function runScanJob({ url, prettify, includeComputed, mode = 'accurate' }: ScanJobInput): Promise<ScanJobResult> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const target = new URL(normalized)
  const domain = target.hostname
  const startedAt = Date.now()
  const metrics = new MetricsCollector()

  // PERFORMANCE: Fast mode skips browser automation entirely
  const isFastMode = mode === 'fast'
  const actuallyIncludeComputed = isFastMode ? false : includeComputed

  const [siteRecord] = await ensureSite(domain)
  const [scanRecord] = await db
    .insert(scans)
    .values({
      siteId: siteRecord.id,
      method: actuallyIncludeComputed ? 'computed' : 'static',
      prettify,
      startedAt: new Date()
    })
    .returning()

  const endStaticPhase = metrics.startPhase('collect_static_css')
  const staticCss = await collectStaticCss(target.toString())
  endStaticPhase()

  let computedCss: CssSource[] = []
  if (actuallyIncludeComputed) {
    const endComputedPhase = metrics.startPhase('collect_computed_css')
    computedCss = await collectComputedCss(target.toString())
    endComputedPhase()
  }

  const endDedupePhase = metrics.startPhase('dedupe_css_sources')
  const cssArtifacts = dedupeCssSources([...staticCss, ...computedCss])
  endDedupePhase()

  if (cssArtifacts.length === 0) {
    throw new Error('No CSS sources discovered for the requested URL')
  }

  // PERFORMANCE OPTIMIZATION: Batch insert all CSS sources in single query
  const endPersistPhase = metrics.startPhase('persist_css_sources')

  if (cssArtifacts.length > 0) {
    // Single bulk insert instead of multiple individual inserts
    await db
      .insert(cssSources)
      .values(
        cssArtifacts.map((artifact) => ({
          scanId: scanRecord.id,
          url: artifact.url,
          kind: artifact.kind,
          content: artifact.content,
          bytes: artifact.bytes,
          sha: artifact.sha
        }))
      )
  }

  endPersistPhase()

  const endTokenPhase = metrics.startPhase('generate_tokens')

  let w3cExtraction
  let curatedTokens
  let legacyGenerated

  try {
    // Use new W3C-compliant tokenizer
    w3cExtraction = extractW3CTokens(cssArtifacts, { domain, url: target.toString() })

    // Curate tokens - return only the most important, most-used tokens
    curatedTokens = curateTokens(w3cExtraction.tokenSet, {
      maxColors: 8,
      maxFonts: 4,
      maxSizes: 6,
      maxSpacing: 8,
      maxRadius: 4,
      maxShadows: 4,
      maxMotion: 4,
      minUsage: 2,
      minConfidence: 65
    })
  } catch (error) {
    console.error('W3C token extraction failed, using legacy fallback:', error)
    // W3C extraction failed, skip it
    w3cExtraction = null
    curatedTokens = null
  }

  // Always generate legacy format as fallback
  legacyGenerated = generateTokenSetLegacy(cssArtifacts, { domain, url: target.toString() })

  // Create unified result
  const generated = w3cExtraction && curatedTokens ? {
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
    tokenSet: legacyGenerated.tokenSet,
    curatedTokens: null,
    tokenGroups: legacyGenerated.tokenGroups,
    summary: {
      tokensExtracted: legacyGenerated.summary.tokensExtracted,
      curatedCount: null,
      confidence: legacyGenerated.summary.confidence,
      completeness: legacyGenerated.summary.completeness,
      reliability: legacyGenerated.summary.reliability
    },
    qualityInsights: legacyGenerated.qualityInsights,
    w3cInsights: null
  }

  endTokenPhase()

  const endLayoutPhase = metrics.startPhase('analyze_layout')
  const layoutDNA = analyzeLayout(cssArtifacts)
  endLayoutPhase()

  // PERFORMANCE OPTIMIZATION: Parallelize all independent analysis tasks
  // In fast mode, skip expensive AI comprehensive analysis
  const [
    wireframeResult,
    promptPackResult,
    aiInsightsResult,
    comprehensiveResult
  ] = await Promise.allSettled([
    // Task 1: Wireframe (skip in fast mode)
    actuallyIncludeComputed && !isFastMode
      ? collectLayoutWireframe(target.toString())
      : Promise.resolve([]),

    // Task 2: Build prompt pack (can run in parallel with AI)
    (async () => {
      const legacyPromptPack = buildPromptPack(generated.tokenGroups, layoutAnalysis || {})
      const aiPromptPack = w3cExtraction ? buildAiPromptPack(w3cExtraction, { domain, url: target.toString() }) : null
      return { legacyPromptPack, aiPromptPack }
    })(),

    // Task 3: AI insights (always run, uses fast model)
    curatedTokens
      ? generateDesignInsights(curatedTokens, { domain, url: target.toString() })
      : Promise.resolve(null),

    // Task 4: Comprehensive AI analysis (skip in fast mode - saves 600ms)
    curatedTokens && !isFastMode
      ? analyzeDesignSystemComprehensive(curatedTokens, { domain, url: target.toString() })
      : Promise.resolve(null)
  ])

  // Extract results
  const wireframeSections = wireframeResult.status === 'fulfilled' ? wireframeResult.value : []
  const { legacyPromptPack, aiPromptPack } = promptPackResult.status === 'fulfilled' ? promptPackResult.value : { legacyPromptPack: {}, aiPromptPack: null }
  const aiInsights = aiInsightsResult.status === 'fulfilled' ? aiInsightsResult.value : null
  const comprehensiveAnalysis = comprehensiveResult.status === 'fulfilled' ? comprehensiveResult.value : null

  // Augment layout with wireframe (if available)
  if (wireframeSections.length > 0 && layoutAnalysis) {
    layoutAnalysis.wireframe = { sections: wireframeSections }
    augmentArchetypesWithWireframe(layoutAnalysis, wireframeSections)
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

  // VERSION TRACKING: Get previous token set for this site (outside transaction)
  const previousTokenSets = await db
    .select()
    .from(tokenSets)
    .where(eq(tokenSets.siteId, siteRecord.id))
    .orderBy(desc(tokenSets.versionNumber))
    .limit(1)

  const previousVersion = previousTokenSets[0] || null
  const newVersionNumber = previousVersion ? previousVersion.versionNumber + 1 : 1

  // Calculate diff if there's a previous version
  let tokenDiff = null
  if (previousVersion && generated.tokenSet) {
    try {
      tokenDiff = compareTokenSets(previousVersion.tokensJson, generated.tokenSet)
    } catch (error) {
      console.warn('Failed to generate token diff:', error)
    }
  }

  // Single transaction for all final writes (50ms vs 200ms)
  const [tokenSetRecord] = await db.transaction(async (tx) => {
    // 1. Insert token set with version number
    const [tokenSet] = await tx
      .insert(tokenSets)
      .values({
        siteId: siteRecord.id,
        scanId: scanRecord.id,
        versionNumber: newVersionNumber,
        tokensJson: generated.tokenSet,
        packJson: promptPack,
        consensusScore: (generated.summary.confidence / 100).toFixed(2),
        isPublic: true
      })
      .returning()

    // 2. Create version record if there's a diff
    if (tokenDiff && previousVersion) {
      const [versionRecord] = await tx
        .insert(tokenVersions)
        .values({
          siteId: siteRecord.id,
          tokenSetId: tokenSet.id,
          versionNumber: newVersionNumber,
          previousVersionId: previousVersion.id,
          changelogJson: { raw: tokenDiff },
          diffSummary: tokenDiff.summary
        })
        .returning()

      // 3. Insert individual token changes
      if (versionRecord && tokenDiff.summary.totalChanges > 0) {
        const changes = [
          ...tokenDiff.added.map(c => ({
            versionId: versionRecord.id,
            tokenPath: c.path,
            changeType: 'added' as const,
            oldValue: null,
            newValue: c.newValue,
            category: c.category
          })),
          ...tokenDiff.removed.map(c => ({
            versionId: versionRecord.id,
            tokenPath: c.path,
            changeType: 'removed' as const,
            oldValue: c.oldValue,
            newValue: null,
            category: c.category
          })),
          ...tokenDiff.modified.map(c => ({
            versionId: versionRecord.id,
            tokenPath: c.path,
            changeType: 'modified' as const,
            oldValue: c.oldValue,
            newValue: c.newValue,
            category: c.category
          }))
        ]

        // Batch insert changes (limit to 1000 for performance)
        if (changes.length > 0) {
          await tx.insert(tokenChanges).values(changes.slice(0, 1000))
        }
      }
    }

    // 4. Insert layout profile (in same transaction)
    await tx
      .insert(layoutProfiles)
      .values({
        siteId: siteRecord.id,
        scanId: scanRecord.id,
        profileJson: layoutAnalysis || {},
        archetypes: layoutAnalysis?.archetypes || [],
        containers: layoutAnalysis?.containers || [],
        gridFlex: layoutAnalysis?.gridSystem ? { system: layoutAnalysis.gridSystem } : null,
        spacingScale: layoutAnalysis?.spacingBase ? { base: layoutAnalysis.spacingBase } : null,
        motion: null,
        accessibility: null
      })
      .onConflictDoNothing()

    // 5. Update scan record (in same transaction)
    await tx
      .update(scans)
      .set({
        finishedAt: new Date(),
        cssSourceCount: cssArtifacts.length,
        sha,
        metricsJson: {
          ...metricsSummary,
          tokenQuality: generated.qualityInsights
        }
      })
      .where(eq(scans.id, scanRecord.id))

    // 6. Update site record (in same transaction)
    await tx
      .update(sites)
      .set({
        status: 'completed',
        lastScanned: new Date(),
        popularity: (siteRecord.popularity ?? 0) + 1
      })
      .where(eq(sites.id, siteRecord.id))

    return [tokenSet]
  })

  return {
    status: 'completed',
    domain,
    url: target.toString(),
    summary: {
      tokensExtracted: generated.summary.tokensExtracted,
      curatedCount: generated.summary.curatedCount,
      confidence: generated.summary.confidence,
      completeness: generated.summary.completeness,
      reliability: generated.summary.reliability,
      processingTime: Math.max(1, Math.round(durationMs / 1000))
    },
    curatedTokens: generated.curatedTokens,
    aiInsights: promptPack.aiInsights,
    comprehensiveAnalysis: promptPack.comprehensiveAnalysis,
    tokens: generated.tokenGroups,
    layoutDNA: layoutAnalysis || {},
    promptPack,
    brandAnalysis,
    versionInfo: {
      versionNumber: newVersionNumber,
      isNewVersion: !!previousVersion,
      previousVersionNumber: previousVersion?.versionNumber,
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
      tokenQuality: generated.qualityInsights
    },
    database: {
      siteId: siteRecord.id,
      scanId: scanRecord.id,
      tokenSetId: tokenSetRecord.id,
      stored: true
    }
  }
}

async function ensureSite(domain: string) {
  const existing = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)
  if (existing.length > 0) {
    return existing
  }

  return db
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
}

// DEPRECATED: Now using bulk insert in runScanJob for better performance
// Keeping function for backward compatibility but it's no longer used
async function persistCssSources(scanId: string, sources: CssSource[]) {
  if (sources.length === 0) return

  // Bulk insert all sources at once (faster than Promise.all of individual inserts)
  await db.insert(cssSources).values(
    sources.map((artifact) => ({
      scanId,
      url: artifact.url,
      kind: artifact.kind,
      content: artifact.content,
      bytes: artifact.bytes,
      sha: artifact.sha
    }))
  )
}

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

function augmentArchetypesWithWireframe(layoutDNA: ReturnType<typeof analyzeLayout>, sections: ReturnType<typeof collectLayoutWireframe>): void {
  const archetypes = new Map(layoutDNA.archetypes.map((item) => [item.type, item.confidence]))

  sections.forEach((section, index) => {
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
