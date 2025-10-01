/**
 * Smart Token Deduplication
 * Merges near-duplicate tokens and detects variants
 */

import type { CuratedToken } from './token-curator'

export interface DuplicateGroup {
  primary: CuratedToken
  duplicates: CuratedToken[]
  reason: 'exact' | 'near-color' | 'unit-conversion' | 'rounding'
  confidence: number
}

/**
 * Detect and merge duplicate colors
 * Handles both exact duplicates (same hex) and near-duplicates (>98% similar)
 */
export function deduplicateColors(colors: CuratedToken[]): CuratedToken[] {
  // Step 1: Deduplicate by exact hex value first
  const hexMap = new Map<string, CuratedToken[]>()

  colors.forEach(color => {
    const hex = String(color.value).toLowerCase()
    if (!hexMap.has(hex)) {
      hexMap.set(hex, [])
    }
    hexMap.get(hex)!.push(color)
  })

  // Merge exact duplicates, choosing primary by highest usage
  const exactDedupedColors: CuratedToken[] = []
  hexMap.forEach(group => {
    if (group.length === 1) {
      exactDedupedColors.push(group[0])
    } else {
      // Choose primary with highest usage (deterministic)
      const primary = group.reduce((best, curr) =>
        curr.usage > best.usage ? curr : best
      )
      const totalUsage = group.reduce((sum, t) => sum + t.usage, 0)

      exactDedupedColors.push({
        ...primary,
        usage: totalUsage,
        confidence: Math.min(100, primary.confidence + 5)
      })
    }
  })

  // Step 2: Deduplicate near-duplicates (>98% similar)
  const groups: DuplicateGroup[] = []
  const processed = new Set<string>()

  exactDedupedColors.forEach((color1, i) => {
    if (processed.has(color1.name)) return

    const duplicates: CuratedToken[] = []

    exactDedupedColors.slice(i + 1).forEach(color2 => {
      if (processed.has(color2.name)) return

      const similarity = calculateColorSimilarity(
        String(color1.value),
        String(color2.value)
      )

      // If colors are > 98% similar, they're duplicates
      if (similarity !== null && similarity > 0.98) {
        duplicates.push(color2)
        processed.add(color2.name)
      }
    })

    if (duplicates.length > 0) {
      // Choose primary with highest usage (deterministic)
      const allColors = [color1, ...duplicates]
      const primary = allColors.reduce((best, curr) =>
        curr.usage > best.usage ? curr : best
      )
      const others = allColors.filter(c => c !== primary)

      groups.push({
        primary,
        duplicates: others,
        reason: 'near-color',
        confidence: 0.95
      })

      // Mark all as processed
      allColors.forEach(c => processed.add(c.name))
    }
  })

  // Merge near-duplicates into primary token
  const result = exactDedupedColors.filter(c => !processed.has(c.name))

  groups.forEach(group => {
    const totalUsage = group.primary.usage + group.duplicates.reduce((sum, d) => sum + d.usage, 0)
    result.push({
      ...group.primary,
      usage: totalUsage,
      confidence: Math.min(100, group.primary.confidence + 5)
    })
  })

  return result
}

/**
 * Detect and merge unit-equivalent tokens
 * Example: 16px === 1rem, 1.5rem === 24px
 * @param baseFontSize - Base font size in pixels (default: 16)
 */
export function deduplicateByUnitConversion(
  tokens: CuratedToken[],
  baseFontSize: number = 16
): CuratedToken[] {
  const groups: DuplicateGroup[] = []
  const processed = new Set<string>()

  tokens.forEach((token1, i) => {
    if (processed.has(token1.name)) return

    const pixels1 = convertToPixels(String(token1.value), baseFontSize)
    if (pixels1 === null) return

    const duplicates: CuratedToken[] = []

    tokens.slice(i + 1).forEach(token2 => {
      if (processed.has(token2.name)) return

      const pixels2 = convertToPixels(String(token2.value), baseFontSize)
      if (pixels2 === null) return

      // If pixel values are within 0.5px, they're the same
      if (Math.abs(pixels1 - pixels2) < 0.5) {
        duplicates.push(token2)
        processed.add(token2.name)
      }
    })

    if (duplicates.length > 0) {
      groups.push({
        primary: token1,
        duplicates,
        reason: 'unit-conversion',
        confidence: 1.0
      })
    }
  })

  // Merge duplicates, prefer rem units
  return tokens.filter(t => !processed.has(t.name)).map(token => {
    const group = groups.find(g => g.primary.name === token.name)
    if (!group) return token

    const totalUsage = token.usage + group.duplicates.reduce((sum, d) => sum + d.usage, 0)

    // Prefer rem/em over px
    const hasRem = group.duplicates.some(d => String(d.value).includes('rem'))
    const remToken = hasRem
      ? (group.duplicates.find(d => String(d.value).includes('rem')) || token)
      : token

    return {
      ...remToken,
      usage: totalUsage,
      confidence: Math.min(100, remToken.confidence + 10)
    }
  })
}

/**
 * Eliminate low-quality tokens (noise)
 */
export function filterLowQualityTokens(tokens: CuratedToken[], category: string): CuratedToken[] {
  return tokens.filter(token => {
    // Rule 1: Remove single-use tokens (likely typos)
    if (token.usage === 1 && token.confidence < 70) return false

    // Rule 2: Remove browser defaults
    if (isBrowserDefault(token, category)) return false

    // Rule 3: Remove computed artifacts
    if (isComputedArtifact(token, category)) return false

    // Rule 4: Remove zero/empty values
    if (isZeroOrEmpty(token, category)) return false

    return true
  })
}

/**
 * Calculate color similarity (0-1)
 * Returns null if colors are invalid/incomparable
 */
function calculateColorSimilarity(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)

  if (!rgb1 || !rgb2) return null // Invalid colors are incomparable

  // Calculate Euclidean distance in RGB space
  const distance = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  )

  // Max distance in RGB is sqrt(255^2 * 3) = ~441.67
  const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3)

  // Convert to similarity score
  return 1 - (distance / MAX_RGB_DISTANCE)
}

/**
 * Convert any dimension to pixels
 * @param baseFontSize - Base font size for rem/em conversion (default: 16)
 */
function convertToPixels(value: string, baseFontSize: number = 16): number | null {
  try {
    const match = value.match(/^([\d.]+)(px|rem|em)$/)
    if (!match) return null

    const num = parseFloat(match[1])
    if (isNaN(num) || !isFinite(num)) return null

    const unit = match[2]

    if (unit === 'rem' || unit === 'em') {
      return num * baseFontSize
    }

    return num
  } catch (err) {
    console.warn(`Failed to convert dimension to pixels: ${value}`, err)
    return null
  }
}

/**
 * Check if token is a browser default
 */
function isBrowserDefault(token: CuratedToken, category: string): boolean {
  const name = token.name.toLowerCase()
  const value = String(token.value).toLowerCase()

  // Browser default shadows
  if (category === 'shadow' && value === 'none') return true

  // Browser default colors
  if (category === 'color') {
    const browserColors = [
      'currentcolor',
      'transparent',
      'inherit',
      'initial',
      'unset'
    ]
    if (browserColors.includes(value)) return true
  }

  // User agent stylesheet patterns
  if (name.includes('user-agent') || name.includes('browser-default')) {
    return true
  }

  return false
}

/**
 * Check if token is a computed artifact
 */
function isComputedArtifact(token: CuratedToken, category: string): boolean {
  const value = String(token.value)

  // Colors with extremely low alpha (calculation artifacts)
  if (category === 'color') {
    const alphaMatch = value.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)
    if (alphaMatch) {
      const alpha = parseFloat(alphaMatch[1])
      if (alpha < 0.01) return true // Effectively invisible
    }
  }

  // Dimensions with extreme precision (calculation artifacts)
  if (category === 'spacing' || category === 'typography-size') {
    const precisionMatch = value.match(/^([\d.]+)(px|rem|em)$/)
    if (precisionMatch) {
      const num = parseFloat(precisionMatch[1])
      // More than 3 decimal places is suspicious
      const decimals = (num.toString().split('.')[1] || '').length
      if (decimals > 3) return true
    }
  }

  return false
}

/**
 * Check if token is zero/empty
 */
function isZeroOrEmpty(token: CuratedToken, category: string): boolean {
  const value = String(token.value).toLowerCase().trim()

  if (!value || value === 'none' || value === '0' || value === '0px') {
    return true
  }

  // Empty shadows
  if (category === 'shadow' && value === '0 0 0') return true

  return false
}

/**
 * Helper: Hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null

    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null

    return { r, g, b }
  } catch (err) {
    console.warn(`Failed to parse hex color: ${hex}`, err)
    return null
  }
}
