import { NextRequest, NextResponse } from 'next/server'
import { getDb, sites, tokenSets, scans } from '@/lib/db'
import { sql, desc, count, isNotNull, eq, and } from 'drizzle-orm'
import { createHash } from 'crypto'

// PERFORMANCE: Node.js runtime required for crypto module
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()

    // Skip during build time
    if (process.env.CONTEXTDS_USE_BUILD_STUB === 'true') {
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

    console.log('📊 Loading comprehensive stats from database tables...')

    // Execute count queries in parallel
    const [sitesCount, scansCount, tokenSetsCount, allTokenSetsData, recentScansData, popularSitesData] = await Promise.all([
      db.select({ count: count() }).from(sites),
      db.select({ count: count() }).from(scans).where(isNotNull(scans.finishedAt)),
      db.select({ count: count() }).from(tokenSets).where(isNotNull(tokenSets.tokensJson)),

      // Fetch token JSON data for JS-side counting (SQLite has no jsonb_object_keys)
      db.select({ tokensJson: tokenSets.tokensJson })
        .from(tokenSets)
        .where(and(eq(tokenSets.isPublic, true), isNotNull(tokenSets.tokensJson))),

      // Recent scans with site domain
      db.select({ domain: sites.domain, finishedAt: scans.finishedAt })
        .from(scans)
        .innerJoin(sites, eq(scans.siteId, sites.id))
        .where(isNotNull(scans.finishedAt))
        .orderBy(desc(scans.finishedAt))
        .limit(10),

      // Popular sites
      db.select({ domain: sites.domain, popularity: sites.popularity, lastScanned: sites.lastScanned })
        .from(sites)
        .where(sql`${sites.popularity} > 0`)
        .orderBy(desc(sites.popularity))
        .limit(10)
    ])

    // Count tokens from JSON data in JavaScript (SQLite-compatible)
    let colors = 0, typography = 0, spacing = 0, shadows = 0, radiusCount = 0, motion = 0
    for (const row of allTokenSetsData) {
      const tj = row.tokensJson as Record<string, unknown> | null
      if (!tj || typeof tj !== 'object') continue
      colors += countKeys(tj.color)
      typography += countKeys(tj.typography)
      spacing += countKeys(tj.dimension)
      shadows += countKeys(tj.shadow)
      radiusCount += countKeys(tj.radius)
      motion += countKeys(tj.motion)
    }
    const totalTokens = colors + typography + spacing + shadows + radiusCount + motion

    const stats = {
      sites: toNumber(sitesCount[0]?.count),
      tokens: totalTokens,
      scans: toNumber(scansCount[0]?.count),
      tokenSets: toNumber(tokenSetsCount[0]?.count),
      categories: {
        colors,
        typography,
        spacing,
        shadows,
        radius: radiusCount,
        motion
      },
      averageConfidence: 85,
      recentActivity: recentScansData.map((row) => ({
        domain: row.domain,
        scannedAt: row.finishedAt,
        tokens: 0
      })),
      popularSites: popularSitesData.map((row) => ({
        domain: row.domain,
        popularity: toNumber(row.popularity),
        tokens: 0,
        lastScanned: row.lastScanned
      }))
    }

    console.log(`✅ Comprehensive stats: ${stats.sites} sites, ${stats.tokens} tokens, ${stats.scans} scans`)

    // Generate simple ETag for caching
    const etag = `"${createHash('md5').update(JSON.stringify(stats)).digest('hex')}"`
    const clientEtag = request.headers.get('if-none-match')

    // If client has fresh data, return 304 Not Modified
    if (clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=30',
          'Vary': 'Accept-Encoding'
        }
      })
    }

    return NextResponse.json(stats, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'ETag': etag,
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Accept-Encoding'
      }
    })

  } catch (error) {
    console.error('❌ Failed to load database statistics:', error)

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

function countKeys(value: unknown): number {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).length
  }
  return 0
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
