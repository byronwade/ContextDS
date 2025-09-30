import { NextResponse } from 'next/server'
import { db, sites, tokenSets, scans } from '@/lib/db'
import { count, sql, desc, eq } from 'drizzle-orm'
import { statsCache, CACHE_KEYS } from '@/lib/performance'

export async function GET() {
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

    // Check cache first
    const cached = statsCache.get(CACHE_KEYS.STATS)
    if (cached) {
      console.log('📊 Returning cached database statistics')
      return NextResponse.json(cached)
    }

    console.log('📊 Loading database statistics...')

    // Get basic counts
    const [siteCount] = await db.select({ count: count() }).from(sites)
    const [tokenSetCount] = await db.select({ count: count() }).from(tokenSets)
    const [scanCount] = await db.select({ count: count() }).from(scans)

    // Get recent activity
    const recentScans = await db
      .select({
        id: scans.id,
        domain: sites.domain,
        finishedAt: scans.finishedAt,
        tokenCount: sql<number>`
          COALESCE(
            (SELECT COUNT(*) FROM ${tokenSets} WHERE ${tokenSets.scanId} = ${scans.id}),
            0
          )
        `
      })
      .from(scans)
      .leftJoin(sites, eq(scans.siteId, sites.id))
      .where(sql`${scans.finishedAt} IS NOT NULL`)
      .orderBy(desc(scans.finishedAt))
      .limit(10)

    // Get popular sites
    const popularSites = await db
      .select({
        domain: sites.domain,
        popularity: sites.popularity,
        lastScanned: sites.lastScanned,
        tokenCount: sql<number>`
          COALESCE(
            (SELECT COUNT(*) FROM ${tokenSets} WHERE ${tokenSets.siteId} = ${sites.id}),
            0
          )
        `
      })
      .from(sites)
      .orderBy(desc(sites.popularity))
      .limit(5)

    // Optimized token statistics using database aggregation
    const tokenStatsQuery = await db.execute(sql`
      WITH token_counts AS (
        SELECT
          ts.id,
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'color')), 0) as color_count,
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'typography')), 0) as typography_count,
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'dimension')), 0) as spacing_count,
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'shadow')), 0) as shadow_count,
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'radius')), 0) as radius_count,
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'motion')), 0) as motion_count,
          CAST(ts.consensus_score AS NUMERIC) as consensus_score
        FROM token_sets ts
        WHERE ts.is_public = true
          AND ts.tokens_json IS NOT NULL
      )
      SELECT
        SUM(color_count)::int as total_colors,
        SUM(typography_count)::int as total_typography,
        SUM(spacing_count)::int as total_spacing,
        SUM(shadow_count)::int as total_shadows,
        SUM(radius_count)::int as total_radius,
        SUM(motion_count)::int as total_motion,
        (SUM(color_count) + SUM(typography_count) + SUM(spacing_count) +
         SUM(shadow_count) + SUM(radius_count) + SUM(motion_count))::int as total_tokens,
        ROUND(AVG(consensus_score))::int as average_confidence
      FROM token_counts
    `)

    const tokenStats = tokenStatsQuery[0] || {
      total_colors: 0,
      total_typography: 0,
      total_spacing: 0,
      total_shadows: 0,
      total_radius: 0,
      total_motion: 0,
      total_tokens: 0,
      average_confidence: 0
    }

    const categoryStats = {
      colors: toNumber(tokenStats.total_colors),
      typography: toNumber(tokenStats.total_typography),
      spacing: toNumber(tokenStats.total_spacing),
      shadows: toNumber(tokenStats.total_shadows),
      radius: toNumber(tokenStats.total_radius),
      motion: toNumber(tokenStats.total_motion)
    }

    const totalTokens = toNumber(tokenStats.total_tokens)
    const averageConfidence = toNumber(tokenStats.average_confidence)

    const stats = {
      sites: toNumber(siteCount.count),
      tokens: totalTokens,
      scans: toNumber(scanCount.count),
      tokenSets: toNumber(tokenSetCount.count),
      categories: categoryStats,
      averageConfidence: averageConfidence,
      recentActivity: recentScans.map((scan) => ({
        domain: scan.domain,
        scannedAt: scan.finishedAt,
        tokens: toNumber(scan.tokenCount)
      })),
      popularSites: popularSites.map((site) => ({
        domain: site.domain,
        popularity: site.popularity ?? 0,
        tokens: toNumber(site.tokenCount),
        lastScanned: site.lastScanned
      }))
    }

    console.log(`✅ Database stats: ${stats.sites} sites, ${stats.tokens} tokens, ${stats.scans} scans`)

    // Cache the results for 5 minutes
    statsCache.set(CACHE_KEYS.STATS, stats, 5 * 60 * 1000)

    return NextResponse.json(stats)

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
