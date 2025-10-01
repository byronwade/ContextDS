import { NextRequest, NextResponse } from 'next/server'
import { promises as dns } from 'dns'
import { createHash } from 'crypto'
import { captureScreenshot, captureMultiViewport } from '@/lib/utils/screenshot'
import { uploadScreenshot } from '@/lib/storage/blob-storage'
import { db, screenshots, screenshotContent } from '@/lib/db'
import { eq, asc, sql } from 'drizzle-orm'

export const maxDuration = 60 // Vercel Pro: 60 second timeout

/**
 * Check if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true // Invalid IP, treat as private
  }

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) || // Link-local
    parts[0] === 255 // Broadcast
  )
}

/**
 * Check if an IPv6 address is in a private range
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return (
    lower === '::1' ||
    lower.startsWith('::1') || // Loopback
    lower.startsWith('fe80:') || // Link-local
    lower.startsWith('fc00:') || // Unique local
    lower.startsWith('fd00:') // Unique local
  )
}

/**
 * Validate URL is not targeting private/internal resources
 */
async function validateSSRF(url: URL): Promise<string | null> {
  const hostname = url.hostname
  const port = url.port || (url.protocol === 'https:' ? '443' : '80')

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')) {
    return 'Cannot capture screenshots of localhost or loopback addresses'
  }

  // Check if hostname is an IP address (not a domain name)
  const isIPv4Format = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  const isIPv6Format = hostname.includes(':')

  // Block private IP ranges if hostname is an IP address
  if (isIPv4Format && isPrivateIP(hostname)) {
    return 'Cannot capture screenshots of private IP addresses'
  }

  if (isIPv6Format && isPrivateIPv6(hostname)) {
    return 'Cannot capture screenshots of private IPv6 addresses'
  }

  // Block non-standard ports (only allow 80, 443, 8080)
  const allowedPorts = ['80', '443', '8080']
  if (!allowedPorts.includes(port)) {
    return 'Only standard HTTP/HTTPS ports (80, 443, 8080) are allowed'
  }

  // Block cloud metadata endpoints
  const blockedHosts = [
    '169.254.169.254', // AWS metadata
    'metadata.google.internal', // GCP
    'metadata.azure.com', // Azure
  ]
  if (blockedHosts.some(blocked => hostname.includes(blocked))) {
    return 'Cannot capture screenshots of cloud metadata endpoints'
  }

  // Resolve DNS for both IPv4 and IPv6
  try {
    const [ipv4Result, ipv6Result] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname)
    ])

    // Check IPv4 addresses
    if (ipv4Result.status === 'fulfilled') {
      for (const ip of ipv4Result.value) {
        if (isPrivateIP(ip)) {
          return 'Domain resolves to private IP address'
        }
      }
    }

    // Check IPv6 addresses
    if (ipv6Result.status === 'fulfilled') {
      for (const ip of ipv6Result.value) {
        if (isPrivateIPv6(ip)) {
          return 'Domain resolves to private IPv6 address'
        }
      }
    }

    // If both DNS resolutions failed, reject
    if (ipv4Result.status === 'rejected' && ipv6Result.status === 'rejected') {
      return 'DNS resolution failed - domain may be invalid'
    }
  } catch (error) {
    console.warn('⚠️ DNS resolution error for', hostname, error)
    return 'DNS resolution failed - domain may be invalid'
  }

  return null // Valid
}

interface ScreenshotRequest {
  url: string
  siteId: string
  scanId: string
  viewports?: ('mobile' | 'tablet' | 'desktop')[]
  fullPage?: boolean
  selector?: string
  label?: string
}

/**
 * POST /api/screenshot - Capture screenshots for a URL
 * Replaces existing screenshots for the site (keeps only latest per viewport)
 *
 * Body:
 * {
 *   url: string
 *   siteId: string
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
    const { url, siteId, scanId, viewports = ['desktop'], fullPage = false, selector, label } = body

    if (!url || !siteId || !scanId) {
      return NextResponse.json(
        { error: 'Missing required fields: url, siteId, scanId' },
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Validate protocol
    const allowedProtocols = ['http:', 'https:']
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Invalid URL protocol. Only HTTP and HTTPS are allowed.' },
        { status: 400 }
      )
    }

    // SSRF protection with DNS resolution
    const ssrfError = await validateSSRF(parsedUrl)
    if (ssrfError) {
      return NextResponse.json(
        { error: ssrfError },
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

          console.log(`♻️  Screenshot reused: ${viewport} (SHA: ${sha.substring(0, 8)}...)`)
        } else {
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

          // Save content to deduplication table
          await db.insert(screenshotContent).values({
            sha,
            url: uploaded.url,
            width: screenshot.width,
            height: screenshot.height,
            fileSize: uploaded.size,
            referenceCount: 0, // Will be incremented by trigger
          })

          console.log(`✅ Screenshot uploaded: ${viewport} (${uploaded.size} bytes, SHA: ${sha.substring(0, 8)}...)`)
        }

        // UPSERT: Replace existing screenshot for this site+viewport, or insert new
        // This ensures we always keep the latest screenshot per site
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

        console.log(`✨ Screenshot saved for site (latest): ${viewport}`)

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