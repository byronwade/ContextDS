import type { CssSource } from '@/lib/extractors/static-css'
import { extractWithBrowser } from './browser-wrapper'
import { createHash } from 'node:crypto'

export type ComputedCssOptions = {
  timeoutMs?: number
  useCoverageApi?: boolean
  extractCustomProps?: boolean
}

export async function collectComputedCss(url: string, options: ComputedCssOptions = {}): Promise<CssSource[]> {
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

    const sources: CssSource[] = [...extraction.usedCss]

    // Add custom properties as a CSS source
    if (Object.keys(extraction.customProperties).length > 0) {
      const customPropsCSS = `:root {\n${Object.entries(extraction.customProperties)
        .map(([prop, value]) => `  ${prop}: ${value};`)
        .join('\n')}\n}`

      sources.push(createComputedSource(customPropsCSS, 'computed'))
    }

    // Add component styles as a CSS source
    if (Object.keys(extraction.componentStyles).length > 0) {
      const componentCSS = Object.entries(extraction.componentStyles)
        .map(([selector, styles]) => {
          const rules = Object.entries(styles as Record<string, string>)
            .filter(([_, value]) => value && value !== 'none' && value !== '0px')
            .map(([prop, value]) => `  ${prop}: ${value};`)
            .join('\n')

          return `${selector} {\n${rules}\n}`
        })
        .join('\n\n')

      sources.push(createComputedSource(componentCSS, 'computed'))
    }

    return sources
  } catch (error) {
    console.warn('Computed CSS extraction failed', error)
    return []
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
