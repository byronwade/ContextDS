/**
 * Component-level design pattern extraction
 * Identifies buttons, inputs, cards, and other UI components with their specific design properties
 */

import type { W3CTokenSet } from './w3c-tokenizer'

export interface ComponentPattern {
  type: 'button' | 'input' | 'card' | 'badge' | 'alert' | 'link' | 'heading' | 'text'
  variant?: string
  properties: {
    // Typography
    fontSize?: string
    fontWeight?: string
    lineHeight?: string
    textTransform?: string
    letterSpacing?: string

    // Spacing
    paddingX?: string
    paddingY?: string
    padding?: string
    gap?: string

    // Borders & Radius
    borderWidth?: string
    borderRadius?: string
    borderColor?: string

    // Colors
    backgroundColor?: string
    textColor?: string
    borderColorValue?: string

    // Shadows
    boxShadow?: string

    // States
    hover?: Partial<ComponentPattern['properties']>
    active?: Partial<ComponentPattern['properties']>
    focus?: Partial<ComponentPattern['properties']>
    disabled?: Partial<ComponentPattern['properties']>
  }
  usage: number
  confidence: number
  selectors: string[]
}

export interface ComponentLibrary {
  buttons: ComponentPattern[]
  inputs: ComponentPattern[]
  cards: ComponentPattern[]
  badges: ComponentPattern[]
  alerts: ComponentPattern[]
  links: ComponentPattern[]
  headings: ComponentPattern[]
  text: ComponentPattern[]
}

import type { ComputedStyleEntry } from '../extractors/browser-wrapper'

/**
 * Extract component patterns from computed CSS
 */
export function extractComponents(computedStyles: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentLibrary {
  const library: ComponentLibrary = {
    buttons: [],
    inputs: [],
    cards: [],
    badges: [],
    alerts: [],
    links: [],
    headings: [],
    text: []
  }

  // Group styles by element type (already categorized by browser extraction)
  const buttonSelectors = computedStyles.filter(s => s.element === 'button')
  const inputSelectors = computedStyles.filter(s => s.element === 'input')
  const cardSelectors = computedStyles.filter(s => s.element === 'card')
  const badgeSelectors = computedStyles.filter(s => s.element === 'badge')
  const alertSelectors = computedStyles.filter(s => s.element === 'alert')
  const linkSelectors = computedStyles.filter(s => s.element === 'link')
  const headingSelectors = computedStyles.filter(s => s.element === 'heading')
  const textSelectors = computedStyles.filter(s => s.element === 'text')

  // Extract button patterns
  library.buttons = extractButtonPatterns(buttonSelectors, tokenSet)
  library.inputs = extractInputPatterns(inputSelectors, tokenSet)
  library.cards = extractCardPatterns(cardSelectors, tokenSet)
  library.badges = extractBadgePatterns(badgeSelectors, tokenSet)
  library.alerts = extractAlertPatterns(alertSelectors, tokenSet)
  library.links = extractLinkPatterns(linkSelectors, tokenSet)
  library.headings = extractHeadingPatterns(headingSelectors, tokenSet)
  library.text = extractTextPatterns(textSelectors, tokenSet)

  return library
}

/**
 * Selector pattern matchers
 */
function isButtonSelector(selector: string): boolean {
  const patterns = [
    /\bbutton\b/i,
    /\bbtn\b/i,
    /\[role="button"\]/,
    /\[type="button"\]/,
    /\[type="submit"\]/,
    /\..*button/i,
    /\.btn-/i
  ]
  return patterns.some(p => p.test(selector))
}

function isInputSelector(selector: string): boolean {
  const patterns = [
    /\binput\b/i,
    /\btextarea\b/i,
    /\bselect\b/i,
    /\[type="text"\]/,
    /\[type="email"\]/,
    /\[type="password"\]/,
    /\..*input/i,
    /\.form-control/i
  ]
  return patterns.some(p => p.test(selector))
}

function isCardSelector(selector: string): boolean {
  const patterns = [
    /\bcard\b/i,
    /\bpanel\b/i,
    /\bbox\b/i,
    /\.card-/i,
    /\.panel-/i
  ]
  return patterns.some(p => p.test(selector))
}

function isBadgeSelector(selector: string): boolean {
  const patterns = [
    /\bbadge\b/i,
    /\btag\b/i,
    /\blabel\b/i,
    /\bchip\b/i,
    /\.badge-/i,
    /\.tag-/i
  ]
  return patterns.some(p => p.test(selector))
}

function isAlertSelector(selector: string): boolean {
  const patterns = [
    /\balert\b/i,
    /\bnotification\b/i,
    /\btoast\b/i,
    /\bmessage\b/i,
    /\.alert-/i,
    /\[role="alert"\]/
  ]
  return patterns.some(p => p.test(selector))
}

function isLinkSelector(selector: string): boolean {
  const patterns = [
    /^a\b/,
    /^a:/,
    /\[href\]/,
    /\.link\b/i
  ]
  return patterns.some(p => p.test(selector))
}

function isHeadingSelector(selector: string): boolean {
  return /^h[1-6]\b/.test(selector)
}

function isTextSelector(selector: string): boolean {
  const patterns = [
    /^p\b/,
    /\btext\b/i,
    /\bcopy\b/i,
    /\.text-/i
  ]
  return patterns.some(p => p.test(selector))
}

/**
 * Extract button patterns with variants
 */
function extractButtonPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'button')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    const hoverStyles = group.states.hover?.styles
    const activeStyles = group.states.active?.styles
    const focusStyles = group.states.focus?.styles
    const disabledStyles = group.states.disabled?.styles

    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'button',
      variant: group.variant,
      properties: {
        fontSize: baseStyles['font-size'],
        fontWeight: baseStyles['font-weight'],
        lineHeight: baseStyles['line-height'],
        textTransform: baseStyles['text-transform'],
        letterSpacing: baseStyles['letter-spacing'],

        paddingX: baseStyles['padding-left'] || baseStyles['padding-right'],
        paddingY: baseStyles['padding-top'] || baseStyles['padding-bottom'],
        padding: baseStyles['padding'],

        borderWidth: baseStyles['border-width'],
        borderRadius: baseStyles['border-radius'],
        borderColor: baseStyles['border-color'],

        backgroundColor: baseStyles['background-color'],
        textColor: baseStyles['color'],

        boxShadow: baseStyles['box-shadow'],

        hover: hoverStyles ? {
          backgroundColor: hoverStyles['background-color'],
          textColor: hoverStyles['color'],
          borderColor: hoverStyles['border-color'],
          boxShadow: hoverStyles['box-shadow']
        } : undefined,

        active: activeStyles ? {
          backgroundColor: activeStyles['background-color'],
          textColor: activeStyles['color'],
          transform: activeStyles['transform']
        } : undefined,

        focus: focusStyles ? {
          boxShadow: focusStyles['box-shadow'],
          borderColor: focusStyles['border-color'],
          outline: focusStyles['outline']
        } : undefined,

        disabled: disabledStyles ? {
          backgroundColor: disabledStyles['background-color'],
          textColor: disabledStyles['color'],
          opacity: disabledStyles['opacity'],
          cursor: disabledStyles['cursor']
        } : undefined
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Extract input patterns
 */
function extractInputPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'input')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'input',
      variant: group.variant,
      properties: {
        fontSize: baseStyles['font-size'],
        fontWeight: baseStyles['font-weight'],
        lineHeight: baseStyles['line-height'],

        padding: baseStyles['padding'],
        paddingX: baseStyles['padding-left'] || baseStyles['padding-right'],
        paddingY: baseStyles['padding-top'] || baseStyles['padding-bottom'],

        borderWidth: baseStyles['border-width'],
        borderRadius: baseStyles['border-radius'],
        borderColor: baseStyles['border-color'],

        backgroundColor: baseStyles['background-color'],
        textColor: baseStyles['color'],

        focus: group.states.focus ? {
          borderColor: group.states.focus.styles['border-color'],
          boxShadow: group.states.focus.styles['box-shadow'],
          outline: group.states.focus.styles['outline']
        } : undefined
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Extract card patterns
 */
function extractCardPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'card')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'card',
      variant: group.variant,
      properties: {
        padding: baseStyles['padding'],
        gap: baseStyles['gap'],

        borderWidth: baseStyles['border-width'],
        borderRadius: baseStyles['border-radius'],
        borderColor: baseStyles['border-color'],

        backgroundColor: baseStyles['background-color'],
        boxShadow: baseStyles['box-shadow'],

        hover: group.states.hover ? {
          boxShadow: group.states.hover.styles['box-shadow'],
          transform: group.states.hover.styles['transform']
        } : undefined
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Extract badge patterns
 */
function extractBadgePatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'badge')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'badge',
      variant: group.variant,
      properties: {
        fontSize: baseStyles['font-size'],
        fontWeight: baseStyles['font-weight'],
        textTransform: baseStyles['text-transform'],

        paddingX: baseStyles['padding-left'] || baseStyles['padding-right'],
        paddingY: baseStyles['padding-top'] || baseStyles['padding-bottom'],

        borderRadius: baseStyles['border-radius'],
        backgroundColor: baseStyles['background-color'],
        textColor: baseStyles['color']
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Extract alert/notification patterns
 */
function extractAlertPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'alert')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'alert',
      variant: group.variant,
      properties: {
        padding: baseStyles['padding'],
        gap: baseStyles['gap'],

        borderWidth: baseStyles['border-width'],
        borderRadius: baseStyles['border-radius'],
        borderColor: baseStyles['border-color'],

        backgroundColor: baseStyles['background-color'],
        textColor: baseStyles['color']
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Extract link patterns
 */
function extractLinkPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'link')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'link',
      variant: group.variant,
      properties: {
        fontSize: baseStyles['font-size'],
        fontWeight: baseStyles['font-weight'],
        textColor: baseStyles['color'],
        textDecoration: baseStyles['text-decoration'],

        hover: group.states.hover ? {
          textColor: group.states.hover.styles['color'],
          textDecoration: group.states.hover.styles['text-decoration']
        } : undefined
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Extract heading patterns
 */
function extractHeadingPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []

  // Group by h1, h2, h3, etc.
  const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

  levels.forEach(level => {
    const levelSelectors = selectors.filter(s => s.selector.startsWith(level))
    if (levelSelectors.length === 0) return

    const baseStyles = levelSelectors[0]?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'heading',
      variant: level,
      properties: {
        fontSize: baseStyles['font-size'],
        fontWeight: baseStyles['font-weight'],
        lineHeight: baseStyles['line-height'],
        letterSpacing: baseStyles['letter-spacing'],
        textColor: baseStyles['color'],
        marginBottom: baseStyles['margin-bottom']
      },
      usage: levelSelectors.length,
      confidence: 100,
      selectors: levelSelectors.map(s => s.selector)
    }

    patterns.push(pattern)
  })

  return patterns
}

/**
 * Extract text/paragraph patterns
 */
function extractTextPatterns(selectors: ComputedStyleEntry[], tokenSet: W3CTokenSet): ComponentPattern[] {
  const patterns: ComponentPattern[] = []
  const grouped = groupByVariant(selectors, 'text')

  grouped.forEach(group => {
    const baseStyles = group.base?.styles
    if (!baseStyles) return

    const pattern: ComponentPattern = {
      type: 'text',
      variant: group.variant,
      properties: {
        fontSize: baseStyles['font-size'],
        fontWeight: baseStyles['font-weight'],
        lineHeight: baseStyles['line-height'],
        textColor: baseStyles['color'],
        letterSpacing: baseStyles['letter-spacing']
      },
      usage: group.usage,
      confidence: calculateConfidence(baseStyles),
      selectors: group.selectors
    }

    patterns.push(pattern)
  })

  return patterns.sort((a, b) => b.usage - a.usage)
}

/**
 * Group selectors by variant (primary, secondary, etc.)
 */
function groupByVariant(selectors: ComputedStyleEntry[], type: string): any[] {
  const groups = new Map<string, any>()

  selectors.forEach(entry => {
    const variant = inferVariant(entry.selector, type)

    if (!groups.has(variant)) {
      groups.set(variant, {
        variant,
        base: null,
        states: {
          hover: null,
          active: null,
          focus: null,
          disabled: null
        },
        usage: 0,
        selectors: []
      })
    }

    const group = groups.get(variant)!
    group.usage++
    group.selectors.push(entry.selector)

    // Determine if this is a base style or state
    if (entry.selector.includes(':hover')) {
      group.states.hover = entry
    } else if (entry.selector.includes(':active')) {
      group.states.active = entry
    } else if (entry.selector.includes(':focus')) {
      group.states.focus = entry
    } else if (entry.selector.includes(':disabled') || entry.selector.includes('[disabled]')) {
      group.states.disabled = entry
    } else {
      group.base = entry
    }
  })

  return Array.from(groups.values())
}

/**
 * Infer variant from selector name
 */
function inferVariant(selector: string, type: string): string {
  const variants = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'info', 'default', 'ghost', 'outline']

  for (const variant of variants) {
    if (selector.toLowerCase().includes(variant)) {
      return variant
    }
  }

  return 'default'
}

/**
 * Calculate confidence score based on completeness
 */
function calculateConfidence(styles: any): number {
  const requiredProps = ['font-size', 'color', 'padding', 'border-radius']
  const present = requiredProps.filter(prop => styles[prop]).length
  return Math.round((present / requiredProps.length) * 100)
}