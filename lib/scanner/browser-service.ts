/**
 * Client for the Docker Playwright scanner microservice.
 * Set SCANNER_SERVICE_URL (e.g. http://localhost:4040 or https://scanner.designcontracts.sh)
 */

import { createHash } from 'node:crypto'
import type { CssSource } from '@/lib/extractors/static-css'

export type BrowserScreenshot = {
  label: string
  viewport: 'desktop' | 'tablet' | 'mobile'
  mime: string
  base64: string
}

export type BrowserCaptureAuth = {
  /** Session cookies for surfaces the caller owns (their own dashboards). */
  cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>
  headers?: Record<string, string>
}

export type BrowserRenderAudit = {
  viewport: { width: number; height: number }
  elementCount: number
  /** Number of pages folded into this audit (multi-page crawl) */
  pagesAudited?: number
  colors: Array<{ kind: string; value: string; weight: number }>
  fonts: Array<{ value: string; weight: number }>
  fontSizes: Array<{ value: string; weight: number }>
  fontWeights: Array<{ value: string; weight: number }>
  spacing: Array<{ value: string; weight: number }>
  radius: Array<{ value: string; weight: number }>
  shadows: Array<{ value: string; weight: number }>
  loadedFonts: string[]
}

export type BrowserServiceResult = {
  url: string
  title?: string
  sources: CssSource[]
  screenshot?: { mime: string; base64: string } | null
  screenshots?: BrowserScreenshot[]
  /** Visible-DOM measurement of what the page actually paints */
  audit?: BrowserRenderAudit | null
  /** Pages visited by the crawl */
  pages?: Array<{ path: string; title: string; audited: boolean }>
  bytes: number
  sourceCount: number
}

function createCssSource(kind: CssSource['kind'], content: string, url?: string | null): CssSource {
  const bytes = Buffer.byteLength(content, 'utf8')
  const sha = createHash('sha256').update(content).digest('hex')
  return {
    kind,
    url: url || undefined,
    content,
    bytes,
    sha,
  }
}

export function getScannerServiceUrl(): string | null {
  const url = process.env.SCANNER_SERVICE_URL?.trim()
  if (!url) return null
  return url.replace(/\/$/, '')
}

export function isBrowserServiceConfigured(): boolean {
  return Boolean(getScannerServiceUrl())
}

export async function scanWithBrowserService(
  targetUrl: string,
  options?: {
    timeoutMs?: number
    /** Same-origin pages to crawl for CSS + audits + shots (0–12, default 6). */
    pages?: number
    /** Explicit paths to capture instead of discovery. */
    paths?: string[]
    /** Authenticated capture of the caller's own surfaces. */
    auth?: BrowserCaptureAuth
  }
): Promise<BrowserServiceResult | null> {
  const base = getScannerServiceUrl()
  if (!base) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 75000)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const secret = process.env.SCANNER_SERVICE_SECRET?.trim()
    if (secret) {
      headers['x-scanner-secret'] = secret
    }

    const response = await fetch(`${base}/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: targetUrl,
        screenshot: true,
        pages: options?.pages,
        paths: options?.paths,
        auth: options?.auth,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Scanner service ${response.status}: ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as {
      url: string
      title?: string
      sources?: Array<{
        kind?: string
        url?: string | null
        content: string
        bytes?: number
      }>
      screenshot?: { mime: string; base64: string } | null
      screenshots?: BrowserScreenshot[]
      audit?: BrowserRenderAudit | null
      pages?: Array<{ path: string; title: string; audited: boolean }>
      bytes?: number
      sourceCount?: number
    }

    const sources = (data.sources || []).map((source) =>
      createCssSource((source.kind as CssSource['kind']) || 'computed', source.content, source.url)
    )

    return {
      url: data.url || targetUrl,
      title: data.title,
      sources,
      screenshot: data.screenshot ?? null,
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : undefined,
      audit: data.audit ?? null,
      pages: Array.isArray(data.pages) ? data.pages : undefined,
      bytes: data.bytes || sources.reduce((sum, s) => sum + s.bytes, 0),
      sourceCount: data.sourceCount || sources.length,
    }
  } finally {
    clearTimeout(timeout)
  }
}
