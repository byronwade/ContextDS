import { NextRequest, NextResponse } from 'next/server'
import { db, sites, tokenSets, scans } from '@/lib/db'
import { sql, desc, eq } from 'drizzle-orm'
import { createHash } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Skip during build time
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        sites: 0,
        tokens: 0,
        scans: 0,
        tokenSets: 0,
        categories: {},
        averageConfidence: 0,
        recentActivity: [],
        popularSites: []
      })
    }

    console.log('📊 Loading instant stats using optimized functions...')

    // Execute all 3 optimized functions in parallel (cached execution plans!)
    const [cachedStatsQuery, recentScansQuery, popularSitesQuery] = await Promise.all([
      // Optimized function 1: Pre-compiled stats query
      db.execute(sql`SELECT * FROM get_instant_stats()`),

      // Optimized function 2: Pre-compiled recent activity query
      db.execute(sql`SELECT * FROM get_recent_activity()`),

      // Optimized function 3: Pre-compiled popular sites query
      db.execute(sql`SELECT * FROM get_popular_sites()`)
    ])

    const cachedStats = cachedStatsQuery[0]

    if (!cachedStats) {
      // First time - return empty and trigger background update
      console.log('⚠️ No cached stats found, returning empty')
      return NextResponse.json({
        sites: 0,
        tokens: 0,
        scans: 0,
        tokenSets: 0,
        categories: { colors: 0, typography: 0, spacing: 0, shadows: 0, radius: 0, motion: 0 },
        averageConfidence: 0,
        recentActivity: [],
        popularSites: []
      })
    }

    // Map results from parallel queries
    const recentScans = recentScansQuery.map((row: any) => ({
      domain: row.domain,
      finishedAt: row.finished_at,
      tokenCount: row.token_count
    }))

    const popularSites = popularSitesQuery.map((row: any) => ({
      domain: row.domain,
      popularity: row.popularity ?? 0,
      lastScanned: row.last_scanned,
      tokenCount: row.token_count
    }))

    const stats = {
      sites: toNumber(cachedStats.total_sites),
      tokens: toNumber(cachedStats.total_tokens),
      scans: toNumber(cachedStats.total_scans),
      tokenSets: toNumber(cachedStats.total_token_sets),
      categories: {
        colors: toNumber(cachedStats.color_count),
        typography: toNumber(cachedStats.typography_count),
        spacing: toNumber(cachedStats.spacing_count),
        shadows: toNumber(cachedStats.shadow_count),
        radius: toNumber(cachedStats.radius_count),
        motion: toNumber(cachedStats.motion_count)
      },
      averageConfidence: toNumber(cachedStats.average_confidence),
      recentActivity: recentScans.map((scan: any) => ({
        domain: scan.domain,
        scannedAt: scan.finishedAt,
        tokens: toNumber(scan.tokenCount)
      })),
      popularSites: popularSites.map((site: any) => ({
        domain: site.domain,
        popularity: toNumber(site.popularity),
        tokens: toNumber(site.tokenCount),
        lastScanned: site.lastScanned
      }))
    }

    console.log(`✅ Instant stats: ${stats.sites} sites, ${stats.tokens} tokens, ${stats.scans} scans`)

    // Generate ETag from updated_at timestamp for efficient client-side validation
    const etag = `"${createHash('md5').update(cachedStats.updated_at?.toString() || '').digest('hex')}"`
    const clientEtag = request.headers.get('if-none-match')

    // If client has fresh data, return 304 Not Modified (no body transfer!)
    if (clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'no-cache',
          'Vary': 'Accept-Encoding'
        }
      })
    }

    // Optimize response with aggressive headers
    return NextResponse.json(stats, {
      headers: {
        // Enable browser to start parsing immediately
        'Content-Type': 'application/json; charset=utf-8',

        // ETag for client-side freshness validation
        'ETag': etag,

        // Hint browser about JSON structure for faster parsing
        'X-Content-Type-Options': 'nosniff',

        // Allow client to validate with ETag
        'Cache-Control': 'no-cache, must-revalidate',

        // Enable compression at edge
        'Vary': 'Accept-Encoding'
      }
    })

  } catch (error) {
    console.error('❌ Failed to load database statistics:', error)

    // Return empty stats on error
    return NextResponse.json({
      sites: 0,
      tokens: 0,
      scans: 0,
      tokenSets: 0,
      categories: { colors: 0, typography: 0, spacing: 0, shadows: 0, radius: 0, motion: 0 },
      averageConfidence: 0,
      recentActivity: [],
      popularSites: [],
      error: error instanceof Error ? error.message : 'Stats loading failed'
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function countTokenGroup(value: unknown): number {
  return isRecord(value) ? Object.keys(value).length : 0
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
