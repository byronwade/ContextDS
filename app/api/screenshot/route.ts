import { NextRequest, NextResponse } from 'next/server'
import { captureScreenshot, captureMultiViewport } from '@/lib/utils/screenshot'
import { uploadScreenshot } from '@/lib/storage/blob-storage'
import { db, screenshots } from '@/lib/db'

export const maxDuration = 60 // Vercel Pro: 60 second timeout

interface ScreenshotRequest {
  url: string
  scanId: string
  viewports?: ('mobile' | 'tablet' | 'desktop')[]
  fullPage?: boolean
  selector?: string
  label?: string
}

/**
 * POST /api/screenshot - Capture screenshots for a URL
 *
 * Body:
 * {
 *   url: string
 *   scanId: string
 *   viewports?: ['mobile', 'tablet', 'desktop']
 *   fullPage?: boolean
 *   selector?: string
 *   label?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScreenshotRequest = await request.json()
    const { url, scanId, viewports = ['desktop'], fullPage = false, selector, label } = body

    if (!url || !scanId) {
      return NextResponse.json(
        { error: 'Missing required fields: url, scanId' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const results: Array<{ viewport: string; url: string; width: number; height: number }> = []

    // Capture screenshots for each viewport
    for (const viewport of viewports) {
      try {
        const viewportSize = {
          mobile: { width: 375, height: 667 },
          tablet: { width: 768, height: 1024 },
          desktop: { width: 1920, height: 1080 },
        }[viewport]

        // Capture screenshot
        const screenshot = await captureScreenshot({
          url,
          viewport: viewportSize,
          fullPage,
          selector,
          waitForTimeout: 2000,
        })

        // Upload to Supabase Storage
        const uploaded = await uploadScreenshot({
          scanId,
          viewport,
          buffer: screenshot.buffer,
          label,
        })

        // Save metadata to database
        await db.insert(screenshots).values({
          scanId,
          url: uploaded.url,
          viewport,
          width: screenshot.width,
          height: screenshot.height,
          fileSize: uploaded.size,
          selector,
          label,
        })

        results.push({
          viewport,
          url: uploaded.url,
          width: screenshot.width,
          height: screenshot.height,
        })

        console.log(`✅ Screenshot captured: ${viewport} (${uploaded.size} bytes)`)
      } catch (error) {
        console.error(`Failed to capture ${viewport} screenshot:`, error)
        // Continue with other viewports even if one fails
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to capture any screenshots' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      screenshots: results,
      count: results.length,
    })

  } catch (error) {
    console.error('Screenshot API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Screenshot capture failed'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/screenshot?scanId=xxx - Get screenshots for a scan
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return NextResponse.json(
        { error: 'Missing scanId parameter' },
        { status: 400 }
      )
    }

    // Fetch screenshots from database
    const results = await db
      .select()
      .from(screenshots)
      .where((s) => s.scanId.equals(scanId))
      .orderBy((s) => s.capturedAt)

    return NextResponse.json({
      screenshots: results,
      count: results.length,
    })

  } catch (error) {
    console.error('Screenshot fetch error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch screenshots'
      },
      { status: 500 }
    )
  }
}