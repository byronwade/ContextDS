/**
 * Client-side handoff so Chat "Open" can show a contract even when
 * Blob/Redis persistence briefly misses (or preview deploys lack Redis).
 */

import type { ScanWidgetPayload } from '@/components/molecules/scan-result-widget'
import type { ScanResult } from '@/stores/scan-store'

const KEY = (domain: string) => `dc:site-handoff:${normalizeDomain(domain)}`

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]!
}

export function stashSiteHandoff(domain: string, payload: ScanWidgetPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      KEY(domain),
      JSON.stringify({
        savedAt: Date.now(),
        payload,
      })
    )
  } catch {
    // quota / private mode — ignore
  }
}

export function readSiteHandoff(domain: string): ScanWidgetPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY(domain))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt?: number; payload?: ScanWidgetPayload }
    if (!parsed.payload?.domain) return null
    // Discard stale handoffs (> 2h)
    if (parsed.savedAt && Date.now() - parsed.savedAt > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEY(domain))
      return null
    }
    return parsed.payload
  } catch {
    return null
  }
}

/** Best-effort ScanResult from the chat widget payload (partial OK). */
export function handoffToScanResult(payload: ScanWidgetPayload): ScanResult | null {
  const domain = payload.domain ? normalizeDomain(payload.domain) : null
  if (!domain) return null

  const curatedCount = payload.summary?.curatedCount
  const colors = payload.tokens?.colors ?? []
  const families = payload.tokens?.typography?.families ?? []

  return {
    status: payload.status === 'failed' ? 'failed' : 'completed',
    domain,
    summary: {
      tokensExtracted: payload.summary?.tokensExtracted ?? colors.length + families.length,
      curatedCount: curatedCount
        ? {
            colors: Number(curatedCount.colors ?? colors.length) || 0,
            fonts: Number(curatedCount.fonts ?? families.length) || 0,
            sizes: Number(curatedCount.sizes ?? 0) || 0,
            spacing: Number(curatedCount.spacing ?? 0) || 0,
            radius: Number(curatedCount.radius ?? 0) || 0,
            shadows: Number(curatedCount.shadows ?? 0) || 0,
          }
        : undefined,
      confidence: payload.summary?.confidence ?? 0,
      completeness: payload.summary?.completeness ?? 0,
      reliability: 0,
      processingTime: payload.summary?.processingTime ?? 0,
    },
    curatedTokens: {
      colors,
      typography: { families },
    },
    tokens: payload.tokens,
    brandAnalysis: payload.brand
      ? {
          primaryColors: payload.brand.primaryColors,
          personality: payload.brand.personality,
          primaryFont: payload.brand.primaryFont,
        }
      : undefined,
    designContract: payload.designContract
      ? {
          slug: domain,
          title: payload.designContract.title ?? `${domain} Design Contract`,
          profile: 'handoff',
          installCommand: payload.designContract.installCommand ?? `npx designcontracts add ${domain}`,
          summary: {
            colorCount: payload.designContract.summary?.colorCount ?? colors.length,
            typographyCount: payload.designContract.summary?.typographyCount ?? families.length,
            spacingCount: 0,
            fileCount: payload.designContract.summary?.fileCount ?? 0,
          },
        }
      : undefined,
    semanticGraph: payload.graph?.summary
      ? {
          schemaVersion: 1,
          summary: {
            nodeCount: payload.graph.summary.nodeCount ?? 0,
            edgeCount: payload.graph.summary.edgeCount ?? 0,
            tokenCount: 0,
            roleCount: payload.graph.summary.roleCount ?? 0,
            componentCount: payload.graph.summary.componentCount ?? 0,
            layoutCount: 0,
            patternCount: 0,
          },
          nodes: [],
          edges: [],
        }
      : payload.graphSummary
        ? {
            schemaVersion: 1,
            summary: {
              nodeCount: payload.graphSummary.nodeCount ?? 0,
              edgeCount: payload.graphSummary.edgeCount ?? 0,
              tokenCount: 0,
              roleCount: payload.graphSummary.roleCount ?? 0,
              componentCount: payload.graphSummary.componentCount ?? 0,
              layoutCount: 0,
              patternCount: 0,
            },
            nodes: [],
            edges: [],
          }
        : undefined,
    screenshots: payload.screenshots?.map((s) => ({
      label: s.label ?? 'homepage',
      url: s.url,
    })),
    metadata: {
      cssSources: 0,
      mode: (payload.mode as 'fast' | 'accurate' | undefined) ?? 'fast',
      engine: payload.browserEngine ?? 'design-contracts',
      browserEngine: payload.browserEngine ?? undefined,
    },
    cacheHit: true,
  }
}
