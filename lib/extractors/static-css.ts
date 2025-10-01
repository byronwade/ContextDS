import { createHash } from 'node:crypto'
import pLimit from 'p-limit'
import { withTimeout, createMemoryLimit, createCircuitBreaker } from '@/lib/utils/resilience'

export type CssSource = {
  kind: 'inline' | 'link' | 'computed'
  url?: string
  content: string
  bytes: number
  sha: string
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 ContextDS/1.0 (+https://contextds.com/bot)'

// BULLETPROOF LIMITS: Prevent system overload from large sites
const fetchLimit = pLimit(6)  // Max 6 concurrent requests
const MAX_CSS_SIZE = 2 * 1024 * 1024 // 2MB per CSS file
const MAX_TOTAL_CSS = 10 * 1024 * 1024 // 10MB total CSS
const MAX_CSS_FILES = 50 // Maximum CSS files to process
const CSS_FETCH_TIMEOUT = 5000 // 5s timeout per CSS file
const TOTAL_SCAN_TIMEOUT = 30000 // 30s total timeout

// Circuit breaker for CSS fetching
const cssCircuitBreaker = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 10000,
  name: 'css-fetch'
})

export async function collectStaticCss(targetUrl: string): Promise<CssSource[]> {
  // BULLETPROOF: Wrap entire function with timeout and memory limits
  return withTimeout(async () => {
    const memoryLimit = createMemoryLimit(MAX_TOTAL_CSS)

    const response = await fetch(targetUrl, {
      headers: buildPrimaryRequestHeaders(targetUrl),
      redirect: 'follow',
      // Add AbortController for fetch timeout
      signal: AbortSignal.timeout(10000) // 10s timeout for initial page
    })

  if (!response.ok) {
    const statusMessages: Record<number, string> = {
      403: 'Site blocks automated scanners (check robots.txt or contact site owner)',
      404: 'Page not found',
      429: 'Rate limited - please try again later',
      500: 'Site server error',
      503: 'Site temporarily unavailable'
    }
    const message = statusMessages[response.status] || `HTTP ${response.status}`
    throw new Error(message)
  }

    const html = await response.text()
    const baseUrl = new URL(response.url)
    const cssSources: CssSource[] = []
    let totalBytes = 0

    // BULLETPROOF: Process inline styles with size limits
    const inlineStyles = extractInlineStyles(html)
    for (const inlineCss of inlineStyles) {
      const source = createCssSource('inline', inlineCss)

      // Check size limits
      if (source.bytes > MAX_CSS_SIZE) {
        console.warn(`Skipping large inline CSS: ${source.bytes} bytes`)
        continue
      }

      totalBytes += source.bytes
      if (totalBytes > MAX_TOTAL_CSS) {
        console.warn(`CSS size limit reached: ${totalBytes} bytes, stopping collection`)
        break
      }

      cssSources.push(source)
      memoryLimit.track(source.bytes)
    }

    // BULLETPROOF: Limit number of stylesheets and add circuit breaker
    const allStylesheetUrls = extractStylesheetLinks(html, baseUrl)
    const stylesheetUrls = allStylesheetUrls.slice(0, MAX_CSS_FILES)

    if (allStylesheetUrls.length > MAX_CSS_FILES) {
      console.warn(`Too many CSS files (${allStylesheetUrls.length}), processing only first ${MAX_CSS_FILES}`)
    }

    // BULLETPROOF: Parallel fetch with size limits, timeouts, and circuit breaker
    const stylesheetPromises = stylesheetUrls.map((stylesheetUrl) =>
      fetchLimit(async () => {
        try {
          // Check circuit breaker
          return await cssCircuitBreaker.execute(async () => {
            const cssText = await withTimeout(
              () => fetchStylesheet(stylesheetUrl, response.url),
              CSS_FETCH_TIMEOUT
            )

            // Size check before creating source
            const bytes = Buffer.byteLength(cssText, 'utf8')
            if (bytes > MAX_CSS_SIZE) {
              console.warn(`Skipping large CSS file ${stylesheetUrl}: ${bytes} bytes`)
              return null
            }

            if (totalBytes + bytes > MAX_TOTAL_CSS) {
              console.warn(`CSS size limit would be exceeded, skipping ${stylesheetUrl}`)
              return null
            }

            const source = createCssSource('link', cssText, stylesheetUrl)
            totalBytes += source.bytes
            memoryLimit.track(source.bytes)

            return source
          })
        } catch (error) {
          console.warn(`Failed to fetch stylesheet ${stylesheetUrl}:`, error)
          return null
        }
      })
    )

    // Wait for all fetches to complete (parallelized, rate-limited)
    const stylesheetResults = await Promise.all(stylesheetPromises)

    // Add successful results
    stylesheetResults.forEach(source => {
      if (source) cssSources.push(source)
    })

    // Deduplicate by SHA
    const uniqueSources = new Map<string, CssSource>()
    cssSources.forEach((source) => {
      if (!uniqueSources.has(source.sha)) {
        uniqueSources.set(source.sha, source)
      }
    })

    console.log(`[static-css] Successfully collected ${uniqueSources.size} CSS sources (${totalBytes} bytes)`)
    return [...uniqueSources.values()]
  }, TOTAL_SCAN_TIMEOUT)
}

function extractInlineStyles(html: string): string[] {
  const styles: string[] = []
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let match: RegExpExecArray | null
  while ((match = styleRegex.exec(html)) !== null) {
    const content = match[1]?.trim()
    if (content) {
      styles.push(content)
    }
  }
  return styles
}

function extractStylesheetLinks(html: string, baseUrl: URL): string[] {
  const links: string[] = []
  const linkRegex = /<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0]
    const hrefMatch = /href=["']([^"']+)["']/i.exec(tag)
    if (hrefMatch) {
      try {
        const resolved = new URL(hrefMatch[1], baseUrl).toString()
        links.push(resolved)
      } catch (error) {
        console.warn('Invalid stylesheet URL', error)
      }
    }
  }
  return links
}

async function fetchStylesheet(url: string, referer?: string): Promise<string> {
  const response = await fetch(url, {
    headers: buildStylesheetRequestHeaders(url, referer),
    redirect: 'follow'
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch stylesheet: ${response.status}`)
  }

  return await response.text()
}

function buildPrimaryRequestHeaders(targetUrl: string) {
  const origin = new URL(targetUrl).origin
  return {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    Referer: origin,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  }
}

function buildStylesheetRequestHeaders(url: string, referer?: string) {
  const origin = new URL(url).origin
  return {
    'User-Agent': USER_AGENT,
    Accept: 'text/css,*/*;q=0.1',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    Referer: referer || origin,
    'Sec-Fetch-Dest': 'style',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': referer ? new URL(referer).origin === origin ? 'same-site' : 'cross-site' : 'cross-site'
  }
}

function createCssSource(kind: 'inline' | 'link', content: string, url?: string): CssSource {
  const normalized = content.trim()
  const sha = createHash('sha256').update(normalized).digest('hex')
  return {
    kind,
    url,
    content: normalized,
    bytes: Buffer.byteLength(normalized, 'utf8'),
    sha
  }
}
