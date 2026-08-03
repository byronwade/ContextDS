/**
 * Generate a Design Contract DESIGN.md from extracted tokens + semantic graph
 * + design philosophy (+ optional AI director prose).
 *
 * Compatible with:
 * - Google Stitch DESIGN.md (YAML front matter + visual sections)
 * - byronwade/Design engine grammar (Product Grammar → Trust → References)
 *
 * Specs:
 * - https://github.com/google-labs-code/design.md
 * - https://github.com/byronwade/Design
 */

import { componentsYamlFromGraph, type SemanticGraph } from '@/lib/analyzers/semantic-graph'
import {
  type DesignPhilosophy,
  generatePhilosophy,
  type UxEvidence,
} from '@/lib/analyzers/design-philosophy'
import type { DesignMdProse } from '@/lib/ai/design-md-composer'

export type DesignMdInput = {
  domain: string
  url: string
  curatedTokens: {
    colors?: Array<{ name?: string; value: string; usage?: number; semantic?: string }>
    typography?: {
      families?: Array<{ name?: string; value: string; usage?: number }>
      sizes?: Array<{ name?: string; value: string; usage?: number }>
      weights?: Array<{ name?: string; value: string; usage?: number }>
      lineHeights?: Array<{ name?: string; value: string; usage?: number }>
    }
    spacing?: Array<{ name?: string; value: string; usage?: number }>
    radius?: Array<{ name?: string; value: string; usage?: number }>
    shadows?: Array<{ name?: string; value: string; usage?: number }>
    motion?: Array<{ name?: string; value: string; usage?: number }>
  }
  layoutDNA?: {
    containers?: {
      maxWidth?: string | null
      maxWidths?: string[]
      strategy?: string
      commonPadding?: string[]
    }
    breakpoints?: Array<number | string>
    gridSystem?: string
    spacingBase?: number | null
    archetypes?: Array<string | { type: string; confidence?: number }>
  } | null
  brandAnalysis?: {
    primaryColors?: string[]
    personality?: string
  } | null
  confidence?: number
  /** Linked token↔role↔component↔layout model for agents */
  semanticGraph?: SemanticGraph | null
  /** Measured heading styles from the render audit — ground truth for h1/h2 */
  headings?: {
    h1?: { family: string; size: number; weight: number } | null
    h2?: { family: string; size: number; weight: number } | null
    h3?: { family: string; size: number; weight: number } | null
  } | null
  /** Deterministic philosophy — preferred over bare brandAnalysis.personality */
  philosophy?: DesignPhilosophy | null
  /** Measured UX DNA from accurate browser scans */
  uxEvidence?: UxEvidence | null
  /** Optional AI-authored prose overlay (YAML stays analyzer-owned) */
  aiProse?: DesignMdProse | null
  /** Live computed component recipes from the browser audit */
  measuredComponents?: Record<string, MeasuredComponentRecipe | null> | null
}

export type MeasuredComponentRecipe = {
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  rounded?: string
  padding?: string
  fontSize?: string
  fontWeight?: string
  boxShadow?: string
  sampleCount?: number
}

export type DesignMdArtifact = {
  markdown: string
  fileName: string
  summary: {
    colorCount: number
    typographyCount: number
    spacingCount: number
    hasComponents: boolean
    hasMotion: boolean
    hasPhilosophy: boolean
    aiComposed: boolean
  }
}

function yamlEscape(value: string): string {
  if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

function slugToken(name: string, fallback: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || fallback
}

function pickColors(input: DesignMdInput, philosophy: DesignPhilosophy | null) {
  const colors = [...(input.curatedTokens.colors ?? [])]
  colors.sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))

  const brand = input.brandAnalysis?.primaryColors ?? []
  const map: Record<string, string> = {}
  const colorSys = philosophy?.systems.color

  if (colorSys?.lightest?.hex) map.bg = colorSys.lightest.hex
  if (colorSys?.darkest?.hex) map.fg = colorSys.darkest.hex
  if (colorSys?.accent?.hex) map.primary = colorSys.accent.hex

  if (brand[0] && !map.primary) map.primary = brand[0]
  if (brand[1]) map.secondary = brand[1]
  if (brand[2]) map.tertiary = brand[2]

  let i = 0
  for (const color of colors.slice(0, 16)) {
    const key =
      color.semantic?.replace(/\s+/g, '-').toLowerCase() ||
      slugToken(color.name || '', `color-${++i}`)
    if (!map[key]) map[key] = String(color.value)
    if (!map.primary) map.primary = String(color.value)
    else if (!map.secondary && String(color.value) !== map.primary)
      map.secondary = String(color.value)
    else if (
      !map.tertiary &&
      String(color.value) !== map.primary &&
      String(color.value) !== map.secondary
    ) {
      map.tertiary = String(color.value)
    }
  }

  // Prefer measured neutrals over invented Tailwind slate.
  if (!map.neutral) {
    const neutral =
      colorSys?.neutrals.sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))[0]?.hex ||
      (colorSys?.polarity === 'dark-leaning' ? colorSys.darkest?.hex : colorSys?.lightest?.hex)
    if (neutral) map.neutral = neutral
  }
  if (!map.bg && map.neutral) map.bg = map.neutral
  if (!map.fg && map.primary && colorSys?.polarity !== 'dark-leaning') {
    // keep primary as brand; fg already set from darkest when available
  }
  if (!map.primary && map.fg) map.primary = map.fg
  if (!map.primary) map.primary = '#0F172A'
  if (!map.neutral) map.neutral = map.bg || '#F8FAFC'
  if (!map.bg) map.bg = map.neutral

  return map
}

function toPx(value: string): number | null {
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/)
  if (!match) return null
  const n = parseFloat(match[1])
  if (!Number.isFinite(n)) return null
  return match[2] === 'rem' || match[2] === 'em' ? n * 16 : n
}

function pickLineHeight(
  input: DesignMdInput,
  forSizePx: number,
  role: 'display' | 'body' | 'label'
): number {
  const raw = input.curatedTokens.typography?.lineHeights ?? []
  const unitless = raw
    .map((token) => {
      const v = String(token.value).trim()
      const n = parseFloat(v)
      if (!Number.isFinite(n)) return null
      if (v.endsWith('px') && forSizePx > 0) return n / forSizePx
      if (n >= 1 && n <= 2.4) return n
      return null
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b)

  if (unitless.length > 0) {
    if (role === 'display') return unitless[0] ?? 1.15
    if (role === 'label') return unitless[Math.min(unitless.length - 1, 1)] ?? 1.25
    return unitless[Math.floor(unitless.length / 2)] ?? 1.5
  }
  return role === 'display' ? 1.15 : role === 'label' ? 1.3 : 1.5
}

function pickTypography(input: DesignMdInput) {
  const families = (input.curatedTokens.typography?.families ?? []).filter(
    (family) => !String(family.value).includes('var(')
  )
  const sized = (input.curatedTokens.typography?.sizes ?? [])
    .map((token) => ({ px: toPx(String(token.value)), usage: token.usage ?? 0 }))
    .filter((entry): entry is { px: number; usage: number } =>
      entry.px !== null && entry.px >= 9 && entry.px <= 120
    )
  const descending = Array.from(new Set(sized.map((entry) => entry.px))).sort((a, b) => b - a)

  const weights = (input.curatedTokens.typography?.weights ?? [])
    .map((token) => {
      const raw = String(token.value).toLowerCase()
      const n = raw === 'bold' ? 700 : raw === 'normal' ? 400 : parseInt(raw, 10)
      return Number.isFinite(n) ? { weight: n, usage: token.usage ?? 0 } : null
    })
    .filter((entry): entry is { weight: number; usage: number } => entry !== null)
  const headingWeight =
    weights.filter((entry) => entry.weight >= 500).sort((a, b) => b.usage - a.usage)[0]
      ?.weight ?? 700
  const bodyWeight =
    weights
      .filter((entry) => entry.weight >= 300 && entry.weight <= 500)
      .sort((a, b) => b.usage - a.usage)[0]?.weight ?? 400

  const bodyPx =
    sized
      .filter((entry) => entry.px >= 13 && entry.px <= 19)
      .sort((a, b) => b.usage - a.usage)[0]?.px ??
    sized.sort((a, b) => b.usage - a.usage)[0]?.px ??
    16
  const measured = input.headings ?? null
  const h1Px =
    measured?.h1?.size ?? descending.find((px) => px > bodyPx * 1.4) ?? bodyPx * 2.25
  const h2Px =
    measured?.h2?.size ??
    descending.find((px) => px < h1Px && px > bodyPx * 1.1) ??
    Math.round(h1Px * 0.66)
  const h3Px =
    measured?.h3?.size ??
    descending.find((px) => px < h2Px && px > bodyPx) ??
    Math.round((h2Px + bodyPx) / 2)
  const labelPx = descending.filter((px) => px < bodyPx).pop() ?? Math.round(bodyPx * 0.875)

  const primaryFamily =
    measured?.h1?.family || String(families[0]?.value || 'system-ui, sans-serif')
  const secondaryFamily = String(families[1]?.value || primaryFamily)

  const typography: Record<string, Record<string, string | number>> = {
    h1: {
      fontFamily: primaryFamily,
      fontSize: `${Math.round(h1Px)}px`,
      fontWeight: measured?.h1?.weight ?? headingWeight,
      lineHeight: pickLineHeight(input, h1Px, 'display'),
    },
    h2: {
      fontFamily: primaryFamily,
      fontSize: `${Math.round(h2Px)}px`,
      fontWeight: measured?.h2?.weight ?? headingWeight,
      lineHeight: pickLineHeight(input, h2Px, 'display'),
    },
    h3: {
      fontFamily: primaryFamily,
      fontSize: `${Math.round(h3Px)}px`,
      fontWeight: measured?.h3?.weight ?? headingWeight,
      lineHeight: pickLineHeight(input, h3Px, 'display'),
    },
    'body-md': {
      fontFamily: secondaryFamily,
      fontSize: `${Math.round(bodyPx)}px`,
      fontWeight: bodyWeight,
      lineHeight: pickLineHeight(input, bodyPx, 'body'),
    },
    label: {
      fontFamily: secondaryFamily,
      fontSize: `${Math.round(labelPx)}px`,
      fontWeight: 500,
      lineHeight: pickLineHeight(input, labelPx, 'label'),
    },
  }

  return typography
}

/** Ascending, deduped scale: xs is the smallest real value, xl the largest. */
function pickScale(
  items: Array<{ name?: string; value: string }> | undefined,
  keys: string[]
): Record<string, string> {
  const parsed = Array.from(
    new Set(
      (items ?? [])
        .map((item) => toPx(String(item.value)))
        .filter((px): px is number => px !== null && px >= 0 && px <= 400)
    )
  ).sort((a, b) => a - b)

  const scale: Record<string, string> = {}
  if (parsed.length === 0) {
    keys.forEach((key, index) => {
      scale[key] = `${4 * (index + 1)}px`
    })
    return scale
  }
  keys.forEach((key, index) => {
    const position =
      parsed.length === 1
        ? 0
        : Math.round((index / (keys.length - 1)) * (parsed.length - 1))
    scale[key] = `${parsed[position]}px`
  })
  return scale
}

function pickMotion(input: DesignMdInput): Record<string, string> {
  const motion = [...(input.curatedTokens.motion ?? [])]
  const durations: string[] = []
  const easings: string[] = []
  for (const token of motion) {
    const value = String(token.value).trim()
    if (/^\d*\.?\d+(ms|s)$/.test(value)) durations.push(value)
    else if (/^(cubic-bezier|ease|linear|steps)/.test(value)) easings.push(value)
  }
  const uniqueDurations = Array.from(new Set(durations)).slice(0, 4)
  const uniqueEasings = Array.from(new Set(easings)).slice(0, 3)
  const map: Record<string, string> = {}
  if (uniqueDurations[0]) map.fast = uniqueDurations[0]
  if (uniqueDurations[1]) map.base = uniqueDurations[1]
  else if (uniqueDurations[0]) map.base = uniqueDurations[0]
  if (uniqueDurations[2]) map.slow = uniqueDurations[2]
  if (uniqueEasings[0]) map.easing = uniqueEasings[0]
  return map
}

function resolvePhilosophy(input: DesignMdInput): DesignPhilosophy {
  if (input.philosophy) return input.philosophy
  return generatePhilosophy({
    domain: input.domain,
    curated: input.curatedTokens,
    personality: input.brandAnalysis?.personality,
    primaryFont: input.curatedTokens.typography?.families?.[0]?.value
      ? String(input.curatedTokens.typography.families[0].value)
      : null,
    ux: input.uxEvidence ?? null,
  })
}

function shellSummary(ux: UxEvidence | null | undefined): string | null {
  if (!ux?.shell) return null
  const parts: string[] = []
  if (ux.shell.header) {
    parts.push(
      `${ux.shell.header.height}px ${ux.shell.header.sticky ? 'sticky' : 'static'} header`
    )
  }
  if (ux.shell.sidebar) {
    parts.push(
      `${ux.shell.sidebar.width}px ${ux.shell.sidebar.fixed ? 'fixed' : 'static'} sidebar`
    )
  }
  if (ux.shell.footer) parts.push(`${ux.shell.footer.height}px footer`)
  return parts.length ? parts.join(', ') : null
}

function densityPhrase(ux: UxEvidence | null | undefined): string | null {
  if (!ux?.density) return null
  const { elementsInViewport, imageAreaRatio } = ux.density
  if (elementsInViewport > 420) return 'dense operational surface'
  if (elementsInViewport < 180) return 'spacious editorial surface'
  if (imageAreaRatio >= 0.35) return 'image-led marketing surface'
  return 'balanced information density'
}

export function generateDesignMd(input: DesignMdInput): DesignMdArtifact {
  const philosophy = resolvePhilosophy(input)
  const ai = input.aiProse ?? null
  const colors = pickColors(input, philosophy)
  const typography = pickTypography(input)
  const rounded = pickScale(input.curatedTokens.radius, ['sm', 'md', 'lg', 'full'])
  const spacing = pickScale(input.curatedTokens.spacing, ['xs', 'sm', 'md', 'lg', 'xl'])
  const motion = pickMotion(input)
  const shadow = input.curatedTokens.shadows?.[0]?.value
  const shadows = (input.curatedTokens.shadows ?? []).slice(0, 4)
  const firstArchetype = input.layoutDNA?.archetypes?.[0]
  const archetype =
    typeof firstArchetype === 'string'
      ? firstArchetype
      : firstArchetype?.type || input.layoutDNA?.gridSystem || 'marketing site'
  const spacingBase =
    philosophy.systems.space.base || input.layoutDNA?.spacingBase || 8
  const breakpointLabels = (input.layoutDNA?.breakpoints ?? [])
    .slice(0, 6)
    .map((value) => (typeof value === 'number' ? `${value}px` : String(value)))
  const containerWidths =
    input.layoutDNA?.containers?.maxWidths ??
    (input.layoutDNA?.containers?.maxWidth ? [input.layoutDNA.containers.maxWidth] : [])
  const signature =
    ai?.distinctiveSignature ||
    `${philosophy.traits.slice(0, 4).join(', ')}; archetype ${archetype}`
  const overview =
    ai?.overview ||
    [
      philosophy.statement,
      `YAML tokens are normative. Agents uphold this grammar via resolve → check → verify (extraction confidence ${Math.round(input.confidence ?? 0)}%).`,
    ].join(' ')

  const frontMatterLines: string[] = [
    '---',
    'version: alpha',
    `name: ${yamlEscape(input.domain)}`,
    `description: ${yamlEscape(
      `Design contract reconstructed from ${input.url} — ${philosophy.traits.slice(0, 3).join(', ')}`
    )}`,
    'colors:',
  ]

  for (const [key, value] of Object.entries(colors)) {
    frontMatterLines.push(`  ${key}: ${yamlEscape(value)}`)
  }

  frontMatterLines.push('typography:')
  for (const [key, style] of Object.entries(typography)) {
    frontMatterLines.push(`  ${key}:`)
    for (const [prop, val] of Object.entries(style)) {
      frontMatterLines.push(
        `    ${prop}: ${typeof val === 'number' ? val : yamlEscape(String(val))}`
      )
    }
  }

  frontMatterLines.push('rounded:')
  for (const [key, value] of Object.entries(rounded)) {
    frontMatterLines.push(`  ${key}: ${yamlEscape(value)}`)
  }

  frontMatterLines.push('spacing:')
  for (const [key, value] of Object.entries(spacing)) {
    frontMatterLines.push(`  ${key}: ${yamlEscape(value)}`)
  }

  if (Object.keys(motion).length > 0) {
    frontMatterLines.push('motion:')
    for (const [key, value] of Object.entries(motion)) {
      frontMatterLines.push(`  ${key}: ${yamlEscape(value)}`)
    }
  }

  const measuredYaml = componentsYamlFromMeasured(input.measuredComponents)
  if (measuredYaml.length > 1) {
    frontMatterLines.push(...measuredYaml)
  } else if (input.semanticGraph) {
    frontMatterLines.push(...componentsYamlFromGraph(input.semanticGraph))
  } else {
    frontMatterLines.push(...componentsYamlFromEvidence(colors, spacing, rounded))
  }
  frontMatterLines.push('---')

  const colorBullets = Object.entries(colors)
    .slice(0, 10)
    .map(([key, value]) => `- **${key} (${value}):** ${describeColorRole(key, philosophy)}.`)
    .join('\n')

  const preferred =
    ai?.preferred ??
    [
      `Prefer \`${typography.h1.fontFamily}\` for headlines and \`${typography['body-md'].fontFamily}\` for body — ${philosophy.systems.type.voice}.`,
      `Prefer a ~${spacingBase}px spacing rhythm (${philosophy.systems.space.gridFit}% of observed values conform).`,
      `Prefer ${philosophy.systems.shape.character} corners; elevation stays ${philosophy.systems.shape.depth}.`,
      'Prefer scarce accent usage — primary for commitment and focus, not decoration.',
      densityPhrase(input.uxEvidence)
        ? `Prefer the measured ${densityPhrase(input.uxEvidence)} — do not suddenly densify or empty the page.`
        : 'Prefer open layouts; use `surface-card` only when interaction needs a container.',
    ].filter(Boolean) as string[]

  const dos =
    ai?.dos ??
    [
      `Use only colors defined in the YAML front matter — never invent new brand hues.`,
      `Keep the spacing rhythm near a ${spacingBase}px base.`,
      `Map primary CTAs to \`button-primary\` (background \`{colors.primary}\`).`,
      ...philosophy.principles.slice(0, 2).map((p) => `${p.title}: ${p.body}`),
    ]

  const donts =
    ai?.donts ??
    [
      `Do not introduce Inter/Roboto/Arial if a site font family is defined above.`,
      `Do not mix more than ${Math.min(Object.keys(colors).length, 6)} brand colors on one screen.`,
      `Do not invent border-radius values outside the rounded scale.`,
      philosophy.systems.color.accent
        ? `Do not flood large surfaces with the accent (${philosophy.systems.color.accent.hex}) — keep it scarce.`
        : 'Do not invent a loud accent the site does not use.',
      philosophy.systems.motion.tempo === 'instant'
        ? 'Do not add theatrical page transitions — motion is feedback, not theater.'
        : 'Do not invent springy or bouncing motion the site never uses.',
    ]

  const motionSection =
    ai?.motionGuidance ||
    (philosophy.systems.motion.tempo
      ? [
          `Motion tempo is **${philosophy.systems.motion.tempo}**.`,
          Object.keys(motion).length
            ? `Use YAML motion tokens (${Object.entries(motion)
                .map(([k, v]) => `${k}=${v}`)
                .join(', ')}).`
            : 'Durations were sparse in CSS — keep transitions under 250ms unless evidence says otherwise.',
          input.uxEvidence?.interaction?.effects?.length
            ? `Hover/focus feedback observed via: ${input.uxEvidence.interaction.effects
                .slice(0, 5)
                .map((e) => e.value)
                .join('; ')}.`
            : '',
          'Honor `prefers-reduced-motion`: opacity/color shifts only, no large transforms.',
        ]
          .filter(Boolean)
          .join(' ')
      : 'No strong motion system detected — prefer instant state changes and respect reduced motion.')

  const typeSection =
    ai?.typeVoice ||
    [
      `- **Headlines:** ${typography.h1.fontFamily} at ${typography.h1.fontSize} / weight ${typography.h1.fontWeight} / lh ${typography.h1.lineHeight}`,
      `- **Subheads:** ${typography.h2.fontFamily} at ${typography.h2.fontSize} / weight ${typography.h2.fontWeight}`,
      `- **Body:** ${typography['body-md'].fontFamily} at ${typography['body-md'].fontSize} / lh ${typography['body-md'].lineHeight}`,
      `- **Labels:** ${typography.label.fontFamily} at ${typography.label.fontSize}`,
      philosophy.systems.type.scaleLabel
        ? `- **Scale:** ${philosophy.systems.type.scaleLabel}${
            philosophy.systems.type.scaleRatio
              ? ` (~${philosophy.systems.type.scaleRatio.toFixed(2)}×)`
              : ''
          }`
        : '',
      `- **Voice:** ${philosophy.systems.type.voice}`,
    ]
      .filter(Boolean)
      .join('\n')

  const shell = shellSummary(input.uxEvidence)

  const body = [
    '',
    '## Overview',
    '',
    overview,
    '',
    '## Product Grammar',
    '',
    `- **Name:** ${input.domain}`,
    `- **Source:** ${input.url}`,
    `- **Primary people:** builders and agents implementing UI that must match this product`,
    `- **Primary objects:** pages, components, tokens, and flows derived from the live site`,
    `- **Distinctive signature:** ${signature}`,
    `- **Philosophy:** ${philosophy.title}`,
    `- **Traits:** ${philosophy.traits.join(', ')}`,
    '- **Not copying:** pixel-perfect chrome, copyrighted illustrations, or product marketing copy',
    '',
    '## Design Principles',
    '',
    ...philosophy.principles.map((p) => `- **${p.title}:** ${p.body}`),
    '',
    '## Invariant Guidance',
    '',
    '- YAML color, type, spacing, radius, and motion tokens must not be invented at call sites.',
    '- A region has at most one primary action (`button-primary`).',
    '- Semantic tokens beat raw hex/rgb/px utilities unless an accepted exception exists.',
    '- Accessibility, focus visibility, and consequence naming are part of the design definition.',
    '- Do not edit `.design/generated/`; change this file and re-resolve.',
    '',
    '## Preferred Guidance',
    '',
    ...preferred.map((line) => (line.startsWith('-') ? line : `- ${line}`)),
    '',
    '## Open Guidance',
    '',
    '- Local composition may be invented when the task is new and invariants remain true.',
    '- Preferred guidance may change with a recorded reason for density, risk, or audience shifts.',
    '- New components or tokens may be proposed when existing mappings cannot represent the intent.',
    '- Screenshots under `design/references/` may influence mood and structure after provenance is recorded.',
    '',
    '## Targets and Sources',
    '',
    'Default browser target is `web-marketing` for scanned public sites; switch to `web-app` when installing into an operational product. Responsive web on a phone remains a web target.',
    '',
    'Semantic token authority lives in this file. Production component authority lives in the consuming product and mappings recorded here. Generated packets under `.design/generated/` are scoped context, not editable source.',
    '',
    '## Tokens and Component Sources',
    '',
    'Use the color, type, spacing, radius, motion, and component roles in the front matter as semantic values. Component libraries may provide accessible behavior, but every used component must be restyled by this grammar.',
    '',
    'Allowed component-source states: **none**, **custom**, or **shadcn reference** (behavior/naming only — never a required package identity).',
    '',
    input.semanticGraph
      ? [
          '## Semantic System Graph',
          '',
          `This contract includes a linked model of how the UI system works (${input.semanticGraph.summary.nodeCount} nodes, ${input.semanticGraph.summary.edgeCount} edges).`,
          'Read `design/graph.json` (canonical) and `design/GRAPH.md` (narrative) before inventing mappings.',
          '',
          `- Tokens: ${input.semanticGraph.summary.tokenCount}`,
          `- Roles: ${input.semanticGraph.summary.roleCount}`,
          `- Components: ${input.semanticGraph.summary.componentCount}`,
          `- Layout nodes: ${input.semanticGraph.summary.layoutCount}`,
          `- Patterns: ${input.semanticGraph.summary.patternCount}`,
          '',
          'Traverse edges instead of guessing: `FILLS_ROLE` (token→role), `USES_TOKEN` (component→token), `IMPLEMENTS_ROLE` (component→role), `LOCATED_IN` / `APPEARS_IN` (placement).',
          '',
        ].join('\n')
      : '',
    '## Layout and Navigation',
    '',
    breakpointLabels.length
      ? `Observed breakpoints: ${breakpointLabels.join(', ')}.`
      : 'Follow a mobile-first 640 / 768 / 1024 / 1280 scale unless product rules say otherwise.',
    containerWidths.length
      ? `Container max widths seen: ${containerWidths.slice(0, 4).join(', ')}.`
      : 'Keep content measure readable; avoid full-bleed text columns.',
    shell ? `App shell: ${shell}.` : '',
    densityPhrase(input.uxEvidence)
      ? `Density: ${densityPhrase(input.uxEvidence)}.`
      : '',
    'Responsive behavior changes representation and priority before content becomes cramped.',
    '',
    '## States and Interaction',
    '',
    motionSection,
    '',
    'Every meaningful surface accounts for default, loading, empty, error, disabled, focus-visible, hover, selected, dirty, saving, and recovery states when applicable. State changes preserve valid work and name what happened.',
    '',
    '## Accessibility',
    '',
    philosophy.systems.color.accent && philosophy.systems.color.lightest
      ? `Core accent ${philosophy.systems.color.accent.hex} on light surfaces must clear WCAG AA for text/UI. Verify pairings before shipping.`
      : 'Keyboard path, semantic roles, accessible names, visible focus, contrast, zoom/scaling, reduced motion, and non-pointer alternatives are part of the design definition.',
    'Keyboard path, semantic roles, accessible names, visible focus, contrast, zoom/scaling, reduced motion, and non-pointer alternatives are part of the design definition.',
    '',
    '## Content and Terminology',
    '',
    'Use sentence case, specific nouns, and verb-first action labels. Errors and destructive actions name the object, consequence, retained state, and recovery path.',
    '',
    '## Trust and Acceptance',
    '',
    'Acceptance requires a design receipt from `design verify --mode release` with source revision, contract fingerprint, checked rules, rendered surfaces, warnings, and exceptions. Scan-derived observations may provide drift evidence but never replace this file automatically.',
    '',
    '## References',
    '',
    'Approved references live under `design/references/` and may include screenshots, golden states, and pattern notes. Register why each reference matters, what to preserve, and what not to copy. See `design/references/manifest.json` when present. A project may start with zero references.',
    '',
    '## Colors',
    '',
    `Palette ranked by observed CSS usage, render evidence, and color science (${philosophy.systems.color.polarity}, ${philosophy.systems.color.temperature}).`,
    '',
    colorBullets,
    '',
    '## Typography',
    '',
    typeSection,
    '',
    '## Layout',
    '',
    `- Spacing scale: ${Object.entries(spacing)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
    `- Inferred spacing base: ${spacingBase}px (${philosophy.systems.space.gridFit}% grid fit)`,
    '',
    '## Elevation & Depth',
    '',
    shadows.length > 0
      ? [
          `Depth character: **${philosophy.systems.shape.depth}**.`,
          ...shadows.map(
            (token, index) =>
              `- **elev-${index + 1}:** \`${token.value}\`${token.name ? ` (${token.name})` : ''}`
          ),
          'Use the softest elevation that still separates the surface — never stack decorative shadows.',
        ].join('\n')
      : `Depth character: **${philosophy.systems.shape.depth}**. No strong shadow system detected — prefer borders and tonal surfaces over heavy drop shadows.`,
    '',
    '## Shapes',
    '',
    `Corner scale: ${Object.entries(rounded)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}. Character: **${philosophy.systems.shape.character}**.`,
    'Keep interactive controls on `rounded.md` unless the control is a pill/chip intentionally using `rounded.full`.',
    '',
    '## Motion',
    '',
    motionSection,
    '',
    '## Components',
    '',
    measuredYaml.length > 1
      ? 'Component recipes in YAML were **measured from live computed styles** (majority clusters of buttons, inputs, cards). Treat them as normative — do not invent a parallel control system.'
      : input.semanticGraph
        ? 'Prefer component recipes emitted in the YAML front matter and linked in `design/graph.json`. Do not invent parallel button/card systems.'
        : [
            '- `button-primary` — primary actions and CTAs',
            '- `button-secondary` — secondary/supporting actions',
            '- `surface-card` — content grouping only when interaction needs a container; prefer open layouts otherwise',
          ].join('\n'),
    '',
    "## Do's and Don'ts",
    '',
    '**Do:**',
    ...dos.map((line) => (line.startsWith('-') ? line : `- ${line}`)),
    '- Run `design resolve`, `design check`, and `design verify` after material UI changes.',
    '',
    "**Don't:**",
    ...donts.map((line) => (line.startsWith('-') ? line : `- ${line}`)),
    '- Do not require a component package unless the project declares it.',
    '- Do not treat scan output as permission to skip receipts.',
    '',
    '---',
    '',
    `_Generated by Design Contracts from ${input.url}${
      ai ? ' with design-director AI prose' : ' with deterministic design philosophy'
    }. Install with \`npx --yes github:byronwade/Design init\` so agents uphold this grammar over time._`,
    '',
  ]
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n')

  return {
    markdown: `${frontMatterLines.join('\n')}${body}`,
    fileName: 'DESIGN.md',
    summary: {
      colorCount: Object.keys(colors).length,
      typographyCount: Object.keys(typography).length,
      spacingCount: Object.keys(spacing).length,
      hasComponents: true,
      hasMotion: Object.keys(motion).length > 0,
      hasPhilosophy: true,
      aiComposed: Boolean(ai),
    },
  }
}

function componentsYamlFromMeasured(
  measured: DesignMdInput['measuredComponents']
): string[] {
  if (!measured) return []
  const entries = Object.entries(measured).filter(
    (entry): entry is [string, MeasuredComponentRecipe] => Boolean(entry[1])
  )
  if (entries.length === 0) return []

  const lines: string[] = ['components:']
  for (const [key, recipe] of entries) {
    lines.push(`  ${slugToken(key, key)}:`)
    if (recipe.backgroundColor) {
      lines.push(`    backgroundColor: ${yamlEscape(recipe.backgroundColor)}`)
    }
    if (recipe.textColor) {
      lines.push(`    textColor: ${yamlEscape(recipe.textColor)}`)
    }
    if (recipe.borderColor) {
      lines.push(`    borderColor: ${yamlEscape(recipe.borderColor)}`)
    }
    if (recipe.rounded) {
      lines.push(`    rounded: ${yamlEscape(recipe.rounded)}`)
    }
    if (recipe.padding) {
      lines.push(`    padding: ${yamlEscape(recipe.padding)}`)
    }
    if (recipe.fontSize) {
      lines.push(`    fontSize: ${yamlEscape(recipe.fontSize)}`)
    }
    if (recipe.fontWeight) {
      lines.push(`    fontWeight: ${yamlEscape(String(recipe.fontWeight))}`)
    }
    if (recipe.boxShadow) {
      lines.push(`    boxShadow: ${yamlEscape(recipe.boxShadow)}`)
    }
  }
  return lines
}

function componentsYamlFromEvidence(
  colors: Record<string, string>,
  spacing: Record<string, string>,
  rounded: Record<string, string>
): string[] {
  const lines: string[] = ['components:']
  const pad = spacing.sm || spacing.md || '8px'
  const cardPad = spacing.md || spacing.lg || '16px'
  const controlRadius = rounded.md || rounded.sm || '8px'
  const surfaceRadius = rounded.lg || controlRadius
  const primaryFg =
    colors.bg && colors.bg !== colors.primary ? colors.bg : colors.neutral || '#FFFFFF'
  const surfaceFg = colors.fg || colors.primary || '#0A0A0A'

  lines.push('  button-primary:')
  lines.push(`    backgroundColor: ${yamlEscape(colors.primary || '#0F172A')}`)
  lines.push(`    textColor: ${yamlEscape(primaryFg)}`)
  lines.push(`    rounded: ${yamlEscape(controlRadius)}`)
  lines.push(`    padding: ${yamlEscape(pad)}`)
  lines.push('  button-secondary:')
  lines.push(
    `    backgroundColor: ${yamlEscape(colors.secondary || colors.neutral || '#F8FAFC')}`
  )
  lines.push(`    textColor: ${yamlEscape(colors.fg || colors.primary || '#0A0A0A')}`)
  lines.push(`    rounded: ${yamlEscape(controlRadius)}`)
  lines.push(`    padding: ${yamlEscape(pad)}`)
  lines.push('  surface-card:')
  lines.push(
    `    backgroundColor: ${yamlEscape(colors.neutral || colors.bg || '#F8FAFC')}`
  )
  lines.push(`    textColor: ${yamlEscape(surfaceFg)}`)
  lines.push(`    rounded: ${yamlEscape(surfaceRadius)}`)
  lines.push(`    padding: ${yamlEscape(cardPad)}`)
  return lines
}

function describeColorRole(key: string, philosophy: DesignPhilosophy): string {
  switch (key) {
    case 'primary':
      return philosophy.systems.color.accent
        ? `brand accent / primary CTAs (${philosophy.systems.color.temperature} accent family)`
        : 'headlines, primary CTAs, and core brand marks'
    case 'secondary':
      return 'supporting text, borders, and secondary actions'
    case 'tertiary':
      return 'accent interaction accents and highlights'
    case 'neutral':
      return 'quiet surfaces and structural fills'
    case 'bg':
      return 'page / canvas background'
    case 'fg':
      return 'primary ink / readable body text'
    default:
      return 'supporting UI accents matching observed usage'
  }
}
