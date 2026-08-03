/**
 * POST /api/systems/fork
 * Clone a library system into a new owned WorkingSystem (fork lineage).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getEntitlementFromRequest } from '@/lib/billing/entitlements'
import { forkStoredSystem } from '@/lib/design-system/fork-system'
import { canAccessSystem, getSystem } from '@/lib/storage/system-store'

export const runtime = 'nodejs'

const bodySchema = z.object({
  systemId: z.string().min(3).max(120),
  name: z.string().max(80).optional(),
  visibility: z.enum(['public', 'private']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json())
    const source = await getSystem(body.systemId)
    if (!source) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    const entitlement = await getEntitlementFromRequest(request)
    const customerId = entitlement?.customerId || entitlement?.stripeCustomerId

    if (source.visibility === 'private') {
      if (!canAccessSystem(source, customerId) && process.env.BILLING_BYPASS !== '1') {
        return NextResponse.json({ error: 'System not found' }, { status: 404 })
      }
    }

    const visibility = body.visibility ?? 'public'
    if (visibility === 'private' && !customerId && process.env.BILLING_BYPASS !== '1') {
      return NextResponse.json(
        {
          error: 'Private forks require a billing session',
          upgradePath: '/pricing',
        },
        { status: 401 }
      )
    }

    const { stored, system } = await forkStoredSystem({
      systemId: body.systemId,
      name: body.name,
      visibility,
      ownerCustomerId:
        visibility === 'private'
          ? customerId || (process.env.BILLING_BYPASS === '1' ? 'bypass' : null)
          : customerId ?? null,
      ownerEmail: entitlement?.email ?? null,
    })

    return NextResponse.json({
      ...stored,
      canvasHref: `/?system=${encodeURIComponent(stored.id)}`,
      system,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid fork payload', details: error.issues },
        { status: 400 }
      )
    }
    const message = error instanceof Error ? error.message : 'Fork failed'
    const status = /not found/i.test(message) ? 404 : 500
    console.error('[systems/fork]', error)
    return NextResponse.json({ error: message }, { status })
  }
}
