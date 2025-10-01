import type { CssSource } from '@/lib/extractors/static-css'
import { extractWithBrowser } from './browser-wrapper'
import { createHash } from 'node:crypto'
import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import { withTimeout, createMemoryLimit } from '@/lib/utils/resilience'

import type { ComputedStyleEntry } from './browser-wrapper'

export type ComputedCssOptions = {
  timeoutMs?: number
  useCoverageApi?: boolean
  extractCustomProps?: boolean
  maxMemoryMb?: number
  fastMode?: boolean
}

// BULLETPROOF LIMITS for computed CSS
const MAX_COMPUTED_CSS_SIZE = 5 * 1024 * 1024 // 5MB max computed CSS
const MAX_COMPUTED_STYLES = 1000 // Max computed style entries
const COMPUTED_CSS_TIMEOUT = 25000 // 25s timeout (more than static)
const FAST_MODE_TIMEOUT = 10000 // 10s timeout in fast mode

export type ComputedCssResult = {
  sources: CssSource[]
  computedStyles: ComputedStyleEntry[]
}

export async function collectComputedCss(url: string, options: ComputedCssOptions = {}): Promise<ComputedCssResult> {
  const timeoutMs = options.timeoutMs ?? (options.fastMode ? FAST_MODE_TIMEOUT : COMPUTED_CSS_TIMEOUT)
  const useCoverageApi = options.useCoverageApi ?? true
  const extractCustomProps = options.extractCustomProps ?? true
  const maxMemoryBytes = (options.maxMemoryMb ?? 20) * 1024 * 1024 // Default 20MB

  // BULLETPROOF: Wrap with timeout and memory limits
  return withTimeout(async () => {
    const memoryLimit = createMemoryLimit(maxMemoryBytes)
    let totalProcessed = 0

    try {
      // Use universal browser wrapper (works on Vercel and locally)
      const extraction = await extractWithBrowser(url, {
        useCoverage: useCoverageApi,
        extractCustomProps,
        timeout: timeoutMs
      })

      // BULLETPROOF: Filter and limit CSS sources
      const filteredCss = extraction.usedCss
        .filter((source) => {
          // Size check
          if (source.bytes > MAX_COMPUTED_CSS_SIZE / 10) {
            console.warn(`Skipping large computed CSS source: ${source.bytes} bytes`)
            return false
          }
          return isParsableCss(source.content)
        })
        .slice(0, 50) // Limit number of CSS sources

      const sources: CssSource[] = []
      let totalBytes = 0

      // Process filtered CSS sources with memory tracking
      for (const source of filteredCss) {
        if (totalBytes + source.bytes > MAX_COMPUTED_CSS_SIZE) {
          console.warn(`Computed CSS size limit reached, stopping at ${totalBytes} bytes`)
          break
        }

        sources.push(source)
        totalBytes += source.bytes
        memoryLimit.track(source.bytes)
        totalProcessed++
      }

      // Add custom properties as a CSS source (with limits)
      const customProps = extraction.customProperties
      if (Object.keys(customProps).length > 0) {
        // Limit custom properties to prevent massive CSS
        const limitedProps = Object.fromEntries(
          Object.entries(customProps).slice(0, 100) // Max 100 custom props
        )

        const customPropsCSS = `:root {\n${Object.entries(limitedProps)
          .map(([prop, value]) => `  ${prop}: ${value};`)
          .join('\n')}\n}`

        const propSource = createComputedSource(customPropsCSS, 'computed')
        if (totalBytes + propSource.bytes <= MAX_COMPUTED_CSS_SIZE) {
          sources.push(propSource)
          totalBytes += propSource.bytes
          memoryLimit.track(propSource.bytes)
        }
      }

      // BULLETPROOF: Add computed styles as CSS sources with limits
      if (extraction.computedStyles && extraction.computedStyles.length > 0) {
        // Limit number of computed styles to prevent memory exhaustion
        const limitedStyles = extraction.computedStyles.slice(0, MAX_COMPUTED_STYLES)

        if (extraction.computedStyles.length > MAX_COMPUTED_STYLES) {
          console.warn(`Too many computed styles (${extraction.computedStyles.length}), processing only first ${MAX_COMPUTED_STYLES}`)
        }

        const componentCSS = limitedStyles
          .map(entry => {
            const rules = Object.entries(entry.styles)
              .filter(([_, value]) => value && value !== 'none' && value !== '0px' && value !== 'auto' && value !== 'normal')
              .slice(0, 50) // Limit rules per component to prevent massive CSS
              .map(([prop, value]) => `  ${prop}: ${value};`)
              .join('\n')

            if (!rules) return null
            return `${entry.selector} {\n${rules}\n}`
          })
          .filter(Boolean)
          .join('\n\n')

        if (componentCSS.trim().length > 0) {
          const componentSource = createComputedSource(componentCSS, 'computed')
          if (totalBytes + componentSource.bytes <= MAX_COMPUTED_CSS_SIZE) {
            sources.push(componentSource)
            totalBytes += componentSource.bytes
            memoryLimit.track(componentSource.bytes)
          } else {
            console.warn(`Component CSS too large, skipping: ${componentSource.bytes} bytes`)
          }
        }
      }

      console.log(`[computed-css] Collected ${sources.length} computed CSS sources (${totalBytes} bytes, ${totalProcessed} processed)`)

      return {
        sources,
        computedStyles: extraction.computedStyles?.slice(0, MAX_COMPUTED_STYLES) || []
      }
    } catch (error) {
      console.warn('Computed CSS extraction failed', error)
      return {
        sources: [],
        computedStyles: []
      }
    }
  }, timeoutMs)
}

function createComputedSource(content: string, kind: 'inline' | 'link' | 'computed' = 'computed'): CssSource {
  const normalized = content.trim()
  const sha = createHash('sha256').update(normalized).digest('hex')
  return {
    kind,
    url: undefined,
    content: normalized,
    bytes: Buffer.byteLength(normalized, 'utf8'),
    sha
  }
}

function isParsableCss(content: string): boolean {
  if (!content) return false
  try {
    postcss.parse(content, { parser: safeParser })
    return true
  } catch (error) {
    console.warn('Skipping unparsable computed CSS fragment:', error instanceof Error ? error.message : error)
    return false
  }
}

function toKebabCase(property: string): string {
  const kebab = property
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()

  if (/^-(webkit|moz|ms|o)-/.test(kebab)) {
    return kebab
  }

  return kebab.startsWith('-') ? kebab.slice(1) : kebab
}
