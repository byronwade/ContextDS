import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/billing/stripe';
import {
  grantProEntitlement,
  setEntitlementCookie,
} from '@/lib/billing/entitlements';
import { PRO_PLAN } from '@/lib/billing/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/success?session_id=...
 * After Stripe Checkout — grant entitlement cookie and redirect to home.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  const home = new URL('/', request.nextUrl.origin);

  if (!sessionId || !isStripeConfigured()) {
    home.searchParams.set('billing', 'error');
    return NextResponse.redirect(home);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== 'subscription' || session.status !== 'complete') {
      home.searchParams.set('billing', 'incomplete');
      return NextResponse.redirect(home);
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!customerId || !subscriptionId) {
      home.searchParams.set('billing', 'error');
      return NextResponse.redirect(home);
    }

    const email =
      session.customer_details?.email ??
      session.customer_email ??
      undefined;

    const periodEnd = Date.now() + 32 * 24 * 60 * 60 * 1000;
    const entitlement = await grantProEntitlement({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      email,
      status: 'trialing',
      currentPeriodEnd: periodEnd,
      appPacksIncluded: PRO_PLAN.appPacksPerMonth,
      appPacksUsed: 0,
    });

    home.searchParams.set('billing', 'success');
    home.searchParams.set('app', '1');
    const response = NextResponse.redirect(home);
    setEntitlementCookie(response, entitlement);
    return response;
  } catch (error) {
    console.error('[billing/success]', error);
    home.searchParams.set('billing', 'error');
    return NextResponse.redirect(home);
  }
}
