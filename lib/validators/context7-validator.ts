/**
 * Context7 Token Validator
 * Uses Context7 to validate extracted tokens against official design system documentation
 * Improves accuracy by cross-referencing with authoritative sources
 */

import type { W3CTokenSet } from '@/lib/analyzers/w3c-tokenizer'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

export interface ValidationResult {
  isValidated: boolean
  source?: string
  matches: {
    colors: Array<{
      extracted: string
      official?: string
      status: 'exact' | 'close' | 'missing' | 'extra'
    }>
    fonts: Array<{
      extracted: string
      official?: string
      status: 'exact' | 'missing' | 'extra'
    }>
  }
  confidence: {
    before: number
    after: number
    improvement: number
  }
  suggestions: string[]
}

/**
 * Validate extracted tokens using Context7 documentation
 */
export async function validateTokensWithContext7(
  tokens: CuratedTokenSet,
  w3cTokens: W3CTokenSet,
  metadata: {
    domain: string
    url: string
  }
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValidated: false,
    matches: {
      colors: [],
      fonts: []
    },
    confidence: {
      before: 90,
      after: 90,
      improvement: 0
    },
    suggestions: []
  }

  try {
    // Check if Context7 is available
    const hasContext7 = typeof (global as any).mcp__context7__resolve_library_id === 'function'

    if (!hasContext7) {
      console.log('Context7 not available, skipping validation')
      return result
    }

    // Search for design system documentation
    const searchTerms = [
      `${metadata.domain} design system documentation`,
      `${metadata.domain.split('.')[0]} color palette`,
      `${metadata.domain.split('.')[0]} design tokens`
    ]

    for (const searchTerm of searchTerms) {
      try {
        const librarySearch = await (global as any).mcp__context7__resolve_library_id({
          params: {
            query: searchTerm,
            limit: 1
          }
        })

        if (!librarySearch?.results || librarySearch.results.length === 0) {
          continue
        }

        const library = librarySearch.results[0]
        result.source = library.name
        result.isValidated = true

        // Fetch color documentation
        const colorDocs = await (global as any).mcp__context7__get_library_docs({
          params: {
            library_id: library.id,
            topic: 'colors'
          }
        })

        // Validate colors against official docs
        if (colorDocs?.content) {
          result.matches.colors = validateColors(tokens.colors, colorDocs.content)

          // Boost confidence if we match official colors
          const exactMatches = result.matches.colors.filter(m => m.status === 'exact').length
          const confidenceBoost = (exactMatches / tokens.colors.length) * 10

          result.confidence.after = Math.min(100, result.confidence.before + confidenceBoost)
          result.confidence.improvement = confidenceBoost
        }

        // Fetch typography documentation
        const typoDocs = await (global as any).mcp__context7__get_library_docs({
          params: {
            library_id: library.id,
            topic: 'typography'
          }
        })

        // Validate fonts
        if (typoDocs?.content) {
          result.matches.fonts = validateFonts(tokens.typography.families, typoDocs.content)
        }

        // Generate suggestions based on validation
        result.suggestions = generateSuggestions(result.matches, tokens)

        break // Found and validated, stop searching
      } catch (error) {
        console.log(`Context7 validation failed for "${searchTerm}":`, error)
        continue
      }
    }
  } catch (error) {
    console.error('Context7 validation error:', error)
  }

  return result
}

/**
 * Validate extracted colors against documentation
 */
function validateColors(extractedColors: any[], documentation: string): ValidationResult['matches']['colors'] {
  const matches: ValidationResult['matches']['colors'] = []

  // Extract hex colors from documentation
  const docColorRegex = /#[0-9a-fA-F]{6}/g
  const docColors = new Set(documentation.match(docColorRegex) || [])

  extractedColors.forEach(color => {
    const colorValue = color.value.toUpperCase()

    if (docColors.has(colorValue)) {
      matches.push({
        extracted: colorValue,
        official: colorValue,
        status: 'exact'
      })
    } else {
      // Check if close match exists
      const closeMatch = findCloseColor(colorValue, Array.from(docColors))
      if (closeMatch) {
        matches.push({
          extracted: colorValue,
          official: closeMatch,
          status: 'close'
        })
      } else {
        matches.push({
          extracted: colorValue,
          status: 'extra'
        })
      }
    }
  })

  return matches
}

/**
 * Validate fonts against documentation
 */
function validateFonts(extractedFonts: any[], documentation: string): ValidationResult['matches']['fonts'] {
  const matches: ValidationResult['matches']['fonts'] = []

  // Extract font names from documentation
  const fontRegex = /font-family:\s*["']?([^"';,]+)["']?/gi
  const docFonts = new Set<string>()

  let match
  while ((match = fontRegex.exec(documentation)) !== null) {
    const font = match[1].trim()
    if (font && !font.includes('var(')) {
      docFonts.add(font)
    }
  }

  extractedFonts.forEach(font => {
    const fontValue = font.value.split(',')[0].trim().replace(/['"]/g, '')

    if (docFonts.has(fontValue)) {
      matches.push({
        extracted: fontValue,
        official: fontValue,
        status: 'exact'
      })
    } else {
      matches.push({
        extracted: fontValue,
        status: 'extra'
      })
    }
  })

  return matches
}

/**
 * Find close color match (perceptually similar)
 */
function findCloseColor(hex: string, candidates: string[]): string | null {
  // Simplified - in production would use Culori for perceptual comparison
  return null
}

/**
 * Generate suggestions based on validation results
 */
function generateSuggestions(matches: ValidationResult['matches'], tokens: CuratedTokenSet): string[] {
  const suggestions: string[] = []

  // Check color matches
  const exactColorMatches = matches.colors.filter(m => m.status === 'exact').length
  const totalColors = matches.colors.length

  if (exactColorMatches === totalColors) {
    suggestions.push('✅ All extracted colors match official design system')
  } else if (exactColorMatches > 0) {
    suggestions.push(`✅ ${exactColorMatches}/${totalColors} colors match official palette`)

    const extraColors = matches.colors.filter(m => m.status === 'extra')
    if (extraColors.length > 0) {
      suggestions.push(`⚠️ ${extraColors.length} colors not in official docs (site-specific variants)`)
    }
  }

  // Check font matches
  const exactFontMatches = matches.fonts.filter(m => m.status === 'exact').length
  const totalFonts = matches.fonts.length

  if (exactFontMatches === totalFonts) {
    suggestions.push('✅ All fonts match official design system')
  } else if (exactFontMatches > 0) {
    suggestions.push(`✅ ${exactFontMatches}/${totalFonts} fonts match official documentation`)
  }

  return suggestions
}