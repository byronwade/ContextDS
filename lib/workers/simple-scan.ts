/**
 * High-quality serverless scanner.
 *
 * Flow: CSS → W3C tokens → Wallace → layout DNA → semantic graph → Design Contract → store
 * Fast by default (static CSS). Accurate optionally adds Docker/browser CSS.
 * No Postgres required.
 */

import { composeDesignMdProse } from '@/lib/ai/design-md-composer'
import { detectAppType } from '@/lib/analyzers/app-type'
import { generateTokenSet as generateTokenSetLegacy } from '@/lib/analyzers/basic-tokenizer'
import { validateConsistency } from '@/lib/analyzers/consistency-validator'
import { generateDesignMd } from '@/lib/analyzers/design-md-generator'
import { generatePhilosophy } from '@/lib/analyzers/design-philosophy'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import { analyzeLayout } from '@/lib/analyzers/layout-inspector'
import { buildPromptPack } from '@/lib/analyzers/prompt-pack'
import { type RenderCoverage, reconcileWithAudit } from '@/lib/analyzers/render-audit'
import {
  buildSemanticGraph,
  type SemanticGraph,
  slimSemanticGraph,
} from '@/lib/analyzers/semantic-graph'
import { type CuratedTokenSet, curateTokens } from '@/lib/analyzers/token-curator'
import { sanitizeCuratedTokens } from '@/lib/analyzers/token-sanitizer'
import { extractW3CTokens } from '@/lib/analyzers/w3c-tokenizer'
import type { DriftObservation } from '@/lib/contracts/contextds-drift'
import { buildDesignContractPackage } from '@/lib/contracts/design-contract-package'
import { contractDownloadPath, normalizeDomain } from '@/lib/domain'
import { collectComputedCss } from '@/lib/extractors/computed-css'
import { type CssSource, collectStaticCss } from '@/lib/extractors/static-css'
import {
  type BrowserCaptureAuth,
  type BrowserRenderAudit,
  isBrowserServiceConfigured,
  scanWithBrowserService,
} from '@/lib/scanner/browser-service'
import { analyzeWithWallace, mergeCuratedSets } from '@/lib/scanner/wallace-bridge'
import { uploadScreenshot } from '@/lib/storage/blob-storage'
import { trackStatEvent } from '@/lib/storage/platform-stats'
import { getScan, type StoredScanResult, saveScan } from '@/lib/storage/serverless-store'
import { ProgressEmitter } from '@/lib/workers/progress-emitter'

export type SimpleScanInput = {
  url: string
  mode?: 'fast' | 'accurate'
  prettify?: boolean
  force?: boolean
  /** Client-supplied id so SSE can subscribe before POST completes */
  scanId?: string
  /** Screenshot capture options — extra pages + authenticated capture of your own surfaces */
  capture?: {
    pages?: number
    paths?: string[]
    auth?: BrowserCaptureAuth
  }
}

export type SimpleScanResult = {
  status: 'completed'
  domain: string
  url: string
  summary: StoredScanResult['summary']
  tokens: StoredScanResult['tokens']
  curatedTokens?: StoredScanResult['curatedTokens']
  layoutDNA?: StoredScanResult['layoutDNA']
  promptPack?: StoredScanResult['promptPack']
  brandAnalysis?: StoredScanResult['brandAnalysis']
  designMd?: StoredScanResult['designMd']
  designSkill?: StoredScanResult['designSkill']
  designContract?: StoredScanResult['designContract']
  semanticGraph?: SemanticGraph
  screenshots?: StoredScanResult['screenshots']
  uxDna?: StoredScanResult['uxDna']
  metadata: StoredScanResult['metadata']
  /** @deprecated use `storage` */
  database: SimpleScanResult['storage']
  storage: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: boolean
    backend: { blob: boolean; redis: boolean; memory: boolean }
  }
  cacheHit?: boolean
}

const FAST_MAX_SOURCES = 24
const FAST_MAX_BYTES = 4 * 1024 * 1024
const ACCURATE_MAX_SOURCES = 40
const ACCURATE_MAX_BYTES = 8 * 1024 * 1024

function normalizeUrl(url: string): URL {
  const withProtocol = url.startsWith('http') ? url : `https://${url}`
  return new URL(withProtocol)
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function storageMeta(
  siteId: string,
  scanId: string,
  tokenSetId: string
): SimpleScanResult['storage'] {
  return {
    siteId,
    scanId,
    tokenSetId,
    stored: true,
    backend: {
      blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      redis: Boolean(
        process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || process.env.KV_REST_API_URL
      ),
      memory: true,
    },
  }
}

function dedupeBySha<T extends { sha: string; bytes: number }>(sources: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const source of sources) {
    if (seen.has(source.sha)) continue
    seen.add(source.sha)
    unique.push(source)
  }
  return unique
}

/** Prefer larger stylesheets first, then cap count/bytes for latency. */
function prioritizeCss(sources: CssSource[], mode: 'fast' | 'accurate'): CssSource[] {
  const maxSources = mode === 'fast' ? FAST_MAX_SOURCES : ACCURATE_MAX_SOURCES
  const maxBytes = mode === 'fast' ? FAST_MAX_BYTES : ACCURATE_MAX_BYTES
  const sorted = [...sources].sort((a, b) => b.bytes - a.bytes)
  const selected: CssSource[] = []
  let total = 0
  for (const source of sorted) {
    if (selected.length >= maxSources) break
    if (total + source.bytes > maxBytes && selected.length > 0) continue
    selected.push(source)
    total += source.bytes
  }
  return selected.length ? selected : sorted.slice(0, 1)
}

function countCurated(curated: CuratedTokenSet): number {
  return (
    curated.colors.length +
    curated.typography.families.length +
    curated.typography.sizes.length +
    curated.typography.weights.length +
    curated.spacing.length +
    curated.radius.length +
    curated.shadows.length +
    curated.motion.length
  )
}

function toLegacyGroups(curated: CuratedTokenSet) {
  return {
    colors: curated.colors,
    typography: [
      ...curated.typography.families,
      ...curated.typography.sizes,
      ...curated.typography.weights,
    ],
    spacing: curated.spacing,
    radius: curated.radius,
    shadows: curated.shadows,
    motion: curated.motion,
    gradients: [],
    borders: [],
  }
}

function inferBrand(curated: CuratedTokenSet, traits?: string[]) {
  const primaryColors = curated.colors.slice(0, 5).map((token) => String(token.value))
  const font = curated.typography.families[0]?.value
  const denseSpacing = curated.spacing.length >= 6
  const personality =
    traits && traits.length > 0
      ? traits.slice(0, 5).join(', ')
      : [
          primaryColors.length >= 4 ? 'chromatic' : 'restrained',
          font ? 'typed' : 'system-type',
          denseSpacing ? 'rhythmic' : 'sparse',
        ].join('-')

  return { primaryColors, personality, primaryFont: font ? String(font) : null }
}

function slimCuratedForClient(curated: CuratedTokenSet): CuratedTokenSet {
  return {
    colors: curated.colors.slice(0, 24),
    typography: {
      families: curated.typography.families.slice(0, 8),
      sizes: curated.typography.sizes.slice(0, 12),
      weights: curated.typography.weights.slice(0, 8),
    },
    spacing: curated.spacing.slice(0, 16),
    radius: curated.radius.slice(0, 10),
    shadows: curated.shadows.slice(0, 8),
    motion: curated.motion.slice(0, 8),
    metadata: curated.metadata,
  }
}

function slimContract(
  contract: StoredScanResult['designContract'],
  domain: string
): StoredScanResult['designContract'] {
  if (!contract) return undefined
  return {
    ...contract,
    download: contract.download || contractDownloadPath(domain),
    files: (contract.files || []).map((file) => ({
      path: file.path,
      content: '',
      ...(file.encoding ? { encoding: file.encoding } : {}),
    })),
  }
}

function clientTokens(cached: StoredScanResult): CuratedTokenSet | StoredScanResult['tokens'] {
  // Prefer curated shape so cache hits match fresh responses.
  if (cached.curatedTokens && typeof cached.curatedTokens === 'object') {
    return cached.curatedTokens as CuratedTokenSet
  }
  return cached.tokens
}

function fromCache(cached: StoredScanResult): SimpleScanResult {
  const storage = storageMeta(
    `site_${cached.domain}`,
    cached.metadata.scanId,
    cached.metadata.tokenSetId
  )
  const tokens = clientTokens(cached)
  return {
    status: 'completed',
    domain: cached.domain,
    url: cached.url,
    summary: cached.summary,
    tokens,
    curatedTokens: (cached.curatedTokens as CuratedTokenSet | undefined) ?? undefined,
    layoutDNA: cached.layoutDNA,
    promptPack: cached.promptPack,
    brandAnalysis: cached.brandAnalysis,
    designMd: cached.designMd,
    designSkill: cached.designSkill,
    designContract: slimContract(cached.designContract, cached.domain),
    semanticGraph: cached.semanticGraph
      ? slimSemanticGraph(cached.semanticGraph as SemanticGraph)
      : undefined,
    screenshots: cached.screenshots,
    uxDna: cached.uxDna,
    metadata: cached.metadata,
    database: storage,
    storage,
    cacheHit: true,
  }
}

type CapturedScreenshot = {
  label?: string
  viewport?: string
  mime?: string
  base64: string
}

async function persistBrowserScreenshot(
  scanId: string,
  screenshot: { mime?: string; base64: string } | null | undefined,
  screenshotSet?: CapturedScreenshot[] | null
): Promise<StoredScanResult['screenshots']> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return undefined

  const captures: CapturedScreenshot[] =
    screenshotSet && screenshotSet.length > 0
      ? screenshotSet
      : screenshot?.base64
        ? [
            {
              label: 'homepage',
              viewport: 'desktop',
              mime: screenshot.mime,
              base64: screenshot.base64,
            },
          ]
        : []
  if (captures.length === 0) return undefined

  const persisted: NonNullable<StoredScanResult['screenshots']> = []
  for (const capture of captures.slice(0, 12)) {
    try {
      const viewport =
        capture.viewport === 'mobile' || capture.viewport === 'tablet'
          ? capture.viewport
          : 'desktop'
      const label = (capture.label || 'homepage').slice(0, 48)
      const uploaded = await uploadScreenshot({
        scanId,
        viewport,
        buffer: Buffer.from(capture.base64, 'base64'),
        label: label.replace(/[^a-z0-9·-]+/gi, '-').toLowerCase(),
      })
      persisted.push({
        label,
        url: uploaded.url,
        mime: capture.mime || 'image/jpeg',
        viewport,
      })
    } catch (error) {
      console.warn('[simple-scan] screenshot upload failed:', error)
    }
  }
  return persisted.length > 0 ? persisted : undefined
}

export async function runSimpleScan({
  url,
  mode = 'fast',
  prettify = false,
  force = false,
  scanId: providedScanId,
  capture,
}: SimpleScanInput): Promise<SimpleScanResult> {
  const target = normalizeUrl(url)
  const domain = normalizeDomain(target.hostname)
  const startedAt = Date.now()
  const scanId = providedScanId || createId('scan')
  const progress = new ProgressEmitter(scanId, 6)
  void prettify

  if (!force) {
    const cached = await getScan(domain)
    if (cached?.status === 'completed') {
      const ageMs = Date.now() - new Date(cached.scannedAt).getTime()
      const sameMode = !cached.metadata.mode || cached.metadata.mode === mode
      if (ageMs < 24 * 60 * 60 * 1000 && sameMode) {
        const cachedResult = fromCache(cached)
        progress.complete({ domain, cacheHit: true })
        void trackStatEvent('cache_hit')
        return cachedResult
      }
    }
  }

  progress.phase(
    'collect',
    mode === 'accurate' ? 'Browser capture + public CSS' : 'Collecting public CSS'
  )

  // 1) Collect CSS — static first; accurate mode prefers Docker Playwright service
  const staticCss = await collectStaticCss(target.toString())
  let computedCss: CssSource[] = []
  let browserEngine: string | undefined
  let pageTitle: string | undefined
  let usedWallace = false
  let browserScreenshot: { mime?: string; base64: string } | null = null
  let browserScreenshotSet: CapturedScreenshot[] | null = null
  let browserAudit: BrowserRenderAudit | null = null
  let renderCoverage: RenderCoverage | null = null
  let crawledPages: Array<{ path: string; title: string; audited: boolean }> | null = null
  let browserKeyframes: Array<{ name: string; css: string }> | null = null
  let browserFlow: Array<{ from: string; to: string }> | null = null

  if (mode === 'accurate') {
    if (isBrowserServiceConfigured()) {
      try {
        const browser = await scanWithBrowserService(target.toString(), {
          pages: capture?.pages,
          paths: capture?.paths,
          auth: capture?.auth,
        })
        if (browser?.sources?.length) {
          computedCss = browser.sources
          const serviceUrl = process.env.SCANNER_SERVICE_URL || ''
          browserEngine = /vercel\.app/i.test(serviceUrl) ? 'vercel-chromium' : 'docker-playwright'
          pageTitle = browser.title
          browserScreenshot = browser.screenshot ?? null
          browserScreenshotSet = browser.screenshots ?? null
          browserAudit = browser.audit ?? null
          crawledPages = browser.pages ?? null
          browserKeyframes = browser.keyframes ?? null
          browserFlow = browser.flow ?? null
        }
      } catch (error) {
        console.warn('[simple-scan] Browser scanner service failed, falling back:', error)
      }
    }

    if (computedCss.length === 0 && process.env.DISABLE_COMPUTED_CSS !== '1') {
      try {
        const computed = await collectComputedCss(target.toString(), {
          fastMode: true,
          maxMemoryMb: 64,
        })
        computedCss = (computed.sources || []) as CssSource[]
        browserEngine = browserEngine || 'local-playwright'
      } catch (error) {
        console.warn('[simple-scan] computed CSS skipped:', error)
      }
    }
  }

  // An accurate scan that never reached a browser is a fast scan wearing the
  // wrong label. Report the mode that actually ran, so a missing
  // SCANNER_SERVICE_URL surfaces in the result instead of silently producing
  // static-CSS output stamped "accurate".
  let degradedReason: string | null = null
  if (mode === 'accurate' && computedCss.length === 0) {
    degradedReason = isBrowserServiceConfigured()
      ? 'Scanner service configured but returned no computed CSS; fell back to static parsing.'
      : 'SCANNER_SERVICE_URL is not set — no browser available, so only static CSS was parsed.'
    browserEngine = undefined
    console.warn(`[simple-scan] accurate scan degraded to fast: ${degradedReason}`)
  }
  const effectiveMode: 'fast' | 'accurate' = degradedReason ? 'fast' : mode

  const cssArtifacts = prioritizeCss(dedupeBySha([...staticCss, ...computedCss]), effectiveMode)
  if (cssArtifacts.length === 0) {
    progress.error('No CSS sources discovered for the requested URL')
    throw new Error('No CSS sources discovered for the requested URL')
  }

  progress.phase('tokenize', 'W3C tokens + Project Wallace')

  // 2) Tokenize + layout (W3C preferred; Wallace merge; legacy fallback)
  let curated: CuratedTokenSet
  let tokenGroups: unknown
  let confidence = 70
  let completeness = 70
  let reliability = 70
  let tokensExtracted = 0
  let insights: ReturnType<typeof extractW3CTokens>['insights'] | null = null

  try {
    const w3c = extractW3CTokens(cssArtifacts, {
      domain,
      url: target.toString(),
    })
    curated = curateTokens(w3c.tokenSet, {
      maxColors: mode === 'fast' ? 16 : 24,
      maxFonts: 6,
      maxSizes: 12,
      maxSpacing: 16,
      maxRadius: 10,
      maxShadows: 8,
      maxMotion: 8,
      minUsage: 1,
      minConfidence: 45,
      returnAllFiltered: true,
    })
    tokenGroups = toLegacyGroups(curated)
    tokensExtracted = w3c.summary.totalTokens || countCurated(curated)
    confidence = w3c.summary.confidence
    completeness = Math.min(100, Math.round(w3c.summary.quality))
    reliability = Math.round((confidence + completeness) / 2)
    insights = w3c.insights
  } catch (error) {
    console.warn('[simple-scan] W3C path failed, using legacy tokenizer:', error)
    const legacy = generateTokenSetLegacy(cssArtifacts, {
      domain,
      url: target.toString(),
    })
    curated = {
      colors: legacy.tokenGroups.colors,
      typography: {
        families: legacy.tokenGroups.typography.filter((token) =>
          String(token.details?.property || token.name).includes('family')
        ),
        sizes: legacy.tokenGroups.typography.filter((token) =>
          String(token.details?.property || token.name).includes('size')
        ),
        weights: legacy.tokenGroups.typography.filter((token) =>
          String(token.details?.property || token.name).includes('weight')
        ),
      },
      spacing: legacy.tokenGroups.spacing,
      radius: legacy.tokenGroups.radius,
      shadows: legacy.tokenGroups.shadows,
      motion: legacy.tokenGroups.motion,
    }
    tokenGroups = legacy.tokenGroups
    tokensExtracted = legacy.summary.tokensExtracted
    confidence = legacy.summary.confidence
    completeness = legacy.summary.completeness
    reliability = legacy.summary.reliability
  }

  // Project Wallace (correct values.* path) — merge for higher coverage
  try {
    const combinedCss = cssArtifacts
      .map((source) => source.content)
      .join('\n')
      .slice(0, 6 * 1024 * 1024)
    const wallace = analyzeWithWallace(combinedCss)
    const before = countCurated(curated)
    curated = mergeCuratedSets(curated, wallace.curated)
    usedWallace = true
    tokenGroups = toLegacyGroups(curated)
    tokensExtracted = Math.max(tokensExtracted, countCurated(curated))
    if (countCurated(curated) > before) {
      confidence = Math.min(98, confidence + 4)
      completeness = Math.min(100, completeness + 5)
      reliability = Math.round((confidence + completeness) / 2)
    }
  } catch (error) {
    console.warn('[simple-scan] Wallace merge skipped:', error)
  }

  // 2a) Sanitize: resolve leftover var() references against a global
  // cross-sheet variable map; drop values that cannot be grounded.
  try {
    const sanitized = sanitizeCuratedTokens(
      curated,
      cssArtifacts.map((source) => source.content)
    )
    curated = sanitized.curated
    tokenGroups = toLegacyGroups(curated)
    if (sanitized.report.dropped > 0 || sanitized.report.resolved > 0) {
      console.log(
        `[simple-scan] sanitizer: ${sanitized.report.resolved} resolved, ${sanitized.report.dropped} dropped (vars indexed: ${sanitized.report.variablesIndexed})`
      )
    }
  } catch (error) {
    console.warn('[simple-scan] token sanitation skipped:', error)
  }

  // 2b) Render-audit reconciliation — fold measured page reality into the
  // CSS-derived tokens: verified usage weights, dormant demotion, missed
  // rendered values, and a coverage score that feeds confidence.
  if (browserAudit && browserAudit.elementCount > 20) {
    try {
      const reconciled = reconcileWithAudit(curated, browserAudit)
      curated = reconciled.curated
      renderCoverage = reconciled.coverage
      tokenGroups = toLegacyGroups(curated)
      tokensExtracted = Math.max(tokensExtracted, countCurated(curated))
      // Confidence becomes evidence-based: blend CSS-derived score with how
      // much of the painted page the extraction actually explains.
      confidence = Math.min(99, Math.round(confidence * 0.55 + reconciled.coverage.overall * 0.45))
      completeness = Math.min(100, completeness + 4)
      reliability = Math.round((confidence + completeness) / 2)
    } catch (error) {
      console.warn('[simple-scan] render-audit reconciliation skipped:', error)
    }
  }

  progress.phase('layout', 'Profiling layout DNA')
  // Layout on a smaller CSS subset for speed
  const layoutSources = cssArtifacts.slice(0, Math.min(16, cssArtifacts.length))
  const layoutDNA = analyzeLayout(layoutSources)

  // UX DNA first — philosophy + DESIGN.md need measured shell/density/motion.
  const uxDna: StoredScanResult['uxDna'] =
    browserAudit || browserKeyframes || browserFlow
      ? {
          shell: browserAudit?.shell ?? undefined,
          density: browserAudit?.density ?? undefined,
          components: browserAudit?.components ?? undefined,
          flow: browserFlow ?? undefined,
          keyframes: browserKeyframes?.slice(0, 16) ?? undefined,
          transitions: browserAudit?.transitions?.slice(0, 12) ?? undefined,
          interaction: browserAudit?.interaction
            ? {
                rules: browserAudit.interaction.rules,
                effects: browserAudit.interaction.effects.slice(0, 12),
                samples: browserAudit.interaction.samples.slice(0, 10),
              }
            : undefined,
        }
      : undefined

  const uxEvidence = {
    shell: browserAudit?.shell ?? null,
    density: browserAudit?.density ?? null,
    interaction: browserAudit?.interaction
      ? {
          rules: browserAudit.interaction.rules,
          effects: browserAudit.interaction.effects.slice(0, 12),
        }
      : null,
    keyframeCount: browserKeyframes?.length ?? 0,
    pagesAudited: crawledPages?.length ?? undefined,
  }

  const philosophy = generatePhilosophy({
    domain,
    curated,
    primaryFont: curated.typography.families[0]?.value
      ? String(curated.typography.families[0].value)
      : null,
    ux: uxEvidence,
  })
  const brandAnalysis = inferBrand(curated, philosophy.traits)

  const promptPack = buildPromptPack(
    {
      colors: curated.colors as never,
      typography: [...curated.typography.families, ...curated.typography.sizes] as never,
      spacing: curated.spacing as never,
    },
    layoutDNA
  )

  progress.phase('graph', 'Building semantic design graph')
  const tokenSetId = createId('tokens')
  const semanticGraph = buildSemanticGraph({
    domain,
    url: target.toString(),
    scanId,
    curatedTokens: curated,
    layoutDNA,
    brandAnalysis,
    cssSources: cssArtifacts.slice(0, 28).map((source) => ({
      content: source.content,
      url: source.url,
      kind: source.kind,
    })),
    pageTitle,
  })

  progress.phase('design-md', 'Composing elite Design Contract')
  const screenshots =
    (await persistBrowserScreenshot(scanId, browserScreenshot, browserScreenshotSet)) || undefined

  const firstArchetype = layoutDNA.archetypes?.[0]
  const archetypeLabel =
    typeof firstArchetype === 'string'
      ? firstArchetype
      : firstArchetype?.type || layoutDNA.gridSystem || 'marketing site'

  const densitySummary = uxEvidence.density
    ? `${uxEvidence.density.elementsInViewport} els/viewport, imageRatio=${uxEvidence.density.imageAreaRatio}, textChars=${uxEvidence.density.textChars}`
    : null
  const interactionSummary = uxEvidence.interaction?.effects?.length
    ? uxEvidence.interaction.effects
        .slice(0, 6)
        .map((effect) => effect.value)
        .join('; ')
    : null
  const measuredComponentsSummary = browserAudit?.components
    ? Object.entries(browserAudit.components)
        .filter(([, recipe]) => Boolean(recipe))
        .map(([key, recipe]) => {
          const parts = [
            recipe?.backgroundColor,
            recipe?.textColor,
            recipe?.rounded,
            recipe?.padding,
          ].filter(Boolean)
          return `${key}=[${parts.join(', ')}]`
        })
        .join('; ')
    : null

  const aiProse = await composeDesignMdProse({
    domain,
    url: target.toString(),
    philosophy,
    archetype: archetypeLabel,
    confidence,
    colorKeys: curated.colors.slice(0, 12).map((c) => String(c.value)),
    headlineFont: String(curated.typography.families[0]?.value || 'system-ui'),
    bodyFont: String(
      curated.typography.families[1]?.value || curated.typography.families[0]?.value || 'system-ui'
    ),
    spacingBase: philosophy.systems.space.base || layoutDNA.spacingBase || 8,
    motionTempo: philosophy.systems.motion.tempo,
    shellSummary: uxEvidence.shell
      ? [
          uxEvidence.shell.header ? `${uxEvidence.shell.header.height}px header` : null,
          uxEvidence.shell.sidebar ? `${uxEvidence.shell.sidebar.width}px sidebar` : null,
        ]
          .filter(Boolean)
          .join(', ') || null
      : null,
    densitySummary,
    interactionSummary,
    measuredComponentsSummary,
    keyframeSummary:
      browserKeyframes
        ?.map((frame) => frame.name)
        .slice(0, 8)
        .join(', ') || null,
    screenshotBase64: browserScreenshot?.base64 ?? null,
    screenshotMime: browserScreenshot?.mime ?? 'image/png',
  })

  const designMdInput = {
    domain,
    url: target.toString(),
    curatedTokens: curated,
    headings: browserAudit?.headings ?? null,
    measuredComponents: browserAudit?.components ?? null,
    uxMotion: {
      transitions: browserAudit?.transitions?.slice(0, 12),
      keyframes: browserKeyframes?.slice(0, 12),
    },
    layoutDNA: {
      containers: {
        maxWidth: layoutDNA.containers.maxWidth,
        maxWidths: Array.from(
          new Set(
            layoutDNA.containers.snapshots
              .map((snapshot) => snapshot.maxWidth)
              .filter((value): value is string => Boolean(value))
          )
        ).slice(0, 6),
        strategy: layoutDNA.containers.strategy,
      },
      breakpoints: layoutDNA.breakpoints,
      gridSystem: layoutDNA.gridSystem,
      spacingBase: layoutDNA.spacingBase,
      archetypes: layoutDNA.archetypes,
    },
    brandAnalysis,
    confidence,
    semanticGraph,
    philosophy,
    uxEvidence,
    aiProse,
  }
  const designMd = generateDesignMd(designMdInput)
  const measuredComponentKeys = browserAudit?.components
    ? Object.entries(browserAudit.components)
        .filter(([, recipe]) => Boolean(recipe))
        .map(([key]) => key)
    : []
  const designSkill = generateDesignSkill({
    domain,
    url: target.toString(),
    designMdFileName: designMd.fileName,
    curatedTokens: curated,
    personality: brandAnalysis.personality,
    philosophy: {
      title: philosophy.title,
      statement: philosophy.statement,
      traits: philosophy.traits,
      principles: philosophy.principles,
      motionTempo: philosophy.systems.motion.tempo,
      typeVoice: philosophy.systems.type.voice,
      shapeCharacter: philosophy.systems.shape.character,
      depth: philosophy.systems.shape.depth,
    },
    measuredComponents: measuredComponentKeys,
  })

  const consistency = validateConsistency(curated)
  const processingTime = Date.now() - startedAt
  const clientCurated = slimCuratedForClient(curated)
  const clientGraph = slimSemanticGraph(semanticGraph)

  const captureSource: CapturedScreenshot[] =
    browserScreenshotSet && browserScreenshotSet.length > 0
      ? browserScreenshotSet.slice(0, 12)
      : browserScreenshot?.base64
        ? [
            {
              label: 'homepage',
              viewport: 'desktop',
              mime: browserScreenshot.mime,
              base64: browserScreenshot.base64,
            },
          ]
        : []

  const contractScreenshots =
    captureSource.length > 0
      ? captureSource.map((capture, index) => {
          const persisted = screenshots?.[index]
          return {
            label: capture.label || persisted?.label || `surface-${index + 1}`,
            url: persisted?.url,
            mime: capture.mime || persisted?.mime || 'image/jpeg',
            bytesBase64: capture.base64,
            note: 'Captured during accurate browser scan — open the pack image when struggling.',
          }
        })
      : screenshots?.length
        ? screenshots.map((shot) => ({
            label: shot.label,
            url: shot.url,
            mime: shot.mime,
            note: 'Captured during accurate browser scan — use as visual ground truth.',
          }))
        : [
            {
              label: 'homepage',
              url: target.toString(),
              note: 'Preserve hierarchy, density, and material from the live homepage observation.',
            },
          ]

  // Classify the site into an engine profile + app type from real scan evidence
  const appTypeDetection = detectAppType({
    archetypes: layoutDNA.archetypes,
    shell: browserAudit?.shell,
    density: browserAudit?.density,
    flow: browserFlow,
    domain,
  })

  const scannedAt = new Date().toISOString()

  // Drift observations: measured evidence the engine can hold the contract against.
  // Observation-only — the engine never lets these edit DESIGN.md.
  const driftObservations: DriftObservation[] = []
  if (renderCoverage) {
    driftObservations.push({
      surface: 'site',
      kind: 'render-coverage',
      summary: `Render audit explains ${renderCoverage.overall}% of the painted page (colors ${renderCoverage.colors}%, fonts ${renderCoverage.fonts}%, sizes ${renderCoverage.sizes}%) across ${renderCoverage.pagesAudited} page(s).`,
      observedAt: scannedAt,
      evidence: {
        overall: renderCoverage.overall,
        colors: renderCoverage.colors,
        fonts: renderCoverage.fonts,
        sizes: renderCoverage.sizes,
        elementCount: renderCoverage.elementCount,
        pagesAudited: renderCoverage.pagesAudited,
      },
      suggestedAction:
        'Re-scan after visual changes; falling coverage means the contract no longer explains what the site paints.',
    })
  }
  if (renderCoverage && renderCoverage.dormantColors > 0) {
    const dormantColors = curated.colors
      .filter((token) => token.semantic === 'dormant')
      .slice(0, 8)
      .map((token) => String(token.value))
    driftObservations.push({
      surface: 'site',
      kind: 'dormant-tokens',
      summary: `${renderCoverage.dormantColors} color token(s) found in CSS were never observed on rendered pages (${renderCoverage.verifiedColors} verified).`,
      observedAt: scannedAt,
      evidence: {
        dormantColors: renderCoverage.dormantColors,
        verifiedColors: renderCoverage.verifiedColors,
        samples: dormantColors,
      },
      suggestedAction:
        'Treat dormant tokens as low-authority; verify against more pages or prune them from the palette.',
    })
  }
  const measuredHeadings = browserAudit?.headings
  if (measuredHeadings && (measuredHeadings.h1 || measuredHeadings.h2 || measuredHeadings.h3)) {
    const headingSummary = (['h1', 'h2', 'h3'] as const)
      .map((level) => {
        const heading = measuredHeadings[level]
        return heading
          ? `${level} ${Math.round(heading.size)}px/${heading.weight} ${heading.family}`
          : null
      })
      .filter(Boolean)
      .join('; ')
    driftObservations.push({
      surface: 'site',
      kind: 'measured-typography',
      summary: `Measured heading styles on rendered pages: ${headingSummary}.`,
      observedAt: scannedAt,
      evidence: measuredHeadings,
      suggestedAction:
        'Compare against the DESIGN.md type scale; measured values are ground truth.',
    })
  }
  if (crawledPages && crawledPages.length > 0) {
    driftObservations.push({
      surface: 'site',
      kind: 'crawl-coverage',
      summary: `Scan crawled ${crawledPages.length} page(s): ${crawledPages
        .slice(0, 6)
        .map((entry) => entry.path)
        .join(', ')}.`,
      observedAt: scannedAt,
      evidence: {
        pages: crawledPages.length,
        audited: crawledPages.filter((entry) => entry.audited).length,
        paths: crawledPages.slice(0, 12).map((entry) => entry.path),
      },
      suggestedAction:
        'Surfaces outside the crawl are unverified — scan them before extending the contract there.',
    })
  }
  if (browserAudit?.components) {
    const recipeKeys = Object.entries(browserAudit.components)
      .filter(([, recipe]) => Boolean(recipe))
      .map(([key]) => key)
    if (recipeKeys.length > 0) {
      driftObservations.push({
        surface: 'site',
        kind: 'measured-components',
        summary: `Measured live component recipes: ${recipeKeys.join(', ')}.`,
        observedAt: scannedAt,
        evidence: browserAudit.components,
        suggestedAction:
          'YAML component recipes were taken from rendered computed styles — treat them as ground truth over guessed mappings.',
      })
    }
  }

  const contractPack = buildDesignContractPackage({
    ...designMdInput,
    scanId,
    profile: appTypeDetection.profile,
    appType: appTypeDetection.appType,
    appTypeDetection,
    driftObservations,
    semanticGraph,
    screenshots: contractScreenshots,
  })
  const designContract: StoredScanResult['designContract'] = {
    slug: contractPack.slug,
    title: contractPack.title,
    profile: contractPack.profile,
    installCommand: contractPack.installCommand,
    summary: contractPack.summary,
    files: contractPack.files,
  }

  progress.phase('persist', 'Saving scan results')

  const stored: StoredScanResult = {
    id: scanId,
    domain,
    url: target.toString(),
    scannedAt,
    status: 'completed',
    summary: {
      tokensExtracted,
      curatedCount: {
        colors: curated.colors.length,
        fonts: curated.typography.families.length,
        sizes: curated.typography.sizes.length,
        spacing: curated.spacing.length,
        radius: curated.radius.length,
        shadows: curated.shadows.length,
      },
      confidence,
      completeness,
      reliability,
      processingTime,
    },
    tokens: tokenGroups,
    curatedTokens: clientCurated,
    layoutDNA: {
      ...layoutDNA,
      insights,
    },
    promptPack,
    brandAnalysis,
    designMd: {
      markdown: designMd.markdown,
      fileName: designMd.fileName,
      summary: designMd.summary,
    },
    designSkill: {
      markdown: designSkill.markdown,
      fileName: designSkill.fileName,
      skillName: designSkill.skillName,
      description: designSkill.description,
    },
    designContract,
    semanticGraph,
    screenshots,
    uxDna,
    metadata: {
      cssSources: cssArtifacts.length,
      staticCssSources: staticCss.length,
      computedCssSources: computedCss.length,
      scanId,
      tokenSetId,
      mode: effectiveMode,
      requestedMode: mode,
      degradedReason: degradedReason ?? undefined,
      engine: 'design-contracts',
      browserEngine,
      wallace: usedWallace,
      pageTitle,
      appType: appTypeDetection.appType,
      appTypeConfidence: appTypeDetection.confidence,
      renderCoverage: renderCoverage ?? undefined,
      consistencyScore: consistency.overallScore,
      crawl: crawledPages
        ? { pages: crawledPages.length, paths: crawledPages.map((entry) => entry.path) }
        : undefined,
    },
  }

  const site = await saveScan(stored)
  const storage = storageMeta(site.id, scanId, tokenSetId)

  progress.metrics({
    tokens: tokensExtracted,
    colors: curated.colors.length,
    qualityScore: confidence,
  })
  progress.complete({ domain, cacheHit: false })

  return {
    status: 'completed',
    domain,
    url: target.toString(),
    summary: stored.summary,
    tokens: clientCurated,
    curatedTokens: clientCurated,
    layoutDNA: stored.layoutDNA,
    promptPack: stored.promptPack,
    brandAnalysis: stored.brandAnalysis,
    designMd: stored.designMd,
    designSkill: stored.designSkill,
    designContract: slimContract(stored.designContract, domain),
    semanticGraph: clientGraph,
    screenshots,
    uxDna,
    metadata: stored.metadata,
    database: storage,
    storage,
    cacheHit: false,
  }
}
