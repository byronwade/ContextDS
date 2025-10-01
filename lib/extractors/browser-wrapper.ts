/**
 * Bulletproof Browser Automation Wrapper with Stealth Mode
 * Works in both local development (Playwright) and Vercel deployment (Puppeteer-core)
 * Includes advanced bot protection evasion techniques and resource limits
 */

import type { CssSource } from './static-css'
import { createHash } from 'node:crypto'
import { withTimeout, createMemoryLimit } from '@/lib/utils/resilience'

// Detect runtime environment
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined
const isDevelopment = process.env.NODE_ENV === 'development'

// Realistic User-Agent rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getRandomViewport(): { width: number; height: number } {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 }
  ]
  return viewports[Math.floor(Math.random() * viewports.length)]
}

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
 * Playwright implementation with stealth mode (local development)
 */
async function createPlaywrightBrowser(): Promise<BrowserWrapper> {
  const { chromium } = await import('playwright')

  const browser = await chromium.launch({
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--flag-switches-begin',
      '--disable-site-isolation-trials',
      '--flag-switches-end'
    ],
    headless: true
  })

  return {
    async newPage() {
      const viewport = getRandomViewport()
      const userAgent = getRandomUserAgent()

      const page = await browser.newPage({
        userAgent,
        viewport,
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Sec-Fetch-Dest': 'document',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      // Stealth mode: Hide webdriver property and automation flags
      await page.addInitScript(() => {
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        })

        // Override chrome property
        Object.defineProperty(window, 'chrome', {
          get: () => ({
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
          })
        })

        // Override permissions
        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications'
            ? Promise.resolve({ state: 'denied' } as PermissionStatus)
            : originalQuery(parameters)
        )

        // Override plugins and mimeTypes
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' }
          ]
        })

        // Fake languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        })
      })

      const coverageData: any[] = []

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
 * Puppeteer implementation with stealth mode (Vercel serverless)
 */
async function createPuppeteerBrowser(): Promise<BrowserWrapper> {
  try {
    // Dynamic import for Vercel environment
    const puppeteer = await import('puppeteer-core')
    const chromium = await import('@sparticuz/chromium')

    const stealthArgs = [
      ...chromium.default.args,
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--flag-switches-begin',
      '--disable-site-isolation-trials',
      '--flag-switches-end'
    ]

    const viewport = getRandomViewport()

    const browser = await puppeteer.default.launch({
      args: stealthArgs,
      defaultViewport: viewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless
    })

    return {
      async newPage() {
        const page = await browser.newPage()
        const userAgent = getRandomUserAgent()

        await page.setUserAgent(userAgent)

        // Set realistic headers
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Sec-Fetch-Dest': 'document',
          'Upgrade-Insecure-Requests': '1'
        })

        // Stealth mode: Hide webdriver and automation flags
        await page.evaluateOnNewDocument(() => {
          // Override navigator.webdriver
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
          })

          // Override chrome property
          Object.defineProperty(window, 'chrome', {
            get: () => ({
              runtime: {},
              loadTimes: function() {},
              csi: function() {},
              app: {}
            })
          })

          // Override permissions
          const originalQuery = (window.navigator.permissions as any).query
          ;(window.navigator.permissions as any).query = (parameters: any) => (
            parameters.name === 'notifications'
              ? Promise.resolve({ state: 'denied' })
              : originalQuery(parameters)
          )

          // Override plugins
          Object.defineProperty(navigator, 'plugins', {
            get: () => [
              { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
              { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
              { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' }
            ]
          })

          // Fake languages
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
          })
        })

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
                    const info = await client.send('CSS.getStyleSheetInfo', { styleSheetId })
                    if (info && typeof info === 'object' && 'sourceURL' in info) {
                      sourceURL = info.sourceURL || 'inline'
                    }
                  } catch (err) {
                    console.warn(`Failed to get stylesheet info for ${styleSheetId}`)
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
export interface ComputedStyleEntry {
  selector: string
  element: string
  styles: Record<string, string>
}

// BULLETPROOF LIMITS for browser extraction
const MAX_BROWSER_MEMORY = 100 * 1024 * 1024 // 100MB browser memory limit
const MAX_DOM_ELEMENTS = 5000 // Max DOM elements to process
const MAX_EXTRACTION_TIME = 20000 // 20s max extraction time
const VERCEL_EXTRACTION_TIME = 12000 // 12s on Vercel (serverless limits)
const BROWSER_NAVIGATION_TIMEOUT = 15000 // 15s for page load

export async function extractWithBrowser(
  url: string,
  options: {
    useCoverage?: boolean
    extractCustomProps?: boolean
    timeout?: number
    fastMode?: boolean
  } = {}
): Promise<{
  usedCss: CssSource[]
  customProperties: Record<string, string>
  computedStyles: ComputedStyleEntry[]
}> {
  const useCoverage = options.useCoverage ?? !isVercel // Coverage API slower on serverless
  const extractCustomProps = options.extractCustomProps ?? true
  const baseTimeout = isVercel ? VERCEL_EXTRACTION_TIME : MAX_EXTRACTION_TIME
  const timeout = options.timeout ?? (options.fastMode ? baseTimeout * 0.6 : baseTimeout)

  // BULLETPROOF: Memory and resource tracking
  const memoryLimit = createMemoryLimit(MAX_BROWSER_MEMORY)
  let browser: BrowserWrapper | null = null
  let page: BrowserPageWrapper | null = null
  let resourcesUsed = 0

  return withTimeout(async () => {
    try {
      browser = await createBrowser()
      page = await browser.newPage()

      // Start coverage if enabled
      if (useCoverage && page.startCSSCoverage) {
        await page.startCSSCoverage()
      }

      // BULLETPROOF: Navigation with timeout and error handling
      try {
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: Math.min(timeout * 0.6, BROWSER_NAVIGATION_TIMEOUT)
        })
      } catch (error) {
        console.warn(`Navigation timeout or error for ${url}, continuing with partial load:`, error)
        // Continue with partial page load - better than total failure
      }

      // BULLETPROOF: Trigger interactive states with error handling
      try {
        await Promise.race([
          Promise.all([
            page.hover('button').catch(() => {}),
            page.hover('a').catch(() => {}),
            page.click('input').catch(() => {})
          ]),
          new Promise(resolve => setTimeout(resolve, 2000)) // Max 2s for interactions
        ])
      } catch (error) {
        console.warn('Interactive state triggering failed:', error)
        // Continue - not critical for token extraction
      }

      // BULLETPROOF: Extract used CSS via coverage with limits
      const usedCss: CssSource[] = []
      let totalCssBytes = 0

      if (useCoverage && page.stopCSSCoverage) {
        const coverage = await page.stopCSSCoverage()

        for (const entry of coverage.slice(0, 100)) { // Limit coverage entries
          if (entry.ranges.length === 0) continue

          const cssContent = entry.ranges
            .slice(0, 50) // Limit ranges per entry
            .map(range => entry.text.slice(range.start, range.end))
            .join('\n')

          if (cssContent.trim().length > 0) {
            const source = createCssSource(cssContent, 'computed', entry.url)

            // Size check
            if (source.bytes > 1024 * 1024) { // 1MB per CSS source
              console.warn(`Skipping large coverage CSS: ${source.bytes} bytes`)
              continue
            }

            if (totalCssBytes + source.bytes > 10 * 1024 * 1024) { // 10MB total
              console.warn('Coverage CSS size limit reached')
              break
            }

            usedCss.push(source)
            totalCssBytes += source.bytes
            memoryLimit.track(source.bytes)
            resourcesUsed++
          }
        }
      }

      // BULLETPROOF: Extract custom properties with limits
      let customProperties: Record<string, string> = {}

      if (extractCustomProps) {
        try {
          customProperties = await withTimeout(async () => {
            return page!.evaluate(() => {
              const root = document.documentElement
              const styles = window.getComputedStyle(root)
              const props: Record<string, string> = {}
              let count = 0

              for (let i = 0; i < styles.length && count < 200; i++) { // Limit to 200 props
                const prop = styles[i]
                if (prop.startsWith('--')) {
                  const value = styles.getPropertyValue(prop).trim()
                  if (value && value.length < 500) { // Limit value length
                    props[prop] = value
                    count++
                  }
                }
              }

              return props
            })
          }, 3000) // 3s timeout for custom props
        } catch (error) {
          console.warn('Custom properties extraction failed:', error)
          customProperties = {}
        }
      }

      // BULLETPROOF: Extract component styles with strict limits
      const computedStylesData = await withTimeout(async () => {
        return page!.evaluate((maxElements: number) => {
          interface ComputedStyleEntry {
            selector: string
            element: string
            styles: Record<string, string>
            pseudoStates?: {
              hover?: Record<string, string>
              focus?: Record<string, string>
              active?: Record<string, string>
            }
          }

          const results: ComputedStyleEntry[] = []
          let processedElements = 0

          // BULLETPROOF: Extract styles from DOM elements with limits
          const extractStyles = (el: Element, selector: string, element: string) => {
            if (processedElements >= maxElements) return

            const styles = window.getComputedStyle(el)
            processedElements++

        const styleObj: Record<string, string> = {
          // Typography
          'font-size': styles.fontSize,
          'font-family': styles.fontFamily,
          'font-weight': styles.fontWeight,
          'line-height': styles.lineHeight,
          'letter-spacing': styles.letterSpacing,
          'text-transform': styles.textTransform,
          'text-decoration': styles.textDecoration,

          // Spacing
          'padding': styles.padding,
          'padding-top': styles.paddingTop,
          'padding-right': styles.paddingRight,
          'padding-bottom': styles.paddingBottom,
          'padding-left': styles.paddingLeft,
          'margin': styles.margin,
          'margin-top': styles.marginTop,
          'margin-right': styles.marginRight,
          'margin-bottom': styles.marginBottom,
          'margin-left': styles.marginLeft,
          'gap': styles.gap,

          // Layout
          'display': styles.display,
          'flex-direction': styles.flexDirection,
          'justify-content': styles.justifyContent,
          'align-items': styles.alignItems,
          'grid-template-columns': styles.gridTemplateColumns,
          'grid-template-rows': styles.gridTemplateRows,
          'position': styles.position,
          'top': styles.top,
          'right': styles.right,
          'bottom': styles.bottom,
          'left': styles.left,
          'z-index': styles.zIndex,
          'max-width': styles.maxWidth,
          'width': styles.width,
          'height': styles.height,

          // Borders
          'border': styles.border,
          'border-width': styles.borderWidth,
          'border-style': styles.borderStyle,
          'border-color': styles.borderColor,
          'border-radius': styles.borderRadius,
          'outline': styles.outline,

          // Colors & Backgrounds
          'color': styles.color,
          'background': styles.background,
          'background-color': styles.backgroundColor,
          'background-image': styles.backgroundImage,

          // Effects
          'box-shadow': styles.boxShadow,
          'opacity': styles.opacity,
          'transform': styles.transform,

          // Transitions & Animations
          'transition': styles.transition,
          'transition-property': styles.transitionProperty,
          'transition-duration': styles.transitionDuration,
          'transition-timing-function': styles.transitionTimingFunction,
          'transition-delay': styles.transitionDelay,
          'animation': styles.animation,
          'animation-duration': styles.animationDuration,
          'animation-timing-function': styles.animationTimingFunction,

          // Misc
          'cursor': styles.cursor,
          'overflow': styles.overflow,
          'text-overflow': styles.textOverflow,
          'white-space': styles.whiteSpace
        }

        results.push({
          selector,
          element,
          styles: styleObj
        })
      }

          // BULLETPROOF: Extract buttons with limits
          document.querySelectorAll('button, [role="button"], .btn, .button, [type="button"], [type="submit"]').forEach((el, idx) => {
            if (idx >= 20 || processedElements >= maxElements) return // Limit to 20 buttons
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = `${el.tagName.toLowerCase()}${classes}`.substring(0, 100)
            extractStyles(el, selector, 'button')
          })

          // Extract inputs with limits
          document.querySelectorAll('input, textarea, select, .input, .form-control').forEach((el, idx) => {
            if (idx >= 15 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = `${el.tagName.toLowerCase()}${classes}`.substring(0, 100)
            extractStyles(el, selector, 'input')
          })

          // Extract cards with limits
          document.querySelectorAll('.card, .panel, .box, [class*="card"]').forEach((el, idx) => {
            if (idx >= 10 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = classes.substring(0, 100)
            extractStyles(el, selector, 'card')
          })

          // Extract badges with limits
          document.querySelectorAll('.badge, .tag, .chip, .label, [class*="badge"]').forEach((el, idx) => {
            if (idx >= 10 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = classes.substring(0, 100)
            extractStyles(el, selector, 'badge')
          })

          // Extract links with limits
          document.querySelectorAll('a[href], .link').forEach((el, idx) => {
            if (idx >= 15 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = `${el.tagName.toLowerCase()}${classes}`.substring(0, 100)
            extractStyles(el, selector, 'link')
          })

          // Extract headings with limits
          document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el, idx) => {
            if (idx >= 20 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = `${el.tagName.toLowerCase()}${classes}`.substring(0, 100)
            extractStyles(el, selector, 'heading')
          })

          // Extract alerts with limits
          document.querySelectorAll('.alert, .notification, .toast, .message, [role="alert"]').forEach((el, idx) => {
            if (idx >= 5 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = classes.substring(0, 100)
            extractStyles(el, selector, 'alert')
          })

          // Extract layout containers with limits
          document.querySelectorAll('.container, .wrapper, .content, main, [class*="container"]').forEach((el, idx) => {
            if (idx >= 5 || processedElements >= maxElements) return
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : ''
            const selector = `${el.tagName.toLowerCase()}${classes}`.substring(0, 100)
            extractStyles(el, selector, 'container')
          })

          return results
        }, MAX_DOM_ELEMENTS) // Pass max elements as parameter
      }, 8000) // 8s timeout for style extraction

      console.log(`[browser-wrapper] Extracted ${usedCss.length} CSS sources, ${Object.keys(customProperties).length} custom props, ${computedStylesData.length} computed styles (${resourcesUsed} resources)`)

      return {
        usedCss,
        customProperties,
        computedStyles: computedStylesData
      }
    } catch (error) {
      console.error('Browser extraction failed', error)
      return {
        usedCss: [],
        customProperties: {},
        computedStyles: []
      }
    } finally {
      // BULLETPROOF: Always cleanup resources
      try {
        await page?.close()
      } catch (error) {
        console.warn('Failed to close page:', error)
      }

      try {
        await browser?.close()
      } catch (error) {
        console.warn('Failed to close browser:', error)
      }
    }
  }, timeout)
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