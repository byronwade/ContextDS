import Stripe from 'stripe'
import { BILLING, type CheckoutSkuId, type CreditSkuId } from '@/lib/billing/config'

let stripeClient: Stripe | null = null

function envPrice(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

export function getCreditPriceId(sku: CreditSkuId): string | undefined {
  if (sku === 'pack_single') {
    return envPrice('STRIPE_PRICE_PACK') || envPrice('STRIPE_PRICE_PACK_SINGLE')
  }
  return envPrice('STRIPE_PRICE_PACK_BUNDLE') || envPrice('STRIPE_PRICE_PACK_5')
}

export function getProPriceIdOptional(): string | undefined {
  return envPrice('STRIPE_PRICE_PRO') || envPrice('STRIPE_PRICE_ID')
}

export function isStripeConfigured(): boolean {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return false
  return Boolean(
    getProPriceIdOptional() || getCreditPriceId('pack_single') || getCreditPriceId('pack_bundle')
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
  const price = getProPriceIdOptional()
  if (!price) {
    throw new Error('STRIPE_PRICE_PRO is not configured — create a $12/mo Price in Stripe')
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
        creditsPerMonth: String(BILLING.proCreditsPerMonth),
      },
    },
    success_url:
      input.successUrl || `${base}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl || `${base}/pricing?checkout=cancel`,
    metadata: {
      plan: 'pro',
      sku: 'pro',
    },
  })
}

export async function createCreditCheckoutSession(input: {
  sku: CreditSkuId
  email?: string
  customerId?: string
  successUrl?: string
  cancelUrl?: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const priceId = getCreditPriceId(input.sku)
  if (!priceId) {
    throw new Error(
      `Stripe price missing for ${input.sku} — set STRIPE_PRICE_PACK / STRIPE_PRICE_PACK_BUNDLE`
    )
  }
  const base = siteUrl()
  const credits =
    input.sku === 'pack_bundle' ? BILLING.packBundleCredits : BILLING.packSingleCredits

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer: input.customerId,
    customer_email: input.customerId ? undefined : input.email,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url:
      input.successUrl || `${base}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl || `${base}/pricing?checkout=cancel`,
    metadata: {
      plan: 'credits',
      sku: input.sku,
      credits: String(credits),
    },
  })
}

export async function createCheckoutSession(input: {
  sku: CheckoutSkuId
  email?: string
  customerId?: string
  successUrl?: string
  cancelUrl?: string
}): Promise<Stripe.Checkout.Session> {
  if (input.sku === 'pro') {
    return createProCheckoutSession(input)
  }
  return createCreditCheckoutSession({ ...input, sku: input.sku })
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
