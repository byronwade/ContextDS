/**
 * Product pricing for designcontracts.sh
 *
 * Why not $1/mo: a 5-image App Pack burns AI Gateway vision tokens.
 * At ~$0.15–0.40 COGS per pack, $1/mo cannot cover even a few runs.
 * $9/mo with a capped pack quota stays cheap for users and slightly profitable.
 *
 * Platform: Stripe Checkout + Customer Portal (Merchant of Record optional later).
 */

export const BILLING = {
  /** Display name */
  proProductName: 'Design Contracts Pro',
  /** Public list price (USD) */
  proPriceUsd: 9,
  /** Included multi-image App Packs per billing month */
  appPacksPerMonth: 12,
  /** Minimum screenshots required for an App Pack */
  minAppPackImages: 5,
  /** Soft max screenshots per App Pack (cost + context window) */
  maxAppPackImages: 12,
  /** Optional overage list price if you meter later */
  appPackOverageUsd: 1,
  currency: 'usd' as const,
  trialDays: 7,
} as const

/** Convenience shape for UI / API responses */
export const PRO_PLAN = {
  id: 'pro' as const,
  name: BILLING.proProductName,
  priceUsd: BILLING.proPriceUsd,
  priceLabel: `$${BILLING.proPriceUsd}/mo`,
  interval: 'month' as const,
  trialDays: BILLING.trialDays,
  appPacksPerMonth: BILLING.appPacksPerMonth,
  minAppPackImages: BILLING.minAppPackImages,
  maxAppPackImages: BILLING.maxAppPackImages,
  overagePackUsd: BILLING.appPackOverageUsd,
  features: [
    `${BILLING.appPacksPerMonth} App Packs / month (min ${BILLING.minAppPackImages} screenshots each)`,
    'Application Design Contracts from product UI screenshots',
    'Design Contract Studio — author + export',
    'MCP server API key',
    'Private contracts & version history',
    'Unlimited accurate URL scans',
  ],
} as const

export const FREE_TIER = {
  id: 'free' as const,
  name: 'Free',
  appPacksPerMonth: 0,
  urlScansNote: 'Public URL scans + Library',
} as const

export type PlanId = 'free' | 'pro'

export type Entitlement = {
  plan: PlanId
  /** Stripe customer id when subscribed */
  customerId?: string
  email?: string
  status?: 'active' | 'trialing' | 'past_due' | 'canceled'
  /** Unix ms when Pro access ends (period end or cancel_at) */
  periodEnd?: number
  /** App Packs remaining in the current period */
  appPacksRemaining?: number
  /** Period key YYYY-MM for quota reset */
  quotaPeriod?: string
  stripeSubscriptionId?: string
  source: 'stripe' | 'bypass' | 'dev'
}

export function currentQuotaPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function isProEntitlement(entitlement: Entitlement | null | undefined): boolean {
  if (!entitlement || entitlement.plan !== 'pro') return false
  if (entitlement.status === 'canceled') return false
  if (entitlement.periodEnd && entitlement.periodEnd < Date.now()) return false
  return true
}
