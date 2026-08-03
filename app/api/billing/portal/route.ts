import { NextRequest, NextResponse } from 'next/server';
import { createBillingPortalSession, isStripeConfigured } from '@/lib/billing/stripe';
import { getEntitlementFromRequest } from '@/lib/billing/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/portal
 * Opens Stripe Customer Portal for the authenticated Pro customer.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const entitlement = await getEntitlementFromRequest(request);
  if (!entitlement?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No active subscription found. Upgrade at /pricing first.' },
      { status: 401 }
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const session = await createBillingPortalSession({
      customerId: entitlement.stripeCustomerId,
      returnUrl: `${origin}/pricing?portal=return`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/portal]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Portal failed' },
      { status: 500 }
    );
  }
}
