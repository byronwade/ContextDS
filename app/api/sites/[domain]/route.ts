import { NextRequest, NextResponse } from 'next/server'
import { getScan, getSite } from '@/lib/storage/serverless-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const [site, scan] = await Promise.all([getSite(domain), getScan(domain)])

    if (!site && !scan) {
      return NextResponse.json({
        hasData: false,
        domain,
        message: 'Site not found',
        shouldRescan: true,
      })
    }

    const hasTokens = Boolean(scan && scan.summary.tokensExtracted > 0)
    const lastScanned = site?.lastScanned || scan?.scannedAt || null
    const isRecentScan =
      !!lastScanned &&
      new Date(lastScanned) > new Date(Date.now() - 24 * 60 * 60 * 1000)

    return NextResponse.json(
      {
        hasData: hasTokens,
        domain,
        site: site
          ? {
              id: site.id,
              domain: site.domain,
              last_scanned: site.lastScanned,
              popularity: site.popularity,
              title: site.title,
              favicon: site.favicon,
            }
          : null,
        tokensCount: site?.tokenCount || scan?.summary.tokensExtracted || 0,
        scan,
        isRecentScan,
        message: hasTokens
          ? 'Site found with existing token data'
          : 'Site exists but no tokens found',
        shouldRescan: !isRecentScan || !hasTokens,
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
        error: 'Failed to check site data',
        shouldRescan: true,
      },
      { status: 500 }
    )
  }
}
