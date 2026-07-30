import { NextResponse } from 'next/server'
import { getDirectoryStats, getStorageBackend } from '@/lib/storage/serverless-store'
import { getPlatformStatsSnapshot, isRedisConfigured } from '@/lib/storage/platform-stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/stats
 * Live platform stats from Redis (when configured), with Blob directory fallback.
 */
export async function GET() {
  try {
    const [directory, redisSnapshot] = await Promise.all([
      getDirectoryStats(),
      getPlatformStatsSnapshot(),
    ])

    const backend = getStorageBackend()
    const redis = isRedisConfigured()
    const mode = redis
      ? backend.blob
        ? 'redis+blob'
        : 'redis'
      : backend.blob
        ? 'blob'
        : 'memory'

    const sites = redisSnapshot.sites > 0 ? redisSnapshot.sites : directory.sites
    const tokens = redisSnapshot.tokens > 0 ? redisSnapshot.tokens : directory.tokens
    const scans = redisSnapshot.scans > 0 ? redisSnapshot.scans : directory.scans

    // Confidence is stored 0–1 on sites; directory average may already be percent.
    let avgConfidence = directory.averageConfidence
    if (avgConfidence > 1) avgConfidence = avgConfidence / 100

    return NextResponse.json({
      sites,
      tokens,
      avgConfidence,
      scans,
      cacheHits: redisSnapshot.cacheHits || directory.cacheHits,
      cacheMisses: redisSnapshot.cacheMisses || directory.cacheMisses,
      libraryViews: redisSnapshot.libraryViews || directory.libraryViews,
      contractOpens: redisSnapshot.contractOpens || directory.contractOpens,
      downloads: redisSnapshot.downloads || directory.downloads,
      chatMessages: redisSnapshot.chatMessages || directory.chatMessages,
      agentScans: redisSnapshot.agentScans || directory.agentScans,
      lastUpdated: redisSnapshot.updatedAt || new Date().toISOString(),
      storage: {
        redis,
        blob: backend.blob,
        mode,
      },
    })
  } catch (error) {
    console.error('Failed to get stats:', error)
    return NextResponse.json(
      {
        sites: 0,
        tokens: 0,
        avgConfidence: 0,
        scans: 0,
        cacheHits: 0,
        cacheMisses: 0,
        libraryViews: 0,
        contractOpens: 0,
        downloads: 0,
        chatMessages: 0,
        agentScans: 0,
        lastUpdated: new Date().toISOString(),
        storage: { redis: false, blob: false, mode: 'memory' },
        error: 'Failed to fetch stats',
      },
      { status: 500 }
    )
  }
}
