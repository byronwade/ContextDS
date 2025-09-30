/**
 * Context7-Enhanced AI Insights
 * Uses Context7 MCP to fetch official design system documentation
 * Enhances extraction accuracy and AI analysis with authoritative sources
 */

import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

// Configure AI Gateway
const openai = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_GATEWAY_API_KEY ? 'https://gateway.ai.cloudflare.com/v1/contextds/openai' : undefined
})

export interface EnhancedDesignInsights {
  summary: string
  officialDocs?: {
    found: boolean
    source: string
    version?: string
    colorSystem?: string
    typographySystem?: string
  }
  validation: {
    matchesOfficialDocs: boolean
    discrepancies: string[]
    suggestions: string[]
  }
  colorPalette: {
    style: string
    mood: string
    accessibility: string
    officialPaletteDetected?: boolean
    recommendations: string[]
  }
  typography: {
    style: string
    hierarchy: string
    readability: string
    officialFontsDetected?: string[]
    recommendations: string[]
  }
  overall: {
    maturity: 'prototype' | 'developing' | 'mature' | 'systematic'
    consistency: number
    aiRecommendations: string[]
  }
}

/**
 * Generate insights enhanced with Context7 design system documentation
 */
export async function generateContext7EnhancedInsights(
  curatedTokens: CuratedTokenSet,
  metadata: {
    domain: string
    url: string
  }
): Promise<EnhancedDesignInsights> {
  // Try to find official design system documentation using Context7
  let officialDocs = null

  try {
    // Check if Context7 MCP tools are available
    if (typeof (global as any).mcp__context7__resolve_library_id === 'function') {
      // Search for design system documentation
      const searchQueries = [
        `${metadata.domain} design system`,
        `${metadata.domain.split('.')[0]} design tokens`,
        `${metadata.domain.split('.')[0]} UI kit`
      ]

      for (const query of searchQueries) {
        try {
          const libraryId = await (global as any).mcp__context7__resolve_library_id({
            params: {
              query,
              limit: 1
            }
          })

          if (libraryId && libraryId.results && libraryId.results.length > 0) {
            const libId = libraryId.results[0].id

            // Fetch color documentation
            const colorDocs = await (global as any).mcp__context7__get_library_docs({
              params: {
                library_id: libId,
                topic: 'colors'
              }
            })

            // Fetch typography documentation
            const typoDocs = await (global as any).mcp__context7__get_library_docs({
              params: {
                library_id: libId,
                topic: 'typography'
              }
            })

            officialDocs = {
              found: true,
              source: libraryId.results[0].name || query,
              colorSystem: colorDocs?.content || null,
              typographySystem: typoDocs?.content || null,
              version: libraryId.results[0].version
            }

            break // Found documentation, stop searching
          }
        } catch (error) {
          console.log(`Context7 search failed for "${query}":`, error)
          // Continue to next query
        }
      }
    }
  } catch (error) {
    console.warn('Context7 documentation lookup failed:', error)
    // Continue without official docs
  }

  // Build enhanced prompt with official documentation context
  const prompt = buildEnhancedPrompt(curatedTokens, metadata, officialDocs)

  try {
    // Use AI with enhanced context
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
      maxTokens: 1500  // More tokens for enhanced analysis
    })

    return parseEnhancedInsights(text, curatedTokens, officialDocs)
  } catch (error) {
    console.error('Enhanced AI insights generation failed', error)
    // Fallback to basic insights
    return generateBasicInsights(curatedTokens, metadata, officialDocs)
  }
}

/**
 * Build enhanced prompt with Context7 documentation
 */
function buildEnhancedPrompt(
  tokens: CuratedTokenSet,
  metadata: { domain: string },
  officialDocs: any
): string {
  const colorCount = tokens.colors.length
  const fontCount = tokens.typography.families.length

  const colorSummary = tokens.colors.slice(0, 5).map(c =>
    `${c.value} (${c.semantic}, ${c.usage} uses)`
  ).join(', ')

  const fontSummary = tokens.typography.families.map(f =>
    `${f.value} (${f.percentage}% usage)`
  ).join(', ')

  let prompt = `Analyze design system from ${metadata.domain}:\n\n`

  // Add extracted tokens
  prompt += `EXTRACTED TOKENS:\n`
  prompt += `Colors (${colorCount}): ${colorSummary}\n`
  prompt += `Fonts (${fontCount}): ${fontSummary}\n`
  prompt += `Spacing: ${tokens.spacing.length} values\n`
  prompt += `Radius: ${tokens.radius.length} values\n`
  prompt += `Shadows: ${tokens.shadows.length} values\n\n`

  // Add official documentation context if available
  if (officialDocs?.found) {
    prompt += `OFFICIAL DESIGN SYSTEM DOCUMENTATION FOUND:\n`
    prompt += `Source: ${officialDocs.source}\n\n`

    if (officialDocs.colorSystem) {
      prompt += `Official Color System:\n${officialDocs.colorSystem.slice(0, 500)}\n\n`
    }

    if (officialDocs.typographySystem) {
      prompt += `Official Typography:\n${officialDocs.typographySystem.slice(0, 500)}\n\n`
    }

    prompt += `VALIDATION TASK:\n`
    prompt += `Compare extracted tokens with official documentation.\n`
    prompt += `Identify:\n`
    prompt += `1. Tokens that match official docs (validation)\n`
    prompt += `2. Missing official tokens (gaps in extraction)\n`
    prompt += `3. Extra tokens not in docs (site-specific)\n`
    prompt += `4. Discrepancies (different values)\n\n`
  }

  prompt += `Provide analysis:\n`
  prompt += `STYLE: [minimalist/modern/bold/playful]\n`
  prompt += `MOOD: [professional/friendly/luxurious/energetic]\n`
  prompt += `MATURITY: [prototype/developing/mature/systematic]\n`
  prompt += `CONSISTENCY: [0-100]\n`
  if (officialDocs?.found) {
    prompt += `MATCHES_OFFICIAL: [yes/partial/no]\n`
    prompt += `DISCREPANCIES: [list any differences from official docs]\n`
  }
  prompt += `RECOMMENDATIONS: [3-5 specific improvements]\n`

  return prompt
}

/**
 * Parse enhanced AI response
 */
function parseEnhancedInsights(
  aiResponse: string,
  tokens: CuratedTokenSet,
  officialDocs: any
): EnhancedDesignInsights {
  const lines = aiResponse.split('\n').filter(l => l.trim())

  const style = extractField(lines, 'STYLE') || 'modern'
  const mood = extractField(lines, 'MOOD') || 'professional'
  const maturity = extractField(lines, 'MATURITY')?.toLowerCase() as any || 'developing'
  const consistency = parseInt(extractField(lines, 'CONSISTENCY') || '75')
  const matchesOfficial = extractField(lines, 'MATCHES_OFFICIAL')?.toLowerCase() || 'unknown'

  const discrepancies = lines
    .filter(l => l.includes('DISCREPANCIES') || l.includes('DIFFERENCE'))
    .map(l => l.split(':')[1]?.trim())
    .filter(Boolean)

  const recommendations = lines
    .filter(l => l.includes('RECOMMENDATION') && l.includes(':'))
    .map(l => l.split(':')[1]?.trim())
    .filter(Boolean)

  return {
    summary: `${style.charAt(0).toUpperCase() + style.slice(1)} ${mood} design system${officialDocs?.found ? ' (validated against official docs)' : ''}`,
    officialDocs: officialDocs?.found ? {
      found: true,
      source: officialDocs.source,
      version: officialDocs.version,
      colorSystem: officialDocs.colorSystem ? 'Found' : 'Not found',
      typographySystem: officialDocs.typographySystem ? 'Found' : 'Not found'
    } : undefined,
    validation: {
      matchesOfficialDocs: matchesOfficial === 'yes',
      discrepancies,
      suggestions: recommendations.slice(0, 3)
    },
    colorPalette: {
      style,
      mood,
      accessibility: determineAccessibility(tokens.colors),
      officialPaletteDetected: officialDocs?.colorSystem ? true : false,
      recommendations: recommendations.filter(r => r.toLowerCase().includes('color')).slice(0, 3)
    },
    typography: {
      style: determineTypographyStyle(tokens.typography),
      hierarchy: determineHierarchy(tokens.typography),
      readability: 'Good',
      officialFontsDetected: officialDocs?.typographySystem ? extractFontsFromDocs(officialDocs.typographySystem) : undefined,
      recommendations: recommendations.filter(r => r.toLowerCase().includes('font') || r.toLowerCase().includes('type')).slice(0, 2)
    },
    overall: {
      maturity,
      consistency,
      aiRecommendations: recommendations.slice(0, 5)
    }
  }
}

/**
 * Fallback basic insights
 */
function generateBasicInsights(
  tokens: CuratedTokenSet,
  metadata: { domain: string },
  officialDocs: any
): EnhancedDesignInsights {
  return {
    summary: `Design system analysis for ${metadata.domain}`,
    officialDocs: officialDocs?.found ? {
      found: true,
      source: officialDocs.source,
      colorSystem: officialDocs.colorSystem ? 'Found' : undefined,
      typographySystem: officialDocs.typographySystem ? 'Found' : undefined
    } : undefined,
    validation: {
      matchesOfficialDocs: false,
      discrepancies: [],
      suggestions: []
    },
    colorPalette: {
      style: 'modern',
      mood: 'professional',
      accessibility: 'Good',
      recommendations: []
    },
    typography: {
      style: 'Sans-serif',
      hierarchy: 'Good',
      readability: 'Good',
      recommendations: []
    },
    overall: {
      maturity: tokens.colors.length >= 8 ? 'systematic' : 'developing',
      consistency: 80,
      aiRecommendations: []
    }
  }
}

// Helper functions
function extractField(lines: string[], fieldName: string): string | null {
  const line = lines.find(l => l.trim().startsWith(fieldName + ':'))
  return line ? line.split(':')[1]?.trim() : null
}

function extractFontsFromDocs(docs: string): string[] {
  // Extract font names from documentation
  const fontRegex = /font-family:\s*([^;]+)/gi
  const matches = docs.matchAll(fontRegex)
  const fonts = new Set<string>()

  for (const match of matches) {
    const font = match[1].trim().split(',')[0].replace(/['"]/g, '')
    if (font) fonts.add(font)
  }

  return Array.from(fonts)
}

function determineAccessibility(colors: any[]): string {
  return colors.length >= 6 ? 'Good contrast coverage' : 'May need more contrast variations'
}

function determineTypographyStyle(typography: any): string {
  const hasSerif = typography.families.some((f: any) => f.semantic?.includes('Serif'))
  const hasMono = typography.families.some((f: any) => f.semantic?.includes('Monospace'))

  if (hasSerif && hasMono) return 'Hybrid (Sans + Serif + Mono)'
  if (hasSerif) return 'Classic (Sans + Serif)'
  if (hasMono) return 'Technical (Sans + Mono)'
  return 'Modern (Sans-serif)'
}

function determineHierarchy(typography: any): string {
  const sizeCount = typography.sizes?.length || 0
  if (sizeCount >= 6) return 'Well-defined (6+ sizes)'
  if (sizeCount >= 4) return 'Good (4-5 sizes)'
  return 'Basic (3 or fewer sizes)'
}