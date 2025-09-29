import { extractCss } from '@projectwallace/extract-css-core'
import { chromium, type Browser, type Page } from 'playwright'
import { createHash } from 'crypto'

export interface CSSSource {
  url?: string
  kind: 'link' | 'inline' | 'computed'
  content: string
  bytes: number
  sha: string
}

export interface ExtractionOptions {
  url: string
  prettify?: boolean
  viewports?: Array<{ width: number; height: number }>
  userAgent?: string
  timeout?: number
  includeComputed?: boolean
}

export interface ExtractionResult {
  sources: CSSSource[]
  totalBytes: number
  extractedAt: string
  viewport: { width: number; height: number }
  url: string
  screenshots?: string[]
}

export class CSSExtractor {
  private browser: Browser | null = null

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  private async extractStaticCSS(page: Page): Promise<CSSSource[]> {
    const sources: CSSSource[] = []

    // Extract external stylesheets
    const linkTags = await page.locator('link[rel="stylesheet"]').all()
    for (const link of linkTags) {
      try {
        const href = await link.getAttribute('href')
        if (href) {
          const absoluteUrl = new URL(href, page.url()).toString()
          const response = await page.request.get(absoluteUrl)

          if (response.ok()) {
            const content = await response.text()
            sources.push({
              url: absoluteUrl,
              kind: 'link',
              content,
              bytes: Buffer.byteLength(content, 'utf8'),
              sha: this.generateHash(content)
            })
          }
        }
      } catch (error) {
        console.warn(`Failed to extract CSS from link: ${error}`)
      }
    }

    // Extract inline styles
    const styleTags = await page.locator('style').all()
    for (const style of styleTags) {
      try {
        const content = await style.textContent()
        if (content) {
          sources.push({
            kind: 'inline',
            content,
            bytes: Buffer.byteLength(content, 'utf8'),
            sha: this.generateHash(content)
          })
        }
      } catch (error) {
        console.warn(`Failed to extract inline CSS: ${error}`)
      }
    }

    return sources
  }

  private async extractComputedCSS(page: Page): Promise<CSSSource> {
    // Get all computed styles from the page
    const computedCSS = await page.evaluate(() => {
      const styles: string[] = []
      const elements = document.querySelectorAll('*')

      // Extract computed styles for all elements
      for (const element of elements) {
        const computed = window.getComputedStyle(element)
        const cssText = computed.cssText
        if (cssText) {
          styles.push(cssText)
        }
      }

      return styles.join('\\n')
    })

    return {
      kind: 'computed',
      content: computedCSS,
      bytes: Buffer.byteLength(computedCSS, 'utf8'),
      sha: this.generateHash(computedCSS)
    }
  }

  private async takeScreenshot(page: Page): Promise<string> {
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    })

    // Convert to base64 for storage
    return `data:image/png;base64,${screenshot.toString('base64')}`
  }

  async extractFromURL(options: ExtractionOptions): Promise<ExtractionResult> {
    await this.initialize()

    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const context = await this.browser.newContext({
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    const page = await context.newPage()

    try {
      // Set default viewport if not specified
      const defaultViewport = { width: 1280, height: 720 }
      const viewport = options.viewports?.[0] || defaultViewport

      await page.setViewportSize(viewport)

      // Navigate to the page
      await page.goto(options.url, {
        waitUntil: 'networkidle',
        timeout: options.timeout || 30000
      })

      // Wait for any lazy-loaded CSS
      await page.waitForTimeout(2000)

      const sources: CSSSource[] = []

      // Extract static CSS (external stylesheets and inline styles)
      const staticSources = await this.extractStaticCSS(page)
      sources.push(...staticSources)

      // Extract computed CSS if requested
      if (options.includeComputed) {
        const computedSource = await this.extractComputedCSS(page)
        sources.push(computedSource)
      }

      // Take screenshot for visual reference
      const screenshots = [await this.takeScreenshot(page)]

      // Calculate total bytes
      const totalBytes = sources.reduce((sum, source) => sum + source.bytes, 0)

      return {
        sources: sources.filter(source => source.content.trim().length > 0),
        totalBytes,
        extractedAt: new Date().toISOString(),
        viewport,
        url: options.url,
        screenshots
      }

    } finally {
      await context.close()
    }
  }

  async extractMultiViewport(options: ExtractionOptions): Promise<ExtractionResult[]> {
    const viewports = options.viewports || [
      { width: 360, height: 640 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1280, height: 720 }   // Desktop
    ]

    const results: ExtractionResult[] = []

    for (const viewport of viewports) {
      const result = await this.extractFromURL({
        ...options,
        viewports: [viewport]
      })
      results.push(result)
    }

    return results
  }

  // Validate robots.txt compliance
  async checkRobotsCompliance(url: string, userAgent = '*'): Promise<boolean> {
    try {
      const domain = new URL(url).origin
      const robotsUrl = `${domain}/robots.txt`

      const response = await fetch(robotsUrl)
      if (!response.ok) {
        return true // No robots.txt = allowed
      }

      const robotsText = await response.text()
      const lines = robotsText.split('\\n')

      let currentUserAgent = ''
      let isDisallowed = false

      for (const line of lines) {
        const trimmed = line.trim()

        if (trimmed.startsWith('User-agent:')) {
          currentUserAgent = trimmed.substring(11).trim()
        } else if (trimmed.startsWith('Disallow:') &&
                   (currentUserAgent === '*' || currentUserAgent === userAgent)) {
          const disallowPath = trimmed.substring(9).trim()
          const urlPath = new URL(url).pathname

          if (disallowPath === '/' || urlPath.startsWith(disallowPath)) {
            isDisallowed = true
          }
        }
      }

      return !isDisallowed
    } catch (error) {
      console.warn(`Failed to check robots.txt for ${url}: ${error}`)
      return true // Default to allowed if we can't check
    }
  }

  // Deduplicate CSS sources by content hash
  deduplicateSources(sources: CSSSource[]): CSSSource[] {
    const seen = new Set<string>()
    const deduplicated: CSSSource[] = []

    for (const source of sources) {
      if (!seen.has(source.sha)) {
        seen.add(source.sha)
        deduplicated.push(source)
      }
    }

    return deduplicated
  }

  // Prettify CSS content
  prettifyCSS(css: string): string {
    // Basic CSS prettification
    return css
      .replace(/\{/g, ' {\\n  ')
      .replace(/\}/g, '\\n}\\n')
      .replace(/;/g, ';\\n  ')
      .replace(/,/g, ',\\n  ')
      .replace(/\\n\\s*\\n/g, '\\n')
      .trim()
  }
}