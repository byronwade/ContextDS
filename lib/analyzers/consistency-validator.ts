/**
 * Design System Consistency Validator
 * Analyzes token patterns to detect inconsistencies and provide quality scores
 */

import type { CuratedTokenSet } from './token-curator'

export interface ConsistencyReport {
  overallScore: number
  colorConsistency: {
    score: number
    hasScale: boolean
    duplicates: number
    recommendations: string[]
  }
  spacingConsistency: {
    score: number
    hasScale: boolean
    baseUnit: number | null
    adherence: number
    recommendations: string[]
  }
  typographyConsistency: {
    score: number
    hasScale: boolean
    fontCount: number
    recommendations: string[]
  }
}

export function validateConsistency(tokens: CuratedTokenSet): ConsistencyReport {
  const colorConsistency = analyzeColorConsistency(tokens.colors)
  const spacingConsistency = analyzeSpacingConsistency(tokens.spacing)
  const typographyConsistency = analyzeTypographyConsistency(tokens.typography)

  const overallScore = Math.round(
    (colorConsistency.score + spacingConsistency.score + typographyConsistency.score) / 3
  )

  return {
    overallScore,
    colorConsistency,
    spacingConsistency,
    typographyConsistency
  }
}

function analyzeColorConsistency(colors: any[]): ConsistencyReport['colorConsistency'] {
  if (colors.length === 0) {
    return { score: 0, hasScale: false, duplicates: 0, recommendations: ['No colors extracted'] }
  }

  const recommendations: string[] = []
  let score = 100

  // Check for color scale
  const grayscaleColors = colors.filter(c => {
    const hex = String(c.value).toLowerCase()
    const rgb = hexToRgb(hex)
    if (!rgb) return false
    return Math.abs(rgb.r - rgb.g) < 10 && Math.abs(rgb.g - rgb.b) < 10
  })

  const hasScale = grayscaleColors.length >= 5
  if (!hasScale) {
    score -= 15
    recommendations.push('Consider establishing a grayscale color scale (5+ shades)')
  }

  // Check color count
  if (colors.length > 30) {
    score -= 10
    recommendations.push(`High color count (${colors.length}) - consider consolidating`)
  }

  // Check for semantic naming
  const hasSemanticColors = colors.some(c =>
    String(c.name).toLowerCase().match(/primary|secondary|accent|brand|error|success|warning/)
  )
  if (!hasSemanticColors) {
    score -= 10
    recommendations.push('Add semantic color tokens (primary, secondary, etc.)')
  }

  return {
    score: Math.max(0, score),
    hasScale,
    duplicates: 0,
    recommendations
  }
}

function analyzeSpacingConsistency(spacing: any[]): ConsistencyReport['spacingConsistency'] {
  if (spacing.length === 0) {
    return {
      score: 0,
      hasScale: false,
      baseUnit: null,
      adherence: 0,
      recommendations: ['No spacing tokens extracted']
    }
  }

  const recommendations: string[] = []
  let score = 100

  // Convert all spacing to pixels
  const spacingValues = spacing.map(s => {
    const match = String(s.value).match(/^([\d.]+)(px|rem|em)$/)
    if (!match) return 0
    const num = parseFloat(match[1])
    const unit = match[2]
    return unit === 'rem' || unit === 'em' ? num * 16 : num
  }).filter(v => v > 0).sort((a, b) => a - b)

  // Detect base unit (GCD of spacing values)
  let baseUnit = spacingValues[0] || 8
  for (let i = 1; i < Math.min(spacingValues.length, 10); i++) {
    baseUnit = gcd(baseUnit, spacingValues[i])
  }

  // Round to common base units (4, 8, or 16)
  if (baseUnit > 0 && baseUnit < 4) baseUnit = 4
  else if (baseUnit > 4 && baseUnit < 8) baseUnit = 8
  else if (baseUnit > 8) baseUnit = 8

  // Check adherence to base unit
  const adherentCount = spacingValues.filter(v => v % baseUnit === 0).length
  const adherence = Math.round((adherentCount / spacingValues.length) * 100)

  const hasScale = adherence >= 80 && spacingValues.length >= 6

  if (adherence < 70) {
    score -= 20
    recommendations.push(`Spacing scale adherence is ${adherence}% - aim for 80%+ consistency`)
  }

  if (spacing.length > 40) {
    score -= 10
    recommendations.push(`High spacing token count (${spacing.length}) - consider standardizing to a scale`)
  }

  if (baseUnit !== 4 && baseUnit !== 8 && baseUnit !== 16) {
    score -= 5
    recommendations.push('Consider using a standard base unit (4px, 8px, or 16px)')
  }

  return {
    score: Math.max(0, score),
    hasScale,
    baseUnit,
    adherence,
    recommendations
  }
}

function analyzeTypographyConsistency(typography: any): ConsistencyReport['typographyConsistency'] {
  const fontCount = typography.families?.length || 0
  const sizeCount = typography.sizes?.length || 0

  const recommendations: string[] = []
  let score = 100

  // Check font family count
  if (fontCount === 0) {
    return { score: 0, hasScale: false, fontCount: 0, recommendations: ['No fonts detected'] }
  }

  if (fontCount > 5) {
    score -= 15
    recommendations.push(`Too many font families (${fontCount}) - limit to 2-3 for consistency`)
  }

  // Check type scale
  const hasScale = sizeCount >= 6
  if (!hasScale) {
    score -= 10
    recommendations.push('Establish a typographic scale with at least 6 sizes')
  }

  return {
    score: Math.max(0, score),
    hasScale,
    fontCount,
    recommendations
  }
}

// Helper functions
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b !== 0) {
    const temp = b
    b = a % b
    a = temp
  }
  return a
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}