import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import type { CssSource } from '@/lib/extractors/static-css'

export type ComputedCssOptions = {
  timeoutMs?: number
}

export async function collectComputedCss(url: string, options: ComputedCssOptions = {}): Promise<CssSource[]> {
  const timeoutMs = options.timeoutMs ?? 15000
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

    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })

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
          // Ignore cross-origin stylesheets that cannot be read.
          console.warn('Skipping stylesheet due to access restrictions', error)
        }
      }

      return results
    })

    return computedSources
      .filter((source) => source.content.length > 0)
      .map((source) => createComputedSource(source.content))
  } catch (error) {
    console.warn('Computed CSS extraction failed', error)
    return []
  } finally {
    await page?.close().catch(() => undefined)
    await browser?.close().catch(() => undefined)
  }
}

function createComputedSource(content: string): CssSource {
  const normalized = content.trim()
  const sha = createHash('sha256').update(normalized).digest('hex')
  return {
    kind: 'computed',
    url: undefined,
    content: normalized,
    bytes: Buffer.byteLength(normalized, 'utf8'),
    sha
  }
}
