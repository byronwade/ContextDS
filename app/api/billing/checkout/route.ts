import { NextRequest, NextResponse } from 'next/server'
import { createProCheckoutSession, isStripeConfigured } from '@/lib/billing/stripe'
import { PRO_PLAN } from '@/lib/billing/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for Design Contracts Pro ($9/mo).
 * Body (optional JSON): { email?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: 'Billing is not configured',
        hint: 'Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO in the environment',
        plan: {
          name: PRO_PLAN.name,
          priceLabel: PRO_PLAN.priceLabel,
          appPacksPerMonth: PRO_PLAN.appPacksPerMonth,
          minImages: PRO_PLAN.minAppPackImages,
        },
      },
      { status: 503 }
    )
  }

  let email: string | undefined
  try {
    const body = (await request.json()) as { email?: unknown }
    if (typeof body.email === 'string' && body.email.includes('@')) {
      email = body.email.trim().toLowerCase()
    }
  } catch {
    // empty body ok
  }

  try {
    const origin = request.nextUrl.origin
    const session = await createProCheckoutSession({
      email,
      successUrl: `${origin}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing?checkout=cancel`,
    })
    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[billing/checkout]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    plan: {
      id: PRO_PLAN.id,
      name: PRO_PLAN.name,
      priceUsd: PRO_PLAN.priceUsd,
      priceLabel: PRO_PLAN.priceLabel,
      interval: PRO_PLAN.interval,
      trialDays: PRO_PLAN.trialDays,
      appPacksPerMonth: PRO_PLAN.appPacksPerMonth,
      minAppPackImages: PRO_PLAN.minAppPackImages,
      maxAppPackImages: PRO_PLAN.maxAppPackImages,
      overagePackUsd: PRO_PLAN.overagePackUsd,
      features: PRO_PLAN.features,
    },
  })
}
