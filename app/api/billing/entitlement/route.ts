import { NextRequest, NextResponse } from 'next/server';
import {
  getEntitlementFromRequest,
  publicEntitlementView,
} from '@/lib/billing/entitlements';
import { FREE_TIER, PRO_PLAN } from '@/lib/billing/config';
import { isStripeConfigured } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/entitlement
 * Current Pro status + App Pack remaining for the browser session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const entitlement = await getEntitlementFromRequest(request);
  return NextResponse.json({
    ...publicEntitlementView(entitlement),
    billingConfigured: isStripeConfigured(),
    plan: {
      free: {
        urlScans: 'unlimited*',
        appPacks: FREE_TIER.appPacksPerMonth,
      },
      pro: {
        name: PRO_PLAN.name,
        priceLabel: PRO_PLAN.priceLabel,
        appPacksPerMonth: PRO_PLAN.appPacksPerMonth,
        minAppPackImages: PRO_PLAN.minAppPackImages,
        maxAppPackImages: PRO_PLAN.maxAppPackImages,
        trialDays: PRO_PLAN.trialDays,
      },
    },
  });
}
