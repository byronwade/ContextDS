/**
 * Generate a Design Contract DESIGN.md from extracted tokens + semantic graph.
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

export type DesignMdInput = {
  domain: string
  url: string
  curatedTokens: {
    colors?: Array<{ name?: string; value: string; usage?: number; semantic?: string }>
    typography?: {
      families?: Array<{ name?: string; value: string; usage?: number }>
      sizes?: Array<{ name?: string; value: string; usage?: number }>
      weights?: Array<{ name?: string; value: string; usage?: number }>
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
}

export type DesignMdArtifact = {
  markdown: string
  fileName: string
  summary: {
    colorCount: number
    typographyCount: number
    spacingCount: number
    hasComponents: boolean
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

function pickColors(input: DesignMdInput) {
  const colors = [...(input.curatedTokens.colors ?? [])]
  colors.sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))

  const brand = input.brandAnalysis?.primaryColors ?? []
  const map: Record<string, string> = {}

  if (brand[0]) map.primary = brand[0]
  if (brand[1]) map.secondary = brand[1]
  if (brand[2]) map.tertiary = brand[2]

  let i = 0
  for (const color of colors.slice(0, 12)) {
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

  if (!map.neutral) map.neutral = '#F8FAFC'
  if (!map.primary) map.primary = '#0F172A'

  return map
}

function toPx(value: string): number | null {
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/)
  if (!match) return null
  const n = parseFloat(match[1])
  if (!Number.isFinite(n)) return null
  return match[2] === 'rem' || match[2] === 'em' ? n * 16 : n
}

function pickTypography(input: DesignMdInput) {
  const families = (input.curatedTokens.typography?.families ?? []).filter(
    (family) => !String(family.value).includes('var(')
  )
  // Ground sizes in real, parsable lengths; keep usage for body selection.
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

  // Body = the most-USED size in the readable range; headings = the LARGEST
  // real sizes (measured headings from the render audit win when present).
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
  const labelPx = descending.filter((px) => px < bodyPx).pop() ?? Math.round(bodyPx * 0.875)

  const primaryFamily =
    measured?.h1?.family || String(families[0]?.value || 'system-ui, sans-serif')
  const secondaryFamily = String(families[1]?.value || primaryFamily)

  const typography: Record<string, Record<string, string | number>> = {
    h1: {
      fontFamily: primaryFamily,
      fontSize: `${Math.round(h1Px)}px`,
      fontWeight: measured?.h1?.weight ?? headingWeight,
    },
    h2: {
      fontFamily: primaryFamily,
      fontSize: `${Math.round(h2Px)}px`,
      fontWeight: measured?.h2?.weight ?? headingWeight,
    },
    'body-md': {
      fontFamily: secondaryFamily,
      fontSize: `${Math.round(bodyPx)}px`,
      fontWeight: bodyWeight,
    },
    label: {
      fontFamily: secondaryFamily,
      fontSize: `${Math.round(labelPx)}px`,
      fontWeight: 500,
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
  // Spread the keys across the sorted range so labels match magnitude.
  keys.forEach((key, index) => {
    const position =
      parsed.length === 1
        ? 0
        : Math.round((index / (keys.length - 1)) * (parsed.length - 1))
    scale[key] = `${parsed[position]}px`
  })
  return scale
}

export function generateDesignMd(input: DesignMdInput): DesignMdArtifact {
  const colors = pickColors(input)
  const typography = pickTypography(input)
  const rounded = pickScale(input.curatedTokens.radius, ['sm', 'md', 'lg', 'full'])
  const spacing = pickScale(input.curatedTokens.spacing, ['xs', 'sm', 'md', 'lg', 'xl'])
  const shadow = input.curatedTokens.shadows?.[0]?.value
  const firstArchetype = input.layoutDNA?.archetypes?.[0]
  const archetype =
    typeof firstArchetype === 'string'
      ? firstArchetype
      : firstArchetype?.type || input.layoutDNA?.gridSystem || 'marketing site'
  const spacingBase = input.layoutDNA?.spacingBase || 8
  const breakpointLabels = (input.layoutDNA?.breakpoints ?? [])
    .slice(0, 6)
    .map((value) => (typeof value === 'number' ? `${value}px` : String(value)))
  const containerWidths =
    input.layoutDNA?.containers?.maxWidths ??
    (input.layoutDNA?.containers?.maxWidth ? [input.layoutDNA.containers.maxWidth] : [])
  const personality = input.brandAnalysis?.personality || 'extracted from live CSS'

  const frontMatterLines: string[] = [
    '---',
    'version: alpha',
    `name: ${yamlEscape(input.domain)}`,
    `description: ${yamlEscape(`Design contract extracted from ${input.url} by Design Contracts`)}`,
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

  if (input.semanticGraph) {
    frontMatterLines.push(...componentsYamlFromGraph(input.semanticGraph))
  } else {
    frontMatterLines.push('components:')
    frontMatterLines.push('  button-primary:')
    frontMatterLines.push('    backgroundColor: "{colors.primary}"')
    frontMatterLines.push('    textColor: "{colors.neutral}"')
    frontMatterLines.push('    rounded: "{rounded.md}"')
    frontMatterLines.push(`    padding: ${yamlEscape(spacing.sm)}`)
    frontMatterLines.push('  button-secondary:')
    frontMatterLines.push('    backgroundColor: "{colors.secondary}"')
    frontMatterLines.push('    textColor: "{colors.neutral}"')
    frontMatterLines.push('    rounded: "{rounded.md}"')
    frontMatterLines.push(`    padding: ${yamlEscape(spacing.sm)}`)
    frontMatterLines.push('  surface-card:')
    frontMatterLines.push('    backgroundColor: "{colors.neutral}"')
    frontMatterLines.push('    textColor: "{colors.primary}"')
    frontMatterLines.push('    rounded: "{rounded.lg}"')
    frontMatterLines.push(`    padding: ${yamlEscape(spacing.md)}`)
  }
  frontMatterLines.push('---')

  const colorBullets = Object.entries(colors)
    .slice(0, 8)
    .map(([key, value]) => `- **${key} (${value}):** Use for ${describeColorRole(key)}.`)
    .join('\n')

  const dos = [
    `- Use only colors defined in the YAML front matter — never invent new brand hues.`,
    `- Keep the spacing rhythm near a ${spacingBase}px base (extracted spacing scale).`,
    `- Prefer \`${typography.h1.fontFamily}\` for headlines and \`${typography['body-md'].fontFamily}\` for body.`,
    `- Map primary CTAs to \`button-primary\` (background \`{colors.primary}\`).`,
  ]

  const donts = [
    `- Do not introduce Inter/Roboto/Arial if a site font family is defined above.`,
    `- Do not mix more than ${Math.min(Object.keys(colors).length, 6)} brand colors on one screen.`,
    `- Do not invent border-radius values outside the rounded scale.`,
    `- Do not place large surfaces in accent/tertiary colors reserved for interaction.`,
  ]

  const body = [
    '',
    '## Overview',
    '',
    `Design contract reconstructed from **${input.domain}** (${archetype}).`,
    `Personality signal: ${personality}. Extraction confidence ${Math.round(input.confidence ?? 0)}%.`,
    'YAML tokens are normative. Prose is application guidance for agents and the Design Contract engine (`resolve` → `check` → `verify`).',
    '',
    '## Product Grammar',
    '',
    `- **Name:** ${input.domain}`,
    `- **Source:** ${input.url}`,
    `- **Primary people:** builders and agents implementing UI that must match this product`,
    `- **Primary objects:** pages, components, tokens, and flows derived from the live site`,
    `- **Distinctive signature:** ${personality}; archetype ${archetype}`,
    '- **Not copying:** pixel-perfect chrome, copyrighted illustrations, or product marketing copy',
    '',
    '## Invariant Guidance',
    '',
    '- YAML color, type, spacing, and radius tokens must not be invented at call sites.',
    '- A region has at most one primary action (`button-primary`).',
    '- Semantic tokens beat raw hex/rgb/px utilities unless an accepted exception exists.',
    '- Accessibility, focus visibility, and consequence naming are part of the design definition.',
    '- Do not edit `.design/generated/`; change this file and re-resolve.',
    '',
    '## Preferred Guidance',
    '',
    `- Prefer \`${typography.h1.fontFamily}\` for headlines and \`${typography['body-md'].fontFamily}\` for body.`,
    `- Prefer a ~${spacingBase}px spacing rhythm from the extracted scale.`,
    '- Prefer open layouts; use `surface-card` only when interaction needs a container.',
    '- Prefer scarce accent usage — primary/tertiary for commitment and focus, not decoration.',
    '- Prefer preserving selection, drafts, filters, and scroll across local mutations.',
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
    'Use the color, type, spacing, radius, and component roles in the front matter as semantic values. Component libraries may provide accessible behavior, but every used component must be restyled by this grammar.',
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
    'Responsive behavior changes representation and priority before content becomes cramped.',
    '',
    '## States and Interaction',
    '',
    'Every meaningful surface accounts for default, loading, empty, error, disabled, focus-visible, hover, selected, dirty, saving, and recovery states when applicable. State changes preserve valid work and name what happened.',
    '',
    '## Accessibility',
    '',
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
    'Palette ranked by observed CSS usage frequency and brand heuristics.',
    '',
    colorBullets,
    '',
    '## Typography',
    '',
    `- **Headlines:** ${typography.h1.fontFamily} at ${typography.h1.fontSize} / weight ${typography.h1.fontWeight}`,
    `- **Body:** ${typography['body-md'].fontFamily} at ${typography['body-md'].fontSize}`,
    `- **Labels:** ${typography.label.fontFamily} at ${typography.label.fontSize}`,
    '',
    '## Layout',
    '',
    `- Spacing scale: ${Object.entries(spacing)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
    `- Inferred spacing base: ${spacingBase}px`,
    '',
    '## Elevation & Depth',
    '',
    shadow
      ? `Primary elevation token observed: \`${shadow}\`. Use sparingly for floating surfaces.`
      : 'No strong shadow system detected — prefer borders and tonal surfaces over heavy drop shadows.',
    '',
    '## Shapes',
    '',
    `Corner scale: ${Object.entries(rounded)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}.`,
    'Keep interactive controls on `rounded.md` unless the control is a pill/chip intentionally using `rounded.full`.',
    '',
    '## Components',
    '',
    '- `button-primary` — primary actions and CTAs',
    '- `button-secondary` — secondary/supporting actions',
    '- `surface-card` — content grouping only when interaction needs a container; prefer open layouts otherwise',
    '',
    "## Do's and Don'ts",
    '',
    '**Do:**',
    ...dos,
    '- Run `design resolve`, `design check`, and `design verify` after material UI changes.',
    '',
    "**Don't:**",
    ...donts,
    '- Do not require a component package unless the project declares it.',
    '- Do not treat scan output as permission to skip receipts.',
    '',
    '---',
    '',
    `_Generated by Design Contracts from ${input.url}. Install with \`npx --yes github:byronwade/Design init\` so agents uphold this grammar over time._`,
    '',
  ].join('\n')

  return {
    markdown: `${frontMatterLines.join('\n')}${body}`,
    fileName: 'DESIGN.md',
    summary: {
      colorCount: Object.keys(colors).length,
      typographyCount: Object.keys(typography).length,
      spacingCount: Object.keys(spacing).length,
      hasComponents: true,
    },
  }
}

function describeColorRole(key: string): string {
  switch (key) {
    case 'primary':
      return 'headlines, primary CTAs, and core brand marks'
    case 'secondary':
      return 'supporting text, borders, and secondary actions'
    case 'tertiary':
      return 'accent interaction accents and highlights'
    case 'neutral':
      return 'page backgrounds and quiet surfaces'
    default:
      return 'supporting UI accents matching observed usage'
  }
}
