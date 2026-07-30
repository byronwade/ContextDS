/**
 * Map a stored / API scan payload into the client ScanResult shape.
 */

import type { ScanResult } from '@/stores/scan-store'

type StoredLike = {
  id?: string
  domain: string
  url?: string
  status?: 'completed' | 'failed'
  summary: ScanResult['summary']
  tokens?: unknown
  curatedTokens?: unknown
  layoutDNA?: unknown
  brandAnalysis?: unknown
  designMd?: ScanResult['designMd']
  designSkill?: ScanResult['designSkill']
  designContract?: ScanResult['designContract'] & { download?: string }
  semanticGraph?: ScanResult['semanticGraph'] | unknown
  screenshots?: ScanResult['screenshots']
  metadata?: ScanResult['metadata'] & {
    scanId?: string
    tokenSetId?: string
    cssSources?: number
    mode?: 'fast' | 'accurate'
  }
  promptPack?: unknown
}

/** Convert GET /api/sites/[domain].scan into the zustand ScanResult. */
export function storedScanToClientResult(scan: StoredLike): ScanResult {
  const scanId = scan.metadata?.scanId || scan.id || `scan_${scan.domain}`
  const tokenSetId = scan.metadata?.tokenSetId || `tokens_${scan.domain}`
  const storage = {
    siteId: `site_${scan.domain}`,
    scanId,
    tokenSetId,
    stored: true,
    backend: { blob: true, redis: true, memory: false },
  }

  return {
    status: scan.status === 'failed' ? 'failed' : 'completed',
    domain: scan.domain,
    summary: scan.summary,
    tokens: scan.tokens,
    curatedTokens: scan.curatedTokens,
    layoutDNA: scan.layoutDNA,
    brandAnalysis: scan.brandAnalysis,
    designMd: scan.designMd,
    designSkill: scan.designSkill,
    designContract: scan.designContract,
    semanticGraph: scan.semanticGraph as ScanResult['semanticGraph'],
    screenshots: scan.screenshots,
    metadata: {
      ...scan.metadata,
      scanId,
      tokenSetId,
      cssSources: scan.metadata?.cssSources ?? 0,
      mode: scan.metadata?.mode ?? 'fast',
    },
    database: storage,
    storage,
    cacheHit: true,
  }
}
