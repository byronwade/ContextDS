import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const domain = params.domain

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Skip during build time
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        hasData: false,
        domain,
        message: 'Database not available during build'
      })
    }

    // Use database connection to check for existing site data ultrafast
    const { db } = await import('@/lib/db')
    const { sites, tokenSets, scans } = await import('@/lib/db')
    const { eq, desc, sql } = await import('drizzle-orm')

    // Single optimized query to check site existence and token data
    const result = await db.execute(sql`
      SELECT
        s.id,
        s.domain,
        s.last_scanned,
        s.popularity,
        COUNT(ts.id) as token_sets_count,
        MAX(ts.created_at) as latest_token_set,
        SUM(
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'color')), 0) +
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'typography')), 0) +
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'dimension')), 0) +
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'shadow')), 0) +
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'radius')), 0) +
          COALESCE((SELECT COUNT(*) FROM jsonb_object_keys(ts.tokens_json->'motion')), 0)
        ) as total_tokens
      FROM sites s
      LEFT JOIN token_sets ts ON ts.site_id = s.id
      WHERE s.domain = ${domain}
      GROUP BY s.id, s.domain, s.last_scanned, s.popularity
    `)

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({
        hasData: false,
        domain,
        message: 'Site not found in database'
      })
    }

    const siteData = result.rows[0]

    const hasTokens = siteData.total_tokens > 0
    const hasRecentScan = siteData.last_scanned &&
      new Date(siteData.last_scanned) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours

    return NextResponse.json({
      hasData: hasTokens,
      domain,
      site: {
        id: siteData.id,
        domain: siteData.domain,
        last_scanned: siteData.last_scanned,
        popularity: siteData.popularity
      },
      tokensCount: siteData.total_tokens || 0,
      tokenSetsCount: siteData.token_sets_count || 0,
      latestTokenSet: siteData.latest_token_set,
      isRecentScan: hasRecentScan,
      message: hasTokens ? 'Site found with existing token data' : 'Site exists but no tokens found',
      shouldRescan: !hasRecentScan || !hasTokens
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
      }
    })

  } catch (error) {
    console.error('Error checking site data:', error)
    return NextResponse.json(
      {
        hasData: false,
        domain: params.domain,
        error: 'Failed to check site data',
        shouldRescan: true
      },
      { status: 500 }
    )
  }
}