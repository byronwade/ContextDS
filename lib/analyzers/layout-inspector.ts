import postcss, { type AtRule, type Node as PostcssNode, type Rule as PostcssRule } from 'postcss'
import safeParser from 'postcss-safe-parser'
import type { CssSource } from '@/lib/extractors/static-css'

export type LayoutDNA = {
  containers: {
    maxWidth: string | null
    strategy: 'centered' | 'fluid' | 'fixed'
    responsive: boolean
    snapshots: ContainerSnapshot[]
  }
  gridSystem: 'flexbox' | 'grid' | 'mixed' | 'classic'
  spacingBase: number | null
  breakpoints: number[]
  archetypes: Array<{
    type: string
    confidence: number
  }>
  wireframe?: {
    sections: import('@/lib/analyzers/layout-wireframe').WireframeSection[]
  }
}

type ContainerSnapshot = {
  breakpoint: number | 'base'
  selectors: string[]
  maxWidth?: string
  minWidth?: string
  gridTemplateColumns?: string
  gridTemplateRows?: string
  gap?: string
}

export function analyzeLayout(sources: CssSource[]): LayoutDNA {
  const css = sources.map((source) => source.content).join('\n')

  const root = postcss.parse(css, { parser: safeParser })
  const containerSnapshots = collectContainerSnapshots(root)

  const containerWidths = deriveContainerWidths(css, containerSnapshots)
  const hasFlex = /display\s*:\s*flex/.test(css)
  const hasGrid = /display\s*:\s*grid/.test(css)
  const breakpoints = mergeBreakpoints(extractBreakpoints(css), containerSnapshots)
  const spacingBase = inferSpacingBase(css)

  const archetypes = buildArchetypeGuesses({ hasFlex, hasGrid, breakpoints })

  return {
    containers: {
      maxWidth: containerWidths[0] ?? null,
      strategy: inferContainerStrategy(containerWidths, breakpoints),
      responsive: breakpoints.length > 0,
      snapshots: containerSnapshots.slice(0, 50)
    },
    gridSystem: inferGridSystem(hasFlex, hasGrid),
    spacingBase,
    breakpoints,
    archetypes
  }
}

function deriveContainerWidths(css: string, snapshots: ContainerSnapshot[]): string[] {
  const snapshotWidths = snapshots
    .map((snapshot) => snapshot.maxWidth)
    .filter((width): width is string => Boolean(width))

  if (snapshotWidths.length > 0) {
    return Array.from(new Set(snapshotWidths))
  }

  return extractContainerWidthsFromCss(css)
}

function extractContainerWidthsFromCss(css: string): string[] {
  const widths = new Set<string>()
  const regex = /max-width\s*:\s*([^;]+);/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(css)) !== null) {
    widths.add(match[1].trim())
  }
  return Array.from(widths).slice(0, 5)
}

function extractBreakpoints(css: string): number[] {
  const values: number[] = []
  const regex = /@media\s*(?:screen\s*)?and\s*\(\s*min-width\s*:\s*(\d+)px\s*\)/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(css)) !== null) {
    const value = Number(match[1])
    if (Number.isFinite(value)) {
      values.push(value)
    }
  }
  return Array.from(new Set(values)).sort((a, b) => a - b)
}

function mergeBreakpoints(breakpoints: number[], snapshots: ContainerSnapshot[]): number[] {
  const merged = new Set(breakpoints)
  snapshots.forEach((snapshot) => {
    if (typeof snapshot.breakpoint === 'number') {
      merged.add(snapshot.breakpoint)
    }
  })
  return Array.from(merged).sort((a, b) => a - b)
}

function collectContainerSnapshots(root: postcss.Root): ContainerSnapshot[] {
  const snapshots = new Map<string, ContainerSnapshot>()

  root.walkRules((rule: PostcssRule) => {
    if (!rule.selector) return
    const selectors = rule.selector
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean)
      .slice(0, 4)

    if (selectors.length === 0) return

    const breakpoint = findBreakpoint(rule)

    rule.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase()
      if (
        prop !== 'max-width' &&
        prop !== 'min-width' &&
        prop !== 'grid-template-columns' &&
        prop !== 'grid-template-rows' &&
        prop !== 'gap' &&
        prop !== 'grid-gap'
      ) {
        return
      }

      const value = decl.value.trim()
      selectors.forEach((selector) => {
        const key = `${breakpoint}:${selector}`
        const snapshot = snapshots.get(key) ?? {
          breakpoint,
          selectors: [selector]
        }

        switch (prop) {
          case 'max-width':
            snapshot.maxWidth = value
            break
          case 'min-width':
            snapshot.minWidth = value
            break
          case 'grid-template-columns':
            snapshot.gridTemplateColumns = value
            break
          case 'grid-template-rows':
            snapshot.gridTemplateRows = value
            break
          case 'gap':
          case 'grid-gap':
            snapshot.gap = value
            break
        }

        snapshots.set(key, snapshot)
      })
    })
  })

  return Array.from(snapshots.values()).filter((snapshot) =>
    Boolean(
      snapshot.maxWidth ||
        snapshot.minWidth ||
        snapshot.gridTemplateColumns ||
        snapshot.gridTemplateRows ||
        snapshot.gap
    )
  )
}

function findBreakpoint(rule: PostcssRule): number | 'base' {
  let current: PostcssNode | undefined | null = rule.parent
  while (current) {
    if (current.type === 'atrule') {
      const atRule = current as AtRule
      if (atRule.name === 'media') {
        const match = atRule.params.match(/min-width\s*:\s*(\d+)px/i)
        if (match) {
          const value = Number(match[1])
          if (Number.isFinite(value)) {
            return value
          }
        }
      }
    }
    current = current.parent
  }
  return 'base'
}

function inferSpacingBase(css: string): number | null {
  const regex = /(\d+(?:\.\d+)?)px/g
  const counts = new Map<number, number>()
  let match: RegExpExecArray | null
  while ((match = regex.exec(css)) !== null) {
    const value = Number(match[1])
    if (!Number.isFinite(value) || value === 0) continue
    const base = normalizeSpacingValue(value)
    counts.set(base, (counts.get(base) ?? 0) + 1)
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

function normalizeSpacingValue(value: number): number {
  const candidates = [2, 4, 5, 6, 8, 10]
  for (const candidate of candidates) {
    if (Number.isInteger(value / candidate)) {
      return candidate
    }
  }
  return Math.round(value)
}

function inferGridSystem(hasFlex: boolean, hasGrid: boolean): LayoutDNA['gridSystem'] {
  if (hasFlex && hasGrid) return 'mixed'
  if (hasGrid) return 'grid'
  if (hasFlex) return 'flexbox'
  return 'classic'
}

function inferContainerStrategy(widths: string[], breakpoints: number[]): LayoutDNA['containers']['strategy'] {
  if (widths.length === 0) {
    return breakpoints.length > 0 ? 'fluid' : 'fixed'
  }
  const firstWidth = widths[0]
  if (/\b%\b/.test(firstWidth) || /vw/.test(firstWidth)) {
    return 'fluid'
  }
  if (/px/.test(firstWidth)) {
    return breakpoints.length > 0 ? 'centered' : 'fixed'
  }
  return 'centered'
}

function buildArchetypeGuesses(options: { hasFlex: boolean; hasGrid: boolean; breakpoints: number[] }) {
  const guesses: LayoutDNA['archetypes'] = []

  if (options.hasGrid) {
    guesses.push({ type: 'feature-grid', confidence: 65 })
  }
  if (options.hasFlex) {
    guesses.push({ type: 'marketing-hero', confidence: 55 })
  }
  if (options.breakpoints.length >= 3) {
    guesses.push({ type: 'responsive-pricing', confidence: 45 })
  }
  if (guesses.length === 0) {
    guesses.push({ type: 'content', confidence: 35 })
  }

  return guesses.slice(0, 3)
}
