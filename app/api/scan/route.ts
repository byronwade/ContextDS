import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runScanJob } from '@/lib/workers/scan-orchestrator'

const scanRequestSchema = z.object({
  url: z.string().url(),
  depth: z.enum(['1', '2', '3']).default('1'),
  prettify: z.boolean().default(false),
  quality: z.enum(['basic', 'standard', 'premium']).default('standard'),
  budget: z.number().min(0.01).max(1.0).default(0.15)
})

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const params = scanRequestSchema.parse(payload)

    const includeComputed = process.env.DISABLE_COMPUTED_CSS === '1' ? false : true
    const normalizedUrl = params.url.startsWith('http') ? params.url : `https://${params.url}`

    const result = await runScanJob({
      url: normalizedUrl,
      prettify: params.prettify,
      includeComputed
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
