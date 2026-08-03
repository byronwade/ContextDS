import { NextRequest, NextResponse } from 'next/server'
import { BILLING, PRO_PLAN } from '@/lib/billing/config'
import {
  grantCreditPack,
  grantProEntitlement,
  setEntitlementCookie,
} from '@/lib/billing/entitlements'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/success?session_id=...
 * After Stripe Checkout — grant credits or Pro, set cookie, redirect home.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  const home = new URL('/', request.nextUrl.origin)

  if (!sessionId || !isStripeConfigured()) {
    home.searchParams.set('billing', 'error')
    return NextResponse.redirect(home)
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.status !== 'complete') {
      home.searchParams.set('billing', 'incomplete')
      return NextResponse.redirect(home)
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id

    if (!customerId) {
      home.searchParams.set('billing', 'error')
      return NextResponse.redirect(home)
    }

    const email =
      session.customer_details?.email ?? session.customer_email ?? undefined

    if (session.mode === 'payment') {
      const creditsMeta = Number(session.metadata?.credits || 0)
      const credits =
        creditsMeta > 0
          ? creditsMeta
          : session.metadata?.sku === 'pack_bundle'
            ? BILLING.packBundleCredits
            : BILLING.packSingleCredits

      const entitlement = await grantCreditPack({
        stripeCustomerId: customerId,
        email,
        credits,
      })

      home.searchParams.set('billing', 'credits')
      home.searchParams.set('credits', String(credits))
      home.searchParams.set('app', '1')
      const response = NextResponse.redirect(home)
      setEntitlementCookie(response, entitlement)
      return response
    }

    if (session.mode === 'subscription') {
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

      if (!subscriptionId) {
        home.searchParams.set('billing', 'error')
        return NextResponse.redirect(home)
      }

      const periodEnd = Date.now() + 32 * 24 * 60 * 60 * 1000
      const entitlement = await grantProEntitlement({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        email,
        status: 'trialing',
        currentPeriodEnd: periodEnd,
        creditsPerMonth: PRO_PLAN.creditsPerMonth,
      })

      home.searchParams.set('billing', 'pro')
      home.searchParams.set('app', '1')
      const response = NextResponse.redirect(home)
      setEntitlementCookie(response, entitlement)
      return response
    }

    home.searchParams.set('billing', 'incomplete')
    return NextResponse.redirect(home)
  } catch (error) {
    console.error('[billing/success]', error)
    home.searchParams.set('billing', 'error')
    return NextResponse.redirect(home)
  }
}
