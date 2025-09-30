import { NextRequest, NextResponse } from 'next/server'
import { metricsClient } from '@/lib/metrics/client'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'summary'
  const hours = parseInt(searchParams.get('hours') || '24', 10)

  try {
    switch (type) {
      case 'summary':
        const stats = await metricsClient.getRealtimeStats(5)
        if (!stats) {
          return NextResponse.json(
            { error: 'Database not initialized. Please run migrations.' },
            { status: 503 }
          )
        }
        return NextResponse.json(stats)

      case 'timeseries':
        const metric = searchParams.get('metric') || 'page_views'
        const data = await metricsClient.getTimeSeriesData(metric, hours)
        return NextResponse.json({ data: data || [] })

      case 'endpoints':
        const endpoints = await metricsClient.getTopEndpoints(10)
        return NextResponse.json({ endpoints: endpoints || [] })

      case 'searches':
        const searches = await metricsClient.getTopSearchQueries(10)
        return NextResponse.json({ searches: searches || [] })

      case 'scans':
        const scans = await metricsClient.getRecentScans(20)
        return NextResponse.json({ scans: scans || [] })

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: 'Database error. Please ensure tables exist and migrations are run.' },
      { status: 500 }
    )
  }
}