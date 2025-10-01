/**
 * AI-Powered Design System Builder
 * Generates actionable, structured design system specifications
 * Optimized for AI consumption and human implementation
 */

import { generateObject } from 'ai'
import { createGateway } from 'ai'
import { z } from 'zod'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'
import type { ComponentLibrary } from '@/lib/analyzers/component-extractor'

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
})

// Component Specification Schema
const ComponentSpecSchema = z.object({
  name: z.string(),
  variants: z.array(z.object({
    name: z.string(),
    css: z.record(z.string()), // Exact CSS properties
    tokens: z.record(z.string()), // Token mappings
    usage: z.string(), // When to use this variant
    example: z.string().optional() // HTML example
  })),
  states: z.object({
    hover: z.record(z.string()).optional(),
    active: z.record(z.string()).optional(),
    focus: z.record(z.string()).optional(),
    disabled: z.record(z.string()).optional(),
  }),
  composition: z.string(), // How to combine with other components
  accessibility: z.array(z.string()) // A11y requirements
})

// Design System Specification Schema
const DesignSystemSpecSchema = z.object({
  // Core Foundation
  foundation: z.object({
    colorSystem: z.object({
      palette: z.array(z.object({
        name: z.string(),
        hex: z.string(),
        usage: z.string(),
        contrast: z.object({
          onWhite: z.number(),
          onBlack: z.number()
        })
      })),
      semanticTokens: z.array(z.object({
        name: z.string(),
        lightMode: z.string(),
        darkMode: z.string(),
        purpose: z.string()
      }))
    }),
    typography: z.object({
      families: z.array(z.object({
        name: z.string(),
        usage: z.string(),
        fallbacks: z.array(z.string())
      })),
      scale: z.array(z.object({
        name: z.string(),
        size: z.string(),
        lineHeight: z.string(),
        usage: z.string()
      })),
      weights: z.array(z.object({
        value: z.string(),
        usage: z.string()
      }))
    }),
    spacing: z.object({
      scale: z.array(z.object({
        name: z.string(),
        value: z.string(),
        usage: z.string()
      })),
      principles: z.array(z.string())
    }),
    elevation: z.object({
      levels: z.array(z.object({
        name: z.string(),
        boxShadow: z.string(),
        usage: z.string()
      }))
    })
  }),

  // Component Specifications
  components: z.array(ComponentSpecSchema),

  // Design Patterns
  patterns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    components: z.array(z.string()),
    layout: z.string(),
    example: z.string()
  })),

  // Implementation Guide
  implementation: z.object({
    priority: z.array(z.object({
      phase: z.string(),
      components: z.array(z.string()),
      rationale: z.string()
    })),
    tokenStructure: z.object({
      format: z.string(),
      naming: z.string(),
      example: z.string()
    }),
    codeExamples: z.array(z.object({
      component: z.string(),
      framework: z.string(),
      code: z.string()
    }))
  }),

  // Design Principles
  principles: z.array(z.object({
    principle: z.string(),
    description: z.string(),
    examples: z.array(z.string())
  })),

  // Quick Reference
  quickReference: z.object({
    buttonGuide: z.string(),
    colorGuide: z.string(),
    spacingGuide: z.string(),
    typographyGuide: z.string()
  })
})

export type DesignSystemSpec = z.infer<typeof DesignSystemSpecSchema>

/**
 * Generate comprehensive design system specification
 */
export async function buildDesignSystemSpec(
  tokens: CuratedTokenSet,
  componentLibrary: ComponentLibrary | null,
  metadata: { domain: string; url: string }
): Promise<DesignSystemSpec> {
  try {
    const prompt = buildDesignSystemPrompt(tokens, componentLibrary, metadata)

    const { object } = await generateObject({
      model: gateway('openai/gpt-4o'),
      schema: DesignSystemSpecSchema,
      prompt,
      temperature: 0.3,
      maxTokens: 6000
    })

    return object
  } catch (error) {
    console.error('Design system spec generation failed:', error)
    return generateFallbackSpec(tokens, componentLibrary)
  }
}

/**
 * Build comprehensive design system extraction prompt
 */
function buildDesignSystemPrompt(
  tokens: CuratedTokenSet,
  components: ComponentLibrary | null,
  metadata: { domain: string }
): string {
  // Format color data
  const colors = tokens.colors.map(c =>
    `${c.value} (${c.name}, ${c.percentage}% usage, confidence ${c.confidence}%)`
  ).join('\n')

  // Format typography data
  const fonts = tokens.typography.families.map(f =>
    `${f.value} (${f.percentage}% usage)`
  ).join('\n')

  const fontSizes = tokens.typography.sizes.map(s =>
    `${s.value} (${s.percentage}% usage)`
  ).join(', ')

  const fontWeights = tokens.typography.weights?.map(w =>
    `${w.value} (${w.percentage}% usage)`
  ).join(', ') || 'Not analyzed'

  // Format spacing data
  const spacing = tokens.spacing.map(s =>
    `${s.value} (${s.percentage}% usage)`
  ).join(', ')

  // Format component data with safe property access
  const componentSummary = components ? `
DETECTED COMPONENTS:
- Buttons: ${components.buttons?.length || 0} variants
- Inputs: ${components.inputs?.length || 0} variants
- Cards: ${components.cards?.length || 0} patterns
- Badges: ${components.badges?.length || 0} variants
- Headings: ${components.headings?.length || 0} levels

Sample Button Data:
${components.buttons?.slice(0, 2)?.map(btn => `
  Variant: ${btn.variant || 'default'}
  Properties: ${JSON.stringify(btn.properties, null, 2)}
  States: ${btn.properties?.hover ? 'Has hover' : 'No hover'}, ${btn.properties?.focus ? 'Has focus' : 'No focus'}
`).join('\n') || 'No button samples available'}
` : 'No component data available'

  return `You are a design system architect creating a comprehensive, actionable design system specification for "${metadata.domain}".

Your goal: Generate a complete design system that any developer or AI can use to recreate this site's design with pixel-perfect accuracy.

EXTRACTED DESIGN TOKENS:

Colors (${tokens.colors.length} total):
${colors}

Typography:
Families: ${fonts}
Sizes: ${fontSizes}
Weights: ${fontWeights}

Spacing Scale: ${spacing}

Shadows: ${tokens.shadows.length > 0 ? tokens.shadows.map(s => s.value).join(', ') : 'None detected'}

Border Radius: ${tokens.radius.length > 0 ? tokens.radius.map(r => r.value).join(', ') : 'None detected'}

${componentSummary}

REQUIREMENTS:

1. FOUNDATION - Create a complete token system:
   - Map all colors to semantic names (primary, secondary, accent, etc.)
   - Provide exact contrast ratios for accessibility
   - Define light/dark mode variants
   - Create a logical typography scale with usage guidance
   - Define a spacing scale based on detected values
   - Map shadows to elevation levels

2. COMPONENTS - For each component type, provide:
   - Exact CSS specifications for each variant
   - Token mappings (which foundation tokens to use)
   - State specifications (hover, active, focus, disabled)
   - Clear usage guidelines (when to use each variant)
   - HTML/React code examples

3. PATTERNS - Identify composition patterns:
   - How components combine (e.g., Card + Button + Badge)
   - Layout patterns (grid arrangements, stacking)
   - Spacing relationships between components

4. IMPLEMENTATION - Provide actionable guidance:
   - Priority order (which components to build first)
   - Token structure format (CSS variables, JS objects, etc.)
   - Code examples for React/Vue/vanilla JS
   - Migration path from current to systematic approach

5. QUICK REFERENCE - One-sentence guides:
   - When to use each button variant
   - How to choose the right color
   - Spacing rules of thumb
   - Typography pairing guidelines

Be specific. Use exact values. Make it copy-paste ready for developers and AI agents.`
}

/**
 * Fallback specification when AI generation fails
 */
function generateFallbackSpec(
  tokens: CuratedTokenSet,
  components: ComponentLibrary | null
): DesignSystemSpec {
  return {
    foundation: {
      colorSystem: {
        palette: tokens.colors.slice(0, 10).map((c, i) => ({
          name: c.name || `color-${i}`,
          hex: c.value as string,
          usage: `Used in ${c.percentage}% of surfaces`,
          contrast: {
            onWhite: 4.5,
            onBlack: 4.5
          }
        })),
        semanticTokens: []
      },
      typography: {
        families: tokens.typography.families.map(f => ({
          name: f.value as string,
          usage: `Primary font (${f.percentage}% usage)`,
          fallbacks: ['system-ui', 'sans-serif']
        })),
        scale: tokens.typography.sizes.slice(0, 6).map((s, i) => ({
          name: `text-${['xs', 'sm', 'base', 'lg', 'xl', '2xl'][i] || i}`,
          size: s.value as string,
          lineHeight: '1.5',
          usage: 'Body text'
        })),
        weights: []
      },
      spacing: {
        scale: tokens.spacing.slice(0, 8).map((s, i) => ({
          name: `space-${i}`,
          value: s.value as string,
          usage: 'General spacing'
        })),
        principles: ['Use consistent spacing scale', 'Maintain vertical rhythm']
      },
      elevation: {
        levels: []
      }
    },
    components: [],
    patterns: [],
    implementation: {
      priority: [
        {
          phase: 'Phase 1',
          components: ['Button', 'Input', 'Card'],
          rationale: 'Core UI building blocks'
        }
      ],
      tokenStructure: {
        format: 'CSS Custom Properties',
        naming: 'Semantic naming convention',
        example: '--color-primary: #007bff;'
      },
      codeExamples: []
    },
    principles: [
      {
        principle: 'Consistency',
        description: 'Use the design system tokens consistently',
        examples: ['Always use spacing scale values', 'Stick to typography scale']
      }
    ],
    quickReference: {
      buttonGuide: 'Use primary for main actions, secondary for alternatives',
      colorGuide: 'Use semantic color tokens for consistent theming',
      spacingGuide: 'Follow the spacing scale for all margins and padding',
      typographyGuide: 'Use the type scale for consistent hierarchy'
    }
  }
}
