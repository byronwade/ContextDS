import { eq, desc, sql } from 'drizzle-orm'
import { getDb } from './get-db'
import {
  sites,
  scans,
  tokenSets,
  layoutProfiles,
  cssContent,
  cssSources,
} from './schema'

export interface DatabaseMetrics {
  queryTime: number
  connectionTime: number
  totalQueries: number
  slowQueries: number
  cacheHits: number
  cacheMisses: number
}

let dbMetrics: DatabaseMetrics = {
  queryTime: 0,
  connectionTime: 0,
  totalQueries: 0,
  slowQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
}

function updateMetrics(operation: string, duration: number, isError = false) {
  dbMetrics.totalQueries++
  dbMetrics.queryTime += duration
  if (duration > 100) {
    dbMetrics.slowQueries++
    console.warn(`Slow D1 query: ${operation} took ${Math.round(duration)}ms`)
  }
  if (isError) {
    console.error(`D1 query failed: ${operation}`)
  }
}

export async function findSiteByDomain(domain: string) {
  const start = performance.now()
  try {
    const db = await getDb()
    const result = await db.select().from(sites).where(eq(sites.domain, domain)).limit(1)
    updateMetrics('findSiteByDomain', performance.now() - start)
    return result[0] ?? null
  } catch (error) {
    updateMetrics('findSiteByDomain', performance.now() - start, true)
    throw error
  }
}

export async function getLatestTokenSet(siteId: string) {
  const start = performance.now()
  try {
    const db = await getDb()
    const result = await db
      .select()
      .from(tokenSets)
      .where(eq(tokenSets.siteId, siteId))
      .orderBy(desc(tokenSets.versionNumber))
      .limit(1)
    updateMetrics('getLatestTokenSet', performance.now() - start)
    return result[0] ?? null
  } catch (error) {
    updateMetrics('getLatestTokenSet', performance.now() - start, true)
    throw error
  }
}

export async function bulkInsertCssContent(
  cssArtifacts: Array<{
    sha: string
    content: string
    contentCompressed: boolean
    bytes: number
    compressedBytes: number
  }>
) {
  if (cssArtifacts.length === 0) return

  const start = performance.now()
  const db = await getDb()

  for (const artifact of cssArtifacts) {
    await db
      .insert(cssContent)
      .values({
        sha: artifact.sha,
        content: artifact.content,
        contentCompressed: artifact.contentCompressed,
        bytes: artifact.bytes,
        compressedBytes: artifact.compressedBytes,
        referenceCount: 1,
      })
      .onConflictDoUpdate({
        target: cssContent.sha,
        set: {
          referenceCount: sql`${cssContent.referenceCount} + 1`,
          lastAccessed: new Date(),
        },
      })
  }

  updateMetrics('bulkInsertCssContent', performance.now() - start)
}

export async function batchInsertCssSources(
  scanId: string,
  sources: Array<{ url?: string; kind: string; bytes: number; sha: string }>
) {
  if (sources.length === 0) return

  const start = performance.now()
  const db = await getDb()

  await db.insert(cssSources).values(
    sources.map((source) => ({
      scanId,
      url: source.url,
      kind: source.kind,
      bytes: source.bytes,
      sha: source.sha,
    }))
  )

  updateMetrics('batchInsertCssSources', performance.now() - start)
}

export async function completeScanTransaction(scanData: {
  siteId: string
  scanId: string
  versionNumber: number
  tokensJson: Record<string, unknown>
  packJson?: Record<string, unknown>
  consensusScore: number
  layoutDNA: Record<string, unknown>
  archetypes?: unknown
  containers?: unknown
  gridFlex?: unknown
  spacingScale?: unknown
  cssSourceCount: number
  sha?: string
  metricsJson?: Record<string, unknown>
}) {
  const start = performance.now()
  const db = await getDb()

  const result = await db.transaction(async (tx) => {
    const [tokenSet] = await tx
      .insert(tokenSets)
      .values({
        siteId: scanData.siteId,
        scanId: scanData.scanId,
        versionNumber: scanData.versionNumber,
        tokensJson: scanData.tokensJson,
        packJson: scanData.packJson,
        consensusScore: scanData.consensusScore,
        isPublic: true,
      })
      .returning()

    await tx.insert(layoutProfiles).values({
      siteId: scanData.siteId,
      scanId: scanData.scanId,
      profileJson: scanData.layoutDNA,
      archetypes: scanData.archetypes,
      containers: scanData.containers,
      gridFlex: scanData.gridFlex,
      spacingScale: scanData.spacingScale,
    })

    await tx
      .update(scans)
      .set({
        finishedAt: new Date(),
        cssSourceCount: scanData.cssSourceCount,
        sha: scanData.sha,
        metricsJson: scanData.metricsJson,
      })
      .where(eq(scans.id, scanData.scanId))

    await tx
      .update(sites)
      .set({
        status: 'completed',
        lastScanned: new Date(),
        popularity: sql`${sites.popularity} + 1`,
      })
      .where(eq(sites.id, scanData.siteId))

    return tokenSet
  })

  updateMetrics('completeScanTransaction', performance.now() - start)
  return result
}

export function getDatabaseMetrics(): DatabaseMetrics {
  return { ...dbMetrics }
}

export function resetDatabaseMetrics(): void {
  dbMetrics = {
    queryTime: 0,
    connectionTime: 0,
    totalQueries: 0,
    slowQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }
}

export async function initializeDatabaseOptimizations(): Promise<void> {
  // Indexes are defined in schema migrations for D1.
  console.log('D1 optimizations ready (schema indexes applied via migrations)')
}

export async function createPerformanceIndexes(): Promise<void> {
  // No-op: D1 indexes are created in SQL migrations.
}

export async function analyzeSlowQueries(): Promise<unknown[]> {
  return []
}

export async function optimizeConnectionSettings(): Promise<void> {
  // No-op for D1.
}
