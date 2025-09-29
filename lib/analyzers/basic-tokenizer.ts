import { createHash } from 'node:crypto'
import postcss, { Root } from 'postcss'
import safeParser from 'postcss-safe-parser'
import type { CssSource } from '@/lib/extractors/static-css'

export type GeneratedTokenSet = {
  tokenSet: Record<string, unknown>
  summary: {
    tokensExtracted: number
    confidence: number
    completeness: number
    reliability: number
  }
  tokenGroups: {
    colors: TokenSummary[]
    typography: TokenSummary[]
    spacing: TokenSummary[]
    radius: TokenSummary[]
    shadows: TokenSummary[]
    motion: TokenSummary[]
    gradients: TokenSummary[]
    borders: TokenSummary[]
  }
  qualityInsights: TokenQualityInsights
}

export type TokenSummary = {
  name: string
  value: string
  confidence: number
  usage: number
  qualityScore: number
  flags: string[]
  details?: Record<string, unknown>
}

type CoverageStat = {
  usage: number
  selectors: Set<string>
  components: Set<string>
  sources: Set<string>
  variables: Set<string>
  aliases: Set<string>
  metadata?: Record<string, unknown>
  instances?: MotionInstance[]
  qaFlags: Set<string>
}

type MotionInstance = {
  selector: string | null
  type: 'transition' | 'animation' | 'keyframes'
  property?: string
  duration?: string
  easing?: string
  delay?: string
  iteration?: string
  sourceProperty: string
  variables?: string[]
}

export type TokenQualityInsights = {
  categories: Record<
    keyof GeneratedTokenSet['tokenGroups'],
    {
      totalUsage: number
      averageConfidence: number
      topTokens: TokenSummary[]
    }
  >
  overall: {
    totalTokens: number
    topTokens: Array<{
      category: keyof GeneratedTokenSet['tokenGroups']
      token: TokenSummary
    }>
  }
}

const COLOR_REGEX = /#(?:[0-9a-fA-F]{3,8})\b/g
const TRANSITION_REGEX = /transition(?:-property|-duration|-timing-function|-delay)?\s*:\s*([^;]+);/gi
const ANIMATION_REGEX = /animation(?:-name|-duration|-timing-function|-delay|-iteration-count|-direction|-fill-mode)?\s*:\s*([^;]+);/gi
const KEYFRAMES_REGEX = /@keyframes\s+([\w-]+)/gi
const GRADIENT_REGEX = /(linear|radial|conic)-gradient\([^;'}]+\)/gi

const SPACING_PROPS = new Set([
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'row-gap',
  'column-gap',
  'grid-gap',
  'grid-row-gap',
  'grid-column-gap',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'top',
  'right',
  'bottom',
  'left'
])

const RADIUS_PROPS = new Set([
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius'
])

const SHADOW_PROPS = new Set(['box-shadow', 'text-shadow'])

const BORDER_PROPS = new Set([
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-style',
  'border-color',
  'outline',
  'outline-width',
  'outline-style',
  'outline-color'
])

function createCoverageStat(): CoverageStat {
  return {
    usage: 0,
    selectors: new Set<string>(),
    components: new Set<string>(),
    sources: new Set<string>(),
    variables: new Set<string>(),
    aliases: new Set<string>(),
    metadata: undefined,
    instances: undefined,
    qaFlags: new Set<string>()
  }
}

function mergeSets(target: Set<string>, values: Iterable<string | null | undefined>) {
  for (const value of values) {
    if (value) {
      target.add(value)
    }
  }
}

function getSelectorFromDecl(decl: postcss.Declaration): string | null {
  let node: postcss.Node | undefined | null = decl.parent
  while (node && node.type !== 'rule') {
    node = (node as postcss.Container).parent
  }
  return node && node.type === 'rule' ? (node as postcss.Rule).selector ?? null : null
}

const COMPONENT_KEYWORDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(\.|\b)(btn|button|cta)\b/, label: 'button' },
  { pattern: /(\.|\b)(nav|menu|tabs|breadcrumb)\b/, label: 'navigation' },
  { pattern: /(\.|\b)(form|input|field|field__|control|checkbox|radio|select)\b/, label: 'form' },
  { pattern: /(\.|\b)(card|tile|panel|module)\b/, label: 'card' },
  { pattern: /(\.|\b)(hero|banner|jumbotron)\b/, label: 'hero' },
  { pattern: /(\.|\b)(footer)\b/, label: 'footer' },
  { pattern: /(\.|\b)(header|topbar|appbar)\b/, label: 'header' },
  { pattern: /(\.|\b)(table|grid|datatable)\b/, label: 'table' },
  { pattern: /(\.|\b)(modal|dialog|popover|tooltip)\b/, label: 'overlay' },
  { pattern: /(\.|\b)(list|item|collection)\b/, label: 'list' }
]

function classifySelector(selector: string | null): Set<string> {
  const matches = new Set<string>()
  if (!selector) return matches
  const normalized = selector.toLowerCase()
  COMPONENT_KEYWORDS.forEach(({ pattern, label }) => {
    if (pattern.test(normalized)) {
      matches.add(label)
    }
  })
  if (normalized.includes('main ') || normalized.includes(' main') || normalized.includes('content')) {
    matches.add('content')
  }
  return matches
}

function extractVariableNames(value: string | undefined): string[] {
  if (!value) return []
  const result = new Set<string>()
  const regex = /var\(--([a-z0-9-]+)\b/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(value)) !== null) {
    result.add(`--${match[1]}`)
  }
  return Array.from(result)
}

function collectVariableUsageStats(root: Root, variableName: string): {
  usage: number
  selectors: Set<string>
  components: Set<string>
  sources: Set<string>
} {
  const selectors = new Set<string>()
  const components = new Set<string>()
  const sources = new Set<string>()
  let usage = 0

  const pattern = new RegExp(`var\\(${escapeRegExp(variableName)}\\)`, 'gi')
  root.walkDecls((decl) => {
    if (!pattern.test(decl.value)) return
    usage += (decl.value.match(pattern) ?? []).length
    const selector = getSelectorFromDecl(decl)
    if (selector) selectors.add(selector)
    classifySelector(selector).forEach((component) => components.add(component))
    sources.add(decl.prop.toLowerCase())
  })

  return { usage, selectors, components, sources }
}

function buildCoverageDetails(stat: CoverageStat) {
  return {
    selectors: Array.from(stat.selectors).slice(0, 10),
    selectorCount: stat.selectors.size,
    keyComponents: Array.from(stat.components),
    sources: Array.from(stat.sources),
    variables: Array.from(stat.variables),
    aliases: Array.from(stat.aliases)
  }
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(/,(?![^()]*\))/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function buildTransitionKey(property?: string, duration?: string, easing?: string, delay?: string): string {
  return [property ?? 'all', duration ?? '0s', easing ?? 'ease', delay ?? '0s']
    .map((part) => part.trim())
    .join(' | ')
}

function buildAnimationKey(name?: string, duration?: string, easing?: string, delay?: string, iteration?: string): string {
  return [name ?? 'unnamed', duration ?? '0s', easing ?? 'ease', delay ?? '0s', iteration ?? '1']
    .map((part) => part.trim())
    .join(' | ')
}

function durationToMs(value?: string): number | null {
  if (!value) return null
  const trimmed = value.trim()
  const match = /^(-?\d*\.?\d+)(ms|s)$/i.exec(trimmed)
  if (!match) return null
  const number = Number(match[1])
  if (Number.isNaN(number)) return null
  return match[2].toLowerCase() === 's' ? number * 1000 : number
}

export function generateTokenSet(
  sources: CssSource[],
  origin: { domain: string; url: string }
): GeneratedTokenSet {
  const cssText = sources.map((source) => source.content).join('\n')

  const root = postcss.parse(cssText, { parser: safeParser })
  const variableMap = collectVariableMap(root)

  const colors = extractColors(root, variableMap)
  const fonts = extractFonts(root, variableMap)
  const spacing = extractSpacing(root, variableMap)
  const radii = extractRadii(root, variableMap)
  const shadows = extractShadows(root, variableMap)
  const motions = extractMotion(root, cssText, variableMap)
  const gradients = extractGradients(root, variableMap)
  const borders = extractBorders(root, variableMap)

  const grouped: GeneratedTokenSet['tokenGroups'] = {
    colors,
    typography: fonts,
    spacing,
    radius: radii,
    shadows,
    motion: motions,
    gradients,
    borders
  }

  const rankedGroups = rankTokenGroups(grouped)

  const tokenSet: Record<string, unknown> = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $metadata: {
      name: origin.domain,
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: {
        url: origin.url,
        cssSources: sources.map((source) => ({
          kind: source.kind,
          url: source.url,
          sha: source.sha,
          bytes: source.bytes
        }))
      }
    }
  }

  if (rankedGroups.colors.length > 0) {
    tokenSet.color = rankedGroups.colors.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'color',
        $value: token.value,
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.typography.length > 0) {
    tokenSet.typography = rankedGroups.typography.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: token.value.includes(',') ? 'fontFamily' : 'string',
        $value: token.value.includes(',')
          ? token.value.split(',').map((family) => family.trim())
          : token.value.trim(),
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.spacing.length > 0) {
    tokenSet.dimension = rankedGroups.spacing.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'dimension',
        $value: token.value,
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.radius.length > 0) {
    tokenSet.radius = rankedGroups.radius.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'dimension',
        $value: token.value,
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.shadows.length > 0) {
    tokenSet.shadow = rankedGroups.shadows.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'shadow',
        $value: token.value,
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.motion.length > 0) {
    tokenSet.motion = rankedGroups.motion.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'transition',
        $value: token.value,
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.gradients.length > 0) {
    tokenSet.gradient = rankedGroups.gradients.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'gradient',
        $value: token.value,
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  if (rankedGroups.borders.length > 0) {
    tokenSet.border = rankedGroups.borders.reduce<Record<string, unknown>>((acc, token) => {
      acc[token.name] = {
        $type: 'border',
        $value: token.details ?? { value: token.value },
        $extensions: {
          'contextds.confidence': token.confidence,
          'contextds.usage': token.usage
        }
      }
      return acc
    }, {})
  }

  const tokensExtracted = Object.values(rankedGroups).reduce((sum, tokens) => sum + tokens.length, 0)
  const confidence = tokensExtracted > 0 ? 0.82 : 0

  return {
    tokenSet,
    tokenGroups: {
      colors: rankedGroups.colors,
      typography: rankedGroups.typography,
      spacing: rankedGroups.spacing,
      radius: rankedGroups.radius,
      shadows: rankedGroups.shadows,
      motion: rankedGroups.motion,
      gradients: rankedGroups.gradients,
      borders: rankedGroups.borders
    },
    summary: {
      tokensExtracted,
      confidence: Math.round(confidence * 100),
      completeness: tokensExtracted > 0 ? 78 + Math.min(12, tokensExtracted) : 0,
      reliability: tokensExtracted > 0 ? 80 : 0
    },
    qualityInsights: computeQualityInsights(rankedGroups)
  }
}

function extractColors(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const counts = new Map<string, number>()

  root.walkDecls((decl) => {
    const value = sanitizeTokenValue(decl.value)
    if (!value) return
    const matches = value.match(COLOR_REGEX)
    matches?.forEach((color) => {
      counts.set(color, (counts.get(color) ?? 0) + 1)
    })
  })

  const aliasTokens: TokenSummary[] = []
  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    if (!isColorToken(resolved)) return
    const usage = countVariableUsage(root, name) || 1
    aliasTokens.push({
      name: `color-${name.slice(2)}`,
      value: resolved,
      confidence: 88,
      usage,
      qualityScore: 0,
      flags: [],
      details: { alias: name }
    })
  })

  const genericTokens = Array.from(counts.entries()).map(([value, usage], index) => ({
    name: `color-generic-${index + 1}`,
    value,
    confidence: 82,
    usage,
    qualityScore: 0,
    flags: []
  }))

  return dedupeTokens([...aliasTokens, ...genericTokens])
}

function extractFonts(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const families = new Map<string, number>()
  const sizes = new Map<string, number>()
  const weights = new Map<string, number>()
  const lineHeights = new Map<string, number>()
  const letterSpacings = new Map<string, number>()

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase()
    const resolved = resolveValue(decl.value, variableMap) ?? sanitizeTokenValue(decl.value)
    if (!resolved) return

    switch (prop) {
      case 'font-family': {
        const family = sanitizeFontValue(resolved)
        if (family) families.set(family, (families.get(family) ?? 0) + 1)
        break
      }
      case 'font-size': {
        if (isValidFontSize(resolved)) sizes.set(resolved, (sizes.get(resolved) ?? 0) + 1)
        break
      }
      case 'font-weight': {
        if (isValidFontWeight(resolved)) weights.set(resolved, (weights.get(resolved) ?? 0) + 1)
        break
      }
      case 'line-height': {
        if (isValidLineHeight(resolved)) lineHeights.set(resolved, (lineHeights.get(resolved) ?? 0) + 1)
        break
      }
      case 'letter-spacing': {
        if (isValidLetterSpacing(resolved)) letterSpacings.set(resolved, (letterSpacings.get(resolved) ?? 0) + 1)
        break
      }
      default:
        break
    }
  })

  const tokens: TokenSummary[] = []

  mapToTypographyTokens(families, 'typography-family', 78, 'family').forEach((token) => tokens.push(token))
  mapToTypographyTokens(sizes, 'typography-size', 74, 'size').forEach((token) => tokens.push(token))
  mapToTypographyTokens(weights, 'typography-weight', 72, 'weight').forEach((token) => tokens.push(token))
  mapToTypographyTokens(lineHeights, 'typography-line-height', 70, 'line-height').forEach((token) => tokens.push(token))
  mapToTypographyTokens(letterSpacings, 'typography-letter-spacing', 68, 'letter-spacing').forEach((token) => tokens.push(token))

  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    const alias = name.slice(2)
    const family = sanitizeFontValue(resolved)
    if (family) {
      const usage = countVariableUsage(root, name) || 1
      tokens.push({
        name: `typography-family-${alias}`,
        value: family,
        confidence: 88,
        usage,
        qualityScore: 0,
        flags: [],
        details: { alias: name, kind: 'family' }
      })
      return
    }
    if (isValidFontSize(resolved)) {
      const usage = countVariableUsage(root, name) || 1
      tokens.push({
        name: `typography-size-${alias}`,
        value: resolved,
        confidence: 86,
        usage,
        qualityScore: 0,
        flags: [],
        details: { alias: name, kind: 'size' }
      })
      return
    }
    if (isValidFontWeight(resolved)) {
      const usage = countVariableUsage(root, name) || 1
      tokens.push({
        name: `typography-weight-${alias}`,
        value: resolved,
        confidence: 84,
        usage,
        qualityScore: 0,
        flags: [],
        details: { alias: name, kind: 'weight' }
      })
      return
    }
    if (isValidLineHeight(resolved)) {
      const usage = countVariableUsage(root, name) || 1
      tokens.push({
        name: `typography-line-height-${alias}`,
        value: resolved,
        confidence: 80,
        usage,
        qualityScore: 0,
        flags: [],
        details: { alias: name, kind: 'line-height' }
      })
      return
    }
    if (isValidLetterSpacing(resolved)) {
      const usage = countVariableUsage(root, name) || 1
      tokens.push({
        name: `typography-letter-spacing-${alias}`,
        value: resolved,
        confidence: 78,
        usage,
        qualityScore: 0,
        flags: [],
        details: { alias: name, kind: 'letter-spacing' }
      })
    }
  })

  return dedupeTokens(tokens)
}

function extractSpacing(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const valueMap = new Map<
    string,
    {
      usage: number
      detail: Record<string, unknown>
    }
  >()

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase()
    if (!SPACING_PROPS.has(prop)) return
    const resolved = resolveValue(decl.value, variableMap) ?? sanitizeTokenValue(decl.value)
    if (!resolved) return

    const detail = toSpacingDetail(prop, resolved)
    if (!detail) return
    const current = valueMap.get(detail.normalized) ?? { usage: 0, detail: detail.detail }
    current.usage += 1
    valueMap.set(detail.normalized, current)
  })

  const aliases: TokenSummary[] = []
  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    const detail = toSpacingDetail('custom', resolved)
    if (!detail) return
    const usage = countVariableUsage(root, name) || 1
    aliases.push({
      name: `spacing-${name.slice(2)}`,
      value: detail.normalized,
      confidence: 85,
      usage,
      qualityScore: 0,
      flags: [],
      details: { alias: name, ...detail.detail }
    })
  })

  const generic = Array.from(valueMap.entries()).map(([value, info], index) => ({
    name: `spacing-generic-${index + 1}`,
    value,
    confidence: 70,
    usage: info.usage,
    qualityScore: 0,
    flags: [],
    details: info.detail
  }))

  return dedupeTokens([...aliases, ...generic])
}

function extractRadii(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const values = new Map<string, number>()

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase()
    if (!RADIUS_PROPS.has(prop)) return
    const resolved = resolveValue(decl.value, variableMap) ?? sanitizeTokenValue(decl.value)
    if (!resolved) return
    const normalized = normalizeRadiusValue(resolved)
    if (!normalized) return
    values.set(normalized, (values.get(normalized) ?? 0) + 1)
  })

  const aliases: TokenSummary[] = []
  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    const normalized = normalizeRadiusValue(resolved)
    if (!normalized) return
    aliases.push({
      name: `radius-${name.slice(2)}`,
      value: normalized,
      confidence: 85,
      usage: 1,
      qualityScore: 0,
      flags: [],
      details: { alias: name }
    })
  })

  const generic = Array.from(values.entries()).map(([value, usage], index) => ({
    name: `radius-generic-${index + 1}`,
    value,
    confidence: 68,
    usage,
    qualityScore: 0,
    flags: []
  }))

  return dedupeTokens([...aliases, ...generic])
}

function extractShadows(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const values = new Map<string, number>()

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase()
    if (!SHADOW_PROPS.has(prop)) return
    const resolved = resolveValue(decl.value, variableMap) ?? sanitizeTokenValue(decl.value)
    if (!resolved) return
    const parts = splitShadowList(resolved)
    parts.forEach((part) => {
      const normalized = normalizeShadowValue(part)
      if (!normalized) return
      values.set(normalized, (values.get(normalized) ?? 0) + 1)
    })
  })

  const aliases: TokenSummary[] = []
  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    const normalized = normalizeShadowValue(resolved)
    if (!normalized) return
    aliases.push({
      name: `shadow-${name.slice(2)}`,
      value: normalized,
      confidence: 75,
      usage: 1,
      qualityScore: 0,
      flags: [],
      details: { alias: name }
    })
  })

  const generic = Array.from(values.entries()).map(([value, usage], index) => ({
    name: `shadow-${index + 1}`,
    value,
    confidence: 65,
    usage,
    qualityScore: 0,
    flags: []
  }))

  return dedupeTokens([...aliases, ...generic])
}

function extractMotion(css: string, variableMap: Map<string, string>): TokenSummary[] {
  const values = new Map<string, number>()
  let match: RegExpExecArray | null

  while ((match = TRANSITION_REGEX.exec(css)) !== null) {
    const normalized = normalizeMotionValue('transition', match[1])
    if (!normalized) return
    values.set(normalized, (values.get(normalized) ?? 0) + 1)
  }

  while ((match = ANIMATION_REGEX.exec(css)) !== null) {
    const normalized = normalizeMotionValue('animation', match[1])
    if (!normalized) return
    values.set(normalized, (values.get(normalized) ?? 0) + 1)
  }

  const keyframes = new Set<string>()
  while ((match = KEYFRAMES_REGEX.exec(css)) !== null) {
    const name = match[1]?.trim()
    if (name) {
      keyframes.add(name)
    }
  }

  keyframes.forEach((name) => {
    const key = `keyframes ${name}`
    values.set(key, (values.get(key) ?? 0) + 1)
  })

  const aliases: TokenSummary[] = []
  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    if (!/(ms|s|ease|cubic-bezier|steps)/i.test(resolved)) return
    const usage = countVariableUsageCss(css, name) || 1
    aliases.push({
      name: `motion-${name.slice(2)}`,
      value: resolved,
      confidence: 70,
      usage,
      qualityScore: 0,
      flags: [],
      details: { alias: name }
    })
  })

  const generic = Array.from(values.entries()).map(([value, usage], index) => ({
    name: `motion-${index + 1}`,
    value,
    confidence: 60,
    usage,
    qualityScore: 0,
    flags: []
  }))

  return dedupeTokens([...aliases, ...generic])
}

function extractGradients(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const gradientStats = new Map<string, CoverageStat>()

  root.walkDecls((decl) => {
    const rawValue = decl.value
    const sanitizedValue = sanitizeTokenValue(rawValue)
    if (!sanitizedValue) return
    const matches = sanitizedValue.match(GRADIENT_REGEX)
    if (!matches) return

    const selector = getSelectorFromDecl(decl)
    const componentHits = classifySelector(selector)
    const variables = extractVariableNames(rawValue)

    matches.forEach((gradient) => {
      const sanitized = sanitizeGradientValue(gradient)
      if (!sanitized) return
      const stat = gradientStats.get(sanitized) ?? createCoverageStat()
      stat.usage += 1
      if (selector) stat.selectors.add(selector)
      componentHits.forEach((component) => stat.components.add(component))
      stat.sources.add(decl.prop.toLowerCase())
      variables.forEach((variable) => stat.variables.add(variable))

      const metadata = parseGradientMetadata(sanitized)
      if (metadata) {
        stat.metadata = { ...(stat.metadata ?? {}), ...metadata }
      }

      gradientStats.set(sanitized, stat)
    })
  })

  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    const sanitized = sanitizeGradientValue(resolved)
    if (!sanitized) return

    const usageDetails = collectVariableUsageStats(root, name)
    if (usageDetails.usage === 0) return

    const stat = gradientStats.get(sanitized) ?? createCoverageStat()
    stat.usage += usageDetails.usage
    mergeSets(stat.selectors, usageDetails.selectors)
    mergeSets(stat.components, usageDetails.components)
    mergeSets(stat.sources, usageDetails.sources)
    stat.aliases.add(name)

    const metadata = parseGradientMetadata(sanitized)
    if (metadata) {
      stat.metadata = { ...(stat.metadata ?? {}), ...metadata }
    }

    gradientStats.set(sanitized, stat)
  })

  let counter = 0
  return Array.from(gradientStats.entries()).map(([value, stat]) => {
    counter += 1
    const aliasName = stat.aliases.size > 0 ? Array.from(stat.aliases)[0].slice(2) : `${counter}`
    const name = `gradient-${aliasName}`
    const flags: string[] = stat.qaFlags.size > 0 ? Array.from(stat.qaFlags) : []
    if (stat.aliases.size === 0) {
      flags.push('missing_alias')
    }

    const details: Record<string, unknown> = {
      coverage: buildCoverageDetails(stat)
    }
    if (stat.metadata) {
      details.metadata = stat.metadata
    }

    if (stat.aliases.size > 1) {
      details.aliases = Array.from(stat.aliases)
    }

    return {
      name,
      value,
      confidence: stat.aliases.size > 0 ? 88 : 75,
      usage: stat.usage,
      qualityScore: 0,
      flags,
      details
    }
  })
}

function extractBorders(root: Root, variableMap: Map<string, string>): TokenSummary[] {
  const composite = new Map<string, CoverageStat>()
  const widths = new Map<string, CoverageStat>()
  const styles = new Map<string, CoverageStat>()
  const colors = new Map<string, CoverageStat>()

  const recordDimension = (
    map: Map<string, CoverageStat>,
    key: string,
    selector: string | null,
    components: Set<string>,
    source: string,
    variables: string[],
    metadata: Record<string, unknown>,
    alias?: string
  ) => {
    if (!key) return
    const stat = map.get(key) ?? createCoverageStat()
    stat.usage += 1
    if (selector) stat.selectors.add(selector)
    components.forEach((component) => stat.components.add(component))
    stat.sources.add(source)
    variables.forEach((variable) => stat.variables.add(variable))
    stat.metadata = { ...(stat.metadata ?? {}), ...metadata }
    if (alias) stat.aliases.add(alias)
    map.set(key, stat)
  }

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase()
    if (!BORDER_PROPS.has(prop)) return

    const rawValue = decl.value
    const resolved = resolveValue(rawValue, variableMap) ?? sanitizeTokenValue(rawValue)
    if (!resolved) return

    const parsed = parseBorderValue(resolved)
    if (!parsed) return

    const selector = getSelectorFromDecl(decl)
    const componentHits = classifySelector(selector)
    const variables = extractVariableNames(rawValue)
    const source = prop

    const compositeKey = `${parsed.width ?? ''} ${parsed.style ?? ''} ${parsed.color ?? ''}`.trim() || resolved
    recordDimension(composite, compositeKey, selector, componentHits, source, variables, {
      type: 'composite',
      width: parsed.width,
      style: parsed.style,
      color: parsed.color
    })

    if (parsed.width) {
      recordDimension(widths, parsed.width, selector, componentHits, source, variables, { type: 'width' })
    }
    if (parsed.style) {
      recordDimension(styles, parsed.style, selector, componentHits, source, variables, { type: 'style' })
    }
    if (parsed.color) {
      recordDimension(colors, parsed.color, selector, componentHits, source, variables, { type: 'color' })
    }
  })

  variableMap.forEach((value, name) => {
    const resolved = resolveValue(value, variableMap)
    if (!resolved) return
    const parsed = parseBorderValue(resolved)
    if (!parsed) return

    const usageDetails = collectVariableUsageStats(root, name)
    if (usageDetails.usage === 0) return

    const compositeKey = `${parsed.width ?? ''} ${parsed.style ?? ''} ${parsed.color ?? ''}`.trim() || resolved
    const alias = name

    const ensureStat = (map: Map<string, CoverageStat>, key: string, metadata: Record<string, unknown>) => {
      if (!key) return
      const stat = map.get(key) ?? createCoverageStat()
      stat.usage += usageDetails.usage
      mergeSets(stat.selectors, usageDetails.selectors)
      mergeSets(stat.components, usageDetails.components)
      mergeSets(stat.sources, usageDetails.sources)
      stat.aliases.add(alias)
      stat.metadata = { ...(stat.metadata ?? {}), ...metadata }
      map.set(key, stat)
    }

    ensureStat(composite, compositeKey, {
      type: 'composite',
      width: parsed.width,
      style: parsed.style,
      color: parsed.color
    })

    if (parsed.width) ensureStat(widths, parsed.width, { type: 'width' })
    if (parsed.style) ensureStat(styles, parsed.style, { type: 'style' })
    if (parsed.color) ensureStat(colors, parsed.color, { type: 'color' })
  })

  const buildTokens = (
    map: Map<string, CoverageStat>,
    prefix: string,
    defaultConfidence: number
  ): TokenSummary[] => {
    let index = 0
    return Array.from(map.entries()).map(([value, stat]) => {
      index += 1
      const aliasName = stat.aliases.size > 0 ? Array.from(stat.aliases)[0].slice(2) : `${index}`
      const name = `${prefix}-${aliasName}`
      const flags: string[] = stat.qaFlags.size > 0 ? Array.from(stat.qaFlags) : []
      if (stat.aliases.size === 0) {
        flags.push('missing_alias')
      }

      const details: Record<string, unknown> = {
        coverage: buildCoverageDetails(stat)
      }
      if (stat.metadata) {
        details.metadata = stat.metadata
      }
      if (stat.aliases.size > 1) {
        details.aliases = Array.from(stat.aliases)
      }

      return {
        name,
        value,
        confidence: stat.aliases.size > 0 ? Math.max(defaultConfidence, 80) : defaultConfidence,
        usage: stat.usage,
        qualityScore: 0,
        flags,
        details
      }
    })
  }

  return [
    ...buildTokens(composite, 'border', 72),
    ...buildTokens(widths, 'border-width', 70),
    ...buildTokens(styles, 'border-style', 68),
    ...buildTokens(colors, 'border-color', 74)
  ]
}

function sanitizeFontValue(value: string | undefined): string | null {
  const raw = sanitizeTokenValue(value)
  if (!raw) return null

  const families = raw
    .split(',')
    .map((family) => family.replace(/['"]/g, '').trim())
    .filter((family) => family && !family.toLowerCase().includes('var('))

  if (families.length === 0) return null

  return families.join(', ')
}

function normalizeSpacingValue(value: string): string | null {
  const tokens = value.split(/\s+/).map((token) => token.replace(/;+$/, '').trim()).filter(Boolean)
  if (tokens.length === 0) return null
  if (tokens.length === 1) return tokens[0]
  if (tokens.length === 2) return `${tokens[0]} ${tokens[1]}`
  if (tokens.length === 3) return `${tokens[0]} ${tokens[1]} ${tokens[2]}`
  return `${tokens[0]} ${tokens[1]} ${tokens[2]} ${tokens[3] ?? tokens[1]}`
}

function normalizeRadiusValue(value: string): string | null {
  return normalizeSpacingValue(value)
}

function expandSpacingShorthand(prop: string, value: string): string[] {
  if (prop === 'margin' || prop === 'padding') {
    const { top, right, bottom, left } = expandBoxValues(value)
    return [`${top} ${right} ${bottom} ${left}`]
  }
  if (prop === 'gap' || prop === 'row-gap' || prop === 'column-gap') {
    return [value]
  }
  return [value]
}

function expandBorderShorthand(prop: string, value: string): Array<{ width?: string; style?: string; color?: string }> {
  const result: Array<{ width?: string; style?: string; color?: string }> = []
  const detail = parseBorderValue(value)
  if (!detail) return result

  if (prop === 'border') {
    result.push(detail)
    return result
  }

  if (prop === 'border-top' || prop === 'border-right' || prop === 'border-bottom' || prop === 'border-left') {
    result.push(detail)
    return result
  }

  if (prop === 'outline') {
    result.push(detail)
    return result
  }

  if (prop.endsWith('-width')) {
    result.push({ width: detail.width })
  } else if (prop.endsWith('-style')) {
    result.push({ style: detail.style })
  } else if (prop.endsWith('-color')) {
    result.push({ color: detail.color })
  }

  return result
}

function normalizeShadowValue(value: string): string | null {
  return value.replace(/;+$/, '').trim() || null
}

function normalizeMotionValue(type: 'transition' | 'animation', value: string): string | null {
  const cleaned = value.replace(/;+$/, '').trim()
  if (!cleaned) return null

  if (type === 'transition') {
    const segments = cleaned.split(',').map((segment) => segment.trim())
    return segments
      .map((segment) => {
        const parts = segment.split(/\s+/).filter(Boolean)
        const { property, duration, easing, delay } = parseTransitionParts(parts)
        return [property, duration, easing, delay].filter(Boolean).join(' | ')
      })
      .join(', ')
  }

  const segments = cleaned.split(',').map((segment) => segment.trim())
  return segments
    .map((segment) => {
      const parts = segment.split(/\s+/).filter(Boolean)
      const { name, duration, easing, delay, iteration } = parseAnimationParts(parts)
      return [name, duration, easing, delay, iteration].filter(Boolean).join(' | ')
    })
    .join(', ')
}

function parseTransitionParts(parts: string[]): {
  property?: string
  duration?: string
  easing?: string
  delay?: string
} {
  let property: string | undefined
  let duration: string | undefined
  let easing: string | undefined
  let delay: string | undefined

  parts.forEach((part) => {
    if (!duration && isDuration(part)) {
      duration = part
    } else if (!delay && isDuration(part)) {
      // second duration token is delay
      delay = part
    } else if (!easing && isTimingFunction(part)) {
      easing = part
    } else if (!property) {
      property = part
    }
  })

  return { property, duration, easing, delay }
}

function parseAnimationParts(parts: string[]): {
  name?: string
  duration?: string
  easing?: string
  delay?: string
  iteration?: string
} {
  let name: string | undefined
  let duration: string | undefined
  let easing: string | undefined
  let delay: string | undefined
  let iteration: string | undefined

  parts.forEach((part) => {
    if (!duration && isDuration(part)) {
      duration = part
    } else if (!delay && isDuration(part)) {
      delay = part
    } else if (!easing && isTimingFunction(part)) {
      easing = part
    } else if (!iteration && isIterationCount(part)) {
      iteration = part
    } else if (!name) {
      name = part
    }
  })

  return { name, duration, easing, delay, iteration }
}

function isDuration(token: string): boolean {
  return /^(\d+\.?\d*)(ms|s)$/i.test(token)
}

function isTimingFunction(token: string): boolean {
  return /^(linear|ease(-in|-out|-in-out)?|ease-in-out|step-start|step-end|steps\(|cubic-bezier\()/i.test(token)
}

function isIterationCount(token: string): boolean {
  return /^(infinite|\d+)$/i.test(token)
}

function splitShadowList(value: string): string[] {
  return value.split(/,(?![^()]*\))/).map((part) => part.trim()).filter(Boolean)
}

function collectVariableMap(root: Root): Map<string, string> {
  const map = new Map<string, string>()
  root.walkDecls((decl) => {
    if (!decl.prop.startsWith('--')) return
    const sanitized = sanitizeTokenValue(decl.value)
    if (!sanitized) return
    map.set(decl.prop, sanitized)
  })
  return map
}

function resolveValue(value: string | undefined, variableMap: Map<string, string>, depth = 0): string | null {
  if (!value || depth > 10) return sanitizeTokenValue(value)
  let result = sanitizeTokenValue(value)
  if (!result) return null

  const varPattern = /var\(--([a-z0-9-]+)(?:,\s*([^\)]+))?\)/i
  let match = varPattern.exec(result)

  while (match) {
    const varName = `--${match[1]}`
    const replacementRaw = variableMap.get(varName) ?? match[2]
    if (!replacementRaw) break
    const replacement = resolveValue(replacementRaw, variableMap, depth + 1)
    if (!replacement) break
    result = result.replace(match[0], replacement)
    match = varPattern.exec(result)
  }

  return result
}

function mapToTypographyTokens(
  entries: Map<string, number>,
  prefix: string,
  confidence: number,
  kind: string
): TokenSummary[] {
  return Array.from(entries.entries()).map(([value, usage], index) => ({
    name: `${prefix}-${index + 1}`,
    value,
    confidence,
    usage,
    qualityScore: 0,
    flags: [],
    details: { kind }
  }))
}

function dedupeTokens(tokens: TokenSummary[]): TokenSummary[] {
  const seen = new Map<string, TokenSummary>()
  tokens.forEach((token) => {
    if (!seen.has(token.name)) {
      seen.set(token.name, token)
    }
  })
  return Array.from(seen.values())
}

function countVariableUsage(root: Root, name: string): number {
  let count = 0
  const pattern = new RegExp(`var\\(${escapeRegExp(name)}\\)`, 'gi')
  root.walkDecls((decl) => {
    const matches = decl.value.match(pattern)
    if (matches) count += matches.length
  })
  return count
}

function countVariableUsageCss(css: string, name: string): number {
  const pattern = new RegExp(`var\\(${escapeRegExp(name)}\\)`, 'gi')
  return (css.match(pattern) ?? []).length
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rankTokenGroups(groups: GeneratedTokenSet['tokenGroups']): GeneratedTokenSet['tokenGroups'] {
  const ranked = {
    colors: [],
    typography: [],
    spacing: [],
    radius: [],
    shadows: [],
    motion: [],
    gradients: [],
    borders: []
  } as GeneratedTokenSet['tokenGroups']

  (Object.entries(groups) as Array<[
    keyof GeneratedTokenSet['tokenGroups'],
    TokenSummary[]
  ]>).forEach(([category, tokens]) => {
    if (!tokens.length) {
      ranked[category] = []
      return
    }

    const maxUsage = Math.max(...tokens.map((token) => token.usage), 1)

    ranked[category] = tokens
      .map((token) => {
        const usageScore = token.usage / maxUsage
        const confidenceScore = token.confidence / 100
        const qualityScore = Math.round((usageScore * 0.6 + confidenceScore * 0.4) * 100)
        const flags: string[] = []
        if (token.usage <= 1) flags.push('low_usage')
        if (token.confidence < 70) flags.push('low_confidence')
        return {
          ...token,
          qualityScore,
          flags
        }
      })
      .sort((a, b) => {
        if (b.usage !== a.usage) return b.usage - a.usage
        if (b.confidence !== a.confidence) return b.confidence - a.confidence
        return a.name.localeCompare(b.name)
      })
  })

  return ranked
}

function computeQualityInsights(groups: GeneratedTokenSet['tokenGroups']): TokenQualityInsights {
  const summarize = (tokens: TokenSummary[]) => {
    const totalUsage = tokens.reduce((sum, token) => sum + token.usage, 0)
    const averageConfidence = tokens.length
      ? Math.round(tokens.reduce((sum, token) => sum + token.confidence, 0) / tokens.length)
      : 0
    return {
      totalUsage,
      averageConfidence,
      topTokens: tokens.slice(0, 5)
    }
  }

  const categories: TokenQualityInsights['categories'] = {
    colors: summarize(groups.colors),
    typography: summarize(groups.typography),
    spacing: summarize(groups.spacing),
    radius: summarize(groups.radius),
    shadows: summarize(groups.shadows),
    motion: summarize(groups.motion),
    gradients: summarize(groups.gradients),
    borders: summarize(groups.borders)
  }

  const overallTop = [
    ...categories.colors.topTokens.map((token) => ({ category: 'colors' as const, token })),
    ...categories.typography.topTokens.map((token) => ({ category: 'typography' as const, token })),
    ...categories.spacing.topTokens.map((token) => ({ category: 'spacing' as const, token })),
    ...categories.radius.topTokens.map((token) => ({ category: 'radius' as const, token })),
    ...categories.shadows.topTokens.map((token) => ({ category: 'shadows' as const, token })),
    ...categories.motion.topTokens.map((token) => ({ category: 'motion' as const, token })),
    ...categories.gradients.topTokens.map((token) => ({ category: 'gradients' as const, token })),
    ...categories.borders.topTokens.map((token) => ({ category: 'borders' as const, token }))
  ]

  const totalTokens = Object.values(groups).reduce((sum, tokens) => sum + tokens.length, 0)

  const overall = {
    totalTokens,
    topTokens: overallTop
      .sort((a, b) => b.token.qualityScore - a.token.qualityScore)
      .slice(0, 10)
  }

  return { categories, overall }
}

export function hashTokenSet(tokenSet: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(tokenSet)).digest('hex')
}
function sanitizeTokenValue(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.split(/[{}]/)[0].split('!important')[0].trim()
  if (!trimmed) return null
  return trimmed
}

function isValidFontSize(value: string): boolean {
  return /^(-?\d*\.?\d+(px|rem|em|%|pt|vh|vw)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger|inherit|initial)$/i.test(value)
}

function isValidFontWeight(value: string): boolean {
  return /^(\d{1,3}|normal|bold|lighter|bolder)$/i.test(value)
}

function isValidLineHeight(value: string): boolean {
  return /^(-?\d*\.?\d+(px|rem|em|%|)|normal)$/i.test(value)
}

function isValidLetterSpacing(value: string): boolean {
  return /^(-?\d*\.?\d+(px|rem|em|%|)|normal|inherit|initial|unset|var\(--[^)]+\))$/i.test(value)
}

function sanitizeGradientValue(value: string): string | null {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned.includes('gradient')) return null
  return cleaned
}

function parseBorderValue(value: string): { width?: string; style?: string; color?: string } | null {
  const tokens = value.split(/\s+/).map((token) => token.trim()).filter(Boolean)
  if (tokens.length === 0) return null

  let width: string | undefined
  let style: string | undefined
  let color: string | undefined

  tokens.forEach((token) => {
    const sanitized = sanitizeTokenValue(token)
    if (!sanitized) return
    if (!width && /^\d/.test(sanitized)) {
      width = sanitized
      return
    }
    if (!style && /^(solid|dashed|dotted|double|groove|ridge|inset|outset|none|hidden)$/i.test(sanitized)) {
      style = sanitized
      return
    }
    if (!color && isColorToken(sanitized)) {
      color = sanitized
      return
    }
  })

  if (!width && !style && !color) {
    return { width: value }
  }

  return { width, style, color }
}

function isColorToken(token: string): boolean {
  return (
    /^#([0-9a-f]{3,8})$/i.test(token) ||
    /^rgba?\(/i.test(token) ||
    /^hsla?\(/i.test(token) ||
    /^[a-z]+$/i.test(token)
  )
}
