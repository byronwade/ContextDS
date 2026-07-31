/**
 * Persistence for user-authored design systems (Library → "User systems").
 *
 * Same free serverless stack as the scanned-site index:
 * 1. Vercel Blob  — durable per-system JSON + a directory snapshot
 * 2. Upstash Redis — id lookups + a recency index
 * 3. In-memory    — local/dev fallback when neither is configured
 *
 * A system stored here is the exact WorkingSystem the canvas edits, so
 * `/scan?system=<id>` can rehydrate it without any lossy conversion.
 */

import { Redis } from '@upstash/redis'
import { del, get, list, put } from '@vercel/blob'
import { isRenderableColor, type SystemOrigin, type WorkingSystem } from '@/lib/design-system/working-system'

export interface StoredSystem {
  id: string
  slug: string
  name: string
  system: WorkingSystem
  origin: SystemOrigin
  visibility: 'public' | 'private'
  createdAt: string
  updatedAt: string
  revisionCount: number
  /** Same shape as SiteIndexEntry.preview so library cards render identically */
  preview: {
    colors: string[]
    fonts: string[]
    radius: string | null
    personality: string | null
  }
}

const MEMORY_SYSTEMS = new Map<string, StoredSystem>()

const INDEX_BLOB_PATH = 'index/systems.json'
const SYSTEM_KEY = (id: string) => `contextds:system:${id}`
const SYSTEMS_RECENT_KEY = 'contextds:systems'
const MAX_DIRECTORY = 500

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

function systemBlobPath(id: string): string {
  return `systems/${id}.json`
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

type BlobAccess = 'public' | 'private'

/** Cache which access mode works for this store (see serverless-store). */
let resolvedBlobAccess: BlobAccess | null = null

function preferredBlobAccessOrder(): BlobAccess[] {
  const envAccess = process.env.BLOB_ACCESS
  if (envAccess === 'public' || envAccess === 'private') {
    return envAccess === 'public' ? ['public', 'private'] : ['private', 'public']
  }
  if (resolvedBlobAccess === 'public') return ['public', 'private']
  if (resolvedBlobAccess === 'private') return ['private', 'public']
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
        break
      }
    }
  }

  try {
    const { blobs } = await list({ prefix: pathname, limit: 5 })
    const match = blobs.find((blob) => blob.pathname === pathname) ?? blobs[0]
    if (!match) return null

    const response = await fetch(match.url, { cache: 'no-store' })
    if (!response.ok) return null
    resolvedBlobAccess = 'public'
    return (await response.json()) as T
  } catch (error) {
    console.warn('[system-store] blob read failed:', error)
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
      console.warn('[system-store] blob write failed:', error)
      return null
    }
  }

  console.warn('[system-store] blob write failed:', lastError)
  return null
}

async function loadDirectoryFromBlob(): Promise<StoredSystem[]> {
  const data = await readBlobJson<{ systems: StoredSystem[] }>(INDEX_BLOB_PATH)
  return data?.systems ?? []
}

async function saveDirectoryToBlob(systems: StoredSystem[]): Promise<void> {
  await writeBlobJson(INDEX_BLOB_PATH, {
    updatedAt: new Date().toISOString(),
    systems,
  })
}

/** Upsert one entry into the durable Blob directory (best-effort mirror). */
async function upsertDirectoryBlob(stored: StoredSystem): Promise<void> {
  try {
    const directory = await loadDirectoryFromBlob()
    const next = directory.filter((entry) => entry.id !== stored.id)
    next.push(stored)
    next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    await saveDirectoryToBlob(next.slice(0, MAX_DIRECTORY))
  } catch (error) {
    console.warn('[system-store] directory mirror failed:', error)
  }
}

/** Best-effort: refill Redis keys from a Blob directory snapshot. */
async function rehydrateRedisFromDirectory(
  redis: Redis,
  systems: StoredSystem[]
): Promise<void> {
  try {
    await Promise.all(
      systems.slice(0, 200).flatMap((stored) => [
        redis.set(SYSTEM_KEY(stored.id), stored),
        redis.zadd(SYSTEMS_RECENT_KEY, {
          score: new Date(stored.updatedAt).getTime() || Date.now(),
          member: stored.id,
        }),
      ])
    )
  } catch (error) {
    console.warn('[system-store] redis rehydrate failed:', error)
  }
}

/** Compact preview of the authored system for library cards. */
function buildPreview(system: WorkingSystem): StoredSystem['preview'] {
  const colors = Array.from(
    new Set(
      system.colors
        .map((color) => String(color.value ?? '').trim())
        .filter((value) => value && isRenderableColor(value))
    )
  ).slice(0, 8)

  const fonts = Array.from(
    new Set(
      [system.fontDisplay, system.fontBody]
        .map((font) => String(font ?? '').split(',')[0].replace(/['"]/g, '').trim())
        .filter(Boolean)
    )
  ).slice(0, 2)

  const personality =
    typeof system.philosophyNote === 'string' && system.philosophyNote.trim()
      ? system.philosophyNote.trim()
      : null

  return {
    colors,
    fonts,
    radius: Number.isFinite(system.radius) ? `${system.radius}px` : null,
    personality,
  }
}

export async function getSystem(id: string): Promise<StoredSystem | null> {
  const key = id.trim()
  if (!key) return null

  const redis = getRedis()
  if (redis) {
    const stored = await redis.get<StoredSystem>(SYSTEM_KEY(key))
    if (stored) return stored
  }

  if (MEMORY_SYSTEMS.has(key)) {
    return MEMORY_SYSTEMS.get(key) ?? null
  }

  const fromBlob = await readBlobJson<StoredSystem>(systemBlobPath(key))
  if (fromBlob) {
    MEMORY_SYSTEMS.set(key, fromBlob)
    return fromBlob
  }

  const directory = await loadDirectoryFromBlob()
  return directory.find((stored) => stored.id === key) ?? null
}

/**
 * Upsert a user system. Without an id a new one is minted; with a known id the
 * record is updated in place, bumping `revisionCount` and `updatedAt`.
 */
export async function saveSystem(input: {
  id?: string
  system: WorkingSystem
  visibility?: 'public' | 'private'
}): Promise<StoredSystem> {
  const existing = input.id ? await getSystem(input.id) : null
  const id = existing?.id ?? input.id?.trim() ?? createId('sys')
  const now = new Date().toISOString()

  const system: WorkingSystem = { ...input.system, id }
  const name = (system.name || existing?.name || 'Untitled system').slice(0, 80)

  const stored: StoredSystem = {
    id,
    slug: system.slug || existing?.slug || id,
    name,
    system,
    origin: system.origin ?? existing?.origin ?? { kind: 'blank' },
    visibility: input.visibility ?? existing?.visibility ?? 'public',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    revisionCount: (existing?.revisionCount ?? 0) + 1,
    preview: buildPreview(system),
  }

  MEMORY_SYSTEMS.set(id, stored)

  await writeBlobJson(systemBlobPath(id), stored)

  const redis = getRedis()
  if (redis) {
    await Promise.all([
      redis.set(SYSTEM_KEY(id), stored),
      redis.zadd(SYSTEMS_RECENT_KEY, {
        score: new Date(stored.updatedAt).getTime() || Date.now(),
        member: id,
      }),
    ])
  }

  // Always mirror the directory to Blob — the library must survive Redis
  // flushes, env swaps and cold regions.
  await upsertDirectoryBlob(stored)

  return stored
}

/** User systems, newest first. */
export async function listSystems(options?: {
  limit?: number
  visibility?: 'public' | 'private'
}): Promise<StoredSystem[]> {
  const limit = options?.limit ?? 50
  const redis = getRedis()

  let systems: StoredSystem[] = []

  if (redis) {
    const ids = await redis.zrange<string[]>(SYSTEMS_RECENT_KEY, 0, -1, { rev: true })
    const entries = await Promise.all(
      ids.map((id) => redis.get<StoredSystem>(SYSTEM_KEY(String(id))))
    )
    systems = entries.filter((entry): entry is StoredSystem => Boolean(entry))

    if (systems.length === 0) {
      // Fresh or flushed Redis — heal from the durable Blob directory.
      systems = await loadDirectoryFromBlob()
      if (systems.length > 0) {
        void rehydrateRedisFromDirectory(redis, systems)
      }
    }
  } else if (MEMORY_SYSTEMS.size > 0) {
    systems = Array.from(MEMORY_SYSTEMS.values())
  } else {
    systems = await loadDirectoryFromBlob()
  }

  const filtered = options?.visibility
    ? systems.filter((stored) => stored.visibility === options.visibility)
    : systems

  return [...filtered]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}

export async function deleteSystem(id: string): Promise<boolean> {
  const key = id.trim()
  if (!key) return false

  const existing = await getSystem(key)
  MEMORY_SYSTEMS.delete(key)

  const redis = getRedis()
  if (redis) {
    await Promise.all([redis.del(SYSTEM_KEY(key)), redis.zrem(SYSTEMS_RECENT_KEY, key)])
  }

  if (hasBlob()) {
    try {
      const { blobs } = await list({ prefix: systemBlobPath(key) })
      if (blobs.length) {
        await Promise.all(blobs.map((blob) => del(blob.url)))
      }
      const directory = await loadDirectoryFromBlob()
      if (directory.some((stored) => stored.id === key)) {
        await saveDirectoryToBlob(directory.filter((stored) => stored.id !== key))
      }
    } catch (error) {
      console.warn('[system-store] delete failed:', error)
    }
  }

  return Boolean(existing)
}
