import { NextRequest, NextResponse } from 'next/server'
import { db, screenshots } from '@/lib/db'
import { eq, asc } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/scans/[scanId]/screenshots
 * Retrieve all screenshots for a specific scan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params

    // Fetch all screenshots for this scan
    const results = await db
      .select()
      .from(screenshots)
      .where(eq(screenshots.scanId, scanId))
      .orderBy(asc(screenshots.capturedAt))

    // Group by viewport for easy access
    const grouped = {
      mobile: results.find((s: typeof results[number]) => s.viewport === 'mobile'),
      tablet: results.find((s: typeof results[number]) => s.viewport === 'tablet'),
      desktop: results.find((s: typeof results[number]) => s.viewport === 'desktop'),
    }

    return NextResponse.json({
      scanId,
      screenshots: results,
      grouped,
      count: results.length,
    })
  } catch (error) {
    console.error('Screenshot fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshots' },
      { status: 500 }
    )
  }
}