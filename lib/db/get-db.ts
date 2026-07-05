import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { createDb, type Database } from './d1'

export type { Database }
export { createDb }

declare global {
  // eslint-disable-next-line no-var
  var __contextdsDb: Database | undefined
  // eslint-disable-next-line no-var
  var __contextdsDbInit: Promise<Database> | undefined
}

function createBuildStub(): Database {
  const empty = Promise.resolve([])

  const makeChain = (): unknown => {
    const chain: Record<string, unknown> = {}
    const handler = () => makeChain()
    chain.from = handler
    chain.where = handler
    chain.limit = () => empty
    chain.orderBy = handler
    chain.leftJoin = handler
    chain.innerJoin = handler
    chain.offset = handler
    chain.values = () => ({ returning: () => empty, onConflictDoUpdate: () => empty })
    chain.set = () => ({ where: () => ({ returning: () => empty }) })
    chain.returning = () => empty
    chain.onConflictDoNothing = () => empty
    return chain
  }

  return {
    select: () => makeChain(),
    insert: () => makeChain(),
    update: () => makeChain(),
    delete: () => makeChain(),
    all: async () => [],
    get: async () => undefined,
    run: async () => ({ success: true }),
    batch: async () => [],
    transaction: async (fn: (tx: Database) => Promise<unknown>) => fn(createBuildStub()),
    query: {},
  } as unknown as Database
}

function shouldUseBuildStub(): boolean {
  return (
    process.env.CONTEXTDS_USE_BUILD_STUB === 'true' ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-export'
  )
}

async function initDb(): Promise<Database> {
  if (globalThis.__contextdsDb) {
    return globalThis.__contextdsDb
  }

  if (shouldUseBuildStub()) {
    globalThis.__contextdsDb = createBuildStub()
    return globalThis.__contextdsDb
  }

  const workerDb = (globalThis as { DB?: D1Database }).DB
  if (workerDb) {
    globalThis.__contextdsDb = createDb(workerDb)
    return globalThis.__contextdsDb
  }

  try {
    const { getPlatformProxy } = await import('wrangler')
    const proxy = await getPlatformProxy({
      configPath: './wrangler.toml',
      persist: true,
    })
    globalThis.__contextdsDb = createDb(proxy.env.DB as D1Database)
    return globalThis.__contextdsDb
  } catch (error) {
    console.warn('D1 unavailable, using build stub:', error)
    globalThis.__contextdsDb = createBuildStub()
    return globalThis.__contextdsDb
  }
}

export async function getDb(): Promise<Database> {
  if (globalThis.__contextdsDb) {
    return globalThis.__contextdsDb
  }

  if (!globalThis.__contextdsDbInit) {
    globalThis.__contextdsDbInit = initDb()
  }

  return globalThis.__contextdsDbInit
}

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  responseTime: number
  provider: 'cloudflare-d1'
}> {
  const start = Date.now()

  try {
    const db = await getDb()
    await db.select({ id: schema.sites.id }).from(schema.sites).limit(1)
    return {
      healthy: true,
      responseTime: Date.now() - start,
      provider: 'cloudflare-d1',
    }
  } catch (error) {
    console.error('D1 health check failed:', error)
    return {
      healthy: false,
      responseTime: Date.now() - start,
      provider: 'cloudflare-d1',
    }
  }
}

export async function queryWithMetrics<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  const start = Date.now()
  try {
    const result = await queryFn()
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`Slow D1 query: ${queryName} took ${duration}ms`)
    }
    return result
  } catch (error) {
    console.error(`D1 query ${queryName} failed:`, error)
    throw error
  }
}

export * from './schema'
export { sql }
