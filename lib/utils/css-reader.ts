import { getDb, cssContent, cssSources } from '@/lib/db'
import { eq, count, sql } from 'drizzle-orm'
import { decompressCss } from './css-compression'

/**
 * Read CSS content by SHA hash (from deduplicated storage)
 *
 * @param sha SHA-256 hash of CSS content
 * @returns Decompressed CSS string or null if not found
 */
export async function readCssBySha(sha: string): Promise<string | null> {
  const db = await getDb()

  const records = await db
    .select()
    .from(cssContent)
    .where(eq(cssContent.sha, sha))
    .limit(1)

  if (records.length === 0) {
    return null
  }

  const record = records[0]

  // Update last accessed timestamp (for TTL cleanup)
  await db
    .update(cssContent)
    .set({ lastAccessed: new Date() })
    .where(eq(cssContent.sha, sha))

  // Decompress if compressed
  if (record.contentCompressed) {
    return decompressCss(record.content)
  }

  return record.content
}

/**
 * Read all CSS for a scan (resolves deduplicated references)
 *
 * @param scanId UUID of scan record
 * @returns Array of CSS sources with decompressed content
 */
export async function readCssForScan(scanId: string): Promise<Array<{
  url: string | null
  kind: string
  content: string | null
}>> {
  const db = await getDb()

  // Get all CSS source references for this scan
  const sources = await db
    .select()
    .from(cssSources)
    .where(eq(cssSources.scanId, scanId))

  // Resolve content for each source (deduplicated lookup)
  const results = await Promise.all(
    sources.map(async (source) => {
      const content = await readCssBySha(source.sha)
      return {
        url: source.url,
        kind: source.kind,
        content
      }
    })
  )

  return results
}

/**
 * Get deduplication statistics
 *
 * @returns Storage efficiency metrics
 */
export async function getDeduplicationStats(): Promise<{
  totalSources: number
  uniqueContent: number
  deduplicationRate: number
  totalBytes: number
  uniqueBytes: number
  storageEfficiency: number
}> {
  const db = await getDb()

  // Count total CSS sources
  const [totalSourcesResult] = await db.select({ count: count() }).from(cssSources)
  const totalSources = Number(totalSourcesResult?.count || 0)

  // Count unique CSS content
  const [uniqueContentResult] = await db.select({ count: count() }).from(cssContent)
  const uniqueContent = Number(uniqueContentResult?.count || 0)

  // Calculate total bytes
  const [totalBytesResult] = await db.select({ sum: sql<number>`SUM(bytes)` }).from(cssSources)
  const totalBytes = Number(totalBytesResult?.sum || 0)

  // Calculate actual storage used (deduplicated)
  const [uniqueBytesResult] = await db.select({ sum: sql<number>`SUM(compressed_bytes)` }).from(cssContent)
  const uniqueBytes = Number(uniqueBytesResult?.sum || 0)

  const deduplicationRate = totalSources > 0
    ? Math.round(((totalSources - uniqueContent) / totalSources) * 100)
    : 0

  const storageEfficiency = totalBytes > 0
    ? Math.round(((totalBytes - uniqueBytes) / totalBytes) * 100)
    : 0

  return {
    totalSources,
    uniqueContent,
    deduplicationRate,
    totalBytes,
    uniqueBytes,
    storageEfficiency
  }
}