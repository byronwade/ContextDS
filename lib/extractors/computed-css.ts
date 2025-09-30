import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import type { CssSource } from '@/lib/extractors/static-css'

export type ComputedCssOptions = {
  timeoutMs?: number
  useCoverageApi?: boolean
  extractCustomProps?: boolean
}

export async function collectComputedCss(url: string, options: ComputedCssOptions = {}): Promise<CssSource[]> {
  const timeoutMs = options.timeoutMs ?? 15000
  const useCoverageApi = options.useCoverageApi ?? true
  const extractCustomProps = options.extractCustomProps ?? true

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    browser = await chromium.launch({
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
      headless: true
    })

    page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    })

    // Start CSS coverage tracking if enabled
    if (useCoverageApi) {
      await page.coverage.startCSSCoverage({ resetOnNavigation: false })
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })

    // Interact with page to trigger hover/focus states
    try {
      await page.hover('button').catch(() => {})
      await page.hover('a').catch(() => {})
      await page.click('input').catch(() => {})
    } catch {
      // Ignore interaction errors
    }

    const sources: CssSource[] = []

    // Method 1: Use Coverage API to get ONLY used CSS
    if (useCoverageApi) {
      const coverage = await page.coverage.stopCSSCoverage()

      coverage.forEach((entry) => {
        if (entry.ranges.length === 0) return

        // Extract only the used CSS ranges
        const usedCss = entry.ranges
          .map(range => entry.text.slice(range.start, range.end))
          .join('\n')

        if (usedCss.trim().length > 0) {
          const usagePercentage = entry.ranges.reduce((sum, r) => sum + (r.end - r.start), 0) / entry.text.length
          sources.push(createComputedSource(usedCss, `coverage-used-${usagePercentage.toFixed(2)}`))
        }
      })
    } else {
      // Fallback: Extract all stylesheets (old method)
      const computedSources = await page.evaluate(() => {
        const results: Array<{ kind: 'computed'; content: string }> = []
        const sheets = Array.from(document.styleSheets)

        for (const sheet of sheets) {
          try {
            const rules = sheet.cssRules
            const content = Array.from(rules)
              .map((rule) => rule.cssText)
              .join('\n')
              .trim()
            if (content.length > 0) {
              results.push({ kind: 'computed', content })
            }
          } catch (error) {
            // Ignore cross-origin stylesheets
          }
        }

        return results
      })

      computedSources.forEach(source => {
        if (source.content.length > 0) {
          sources.push(createComputedSource(source.content))
        }
      })
    }

    // Method 2: Extract CSS custom properties from :root
    if (extractCustomProps) {
      const customProperties = await page.evaluate(() => {
        const root = document.documentElement
        const styles = window.getComputedStyle(root)
        const props: string[] = []

        // Extract all custom properties
        for (let i = 0; i < styles.length; i++) {
          const prop = styles[i]
          if (prop.startsWith('--')) {
            const value = styles.getPropertyValue(prop).trim()
            if (value) {
              props.push(`${prop}: ${value};`)
            }
          }
        }

        return props
      })

      if (customProperties.length > 0) {
        const customPropsCSS = `:root {\n  ${customProperties.join('\n  ')}\n}`
        sources.push(createComputedSource(customPropsCSS, 'custom-properties'))
      }
    }

    // Method 3: Extract computed styles from key components
    const componentStyles = await page.evaluate(() => {
      const keySelectors = [
        'button', 'a', 'h1', 'h2', 'h3', 'p', 'input', 'select', 'textarea',
        '.btn', '.button', '.card', '.nav', '.header', '.footer', '.container',
        '[class*="primary"]', '[class*="secondary"]', '[class*="accent"]'
      ]

      const rules: string[] = []

      keySelectors.forEach(selector => {
        const el = document.querySelector(selector)
        if (!el) return

        const styles = window.getComputedStyle(el)
        const important: string[] = []

        // Extract only design-token-relevant properties
        const props = [
          'color', 'background-color', 'border-color',
          'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
          'padding', 'margin', 'gap',
          'border-radius', 'box-shadow',
          'transition-duration', 'animation-duration'
        ]

        props.forEach(prop => {
          const value = styles.getPropertyValue(prop)
          if (value && value !== 'none' && value !== '0px' && value !== 'auto') {
            important.push(`  ${prop}: ${value};`)
          }
        })

        if (important.length > 0) {
          rules.push(`${selector} {\n${important.join('\n')}\n}`)
        }
      })

      return rules.join('\n\n')
    })

    if (componentStyles.trim().length > 0) {
      sources.push(createComputedSource(componentStyles, 'component-computed'))
    }

    return sources
  } catch (error) {
    console.warn('Computed CSS extraction failed', error)
    return []
  } finally {
    await page?.close().catch(() => undefined)
    await browser?.close().catch(() => undefined)
  }
}

function createComputedSource(content: string, kind: string = 'computed'): CssSource {
  const normalized = content.trim()
  const sha = createHash('sha256').update(normalized).digest('hex')
  return {
    kind: kind as 'computed',
    url: undefined,
    content: normalized,
    bytes: Buffer.byteLength(normalized, 'utf8'),
    sha
  }
}
