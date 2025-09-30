import { createHash } from 'node:crypto'
import pLimit from 'p-limit'

export type CssSource = {
  kind: 'inline' | 'link' | 'computed'
  url?: string
  content: string
  bytes: number
  sha: string
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 ContextDS/1.0 (+https://contextds.com/bot)'

// Concurrency limit for parallel stylesheet fetching
// Prevents overwhelming the target server
const fetchLimit = pLimit(6)  // Max 6 concurrent requests

export async function collectStaticCss(targetUrl: string): Promise<CssSource[]> {
  const response = await fetch(targetUrl, {
    headers: buildPrimaryRequestHeaders(targetUrl),
    redirect: 'follow'
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

  for (const inlineCss of extractInlineStyles(html)) {
    cssSources.push(createCssSource('inline', inlineCss))
  }

  // PERFORMANCE OPTIMIZATION: Fetch all stylesheets in parallel with concurrency limit
  const stylesheetUrls = extractStylesheetLinks(html, baseUrl)

  // Parallel fetch with p-limit (max 6 concurrent requests)
  // Before: Sequential (8 files × 100ms = 800ms)
  // After: Parallel (8 files / 6 concurrent = ~200-300ms) ⚡
  const stylesheetPromises = stylesheetUrls.map((stylesheetUrl) =>
    fetchLimit(async () => {
      try {
        const cssText = await fetchStylesheet(stylesheetUrl, response.url)
        return createCssSource('link', cssText, stylesheetUrl)
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

  return [...uniqueSources.values()]
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
