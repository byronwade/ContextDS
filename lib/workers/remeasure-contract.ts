/**
 * CSS remeasure follow-up for vision App Packs.
 *
 * Keeps vision screenshots / surface metadata, runs an accurate URL scan for
 * measured CSS tokens, merges (CSS wins measured categories), regenerates the
 * Design Contract pack, and saves a new version snapshot.
 */

import { generateDesignMd } from '@/lib/analyzers/design-md-generator'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import type { DriftObservation } from '@/lib/contracts/contextds-drift'
import { buildDesignContractPackage } from '@/lib/contracts/design-contract-package'
import { contractDownloadPath, normalizeDomain } from '@/lib/domain'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'
import {
  getScan,
  saveScan,
  type StoredScanResult,
} from '@/lib/storage/serverless-store'
import { runSimpleScan } from '@/lib/workers/simple-scan'

export type RemeasureInput = {
  domain: string
  /** Live app URL to measure (defaults to stored scan URL) */
  url?: string
  capture?: {
    pages?: number
    paths?: string[]
    auth?: {
      cookies?: Array<{
        name: string
        value: string
        domain?: string
        path?: string
      }>
      headers?: Record<string, string>
    }
  }
  mergeStrategy?: 'css-wins' | 'vision-fills-gaps'
}

export type RemeasureResult = {
  status: 'completed'
  domain: string
  url: string
  summary: StoredScanResult['summary']
  curatedTokens?: StoredScanResult['curatedTokens']
  designMd?: StoredScanResult['designMd']
  designSkill?: StoredScanResult['designSkill']
  designContract?: StoredScanResult['designContract']
  screenshots?: StoredScanResult['screenshots']
  metadata: StoredScanResult['metadata']
  storage: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: boolean
    backend: { blob: boolean; redis: boolean; memory: boolean }
  }
}

/** Exported for unit tests — CSS categories win when present. */
export function mergeCurated(
  vision: CuratedTokenSet | undefined,
  measured: CuratedTokenSet | undefined,
  strategy: 'css-wins' | 'vision-fills-gaps'
): CuratedTokenSet {
  const empty: CuratedTokenSet = {
    colors: [],
    typography: { families: [], sizes: [], weights: [] },
    spacing: [],
    radius: [],
    shadows: [],
    motion: [],
  }
  const a = vision || empty
  const b = measured || empty

  return {
    colors: b.colors?.length ? b.colors : a.colors,
    typography: {
      families: b.typography?.families?.length
        ? b.typography.families
        : a.typography?.families || [],
      sizes: b.typography?.sizes?.length
        ? b.typography.sizes
        : a.typography?.sizes || [],
      weights: b.typography?.weights?.length
        ? b.typography.weights
        : a.typography?.weights || [],
    },
    spacing: b.spacing?.length ? b.spacing : a.spacing,
    radius: b.radius?.length ? b.radius : a.radius,
    shadows: b.shadows?.length ? b.shadows : a.shadows,
    motion: b.motion?.length ? b.motion : a.motion,
    metadata: {
      ...(a.metadata || {}),
      ...(b.metadata || {}),
      merged: true,
      remeasureStrategy: strategy,
    },
  }
}

export async function runRemeasureContract(
  input: RemeasureInput
): Promise<RemeasureResult> {
  const domain = normalizeDomain(input.domain)
  const baseline = await getScan(domain)
  if (!baseline || baseline.status !== 'completed') {
    throw new Error(
      `No completed App Pack / scan found for ${domain}. Create a vision pack first.`
    )
  }

  const isVision =
    baseline.metadata?.engine === 'design-contracts-vision' ||
    Boolean(baseline.metadata?.appPackImages) ||
    Boolean(baseline.metadata?.visionSurface)

  const measureUrl = (input.url || baseline.url || `https://${domain}`).trim()
  const strategy = input.mergeStrategy || 'css-wins'

  // Accurate scan measures CSS (also persists once — we overwrite with merge below)
  const measured = await runSimpleScan({
    url: measureUrl,
    mode: 'accurate',
    force: true,
    capture: input.capture
      ? {
          pages: input.capture.pages,
          paths: input.capture.paths,
          auth: input.capture.auth,
        }
      : undefined,
  })

  const merged = mergeCurated(
    baseline.curatedTokens as CuratedTokenSet | undefined,
    measured.curatedTokens as CuratedTokenSet | undefined,
    strategy
  )

  const confidence = Math.min(
    96,
    Math.round(
      Math.max(baseline.summary.confidence, measured.summary.confidence) * 0.55 +
        measured.summary.confidence * 0.45 +
        (measured.metadata.computedCssSources > 0 ? 6 : 0)
    )
  )

  const scannedAt = new Date().toISOString()
  const scanId = measured.metadata.scanId
  const tokenSetId = measured.metadata.tokenSetId

  const brandAnalysis = {
    ...(baseline.brandAnalysis || {}),
    ...(measured.brandAnalysis || {}),
  }

  const designMd = generateDesignMd({
    domain,
    url: measureUrl,
    confidence,
    curatedTokens: merged,
    brandAnalysis,
    layoutDNA: measured.layoutDNA,
    semanticGraph: measured.semanticGraph ?? null,
  })

  const designSkill = generateDesignSkill({
    domain,
    url: measureUrl,
    designMdFileName: designMd.fileName,
    curatedTokens: merged,
    personality:
      typeof brandAnalysis.personality === 'string'
        ? brandAnalysis.personality
        : undefined,
  })

  // Prefer App Pack screenshots; fall back to measured captures
  const screenshots = baseline.screenshots?.length
    ? baseline.screenshots
    : measured.screenshots

  const driftObservations: DriftObservation[] = [
    {
      surface: 'site',
      kind: 'css-remeasure',
      summary: `CSS remeasure of ${domain} against live URL ${measureUrl}. Strategy: ${strategy}. Vision baseline retained for screenshots${isVision ? ' and app-surface cues' : ''}.`,
      observedAt: scannedAt,
      evidence: {
        visionBaselineScanId: baseline.metadata.scanId,
        measuredScanId: scanId,
        computedCssSources: measured.metadata.computedCssSources,
        strategy,
      },
      suggestedAction:
        'Prefer CSS-measured tokens for implementation. Open pack screenshots when layout/materials are ambiguous.',
    },
  ]

  const profile = measured.designContract?.profile || 'web-app'
  const appType = measured.metadata.appType || baseline.metadata.appType

  const contractPack = buildDesignContractPackage({
    domain,
    url: measureUrl,
    scanId,
    confidence,
    curatedTokens: merged,
    brandAnalysis,
    profile,
    appType,
    driftObservations,
    screenshots: (screenshots || []).map((shot) => ({
      label: shot.label,
      url: shot.url,
      mime: shot.mime,
      note: 'Retained from App Pack / prior capture for agent visual ground truth.',
    })),
    semanticGraph: measured.semanticGraph ?? null,
  })

  const stored: StoredScanResult = {
    id: scanId,
    domain,
    url: measureUrl,
    scannedAt,
    status: 'completed',
    summary: {
      tokensExtracted:
        (merged.colors?.length || 0) +
        (merged.typography?.families?.length || 0) +
        (merged.spacing?.length || 0),
      curatedCount: {
        colors: merged.colors?.length || 0,
        fonts: merged.typography?.families?.length || 0,
        sizes: merged.typography?.sizes?.length || 0,
        spacing: merged.spacing?.length || 0,
        radius: merged.radius?.length || 0,
        shadows: merged.shadows?.length || 0,
      },
      confidence,
      completeness: Math.min(96, Math.max(baseline.summary.completeness, 78)),
      reliability: Math.round((confidence + 80) / 2),
      processingTime: measured.summary.processingTime,
    },
    tokens: {
      colors: merged.colors ?? [],
      typography: [
        ...(merged.typography?.families ?? []),
        ...(merged.typography?.sizes ?? []),
      ],
      spacing: merged.spacing ?? [],
      radius: merged.radius ?? [],
      shadows: merged.shadows ?? [],
      motion: merged.motion ?? [],
    },
    curatedTokens: merged,
    brandAnalysis,
    layoutDNA: measured.layoutDNA,
    designMd: {
      markdown: designMd.markdown,
      fileName: designMd.fileName,
      summary: designMd.summary,
    },
    designSkill: {
      markdown: designSkill.markdown,
      fileName: designSkill.fileName,
      skillName: designSkill.skillName,
      description: designSkill.description,
    },
    designContract: {
      slug: contractPack.slug,
      title: contractPack.title,
      profile: contractPack.profile,
      installCommand: contractPack.installCommand,
      summary: contractPack.summary,
      files: contractPack.files,
      download: contractDownloadPath(domain),
    },
    screenshots,
    uxDna: measured.uxDna || baseline.uxDna,
    semanticGraph: measured.semanticGraph,
    metadata: {
      ...measured.metadata,
      scanId,
      tokenSetId,
      mode: 'accurate',
      engine: 'design-contracts-remeasure',
      visionSurface: baseline.metadata.visionSurface,
      visionSignature: baseline.metadata.visionSignature,
      appPackImages: baseline.metadata.appPackImages,
      remeasuredAt: scannedAt,
      remeasureSource:
        measured.metadata.browserEngine
          ? 'browser-service'
          : measured.metadata.computedCssSources > 0
            ? 'local-playwright'
            : 'static-only',
      visionBaselineScanId: baseline.metadata.scanId,
    },
  }

  const site = await saveScan(stored)

  return {
    status: 'completed',
    domain,
    url: measureUrl,
    summary: stored.summary,
    curatedTokens: stored.curatedTokens,
    designMd: stored.designMd,
    designSkill: stored.designSkill,
    designContract: stored.designContract,
    screenshots: stored.screenshots,
    metadata: stored.metadata,
    storage: {
      siteId: site.id,
      scanId,
      tokenSetId,
      stored: true,
      backend: {
        blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        redis: Boolean(
          process.env.UPSTASH_REDIS_REST_URL ||
            process.env.REDIS_URL ||
            process.env.KV_REST_API_URL
        ),
        memory: true,
      },
    },
  }
}
