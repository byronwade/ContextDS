import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAiGatewayConfigured } from '@/lib/ai/gateway'
import { agentRatelimit } from '@/lib/ratelimit'
import { runScreenshotContract } from '@/lib/workers/screenshot-contract'

export const maxDuration = 60
export const runtime = 'nodejs'

const jsonSchema = z.object({
  imageBase64: z.string().min(200),
  mimeType: z.string().optional(),
  name: z.string().max(80).optional(),
  preferApp: z.boolean().optional(),
  domain: z.string().max(120).optional(),
})

async function readImageFromRequest(request: NextRequest): Promise<{
  imageBase64: string
  mimeType?: string
  name?: string
  preferApp?: boolean
  domain?: string
}> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('image') || form.get('file')
    if (!(file instanceof File)) {
      throw new Error('multipart field "image" (file) is required')
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image uploads are supported')
    }
    if (file.size > 6_000_000) {
      throw new Error('Image is too large — max 6MB')
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const nameValue = form.get('name')
    const preferRaw = form.get('preferApp')
    const domainValue = form.get('domain')
    return {
      imageBase64: buffer.toString('base64'),
      mimeType: file.type || 'image/png',
      name: typeof nameValue === 'string' ? nameValue : undefined,
      preferApp:
        preferRaw === null || preferRaw === undefined
          ? true
          : String(preferRaw) !== '0' && String(preferRaw) !== 'false',
      domain: typeof domainValue === 'string' ? domainValue : undefined,
    }
  }

  const body = jsonSchema.parse(await request.json())
  return body
}

/**
 * POST /api/contracts/from-image
 *
 * Build an application Design Contract from a screenshot (multipart or JSON base64).
 * Defaults to web-app profile — this is the path for Cursor-like product UIs
 * that public crawlers cannot see.
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

    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const { success } = await agentRatelimit.limit(`from-image:${identifier}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before uploading another screenshot.' },
        { status: 429 }
      )
    }

    const payload = await readImageFromRequest(request)
    const result = await runScreenshotContract({
      imageBase64: payload.imageBase64,
      mimeType: payload.mimeType,
      name: payload.name,
      preferApp: payload.preferApp,
      domain: payload.domain,
    })

    return NextResponse.json({
      found: true,
      ...result,
      note:
        'Vision-derived application Design Contract. Install with the pack’s --profile web-app flags. Re-scan authenticated CSS when you can to raise confidence.',
    })
  } catch (error) {
    console.error('[contracts/from-image]', error)
    const message = error instanceof Error ? error.message : 'Screenshot contract failed'
    const status = /Gateway|required/i.test(message)
      ? 503
      : /too large|empty|Only image|required/i.test(message)
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
