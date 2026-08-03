import { NextRequest, NextResponse } from 'next/server'
import { metricsClient } from '@/lib/metrics/client'


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
            { error: 'Database not initialized. Please run migrations.' }, { status: 503 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
        }
        return NextResponse.json(stats, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })

      case 'timeseries':
        const metric = searchParams.get('metric') || 'page_views'
        const data = await metricsClient.getTimeSeriesData(metric, hours)
        return NextResponse.json({ data: data || [] }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })

      case 'endpoints':
        const endpoints = await metricsClient.getTopEndpoints(10)
        return NextResponse.json({ endpoints: endpoints || [] }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })

      case 'searches':
        const searches = await metricsClient.getTopSearchQueries(10)
        return NextResponse.json({ searches: searches || [] }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })

      case 'scans':
        const scans = await metricsClient.getRecentScans(20)
        return NextResponse.json({ scans: scans || [] }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
    }
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: 'Database error. Please ensure tables exist and migrations are run.' }, { status: 500 , headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } })
  }
}