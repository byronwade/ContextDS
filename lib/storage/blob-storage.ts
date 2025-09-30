import { put, del, list } from '@vercel/blob'

export interface UploadScreenshotOptions {
  scanId: string
  viewport: 'mobile' | 'tablet' | 'desktop'
  buffer: Buffer
  label?: string
}

export interface UploadScreenshotResult {
  url: string
  path: string
  size: number
}

/**
 * Upload screenshot to Vercel Blob Storage
 */
export async function uploadScreenshot(
  options: UploadScreenshotOptions
): Promise<UploadScreenshotResult> {
  const { scanId, viewport, buffer, label } = options

  // Create pathname: screenshots/scanId/viewport-timestamp.jpg
  const timestamp = Date.now()
  const pathname = label
    ? `screenshots/${scanId}/${viewport}-${label}-${timestamp}.jpg`
    : `screenshots/${scanId}/${viewport}-${timestamp}.jpg`

  // Upload to Vercel Blob
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
    addRandomSuffix: false, // Keep predictable paths
  })

  return {
    url: blob.url,
    path: pathname,
    size: buffer.length,
  }
}

/**
 * Upload multiple screenshots in parallel
 */
export async function uploadScreenshots(
  screenshots: UploadScreenshotOptions[]
): Promise<UploadScreenshotResult[]> {
  const results = await Promise.all(
    screenshots.map(screenshot => uploadScreenshot(screenshot))
  )
  return results
}

/**
 * Delete screenshot from Vercel Blob Storage
 */
export async function deleteScreenshot(url: string): Promise<void> {
  await del(url)
}

/**
 * Delete all screenshots for a scan
 */
export async function deleteScreenshotsByScan(scanId: string): Promise<void> {
  // List all blobs with scan prefix
  const { blobs } = await list({
    prefix: `screenshots/${scanId}/`,
  })

  if (!blobs || blobs.length === 0) {
    return
  }

  // Delete all blobs
  await Promise.all(blobs.map(blob => del(blob.url)))
}