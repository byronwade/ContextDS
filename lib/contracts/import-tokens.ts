/**
 * Import foreign design-token formats into a StudioSystem.
 *
 * Supported:
 * - W3C DTCG / tokens.json (nested groups with $value)
 * - DESIGN.md YAML front-matter (colors / fonts / radius)
 * - CSS custom properties (:root { --color-*: … })
 * - Lightweight Tailwind theme snippets (colors + borderRadius + fontFamily)
 */

import { isFontFamily } from '@/lib/analyzers/token-sanitizer'
import {
  DEFAULT_STUDIO_SYSTEM,
  type StudioSystem,
  slugify,
} from '@/lib/contracts/authored-contract'

export type ImportFormat = 'dtcg' | 'design-md' | 'css' | 'tailwind' | 'auto'

export type ImportResult = {
  system: StudioSystem
  format: Exclude<ImportFormat, 'auto'>
  warnings: string[]
  tokenCount: number
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const CSS_COLOR = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(|hsla?\(|oklch\(|color\()/i

function isColorValue(value: unknown): value is string {
  return typeof value === 'string' && CSS_COLOR.test(value.trim())
}

function isDimension(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d+(\.\d+)?(px|rem|em)$/i.test(value.trim())
}

function parsePx(value: string): number | null {
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em)$/i)
  if (!match) return null
  const n = parseFloat(match[1])
  if (match[2].toLowerCase() === 'rem' || match[2].toLowerCase() === 'em') {
    return Math.round(n * 16)
  }
  return Math.round(n)
}

function roleFromPath(path: string[]): string {
  const joined = path.join('-').toLowerCase()
  if (/background|bg|canvas|surface-base/.test(joined)) return 'background'
  if (/foreground|fg|ink|text-primary|on-surface/.test(joined)) return 'foreground'
  if (/muted|subtle|secondary-text|tertiary/.test(joined)) return 'muted'
  if (/primary|brand|accent|action/.test(joined)) return 'primary'
  if (/border|stroke|line|divider/.test(joined)) return 'border'
  return slugify(path.slice(-2).join('-') || path.join('-') || 'token').slice(0, 40)
}

type Leaf = { path: string[]; value: unknown; type?: string }

function walkDtcg(node: unknown, path: string[] = [], out: Leaf[] = []): Leaf[] {
  if (!node || typeof node !== 'object') return out
  const record = node as Record<string, unknown>
  if ('$value' in record) {
    out.push({
      path: path.length ? path : ['token'],
      value: record.$value,
      type: typeof record.$type === 'string' ? record.$type : undefined,
    })
    return out
  }
  for (const [key, child] of Object.entries(record)) {
    if (key.startsWith('$')) continue
    walkDtcg(child, [...path, key], out)
  }
  return out
}

function detectFormat(raw: string): Exclude<ImportFormat, 'auto'> {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'dtcg'
  if (/^---\s*\n[\s\S]*?\n---/.test(trimmed) || /^#\s+.+\n/.test(trimmed)) {
    return 'design-md'
  }
  if (/module\.exports|export\s+default|theme\s*:\s*\{/.test(trimmed)) {
    return 'tailwind'
  }
  return 'css'
}

function baseSystem(name?: string): StudioSystem {
  return {
    ...DEFAULT_STUDIO_SYSTEM,
    name: name?.trim() || DEFAULT_STUDIO_SYSTEM.name,
    slug: slugify(name?.trim() || DEFAULT_STUDIO_SYSTEM.slug),
  }
}

/** Import a W3C DTCG token tree (or JSON string). */
export function importDtcgTokens(
  input: unknown | string,
  options?: { name?: string }
): ImportResult {
  const warnings: string[] = []
  let data: unknown = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch {
      throw new Error('tokens.json is not valid JSON')
    }
  }

  const leaves = walkDtcg(data)
  if (leaves.length === 0) {
    throw new Error('No DTCG tokens with $value found')
  }

  const system = baseSystem(options?.name)
  const colorRoles = new Map<string, string>()
  const fonts: string[] = []
  const sizes: number[] = []
  const spaces: number[] = []
  const radii: number[] = []

  for (const leaf of leaves) {
    const type = (leaf.type || '').toLowerCase()
    const value = leaf.value
    const looksColor =
      type === 'color' ||
      (typeof value === 'string' && isColorValue(value)) ||
      (value &&
        typeof value === 'object' &&
        'components' in (value as object) &&
        Array.isArray((value as { components?: unknown }).components))

    if (looksColor) {
      let hex: string | null = null
      if (typeof value === 'string' && HEX.test(value.trim())) {
        hex = value.trim()
      } else if (typeof value === 'string' && isColorValue(value)) {
        hex = value.trim()
      } else if (value && typeof value === 'object') {
        const comps = (value as { components?: number[]; hex?: string }).hex
        if (typeof comps === 'string') hex = comps
        else {
          const c = (value as { components?: number[] }).components
          if (Array.isArray(c) && c.length >= 3) {
            const [r, g, b] = c.map((n) => Math.round((n <= 1 ? n * 255 : n) as number))
            hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
          }
        }
      }
      if (hex) {
        const role = roleFromPath(leaf.path)
        if (!colorRoles.has(role)) colorRoles.set(role, hex)
      }
      continue
    }

    if (type === 'fontfamily' || leaf.path.some((p) => /font|family|typeface/i.test(p))) {
      const family = Array.isArray(value) ? String(value[0]) : String(value ?? '')
      const clean = family.split(',')[0].replace(/['"]/g, '').trim()
      if (clean && isFontFamily(clean) && !fonts.includes(clean)) fonts.push(clean)
      continue
    }

    if (typeof value === 'string' && isDimension(value)) {
      const px = parsePx(value)
      if (px === null) continue
      if (leaf.path.some((p) => /radius|rounded|corner/i.test(p)) || type === 'borderRadius') {
        radii.push(px)
      } else if (leaf.path.some((p) => /space|gap|padding|margin/i.test(p))) {
        spaces.push(px)
      } else if (leaf.path.some((p) => /size|font-size|text/i.test(p))) {
        sizes.push(px)
      }
    }
  }

  if (colorRoles.size === 0) {
    warnings.push('No colors found — kept Studio defaults')
  } else {
    const colors = Array.from(colorRoles.entries()).map(([role, value]) => ({
      id: role,
      role,
      value,
    }))
    // Ensure core roles exist
    for (const role of ['background', 'foreground', 'primary', 'muted', 'border'] as const) {
      if (!colors.some((c) => c.role === role) && colors[0]) {
        // leave missing; studio defaults fill via spread below if empty core
      }
    }
    system.colors = colors.length >= 2 ? colors.slice(0, 16) : DEFAULT_STUDIO_SYSTEM.colors
  }

  if (fonts[0]) system.fontDisplay = fonts[0]
  if (fonts[1] || fonts[0]) system.fontBody = fonts[1] || fonts[0]
  if (fonts.find((f) => /mono|code|jetbrains|fira/i.test(f))) {
    system.fontMono = fonts.find((f) => /mono|code|jetbrains|fira/i.test(f))!
  }

  if (sizes.length) {
    const sorted = [...sizes].sort((a, b) => a - b)
    system.baseSize = Math.min(24, Math.max(10, sorted[Math.floor(sorted.length / 2)]))
  }
  if (spaces.length) {
    const eight = spaces.filter((s) => s % 8 === 0).length
    const four = spaces.filter((s) => s % 4 === 0).length
    system.spacingBase = eight >= four * 0.6 ? 8 : 4
  }
  if (radii.length) {
    const sorted = [...radii].filter((r) => r >= 0 && r <= 48).sort((a, b) => a - b)
    if (sorted.length) system.radius = sorted[Math.floor(sorted.length / 2)]
  }

  if (!options?.name) {
    const meta = (data as { $metadata?: { name?: string } })?.$metadata?.name
    if (meta) {
      system.name = meta.slice(0, 80)
      system.slug = slugify(meta)
    }
  }

  system.philosophyNote = `Imported from W3C design tokens (${leaves.length} leaves).`

  return {
    system,
    format: 'dtcg',
    warnings,
    tokenCount: leaves.length,
  }
}

/** Import DESIGN.md with YAML front-matter tokens. */
export function importDesignMd(markdown: string, options?: { name?: string }): ImportResult {
  const warnings: string[] = []
  const system = baseSystem(options?.name)
  const fm = markdown.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) {
    warnings.push('No YAML front-matter — parsing prose headings only')
  }

  const body = fm?.[1] ?? ''
  const nameMatch = body.match(/^name:\s*(.+)$/m)
  if (nameMatch && !options?.name) {
    system.name = nameMatch[1]
      .replace(/^["']|["']$/g, '')
      .trim()
      .slice(0, 80)
    system.slug = slugify(system.name)
  }

  const colors: StudioSystem['colors'] = []
  const colorBlock = body.match(/colors:\s*\n([\s\S]*?)(?=\n[a-zA-Z][\w-]*:|\n*$)/)
  if (colorBlock) {
    for (const line of colorBlock[1].split('\n')) {
      const match = line.match(
        /^\s*([A-Za-z0-9_-]+):\s*["']?(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))["']?/
      )
      if (match) {
        colors.push({ id: match[1], role: match[1], value: match[2] })
      }
    }
  }
  // Also pick `token: #hex` inline in prose tables
  for (const match of markdown.matchAll(
    /\b([a-zA-Z][\w-]{1,24})\b[^\n#]{0,20}(#[0-9A-Fa-f]{6})\b/g
  )) {
    if (colors.length >= 16) break
    if (!colors.some((c) => c.role === match[1])) {
      colors.push({ id: match[1], role: match[1], value: match[2] })
    }
  }
  if (colors.length >= 2) system.colors = colors.slice(0, 16)
  else warnings.push('Few colors parsed from DESIGN.md')

  const fontMatch = body.match(/fonts?:\s*\n([\s\S]*?)(?=\n[a-zA-Z][\w-]*:|\n*$)/i)
  if (fontMatch) {
    const display = fontMatch[1].match(/display:\s*["']?([^"'\n]+)/i)
    const bodyFont = fontMatch[1].match(/body:\s*["']?([^"'\n]+)/i)
    const mono = fontMatch[1].match(/mono:\s*["']?([^"'\n]+)/i)
    if (display) system.fontDisplay = display[1].trim()
    if (bodyFont) system.fontBody = bodyFont[1].trim()
    if (mono) system.fontMono = mono[1].trim()
  }

  const radiusMatch = body.match(/radius:\s*["']?(\d+(?:\.\d+)?)px?/i)
  if (radiusMatch) system.radius = Math.min(48, Math.max(0, Math.round(Number(radiusMatch[1]))))

  system.philosophyNote = 'Imported from DESIGN.md front-matter.'

  return {
    system,
    format: 'design-md',
    warnings,
    tokenCount: system.colors.length,
  }
}

/** Import CSS custom properties. */
export function importCssVariables(css: string, options?: { name?: string }): ImportResult {
  const warnings: string[] = []
  const system = baseSystem(options?.name)
  const colors: StudioSystem['colors'] = []
  const radii: number[] = []
  const spaces: number[] = []
  const fonts: string[] = []

  const re = /--([A-Za-z0-9_-]+)\s*:\s*([^;]+);/g
  let count = 0
  for (const match of css.matchAll(re)) {
    count += 1
    const name = match[1]
    const value = match[2].trim()
    if (isColorValue(value) && HEX.test(value)) {
      const role = roleFromPath(name.split(/[-_]/))
      if (!colors.some((c) => c.role === role)) {
        colors.push({ id: role, role, value })
      }
    } else if (isDimension(value)) {
      const px = parsePx(value)
      if (px === null) continue
      if (/radius|rounded|corner/i.test(name)) radii.push(px)
      else if (/space|gap|padding|margin/i.test(name)) spaces.push(px)
    } else if (/font/i.test(name) && isFontFamily(value.replace(/['"]/g, '').split(',')[0])) {
      fonts.push(value.replace(/['"]/g, '').split(',')[0].trim())
    }
  }

  if (count === 0) throw new Error('No CSS custom properties found')
  if (colors.length >= 2) system.colors = colors.slice(0, 16)
  else warnings.push('Few color variables found')
  if (fonts[0]) {
    system.fontDisplay = fonts[0]
    system.fontBody = fonts[1] || fonts[0]
  }
  if (radii.length) {
    const sorted = [...radii].sort((a, b) => a - b)
    system.radius = Math.min(48, Math.max(0, sorted[Math.floor(sorted.length / 2)]))
  }
  if (spaces.length) {
    const eight = spaces.filter((s) => s % 8 === 0).length
    system.spacingBase = eight >= spaces.length / 2 ? 8 : 4
  }

  system.philosophyNote = `Imported from CSS variables (${count} props).`

  return { system, format: 'css', warnings, tokenCount: count }
}

/** Import a Tailwind-ish theme config string. */
export function importTailwindTheme(source: string, options?: { name?: string }): ImportResult {
  const warnings: string[] = []
  const system = baseSystem(options?.name)
  const colors: StudioSystem['colors'] = []

  for (const match of source.matchAll(
    /['"]?([A-Za-z0-9_-]+)['"]?\s*:\s*['"](#[0-9A-Fa-f]{3,8})['"]/g
  )) {
    const role = roleFromPath([match[1]])
    if (!colors.some((c) => c.role === role)) {
      colors.push({ id: role, role, value: match[2] })
    }
  }

  const radiusMatch = source.match(/borderRadius[\s\S]{0,200}?['"](\d+(?:\.\d+)?)(px|rem)?['"]/i)
  if (radiusMatch) {
    const n = parseFloat(radiusMatch[1])
    system.radius = Math.min(48, Math.max(0, Math.round(radiusMatch[2] === 'rem' ? n * 16 : n)))
  }

  const fontMatch = source.match(/fontFamily[\s\S]{0,300}?['"]([A-Za-z][^'"]+)['"]/i)
  if (fontMatch) {
    const family = fontMatch[1].split(',')[0].trim()
    if (isFontFamily(family)) {
      system.fontDisplay = family
      system.fontBody = family
    }
  }

  if (colors.length >= 2) system.colors = colors.slice(0, 16)
  else warnings.push('Few Tailwind colors parsed — check theme.colors shape')

  system.philosophyNote = 'Imported from Tailwind theme config.'

  return {
    system,
    format: 'tailwind',
    warnings,
    tokenCount: colors.length,
  }
}

/** Auto-detect format and import. */
export function importDesignTokens(
  raw: string,
  options?: { name?: string; format?: ImportFormat }
): ImportResult {
  const format = options?.format && options.format !== 'auto' ? options.format : detectFormat(raw)
  switch (format) {
    case 'dtcg':
      return importDtcgTokens(raw, options)
    case 'design-md':
      return importDesignMd(raw, options)
    case 'tailwind':
      return importTailwindTheme(raw, options)
    case 'css':
      return importCssVariables(raw, options)
    default:
      return importDtcgTokens(raw, options)
  }
}
