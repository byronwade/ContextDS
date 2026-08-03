import { NextRequest, NextResponse } from 'next/server'
import {
  getEntitlementFromRequest,
  publicEntitlementView,
} from '@/lib/billing/entitlements'
import { BILLING, CREDIT_SKUS, FREE_TIER, PRO_PLAN } from '@/lib/billing/config'
import { isStripeConfigured } from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/entitlement
 * Current plan + App Pack credit balance for the browser session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const entitlement = await getEntitlementFromRequest(request)
  return NextResponse.json({
    ...publicEntitlementView(entitlement),
    billingConfigured: isStripeConfigured(),
    catalog: {
      free: {
        name: FREE_TIER.name,
        urlScans: FREE_TIER.urlScansNote,
        appPackCredits: FREE_TIER.appPackCredits,
      },
      packs: Object.values(CREDIT_SKUS),
      pro: {
        name: PRO_PLAN.name,
        priceLabel: PRO_PLAN.priceLabel,
        creditsPerMonth: PRO_PLAN.creditsPerMonth,
        minAppPackImages: PRO_PLAN.minAppPackImages,
        maxAppPackImages: PRO_PLAN.maxAppPackImages,
        trialDays: PRO_PLAN.trialDays,
        features: PRO_PLAN.features,
      },
      minAppPackImages: BILLING.minAppPackImages,
    },
  })
}
