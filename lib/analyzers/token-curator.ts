/**
 * Token Curator - Filters and ranks design tokens by actual usage
 * Returns only the most important, frequently-used tokens that define the design system
 */

import type { W3CTokenSet, TokenExtractionResult } from './w3c-tokenizer'
import { deduplicateColors, deduplicateByUnitConversion, filterLowQualityTokens } from './token-deduplication'
import { detectColorPalettes, detectModularScale, detectShadeSystem, detectSpacingGrid } from './token-relationships'

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
  metadata?: {
    colorPalettes?: any[]
    modularScale?: any
    shadeSystem?: any[]
    spacingGrid?: any
  }
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
  minUsage: 1,  // Include all tokens used at least once
  minConfidence: 50,  // Lower threshold to capture more design system tokens
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

  const colors = curateColors(tokenSet, cfg)
  const typography = curateTypography(tokenSet, cfg)
  const spacing = curateSpacing(tokenSet, cfg)
  const radius = curateRadius(tokenSet, cfg)
  const shadows = curateShadows(tokenSet, cfg)
  const motion = curateMotion(tokenSet, cfg)

  // Detect token relationships for metadata
  const colorPalettes = detectColorPalettes(colors)
  const modularScale = detectModularScale(typography.sizes)
  const shadeSystem = detectShadeSystem(colors)
  const spacingGrid = detectSpacingGrid(spacing)

  return {
    colors,
    typography,
    spacing,
    radius,
    shadows,
    motion,
    metadata: {
      colorPalettes,
      modularScale,
      shadeSystem,
      spacingGrid
    }
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
    const enhancedConfidence = calculateColorConfidence(usage, hex, name)

    tokens.push({
      name,
      value: hex,
      usage,
      confidence: enhancedConfidence,
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

  // Apply advanced deduplication first (handles both exact and near-duplicates)
  const dedupedTokens = deduplicateColors(tokens)

  // Recalculate percentages after deduplication
  const dedupedTotal = dedupedTokens.reduce((sum, t) => sum + t.usage, 0)
  dedupedTokens.forEach(t => t.percentage = dedupedTotal > 0 ? Math.round((t.usage / dedupedTotal) * 100) : 0)

  // Filter out low-quality tokens (browser defaults, computed artifacts, zero values)
  const qualityFilteredTokens = filterLowQualityTokens(dedupedTokens, 'color')

  const maxUsage = qualityFilteredTokens.reduce((max, token) => Math.max(max, token.usage), 1)
  const profiles = qualityFilteredTokens
    .map(token => createColorProfile(token, maxUsage))
    .filter((profile): profile is ColorProfile => profile !== null)

  if (profiles.length === 0) {
    return []
  }

  const chromaticProfiles = profiles.filter(profile => !profile.isNeutral && profile.bucket >= 0)
  const neutralProfiles = profiles.filter(profile => profile.isNeutral || profile.bucket < 0)

  // Boost distinctiveness for unique hues
  const hueList = chromaticProfiles.map(profile => profile.hue)
  chromaticProfiles.forEach(profile => {
    const nearestHueDistance = hueList
      .filter(hue => hue !== profile.hue)
      .reduce((min, hue) => Math.min(min, hueDistance(profile.hue, hue)), Infinity)

    const distinctiveness = nearestHueDistance === Infinity ? 1 : Math.min(nearestHueDistance / 120, 1)
    profile.brandScore += distinctiveness * 20
    profile.bucketWeight += distinctiveness * 6
  })

  const hueBuckets = new Map<number, { weight: number; tokens: ColorProfile[] }>()
  chromaticProfiles.forEach(profile => {
    const entry = hueBuckets.get(profile.bucket) ?? { weight: 0, tokens: [] }
    entry.weight += profile.bucketWeight
    entry.tokens.push(profile)
    hueBuckets.set(profile.bucket, entry)
  })

  const sortedBuckets = Array.from(hueBuckets.entries())
    .sort((a, b) => b[1].weight - a[1].weight)

  const orderedProfiles: ColorProfile[] = []
  const seenTokens = new Set<CuratedToken>()

  sortedBuckets.forEach(([, entry]) => {
    entry.tokens
      .sort((a, b) => b.brandScore - a.brandScore)
      .forEach(profile => {
        if (!seenTokens.has(profile.token)) {
          orderedProfiles.push(profile)
          seenTokens.add(profile.token)
        }
      })
  })

  chromaticProfiles
    .filter(profile => !seenTokens.has(profile.token))
    .sort((a, b) => b.brandScore - a.brandScore)
    .forEach(profile => {
      orderedProfiles.push(profile)
      seenTokens.add(profile.token)
    })

  neutralProfiles
    .sort((a, b) => b.brandScore - a.brandScore)
    .forEach(profile => {
      if (!seenTokens.has(profile.token)) {
        orderedProfiles.push(profile)
        seenTokens.add(profile.token)
      }
    })

  const sortedTokens = orderedProfiles.map(profile => profile.token)

  if (sortedTokens.length > 0) {
    console.log('🎨 Color Ranking (by brand importance):')
    orderedProfiles.slice(0, 10).forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.token.value} - Score: ${profile.brandScore.toFixed(1)} (${profile.token.usage} uses, ${profile.token.percentage}%)`)
    })
  }

  return config.maxColors && !config.returnAllFiltered
    ? sortedTokens.slice(0, config.maxColors)
    : sortedTokens
}

/**
 * Curate typography tokens with smart ranking
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
      const primaryFamily = cleanFontName(familyArray[0])

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

  // Apply quality filtering to all typography tokens
  const qualityFilteredFamilies = filterLowQualityTokens(families, 'typography')
  const qualityFilteredSizes = filterLowQualityTokens(sizes, 'typography-size')
  const qualityFilteredWeights = filterLowQualityTokens(weights, 'typography')

  // SMART FONT RANKING: Prioritize brand fonts over generic fallbacks
  const sortedFamilies = qualityFilteredFamilies.sort((a, b) => {
    const aScore = calculateFontBrandScore(a)
    const bScore = calculateFontBrandScore(b)
    return bScore - aScore
  })

  // SMART SIZE RANKING: Detect type scale and prioritize important sizes
  const sortedSizes = qualityFilteredSizes.sort((a, b) => {
    const aScore = calculateSizeImportance(a, qualityFilteredSizes)
    const bScore = calculateSizeImportance(b, qualityFilteredSizes)
    return bScore - aScore
  })

  // SMART WEIGHT RANKING: Prioritize common design system weights
  const sortedWeights = qualityFilteredWeights.sort((a, b) => {
    const aScore = calculateWeightImportance(a)
    const bScore = calculateWeightImportance(b)
    return bScore - aScore
  })

  return {
    families: config.maxFonts && !config.returnAllFiltered ? sortedFamilies.slice(0, config.maxFonts) : sortedFamilies,
    sizes: config.maxSizes && !config.returnAllFiltered ? sortedSizes.slice(0, config.maxSizes) : sortedSizes,
    weights: config.returnAllFiltered ? sortedWeights : sortedWeights.slice(0, 4)
  }
}

/**
 * Calculate brand score for fonts
 * Prioritizes brand fonts over generic system fonts
 */
function calculateFontBrandScore(token: CuratedToken): number {
  const fontName = String(token.value).toLowerCase()
  const name = token.name.toLowerCase()
  let score = token.usage * 10 // Base score from usage

  // BRAND FONTS (high boost)
  if (!fontName.includes('arial') && !fontName.includes('helvetica') &&
      !fontName.includes('times') && !fontName.includes('georgia') &&
      !fontName.includes('courier') && !fontName.includes('verdana') &&
      !fontName.includes('sans-serif') && !fontName.includes('serif') &&
      !fontName.includes('monospace') && !fontName.includes('system')) {
    score += 100 // Custom brand font
  }

  // Boost for semantic names
  if (name.includes('heading') || name.includes('display')) score += 50
  if (name.includes('primary') || name.includes('brand')) score += 60
  if (name.includes('body') || name.includes('text')) score += 30

  // Penalty for generic fallbacks
  if (fontName.includes('arial') || fontName.includes('helvetica')) score -= 80
  if (fontName.includes('sans-serif') || fontName.includes('serif')) score -= 90
  if (fontName.includes('system')) score -= 70

  return score
}

/**
 * Calculate importance score for font sizes
 * Detects type scale and prioritizes key sizes
 */
function calculateSizeImportance(token: CuratedToken, allSizes: CuratedToken[]): number {
  const value = String(token.value)
  const match = value.match(/^([\d.]+)(px|rem|em)$/)
  if (!match) return token.usage

  const num = parseFloat(match[1])
  const unit = match[2]
  const pixels = unit === 'rem' || unit === 'em' ? num * 16 : num

  let score = token.usage * 10

  // Boost for common design system sizes
  const commonSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64]
  if (commonSizes.some(size => Math.abs(pixels - size) < 2)) {
    score += 50
  }

  // Boost for base body text size (14-18px)
  if (pixels >= 14 && pixels <= 18) score += 40

  // Boost for heading sizes (24px+)
  if (pixels >= 24 && pixels <= 72) score += 30

  // Penalty for odd/uncommon sizes
  if (pixels % 2 !== 0 && pixels > 20) score -= 20

  // Boost for rem units (modern design systems)
  if (unit === 'rem') score += 25

  return score
}

/**
 * Calculate importance score for font weights
 * Prioritizes common design system weights
 */
function calculateWeightImportance(token: CuratedToken): number {
  const weight = parseInt(String(token.value))
  let score = token.usage * 10

  // Common design system weights
  const commonWeights = [300, 400, 500, 600, 700]
  if (commonWeights.includes(weight)) {
    score += 60
  }

  // Extra boost for most common weights
  if (weight === 400 || weight === 700) score += 40
  if (weight === 500 || weight === 600) score += 30

  // Penalty for rare weights
  if (weight < 300 || weight > 800) score -= 40

  return score
}

/**
 * Curate spacing tokens
 */

/**
 * Check if shadow value is valid for design systems
 * Filters out browser defaults like "none" and invalid syntax
 */
function isValidDesignSystemShadow(value: string): boolean {
  // Skip "none" shadows
  if (value === 'none' || value === 'initial' || value === 'inherit') return false

  // Skip empty or invalid values
  if (!value || value.trim() === '') return false

  // Must contain offset and blur values
  // Valid: "0 1px 3px rgba(0,0,0,0.1)"
  // Invalid: "0 0 0 black" (no blur)
  const hasBlur = /\d+px\s+\d+px\s+\d+px/.test(value) || /\d+rem\s+\d+rem\s+\d+rem/.test(value)
  if (!hasBlur) return false

  return true
}

/**
 * Check if radius value is valid for design systems
 */
function isValidDesignSystemRadius(value: number, unit: string): boolean {
  // Convert to pixels
  let pixels = value
  if (unit === 'rem' || unit === 'em') pixels = value * 16

  // Skip 0 radius (no rounding)
  if (pixels === 0) return false

  // Skip tiny values (1px, 2px - likely artifacts)
  if (pixels < 2 && unit === 'px') return false

  // Skip percentage > 50% (circle tokens are valid at exactly 50%)
  if (unit === '%' && value > 50) return false

  // Skip extremely large pixel values (likely errors)
  if (unit === 'px' && pixels > 100) return false

  return true
}

/**
 * Check if spacing value is valid for design systems
 * Filters out 1px borders, 2px outlines, and other non-spacing values
 */
function isValidDesignSystemSpacing(value: number, unit: string): boolean {
  // Convert to pixels for validation
  let pixels = value
  if (unit === 'rem' || unit === 'em') pixels = value * 16

  // Filter rules:
  // 1. Skip 0px (not useful for spacing scale)
  if (pixels === 0) return false

  // 2. Skip 1px (commonly borders), but allow 2px/3px (valid tight spacing)
  if (pixels < 2) return false

  // 3. Skip percentage-based spacing (100%, 50% are layout, not spacing tokens)
  if (unit === '%') return false

  // 4. Skip viewport units (not design system tokens)
  if (unit === 'vh' || unit === 'vw' || unit === 'vmin' || unit === 'vmax') return false

  // 5. Skip extremely large values (likely layout widths, not spacing)
  // Design system spacing rarely exceeds 128px (8rem)
  if (pixels > 200) return false

  // 6. Skip odd decimal values that aren't part of a scale
  // e.g., 1.714em, 0.857em are likely font-size related, not spacing
  const isOddDecimal = pixels % 1 !== 0 && (pixels % 0.5 !== 0)
  if (isOddDecimal && pixels < 16) return false

  return true
}

/**
 * Normalize spacing values to consistent scale
 */
function normalizeSpacing(value: string): { value: string; pixels: number } {
  const match = value.match(/^([\d.]+)(px|rem|em)$/)
  if (!match) return { value, pixels: 0 }

  const num = parseFloat(match[1])
  const unit = match[2]

  let pixels = num
  if (unit === 'rem' || unit === 'em') pixels = num * 16

  // Round to nearest 0.5px for consistency
  pixels = Math.round(pixels * 2) / 2

  return { value, pixels }
}

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

    const dim = token.$value as { value: number; unit: string }

    // Filter out non-design-system spacing values
    if (!isValidDesignSystemSpacing(dim.value, dim.unit)) return

    totalUsage += usage

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

  // Deduplicate by pixel value (merge 1rem and 16px)
  const spacingMap = new Map<number, CuratedToken>()
  tokens.forEach(token => {
    const normalized = normalizeSpacing(String(token.value))
    const existing = spacingMap.get(normalized.pixels)
    if (!existing) {
      spacingMap.set(normalized.pixels, token)
    } else {
      // Keep the more common unit (rem preferred)
      if (String(token.value).includes('rem') && !String(existing.value).includes('rem')) {
        spacingMap.set(normalized.pixels, token)
      }
      existing.usage += token.usage
    }
  })

  // Recalculate percentages
  const dedupedTokens = Array.from(spacingMap.values())
  const dedupedTotal = dedupedTokens.reduce((sum, t) => sum + t.usage, 0)
  dedupedTokens.forEach(t => t.percentage = dedupedTotal > 0 ? Math.round((t.usage / dedupedTotal) * 100) : 0)

  // Apply advanced unit conversion deduplication (16px === 1rem)
  const advancedDedupedTokens = deduplicateByUnitConversion(dedupedTokens)

  // Filter out low-quality spacing tokens
  const qualityFilteredTokens = filterLowQualityTokens(advancedDedupedTokens, 'spacing')

  // SMART SPACING RANKING: Detect spacing scale and prioritize system values
  const sorted = qualityFilteredTokens.sort((a, b) => {
    const aScore = calculateSpacingSystemScore(a, qualityFilteredTokens)
    const bScore = calculateSpacingSystemScore(b, qualityFilteredTokens)
    return bScore - aScore
  })

  return config.maxSpacing && !config.returnAllFiltered ? sorted.slice(0, config.maxSpacing) : sorted
}

/**
 * Calculate spacing system score
 * Detects 4px/8px base grids and prioritizes systematic values
 */
function calculateSpacingSystemScore(token: CuratedToken, allSpacing: CuratedToken[]): number {
  const value = String(token.value)
  const match = value.match(/^([\d.]+)(px|rem|em)$/)
  if (!match) return token.usage

  const num = parseFloat(match[1])
  const unit = match[2]
  const pixels = unit === 'rem' || unit === 'em' ? num * 16 : num

  let score = token.usage * 10

  // Detect base grid (4px or 8px)
  const spacingValues = allSpacing.map(t => {
    const m = String(t.value).match(/^([\d.]+)(px|rem|em)$/)
    if (!m) return 0
    const n = parseFloat(m[1])
    const u = m[2]
    return u === 'rem' || u === 'em' ? n * 16 : n
  }).filter(v => v > 0)

  const is4pxGrid = spacingValues.some(v => v % 4 === 0 && v < 100)
  const is8pxGrid = spacingValues.some(v => v % 8 === 0 && v < 100)

  // Boost for values that fit the grid
  if (is8pxGrid && pixels % 8 === 0) {
    score += 60 // 8px grid: 8, 16, 24, 32, 40, 48, 64, 80, 96
  } else if (is4pxGrid && pixels % 4 === 0) {
    score += 50 // 4px grid: 4, 8, 12, 16, 20, 24, 28, 32
  }

  // Boost for common design system values
  const commonSpacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
  if (commonSpacing.includes(pixels)) {
    score += 40
  }

  // Extra boost for most common spacing values
  if (pixels === 16 || pixels === 24 || pixels === 32) score += 30
  if (pixels === 8 || pixels === 12 || pixels === 48) score += 20

  // Boost for rem units (modern design systems)
  if (unit === 'rem') score += 25

  // Penalty for odd non-systematic values (5px, 7px, 13px, etc.)
  if (pixels % 4 !== 0 && pixels > 4) score -= 30

  return score
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

    const dim = token.$value as { value: number; unit: string }
    const displayValue = `${dim.value}${dim.unit}`

    // Filter out invalid radius values
    if (!isValidDesignSystemRadius(dim.value, dim.unit)) return

    totalUsage += usage

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

    // Filter out invalid shadow values
    const shadowValue = original || String(token.$value)
    if (!isValidDesignSystemShadow(shadowValue)) return

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

  // Deduplicate shadows by normalized value
  const shadowMap = new Map<string, CuratedToken>()
  tokens.forEach(token => {
    const normalized = String(token.value).toLowerCase().replace(/\s+/g, ' ').trim()
    const existing = shadowMap.get(normalized)
    if (!existing) {
      shadowMap.set(normalized, token)
    } else {
      existing.usage += token.usage
    }
  })

  // Recalculate percentages
  const dedupedTokens = Array.from(shadowMap.values())
  const dedupedTotal = dedupedTokens.reduce((sum, t) => sum + t.usage, 0)
  dedupedTokens.forEach(t => t.percentage = dedupedTotal > 0 ? Math.round((t.usage / dedupedTotal) * 100) : 0)

  // Filter out low-quality shadow tokens (none, 0 0 0, browser defaults)
  const qualityFilteredTokens = filterLowQualityTokens(dedupedTokens, 'shadow')

  // SMART SHADOW RANKING: Prioritize design system shadows over browser defaults
  const sorted = qualityFilteredTokens.sort((a, b) => {
    const aScore = calculateShadowQualityScore(a)
    const bScore = calculateShadowQualityScore(b)
    return bScore - aScore
  })

  return config.maxShadows && !config.returnAllFiltered ? sorted.slice(0, config.maxShadows) : sorted
}

/**
 * Calculate shadow quality score
 * Prioritizes intentional design system shadows over default/weak shadows
 */
function calculateShadowQualityScore(token: CuratedToken): number {
  const shadowCSS = String(token.value).toLowerCase()
  let score = token.usage * 10

  // Parse shadow components
  const hasMultipleLayers = shadowCSS.split(',').length > 1
  const hasColor = shadowCSS.includes('rgba') || shadowCSS.includes('rgb') || shadowCSS.includes('#')
  const hasBlur = /\d+px\s+\d+px\s+(\d+)px/.exec(shadowCSS)
  const blurAmount = hasBlur ? parseInt(hasBlur[1]) : 0

  // Boost for multi-layer shadows (sophisticated design systems)
  if (hasMultipleLayers) score += 50

  // Boost for shadows with meaningful blur
  if (blurAmount >= 4 && blurAmount <= 40) {
    score += 40 // Good design system blur range
  }

  // Boost for shadows with alpha transparency (proper shadows)
  if (shadowCSS.includes('rgba')) score += 30

  // Boost for named semantic shadows
  const name = token.name.toLowerCase()
  if (name.includes('elevation') || name.includes('depth')) score += 35
  if (name.includes('sm') || name.includes('small')) score += 25
  if (name.includes('md') || name.includes('medium')) score += 30
  if (name.includes('lg') || name.includes('large')) score += 25
  if (name.includes('xl')) score += 20

  // Penalty for weak/default shadows
  if (blurAmount < 3) score -= 40 // Too subtle
  if (blurAmount > 50) score -= 30 // Too extreme
  if (shadowCSS.includes('0px 0px 0px')) score -= 60 // No shadow at all

  return score
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

interface ColorProfile {
  token: CuratedToken
  hue: number
  saturation: number
  lightness: number
  chroma: number
  usageWeight: number
  semanticBoost: number
  brandScore: number
  bucket: number
  bucketWeight: number
  isNeutral: boolean
}

const HUE_BUCKET_SIZE = 18

function createColorProfile(token: CuratedToken, maxUsage: number): ColorProfile | null {
  const hex = String(token.value).toLowerCase()
  const rgb = hexToRgb(hex)
  if (!rgb) return null

  const { h, s, l } = rgbToHslNormalized(rgb)
  const chroma = computeChroma(rgb)
  const usageWeight = maxUsage > 0 ? Math.log(token.usage + 1) / Math.log(maxUsage + 1) : 0
  let semanticBoost = computeSemanticBoost(token)

  // More aggressive neutral detection: only very low saturation OR heavily penalized by semantics
  const isNeutral = s < 0.05 || (s < 0.12 && semanticBoost < -0.4)

  if (isNeutral) {
    semanticBoost = Math.min(0, semanticBoost)
  }

  const lightnessScore = Math.max(0, 1 - Math.abs(l - 0.45) * 2)

  // NEW WEIGHTS: Prioritize saturation/chroma over raw usage count
  // Saturated colors = brand colors, usage count is secondary
  const brandBase = (s * 70) + (chroma * 65) + (lightnessScore * 30) + (usageWeight * 20)
  let brandScore = brandBase + (semanticBoost * 60) + computePureHueBoost(rgb)

  // Extreme penalty for neutral colors (gray/black/white)
  if (isNeutral) {
    brandScore *= 0.15  // Reduced from 0.25
  }

  brandScore = Math.max(0, brandScore)

  const bucket = isNeutral || Number.isNaN(h)
    ? -1
    : normalizeHue(Math.round(h / HUE_BUCKET_SIZE) * HUE_BUCKET_SIZE)

  const bucketWeight = brandScore * (isNeutral ? 0.2 : 0.8 + usageWeight * 0.4 + Math.max(0, semanticBoost))

  return {
    token,
    hue: Number.isNaN(h) ? 0 : normalizeHue(h),
    saturation: s,
    lightness: l,
    chroma,
    usageWeight,
    semanticBoost,
    brandScore,
    bucket,
    bucketWeight,
    isNeutral
  }
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function normalizeHue(value: number): number {
  const hue = value % 360
  return hue < 0 ? hue + 360 : hue
}

function computeChroma(rgb: { r: number; g: number; b: number }): number {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  return Math.max(r, g, b) - Math.min(r, g, b)
}

function computeSemanticBoost(token: CuratedToken): number {
  const semantic = (token.semantic || '').toLowerCase()
  const name = token.name.toLowerCase()
  const hex = String(token.value).toLowerCase()

  let boost = 0

  // BRAND-CRITICAL KEYWORDS (highest boost)
  if (semantic.includes('primary') || name.includes('primary')) boost += 0.8
  if (semantic.includes('brand') || name.includes('brand') || name.includes('logo')) boost += 0.75
  if (semantic.includes('accent') || name.includes('accent') || name.includes('highlight')) boost += 0.6
  if (name.includes('cta') || name.includes('call-to-action') || name.includes('action')) boost += 0.5

  // INTERACTIVE ELEMENTS (medium boost)
  if (semantic.includes('interactive') || name.includes('button') || name.includes('link')) boost += 0.3
  if (name.includes('nav') || name.includes('header') || name.includes('hero')) boost += 0.4

  // COLOR NAMES (brand colors often have descriptive names)
  if (name.includes('green') || name.includes('blue') || name.includes('red') ||
      name.includes('purple') || name.includes('orange') || name.includes('yellow') ||
      name.includes('teal') || name.includes('cyan') || name.includes('magenta') ||
      name.includes('violet') || name.includes('indigo') || name.includes('pink')) {
    boost += 0.35
  }

  // UTILITY KEYWORDS (heavy penalty)
  if (semantic.includes('background') || semantic.includes('text') || semantic.includes('muted')) boost -= 0.6
  if (name.includes('background') || name.includes('bg-') || name.includes('-bg')) boost -= 0.6
  if (name.includes('text') || name.includes('fg-') || name.includes('-fg')) boost -= 0.5
  if (name.includes('grey') || name.includes('gray') || name.includes('neutral')) boost -= 0.5
  if (name.includes('border') || name.includes('outline') || name.includes('divider')) boost -= 0.4

  // PURE UTILITY COLORS (extreme penalty for common values)
  const rgb = hexToRgb(hex)
  if (rgb) {
    const { r, g, b } = rgb

    // Pure black (#000000) - extreme penalty
    if (r === 0 && g === 0 && b === 0) boost -= 1.0

    // Pure white (#ffffff) - extreme penalty
    if (r === 255 && g === 255 && b === 255) boost -= 1.0

    // Near-black/near-white (within 30 of pure) - heavy penalty
    if ((r < 30 && g < 30 && b < 30) || (r > 225 && g > 225 && b > 225)) boost -= 0.8

    // Pure grayscale (no chroma) - heavy penalty
    const isGrayscale = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10
    if (isGrayscale) boost -= 0.6
  }

  return Math.max(-1.2, Math.min(1.2, boost))
}

function rgbToHslNormalized(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
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

  return { h, s, l }
}

function computePureHueBoost(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb

  if (r > 210 && g < 110 && b < 110) return 12 // vivid red
  if (r < 110 && g > 210 && b < 110) return 10 // vivid green
  if (r < 110 && g < 120 && b > 205) return 10 // vivid blue
  if (r > 215 && g > 160 && b < 110) return 9 // orange/gold
  if (r > 190 && b > 150 && g < 140) return 12 // magenta/pink
  if (r > 170 && g < 120 && b > 170) return 10 // violet

  return 0
}

/**
 * Calculate enhanced confidence score for colors based on usage and patterns
 */
function calculateColorConfidence(usage: number, hex: string, name: string): number {
  let confidence = Math.min(100, 60 + usage * 2) // Base confidence from usage

  // Boost confidence for common design system patterns
  const lower = name.toLowerCase()
  if (lower.includes('primary') || lower.includes('brand')) confidence += 10
  if (lower.includes('background') || lower.includes('text')) confidence += 5

  // Boost confidence for grayscale (commonly used)
  const rgb = hexToRgb(hex)
  if (rgb) {
    const isGrayscale = Math.abs(rgb.r - rgb.g) < 10 && Math.abs(rgb.g - rgb.b) < 10
    if (isGrayscale) confidence += 5
  }

  // Reduce confidence for very specific/rare colors
  if (usage === 1) confidence -= 15
  if (usage === 2) confidence -= 10

  return Math.min(100, Math.max(40, confidence))
}

/**
 * Clean font names - remove Next.js hashes and CSS variable artifacts
 */
function cleanFontName(fontName: string): string {
  if (!fontName) return fontName

  // Remove Next.js font optimization hashes: __Inter_e8ce0c → Inter
  fontName = fontName.replace(/^__([A-Za-z]+)_[a-f0-9]+$/, '$1')

  // Remove CSS custom font patterns: __customFont_hash → Custom Font
  fontName = fontName.replace(/^__customFont_[a-f0-9]+$/, 'Custom Font')

  // Remove leading/trailing quotes
  fontName = fontName.replace(/^['"]|['"]$/g, '')

  // Clean up common generic fallbacks
  if (fontName === 'inherit' || fontName === 'initial' || fontName === 'unset') {
    return 'System Default'
  }

  return fontName
}

/**
 * Semantic inference helpers
 */

function inferColorSemantic(name: string, hex: string): string {
  const lower = name.toLowerCase()

  // Keyword-based semantic detection
  if (lower.includes('primary') || lower.includes('accent') || lower.includes('brand')) return 'Primary/Brand'
  if (lower.includes('secondary')) return 'Secondary'
  if (lower.includes('background') || lower.includes('bg')) return 'Background'
  if (lower.includes('foreground') || lower.includes('fg') || lower.includes('text')) return 'Text'
  if (lower.includes('border') || lower.includes('outline')) return 'Border'
  if (lower.includes('error') || lower.includes('danger') || lower.includes('destructive')) return 'Error/Danger'
  if (lower.includes('success') || lower.includes('positive')) return 'Success'
  if (lower.includes('warning') || lower.includes('caution')) return 'Warning'
  if (lower.includes('info') || lower.includes('informative')) return 'Info'
  if (lower.includes('muted') || lower.includes('subtle')) return 'Muted/Subtle'
  if (lower.includes('hover') || lower.includes('active')) return 'Interactive State'
  if (lower.includes('disabled')) return 'Disabled'
  if (lower.includes('focus')) return 'Focus'

  // Infer from hex value characteristics
  const rgb = hexToRgb(hex)
  if (!rgb) return 'Color'

  // Pure grayscale detection
  const isGrayscale = Math.abs(rgb.r - rgb.g) < 10 && Math.abs(rgb.g - rgb.b) < 10 && Math.abs(rgb.r - rgb.b) < 10
  const lightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114)

  if (isGrayscale) {
    if (lightness < 30) return 'Grayscale/Dark'
    if (lightness > 225) return 'Grayscale/Light'
    return 'Grayscale/Mid'
  }

  // Color hue detection
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  const delta = max - min

  if (delta < 15) return 'Neutral'

  // Determine dominant hue
  if (rgb.r > rgb.g && rgb.r > rgb.b) {
    if (rgb.g > rgb.b * 1.5) return 'Orange/Warm'
    return 'Red'
  }
  if (rgb.g > rgb.r && rgb.g > rgb.b) {
    if (rgb.b > rgb.r * 1.3) return 'Cyan/Teal'
    return 'Green'
  }
  if (rgb.b > rgb.r && rgb.b > rgb.g) {
    if (rgb.r > rgb.g * 1.2) return 'Purple/Violet'
    return 'Blue'
  }

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
