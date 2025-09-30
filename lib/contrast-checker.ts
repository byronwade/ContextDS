/**
 * Color Contrast Checker - WCAG 2.1 Compliance
 * Calculates contrast ratios and determines WCAG compliance levels
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Handle shorthand hex (e.g., #fff)
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * Convert RGB color to relative luminance
 * Based on WCAG 2.1 formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 formula: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return null

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * WCAG Compliance Levels
 */
export type WCAGLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail'

/**
 * Check WCAG compliance level for normal text
 * - AAA: contrast ratio >= 7:1
 * - AA: contrast ratio >= 4.5:1
 * - Fail: contrast ratio < 4.5:1
 */
export function getWCAGLevel(ratio: number): WCAGLevel {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

/**
 * Check WCAG compliance level for large text (18pt+ or 14pt+ bold)
 * - AAA: contrast ratio >= 4.5:1
 * - AA: contrast ratio >= 3:1
 * - Fail: contrast ratio < 3:1
 */
export function getWCAGLevelLargeText(ratio: number): WCAGLevel {
  if (ratio >= 4.5) return 'AAA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

/**
 * Get contrast information for a foreground/background pair
 */
export interface ContrastInfo {
  ratio: number
  normalText: WCAGLevel
  largeText: WCAGLevel
  passes: boolean
}

export function getContrastInfo(foreground: string, background: string): ContrastInfo | null {
  const ratio = getContrastRatio(foreground, background)

  if (ratio === null) return null

  const normalText = getWCAGLevel(ratio)
  const largeText = getWCAGLevelLargeText(ratio)

  return {
    ratio,
    normalText,
    largeText,
    passes: normalText !== 'Fail'
  }
}

/**
 * Check if a color is light or dark (useful for determining text color)
 */
export function isLightColor(color: string): boolean {
  const rgb = hexToRgb(color)
  if (!rgb) return false

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
  return luminance > 0.5
}

/**
 * Get suggested text color (black or white) for a background
 */
export function getSuggestedTextColor(backgroundColor: string): '#000000' | '#ffffff' {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff'
}

/**
 * Format contrast ratio for display
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}

/**
 * Get badge color for WCAG level
 */
export function getWCAGBadgeColor(level: WCAGLevel): string {
  switch (level) {
    case 'AAA':
      return 'bg-green-500'
    case 'AA':
      return 'bg-blue-500'
    case 'AA Large':
      return 'bg-yellow-500'
    case 'Fail':
      return 'bg-red-500'
  }
}