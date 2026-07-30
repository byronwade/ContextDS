/**
 * Free serverless persistence for ContextDS.
 *
 * Priority order:
 * 1. Vercel Blob  — durable JSON payloads (Hobby-friendly)
 * 2. Upstash Redis — site index / recent / popular lookups (free tier)
 * 3. In-memory    — local/dev fallback when neither is configured
 *
 * No Postgres / Neon / Supabase database required.
 */

import { put, list, del } from '@vercel/blob'
import { Redis } from '@upstash/redis'

export interface SiteIndexEntry {
  id: string
  domain: string
  title: string | null
  description: string | null
  favicon: string | null
  popularity: number
  scanCount: number
  tokenCount: number
  lastScanned: string | null
  status: 'completed' | 'failed' | 'scanning'
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
    files: Array<{ path: string; content: string }>
  }
  metadata: {
    cssSources: number
    staticCssSources: number
    computedCssSources: number
    scanId: string
    tokenSetId: string
    mode: 'fast' | 'accurate'
    engine?: string
  }
  error?: string
}

const MEMORY_SITES = new Map<string, SiteIndexEntry>()
const MEMORY_SCANS = new Map<string, StoredScanResult>()

const INDEX_BLOB_PATH = 'index/sites.json'
const SITE_KEY = (domain: string) => `contextds:site:${normalizeDomain(domain)}`
const RECENT_KEY = 'contextds:recent'
const POPULAR_KEY = 'contextds:popular'
const STATS_KEY = 'contextds:stats'

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
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    process.env.KV_REST_API_URL
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN ||
    process.env.KV_REST_API_TOKEN

  if (!url || !token || !url.startsWith('https')) {
    return null
  }

  return new Redis({ url, token })
}

function scanBlobPath(domain: string): string {
  return `scans/${normalizeDomain(domain)}/latest.json`
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  if (!hasBlob()) return null

  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    const match = blobs.find((blob) => blob.pathname === pathname) ?? blobs[0]
    if (!match) return null

    const response = await fetch(match.url, { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch (error) {
    console.warn('[serverless-store] blob read failed:', error)
    return null
  }
}

async function writeBlobJson(pathname: string, data: unknown): Promise<string | null> {
  if (!hasBlob()) return null

  try {
    const blob = await put(pathname, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return blob.url
  } catch (error) {
    console.warn('[serverless-store] blob write failed:', error)
    return null
  }
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
  return Object.values(groups).reduce((sum, value) => {
    if (Array.isArray(value)) return sum + value.length
    if (value && typeof value === 'object') {
      return (
        sum +
        Object.values(value as Record<string, unknown>).reduce((inner, item) => {
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
    lastScanned: result.scannedAt,
    status: result.status === 'completed' ? 'completed' : 'failed',
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
      redis.hincrby(STATS_KEY, 'scans', 1),
      redis.hset(STATS_KEY, {
        sites: String(await redis.zcard(POPULAR_KEY)),
        tokens: String(tokenCount),
      }),
    ])
  } else {
    const directory = await loadDirectoryFromBlob()
    const next = directory.filter((entry) => entry.domain !== domain)
    next.push(site)
    next.sort(
      (a, b) =>
        new Date(b.lastScanned ?? 0).getTime() - new Date(a.lastScanned ?? 0).getTime()
    )
    await saveDirectoryToBlob(next.slice(0, 500))
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
    const entries = await Promise.all(domains.map((domain) => redis.get<SiteIndexEntry>(SITE_KEY(domain))))
    sites = entries.filter((entry): entry is SiteIndexEntry => Boolean(entry))
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
        (a, b) =>
          new Date(b.lastScanned ?? 0).getTime() - new Date(a.lastScanned ?? 0).getTime()
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
  recentActivity: Array<{ domain: string; scannedAt: string | null; tokens: number }>
  popularSites: Array<{
    domain: string
    popularity: number
    tokens: number
    lastScanned: string | null
  }>
}> {
  const recent = await listSites({ sort: 'recent', limit: 10 })
  const popular = await listSites({ sort: 'popular', limit: 10 })
  const all = await listSites({ sort: 'recent', limit: 500 })

  const tokens = all.reduce((sum, site) => sum + site.tokenCount, 0)
  const scans = all.reduce((sum, site) => sum + site.scanCount, 0)

  return {
    sites: all.length,
    tokens,
    scans,
    tokenSets: all.length,
    averageConfidence: all.length ? 78 : 0,
    categories: {
      colors: Math.round(tokens * 0.35),
      typography: Math.round(tokens * 0.2),
      spacing: Math.round(tokens * 0.2),
      shadows: Math.round(tokens * 0.1),
      radius: Math.round(tokens * 0.1),
      motion: Math.round(tokens * 0.05),
    },
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
