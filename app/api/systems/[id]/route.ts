import { type NextRequest, NextResponse } from 'next/server'
import { getEntitlementFromRequest } from '@/lib/billing/entitlements'
import { canAccessSystem, deleteSystem, getSystem } from '@/lib/storage/system-store'

export const runtime = 'nodejs'

function normalizeId(raw: string): string {
  return decodeURIComponent(raw || '').trim().slice(0, 120)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        // Opaque 404 — don't leak private id existence
        return NextResponse.json({ error: 'System not found' }, { status: 404 })
      }
    }

    return NextResponse.json(stored)
  } catch (error) {
    console.error('Error loading system:', error)
    return NextResponse.json({ error: 'Failed to load system' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const entitlement = await getEntitlementFromRequest(request)
    const customerId = entitlement?.customerId || entitlement?.stripeCustomerId

    if (stored.visibility === 'private') {
      if (!canAccessSystem(stored, customerId) && process.env.BILLING_BYPASS !== '1') {
        return NextResponse.json({ error: 'System not found' }, { status: 404 })
      }
    } else if (stored.ownerCustomerId && stored.ownerCustomerId !== customerId) {
      // Public systems with an owner can only be deleted by that owner
      if (process.env.BILLING_BYPASS !== '1') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const deleted = await deleteSystem(id)
    if (!deleted) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    return NextResponse.json({ deleted: true, id })
  } catch (error) {
    console.error('Error deleting system:', error)
    return NextResponse.json({ error: 'Failed to delete system' }, { status: 500 })
  }
}
