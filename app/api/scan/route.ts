import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runScanJob } from '@/lib/workers/scan-orchestrator'
import { scanRatelimit } from '@/lib/ratelimit'

const scanRequestSchema = z.object({
  url: z.string().url(),
  depth: z.enum(['1', '2', '3']).default('1'),
  prettify: z.boolean().default(false),
  quality: z.enum(['basic', 'standard', 'premium']).default('standard'),
  budget: z.number().min(0.01).max(1.0).default(0.15),
  mode: z.enum(['fast', 'accurate']).default('accurate')  // fast = static only, accurate = full scan
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for scan endpoint
    const identifier =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const { success } = await scanRatelimit.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { status: 'failed', error: 'Rate limit exceeded. Please wait before scanning again.' },
        { status: 429 }
      )
    }

    const payload = await request.json()
    const params = scanRequestSchema.parse(payload)

    // URL validation to prevent SSRF
    const url = new URL(params.url)
    const allowedProtocols = ['http:', 'https:']
    if (!allowedProtocols.includes(url.protocol)) {
      return NextResponse.json(
        { status: 'failed', error: 'Invalid URL protocol' },
        { status: 400 }
      )
    }

    // Block private IP ranges
    const hostname = url.hostname
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return NextResponse.json(
        { status: 'failed', error: 'Cannot scan private or local URLs' },
        { status: 400 }
      )
    }

    // Fast mode skips browser automation (computed CSS + coverage API)
    // Saves ~1,200ms but reduces accuracy from 95% to 90%
    const includeComputed = params.mode === 'fast'
      ? false  // Skip browser automation in fast mode
      : process.env.DISABLE_COMPUTED_CSS === '1' ? false : true

    const normalizedUrl = params.url.startsWith('http') ? params.url : `https://${params.url}`

    const result = await runScanJob({
      url: normalizedUrl,
      prettify: params.prettify,
      includeComputed,
      mode: params.mode  // Pass mode to orchestrator
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Scan error', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          status: 'failed',
          error: 'Invalid request parameters',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Scan failed'
      },
      { status: 500 }
    )
  }
}
