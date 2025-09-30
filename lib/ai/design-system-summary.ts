/**
 * AI-Powered Design System Summary Generator
 * Creates concise, branded descriptions of design systems for AI agents
 */

import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

// Configure Vercel AI Gateway
const openai = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_API_KEY || process.env.OPENAI_API_KEY,
})

export interface DesignSystemSummary {
  brandDescription: string
  colorPalette: string
  typography: string
  spacingSystem: string
  overallStyle: string
  aiRecommendations: string[]
}

export async function generateDesignSystemSummary(
  tokens: CuratedTokenSet,
  context: { domain: string; url: string }
): Promise<DesignSystemSummary | null> {
  try {
    const prompt = buildSummaryPrompt(tokens, context)

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.4,
      maxTokens: 500,
    })

    return parseSummaryResponse(text)
  } catch (error) {
    console.error('Design system summary generation failed:', error)
    return null
  }
}

function buildSummaryPrompt(tokens: CuratedTokenSet, context: { domain: string; url: string }): string {
  const primaryColors = tokens.colors.slice(0, 5).map(c => c.value).join(', ')
  const fonts = tokens.typography.families.map(f => f.value).join(', ')
  const spacingCount = tokens.spacing.length
  const hasColors = tokens.colors.length > 0
  const hasFonts = tokens.typography.families.length > 0

  return `Analyze this design system extracted from ${context.domain} and provide a concise summary.

**Design Tokens:**
- Colors: ${hasColors ? `${tokens.colors.length} colors (primary: ${primaryColors})` : 'No colors detected'}
- Typography: ${hasFonts ? `${fonts}` : 'No custom fonts'}
- Spacing: ${spacingCount} spacing values
- Shadows: ${tokens.shadows.length} shadow tokens
- Radius: ${tokens.radius.length} radius values

**Task:** Write a professional 2-3 sentence design system description focusing on:
1. **Brand personality** from the color palette
2. **Typography style** (modern/classic/technical)
3. **Overall design approach** (minimal/vibrant/corporate/playful)

Format your response as JSON:
{
  "brandDescription": "2-3 sentence overview of the design system's personality and approach",
  "colorPalette": "1 sentence describing the color strategy",
  "typography": "1 sentence about font choices and hierarchy",
  "spacingSystem": "1 sentence about spacing patterns",
  "overallStyle": "3-5 keywords: minimal, vibrant, modern, etc.",
  "aiRecommendations": ["top 3 quick improvements as short phrases"]
}

Be specific, avoid generic terms, focus on what makes THIS design system unique.`
}

function parseSummaryResponse(text: string): DesignSystemSummary {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        brandDescription: parsed.brandDescription || '',
        colorPalette: parsed.colorPalette || '',
        typography: parsed.typography || '',
        spacingSystem: parsed.spacingSystem || '',
        overallStyle: parsed.overallStyle || '',
        aiRecommendations: parsed.aiRecommendations || []
      }
    }
  } catch (error) {
    console.error('Failed to parse AI summary:', error)
  }

  // Fallback
  return {
    brandDescription: text,
    colorPalette: '',
    typography: '',
    spacingSystem: '',
    overallStyle: '',
    aiRecommendations: []
  }
}