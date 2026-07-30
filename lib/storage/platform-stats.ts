/**
 * Redis-backed platform counters for Library / scans / product telemetry.
 * Full scan payloads stay in Blob; this hash powers the header + /api/stats.
 */

import { Redis } from '@upstash/redis'

export const STATS_HASH_KEY = 'contextds:stats'

export type StatEvent =
  | 'scan'
  | 'cache_hit'
  | 'cache_miss'
  | 'library_view'
  | 'contract_open'
  | 'download'
  | 'chat_message'
  | 'agent_scan'

export type PlatformCounters = {
  sites: number
  tokens: number
  scans: number
  cacheHits: number
  cacheMisses: number
  libraryViews: number
  contractOpens: number
  downloads: number
  chatMessages: number
  agentScans: number
}

const EVENT_TO_FIELD: Record<StatEvent, keyof PlatformCounters> = {
  scan: 'scans',
  cache_hit: 'cacheHits',
  cache_miss: 'cacheMisses',
  library_view: 'libraryViews',
  contract_open: 'contractOpens',
  download: 'downloads',
  chat_message: 'chatMessages',
  agent_scan: 'agentScans',
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

export function isRedisConfigured(): boolean {
  return Boolean(getRedis())
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function emptyCounters(): PlatformCounters {
  return {
    sites: 0,
    tokens: 0,
    scans: 0,
    cacheHits: 0,
    cacheMisses: 0,
    libraryViews: 0,
    contractOpens: 0,
    downloads: 0,
    chatMessages: 0,
    agentScans: 0,
  }
}

export async function readPlatformCounters(): Promise<PlatformCounters | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const raw = await redis.hgetall<Record<string, string | number>>(STATS_HASH_KEY)
    const base = emptyCounters()
    if (!raw) return base

    return {
      sites: toNumber(raw.sites),
      tokens: toNumber(raw.tokens),
      scans: toNumber(raw.scans),
      cacheHits: toNumber(raw.cacheHits),
      cacheMisses: toNumber(raw.cacheMisses),
      libraryViews: toNumber(raw.libraryViews),
      contractOpens: toNumber(raw.contractOpens),
      downloads: toNumber(raw.downloads),
      chatMessages: toNumber(raw.chatMessages),
      agentScans: toNumber(raw.agentScans),
    }
  } catch (error) {
    console.warn('[platform-stats] read failed:', error)
    return null
  }
}

/** Atomically bump a single counter (events). */
export async function trackStatEvent(event: StatEvent, by = 1): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  const field = EVENT_TO_FIELD[event]
  try {
    await redis.hincrby(STATS_HASH_KEY, field, by)
    return true
  } catch (error) {
    console.warn('[platform-stats] track failed:', error)
    return false
  }
}

/** Snapshot directory totals into Redis (sites / tokens / scans). */
export async function writeDirectorySnapshot(snapshot: {
  sites: number
  tokens: number
  scans: number
}): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    await redis.hset(STATS_HASH_KEY, {
      sites: String(snapshot.sites),
      tokens: String(snapshot.tokens),
      scans: String(snapshot.scans),
      updatedAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.warn('[platform-stats] snapshot failed:', error)
    return false
  }
}

export function isStatEvent(value: unknown): value is StatEvent {
  return typeof value === 'string' && value in EVENT_TO_FIELD
}

export type PlatformStatsSnapshot = PlatformCounters & {
  updatedAt: string | null
}

/** Full Redis hash snapshot for /api/stats (counters + updatedAt). */
export async function getPlatformStatsSnapshot(): Promise<PlatformStatsSnapshot> {
  const redis = getRedis()
  const base = emptyCounters()
  if (!redis) {
    return { ...base, updatedAt: null }
  }

  try {
    const raw = await redis.hgetall<Record<string, string | number>>(STATS_HASH_KEY)
    if (!raw) return { ...base, updatedAt: null }

    return {
      sites: toNumber(raw.sites),
      tokens: toNumber(raw.tokens),
      scans: toNumber(raw.scans),
      cacheHits: toNumber(raw.cacheHits),
      cacheMisses: toNumber(raw.cacheMisses),
      libraryViews: toNumber(raw.libraryViews),
      contractOpens: toNumber(raw.contractOpens),
      downloads: toNumber(raw.downloads),
      chatMessages: toNumber(raw.chatMessages),
      agentScans: toNumber(raw.agentScans),
      updatedAt:
        typeof raw.updatedAt === 'string' && raw.updatedAt
          ? raw.updatedAt
          : null,
    }
  } catch (error) {
    console.warn('[platform-stats] snapshot failed:', error)
    return { ...base, updatedAt: null }
  }
}
