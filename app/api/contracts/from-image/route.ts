import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAiGatewayConfigured } from '@/lib/ai/gateway'
import { BILLING } from '@/lib/billing/config'
import {
  assertCanCreateAppPack,
  consumeAppPackCredit,
} from '@/lib/billing/entitlements'
import { agentRatelimit } from '@/lib/ratelimit'
import { runScreenshotContract } from '@/lib/workers/screenshot-contract'

export const maxDuration = 120
export const runtime = 'nodejs'

const imageItemSchema = z.object({
  imageBase64: z.string().min(200),
  mimeType: z.string().optional(),
})

const jsonSchema = z.object({
  images: z.array(imageItemSchema).optional(),
  /** @deprecated Prefer `images` with ≥5 shots */
  imageBase64: z.string().min(200).optional(),
  mimeType: z.string().optional(),
  name: z.string().max(80).optional(),
  preferApp: z.boolean().optional(),
  domain: z.string().max(120).optional(),
})

async function readImagesFromRequest(request: NextRequest): Promise<{
  images: Array<{ imageBase64: string; mimeType?: string }>
  name?: string
  preferApp?: boolean
  domain?: string
}> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const files: File[] = []
    for (const [key, value] of form.entries()) {
      if (
        value instanceof File &&
        (key === 'image' ||
          key === 'file' ||
          key === 'images' ||
          key.startsWith('image') ||
          key.startsWith('file'))
      ) {
        files.push(value)
      }
    }
    if (files.length === 0) {
      throw new Error(
        `multipart fields "images" (files) are required — attach at least ${BILLING.minAppPackImages} screenshots`
      )
    }
    const images = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image uploads are supported')
      }
      if (file.size > 6_000_000) {
        throw new Error('One or more images are too large — max 6MB each')
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      images.push({
        imageBase64: buffer.toString('base64'),
        mimeType: file.type || 'image/png',
      })
    }
    const nameValue = form.get('name')
    const preferRaw = form.get('preferApp')
    const domainValue = form.get('domain')
    return {
      images,
      name: typeof nameValue === 'string' ? nameValue : undefined,
      preferApp:
        preferRaw === null || preferRaw === undefined
          ? true
          : String(preferRaw) !== '0' && String(preferRaw) !== 'false',
      domain: typeof domainValue === 'string' ? domainValue : undefined,
    }
  }

  const body = jsonSchema.parse(await request.json())
  const images =
    body.images && body.images.length > 0
      ? body.images
      : body.imageBase64
        ? [{ imageBase64: body.imageBase64, mimeType: body.mimeType }]
        : []
  if (images.length === 0) {
    throw new Error(
      `Provide images[] with at least ${BILLING.minAppPackImages} base64 screenshots`
    )
  }
  return {
    images,
    name: body.name,
    preferApp: body.preferApp,
    domain: body.domain,
  }
}

/**
 * POST /api/contracts/from-image
 *
 * Pro App Pack: build an application Design Contract from ≥5 product UI
 * screenshots (multipart or JSON). Defaults to web-app profile.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAiGatewayConfigured()) {
      return NextResponse.json(
        {
          error:
            'AI Gateway is required for screenshot → Design Contract. Set AI_GATEWAY_API_KEY or deploy on Vercel.',
        },
        { status: 503 }
      )
    }

    const gate = await assertCanCreateAppPack()
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: gate.error,
          code: gate.code,
          upgradePath: gate.upgradePath,
          plan: {
            priceLabel: `$${BILLING.proPriceUsd}/mo`,
            appPacksPerMonth: BILLING.appPacksPerMonth,
            minAppPackImages: BILLING.minAppPackImages,
          },
        },
        { status: gate.status }
      )
    }

    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const { success } = await agentRatelimit.limit(`from-image:${identifier}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before uploading another App Pack.' },
        { status: 429 }
      )
    }

    const payload = await readImagesFromRequest(request)
    if (payload.images.length < BILLING.minAppPackImages) {
      return NextResponse.json(
        {
          error: `App Packs require at least ${BILLING.minAppPackImages} product UI screenshots (received ${payload.images.length}).`,
          code: 'min_images',
          minAppPackImages: BILLING.minAppPackImages,
          maxAppPackImages: BILLING.maxAppPackImages,
        },
        { status: 400 }
      )
    }

    const result = await runScreenshotContract({
      images: payload.images,
      name: payload.name,
      preferApp: payload.preferApp,
      domain: payload.domain,
    })

    const remaining = await consumeAppPackCredit(gate.entitlement)

    return NextResponse.json({
      found: true,
      ...result,
      billing: {
        plan: 'pro',
        appPacksRemaining: remaining.appPacksRemaining ?? null,
        appPacksPerMonth: BILLING.appPacksPerMonth,
      },
      note: `Vision App Pack (${result.imageCount} screenshots). Install with the pack’s --profile web-app flags. Re-scan authenticated CSS when you can to raise confidence.`,
    })
  } catch (error) {
    console.error('[contracts/from-image]', error)
    const message = error instanceof Error ? error.message : 'Screenshot contract failed'
    const status = /Gateway|required/i.test(message)
      ? 503
      : /at least|at most|too large|empty|Only image|Provide images/i.test(message)
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
