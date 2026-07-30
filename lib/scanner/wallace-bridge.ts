/**
 * Correct Project Wallace → curated token bridge.
 * Wallace stores metrics under `values.*` (not top-level colors/fonts).
 */

import { analyze } from '@projectwallace/css-analyzer'
import type { CuratedToken, CuratedTokenSet } from '@/lib/analyzers/token-curator'

type UniqueMap = Record<string, number>

function uniqueEntries(
  bucket: { unique?: UniqueMap; total?: number } | undefined
): Array<[string, number]> {
  if (!bucket?.unique || typeof bucket.unique !== 'object') return []
  return Object.entries(bucket.unique)
    .filter(
      ([value]) => value && value !== 'transparent' && value !== 'inherit' && value !== 'initial'
    )
    .sort((a, b) => b[1] - a[1])
}

function toToken(
  name: string,
  value: string,
  usage: number,
  total: number,
  category: string,
  semantic?: string
): CuratedToken {
  const confidence = Math.min(98, Math.round(55 + (usage / Math.max(total, 1)) * 40))
  return {
    name,
    value,
    usage,
    confidence,
    percentage: Math.round((usage / Math.max(total, 1)) * 100),
    category,
    semantic,
  }
}

function slug(value: string, fallback: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return cleaned || fallback
}

/** Extract spacing-like dimensions from unit values when present. */
function extractSpacingFromUnits(analysis: ReturnType<typeof analyze>): CuratedToken[] {
  const units = (analysis.values as { units?: { unique?: UniqueMap; total?: number } })?.units
  const entries = uniqueEntries(units)
  const spacing: CuratedToken[] = []
  let i = 0
  for (const [value, usage] of entries) {
    if (!/^\d+(\.\d+)?(px|rem|em)$/.test(value)) continue
    const n = Number.parseFloat(value)
    if (!Number.isFinite(n) || n <= 0 || n > 128) continue
    spacing.push(
      toToken(
        `space-${slug(value, String(++i))}`,
        value,
        usage,
        units?.total || entries.length,
        'spacing'
      )
    )
    if (spacing.length >= 24) break
  }
  return spacing
}

export function analyzeWithWallace(css: string): {
  curated: CuratedTokenSet
  meta: {
    rules: number
    selectors: number
    declarations: number
    engine: 'project-wallace'
  }
} {
  const analysis = analyze(css || '/* empty */')
  const values = analysis.values as {
    colors?: { unique?: UniqueMap; total?: number }
    fontFamilies?: { unique?: UniqueMap; total?: number }
    fontSizes?: { unique?: UniqueMap; total?: number }
    lineHeights?: { unique?: UniqueMap; total?: number }
    borderRadiuses?: { unique?: UniqueMap; total?: number }
    boxShadows?: { unique?: UniqueMap; total?: number }
    animations?: { unique?: UniqueMap; total?: number }
  }

  const colorEntries = uniqueEntries(values.colors)
  const colors = colorEntries
    .slice(0, 32)
    .map(([value, usage], index) =>
      toToken(
        `color-${slug(value, String(index + 1))}`,
        value,
        usage,
        values.colors?.total || colorEntries.length,
        'color'
      )
    )

  const familyEntries = uniqueEntries(values.fontFamilies)
  const families = familyEntries
    .slice(0, 10)
    .map(([value, usage], index) =>
      toToken(
        `font-${slug(value.split(',')[0] || value, String(index + 1))}`,
        value,
        usage,
        values.fontFamilies?.total || familyEntries.length,
        'typography',
        'family'
      )
    )

  const sizeEntries = uniqueEntries(values.fontSizes)
  const sizes = sizeEntries
    .slice(0, 16)
    .map(([value, usage], index) =>
      toToken(
        `size-${slug(value, String(index + 1))}`,
        value,
        usage,
        values.fontSizes?.total || sizeEntries.length,
        'typography',
        'size'
      )
    )

  const weightEntries = uniqueEntries(
    (
      analysis.declarations as {
        byProperty?: Record<string, Array<{ value: string; count?: number }>>
      }
    )?.byProperty?.['font-weight']
      ? {
          unique: Object.fromEntries(
            (
              (
                analysis.declarations as {
                  byProperty: Record<string, Array<{ value: string; count?: number }>>
                }
              ).byProperty['font-weight'] || []
            ).map((decl) => [decl.value, decl.count || 1])
          ),
          total: (
            (
              analysis.declarations as {
                byProperty: Record<string, Array<{ value: string; count?: number }>>
              }
            ).byProperty['font-weight'] || []
          ).reduce((sum, decl) => sum + (decl.count || 1), 0),
        }
      : undefined
  )

  // Fallback: derive weights from common literals if byProperty missing
  const weights =
    weightEntries.length > 0
      ? weightEntries.slice(0, 8).map(([value, usage], index) =>
          toToken(
            `weight-${slug(value, String(index + 1))}`,
            value,
            usage,
            weightEntries.reduce((s, [, u]) => s + u, 0),
            'typography',
            'weight'
          )
        )
      : []

  const radiusEntries = uniqueEntries(values.borderRadiuses)
  const radius = radiusEntries
    .slice(0, 12)
    .map(([value, usage], index) =>
      toToken(
        `radius-${slug(value, String(index + 1))}`,
        value,
        usage,
        values.borderRadiuses?.total || radiusEntries.length,
        'radius'
      )
    )

  const shadowEntries = uniqueEntries(values.boxShadows)
  const shadows = shadowEntries
    .slice(0, 10)
    .map(([value, usage], index) =>
      toToken(
        `shadow-${slug(value, String(index + 1))}`,
        value,
        usage,
        values.boxShadows?.total || shadowEntries.length,
        'shadow'
      )
    )

  const motionEntries = uniqueEntries(values.animations)
  const motion = motionEntries
    .slice(0, 10)
    .map(([value, usage], index) =>
      toToken(
        `motion-${slug(value, String(index + 1))}`,
        value,
        usage,
        values.animations?.total || motionEntries.length,
        'motion'
      )
    )

  const spacing = extractSpacingFromUnits(analysis)

  return {
    curated: {
      colors,
      typography: { families, sizes, weights },
      spacing,
      radius,
      shadows,
      motion,
      metadata: {
        wallace: {
          rules: analysis.rules?.total ?? 0,
          selectors: analysis.selectors?.total ?? 0,
          declarations: analysis.declarations?.total ?? 0,
        },
      },
    },
    meta: {
      rules: analysis.rules?.total ?? 0,
      selectors: analysis.selectors?.total ?? 0,
      declarations: analysis.declarations?.total ?? 0,
      engine: 'project-wallace',
    },
  }
}

/** Merge Wallace + W3C curated sets, preferring higher usage / confidence. */
export function mergeCuratedSets(
  primary: CuratedTokenSet,
  secondary: CuratedTokenSet
): CuratedTokenSet {
  const mergeList = (a: CuratedToken[] = [], b: CuratedToken[] = [], limit = 24) => {
    const map = new Map<string, CuratedToken>()
    for (const token of [...a, ...b]) {
      const key = String(token.value).toLowerCase()
      const existing = map.get(key)
      if (!existing || (token.usage ?? 0) > (existing.usage ?? 0)) {
        map.set(key, token)
      }
    }
    return Array.from(map.values())
      .sort((x, y) => (y.usage ?? 0) - (x.usage ?? 0))
      .slice(0, limit)
  }

  return {
    colors: mergeList(primary.colors, secondary.colors, 32),
    typography: {
      families: mergeList(primary.typography.families, secondary.typography.families, 10),
      sizes: mergeList(primary.typography.sizes, secondary.typography.sizes, 16),
      weights: mergeList(primary.typography.weights, secondary.typography.weights, 8),
    },
    spacing: mergeList(primary.spacing, secondary.spacing, 20),
    radius: mergeList(primary.radius, secondary.radius, 12),
    shadows: mergeList(primary.shadows, secondary.shadows, 10),
    motion: mergeList(primary.motion, secondary.motion, 10),
    metadata: {
      ...(primary.metadata || {}),
      ...(secondary.metadata || {}),
      merged: true,
    },
  }
}
