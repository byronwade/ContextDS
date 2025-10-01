import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Log SEO metrics (in production, this would go to analytics service)
    console.log('📊 SEO Metrics:', {
      url: data.url,
      timestamp: data.timestamp,
      viewport: data.viewport,
      connection: data.connection,
      user_agent: data.user_agent?.substring(0, 100) // Truncate for logging
    })

    return NextResponse.json({ status: 'recorded' })
  } catch (error) {
    console.error('Failed to record SEO metrics:', error)
    return NextResponse.json({ error: 'Failed to record metrics' }, { status: 500 })
  }
}