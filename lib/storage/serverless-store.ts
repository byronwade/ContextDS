/**
 * Free serverless persistence for Design Contracts.
 *
 * Priority order:
 * 1. Vercel Blob  — durable JSON payloads (Hobby-friendly)
 * 2. Upstash Redis — site index / recent / popular lookups (free tier)
 * 3. In-memory    — local/dev fallback when neither is configured
 *
 * No Postgres / Neon / Supabase database required.
 */

import { Redis } from '@upstash/redis'
import { del, get, list, put } from '@vercel/blob'
import {
  readPlatformCounters,
  trackStatEvent,
  writeDirectorySnapshot,
} from '@/lib/storage/platform-stats'

export interface SiteIndexEntry {
  id: string
  domain: string
  title: string | null
  description: string | null
  favicon: string | null
  popularity: number
  scanCount: number
  tokenCount: number
  /** Last scan confidence (0–100), when known */
  confidence?: number
  /** Category counts from the last curated scan, when known */
  curatedCount?: {
    colors: number
    fonts: number
    sizes: number
    spacing: number
    radius: number
    shadows: number
  }
  lastScanned: string | null
  status: 'completed' | 'failed' | 'scanning'
  /** Compact design-system preview for library cards */
  preview?: {
    colors: string[]
    fonts: string[]
    radius: string | null
    personality: string | null
  }
}

export interface StoredScanResult {
  id: string
  domain: string
  url: string
  scannedAt: string
  status: 'completed' | 'failed'
  summary: {
    tokensExtracted: number
    curatedCount?: {
      colors: number
      fonts: number
      sizes: number
      spacing: number
      radius: number
      shadows: number
    }
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  tokens: unknown
  curatedTokens?: unknown
  layoutDNA?: unknown
  promptPack?: unknown
  brandAnalysis?: unknown
  designMd?: {
    markdown: string
    fileName: string
    summary: {
      colorCount: number
      typographyCount: number
      spacingCount: number
      hasComponents: boolean
      hasMotion?: boolean
      hasPhilosophy?: boolean
      aiComposed?: boolean
    }
  }
  designSkill?: {
    markdown: string
    fileName: string
    skillName: string
    description: string
  }
  designContract?: {
    slug: string
    title: string
    profile: string
    installCommand: string
    summary: {
      colorCount: number
      typographyCount: number
      spacingCount: number
      fileCount: number
    }
    files: Array<{ path: string; content: string; encoding?: 'utf8' | 'base64' }>
    /** Present on API responses so clients can download the full pack */
    download?: string
  }
  /** Linked token↔role↔component↔layout model for agents */
  semanticGraph?: unknown
  /** UX DNA: app shell, page flow, motion vocabulary, density, measured components */
  uxDna?: {
    shell?: unknown
    density?: unknown
    components?: unknown
    flow?: Array<{ from: string; to: string }>
    keyframes?: Array<{ name: string; css: string }>
    transitions?: Array<{ value: string; weight: number }>
    interaction?: {
      rules: number
      effects: Array<{ value: string; weight: number }>
      samples: Array<{ selector: string; state: string; changes: string[] }>
    }
  }
  /** Captured page screenshots (Blob URLs when available) */
  screenshots?: Array<{
    label: string
    url: string
    mime?: string
    viewport?: 'mobile' | 'tablet' | 'desktop'
  }>
  metadata: {
    cssSources: number
    staticCssSources: number
    computedCssSources: number
    scanId: string
    tokenSetId: string
    /** The mode that actually ran — 'fast' when an accurate scan degraded. */
    mode: 'fast' | 'accurate'
    /** What the caller asked for, when it differs from what ran. */
    requestedMode?: 'fast' | 'accurate'
    /** Why an accurate scan degraded — absent on a clean run. */
    degradedReason?: string
    engine?: string
    browserEngine?: string
    wallace?: boolean
    pageTitle?: string
    /** Detected engine app type (COMPOSITION template) for the contract pack */
    appType?: string
    /** Detection confidence 0-1 for the app type classification */
    appTypeConfidence?: number
    /** Render-audit coverage — how well extraction matches the painted page */
    renderCoverage?: {
      overall: number
      colors: number
      fonts: number
      sizes: number
      verifiedColors: number
      dormantColors: number
      addedFromRender: number
      elementCount: number
      pagesAudited?: number
    }
    /** Multi-page crawl summary */
    crawl?: { pages: number; paths: string[] }
    /** Token-system consistency 0–100 from consistency-validator */
    consistencyScore?: number
    /** Vision draft surface kind when source is a screenshot */
    visionSurface?: string
    /** Vision distinctive signature */
    visionSignature?: string
    /** Number of screenshots in a Pro App Pack */
    appPackImages?: number
    /** ISO timestamp of last CSS remeasure */
    remeasuredAt?: string
    /** How CSS was collected during remeasure */
    remeasureSource?: 'browser-service' | 'local-playwright' | 'static-only'
    /** Prior vision / App Pack scan id before remeasure */
    visionBaselineScanId?: string
  }
  error?: string
}

/** Slim curated tokens stored on each version for rich diffs (no Postgres). */
export type ScanVersionCurated = {
  colors?: Array<{ name?: string; value?: string }>
  typography?: {
    families?: Array<{ name?: string; value?: string }>
    sizes?: Array<{ name?: string; value?: string }>
    weights?: Array<{ name?: string; value?: string }>
  }
  spacing?: Array<{ name?: string; value?: string }>
  radius?: Array<{ name?: string; value?: string }>
  shadows?: Array<{ name?: string; value?: string }>
  motion?: Array<{ name?: string; value?: string }>
}

/** Slim historical snapshot of one scan — enough to diff without the full payload. */
export interface ScanVersion {
  ts: string
  scanId: string
  tokensExtracted: number
  confidence: number
  colors: string[]
  fonts: string[]
  spacing: string[]
  radius: string[]
  screenshot: string | null
  personality: string | null
  /** Curated snapshot for compareTokenSets via curatedToW3CTokenSet */
  curated?: ScanVersionCurated
}

const MEMORY_SITES = new Map<string, SiteIndexEntry>()
const MEMORY_SCANS = new Map<string, StoredScanResult>()
const MEMORY_VERSIONS = new Map<string, ScanVersion[]>()
const MAX_VERSIONS = 20

const INDEX_BLOB_PATH = 'index/sites.json'
const SITE_KEY = (domain: string) => `contextds:site:${normalizeDomain(domain)}`
const RECENT_KEY = 'contextds:recent'
const POPULAR_KEY = 'contextds:popular'

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || process.env.KV_REST_API_URL
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN

  if (!url || !token || !url.startsWith('https')) {
    return null
  }

  return new Redis({ url, token })
}

function scanBlobPath(domain: string): string {
  return `scans/${normalizeDomain(domain)}/latest.json`
}

function versionsBlobPath(domain: string): string {
  return `scans/${normalizeDomain(domain)}/versions.json`
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

type BlobAccess = 'public' | 'private'

/**
 * Cache which access mode works for this store.
 * Private stores reject public puts; public stores reject private puts.
 * Production Hobby blobs are often public — private-only writes silently failed
 * and caused Open → /site to miss cache and re-scan forever.
 */
let resolvedBlobAccess: BlobAccess | null = null

function preferredBlobAccessOrder(): BlobAccess[] {
  const envAccess = process.env.BLOB_ACCESS
  if (envAccess === 'public' || envAccess === 'private') {
    return envAccess === 'public' ? ['public', 'private'] : ['private', 'public']
  }
  if (resolvedBlobAccess === 'public') return ['public', 'private']
  if (resolvedBlobAccess === 'private') return ['private', 'public']
  // Prefer private when possible; fall back for public stores.
  return ['private', 'public']
}

function isWrongAccessError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('public store') ||
    message.includes('private store') ||
    message.includes('private access') ||
    message.includes('public access')
  )
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  if (!hasBlob()) return null

  // 1) Authenticated get (works for private stores; may 400 on public stores)
  for (const access of preferredBlobAccessOrder()) {
    try {
      const result = await get(pathname, { access, useCache: false })
      if (result?.stream) {
        resolvedBlobAccess = access
        const text = await new Response(result.stream).text()
        return JSON.parse(text) as T
      }
    } catch (error) {
      if (!isWrongAccessError(error)) {
        // Continue to list/fetch fallback for missing/legacy blobs
        break
      }
    }
  }

  // 2) Public URL via list (public stores + older uploads)
  try {
    const { blobs } = await list({ prefix: pathname, limit: 5 })
    const match = blobs.find((blob) => blob.pathname === pathname) ?? blobs[0]
    if (!match) return null

    const response = await fetch(match.url, { cache: 'no-store' })
    if (!response.ok) return null
    resolvedBlobAccess = 'public'
    return (await response.json()) as T
  } catch (error) {
    console.warn('[serverless-store] blob read failed:', error)
    return null
  }
}

async function writeBlobJson(pathname: string, data: unknown): Promise<string | null> {
  if (!hasBlob()) return null

  const body = JSON.stringify(data)
  let lastError: unknown = null

  for (const access of preferredBlobAccessOrder()) {
    try {
      const blob = await put(pathname, body, {
        access,
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      resolvedBlobAccess = access
      return blob.url
    } catch (error) {
      lastError = error
      if (isWrongAccessError(error)) {
        continue
      }
      console.warn('[serverless-store] blob write failed:', error)
      return null
    }
  }

  console.warn('[serverless-store] blob write failed:', lastError)
  return null
}

async function loadDirectoryFromBlob(): Promise<SiteIndexEntry[]> {
  const data = await readBlobJson<{ sites: SiteIndexEntry[] }>(INDEX_BLOB_PATH)
  return data?.sites ?? []
}

async function saveDirectoryToBlob(sites: SiteIndexEntry[]): Promise<void> {
  await writeBlobJson(INDEX_BLOB_PATH, {
    updatedAt: new Date().toISOString(),
    sites,
  })
}

function countTokens(tokens: unknown): number {
  if (!tokens || typeof tokens !== 'object') return 0
  const groups = tokens as Record<string, unknown>
  return Object.values(groups).reduce<number>((sum, value) => {
    if (Array.isArray(value)) return sum + value.length
    if (value && typeof value === 'object') {
      return (
        sum +
        Object.values(value as Record<string, unknown>).reduce<number>((inner, item) => {
          return inner + (Array.isArray(item) ? item.length : 0)
        }, 0)
      )
    }
    return sum
  }, 0)
}

export async function getSite(domain: string): Promise<SiteIndexEntry | null> {
  const key = normalizeDomain(domain)
  const redis = getRedis()

  if (redis) {
    const site = await redis.get<SiteIndexEntry>(SITE_KEY(key))
    if (site) return site
  }

  if (MEMORY_SITES.has(key)) {
    return MEMORY_SITES.get(key) ?? null
  }

  const directory = await loadDirectoryFromBlob()
  return directory.find((site) => site.domain === key) ?? null
}

/** Upsert one entry into the durable Blob directory (best-effort mirror). */
async function upsertDirectoryBlob(site: SiteIndexEntry): Promise<void> {
  try {
    const directory = await loadDirectoryFromBlob()
    const next = directory.filter((entry) => entry.domain !== site.domain)
    next.push(site)
    next.sort(
      (a, b) => new Date(b.lastScanned ?? 0).getTime() - new Date(a.lastScanned ?? 0).getTime()
    )
    await saveDirectoryToBlob(next.slice(0, 500))
  } catch (error) {
    console.warn('[serverless-store] directory mirror failed:', error)
  }
}

/** Best-effort: refill Redis index keys from a Blob directory snapshot. */
async function rehydrateRedisFromDirectory(
  redis: Redis,
  sites: SiteIndexEntry[]
): Promise<void> {
  try {
    await Promise.all(
      sites.slice(0, 200).flatMap((site) => [
        redis.set(SITE_KEY(site.domain), site),
        redis.zadd(RECENT_KEY, {
          score: new Date(site.lastScanned ?? 0).getTime() || Date.now(),
          member: site.domain,
        }),
        redis.zadd(POPULAR_KEY, { score: site.popularity, member: site.domain }),
      ])
    )
  } catch (error) {
    console.warn('[serverless-store] redis rehydrate failed:', error)
  }
}

async function persistSiteIndex(site: SiteIndexEntry): Promise<void> {
  MEMORY_SITES.set(site.domain, site)
  const redis = getRedis()
  if (redis) {
    await Promise.all([
      redis.set(SITE_KEY(site.domain), site),
      redis.zadd(POPULAR_KEY, { score: site.popularity, member: site.domain }),
    ])
  }

  // Always mirror to Blob so the library survives Redis flushes / env changes.
  await upsertDirectoryBlob(site)
}

/** Increment popularity for library voting (id or domain). */
export async function bumpSitePopularity(
  siteIdOrDomain: string
): Promise<SiteIndexEntry | null> {
  const redis = getRedis()
  let site: SiteIndexEntry | null = null

  if (redis) {
    const domains = await redis.zrange<string[]>(POPULAR_KEY, 0, -1)
    for (const domain of domains) {
      const entry = await redis.get<SiteIndexEntry>(SITE_KEY(String(domain)))
      if (entry && (entry.id === siteIdOrDomain || entry.domain === siteIdOrDomain)) {
        site = entry
        break
      }
    }
  }

  if (!site) {
    for (const entry of MEMORY_SITES.values()) {
      if (entry.id === siteIdOrDomain || entry.domain === siteIdOrDomain) {
        site = entry
        break
      }
    }
  }

  if (!site) {
    const directory = await loadDirectoryFromBlob()
    site =
      directory.find(
        (entry) => entry.id === siteIdOrDomain || entry.domain === siteIdOrDomain
      ) ?? null
  }

  if (!site) return null

  const next: SiteIndexEntry = {
    ...site,
    popularity: (site.popularity ?? 0) + 1,
  }
  await persistSiteIndex(next)
  return next
}

export async function getScan(domain: string): Promise<StoredScanResult | null> {
  const key = normalizeDomain(domain)

  if (MEMORY_SCANS.has(key)) {
    return MEMORY_SCANS.get(key) ?? null
  }

  const fromBlob = await readBlobJson<StoredScanResult>(scanBlobPath(key))
  if (fromBlob) {
    MEMORY_SCANS.set(key, fromBlob)
    return fromBlob
  }

  return null
}

function slimCuratedForVersion(result: StoredScanResult): ScanVersionCurated {
  const curated = (result.curatedTokens ?? {}) as {
    colors?: Array<{ name?: unknown; value?: unknown; usage?: number }>
    typography?: {
      families?: Array<{ name?: unknown; value?: unknown }>
      sizes?: Array<{ name?: unknown; value?: unknown }>
      weights?: Array<{ name?: unknown; value?: unknown }>
    }
    spacing?: Array<{ name?: unknown; value?: unknown }>
    radius?: Array<{ name?: unknown; value?: unknown }>
    shadows?: Array<{ name?: unknown; value?: unknown }>
    motion?: Array<{ name?: unknown; value?: unknown }>
  }
  const pick = (
    tokens: Array<{ name?: unknown; value?: unknown }> | undefined,
    limit: number
  ) =>
    (tokens ?? [])
      .map((token) => ({
        name: token.name != null ? String(token.name) : undefined,
        value: token.value != null ? String(token.value) : undefined,
      }))
      .filter((token) => Boolean(token.value))
      .slice(0, limit)

  return {
    colors: pick(
      (curated.colors ?? [])
        .slice()
        .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0)),
      32
    ),
    typography: {
      families: pick(curated.typography?.families, 8),
      sizes: pick(curated.typography?.sizes, 16),
      weights: pick(curated.typography?.weights, 8),
    },
    spacing: pick(curated.spacing, 24),
    radius: pick(curated.radius, 12),
    shadows: pick(curated.shadows, 8),
    motion: pick(curated.motion, 8),
  }
}

function buildVersionSnapshot(result: StoredScanResult): ScanVersion {
  const curated = slimCuratedForVersion(result)
  const brand = (result.brandAnalysis ?? {}) as { personality?: unknown }
  return {
    ts: result.scannedAt || new Date().toISOString(),
    scanId: result.metadata?.scanId || result.id,
    tokensExtracted: result.summary.tokensExtracted,
    confidence: Math.round(result.summary.confidence),
    colors: (curated.colors ?? [])
      .map((token) => String(token.value ?? ''))
      .filter(Boolean)
      .slice(0, 24),
    fonts: (curated.typography?.families ?? [])
      .map((token) => String(token.value ?? '').split(',')[0].replace(/['"]/g, '').trim())
      .filter(Boolean)
      .slice(0, 4),
    spacing: (curated.spacing ?? []).map((token) => String(token.value ?? '')).slice(0, 16),
    radius: (curated.radius ?? []).map((token) => String(token.value ?? '')).slice(0, 8),
    screenshot:
      result.screenshots?.find(
        (shot) => shot.viewport === 'desktop' && !/full/.test(shot.label)
      )?.url ??
      result.screenshots?.[0]?.url ??
      null,
    personality:
      typeof brand.personality === 'string' && brand.personality ? brand.personality : null,
    curated,
  }
}

/** Append a version snapshot for the domain (Blob + memory, capped). */
async function appendScanVersion(result: StoredScanResult): Promise<void> {
  const domain = normalizeDomain(result.domain)
  try {
    const snapshot = buildVersionSnapshot(result)
    const existing = await listScanVersions(domain)
    // Skip near-duplicates: same scanId, or identical palette within an hour.
    const last = existing[0]
    if (last) {
      const sameScan = last.scanId === snapshot.scanId
      const samePalette =
        JSON.stringify(last.colors) === JSON.stringify(snapshot.colors) &&
        Math.abs(new Date(last.ts).getTime() - new Date(snapshot.ts).getTime()) <
          60 * 60 * 1000
      if (sameScan || samePalette) return
    }
    const next = [snapshot, ...existing].slice(0, MAX_VERSIONS)
    MEMORY_VERSIONS.set(domain, next)
    await writeBlobJson(versionsBlobPath(domain), { domain, versions: next })
  } catch (error) {
    console.warn('[serverless-store] version snapshot failed:', error)
  }
}

/** Version history for a domain, newest first. */
export async function listScanVersions(domain: string): Promise<ScanVersion[]> {
  const key = normalizeDomain(domain)
  if (MEMORY_VERSIONS.has(key)) return MEMORY_VERSIONS.get(key) ?? []
  const data = await readBlobJson<{ versions?: ScanVersion[] }>(versionsBlobPath(key))
  const versions = Array.isArray(data?.versions) ? data.versions : []
  MEMORY_VERSIONS.set(key, versions)
  return versions
}

/** Compact preview of the scanned system for library cards. */
function buildPreview(result: StoredScanResult): SiteIndexEntry['preview'] {
  const curated = (result.curatedTokens ?? {}) as {
    colors?: Array<{ value?: unknown; usage?: number }>
    typography?: { families?: Array<{ value?: unknown }> }
    radius?: Array<{ value?: unknown }>
  }
  const brand = (result.brandAnalysis ?? {}) as {
    primaryColors?: unknown[]
    personality?: unknown
  }

  const brandColors = Array.isArray(brand.primaryColors)
    ? brand.primaryColors.map(String).filter(Boolean)
    : []
  const curatedColors = (curated.colors ?? [])
    .slice()
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
    .map((token) => String(token.value ?? ''))
    .filter(Boolean)
  const colors = Array.from(new Set([...brandColors, ...curatedColors])).slice(0, 8)

  const fonts = (curated.typography?.families ?? [])
    .map((token) => String(token.value ?? '').split(',')[0].replace(/['"]/g, '').trim())
    .filter(Boolean)
    .slice(0, 2)

  const radius = curated.radius?.[0]?.value != null ? String(curated.radius[0].value) : null
  const personality =
    typeof brand.personality === 'string' && brand.personality.trim()
      ? brand.personality.trim()
      : null

  if (colors.length === 0 && fonts.length === 0) return undefined
  return { colors, fonts, radius, personality }
}

export async function saveScan(result: StoredScanResult): Promise<SiteIndexEntry> {
  const domain = normalizeDomain(result.domain)
  const existing = await getSite(domain)
  const tokenCount =
    result.summary.tokensExtracted ||
    countTokens(result.curatedTokens) ||
    countTokens(result.tokens)

  const site: SiteIndexEntry = {
    id: existing?.id ?? createId('site'),
    domain,
    title: existing?.title ?? `${domain} design tokens`,
    description: existing?.description ?? `Design tokens extracted from ${domain}`,
    favicon: existing?.favicon ?? null,
    popularity: (existing?.popularity ?? 0) + 1,
    scanCount: (existing?.scanCount ?? 0) + 1,
    tokenCount,
    confidence: result.summary.confidence,
    curatedCount: result.summary.curatedCount,
    lastScanned: result.scannedAt,
    status: result.status === 'completed' ? 'completed' : 'failed',
    preview: buildPreview(result) ?? existing?.preview,
  }

  const persisted: StoredScanResult = {
    ...result,
    id: result.id || createId('scan'),
    domain,
    metadata: {
      ...result.metadata,
      scanId: result.metadata.scanId || createId('scan'),
      tokenSetId: result.metadata.tokenSetId || createId('tokens'),
    },
  }

  MEMORY_SITES.set(domain, site)
  MEMORY_SCANS.set(domain, persisted)

  await writeBlobJson(scanBlobPath(domain), persisted)

  const redis = getRedis()
  if (redis) {
    const scannedAt = new Date(result.scannedAt).getTime() || Date.now()
    await Promise.all([
      redis.set(SITE_KEY(domain), site),
      redis.zadd(RECENT_KEY, { score: scannedAt, member: domain }),
      redis.zadd(POPULAR_KEY, { score: site.popularity, member: domain }),
    ])
  }

  // Always mirror the directory to Blob — the library must survive Redis
  // flushes, env swaps and cold regions, not just serve from the index.
  await upsertDirectoryBlob(site)

  // Record a slim version snapshot so the dossier can diff scans over time.
  if (result.status === 'completed') {
    await appendScanVersion(persisted)
  }

  if (redis) {
    // Keep header counters fresh in Redis
    await trackStatEvent('scan', 1)
    const allForSnap = await listSites({ sort: 'recent', limit: 500 })
    const tokensTotal = allForSnap.reduce((sum, entry) => sum + entry.tokenCount, 0)
    const scansTotal = allForSnap.reduce((sum, entry) => sum + entry.scanCount, 0)
    await writeDirectorySnapshot({
      sites: allForSnap.length,
      tokens: tokensTotal,
      scans: scansTotal,
    })
  }

  return site
}

export async function listSites(options?: {
  sort?: 'recent' | 'popular' | 'tokens' | 'votes'
  limit?: number
}): Promise<SiteIndexEntry[]> {
  const sort = options?.sort ?? 'recent'
  const limit = options?.limit ?? 50
  const redis = getRedis()

  let sites: SiteIndexEntry[] = []

  if (redis) {
    const key = sort === 'popular' || sort === 'votes' ? POPULAR_KEY : RECENT_KEY
    const domains = await redis.zrange<string[]>(key, 0, limit - 1, { rev: true })
    const entries = await Promise.all(
      domains.map((domain) => redis.get<SiteIndexEntry>(SITE_KEY(domain)))
    )
    sites = entries.filter((entry): entry is SiteIndexEntry => Boolean(entry))

    if (sites.length === 0) {
      // Fresh or flushed Redis — heal from the durable Blob directory and
      // refill the index so the library never renders empty while data exists.
      sites = await loadDirectoryFromBlob()
      if (sites.length > 0) {
        void rehydrateRedisFromDirectory(redis, sites)
      }
    }
  } else if (MEMORY_SITES.size > 0) {
    sites = Array.from(MEMORY_SITES.values())
  } else {
    sites = await loadDirectoryFromBlob()
  }

  const sorted = [...sites]
  switch (sort) {
    case 'tokens':
      sorted.sort((a, b) => b.tokenCount - a.tokenCount)
      break
    case 'popular':
    case 'votes':
      sorted.sort((a, b) => b.popularity - a.popularity)
      break
    case 'recent':
    default:
      sorted.sort(
        (a, b) => new Date(b.lastScanned ?? 0).getTime() - new Date(a.lastScanned ?? 0).getTime()
      )
      break
  }

  return sorted.slice(0, limit)
}

export async function getDirectoryStats(): Promise<{
  sites: number
  tokens: number
  scans: number
  tokenSets: number
  averageConfidence: number
  categories: Record<string, number>
  cacheHits: number
  cacheMisses: number
  libraryViews: number
  contractOpens: number
  downloads: number
  chatMessages: number
  agentScans: number
  recentActivity: Array<{ domain: string; scannedAt: string | null; tokens: number }>
  popularSites: Array<{
    domain: string
    popularity: number
    tokens: number
    lastScanned: string | null
  }>
}> {
  const [recent, popular, all, counters] = await Promise.all([
    listSites({ sort: 'recent', limit: 10 }),
    listSites({ sort: 'popular', limit: 10 }),
    listSites({ sort: 'recent', limit: 500 }),
    readPlatformCounters(),
  ])

  const tokensFromDir = all.reduce((sum, site) => sum + site.tokenCount, 0)
  const scansFromDir = all.reduce((sum, site) => sum + site.scanCount, 0)
  const withConfidence = all.filter((site) => typeof site.confidence === 'number')
  const averageConfidence = withConfidence.length
    ? withConfidence.reduce((sum, site) => sum + (site.confidence ?? 0), 0) /
      withConfidence.length
    : 0

  const categories = all.reduce(
    (acc, site) => {
      const c = site.curatedCount
      if (!c) return acc
      acc.colors += c.colors
      acc.typography += c.fonts + c.sizes
      acc.spacing += c.spacing
      acc.shadows += c.shadows
      acc.radius += c.radius
      return acc
    },
    { colors: 0, typography: 0, spacing: 0, shadows: 0, radius: 0, motion: 0 }
  )

  // Prefer Redis snapshot when present; fall back to directory aggregation.
  const sites = counters && counters.sites > 0 ? counters.sites : all.length
  const tokens = counters && counters.tokens > 0 ? counters.tokens : tokensFromDir
  const scans = counters && counters.scans > 0 ? counters.scans : scansFromDir

  // Keep Redis snapshot warm when we have directory data but empty counters.
  if (getRedis() && all.length > 0 && (!counters || counters.sites === 0)) {
    void writeDirectorySnapshot({
      sites: all.length,
      tokens: tokensFromDir,
      scans: scansFromDir,
    })
  }

  return {
    sites,
    tokens,
    scans,
    tokenSets: sites,
    averageConfidence,
    categories,
    cacheHits: counters?.cacheHits ?? 0,
    cacheMisses: counters?.cacheMisses ?? 0,
    libraryViews: counters?.libraryViews ?? 0,
    contractOpens: counters?.contractOpens ?? 0,
    downloads: counters?.downloads ?? 0,
    chatMessages: counters?.chatMessages ?? 0,
    agentScans: counters?.agentScans ?? 0,
    recentActivity: recent.map((site) => ({
      domain: site.domain,
      scannedAt: site.lastScanned,
      tokens: site.tokenCount,
    })),
    popularSites: popular.map((site) => ({
      domain: site.domain,
      popularity: site.popularity,
      tokens: site.tokenCount,
      lastScanned: site.lastScanned,
    })),
  }
}

export function getStorageBackend(): {
  blob: boolean
  redis: boolean
  memory: boolean
} {
  return {
    blob: hasBlob(),
    redis: Boolean(getRedis()),
    memory: true,
  }
}

export async function deleteSite(domain: string): Promise<void> {
  const key = normalizeDomain(domain)
  MEMORY_SITES.delete(key)
  MEMORY_SCANS.delete(key)

  const redis = getRedis()
  if (redis) {
    await Promise.all([
      redis.del(SITE_KEY(key)),
      redis.zrem(RECENT_KEY, key),
      redis.zrem(POPULAR_KEY, key),
    ])
  }

  if (hasBlob()) {
    try {
      const { blobs } = await list({ prefix: `scans/${key}/` })
      if (blobs.length) {
        await Promise.all(blobs.map((blob) => del(blob.url)))
      }
      const directory = await loadDirectoryFromBlob()
      await saveDirectoryToBlob(directory.filter((site) => site.domain !== key))
    } catch (error) {
      console.warn('[serverless-store] delete failed:', error)
    }
  }
}
