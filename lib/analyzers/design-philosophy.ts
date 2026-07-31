/**
 * Design Philosophy engine
 *
 * Deterministic analysis of a scanned token set that produces:
 *  - color science (parsing, contrast, WCAG, hue families, ramps)
 *  - typographic voice (classification, modular scale detection)
 *  - spatial rhythm (grid detection), shape + depth character
 *  - a written design philosophy: statement, traits, principles
 *
 * Everything here is pure and client-safe — no network, no AI calls —
 * so the dossier can narrate any scan instantly and reproducibly.
 */

export type RGB = { r: number; g: number; b: number; a: number }
export type HSL = { h: number; s: number; l: number }

export type ParsedColor = {
  input: string
  hex: string
  rgb: RGB
  hsl: HSL
  luminance: number
  isNeutral: boolean
  family: HueFamily
  usage?: number
  name?: string
}

export type HueFamily =
  | 'neutral'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'pink'

const HUE_FAMILIES: Array<{ family: HueFamily; upTo: number }> = [
  { family: 'red', upTo: 15 },
  { family: 'orange', upTo: 45 },
  { family: 'yellow', upTo: 70 },
  { family: 'green', upTo: 150 },
  { family: 'teal', upTo: 180 },
  { family: 'cyan', upTo: 200 },
  { family: 'blue', upTo: 245 },
  { family: 'indigo', upTo: 275 },
  { family: 'violet', upTo: 320 },
  { family: 'pink', upTo: 345 },
  { family: 'red', upTo: 360 },
]

const NAMED: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  transparent: '#00000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  currentcolor: '',
  inherit: '',
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance (0–1). */
export function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  )
}

/** WCAG contrast ratio between two parsed colors (1–21). */
export function contrastRatio(a: ParsedColor, b: ParsedColor): number {
  const l1 = Math.max(a.luminance, b.luminance)
  const l2 = Math.min(a.luminance, b.luminance)
  return (l1 + 0.05) / (l2 + 0.05)
}

export function wcagGrade(ratio: number): 'AAA' | 'AA' | 'AA18' | 'fail' {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA18'
  return 'fail'
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60
  return { h, s, l }
}

function toHexByte(value: number): string {
  return Math.round(clamp01(value / 255) * 255)
    .toString(16)
    .padStart(2, '0')
}

export function rgbToHex(rgb: RGB): string {
  const base = `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`
  if (rgb.a < 1) {
    return `${base}${Math.round(clamp01(rgb.a) * 255)
      .toString(16)
      .padStart(2, '0')}`
  }
  return base
}

/** Approximate oklch() → sRGB. Good enough for swatching scanner output. */
function oklchToRgb(l: number, c: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180
  const a = Math.cos(h) * c
  const b = Math.sin(h) * c
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3
  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
  const gamma = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(0, x) ** (1 / 2.4) - 0.055
  return {
    r: clamp01(gamma(lr)) * 255,
    g: clamp01(gamma(lg)) * 255,
    b: clamp01(gamma(lb)) * 255,
    a: 1,
  }
}

function classifyFamily(hsl: HSL, neutral: boolean): HueFamily {
  if (neutral) return 'neutral'
  const hue = ((hsl.h % 360) + 360) % 360
  for (const entry of HUE_FAMILIES) {
    if (hue <= entry.upTo) return entry.family
  }
  return 'neutral'
}

/**
 * Parse a CSS color string (hex, rgb[a], hsl[a], oklch, named).
 * Returns null when the value isn't a resolvable color.
 */
export function parseColor(
  input: string,
  meta?: { usage?: number; name?: string }
): ParsedColor | null {
  if (!input) return null
  let value = input.trim().toLowerCase()
  if (value in NAMED) {
    if (!NAMED[value]) return null
    value = NAMED[value]
  }

  let rgb: RGB | null = null

  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/)
  if (hexMatch) {
    const hex = hexMatch[1]
    const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16)
    if (hex.length === 3 || hex.length === 4) {
      rgb = {
        r: expand(hex[0]),
        g: expand(hex[1]),
        b: expand(hex[2]),
        a: hex.length === 4 ? expand(hex[3]) / 255 : 1,
      }
    } else if (hex.length === 6 || hex.length === 8) {
      rgb = {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      }
    }
  }

  if (!rgb) {
    const fnMatch = value.match(/^(rgba?|hsla?|oklch)\(([^)]+)\)$/)
    if (fnMatch) {
      const fn = fnMatch[1]
      const parts = fnMatch[2]
        .replace(/\//g, ' ')
        .split(/[,\s]+/)
        .filter(Boolean)
      const nums = parts.map((part) => {
        const pct = part.endsWith('%')
        const n = parseFloat(part)
        return { n, pct, raw: part }
      })
      if (fn.startsWith('rgb') && nums.length >= 3) {
        rgb = {
          r: nums[0].pct ? (nums[0].n / 100) * 255 : nums[0].n,
          g: nums[1].pct ? (nums[1].n / 100) * 255 : nums[1].n,
          b: nums[2].pct ? (nums[2].n / 100) * 255 : nums[2].n,
          a: nums[3] ? (nums[3].pct ? nums[3].n / 100 : nums[3].n) : 1,
        }
      } else if (fn.startsWith('hsl') && nums.length >= 3) {
        const h = nums[0].n
        const s = nums[1].n / 100
        const l = nums[2].n / 100
        const a = nums[3] ? (nums[3].pct ? nums[3].n / 100 : nums[3].n) : 1
        const k = (n: number) => (n + h / 30) % 12
        const f = (n: number) =>
          l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
        rgb = { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a }
      } else if (fn === 'oklch' && nums.length >= 3) {
        const l = nums[0].pct ? nums[0].n / 100 : nums[0].n
        rgb = oklchToRgb(l, nums[1].n, nums[2].n)
        if (nums[3]) rgb.a = nums[3].pct ? nums[3].n / 100 : nums[3].n
      }
    }
  }

  if (!rgb || [rgb.r, rgb.g, rgb.b].some((channel) => Number.isNaN(channel))) {
    return null
  }

  const hsl = rgbToHsl(rgb)
  const luminance = relativeLuminance(rgb)
  const isNeutral = hsl.s < 0.12 || hsl.l > 0.97 || hsl.l < 0.04
  return {
    input,
    hex: rgbToHex(rgb),
    rgb,
    hsl,
    luminance,
    isNeutral,
    family: classifyFamily(hsl, isNeutral),
    usage: meta?.usage,
    name: meta?.name,
  }
}

export const WHITE = parseColor('#ffffff') as ParsedColor
export const BLACK = parseColor('#0a0a0a') as ParsedColor

/** Pick a readable foreground (light or dark ink) for a swatch. */
export function inkFor(color: ParsedColor): string {
  return contrastRatio(color, WHITE) >= contrastRatio(color, BLACK)
    ? '#ffffff'
    : '#0a0a0a'
}

// ---------------------------------------------------------------------------
// Token-set analysis
// ---------------------------------------------------------------------------

export type TokenLike = {
  name?: string
  value: string | number
  usage?: number
  confidence?: number
}

export type ColorSystem = {
  all: ParsedColor[]
  neutrals: ParsedColor[]
  chromatic: ParsedColor[]
  families: Array<{ family: HueFamily; colors: ParsedColor[] }>
  accent: ParsedColor | null
  darkest: ParsedColor | null
  lightest: ParsedColor | null
  temperature: 'warm' | 'cool' | 'balanced'
  polarity: 'dark-leaning' | 'light-leaning' | 'balanced'
}

export function analyzeColors(tokens: TokenLike[]): ColorSystem {
  const all: ParsedColor[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    const parsed = parseColor(String(token.value), {
      usage: token.usage,
      name: token.name,
    })
    if (!parsed || parsed.rgb.a === 0) continue
    if (seen.has(parsed.hex)) continue
    seen.add(parsed.hex)
    all.push(parsed)
  }

  const neutrals = all
    .filter((color) => color.isNeutral)
    .sort((a, b) => b.luminance - a.luminance)
  const chromatic = all
    .filter((color) => !color.isNeutral)
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0) || b.hsl.s - a.hsl.s)

  const byFamily = new Map<HueFamily, ParsedColor[]>()
  for (const color of chromatic) {
    const bucket = byFamily.get(color.family) ?? []
    bucket.push(color)
    byFamily.set(color.family, bucket)
  }
  const families = Array.from(byFamily.entries())
    .map(([family, colors]) => ({
      family,
      colors: colors.sort((a, b) => b.hsl.l - a.hsl.l),
    }))
    .sort((a, b) => b.colors.length - a.colors.length)

  const warmCount = chromatic.filter((color) =>
    ['red', 'orange', 'yellow', 'pink'].includes(color.family)
  ).length
  const coolCount = chromatic.filter((color) =>
    ['green', 'teal', 'cyan', 'blue', 'indigo', 'violet'].includes(color.family)
  ).length

  // Polarity is a question about SURFACES, so judge it on the neutral ramp.
  // Counting every color lets dark accents (a deep navy, an oxblood red) vote
  // a white-background system "dark-leaning". Fall back to the full set only
  // when there are too few neutrals to read.
  const surfaces = neutrals.length >= 2 ? neutrals : all
  const darkSurfaces = surfaces.filter((color) => color.luminance < 0.2).length
  const lightSurfaces = surfaces.filter((color) => color.luminance > 0.7).length

  return {
    all,
    neutrals,
    chromatic,
    families,
    accent: chromatic[0] ?? null,
    darkest: [...all].sort((a, b) => a.luminance - b.luminance)[0] ?? null,
    lightest: [...all].sort((a, b) => b.luminance - a.luminance)[0] ?? null,
    temperature:
      warmCount > coolCount * 1.5
        ? 'warm'
        : coolCount > warmCount * 1.5
          ? 'cool'
          : 'balanced',
    polarity:
      darkSurfaces > lightSurfaces * 1.5
        ? 'dark-leaning'
        : lightSurfaces > darkSurfaces * 1.5
          ? 'light-leaning'
          : 'balanced',
  }
}

export type FontClass = 'serif' | 'sans' | 'mono' | 'display' | 'handwritten'

export function classifyFont(family: string): FontClass {
  const name = family.toLowerCase()
  if (/(mono|code|consol|courier|menlo|jetbrains|fira code|source code)/.test(name)) return 'mono'
  if (/(serif|georgia|garamond|times|playfair|merriweather|lora|charter|spectral|tiempos|freight|caslon|baskerville|instrument serif)/.test(name) && !/sans/.test(name)) return 'serif'
  if (/(script|hand|cursive|caveat|pacifico|dancing)/.test(name)) return 'handwritten'
  if (/(display|clash|cabinet|bebas|oswald|anton|archivo expanded)/.test(name)) return 'display'
  return 'sans'
}

export function primaryFamilyName(stack: string): string {
  return stack.split(',')[0].replace(/['"]/g, '').trim()
}

export function pxOf(value: string | number): number | null {
  if (typeof value === 'number') return value
  const match = String(value)
    .trim()
    .match(/^(-?\d*\.?\d+)(px|rem|em)?$/)
  if (!match) return null
  const n = parseFloat(match[1])
  if (Number.isNaN(n)) return null
  return match[2] === 'rem' || match[2] === 'em' ? n * 16 : n
}

const KNOWN_SCALES: Array<{ ratio: number; label: string }> = [
  { ratio: 1.125, label: 'major second' },
  { ratio: 1.2, label: 'minor third' },
  { ratio: 1.25, label: 'major third' },
  { ratio: 1.333, label: 'perfect fourth' },
  { ratio: 1.414, label: 'augmented fourth' },
  { ratio: 1.5, label: 'perfect fifth' },
  { ratio: 1.618, label: 'golden ratio' },
]

export type TypeSystem = {
  families: Array<{ stack: string; primary: string; class: FontClass; usage?: number }>
  sizesPx: number[]
  scaleRatio: number | null
  scaleLabel: string | null
  weights: number[]
  voice: string
}

export function analyzeTypography(input: {
  families?: TokenLike[]
  sizes?: TokenLike[]
  weights?: TokenLike[]
}): TypeSystem {
  const families = (input.families ?? [])
    .map((token) => {
      const stack = String(token.value)
      const primary = primaryFamilyName(stack)
      return { stack, primary, class: classifyFont(primary), usage: token.usage }
    })
    .filter(
      (font, index, list) =>
        font.primary &&
        list.findIndex((other) => other.primary === font.primary) === index
    )

  const sizesPx = Array.from(
    new Set(
      (input.sizes ?? [])
        .map((token) => pxOf(token.value))
        .filter((n): n is number => n !== null && n >= 8 && n <= 200)
    )
  ).sort((a, b) => a - b)

  let scaleRatio: number | null = null
  let scaleLabel: string | null = null
  if (sizesPx.length >= 4) {
    const body = sizesPx.filter((n) => n >= 12 && n <= 96)
    const ratios: number[] = []
    for (let i = 1; i < body.length; i++) {
      const ratio = body[i] / body[i - 1]
      if (ratio > 1.02 && ratio < 2) ratios.push(ratio)
    }
    if (ratios.length >= 2) {
      ratios.sort((a, b) => a - b)
      scaleRatio = ratios[Math.floor(ratios.length / 2)]
      const nearest = KNOWN_SCALES.reduce((best, candidate) =>
        Math.abs(candidate.ratio - (scaleRatio as number)) <
        Math.abs(best.ratio - (scaleRatio as number))
          ? candidate
          : best
      )
      if (Math.abs(nearest.ratio - scaleRatio) < 0.06) scaleLabel = nearest.label
    }
  }

  const weights = Array.from(
    new Set(
      (input.weights ?? [])
        .map((token) => {
          const raw = String(token.value).toLowerCase()
          if (raw === 'bold') return 700
          if (raw === 'normal' || raw === 'regular') return 400
          const n = parseInt(raw, 10)
          return Number.isNaN(n) ? null : n
        })
        .filter((n): n is number => n !== null && n >= 100 && n <= 950)
    )
  ).sort((a, b) => a - b)

  const classes = new Set(families.map((font) => font.class))
  let voice = 'a single utilitarian voice'
  if (classes.has('serif') && classes.has('sans'))
    voice = 'an editorial pairing — serif display over sans-serif utility'
  else if (classes.has('serif')) voice = 'a literary, serif-led voice'
  else if (classes.has('mono') && classes.size === 1)
    voice = 'a technical, monospace-first voice'
  else if (classes.has('mono'))
    voice = 'a product voice with monospace for data and code'
  else if (classes.has('display')) voice = 'a headline-driven display voice'

  return { families, sizesPx, scaleRatio, scaleLabel, weights, voice }
}

export type SpaceSystem = {
  valuesPx: number[]
  base: 4 | 8 | null
  gridFit: number
  range: [number, number] | null
}

export function analyzeSpacing(tokens: TokenLike[]): SpaceSystem {
  const valuesPx = Array.from(
    new Set(
      tokens
        .map((token) => pxOf(token.value))
        .filter((n): n is number => n !== null && n > 0 && n <= 400)
    )
  ).sort((a, b) => a - b)
  if (valuesPx.length === 0) return { valuesPx, base: null, gridFit: 0, range: null }
  const on8 = valuesPx.filter((n) => n % 8 === 0).length / valuesPx.length
  const on4 = valuesPx.filter((n) => n % 4 === 0).length / valuesPx.length
  const base = on8 >= 0.7 ? 8 : on4 >= 0.7 ? 4 : null
  return {
    valuesPx,
    base,
    gridFit: Math.round((base === 8 ? on8 : on4) * 100),
    range: [valuesPx[0], valuesPx[valuesPx.length - 1]],
  }
}

export type ShapeSystem = {
  radiiPx: number[]
  character: 'sharp' | 'squared' | 'soft' | 'rounded' | 'pill'
  depth: 'flat' | 'hairline' | 'soft' | 'layered'
  shadowCount: number
}

export function analyzeShape(input: {
  radius?: TokenLike[]
  shadows?: TokenLike[]
}): ShapeSystem {
  const radiiPx = Array.from(
    new Set(
      (input.radius ?? [])
        .map((token) => pxOf(token.value))
        .filter((n): n is number => n !== null && n >= 0 && n < 200)
    )
  ).sort((a, b) => a - b)

  const workhorse =
    radiiPx.filter((n) => n > 0 && n < 100).sort((a, b) => a - b)[
      Math.floor(radiiPx.filter((n) => n > 0 && n < 100).length / 2)
    ] ?? 0

  let character: ShapeSystem['character'] = 'squared'
  if (radiiPx.length === 0 || workhorse === 0) character = 'sharp'
  else if (workhorse <= 4) character = 'squared'
  else if (workhorse <= 10) character = 'soft'
  else if (workhorse <= 24) character = 'rounded'
  else character = 'pill'

  const shadows = input.shadows ?? []
  const layered = shadows.filter((token) => String(token.value).includes(',')).length
  let depth: ShapeSystem['depth'] = 'flat'
  if (shadows.length === 0) depth = 'flat'
  else if (layered >= 2) depth = 'layered'
  else if (shadows.length >= 3) depth = 'soft'
  else depth = 'hairline'

  return { radiiPx, character, depth, shadowCount: shadows.length }
}

export type MotionSystem = {
  durationsMs: number[]
  easings: string[]
  tempo: 'instant' | 'brisk' | 'relaxed' | null
}

export function analyzeMotion(tokens: TokenLike[]): MotionSystem {
  const durationsMs: number[] = []
  const easings: string[] = []
  for (const token of tokens) {
    const value = String(token.value).trim()
    const ms = value.match(/^(\d*\.?\d+)(ms|s)$/)
    if (ms) {
      durationsMs.push(ms[2] === 's' ? parseFloat(ms[1]) * 1000 : parseFloat(ms[1]))
      continue
    }
    if (/^(cubic-bezier|ease|linear|steps)/.test(value)) easings.push(value)
  }
  durationsMs.sort((a, b) => a - b)
  const median = durationsMs[Math.floor(durationsMs.length / 2)]
  return {
    durationsMs: Array.from(new Set(durationsMs)),
    easings: Array.from(new Set(easings)),
    tempo:
      median === undefined
        ? null
        : median <= 150
          ? 'instant'
          : median <= 350
            ? 'brisk'
            : 'relaxed',
  }
}

// ---------------------------------------------------------------------------
// Philosophy generation
// ---------------------------------------------------------------------------

export type CuratedLike = {
  colors?: TokenLike[]
  typography?: {
    families?: TokenLike[]
    sizes?: TokenLike[]
    weights?: TokenLike[]
  }
  spacing?: TokenLike[]
  radius?: TokenLike[]
  shadows?: TokenLike[]
  motion?: TokenLike[]
}

export type DesignPhilosophy = {
  title: string
  statement: string
  traits: string[]
  principles: Array<{ title: string; body: string }>
  systems: {
    color: ColorSystem
    type: TypeSystem
    space: SpaceSystem
    shape: ShapeSystem
    motion: MotionSystem
  }
}

/**
 * Measured UX evidence from the crawl — the parts of "how it feels" that only
 * a rendered page can tell you. Optional: philosophy still works from tokens
 * alone for fast scans.
 */
export type UxEvidence = {
  shell?: {
    header?: { height: number; sticky: boolean } | null
    sidebar?: { width: number; fixed: boolean } | null
    footer?: { height: number } | null
  } | null
  density?: {
    elementsInViewport: number
    imageAreaRatio: number
    textChars: number
  } | null
  interaction?: {
    rules: number
    effects: Array<{ value: string; weight: number }>
  } | null
  keyframeCount?: number
  pagesAudited?: number
}

/** Turn the ranked feedback properties into one readable clause. */
function describeFeedback(props: string[]): string {
  const phrases: string[] = []
  if (props.includes('background-color') || props.includes('background')) phrases.push('shifting fill')
  if (props.includes('color')) phrases.push('changing text tone')
  if (props.includes('transform') || props.includes('scale') || props.includes('translate')) {
    phrases.push('moving the element')
  }
  if (props.includes('box-shadow')) phrases.push('raising elevation')
  if (props.includes('opacity') || props.includes('filter')) phrases.push('fading')
  if (props.includes('border-color') || props.includes('outline') || props.includes('outline-color')) {
    phrases.push('drawing an edge')
  }
  if (props.includes('text-decoration')) phrases.push('underlining')
  if (phrases.length === 0) return 'changing state subtly'
  if (phrases.length === 1) return phrases[0]
  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`
}

/** Which properties the site changes on hover/focus, ranked. */
function feedbackProps(interaction: UxEvidence['interaction']): string[] {
  if (!interaction) return []
  const seen = new Set<string>()
  const props: string[] = []
  for (const effect of interaction.effects) {
    const prop = effect.value.split(' ').slice(1).join(' ')
    if (!prop || seen.has(prop)) continue
    seen.add(prop)
    props.push(prop)
  }
  return props
}

const FAMILY_LABEL: Record<HueFamily, string> = {
  neutral: 'neutral',
  red: 'red',
  orange: 'orange',
  yellow: 'amber',
  green: 'green',
  teal: 'teal',
  cyan: 'cyan',
  blue: 'blue',
  indigo: 'indigo',
  violet: 'violet',
  pink: 'pink',
}

export function generatePhilosophy(input: {
  domain: string
  curated: CuratedLike | null | undefined
  personality?: string | null
  primaryFont?: string | null
  /** Measured render evidence — adds shell, density and feedback reasoning. */
  ux?: UxEvidence | null
}): DesignPhilosophy {
  const curated = input.curated ?? {}
  const color = analyzeColors(curated.colors ?? [])
  const type = analyzeTypography(curated.typography ?? {})
  const space = analyzeSpacing(curated.spacing ?? [])
  const shape = analyzeShape({ radius: curated.radius, shadows: curated.shadows })
  const motion = analyzeMotion(curated.motion ?? [])

  const traits: string[] = []

  // Color traits
  if (color.neutrals.length >= 5 && color.chromatic.length <= color.neutrals.length / 2) {
    traits.push('restrained palette')
  } else if (color.chromatic.length > 8) {
    traits.push('expressive palette')
  }
  if (color.temperature === 'warm') traits.push('warm-toned')
  if (color.temperature === 'cool') traits.push('cool-toned')
  if (color.polarity === 'dark-leaning') traits.push('dark-leaning')
  if (color.polarity === 'light-leaning') traits.push('light-first')

  // Shape + depth traits
  traits.push(
    {
      sharp: 'hard-edged',
      squared: 'crisp corners',
      soft: 'softened corners',
      rounded: 'friendly geometry',
      pill: 'pill geometry',
    }[shape.character]
  )
  if (shape.depth === 'flat') traits.push('flat surfaces')
  if (shape.depth === 'layered') traits.push('layered depth')

  // Rhythm traits
  if (space.base) traits.push(`${space.base}px rhythm`)
  if (type.scaleLabel) traits.push(`${type.scaleLabel} scale`)
  if (motion.tempo === 'instant') traits.push('snappy motion')
  if (motion.tempo === 'relaxed') traits.push('unhurried motion')

  // Measured UX traits — how the built page actually behaves
  const ux = input.ux ?? null
  const feedback = feedbackProps(ux?.interaction)
  if (ux?.shell?.sidebar) traits.push('sidebar shell')
  else if (ux?.shell?.header?.sticky) traits.push('sticky chrome')
  if (ux?.density) {
    if (ux.density.elementsInViewport > 420) traits.push('dense surface')
    else if (ux.density.elementsInViewport < 180) traits.push('spacious surface')
    if (ux.density.imageAreaRatio >= 0.35) traits.push('image-led')
  }
  if (feedback.includes('transform') || feedback.includes('scale')) traits.push('tactile hover')
  if (feedback.includes('box-shadow')) traits.push('lift on hover')

  const accentPhrase = color.accent
    ? `${FAMILY_LABEL[color.accent.family]} (${color.accent.hex})`
    : 'no single accent'

  const dominantFamilies = color.families
    .slice(0, 2)
    .map((group) => FAMILY_LABEL[group.family])

  const statementParts: string[] = []
  statementParts.push(
    color.neutrals.length > 0
      ? `${input.domain} builds on a ${
          color.polarity === 'dark-leaning'
            ? 'dark, high-contrast'
            : color.polarity === 'light-leaning'
              ? 'light, airy'
              : 'tonally balanced'
        } foundation of ${color.neutrals.length} neutrals, reserving ${
          dominantFamilies.length > 0 ? dominantFamilies.join(' and ') : 'color'
        } for emphasis — the working accent is ${accentPhrase}.`
      : `${input.domain} leans almost entirely on chromatic color, with ${accentPhrase} carrying the brand.`
  )
  statementParts.push(
    `Typography speaks with ${type.voice}${
      type.scaleLabel
        ? `, stepped on a ${type.scaleLabel} scale (~${type.scaleRatio?.toFixed(2)}×)`
        : type.sizesPx.length > 0
          ? ` across ${type.sizesPx.length} sizes`
          : ''
    }.`
  )
  statementParts.push(
    `${
      space.base
        ? `Space moves on a ${space.base}px grid (${space.gridFit}% of the scale conforms)`
        : 'Spacing is set optically rather than on a strict grid'
    }; corners are ${shape.character}, and elevation stays ${
      { flat: 'flat — hierarchy comes from tone, not shadows', hairline: 'minimal, a single hairline of depth', soft: 'soft and diffuse', layered: 'layered, with stacked shadows for real depth' }[shape.depth]
    }.`
  )
  if (motion.tempo) {
    statementParts.push(
      `Motion is ${motion.tempo === 'instant' ? 'near-instant — feedback, not theater' : motion.tempo === 'brisk' ? 'brisk and purposeful' : 'deliberately unhurried'}${
        motion.easings.length > 0 ? `, eased with ${motion.easings.length} curve${motion.easings.length === 1 ? '' : 's'}` : ''
      }.`
    )
  }

  // Measured behaviour — what the crawl saw the built pages actually do
  if (ux?.shell || ux?.density || feedback.length > 0) {
    const shellPhrase = ux?.shell?.sidebar
      ? `a ${ux.shell.sidebar.width}px ${ux.shell.sidebar.fixed ? 'fixed' : 'static'} sidebar${
          ux.shell.header ? ` under a ${ux.shell.header.height}px ${ux.shell.header.sticky ? 'sticky' : 'static'} header` : ''
        }`
      : ux?.shell?.header
        ? `a ${ux.shell.header.height}px ${ux.shell.header.sticky ? 'sticky' : 'static'} header and no persistent sidebar`
        : null
    const densityPhrase = ux?.density
      ? `${ux.density.elementsInViewport} elements in the first screen (${
          ux.density.elementsInViewport > 420
            ? 'dense'
            : ux.density.elementsInViewport > 180
              ? 'balanced'
              : 'spacious'
        })`
      : null
    const behaviourBits = [shellPhrase, densityPhrase].filter(Boolean)
    if (behaviourBits.length > 0) {
      statementParts.push(
        `Structurally the product frames itself with ${behaviourBits.join(', carrying ')}${
          ux?.pagesAudited && ux.pagesAudited > 1 ? ` — consistent across ${ux.pagesAudited} crawled pages` : ''
        }.`
      )
    }
    if (feedback.length > 0) {
      statementParts.push(
        `It answers the pointer by ${describeFeedback(feedback)}${
          ux?.keyframeCount ? `, on top of ${ux.keyframeCount} named animations` : ''
        }.`
      )
    }
  }

  const principles: Array<{ title: string; body: string }> = []
  principles.push({
    title:
      color.neutrals.length >= color.chromatic.length
        ? 'Neutral canvas, earned color'
        : 'Color leads',
    body:
      color.neutrals.length >= color.chromatic.length
        ? `Most of the interface is drawn in ${color.neutrals.length} neutral steps; chromatic color appears only where attention is earned. Keep new UI on the neutral ramp and reach for ${color.accent ? color.accent.hex : 'the accent'} sparingly.`
        : `Color is a primary material here — ${color.chromatic.length} chromatic tokens against ${color.neutrals.length} neutrals. New surfaces should commit to the palette rather than dilute it with grays.`,
  })
  principles.push({
    title: type.families.length > 1 ? 'Two voices, one hierarchy' : 'One voice, many sizes',
    body:
      type.families.length > 1
        ? `${type.families
            .slice(0, 2)
            .map((font) => `${font.primary} (${font.class})`)
            .join(' and ')} split display and utility duties. Never introduce a third family; change size and weight instead.`
        : `${type.families[0]?.primary ?? 'The system font'} carries everything${
            type.weights.length > 1
              ? `, differentiated by ${type.weights.length} weights (${type.weights.join(', ')})`
              : ''
          }. Hierarchy comes from the scale, not from new fonts.`,
  })
  principles.push({
    title: space.base ? `The ${space.base}px grid is law` : 'Optical spacing',
    body: space.base
      ? `${space.gridFit}% of spacing values sit on the ${space.base}px grid${space.range ? `, from ${space.range[0]}px to ${space.range[1]}px` : ''}. Snap new margins and padding to it — off-grid values read as bugs.`
      : 'Spacing was tuned by eye. Match adjacent components rather than inventing new values; sample before you space.',
  })
  principles.push({
    title: {
      sharp: 'Edges mean precision',
      squared: 'Quietly squared',
      soft: 'Soft, not squishy',
      rounded: 'Rounded and approachable',
      pill: 'Pills as identity',
    }[shape.character],
    body: `Corner radii cluster around ${
      shape.radiiPx.length > 0 ? `${shape.radiiPx.join(', ')}px` : '0px'
    } and depth stays ${shape.depth}. Keep controls and surfaces on these radii — mixing corner languages is the fastest way to break this system.`,
  })

  if (feedback.length > 0 || ux?.shell?.sidebar) {
    principles.push(
      feedback.length > 0
        ? {
            title: 'Every control answers back',
            body: `Interactive states were measured across ${
              ux?.interaction?.rules ?? 0
            } hover/focus/active rules, and the site consistently responds by ${describeFeedback(feedback)}. Reuse that vocabulary — a control that changes nothing on hover, or invents a new feedback gesture, reads as broken here.${
              feedback.some((prop) => prop.startsWith('outline') || prop === 'border-color')
                ? ' Focus is drawn explicitly, so keep visible focus rings.'
                : ' Focus states were thin in the source — add visible focus rings when you build.'
            }`,
          }
        : {
            title: 'The shell is the constant',
            body: `A ${ux!.shell!.sidebar!.width}px ${ux!.shell!.sidebar!.fixed ? 'fixed' : 'static'} sidebar frames the product on every crawled page. New surfaces belong inside that frame — full-bleed pages that drop the shell break the product's spatial model.`,
          }
    )
  }

  const titleBits: string[] = []
  titleBits.push(
    color.polarity === 'dark-leaning'
      ? 'Dark'
      : color.polarity === 'light-leaning'
        ? 'Light'
        : 'Tonal'
  )
  titleBits.push(
    color.temperature === 'warm'
      ? 'warm'
      : color.temperature === 'cool'
        ? 'cool'
        : 'balanced'
  )
  titleBits.push(
    {
      sharp: 'precise',
      squared: 'crisp',
      soft: 'soft-edged',
      rounded: 'rounded',
      pill: 'pill-shaped',
    }[shape.character]
  )

  const personality = input.personality?.trim()
  const title = personality
    ? personality.charAt(0).toUpperCase() + personality.slice(1)
    : `${titleBits[0]}, ${titleBits[1]} and ${titleBits[2]}`

  return {
    title,
    statement: statementParts.join(' '),
    traits: Array.from(new Set(traits)).slice(0, 8),
    principles,
    systems: { color, type, space, shape, motion },
  }
}
