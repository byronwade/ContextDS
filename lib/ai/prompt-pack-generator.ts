import type { W3CTokenSet } from '../analyzers/token-generator'
import type { LayoutDNAProfile } from '../analyzers/layout-dna'

export interface PromptPack {
  instructions: string
  mappingHints: {
    tailwind?: TailwindMappings
    cssVariables?: CSSVariableMappings
    styledComponents?: StyledComponentsMappings
    [key: string]: any
  }
  pitfalls: string[]
  performanceNotes: string[]
  confidence: number
}

export interface TailwindMappings {
  colors: string
  spacing: string
  typography: string
  shadows: string
  borderRadius: string
  animation: string
}

export interface CSSVariableMappings {
  recommendation: string
  example: string
}

export interface StyledComponentsMappings {
  themeStructure: string
  tokenUsage: string
}

export class PromptPackGenerator {
  private client: any = null

  constructor() {
    // Initialize OpenAI client only when API key is available
    if (process.env.VERCEL_AI_API_KEY) {
      const { openai } = require('ai')
      this.client = openai({
        apiKey: process.env.VERCEL_AI_API_KEY,
        baseURL: 'https://api.vercel.com/v1/ai'
      })
    }
  }

  async generatePromptPack(
    tokenSet: W3CTokenSet,
    layoutDNA?: LayoutDNAProfile,
    intent: 'component-authoring' | 'marketing-site' = 'component-authoring'
  ): Promise<PromptPack> {
    if (!this.client) {
      // Return a basic prompt pack without AI generation
      return this.generateFallbackPack(tokenSet, layoutDNA, intent)
    }

    try {
      const prompt = this.buildPrompt(tokenSet, layoutDNA, intent)

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a design system expert that generates precise, actionable guidance for developers using design tokens. Your responses must be in valid JSON format with the structure: {
              "instructions": "markdown string",
              "mappingHints": {
                "tailwind": { "colors": "string", "spacing": "string", "typography": "string", "shadows": "string", "borderRadius": "string", "animation": "string" },
                "cssVariables": { "recommendation": "string", "example": "string" },
                "styledComponents": { "themeStructure": "string", "tokenUsage": "string" }
              },
              "pitfalls": ["string array"],
              "performanceNotes": ["string array"],
              "confidence": number
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI')
      }

      // Parse and validate the JSON response
      const promptPack = JSON.parse(response) as PromptPack

      // Validate required fields
      if (!promptPack.instructions || !promptPack.mappingHints || !promptPack.pitfalls) {
        throw new Error('Invalid response format from AI')
      }

      return promptPack

    } catch (error) {
      console.error('AI prompt pack generation failed:', error)

      // Fallback to deterministic generation
      return this.generateFallbackPack(tokenSet, layoutDNA, intent)
    }
  }

  private buildPrompt(
    tokenSet: W3CTokenSet,
    layoutDNA?: LayoutDNAProfile,
    intent: string
  ): string {
    const colorCount = tokenSet.color ? Object.keys(tokenSet.color).length : 0
    const typographyCount = tokenSet.typography ? Object.keys(tokenSet.typography).length : 0
    const spacingCount = tokenSet.dimension ? Object.keys(tokenSet.dimension).length : 0
    const shadowCount = tokenSet.shadow ? Object.keys(tokenSet.shadow).length : 0

    let prompt = `Generate a comprehensive design token usage guide for developers based on the following extracted design system:

## Token Summary
- Colors: ${colorCount} tokens
- Typography: ${typographyCount} tokens
- Spacing/Dimensions: ${spacingCount} tokens
- Shadows: ${shadowCount} tokens

## Intent
${intent === 'component-authoring' ? 'Building reusable UI components' : 'Creating marketing website pages'}

## Sample Tokens
`

    // Add sample color tokens
    if (tokenSet.color) {
      const colors = Object.entries(tokenSet.color).slice(0, 3)
      prompt += `\n### Colors\n`
      colors.forEach(([name, token]) => {
        const confidence = token.$extensions?.['contextds.confidence'] || 0
        prompt += `- ${name}: ${token.$value} (confidence: ${confidence}%)\n`
      })
    }

    // Add sample spacing tokens
    if (tokenSet.dimension) {
      const spacing = Object.entries(tokenSet.dimension).slice(0, 3)
      prompt += `\n### Spacing\n`
      spacing.forEach(([name, token]) => {
        const confidence = token.$extensions?.['contextds.confidence'] || 0
        prompt += `- ${name}: ${token.$value} (confidence: ${confidence}%)\n`
      })
    }

    // Add layout DNA context
    if (layoutDNA) {
      prompt += `\n## Layout DNA Context
- Container strategy: ${layoutDNA.containers.responsiveStrategy}
- Grid/Flex usage: ${Math.round(layoutDNA.gridFlex.gridUsage)}% grid, ${Math.round(layoutDNA.gridFlex.flexUsage)}% flex
- Spacing base: ${layoutDNA.spacingScale.base}px
- Detected archetypes: ${layoutDNA.archetypes.map(a => a.type).join(', ')}
`
    }

    prompt += `\n## Requirements
1. Provide clear, actionable instructions in markdown
2. Include specific mapping hints for Tailwind CSS, CSS Variables, and Styled Components
3. Identify potential pitfalls and edge cases
4. Suggest performance optimizations
5. Rate your confidence in the guidance (0-100)

Generate the response as valid JSON following the specified structure.`

    return prompt
  }

  private generateFallbackPack(
    tokenSet: W3CTokenSet,
    layoutDNA?: LayoutDNAProfile,
    intent: string
  ): PromptPack {
    const colorCount = tokenSet.color ? Object.keys(tokenSet.color).length : 0
    const hasSpacing = tokenSet.dimension && Object.keys(tokenSet.dimension).length > 0
    const hasTypography = tokenSet.typography && Object.keys(tokenSet.typography).length > 0
    const hasShadows = tokenSet.shadow && Object.keys(tokenSet.shadow).length > 0

    const instructions = `# Design Token Implementation Guide

## Overview
This design system contains ${colorCount} color tokens, ${hasSpacing ? 'spacing tokens' : 'no spacing tokens'}, ${hasTypography ? 'typography tokens' : 'no typography tokens'}, and ${hasShadows ? 'shadow tokens' : 'no shadow tokens'}.

## Implementation Strategy

### Colors
${colorCount > 0 ? 'Use the extracted color tokens for consistent brand colors across components. Primary colors should be used for main actions and brand elements.' : 'No color tokens were extracted. Consider defining a consistent color palette.'}

### Layout & Spacing
${layoutDNA ? `The site uses a ${layoutDNA.containers.responsiveStrategy} responsive strategy with a ${layoutDNA.spacingScale.base}px base spacing unit.` : 'Follow consistent spacing patterns throughout your implementation.'}

### Typography
${hasTypography ? 'Typography tokens have been extracted from the design system. Use these for consistent text styling.' : 'Define typography scales for consistent text hierarchy.'}

## Best Practices
- Use design tokens instead of hardcoded values
- Maintain consistency across components
- Test accessibility, especially color contrast
- Document token usage for your team
`

    const mappingHints: PromptPack['mappingHints'] = {
      tailwind: {
        colors: 'Map color tokens to your tailwind.config.js theme.colors object',
        spacing: hasSpacing ? 'Use spacing tokens as Tailwind spacing scale values' : 'Define consistent spacing scale',
        typography: hasTypography ? 'Configure extracted font families and sizes in Tailwind typography plugin' : 'Set up typography scale',
        shadows: hasShadows ? 'Map shadow tokens to Tailwind boxShadow configuration' : 'Define elevation system',
        borderRadius: 'Use extracted radius values for consistent rounded corners',
        animation: layoutDNA?.motion ? 'Configure duration and easing tokens for animations' : 'Set up animation system'
      },
      cssVariables: {
        recommendation: 'Define tokens as CSS custom properties (--color-primary, --spacing-md) for easy theming',
        example: ':root { --color-primary: #3b82f6; --spacing-md: 16px; }'
      },
      styledComponents: {
        themeStructure: 'Create a theme object with nested token categories: { colors: {}, spacing: {}, typography: {} }',
        tokenUsage: 'Access tokens via props.theme: color: ${props => props.theme.colors.primary};'
      }
    }

    const pitfalls = [
      'Some color tokens may have low contrast ratios - verify accessibility compliance',
      'Extracted spacing values might not form a perfect mathematical scale',
      hasTypography ? 'Web fonts may not have been loaded during extraction - verify font availability' : 'Typography system needs manual definition',
      'Motion tokens extracted from CSS may not represent the full interaction design'
    ]

    const performanceNotes = [
      'Consider using CSS variables for dynamic theming without JavaScript',
      'Minimize the number of unique token values to reduce CSS size',
      'Use system fonts as fallbacks for web fonts',
      'Implement progressive enhancement for animations'
    ]

    return {
      instructions,
      mappingHints,
      pitfalls,
      performanceNotes,
      confidence: 75 // Moderate confidence for fallback
    }
  }

  async generateRemixPack(
    sourceTokenSets: W3CTokenSet[],
    constraints: {
      maintainColorHarmony?: boolean
      ensureAAAccessibility?: boolean
      preferredScale?: 'geometric' | 'linear'
      maxTokens?: number
    }
  ): Promise<{ mergedTokenSet: W3CTokenSet; promptPack: PromptPack }> {
    try {
      // Merge token sets (simplified implementation)
      const mergedTokenSet = this.mergeTokenSets(sourceTokenSets, constraints)

      // Generate prompt pack for merged set
      const promptPack = await this.generatePromptPack(mergedTokenSet, undefined, 'component-authoring')

      return { mergedTokenSet, promptPack }

    } catch (error) {
      console.error('Remix pack generation failed:', error)
      throw error
    }
  }

  private mergeTokenSets(
    sources: W3CTokenSet[],
    constraints: any
  ): W3CTokenSet {
    // Simplified merging logic - in production would need sophisticated conflict resolution
    const merged: W3CTokenSet = {
      $schema: 'https://design-tokens.github.io/community-group/format/',
      $metadata: {
        name: 'Merged Token Set',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        source: {
          url: 'remix',
          extractedAt: new Date().toISOString()
        },
        tools: {
          extractor: 'remix-generator',
          analyzer: 'contextds-merger',
          generator: 'ai-reconciliation'
        }
      }
    }

    // Merge colors from all sources
    sources.forEach(source => {
      if (source.color) {
        if (!merged.color) merged.color = {}
        Object.assign(merged.color, source.color)
      }

      if (source.dimension) {
        if (!merged.dimension) merged.dimension = {}
        Object.assign(merged.dimension, source.dimension)
      }

      if (source.typography) {
        if (!merged.typography) merged.typography = {}
        Object.assign(merged.typography, source.typography)
      }
    })

    return merged
  }
}