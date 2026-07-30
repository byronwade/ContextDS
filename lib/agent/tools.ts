/**
 * Design Contract agent tools — wrap the existing scan / store / contract APIs.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { contractDownloadPath, ensureAbsoluteUrl, normalizeDomain } from '@/lib/domain'
import { isBrowserServiceConfigured } from '@/lib/scanner/browser-service'
import { getScan, getSite } from '@/lib/storage/serverless-store'
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
    }),
    execute: async ({ url, mode, force }) => {
      const absolute = ensureAbsoluteUrl(url)
      const resolvedMode = resolveScanMode(mode)
      const result = await runSimpleScan({
        url: absolute,
        mode: resolvedMode,
        force,
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
}
