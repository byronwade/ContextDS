import { createHash } from 'crypto'
import { captureScreenshot } from './screenshot'
import { uploadScreenshot } from '@/lib/storage/blob-storage'
import { db, screenshots, screenshotContent } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

interface CaptureScreenshotsOptions {
  url: string
  siteId: string
  scanId: string
  viewports?: ('mobile' | 'tablet' | 'desktop')[]
  fullPage?: boolean
  selector?: string
  label?: string
}

interface ScreenshotResult {
  viewport: string
  url: string
  width: number
  height: number
}

/**
 * Capture screenshots for a scan (direct function call, not HTTP)
 * This is called directly from scan-orchestrator for better reliability
 */
export async function captureScreenshotsForScan(
  options: CaptureScreenshotsOptions
): Promise<{ success: boolean; screenshots: ScreenshotResult[]; count: number; error?: string }> {
  const { url, siteId, scanId, viewports = ['desktop'], fullPage = false, selector, label } = options

  console.log('[screenshot-capture] Starting capture for:', { url, scanId, viewports })

  const results: ScreenshotResult[] = []

  // Capture screenshots for each viewport
  for (const viewport of viewports) {
    try {
      const viewportSize = {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1920, height: 1080 },
      }[viewport]

      console.log(`[screenshot-capture] Capturing ${viewport} screenshot...`)

      // Capture screenshot
      const screenshot = await captureScreenshot({
        url,
        viewport: viewportSize,
        fullPage,
        selector,
        waitForTimeout: 2000,
      })

      console.log(`[screenshot-capture] ${viewport} screenshot captured (${screenshot.buffer.length} bytes)`)

      // Calculate SHA-256 hash of screenshot buffer
      const sha = createHash('sha256').update(screenshot.buffer).digest('hex')

      // Check if this screenshot content already exists
      const existing = await db
        .select()
        .from(screenshotContent)
        .where(eq(screenshotContent.sha, sha))
        .limit(1)

      let screenshotUrl: string
      let screenshotWidth: number
      let screenshotHeight: number
      let screenshotSize: number

      if (existing.length > 0) {
        // Reuse existing screenshot
        screenshotUrl = existing[0].url
        screenshotWidth = existing[0].width
        screenshotHeight = existing[0].height
        screenshotSize = existing[0].fileSize

        // Update last accessed time
        await db
          .update(screenshotContent)
          .set({ lastAccessed: sql`NOW()` })
          .where(eq(screenshotContent.sha, sha))

        console.log(`[screenshot-capture] ♻️  Screenshot reused: ${viewport} (SHA: ${sha.substring(0, 8)}...)`)
      } else {
        console.log(`[screenshot-capture] Uploading ${viewport} screenshot to blob storage...`)

        // Upload new screenshot to storage
        const uploaded = await uploadScreenshot({
          scanId,
          viewport,
          buffer: screenshot.buffer,
          label,
        })

        screenshotUrl = uploaded.url
        screenshotWidth = screenshot.width
        screenshotHeight = screenshot.height
        screenshotSize = uploaded.size

        console.log(`[screenshot-capture] Screenshot uploaded: ${viewport} (${uploaded.size} bytes)`)

        // Save content to deduplication table
        await db.insert(screenshotContent).values({
          sha,
          url: uploaded.url,
          width: screenshot.width,
          height: screenshot.height,
          fileSize: uploaded.size,
          referenceCount: 0, // Will be incremented by trigger
        })

        console.log(`[screenshot-capture] ✅ Screenshot uploaded: ${viewport} (${uploaded.size} bytes, SHA: ${sha.substring(0, 8)}...)`)
      }

      // UPSERT: Replace existing screenshot for this site+viewport, or insert new
      await db
        .insert(screenshots)
        .values({
          siteId,
          scanId,
          sha,
          viewport,
          selector,
          label,
        })
        .onConflictDoUpdate({
          target: [screenshots.siteId, screenshots.viewport],
          set: {
            scanId,
            sha,
            capturedAt: sql`NOW()`,
            selector,
            label,
          },
        })

      results.push({
        viewport,
        url: screenshotUrl,
        width: screenshotWidth,
        height: screenshotHeight,
      })

      console.log(`[screenshot-capture] ✨ Screenshot saved for scan: ${viewport}`)

    } catch (error) {
      console.error(`[screenshot-capture] Failed to capture ${viewport} screenshot:`, error)
      console.error(`[screenshot-capture] Error details:`, error instanceof Error ? error.message : error)
      // Continue with other viewports even if one fails
    }
  }

  if (results.length === 0) {
    const errorMsg = 'Failed to capture any screenshots'
    console.error('[screenshot-capture]', errorMsg)
    return {
      success: false,
      screenshots: [],
      count: 0,
      error: errorMsg
    }
  }

  console.log(`[screenshot-capture] ✅ Successfully captured ${results.length} screenshots`)

  return {
    success: true,
    screenshots: results,
    count: results.length,
  }
}
