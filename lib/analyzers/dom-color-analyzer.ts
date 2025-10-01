/**
 * DOM-Aware Color Analyzer
 * Runs in the browser to gather visual context for colors
 *
 * This analyzer solves the "black/white/gray dominance" problem by:
 * 1. Weighing colors by visual area (large hero sections >> small borders)
 * 2. Prioritizing above-the-fold content
 * 3. Boosting brand-critical elements (CTAs, logos, nav)
 * 4. Filtering out utility colors (pure black/white on backgrounds/text)
 */

export interface DOMColorContext {
  hex: string
  visualWeight: number  // 0-100, based on element area and position
  elementType: 'hero' | 'cta' | 'nav' | 'logo' | 'heading' | 'body' | 'background' | 'border' | 'other'
  aboveFold: boolean
  selector: string
  area: number  // pixels
  count: number // how many elements use this color
}

export interface EnhancedColorUsage {
  hex: string
  rawCount: number  // CSS usage count
  visualScore: number  // Smart score considering context
  contexts: DOMColorContext[]
  brandScore: number  // Higher = more likely to be brand color
  utilityPenalty: number  // Penalty for being a utility color
}

/**
 * Run this in the browser via page.evaluate()
 * Returns color usage with visual context
 */
export function analyzeDOMColorsInBrowser(): EnhancedColorUsage[] {
  const colorMap = new Map<string, EnhancedColorUsage>()

  // Get viewport height for above-fold detection
  const viewportHeight = window.innerHeight

  // Utility color detection (pure blacks, whites, grays)
  const isUtilityColor = (hex: string): boolean => {
    const rgb = hexToRgb(hex)
    if (!rgb) return false

    const { r, g, b } = rgb
    const isGrayscale = Math.abs(r - g) < 10 && Math.abs(g - b) < 10
    const isPureBlack = r < 30 && g < 30 && b < 30
    const isPureWhite = r > 240 && g > 240 && b > 240

    return isGrayscale || isPureBlack || isPureWhite
  }

  // Element type detection for brand importance
  const getElementType = (element: Element): DOMColorContext['elementType'] => {
    const tag = element.tagName.toLowerCase()
    const className = element.className.toString().toLowerCase()
    const id = element.id.toLowerCase()
    const role = element.getAttribute('role')?.toLowerCase()

    // Hero sections
    if (className.includes('hero') || className.includes('banner') || className.includes('masthead')) {
      return 'hero'
    }

    // CTAs and buttons
    if (tag === 'button' || role === 'button' ||
        className.includes('cta') || className.includes('btn') || className.includes('button') ||
        className.includes('call-to-action') || className.includes('primary-action')) {
      return 'cta'
    }

    // Navigation
    if (tag === 'nav' || role === 'navigation' ||
        className.includes('nav') || className.includes('menu') || className.includes('header')) {
      return 'nav'
    }

    // Logos
    if (className.includes('logo') || id.includes('logo') ||
        element.querySelector('svg')?.classList.contains('logo')) {
      return 'logo'
    }

    // Headings
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      return 'heading'
    }

    // Body text
    if (tag === 'p' || tag === 'span' || tag === 'div' && !className && !id) {
      return 'body'
    }

    return 'other'
  }

  // Calculate visual weight based on area, position, and type
  const calculateVisualWeight = (element: Element, elementType: DOMColorContext['elementType']): number => {
    const rect = element.getBoundingClientRect()
    const area = rect.width * rect.height

    // Base weight from area (log scale to prevent huge elements dominating)
    const areaScore = Math.min(100, Math.log10(area + 1) * 15)

    // Above fold boost
    const aboveFoldBoost = rect.top < viewportHeight ? 30 : 0

    // Element type boost (brand-critical elements)
    const typeBoost = {
      'logo': 50,
      'hero': 40,
      'cta': 35,
      'nav': 25,
      'heading': 15,
      'body': 5,
      'background': 2,
      'border': 1,
      'other': 5
    }[elementType]

    return Math.min(100, areaScore + aboveFoldBoost + typeBoost)
  }

  // Extract color from computed style
  const extractColors = (element: Element) => {
    const computed = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    // Skip if element is not visible or has zero area
    if (rect.width === 0 || rect.height === 0 ||
        computed.display === 'none' || computed.visibility === 'hidden') {
      return
    }

    const elementType = getElementType(element)
    const area = rect.width * rect.height
    const aboveFold = rect.top < viewportHeight
    const visualWeight = calculateVisualWeight(element, elementType)

    // Extract colors from various properties
    const colorProperties = [
      { prop: 'color', type: elementType === 'body' ? 'text' : 'foreground' },
      { prop: 'backgroundColor', type: 'background' },
      { prop: 'borderColor', type: 'border' },
      { prop: 'outlineColor', type: 'border' },
    ]

    for (const { prop, type } of colorProperties) {
      const color = computed[prop as any]
      if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') continue

      const hex = rgbToHex(color)
      if (!hex) continue

      // Get or create color entry
      if (!colorMap.has(hex)) {
        colorMap.set(hex, {
          hex,
          rawCount: 0,
          visualScore: 0,
          contexts: [],
          brandScore: 0,
          utilityPenalty: isUtilityColor(hex) ? 0.3 : 0  // 70% penalty for utility colors
        })
      }

      const entry = colorMap.get(hex)!
      entry.rawCount++

      // Create context
      const context: DOMColorContext = {
        hex,
        visualWeight,
        elementType: type === 'border' ? 'border' : elementType,
        aboveFold,
        selector: getSimpleSelector(element),
        area,
        count: 1
      }

      entry.contexts.push(context)

      // Accumulate visual score (weighted by type importance)
      const typeWeight = {
        'logo': 10,
        'hero': 8,
        'cta': 7,
        'nav': 5,
        'heading': 3,
        'body': type === 'background' ? 0.5 : 1,
        'background': type === 'background' ? 0.5 : 2,
        'border': 0.3,
        'other': 1
      }[context.elementType] || 1

      entry.visualScore += visualWeight * typeWeight
    }
  }

  // Traverse all elements in DOM
  const allElements = document.querySelectorAll('*')
  allElements.forEach(extractColors)

  // Calculate brand scores
  colorMap.forEach((entry) => {
    // Brand score = visual score * (1 - utility penalty)
    const penaltyMultiplier = 1 - entry.utilityPenalty
    entry.brandScore = entry.visualScore * penaltyMultiplier

    // Boost for colors used in critical brand elements
    const criticalElements = entry.contexts.filter(c =>
      c.elementType === 'logo' || c.elementType === 'hero' || c.elementType === 'cta'
    )

    if (criticalElements.length > 0) {
      const criticalBoost = criticalElements.reduce((sum, c) => sum + c.visualWeight, 0)
      entry.brandScore += criticalBoost * 2  // 2x boost for critical elements
    }
  })

  return Array.from(colorMap.values())
}

// Helper functions (these run in browser context)
function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function getSimpleSelector(element: Element): string {
  if (element.id) return `#${element.id}`
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 2)
    if (classes.length > 0) return `.${classes.join('.')}`
  }
  return element.tagName.toLowerCase()
}
