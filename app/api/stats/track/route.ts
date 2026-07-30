import { NextRequest, NextResponse } from 'next/server'
import { isRedisConfigured, isStatEvent, trackStatEvent } from '@/lib/storage/platform-stats'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      event?: unknown
      by?: unknown
    } | null

    if (!isStatEvent(body?.event)) {
      return NextResponse.json({ ok: false, error: 'Invalid event' }, { status: 400 })
    }

    const by =
      typeof body?.by === 'number' && Number.isFinite(body.by) && body.by > 0
        ? Math.min(Math.floor(body.by), 100)
        : 1

    if (!isRedisConfigured()) {
      return NextResponse.json({
        ok: false,
        tracked: false,
        redis: false,
        message: 'Redis not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN',
      })
    }

    const tracked = await trackStatEvent(body.event, by)
    return NextResponse.json({ ok: true, tracked, redis: true, event: body.event, by })
  } catch (error) {
    console.error('[stats/track]', error)
    return NextResponse.json({ ok: false, error: 'Track failed' }, { status: 500 })
  }
}
