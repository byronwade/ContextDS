/**
 * Render-audit reconciliation.
 *
 * The scanner's DOM audit measures what the page ACTUALLY paints — computed
 * colors/fonts/sizes/spacing weighted by on-screen area and text mass. This
 * module folds that ground truth back into the CSS-derived curated token set:
 *
 *  - curated values are normalized + deduped (e.g. #fff / #ffffff / rgb(...))
 *  - tokens seen on the live page get rendered usage weights + confidence
 *  - tokens only found in CSS text are demoted as dormant
 *  - dominant rendered values the CSS pass missed are added
 *  - a coverage score reports how well the extraction matches the real page
 */

import { parseColor } from '@/lib/analyzers/design-philosophy'
import type { CuratedToken, CuratedTokenSet } from '@/lib/analyzers/token-curator'

export type RenderAudit = {
  viewport: { width: number; height: number }
  elementCount: number
  pagesAudited?: number
  colors: Array<{ kind: string; value: string; weight: number }>
  fonts: Array<{ value: string; weight: number }>
  fontSizes: Array<{ value: string; weight: number }>
  fontWeights: Array<{ value: string; weight: number }>
  spacing: Array<{ value: string; weight: number }>
  radius: Array<{ value: string; weight: number }>
  shadows: Array<{ value: string; weight: number }>
  loadedFonts: string[]
}

export type RenderCoverage = {
  overall: number
  colors: number
  fonts: number
  sizes: number
  verifiedColors: number
  dormantColors: number
  addedFromRender: number
  elementCount: number
  pagesAudited: number
}

type Rgb = { r: number; g: number; b: number }

function rgbDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 * 0.3 + (a.g - b.g) ** 2 * 0.59 + (a.b - b.b) ** 2 * 0.11
  )
}

function primaryFamily(stack: string): string {
  return stack.split(',')[0].replace(/['"]/g, '').trim().toLowerCase()
}

function pxKey(value: string | object): string | null {
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? `${Math.round(n)}px` : null
}

/** Normalize + dedupe curated colors by parsed hex, merging usage. */
function dedupeColors(tokens: CuratedToken[]): CuratedToken[] {
  const byHex = new Map<string, CuratedToken>()
  const passthrough: CuratedToken[] = []
  for (const token of tokens) {
    const parsed = parseColor(String(token.value))
    if (!parsed) {
      passthrough.push(token)
      continue
    }
    const existing = byHex.get(parsed.hex)
    if (existing) {
      existing.usage += token.usage
      existing.confidence = Math.max(existing.confidence, token.confidence)
      if (!existing.name || /^color-?\d*$/i.test(existing.name)) {
        existing.name = token.name || existing.name
      }
    } else {
      byHex.set(parsed.hex, { ...token, value: parsed.hex })
    }
  }
  return [...byHex.values(), ...passthrough]
}

export function reconcileWithAudit(
  curated: CuratedTokenSet,
  audit: RenderAudit
): { curated: CuratedTokenSet; coverage: RenderCoverage } {
  const next: CuratedTokenSet = {
    ...curated,
    colors: dedupeColors(curated.colors ?? []),
    typography: {
      families: [...(curated.typography?.families ?? [])],
      sizes: [...(curated.typography?.sizes ?? [])],
      weights: [...(curated.typography?.weights ?? [])],
    },
    spacing: [...(curated.spacing ?? [])],
    radius: [...(curated.radius ?? [])],
    shadows: [...(curated.shadows ?? [])],
  }

  let addedFromRender = 0

  // --- Colors ---------------------------------------------------------------
  const auditColors = audit.colors
    .map((entry) => {
      const parsed = parseColor(entry.value)
      return parsed && parsed.rgb.a > 0.05
        ? { hex: parsed.hex, rgb: parsed.rgb, kind: entry.kind, weight: entry.weight }
        : null
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  const totalAuditWeight = auditColors.reduce((sum, entry) => sum + entry.weight, 0) || 1

  let matchedAuditWeight = 0
  let verifiedColors = 0
  let dormantColors = 0
  const matchedAuditHexes = new Set<string>()

  for (const token of next.colors) {
    const parsed = parseColor(String(token.value))
    if (!parsed) continue
    let best: (typeof auditColors)[number] | null = null
    let bestDistance = Infinity
    for (const auditColor of auditColors) {
      const distance = rgbDistance(parsed.rgb, auditColor.rgb)
      if (distance < bestDistance) {
        bestDistance = distance
        best = auditColor
      }
    }
    if (best && bestDistance < 10) {
      verifiedColors += 1
      matchedAuditHexes.add(best.hex)
      matchedAuditWeight += best.weight
      const share = best.weight / totalAuditWeight
      token.usage = Math.max(token.usage, Math.round(share * 1000))
      token.confidence = Math.min(99, Math.round(token.confidence) + 12)
      token.semantic = token.semantic || best.kind
    } else {
      // In the CSS, never painted in the sampled viewports — demote.
      dormantColors += 1
      token.confidence = Math.round(token.confidence * 0.7)
      token.semantic = token.semantic || 'dormant'
    }
  }

  // Dominant rendered colors the CSS pass missed entirely
  for (const auditColor of auditColors) {
    if (matchedAuditHexes.has(auditColor.hex)) continue
    const share = auditColor.weight / totalAuditWeight
    if (share < 0.01) continue
    const duplicate = next.colors.some((token) => {
      const parsed = parseColor(String(token.value))
      return parsed ? rgbDistance(parsed.rgb, auditColor.rgb) < 10 : false
    })
    if (duplicate) continue
    matchedAuditWeight += auditColor.weight
    addedFromRender += 1
    next.colors.push({
      name: `rendered-${auditColor.kind}-${addedFromRender}`,
      value: auditColor.hex,
      usage: Math.round(share * 1000),
      confidence: 92,
      percentage: Math.round(share * 100),
      category: 'color',
      semantic: auditColor.kind,
    })
  }

  next.colors.sort((a, b) => b.usage - a.usage || b.confidence - a.confidence)
  const colorWeightCoverage = matchedAuditWeight / totalAuditWeight
  const colorVerifiedShare =
    next.colors.length > 0 ? verifiedColors / Math.max(1, verifiedColors + dormantColors) : 0
  const colorScore = Math.round((colorWeightCoverage * 0.6 + colorVerifiedShare * 0.4) * 100)

  // --- Fonts ----------------------------------------------------------------
  const auditFonts = audit.fonts.filter((entry) => entry.value)
  const totalFontWeight = auditFonts.reduce((sum, entry) => sum + entry.weight, 0) || 1
  const loaded = new Set(audit.loadedFonts.map((family) => family.toLowerCase()))
  let matchedFontWeight = 0

  for (const token of next.typography.families) {
    const family = primaryFamily(String(token.value))
    const hit = auditFonts.find((entry) => primaryFamily(entry.value) === family)
    if (hit) {
      matchedFontWeight += hit.weight
      token.usage = Math.max(token.usage, Math.round((hit.weight / totalFontWeight) * 1000))
      token.confidence = Math.min(99, Math.round(token.confidence) + 10)
    } else if (loaded.has(family)) {
      token.confidence = Math.min(99, Math.round(token.confidence) + 4)
    } else {
      token.confidence = Math.round(token.confidence * 0.75)
    }
  }
  for (const entry of auditFonts) {
    const share = entry.weight / totalFontWeight
    if (share < 0.05) continue
    const family = primaryFamily(entry.value)
    if (!family || ['inherit', 'sans-serif', 'serif', 'monospace'].includes(family)) continue
    const exists = next.typography.families.some(
      (token) => primaryFamily(String(token.value)) === family
    )
    if (exists) continue
    addedFromRender += 1
    next.typography.families.push({
      name: `rendered-font-${addedFromRender}`,
      value: entry.value,
      usage: Math.round(share * 1000),
      confidence: 92,
      percentage: Math.round(share * 100),
      category: 'typography',
    })
  }
  next.typography.families.sort((a, b) => b.usage - a.usage)
  const fontScore = Math.round((matchedFontWeight / totalFontWeight) * 100)

  // --- Sizes / weights / spacing / radius ------------------------------------
  const reweightByPx = (
    tokens: CuratedToken[],
    auditEntries: Array<{ value: string; weight: number }>,
    addCategory: string | null,
    minShareToAdd: number
  ): number => {
    const total = auditEntries.reduce((sum, entry) => sum + entry.weight, 0) || 1
    let matched = 0
    const seen = new Set<string>()
    for (const token of tokens) {
      const key = pxKey(token.value)
      if (!key) continue
      const hit = auditEntries.find((entry) => entry.value === key)
      if (hit) {
        matched += hit.weight
        seen.add(key)
        token.usage = Math.max(token.usage, hit.weight)
        token.confidence = Math.min(99, Math.round(token.confidence) + 8)
      }
    }
    if (addCategory) {
      for (const entry of auditEntries) {
        if (seen.has(entry.value)) continue
        const share = entry.weight / total
        if (share < minShareToAdd) continue
        addedFromRender += 1
        tokens.push({
          name: `rendered-${addCategory}-${entry.value}`,
          value: entry.value,
          usage: entry.weight,
          confidence: 90,
          percentage: Math.round(share * 100),
          category: addCategory,
        })
      }
    }
    tokens.sort((a, b) => b.usage - a.usage)
    return Math.round((matched / total) * 100)
  }

  const sizeScore = reweightByPx(next.typography.sizes, audit.fontSizes, 'typography', 0.04)
  reweightByPx(next.typography.weights, audit.fontWeights, null, 1)
  reweightByPx(next.spacing, audit.spacing, 'spacing', 0.05)
  reweightByPx(next.radius, audit.radius, 'radius', 0.08)

  const overall = Math.round(colorScore * 0.5 + fontScore * 0.3 + sizeScore * 0.2)

  return {
    curated: next,
    coverage: {
      overall,
      colors: colorScore,
      fonts: fontScore,
      sizes: sizeScore,
      verifiedColors,
      dormantColors,
      addedFromRender,
      elementCount: audit.elementCount,
      pagesAudited: audit.pagesAudited ?? 1,
    },
  }
}
