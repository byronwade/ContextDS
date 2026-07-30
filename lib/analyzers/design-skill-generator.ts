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
  const personality = input.personality || 'match the extracted visual language'

  const description = `Apply the ${input.domain} design contract (${designMd}). Use before generating any UI.`

  const markdown = `---
name: ${skillName}
description: ${description}
---

# ${input.domain} Design System Skill

Use this skill whenever you generate UI, components, marketing pages, or styles inspired by **${input.domain}**.

Source scan: ${input.url}
Canonical tokens + rationale: \`${designMd}\` (Google DESIGN.md format)

## When to use

- Building pages or components that should look like ${input.domain}
- Theming a product with tokens extracted from ${input.domain}
- Reviewing UI for visual drift from the scanned system

## Required workflow

1. **Read \`${designMd}\` first** — YAML front matter is normative; prose explains intent.
2. **Map tokens before coding** — list colors, type, spacing, radius you will use.
3. **Generate UI** using only those tokens (Tailwind theme values or CSS variables).
4. **Self-check** against Do's and Don'ts in \`${designMd}\`.

## Token quick reference

### Colors
${colors.length ? colors.map((c) => `- \`${c}\``).join('\n') : '- (see DESIGN.md colors)'}

### Typography
${fonts.length ? fonts.map((f) => `- \`${f}\``).join('\n') : '- (see DESIGN.md typography)'}

### Spacing
${spacing.length ? spacing.map((s) => `- \`${s}\``).join('\n') : '- Use the DESIGN.md spacing scale'}

### Radius
${radii.length ? radii.map((r) => `- \`${r}\``).join('\n') : '- Use the DESIGN.md rounded scale'}

## Hard rules

- Never invent brand colors not present in \`${designMd}\`.
- Never substitute Inter / Roboto / Arial when a scanned family exists.
- Prefer open layouts; use cards only for interactive containers.
- Keep personality: ${personality}.
- Primary CTA must use \`components.button-primary\` mappings from \`${designMd}\`.
- If a value is missing, ask or derive from the nearest scale step — do not freestyle.

## Output expectations

When generating code:

1. Mention which DESIGN.md tokens you used (brief).
2. Prefer CSS variables or Tailwind theme tokens wired to the YAML values.
3. Include responsive behavior consistent with the Layout section.
4. Avoid decorative purple gradients, generic AI-slop palettes, and emoji ornamentation.

## Cursor / Claude setup hint

Add a project rule:

\`\`\`
Before generating any visual component, read ${designMd} and follow the ${skillName} skill.
Do not invent colors, type, spacing, or radii outside that system.
\`\`\`

## Validation

Optionally lint the design file:

\`\`\`bash
npx @google/design.md lint ${designMd}
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
