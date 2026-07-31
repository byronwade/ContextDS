/**
 * Design Contract agent tools — wrap the existing scan / store / contract APIs.
 */

import { tool } from 'ai'
import { z } from 'zod'
import {
  analyzeColors,
  contrastRatio,
  generatePhilosophy,
  parseColor,
  wcagGrade,
  type CuratedLike,
  type TokenLike,
} from '@/lib/analyzers/design-philosophy'
import { contractDownloadPath, ensureAbsoluteUrl, normalizeDomain } from '@/lib/domain'
import { isBrowserServiceConfigured } from '@/lib/scanner/browser-service'
import { getScan, getSite, listSites } from '@/lib/storage/serverless-store'
import { runSimpleScan } from '@/lib/workers/simple-scan'

/** Prefer the Vercel/Docker browser scanner when wired; otherwise static CSS. */
function defaultScanMode(): 'fast' | 'accurate' {
  if (process.env.DISABLE_COMPUTED_CSS === '1') return 'fast'
  return isBrowserServiceConfigured() ? 'accurate' : 'fast'
}

function resolveScanMode(requested?: 'fast' | 'accurate'): 'fast' | 'accurate' {
  if (requested === 'fast') return 'fast'
  if (requested === 'accurate') {
    return process.env.DISABLE_COMPUTED_CSS === '1' ? 'fast' : 'accurate'
  }
  return defaultScanMode()
}

function slimTokens(tokens: unknown) {
  if (!tokens || typeof tokens !== 'object') return tokens
  const curated = tokens as {
    colors?: unknown[]
    typography?: { families?: unknown[]; sizes?: unknown[]; weights?: unknown[] }
    spacing?: unknown[]
    radius?: unknown[]
    shadows?: unknown[]
    motion?: unknown[]
  }
  return {
    colors: (curated.colors || []).slice(0, 16),
    typography: {
      families: (curated.typography?.families || []).slice(0, 6),
      sizes: (curated.typography?.sizes || []).slice(0, 10),
      weights: (curated.typography?.weights || []).slice(0, 6),
    },
    spacing: (curated.spacing || []).slice(0, 12),
    radius: (curated.radius || []).slice(0, 8),
    shadows: (curated.shadows || []).slice(0, 6),
    motion: (curated.motion || []).slice(0, 6),
  }
}

export const designContractTools = {
  scan_site: tool({
    description:
      'Primary gather tool: scan a public website into curated tokens, layout DNA, a semantic graph, and an installable Design Contract pack. The chat UI renders the result as an inline widget — keep follow-up text short.',
    inputSchema: z.object({
      url: z
        .string()
        .describe('Absolute or bare website URL, e.g. stripe.com or https://stripe.com'),
      mode: z
        .enum(['fast', 'accurate'])
        .optional()
        .describe(
          'fast = static CSS only; accurate = Vercel/Docker Playwright browser capture when SCANNER_SERVICE_URL is set. Omit to auto-pick accurate when the scanner is configured.'
        ),
      force: z.boolean().default(false).describe('Bypass the 24h cache and rescan'),
      paths: z
        .array(z.string().startsWith('/'))
        .max(4)
        .optional()
        .describe(
          'Extra same-origin paths to screenshot during accurate scans, e.g. ["/pricing", "/docs"]. Omit to let the scanner discover key pages.'
        ),
    }),
    execute: async ({ url, mode, force, paths }) => {
      const absolute = ensureAbsoluteUrl(url)
      const resolvedMode = resolveScanMode(mode)
      const result = await runSimpleScan({
        url: absolute,
        mode: resolvedMode,
        force,
        capture: paths?.length ? { paths } : undefined,
      })

      const { trackStatEvent } = await import('@/lib/storage/platform-stats')
      void trackStatEvent('agent_scan')

      return {
        status: result.cacheHit ? 'cached' : 'fresh',
        domain: result.domain,
        url: result.url,
        summary: result.summary,
        mode: result.metadata.mode,
        browserEngine: result.metadata.browserEngine ?? null,
        scannerConfigured: isBrowserServiceConfigured(),
        tokens: slimTokens(result.curatedTokens ?? result.tokens),
        brand: result.brandAnalysis,
        layout: {
          containers: (result.layoutDNA as { containers?: unknown } | undefined)?.containers,
          breakpoints: (result.layoutDNA as { breakpoints?: unknown } | undefined)?.breakpoints,
          archetypes: (result.layoutDNA as { archetypes?: unknown } | undefined)?.archetypes,
        },
        graph: result.semanticGraph
          ? {
              summary: result.semanticGraph.summary,
              schemaVersion: result.semanticGraph.schemaVersion,
            }
          : null,
        designContract: result.designContract
          ? {
              slug: result.designContract.slug,
              title: result.designContract.title,
              installCommand: result.designContract.installCommand,
              summary: result.designContract.summary,
              download: result.designContract.download || contractDownloadPath(result.domain),
            }
          : null,
        designMdPreview: result.designMd?.markdown?.slice(0, 4000),
        screenshots: result.screenshots,
      }
    },
  }),

  get_tokens: tool({
    description:
      'Retrieve the latest cached design tokens and contract metadata for a domain. Prefer this before scanning when a recent scan may exist.',
    inputSchema: z.object({
      domain: z.string().describe('Domain or URL, e.g. stripe.com'),
    }),
    execute: async ({ domain }) => {
      const key = normalizeDomain(domain)
      const [site, scan] = await Promise.all([getSite(key), getScan(key)])
      if (!scan) {
        return {
          found: false,
          domain: key,
          suggestion: `No cached scan for ${key}. Call scan_site with url="${key}".`,
        }
      }

      return {
        found: true,
        domain: key,
        status: 'cached',
        site,
        scannedAt: scan.scannedAt,
        summary: scan.summary,
        mode: scan.metadata?.mode,
        browserEngine: scan.metadata?.browserEngine ?? null,
        tokens: slimTokens(scan.curatedTokens ?? scan.tokens),
        brand: scan.brandAnalysis,
        graphSummary:
          scan.semanticGraph && typeof scan.semanticGraph === 'object'
            ? (scan.semanticGraph as { summary?: unknown }).summary
            : null,
        designContract: scan.designContract
          ? {
              slug: scan.designContract.slug,
              title: scan.designContract.title,
              installCommand: scan.designContract.installCommand,
              summary: scan.designContract.summary,
              download: scan.designContract.download || contractDownloadPath(key),
            }
          : null,
        screenshots: scan.screenshots,
      }
    },
  }),

  get_design_md: tool({
    description:
      'Return DESIGN.md (and optional agent skill markdown) for a scanned domain so you can reason about the system in prose.',
    inputSchema: z.object({
      domain: z.string(),
      includeSkill: z.boolean().default(true),
    }),
    execute: async ({ domain, includeSkill }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      if (!scan?.designMd) {
        return {
          found: false,
          domain: key,
          suggestion: `Scan ${key} first with scan_site.`,
        }
      }

      return {
        found: true,
        domain: key,
        fileName: scan.designMd.fileName,
        markdown: scan.designMd.markdown,
        summary: scan.designMd.summary,
        skill:
          includeSkill && scan.designSkill
            ? {
                fileName: scan.designSkill.fileName,
                skillName: scan.designSkill.skillName,
                description: scan.designSkill.description,
                markdown: scan.designSkill.markdown,
              }
            : null,
      }
    },
  }),

  resolve_graph: tool({
    description:
      'Inspect the semantic design graph for a domain — tokens, roles, components, layouts, patterns, and how they connect.',
    inputSchema: z.object({
      domain: z.string(),
      focus: z
        .enum(['summary', 'roles', 'components', 'patterns', 'tokens'])
        .default('summary')
        .describe('Which slice of the graph to return'),
      limit: z.number().int().min(1).max(40).default(12),
    }),
    execute: async ({ domain, focus, limit }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      const graph = scan?.semanticGraph as
        | {
            summary?: unknown
            nodes?: Array<{ id?: string; type?: string; label?: string; data?: unknown }>
            edges?: Array<{ from?: string; to?: string; type?: string }>
          }
        | undefined

      if (!graph) {
        return {
          found: false,
          domain: key,
          suggestion: `No graph for ${key}. Call scan_site first.`,
        }
      }

      const nodes = graph.nodes || []
      const edges = graph.edges || []

      if (focus === 'summary') {
        return {
          found: true,
          domain: key,
          summary: graph.summary,
          nodeCount: nodes.length,
          edgeCount: edges.length,
        }
      }

      const typeMap: Record<string, string> = {
        roles: 'role',
        components: 'component',
        patterns: 'pattern',
        tokens: 'token',
      }
      const wanted = typeMap[focus]
      const filtered = nodes.filter((node) => node.type === wanted).slice(0, limit)
      const ids = new Set(filtered.map((node) => node.id).filter(Boolean))
      const relatedEdges = edges
        .filter((edge) => ids.has(edge.from) || ids.has(edge.to))
        .slice(0, limit * 3)

      return {
        found: true,
        domain: key,
        focus,
        nodes: filtered,
        edges: relatedEdges,
      }
    },
  }),

  get_contract_download: tool({
    description:
      'Return the installable Design Contract download URL and install command for a scanned domain.',
    inputSchema: z.object({
      domain: z.string(),
    }),
    execute: async ({ domain }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      if (!scan?.designContract) {
        return {
          found: false,
          domain: key,
          suggestion: `Scan ${key} first with scan_site.`,
        }
      }

      return {
        found: true,
        domain: key,
        download: scan.designContract.download || contractDownloadPath(key),
        installCommand: scan.designContract.installCommand,
        slug: scan.designContract.slug,
        title: scan.designContract.title,
        summary: scan.designContract.summary,
        files: (scan.designContract.files || []).map((file) => file.path),
      }
    },
  }),

  critique_design: tool({
    description:
      'Deterministic design critique for a scanned domain: generated philosophy, principles, and measurable flags (contrast coverage, grid conformance, font sprawl). Use to answer "how good/consistent is this design system?"',
    inputSchema: z.object({
      domain: z.string(),
    }),
    execute: async ({ domain }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      const curated = scan?.curatedTokens as CuratedLike | undefined
      if (!curated) {
        return { found: false, domain: key, suggestion: `Scan ${key} first with scan_site.` }
      }

      const brand = scan?.brandAnalysis as { personality?: string } | undefined
      const philosophy = generatePhilosophy({
        domain: key,
        curated,
        personality: brand?.personality ?? null,
      })
      const { color, type, space, shape } = philosophy.systems

      // Contrast coverage: inks × surfaces that clear AA
      const surfaces = [...color.neutrals.slice(0, 2), ...color.neutrals.slice(-2)]
      const inks = [
        ...color.neutrals.filter((c) => c.luminance < 0.25).slice(0, 2),
        ...color.neutrals.filter((c) => c.luminance > 0.7).slice(-2),
      ]
      let aaPairs = 0
      let checkedPairs = 0
      for (const surface of surfaces) {
        for (const ink of inks) {
          if (surface.hex === ink.hex) continue
          checkedPairs += 1
          if (contrastRatio(ink, surface) >= 4.5) aaPairs += 1
        }
      }

      const flags: string[] = []
      if (type.families.length > 3) {
        flags.push(`font sprawl: ${type.families.length} families (aim for 2)`)
      }
      if (space.base && space.gridFit < 80) {
        flags.push(`spacing drift: only ${space.gridFit}% of values sit on the ${space.base}px grid`)
      }
      if (!space.base) flags.push('no detectable spacing grid — values are optical')
      if (shape.radiiPx.length > 5) {
        flags.push(`radius sprawl: ${shape.radiiPx.length} distinct corner radii`)
      }
      if (checkedPairs > 0 && aaPairs / checkedPairs < 0.5) {
        flags.push('weak contrast coverage between core inks and surfaces')
      }
      if (color.chromatic.length > 12) {
        flags.push(`palette sprawl: ${color.chromatic.length} chromatic colors`)
      }

      return {
        found: true,
        domain: key,
        title: philosophy.title,
        statement: philosophy.statement,
        traits: philosophy.traits,
        principles: philosophy.principles,
        metrics: {
          neutrals: color.neutrals.length,
          chromatic: color.chromatic.length,
          fontFamilies: type.families.length,
          typeScale: type.scaleLabel ?? type.scaleRatio,
          spacingGrid: space.base ? `${space.base}px @ ${space.gridFit}%` : null,
          radii: shape.radiiPx,
          contrastAA: checkedPairs > 0 ? `${aaPairs}/${checkedPairs} core pairings` : null,
        },
        flags,
      }
    },
  }),

  compare_systems: tool({
    description:
      'Compare two scanned domains: palette overlap, accent difference, type + spacing + shape divergence. Both domains must be scanned already (call scan_site if not).',
    inputSchema: z.object({
      domainA: z.string(),
      domainB: z.string(),
    }),
    execute: async ({ domainA, domainB }) => {
      const [keyA, keyB] = [normalizeDomain(domainA), normalizeDomain(domainB)]
      const [scanA, scanB] = await Promise.all([getScan(keyA), getScan(keyB)])
      const curatedA = scanA?.curatedTokens as CuratedLike | undefined
      const curatedB = scanB?.curatedTokens as CuratedLike | undefined
      if (!curatedA || !curatedB) {
        return {
          found: false,
          missing: [!curatedA ? keyA : null, !curatedB ? keyB : null].filter(Boolean),
          suggestion: 'Scan the missing domain(s) with scan_site first.',
        }
      }

      const philA = generatePhilosophy({ domain: keyA, curated: curatedA })
      const philB = generatePhilosophy({ domain: keyB, curated: curatedB })

      const hexesA = new Set(philA.systems.color.all.map((c) => c.hex))
      const sharedColors = philB.systems.color.all
        .filter((c) => hexesA.has(c.hex))
        .map((c) => c.hex)

      const describe = (phil: typeof philA) => ({
        title: phil.title,
        traits: phil.traits,
        accent: phil.systems.color.accent?.hex ?? null,
        temperature: phil.systems.color.temperature,
        polarity: phil.systems.color.polarity,
        fonts: phil.systems.type.families.map((f) => f.primary),
        typeScale: phil.systems.type.scaleLabel ?? phil.systems.type.scaleRatio,
        spacingBase: phil.systems.space.base,
        cornerCharacter: phil.systems.shape.character,
        depth: phil.systems.shape.depth,
      })

      return {
        found: true,
        a: { domain: keyA, ...describe(philA) },
        b: { domain: keyB, ...describe(philB) },
        sharedColors,
        divergence: {
          accent: philA.systems.color.accent?.hex !== philB.systems.color.accent?.hex,
          temperature:
            philA.systems.color.temperature !== philB.systems.color.temperature,
          spacingBase: philA.systems.space.base !== philB.systems.space.base,
          corners: philA.systems.shape.character !== philB.systems.shape.character,
          sharedFontFamilies: philA.systems.type.families
            .map((f) => f.primary)
            .filter((name) => philB.systems.type.families.some((f) => f.primary === name)),
        },
      }
    },
  }),

  generate_theme_css: tool({
    description:
      "Generate ready-to-paste CSS custom properties (and a Tailwind v4 @theme block) from a scanned domain's tokens, with semantic role guesses (background/foreground/primary/muted/border).",
    inputSchema: z.object({
      domain: z.string(),
      format: z.enum(['css', 'tailwind']).default('css'),
    }),
    execute: async ({ domain, format }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      const curated = scan?.curatedTokens as CuratedLike | undefined
      if (!curated) {
        return { found: false, domain: key, suggestion: `Scan ${key} first with scan_site.` }
      }

      const color = analyzeColors((curated.colors ?? []) as TokenLike[])
      const background =
        color.polarity === 'dark-leaning' ? color.darkest : color.lightest
      const foreground =
        color.polarity === 'dark-leaning' ? color.lightest : color.darkest
      const midNeutral = color.neutrals[Math.floor(color.neutrals.length / 2)]

      const roles: Array<[string, string | undefined]> = [
        ['background', background?.hex],
        ['foreground', foreground?.hex],
        ['primary', color.accent?.hex],
        ['muted-foreground', midNeutral?.hex],
        [
          'border',
          color.neutrals.find(
            (c) => background && Math.abs(c.luminance - background.luminance) < 0.18 && c.hex !== background.hex
          )?.hex,
        ],
      ]

      const lines: string[] = [':root {']
      for (const [role, value] of roles) {
        if (value) lines.push(`  --${role}: ${value};`)
      }
      color.chromatic.slice(0, 8).forEach((c, i) => {
        lines.push(`  --palette-${i + 1}: ${c.hex};`)
      })
      ;(curated.spacing ?? []).slice(0, 10).forEach((token, i) => {
        lines.push(`  --space-${i + 1}: ${token.value};`)
      })
      ;(curated.radius ?? []).slice(0, 6).forEach((token, i) => {
        lines.push(`  --radius-${i + 1}: ${token.value};`)
      })
      lines.push('}')
      const css = lines.join('\n')

      const tailwind =
        format === 'tailwind'
          ? [
              '@theme {',
              ...roles
                .filter(([, value]) => value)
                .map(([role, value]) => `  --color-${role}: ${value};`),
              ...color.chromatic
                .slice(0, 8)
                .map((c, i) => `  --color-palette-${i + 1}: ${c.hex};`),
              '}',
            ].join('\n')
          : null

      return {
        found: true,
        domain: key,
        roles: Object.fromEntries(roles.filter(([, value]) => value)),
        css,
        tailwind,
        note: 'Role guesses are heuristic — verify background/foreground against the live site.',
      }
    },
  }),

  find_similar_systems: tool({
    description:
      'Find scanned sites in the Library with a similar design system (accent hue, temperature, dark/light polarity) to a given domain — or to an explicit accent color.',
    inputSchema: z.object({
      domain: z.string().optional().describe('Reference domain (must be scanned)'),
      accentColor: z
        .string()
        .optional()
        .describe('Alternative: an explicit accent color like #c08a5f'),
      limit: z.number().int().min(1).max(12).default(6),
    }),
    execute: async ({ domain, accentColor, limit }) => {
      let referenceHex: string | null = null
      let referenceDomain: string | null = null

      if (domain) {
        referenceDomain = normalizeDomain(domain)
        const scan = await getScan(referenceDomain)
        const curated = scan?.curatedTokens as CuratedLike | undefined
        if (curated) {
          const color = analyzeColors((curated.colors ?? []) as TokenLike[])
          referenceHex = color.accent?.hex ?? null
        }
      }
      if (!referenceHex && accentColor) {
        referenceHex = parseColor(accentColor)?.hex ?? null
      }
      if (!referenceHex) {
        return {
          found: false,
          suggestion: 'Provide a scanned domain or an accentColor like #c08a5f.',
        }
      }

      const reference = parseColor(referenceHex)!
      const sites = await listSites({ sort: 'recent', limit: 200 })
      const scored = sites
        .filter((site) => site.domain !== referenceDomain && site.preview?.colors?.length)
        .map((site) => {
          const accents = (site.preview?.colors ?? [])
            .map((value) => parseColor(value))
            .filter((c): c is NonNullable<typeof c> => Boolean(c && !c.isNeutral))
          if (accents.length === 0) return null
          const best = accents.reduce((min, c) => {
            const dh = Math.min(
              Math.abs(c.hsl.h - reference.hsl.h),
              360 - Math.abs(c.hsl.h - reference.hsl.h)
            )
            return dh < min.dh ? { dh, hex: c.hex } : min
          }, { dh: 999, hex: '' })
          return {
            domain: site.domain,
            title: site.title,
            tokens: site.tokenCount,
            accent: best.hex,
            hueDistance: Math.round(best.dh),
            personality: site.preview?.personality ?? null,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => a.hueDistance - b.hueDistance)
        .slice(0, limit)

      return {
        found: true,
        reference: { domain: referenceDomain, accent: referenceHex },
        matches: scored,
      }
    },
  }),

  compose_design_artifacts: tool({
    description:
      'One call, three artifacts for a scanned domain: the full DESIGN.md, a Tailwind v4 @theme block, and CSS :root tokens — all derived deterministically from the scan. Use when the user wants "the design system as code/files" in chat.',
    inputSchema: z.object({
      domain: z.string(),
    }),
    execute: async ({ domain }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      const curated = scan?.curatedTokens as CuratedLike | undefined
      if (!curated) {
        return { found: false, domain: key, suggestion: `Scan ${key} first with scan_site.` }
      }

      const color = analyzeColors((curated.colors ?? []) as TokenLike[])
      const background =
        color.polarity === 'dark-leaning' ? color.darkest : color.lightest
      const foreground =
        color.polarity === 'dark-leaning' ? color.lightest : color.darkest
      const midNeutral = color.neutrals[Math.floor(color.neutrals.length / 2)]
      const roles: Array<[string, string | undefined]> = [
        ['background', background?.hex],
        ['foreground', foreground?.hex],
        ['primary', color.accent?.hex],
        ['muted-foreground', midNeutral?.hex],
      ]
      const definedRoles = roles.filter(
        (entry): entry is [string, string] => Boolean(entry[1])
      )

      const cssLines: string[] = [':root {']
      for (const [role, value] of definedRoles) cssLines.push(`  --${role}: ${value};`)
      color.chromatic.slice(0, 8).forEach((c, i) => {
        cssLines.push(`  --palette-${i + 1}: ${c.hex};`)
      })
      ;(curated.typography?.families ?? []).slice(0, 3).forEach((token, i) => {
        cssLines.push(`  --font-${i === 0 ? 'primary' : `alt-${i}`}: ${token.value};`)
      })
      ;(curated.spacing ?? []).slice(0, 10).forEach((token, i) => {
        cssLines.push(`  --space-${i + 1}: ${token.value};`)
      })
      ;(curated.radius ?? []).slice(0, 6).forEach((token, i) => {
        cssLines.push(`  --radius-${i + 1}: ${token.value};`)
      })
      ;(curated.shadows ?? []).slice(0, 4).forEach((token, i) => {
        cssLines.push(`  --shadow-${i + 1}: ${token.value};`)
      })
      cssLines.push('}')

      const tailwindLines: string[] = [
        '@theme {',
        ...definedRoles.map(([role, value]) => `  --color-${role}: ${value};`),
        ...color.chromatic.slice(0, 8).map((c, i) => `  --color-palette-${i + 1}: ${c.hex};`),
        ...(curated.typography?.families ?? [])
          .slice(0, 2)
          .map((token, i) => `  --font-${i === 0 ? 'sans' : 'display'}: ${token.value};`),
        ...(curated.radius ?? [])
          .slice(0, 3)
          .map((token, i) => `  --radius-${['sm', 'md', 'lg'][i]}: ${token.value};`),
        '}',
      ]

      return {
        found: true,
        domain: key,
        designMd: scan?.designMd
          ? { fileName: scan.designMd.fileName, markdown: scan.designMd.markdown }
          : null,
        tailwindTheme: tailwindLines.join('\n'),
        cssTokens: cssLines.join('\n'),
        installCommand: scan?.designContract?.installCommand ?? null,
        note: 'All three artifacts are derived deterministically from the stored scan — role guesses (background/foreground/primary) are heuristic.',
      }
    },
  }),

  check_contrast: tool({
    description:
      'WCAG contrast check between any two colors (hex/rgb/hsl/oklch). Returns ratio and AA/AAA grades for normal and large text.',
    inputSchema: z.object({
      foreground: z.string(),
      background: z.string(),
    }),
    execute: async ({ foreground, background }) => {
      const fg = parseColor(foreground)
      const bg = parseColor(background)
      if (!fg || !bg) {
        return {
          ok: false,
          error: `Could not parse ${!fg ? foreground : background} as a color.`,
        }
      }
      const ratio = contrastRatio(fg, bg)
      const grade = wcagGrade(ratio)
      return {
        ok: true,
        foreground: fg.hex,
        background: bg.hex,
        ratio: Math.round(ratio * 100) / 100,
        grade,
        passes: {
          aaNormal: ratio >= 4.5,
          aaLarge: ratio >= 3,
          aaaNormal: ratio >= 7,
          aaaLarge: ratio >= 4.5,
        },
      }
    },
  }),
}
