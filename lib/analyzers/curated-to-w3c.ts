/**
 * Project a slim CuratedTokenSet (or ScanVersion snapshot) into a W3C-shaped
 * token tree so `compareTokenSets` can run without Postgres.
 */

import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'
import type { W3CTokenSet } from '@/lib/analyzers/w3c-tokenizer'

type SlimToken = { name?: string; value?: unknown }

export type CuratedSnapshot = {
  colors?: SlimToken[]
  typography?: {
    families?: SlimToken[]
    sizes?: SlimToken[]
    weights?: SlimToken[]
  }
  spacing?: SlimToken[]
  radius?: SlimToken[]
  shadows?: SlimToken[]
  motion?: SlimToken[]
}

function leaf(value: unknown, type: string): { $type: string; $value: unknown } {
  return { $type: type, $value: value }
}

function slugKey(raw: string, fallback: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || fallback
}

function putGroup(
  root: Record<string, unknown>,
  category: string,
  tokens: SlimToken[] | undefined,
  type: string
): void {
  if (!tokens?.length) return
  const group: Record<string, unknown> = {}
  tokens.forEach((token, index) => {
    const value = token.value
    if (value === undefined || value === null || value === '') return
    const key = slugKey(String(token.name || value), `${category}-${index + 1}`)
    group[key] = leaf(value, type)
  })
  if (Object.keys(group).length > 0) {
    root[category] = group
  }
}

/** Build a minimal W3C token set from curated / version snapshot tokens. */
export function curatedToW3CTokenSet(
  curated: CuratedTokenSet | CuratedSnapshot | null | undefined,
  meta?: { name?: string; url?: string }
): W3CTokenSet {
  const root: Record<string, unknown> = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $metadata: {
      name: meta?.name || 'scan-version',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: {
        url: meta?.url || 'scan-version',
        cssSources: [],
      },
    },
  }

  putGroup(root, 'color', curated?.colors, 'color')
  putGroup(root, 'fontFamily', curated?.typography?.families, 'fontFamily')
  putGroup(root, 'fontSize', curated?.typography?.sizes, 'dimension')
  putGroup(root, 'fontWeight', curated?.typography?.weights, 'fontWeight')
  putGroup(root, 'spacing', curated?.spacing, 'dimension')
  putGroup(root, 'radius', curated?.radius, 'dimension')
  putGroup(root, 'shadow', curated?.shadows, 'shadow')
  putGroup(root, 'duration', curated?.motion, 'duration')

  return root as unknown as W3CTokenSet
}
