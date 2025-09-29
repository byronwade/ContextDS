import type { TokenSummary } from '@/lib/analyzers/basic-tokenizer'
import type { LayoutDNA } from '@/lib/analyzers/layout-inspector'

export type PromptPack = {
  version: string
  mappingHints: {
    tokens: string[]
    layout: string[]
    accessibility: string[]
  }
  guidelines: {
    usage: string[]
    pitfalls: string[]
  }
  accessibility: {
    summary: string
    recommendations: string[]
  }
}

export function buildPromptPack(
  tokens: {
    colors: TokenSummary[]
    typography: TokenSummary[]
    spacing: TokenSummary[]
  },
  layout: LayoutDNA
): PromptPack {
  return {
    version: '1.0.0',
    mappingHints: {
      tokens: buildTokenHints(tokens),
      layout: buildLayoutHints(layout),
      accessibility: buildAccessibilityHints(tokens)
    },
    guidelines: {
      usage: buildUsageGuidelines(tokens, layout),
      pitfalls: buildPitfalls(tokens, layout)
    },
    accessibility: {
      summary: summarizeAccessibility(tokens, layout),
      recommendations: buildAccessibilityRecommendations(tokens, layout)
    }
  }
}

function buildTokenHints(tokens: { colors: TokenSummary[]; typography: TokenSummary[]; spacing: TokenSummary[] }): string[] {
  const hints: string[] = []
  if (tokens.colors.length > 0) {
    hints.push('Map primary brand colors using the most frequent color tokens first.')
  }
  if (tokens.typography.length > 0) {
    hints.push('Align typography tokens to heading/body scales before introducing new sizes.')
  }
  if (tokens.spacing.length > 0) {
    hints.push('Use spacing tokens to maintain consistent rhythm across sections.')
  }
  return hints.length > 0 ? hints : ['Introduce tokens gradually and verify visual output.']
}

function buildLayoutHints(layout: LayoutDNA): string[] {
  const hints: string[] = []
  if (layout.containers.maxWidth) {
    hints.push(`Keep container widths near ${layout.containers.maxWidth} for primary content.`)
  }
  if (layout.gridSystem === 'grid' || layout.gridSystem === 'mixed') {
    hints.push('Leverage CSS Grid for multi-column sections to reflect source layout.')
  } else if (layout.gridSystem === 'flexbox') {
    hints.push('Flexbox is dominant; preserve horizontal alignment and wrap behaviour.')
  }
  if (layout.spacingBase) {
    hints.push(`Spacing base ~${layout.spacingBase}px. Scale by 2x increments for larger sections.`)
  }
  return hints.length > 0 ? hints : ['Adopt responsive sections informed by the layout DNA.']
}

function buildAccessibilityHints(tokens: { colors: TokenSummary[]; typography: TokenSummary[]; spacing: TokenSummary[] }): string[] {
  const hints: string[] = []
  if (tokens.colors.length > 0) {
    hints.push('Verify color contrast (WCAG 2.1 AA) when applying extracted palettes.')
  }
  if (tokens.typography.length > 0) {
    hints.push('Respect font-size tokens to maintain readable scale hierarchy.')
  }
  return hints.length > 0 ? hints : ['Include semantic HTML and keyboard focus states.']
}

function buildUsageGuidelines(tokens: { colors: TokenSummary[]; typography: TokenSummary[]; spacing: TokenSummary[] }, layout: LayoutDNA): string[] {
  const guidelines = ['Implement tokens via CSS variables or theme config for consistency.']
  if (tokens.colors.length > 0) {
    guidelines.push('Define semantic aliases (primary, accent, background) for color tokens before usage.')
  }
  if (tokens.spacing.length > 0) {
    guidelines.push('Apply spacing tokens to padding/margin to maintain rhythm across breakpoints.')
  }
  if (layout.breakpoints.length > 0) {
    guidelines.push('Check responsive behaviour at extracted breakpoints to confirm layout fidelity.')
  }
  return guidelines
}

function buildPitfalls(tokens: { colors: TokenSummary[]; typography: TokenSummary[]; spacing: TokenSummary[] }, layout: LayoutDNA): string[] {
  const pitfalls: string[] = []
  if (tokens.colors.length > 6) {
    pitfalls.push('Avoid overloading components with all palette tokens; focus on semantic subsets.')
  }
  if (layout.gridSystem === 'mixed') {
    pitfalls.push('Switching between grid and flex patterns can cause inconsistency—document preferred use.')
  }
  if (layout.spacingBase && layout.spacingBase > 12) {
    pitfalls.push('Large base spacing may not translate well to compact UI without adjustments.')
  }
  if (pitfalls.length === 0) {
    pitfalls.push('Validate tokens against real components to catch unforeseen regressions.')
  }
  return pitfalls
}

function summarizeAccessibility(tokens: { colors: TokenSummary[]; typography: TokenSummary[]; spacing: TokenSummary[] }, layout: LayoutDNA): string {
  const focusAreas = []
  if (tokens.colors.length > 0) focusAreas.push('contrast')
  if (layout.breakpoints.length > 0) focusAreas.push('responsiveness')
  if (tokens.typography.length > 0) focusAreas.push('type scale')
  return focusAreas.length > 0
    ? `Prioritize ${focusAreas.join(', ')} during implementation.`
    : 'Conduct baseline accessibility checks for contrast, keyboard navigation, and semantics.'
}

function buildAccessibilityRecommendations(tokens: { colors: TokenSummary[]; typography: TokenSummary[]; spacing: TokenSummary[] }, layout: LayoutDNA): string[] {
  const recommendations: string[] = ['Run automated audits (Lighthouse, axe) post-token integration.']
  if (tokens.colors.length > 0) {
    recommendations.push('Document intended light/dark usage if palette supports multiple themes.')
  }
  if (layout.breakpoints.length > 0) {
    recommendations.push('Test keyboard navigation and focus order across breakpoints.')
  }
  return recommendations
}
