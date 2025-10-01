import { NextRequest, NextResponse } from 'next/server'
import { broadcast, getConnectionCount } from '@/lib/realtime/connections'

export const runtime = 'edge'

// POST endpoint for broadcasting updates
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate the data structure
    if (!data.type) {
      return NextResponse.json({ error: 'Missing type field' }, { status: 400 })
    }

    console.log('📡 Broadcasting real-time update:', data.type, `to ${getConnectionCount()} connections`)

    // Broadcast to all connected clients
    broadcast(data)

    return NextResponse.json({ success: true, broadcast: true, connections: getConnectionCount() })
  } catch (error) {
    console.error('Error in broadcast endpoint:', error)
    return NextResponse.json({ error: 'Failed to broadcast' }, { status: 500 })
  }
}