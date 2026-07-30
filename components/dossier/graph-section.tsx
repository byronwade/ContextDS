'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseColor } from '@/lib/analyzers/design-philosophy'
import { SectionShell, downloadText } from './shared'

type AnyNode = {
  id: string
  kind: 'token' | 'role' | 'component' | 'layout' | 'pattern' | 'surface' | 'reference'
  category?: string
  name?: string
  value?: string
  usage?: number
  confidence?: number
  role?: string
  label?: string
  type?: string
  variant?: string
  patternType?: string
}

type AnyEdge = {
  id: string
  type: string
  from: string
  to: string
  weight?: number
}

type GraphLike = {
  summary: {
    nodeCount: number
    edgeCount: number
    tokenCount: number
    roleCount: number
    componentCount: number
    layoutCount: number
    patternCount: number
  }
  nodes?: unknown[]
  edges?: unknown[]
}

const COLUMN_X = { token: 150, role: 420, component: 690, meta: 940 }
const ROW_H = 34
const NODE_W = { token: 220, role: 190, component: 200, meta: 180 }

function nodeLabel(node: AnyNode): string {
  switch (node.kind) {
    case 'token':
      return node.name || node.value || node.id
    case 'role':
      return node.label || node.role || node.id
    case 'component':
      return node.variant ? `${node.type} · ${node.variant}` : node.type || node.id
    case 'pattern':
      return node.label || node.patternType || node.id
    case 'layout':
      return node.category || node.id
    default:
      return node.label || node.id
  }
}

export function GraphSection({
  graph,
  domain,
}: {
  graph: GraphLike
  domain: string
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  const model = useMemo(() => {
    const nodes = ((graph.nodes ?? []) as AnyNode[]).filter(
      (node) => node && typeof node === 'object' && 'id' in node
    )
    const edges = ((graph.edges ?? []) as AnyEdge[]).filter(
      (edge) => edge && typeof edge === 'object' && 'from' in edge && 'to' in edge
    )

    const tokens = nodes
      .filter((node) => node.kind === 'token')
      .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
      .slice(0, 14)
    const roles = nodes.filter((node) => node.kind === 'role').slice(0, 14)
    const components = nodes
      .filter((node) => node.kind === 'component')
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 12)
    const meta = nodes
      .filter((node) => node.kind === 'pattern' || node.kind === 'layout')
      .slice(0, 10)

    const position = new Map<string, { x: number; y: number; column: keyof typeof COLUMN_X }>()
    const place = (list: AnyNode[], column: keyof typeof COLUMN_X, offset: number) => {
      list.forEach((node, index) => {
        position.set(node.id, {
          x: COLUMN_X[column],
          y: offset + index * ROW_H + ROW_H / 2,
          column,
        })
      })
    }
    const height =
      Math.max(tokens.length, roles.length, components.length, meta.length, 6) * ROW_H + 48
    const center = (count: number) => Math.max(24, (height - count * ROW_H) / 2)
    place(tokens, 'token', center(tokens.length))
    place(roles, 'role', center(roles.length))
    place(components, 'component', center(components.length))
    place(meta, 'meta', center(meta.length))

    const visibleEdges = edges.filter(
      (edge) => position.has(edge.from) && position.has(edge.to)
    )
    return { tokens, roles, components, meta, position, visibleEdges, height }
  }, [graph])

  const connected = useMemo(() => {
    if (!hoverId) return null
    const ids = new Set<string>([hoverId])
    for (const edge of model.visibleEdges) {
      if (edge.from === hoverId) ids.add(edge.to)
      if (edge.to === hoverId) ids.add(edge.from)
    }
    return ids
  }, [hoverId, model.visibleEdges])

  const hasDrawable = model.visibleEdges.length > 0 && model.tokens.length > 0

  const renderNode = (node: AnyNode) => {
    const pos = model.position.get(node.id)
    if (!pos) return null
    const width = NODE_W[pos.column]
    const dimmed = connected ? !connected.has(node.id) : false
    const swatch = node.kind === 'token' && node.category === 'color' ? parseColor(node.value ?? '') : null
    return (
      <g
        key={node.id}
        transform={`translate(${pos.x - width / 2}, ${pos.y - 13})`}
        opacity={dimmed ? 0.25 : 1}
        onMouseEnter={() => setHoverId(node.id)}
        onMouseLeave={() => setHoverId(null)}
        style={{ cursor: 'default', transition: 'opacity 150ms ease' }}
      >
        <rect
          width={width}
          height={26}
          rx={13}
          fill={
            node.kind === 'role'
              ? 'oklch(0.78 0.08 185 / 0.1)'
              : 'var(--card)'
          }
          stroke={
            hoverId === node.id
              ? 'oklch(0.78 0.08 185 / 0.8)'
              : node.kind === 'role'
                ? 'oklch(0.78 0.08 185 / 0.35)'
                : 'var(--soft-border, oklch(1 0 0 / 0.1))'
          }
          strokeWidth={1}
        />
        {swatch ? (
          <circle cx={16} cy={13} r={6} fill={swatch.hex} stroke="oklch(1 0 0 / 0.2)" />
        ) : null}
        <text
          x={swatch ? 28 : 14}
          y={17}
          fontSize={11}
          fontFamily="var(--font-geist-mono), monospace"
          fill={node.kind === 'role' ? 'oklch(0.78 0.08 185)' : 'var(--foreground)'}
        >
          {nodeLabel(node).slice(0, width === 220 ? 26 : 22)}
        </text>
      </g>
    )
  }

  return (
    <SectionShell
      id="graph"
      overline={`Semantic graph · ${graph.summary.nodeCount} nodes · ${graph.summary.edgeCount} edges`}
      title="How the system links together"
      lede="Tokens fill semantic roles, components implement those roles, and layout patterns place the components. Agents consume this graph — not a flat token dump — so generated UI matches how the site actually composes itself. Hover a node to trace its connections."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            downloadText(
              `${domain}-graph.json`,
              JSON.stringify(graph, null, 2),
              'application/json'
            )
          }
        >
          <Download className="size-3.5" />
          graph.json
        </Button>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ['Tokens', graph.summary.tokenCount],
            ['Roles', graph.summary.roleCount],
            ['Components', graph.summary.componentCount],
            ['Layouts', graph.summary.layoutCount],
            ['Patterns', graph.summary.patternCount],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[color:var(--soft-border)] bg-card/40 px-4 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 font-mono text-xl text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {hasDrawable ? (
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--soft-border)] bg-card/30">
          <svg
            viewBox={`0 0 1080 ${model.height}`}
            className="h-auto w-full min-w-[760px]"
            role="img"
            aria-label="Semantic design graph: tokens connected to roles, components and patterns"
          >
            <g transform="translate(0, 6)">
              {(
                [
                  ['TOKENS', COLUMN_X.token],
                  ['ROLES', COLUMN_X.role],
                  ['COMPONENTS', COLUMN_X.component],
                  ['PATTERNS & LAYOUT', COLUMN_X.meta],
                ] as const
              ).map(([label, x]) => (
                <text
                  key={label}
                  x={x}
                  y={10}
                  textAnchor="middle"
                  fontSize={9}
                  letterSpacing={2}
                  fontFamily="var(--font-geist-mono), monospace"
                  fill="var(--muted-foreground)"
                >
                  {label}
                </text>
              ))}
            </g>
            {model.visibleEdges.map((edge) => {
              const from = model.position.get(edge.from)!
              const to = model.position.get(edge.to)!
              const [a, b] = from.x <= to.x ? [from, to] : [to, from]
              const x1 = a.x + NODE_W[a.column] / 2
              const x2 = b.x - NODE_W[b.column] / 2
              const mx = (x1 + x2) / 2
              const isHot =
                hoverId !== null && (edge.from === hoverId || edge.to === hoverId)
              const dim = connected !== null && !isHot
              return (
                <path
                  key={edge.id}
                  d={`M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`}
                  fill="none"
                  stroke={
                    isHot ? 'oklch(0.78 0.08 185 / 0.9)' : 'oklch(0.78 0.08 185 / 0.18)'
                  }
                  strokeWidth={isHot ? 1.6 : 1}
                  opacity={dim ? 0.15 : 1}
                  style={{ transition: 'opacity 150ms ease, stroke 150ms ease' }}
                />
              )
            })}
            {[...model.tokens, ...model.roles, ...model.components, ...model.meta].map(
              renderNode
            )}
          </svg>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
          Node-level graph data isn&apos;t stored for this scan — re-scan to rebuild the
          full semantic graph. Summary counts above reflect the last analysis.
        </p>
      )}
    </SectionShell>
  )
}
