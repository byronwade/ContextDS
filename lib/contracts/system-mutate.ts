/**
 * Directed StudioSystem mutations — contrast AA/AAA fix, light↔dark polarity,
 * and heuristic "evolve" directives (denser, warmer, sharper, …).
 */

import {
  getContrastRatio,
  hexToRgb,
} from '@/lib/contrast-checker'
import {
  slugify,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'

export type ContrastTarget = 'AA' | 'AAA'

export type ContrastFixReport = {
  system: StudioSystem
  target: ContrastTarget
  minRatio: number
  pairs: Array<{
    pair: string
    before: number | null
    after: number | null
    adjusted: boolean
  }>
  changed: boolean
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** Mix toward black (amount 0–1) or white (negative amount). */
function shiftToward(hex: string, toward: 'black' | 'white', amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const t = Math.min(1, Math.max(0, amount))
  if (toward === 'black') {
    return toHex(rgb.r * (1 - t), rgb.g * (1 - t), rgb.b * (1 - t))
  }
  return toHex(
    rgb.r + (255 - rgb.r) * t,
    rgb.g + (255 - rgb.g) * t,
    rgb.b + (255 - rgb.b) * t
  )
}

function roleColor(system: StudioSystem, role: string): string | null {
  return system.colors.find((color) => color.role === role)?.value ?? null
}

function setRole(system: StudioSystem, role: string, value: string): StudioSystem {
  const colors = system.colors.map((color) => ({ ...color }))
  const existing = colors.find((color) => color.role === role)
  if (existing) existing.value = value
  else colors.push({ id: role, role, value })
  return { ...system, colors }
}

function ensurePair(
  foreground: string,
  background: string,
  minRatio: number
): { foreground: string; background: string; adjusted: boolean } {
  const start = getContrastRatio(foreground, background)
  if (start !== null && start >= minRatio) {
    return { foreground, background, adjusted: false }
  }

  let fg = foreground
  let bg = background
  const bgLum = luminance(background)
  const fgShouldLighten = bgLum < 0.5

  for (let step = 1; step <= 28; step++) {
    const amount = step / 28
    fg = shiftToward(foreground, fgShouldLighten ? 'white' : 'black', amount)
    const ratio = getContrastRatio(fg, bg)
    if (ratio !== null && ratio >= minRatio) {
      return { foreground: fg, background: bg, adjusted: true }
    }
  }

  // Last resort: nudge background the other way
  for (let step = 1; step <= 16; step++) {
    const amount = step / 20
    bg = shiftToward(background, fgShouldLighten ? 'black' : 'white', amount)
    const ratio = getContrastRatio(fg, bg)
    if (ratio !== null && ratio >= minRatio) {
      return { foreground: fg, background: bg, adjusted: true }
    }
  }

  return { foreground: fg, background: bg, adjusted: true }
}

/** Nudge fg/bg/primary/muted so key pairs meet WCAG AA or AAA. */
export function fixStudioContrast(
  system: StudioSystem,
  target: ContrastTarget = 'AA'
): ContrastFixReport {
  const minRatio = target === 'AAA' ? 7 : 4.5
  let next: StudioSystem = {
    ...system,
    colors: system.colors.map((color) => ({ ...color })),
  }
  const pairs: ContrastFixReport['pairs'] = []
  let changed = false

  const background = roleColor(next, 'background') ?? '#ffffff'
  const foreground = roleColor(next, 'foreground') ?? '#000000'
  const textFix = ensurePair(foreground, background, minRatio)
  if (textFix.adjusted) {
    next = setRole(next, 'foreground', textFix.foreground)
    next = setRole(next, 'background', textFix.background)
    changed = true
  }
  pairs.push({
    pair: 'foreground/background',
    before: getContrastRatio(foreground, background),
    after: getContrastRatio(
      roleColor(next, 'foreground')!,
      roleColor(next, 'background')!
    ),
    adjusted: textFix.adjusted,
  })

  const bg = roleColor(next, 'background')!
  const primary = roleColor(next, 'primary')
  if (primary) {
    // Prefer readable primary on background (UI chrome); if fail, darken/lighten primary
    const before = getContrastRatio(primary, bg)
    const fix = ensurePair(primary, bg, Math.min(minRatio, 4.5))
    if (fix.adjusted) {
      next = setRole(next, 'primary', fix.foreground)
      changed = true
    }
    pairs.push({
      pair: 'primary/background',
      before,
      after: getContrastRatio(roleColor(next, 'primary')!, bg),
      adjusted: fix.adjusted,
    })
  }

  const muted = roleColor(next, 'muted')
  if (muted) {
    const before = getContrastRatio(muted, bg)
    // Muted may only need AA Large (3:1); still aim for 4.5 when target is AA+
    const mutedMin = target === 'AAA' ? 4.5 : 3
    const fix = ensurePair(muted, bg, mutedMin)
    if (fix.adjusted) {
      next = setRole(next, 'muted', fix.foreground)
      changed = true
    }
    pairs.push({
      pair: 'muted/background',
      before,
      after: getContrastRatio(roleColor(next, 'muted')!, bg),
      adjusted: fix.adjusted,
    })
  }

  if (changed) {
    next = {
      ...next,
      philosophyNote: [
        next.philosophyNote,
        `Contrast fixed toward WCAG ${target}.`,
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 600),
    }
  }

  return { system: next, target, minRatio, pairs, changed }
}

/** Swap light↔dark polarity while preserving accent hue. */
export function invertStudioPolarity(system: StudioSystem): StudioSystem {
  const background = roleColor(system, 'background')
  const foreground = roleColor(system, 'foreground')
  if (!background || !foreground) {
    throw new Error('System needs background and foreground roles to invert polarity')
  }

  let next = setRole(system, 'background', foreground)
  next = setRole(next, 'foreground', background)

  const muted = roleColor(system, 'muted')
  if (muted) {
    // Remap muted toward the new mid between swapped ends
    const mid = mixHex(foreground, background, 0.45)
    next = setRole(next, 'muted', mid)
  }
  const border = roleColor(system, 'border')
  if (border) {
    next = setRole(next, 'border', mixHex(foreground, background, 0.82))
  }

  return {
    ...next,
    name: system.name.endsWith('(inverted)')
      ? system.name
      : `${system.name} (inverted)`.slice(0, 80),
    slug: slugify(
      system.name.endsWith('(inverted)')
        ? system.name
        : `${system.name} inverted`
    ),
    philosophyNote: [
      system.philosophyNote,
      'Polarity inverted (light ↔ dark) while preserving primary accent.',
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 600),
  }
}

function mixHex(a: string, b: string, ratio: number): string {
  const rgbA = hexToRgb(a)
  const rgbB = hexToRgb(b)
  if (!rgbA || !rgbB) return a
  const t = Math.min(1, Math.max(0, ratio))
  return toHex(
    rgbA.r + (rgbB.r - rgbA.r) * t,
    rgbA.g + (rgbB.g - rgbA.g) * t,
    rgbA.b + (rgbB.b - rgbA.b) * t
  )
}

/**
 * Apply a short natural-language evolve directive onto an existing system
 * without discarding its identity colors unless the directive asks for a theme shift.
 */
export function evolveStudioSystem(
  system: StudioSystem,
  directive: string
): StudioSystem {
  const lower = directive.trim().toLowerCase()
  if (lower.length < 4) {
    throw new Error('Evolve directive must be at least 4 characters')
  }

  let next: StudioSystem = {
    ...system,
    colors: system.colors.map((color) => ({ ...color })),
    philosophyNote: [system.philosophyNote, directive.trim()]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 600),
  }

  if (/dense|ops|terminal|compact|tight/.test(lower)) {
    next.spacingBase = 4
    next.radius = Math.min(next.radius, 6)
    next.baseSize = Math.min(next.baseSize, 14)
    next.scaleRatio = Math.min(next.scaleRatio, 1.2)
    next.depth = 'flat'
  }
  if (/spacious|airy|generous|editorial/.test(lower)) {
    next.spacingBase = 8
    next.baseSize = Math.max(next.baseSize, 16)
    next.scaleRatio = Math.max(next.scaleRatio, 1.25)
  }
  if (/sharp|brutal|square/.test(lower)) {
    next.radius = Math.min(next.radius, 4)
    next.depth = 'flat'
  }
  if (/soft|friendly|rounded|playful/.test(lower)) {
    next.radius = Math.max(next.radius, 14)
    next.depth = next.depth === 'flat' ? 'soft' : next.depth
  }
  if (/serif|magazine|literary/.test(lower)) {
    next.fontDisplay = 'Libre Baskerville'
    next.fontBody = 'Source Serif 4'
    next.scaleRatio = Math.max(next.scaleRatio, 1.333)
  }
  if (/mono|code|developer/.test(lower)) {
    next.fontMono = 'JetBrains Mono'
    next.fontBody = /mono|terminal/.test(lower) ? 'IBM Plex Sans' : next.fontBody
  }
  if (/warm|cream|terracotta|paper/.test(lower)) {
    next = setRole(next, 'background', '#f7f4ef')
    next = setRole(next, 'foreground', '#1c1917')
    next = setRole(next, 'muted', '#78716c')
    next = setRole(next, 'primary', '#c2410c')
    next = setRole(next, 'border', '#e7e5e4')
  }
  if (/dark|noir|midnight|obsidian/.test(lower) && !/warm|cream/.test(lower)) {
    next = setRole(next, 'background', '#0e0f12')
    next = setRole(next, 'foreground', '#f4f4f5')
    next = setRole(next, 'muted', '#8b8f98')
    next = setRole(next, 'border', '#26282e')
    if (!roleColor(next, 'primary') || /teal|cyan/.test(lower)) {
      next = setRole(next, 'primary', '#2dd4bf')
    }
  }
  if (/layered|elevated|depth/.test(lower)) {
    next.depth = 'layered'
  }
  if (/flat|hairline|minimal/.test(lower)) {
    next.depth = 'flat'
  }

  return next
}
