import { NextRequest, NextResponse } from 'next/server'
import { listSites } from '@/lib/storage/serverless-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sort') || 'votes'
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10)

    const sort =
      sortBy === 'recent' || sortBy === 'tokens' || sortBy === 'votes' || sortBy === 'popular'
        ? sortBy
        : 'votes'

    const sites = await listSites({
      sort,
      limit: Number.isFinite(limit) ? Math.min(limit, 200) : 50,
    })

    return NextResponse.json({
      sites: sites.map((site) => ({
        id: site.id,
        domain: site.domain,
        title: site.title,
        description: site.description,
        favicon: site.favicon,
        tokensCount: site.tokenCount,
        popularity: site.popularity,
        votes: site.popularity,
        lastScanned: site.lastScanned,
        consensusScore: 0,
        hasVoted: false,
        status: site.status,
        confidence: site.confidence ?? null,
        curatedCount: site.curatedCount ?? null,
        preview: site.preview ?? null,
      })),
      total: sites.length,
    })
  } catch (error) {
    console.error('Error loading community sites:', error)
    return NextResponse.json({ error: 'Failed to load sites' }, { status: 500 , headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } })
  }
}
