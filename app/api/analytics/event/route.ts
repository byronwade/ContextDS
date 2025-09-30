import { NextRequest, NextResponse } from 'next/server'
import { analytics } from '@/lib/analytics/analytics-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventType, eventName, properties } = body

    // Get session ID from cookie or generate one
    const sessionId = request.cookies.get('session_id')?.value || crypto.randomUUID()

    // Track the event
    await analytics.trackEvent({
      eventType,
      eventName,
      sessionId,
      url: request.nextUrl.toString(),
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      properties
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics event error:', error)
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
  }
}