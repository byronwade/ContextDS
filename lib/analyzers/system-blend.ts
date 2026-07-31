/**
 * System blending — merge 2–10 scanned design systems into one coherent system.
 *
 * Deterministic, no model calls: neutrals merge into a single luminance ramp,
 * chromatic color is won by the hue families with the most cross-site support,
 * type/space/shape resolve by majority and median. Every choice carries
 * attribution back to the contributing domain.
 */

import {
  analyzeColors,
  analyzeShape,
  analyzeSpacing,
  analyzeTypography,
  generatePhilosophy,
  type CuratedLike,
  type DesignPhilosophy,
  type HueFamily,
  type ParsedColor,
  type TokenLike,
} from '@/lib/analyzers/design-philosophy'
import {
  generateAuthoredDesignMd,
  slugify,
  type StudioSystem,
} from '@/lib/contracts/authored-contract'
import { isFontFamily } from '@/lib/analyzers/token-sanitizer'

export type BlendSource = {
  domain: string
  curated: CuratedLike
}

export type BlendResult = {
  name: string
  slug: string
  sources: string[]
  system: StudioSystem
  designMd: string
  philosophy: DesignPhilosophy
  attribution: Record<string, string>
  palette: {
    neutrals: string[]
    chromatic: string[]
    accent: string | null
  }
}

const KNOWN_RATIOS = [1.2, 1.25, 1.333, 1.414, 1.618]

type Sourced<T> = { value: T; domain: string }

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** Merge neutrals from every source into one 8–10 step luminance ramp. */
function mergeNeutrals(
  perSite: Array<{ domain: string; colors: ParsedColor[] }>
): Array<Sourced<ParsedColor>> {
  const buckets = new Map<number, Array<Sourced<ParsedColor>>>()
  for (const site of perSite) {
    for (const color of site.colors) {
      const bucket = Math.min(9, Math.floor(color.luminance * 10))
      const list = buckets.get(bucket) ?? []
      list.push({ value: color, domain: site.domain })
      buckets.set(bucket, list)
    }
  }
  const ramp: Array<Sourced<ParsedColor>> = []
  for (let bucket = 9; bucket >= 0; bucket--) {
    const candidates = buckets.get(bucket)
    if (!candidates?.length) continue
    candidates.sort((a, b) => (b.value.usage ?? 0) - (a.value.usage ?? 0))
    ramp.push(candidates[0])
  }
  return ramp
}

/** Pick winning chromatic families by cross-site support, then usage. */
function mergeChromatic(
  perSite: Array<{ domain: string; colors: ParsedColor[] }>
): Array<Sourced<ParsedColor>> {
  const familySupport = new Map<
    HueFamily,
    { domains: Set<string>; candidates: Array<Sourced<ParsedColor>> }
  >()
  for (const site of perSite) {
    for (const color of site.colors) {
      const entry =
        familySupport.get(color.family) ?? { domains: new Set(), candidates: [] }
      entry.domains.add(site.domain)
      entry.candidates.push({ value: color, domain: site.domain })
      familySupport.set(color.family, entry)
    }
  }
  const rankedFamilies = Array.from(familySupport.entries()).sort(
    (a, b) =>
      b[1].domains.size - a[1].domains.size ||
      b[1].candidates.length - a[1].candidates.length
  )
  const picks: Array<Sourced<ParsedColor>> = []
  for (const [, entry] of rankedFamilies.slice(0, 4)) {
    entry.candidates.sort(
      (a, b) =>
        (b.value.usage ?? 0) - (a.value.usage ?? 0) || b.value.hsl.s - a.value.hsl.s
    )
    for (const candidate of entry.candidates.slice(0, 2)) {
      if (!picks.some((pick) => pick.value.hex === candidate.value.hex)) {
        picks.push(candidate)
      }
    }
  }
  return picks.slice(0, 8)
}

export function blendSystems(sources: BlendSource[], name?: string): BlendResult {
  if (sources.length < 2) {
    throw new Error('blendSystems needs at least 2 source systems')
  }
  const capped = sources.slice(0, 10)
  const attribution: Record<string, string> = {}

  // --- Color ---------------------------------------------------------------
  const colorPerSite = capped.map((source) => ({
    domain: source.domain,
    analysis: analyzeColors((source.curated.colors ?? []) as TokenLike[]),
  }))
  const neutrals = mergeNeutrals(
    colorPerSite.map((site) => ({ domain: site.domain, colors: site.analysis.neutrals }))
  )
  const chromatic = mergeChromatic(
    colorPerSite.map((site) => ({ domain: site.domain, colors: site.analysis.chromatic }))
  )
  const accent = chromatic[0] ?? null
  if (accent) attribution[`color.primary (${accent.value.hex})`] = accent.domain

  const darkLeaning =
    colorPerSite.filter((site) => site.analysis.polarity === 'dark-leaning').length >
    capped.length / 2
  const background = darkLeaning ? neutrals[neutrals.length - 1] : neutrals[0]
  const foreground = darkLeaning ? neutrals[0] : neutrals[neutrals.length - 1]
  const mid = neutrals[Math.floor(neutrals.length / 2)]
  if (background) attribution[`color.background (${background.value.hex})`] = background.domain
  if (foreground) attribution[`color.foreground (${foreground.value.hex})`] = foreground.domain

  // --- Typography ----------------------------------------------------------
  const typePerSite = capped.map((source) => ({
    domain: source.domain,
    analysis: analyzeTypography(source.curated.typography ?? {}),
  }))
  const fontVotes = new Map<string, { count: number; class: string; domain: string }>()
  for (const site of typePerSite) {
    for (const font of site.analysis.families) {
      // A scan can carry a family that never grounded to a real name
      // (var(--hds-font-family) and friends). It must not win a vote and end
      // up in a blended DESIGN.md as if it were a typeface.
      if (!isFontFamily(font.primary)) continue
      const entry = fontVotes.get(font.primary)
      if (entry) entry.count += 1
      else fontVotes.set(font.primary, { count: 1, class: font.class, domain: site.domain })
    }
  }
  const ranked = Array.from(fontVotes.entries()).sort((a, b) => b[1].count - a[1].count)
  const display =
    ranked.find(([, meta]) => meta.class === 'serif' || meta.class === 'display') ??
    ranked[0]
  const body = ranked.find(([font, meta]) => meta.class === 'sans' && font !== display?.[0]) ??
    ranked.find(([font]) => font !== display?.[0]) ??
    display
  const mono = ranked.find(([, meta]) => meta.class === 'mono')
  if (display) attribution[`font.display (${display[0]})`] = display[1].domain
  if (body) attribution[`font.body (${body[0]})`] = body[1].domain

  const ratios = typePerSite
    .map((site) => site.analysis.scaleRatio)
    .filter((ratio): ratio is number => ratio !== null)
  const medianRatio = median(ratios) ?? 1.25
  const scaleRatio = KNOWN_RATIOS.reduce((best, candidate) =>
    Math.abs(candidate - medianRatio) < Math.abs(best - medianRatio) ? candidate : best
  )

  // --- Space + shape -------------------------------------------------------
  const spacePerSite = capped.map((source) => ({
    domain: source.domain,
    analysis: analyzeSpacing((source.curated.spacing ?? []) as TokenLike[]),
  }))
  const baseVotes = spacePerSite.filter((site) => site.analysis.base === 8).length
  const spacingBase: 4 | 8 =
    baseVotes >= spacePerSite.filter((site) => site.analysis.base === 4).length ? 8 : 4
  const spacingWinner = spacePerSite.find((site) => site.analysis.base === spacingBase)
  if (spacingWinner) attribution[`spacing (${spacingBase}px grid)`] = spacingWinner.domain

  const shapePerSite = capped.map((source) => ({
    domain: source.domain,
    analysis: analyzeShape({
      radius: source.curated.radius,
      shadows: source.curated.shadows,
    }),
  }))
  const workhorses = shapePerSite
    .map((site) => ({
      domain: site.domain,
      radius: site.analysis.radiiPx.filter((r) => r > 0 && r < 40),
    }))
    .filter((site) => site.radius.length > 0)
    .map((site) => ({
      domain: site.domain,
      value: site.radius[Math.floor(site.radius.length / 2)],
    }))
  const radius = median(workhorses.map((entry) => entry.value)) ?? 8
  const radiusWinner = workhorses.find((entry) => entry.value === radius)
  if (radiusWinner) attribution[`radius (${radius}px)`] = radiusWinner.domain

  const depthOrder = ['flat', 'hairline', 'soft', 'layered'] as const
  const depths = shapePerSite.map((site) =>
    depthOrder.indexOf(site.analysis.depth as (typeof depthOrder)[number])
  )
  const depthIndex = median(depths) ?? 1
  const depth: StudioSystem['depth'] =
    depthIndex <= 0 ? 'flat' : depthIndex >= 3 ? 'layered' : 'soft'

  // --- Compose -------------------------------------------------------------
  const systemName = name?.trim() || `Blend of ${capped.map((s) => s.domain).join(' + ')}`
  const roleColors: StudioSystem['colors'] = []
  if (background) roleColors.push({ id: 'background', role: 'background', value: background.value.hex })
  if (foreground) roleColors.push({ id: 'foreground', role: 'foreground', value: foreground.value.hex })
  if (mid) roleColors.push({ id: 'muted', role: 'muted', value: mid.value.hex })
  if (accent) roleColors.push({ id: 'primary', role: 'primary', value: accent.value.hex })
  chromatic.slice(1, 4).forEach((pick, index) => {
    roleColors.push({ id: `accent-${index + 2}`, role: `accent-${index + 2}`, value: pick.value.hex })
    attribution[`color.accent-${index + 2} (${pick.value.hex})`] = pick.domain
  })

  const system: StudioSystem = {
    name: systemName,
    slug: slugify(systemName),
    philosophyNote: '',
    colors: roleColors.length >= 2 ? roleColors : [
      { id: 'background', role: 'background', value: '#141210' },
      { id: 'foreground', role: 'foreground', value: '#f4efe5' },
    ],
    fontDisplay: display?.[0] ?? 'Geist',
    fontBody: body?.[0] ?? 'Geist',
    fontMono: mono?.[0] ?? 'Geist Mono',
    baseSize: 16,
    scaleRatio,
    scaleSteps: 6,
    spacingBase,
    spacingSteps: 8,
    radius: Math.round(radius),
    depth,
  }

  const designMd = generateAuthoredDesignMd(system)
  const philosophy = generatePhilosophy({
    domain: systemName,
    curated: {
      colors: [...neutrals, ...chromatic].map((pick) => ({
        value: pick.value.hex,
        usage: pick.value.usage ?? 1,
      })),
      typography: {
        families: [system.fontDisplay, system.fontBody].map((value) => ({ value })),
      },
      spacing: Array.from({ length: 8 }, (_, i) => ({ value: `${spacingBase * (i + 1)}px` })),
      radius: [{ value: `${system.radius}px` }],
    },
  })

  return {
    name: systemName,
    slug: system.slug,
    sources: capped.map((source) => source.domain),
    system,
    designMd,
    philosophy,
    attribution,
    palette: {
      neutrals: neutrals.map((pick) => pick.value.hex),
      chromatic: chromatic.map((pick) => pick.value.hex),
      accent: accent?.value.hex ?? null,
    },
  }
}
