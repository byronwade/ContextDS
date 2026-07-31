/**
 * The working system — one editable design system shared by the chat, the
 * canvas and the library.
 *
 * Everything that can be edited lives here as plain data. Scans, Studio drafts
 * and blends all convert INTO a WorkingSystem; the canvas renders it, the agent
 * patches it, and the library stores it. Nothing downstream keeps its own copy
 * of token state.
 */

import {
  DEFAULT_STUDIO_SYSTEM,
  slugify,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'

export type SystemOrigin =
  | { kind: 'blank' }
  | { kind: 'scan'; domain: string; scanId?: string }
  | { kind: 'blend'; sources: string[] }
  | { kind: 'fork'; systemId: string; name: string }

export type WorkingSystem = StudioSystem & {
  /** Stable id once published to the library; null while it is only a draft. */
  id: string | null
  /** Where this system came from — drives lineage in the library. */
  origin: SystemOrigin
  /** Bumped on every applied patch so the canvas can animate transitions. */
  revision: number
}

export type SystemPatch = Partial<
  Pick<
    WorkingSystem,
    | 'name'
    | 'philosophyNote'
    | 'fontDisplay'
    | 'fontBody'
    | 'fontMono'
    | 'baseSize'
    | 'scaleRatio'
    | 'scaleSteps'
    | 'spacingBase'
    | 'spacingSteps'
    | 'radius'
    | 'depth'
  >
> & {
  /** Merge by role: { primary: '#c08a5f' }. Unknown roles are appended. */
  colors?: Record<string, string>
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB_OR_HSL = /^(rgb|hsl|oklch|color)\(/i

/** A color value we are willing to paint into the canvas. */
export function isRenderableColor(value: string): boolean {
  const trimmed = value.trim()
  return HEX.test(trimmed) || RGB_OR_HSL.test(trimmed)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function createWorkingSystem(
  overrides: Partial<WorkingSystem> = {}
): WorkingSystem {
  return {
    ...DEFAULT_STUDIO_SYSTEM,
    id: null,
    origin: { kind: 'blank' },
    revision: 0,
    ...overrides,
  }
}

/**
 * Apply an agent- or UI-authored patch. Every numeric field is clamped to a
 * range the canvas can actually render, so a bad tool call degrades to a odd
 * looking system rather than an unreadable one.
 */
export function applyPatch(system: WorkingSystem, patch: SystemPatch): WorkingSystem {
  const next: WorkingSystem = { ...system, revision: system.revision + 1 }

  if (patch.name !== undefined) {
    next.name = patch.name.slice(0, 80)
    next.slug = slugify(next.name)
  }
  if (patch.philosophyNote !== undefined) {
    next.philosophyNote = patch.philosophyNote.slice(0, 600)
  }
  if (patch.fontDisplay !== undefined) next.fontDisplay = patch.fontDisplay.slice(0, 60)
  if (patch.fontBody !== undefined) next.fontBody = patch.fontBody.slice(0, 60)
  if (patch.fontMono !== undefined) next.fontMono = patch.fontMono.slice(0, 60)
  if (patch.baseSize !== undefined) next.baseSize = clamp(Math.round(patch.baseSize), 10, 24)
  if (patch.scaleRatio !== undefined) {
    next.scaleRatio = Math.round(clamp(patch.scaleRatio, 1.05, 1.8) * 1000) / 1000
  }
  if (patch.scaleSteps !== undefined) next.scaleSteps = clamp(Math.round(patch.scaleSteps), 3, 10)
  if (patch.spacingBase !== undefined) next.spacingBase = patch.spacingBase === 4 ? 4 : 8
  if (patch.spacingSteps !== undefined) {
    next.spacingSteps = clamp(Math.round(patch.spacingSteps), 4, 12)
  }
  if (patch.radius !== undefined) next.radius = clamp(Math.round(patch.radius), 0, 48)
  if (patch.depth !== undefined) next.depth = patch.depth

  if (patch.colors) {
    const colors = system.colors.map((color) => ({ ...color }))
    for (const [role, value] of Object.entries(patch.colors)) {
      if (!isRenderableColor(value)) continue
      const existing = colors.find((color) => color.role === role)
      if (existing) existing.value = value
      else colors.push({ id: role, role, value })
    }
    next.colors = colors
  }

  return next
}

export function colorRole(system: WorkingSystem, role: string): string | null {
  return system.colors.find((color) => color.role === role)?.value ?? null
}

/**
 * CSS custom properties for the canvas preview. Scoped to the canvas element —
 * these never touch the app's own --ui-* theme variables.
 */
export function systemToCssVars(system: WorkingSystem): Record<string, string> {
  const vars: Record<string, string> = {
    '--dc-font-display': system.fontDisplay,
    '--dc-font-body': system.fontBody,
    '--dc-font-mono': system.fontMono,
    '--dc-radius': `${system.radius}px`,
    '--dc-base-size': `${system.baseSize}px`,
    '--dc-space': `${system.spacingBase}px`,
    '--dc-shadow':
      system.depth === 'flat'
        ? 'none'
        : system.depth === 'soft'
          ? '0 1px 2px rgba(0,0,0,0.08)'
          : '0 1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)',
  }
  for (const color of system.colors) {
    if (isRenderableColor(color.value)) vars[`--dc-${color.role}`] = color.value
  }
  return vars
}

/** Seed a working system from a completed scan's curated tokens. */
export function workingSystemFromScan(input: {
  domain: string
  scanId?: string
  curatedTokens?: {
    colors?: Array<{ value: unknown; name?: string; semantic?: string }>
    typography?: {
      families?: Array<{ value: unknown }>
      sizes?: Array<{ value: unknown }>
    }
    spacing?: Array<{ value: unknown }>
    radius?: Array<{ value: unknown }>
    shadows?: Array<{ value: unknown }>
  } | null
  personality?: string | null
}): WorkingSystem {
  const curated = input.curatedTokens ?? {}
  const rawColors = (curated.colors ?? [])
    .map((color) => String(color.value ?? ''))
    .filter(isRenderableColor)

  const base = createWorkingSystem({
    name: input.domain,
    slug: slugify(input.domain),
    origin: { kind: 'scan', domain: input.domain, scanId: input.scanId },
    philosophyNote: input.personality ?? '',
  })

  // Role assignment by luminance: darkest/lightest anchor the canvas, the most
  // saturated remaining color becomes the accent.
  const withLuminance = rawColors.map((value) => ({ value, l: relativeLuminance(value) }))
  withLuminance.sort((a, b) => a.l - b.l)

  if (withLuminance.length >= 2) {
    const darkest = withLuminance[0].value
    const lightest = withLuminance[withLuminance.length - 1].value
    const lightFirst = withLuminance[Math.floor(withLuminance.length / 2)].l > 0.5
    const background = lightFirst ? lightest : darkest
    const foreground = lightFirst ? darkest : lightest
    const accent =
      withLuminance
        .map((entry) => ({ ...entry, s: saturation(entry.value) }))
        .filter((entry) => entry.value !== background && entry.value !== foreground)
        .sort((a, b) => b.s - a.s)[0]?.value ?? colorRole(base, 'primary')

    base.colors = [
      { id: 'background', role: 'background', value: background },
      { id: 'foreground', role: 'foreground', value: foreground },
      {
        id: 'muted',
        role: 'muted',
        value: mix(foreground, background, 0.45),
      },
      { id: 'primary', role: 'primary', value: accent ?? foreground },
      { id: 'border', role: 'border', value: mix(foreground, background, 0.82) },
    ]
  }

  const radiusPx = firstPx(curated.radius)
  if (radiusPx !== null) base.radius = clamp(radiusPx, 0, 48)

  const family = String((curated.typography?.families ?? [])[0]?.value ?? '').trim()
  if (family) {
    const clean = family.split(',')[0].replace(/['"]/g, '').trim()
    if (clean) {
      base.fontDisplay = clean
      base.fontBody = clean
    }
  }

  const sizes = (curated.typography?.sizes ?? [])
    .map((size) => parsePx(String(size.value ?? '')))
    .filter((size): size is number => size !== null && size >= 10 && size <= 24)
    .sort((a, b) => a - b)
  if (sizes.length > 0) base.baseSize = clamp(sizes[Math.floor(sizes.length / 2)], 10, 24)

  const spacings = (curated.spacing ?? [])
    .map((space) => parsePx(String(space.value ?? '')))
    .filter((space): space is number => space !== null && space > 0)
  if (spacings.length > 0) {
    const fourFit = spacings.filter((space) => space % 4 === 0).length
    const eightFit = spacings.filter((space) => space % 8 === 0).length
    base.spacingBase = eightFit >= fourFit * 0.6 ? 8 : 4
  }

  const shadowCount = (curated.shadows ?? []).length
  base.depth = shadowCount === 0 ? 'flat' : shadowCount >= 3 ? 'layered' : 'soft'

  return base
}

function parsePx(value: string): number | null {
  const match = value.trim().match(/^(-?\d*\.?\d+)px$/)
  return match ? parseFloat(match[1]) : null
}

function firstPx(tokens?: Array<{ value: unknown }>): number | null {
  for (const token of tokens ?? []) {
    const px = parsePx(String(token.value ?? ''))
    if (px !== null) return px
  }
  return null
}

function toRgb(value: string): [number, number, number] | null {
  const hex = value.trim()
  if (HEX.test(hex)) {
    let body = hex.slice(1)
    if (body.length === 3) body = body.split('').map((char) => char + char).join('')
    return [
      parseInt(body.slice(0, 2), 16),
      parseInt(body.slice(2, 4), 16),
      parseInt(body.slice(4, 6), 16),
    ]
  }
  const rgb = hex.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

function relativeLuminance(value: string): number {
  const rgb = toRgb(value)
  if (!rgb) return 0.5
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation(value: string): number {
  const rgb = toRgb(value)
  if (!rgb) return 0
  const [r, g, b] = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

/** Mix two colors in sRGB. ratio 0 → a, 1 → b. */
export function mix(a: string, b: string, ratio: number): string {
  const rgbA = toRgb(a)
  const rgbB = toRgb(b)
  if (!rgbA || !rgbB) return a
  const blend = rgbA.map((channel, index) =>
    Math.round(channel + (rgbB[index] - channel) * clamp(ratio, 0, 1))
  )
  return `#${blend.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function toStudioSystem(system: WorkingSystem): StudioSystem {
  const { id: _id, origin: _origin, revision: _revision, ...studio } = system
  return studio
}

export function originLabel(origin: SystemOrigin): string {
  switch (origin.kind) {
    case 'scan':
      return `Scanned from ${origin.domain}`
    case 'blend':
      return `Blend of ${origin.sources.join(' + ')}`
    case 'fork':
      return `Forked from ${origin.name}`
    default:
      return 'Authored from scratch'
  }
}
