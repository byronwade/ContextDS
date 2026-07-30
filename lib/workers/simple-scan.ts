/**
 * Lean serverless scanner.
 *
 * Purpose: fetch public CSS → extract design tokens → store without Postgres.
 * Fast path uses static CSS only; accurate path optionally adds computed CSS.
 */

import { collectStaticCss } from '@/lib/extractors/static-css'
import { collectComputedCss } from '@/lib/extractors/computed-css'
import { generateTokenSet as generateTokenSetLegacy } from '@/lib/analyzers/basic-tokenizer'
import { analyzeLayout } from '@/lib/analyzers/layout-inspector'
import { buildPromptPack } from '@/lib/analyzers/prompt-pack'
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
  metadata: StoredScanResult['metadata']
  /** @deprecated use `storage` — kept for older clients */
  database: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: boolean
    backend: { blob: boolean; redis: boolean; memory: boolean }
  }
  storage: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: boolean
    backend: { blob: boolean; redis: boolean; memory: boolean }
  }
  cacheHit?: boolean
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

function normalizeUrl(url: string): URL {
  const withProtocol = url.startsWith('http') ? url : `https://${url}`
  return new URL(withProtocol)
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function toCuratedTokens(tokenGroups: ReturnType<typeof generateTokenSetLegacy>['tokenGroups']) {
  return {
    colors: tokenGroups.colors,
    typography: {
      families: tokenGroups.typography.filter((token) =>
        String(token.details?.property || token.name).includes('family')
      ),
      sizes: tokenGroups.typography.filter((token) =>
        String(token.details?.property || token.name).includes('size')
      ),
      weights: tokenGroups.typography.filter((token) =>
        String(token.details?.property || token.name).includes('weight')
      ),
      lineHeights: [],
      letterSpacings: [],
    },
    spacing: tokenGroups.spacing,
    radius: tokenGroups.radius,
    shadows: tokenGroups.shadows,
    motion: tokenGroups.motion,
    gradients: tokenGroups.gradients,
    borders: tokenGroups.borders,
  }
}

export async function runSimpleScan({
  url,
  mode = 'fast',
  prettify = false,
  force = false,
}: SimpleScanInput): Promise<SimpleScanResult> {
  const target = normalizeUrl(url)
  const domain = target.hostname
  const startedAt = Date.now()

  if (!force) {
    const cached = await getScan(domain)
    if (cached && cached.status === 'completed') {
      const ageMs = Date.now() - new Date(cached.scannedAt).getTime()
      // Serve cache for 24h
      if (ageMs < 24 * 60 * 60 * 1000) {
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
          metadata: cached.metadata,
          database: storageMeta(
            `site_${domain}`,
            cached.metadata.scanId,
            cached.metadata.tokenSetId
          ),
          storage: storageMeta(
            `site_${domain}`,
            cached.metadata.scanId,
            cached.metadata.tokenSetId
          ),
          cacheHit: true,
        }
      }
    }
  }

  const staticCss = await collectStaticCss(target.toString())
  let computedCss: Awaited<ReturnType<typeof collectComputedCss>>['sources'] = []

  if (mode === 'accurate') {
    try {
      const computed = await collectComputedCss(target.toString(), {
        fastMode: false,
        maxMemoryMb: 80,
      })
      computedCss = computed.sources || []
    } catch (error) {
      console.warn('[simple-scan] computed CSS skipped:', error)
    }
  }

  const cssArtifacts = dedupeBySha([...staticCss, ...computedCss])
  if (cssArtifacts.length === 0) {
    throw new Error('No CSS sources discovered for the requested URL')
  }

  const generated = generateTokenSetLegacy(cssArtifacts, {
    domain,
    url: target.toString(),
  })
  const layoutDNA = analyzeLayout(cssArtifacts)
  void prettify
  const promptPack = buildPromptPack(
    {
      colors: generated.tokenGroups.colors,
      typography: generated.tokenGroups.typography,
      spacing: generated.tokenGroups.spacing,
    },
    layoutDNA
  )

  const scanId = createId('scan')
  const tokenSetId = createId('tokens')
  const processingTime = Date.now() - startedAt
  const curatedTokens = toCuratedTokens(generated.tokenGroups)

  const stored: StoredScanResult = {
    id: scanId,
    domain,
    url: target.toString(),
    scannedAt: new Date().toISOString(),
    status: 'completed',
    summary: {
      tokensExtracted: generated.summary.tokensExtracted,
      confidence: generated.summary.confidence,
      completeness: generated.summary.completeness,
      reliability: generated.summary.reliability,
      processingTime,
    },
    tokens: generated.tokenGroups,
    curatedTokens,
    layoutDNA,
    promptPack,
    brandAnalysis: {
      primaryColors: generated.tokenGroups.colors.slice(0, 5).map((token) => token.value),
      personality: 'extracted',
    },
    metadata: {
      cssSources: cssArtifacts.length,
      staticCssSources: staticCss.length,
      computedCssSources: computedCss.length,
      scanId,
      tokenSetId,
      mode,
    },
  }

  const site = await saveScan(stored)

  return {
    status: 'completed',
    domain,
    url: target.toString(),
    summary: stored.summary,
    tokens: stored.tokens,
    curatedTokens: stored.curatedTokens,
    layoutDNA: stored.layoutDNA,
    promptPack: stored.promptPack,
    brandAnalysis: stored.brandAnalysis,
    metadata: stored.metadata,
    database: storageMeta(site.id, scanId, tokenSetId),
    storage: storageMeta(site.id, scanId, tokenSetId),
    cacheHit: false,
  }
}

function dedupeBySha<T extends { sha: string }>(sources: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const source of sources) {
    if (seen.has(source.sha)) continue
    seen.add(source.sha)
    unique.push(source)
  }
  return unique
}
