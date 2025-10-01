import { NextRequest, NextResponse } from 'next/server'
import { db, screenshots, screenshotContent } from '@/lib/db'
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

    console.log('[Screenshots API] Fetching screenshots for scanId:', scanId)

    // Fetch screenshots with content data joined
    const results = await db
      .select({
        id: screenshots.id,
        scanId: screenshots.scanId,
        viewport: screenshots.viewport,
        capturedAt: screenshots.capturedAt,
        selector: screenshots.selector,
        label: screenshots.label,
        url: screenshotContent.url,
        width: screenshotContent.width,
        height: screenshotContent.height,
        fileSize: screenshotContent.fileSize,
      })
      .from(screenshots)
      .innerJoin(screenshotContent, eq(screenshots.sha, screenshotContent.sha))
      .where(eq(screenshots.scanId, scanId))
      .orderBy(asc(screenshots.capturedAt))

    console.log('[Screenshots API] Found', results.length, 'screenshots')

    // Group by viewport for easy access
    const grouped = {
      mobile: results.find((s) => s.viewport === 'mobile'),
      tablet: results.find((s) => s.viewport === 'tablet'),
      desktop: results.find((s) => s.viewport === 'desktop'),
    }

    return NextResponse.json({
      scanId,
      screenshots: results,
      grouped,
      count: results.length,
    })
  } catch (error) {
    console.error('[Screenshots API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshots' },
      { status: 500 }
    )
  }
}