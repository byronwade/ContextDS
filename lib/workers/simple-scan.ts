/**
 * High-quality serverless scanner.
 *
 * Flow: CSS → W3C tokens → curation → layout DNA → DESIGN.md + design skill → store
 * Fast by default (static CSS). Accurate optionally adds computed CSS.
 * No Postgres required.
 */

import { collectStaticCss, type CssSource } from '@/lib/extractors/static-css'
import { collectComputedCss } from '@/lib/extractors/computed-css'
import { extractW3CTokens } from '@/lib/analyzers/w3c-tokenizer'
import { curateTokens, type CuratedTokenSet } from '@/lib/analyzers/token-curator'
import { generateTokenSet as generateTokenSetLegacy } from '@/lib/analyzers/basic-tokenizer'
import { analyzeLayout } from '@/lib/analyzers/layout-inspector'
import { buildPromptPack } from '@/lib/analyzers/prompt-pack'
import { generateDesignMd } from '@/lib/analyzers/design-md-generator'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import { buildDesignContractPackage } from '@/lib/contracts/design-contract-package'
import {
  analyzeWithWallace,
  mergeCuratedSets,
} from '@/lib/scanner/wallace-bridge'
import {
  isBrowserServiceConfigured,
  scanWithBrowserService,
} from '@/lib/scanner/browser-service'
import {
  getScan,
  saveScan,
  type StoredScanResult,
} from '@/lib/storage/serverless-store'

export type SimpleScanInput = {
  url: string
  mode?: 'fast' | 'accurate'
  prettify?: boolean
  force?: boolean
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
        process.env.UPSTASH_REDIS_REST_URL ||
          process.env.REDIS_URL ||
          process.env.KV_REST_API_URL
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

function inferBrand(curated: CuratedTokenSet) {
  const primaryColors = curated.colors.slice(0, 5).map((token) => String(token.value))
  const font = curated.typography.families[0]?.value
  const denseSpacing = curated.spacing.length >= 6
  const personality = [
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
  contract: StoredScanResult['designContract']
): StoredScanResult['designContract'] {
  if (!contract) return undefined
  return {
    ...contract,
    files: (contract.files || []).map((file) => ({
      path: file.path,
      content: '',
    })),
  }
}

function fromCache(cached: StoredScanResult): SimpleScanResult {
  const storage = storageMeta(
    `site_${cached.domain}`,
    cached.metadata.scanId,
    cached.metadata.tokenSetId
  )
  return {
    status: 'completed',
    domain: cached.domain,
    url: cached.url,
    summary: cached.summary,
    tokens: cached.tokens,
    curatedTokens: cached.curatedTokens,
    layoutDNA: cached.layoutDNA,
    promptPack: cached.promptPack,
    brandAnalysis: cached.brandAnalysis,
    designMd: cached.designMd,
    designSkill: cached.designSkill,
    designContract: slimContract(cached.designContract),
    metadata: cached.metadata,
    database: storage,
    storage,
    cacheHit: true,
  }
}

export async function runSimpleScan({
  url,
  mode = 'fast',
  prettify = false,
  force = false,
}: SimpleScanInput): Promise<SimpleScanResult> {
  const target = normalizeUrl(url)
  const domain = target.hostname.replace(/^www\./, '')
  const startedAt = Date.now()
  void prettify

  if (!force) {
    const cached = await getScan(domain)
    if (cached?.status === 'completed') {
      const ageMs = Date.now() - new Date(cached.scannedAt).getTime()
      const sameMode = !cached.metadata.mode || cached.metadata.mode === mode
      if (ageMs < 24 * 60 * 60 * 1000 && sameMode) {
        return fromCache(cached)
      }
    }
  }

  // 1) Collect CSS — static first; accurate mode prefers Docker Playwright service
  const staticCss = await collectStaticCss(target.toString())
  let computedCss: CssSource[] = []
  let browserEngine: string | undefined
  let pageTitle: string | undefined
  let usedWallace = false

  if (mode === 'accurate') {
    if (isBrowserServiceConfigured()) {
      try {
        const browser = await scanWithBrowserService(target.toString())
        if (browser?.sources?.length) {
          computedCss = browser.sources
          browserEngine = 'docker-playwright'
          pageTitle = browser.title
        }
      } catch (error) {
        console.warn('[simple-scan] Docker scanner service failed, falling back:', error)
      }
    }

    if (
      computedCss.length === 0 &&
      process.env.DISABLE_COMPUTED_CSS !== '1'
    ) {
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

  const cssArtifacts = prioritizeCss(dedupeBySha([...staticCss, ...computedCss]), mode)
  if (cssArtifacts.length === 0) {
    throw new Error('No CSS sources discovered for the requested URL')
  }

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

  // Layout on a smaller CSS subset for speed
  const layoutSources = cssArtifacts.slice(0, Math.min(16, cssArtifacts.length))
  const layoutDNA = analyzeLayout(layoutSources)
  const brandAnalysis = inferBrand(curated)

  const promptPack = buildPromptPack(
    {
      colors: curated.colors as never,
      typography: [
        ...curated.typography.families,
        ...curated.typography.sizes,
      ] as never,
      spacing: curated.spacing as never,
    },
    layoutDNA
  )

  // 3) DESIGN.md + agent skill (trending agent-readable design artifacts)
  const designMdInput = {
    domain,
    url: target.toString(),
    curatedTokens: curated,
    layoutDNA: {
      containers: {
        maxWidth: layoutDNA.containers.maxWidth,
        strategy: layoutDNA.containers.strategy,
      },
      breakpoints: layoutDNA.breakpoints,
      gridSystem: layoutDNA.gridSystem,
      spacingBase: layoutDNA.spacingBase,
      archetypes: layoutDNA.archetypes,
    },
    brandAnalysis,
    confidence,
  }
  const designMd = generateDesignMd(designMdInput)
  const designSkill = generateDesignSkill({
    domain,
    url: target.toString(),
    designMdFileName: designMd.fileName,
    curatedTokens: curated,
    personality: brandAnalysis.personality,
  })

  const scanId = createId('scan')
  const tokenSetId = createId('tokens')
  const processingTime = Date.now() - startedAt
  const clientCurated = slimCuratedForClient(curated)

  const contractPack = buildDesignContractPackage({
    ...designMdInput,
    scanId,
    profile: 'web-marketing',
    appType: 'marketing-site',
    screenshots: [
      {
        label: 'homepage',
        url: target.toString(),
        note: 'Preserve hierarchy, density, and material from the live homepage observation.',
      },
    ],
  })
  const designContract: StoredScanResult['designContract'] = {
    slug: contractPack.slug,
    title: contractPack.title,
    profile: contractPack.profile,
    installCommand: contractPack.installCommand,
    summary: contractPack.summary,
    // Keep file bodies for download; clients may also hit /api/contracts/download
    files: contractPack.files,
  }

  const stored: StoredScanResult = {
    id: scanId,
    domain,
    url: target.toString(),
    scannedAt: new Date().toISOString(),
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
    metadata: {
      cssSources: cssArtifacts.length,
      staticCssSources: staticCss.length,
      computedCssSources: computedCss.length,
      scanId,
      tokenSetId,
      mode,
      engine: 'design-contracts',
      browserEngine,
      wallace: usedWallace,
      pageTitle,
    },
  }

  const site = await saveScan(stored)
  const storage = storageMeta(site.id, scanId, tokenSetId)

  // Slim contract for API clients — full files stay in Blob for ZIP download
  const designContractSummary = stored.designContract
    ? {
        ...stored.designContract,
        files: stored.designContract.files.map((file) => ({
          path: file.path,
          content: '',
        })),
      }
    : undefined

  return {
    status: 'completed',
    domain,
    url: target.toString(),
    summary: stored.summary,
    // Prefer curated for clients; omit bulky raw groups in API response
    tokens: clientCurated,
    curatedTokens: clientCurated,
    layoutDNA: stored.layoutDNA,
    promptPack: stored.promptPack,
    brandAnalysis: stored.brandAnalysis,
    designMd: stored.designMd,
    designSkill: stored.designSkill,
    designContract: designContractSummary,
    metadata: stored.metadata,
    database: storage,
    storage,
    cacheHit: false,
  }
}
