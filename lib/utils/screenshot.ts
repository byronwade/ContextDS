import { chromium, type Browser, type Page } from 'playwright-core'
import chromiumPkg from '@sparticuz/chromium'

export interface ScreenshotOptions {
  url: string
  viewport?: {
    width: number
    height: number
  }
  fullPage?: boolean
  selector?: string // Capture specific component
  waitForSelector?: string
  waitForTimeout?: number
  quality?: number
}

export interface ScreenshotResult {
  buffer: Buffer
  width: number
  height: number
  viewport: { width: number; height: number }
}

const DEFAULT_VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
}

// Determine if running in serverless environment (Vercel)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  // In serverless, don't reuse browser instances due to cold starts
  // Always create fresh browser for each invocation
  if (isServerless) {
    console.log('[screenshot] Running in serverless mode, launching fresh browser')

    // Use @sparticuz/chromium for serverless environments
    const executablePath = await chromiumPkg.executablePath()

    return await chromium.launch({
      executablePath,
      headless: chromiumPkg.headless,
      args: [
        ...chromiumPkg.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Critical for serverless
        '--disable-gpu',
      ],
    })
  }

  // In non-serverless (local dev), reuse browser instance
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('[screenshot] Running in local mode, launching persistent browser')
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    })
  }
  return browserInstance
}

export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  const {
    url,
    viewport = DEFAULT_VIEWPORTS.desktop,
    fullPage = false,
    selector,
    waitForSelector,
    waitForTimeout = 3000,
    quality = 90,
  } = options

  let page: Page | null = null
  let browser: Browser | null = null

  try {
    browser = await getBrowser()
    page = await browser.newPage({
      viewport,
      deviceScaleFactor: 2, // Retina quality
    })

    // Set timeout
    page.setDefaultTimeout(30000)

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 })
    }

    // Additional wait for animations/fonts
    await page.waitForTimeout(waitForTimeout)

    // Capture screenshot
    let buffer: Buffer

    if (selector) {
      // Capture specific component
      const element = await page.$(selector)
      if (!element) {
        throw new Error(`Selector not found: ${selector}`)
      }
      buffer = (await element.screenshot({
        type: 'jpeg',
        quality,
      })) as Buffer
    } else {
      // Capture full page or viewport
      buffer = (await page.screenshot({
        type: 'jpeg',
        quality,
        fullPage,
      })) as Buffer
    }

    return {
      buffer,
      width: viewport.width,
      height: viewport.height,
      viewport,
    }
  } catch (error) {
    console.error('[screenshot] Capture failed:', error)
    throw error
  } finally {
    if (page) {
      await page.close()
    }
    // In serverless, always close browser to free memory
    // In local dev, keep browser instance alive for reuse
    if (isServerless && browser) {
      await browser.close()
      console.log('[screenshot] Browser closed (serverless mode)')
    }
  }
}

export async function captureMultiViewport(
  url: string,
  options?: Partial<ScreenshotOptions>
): Promise<{
  mobile: ScreenshotResult
  tablet: ScreenshotResult
  desktop: ScreenshotResult
}> {
  const [mobile, tablet, desktop] = await Promise.all([
    captureScreenshot({
      url,
      viewport: DEFAULT_VIEWPORTS.mobile,
      ...options,
    }),
    captureScreenshot({
      url,
      viewport: DEFAULT_VIEWPORTS.tablet,
      ...options,
    }),
    captureScreenshot({
      url,
      viewport: DEFAULT_VIEWPORTS.desktop,
      ...options,
    }),
  ])

  return { mobile, tablet, desktop }
}

export async function captureComponents(
  url: string,
  selectors: string[],
  viewport = DEFAULT_VIEWPORTS.desktop
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>()

  for (const selector of selectors) {
    try {
      const result = await captureScreenshot({
        url,
        viewport,
        selector,
      })
      results.set(selector, result.buffer)
    } catch (error) {
      console.error(`Failed to capture ${selector}:`, error)
    }
  }

  return results
}

// Cleanup browser on process exit
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

process.on('exit', () => {
  if (browserInstance) {
    browserInstance.close()
  }
})