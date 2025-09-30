/**
 * AI-Optimized Design Token Prompt Pack
 * Ultra-efficient, token-conscious output for LLM consumption
 * Follows lean JSON core principles with semantic structure
 */

import type { W3CTokenSet, TokenExtractionResult } from './w3c-tokenizer'
import type { parseColor, rgbToHsl } from './color-utils'

export interface AiPromptPack {
  meta: {
    theme_id: string
    version: string
    generated_at: string
    base_unit: number
    modes: string[]
    densities: string[]
    rank_method: string
    etag: string
  }
  invariants: {
    spacing_ratio: number
    radius_ratio: number
    typography_scale: string
    typography_base_px: number
    contrast_min: number
  }
  scales: {
    spacing_px: number[]
    radius_px: number[]
    z: Record<string, number>
  }
  type: {
    families: Record<string, string[]>
    stacks: Record<string, {
      fam: string
      w: number
      lh: number
      ls: number
    }>
    sizes_px: Record<string, number>
  }
  color: {
    raw: Record<string, {
      hex: string
      ok: [number, number, number]
    }>
    semantic: {
      bg: Record<string, ColorRef>
      fg: Record<string, ColorRef>
      border: Record<string, ColorRef>
      accent?: Record<string, ColorRef>
    }
  }
  effects: {
    shadow: Record<string, string>
    motion: {
      ease: Record<string, string>
      dur_ms: Record<string, number>
    }
  }
  layout: {
    breakpoints_px: Record<string, number>
    container_gutter_px: Record<string, number>
    max_width_px?: number
    grid_cols?: number
  }
  modes: Record<string, { contrast_boost: boolean }>
  density: Record<string, { mult: number }>
  usage: {
    weights: Record<string, number>
    top_k: number
  }
  aliases: Record<string, string>
  constraints: {
    min_tap_px: number
    min_text_contrast: number
    btn_radius_pref: string
    grid_base_px: number
  }
  patterns: {
    component_archetypes: string[]
    layout_system: string
    nav_pattern: string
    card_pattern?: string
  }
}

interface ColorRef {
  ref?: string
  hex?: string
  ok?: [number, number, number]
  byMode?: Record<string, string>
}

/**
 * Generate ultra-lean AI prompt pack from W3C tokens
 */
export function buildAiPromptPack(
  extraction: TokenExtractionResult,
  metadata: {
    domain: string
    url: string
  }
): AiPromptPack {
  const tokenSet = extraction.tokenSet

  // Extract base unit from spacing analysis
  const baseUnit = extraction.insights.spacingSystem.base || 4

  // Build spacing scale from actual tokens
  const spacingScale = extractSpacingScale(tokenSet)
  const radiusScale = extractRadiusScale(tokenSet)

  // Extract color palette with OKLCH conversion
  const { rawColors, semanticColors, colorUsage } = extractColorSystem(tokenSet, extraction.summary.byCategory.color || 0)

  // Extract typography system
  const typographySystem = extractTypographySystem(tokenSet)

  // Extract effects
  const effects = extractEffects(tokenSet)

  // Build usage weights
  const usageWeights = buildUsageWeights(tokenSet)

  // Generate semantic aliases
  const aliases = buildSemanticAliases(tokenSet)

  // Detect patterns and archetypes
  const patterns = detectPatterns(metadata.domain, tokenSet)

  // Create etag from content hash
  const etag = generateEtag(metadata.domain, extraction.tokenSet)

  const pack: AiPromptPack = {
    meta: {
      theme_id: slugify(metadata.domain),
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      base_unit: baseUnit,
      modes: ['dark', 'light'],
      densities: ['compact', 'normal', 'spacious'],
      rank_method: 'freq_vis@viewport',
      etag
    },
    invariants: {
      spacing_ratio: detectRatio(spacingScale),
      radius_ratio: detectRatio(radiusScale),
      typography_scale: extraction.insights.typeScale.scale || 'modular',
      typography_base_px: 16,
      contrast_min: 4.5
    },
    scales: {
      spacing_px: spacingScale,
      radius_px: radiusScale,
      z: {
        base: 0,
        dropdown: 1000,
        sticky: 1100,
        overlay: 1200,
        modal: 1300,
        popover: 1400,
        tooltip: 1500
      }
    },
    type: typographySystem,
    color: {
      raw: rawColors,
      semantic: semanticColors
    },
    effects,
    layout: {
      breakpoints_px: {
        xs: 360,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536
      },
      container_gutter_px: {
        sm: 16,
        md: 24,
        lg: 32
      }
    },
    modes: {
      dark: { contrast_boost: true },
      light: { contrast_boost: false }
    },
    density: {
      compact: { mult: 0.9 },
      normal: { mult: 1.0 },
      spacious: { mult: 1.1 }
    },
    usage: {
      weights: usageWeights,
      top_k: Math.min(48, Object.keys(usageWeights).length)
    },
    aliases,
    constraints: {
      min_tap_px: 44,
      min_text_contrast: 4.5,
      btn_radius_pref: 'radius.2',
      grid_base_px: baseUnit
    },
    patterns
  }

  return pack
}

/**
 * Extract spacing scale from tokens
 */
function extractSpacingScale(tokenSet: W3CTokenSet): number[] {
  const spacings = new Set<number>()

  if (tokenSet.dimension) {
    Object.values(tokenSet.dimension).forEach(token => {
      if (typeof token === 'object' && '$value' in token) {
        const value = token.$value as { value: number; unit: string }
        if (value.unit === 'px') {
          spacings.add(value.value)
        } else if (value.unit === 'rem') {
          spacings.add(value.value * 16)
        }
      }
    })
  }

  const sorted = Array.from(spacings).sort((a, b) => a - b)

  // Return canonical scale or detected scale
  if (sorted.length === 0) {
    return [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
  }

  return sorted.slice(0, 12) // Top 12 most common
}

/**
 * Extract radius scale
 */
function extractRadiusScale(tokenSet: W3CTokenSet): number[] {
  const radii = new Set<number>()

  if (tokenSet.radius) {
    Object.values(tokenSet.radius).forEach(token => {
      if (typeof token === 'object' && '$value' in token) {
        const value = token.$value as { value: number; unit: string }
        if (value.unit === 'px') {
          radii.add(value.value)
        }
      }
    })
  }

  const sorted = Array.from(radii).sort((a, b) => a - b)

  if (sorted.length === 0) {
    return [0, 2, 4, 6, 8, 12, 16, 24, 9999]
  }

  return [...sorted, 9999] // Add "full" at end
}

/**
 * Extract and organize color system
 */
function extractColorSystem(tokenSet: W3CTokenSet, totalColors: number): {
  rawColors: Record<string, { hex: string; ok: [number, number, number] }>
  semanticColors: AiPromptPack['color']['semantic']
  colorUsage: Record<string, number>
} {
  const rawColors: Record<string, { hex: string; ok: [number, number, number] }> = {}
  const colorUsage: Record<string, number> = {}

  if (tokenSet.color) {
    Object.entries(tokenSet.color).forEach(([name, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        const w3cColor = token.$value as { colorSpace: string; components: number[] }
        const hex = rgbToHex(w3cColor.components)
        const oklch = rgbToOklch(w3cColor.components)

        const shortName = shortenColorName(name)
        rawColors[shortName] = {
          hex,
          ok: oklch
        }

        // Track usage
        const extensions = (token as any).$extensions
        if (extensions && extensions['contextds.usage']) {
          colorUsage[shortName] = extensions['contextds.usage']
        }
      }
    })
  }

  // Build semantic color mapping
  const semanticColors = buildSemanticColorMap(rawColors, colorUsage)

  return { rawColors, semanticColors, colorUsage }
}

/**
 * Convert RGB to hex string
 */
function rgbToHex(components: number[]): string {
  const r = Math.round(components[0] * 255)
  const g = Math.round(components[1] * 255)
  const b = Math.round(components[2] * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
}

/**
 * Convert RGB to OKLCH (simplified approximation for now)
 */
function rgbToOklch(components: number[]): [number, number, number] {
  // This is a simplified conversion
  // For production, use proper color space conversion library
  const r = components[0]
  const g = components[1]
  const b = components[2]

  // Rough approximation of OKLCH
  const l = Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 100)
  const c = Math.round(Math.sqrt((r - 0.5) ** 2 + (g - 0.5) ** 2 + (b - 0.5) ** 2) * 40)
  const h = Math.round(Math.atan2(b - 0.5, r - 0.5) * 180 / Math.PI + 180)

  return [l, c, h]
}

/**
 * Shorten color names for efficiency
 */
function shortenColorName(name: string): string {
  return name
    .replace('color-', '')
    .replace('gray-', 'g')
    .replace('grey-', 'g')
    .replace('red-', 'r')
    .replace('blue-', 'b')
    .replace('green-', 'gn')
    .replace('yellow-', 'y')
    .replace('purple-', 'p')
    .replace('orange-', 'o')
    .replace('pink-', 'pk')
    .replace('cyan-', 'c')
    .replace('base-', '')
    .replace('light-', 'l')
    .replace('dark-', 'd')
}

/**
 * Build semantic color mapping from raw colors
 */
function buildSemanticColorMap(
  rawColors: Record<string, { hex: string; ok: [number, number, number] }>,
  usage: Record<string, number>
): AiPromptPack['color']['semantic'] {
  // Sort colors by usage and lightness
  const sorted = Object.entries(rawColors).sort((a, b) => {
    const usageA = usage[a[0]] || 0
    const usageB = usage[b[0]] || 0
    return usageB - usageA
  })

  // Pick semantic colors based on usage and lightness
  const darkBg = sorted.find(([_, c]) => c.ok[0] < 30)?.[0]
  const lightBg = sorted.find(([_, c]) => c.ok[0] > 90)?.[0]
  const darkFg = sorted.find(([_, c]) => c.ok[0] < 30)?.[0]
  const lightFg = sorted.find(([_, c]) => c.ok[0] > 90)?.[0]
  const accent = sorted.find(([_, c]) => c.ok[1] > 20 && c.ok[0] > 40 && c.ok[0] < 70)?.[0]
  const border = sorted.find(([_, c]) => c.ok[0] > 30 && c.ok[0] < 50)?.[0]

  return {
    bg: {
      base: darkBg ? { ref: darkBg, byMode: { light: lightBg || '#FFFFFF' } } : { hex: '#000000' },
      surface: { hex: '#111111', byMode: { light: '#FFFFFF' } },
      muted: { hex: '#1A1A1A', byMode: { light: '#F5F5F5' } },
      ...(accent ? { accent: { ref: accent } } : {})
    },
    fg: {
      base: lightFg ? { ref: lightFg, byMode: { light: darkFg || '#000000' } } : { hex: '#FFFFFF' },
      muted: { hex: '#A0A0A0', byMode: { light: '#606060' } },
      ...(accent ? { onAccent: { hex: '#FFFFFF' } } : {})
    },
    border: {
      subtle: border ? { ref: border, byMode: { light: '#E5E5E5' } } : { hex: '#2A2A2A' },
      strong: { hex: '#404040', byMode: { light: '#D0D0D0' } }
    }
  }
}

/**
 * Extract typography system
 */
function extractTypographySystem(tokenSet: W3CTokenSet): AiPromptPack['type'] {
  const families: Record<string, string[]> = {}
  const sizes: Record<string, number> = {}

  if (tokenSet.typography) {
    Object.entries(tokenSet.typography).forEach(([name, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        const value = token.$value

        // Font family
        if (Array.isArray(value)) {
          const key = name.includes('mono') ? 'mono' : 'sans'
          families[key] = value
        }

        // Font size
        if (typeof value === 'object' && 'value' in value) {
          const dim = value as { value: number; unit: string }
          if (dim.unit === 'px') {
            const sizeKey = name.replace(/^text-/, '').replace(/-\d+$/, '')
            sizes[sizeKey] = dim.value
          }
        }
      }
    })
  }

  // Ensure defaults
  if (!families.sans) {
    families.sans = ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
  }
  if (!families.mono) {
    families.mono = ['ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace']
  }

  return {
    families,
    stacks: {
      body: { fam: 'sans', w: 400, lh: 1.6, ls: 0 },
      heading: { fam: 'sans', w: 700, lh: 1.25, ls: -0.01 },
      code: { fam: 'mono', w: 500, lh: 1.5, ls: 0 }
    },
    sizes_px: Object.keys(sizes).length > 0 ? sizes : {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      '2xl': 30,
      '3xl': 36
    }
  }
}

/**
 * Extract effects (shadows, motion)
 */
function extractEffects(tokenSet: W3CTokenSet): AiPromptPack['effects'] {
  const shadows: Record<string, string> = {}
  const durations: Record<string, number> = {}

  if (tokenSet.shadow) {
    Object.entries(tokenSet.shadow).forEach(([name, token]) => {
      if (typeof token === 'object' && '$extensions' in token) {
        const original = (token.$extensions as any)?.['contextds.original']
        if (original) {
          const key = name.replace(/^shadow-/, '').replace(/-\d+$/, '')
          shadows[key] = original
        }
      }
    })
  }

  if (tokenSet.duration) {
    Object.entries(tokenSet.duration).forEach(([name, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        const value = token.$value as string
        const ms = parseInt(value.replace('ms', ''))
        const key = name.replace(/^duration-/, '').replace(/-\d+$/, '')
        durations[key] = ms
      }
    })
  }

  return {
    shadow: Object.keys(shadows).length > 0 ? shadows : {
      '1': '0 1px 2px rgba(0,0,0,.1)',
      '2': '0 2px 8px rgba(0,0,0,.15)',
      '3': '0 8px 24px rgba(0,0,0,.2)'
    },
    motion: {
      ease: {
        std: 'cubic-bezier(0.2,0,0,1)',
        emp: 'cubic-bezier(0.2,0,0,1)'
      },
      dur_ms: Object.keys(durations).length > 0 ? durations : {
        fast: 120,
        base: 180,
        slow: 260
      }
    }
  }
}

/**
 * Build usage weights from token metadata
 */
function buildUsageWeights(tokenSet: W3CTokenSet): Record<string, number> {
  const weights: Record<string, number> = {}
  let maxUsage = 1

  // Find max usage across all tokens
  Object.values(tokenSet).forEach(category => {
    if (typeof category === 'object' && category !== null) {
      Object.values(category).forEach(token => {
        if (typeof token === 'object' && '$extensions' in token) {
          const usage = (token.$extensions as any)?.['contextds.usage'] || 0
          maxUsage = Math.max(maxUsage, usage)
        }
      })
    }
  })

  // Calculate normalized weights
  Object.entries(tokenSet).forEach(([categoryName, category]) => {
    if (typeof category === 'object' && category !== null && categoryName !== '$schema' && categoryName !== '$metadata') {
      Object.entries(category).forEach(([tokenName, token]) => {
        if (typeof token === 'object' && '$extensions' in token) {
          const usage = (token.$extensions as any)?.['contextds.usage'] || 0
          const weight = Math.round((usage / maxUsage) * 100) / 100
          weights[`${categoryName}.${tokenName}`] = weight
        }
      })
    }
  })

  // Sort by weight and take top entries
  const sorted = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 64)

  return Object.fromEntries(sorted)
}

/**
 * Build semantic aliases for common UI patterns
 */
function buildSemanticAliases(tokenSet: W3CTokenSet): Record<string, string> {
  const aliases: Record<string, string> = {}

  // Common UI component aliases
  aliases['button.primary.bg'] = 'color.bg.accent'
  aliases['button.primary.fg'] = 'color.fg.onAccent'
  aliases['button.secondary.bg'] = 'color.bg.muted'
  aliases['button.secondary.fg'] = 'color.fg.base'

  aliases['card.bg'] = 'color.bg.surface'
  aliases['card.border'] = 'color.border.subtle'

  aliases['input.bg'] = 'color.bg.surface'
  aliases['input.border'] = 'color.border.subtle'
  aliases['input.border.focus'] = 'color.border.strong'

  aliases['text.body'] = 'type.stacks.body'
  aliases['text.heading'] = 'type.stacks.heading'
  aliases['text.code'] = 'type.stacks.code'

  return aliases
}

/**
 * Detect UI patterns and archetypes
 */
function detectPatterns(domain: string, tokenSet: W3CTokenSet): AiPromptPack['patterns'] {
  // Simplified pattern detection
  // In production, this would analyze layout DNA and component usage

  return {
    component_archetypes: [
      'button',
      'card',
      'input',
      'navigation',
      'modal'
    ],
    layout_system: 'flex-grid-hybrid',
    nav_pattern: 'horizontal-primary',
    card_pattern: 'elevated-surface'
  }
}

/**
 * Detect ratio between scale values
 */
function detectRatio(scale: number[]): number {
  if (scale.length < 2) return 1.25

  const ratios = []
  for (let i = 1; i < scale.length; i++) {
    if (scale[i - 1] > 0) {
      ratios.push(scale[i] / scale[i - 1])
    }
  }

  if (ratios.length === 0) return 1.25

  // Return median ratio
  ratios.sort((a, b) => a - b)
  const mid = Math.floor(ratios.length / 2)
  return Math.round(ratios[mid] * 100) / 100
}

/**
 * Generate etag for caching
 */
function generateEtag(domain: string, tokenSet: W3CTokenSet): string {
  const content = JSON.stringify(tokenSet)
  const hash = content.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return `${slugify(domain)}-${Math.abs(hash).toString(36)}`
}

/**
 * Slugify string
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}