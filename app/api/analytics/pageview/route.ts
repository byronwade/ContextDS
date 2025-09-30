import { NextRequest, NextResponse } from 'next/server'
import { analytics } from '@/lib/analytics/analytics-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    const sessionId = request.cookies.get('session_id')?.value || crypto.randomUUID()

    await analytics.trackPageView(url, sessionId, {
      referrer: body.referrer,
      userAgent: body.userAgent
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Page view tracking error:', error)
    return NextResponse.json({ error: 'Failed to track page view' }, { status: 500 })
  }
}