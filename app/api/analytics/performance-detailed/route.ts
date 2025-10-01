import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Log detailed performance metrics (in production, this would go to analytics service)
    console.log('📈 Detailed Performance Metrics:', {
      url: data.url,
      dom_content_loaded: data.dom_content_loaded,
      load_complete: data.load_complete,
      first_byte: data.first_byte,
      dns_lookup: data.dns_lookup,
      tcp_connection: data.tcp_connection,
      server_response: data.server_response,
      dom_processing: data.dom_processing,
      total_resources: data.total_resources,
      timestamp: data.timestamp
    })

    return NextResponse.json({ status: 'recorded' })
  } catch (error) {
    console.error('Failed to record detailed performance metrics:', error)
    return NextResponse.json({ error: 'Failed to record metrics' }, { status: 500 })
  }
}