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
  type UxEvidence,
} from '@/lib/analyzers/design-philosophy'
import { validateConsistency } from '@/lib/analyzers/consistency-validator'
import { generateDesignMd } from '@/lib/analyzers/design-md-generator'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'
import { composeDesignMdProse } from '@/lib/ai/design-md-composer'
import {
  applyPatch,
  createWorkingSystem,
  isRenderableColor,
  workingSystemFromScan,
  type SystemPatch,
  type WorkingSystem,
} from '@/lib/design-system/working-system'
import { contractDownloadPath, ensureAbsoluteUrl, normalizeDomain } from '@/lib/domain'
import { isBrowserServiceConfigured } from '@/lib/scanner/browser-service'
import { getScan, getSite, listSites, saveScan } from '@/lib/storage/serverless-store'
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

/** One-line description of a working system for the canvas header. */
function canvasSummary(system: WorkingSystem): string {
  const type =
    system.fontDisplay === system.fontBody
      ? system.fontDisplay
      : `${system.fontDisplay} / ${system.fontBody}`
  return `${system.name} — ${system.colors.length} color roles, ${type} at ${system.baseSize}px × ${system.scaleRatio}, ${system.spacingBase}px grid, ${system.radius}px corners, ${system.depth} depth.`
}

/** Mirrors SystemPatch — every field optional, ranges enforced by applyPatch. */
const systemPatchSchema = z.object({
  name: z.string().optional(),
  philosophyNote: z.string().optional().describe('Short prose note on the design intent'),
  fontDisplay: z.string().optional(),
  fontBody: z.string().optional(),
  fontMono: z.string().optional(),
  baseSize: z.number().optional().describe('Body size in px (10–24)'),
  scaleRatio: z.number().optional().describe('Type scale ratio (1.05–1.8)'),
  scaleSteps: z.number().optional().describe('Type scale steps (3–10)'),
  spacingBase: z.union([z.literal(4), z.literal(8)]).optional(),
  spacingSteps: z.number().optional().describe('Spacing scale steps (4–12)'),
  radius: z.number().optional().describe('Corner radius in px (0–48)'),
  depth: z.enum(['flat', 'soft', 'layered']).optional(),
  colors: z
    .record(z.string(), z.string())
    .optional()
    .describe('Merge by role, e.g. { primary: "#c08a5f" }. Unknown roles are appended.'),
})

export const designContractTools = {
  scan_site: tool({
    description:
      'Primary gather tool: scan a public site into curated tokens, layout/UX DNA, measured component recipes, philosophy, design-director DESIGN.md, semantic graph, and an installable Design Contract pack. Prefer accurate mode (browser) for elite quality. The chat UI renders an inline widget — keep follow-up text short.',
    inputSchema: z.object({
      url: z
        .string()
        .describe('Absolute or bare website URL, e.g. stripe.com or https://stripe.com'),
      mode: z
        .enum(['fast', 'accurate'])
        .optional()
        .describe(
          'fast = static CSS only; accurate = Playwright browser capture with measured components/shell/density/interaction when SCANNER_SERVICE_URL is set. Omit to auto-pick accurate when the scanner is configured.'
        ),
      force: z.boolean().default(false).describe('Bypass the 24h cache and rescan'),
      paths: z
        .array(z.string().startsWith('/'))
        .max(12)
        .optional()
        .describe(
          'Explicit same-origin paths to crawl during accurate scans, e.g. ["/pricing", "/docs"]. Omit to let the crawler discover key pages itself (it crawls ~6 by default, aggregating CSS + render evidence across all of them).'
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
      'Return the elite DESIGN.md contract for a scanned domain (YAML tokens + philosophy + measured component recipes + director prose). Quote its principles when advising; never invent competing tokens.',
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
      'Deterministic design critique for a scanned domain: philosophy (with UX DNA when available), consistency score, principles, and measurable flags. Use for "how good/consistent is this design system?"',
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
      const uxDna = scan?.uxDna as
        | {
            shell?: UxEvidence['shell']
            density?: UxEvidence['density']
            interaction?: UxEvidence['interaction']
            keyframes?: unknown[]
          }
        | undefined
      const ux: UxEvidence | null = uxDna
        ? {
            shell: uxDna.shell ?? null,
            density: uxDna.density ?? null,
            interaction: uxDna.interaction
              ? {
                  rules: uxDna.interaction.rules,
                  effects: uxDna.interaction.effects ?? [],
                }
              : null,
            keyframeCount: Array.isArray(uxDna.keyframes) ? uxDna.keyframes.length : 0,
          }
        : null

      const philosophy = generatePhilosophy({
        domain: key,
        curated,
        personality: brand?.personality ?? null,
        ux,
      })
      const { color, type, space, shape } = philosophy.systems
      const consistency = validateConsistency(curated as CuratedTokenSet)

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

      const flags: string[] = [...consistency.colorConsistency.recommendations.slice(0, 2)]
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
      if (!ux) {
        flags.push('no UX DNA stored — rescan in accurate mode for shell/density/interaction critique')
      }

      return {
        found: true,
        domain: key,
        title: philosophy.title,
        statement: philosophy.statement,
        traits: philosophy.traits,
        principles: philosophy.principles,
        consistency: {
          overall: consistency.overallScore,
          color: consistency.colorConsistency.score,
          spacing: consistency.spacingConsistency.score,
          typography: consistency.typographyConsistency.score,
        },
        metrics: {
          neutrals: color.neutrals.length,
          chromatic: color.chromatic.length,
          fontFamilies: type.families.length,
          typeScale: type.scaleLabel ?? type.scaleRatio,
          spacingGrid: space.base ? `${space.base}px @ ${space.gridFit}%` : null,
          radii: shape.radiiPx,
          contrastAA: checkedPairs > 0 ? `${aaPairs}/${checkedPairs} core pairings` : null,
          motionTempo: philosophy.systems.motion.tempo,
          hasUxDna: Boolean(ux),
        },
        flags: Array.from(new Set(flags)).slice(0, 10),
        nextStep:
          'If prose feels generic, call refine_design_md to rewrite director guidance from measured evidence.',
      }
    },
  }),

  refine_design_md: tool({
    description:
      'Recompose DESIGN.md director prose (and skill) for a scanned domain from stored tokens + UX DNA + philosophy — does not invent new token values. Use after critique_design or when the user wants sharper site-specific guidance.',
    inputSchema: z.object({
      domain: z.string(),
      focus: z
        .string()
        .max(200)
        .optional()
        .describe('Optional sharpening focus, e.g. "motion scarcity", "type pairing", "dense app shell"'),
    }),
    execute: async ({ domain, focus }) => {
      const key = normalizeDomain(domain)
      const scan = await getScan(key)
      const curated = scan?.curatedTokens as CuratedLike | undefined
      if (!scan || !curated) {
        return { found: false, domain: key, suggestion: `Scan ${key} first with scan_site.` }
      }

      const brand = scan.brandAnalysis as {
        personality?: string
        primaryColors?: string[]
      } | null
      const uxDna = scan.uxDna as
        | {
            shell?: UxEvidence['shell']
            density?: UxEvidence['density']
            interaction?: {
              rules: number
              effects: Array<{ value: string; weight: number }>
            }
            components?: Record<string, unknown> | null
            transitions?: Array<{ value: string; weight: number }>
            keyframes?: Array<{ name: string; css?: string }>
          }
        | undefined

      const uxEvidence: UxEvidence | null = uxDna
        ? {
            shell: uxDna.shell ?? null,
            density: uxDna.density ?? null,
            interaction: uxDna.interaction
              ? {
                  rules: uxDna.interaction.rules,
                  effects: uxDna.interaction.effects ?? [],
                }
              : null,
            keyframeCount: uxDna.keyframes?.length ?? 0,
          }
        : null

      const philosophy = generatePhilosophy({
        domain: key,
        curated,
        personality: brand?.personality ?? null,
        primaryFont: curated.typography?.families?.[0]?.value
          ? String(curated.typography.families[0].value)
          : null,
        ux: uxEvidence,
      })

      const layout = scan.layoutDNA as {
        containers?: { maxWidth?: string | null; strategy?: string }
        breakpoints?: Array<number | string>
        gridSystem?: string
        spacingBase?: number | null
        archetypes?: Array<string | { type: string; confidence?: number }>
      } | null

      const archetype =
        typeof layout?.archetypes?.[0] === 'string'
          ? layout.archetypes[0]
          : layout?.archetypes?.[0]?.type || layout?.gridSystem || 'marketing site'

      const measuredComponents =
        (uxDna?.components as Record<
          string,
          {
            backgroundColor?: string
            textColor?: string
            borderColor?: string
            rounded?: string
            padding?: string
            fontSize?: string
            fontWeight?: string
            boxShadow?: string
            sampleCount?: number
            hover?: Record<string, string>
          } | null
        > | null) ?? null

      const measuredKeys = measuredComponents
        ? Object.keys(measuredComponents).filter((k) => measuredComponents[k])
        : []

      const aiProse = await composeDesignMdProse({
        domain: key,
        url: scan.url,
        philosophy,
        archetype,
        confidence: scan.summary.confidence,
        colorKeys: (curated.colors ?? []).slice(0, 12).map((c) => String(c.value)),
        headlineFont: String(curated.typography?.families?.[0]?.value || 'system-ui'),
        bodyFont: String(
          curated.typography?.families?.[1]?.value ||
            curated.typography?.families?.[0]?.value ||
            'system-ui'
        ),
        spacingBase: philosophy.systems.space.base || layout?.spacingBase || 8,
        motionTempo: philosophy.systems.motion.tempo,
        shellSummary: uxEvidence?.shell
          ? [
              uxEvidence.shell.header
                ? `${uxEvidence.shell.header.height}px header`
                : null,
              uxEvidence.shell.sidebar
                ? `${uxEvidence.shell.sidebar.width}px sidebar`
                : null,
            ]
              .filter(Boolean)
              .join(', ') || null
          : null,
        densitySummary: uxEvidence?.density
          ? `${uxEvidence.density.elementsInViewport} els/viewport`
          : null,
        interactionSummary: uxEvidence?.interaction?.effects
          ?.slice(0, 6)
          .map((e) => e.value)
          .join('; '),
        measuredComponentsSummary: measuredKeys.join(', ') || null,
        keyframeSummary: uxDna?.keyframes?.map((frame) => frame.name).slice(0, 6).join(', ') || null,
      })

      // Optionally bias preferred bullets via focus note in overview when AI returns
      if (aiProse && focus?.trim()) {
        aiProse.overview = `${aiProse.overview} Focus for this refinement: ${focus.trim()}.`
      }

      const designMd = generateDesignMd({
        domain: key,
        url: scan.url,
        curatedTokens: {
          colors: (curated.colors ?? []).map((c) => ({
            name: c.name,
            value: String(c.value),
            usage: c.usage,
          })),
          typography: {
            families: (curated.typography?.families ?? []).map((t) => ({
              value: String(t.value),
              usage: t.usage,
            })),
            sizes: (curated.typography?.sizes ?? []).map((t) => ({
              value: String(t.value),
              usage: t.usage,
            })),
            weights: (curated.typography?.weights ?? []).map((t) => ({
              value: String(t.value),
              usage: t.usage,
            })),
          },
          spacing: (curated.spacing ?? []).map((t) => ({
            value: String(t.value),
            usage: t.usage,
          })),
          radius: (curated.radius ?? []).map((t) => ({
            value: String(t.value),
            usage: t.usage,
          })),
          shadows: (curated.shadows ?? []).map((t) => ({
            value: String(t.value),
            usage: t.usage,
          })),
          motion: (curated.motion ?? []).map((t) => ({
            value: String(t.value),
            usage: t.usage,
          })),
        },
        layoutDNA: layout,
        brandAnalysis: brand,
        confidence: scan.summary.confidence,
        philosophy,
        uxEvidence,
        uxMotion: {
          transitions: uxDna?.transitions,
          keyframes: uxDna?.keyframes,
        },
        measuredComponents,
        aiProse,
      })

      const skill = generateDesignSkill({
        domain: key,
        url: scan.url,
        designMdFileName: designMd.fileName,
        curatedTokens: {
          colors: (curated.colors ?? []).map((c) => ({ value: String(c.value), name: c.name })),
          typography: {
            families: (curated.typography?.families ?? []).map((t) => ({
              value: String(t.value),
            })),
            sizes: (curated.typography?.sizes ?? []).map((t) => ({ value: String(t.value) })),
          },
          spacing: (curated.spacing ?? []).map((t) => ({ value: String(t.value) })),
          radius: (curated.radius ?? []).map((t) => ({ value: String(t.value) })),
        },
        personality: brand?.personality,
        philosophy: {
          title: philosophy.title,
          statement: philosophy.statement,
          traits: philosophy.traits,
          principles: philosophy.principles,
          motionTempo: philosophy.systems.motion.tempo,
          typeVoice: philosophy.systems.type.voice,
          shapeCharacter: philosophy.systems.shape.character,
          depth: philosophy.systems.shape.depth,
        },
        measuredComponents: measuredKeys,
      })

      await saveScan({
        ...scan,
        designMd: {
          markdown: designMd.markdown,
          fileName: designMd.fileName,
          summary: designMd.summary,
        },
        designSkill: {
          markdown: skill.markdown,
          fileName: skill.fileName,
          skillName: skill.skillName,
          description: skill.description,
        },
      })

      return {
        found: true,
        domain: key,
        refined: true,
        aiComposed: Boolean(aiProse),
        focus: focus ?? null,
        fileName: designMd.fileName,
        markdown: designMd.markdown,
        summary: designMd.summary,
        signature: aiProse?.distinctiveSignature ?? philosophy.traits.slice(0, 4).join(', '),
        note: aiProse
          ? 'Director prose rewritten from measured philosophy/UX DNA. YAML tokens unchanged.'
          : 'AI Gateway unavailable — regenerated deterministic philosophy prose; YAML tokens unchanged.',
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

  blend_systems: tool({
    description:
      'Merge 2–10 scanned design systems into ONE coherent new system — deterministic blending of neutrals, accent families, type, spacing grid, radius and depth, with per-choice attribution and a ready DESIGN.md. The way to "combine these sites into my own design system". Scan any missing domain first.',
    inputSchema: z.object({
      domains: z.array(z.string()).min(2).max(10),
      name: z.string().max(80).optional().describe('Name for the blended system'),
    }),
    execute: async ({ domains, name }) => {
      const keys = Array.from(new Set(domains.map((domain) => normalizeDomain(domain))))
      const scans = await Promise.all(keys.map((key) => getScan(key)))
      const sources = keys
        .map((domain, index) => ({
          domain,
          curated: scans[index]?.curatedTokens as CuratedLike | undefined,
        }))
        .filter((source): source is { domain: string; curated: CuratedLike } =>
          Boolean(source.curated)
        )
      const missing = keys.filter(
        (domain) => !sources.some((source) => source.domain === domain)
      )
      if (sources.length < 2) {
        return {
          found: false,
          missing,
          suggestion: `Scan ${missing.join(', ')} with scan_site first, then blend again.`,
        }
      }

      const { blendSystems } = await import('@/lib/analyzers/system-blend')
      const blend = blendSystems(sources, name)

      return {
        found: true,
        name: blend.name,
        sources: blend.sources,
        skipped: missing,
        philosophy: {
          title: blend.philosophy.title,
          statement: blend.philosophy.statement,
          traits: blend.philosophy.traits,
        },
        palette: blend.palette,
        system: {
          colors: blend.system.colors,
          fonts: {
            display: blend.system.fontDisplay,
            body: blend.system.fontBody,
            mono: blend.system.fontMono,
          },
          typeScale: `${blend.system.baseSize}px × ${blend.system.scaleRatio}`,
          spacing: `${blend.system.spacingBase}px grid`,
          radius: `${blend.system.radius}px`,
          depth: blend.system.depth,
        },
        attribution: blend.attribution,
        designMd: blend.designMd,
        note: 'Deterministic merge — same inputs always blend to the same system. The DESIGN.md is drop-in ready; open /studio to tweak it by hand.',
      }
    },
  }),

  restyle_page: tool({
    description:
      'Rebuild guide combining two scanned sites: the page STRUCTURE (layout DNA, containers, breakpoints, archetypes) of one domain re-skinned with the design SYSTEM (colors, type, spacing, shape) of another. Returns a concrete markdown brief an agent or developer can build from.',
    inputSchema: z.object({
      structureDomain: z.string().describe('Domain whose page layout/structure to keep'),
      skinDomain: z.string().describe('Domain whose design system to apply'),
    }),
    execute: async ({ structureDomain, skinDomain }) => {
      const [structureKey, skinKey] = [
        normalizeDomain(structureDomain),
        normalizeDomain(skinDomain),
      ]
      const [structureScan, skinScan] = await Promise.all([
        getScan(structureKey),
        getScan(skinKey),
      ])
      const layout = structureScan?.layoutDNA as
        | {
            containers?: { maxWidth?: string | null; strategy?: string }
            gridSystem?: string
            spacingBase?: number | null
            breakpoints?: number[]
            archetypes?: Array<{ type: string; confidence: number }>
          }
        | undefined
      const skin = skinScan?.curatedTokens as CuratedLike | undefined
      if (!layout || !skin) {
        return {
          found: false,
          missing: [!layout ? structureKey : null, !skin ? skinKey : null].filter(Boolean),
          suggestion: 'Scan the missing domain(s) with scan_site first.',
        }
      }

      const philosophy = generatePhilosophy({ domain: skinKey, curated: skin })
      const { color, type, space, shape } = philosophy.systems
      const background =
        color.polarity === 'dark-leaning' ? color.darkest : color.lightest
      const foreground =
        color.polarity === 'dark-leaning' ? color.lightest : color.darkest

      const brief = [
        `# Rebuild: ${structureKey} structure × ${skinKey} skin`,
        '',
        '## Keep from ' + structureKey + ' (structure)',
        `- Container: ${layout.containers?.strategy ?? 'centered'}${layout.containers?.maxWidth ? ` @ ${layout.containers.maxWidth}` : ''}`,
        `- Layout engine: ${layout.gridSystem ?? 'flexbox'}`,
        `- Breakpoints: ${(layout.breakpoints ?? []).join('px, ')}px`,
        `- Page archetypes: ${(layout.archetypes ?? [])
          .slice(0, 5)
          .map((archetype) => archetype.type)
          .join(', ')}`,
        '',
        '## Apply from ' + skinKey + ' (system)',
        `- Background ${background?.hex ?? '—'} · Foreground ${foreground?.hex ?? '—'} · Accent ${color.accent?.hex ?? '—'}`,
        `- Palette: ${color.chromatic.slice(0, 6).map((c) => c.hex).join(', ')}`,
        `- Type: ${type.families.map((f) => f.primary).join(' + ')}${type.scaleLabel ? ` on a ${type.scaleLabel} scale` : ''}`,
        `- Spacing: ${space.base ? `${space.base}px grid` : 'optical'}; Corners: ${shape.character} (${shape.radiiPx.slice(0, 4).join(', ')}px); Depth: ${shape.depth}`,
        '',
        '## Rules',
        `- Rebuild each ${structureKey} section with the archetype it already has, restyled with the tokens above — never invent new colors or sizes.`,
        `- ${philosophy.principles[0]?.body ?? ''}`,
        `- Verify text/surface pairings with check_contrast before shipping.`,
      ].join('\n')

      return {
        found: true,
        structure: { domain: structureKey, layout },
        skin: {
          domain: skinKey,
          background: background?.hex ?? null,
          foreground: foreground?.hex ?? null,
          accent: color.accent?.hex ?? null,
          fonts: type.families.map((font) => font.primary),
          spacingBase: space.base,
          radii: shape.radiiPx,
          depth: shape.depth,
        },
        brief,
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

  open_canvas: tool({
    description:
      'Open the live design canvas with a system the user can then edit visually — seeded from a blend of 2–10 scanned domains, ONE scanned domain, or a blank system. Use this the moment someone wants to start designing ("open this in the editor", "make my own from these"), not just read a report. Seeds are ranked: blendOf wins over domain, domain wins over fromScratch, so passing extras is safe. The canvas is the artifact — do not restate its tokens in chat.',
    inputSchema: z.object({
      domain: z.string().optional().describe('Seed from one scanned domain, e.g. stripe.com'),
      blendOf: z
        .array(z.string())
        .min(2)
        .max(10)
        .optional()
        .describe('Seed from a blend of 2–10 scanned domains'),
      fromScratch: z.boolean().optional().describe('Seed a blank system to author by hand'),
      name: z.string().max(80).optional().describe('Name for the system on the canvas'),
    }),
    execute: async ({ domain, blendOf, fromScratch, name }) => {
      const named = (system: WorkingSystem) => (name ? applyPatch(system, { name }) : system)

      // Seeds are ranked rather than mutually exclusive: blendOf > domain >
      // fromScratch. Asking to open "the blend of stripe + thorbis" naturally
      // carries a domain too; rejecting that just makes the agent retry it
      // verbatim. Only a completely empty call is an error.
      if (!blendOf?.length && !domain && !fromScratch) {
        return {
          ok: false,
          error:
            'No seed given. Pass blendOf (2–10 scanned domains), domain (one scanned domain), or fromScratch:true.',
        }
      }

      if (domain && !blendOf?.length) {
        const key = normalizeDomain(domain)
        const scan = await getScan(key)
        if (!scan?.curatedTokens) {
          return {
            found: false,
            domain: key,
            suggestion: `No cached scan for ${key}. Call scan_site with url="${key}" first.`,
          }
        }
        const brand = scan.brandAnalysis as { personality?: string } | undefined
        const system = named(
          workingSystemFromScan({
            domain: key,
            scanId: scan.metadata?.scanId ?? scan.id,
            curatedTokens: scan.curatedTokens as CuratedLike,
            personality: brand?.personality ?? null,
          })
        )
        return {
          kind: 'canvas-open' as const,
          system,
          sources: [key],
          scannedAt: scan.scannedAt,
          tokensExtracted: scan.summary?.tokensExtracted ?? null,
          summary: canvasSummary(system),
        }
      }

      if (blendOf?.length) {
        const keys = Array.from(new Set(blendOf.map((entry) => normalizeDomain(entry))))
        const scans = await Promise.all(keys.map((key) => getScan(key)))
        const sources = keys
          .map((key, index) => ({
            domain: key,
            curated: scans[index]?.curatedTokens as CuratedLike | undefined,
          }))
          .filter((source): source is { domain: string; curated: CuratedLike } =>
            Boolean(source.curated)
          )
        const missing = keys.filter((key) => !sources.some((source) => source.domain === key))
        if (sources.length < 2) {
          return {
            found: false,
            missing,
            suggestion: `Scan ${missing.join(', ')} with scan_site first, then open the canvas again.`,
          }
        }

        const { blendSystems } = await import('@/lib/analyzers/system-blend')
        const blend = blendSystems(sources, name)
        // The blend already resolved every field deterministically; the scan
        // seeder only supplies role colors if the blend could not.
        const seeded = workingSystemFromScan({
          domain: blend.name,
          curatedTokens: {
            colors: [...blend.palette.neutrals, ...blend.palette.chromatic].map((value) => ({
              value,
            })),
          },
          personality: blend.philosophy.statement,
        })
        const system: WorkingSystem = {
          ...seeded,
          ...blend.system,
          colors: blend.system.colors.length >= 2 ? blend.system.colors : seeded.colors,
          philosophyNote: blend.philosophy.statement.slice(0, 600),
          origin: { kind: 'blend', sources: blend.sources },
        }
        return {
          kind: 'canvas-open' as const,
          system,
          sources: blend.sources,
          skipped: missing,
          philosophy: { title: blend.philosophy.title, traits: blend.philosophy.traits },
          attribution: blend.attribution,
          summary: canvasSummary(system),
        }
      }

      const system = named(createWorkingSystem())
      return {
        kind: 'canvas-open' as const,
        system,
        sources: [] as string[],
        summary: canvasSummary(system),
        note: 'Blank system — shape it with update_canvas as the user describes what they want.',
      }
    },
  }),

  update_canvas: tool({
    description:
      'Turn a design request in words ("make it warmer and rounder", "tighten the type scale") into a concrete patch on the live canvas system. Stateless: it validates and normalizes the patch, the canvas applies it. Use this instead of describing a change in prose — the canvas shows it.',
    inputSchema: z.object({
      patch: systemPatchSchema.describe('Only the fields that change'),
      reason: z
        .string()
        .max(240)
        .describe('One short sentence shown beside the canvas, e.g. "Warmer accent, softer corners."'),
    }),
    execute: async ({ patch, reason }) => {
      const warnings: string[] = []
      const rejectedColors: string[] = []
      const normalized: SystemPatch = {}

      // Predict clamping honestly: run the patch through applyPatch on a default
      // system and diff the result, rather than restating the ranges here.
      const applied = applyPatch(createWorkingSystem(), patch)
      const note = (field: string, requested: unknown, resolved: unknown) => {
        if (requested !== resolved) {
          warnings.push(
            `${field}: ${JSON.stringify(requested)} → ${JSON.stringify(resolved)} (normalized to the canvas range).`
          )
        }
      }

      if (patch.name !== undefined) {
        normalized.name = applied.name
        note('name', patch.name, applied.name)
      }
      if (patch.philosophyNote !== undefined) {
        normalized.philosophyNote = applied.philosophyNote
        note('philosophyNote', patch.philosophyNote, applied.philosophyNote)
      }
      if (patch.fontDisplay !== undefined) {
        normalized.fontDisplay = applied.fontDisplay
        note('fontDisplay', patch.fontDisplay, applied.fontDisplay)
      }
      if (patch.fontBody !== undefined) {
        normalized.fontBody = applied.fontBody
        note('fontBody', patch.fontBody, applied.fontBody)
      }
      if (patch.fontMono !== undefined) {
        normalized.fontMono = applied.fontMono
        note('fontMono', patch.fontMono, applied.fontMono)
      }
      if (patch.baseSize !== undefined) {
        normalized.baseSize = applied.baseSize
        note('baseSize', patch.baseSize, applied.baseSize)
      }
      if (patch.scaleRatio !== undefined) {
        normalized.scaleRatio = applied.scaleRatio
        note('scaleRatio', patch.scaleRatio, applied.scaleRatio)
      }
      if (patch.scaleSteps !== undefined) {
        normalized.scaleSteps = applied.scaleSteps
        note('scaleSteps', patch.scaleSteps, applied.scaleSteps)
      }
      if (patch.spacingBase !== undefined) {
        normalized.spacingBase = applied.spacingBase
        note('spacingBase', patch.spacingBase, applied.spacingBase)
      }
      if (patch.spacingSteps !== undefined) {
        normalized.spacingSteps = applied.spacingSteps
        note('spacingSteps', patch.spacingSteps, applied.spacingSteps)
      }
      if (patch.radius !== undefined) {
        normalized.radius = applied.radius
        note('radius', patch.radius, applied.radius)
      }
      if (patch.depth !== undefined) normalized.depth = applied.depth

      for (const [role, value] of Object.entries(patch.colors ?? {})) {
        if (isRenderableColor(value)) {
          normalized.colors = { ...normalized.colors, [role]: value.trim() }
        } else {
          rejectedColors.push(role)
          warnings.push(
            `colors.${role}: ${JSON.stringify(value)} is not a renderable color — use hex, rgb(), hsl(), oklch() or color(). Dropped.`
          )
        }
      }

      const changed = Object.keys(normalized)
      if (changed.length === 0) {
        warnings.push('Patch is empty — the canvas will not change.')
      }

      return {
        kind: 'canvas-patch' as const,
        patch: normalized,
        reason,
        warnings,
        changed,
        rejectedColors,
      }
    },
  }),
}
