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
  lines.push(`    display: "${system.fontDisplay}"`)
  lines.push(`    body: "${system.fontBody}"`)
  lines.push(`    mono: "${system.fontMono}"`)
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
