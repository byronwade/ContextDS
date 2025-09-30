/**
 * Universal Browser Automation Wrapper
 * Works in both local development (Playwright) and Vercel deployment (Puppeteer-core)
 */

import type { CssSource } from './static-css'
import { createHash } from 'node:crypto'

// Detect runtime environment
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
const isDevelopment = process.env.NODE_ENV === 'development'

export interface BrowserPageWrapper {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>
  hover(selector: string): Promise<void>
  click(selector: string): Promise<void>
  close(): Promise<void>
  startCSSCoverage?(): Promise<void>
  stopCSSCoverage?(): Promise<CoverageEntry[]>
}

export interface BrowserWrapper {
  newPage(): Promise<BrowserPageWrapper>
  close(): Promise<void>
}

export interface CoverageEntry {
  url: string
  ranges: Array<{ start: number; end: number }>
  text: string
}

/**
 * Create browser instance based on environment
 */
export async function createBrowser(): Promise<BrowserWrapper> {
  if (isVercel) {
    // Vercel: Use puppeteer-core + @sparticuz/chromium
    return createPuppeteerBrowser()
  } else {
    // Local: Use Playwright
    return createPlaywrightBrowser()
  }
}

/**
 * Playwright implementation (local development)
 */
async function createPlaywrightBrowser(): Promise<BrowserWrapper> {
  const { chromium } = await import('playwright')

  const browser = await chromium.launch({
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
    headless: true
  })

  return {
    async newPage() {
      const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      })

      let coverageData: any[] = []

      return {
        async goto(url, options = {}) {
          await page.goto(url, {
            waitUntil: (options.waitUntil as any) || 'networkidle',
            timeout: options.timeout || 15000
          })
        },

        async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
          return page.evaluate(fn)
        },

        async hover(selector: string) {
          try {
            await page.hover(selector, { timeout: 1000 })
          } catch {
            // Ignore hover failures
          }
        },

        async click(selector: string) {
          try {
            await page.click(selector, { timeout: 1000 })
          } catch {
            // Ignore click failures
          }
        },

        async startCSSCoverage() {
          await page.coverage.startCSSCoverage({ resetOnNavigation: false })
        },

        async stopCSSCoverage() {
          const coverage = await page.coverage.stopCSSCoverage()
          return coverage.map(entry => ({
            url: entry.url,
            ranges: entry.ranges,
            text: entry.text
          }))
        },

        async close() {
          await page.close().catch(() => {})
        }
      }
    },

    async close() {
      await browser.close().catch(() => {})
    }
  }
}

/**
 * Puppeteer implementation (Vercel serverless)
 */
async function createPuppeteerBrowser(): Promise<BrowserWrapper> {
  try {
    // Dynamic import for Vercel environment
    const puppeteer = await import('puppeteer-core')
    const chromium = await import('@sparticuz/chromium')

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless
    })

    return {
      async newPage() {
        const page = await browser.newPage()

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        // Puppeteer doesn't have built-in coverage API like Playwright
        // We'll need to use Chrome DevTools Protocol directly
        let client: any = null

        return {
          async goto(url, options = {}) {
            const waitUntil = options.waitUntil === 'networkidle' ? 'networkidle2' : 'load'
            await page.goto(url, {
              waitUntil: waitUntil as any,
              timeout: options.timeout || 15000
            })
          },

          async evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
            return page.evaluate(fn as any)
          },

          async hover(selector: string) {
            try {
              await page.hover(selector)
            } catch {
              // Ignore hover failures
            }
          },

          async click(selector: string) {
            try {
              await page.click(selector, { delay: 100 })
            } catch {
              // Ignore click failures
            }
          },

          async startCSSCoverage() {
            client = await page.target().createCDPSession()
            await client.send('DOM.enable')
            await client.send('CSS.enable')
            await client.send('CSS.startRuleUsageTracking')
          },

          async stopCSSCoverage() {
            if (!client) return []

            try {
              const { ruleUsage } = await client.send('CSS.stopRuleUsageTracking')

              // Group ranges by stylesheet ID
              const coverageMap = new Map<string, Array<{ start: number; end: number }>>()

              ruleUsage.forEach((usage: any) => {
                if (usage.used) {
                  const id = usage.styleSheetId
                  if (!coverageMap.has(id)) {
                    coverageMap.set(id, [])
                  }
                  coverageMap.get(id)!.push({
                    start: usage.startOffset,
                    end: usage.endOffset
                  })
                }
              })

              // Fetch text for each stylesheet
              const coverage: CoverageEntry[] = []

              for (const [styleSheetId, ranges] of coverageMap.entries()) {
                try {
                  const { text } = await client.send('CSS.getStyleSheetText', {
                    styleSheetId
                  })

                  // Try to get source URL
                  let sourceURL = 'inline'
                  try {
                    const info: any = await client.send('CSS.getStyleSheetText', { styleSheetId })
                    sourceURL = info.sourceURL || 'inline'
                  } catch {
                    // Ignore if we can't get URL
                  }

                  coverage.push({
                    url: sourceURL,
                    ranges,
                    text
                  })
                } catch (err) {
                  console.warn(`Failed to fetch stylesheet ${styleSheetId}`, err)
                }
              }

              return coverage
            } catch (error) {
              console.error('CSS coverage collection failed', error)
              return []
            }
          },

          async close() {
            if (client) await client.detach().catch(() => {})
            await page.close().catch(() => {})
          }
        }
      },

      async close() {
        await browser.close().catch(() => {})
      }
    }
  } catch (error) {
    console.error('Failed to create Puppeteer browser', error)
    // Fallback to static extraction only
    throw new Error('Browser automation not available in this environment')
  }
}

/**
 * High-level extraction function that uses the right browser
 */
export async function extractWithBrowser(
  url: string,
  options: {
    useCoverage?: boolean
    extractCustomProps?: boolean
    timeout?: number
  } = {}
): Promise<{
  usedCss: CssSource[]
  customProperties: Record<string, string>
  componentStyles: Record<string, any>
}> {
  const useCoverage = options.useCoverage ?? !isVercel // Coverage API slower on serverless
  const extractCustomProps = options.extractCustomProps ?? true
  const timeout = options.timeout ?? (isVercel ? 10000 : 15000) // Shorter timeout on Vercel

  let browser: BrowserWrapper | null = null
  let page: BrowserPageWrapper | null = null

  try {
    browser = await createBrowser()
    page = await browser.newPage()

    // Start coverage if enabled
    if (useCoverage && page.startCSSCoverage) {
      await page.startCSSCoverage()
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout })

    // Trigger interactive states
    await page.hover('button')
    await page.hover('a')
    await page.click('input')

    // Extract used CSS via coverage
    const usedCss: CssSource[] = []

    if (useCoverage && page.stopCSSCoverage) {
      const coverage = await page.stopCSSCoverage()

      coverage.forEach(entry => {
        if (entry.ranges.length === 0) return

        const cssContent = entry.ranges
          .map(range => entry.text.slice(range.start, range.end))
          .join('\n')

        if (cssContent.trim().length > 0) {
          // Use 'computed' kind for coverage-based CSS (valid enum value)
          usedCss.push(createCssSource(cssContent, 'computed', entry.url))
        }
      })
    }

    // Extract custom properties
    let customProperties: Record<string, string> = {}

    if (extractCustomProps) {
      customProperties = await page.evaluate(() => {
        const root = document.documentElement
        const styles = window.getComputedStyle(root)
        const props: Record<string, string> = {}

        for (let i = 0; i < styles.length; i++) {
          const prop = styles[i]
          if (prop.startsWith('--')) {
            const value = styles.getPropertyValue(prop).trim()
            if (value) {
              props[prop] = value
            }
          }
        }

        return props
      })
    }

    // Extract component styles
    const componentStyles = await page.evaluate(() => {
      const keySelectors = [
        'button', 'a', 'h1', 'h2', 'h3', 'p', 'input', 'select',
        '.btn', '.button', '.card', '.nav', '.header', '.footer'
      ]

      const results: Record<string, any> = {}

      keySelectors.forEach(selector => {
        const el = document.querySelector(selector)
        if (!el) return

        const styles = window.getComputedStyle(el)

        results[selector] = {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          fontWeight: styles.fontWeight,
          padding: styles.padding,
          margin: styles.margin,
          borderRadius: styles.borderRadius,
          boxShadow: styles.boxShadow
        }
      })

      return results
    })

    return {
      usedCss,
      customProperties,
      componentStyles
    }
  } catch (error) {
    console.error('Browser extraction failed', error)
    return {
      usedCss: [],
      customProperties: {},
      componentStyles: {}
    }
  } finally {
    await page?.close().catch(() => {})
    await browser?.close().catch(() => {})
  }
}

function createCssSource(content: string, kind: 'inline' | 'link' | 'computed' = 'computed', url?: string): CssSource {
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