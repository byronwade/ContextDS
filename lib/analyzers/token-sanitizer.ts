/**
 * Token sanitation — no unresolved var() or junk values may reach a contract.
 *
 * The tokenizer resolves custom properties per-sheet, but values defined in one
 * sheet and used in another (or behind selector scopes) leak through as
 * `var(--x)`. This pass builds a GLOBAL variable map across every collected
 * stylesheet, resolves what it can, and drops what it can't — a token whose
 * value we cannot ground is noise, not signal.
 */

import { parseColor } from '@/lib/analyzers/design-philosophy'
import type { CuratedToken, CuratedTokenSet } from '@/lib/analyzers/token-curator'

export type SanitationReport = {
  resolved: number
  dropped: number
  variablesIndexed: number
}

const VAR_PATTERN = /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/

/** Build a global custom-property map across all CSS sources (last write wins). */
export function buildVariableMap(cssContents: string[]): Map<string, string> {
  const map = new Map<string, string>()
  const declaration = /(--[\w-]+)\s*:\s*([^;{}]+)[;}]/g
  for (const content of cssContents) {
    let match: RegExpExecArray | null
    declaration.lastIndex = 0
    while ((match = declaration.exec(content)) !== null) {
      const value = match[2].trim()
      if (value && value.length < 400) map.set(match[1], value)
    }
  }
  return map
}

/** Resolve nested var() references; null when grounding fails. */
export function resolveValue(
  raw: string,
  variables: Map<string, string>,
  depth = 0
): string | null {
  if (depth > 8) return null
  const value = raw.trim()
  if (!value.includes('var(')) return value
  const match = value.match(VAR_PATTERN)
  if (!match) return value.includes('var(') ? null : value
  const referenced = variables.get(match[1])
  const fallback = match[2]?.trim()
  const replacement = referenced ?? fallback
  if (!replacement) return null
  const next = value.replace(match[0], replacement)
  return resolveValue(next, variables, depth + 1)
}

function sanitizeList(
  tokens: CuratedToken[],
  variables: Map<string, string>,
  validate: ((value: string) => boolean) | null,
  report: SanitationReport
): CuratedToken[] {
  const out: CuratedToken[] = []
  for (const token of tokens) {
    const raw = String(token.value ?? '')
    if (!raw) {
      report.dropped += 1
      continue
    }
    let value = raw
    if (raw.includes('var(')) {
      const resolved = resolveValue(raw, variables)
      if (!resolved || resolved.includes('var(')) {
        report.dropped += 1
        continue
      }
      report.resolved += 1
      value = resolved
    }
    if (validate && !validate(value)) {
      report.dropped += 1
      continue
    }
    out.push(value === raw ? token : { ...token, value })
  }
  return out
}

const isColor = (value: string) => parseColor(value) !== null
const isLength = (value: string) =>
  /^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch)?$/.test(value.trim()) ||
  /^calc\(/.test(value.trim())
const isFontFamily = (value: string) =>
  value.trim().length > 0 && !/^\d/.test(value.trim()) && !value.includes('var(')
const isAnything = null

/** Resolve or drop every token value that references CSS variables. */
export function sanitizeCuratedTokens(
  curated: CuratedTokenSet,
  cssContents: string[]
): { curated: CuratedTokenSet; report: SanitationReport } {
  const variables = buildVariableMap(cssContents)
  const report: SanitationReport = {
    resolved: 0,
    dropped: 0,
    variablesIndexed: variables.size,
  }

  const next: CuratedTokenSet = {
    ...curated,
    colors: sanitizeList(curated.colors ?? [], variables, isColor, report),
    typography: {
      families: sanitizeList(
        curated.typography?.families ?? [],
        variables,
        isFontFamily,
        report
      ),
      sizes: sanitizeList(curated.typography?.sizes ?? [], variables, isLength, report),
      weights: sanitizeList(
        curated.typography?.weights ?? [],
        variables,
        (value) => /^(\d{2,3}|normal|bold|bolder|lighter)$/.test(value.trim()),
        report
      ),
    },
    spacing: sanitizeList(curated.spacing ?? [], variables, isLength, report),
    radius: sanitizeList(curated.radius ?? [], variables, isLength, report),
    shadows: sanitizeList(curated.shadows ?? [], variables, isAnything, report),
    motion: sanitizeList(curated.motion ?? [], variables, isAnything, report),
  }

  return { curated: next, report }
}
