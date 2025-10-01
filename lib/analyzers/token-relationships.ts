/**
 * Token Relationship Analyzer
 * Detects relationships between tokens to identify design systems
 */

import type { CuratedToken } from './token-curator'

export interface TokenRelationship {
  type: 'palette' | 'scale' | 'shades' | 'complementary'
  tokens: string[] // Token names
  confidence: number
  description: string
}

export interface ColorPalette {
  name: string
  colors: CuratedToken[]
  relationship: 'analogous' | 'complementary' | 'triadic' | 'monochromatic'
  confidence: number
}

export interface ModularScale {
  base: number
  ratio: number
  values: number[]
  tokens: CuratedToken[]
  confidence: number
}

/**
 * Detect color relationships (palettes, complementary colors)
 */
export function detectColorPalettes(colors: CuratedToken[]): ColorPalette[] {
  const palettes: ColorPalette[] = []

  // Group colors by hue similarity
  const hueGroups = groupByHue(colors)

  // Detect monochromatic palettes (same hue, different lightness)
  Object.entries(hueGroups).forEach(([hue, groupColors]) => {
    if (groupColors.length >= 3) {
      palettes.push({
        name: `${hue}-shades`,
        colors: groupColors,
        relationship: 'monochromatic',
        confidence: 0.8
      })
    }
  })

  // Detect complementary colors (opposite on color wheel)
  colors.forEach((color1, i) => {
    colors.slice(i + 1).forEach(color2 => {
      if (areComplementary(color1, color2)) {
        palettes.push({
          name: 'complementary-pair',
          colors: [color1, color2],
          relationship: 'complementary',
          confidence: 0.9
        })
      }
    })
  })

  return palettes
}

/**
 * Detect modular scale in spacing/typography
 * Tries each value as a potential base to find the best fit
 */
export function detectModularScale(tokens: CuratedToken[]): ModularScale | null {
  if (tokens.length < 4) return null

  // Extract pixel values
  const values = tokens
    .map(t => {
      const match = String(t.value).match(/^([\d.]+)(px|rem|em)$/)
      if (!match) return null
      const num = parseFloat(match[1])
      const unit = match[2]
      return unit === 'rem' || unit === 'em' ? num * 16 : num
    })
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)

  if (values.length < 4) return null

  // Test common ratios: 1.125, 1.25, 1.333, 1.5, 1.618 (golden ratio), 2
  const ratios = [1.125, 1.25, 1.333, 1.5, 1.618, 2]

  let bestMatch: ModularScale | null = null
  let bestConfidence = 0

  for (const ratio of ratios) {
    // Try each value as a potential base
    for (let baseIdx = 0; baseIdx < values.length; baseIdx++) {
      const baseValue = values[baseIdx]
      let matches = 0

      for (let i = 0; i < values.length; i++) {
        const steps = i - baseIdx
        const expected = baseValue * Math.pow(ratio, steps)
        const actual = values[i]

        // Allow 10% tolerance
        if (Math.abs(expected - actual) / Math.max(expected, actual) < 0.1) {
          matches++
        }
      }

      const confidence = matches / values.length

      // If 70% of values fit the scale and it's better than previous best
      if (confidence >= 0.7 && confidence > bestConfidence) {
        bestConfidence = confidence
        bestMatch = {
          base: baseValue,
          ratio,
          values,
          tokens,
          confidence
        }
      }
    }
  }

  return bestMatch
}

/**
 * Detect shade systems (color-50, color-100, ..., color-900)
 */
export function detectShadeSystem(colors: CuratedToken[]): TokenRelationship[] {
  const relationships: TokenRelationship[] = []
  const shadePattern = /^(.+?)-(50|100|200|300|400|500|600|700|800|900)$/

  // Group by base color name
  const groups = new Map<string, CuratedToken[]>()

  colors.forEach(color => {
    const match = color.name.match(shadePattern)
    if (match) {
      const baseName = match[1]
      if (!groups.has(baseName)) {
        groups.set(baseName, [])
      }
      groups.get(baseName)!.push(color)
    }
  })

  // Any group with 5+ shades is a shade system
  groups.forEach((shades, baseName) => {
    if (shades.length >= 5) {
      relationships.push({
        type: 'shades',
        tokens: shades.map(s => s.name),
        confidence: Math.min(0.95, shades.length / 9), // Max 9 shades
        description: `${baseName} shade system (${shades.length} shades)`
      })
    }
  })

  return relationships
}

/**
 * Detect spacing grid system (4px, 8px, 12px base)
 */
export function detectSpacingGrid(spacing: CuratedToken[]): { base: number; confidence: number } | null {
  const pixels = spacing
    .map(t => {
      const match = String(t.value).match(/^([\d.]+)(px|rem|em)$/)
      if (!match) return null
      const num = parseFloat(match[1])
      const unit = match[2]
      return unit === 'rem' || unit === 'em' ? num * 16 : num
    })
    .filter((v): v is number => v !== null && v > 0)

  if (pixels.length < 3) return null

  // Test for 4px, 8px, or 12px base
  const bases = [4, 8, 12]

  for (const base of bases) {
    const matches = pixels.filter(p => p % base === 0).length
    const confidence = matches / pixels.length

    if (confidence >= 0.7) {
      return { base, confidence }
    }
  }

  return null
}

/**
 * Helper: Group colors by hue
 */
function groupByHue(colors: CuratedToken[]): Record<string, CuratedToken[]> {
  const groups: Record<string, CuratedToken[]> = {}

  colors.forEach(color => {
    const hex = String(color.value)
    const hsl = hexToHSL(hex)
    if (!hsl) return

    // Round hue to nearest 30° to group similar hues
    const hueGroup = Math.round(hsl.h / 30) * 30

    const key = `hue-${hueGroup}`
    if (!groups[key]) groups[key] = []
    groups[key].push(color)
  })

  return groups
}

/**
 * Helper: Check if two colors are complementary (opposite on color wheel)
 */
function areComplementary(color1: CuratedToken, color2: CuratedToken): boolean {
  const hsl1 = hexToHSL(String(color1.value))
  const hsl2 = hexToHSL(String(color2.value))

  if (!hsl1 || !hsl2) return false

  // Complementary colors are ~180° apart
  const hueDiff = Math.abs(hsl1.h - hsl2.h)
  return hueDiff >= 160 && hueDiff <= 200
}

/**
 * Helper: Convert hex to HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null

    const r = parseInt(result[1], 16) / 255
    const g = parseInt(result[2], 16) / 255
    const b = parseInt(result[3], 16) / 255

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2

    if (max === min) {
      return { h: 0, s: 0, l }
    }

    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    let h: number
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }

    h *= 60

    if (isNaN(h) || isNaN(s) || isNaN(l)) return null

    return { h, s, l }
  } catch (err) {
    console.warn(`Failed to convert hex to HSL: ${hex}`, err)
    return null
  }
}
