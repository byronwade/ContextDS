/**
 * Structure × skin restyle → StudioSystem (+ pack options).
 *
 * Keeps layout DNA / archetypes from the structure domain; applies curated
 * tokens (and thus Studio roles) from the skin domain. Emits an installable
 * Design Contract via buildStudioContractPack.
 */

import { type AppTypeDetection, detectAppType } from '@/lib/analyzers/app-type'
import { type CuratedLike, generatePhilosophy } from '@/lib/analyzers/design-philosophy'
import {
  type StudioPackOptions,
  type StudioSystem,
  slugify,
} from '@/lib/contracts/authored-contract'
import { toStudioSystem, workingSystemFromScan } from '@/lib/design-system/working-system'

export type RestyleLayout = {
  containers?: { maxWidth?: string | null; strategy?: string }
  gridSystem?: string
  spacingBase?: number | null
  breakpoints?: number[]
  archetypes?: Array<{ type: string; confidence: number }>
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
}

export type RestyleResult = {
  name: string
  structureDomain: string
  skinDomain: string
  system: StudioSystem
  packOptions: StudioPackOptions
  appType: AppTypeDetection
  brief: string
  layout: RestyleLayout
}

export function restyleToStudioSystem(input: {
  structureDomain: string
  skinDomain: string
  layout: RestyleLayout
  skinCurated: CuratedLike
  name?: string
}): RestyleResult {
  const structureKey = input.structureDomain.trim().toLowerCase()
  const skinKey = input.skinDomain.trim().toLowerCase()
  if (!structureKey || !skinKey) {
    throw new Error('structureDomain and skinDomain are required')
  }
  if (!input.skinCurated?.colors?.length) {
    throw new Error('Skin domain has no curated color tokens')
  }

  const detection = detectAppType({
    archetypes: input.layout.archetypes,
    shell: input.layout.shell,
    density: input.layout.density,
    domain: structureKey,
  })

  const personality = generatePhilosophy({
    domain: skinKey,
    curated: input.skinCurated,
  }).statement

  const working = workingSystemFromScan({
    domain: skinKey,
    curatedTokens: input.skinCurated,
    personality,
  })

  const systemName = input.name?.trim() || `${structureKey} × ${skinKey}`

  const system: StudioSystem = {
    ...toStudioSystem(working),
    name: systemName,
    slug: slugify(systemName),
    philosophyNote: [`Structure from ${structureKey}; skin from ${skinKey}.`, personality]
      .filter(Boolean)
      .join(' ')
      .slice(0, 600),
  }

  // Prefer structure spacing grid when measured
  if (input.layout.spacingBase === 4 || input.layout.spacingBase === 8) {
    system.spacingBase = input.layout.spacingBase
  }

  const archetypes = (input.layout.archetypes ?? [])
    .slice(0, 6)
    .map((entry) => entry.type)
    .join(', ')

  const brief = [
    `# Rebuild: ${structureKey} structure × ${skinKey} skin`,
    '',
    `## Keep from ${structureKey} (structure)`,
    `- Container: ${input.layout.containers?.strategy ?? 'centered'}${
      input.layout.containers?.maxWidth ? ` @ ${input.layout.containers.maxWidth}` : ''
    }`,
    `- Layout engine: ${input.layout.gridSystem ?? 'flexbox'}`,
    `- Breakpoints: ${(input.layout.breakpoints ?? []).join('px, ')}${
      (input.layout.breakpoints ?? []).length ? 'px' : '—'
    }`,
    `- Page archetypes: ${archetypes || '—'}`,
    `- Engine profile: ${detection.profile} / ${detection.appType} (${Math.round(detection.confidence * 100)}%)`,
    '',
    '## Apply from ' + skinKey + ' (system)',
    `- Background ${role(system, 'background')} · Foreground ${role(system, 'foreground')} · Accent ${role(system, 'primary')}`,
    `- Type: ${system.fontDisplay} + ${system.fontBody}`,
    `- Spacing: ${system.spacingBase}px grid; Radius: ${system.radius}px; Depth: ${system.depth}`,
    '',
    '## Rules',
    `- Rebuild each ${structureKey} section with its existing archetype, restyled with the tokens above.`,
    `- Install with --profile ${detection.profile} --app-type ${detection.appType}.`,
    '- Verify text/surface pairings with contrast-fix before shipping.',
  ].join('\n')

  return {
    name: systemName,
    structureDomain: structureKey,
    skinDomain: skinKey,
    system,
    appType: detection,
    brief,
    layout: input.layout,
    packOptions: {
      profile: detection.profile,
      appType: detection.appType,
      confidence: Math.max(70, Math.round(detection.confidence * 100)),
      driftKind: 'structure-skin-restyle',
      driftSummary: `Restyle pack: ${structureKey} structure × ${skinKey} skin.`,
      driftEvidence: {
        structureDomain: structureKey,
        skinDomain: skinKey,
        archetypes: (input.layout.archetypes ?? []).slice(0, 8),
        reasons: detection.reasons,
      },
    },
  }
}

function role(system: StudioSystem, id: string): string {
  return system.colors.find((color) => color.role === id)?.value ?? '—'
}
