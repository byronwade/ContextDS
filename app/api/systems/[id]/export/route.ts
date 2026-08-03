/**
 * POST /api/systems/[id]/export
 * Library WorkingSystem → installable Design Contract ZIP (Pro).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { assertProAccess, getEntitlementFromRequest } from '@/lib/billing/entitlements'
import { buildStudioContractPack } from '@/lib/contracts/authored-contract'
import { toStudioSystem } from '@/lib/design-system/working-system'
import { agentRatelimit } from '@/lib/ratelimit'
import { canAccessSystem, getSystem } from '@/lib/storage/system-store'

export const runtime = 'nodejs'
export const maxDuration = 30

function normalizeId(raw: string): string {
  return decodeURIComponent(raw || '').trim().slice(0, 120)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const limited = await agentRatelimit.limit(`system-export:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const access = await assertProAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, code: access.code, upgradePath: access.upgradePath },
      { status: access.status }
    )
  }

  try {
    const { id: rawId } = await params
    const id = normalizeId(rawId)
    if (!id) {
      return NextResponse.json({ error: 'System id is required' }, { status: 400 })
    }

    const stored = await getSystem(id)
    if (!stored) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    if (stored.visibility === 'private') {
      const entitlement = await getEntitlementFromRequest(request)
      const customerId = entitlement?.customerId || entitlement?.stripeCustomerId
      if (!canAccessSystem(stored, customerId) && process.env.BILLING_BYPASS !== '1') {
        return NextResponse.json({ error: 'System not found' }, { status: 404 })
      }
    }

    const system = toStudioSystem(stored.system)
    const { pack, zip, fileName } = buildStudioContractPack(system, {
      driftKind: 'library-export',
      driftSummary: `Exported library system ${stored.id} (${system.name}).`,
      driftEvidence: { systemId: stored.id, origin: stored.system.origin },
    })

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
        'X-System-Id': stored.id,
        'X-Design-Contract-Install': pack.installCommand,
      },
    })
  } catch (error) {
    console.error('[systems/export]', error)
    return NextResponse.json({ error: 'Failed to export system pack' }, { status: 500 })
  }
}
