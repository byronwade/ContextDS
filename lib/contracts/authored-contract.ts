/**
 * Authored Design Contracts (Studio).
 *
 * Turns a hand-authored system definition into the same DESIGN.md grammar the
 * scanner produces, so contracts made in the Studio are interchangeable with
 * scanned ones: `npx github:byronwade/Design init` consumes either.
 */

import {
  generatePhilosophy,
  type DesignPhilosophy,
} from '@/lib/analyzers/design-philosophy'
import { isFontFamily } from '@/lib/analyzers/token-sanitizer'
import type {
  EngineAppType,
  EngineProfile,
} from '@/lib/analyzers/app-type'
import {
  buildDesignContractPackage,
  zipDesignContractPackage,
  type DesignContractPackage,
} from '@/lib/contracts/design-contract-package'
import type { DesignContractPackageInput } from '@/lib/contracts/design-contract-package'

export type StudioPackOptions = {
  profile?: EngineProfile
  appType?: EngineAppType
  confidence?: number
  driftKind?: string
  driftSummary?: string
  driftEvidence?: Record<string, unknown>
}

export type StudioColor = { id: string; role: string; value: string }

export type StudioSystem = {
  name: string
  slug: string
  philosophyNote: string
  colors: StudioColor[]
  fontDisplay: string
  fontBody: string
  fontMono: string
  baseSize: number
  scaleRatio: number
  scaleSteps: number
  spacingBase: 4 | 8
  spacingSteps: number
  radius: number
  depth: 'flat' | 'soft' | 'layered'
}

export const DEFAULT_STUDIO_SYSTEM: StudioSystem = {
  name: 'My design system',
  slug: 'my-design-system',
  philosophyNote: '',
  colors: [
    { id: 'background', role: 'background', value: '#0e0f12' },
    { id: 'foreground', role: 'foreground', value: '#f4f4f5' },
    { id: 'muted', role: 'muted', value: '#8b8f98' },
    { id: 'primary', role: 'primary', value: '#5eead4' },
    { id: 'border', role: 'border', value: '#26282e' },
  ],
  fontDisplay: 'Geist',
  fontBody: 'Geist',
  fontMono: 'Geist Mono',
  baseSize: 16,
  scaleRatio: 1.25,
  scaleSteps: 6,
  spacingBase: 8,
  spacingSteps: 8,
  radius: 12,
  depth: 'soft',
}

export function typeScale(system: StudioSystem): number[] {
  const sizes: number[] = []
  for (let step = 0; step < system.scaleSteps; step++) {
    sizes.push(Math.round(system.baseSize * system.scaleRatio ** step * 10) / 10)
  }
  return sizes
}

export function spacingScale(system: StudioSystem): number[] {
  const values: number[] = []
  for (let step = 1; step <= system.spacingSteps; step++) {
    values.push(system.spacingBase * step)
  }
  return values
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'design-system'
  )
}

/** Philosophy derived from the authored tokens — same engine as scanned sites. */
export function studioPhilosophy(system: StudioSystem): DesignPhilosophy {
  return generatePhilosophy({
    domain: system.name,
    curated: {
      colors: system.colors.map((color) => ({ name: color.role, value: color.value, usage: 1 })),
      typography: {
        families: [system.fontDisplay, system.fontBody, system.fontMono]
          .filter(Boolean)
          .map((family) => ({ value: family })),
        sizes: typeScale(system).map((size) => ({ value: `${size}px` })),
      },
      spacing: spacingScale(system).map((value) => ({ value: `${value}px` })),
      radius: [{ value: `${system.radius}px` }],
      shadows:
        system.depth === 'flat'
          ? []
          : system.depth === 'soft'
            ? [{ value: '0 1px 2px rgba(0,0,0,0.08)' }]
            : [
                { value: '0 1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)' },
                { value: '0 16px 48px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)' },
              ],
    },
    personality: system.philosophyNote || null,
  })
}

/**
 * Last line of defence before a family reaches a contract. An unresolved
 * var(--x) is not a typeface — an agent reading it would style nothing.
 */
function safeFamily(value: string, fallback: string): string {
  return isFontFamily(value ?? '') ? value : fallback
}

export function generateAuthoredDesignMd(system: StudioSystem): string {
  const philosophy = studioPhilosophy(system)
  const sizes = typeScale(system)
  const spaces = spacingScale(system)
  const lines: string[] = []

  lines.push('---')
  lines.push(`name: ${system.name}`)
  lines.push(`slug: ${system.slug}`)
  lines.push('source: designcontracts.sh studio')
  lines.push('profile: authored')
  lines.push('tokens:')
  lines.push('  color:')
  for (const color of system.colors) {
    lines.push(`    ${color.role}: "${color.value}"`)
  }
  lines.push('  typography:')
  lines.push(`    display: "${safeFamily(system.fontDisplay, 'Geist')}"`)
  lines.push(`    body: "${safeFamily(system.fontBody, 'Geist')}"`)
  lines.push(`    mono: "${safeFamily(system.fontMono, 'Geist Mono')}"`)
  lines.push(`    baseSize: ${system.baseSize}px`)
  lines.push(`    scale: ${system.scaleRatio}`)
  lines.push(`    sizes: [${sizes.map((size) => `${size}px`).join(', ')}]`)
  lines.push(`  spacing: [${spaces.map((value) => `${value}px`).join(', ')}]`)
  lines.push(`  radius: ${system.radius}px`)
  lines.push(`  depth: ${system.depth}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${system.name} — DESIGN.md`)
  lines.push('')
  lines.push(`> ${philosophy.statement}`)
  lines.push('')
  lines.push('## Philosophy')
  lines.push('')
  if (system.philosophyNote) {
    lines.push(system.philosophyNote)
    lines.push('')
  }
  for (const principle of philosophy.principles) {
    lines.push(`### ${principle.title}`)
    lines.push('')
    lines.push(principle.body)
    lines.push('')
  }
  lines.push('## Color')
  lines.push('')
  lines.push('| Role | Value |')
  lines.push('|------|-------|')
  for (const color of system.colors) {
    lines.push(`| ${color.role} | \`${color.value}\` |`)
  }
  lines.push('')
  lines.push('## Typography')
  lines.push('')
  lines.push(`- Display: **${system.fontDisplay}**`)
  lines.push(`- Body: **${system.fontBody}**`)
  lines.push(`- Mono: **${system.fontMono}**`)
  lines.push(
    `- Scale: ${system.baseSize}px base × ${system.scaleRatio} → ${sizes.map((size) => `${size}px`).join(' · ')}`
  )
  lines.push('')
  lines.push('## Spacing & shape')
  lines.push('')
  lines.push(`- Grid: ${system.spacingBase}px — ${spaces.map((value) => `${value}px`).join(' · ')}`)
  lines.push(`- Radius: ${system.radius}px on controls and surfaces`)
  lines.push(`- Depth: ${system.depth}`)
  lines.push('')
  lines.push('## Rules for agents')
  lines.push('')
  lines.push('- Use only the tokens above; never invent colors, sizes or spacing.')
  lines.push(`- Snap all margins/padding to the ${system.spacingBase}px grid.`)
  lines.push(`- Keep corner radii at ${system.radius}px — mixing corner languages breaks the system.`)
  lines.push('- Hierarchy comes from the type scale and weight, not new fonts.')
  lines.push('')
  return lines.join('\n')
}

/**
 * Map a Studio system into the pack builder input used by scanned contracts.
 * Emits a full installable façade (skills, config, REFERENCES, INSTALL, …).
 */
export function studioSystemToPackInput(
  system: StudioSystem,
  options: StudioPackOptions = {}
): DesignContractPackageInput {
  const philosophy = studioPhilosophy(system)
  const sizes = typeScale(system)
  const spaces = spacingScale(system)
  const slug = system.slug || slugify(system.name)
  // Use a dotted studio host without repeating "studio" in the pack slug.
  const domain = slug.endsWith('-studio') ? `${slug}.app` : `${slug}.studio`
  const url = `https://designcontracts.sh/studio/${slug}`
  const appType = options.appType ?? 'marketing-site'
  const profile =
    options.profile ??
    (appType === 'marketing-site' ? 'web-marketing' : 'web-app')

  const shadows =
    system.depth === 'flat'
      ? []
      : system.depth === 'soft'
        ? [{ value: '0 1px 2px rgba(0,0,0,0.08)', usage: 6 }]
        : [
            {
              value: '0 1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)',
              usage: 6,
            },
            {
              value: '0 16px 48px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
              usage: 4,
            },
          ]

  return {
    domain,
    url,
    profile,
    appType,
    confidence: options.confidence ?? 90,
    philosophy,
    brandAnalysis: {
      primaryColors: system.colors.map((color) => color.value),
      personality: system.philosophyNote || philosophy.statement,
    },
    curatedTokens: {
      colors: system.colors.map((color) => ({
        name: color.role,
        value: color.value,
        usage: 20,
        semantic: color.role,
      })),
      typography: {
        families: [
          {
            name: 'display',
            value: safeFamily(system.fontDisplay, 'Geist'),
            usage: 20,
          },
          {
            name: 'body',
            value: safeFamily(system.fontBody, 'Geist'),
            usage: 40,
          },
          {
            name: 'mono',
            value: safeFamily(system.fontMono, 'Geist Mono'),
            usage: 8,
          },
        ],
        sizes: sizes.map((size, index) => ({
          name: index === 0 ? 'body' : `step-${index}`,
          value: `${size}px`,
          usage: Math.max(4, 20 - index * 2),
        })),
        weights: [
          { name: 'regular', value: '400', usage: 40 },
          { name: 'semibold', value: '600', usage: 12 },
        ],
      },
      spacing: spaces.map((value) => ({ value: `${value}px`, usage: 12 })),
      radius: [
        { value: `${Math.max(0, system.radius - 4)}px`, usage: 8 },
        { value: `${system.radius}px`, usage: 20 },
      ],
      shadows,
      motion: [
        { value: '160ms', usage: 4 },
        { value: 'ease-out', usage: 4 },
      ],
    },
    aiProse: {
      distinctiveSignature: philosophy.statement,
      overview: system.philosophyNote || philosophy.statement,
      preferred: philosophy.principles.slice(0, 4).map((p) => p.title),
      dos: [
        'Use only the authored token scale',
        `Snap spacing to the ${system.spacingBase}px grid`,
        `Keep radius at ${system.radius}px`,
      ],
      donts: [
        'Do not invent brand colors',
        'Do not mix corner languages',
        'Do not add theatrical motion',
      ],
      motionGuidance: 'Prefer short feedback transitions; honor reduced motion.',
      typeVoice: philosophy.systems.type.voice,
    },
    driftObservations: [
      {
        surface: 'site',
        kind: options.driftKind || 'authored-studio',
        summary:
          options.driftSummary ||
          `Design Contract authored in Design Contracts Studio (${system.name}).`,
        observedAt: new Date().toISOString(),
        evidence: {
          slug,
          depth: system.depth,
          source: 'studio',
          appType,
          profile,
          ...(options.driftEvidence ?? {}),
        },
        suggestedAction:
          'Treat Studio tokens as the source of truth. Re-scan a live site later if you want CSS measurement.',
      },
    ],
  }
}

/** Build + zip a Studio Design Contract pack. */
export function buildStudioContractPack(
  system: StudioSystem,
  options: StudioPackOptions = {}
): {
  pack: DesignContractPackage
  zip: Uint8Array
  fileName: string
} {
  const input = studioSystemToPackInput(system, options)
  const pack = buildDesignContractPackage(input)
  // Prefer Studio-authored DESIGN.md prose while keeping the rest of the façade
  const authoredMd = generateAuthoredDesignMd(system)
  const files = pack.files.map((file) =>
    file.path === 'DESIGN.md' ? { ...file, content: authoredMd } : file
  )
  const withAuthored: DesignContractPackage = {
    ...pack,
    files,
    designMd: {
      ...pack.designMd,
      markdown: authoredMd,
    },
  }
  const zip = zipDesignContractPackage(withAuthored)
  return {
    pack: withAuthored,
    zip,
    fileName: `${system.slug || pack.slug}-design-contract.zip`,
  }
}
