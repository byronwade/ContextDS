/**
 * AI-Powered Brand Analysis
 *
 * Analyzes design tokens to determine:
 * - Brand style (minimalist, bold, playful, corporate, etc.)
 * - Design maturity level
 * - Token consistency scoring
 * - Color palette characteristics
 * - Typography sophistication
 */

import type { GeneratedTokenSet } from './basic-tokenizer'

export interface BrandAnalysis {
  style: string
  maturity: 'prototype' | 'developing' | 'established' | 'systematic'
  consistency: number // 0-100
  insights: {
    colorPalette: {
      dominantHue: string
      saturationLevel: 'muted' | 'balanced' | 'vibrant'
      contrastRatio: 'low' | 'medium' | 'high'
      paletteSize: 'minimal' | 'moderate' | 'extensive'
    }
    typography: {
      sophistication: 'basic' | 'refined' | 'systematic'
      hierarchy: 'flat' | 'layered' | 'comprehensive'
      consistency: number
    }
    spacing: {
      system: 'arbitrary' | 'scale-based' | 'modular'
      baseUnit: number | null
      adherence: number
    }
    overall: {
      tokenizationLevel: 'none' | 'partial' | 'moderate' | 'comprehensive'
      designSystemMaturity: number // 0-100
    }
  }
}

export function analyzeBrand(tokenSet: GeneratedTokenSet): BrandAnalysis {
  const { tokenGroups, qualityInsights } = tokenSet

  // Analyze color palette
  const colorAnalysis = analyzeColorPalette(tokenGroups.colors)

  // Analyze typography
  const typographyAnalysis = analyzeTypography(tokenGroups.typography)

  // Analyze spacing system
  const spacingAnalysis = analyzeSpacing(tokenGroups.spacing)

  // Determine overall style based on characteristics
  const style = determineStyle(colorAnalysis, typographyAnalysis, spacingAnalysis)

  // Calculate maturity level
  const maturity = determineMaturity(tokenGroups, qualityInsights)

  // Calculate consistency score
  const consistency = calculateConsistency(tokenGroups, qualityInsights)

  return {
    style,
    maturity,
    consistency: Math.round(consistency),
    insights: {
      colorPalette: colorAnalysis,
      typography: typographyAnalysis,
      spacing: spacingAnalysis,
      overall: {
        tokenizationLevel: determineTokenizationLevel(tokenGroups),
        designSystemMaturity: Math.round(
          (consistency +
           (maturityToScore(maturity)) +
           (colorAnalysis.paletteSize === 'extensive' ? 80 : 60)) / 3
        )
      }
    }
  }
}

function analyzeColorPalette(colors: any[]) {
  const colorCount = colors.length

  // Analyze saturation levels
  const saturations = colors
    .map(c => extractSaturation(c.value))
    .filter(s => s !== null) as number[]

  const avgSaturation = saturations.length > 0
    ? saturations.reduce((a, b) => a + b, 0) / saturations.length
    : 0

  // Analyze hue distribution
  const hues = colors
    .map(c => extractHue(c.value))
    .filter(h => h !== null) as number[]

  const dominantHue = determineDominantHue(hues)

  return {
    dominantHue,
    saturationLevel: avgSaturation < 30 ? 'muted' : avgSaturation < 60 ? 'balanced' : 'vibrant',
    contrastRatio: colors.some(c => isHighContrast(c.value)) ? 'high' : 'medium',
    paletteSize: colorCount < 20 ? 'minimal' : colorCount < 40 ? 'moderate' : 'extensive'
  }
}

function analyzeTypography(typography: any[]) {
  const fontCount = typography.length

  // Check for systematic font usage
  const hasSystematicNaming = typography.some(t =>
    t.name.includes('heading') || t.name.includes('body') || t.name.includes('display')
  )

  return {
    sophistication: fontCount < 3 ? 'basic' : fontCount < 8 ? 'refined' : 'systematic',
    hierarchy: fontCount < 4 ? 'flat' : fontCount < 8 ? 'layered' : 'comprehensive',
    consistency: hasSystematicNaming ? 85 : 65
  }
}

function analyzeSpacing(spacing: any[]) {
  if (spacing.length === 0) {
    return {
      system: 'arbitrary' as const,
      baseUnit: null,
      adherence: 0
    }
  }

  // Extract numeric values
  const values = spacing
    .map(s => parseInt(s.value))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b)

  // Detect base unit (likely 4 or 8)
  const baseUnit = detectBaseUnit(values)

  // Calculate adherence to scale
  const adherence = baseUnit
    ? values.filter(v => v % baseUnit === 0).length / values.length
    : 0

  return {
    system: adherence > 0.8 ? 'modular' : adherence > 0.5 ? 'scale-based' : 'arbitrary',
    baseUnit,
    adherence: Math.round(adherence * 100)
  }
}

function determineStyle(
  colors: ReturnType<typeof analyzeColorPalette>,
  typography: ReturnType<typeof analyzeTypography>,
  spacing: ReturnType<typeof analyzeSpacing>
): string {
  // Build style descriptor from characteristics
  const descriptors: string[] = []

  // Color-based descriptors
  if (colors.saturationLevel === 'muted' && colors.paletteSize === 'minimal') {
    descriptors.push('minimalist')
  } else if (colors.saturationLevel === 'vibrant' && colors.paletteSize === 'extensive') {
    descriptors.push('bold')
  } else if (colors.dominantHue === 'blue' && colors.saturationLevel === 'balanced') {
    descriptors.push('corporate')
  } else if (colors.saturationLevel === 'vibrant') {
    descriptors.push('vibrant')
  } else {
    descriptors.push('balanced')
  }

  // Typography-based descriptors
  if (typography.sophistication === 'systematic') {
    descriptors.push('refined')
  }

  // Spacing-based descriptors
  if (spacing.system === 'modular') {
    descriptors.push('systematic')
  }

  return descriptors.slice(0, 2).join(' & ') || 'modern'
}

function determineMaturity(
  tokenGroups: GeneratedTokenSet['tokenGroups'],
  qualityInsights: any
): BrandAnalysis['maturity'] {
  const totalTokens = Object.values(tokenGroups).reduce((sum, group) => sum + group.length, 0)
  const avgConfidence = qualityInsights.overall.coverageScore || 0

  if (totalTokens < 50 || avgConfidence < 40) return 'prototype'
  if (totalTokens < 100 || avgConfidence < 60) return 'developing'
  if (totalTokens < 200 || avgConfidence < 80) return 'established'
  return 'systematic'
}

function calculateConsistency(
  tokenGroups: GeneratedTokenSet['tokenGroups'],
  qualityInsights: any
): number {
  // Weighted consistency score based on:
  // - Color palette coherence
  // - Typography system adherence
  // - Spacing scale consistency
  // - Overall token usage patterns

  const colorConsistency = tokenGroups.colors.length > 0
    ? Math.min(100, (tokenGroups.colors.filter(c => c.usage > 5).length / tokenGroups.colors.length) * 100)
    : 0

  const typographyConsistency = tokenGroups.typography.length > 0
    ? Math.min(100, (tokenGroups.typography.filter(t => t.confidence > 70).length / tokenGroups.typography.length) * 100)
    : 0

  const spacingConsistency = tokenGroups.spacing.length > 0
    ? Math.min(100, (tokenGroups.spacing.filter(s => s.confidence > 70).length / tokenGroups.spacing.length) * 100)
    : 0

  const overallCoverage = qualityInsights.overall.coverageScore || 50

  return (
    colorConsistency * 0.3 +
    typographyConsistency * 0.25 +
    spacingConsistency * 0.25 +
    overallCoverage * 0.2
  )
}

// Helper functions

function extractSaturation(color: string): number | null {
  // Parse HSL/HSLA
  const hslMatch = color.match(/hsla?\([\d.]+,\s*([\d.]+)%/)
  if (hslMatch) return parseFloat(hslMatch[1])

  // Approximate from RGB
  const hexMatch = color.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i)
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split('').map(c => c + c).join('')
      : hexMatch[1]

    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lightness = (max + min) / 2

    if (max === min) return 0 // Grayscale

    const delta = max - min
    const saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min)

    return saturation * 100
  }

  return null
}

function extractHue(color: string): number | null {
  const hslMatch = color.match(/hsla?\(([\d.]+)/)
  if (hslMatch) return parseFloat(hslMatch[1])

  // For RGB/hex, would need full HSL conversion
  // Simplified for now
  return null
}

function determineDominantHue(hues: number[]): string {
  if (hues.length === 0) return 'neutral'

  const avg = hues.reduce((a, b) => a + b, 0) / hues.length

  if (avg < 30 || avg > 330) return 'red'
  if (avg < 90) return 'orange'
  if (avg < 150) return 'green'
  if (avg < 210) return 'cyan'
  if (avg < 270) return 'blue'
  return 'purple'
}

function isHighContrast(color: string): boolean {
  // Check if color is very light or very dark
  const hex = color.match(/^#([0-9a-f]{6})/i)?.[1]
  if (!hex) return false

  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance < 0.2 || luminance > 0.8
}

function detectBaseUnit(values: number[]): number | null {
  const potentialBases = [4, 8, 12, 16]

  for (const base of potentialBases) {
    const adherence = values.filter(v => v % base === 0).length / values.length
    if (adherence > 0.7) return base
  }

  return null
}

function maturityToScore(maturity: BrandAnalysis['maturity']): number {
  switch (maturity) {
    case 'prototype': return 25
    case 'developing': return 50
    case 'established': return 75
    case 'systematic': return 95
  }
}

function determineTokenizationLevel(
  tokenGroups: GeneratedTokenSet['tokenGroups']
): 'none' | 'partial' | 'moderate' | 'comprehensive' {
  const totalTokens = Object.values(tokenGroups).reduce((sum, group) => sum + group.length, 0)

  if (totalTokens < 30) return 'none'
  if (totalTokens < 100) return 'partial'
  if (totalTokens < 200) return 'moderate'
  return 'comprehensive'
}