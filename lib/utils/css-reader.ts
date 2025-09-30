import { db, cssContent, cssSources } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { decompressCss } from './css-compression'

/**
 * Read CSS content by SHA hash (from deduplicated storage)
 *
 * @param sha SHA-256 hash of CSS content
 * @returns Decompressed CSS string or null if not found
 */
export async function readCssBySha(sha: string): Promise<string | null> {
  if (!db) {
    throw new Error('Database not initialized')
  }

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
  if (!db) {
    throw new Error('Database not initialized')
  }

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
  if (!db) {
    throw new Error('Database not initialized')
  }

  // Count total CSS sources
  const totalSourcesResult = await db.execute<{ count: number }>(
    'SELECT COUNT(*) as count FROM css_sources'
  )
  const totalSources = Number(totalSourcesResult.rows[0]?.count || 0)

  // Count unique CSS content
  const uniqueContentResult = await db.execute<{ count: number }>(
    'SELECT COUNT(*) as count FROM css_content'
  )
  const uniqueContent = Number(uniqueContentResult.rows[0]?.count || 0)

  // Calculate total bytes if stored separately
  const totalBytes = totalSources > 0 ? await db.execute<{ sum: number }>(
    'SELECT SUM(bytes) as sum FROM css_sources'
  ).then(r => Number(r.rows[0]?.sum || 0)) : 0

  // Calculate actual storage used (deduplicated)
  const uniqueBytes = uniqueContent > 0 ? await db.execute<{ sum: number }>(
    'SELECT SUM(compressed_bytes) as sum FROM css_content'
  ).then(r => Number(r.rows[0]?.sum || 0)) : 0

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