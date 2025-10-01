import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Log SEO errors (in production, this would go to error tracking service)
    console.error('🚨 SEO Error:', {
      message: data.message,
      filename: data.filename,
      line: data.line,
      column: data.column,
      url: data.url,
      timestamp: data.timestamp,
      reason: data.reason // For promise rejections
    })

    return NextResponse.json({ status: 'recorded' })
  } catch (error) {
    console.error('Failed to record SEO error:', error)
    return NextResponse.json({ error: 'Failed to record error' }, { status: 500 })
  }
}