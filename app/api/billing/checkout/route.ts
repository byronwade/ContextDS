import { NextRequest, NextResponse } from 'next/server'
import {
  BILLING,
  CREDIT_SKUS,
  PRO_PLAN,
  type CheckoutSkuId,
} from '@/lib/billing/config'
import {
  createCheckoutSession,
  getCreditPriceId,
  getProPriceIdOptional,
  isStripeConfigured,
} from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseSku(raw: unknown): CheckoutSkuId {
  if (raw === 'pack_bundle' || raw === 'pack_5') return 'pack_bundle'
  if (raw === 'pro') return 'pro'
  return 'pack_single'
}

/**
 * POST /api/billing/checkout
 * Body: { sku?: 'pack_single' | 'pack_bundle' | 'pro', email?: string }
 * Default sku = pack_single (one-time credits — primary purchase path).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: 'Billing is not configured',
        hint: 'Set STRIPE_SECRET_KEY plus STRIPE_PRICE_PACK / STRIPE_PRICE_PACK_BUNDLE and/or STRIPE_PRICE_PRO',
      }, { status: 503 , headers: { 'Cache-Control': 'private, no-store' } })
  }

  let email: string | undefined
  let sku: CheckoutSkuId = 'pack_single'
  try {
    const body = (await request.json()) as { email?: unknown; sku?: unknown }
    if (typeof body.email === 'string' && body.email.includes('@')) {
      email = body.email.trim().toLowerCase()
    }
    sku = parseSku(body.sku)
  } catch {
    // empty body → single pack
  }

  if (sku === 'pro' && !getProPriceIdOptional()) {
    return NextResponse.json(
      { error: 'Pro price not configured (STRIPE_PRICE_PRO)' }, { status: 503 , headers: { 'Cache-Control': 'private, no-store' } })
  }
  if (sku !== 'pro' && !getCreditPriceId(sku)) {
    return NextResponse.json(
      {
        error: `Credit price not configured for ${sku}`,
        hint: 'Set STRIPE_PRICE_PACK and STRIPE_PRICE_PACK_BUNDLE',
      }, { status: 503 , headers: { 'Cache-Control': 'private, no-store' } })
  }

  try {
    const origin = request.nextUrl.origin
    const session = await createCheckoutSession({
      sku,
      email,
      successUrl: `${origin}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing?checkout=cancel`,
    })
    return NextResponse.json({ url: session.url, sessionId: session.id, sku })
  } catch (error) {
    console.error('[billing/checkout]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' }, { status: 500 , headers: { 'Cache-Control': 'private, no-store' } })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    model: 'credits-first',
    packs: Object.values(CREDIT_SKUS),
    pro: {
      id: PRO_PLAN.id,
      name: PRO_PLAN.name,
      priceUsd: PRO_PLAN.priceUsd,
      priceLabel: PRO_PLAN.priceLabel,
      trialDays: PRO_PLAN.trialDays,
      creditsPerMonth: PRO_PLAN.creditsPerMonth,
      features: PRO_PLAN.features,
    },
    minAppPackImages: BILLING.minAppPackImages,
    maxAppPackImages: BILLING.maxAppPackImages,
  })
}
