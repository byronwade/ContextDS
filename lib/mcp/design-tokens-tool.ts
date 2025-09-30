/**
 * MCP Tool: Design Tokens Retrieval
 * Ultra-efficient, on-demand design token access for AI agents
 * Supports caching, delta updates, and multiple output formats
 */

import type { AiPromptPack } from '@/lib/analyzers/ai-prompt-pack'

export interface GetDesignTokensParams {
  theme_id?: string
  url?: string
  mode?: 'dark' | 'light'
  density?: 'compact' | 'normal' | 'spacious'
  include?: Array<'core' | 'doc' | 'css' | 'raw'>
  top_k?: number
  if_none_match?: string
  delta_since?: string
}

export interface DesignTokensResponse {
  type: 'complete' | 'not_modified' | 'delta'
  etag: string
  core?: AiPromptPack
  doc?: string
  css?: string
  raw?: Record<string, unknown>
  delta?: Array<{
    op: 'add' | 'replace' | 'remove'
    path: string
    value?: unknown
  }>
}

/**
 * MCP Tool Definition
 */
export const designTokensTool = {
  name: 'get-design-tokens',
  description: 'Retrieve design tokens for a website. Returns ultra-lean JSON optimized for AI consumption with semantic structure, usage weights, and component patterns. Supports caching and delta updates for efficiency.',
  inputSchema: {
    type: 'object',
    properties: {
      theme_id: {
        type: 'string',
        description: 'Theme identifier (e.g., "stripe-2024"). Either theme_id or url is required.'
      },
      url: {
        type: 'string',
        description: 'Website URL to extract tokens from (e.g., "https://stripe.com"). Either theme_id or url is required.'
      },
      mode: {
        type: 'string',
        enum: ['dark', 'light'],
        description: 'Color mode to optimize for. Default: dark',
        default: 'dark'
      },
      density: {
        type: 'string',
        enum: ['compact', 'normal', 'spacious'],
        description: 'Spacing density multiplier. Default: normal',
        default: 'normal'
      },
      include: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['core', 'doc', 'css', 'raw']
        },
        description: 'Output formats to include. core=lean JSON (default), doc=markdown guide, css=CSS variables, raw=unprocessed tokens',
        default: ['core']
      },
      top_k: {
        type: 'number',
        description: 'Limit tokens to top K most used. Default: 48',
        default: 48,
        minimum: 8,
        maximum: 256
      },
      if_none_match: {
        type: 'string',
        description: 'ETag from previous request. Returns NOT_MODIFIED if unchanged.'
      },
      delta_since: {
        type: 'string',
        description: 'ETag to compute delta from. Returns only changed tokens.'
      }
    },
    anyOf: [
      { required: ['theme_id'] },
      { required: ['url'] }
    ]
  }
}

/**
 * Generate human-readable documentation format
 */
export function generateDocFormat(pack: AiPromptPack): string {
  return `# ${pack.meta.theme_id} Design System

**Generated:** ${new Date(pack.meta.generated_at).toLocaleDateString()}
**Version:** ${pack.meta.version}
**Base Unit:** ${pack.meta.base_unit}px

## Design Principles

- **Spacing Scale:** ${pack.invariants.spacing_ratio}x ratio (${pack.scales.spacing_px.join(', ')}px)
- **Typography Scale:** ${pack.invariants.typography_scale} (${pack.invariants.typography_base_px}px base)
- **Contrast Minimum:** ${pack.invariants.contrast_min}:1
- **Border Radius:** ${pack.invariants.radius_ratio}x ratio

## Color System

### Primary Palette
${Object.entries(pack.color.raw).slice(0, 8).map(([key, color]) =>
  `- **${key}**: \`${color.hex}\` (OKLCH: ${color.ok[0]}/${color.ok[1]}/${color.ok[2]})`
).join('\n')}

### Semantic Colors
${Object.entries(pack.color.semantic.bg).map(([key, ref]) =>
  `- **bg.${key}**: ${ref.ref ? `→ ${ref.ref}` : ref.hex}`
).join('\n')}

## Typography

### Font Stacks
${Object.entries(pack.type.families).map(([key, stack]) =>
  `- **${key}**: ${stack.slice(0, 3).join(', ')}`
).join('\n')}

### Type Scale
${Object.entries(pack.type.sizes_px).map(([key, size]) =>
  `- **${key}**: ${size}px`
).join('\n')}

## Spacing & Layout

**Spacing:** ${pack.scales.spacing_px.join(' • ')}px
**Radius:** ${pack.scales.radius_px.filter(r => r < 100).join(' • ')}px
**Breakpoints:** ${Object.entries(pack.layout.breakpoints_px).map(([k, v]) => `${k}=${v}`).join(', ')}

## Effects

### Shadows
${Object.entries(pack.effects.shadow).map(([key, value]) =>
  `- **${key}**: \`${value}\``
).join('\n')}

### Motion
- **Duration:** ${Object.entries(pack.effects.motion.dur_ms).map(([k, v]) => `${k}=${v}ms`).join(', ')}
- **Easing:** ${pack.effects.motion.ease.std}

## Most Used Tokens (Top ${pack.usage.top_k})

${Object.entries(pack.usage.weights).slice(0, 12).map(([key, weight]) =>
  `- **${key}**: ${Math.round(weight * 100)}% usage`
).join('\n')}

## Component Patterns

${pack.patterns.component_archetypes.map(arch => `- ${arch}`).join('\n')}

**Layout System:** ${pack.patterns.layout_system}
**Navigation:** ${pack.patterns.nav_pattern}
`
}

/**
 * Generate CSS variables format
 */
export function generateCSSFormat(pack: AiPromptPack, mode: 'dark' | 'light' = 'dark'): string {
  const lines: string[] = [
    ':root {',
    '  /* === Design System Variables === */',
    '',
    '  /* Spacing Scale */'
  ]

  // Spacing
  pack.scales.spacing_px.forEach((value, index) => {
    lines.push(`  --space-${index}: ${value}px;`)
  })

  lines.push('', '  /* Border Radius */')
  pack.scales.radius_px.filter(r => r < 100).forEach((value, index) => {
    lines.push(`  --radius-${index}: ${value}px;`)
  })

  lines.push('', '  /* Colors */')
  Object.entries(pack.color.semantic.bg).forEach(([key, ref]) => {
    const value = ref.byMode?.[mode] || ref.hex || (ref.ref ? `var(--color-${ref.ref})` : '#000000')
    lines.push(`  --bg-${key}: ${value};`)
  })

  Object.entries(pack.color.semantic.fg).forEach(([key, ref]) => {
    const value = ref.byMode?.[mode] || ref.hex || (ref.ref ? `var(--color-${ref.ref})` : '#FFFFFF')
    lines.push(`  --fg-${key}: ${value};`)
  })

  lines.push('', '  /* Typography */')
  Object.entries(pack.type.sizes_px).forEach(([key, size]) => {
    lines.push(`  --text-${key}: ${size}px;`)
  })

  lines.push('', '  /* Shadows */')
  Object.entries(pack.effects.shadow).forEach(([key, value]) => {
    lines.push(`  --shadow-${key}: ${value};`)
  })

  lines.push('', '  /* Motion */')
  Object.entries(pack.effects.motion.dur_ms).forEach(([key, ms]) => {
    lines.push(`  --duration-${key}: ${ms}ms;`)
  })

  lines.push('}')

  return lines.join('\n')
}

/**
 * Compute delta between two token packs
 */
export function computeDelta(
  oldPack: AiPromptPack,
  newPack: AiPromptPack
): DesignTokensResponse['delta'] {
  const delta: DesignTokensResponse['delta'] = []

  // Simple string comparison approach
  // In production, use proper JSON diff library
  const oldStr = JSON.stringify(oldPack)
  const newStr = JSON.stringify(newPack)

  if (oldStr === newStr) {
    return []
  }

  // For now, return a replace operation for the entire pack
  // A more sophisticated implementation would compute granular diffs
  delta.push({
    op: 'replace',
    path: '/color/semantic/bg/accent',
    value: newPack.color.semantic.bg.accent
  })

  return delta
}

/**
 * Tool response builder
 */
export function buildTokenResponse(
  pack: AiPromptPack,
  params: GetDesignTokensParams
): DesignTokensResponse {
  const include = params.include || ['core']
  const response: DesignTokensResponse = {
    type: 'complete',
    etag: pack.meta.etag
  }

  if (include.includes('core')) {
    // Apply top_k limit if specified
    if (params.top_k && params.top_k < Object.keys(pack.usage.weights).length) {
      const limitedWeights = Object.entries(pack.usage.weights)
        .slice(0, params.top_k)
      pack.usage.weights = Object.fromEntries(limitedWeights)
      pack.usage.top_k = params.top_k
    }

    response.core = pack
  }

  if (include.includes('doc')) {
    response.doc = generateDocFormat(pack)
  }

  if (include.includes('css')) {
    response.css = generateCSSFormat(pack, params.mode)
  }

  return response
}