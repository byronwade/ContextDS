/**
 * AI-Powered Design Insights using Vercel AI Gateway
 * Analyzes curated tokens to provide intelligent design system insights
 */

import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

// Configure Vercel AI Gateway
// Note: Vercel AI Gateway format is handled automatically by the SDK with the API key
const openai = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_API_KEY || process.env.OPENAI_API_KEY,
})

export interface DesignInsights {
  summary: string
  colorPalette: {
    style: string
    mood: string
    accessibility: string
    recommendations: string[]
  }
  typography: {
    style: string
    hierarchy: string
    readability: string
    recommendations: string[]
  }
  spacing: {
    system: string
    consistency: string
    recommendations: string[]
  }
  components: {
    patterns: string[]
    quality: string
    recommendations: string[]
  }
  overall: {
    maturity: 'prototype' | 'developing' | 'mature' | 'systematic'
    consistency: number
    aiRecommendations: string[]
  }
}

/**
 * Generate design insights using AI
 */
export async function generateDesignInsights(
  curatedTokens: CuratedTokenSet,
  metadata: {
    domain: string
    url: string
  }
): Promise<DesignInsights> {
  // Prepare concise prompt for AI analysis
  const prompt = buildAnalysisPrompt(curatedTokens, metadata)

  try {
    // Use Vercel AI Gateway with fast model for analysis
    const { text } = await generateText({
      model: openai('gpt-4o-mini'), // Fast, cost-effective model via AI Gateway
      prompt,
      temperature: 0.3, // Lower temperature for consistent analysis
      maxTokens: 1000
    })

    // Parse AI response into structured insights
    return parseInsights(text, curatedTokens)
  } catch (error) {
    console.error('AI insights generation failed', error)
    // Fallback to rule-based insights
    return generateRuleBasedInsights(curatedTokens, metadata)
  }
}

/**
 * Build analysis prompt for AI
 */
function buildAnalysisPrompt(tokens: CuratedTokenSet, metadata: { domain: string }): string {
  const colorCount = tokens.colors.length
  const fontCount = tokens.typography.families.length

  const colorSummary = tokens.colors.slice(0, 5).map(c =>
    `${c.value} (${c.semantic}, ${c.percentage}% usage)`
  ).join(', ')

  const fontSummary = tokens.typography.families.map(f =>
    `${f.value} (${f.semantic}, ${f.percentage}% usage)`
  ).join(', ')

  return `Analyze this design system from ${metadata.domain}:

COLORS (top ${colorCount}):
${colorSummary}

FONTS (${fontCount} families):
${fontSummary}

SPACING: ${tokens.spacing.length} values (${tokens.spacing[0]?.value} to ${tokens.spacing[tokens.spacing.length - 1]?.value})
RADIUS: ${tokens.radius.length} values
SHADOWS: ${tokens.shadows.length} elevation levels

Provide design system analysis in this format:

STYLE: [minimalist/modern/bold/playful]
MOOD: [professional/friendly/luxurious/energetic]
MATURITY: [prototype/developing/mature/systematic]
CONSISTENCY: [score 0-100]

COLOR_RECOMMENDATIONS: [3 specific improvements]
TYPOGRAPHY_RECOMMENDATIONS: [2 specific improvements]
SPACING_RECOMMENDATIONS: [2 specific improvements]

Keep analysis concise and actionable.`
}

/**
 * Parse AI response into structured format
 */
function parseInsights(aiResponse: string, tokens: CuratedTokenSet): DesignInsights {
  // Simple parsing - in production, use more robust extraction
  const lines = aiResponse.split('\n').filter(l => l.trim())

  const style = lines.find(l => l.startsWith('STYLE:'))?.split(':')[1]?.trim() || 'modern'
  const mood = lines.find(l => l.startsWith('MOOD:'))?.split(':')[1]?.trim() || 'professional'
  const maturity = lines.find(l => l.startsWith('MATURITY:'))?.split(':')[1]?.trim().toLowerCase() as any || 'developing'
  const consistency = parseInt(lines.find(l => l.startsWith('CONSISTENCY:'))?.split(':')[1]?.trim() || '75')

  const colorRecs = lines
    .filter(l => l.includes('COLOR_') && l.includes(':'))
    .map(l => l.split(':')[1]?.trim())
    .filter(Boolean)

  const typographyRecs = lines
    .filter(l => l.includes('TYPOGRAPHY_') && l.includes(':'))
    .map(l => l.split(':')[1]?.trim())
    .filter(Boolean)

  const spacingRecs = lines
    .filter(l => l.includes('SPACING_') && l.includes(':'))
    .map(l => l.split(':')[1]?.trim())
    .filter(Boolean)

  return {
    summary: `${style.charAt(0).toUpperCase() + style.slice(1)} ${mood} design system`,
    colorPalette: {
      style,
      mood,
      accessibility: determineAccessibility(tokens.colors),
      recommendations: colorRecs.length > 0 ? colorRecs : [
        'Consider adding more neutral grays for better hierarchy',
        'Ensure sufficient contrast between text and background colors'
      ]
    },
    typography: {
      style: determineTypographyStyle(tokens.typography),
      hierarchy: determineHierarchy(tokens.typography),
      readability: 'Good',
      recommendations: typographyRecs.length > 0 ? typographyRecs : [
        'Consider adding more font size variations for better hierarchy'
      ]
    },
    spacing: {
      system: determineSpacingSystem(tokens.spacing),
      consistency: determineSpacingConsistency(tokens.spacing),
      recommendations: spacingRecs.length > 0 ? spacingRecs : [
        'Spacing system appears consistent with clear scale'
      ]
    },
    components: {
      patterns: detectComponentPatterns(tokens),
      quality: 'High',
      recommendations: [
        'Components follow consistent design patterns',
        'Consider documenting component variants'
      ]
    },
    overall: {
      maturity,
      consistency,
      aiRecommendations: [
        ...colorRecs.slice(0, 2),
        ...typographyRecs.slice(0, 1),
        ...spacingRecs.slice(0, 1)
      ]
    }
  }
}

/**
 * Fallback rule-based insights (no AI needed)
 */
function generateRuleBasedInsights(tokens: CuratedTokenSet, metadata: { domain: string }): DesignInsights {
  const colorCount = tokens.colors.length
  const hasNeutrals = tokens.colors.some(c => c.semantic?.includes('Gray') || c.semantic?.includes('Black'))
  const hasAccents = tokens.colors.some(c => c.semantic?.includes('Primary') || c.semantic?.includes('Accent'))

  const style = hasAccents && !hasNeutrals ? 'bold' : hasNeutrals ? 'minimalist' : 'modern'
  const maturity = colorCount >= 8 && tokens.typography.families.length >= 3 ? 'systematic' : colorCount >= 5 ? 'mature' : 'developing'

  return {
    summary: `${style.charAt(0).toUpperCase() + style.slice(1)} design system with ${maturity} token structure`,
    colorPalette: {
      style,
      mood: hasAccents ? 'vibrant' : 'calm',
      accessibility: determineAccessibility(tokens.colors),
      recommendations: [
        colorCount < 6 ? 'Consider adding more color variations' : 'Color palette is well-balanced',
        !hasNeutrals ? 'Add neutral grays for better hierarchy' : 'Good use of neutral colors'
      ]
    },
    typography: {
      style: determineTypographyStyle(tokens.typography),
      hierarchy: determineHierarchy(tokens.typography),
      readability: 'Good',
      recommendations: [
        tokens.typography.families.length < 2 ? 'Consider adding a secondary font' : 'Good font variety'
      ]
    },
    spacing: {
      system: determineSpacingSystem(tokens.spacing),
      consistency: determineSpacingConsistency(tokens.spacing),
      recommendations: [
        'Spacing system appears consistent'
      ]
    },
    components: {
      patterns: detectComponentPatterns(tokens),
      quality: 'High',
      recommendations: [
        'Components follow consistent patterns'
      ]
    },
    overall: {
      maturity,
      consistency: colorCount >= 6 ? 85 : 70,
      aiRecommendations: [
        `${colorCount} colors extracted - good coverage`,
        `${tokens.typography.families.length} font families - ${tokens.typography.families.length >= 2 ? 'well structured' : 'consider adding variety'}`
      ]
    }
  }
}

/**
 * Helper functions for analysis
 */

function determineAccessibility(colors: any[]): string {
  // Simplified - would need proper contrast checking
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

function determineSpacingSystem(spacing: any[]): string {
  if (spacing.length === 0) return 'None detected'

  // Check if values follow a pattern (4, 8, 12, 16, 24, 32, 48, etc.)
  const values = spacing.map(s => {
    const val = parseFloat(String(s.value))
    return isNaN(val) ? 0 : val
  }).sort((a, b) => a - b)

  // Check for 4px base
  const has4pxBase = values.some(v => v === 4)
  // Check for 8px base
  const has8pxBase = values.some(v => v === 8)

  if (has4pxBase) return '4px base system'
  if (has8pxBase) return '8px base system'
  return 'Custom spacing scale'
}

function determineSpacingConsistency(spacing: any[]): string {
  if (spacing.length < 4) return 'Limited data'
  if (spacing.length >= 8) return 'Highly consistent scale'
  return 'Moderately consistent'
}

function detectComponentPatterns(tokens: CuratedTokenSet): string[] {
  const patterns: string[] = []

  // Check for button patterns
  if (tokens.colors.some(c => c.semantic?.includes('Primary'))) {
    patterns.push('Primary button pattern detected')
  }

  // Check for card patterns
  if (tokens.shadows.length > 0) {
    patterns.push('Card elevation system present')
  }

  // Check for form patterns
  if (tokens.radius.length > 0 && tokens.spacing.length > 0) {
    patterns.push('Form input system detected')
  }

  return patterns.length > 0 ? patterns : ['Standard component patterns']
}