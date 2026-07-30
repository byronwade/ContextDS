import { generateObject, createGateway } from 'ai'
import { z } from 'zod'
import type { W3CTokenSet } from '../analyzers/token-generator'
import type { LayoutDNAProfile } from '../analyzers/layout-dna'

export interface PromptPack {
  instructions: string
  mappingHints: {
    tailwind?: TailwindMappings
    cssVariables?: CSSVariableMappings
    styledComponents?: StyledComponentsMappings
    [key: string]: unknown
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

const PromptPackSchema = z.object({
  instructions: z.string(),
  mappingHints: z.object({
    tailwind: z.object({
      colors: z.string(),
      spacing: z.string(),
      typography: z.string(),
      shadows: z.string(),
      borderRadius: z.string(),
      animation: z.string(),
    }),
    cssVariables: z.object({
      recommendation: z.string(),
      example: z.string(),
    }),
    styledComponents: z.object({
      themeStructure: z.string(),
      tokenUsage: z.string(),
    }),
  }),
  pitfalls: z.array(z.string()),
  performanceNotes: z.array(z.string()),
  confidence: z.number().min(0).max(100),
})

const gateway = createGateway({
  apiKey:
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '',
})

export class PromptPackGenerator {
  private readonly hasGateway: boolean

  constructor() {
    this.hasGateway = Boolean(
      process.env.AI_GATEWAY_API_KEY ||
        process.env.VERCEL_AI_API_KEY ||
        process.env.OPENAI_API_KEY
    )
  }

  async generatePromptPack(
    tokenSet: W3CTokenSet,
    layoutDNA?: LayoutDNAProfile,
    intent: 'component-authoring' | 'marketing-site' = 'component-authoring'
  ): Promise<PromptPack> {
    if (!this.hasGateway) {
      return this.generateFallbackPack(tokenSet, layoutDNA, intent)
    }

    try {
      const prompt = this.buildPrompt(tokenSet, layoutDNA, intent)

      const { object } = await generateObject({
        model: gateway('openai/gpt-4o-mini'),
        schema: PromptPackSchema,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
      })

      return object
    } catch (error) {
      console.error('AI prompt pack generation failed:', error)
      return this.generateFallbackPack(tokenSet, layoutDNA, intent)
    }
  }

  private buildPrompt(
    tokenSet: W3CTokenSet,
    layoutDNA: LayoutDNAProfile | undefined,
    intent: string
  ): string {
    const colorCount = tokenSet.color ? Object.keys(tokenSet.color).length : 0
    const typographyCount = tokenSet.typography
      ? Object.keys(tokenSet.typography).length
      : 0
    const spacingCount = tokenSet.dimension
      ? Object.keys(tokenSet.dimension).length
      : 0
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

    if (tokenSet.color) {
      const colors = Object.entries(tokenSet.color).slice(0, 3)
      prompt += `\n### Colors\n`
      colors.forEach(([name, token]) => {
        const confidence = token.$extensions?.['contextds.confidence'] || 0
        prompt += `- ${name}: ${token.$value} (confidence: ${confidence}%)\n`
      })
    }

    if (tokenSet.dimension) {
      const spacing = Object.entries(tokenSet.dimension).slice(0, 3)
      prompt += `\n### Spacing\n`
      spacing.forEach(([name, token]) => {
        const confidence = token.$extensions?.['contextds.confidence'] || 0
        prompt += `- ${name}: ${token.$value} (confidence: ${confidence}%)\n`
      })
    }

    if (layoutDNA) {
      prompt += `\n## Layout DNA Context
- Container strategy: ${layoutDNA.containers.responsiveStrategy}
- Grid/Flex usage: ${Math.round(layoutDNA.gridFlex.gridUsage)}% grid, ${Math.round(layoutDNA.gridFlex.flexUsage)}% flex
- Spacing base: ${layoutDNA.spacingScale.base}px
- Detected archetypes: ${layoutDNA.archetypes.map((a) => a.type).join(', ')}
`
    }

    prompt += `\n## Requirements
1. Provide clear, actionable instructions in markdown
2. Include specific mapping hints for Tailwind CSS, CSS Variables, and Styled Components
3. Identify potential pitfalls and edge cases
4. Suggest performance optimizations
5. Rate your confidence in the guidance (0-100)`

    return prompt
  }

  private generateFallbackPack(
    tokenSet: W3CTokenSet,
    layoutDNA: LayoutDNAProfile | undefined,
    intent: string
  ): PromptPack {
    void intent
    const colorCount = tokenSet.color ? Object.keys(tokenSet.color).length : 0
    const hasSpacing =
      !!tokenSet.dimension && Object.keys(tokenSet.dimension).length > 0
    const hasTypography =
      !!tokenSet.typography && Object.keys(tokenSet.typography).length > 0
    const hasShadows = !!tokenSet.shadow && Object.keys(tokenSet.shadow).length > 0

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

    return {
      instructions,
      mappingHints: {
        tailwind: {
          colors: 'Map color tokens to your tailwind.config.js theme.colors object',
          spacing: hasSpacing
            ? 'Use spacing tokens as Tailwind spacing scale values'
            : 'Define consistent spacing scale',
          typography: hasTypography
            ? 'Configure extracted font families and sizes in Tailwind typography plugin'
            : 'Set up typography scale',
          shadows: hasShadows
            ? 'Map shadow tokens to Tailwind boxShadow configuration'
            : 'Define elevation system',
          borderRadius: 'Use extracted radius values for consistent rounded corners',
          animation: layoutDNA?.motion
            ? 'Configure duration and easing tokens for animations'
            : 'Set up animation system',
        },
        cssVariables: {
          recommendation:
            'Define tokens as CSS custom properties (--color-primary, --spacing-md) for easy theming',
          example: ':root { --color-primary: #3b82f6; --spacing-md: 16px; }',
        },
        styledComponents: {
          themeStructure:
            'Create a theme object with nested token categories: { colors: {}, spacing: {}, typography: {} }',
          tokenUsage:
            'Access tokens via props.theme: color: ${props => props.theme.colors.primary};',
        },
      },
      pitfalls: [
        'Some color tokens may have low contrast ratios - verify accessibility compliance',
        'Extracted spacing values might not form a perfect mathematical scale',
        hasTypography
          ? 'Web fonts may not have been loaded during extraction - verify font availability'
          : 'Typography system needs manual definition',
        'Motion tokens extracted from CSS may not represent the full interaction design',
      ],
      performanceNotes: [
        'Consider using CSS variables for dynamic theming without JavaScript',
        'Minimize the number of unique token values to reduce CSS size',
        'Use system fonts as fallbacks for web fonts',
        'Implement progressive enhancement for animations',
      ],
      confidence: 75,
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
    const mergedTokenSet = this.mergeTokenSets(sourceTokenSets, constraints)
    const promptPack = await this.generatePromptPack(
      mergedTokenSet,
      undefined,
      'component-authoring'
    )
    return { mergedTokenSet, promptPack }
  }

  private mergeTokenSets(
    sources: W3CTokenSet[],
    _constraints: {
      maintainColorHarmony?: boolean
      ensureAAAccessibility?: boolean
      preferredScale?: 'geometric' | 'linear'
      maxTokens?: number
    }
  ): W3CTokenSet {
    const merged: W3CTokenSet = {
      $schema: 'https://design-tokens.github.io/community-group/format/',
      $metadata: {
        name: 'Merged Token Set',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        source: {
          url: 'remix',
          extractedAt: new Date().toISOString(),
        },
        tools: {
          extractor: 'remix-generator',
          analyzer: 'contextds-merger',
          generator: 'ai-reconciliation',
        },
      },
    }

    sources.forEach((source) => {
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
