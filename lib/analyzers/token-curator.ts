/**
 * Token Curator - Filters and ranks design tokens by actual usage
 * Returns only the most important, frequently-used tokens that define the design system
 */

import type { W3CTokenSet, TokenExtractionResult } from './w3c-tokenizer'

export interface CuratedTokenSet {
  colors: CuratedToken[]
  typography: {
    families: CuratedToken[]
    sizes: CuratedToken[]
    weights: CuratedToken[]
  }
  spacing: CuratedToken[]
  radius: CuratedToken[]
  shadows: CuratedToken[]
  motion: CuratedToken[]
}

export interface CuratedToken {
  name: string
  value: string | object
  usage: number
  confidence: number
  percentage: number
  category: string
  semantic?: string
  preview?: {
    type: 'color' | 'font' | 'dimension' | 'shadow'
    data: any
  }
}

export interface CurationConfig {
  maxColors?: number  // undefined = return all
  maxFonts?: number
  maxSizes?: number
  maxSpacing?: number
  maxRadius?: number
  maxShadows?: number
  maxMotion?: number
  minUsage: number
  minConfidence: number
  returnAllFiltered?: boolean  // If true, return all tokens that pass filters
}

const DEFAULT_CONFIG: CurationConfig = {
  maxColors: undefined,  // Return all by default
  maxFonts: undefined,
  maxSizes: undefined,
  maxSpacing: undefined,
  maxRadius: undefined,
  maxShadows: undefined,
  maxMotion: undefined,
  minUsage: 2,
  minConfidence: 60,
  returnAllFiltered: true  // Return all filtered tokens
}

/**
 * Curate tokens from W3C token set - return only the most important ones
 */
export function curateTokens(
  tokenSet: W3CTokenSet,
  config: Partial<CurationConfig> = {}
): CuratedTokenSet {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  return {
    colors: curateColors(tokenSet, cfg),
    typography: curateTypography(tokenSet, cfg),
    spacing: curateSpacing(tokenSet, cfg),
    radius: curateRadius(tokenSet, cfg),
    shadows: curateShadows(tokenSet, cfg),
    motion: curateMotion(tokenSet, cfg)
  }
}

/**
 * Curate colors - top N most used
 */
function curateColors(tokenSet: W3CTokenSet, config: CurationConfig): CuratedToken[] {
  if (!tokenSet.color) return []

  const tokens: CuratedToken[] = []
  let totalUsage = 0

  // Collect all color tokens with usage
  Object.entries(tokenSet.color).forEach(([name, token]) => {
    if (typeof token !== 'object' || !('$value' in token)) return

    const extensions = (token as any).$extensions
    const usage = extensions?.['contextds.usage'] || 0
    const confidence = extensions?.['contextds.confidence'] || 0
    const original = extensions?.['contextds.original']

    if (usage < config.minUsage || confidence < config.minConfidence) return

    totalUsage += usage

    const w3cColor = token.$value as { colorSpace: string; components: number[] }
    const hex = rgbComponentsToHex(w3cColor.components)

    tokens.push({
      name,
      value: hex,
      usage,
      confidence,
      percentage: 0, // Will calculate after
      category: 'color',
      semantic: inferColorSemantic(name, hex),
      preview: {
        type: 'color',
        data: {
          hex,
          rgb: componentsToRgb(w3cColor.components),
          oklch: rgbToOklch(w3cColor.components)
        }
      }
    })
  })

  // Calculate percentages
  tokens.forEach(token => {
    token.percentage = totalUsage > 0 ? Math.round((token.usage / totalUsage) * 100) : 0
  })

  // Sort by usage
  const sorted = tokens.sort((a, b) => b.usage - a.usage)

  // Return all or slice to max
  return config.maxColors && !config.returnAllFiltered
    ? sorted.slice(0, config.maxColors)
    : sorted
}

/**
 * Curate typography tokens
 */
function curateTypography(tokenSet: W3CTokenSet, config: CurationConfig): CuratedTokenSet['typography'] {
  if (!tokenSet.typography) {
    return { families: [], sizes: [], weights: [] }
  }

  const families: CuratedToken[] = []
  const sizes: CuratedToken[] = []
  const weights: CuratedToken[] = []
  let totalFamilyUsage = 0
  let totalSizeUsage = 0
  let totalWeightUsage = 0

  Object.entries(tokenSet.typography).forEach(([name, token]) => {
    if (typeof token !== 'object' || !('$value' in token)) return

    const extensions = (token as any).$extensions
    const usage = extensions?.['contextds.usage'] || 0
    const confidence = extensions?.['contextds.confidence'] || 0

    if (usage < config.minUsage || confidence < config.minConfidence) return

    const type = (token as any).$type

    // Font families
    if (type === 'fontFamily') {
      totalFamilyUsage += usage
      const familyArray = Array.isArray(token.$value) ? token.$value : [token.$value]
      const primaryFamily = familyArray[0]

      families.push({
        name,
        value: primaryFamily,
        usage,
        confidence,
        percentage: 0,
        category: 'typography-family',
        semantic: inferFontSemantic(primaryFamily),
        preview: {
          type: 'font',
          data: {
            family: primaryFamily,
            stack: familyArray.slice(0, 3).join(', '),
            sample: 'The quick brown fox jumps over the lazy dog'
          }
        }
      })
    }

    // Font sizes
    if (type === 'dimension' && name.includes('size')) {
      totalSizeUsage += usage
      const dim = token.$value as { value: number; unit: string }
      const displayValue = `${dim.value}${dim.unit}`

      sizes.push({
        name,
        value: displayValue,
        usage,
        confidence,
        percentage: 0,
        category: 'typography-size',
        semantic: inferSizeSemantic(dim.value, dim.unit),
        preview: {
          type: 'dimension',
          data: {
            pixels: dim.unit === 'rem' ? dim.value * 16 : dim.value,
            scale: inferSizeSemantic(dim.value, dim.unit)
          }
        }
      })
    }

    // Font weights
    if (type === 'fontWeight') {
      totalWeightUsage += usage
      const weight = typeof token.$value === 'number' ? token.$value : parseInt(String(token.$value))

      weights.push({
        name,
        value: String(weight),
        usage,
        confidence,
        percentage: 0,
        category: 'typography-weight',
        semantic: inferWeightSemantic(weight)
      })
    }
  })

  // Calculate percentages
  families.forEach(t => t.percentage = totalFamilyUsage > 0 ? Math.round((t.usage / totalFamilyUsage) * 100) : 0)
  sizes.forEach(t => t.percentage = totalSizeUsage > 0 ? Math.round((t.usage / totalSizeUsage) * 100) : 0)
  weights.forEach(t => t.percentage = totalWeightUsage > 0 ? Math.round((t.usage / totalWeightUsage) * 100) : 0)

  const sortedFamilies = families.sort((a, b) => b.usage - a.usage)
  const sortedSizes = sizes.sort((a, b) => b.usage - a.usage)
  const sortedWeights = weights.sort((a, b) => b.usage - a.usage)

  return {
    families: config.maxFonts && !config.returnAllFiltered ? sortedFamilies.slice(0, config.maxFonts) : sortedFamilies,
    sizes: config.maxSizes && !config.returnAllFiltered ? sortedSizes.slice(0, config.maxSizes) : sortedSizes,
    weights: config.returnAllFiltered ? sortedWeights : sortedWeights.slice(0, 4)
  }
}

/**
 * Curate spacing tokens
 */
function curateSpacing(tokenSet: W3CTokenSet, config: CurationConfig): CuratedToken[] {
  if (!tokenSet.dimension) return []

  const tokens: CuratedToken[] = []
  let totalUsage = 0

  Object.entries(tokenSet.dimension).forEach(([name, token]) => {
    if (typeof token !== 'object' || !('$value' in token)) return
    if (name.includes('radius')) return // Skip radius tokens

    const extensions = (token as any).$extensions
    const usage = extensions?.['contextds.usage'] || 0
    const confidence = extensions?.['contextds.confidence'] || 0

    if (usage < config.minUsage || confidence < config.minConfidence) return

    totalUsage += usage

    const dim = token.$value as { value: number; unit: string }
    const displayValue = `${dim.value}${dim.unit}`

    tokens.push({
      name,
      value: displayValue,
      usage,
      confidence,
      percentage: 0,
      category: 'spacing',
      semantic: inferSpacingSemantic(dim.value, dim.unit),
      preview: {
        type: 'dimension',
        data: {
          pixels: dim.unit === 'rem' ? dim.value * 16 : dim.value
        }
      }
    })
  })

  tokens.forEach(t => t.percentage = totalUsage > 0 ? Math.round((t.usage / totalUsage) * 100) : 0)

  const sorted = tokens.sort((a, b) => b.usage - a.usage)
  return config.maxSpacing && !config.returnAllFiltered ? sorted.slice(0, config.maxSpacing) : sorted
}

/**
 * Curate radius tokens
 */
function curateRadius(tokenSet: W3CTokenSet, config: CurationConfig): CuratedToken[] {
  if (!tokenSet.radius && !tokenSet.dimension) return []

  const tokens: CuratedToken[] = []
  let totalUsage = 0

  // Check both radius and dimension categories
  const sources = [
    ...(tokenSet.radius ? Object.entries(tokenSet.radius) : []),
    ...(tokenSet.dimension ? Object.entries(tokenSet.dimension).filter(([name]) => name.includes('radius')) : [])
  ]

  sources.forEach(([name, token]) => {
    if (typeof token !== 'object' || !('$value' in token)) return

    const extensions = (token as any).$extensions
    const usage = extensions?.['contextds.usage'] || 0
    const confidence = extensions?.['contextds.confidence'] || 0

    if (usage < config.minUsage || confidence < config.minConfidence) return

    totalUsage += usage

    const dim = token.$value as { value: number; unit: string }
    const displayValue = `${dim.value}${dim.unit}`

    tokens.push({
      name,
      value: displayValue,
      usage,
      confidence,
      percentage: 0,
      category: 'radius',
      semantic: inferRadiusSemantic(dim.value, dim.unit),
      preview: {
        type: 'dimension',
        data: {
          pixels: dim.unit === 'rem' ? dim.value * 16 : dim.value
        }
      }
    })
  })

  tokens.forEach(t => t.percentage = totalUsage > 0 ? Math.round((t.usage / totalUsage) * 100) : 0)

  const sorted = tokens.sort((a, b) => b.usage - a.usage)
  return config.maxRadius && !config.returnAllFiltered ? sorted.slice(0, config.maxRadius) : sorted
}

/**
 * Curate shadow tokens
 */
function curateShadows(tokenSet: W3CTokenSet, config: CurationConfig): CuratedToken[] {
  if (!tokenSet.shadow) return []

  const tokens: CuratedToken[] = []
  let totalUsage = 0

  Object.entries(tokenSet.shadow).forEach(([name, token]) => {
    if (typeof token !== 'object' || !('$value' in token)) return

    const extensions = (token as any).$extensions
    const usage = extensions?.['contextds.usage'] || 0
    const confidence = extensions?.['contextds.confidence'] || 0
    const original = extensions?.['contextds.original']

    if (usage < config.minUsage || confidence < config.minConfidence) return

    totalUsage += usage

    tokens.push({
      name,
      value: original || String(token.$value),
      usage,
      confidence,
      percentage: 0,
      category: 'shadow',
      semantic: inferShadowSemantic(name, original),
      preview: {
        type: 'shadow',
        data: {
          css: original || String(token.$value)
        }
      }
    })
  })

  tokens.forEach(t => t.percentage = totalUsage > 0 ? Math.round((t.usage / totalUsage) * 100) : 0)

  const sorted = tokens.sort((a, b) => b.usage - a.usage)
  return config.maxShadows && !config.returnAllFiltered ? sorted.slice(0, config.maxShadows) : sorted
}

/**
 * Curate motion tokens
 */
function curateMotion(tokenSet: W3CTokenSet, config: CurationConfig): CuratedToken[] {
  if (!tokenSet.duration) return []

  const tokens: CuratedToken[] = []
  let totalUsage = 0

  Object.entries(tokenSet.duration).forEach(([name, token]) => {
    if (typeof token !== 'object' || !('$value' in token)) return

    const extensions = (token as any).$extensions
    const usage = extensions?.['contextds.usage'] || 0
    const confidence = extensions?.['contextds.confidence'] || 0

    if (usage < config.minUsage || confidence < config.minConfidence) return

    totalUsage += usage

    tokens.push({
      name,
      value: String(token.$value),
      usage,
      confidence,
      percentage: 0,
      category: 'motion',
      semantic: inferDurationSemantic(String(token.$value))
    })
  })

  tokens.forEach(t => t.percentage = totalUsage > 0 ? Math.round((t.usage / totalUsage) * 100) : 0)

  const sorted = tokens.sort((a, b) => b.usage - a.usage)
  return config.maxMotion && !config.returnAllFiltered ? sorted.slice(0, config.maxMotion) : sorted
}

/**
 * Semantic inference helpers
 */

function inferColorSemantic(name: string, hex: string): string {
  const lower = name.toLowerCase()

  if (lower.includes('primary') || lower.includes('accent')) return 'Primary/Accent'
  if (lower.includes('background') || lower.includes('bg')) return 'Background'
  if (lower.includes('foreground') || lower.includes('fg') || lower.includes('text')) return 'Text'
  if (lower.includes('border')) return 'Border'
  if (lower.includes('error') || lower.includes('danger') || lower.includes('red')) return 'Error/Danger'
  if (lower.includes('success') || lower.includes('green')) return 'Success'
  if (lower.includes('warning') || lower.includes('yellow')) return 'Warning'
  if (lower.includes('info') || lower.includes('blue')) return 'Info'

  // Infer from hex lightness
  const rgb = hexToRgb(hex)
  if (!rgb) return 'Color'

  const lightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114)
  if (lightness < 50) return 'Dark'
  if (lightness > 200) return 'Light'

  return 'Color'
}

function inferFontSemantic(family: string): string {
  const lower = family.toLowerCase()

  if (lower.includes('mono') || lower.includes('code') || lower.includes('courier')) return 'Monospace/Code'
  if (lower.includes('serif')) return 'Serif'
  if (lower.includes('sans') || lower.includes('system')) return 'Sans-serif'
  if (lower.includes('display') || lower.includes('heading')) return 'Display/Heading'

  return 'Body Text'
}

function inferSizeSemantic(value: number, unit: string): string {
  const px = unit === 'rem' ? value * 16 : value

  if (px <= 12) return 'Extra Small'
  if (px <= 14) return 'Small'
  if (px <= 16) return 'Base'
  if (px <= 20) return 'Large'
  if (px <= 24) return 'Extra Large'
  if (px <= 36) return 'Heading'
  return 'Display'
}

function inferWeightSemantic(weight: number): string {
  if (weight <= 300) return 'Light'
  if (weight <= 400) return 'Regular'
  if (weight <= 500) return 'Medium'
  if (weight <= 600) return 'Semibold'
  if (weight <= 700) return 'Bold'
  return 'Extra Bold'
}

function inferSpacingSemantic(value: number, unit: string): string {
  const px = unit === 'rem' ? value * 16 : value

  if (px <= 4) return 'Tiny'
  if (px <= 8) return 'Small'
  if (px <= 16) return 'Medium'
  if (px <= 24) return 'Large'
  if (px <= 48) return 'Extra Large'
  return 'Huge'
}

function inferRadiusSemantic(value: number, unit: string): string {
  const px = unit === 'rem' ? value * 16 : value

  if (px === 0) return 'None/Sharp'
  if (px <= 4) return 'Small'
  if (px <= 8) return 'Medium'
  if (px <= 16) return 'Large'
  if (px > 100) return 'Full/Circle'
  return 'Rounded'
}

function inferShadowSemantic(name: string, css?: string): string {
  if (name.includes('inner') || css?.includes('inset')) return 'Inner/Inset'

  const lower = name.toLowerCase()
  if (lower.includes('sm') || lower.includes('small')) return 'Subtle'
  if (lower.includes('lg') || lower.includes('large') || lower.includes('xl')) return 'Prominent'
  if (lower.includes('md') || lower.includes('medium')) return 'Medium'

  return 'Shadow'
}

function inferDurationSemantic(value: string): string {
  const ms = parseInt(value.replace('ms', ''))

  if (ms <= 100) return 'Instant'
  if (ms <= 200) return 'Fast'
  if (ms <= 350) return 'Normal'
  if (ms <= 500) return 'Slow'
  return 'Very Slow'
}

/**
 * Utility functions
 */

import { w3cToHex, rgbToOklch as properRgbToOklch, type RGBColor } from './color-utils'

function rgbComponentsToHex(components: number[]): string {
  return w3cToHex(components)
}

function componentsToRgb(components: number[]): { r: number; g: number; b: number } {
  return {
    r: Math.round(components[0] * 255),
    g: Math.round(components[1] * 255),
    b: Math.round(components[2] * 255)
  }
}

function rgbToOklch(components: number[]): [number, number, number] {
  const rgb: RGBColor = {
    r: Math.round(components[0] * 255),
    g: Math.round(components[1] * 255),
    b: Math.round(components[2] * 255)
  }

  const oklch = properRgbToOklch(rgb)

  return [
    Math.round(oklch.l * 100),
    Math.round(oklch.c * 100),
    Math.round(oklch.h)
  ]
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}