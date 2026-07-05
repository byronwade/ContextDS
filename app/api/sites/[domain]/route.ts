import { NextRequest, NextResponse } from 'next/server'
import { getSiteByDomain, getTokenSetsBySiteId, countTokensInSet } from '@/lib/db/queries'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    if (process.env.CONTEXTDS_USE_BUILD_STUB === 'true') {
      return NextResponse.json({
        hasData: false,
        domain,
        message: 'Database not available during build',
      })
    }

    const site = await getSiteByDomain(domain)
    if (!site) {
      return NextResponse.json({
        hasData: false,
        domain,
        message: 'Site not found in database',
      })
    }

    const tokenSetList = await getTokenSetsBySiteId(site.id)
    let totalTokens = 0
    for (const tokenSet of tokenSetList) {
      totalTokens += await countTokensInSet(tokenSet.tokensJson as Record<string, unknown>)
    }

    const hasTokens = totalTokens > 0
    const hasRecentScan =
      site.lastScanned &&
      site.lastScanned > new Date(Date.now() - 24 * 60 * 60 * 1000)

    return NextResponse.json(
      {
        hasData: hasTokens,
        domain,
        site: {
          id: site.id,
          domain: site.domain,
          last_scanned: site.lastScanned,
          popularity: site.popularity,
        },
        tokensCount: totalTokens,
        tokenSetsCount: tokenSetList.length,
        latestTokenSet: tokenSetList[0]?.createdAt ?? null,
        isRecentScan: hasRecentScan,
        message: hasTokens
          ? 'Site found with existing token data'
          : 'Site exists but no tokens found',
        shouldRescan: !hasRecentScan || !hasTokens,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Error checking site data:', error)
    return NextResponse.json(
      {
        hasData: false,
        domain: 'unknown',
        error: 'Failed to check site data',
        shouldRescan: true,
      },
      { status: 500 }
    )
  }
}
