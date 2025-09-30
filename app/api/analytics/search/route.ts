import { NextRequest, NextResponse } from 'next/server'
import { analytics } from '@/lib/analytics/analytics-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, resultsCount } = body

    const sessionId = request.cookies.get('session_id')?.value || crypto.randomUUID()

    await analytics.trackSearch(query, sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Search tracking error:', error)
    return NextResponse.json({ error: 'Failed to track search' }, { status: 500 })
  }
}