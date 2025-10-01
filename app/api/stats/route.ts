import { NextRequest, NextResponse } from 'next/server'
import { db, sites, tokenSets, scans } from '@/lib/db'
import { sql, desc, count, isNotNull } from 'drizzle-orm'
import { createHash } from 'crypto'

// PERFORMANCE: Node.js runtime required for crypto module
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    console.log('📊 Loading comprehensive stats from database tables...')

    // Execute all queries in parallel for maximum performance
    const [sitesCount, scansCount, tokenSetsCount, tokensCount, recentScansQuery, popularSitesQuery] = await Promise.all([
      // Count total sites
      db.select({ count: count() }).from(sites),

      // Count completed scans
      db.select({ count: count() }).from(scans).where(isNotNull(scans.finishedAt)),

      // Count token sets
      db.select({ count: count() }).from(tokenSets).where(isNotNull(tokenSets.tokensJson)),

      // Count total tokens across all categories
      db.execute(sql`
        SELECT
          (
            SUM(
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'color')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'typography')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'dimension')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'shadow')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'radius')), 0) +
              COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'motion')), 0)
            )
          )::int as total_tokens,
          SUM(COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'color')), 0))::int as colors,
          SUM(COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'typography')), 0))::int as typography,
          SUM(COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'dimension')), 0))::int as spacing,
          SUM(COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'shadow')), 0))::int as shadows,
          SUM(COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'radius')), 0))::int as radius,
          SUM(COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(tokens_json->'motion')), 0))::int as motion
        FROM token_sets
        WHERE is_public = true AND tokens_json IS NOT NULL
      `),

      // Recent scans with site domain
      db.execute(sql`
        SELECT s.domain, sc.finished_at,
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'color')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'typography')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'dimension')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'shadow')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'radius')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'motion')), 0) as token_count
        FROM scans sc
        JOIN sites s ON s.id = sc.site_id
        LEFT JOIN token_sets ts ON ts.scan_id = sc.id
        WHERE sc.finished_at IS NOT NULL
        ORDER BY sc.finished_at DESC
        LIMIT 10
      `),

      // Popular sites with token counts
      db.execute(sql`
        SELECT s.domain, s.popularity, s.last_scanned,
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'color')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'typography')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'dimension')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'shadow')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'radius')), 0) +
               COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'motion')), 0) as token_count
        FROM sites s
        LEFT JOIN scans sc ON sc.site_id = s.id AND sc.finished_at IS NOT NULL
        LEFT JOIN token_sets ts ON ts.scan_id = sc.id
        WHERE s.popularity > 0
        ORDER BY s.popularity DESC, s.last_scanned DESC
        LIMIT 10
      `)
    ])

    const tokenData = tokensCount[0]

    const stats = {
      sites: toNumber(sitesCount[0]?.count),
      tokens: toNumber(tokenData?.total_tokens),
      scans: toNumber(scansCount[0]?.count),
      tokenSets: toNumber(tokenSetsCount[0]?.count),
      categories: {
        colors: toNumber(tokenData?.colors),
        typography: toNumber(tokenData?.typography),
        spacing: toNumber(tokenData?.spacing),
        shadows: toNumber(tokenData?.shadows),
        radius: toNumber(tokenData?.radius),
        motion: toNumber(tokenData?.motion)
      },
      averageConfidence: 85, // Placeholder - could be calculated if needed
      recentActivity: recentScansQuery.map((row: any) => ({
        domain: row.domain,
        scannedAt: row.finished_at,
        tokens: toNumber(row.token_count)
      })),
      popularSites: popularSitesQuery.map((row: any) => ({
        domain: row.domain,
        popularity: toNumber(row.popularity),
        tokens: toNumber(row.token_count),
        lastScanned: row.last_scanned
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
