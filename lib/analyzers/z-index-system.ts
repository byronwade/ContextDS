/**
 * Z-Index Layering System Extractor
 * Detects the stacking context hierarchy used by a site
 * Critical for modals, dropdowns, tooltips, sticky headers, etc.
 */

export interface ZIndexLayer {
  value: number
  usage: number
  semanticLayer: string // 'base' | 'dropdown' | 'sticky' | 'modal' | 'tooltip' | 'popover'
  selectors: string[]
  position?: string // 'fixed' | 'sticky' | 'absolute' | 'relative'
}

export interface ZIndexSystem {
  layers: ZIndexLayer[]
  scale: 'linear' | 'exponential' | 'custom'
  baseValue: number
  increment: number
  maxValue: number
  semanticLayers: {
    base: number // 0-10
    content: number // 10-100
    dropdown: number // 100-1000
    sticky: number // 1000-2000
    overlay: number // 2000-5000
    modal: number // 5000-9000
    popover: number // 9000-9500
    tooltip: number // 9500-10000
  }
}

import type { ComputedStyleEntry } from '../extractors/browser-wrapper'

/**
 * Extract z-index layering system from computed CSS
 */
export function extractZIndexSystem(computedStyles: ComputedStyleEntry[]): ZIndexSystem {
  const zIndexMap = new Map<number, { usage: number; selectors: string[]; positions: string[] }>()

  // Collect all z-index values
  computedStyles.forEach(entry => {
    const s = entry.styles
    const selector = entry.selector

    if (s['z-index'] && s['z-index'] !== 'auto') {
      const zIndex = parseInt(s['z-index'])
      if (isNaN(zIndex)) return

      const entry = zIndexMap.get(zIndex) || { usage: 0, selectors: [], positions: [] }
      entry.usage++
      entry.selectors.push(selector)
      if (s['position']) entry.positions.push(s['position'])
      zIndexMap.set(zIndex, entry)
    }
  })

  // Sort by z-index value
  const sortedLayers = Array.from(zIndexMap.entries())
    .map(([value, data]) => ({
      value,
      usage: data.usage,
      semanticLayer: inferSemanticLayer(value, data.selectors),
      selectors: data.selectors.slice(0, 3),
      position: getMostCommonPosition(data.positions)
    }))
    .sort((a, b) => a.value - b.value)

  // Detect scale type
  const values = sortedLayers.map(l => l.value)
  const scale = detectZIndexScale(values)

  // Detect increment pattern
  const increment = detectIncrement(values)

  // Detect semantic layer ranges
  const semanticLayers = detectSemanticLayers(sortedLayers)

  return {
    layers: sortedLayers,
    scale,
    baseValue: values[0] || 0,
    increment,
    maxValue: values[values.length - 1] || 0,
    semanticLayers
  }
}

/**
 * Infer the semantic purpose of a z-index layer
 */
function inferSemanticLayer(zIndex: number, selectors: string[]): string {
  // Check selector names for hints
  const selectorText = selectors.join(' ').toLowerCase()

  if (selectorText.includes('modal') || selectorText.includes('dialog')) return 'modal'
  if (selectorText.includes('tooltip')) return 'tooltip'
  if (selectorText.includes('popover') || selectorText.includes('popper')) return 'popover'
  if (selectorText.includes('dropdown') || selectorText.includes('menu')) return 'dropdown'
  if (selectorText.includes('sticky') || selectorText.includes('fixed-header')) return 'sticky'
  if (selectorText.includes('overlay') || selectorText.includes('backdrop')) return 'overlay'
  if (selectorText.includes('toast') || selectorText.includes('notification')) return 'notification'

  // Infer from z-index value ranges (common patterns)
  if (zIndex >= 9500) return 'tooltip'
  if (zIndex >= 9000) return 'popover'
  if (zIndex >= 5000) return 'modal'
  if (zIndex >= 2000) return 'overlay'
  if (zIndex >= 1000) return 'sticky'
  if (zIndex >= 100) return 'dropdown'
  if (zIndex >= 10) return 'content'

  return 'base'
}

/**
 * Detect if z-index scale is linear, exponential, or custom
 */
function detectZIndexScale(values: number[]): 'linear' | 'exponential' | 'custom' {
  if (values.length < 3) return 'custom'

  // Check for linear progression (equal differences)
  const differences = values.slice(1).map((val, idx) => val - values[idx])
  const avgDiff = differences.reduce((sum, d) => sum + d, 0) / differences.length
  const isLinear = differences.every(d => Math.abs(d - avgDiff) < avgDiff * 0.3)

  if (isLinear) return 'linear'

  // Check for exponential (each value ~10x or ~2x previous)
  const ratios = values.slice(1).map((val, idx) => val / values[idx])
  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length

  // Common exponential patterns: 1, 10, 100, 1000 or 1, 2, 4, 8
  if (Math.abs(avgRatio - 10) < 3 || Math.abs(avgRatio - 2) < 0.5) {
    return 'exponential'
  }

  return 'custom'
}

/**
 * Detect the increment pattern (for linear scales)
 */
function detectIncrement(values: number[]): number {
  if (values.length < 2) return 1

  const differences = values.slice(1).map((val, idx) => val - values[idx])
  const avgDiff = differences.reduce((sum, d) => sum + d, 0) / differences.length

  // Round to nearest common increment
  const commonIncrements = [1, 5, 10, 50, 100, 500, 1000]
  let closestIncrement = commonIncrements[0]
  let minDiff = Math.abs(avgDiff - commonIncrements[0])

  commonIncrements.forEach(inc => {
    const diff = Math.abs(avgDiff - inc)
    if (diff < minDiff) {
      minDiff = diff
      closestIncrement = inc
    }
  })

  return closestIncrement
}

/**
 * Detect semantic layer ranges
 */
function detectSemanticLayers(layers: ZIndexLayer[]): ZIndexSystem['semanticLayers'] {
  const defaults = {
    base: 1,
    content: 10,
    dropdown: 100,
    sticky: 1000,
    overlay: 5000,
    modal: 5000,
    popover: 9000,
    tooltip: 9500
  }

  // Find actual values for each semantic layer
  layers.forEach(layer => {
    switch (layer.semanticLayer) {
      case 'base':
        if (layer.value < 10) defaults.base = layer.value
        break
      case 'content':
        if (layer.value >= 10 && layer.value < 100) defaults.content = layer.value
        break
      case 'dropdown':
        if (layer.value >= 100 && layer.value < 1000) defaults.dropdown = layer.value
        break
      case 'sticky':
        if (layer.value >= 1000 && layer.value < 5000) defaults.sticky = layer.value
        break
      case 'overlay':
        if (layer.value >= 2000 && layer.value < 9000) defaults.overlay = layer.value
        break
      case 'modal':
        if (layer.value >= 5000 && layer.value < 9000) defaults.modal = layer.value
        break
      case 'popover':
        if (layer.value >= 9000 && layer.value < 9500) defaults.popover = layer.value
        break
      case 'tooltip':
        if (layer.value >= 9500) defaults.tooltip = layer.value
        break
    }
  })

  return defaults
}

/**
 * Get most common position value from array
 */
function getMostCommonPosition(positions: string[]): string | undefined {
  if (positions.length === 0) return undefined

  const counts = new Map<string, number>()
  positions.forEach(pos => counts.set(pos, (counts.get(pos) || 0) + 1))

  let maxCount = 0
  let mostCommon = positions[0]

  counts.forEach((count, pos) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = pos
    }
  })

  return mostCommon
}