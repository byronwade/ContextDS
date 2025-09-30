/**
 * LLM-Optimized Export Format
 * Structured specifically for AI agents to consume and generate accurate components
 */

import type { ScanJobResult } from '@/lib/workers/scan-orchestrator'

export interface LLMDesignSystemExport {
  // Meta information
  metadata: {
    domain: string
    scannedAt: string
    confidence: number
    completeness: number
  }

  // Design tokens in AI-friendly format
  tokens: {
    colors: {
      brand: Array<{ name: string; hex: string; usage: string }>
      neutral: Array<{ name: string; hex: string; usage: string }>
      semantic: Array<{ name: string; hex: string; usage: string; purpose: string }>
    }
    typography: {
      families: Array<{ name: string; usage: string; semantic: string }>
      scale: Array<{ size: string; semantic: string; usage: string }>
      weights: Array<{ weight: string; semantic: string }>
    }
    spacing: {
      scale: string[]
      baseUnit: number
      system: string
      common: Array<{ value: string; semantic: string; usage: string }>
    }
    radius: Array<{ value: string; semantic: string; usage: string }>
    shadows: Array<{ css: string; semantic: string; usage: string }>
  }

  // Component specifications
  components: {
    buttons: Array<{
      variant: string
      description: string
      css: {
        base: Record<string, string>
        hover?: Record<string, string>
        active?: Record<string, string>
        focus?: Record<string, string>
        disabled?: Record<string, string>
      }
      usage: number
      examples: string[]
    }>
    inputs: Array<{
      variant: string
      description: string
      css: {
        base: Record<string, string>
        focus?: Record<string, string>
      }
      usage: number
    }>
    cards: Array<{
      variant: string
      description: string
      css: Record<string, string>
      usage: number
    }>
  }

  // Layout system
  layout: {
    containers: {
      maxWidths: string[]
      sidePaddings: string[]
      centeringMethod: string
      example: string
    }
    grids: {
      common: Array<{
        name: string
        columns: string
        gap: string
        example: string
      }>
    }
    flex: {
      common: Array<{
        name: string
        direction: string
        justify: string
        align: string
        gap?: string
        example: string
      }>
    }
    spacingScale: {
      type: string
      baseUnit: number
      scale: string[]
      example: string
    }
  }

  // Z-index layers
  layers: {
    base: number
    content: number
    dropdown: number
    sticky: number
    overlay: number
    modal: number
    tooltip: number
    example: string
  }

  // Animation system
  animations: {
    durations: {
      fast: string
      normal: string
      slow: string
    }
    easing: {
      common: string[]
      recommended: string
    }
    transitions: Array<{
      name: string
      properties: string[]
      timing: string
      example: string
    }>
    transforms: Array<{
      name: string
      value: string
      context: string
    }>
  }

  // AI instructions
  instructions: {
    howToUseColors: string
    howToUseTypography: string
    howToUseSpacing: string
    howToCreateButton: string
    howToCreateInput: string
    howToCreateCard: string
    howToHandleLayout: string
    howToHandleAnimations: string
  }
}

/**
 * Convert scan result to LLM-optimized format
 */
export function exportForLLM(scanResult: ScanJobResult): LLMDesignSystemExport {
  const { curatedTokens, components, layoutPatterns, zIndexSystem, animations } = scanResult

  // Separate colors by type
  const brandColors = curatedTokens?.colors.filter(c =>
    c.semantic?.toLowerCase().includes('primary') ||
    c.semantic?.toLowerCase().includes('brand') ||
    c.semantic?.toLowerCase().includes('accent')
  ) || []

  const neutralColors = curatedTokens?.colors.filter(c =>
    c.semantic?.toLowerCase().includes('gray') ||
    c.semantic?.toLowerCase().includes('neutral')
  ) || []

  const semanticColors = curatedTokens?.colors.filter(c =>
    !brandColors.includes(c) && !neutralColors.includes(c)
  ) || []

  return {
    metadata: {
      domain: scanResult.domain,
      scannedAt: new Date().toISOString(),
      confidence: scanResult.summary.confidence,
      completeness: scanResult.summary.completeness
    },

    tokens: {
      colors: {
        brand: brandColors.slice(0, 3).map(c => ({
          name: c.semantic || 'Brand Color',
          hex: String(c.value),
          usage: `${c.percentage}% of colors`
        })),
        neutral: neutralColors.slice(0, 5).map(c => ({
          name: c.semantic || 'Neutral',
          hex: String(c.value),
          usage: `${c.percentage}% of colors`
        })),
        semantic: semanticColors.slice(0, 4).map(c => ({
          name: c.semantic || 'Color',
          hex: String(c.value),
          usage: `${c.percentage}% of colors`,
          purpose: inferColorPurpose(c.semantic || '')
        }))
      },

      typography: {
        families: curatedTokens?.typography.families.map(f => ({
          name: String(f.value),
          usage: `${f.percentage}% of text`,
          semantic: f.semantic || 'Body'
        })) || [],
        scale: curatedTokens?.typography.sizes.map(s => ({
          size: String(s.value),
          semantic: s.semantic || 'Medium',
          usage: `${s.percentage}% of text`
        })) || [],
        weights: curatedTokens?.typography.weights.map(w => ({
          weight: String(w.value),
          semantic: w.semantic || 'Regular'
        })) || []
      },

      spacing: {
        scale: layoutPatterns?.spacing.scale || [],
        baseUnit: layoutPatterns?.spacing.baseUnit || 8,
        system: layoutPatterns?.spacing.type || 'custom',
        common: curatedTokens?.spacing.slice(0, 8).map(s => ({
          value: String(s.value),
          semantic: s.semantic || 'Medium',
          usage: `${s.percentage}% of spacing`
        })) || []
      },

      radius: curatedTokens?.radius.map(r => ({
        value: String(r.value),
        semantic: r.semantic || 'Rounded',
        usage: `${r.percentage}% of borders`
      })) || [],

      shadows: curatedTokens?.shadows.map(s => ({
        css: String(s.value),
        semantic: s.semantic || 'Shadow',
        usage: `${s.percentage}% of shadows`
      })) || []
    },

    components: {
      buttons: components?.buttons.slice(0, 5).map(btn => ({
        variant: btn.variant || 'default',
        description: `${btn.variant} button - used ${btn.usage} times`,
        css: {
          base: flattenComponentCSS(btn.properties),
          hover: btn.properties.hover ? flattenComponentCSS(btn.properties.hover) : undefined,
          active: btn.properties.active ? flattenComponentCSS(btn.properties.active) : undefined,
          focus: btn.properties.focus ? flattenComponentCSS(btn.properties.focus) : undefined,
          disabled: btn.properties.disabled ? flattenComponentCSS(btn.properties.disabled) : undefined
        },
        usage: btn.usage,
        examples: btn.selectors
      })) || [],

      inputs: components?.inputs.slice(0, 3).map(input => ({
        variant: input.variant || 'default',
        description: `${input.variant} input - used ${input.usage} times`,
        css: {
          base: flattenComponentCSS(input.properties),
          focus: input.properties.focus ? flattenComponentCSS(input.properties.focus) : undefined
        },
        usage: input.usage
      })) || [],

      cards: components?.cards.slice(0, 3).map(card => ({
        variant: card.variant || 'default',
        description: `${card.variant} card - used ${card.usage} times`,
        css: flattenComponentCSS(card.properties),
        usage: card.usage
      })) || []
    },

    layout: {
      containers: {
        maxWidths: layoutPatterns?.containers.maxWidths.slice(0, 3).map(w => w.value) || [],
        sidePaddings: layoutPatterns?.containers.sidePaddings.slice(0, 3).map(p => p.value) || [],
        centeringMethod: layoutPatterns?.containers.centeringPattern || 'margin-auto',
        example: generateContainerExample(layoutPatterns?.containers)
      },

      grids: {
        common: layoutPatterns?.grids.commonLayouts.slice(0, 3).map(grid => ({
          name: grid.name,
          columns: grid.columns,
          gap: grid.gap || '1rem',
          example: `display: grid; grid-template-columns: ${grid.columns}; gap: ${grid.gap};`
        })) || []
      },

      flex: {
        common: layoutPatterns?.flex.commonLayouts.slice(0, 5).map(flex => ({
          name: flex.name,
          direction: flex.direction,
          justify: flex.justify,
          align: flex.align,
          gap: flex.gap,
          example: `display: flex; flex-direction: ${flex.direction}; justify-content: ${flex.justify}; align-items: ${flex.align};${flex.gap ? ` gap: ${flex.gap};` : ''}`
        })) || []
      },

      spacingScale: {
        type: layoutPatterns?.spacing.type || 'custom',
        baseUnit: layoutPatterns?.spacing.baseUnit || 8,
        scale: layoutPatterns?.spacing.scale || [],
        example: `Base unit: ${layoutPatterns?.spacing.baseUnit}px. Multiply by [${layoutPatterns?.spacing.multipliers.join(', ')}]`
      }
    },

    layers: {
      base: zIndexSystem?.semanticLayers.base || 1,
      content: zIndexSystem?.semanticLayers.content || 10,
      dropdown: zIndexSystem?.semanticLayers.dropdown || 100,
      sticky: zIndexSystem?.semanticLayers.sticky || 1000,
      overlay: zIndexSystem?.semanticLayers.overlay || 5000,
      modal: zIndexSystem?.semanticLayers.modal || 5000,
      tooltip: zIndexSystem?.semanticLayers.tooltip || 9500,
      example: 'Use modal: 5000 for dialogs, tooltip: 9500 for tooltips, dropdown: 100 for menus'
    },

    animations: {
      durations: {
        fast: animations?.durations.find(d => d.semantic.includes('Fast'))?.value || '150ms',
        normal: animations?.durations.find(d => d.semantic.includes('Normal'))?.value || '300ms',
        slow: animations?.durations.find(d => d.semantic.includes('Slow'))?.value || '500ms'
      },
      easing: {
        common: animations?.timingFunctions.slice(0, 3).map(t => t.value) || ['ease', 'ease-out'],
        recommended: animations?.timingFunctions[0]?.value || 'ease-out'
      },
      transitions: animations?.commonTransitions.slice(0, 5).map(t => ({
        name: t.semantic,
        properties: t.properties,
        timing: `${t.duration} ${t.timing}`,
        example: `transition: ${t.properties.join(', ')} ${t.duration} ${t.timing};`
      })) || [],
      transforms: animations?.transformPatterns.slice(0, 5).map(t => ({
        name: t.context,
        value: t.transform,
        context: t.context
      })) || []
    },

    instructions: {
      howToUseColors: generateColorInstructions(brandColors, neutralColors),
      howToUseTypography: generateTypographyInstructions(curatedTokens?.typography),
      howToUseSpacing: generateSpacingInstructions(layoutPatterns?.spacing),
      howToCreateButton: generateButtonInstructions(components?.buttons[0]),
      howToCreateInput: generateInputInstructions(components?.inputs[0]),
      howToCreateCard: generateCardInstructions(components?.cards[0]),
      howToHandleLayout: generateLayoutInstructions(layoutPatterns),
      howToHandleAnimations: generateAnimationInstructions(animations)
    }
  }
}

/**
 * Helper functions
 */

function flattenComponentCSS(props: any): Record<string, string> {
  const css: Record<string, string> = {}

  if (props.fontSize) css['font-size'] = props.fontSize
  if (props.fontWeight) css['font-weight'] = props.fontWeight
  if (props.lineHeight) css['line-height'] = props.lineHeight
  if (props.letterSpacing) css['letter-spacing'] = props.letterSpacing
  if (props.textTransform) css['text-transform'] = props.textTransform

  if (props.padding) {
    css['padding'] = props.padding
  } else {
    if (props.paddingX) css['padding-inline'] = props.paddingX
    if (props.paddingY) css['padding-block'] = props.paddingY
  }

  if (props.gap) css['gap'] = props.gap

  if (props.borderWidth) css['border-width'] = props.borderWidth
  if (props.borderRadius) css['border-radius'] = props.borderRadius
  if (props.borderColor) css['border-color'] = props.borderColor

  if (props.backgroundColor) css['background-color'] = props.backgroundColor
  if (props.textColor) css['color'] = props.textColor
  if (props.boxShadow) css['box-shadow'] = props.boxShadow

  return css
}

function generateContainerExample(containers?: any): string {
  if (!containers) return 'max-width: 1280px; margin: 0 auto; padding: 0 1rem;'
  const maxWidth = containers.maxWidths[0]?.value || '1280px'
  const padding = containers.sidePaddings[0]?.value || '1rem'
  const centering = containers.centeringPattern === 'flex'
    ? 'display: flex; justify-content: center;'
    : 'margin: 0 auto;'
  return `max-width: ${maxWidth}; ${centering} padding-inline: ${padding};`
}

function inferColorPurpose(semantic: string): string {
  const lower = semantic.toLowerCase()
  if (lower.includes('error') || lower.includes('danger')) return 'error states'
  if (lower.includes('success')) return 'success states'
  if (lower.includes('warning')) return 'warning states'
  if (lower.includes('info')) return 'informational states'
  if (lower.includes('background')) return 'backgrounds'
  if (lower.includes('text')) return 'text content'
  if (lower.includes('border')) return 'borders and dividers'
  return 'general use'
}

function generateColorInstructions(brand: any[], neutral: any[]): string {
  const brandHex = brand[0]?.hex || '#3b82f6'
  const neutralHex = neutral[0]?.hex || '#6b7280'
  return `Primary brand color is ${brandHex}. Use for CTAs, links, and key actions. Neutral colors like ${neutralHex} are for text and backgrounds. Always maintain proper contrast ratios (4.5:1 for text).`
}

function generateTypographyInstructions(typography?: any): string {
  if (!typography) return 'Use system fonts with appropriate sizing.'
  const family = typography.families[0]?.name || 'system-ui'
  const baseSize = typography.sizes.find((s: any) => s.semantic.includes('Base'))?.size || '16px'
  return `Font family: ${family}. Base size: ${baseSize}. Scale up for headings (1.25x, 1.5x, 2x), scale down for small text (0.875x, 0.75x). Use font-weight 400 for body, 600 for emphasis, 700 for headings.`
}

function generateSpacingInstructions(spacing?: any): string {
  if (!spacing) return 'Use 8px base unit for spacing (8px, 16px, 24px, 32px).'
  return `Spacing system: ${spacing.type}. Base unit: ${spacing.baseUnit}px. Common values: ${spacing.scale.slice(0, 6).join(', ')}. Use smaller values (4-8px) for tight spacing, medium values (16-24px) for component padding, large values (32-48px) for section spacing.`
}

function generateButtonInstructions(button?: any): string {
  if (!button) return 'Create buttons with padding, border-radius, and hover states.'
  const css = button.css.base
  return `Button style: padding ${css['padding-inline']} horizontal, ${css['padding-block']} vertical. Border radius: ${css['border-radius']}. Background: ${css['background-color']}, text: ${css['color']}. On hover: ${button.css.hover?.['background-color'] || 'darken by 10%'}. Font weight: ${css['font-weight']}.`
}

function generateInputInstructions(input?: any): string {
  if (!input) return 'Create inputs with border, padding, and focus states.'
  const css = input.css.base
  return `Input style: padding ${css['padding']}, border ${css['border-width']} solid ${css['border-color']}, border-radius ${css['border-radius']}. On focus: add focus ring with ${input.css.focus?.['box-shadow'] || 'subtle shadow'}.`
}

function generateCardInstructions(card?: any): string {
  if (!card) return 'Create cards with padding, border-radius, and shadow.'
  const css = card.css
  return `Card style: padding ${css['padding']}, border-radius ${css['border-radius']}, background ${css['background-color']}, box-shadow ${css['box-shadow']}. Use for content grouping.`
}

function generateLayoutInstructions(layout?: any): string {
  if (!layout) return 'Use flexbox or grid for layouts. Center content with max-width containers.'
  return `Container: max-width ${layout.containers.maxWidths[0]}, centered with ${layout.containers.centeringMethod}. For grids: ${layout.grids.common[0]?.example}. For flex: ${layout.flex.common[0]?.example}. Spacing: ${layout.spacingScale.baseUnit}px base unit.`
}

function generateAnimationInstructions(animations?: any): string {
  if (!animations) return 'Use 300ms ease-out transitions for smooth interactions.'
  return `Animation timing: fast (${animations.durations.fast}), normal (${animations.durations.normal}), slow (${animations.durations.slow}). Easing: ${animations.easing.recommended}. Common transitions: ${animations.transitions[0]?.example}. On hover: ${animations.transforms[0]?.value}.`
}