/**
 * Animation & Transition Pattern Extractor
 * Detects timing functions, durations, and common animation patterns
 */

export interface AnimationPattern {
  type: 'transition' | 'animation' | 'transform'
  property?: string
  duration: string
  timingFunction: string
  delay?: string
  usage: number
  selectors: string[]
}

export interface AnimationSystem {
  durations: Array<{ value: string; ms: number; usage: number; semantic: string }>
  timingFunctions: Array<{ value: string; usage: number; semantic: string }>
  commonTransitions: Array<{
    properties: string[]
    duration: string
    timing: string
    usage: number
    semantic: string
  }>
  transformPatterns: Array<{ transform: string; usage: number; context: string }>
  interactionPatterns: {
    hover: AnimationPattern[]
    focus: AnimationPattern[]
    active: AnimationPattern[]
  }
}

import type { ComputedStyleEntry } from '../extractors/browser-wrapper'

/**
 * Extract animation and transition patterns from computed CSS
 */
export function extractAnimationPatterns(computedStyles: ComputedStyleEntry[]): AnimationSystem {
  const durations = new Map<string, number>()
  const timingFunctions = new Map<string, number>()
  const transitions = new Map<string, { duration: string; timing: string; properties: string[]; usage: number }>()
  const transforms = new Map<string, { usage: number; selectors: string[] }>()

  const hoverPatterns: AnimationPattern[] = []
  const focusPatterns: AnimationPattern[] = []
  const activePatterns: AnimationPattern[] = []

  computedStyles.forEach(entry => {
    const s = entry.styles
    const selector = entry.selector

    // Transition durations
    if (s['transition-duration']) {
      const dur = s['transition-duration']
      durations.set(dur, (durations.get(dur) || 0) + 1)
    }

    // Timing functions
    if (s['transition-timing-function']) {
      const timing = s['transition-timing-function']
      timingFunctions.set(timing, (timingFunctions.get(timing) || 0) + 1)
    }

    // Full transition patterns
    if (s['transition']) {
      parseTransition(s['transition'], transitions)
    }

    // Transform patterns
    if (s['transform'] && s['transform'] !== 'none') {
      const key = s['transform']
      const entry = transforms.get(key) || { usage: 0, selectors: [] }
      entry.usage++
      entry.selectors.push(selector)
      transforms.set(key, entry)
    }

    // Interaction-specific patterns
    if (selector.includes(':hover')) {
      if (s['transition'] || s['transform']) {
        hoverPatterns.push(createAnimationPattern(s, selector, 'transition'))
      }
    }

    if (selector.includes(':focus')) {
      if (s['transition'] || s['transform']) {
        focusPatterns.push(createAnimationPattern(s, selector, 'transition'))
      }
    }

    if (selector.includes(':active')) {
      if (s['transition'] || s['transform']) {
        activePatterns.push(createAnimationPattern(s, selector, 'transition'))
      }
    }
  })

  return {
    durations: Array.from(durations.entries())
      .map(([value, usage]) => ({
        value,
        ms: parseDurationToMs(value),
        usage,
        semantic: inferDurationSemantic(parseDurationToMs(value))
      }))
      .sort((a, b) => b.usage - a.usage),

    timingFunctions: Array.from(timingFunctions.entries())
      .map(([value, usage]) => ({
        value,
        usage,
        semantic: inferTimingSemantic(value)
      }))
      .sort((a, b) => b.usage - a.usage),

    commonTransitions: Array.from(transitions.values())
      .map(t => ({
        properties: t.properties,
        duration: t.duration,
        timing: t.timing,
        usage: t.usage,
        semantic: inferTransitionSemantic(t.properties)
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10),

    transformPatterns: Array.from(transforms.entries())
      .map(([transform, data]) => ({
        transform,
        usage: data.usage,
        context: inferTransformContext(transform, data.selectors)
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10),

    interactionPatterns: {
      hover: hoverPatterns.slice(0, 5),
      focus: focusPatterns.slice(0, 5),
      active: activePatterns.slice(0, 5)
    }
  }
}

/**
 * Parse transition shorthand into structured data
 */
function parseTransition(
  transition: string,
  map: Map<string, { duration: string; timing: string; properties: string[]; usage: number }>
) {
  // Simple parsing: "all 0.3s ease" or "opacity 200ms, transform 300ms"
  const parts = transition.split(',').map(t => t.trim())

  parts.forEach(part => {
    const tokens = part.split(/\s+/)
    const property = tokens[0] || 'all'
    const duration = tokens[1] || '0s'
    const timing = tokens[2] || 'ease'

    const key = `${property}_${duration}_${timing}`
    const entry = map.get(key) || { duration, timing, properties: [], usage: 0 }

    if (!entry.properties.includes(property)) {
      entry.properties.push(property)
    }
    entry.usage++

    map.set(key, entry)
  })
}

/**
 * Create animation pattern object from style
 */
function createAnimationPattern(style: any, selector: string, type: AnimationPattern['type']): AnimationPattern {
  return {
    type,
    property: style['transition-property'] || 'all',
    duration: style['transition-duration'] || style['animation-duration'] || '0s',
    timingFunction: style['transition-timing-function'] || style['animation-timing-function'] || 'ease',
    delay: style['transition-delay'] || style['animation-delay'],
    usage: 1,
    selectors: [selector]
  }
}

/**
 * Parse duration string to milliseconds
 */
function parseDurationToMs(duration: string): number {
  if (duration.endsWith('ms')) {
    return parseFloat(duration)
  }
  if (duration.endsWith('s')) {
    return parseFloat(duration) * 1000
  }
  return 0
}

/**
 * Infer semantic meaning of duration
 */
function inferDurationSemantic(ms: number): string {
  if (ms === 0) return 'Instant'
  if (ms <= 100) return 'Very Fast'
  if (ms <= 200) return 'Fast'
  if (ms <= 300) return 'Normal'
  if (ms <= 500) return 'Slow'
  if (ms <= 800) return 'Very Slow'
  return 'Extra Slow'
}

/**
 * Infer semantic meaning of timing function
 */
function inferTimingSemantic(timing: string): string {
  if (timing === 'linear') return 'Linear'
  if (timing === 'ease') return 'Ease (Default)'
  if (timing === 'ease-in') return 'Ease In (Accelerate)'
  if (timing === 'ease-out') return 'Ease Out (Decelerate)'
  if (timing === 'ease-in-out') return 'Ease In-Out (Smooth)'

  // Cubic bezier patterns
  if (timing.includes('cubic-bezier')) {
    if (timing.includes('0.4, 0, 0.2, 1')) return 'Material Design Standard'
    if (timing.includes('0.4, 0, 1, 1')) return 'Material Design Decelerate'
    if (timing.includes('0, 0, 0.2, 1')) return 'Material Design Accelerate'
    return 'Custom Cubic Bezier'
  }

  if (timing.includes('spring')) return 'Spring Physics'
  if (timing.includes('bounce')) return 'Bounce'

  return 'Custom'
}

/**
 * Infer semantic meaning of transition properties
 */
function inferTransitionSemantic(properties: string[]): string {
  const propsText = properties.join(' ')

  if (propsText.includes('all')) return 'All Properties'
  if (properties.includes('opacity') && properties.includes('transform')) return 'Fade + Move'
  if (properties.includes('opacity')) return 'Fade'
  if (properties.includes('transform')) return 'Transform'
  if (properties.includes('color') || properties.includes('background-color')) return 'Color Change'
  if (properties.includes('width') || properties.includes('height')) return 'Size Change'
  if (properties.includes('box-shadow')) return 'Shadow Change'

  return properties.slice(0, 2).join(', ')
}

/**
 * Infer context of transform usage
 */
function inferTransformContext(transform: string, selectors: string[]): string {
  const selectorText = selectors.join(' ').toLowerCase()

  if (selectorText.includes(':hover')) return 'Hover Effect'
  if (selectorText.includes(':active')) return 'Active/Press Effect'
  if (selectorText.includes(':focus')) return 'Focus State'
  if (selectorText.includes('modal') || selectorText.includes('dialog')) return 'Modal Animation'
  if (selectorText.includes('menu') || selectorText.includes('dropdown')) return 'Dropdown Animation'
  if (selectorText.includes('toast') || selectorText.includes('notification')) return 'Notification'

  // Infer from transform type
  if (transform.includes('scale')) return 'Scale Effect'
  if (transform.includes('translateY') || transform.includes('translateX')) return 'Slide Effect'
  if (transform.includes('rotate')) return 'Rotation'
  if (transform.includes('skew')) return 'Skew Effect'

  return 'Transform'
}

/**
 * Common animation presets for AI agents
 */
export const ANIMATION_PRESETS = {
  hover: {
    subtle: { duration: '150ms', timing: 'ease-out', transform: 'translateY(-2px)' },
    medium: { duration: '200ms', timing: 'ease-out', transform: 'scale(1.05)' },
    bold: { duration: '300ms', timing: 'cubic-bezier(0.4, 0, 0.2, 1)', transform: 'scale(1.1)' }
  },
  fadeIn: {
    fast: { duration: '150ms', timing: 'ease-out', from: 'opacity: 0', to: 'opacity: 1' },
    normal: { duration: '300ms', timing: 'ease-out', from: 'opacity: 0', to: 'opacity: 1' },
    slow: { duration: '500ms', timing: 'ease-out', from: 'opacity: 0', to: 'opacity: 1' }
  },
  slideIn: {
    fromTop: { duration: '300ms', timing: 'cubic-bezier(0.4, 0, 0.2, 1)', transform: 'translateY(-20px) → translateY(0)' },
    fromBottom: { duration: '300ms', timing: 'cubic-bezier(0.4, 0, 0.2, 1)', transform: 'translateY(20px) → translateY(0)' },
    fromLeft: { duration: '300ms', timing: 'cubic-bezier(0.4, 0, 0.2, 1)', transform: 'translateX(-20px) → translateX(0)' }
  }
}