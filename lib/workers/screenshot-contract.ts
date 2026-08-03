/**
 * Screenshot → installable Design Contract worker (Pro App Packs).
 *
 * Requires a minimum set of product UI screenshots (default 5) so vision can
 * synthesize a coherent application Design Contract — not a one-shot guess.
 */

import { put } from '@vercel/blob'
import {
  extractVisionContractDraft,
  mapVisionDraftToContractInput,
  normalizeScreenshotImages,
  syntheticUploadDomain,
  type ScreenshotImageInput,
} from '@/lib/analyzers/screenshot-contract'
import { generateDesignMd } from '@/lib/analyzers/design-md-generator'
import { generateDesignSkill } from '@/lib/analyzers/design-skill-generator'
import type { DriftObservation } from '@/lib/contracts/contextds-drift'
import { buildDesignContractPackage } from '@/lib/contracts/design-contract-package'
import { contractDownloadPath, normalizeDomain } from '@/lib/domain'
import { isAiGatewayConfigured } from '@/lib/ai/gateway'
import { BILLING } from '@/lib/billing/config'
import { getScan, saveScan, type StoredScanResult } from '@/lib/storage/serverless-store'

export type ScreenshotContractInput = {
  /** Preferred multi-image App Pack payload */
  images?: ScreenshotImageInput[]
  /** @deprecated Prefer `images` */
  imageBase64?: string
  mimeType?: string
  /** Product name hint, e.g. "Cursor" */
  name?: string | null
  /** Force web-app bias (default true) */
  preferApp?: boolean
  /** Optional stable domain override */
  domain?: string | null
  minImages?: number
  maxImages?: number
}

export type ScreenshotContractResult = {
  status: 'completed'
  domain: string
  url: string
  source: 'screenshot'
  imageCount: number
  summary: StoredScanResult['summary']
  curatedTokens?: StoredScanResult['curatedTokens']
  brandAnalysis?: StoredScanResult['brandAnalysis']
  designMd?: StoredScanResult['designMd']
  designSkill?: StoredScanResult['designSkill']
  designContract?: StoredScanResult['designContract']
  screenshots?: StoredScanResult['screenshots']
  uxDna?: StoredScanResult['uxDna']
  metadata: StoredScanResult['metadata'] & {
    visionSurface?: string
    visionSignature?: string
    appPackImages?: number
  }
  storage: {
    siteId: string
    scanId: string
    tokenSetId: string
    stored: boolean
    backend: { blob: boolean; redis: boolean; memory: boolean }
  }
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function stripDataUrl(input: string): { base64: string; mime?: string } {
  const match = input.match(/^data:([^;]+);base64,(.+)$/s)
  if (match) {
    return { mime: match[1], base64: match[2] }
  }
  return { base64: input.replace(/\s+/g, '') }
}

function coerceImages(input: ScreenshotContractInput): ScreenshotImageInput[] {
  const raw = normalizeScreenshotImages({
    images: input.images,
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
  })
  return raw.map((image) => {
    const parsed = stripDataUrl(image.imageBase64)
    return {
      imageBase64: parsed.base64,
      mimeType: image.mimeType || parsed.mime || 'image/png',
    }
  })
}

async function persistImage(
  scanId: string,
  buffer: Buffer,
  mime: string,
  index: number
): Promise<{ url: string } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null
  try {
    const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png'
    const pathname = `screenshots/${scanId}/vision-${index + 1}-${Date.now()}.${ext}`
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: mime,
      addRandomSuffix: false,
    })
    return { url: blob.url }
  } catch (error) {
    console.warn('[screenshot-contract] blob upload failed:', error)
    return null
  }
}

export async function runScreenshotContract(
  input: ScreenshotContractInput
): Promise<ScreenshotContractResult> {
  if (!isAiGatewayConfigured()) {
    throw new Error(
      'AI Gateway is required for screenshot → Design Contract. Set AI_GATEWAY_API_KEY or deploy on Vercel.'
    )
  }

  const startedAt = Date.now()
  const minImages = input.minImages ?? BILLING.minAppPackImages
  const maxImages = input.maxImages ?? BILLING.maxAppPackImages
  const images = coerceImages(input)

  if (images.length < minImages) {
    throw new Error(
      `App Packs require at least ${minImages} product UI screenshots (received ${images.length}).`
    )
  }
  if (images.length > maxImages) {
    throw new Error(
      `App Packs accept at most ${maxImages} screenshots per run (received ${images.length}).`
    )
  }

  for (const image of images) {
    if (!image.imageBase64 || image.imageBase64.length < 200) {
      throw new Error('One or more images are empty or too small')
    }
    if (image.imageBase64.length > 8_000_000) {
      throw new Error('One or more images are too large — use PNG/JPEG under ~6MB each')
    }
  }

  const scanId = createId('scan')
  const tokenSetId = createId('tokens')
  const domain = normalizeDomain(input.domain || syntheticUploadDomain(input.name))
  const url = `https://${domain}/`
  const preferApp = input.preferApp !== false

  const uploadedScreenshots: Array<{ label: string; url: string; mime: string }> = []
  for (let i = 0; i < images.length; i++) {
    const image = images[i]!
    const buffer = Buffer.from(image.imageBase64, 'base64')
    const uploaded = await persistImage(scanId, buffer, image.mimeType || 'image/png', i)
    if (uploaded) {
      uploadedScreenshots.push({
        label: `app-screenshot-${i + 1}`,
        url: uploaded.url,
        mime: image.mimeType || 'image/png',
      })
    }
  }

  const draft = await extractVisionContractDraft({
    images,
    nameHint: input.name,
    preferApp,
    minImages,
    maxImages,
  })

  const mapped = mapVisionDraftToContractInput({
    draft,
    domain,
    url,
    preferApp,
  })

  const designMd = generateDesignMd(mapped.designMdInput)
  const measuredKeys = Object.entries(mapped.designMdInput.measuredComponents || {})
    .filter(([, recipe]) => Boolean(recipe))
    .map(([key]) => key)

  const designSkill = generateDesignSkill({
    domain,
    url,
    designMdFileName: designMd.fileName,
    curatedTokens: mapped.designMdInput.curatedTokens,
    personality: draft.distinctiveSignature,
    philosophy: {
      title: mapped.philosophy.title,
      statement: mapped.philosophy.statement,
      traits: mapped.philosophy.traits,
      principles: mapped.philosophy.principles,
      motionTempo: mapped.philosophy.systems.motion.tempo,
      typeVoice: mapped.philosophy.systems.type.voice,
      shapeCharacter: mapped.philosophy.systems.shape.character,
      depth: mapped.philosophy.systems.shape.depth,
    },
    measuredComponents: measuredKeys,
  })

  const scannedAt = new Date().toISOString()
  const driftObservations: DriftObservation[] = [
    {
      surface: 'site',
      kind: 'vision-source',
      summary: `Design Contract drafted from ${images.length} user-provided application screenshots (${draft.surfaceKind}). Tokens are vision-sampled across an App Pack, not CSS-measured.`,
      observedAt: scannedAt,
      evidence: {
        surfaceKind: draft.surfaceKind,
        polarity: draft.polarity,
        density: draft.density,
        productName: draft.productName,
        imageCount: images.length,
      },
      suggestedAction:
        'Treat vision tokens as a strong starting grammar. Re-scan authenticated app surfaces with CSS when available to raise confidence.',
    },
    {
      surface: 'site',
      kind: 'app-profile',
      summary: `Pack profile ${mapped.profile} / app-type ${mapped.appType}. ${mapped.reasons.join(' ')}`,
      observedAt: scannedAt,
      evidence: { profile: mapped.profile, appType: mapped.appType, reasons: mapped.reasons },
      suggestedAction: 'Install with the emitted --profile and --app-type flags.',
    },
  ]

  const contractScreenshots =
    uploadedScreenshots.length > 0
      ? uploadedScreenshots.map((shot) => ({
          label: shot.label,
          url: shot.url,
          note: 'User-uploaded application screenshot — visual ground truth for this vision-derived contract.',
        }))
      : [
          {
            label: 'app-screenshot',
            url,
            note: `${images.length} App Pack screenshots (not persisted — set BLOB_READ_WRITE_TOKEN).`,
          },
        ]

  const contractPack = buildDesignContractPackage({
    ...mapped.designMdInput,
    scanId,
    profile: mapped.profile,
    appType: mapped.appType,
    appTypeDetection: {
      appType: mapped.appType,
      profile: mapped.profile,
      confidence: mapped.confidence / 100,
      reasons: mapped.reasons,
    },
    driftObservations,
    screenshots: contractScreenshots,
  })

  const processingTime = Date.now() - startedAt
  const curated = mapped.designMdInput.curatedTokens
  const designContract: StoredScanResult['designContract'] = {
    slug: contractPack.slug,
    title: contractPack.title,
    profile: contractPack.profile,
    installCommand: contractPack.installCommand,
    summary: contractPack.summary,
    files: contractPack.files,
    download: contractDownloadPath(domain),
  }

  const stored: StoredScanResult = {
    id: scanId,
    domain,
    url,
    scannedAt,
    status: 'completed',
    summary: {
      tokensExtracted:
        (curated.colors?.length || 0) +
        (curated.typography?.families?.length || 0) +
        (curated.spacing?.length || 0),
      curatedCount: {
        colors: curated.colors?.length || 0,
        fonts: curated.typography?.families?.length || 0,
        sizes: curated.typography?.sizes?.length || 0,
        spacing: curated.spacing?.length || 0,
        radius: curated.radius?.length || 0,
        shadows: curated.shadows?.length || 0,
      },
      confidence: mapped.confidence,
      completeness: Math.min(88, 62 + images.length * 3),
      reliability: Math.round((mapped.confidence + 70) / 2),
      processingTime,
    },
    tokens: {
      colors: curated.colors ?? [],
      typography: [
        ...(curated.typography?.families ?? []),
        ...(curated.typography?.sizes ?? []),
      ],
      spacing: curated.spacing ?? [],
      radius: curated.radius ?? [],
      shadows: curated.shadows ?? [],
      motion: curated.motion ?? [],
    },
    curatedTokens: curated,
    brandAnalysis: mapped.designMdInput.brandAnalysis,
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
    designContract,
    screenshots: uploadedScreenshots.map((shot) => ({
      label: shot.label,
      url: shot.url,
      mime: shot.mime,
      viewport: 'desktop',
    })),
    uxDna: {
      shell: mapped.designMdInput.uxEvidence?.shell ?? undefined,
      density: mapped.designMdInput.uxEvidence?.density ?? undefined,
      components: mapped.designMdInput.measuredComponents ?? undefined,
    },
    metadata: {
      cssSources: 0,
      staticCssSources: 0,
      computedCssSources: 0,
      scanId,
      tokenSetId,
      mode: 'fast',
      engine: 'design-contracts-vision',
      appType: mapped.appType,
      appTypeConfidence: mapped.confidence / 100,
      visionSurface: draft.surfaceKind,
      visionSignature: draft.distinctiveSignature,
      appPackImages: images.length,
    },
  }

  const site = await saveScan(stored)

  return {
    status: 'completed',
    domain,
    url,
    source: 'screenshot',
    imageCount: images.length,
    summary: stored.summary,
    curatedTokens: stored.curatedTokens,
    brandAnalysis: stored.brandAnalysis,
    designMd: stored.designMd,
    designSkill: stored.designSkill,
    designContract: {
      ...designContract,
      download: contractDownloadPath(domain),
    },
    screenshots: stored.screenshots,
    uxDna: stored.uxDna,
    metadata: stored.metadata,
    storage: {
      siteId: site.id,
      scanId,
      tokenSetId,
      stored: true,
      backend: {
        blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        redis: Boolean(process.env.UPSTASH_REDIS_REST_URL),
        memory: true,
      },
    },
  }
}

/** Fetch a remote image (http/https or data URL) into base64 for the worker. */
export async function loadImageAsBase64(imageUrl: string): Promise<{
  base64: string
  mimeType: string
}> {
  if (imageUrl.startsWith('data:')) {
    const parsed = stripDataUrl(imageUrl)
    return { base64: parsed.base64, mimeType: parsed.mime || 'image/png' }
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error('imageUrl must be an absolute http(s) or data URL')
  }

  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'image/*' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`)
  }
  const mimeType = response.headers.get('content-type') || 'image/png'
  if (!mimeType.startsWith('image/')) {
    throw new Error('URL did not return an image')
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > 6_000_000) {
    throw new Error('Image is too large — use a PNG/JPEG under ~6MB')
  }
  return { base64: buffer.toString('base64'), mimeType }
}

export async function getExistingScreenshotContract(
  domain: string
): Promise<StoredScanResult | null> {
  return getScan(normalizeDomain(domain))
}
