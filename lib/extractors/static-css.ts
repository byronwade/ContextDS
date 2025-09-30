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
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

// Concurrency limit for parallel stylesheet fetching
// Prevents overwhelming the target server
const fetchLimit = pLimit(6)  // Max 6 concurrent requests

export async function collectStaticCss(targetUrl: string): Promise<CssSource[]> {
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow'
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.status}`)
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
        const cssText = await fetchStylesheet(stylesheetUrl)
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

async function fetchStylesheet(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/css,*/*;q=0.1'
    },
    redirect: 'follow'
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch stylesheet: ${response.status}`)
  }

  return await response.text()
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
