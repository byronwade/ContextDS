import Stripe from 'stripe'
import { BILLING } from '@/lib/billing/config'

let stripeClient: Stripe | null = null

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      (process.env.STRIPE_PRICE_PRO?.trim() || process.env.STRIPE_PRICE_ID?.trim())
  )
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2026-07-29.dahlia',
      typescript: true,
    })
  }
  return stripeClient
}

export function getProPriceId(): string {
  const price =
    process.env.STRIPE_PRICE_PRO?.trim() || process.env.STRIPE_PRICE_ID?.trim()
  if (!price) {
    throw new Error('STRIPE_PRICE_PRO is not configured — create a $9/mo Price in Stripe')
  }
  return price
}

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

export async function createProCheckoutSession(input: {
  email?: string
  customerId?: string
  successUrl?: string
  cancelUrl?: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const priceId = getProPriceId()
  const base = siteUrl()

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: input.customerId,
    customer_email: input.customerId ? undefined : input.email,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: BILLING.trialDays,
      metadata: {
        plan: 'pro',
        appPacksPerMonth: String(BILLING.appPacksPerMonth),
      },
    },
    success_url:
      input.successUrl || `${base}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl || `${base}/pricing?checkout=cancel`,
    metadata: {
      plan: 'pro',
    },
  })
}

export async function createBillingPortalSession(input: {
  customerId: string
  returnUrl?: string
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()
  const base = siteUrl()
  return stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl || `${base}/pricing`,
  })
}
