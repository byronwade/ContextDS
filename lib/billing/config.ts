/**
 * Product pricing for designcontracts.sh
 *
 * Insight: most people generate one App Pack (or a few tweaks) then leave.
 * A pure monthly subscription invites churn. Primary SKU is therefore
 * **one-time App Pack credits that never expire**. Pro is optional for
 * people who live in the agent loop (MCP key + monthly credit top-up).
 *
 * COGS: ~$0.15–0.40 vision per App Pack (≥5 screenshots).
 */

export const BILLING = {
  currency: 'usd' as const,
  /** Minimum screenshots required for an App Pack */
  minAppPackImages: 5,
  /** Soft max screenshots per App Pack */
  maxAppPackImages: 12,

  /** One-time: single App Pack credit */
  packSingleUsd: 4,
  packSingleCredits: 1,

  /** One-time: five-pack bundle */
  packBundleUsd: 15,
  packBundleCredits: 5,

  /** Optional Pro builder subscription */
  proProductName: 'Design Contracts Pro',
  proPriceUsd: 12,
  /** Credits added each Pro billing month (stack on unused balance) */
  proCreditsPerMonth: 5,
  trialDays: 7,
} as const

export type CreditSkuId = 'pack_single' | 'pack_bundle'
export type CheckoutSkuId = CreditSkuId | 'pro'

export const CREDIT_SKUS: Record<
  CreditSkuId,
  {
    id: CreditSkuId
    name: string
    priceUsd: number
    credits: number
    priceLabel: string
    blurb: string
  }
> = {
  pack_single: {
    id: 'pack_single',
    name: '1 App Pack',
    priceUsd: BILLING.packSingleUsd,
    credits: BILLING.packSingleCredits,
    priceLabel: `$${BILLING.packSingleUsd}`,
    blurb: 'One multi-screenshot application Design Contract. Credits never expire.',
  },
  pack_bundle: {
    id: 'pack_bundle',
    name: '5 App Packs',
    priceUsd: BILLING.packBundleUsd,
    credits: BILLING.packBundleCredits,
    priceLabel: `$${BILLING.packBundleUsd}`,
    blurb: `Best for iterating — $${(BILLING.packBundleUsd / BILLING.packBundleCredits).toFixed(0)} each. Credits never expire.`,
  },
}

/** Pro = sticky builder tier (MCP + monthly credits), not the default buy path */
export const PRO_PLAN = {
  id: 'pro' as const,
  name: BILLING.proProductName,
  priceUsd: BILLING.proPriceUsd,
  priceLabel: `$${BILLING.proPriceUsd}/mo`,
  interval: 'month' as const,
  trialDays: BILLING.trialDays,
  creditsPerMonth: BILLING.proCreditsPerMonth,
  minAppPackImages: BILLING.minAppPackImages,
  maxAppPackImages: BILLING.maxAppPackImages,
  /** @deprecated use creditsPerMonth — kept for older callers */
  appPacksPerMonth: BILLING.proCreditsPerMonth,
  features: [
    `${BILLING.proCreditsPerMonth} App Pack credits every month (unused stack)`,
    'Personal MCP API key — contracts inside Claude / Cursor',
    'Studio export (DESIGN.md + pack download)',
    'Priority for people who keep designing in the agent loop',
  ],
} as const

export const FREE_TIER = {
  id: 'free' as const,
  name: 'Free',
  appPackCredits: 0,
  urlScansNote: 'Public URL scans + Library',
} as const

export type PlanId = 'free' | 'credits' | 'pro'

export type Entitlement = {
  plan: PlanId
  customerId?: string
  email?: string
  status?: 'active' | 'trialing' | 'past_due' | 'canceled'
  periodEnd?: number
  /**
   * App Pack credits that never expire.
   * Purchased packs add here; Pro monthly top-ups add here too.
   */
  appPackCredits?: number
  /**
   * @deprecated Prefer appPackCredits. Still read for older Redis records.
   */
  appPacksRemaining?: number
  /** YYYY-MM of last Pro monthly credit grant */
  quotaPeriod?: string
  stripeSubscriptionId?: string
  /** Fingerprint of active MCP key (Pro) */
  mcpKeyFingerprint?: string
  source: 'stripe' | 'bypass' | 'dev'
}

export function currentQuotaPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Unified credit balance (new field or legacy monthly remaining). */
export function creditBalance(entitlement: Entitlement | null | undefined): number {
  if (!entitlement) return 0
  if (typeof entitlement.appPackCredits === 'number') {
    return Math.max(0, entitlement.appPackCredits)
  }
  if (typeof entitlement.appPacksRemaining === 'number') {
    return Math.max(0, entitlement.appPacksRemaining)
  }
  return 0
}

export function isProEntitlement(entitlement: Entitlement | null | undefined): boolean {
  if (!entitlement || entitlement.plan !== 'pro') return false
  if (entitlement.status === 'canceled') return false
  if (entitlement.periodEnd && entitlement.periodEnd < Date.now()) return false
  return true
}

export function canSpendAppPack(entitlement: Entitlement | null | undefined): boolean {
  return creditBalance(entitlement) > 0
}
