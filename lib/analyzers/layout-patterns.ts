/**
 * Layout Pattern Extractor - Detects container widths, grid systems, and flex patterns
 * Helps AI understand the spatial design language of a site
 */

export interface LayoutPattern {
  type: 'container' | 'grid' | 'flex' | 'spacing-system'
  pattern: string
  values: string[]
  usage: number
  confidence: number
  examples: string[] // Selectors where this pattern is used
}

export interface ContainerSystem {
  maxWidths: Array<{ value: string; usage: number; breakpoint?: string }>
  contentWidths: Array<{ value: string; usage: number }>
  sidePaddings: Array<{ value: string; usage: number }>
  centeringPattern: 'margin-auto' | 'flex' | 'grid' | 'mixed'
}

export interface GridSystem {
  columnCounts: Array<{ columns: number; usage: number; selectors: string[] }>
  gaps: Array<{ value: string; usage: number }>
  gridTemplatePatterns: Array<{ pattern: string; usage: number }>
  commonLayouts: Array<{
    name: string
    columns: string
    rows?: string
    gap?: string
    usage: number
  }>
}

export interface FlexSystem {
  directions: Array<{ direction: string; usage: number }>
  justifyPatterns: Array<{ value: string; usage: number }>
  alignPatterns: Array<{ value: string; usage: number }>
  gaps: Array<{ value: string; usage: number }>
  commonLayouts: Array<{
    name: string
    direction: string
    justify: string
    align: string
    gap?: string
    usage: number
  }>
}

export interface SpacingSystem {
  scale: string[] // Detected spacing scale (e.g., ['4px', '8px', '12px', '16px', '24px', '32px'])
  baseUnit: number // Base spacing unit in pixels
  type: 'linear-4' | 'linear-8' | 'fibonacci' | 'golden' | 'custom'
  multipliers: number[] // Common multipliers of base unit
}

export interface LayoutPatterns {
  containers: ContainerSystem
  grids: GridSystem
  flex: FlexSystem
  spacing: SpacingSystem
  breakpoints: Array<{ value: string; usage: number }>
}

import type { ComputedStyleEntry } from '../extractors/browser-wrapper'

/**
 * Extract layout patterns from computed CSS
 */
export function extractLayoutPatterns(computedStyles: ComputedStyleEntry[]): LayoutPatterns {
  return {
    containers: extractContainerSystem(computedStyles),
    grids: extractGridSystem(computedStyles),
    flex: extractFlexSystem(computedStyles),
    spacing: extractSpacingSystem(computedStyles),
    breakpoints: extractBreakpoints(computedStyles)
  }
}

/**
 * Extract container/wrapper patterns
 */
function extractContainerSystem(styles: ComputedStyleEntry[]): ContainerSystem {
  const maxWidths = new Map<string, number>()
  const contentWidths = new Map<string, number>()
  const sidePaddings = new Map<string, number>()
  let marginAutoCount = 0
  let flexCenterCount = 0
  let gridCenterCount = 0

  styles.forEach(entry => {
    const s = entry.styles

    // Max-width patterns (containers)
    if (s['max-width'] && s['max-width'] !== 'none') {
      const val = s['max-width']
      maxWidths.set(val, (maxWidths.get(val) || 0) + 1)
    }

    // Width patterns (content areas)
    if (s['width'] && !s['width'].includes('%') && s['width'] !== 'auto') {
      const val = s['width']
      contentWidths.set(val, (contentWidths.get(val) || 0) + 1)
    }

    // Side padding patterns
    if (s['padding-left'] && s['padding-right']) {
      if (s['padding-left'] === s['padding-right']) {
        sidePaddings.set(s['padding-left'], (sidePaddings.get(s['padding-left']) || 0) + 1)
      }
    }

    // Centering patterns
    if (s['margin-left'] === 'auto' && s['margin-right'] === 'auto') marginAutoCount++
    if (s['display'] === 'flex' && s['justify-content'] === 'center') flexCenterCount++
    if (s['display'] === 'grid' && s['place-items'] === 'center') gridCenterCount++
  })

  // Determine primary centering pattern
  let centeringPattern: ContainerSystem['centeringPattern'] = 'margin-auto'
  if (flexCenterCount > marginAutoCount && flexCenterCount > gridCenterCount) {
    centeringPattern = 'flex'
  } else if (gridCenterCount > marginAutoCount && gridCenterCount > flexCenterCount) {
    centeringPattern = 'grid'
  } else if (marginAutoCount > 0 && flexCenterCount > 0) {
    centeringPattern = 'mixed'
  }

  return {
    maxWidths: Array.from(maxWidths.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage),
    contentWidths: Array.from(contentWidths.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5),
    sidePaddings: Array.from(sidePaddings.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5),
    centeringPattern
  }
}

/**
 * Extract CSS Grid patterns
 */
function extractGridSystem(styles: ComputedStyleEntry[]): GridSystem {
  const columnCounts = new Map<number, { usage: number; selectors: string[] }>()
  const gaps = new Map<string, number>()
  const templatePatterns = new Map<string, number>()
  const layouts = new Map<string, any>()

  styles.forEach(entry => {
    const s = entry.styles
    const selector = entry.selector

    if (s['display'] !== 'grid') return

    // Grid template columns
    if (s['grid-template-columns']) {
      const template = s['grid-template-columns']
      templatePatterns.set(template, (templatePatterns.get(template) || 0) + 1)

      // Count columns
      const columnCount = countGridColumns(template)
      if (columnCount > 0) {
        const entry = columnCounts.get(columnCount) || { usage: 0, selectors: [] }
        entry.usage++
        entry.selectors.push(selector)
        columnCounts.set(columnCount, entry)
      }
    }

    // Grid gap
    if (s['gap'] || s['grid-gap']) {
      const gap = s['gap'] || s['grid-gap']
      gaps.set(gap, (gaps.get(gap) || 0) + 1)
    }

    // Common layout patterns
    const layoutKey = `${s['grid-template-columns'] || 'auto'}_${s['gap'] || '0'}`
    if (!layouts.has(layoutKey)) {
      layouts.set(layoutKey, {
        name: inferGridLayoutName(s['grid-template-columns'], s['grid-template-rows']),
        columns: s['grid-template-columns'] || 'auto',
        rows: s['grid-template-rows'],
        gap: s['gap'] || s['grid-gap'],
        usage: 0
      })
    }
    layouts.get(layoutKey).usage++
  })

  return {
    columnCounts: Array.from(columnCounts.entries())
      .map(([columns, data]) => ({ columns, usage: data.usage, selectors: data.selectors.slice(0, 3) }))
      .sort((a, b) => b.usage - a.usage),
    gaps: Array.from(gaps.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5),
    gridTemplatePatterns: Array.from(templatePatterns.entries())
      .map(([pattern, usage]) => ({ pattern, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8),
    commonLayouts: Array.from(layouts.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5)
  }
}

/**
 * Extract Flexbox patterns
 */
function extractFlexSystem(styles: ComputedStyleEntry[]): FlexSystem {
  const directions = new Map<string, number>()
  const justifyPatterns = new Map<string, number>()
  const alignPatterns = new Map<string, number>()
  const gaps = new Map<string, number>()
  const layouts = new Map<string, any>()

  styles.forEach(entry => {
    const s = entry.styles

    if (s['display'] !== 'flex' && s['display'] !== 'inline-flex') return

    // Flex direction
    const direction = s['flex-direction'] || 'row'
    directions.set(direction, (directions.get(direction) || 0) + 1)

    // Justify content
    if (s['justify-content']) {
      justifyPatterns.set(s['justify-content'], (justifyPatterns.get(s['justify-content']) || 0) + 1)
    }

    // Align items
    if (s['align-items']) {
      alignPatterns.set(s['align-items'], (alignPatterns.get(s['align-items']) || 0) + 1)
    }

    // Gap
    if (s['gap']) {
      gaps.set(s['gap'], (gaps.get(s['gap']) || 0) + 1)
    }

    // Common layout patterns
    const layoutKey = `${direction}_${s['justify-content'] || 'start'}_${s['align-items'] || 'stretch'}`
    if (!layouts.has(layoutKey)) {
      layouts.set(layoutKey, {
        name: inferFlexLayoutName(direction, s['justify-content'], s['align-items']),
        direction,
        justify: s['justify-content'] || 'flex-start',
        align: s['align-items'] || 'stretch',
        gap: s['gap'],
        usage: 0
      })
    }
    layouts.get(layoutKey).usage++
  })

  return {
    directions: Array.from(directions.entries())
      .map(([direction, usage]) => ({ direction, usage }))
      .sort((a, b) => b.usage - a.usage),
    justifyPatterns: Array.from(justifyPatterns.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage),
    alignPatterns: Array.from(alignPatterns.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage),
    gaps: Array.from(gaps.entries())
      .map(([value, usage]) => ({ value, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5),
    commonLayouts: Array.from(layouts.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8)
  }
}

/**
 * Extract spacing system and detect scale type
 */
function extractSpacingSystem(styles: ComputedStyleEntry[]): SpacingSystem {
  const spacingValues = new Set<number>()

  styles.forEach(entry => {
    const s = entry.styles

    // Collect all spacing values
    const spacingProps = [
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'gap', 'row-gap', 'column-gap'
    ]

    spacingProps.forEach(prop => {
      if (s[prop]) {
        const pixels = parseToPixels(s[prop])
        if (pixels > 0 && pixels < 200) spacingValues.add(pixels)
      }
    })
  })

  const sortedSpacing = Array.from(spacingValues).sort((a, b) => a - b)

  // Detect base unit (most common GCD)
  const baseUnit = detectBaseUnit(sortedSpacing)

  // Detect scale type
  const scaleType = detectScaleType(sortedSpacing, baseUnit)

  // Calculate multipliers
  const multipliers = sortedSpacing
    .map(val => val / baseUnit)
    .filter((mult, idx, arr) => arr.indexOf(mult) === idx)
    .sort((a, b) => a - b)

  return {
    scale: sortedSpacing.map(v => `${v}px`),
    baseUnit,
    type: scaleType,
    multipliers
  }
}

/**
 * Extract responsive breakpoints from media queries
 */
function extractBreakpoints(styles: ComputedStyleEntry[]): Array<{ value: string; usage: number }> {
  const breakpoints = new Map<string, number>()

  // This would need to be enhanced to parse actual media queries
  // For now, we'll detect common breakpoint values from max-width queries
  const commonBreakpoints = ['640px', '768px', '1024px', '1280px', '1536px']

  commonBreakpoints.forEach(bp => {
    // In real implementation, we'd parse @media queries from CSS
    // For now, placeholder
    breakpoints.set(bp, 0)
  })

  return Array.from(breakpoints.entries())
    .map(([value, usage]) => ({ value, usage }))
    .filter(bp => bp.usage > 0)
    .sort((a, b) => b.usage - a.usage)
}

/**
 * Helper functions
 */

function countGridColumns(template: string): number {
  // Count explicit columns in grid-template-columns
  // e.g., "repeat(3, 1fr)" = 3, "1fr 1fr 1fr" = 3
  if (template.includes('repeat')) {
    const match = template.match(/repeat\((\d+),/)
    if (match) return parseInt(match[1])
  }

  // Count space-separated values
  return template.split(/\s+/).filter(v => v && v !== '').length
}

function inferGridLayoutName(columns?: string, rows?: string): string {
  if (!columns) return 'Auto Grid'

  if (columns.includes('repeat')) {
    const count = countGridColumns(columns)
    if (count === 2) return '2-Column Grid'
    if (count === 3) return '3-Column Grid'
    if (count === 4) return '4-Column Grid'
    return `${count}-Column Grid`
  }

  if (columns.includes('minmax')) return 'Responsive Grid'
  if (columns.includes('auto-fit') || columns.includes('auto-fill')) return 'Auto-Fill Grid'

  return 'Custom Grid'
}

function inferFlexLayoutName(direction: string, justify?: string, align?: string): string {
  if (direction === 'row') {
    if (justify === 'space-between') return 'Horizontal - Space Between'
    if (justify === 'center' && align === 'center') return 'Centered'
    if (justify === 'flex-end') return 'Right Aligned'
    return 'Horizontal Stack'
  }

  if (direction === 'column') {
    if (align === 'center') return 'Vertical Centered'
    if (justify === 'space-between') return 'Vertical - Space Between'
    return 'Vertical Stack'
  }

  return 'Flex Layout'
}

function parseToPixels(value: string): number {
  if (value.includes('px')) {
    return parseFloat(value)
  }
  if (value.includes('rem')) {
    return parseFloat(value) * 16
  }
  if (value.includes('em')) {
    return parseFloat(value) * 16
  }
  return 0
}

function detectBaseUnit(spacingValues: number[]): number {
  if (spacingValues.length === 0) return 8

  // Common base units to check
  const candidates = [4, 8, 16]

  // Find which base unit best divides all values
  let bestBase = 8
  let bestScore = 0

  candidates.forEach(base => {
    const score = spacingValues.filter(val => val % base === 0).length
    if (score > bestScore) {
      bestScore = score
      bestBase = base
    }
  })

  return bestBase
}

function detectScaleType(values: number[], baseUnit: number): SpacingSystem['type'] {
  if (values.length < 3) return 'custom'

  // Check for linear-4 (4, 8, 12, 16, 20, 24...)
  const isLinear4 = values.every((val, idx) => idx === 0 || val - values[idx - 1] === 4)
  if (isLinear4) return 'linear-4'

  // Check for linear-8 (8, 16, 24, 32, 40...)
  const isLinear8 = values.every((val, idx) => idx === 0 || val - values[idx - 1] === 8)
  if (isLinear8) return 'linear-8'

  // Check for fibonacci (4, 8, 12, 20, 32...)
  const fibonacci = [4, 8, 12, 20, 32, 52, 84]
  const isFibonacci = values.slice(0, 5).every((val, idx) => Math.abs(val - fibonacci[idx]) <= 2)
  if (isFibonacci) return 'fibonacci'

  // Check for golden ratio (~1.618)
  const ratios = values.slice(1).map((val, idx) => val / values[idx])
  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
  if (Math.abs(avgRatio - 1.618) < 0.2) return 'golden'

  return 'custom'
}