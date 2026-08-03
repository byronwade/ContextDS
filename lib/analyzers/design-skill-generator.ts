/**
 * Generate a Cursor/Claude Agent Skill that teaches agents how to apply
 * a scanned site's design system (pairs with DESIGN.md).
 *
 * Skill format follows agentskills / Cursor SKILL.md conventions:
 * YAML front matter + procedural markdown instructions.
 */

export type DesignSkillInput = {
  domain: string
  url: string
  designMdFileName?: string
  curatedTokens: {
    colors?: Array<{ value: string; name?: string }>
    typography?: {
      families?: Array<{ value: string }>
      sizes?: Array<{ value: string }>
    }
    spacing?: Array<{ value: string }>
    radius?: Array<{ value: string }>
  }
  personality?: string
  /** Philosophy traits / principles when available from the scan */
  philosophy?: {
    title?: string
    statement?: string
    traits?: string[]
    principles?: Array<{ title: string; body: string }>
    motionTempo?: string | null
    typeVoice?: string | null
    shapeCharacter?: string | null
    depth?: string | null
  } | null
  /** Measured component recipe keys from accurate scans */
  measuredComponents?: string[] | null
}

export type DesignSkillArtifact = {
  markdown: string
  fileName: string
  skillName: string
  description: string
}

export function generateDesignSkill(input: DesignSkillInput): DesignSkillArtifact {
  const skillName = `${slug(input.domain)}-design-system`
  const designMd = input.designMdFileName || 'DESIGN.md'
  const colors = (input.curatedTokens.colors ?? []).slice(0, 8).map((c) => c.value)
  const fonts = (input.curatedTokens.typography?.families ?? [])
    .slice(0, 3)
    .map((f) => f.value)
  const spacing = (input.curatedTokens.spacing ?? []).slice(0, 6).map((s) => s.value)
  const radii = (input.curatedTokens.radius ?? []).slice(0, 4).map((r) => r.value)
  const traits = input.philosophy?.traits?.slice(0, 5) ?? []
  const personality =
    input.personality ||
    (traits.length ? traits.join(', ') : 'match the extracted visual language')
  const principles = (input.philosophy?.principles ?? []).slice(0, 4)
  const measured = (input.measuredComponents ?? []).filter(Boolean)

  const description = `Apply the ${input.domain} design contract (${designMd}). Read it before any UI work.`

  const markdown = `---
name: ${skillName}
description: ${description}
---

# ${input.domain} Design System Skill

Use this skill whenever you generate UI, components, marketing pages, or styles for **${input.domain}**.

Source scan: ${input.url}
Canonical grammar: \`${designMd}\` (YAML tokens are normative; prose is director intent)

${
  input.philosophy?.statement
    ? `## Signature\n\n${input.philosophy.statement}\n\nTraits: ${personality}.\n`
    : `## Signature\n\nPersonality: ${personality}.\n`
}

## When to use

- Building pages or components that must match ${input.domain}
- Theming a product with tokens extracted from ${input.domain}
- Reviewing UI for visual drift from the scanned system

## Required workflow

1. **Read \`${designMd}\` first** — YAML front matter is normative; principles explain intent.
2. **Map tokens before coding** — colors, type, spacing, radius, motion, components you will use.
3. **Prefer measured recipes** — \`components.*\` in YAML (especially accurate-scan recipes) over inventing controls.
4. **Generate UI** using only those tokens (Tailwind theme values or CSS variables).
5. **Self-check** against Preferred Guidance and Do's / Don'ts in \`${designMd}\`.

## Token quick reference

### Colors
${colors.length ? colors.map((c) => `- \`${c}\``).join('\n') : '- (see DESIGN.md colors)'}

### Typography
${fonts.length ? fonts.map((f) => `- \`${f}\``).join('\n') : '- (see DESIGN.md typography)'}
${input.philosophy?.typeVoice ? `\nType voice: ${input.philosophy.typeVoice}.` : ''}

### Spacing
${spacing.length ? spacing.map((s) => `- \`${s}\``).join('\n') : '- Use the DESIGN.md spacing scale'}

### Radius & depth
${radii.length ? radii.map((r) => `- \`${r}\``).join('\n') : '- Use the DESIGN.md rounded scale'}
${
  input.philosophy?.shapeCharacter || input.philosophy?.depth
    ? `\nShape: ${input.philosophy?.shapeCharacter ?? 'measured'}; depth: ${input.philosophy?.depth ?? 'measured'}.`
    : ''
}

### Motion
${
  input.philosophy?.motionTempo
    ? `- Tempo: **${input.philosophy.motionTempo}** — honor YAML \`motion\` tokens; no theatrical motion the site never uses.`
    : '- See DESIGN.md Motion section; prefer feedback over theater.'
}

### Measured components
${
  measured.length
    ? measured.map((key) => `- \`${key}\``).join('\n')
    : '- See DESIGN.md \`components\` (button-primary, button-secondary, surface-card, …)'
}

${
  principles.length
    ? `## Design principles (from scan)\n\n${principles
        .map((p) => `- **${p.title}:** ${p.body}`)
        .join('\n')}\n`
    : ''
}

## Hard rules

- Never invent brand colors not present in \`${designMd}\`.
- Never substitute Inter / Roboto / Arial when a scanned family exists.
- Prefer open layouts; use cards only for interactive containers.
- Keep accent scarce — primary CTAs are rare, not decoration.
- Primary CTA must use \`components.button-primary\` (and its \`hover\` state when present).
- If a value is missing, ask or derive from the nearest scale step — do not freestyle.
- Do not edit \`.design/generated/\`; change \`${designMd}\` and re-resolve.

## Output expectations

When generating code:

1. Mention which DESIGN.md tokens / recipes you used (brief).
2. Prefer CSS variables or Tailwind theme tokens wired to the YAML values.
3. Include responsive behavior consistent with the Layout section.
4. Avoid decorative purple gradients, generic AI-slop palettes, and emoji ornamentation.

## Cursor / Claude setup hint

Add a project rule:

\`\`\`
Before generating any visual component, read ${designMd} and follow the ${skillName} skill.
Do not invent colors, type, spacing, radii, or motion outside that system.
\`\`\`

## Validation

\`\`\`bash
npx --yes github:byronwade/Design check
npx --yes github:byronwade/Design verify --mode release
\`\`\`
`

  return {
    markdown,
    fileName: `skills/${skillName}/SKILL.md`,
    skillName,
    description,
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
