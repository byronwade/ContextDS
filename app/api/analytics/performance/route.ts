import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Log performance metrics (in production, this would go to analytics service)
    console.log('⚡ Performance Metrics:', {
      name: data.name,
      value: data.value,
      rating: data.rating,
      delta: data.delta,
      id: data.id,
      url: data.url || 'unknown'
    })

    return NextResponse.json({ status: 'recorded' })
  } catch (error) {
    console.error('Failed to record performance metrics:', error)
    return NextResponse.json({ error: 'Failed to record metrics' }, { status: 500 })
  }
}