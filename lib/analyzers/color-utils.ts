/**
 * Comprehensive color utilities for W3C Design Token format
 * Uses Culori for proper color space conversion and perceptual color analysis
 */

import { parse, converter, formatHex, formatRgb, differenceEuclidean, type Color } from 'culori'

export interface RGBColor {
  r: number
  g: number
  b: number
  a?: number
}

export interface HSLColor {
  h: number
  s: number
  l: number
  a?: number
}

export interface OKLCHColor {
  l: number // Lightness 0-1
  c: number // Chroma 0-0.4
  h: number // Hue 0-360
  a?: number
}

export interface W3CColor {
  colorSpace: 'srgb' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec2020' | 'oklch'
  components: [number, number, number] | [number, number, number, number]
  alpha?: number
}

// Culori converters
const toRgb = converter('rgb')
const toHsl = converter('hsl')
const toOklch = converter('oklch')
const colorDifference = differenceEuclidean('oklch')

/**
 * Parse any CSS color string into RGB values using Culori
 */
export function parseColor(color: string): RGBColor | null {
  // Safety checks
  if (!color || typeof color !== 'string' || color.trim() === '') {
    return null
  }

  try {
    const parsed = parse(color)
    if (!parsed) return null

    const rgb = toRgb(parsed)
    if (!rgb) return null

    return {
      r: Math.round((rgb.r || 0) * 255),
      g: Math.round((rgb.g || 0) * 255),
      b: Math.round((rgb.b || 0) * 255),
      a: rgb.alpha
    }
  } catch (error) {
    // Culori can throw on invalid colors
    return null
  }
}

/**
 * Check if two colors are perceptually identical using OKLCH
 */
export function areColorsSimilar(color1: string, color2: string, threshold = 0.02): boolean {
  try {
    const diff = colorDifference(color1, color2)
    return diff !== undefined && diff < threshold
  } catch {
    return false
  }
}

/**
 * Deduplicate colors based on perceptual similarity
 */
export function deduplicateColors(colors: string[]): string[] {
  const unique: string[] = []

  for (const color of colors) {
    const isDuplicate = unique.some(uniqueColor =>
      areColorsSimilar(color, uniqueColor, 0.02)
    )

    if (!isDuplicate) {
      unique.push(color)
    }
  }

  return unique
}

/**
 * Convert HSL to RGB using Culori
 */
export function hslToRgb(hsl: HSLColor): RGBColor {
  const hslColor = {
    mode: 'hsl' as const,
    h: hsl.h,
    s: hsl.s,
    l: hsl.l,
    alpha: hsl.a
  }

  const rgb = toRgb(hslColor)
  if (!rgb) return { r: 0, g: 0, b: 0, a: hsl.a }

  return {
    r: Math.round((rgb.r || 0) * 255),
    g: Math.round((rgb.g || 0) * 255),
    b: Math.round((rgb.b || 0) * 255),
    a: rgb.alpha
  }
}

/**
 * Convert RGB to HSL using Culori
 */
export function rgbToHsl(rgb: RGBColor): HSLColor {
  const rgbColor = {
    mode: 'rgb' as const,
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    alpha: rgb.a
  }

  const hsl = toHsl(rgbColor)
  if (!hsl) return { h: 0, s: 0, l: 0, a: rgb.a }

  return {
    h: Math.round(hsl.h || 0),
    s: Math.round((hsl.s || 0) * 100) / 100,
    l: Math.round((hsl.l || 0) * 100) / 100,
    a: hsl.alpha
  }
}

/**
 * Convert RGB to OKLCH using Culori (proper perceptual color space)
 */
export function rgbToOklch(rgb: RGBColor): OKLCHColor {
  const rgbColor = {
    mode: 'rgb' as const,
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    alpha: rgb.a
  }

  const oklch = toOklch(rgbColor)
  if (!oklch) return { l: 0, c: 0, h: 0, a: rgb.a }

  return {
    l: oklch.l || 0,
    c: oklch.c || 0,
    h: oklch.h || 0,
    a: oklch.alpha
  }
}

/**
 * Convert RGB to W3C Design Token color format
 */
export function rgbToW3C(rgb: RGBColor): W3CColor {
  const components: [number, number, number] | [number, number, number, number] =
    rgb.a !== undefined && rgb.a !== 1
      ? [
          Math.round((rgb.r / 255) * 1000) / 1000,
          Math.round((rgb.g / 255) * 1000) / 1000,
          Math.round((rgb.b / 255) * 1000) / 1000,
          Math.round(rgb.a * 1000) / 1000
        ]
      : [
          Math.round((rgb.r / 255) * 1000) / 1000,
          Math.round((rgb.g / 255) * 1000) / 1000,
          Math.round((rgb.b / 255) * 1000) / 1000
        ]

  return {
    colorSpace: 'srgb',
    components
  }
}

/**
 * Convert any color string to W3C Design Token format using Culori
 */
export function toW3CColor(color: string): W3CColor | null {
  // Safety checks
  if (!color || typeof color !== 'string' || color.trim() === '') {
    return null
  }

  try {
    const parsed = parse(color)
    if (!parsed) return null

    const rgb = toRgb(parsed)
    if (!rgb) return null

    const components: [number, number, number] | [number, number, number, number] =
      rgb.alpha !== undefined && rgb.alpha !== 1
        ? [
            Math.round((rgb.r || 0) * 1000) / 1000,
            Math.round((rgb.g || 0) * 1000) / 1000,
            Math.round((rgb.b || 0) * 1000) / 1000,
            Math.round(rgb.alpha * 1000) / 1000
          ]
        : [
            Math.round((rgb.r || 0) * 1000) / 1000,
            Math.round((rgb.g || 0) * 1000) / 1000,
            Math.round((rgb.b || 0) * 1000) / 1000
          ]

    return {
      colorSpace: 'srgb',
      components
    }
  } catch (error) {
    // Culori can throw on invalid colors
    return null
  }
}

/**
 * Get semantic color name based on RGB values
 */
export function getSemanticColorName(rgb: RGBColor, index: number): string {
  const hsl = rgbToHsl(rgb)
  const { h, s, l } = hsl

  // Grayscale colors
  if (s < 0.1) {
    if (l > 0.95) return `white-${index}`
    if (l > 0.85) return `gray-50-${index}`
    if (l > 0.75) return `gray-100-${index}`
    if (l > 0.65) return `gray-200-${index}`
    if (l > 0.55) return `gray-300-${index}`
    if (l > 0.45) return `gray-400-${index}`
    if (l > 0.35) return `gray-500-${index}`
    if (l > 0.25) return `gray-600-${index}`
    if (l > 0.15) return `gray-700-${index}`
    if (l > 0.05) return `gray-800-${index}`
    return `black-${index}`
  }

  // Chromatic colors
  const shade = l > 0.7 ? 'light' : l > 0.4 ? 'base' : 'dark'

  if (h >= 345 || h < 15) return `red-${shade}-${index}`
  if (h >= 15 && h < 45) return `orange-${shade}-${index}`
  if (h >= 45 && h < 65) return `yellow-${shade}-${index}`
  if (h >= 65 && h < 150) return `green-${shade}-${index}`
  if (h >= 150 && h < 200) return `cyan-${shade}-${index}`
  if (h >= 200 && h < 260) return `blue-${shade}-${index}`
  if (h >= 260 && h < 290) return `purple-${shade}-${index}`
  if (h >= 290 && h < 345) return `pink-${shade}-${index}`

  return `color-${index}`
}

/**
 * Convert RGB to hex string using Culori
 */
export function rgbToHex(rgb: RGBColor): string {
  const rgbColor = {
    mode: 'rgb' as const,
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    alpha: rgb.a
  }

  return formatHex(rgbColor)
}

/**
 * Convert W3C color components to hex
 */
export function w3cToHex(components: number[]): string {
  const rgb = {
    mode: 'rgb' as const,
    r: components[0],
    g: components[1],
    b: components[2],
    alpha: components[3]
  }

  return formatHex(rgb)
}