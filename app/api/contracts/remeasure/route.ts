/**
 * POST /api/contracts/remeasure
 * Follow-up CSS measurement for an existing vision App Pack (no new credit).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getEntitlementFromRequest } from '@/lib/billing/entitlements'
import { scanRatelimit } from '@/lib/ratelimit'
import { runRemeasureContract } from '@/lib/workers/remeasure-contract'

export const runtime = 'nodejs'
export const maxDuration = 120

const bodySchema = z.object({
  domain: z.string().min(1).max(253),
  url: z.string().url().optional(),
  mergeStrategy: z.enum(['css-wins', 'vision-fills-gaps']).optional(),
  capture: z
    .object({
      pages: z.number().int().min(1).max(12).optional(),
      paths: z.array(z.string().max(200)).max(12).optional(),
      auth: z
        .object({
          cookies: z
            .array(
              z.object({
                name: z.string(),
                value: z.string(),
                domain: z.string().optional(),
                path: z.string().optional(),
              })
            )
            .max(40)
            .optional(),
          headers: z.record(z.string(), z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await scanRatelimit.limit(`remeasure:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Auth cookies on capture are sensitive — require a signed billing session
  // (or bypass) so anonymous callers cannot pivot through our browser service.
  const entitlement = await getEntitlementFromRequest(request)
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid remeasure payload', details: parsed.error.issues },
      { status: 400 }
    )
  }

  if (parsed.data.capture?.auth && !entitlement && !process.env.BILLING_BYPASS) {
    return NextResponse.json(
      {
        error:
          'Authenticated remeasure requires a billing session cookie. Complete checkout or set BILLING_BYPASS in development.',
        upgradePath: '/pricing',
      },
      { status: 401 }
    )
  }

  try {
    const result = await runRemeasureContract(parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Remeasure failed'
    const status = /not found|Create a vision/i.test(message) ? 404 : 500
    console.error('[contracts/remeasure]', error)
    return NextResponse.json({ error: message }, { status })
  }
}
