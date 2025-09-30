import { NextRequest, NextResponse } from 'next/server'
import { metricsClient } from '@/lib/metrics/client'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()

    switch (type) {
      case 'page_view':
        await metricsClient.trackPageView(data)
        break
      case 'api_request':
        await metricsClient.trackApiRequest(data)
        break
      case 'scan':
        await metricsClient.trackScanEvent(data)
        break
      case 'search':
        await metricsClient.trackSearchQuery(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Metrics tracking error:', error)
    return NextResponse.json({ error: 'Failed to track metric' }, { status: 500 })
  }
}