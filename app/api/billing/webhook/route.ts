import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { BILLING, PRO_PLAN } from '@/lib/billing/config'
import {
  grantCreditPack,
  grantProEntitlement,
  revokeProKeepCredits,
} from '@/lib/billing/entitlements'
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function periodEndMs(subscription: Stripe.Subscription): number {
  const item = subscription.items?.data?.[0]
  const end =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (subscription as { current_period_end?: number }).current_period_end ??
    subscription.billing_cycle_anchor
  if (typeof end === 'number') return end * 1000
  return Date.now() + 32 * 24 * 60 * 60 * 1000
}

function mapStatus(
  status: Stripe.Subscription.Status
): 'active' | 'trialing' | 'past_due' | 'canceled' {
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled'
  return 'active'
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const status = mapStatus(subscription.status)
  if (status === 'canceled') {
    await revokeProKeepCredits(customerId)
    return
  }

  let email: string | undefined
  try {
    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer.deleted && typeof customer.email === 'string') {
      email = customer.email
    }
  } catch {
    // optional
  }

  await grantProEntitlement({
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    email,
    status,
    currentPeriodEnd: periodEndMs(subscription),
    creditsPerMonth: PRO_PLAN.creditsPerMonth,
  })
}

async function fulfillPaymentSession(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'payment') return
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (!customerId) return

  const creditsMeta = Number(session.metadata?.credits || 0)
  const credits =
    creditsMeta > 0
      ? creditsMeta
      : session.metadata?.sku === 'pack_bundle'
        ? BILLING.packBundleCredits
        : BILLING.packSingleCredits

  const email =
    session.customer_details?.email ?? session.customer_email ?? undefined

  await grantCreditPack({
    stripeCustomerId: customerId,
    email,
    credits,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const body = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    if (secret) {
      const signature = request.headers.get('stripe-signature')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
      }
      event = stripe.webhooks.constructEvent(body, signature, secret)
    } else {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'STRIPE_WEBHOOK_SECRET required in production' },
          { status: 500 }
        )
      }
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (error) {
    console.error('[billing/webhook] verify failed', error)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'payment') {
          await fulfillPaymentSession(session)
        } else if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await syncSubscription(sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await revokeProKeepCredits(customerId)
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error('[billing/webhook] handler error', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
