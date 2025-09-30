import type { CssSource } from '@/lib/extractors/static-css'
import { extractWithBrowser } from './browser-wrapper'
import { createHash } from 'node:crypto'
import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'

import type { ComputedStyleEntry } from './browser-wrapper'

export type ComputedCssOptions = {
  timeoutMs?: number
  useCoverageApi?: boolean
  extractCustomProps?: boolean
}

export type ComputedCssResult = {
  sources: CssSource[]
  computedStyles: ComputedStyleEntry[]
}

export async function collectComputedCss(url: string, options: ComputedCssOptions = {}): Promise<ComputedCssResult> {
  const timeoutMs = options.timeoutMs ?? 15000
  const useCoverageApi = options.useCoverageApi ?? true
  const extractCustomProps = options.extractCustomProps ?? true

  try {
    // Use universal browser wrapper (works on Vercel and locally)
    const extraction = await extractWithBrowser(url, {
      useCoverage: useCoverageApi,
      extractCustomProps,
      timeout: timeoutMs
    })

    const sources: CssSource[] = extraction.usedCss.filter((source) => isParsableCss(source.content))

    // Add custom properties as a CSS source
    if (Object.keys(extraction.customProperties).length > 0) {
      const customPropsCSS = `:root {\n${Object.entries(extraction.customProperties)
        .map(([prop, value]) => `  ${prop}: ${value};`)
        .join('\n')}\n}`

      sources.push(createComputedSource(customPropsCSS, 'computed'))
    }

    // Add computed styles as CSS sources
    if (extraction.computedStyles && extraction.computedStyles.length > 0) {
      const componentCSS = extraction.computedStyles
        .map(entry => {
          const rules = Object.entries(entry.styles)
            .filter(([_, value]) => value && value !== 'none' && value !== '0px' && value !== 'auto' && value !== 'normal')
            .map(([prop, value]) => `  ${prop}: ${value};`)
            .join('\n')

          if (!rules) return null
          return `${entry.selector} {\n${rules}\n}`
        })
        .filter(Boolean)
        .join('\n\n')

      if (componentCSS.trim().length > 0) {
        sources.push(createComputedSource(componentCSS, 'computed'))
      }
    }

    return {
      sources,
      computedStyles: extraction.computedStyles
    }
  } catch (error) {
    console.warn('Computed CSS extraction failed', error)
    return {
      sources: [],
      computedStyles: []
    }
  }
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
