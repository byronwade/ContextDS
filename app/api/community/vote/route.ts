import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/ratelimit'
import { bumpSitePopularity } from '@/lib/storage/serverless-store'

export async function POST(request: NextRequest) {
  try {
    const { siteId, voteType } = await request.json()

    if (!siteId || (voteType && voteType !== 'upvote')) {
      return NextResponse.json({ error: 'Invalid vote parameters' }, { status: 400 })
    }

    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0] ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? ''
    const fingerprint = createHash('sha256')
      .update(`${identifier}:${userAgent}`)
      .digest('hex')

    if (redis) {
      const voteKey = `vote:${siteId}:${fingerprint}`
      const hasVoted = await redis.get(voteKey)
      if (hasVoted) {
        return NextResponse.json(
          { error: 'Already voted for this site. Please try again in 24 hours.' },
          { status: 429 }
        )
      }
      await redis.set(voteKey, '1', { ex: 60 * 60 * 24 })
    }

    const site = await bumpSitePopularity(String(siteId))
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      id: site.id,
      domain: site.domain,
      popularity: site.popularity,
      votes: site.popularity,
    })
  } catch (error) {
    console.error('Error voting:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}
