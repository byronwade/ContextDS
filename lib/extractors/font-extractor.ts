/**
 * Font Extractor - Extracts @font-face rules and font URLs from CSS
 */

import postcss from 'postcss'

export interface FontFaceRule {
  fontFamily: string
  src: string[]
  fontWeight?: string
  fontStyle?: string
  fontDisplay?: string
}

export function extractFontFaceRules(cssContent: string): FontFaceRule[] {
  const rules: FontFaceRule[] = []

  try {
    const root = postcss.parse(cssContent)

    root.walkAtRules('font-face', (rule) => {
      const fontFace: Partial<FontFaceRule> = {
        src: []
      }

      rule.walkDecls((decl) => {
        const prop = decl.prop.toLowerCase()
        const value = decl.value

        if (prop === 'font-family') {
          fontFace.fontFamily = value.replace(/['"]/g, '')
        } else if (prop === 'src') {
          // Extract all URLs from src
          const urls = value.match(/url\([^)]+\)/g) || []
          fontFace.src = urls.map(url =>
            url.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1')
          )
        } else if (prop === 'font-weight') {
          fontFace.fontWeight = value
        } else if (prop === 'font-style') {
          fontFace.fontStyle = value
        } else if (prop === 'font-display') {
          fontFace.fontDisplay = value
        }
      })

      if (fontFace.fontFamily && fontFace.src && fontFace.src.length > 0) {
        rules.push(fontFace as FontFaceRule)
      }
    })
  } catch (error) {
    console.warn('Failed to extract @font-face rules:', error)
  }

  return rules
}

/**
 * Generate CSS for font preview injection
 */
export function generateFontFaceCSS(fontFaces: FontFaceRule[], baseUrl?: string): string {
  return fontFaces
    .map((fontFace) => {
      const src = fontFace.src
        .map((url) => {
          // Convert relative URLs to absolute if baseUrl provided
          const absoluteUrl = baseUrl && !url.startsWith('http')
            ? new URL(url, baseUrl).toString()
            : url

          // Detect format from URL
          let format = 'woff2'
          if (url.includes('.woff2')) format = 'woff2'
          else if (url.includes('.woff')) format = 'woff'
          else if (url.includes('.ttf')) format = 'truetype'
          else if (url.includes('.otf')) format = 'opentype'

          return `url('${absoluteUrl}') format('${format}')`
        })
        .join(', ')

      return `
@font-face {
  font-family: '${fontFace.fontFamily}';
  src: ${src};
  ${fontFace.fontWeight ? `font-weight: ${fontFace.fontWeight};` : ''}
  ${fontFace.fontStyle ? `font-style: ${fontFace.fontStyle};` : ''}
  ${fontFace.fontDisplay ? `font-display: ${fontFace.fontDisplay};` : 'font-display: swap;'}
}`.trim()
    })
    .join('\n\n')
}