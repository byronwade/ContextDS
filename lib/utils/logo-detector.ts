/**
 * Logo Detection Utility
 * Extracts company logos from websites using multiple strategies:
 * 1. OpenGraph images (og:image)
 * 2. Favicons (rel="icon", rel="shortcut icon", rel="apple-touch-icon")
 * 3. Common logo selectors (header img, .logo, etc.)
 * 4. Schema.org organization logo
 */

import { chromium, type Browser } from 'playwright-core'
import chromiumPkg from '@sparticuz/chromium'

export interface LogoDetectionResult {
  logoUrl: string | null
  source: 'og-image' | 'favicon' | 'schema' | 'selector' | 'apple-touch-icon' | null
  width?: number
  height?: number
  alt?: string
}

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

/**
 * Detect and extract logo from a website
 */
export async function detectLogo(url: string): Promise<LogoDetectionResult> {
  let browser: Browser | null = null

  try {
    console.log(`[logo-detector] Detecting logo for ${url}`)

    // Launch browser
    if (isServerless) {
      const executablePath = await chromiumPkg.executablePath()
      browser = await chromium.launch({
        executablePath,
        headless: chromiumPkg.headless,
        args: [...chromiumPkg.args, '--no-sandbox', '--disable-setuid-sandbox'],
      })
    } else {
      browser = await chromium.launch({ headless: true })
    }

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

    // Strategy 1: Check for OpenGraph image (usually high-quality brand asset)
    const ogImage = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement
      return meta?.content || null
    })

    if (ogImage && isValidLogoUrl(ogImage)) {
      await browser.close()
      return {
        logoUrl: makeAbsoluteUrl(ogImage, url),
        source: 'og-image',
      }
    }

    // Strategy 2: Check for Apple Touch Icon (usually high-quality)
    const appleTouchIcon = await page.evaluate(() => {
      const link = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
      return link?.href || null
    })

    if (appleTouchIcon && isValidLogoUrl(appleTouchIcon)) {
      await browser.close()
      return {
        logoUrl: makeAbsoluteUrl(appleTouchIcon, url),
        source: 'apple-touch-icon',
      }
    }

    // Strategy 3: Check Schema.org organization logo
    const schemaLogo = await page.evaluate(() => {
      const schemaScript = document.querySelector('script[type="application/ld+json"]')
      if (!schemaScript?.textContent) return null

      try {
        const schema = JSON.parse(schemaScript.textContent)
        // Support both single schema and array of schemas
        const schemas = Array.isArray(schema) ? schema : [schema]

        for (const s of schemas) {
          if (s['@type'] === 'Organization' && s.logo) {
            return typeof s.logo === 'string' ? s.logo : s.logo.url
          }
        }
      } catch (e) {
        return null
      }
      return null
    })

    if (schemaLogo && isValidLogoUrl(schemaLogo)) {
      await browser.close()
      return {
        logoUrl: makeAbsoluteUrl(schemaLogo, url),
        source: 'schema',
      }
    }

    // Strategy 4: Check common logo selectors in header
    const selectorLogo = await page.evaluate(() => {
      const selectors = [
        'header img[class*="logo" i]',
        'header img[alt*="logo" i]',
        'header img[id*="logo" i]',
        '.logo img',
        '#logo img',
        '[class*="brand" i] img',
        'header a[href="/"] img',
        'nav img:first-of-type',
      ]

      for (const selector of selectors) {
        const img = document.querySelector(selector) as HTMLImageElement
        if (img?.src && img.width > 50 && img.height > 20) {
          return {
            src: img.src,
            width: img.width,
            height: img.height,
            alt: img.alt,
          }
        }
      }
      return null
    })

    if (selectorLogo?.src && isValidLogoUrl(selectorLogo.src)) {
      await browser.close()
      return {
        logoUrl: makeAbsoluteUrl(selectorLogo.src, url),
        source: 'selector',
        width: selectorLogo.width,
        height: selectorLogo.height,
        alt: selectorLogo.alt,
      }
    }

    // Strategy 5: Fallback to favicon (lowest quality but always present)
    const favicon = await page.evaluate(() => {
      const link = document.querySelector('link[rel*="icon"]') as HTMLLinkElement
      return link?.href || '/favicon.ico'
    })

    if (favicon) {
      await browser.close()
      return {
        logoUrl: makeAbsoluteUrl(favicon, url),
        source: 'favicon',
      }
    }

    await browser.close()
    return { logoUrl: null, source: null }

  } catch (error) {
    console.error('[logo-detector] Error detecting logo:', error)
    if (browser) await browser.close()
    return { logoUrl: null, source: null }
  }
}

/**
 * Validate logo URL to filter out data URLs, SVGs, and other non-image URLs
 */
function isValidLogoUrl(url: string): boolean {
  if (!url) return false

  // Reject data URLs
  if (url.startsWith('data:')) return false

  // Reject very short URLs
  if (url.length < 10) return false

  // Accept common image extensions
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']
  const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext))

  // If no extension, check if it looks like an image URL
  if (!hasValidExtension && !url.includes('/logo') && !url.includes('/brand')) {
    return false
  }

  return true
}

/**
 * Convert relative URL to absolute URL
 */
function makeAbsoluteUrl(logoUrl: string, baseUrl: string): string {
  try {
    // Already absolute
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl
    }

    // Protocol-relative URL
    if (logoUrl.startsWith('//')) {
      const baseProtocol = new URL(baseUrl).protocol
      return `${baseProtocol}${logoUrl}`
    }

    // Relative URL
    const base = new URL(baseUrl)
    const absolute = new URL(logoUrl, base.origin)
    return absolute.href
  } catch (e) {
    console.error('[logo-detector] Error making absolute URL:', e)
    return logoUrl
  }
}

/**
 * Download logo and convert to base64 for storage
 */
export async function downloadLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl)
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = response.headers.get('content-type') || 'image/png'

    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error('[logo-detector] Error downloading logo:', error)
    return null
  }
}
