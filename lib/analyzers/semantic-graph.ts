/**
 * Semantic Design Graph
 *
 * Links tokens ↔ roles ↔ components ↔ layout ↔ patterns ↔ surfaces
 * so agents get a connected model of how the UI system works — not a flat token dump.
 */

import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import type { LayoutDNA } from '@/lib/analyzers/layout-inspector'
import type { CuratedToken, CuratedTokenSet } from '@/lib/analyzers/token-curator'

export const SEMANTIC_GRAPH_SCHEMA_VERSION = 1 as const

export type GraphId = string

export type EdgeType =
  | 'USES_TOKEN'
  | 'FILLS_ROLE'
  | 'IMPLEMENTS_ROLE'
  | 'APPEARS_IN'
  | 'LOCATED_IN'
  | 'RELATED_BY'
  | 'MEMBER_OF'
  | 'CONTAINS'
  | 'EVIDENCED_BY'
  | 'REFERENCES'
  | 'STATE_OF'

export type TokenCategory = 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'motion'

export type RoleId =
  | 'color.primary'
  | 'color.secondary'
  | 'color.tertiary'
  | 'color.accent'
  | 'color.bg'
  | 'color.fg'
  | 'color.muted'
  | 'color.border'
  | 'type.display'
  | 'type.heading'
  | 'type.body'
  | 'type.label'
  | 'space.xs'
  | 'space.sm'
  | 'space.md'
  | 'space.lg'
  | 'space.xl'
  | 'radius.control'
  | 'radius.surface'
  | 'elevation.card'
  | 'action.primary'
  | 'action.secondary'
  | 'surface.card'
  | 'nav.primary'

export type GraphNode =
  | {
      id: GraphId
      kind: 'token'
      category: TokenCategory
      name: string
      value: string
      usage: number
      confidence: number
      semanticHints?: string[]
    }
  | {
      id: GraphId
      kind: 'role'
      role: RoleId
      layer: 'primitive' | 'semantic' | 'component'
      label: string
    }
  | {
      id: GraphId
      kind: 'component'
      type: string
      variant?: string
      confidence: number
      selectors: string[]
      states?: string[]
    }
  | {
      id: GraphId
      kind: 'layout'
      category: string
      breakpoint?: number | 'base'
      evidence?: Record<string, string | number | boolean | null | undefined>
      confidence?: number
    }
  | {
      id: GraphId
      kind: 'pattern'
      patternType: 'palette' | 'modular-scale' | 'shade-system' | 'spacing-grid' | 'archetype'
      label: string
      confidence: number
    }
  | {
      id: GraphId
      kind: 'surface'
      label: string
      url: string
    }
  | {
      id: GraphId
      kind: 'reference'
      label: string
      sourceUrl?: string
      ownership: 'scan-derived' | 'project-owned'
    }

export type GraphEdge = {
  id: string
  type: EdgeType
  from: GraphId
  to: GraphId
  weight?: number
  evidence?: {
    selectors?: string[]
    properties?: string[]
    cssValue?: string
    note?: string
  }
}

export type SemanticGraph = {
  schemaVersion: typeof SEMANTIC_GRAPH_SCHEMA_VERSION
  domain: string
  sourceUrl: string
  scanId: string
  generatedAt: string
  summary: {
    nodeCount: number
    edgeCount: number
    tokenCount: number
    roleCount: number
    componentCount: number
    layoutCount: number
    patternCount: number
  }
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Compact adjacency for agents — role → connected token/component ids */
  index: {
    roles: Record<string, GraphId[]>
    components: Record<string, { roles: GraphId[]; tokens: GraphId[]; layouts: GraphId[] }>
    tokensByCategory: Record<string, GraphId[]>
  }
}

export type SemanticGraphInput = {
  domain: string
  url: string
  scanId: string
  curatedTokens: CuratedTokenSet
  layoutDNA?: LayoutDNA | null
  brandAnalysis?: {
    primaryColors?: string[]
    personality?: string
    primaryFont?: string
  } | null
  cssSources?: Array<{ content: string; url?: string; kind?: string }>
  pageTitle?: string
}

function normalizeValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function tokenId(category: TokenCategory, name: string, value: string): GraphId {
  const slug = (name || value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `token:${category}:${slug || normalizeValue(value).slice(0, 24)}`
}

function roleId(role: RoleId): GraphId {
  return `role:${role}`
}

function edgeId(type: EdgeType, from: GraphId, to: GraphId): string {
  return `edge:${type}:${from}->${to}`
}

function pushUniqueEdge(edges: GraphEdge[], edge: GraphEdge) {
  if (edges.some((existing) => existing.id === edge.id)) return
  edges.push(edge)
}

function ensureRole(
  nodes: Map<GraphId, GraphNode>,
  role: RoleId,
  layer: 'primitive' | 'semantic' | 'component',
  label: string
) {
  const id = roleId(role)
  if (!nodes.has(id)) {
    nodes.set(id, { id, kind: 'role', role, layer, label })
  }
  return id
}

function addTokenNodes(
  nodes: Map<GraphId, GraphNode>,
  category: TokenCategory,
  tokens: CuratedToken[] | undefined
): GraphId[] {
  const ids: GraphId[] = []
  for (const token of tokens ?? []) {
    const id = tokenId(category, String(token.name), String(token.value))
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        kind: 'token',
        category,
        name: String(token.name),
        value: String(token.value),
        usage: token.usage ?? 0,
        confidence: token.confidence ?? 0,
        semanticHints: token.semantic ? [token.semantic] : undefined,
      })
    }
    ids.push(id)
  }
  return ids
}

function findTokenByValue(
  nodes: Map<GraphId, GraphNode>,
  value: string,
  category?: TokenCategory
): GraphId | null {
  const target = normalizeValue(value)
  if (!target) return null
  for (const node of nodes.values()) {
    if (node.kind !== 'token') continue
    if (category && node.category !== category) continue
    if (normalizeValue(node.value) === target) return node.id
    // hex fuzzy: strip # and compare
    if (
      node.category === 'color' &&
      target.replace('#', '') === normalizeValue(node.value).replace('#', '')
    ) {
      return node.id
    }
  }
  return null
}

function semanticToColorRole(semantic?: string): RoleId | null {
  if (!semantic) return null
  const s = semantic.toLowerCase()
  if (s.includes('primary') || s.includes('brand')) return 'color.primary'
  if (s.includes('secondary')) return 'color.secondary'
  if (s.includes('tertiary') || s.includes('accent') || s.includes('highlight'))
    return 'color.accent'
  if (s.includes('background') || s.includes('surface') || s.includes('bg')) return 'color.bg'
  if (s.includes('text') || s.includes('foreground') || s.includes('fg')) return 'color.fg'
  if (s.includes('muted') || s.includes('subtle')) return 'color.muted'
  if (s.includes('border') || s.includes('divider') || s.includes('line')) return 'color.border'
  return null
}

function assignColorRoles(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  colors: CuratedToken[],
  brand?: SemanticGraphInput['brandAnalysis']
) {
  const sorted = [...colors].sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
  const assigned = new Set<RoleId>()

  const brandColors = brand?.primaryColors ?? []
  const brandRoles: RoleId[] = ['color.primary', 'color.secondary', 'color.tertiary']
  brandColors.forEach((value, index) => {
    const role = brandRoles[index]
    if (!role) return
    const tid = findTokenByValue(nodes, value, 'color')
    if (!tid) return
    const rid = ensureRole(nodes, role, 'semantic', role)
    pushUniqueEdge(edges, {
      id: edgeId('FILLS_ROLE', tid, rid),
      type: 'FILLS_ROLE',
      from: tid,
      to: rid,
      weight: 1,
      evidence: { note: 'brand-primary-colors' },
    })
    assigned.add(role)
  })

  for (const color of sorted) {
    const tid = tokenId('color', String(color.name), String(color.value))
    const role = semanticToColorRole(color.semantic)
    if (!role || assigned.has(role)) continue
    const rid = ensureRole(nodes, role, 'semantic', role)
    pushUniqueEdge(edges, {
      id: edgeId('FILLS_ROLE', tid, rid),
      type: 'FILLS_ROLE',
      from: tid,
      to: rid,
      weight: (color.usage ?? 0) / 100,
      evidence: { note: `semantic:${color.semantic}` },
    })
    assigned.add(role)
  }

  // Fallbacks from usage ranking
  const fallbacks: Array<[RoleId, number]> = [
    ['color.primary', 0],
    ['color.fg', 0],
    ['color.bg', 1],
    ['color.secondary', 1],
    ['color.accent', 2],
    ['color.muted', 3],
    ['color.border', 4],
  ]
  for (const [role, index] of fallbacks) {
    if (assigned.has(role)) continue
    const color = sorted[index]
    if (!color) continue
    const tid = tokenId('color', String(color.name), String(color.value))
    const rid = ensureRole(nodes, role, 'semantic', role)
    pushUniqueEdge(edges, {
      id: edgeId('FILLS_ROLE', tid, rid),
      type: 'FILLS_ROLE',
      from: tid,
      to: rid,
      weight: 0.5,
      evidence: { note: 'usage-rank-fallback' },
    })
    assigned.add(role)
  }
}

function assignTypeRoles(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  typography: CuratedTokenSet['typography']
) {
  const sizes = [...(typography.sizes ?? [])].sort(
    (a, b) => parseFloat(String(b.value)) - parseFloat(String(a.value))
  )
  const families = typography.families ?? []

  const map: Array<[RoleId, CuratedToken | undefined]> = [
    ['type.display', sizes[0]],
    ['type.heading', sizes[1] || sizes[0]],
    ['type.body', sizes[Math.min(2, Math.max(sizes.length - 1, 0))]],
    ['type.label', sizes[sizes.length - 1]],
  ]

  for (const [role, token] of map) {
    if (!token) continue
    const tid = tokenId('typography', String(token.name), String(token.value))
    const rid = ensureRole(nodes, role, 'semantic', role)
    pushUniqueEdge(edges, {
      id: edgeId('FILLS_ROLE', tid, rid),
      type: 'FILLS_ROLE',
      from: tid,
      to: rid,
      weight: (token.usage ?? 0) / 100,
    })
  }

  if (families[0]) {
    const tid = tokenId('typography', String(families[0].name), String(families[0].value))
    const rid = ensureRole(nodes, 'type.heading', 'semantic', 'type.heading')
    pushUniqueEdge(edges, {
      id: edgeId('FILLS_ROLE', tid, rid),
      type: 'FILLS_ROLE',
      from: tid,
      to: rid,
      weight: 0.8,
      evidence: { note: 'primary-font-family' },
    })
  }
}

function assignScaleRoles(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  tokens: CuratedToken[] | undefined,
  roles: RoleId[],
  category: TokenCategory
) {
  const list = [...(tokens ?? [])]
  roles.forEach((role, index) => {
    const token = list[index]
    if (!token) return
    const tid = tokenId(category, String(token.name), String(token.value))
    const rid = ensureRole(nodes, role, 'primitive', role)
    pushUniqueEdge(edges, {
      id: edgeId('FILLS_ROLE', tid, rid),
      type: 'FILLS_ROLE',
      from: tid,
      to: rid,
      weight: (token.usage ?? 0) / 100,
    })
  })
}

function addPatternNodes(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  curated: CuratedTokenSet
) {
  const meta = curated.metadata || {}

  const palettes =
    (meta.colorPalettes as Array<{
      name?: string
      relationship?: string
      confidence?: number
      colors?: CuratedToken[]
    }>) || []

  for (const [index, palette] of palettes.slice(0, 8).entries()) {
    const id = `pattern:palette:${index}` as GraphId
    nodes.set(id, {
      id,
      kind: 'pattern',
      patternType: 'palette',
      label: palette.name || palette.relationship || `palette-${index + 1}`,
      confidence: palette.confidence ?? 0.7,
    })
    for (const color of palette.colors ?? []) {
      const tid = tokenId('color', String(color.name), String(color.value))
      if (!nodes.has(tid)) continue
      pushUniqueEdge(edges, {
        id: edgeId('MEMBER_OF', tid, id),
        type: 'MEMBER_OF',
        from: tid,
        to: id,
        weight: palette.confidence,
      })
    }
  }

  const scale = meta.modularScale as
    | { base?: number; ratio?: number; confidence?: number; tokens?: CuratedToken[] }
    | undefined
  if (scale?.tokens?.length) {
    const id = 'pattern:modular-scale' as GraphId
    nodes.set(id, {
      id,
      kind: 'pattern',
      patternType: 'modular-scale',
      label: `modular-scale base=${scale.base} ratio=${scale.ratio}`,
      confidence: scale.confidence ?? 0.7,
    })
    for (const token of scale.tokens) {
      const tid = tokenId('typography', String(token.name), String(token.value))
      if (!nodes.has(tid)) continue
      pushUniqueEdge(edges, {
        id: edgeId('MEMBER_OF', tid, id),
        type: 'MEMBER_OF',
        from: tid,
        to: id,
      })
    }
  }

  const spacingGrid = meta.spacingGrid as
    | { base?: number; confidence?: number; tokens?: CuratedToken[] }
    | undefined
  if (spacingGrid?.tokens?.length || spacingGrid?.base) {
    const id = 'pattern:spacing-grid' as GraphId
    nodes.set(id, {
      id,
      kind: 'pattern',
      patternType: 'spacing-grid',
      label: `spacing-grid base=${spacingGrid.base ?? '?'}`,
      confidence: spacingGrid.confidence ?? 0.7,
    })
    for (const token of spacingGrid.tokens ?? []) {
      const tid = tokenId('spacing', String(token.name), String(token.value))
      if (!nodes.has(tid)) continue
      pushUniqueEdge(edges, {
        id: edgeId('MEMBER_OF', tid, id),
        type: 'MEMBER_OF',
        from: tid,
        to: id,
      })
    }
  }
}

function addLayoutNodes(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  layoutDNA: LayoutDNA | null | undefined,
  surfaceId: GraphId
) {
  if (!layoutDNA) return

  const containerId = 'layout:container' as GraphId
  nodes.set(containerId, {
    id: containerId,
    kind: 'layout',
    category: 'container',
    evidence: {
      maxWidth: layoutDNA.containers.maxWidth,
      strategy: layoutDNA.containers.strategy,
      responsive: layoutDNA.containers.responsive,
    },
    confidence: layoutDNA.containers.maxWidth ? 0.85 : 0.4,
  })
  pushUniqueEdge(edges, {
    id: edgeId('APPEARS_IN', containerId, surfaceId),
    type: 'APPEARS_IN',
    from: containerId,
    to: surfaceId,
  })

  const gridId = 'layout:grid-system' as GraphId
  nodes.set(gridId, {
    id: gridId,
    kind: 'layout',
    category: 'grid',
    evidence: { system: layoutDNA.gridSystem, spacingBase: layoutDNA.spacingBase },
    confidence: 0.75,
  })
  pushUniqueEdge(edges, {
    id: edgeId('CONTAINS', containerId, gridId),
    type: 'CONTAINS',
    from: containerId,
    to: gridId,
  })

  for (const bp of layoutDNA.breakpoints.slice(0, 8)) {
    const id = `layout:breakpoint:${bp}` as GraphId
    nodes.set(id, {
      id,
      kind: 'layout',
      category: 'breakpoint',
      breakpoint: bp,
      evidence: { width: bp },
      confidence: 0.9,
    })
    pushUniqueEdge(edges, {
      id: edgeId('APPEARS_IN', id, surfaceId),
      type: 'APPEARS_IN',
      from: id,
      to: surfaceId,
    })
  }

  for (const [index, archetype] of layoutDNA.archetypes.slice(0, 6).entries()) {
    const patternId = `pattern:archetype:${index}` as GraphId
    nodes.set(patternId, {
      id: patternId,
      kind: 'pattern',
      patternType: 'archetype',
      label: archetype.type,
      confidence: archetype.confidence,
    })
    pushUniqueEdge(edges, {
      id: edgeId('APPEARS_IN', patternId, surfaceId),
      type: 'APPEARS_IN',
      from: patternId,
      to: surfaceId,
      weight: archetype.confidence,
    })
  }
}

type HeuristicComponent = {
  type: string
  variant?: string
  selectors: string[]
  confidence: number
  props: Record<string, string>
}

const COMPONENT_SELECTOR_RULES: Array<{
  type: string
  variant?: string
  match: RegExp
  confidence: number
}> = [
  {
    type: 'button',
    variant: 'primary',
    match: /(button|\.btn)([^\w-]|$)|\[type=["']submit["']\]/i,
    confidence: 0.72,
  },
  {
    type: 'button',
    variant: 'secondary',
    match: /\.btn[-_]?(secondary|outline|ghost)/i,
    confidence: 0.78,
  },
  { type: 'link', match: /^a\b|a:|\.link\b/i, confidence: 0.55 },
  { type: 'nav', match: /\bnav\b|\.nav(bar|igation)?\b|header\s+ul/i, confidence: 0.7 },
  { type: 'card', match: /\.card\b|\.panel\b|\.tile\b/i, confidence: 0.75 },
  { type: 'input', match: /\binput\b|\.input\b|textarea|\.form-control/i, confidence: 0.7 },
  { type: 'heading', match: /^h[1-3]\b/i, confidence: 0.8 },
]

function extractHeuristicComponents(
  cssSources: SemanticGraphInput['cssSources']
): HeuristicComponent[] {
  if (!cssSources?.length) return []

  const found = new Map<string, HeuristicComponent>()
  const css = cssSources
    .map((source) => source.content)
    .join('\n')
    .slice(0, 2_500_000)

  let root: postcss.Root
  try {
    root = postcss.parse(css, { parser: safeParser })
  } catch {
    return []
  }

  root.walkRules((rule) => {
    const selector = rule.selector || ''
    for (const def of COMPONENT_SELECTOR_RULES) {
      if (!def.match.test(selector)) continue
      const key = `${def.type}:${def.variant || 'default'}`
      const props: Record<string, string> = {}
      rule.walkDecls((decl) => {
        const prop = decl.prop.toLowerCase()
        if (
          [
            'color',
            'background',
            'background-color',
            'border-color',
            'border-radius',
            'padding',
            'font-size',
            'font-family',
            'font-weight',
            'box-shadow',
            'gap',
          ].includes(prop)
        ) {
          props[prop] = decl.value
        }
      })
      if (Object.keys(props).length === 0) continue

      const existing = found.get(key)
      if (!existing) {
        found.set(key, {
          type: def.type,
          variant: def.variant,
          selectors: [selector.split(',')[0]?.trim() || selector],
          confidence: def.confidence,
          props,
        })
      } else {
        if (existing.selectors.length < 6) {
          existing.selectors.push(selector.split(',')[0]?.trim() || selector)
        }
        existing.props = { ...props, ...existing.props }
        existing.confidence = Math.min(0.95, existing.confidence + 0.02)
      }
    }
  })

  return Array.from(found.values()).slice(0, 24)
}

function linkComponents(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  components: HeuristicComponent[],
  surfaceId: GraphId
) {
  for (const component of components) {
    const id = `component:${component.type}:${component.variant || 'default'}` as GraphId
    nodes.set(id, {
      id,
      kind: 'component',
      type: component.type,
      variant: component.variant,
      confidence: component.confidence,
      selectors: Array.from(new Set(component.selectors)).slice(0, 8),
      states: ['default', 'hover', 'focus'],
    })

    pushUniqueEdge(edges, {
      id: edgeId('APPEARS_IN', id, surfaceId),
      type: 'APPEARS_IN',
      from: id,
      to: surfaceId,
      weight: component.confidence,
      evidence: { selectors: component.selectors.slice(0, 4) },
    })

    // Map CSS props → tokens
    const propMap: Array<[string, TokenCategory]> = [
      ['color', 'color'],
      ['background-color', 'color'],
      ['background', 'color'],
      ['border-color', 'color'],
      ['border-radius', 'radius'],
      ['padding', 'spacing'],
      ['gap', 'spacing'],
      ['font-size', 'typography'],
      ['font-family', 'typography'],
      ['box-shadow', 'shadow'],
    ]
    for (const [prop, category] of propMap) {
      const value = component.props[prop]
      if (!value) continue
      // padding can be multi-value — try first length
      const candidates =
        category === 'spacing' ? value.match(/\d+(\.\d+)?(px|rem|em)/g) || [value] : [value]
      for (const candidate of candidates.slice(0, 3)) {
        const tid = findTokenByValue(nodes, candidate, category)
        if (!tid) continue
        pushUniqueEdge(edges, {
          id: edgeId('USES_TOKEN', id, tid),
          type: 'USES_TOKEN',
          from: id,
          to: tid,
          weight: component.confidence,
          evidence: {
            properties: [prop],
            cssValue: candidate,
            selectors: component.selectors.slice(0, 2),
          },
        })
      }
    }

    // Role bindings
    if (component.type === 'button' && component.variant === 'primary') {
      const rid = ensureRole(nodes, 'action.primary', 'component', 'Primary action')
      pushUniqueEdge(edges, {
        id: edgeId('IMPLEMENTS_ROLE', id, rid),
        type: 'IMPLEMENTS_ROLE',
        from: id,
        to: rid,
        weight: component.confidence,
      })
      const colorRole = roleId('color.primary')
      if (nodes.has(colorRole)) {
        pushUniqueEdge(edges, {
          id: edgeId('USES_TOKEN', id, colorRole),
          type: 'USES_TOKEN',
          from: id,
          to: colorRole,
          evidence: { note: 'role-binding:primary-action' },
        })
      }
    }
    if (component.type === 'button' && component.variant === 'secondary') {
      const rid = ensureRole(nodes, 'action.secondary', 'component', 'Secondary action')
      pushUniqueEdge(edges, {
        id: edgeId('IMPLEMENTS_ROLE', id, rid),
        type: 'IMPLEMENTS_ROLE',
        from: id,
        to: rid,
      })
    }
    if (component.type === 'card') {
      const rid = ensureRole(nodes, 'surface.card', 'component', 'Card surface')
      pushUniqueEdge(edges, {
        id: edgeId('IMPLEMENTS_ROLE', id, rid),
        type: 'IMPLEMENTS_ROLE',
        from: id,
        to: rid,
      })
      const elev = ensureRole(nodes, 'elevation.card', 'semantic', 'Card elevation')
      const shadowToken = [...nodes.values()].find(
        (n) => n.kind === 'token' && n.category === 'shadow'
      )
      if (shadowToken) {
        pushUniqueEdge(edges, {
          id: edgeId('FILLS_ROLE', shadowToken.id, elev),
          type: 'FILLS_ROLE',
          from: shadowToken.id,
          to: elev,
        })
        pushUniqueEdge(edges, {
          id: edgeId('USES_TOKEN', id, shadowToken.id),
          type: 'USES_TOKEN',
          from: id,
          to: shadowToken.id,
        })
      }
    }
    if (component.type === 'nav') {
      const rid = ensureRole(nodes, 'nav.primary', 'component', 'Primary navigation')
      pushUniqueEdge(edges, {
        id: edgeId('IMPLEMENTS_ROLE', id, rid),
        type: 'IMPLEMENTS_ROLE',
        from: id,
        to: rid,
      })
      const layoutNav = 'layout:nav' as GraphId
      if (!nodes.has(layoutNav)) {
        nodes.set(layoutNav, {
          id: layoutNav,
          kind: 'layout',
          category: 'nav',
          confidence: component.confidence,
        })
      }
      pushUniqueEdge(edges, {
        id: edgeId('LOCATED_IN', id, layoutNav),
        type: 'LOCATED_IN',
        from: id,
        to: layoutNav,
      })
    }
  }
}

function synthesizeFallbackComponents(
  nodes: Map<GraphId, GraphNode>,
  edges: GraphEdge[],
  surfaceId: GraphId
) {
  const hasButton = [...nodes.values()].some((n) => n.kind === 'component' && n.type === 'button')
  if (hasButton) return

  const primary = roleId('color.primary')
  const radius = roleId('radius.control')
  const space = roleId('space.sm')
  const id = 'component:button:primary' as GraphId
  nodes.set(id, {
    id,
    kind: 'component',
    type: 'button',
    variant: 'primary',
    confidence: 0.45,
    selectors: ['button', '.btn'],
    states: ['default', 'hover', 'focus', 'disabled'],
  })
  const action = ensureRole(nodes, 'action.primary', 'component', 'Primary action')
  pushUniqueEdge(edges, {
    id: edgeId('IMPLEMENTS_ROLE', id, action),
    type: 'IMPLEMENTS_ROLE',
    from: id,
    to: action,
    evidence: { note: 'synthesized-from-roles' },
  })
  pushUniqueEdge(edges, {
    id: edgeId('APPEARS_IN', id, surfaceId),
    type: 'APPEARS_IN',
    from: id,
    to: surfaceId,
  })
  for (const target of [primary, radius, space]) {
    if (!nodes.has(target)) continue
    pushUniqueEdge(edges, {
      id: edgeId('USES_TOKEN', id, target),
      type: 'USES_TOKEN',
      from: id,
      to: target,
      evidence: { note: 'synthesized-role-link' },
    })
  }

  const cardId = 'component:card:default' as GraphId
  nodes.set(cardId, {
    id: cardId,
    kind: 'component',
    type: 'card',
    confidence: 0.4,
    selectors: ['.card'],
    states: ['default'],
  })
  const surfaceRole = ensureRole(nodes, 'surface.card', 'component', 'Card surface')
  pushUniqueEdge(edges, {
    id: edgeId('IMPLEMENTS_ROLE', cardId, surfaceRole),
    type: 'IMPLEMENTS_ROLE',
    from: cardId,
    to: surfaceRole,
    evidence: { note: 'synthesized-from-roles' },
  })
}

function buildIndex(nodes: GraphNode[], edges: GraphEdge[]): SemanticGraph['index'] {
  const roles: Record<string, GraphId[]> = {}
  const components: Record<string, { roles: GraphId[]; tokens: GraphId[]; layouts: GraphId[] }> = {}
  const tokensByCategory: Record<string, GraphId[]> = {}

  for (const node of nodes) {
    if (node.kind === 'token') {
      tokensByCategory[node.category] = tokensByCategory[node.category] || []
      tokensByCategory[node.category].push(node.id)
    }
    if (node.kind === 'component') {
      components[node.id] = { roles: [], tokens: [], layouts: [] }
    }
    if (node.kind === 'role') {
      roles[node.role] = []
    }
  }

  for (const edge of edges) {
    if (edge.type === 'FILLS_ROLE') {
      const roleNode = nodes.find((n) => n.id === edge.to && n.kind === 'role')
      if (roleNode && roleNode.kind === 'role') {
        roles[roleNode.role] = roles[roleNode.role] || []
        roles[roleNode.role].push(edge.from)
      }
    }
    if (edge.type === 'IMPLEMENTS_ROLE' && components[edge.from]) {
      components[edge.from].roles.push(edge.to)
    }
    if (edge.type === 'USES_TOKEN' && components[edge.from]) {
      components[edge.from].tokens.push(edge.to)
    }
    if (edge.type === 'LOCATED_IN' && components[edge.from]) {
      components[edge.from].layouts.push(edge.to)
    }
  }

  return { roles, components, tokensByCategory }
}

/** Build the semantic design graph from scan artifacts. */
export function buildSemanticGraph(input: SemanticGraphInput): SemanticGraph {
  const nodes = new Map<GraphId, GraphNode>()
  const edges: GraphEdge[] = []

  const surfaceId = 'surface:homepage' as GraphId
  nodes.set(surfaceId, {
    id: surfaceId,
    kind: 'surface',
    label: input.pageTitle || 'homepage',
    url: input.url,
  })

  nodes.set('reference:homepage' as GraphId, {
    id: 'reference:homepage',
    kind: 'reference',
    label: 'Live homepage observation',
    sourceUrl: input.url,
    ownership: 'scan-derived',
  })
  pushUniqueEdge(edges, {
    id: edgeId('REFERENCES', 'reference:homepage', surfaceId),
    type: 'REFERENCES',
    from: 'reference:homepage',
    to: surfaceId,
  })

  addTokenNodes(nodes, 'color', input.curatedTokens.colors)
  addTokenNodes(nodes, 'typography', [
    ...(input.curatedTokens.typography.families ?? []),
    ...(input.curatedTokens.typography.sizes ?? []),
    ...(input.curatedTokens.typography.weights ?? []),
  ])
  addTokenNodes(nodes, 'spacing', input.curatedTokens.spacing)
  addTokenNodes(nodes, 'radius', input.curatedTokens.radius)
  addTokenNodes(nodes, 'shadow', input.curatedTokens.shadows)
  addTokenNodes(nodes, 'motion', input.curatedTokens.motion)

  // Every token appears on the homepage surface
  for (const node of nodes.values()) {
    if (node.kind !== 'token') continue
    pushUniqueEdge(edges, {
      id: edgeId('APPEARS_IN', node.id, surfaceId),
      type: 'APPEARS_IN',
      from: node.id,
      to: surfaceId,
      weight: node.usage / Math.max(node.usage, 1),
    })
  }

  assignColorRoles(nodes, edges, input.curatedTokens.colors ?? [], input.brandAnalysis)
  assignTypeRoles(nodes, edges, input.curatedTokens.typography)
  assignScaleRoles(
    nodes,
    edges,
    input.curatedTokens.spacing,
    ['space.xs', 'space.sm', 'space.md', 'space.lg', 'space.xl'],
    'spacing'
  )
  assignScaleRoles(
    nodes,
    edges,
    input.curatedTokens.radius,
    ['radius.control', 'radius.surface'],
    'radius'
  )

  addPatternNodes(nodes, edges, input.curatedTokens)
  addLayoutNodes(nodes, edges, input.layoutDNA, surfaceId)

  const heuristics = extractHeuristicComponents(input.cssSources)
  linkComponents(nodes, edges, heuristics, surfaceId)
  synthesizeFallbackComponents(nodes, edges, surfaceId)

  const nodeList = Array.from(nodes.values())
  const index = buildIndex(nodeList, edges)

  return {
    schemaVersion: SEMANTIC_GRAPH_SCHEMA_VERSION,
    domain: input.domain.replace(/^www\./, ''),
    sourceUrl: input.url,
    scanId: input.scanId,
    generatedAt: new Date().toISOString(),
    summary: {
      nodeCount: nodeList.length,
      edgeCount: edges.length,
      tokenCount: nodeList.filter((n) => n.kind === 'token').length,
      roleCount: nodeList.filter((n) => n.kind === 'role').length,
      componentCount: nodeList.filter((n) => n.kind === 'component').length,
      layoutCount: nodeList.filter((n) => n.kind === 'layout').length,
      patternCount: nodeList.filter((n) => n.kind === 'pattern').length,
    },
    nodes: nodeList,
    edges,
    index,
  }
}

/** AI-readable markdown narrative of the graph for DESIGN.md / pack. */
export function semanticGraphToMarkdown(graph: SemanticGraph): string {
  const roles = graph.nodes.filter((n) => n.kind === 'role')
  const components = graph.nodes.filter((n) => n.kind === 'component')
  const patterns = graph.nodes.filter((n) => n.kind === 'pattern')
  const layouts = graph.nodes.filter((n) => n.kind === 'layout')

  const lines: string[] = [
    '# Semantic Design Graph',
    '',
    `Machine-readable system model for **${graph.domain}**.`,
    `Nodes: ${graph.summary.nodeCount} · Edges: ${graph.summary.edgeCount} · Components: ${graph.summary.componentCount} · Roles: ${graph.summary.roleCount}`,
    '',
    'Agents should treat this graph as the linkage layer between tokens, roles, components, and layout.',
    'Prefer traversing edges (`FILLS_ROLE`, `USES_TOKEN`, `IMPLEMENTS_ROLE`, `LOCATED_IN`) over inventing mappings.',
    '',
    '## Role → tokens',
    '',
  ]

  for (const role of roles) {
    if (role.kind !== 'role') continue
    const fillers = graph.index.roles[role.role] || []
    const tokenLabels = fillers
      .map((id) => graph.nodes.find((n) => n.id === id))
      .filter((n): n is Extract<GraphNode, { kind: 'token' }> => n?.kind === 'token')
      .map((t) => `\`${t.value}\` (${t.name})`)
    lines.push(
      `- **${role.role}** (${role.layer}): ${tokenLabels.length ? tokenLabels.join(', ') : '_unbound_'}`
    )
  }

  lines.push('', '## Components', '')
  for (const component of components) {
    if (component.kind !== 'component') continue
    const linked = graph.index.components[component.id]
    const roleNames = (linked?.roles || [])
      .map((id) => {
        const node = graph.nodes.find((n) => n.id === id)
        return node?.kind === 'role' ? node.role : id
      })
      .join(', ')
    const tokenValues = (linked?.tokens || [])
      .map((id) => {
        const node = graph.nodes.find((n) => n.id === id)
        if (node?.kind === 'token') return `\`${node.value}\``
        if (node?.kind === 'role') return `{${node.role}}`
        return id
      })
      .slice(0, 8)
      .join(', ')
    lines.push(
      `### ${component.type}${component.variant ? ` / ${component.variant}` : ''}`,
      '',
      `- Confidence: ${Math.round(component.confidence * 100)}%`,
      `- Selectors: ${component.selectors.map((s) => `\`${s}\``).join(', ') || '_n/a_'}`,
      `- Implements: ${roleNames || '_none_'}`,
      `- Uses: ${tokenValues || '_none_'}`,
      ''
    )
  }

  if (patterns.length) {
    lines.push('## Patterns', '')
    for (const pattern of patterns) {
      if (pattern.kind !== 'pattern') continue
      lines.push(
        `- **${pattern.patternType}** — ${pattern.label} (${Math.round(pattern.confidence * 100)}%)`
      )
    }
    lines.push('')
  }

  if (layouts.length) {
    lines.push('## Layout', '')
    for (const layout of layouts) {
      if (layout.kind !== 'layout') continue
      const evidence = layout.evidence
        ? Object.entries(layout.evidence)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
        : ''
      lines.push(
        `- **${layout.category}**${layout.breakpoint !== undefined ? ` @ ${layout.breakpoint}` : ''}${evidence ? ` — ${evidence}` : ''}`
      )
    }
    lines.push('')
  }

  lines.push(
    '## Edge legend',
    '',
    '- `FILLS_ROLE` — token fills a semantic role',
    '- `USES_TOKEN` — component consumes a token or role',
    '- `IMPLEMENTS_ROLE` — component is the interaction surface for a role',
    '- `MEMBER_OF` — token belongs to a palette/scale pattern',
    '- `LOCATED_IN` / `APPEARS_IN` — placement on layout/surface',
    '- `REFERENCES` — visual reference points at a surface',
    '',
    'Canonical machine form: `design/graph.json`.',
    ''
  )

  return lines.join('\n')
}

/** Component YAML fragment for DESIGN.md front matter, derived from the graph. */
export function componentsYamlFromGraph(graph: SemanticGraph): string[] {
  const lines: string[] = ['components:']
  const components = graph.nodes.filter((n) => n.kind === 'component')

  const roleToken = (role: RoleId): string | null => {
    const fillers = graph.index.roles[role] || []
    const token = fillers
      .map((id) => graph.nodes.find((n) => n.id === id))
      .find((n): n is Extract<GraphNode, { kind: 'token' }> => n?.kind === 'token')
    return token ? String(token.value) : null
  }

  const primaryBg = roleToken('color.primary') || '#0F172A'
  const secondaryBg = roleToken('color.secondary') || roleToken('color.accent') || primaryBg
  const neutral = roleToken('color.bg') || roleToken('color.muted') || '#F8FAFC'
  const fg = roleToken('color.fg') || primaryBg
  const radiusControl = roleToken('radius.control') || '8px'
  const radiusSurface = roleToken('radius.surface') || radiusControl
  const pad = roleToken('space.sm') || '8px'
  const cardPad = roleToken('space.md') || '16px'

  const yamlVal = (value: string) =>
    /[:#{}[\],&*?|>!%@"`]/.test(value) || value.includes(' ')
      ? `"${value.replace(/"/g, '\\"')}"`
      : value

  lines.push('  button-primary:')
  lines.push(`    backgroundColor: ${yamlVal(primaryBg)}`)
  lines.push(`    textColor: ${yamlVal(neutral)}`)
  lines.push(`    rounded: ${yamlVal(radiusControl)}`)
  lines.push(`    padding: ${yamlVal(pad)}`)
  lines.push('  button-secondary:')
  lines.push(`    backgroundColor: ${yamlVal(secondaryBg)}`)
  lines.push(`    textColor: ${yamlVal(neutral)}`)
  lines.push(`    rounded: ${yamlVal(radiusControl)}`)
  lines.push(`    padding: ${yamlVal(pad)}`)
  lines.push('  surface-card:')
  lines.push(`    backgroundColor: ${yamlVal(neutral)}`)
  lines.push(`    textColor: ${yamlVal(fg)}`)
  lines.push(`    rounded: ${yamlVal(radiusSurface)}`)
  lines.push(`    padding: ${yamlVal(cardPad)}`)

  for (const component of components) {
    if (component.kind !== 'component') continue
    if (component.type === 'button' || component.type === 'card') continue
    const key = `${component.type}${component.variant ? `-${component.variant}` : ''}`
      .replace(/[^a-z0-9-]/gi, '-')
      .toLowerCase()
    lines.push(`  ${key}:`)
    lines.push(`    # detected selectors: ${component.selectors.slice(0, 3).join(', ')}`)
    lines.push(`    # confidence: ${component.confidence}`)
    const linked = graph.index.components[component.id]
    const firstToken = (linked?.tokens || [])
      .map((id) => graph.nodes.find((n) => n.id === id))
      .find((n): n is Extract<GraphNode, { kind: 'token' }> => n?.kind === 'token')
    if (firstToken?.category === 'color') {
      lines.push(`    color: ${yamlVal(firstToken.value)}`)
    }
  }

  return lines
}

/** Slim graph for API clients (keeps structure, drops bulky evidence). */
export function slimSemanticGraph(graph: SemanticGraph): SemanticGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      evidence: edge.evidence
        ? {
            note: edge.evidence.note,
            properties: edge.evidence.properties,
            selectors: edge.evidence.selectors?.slice(0, 2),
          }
        : undefined,
    })),
    nodes: graph.nodes.map((node) => {
      if (node.kind === 'component') {
        return {
          ...node,
          selectors: node.selectors.slice(0, 4),
        }
      }
      return node
    }),
  }
}
