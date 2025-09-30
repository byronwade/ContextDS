/**
 * Dimension utilities for W3C Design Token format
 * Parses and converts CSS dimension values to proper W3C structure
 */

export interface W3CDimension {
  value: number
  unit: 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw' | 'vmin' | 'vmax' | 'ch' | 'ex'
}

export interface W3CShadow {
  offsetX: W3CDimension
  offsetY: W3CDimension
  blur: W3CDimension
  spread: W3CDimension
  color: {
    colorSpace: string
    components: number[]
  }
  inset?: boolean
}

export interface W3CBorder {
  width: W3CDimension
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset' | 'none' | 'hidden'
  color: {
    colorSpace: string
    components: number[]
  }
}

export interface W3CTypography {
  fontFamily: string | string[]
  fontSize?: W3CDimension
  fontWeight?: number | string
  lineHeight?: number | W3CDimension
  letterSpacing?: W3CDimension
}

/**
 * Parse CSS dimension value to W3C format
 */
export function parseDimension(value: string): W3CDimension | null {
  if (!value || typeof value !== 'string') return null

  const trimmed = value.trim()

  // Match number with unit
  const match = trimmed.match(/^(-?\d*\.?\d+)(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)$/i)

  if (!match) {
    // Try unitless number (interpret as px)
    const num = parseFloat(trimmed)
    if (!isNaN(num)) {
      return { value: num, unit: 'px' }
    }
    return null
  }

  const numValue = parseFloat(match[1])
  const unit = match[2].toLowerCase() as W3CDimension['unit']

  if (isNaN(numValue)) return null

  return {
    value: Math.round(numValue * 1000) / 1000,
    unit
  }
}

/**
 * Get semantic spacing name based on pixel value
 */
export function getSemanticSpacingName(dim: W3CDimension, index: number): string {
  // Convert to pixels for comparison
  let px = dim.value

  if (dim.unit === 'rem') px = dim.value * 16
  else if (dim.unit === 'em') px = dim.value * 16
  else if (dim.unit !== 'px') return `spacing-${index}`

  // Tailwind-inspired scale
  if (px === 0) return `spacing-0`
  if (px <= 2) return `spacing-0.5-${index}` // 0.125rem
  if (px <= 4) return `spacing-1-${index}` // 0.25rem
  if (px <= 6) return `spacing-1.5-${index}` // 0.375rem
  if (px <= 8) return `spacing-2-${index}` // 0.5rem
  if (px <= 10) return `spacing-2.5-${index}` // 0.625rem
  if (px <= 12) return `spacing-3-${index}` // 0.75rem
  if (px <= 14) return `spacing-3.5-${index}` // 0.875rem
  if (px <= 16) return `spacing-4-${index}` // 1rem
  if (px <= 20) return `spacing-5-${index}` // 1.25rem
  if (px <= 24) return `spacing-6-${index}` // 1.5rem
  if (px <= 28) return `spacing-7-${index}` // 1.75rem
  if (px <= 32) return `spacing-8-${index}` // 2rem
  if (px <= 36) return `spacing-9-${index}` // 2.25rem
  if (px <= 40) return `spacing-10-${index}` // 2.5rem
  if (px <= 44) return `spacing-11-${index}` // 2.75rem
  if (px <= 48) return `spacing-12-${index}` // 3rem
  if (px <= 56) return `spacing-14-${index}` // 3.5rem
  if (px <= 64) return `spacing-16-${index}` // 4rem
  if (px <= 80) return `spacing-20-${index}` // 5rem
  if (px <= 96) return `spacing-24-${index}` // 6rem
  if (px <= 128) return `spacing-32-${index}` // 8rem
  if (px <= 160) return `spacing-40-${index}` // 10rem
  if (px <= 192) return `spacing-48-${index}` // 12rem
  if (px <= 224) return `spacing-56-${index}` // 14rem
  if (px <= 256) return `spacing-64-${index}` // 16rem

  return `spacing-${index}`
}

/**
 * Get semantic border radius name
 */
export function getSemanticRadiusName(dim: W3CDimension, index: number): string {
  let px = dim.value

  if (dim.unit === 'rem') px = dim.value * 16
  else if (dim.unit === 'em') px = dim.value * 16
  else if (dim.unit === '%') return `radius-${Math.round(dim.value)}-pct-${index}`
  else if (dim.unit !== 'px') return `radius-${index}`

  if (px === 0) return `radius-none`
  if (px <= 2) return `radius-sm-${index}`
  if (px <= 4) return `radius-${index}`
  if (px <= 6) return `radius-md-${index}`
  if (px <= 8) return `radius-lg-${index}`
  if (px <= 12) return `radius-xl-${index}`
  if (px <= 16) return `radius-2xl-${index}`
  if (px <= 24) return `radius-3xl-${index}`
  if (px >= 9999) return `radius-full`

  return `radius-${index}`
}

/**
 * Get semantic font size name
 */
export function getSemanticFontSizeName(dim: W3CDimension, index: number): string {
  let px = dim.value

  if (dim.unit === 'rem') px = dim.value * 16
  else if (dim.unit === 'em') px = dim.value * 16
  else if (dim.unit !== 'px') return `text-${index}`

  // Tailwind-inspired type scale
  if (px <= 12) return `text-xs-${index}`
  if (px <= 14) return `text-sm-${index}`
  if (px <= 16) return `text-base-${index}`
  if (px <= 18) return `text-lg-${index}`
  if (px <= 20) return `text-xl-${index}`
  if (px <= 24) return `text-2xl-${index}`
  if (px <= 30) return `text-3xl-${index}`
  if (px <= 36) return `text-4xl-${index}`
  if (px <= 48) return `text-5xl-${index}`
  if (px <= 60) return `text-6xl-${index}`
  if (px <= 72) return `text-7xl-${index}`
  if (px <= 96) return `text-8xl-${index}`
  if (px <= 128) return `text-9xl-${index}`

  return `text-${index}`
}

/**
 * Parse box-shadow value to W3C format
 */
export function parseShadow(shadowValue: string): W3CShadow | null {
  if (!shadowValue || typeof shadowValue !== 'string') return null

  const trimmed = shadowValue.trim()

  // Check for inset
  const isInset = trimmed.startsWith('inset ')
  const value = isInset ? trimmed.slice(6).trim() : trimmed

  // Parse shadow parts: offsetX offsetY blur spread color
  // This is a simplified parser - full CSS shadow parsing is complex
  const parts = value.split(/\s+/)

  if (parts.length < 3) return null

  let offsetX: W3CDimension | null = null
  let offsetY: W3CDimension | null = null
  let blur: W3CDimension | null = null
  let spread: W3CDimension | null = null
  let colorString = ''

  // Try to parse first 4 parts as dimensions
  let dimCount = 0
  for (let i = 0; i < Math.min(4, parts.length); i++) {
    const dim = parseDimension(parts[i])
    if (dim) {
      if (dimCount === 0) offsetX = dim
      else if (dimCount === 1) offsetY = dim
      else if (dimCount === 2) blur = dim
      else if (dimCount === 3) spread = dim
      dimCount++
    } else {
      // Rest is color
      colorString = parts.slice(i).join(' ')
      break
    }
  }

  // Must have at least offsetX and offsetY
  if (!offsetX || !offsetY) return null

  // Default blur and spread
  if (!blur) blur = { value: 0, unit: 'px' }
  if (!spread) spread = { value: 0, unit: 'px' }

  // Parse color
  const color = colorString || '#000000'

  // Import color parser (will be available from color-utils)
  // For now, use a simple representation
  const colorObj = {
    colorSpace: 'srgb',
    components: [0, 0, 0] // Will be properly parsed with color-utils
  }

  const shadow: W3CShadow = {
    offsetX,
    offsetY,
    blur,
    spread,
    color: colorObj
  }

  if (isInset) {
    shadow.inset = true
  }

  return shadow
}

/**
 * Get semantic shadow name based on blur and spread values
 */
export function getSemanticShadowName(shadow: W3CShadow, index: number): string {
  const blurPx = shadow.blur.unit === 'px' ? shadow.blur.value : shadow.blur.value * 16
  const spreadPx = shadow.spread.unit === 'px' ? shadow.spread.value : shadow.spread.value * 16

  if (shadow.inset) {
    return `shadow-inner-${index}`
  }

  // Material Design elevation scale
  if (blurPx <= 2 && spreadPx === 0) return `shadow-sm-${index}`
  if (blurPx <= 4 && spreadPx <= 2) return `shadow-${index}`
  if (blurPx <= 10 && spreadPx <= 5) return `shadow-md-${index}`
  if (blurPx <= 15 && spreadPx <= 7) return `shadow-lg-${index}`
  if (blurPx <= 25 && spreadPx <= 10) return `shadow-xl-${index}`
  if (blurPx > 25) return `shadow-2xl-${index}`

  return `shadow-${index}`
}

/**
 * Parse border value to W3C format
 */
export function parseBorder(borderValue: string): W3CBorder | null {
  if (!borderValue || typeof borderValue !== 'string') return null

  const parts = borderValue.trim().split(/\s+/)

  let width: W3CDimension | null = null
  let style: W3CBorder['style'] | null = null
  let colorString = ''

  for (const part of parts) {
    // Try to parse as dimension
    if (!width) {
      const dim = parseDimension(part)
      if (dim) {
        width = dim
        continue
      }
    }

    // Try to parse as border style
    if (!style && /^(solid|dashed|dotted|double|groove|ridge|inset|outset|none|hidden)$/i.test(part)) {
      style = part.toLowerCase() as W3CBorder['style']
      continue
    }

    // Rest is color
    colorString = parts.slice(parts.indexOf(part)).join(' ')
    break
  }

  if (!width && !style && !colorString) return null

  return {
    width: width || { value: 1, unit: 'px' },
    style: style || 'solid',
    color: {
      colorSpace: 'srgb',
      components: [0, 0, 0]
    }
  }
}

/**
 * Parse duration value to W3C format (in milliseconds)
 */
export function parseDuration(value: string): W3CDimension | null {
  if (!value || typeof value !== 'string') return null

  const trimmed = value.trim()
  const match = trimmed.match(/^(-?\d*\.?\d+)(ms|s)$/i)

  if (!match) return null

  let ms = parseFloat(match[1])
  const unit = match[2].toLowerCase()

  if (unit === 's') {
    ms = ms * 1000
  }

  if (isNaN(ms)) return null

  return {
    value: Math.round(ms),
    unit: 'px' // Using px as milliseconds representation
  }
}

/**
 * Get semantic duration name
 */
export function getSemanticDurationName(ms: number, index: number): string {
  if (ms <= 75) return `duration-fastest-${index}`
  if (ms <= 150) return `duration-fast-${index}`
  if (ms <= 250) return `duration-normal-${index}`
  if (ms <= 400) return `duration-slow-${index}`
  if (ms <= 700) return `duration-slower-${index}`
  return `duration-slowest-${index}`
}