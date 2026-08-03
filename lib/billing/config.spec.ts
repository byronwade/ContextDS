import { describe, expect, it } from 'vitest'
import {
  BILLING,
  CREDIT_SKUS,
  PRO_PLAN,
  canSpendAppPack,
  creditBalance,
  currentQuotaPeriod,
  isProEntitlement,
  type Entitlement,
} from '@/lib/billing/config'

describe('billing config (credits-first)', () => {
  it('prices one-time packs above vision COGS and below a monthly trap', () => {
    expect(BILLING.packSingleUsd).toBe(4)
    expect(BILLING.packBundleUsd).toBe(15)
    expect(BILLING.packBundleCredits).toBe(5)
    expect(BILLING.minAppPackImages).toBe(5)
    expect(CREDIT_SKUS.pack_bundle.priceUsd / CREDIT_SKUS.pack_bundle.credits).toBe(3)
    // Bundle stays cheaper per pack than single
    expect(
      BILLING.packBundleUsd / BILLING.packBundleCredits
    ).toBeLessThan(BILLING.packSingleUsd)
  })

  it('keeps Pro as an optional builder tier with monthly credit top-ups', () => {
    expect(PRO_PLAN.priceUsd).toBe(12)
    expect(PRO_PLAN.creditsPerMonth).toBe(5)
    expect(PRO_PLAN.priceLabel).toBe('$12/mo')
  })

  it('treats credit balance as spendable without requiring Pro', () => {
    const wallet: Entitlement = {
      plan: 'credits',
      appPackCredits: 2,
      source: 'stripe',
    }
    expect(creditBalance(wallet)).toBe(2)
    expect(canSpendAppPack(wallet)).toBe(true)
    expect(isProEntitlement(wallet)).toBe(false)
  })

  it('reads legacy appPacksRemaining into credit balance', () => {
    const legacy: Entitlement = {
      plan: 'pro',
      status: 'active',
      appPacksRemaining: 3,
      periodEnd: Date.now() + 60_000,
      source: 'stripe',
    }
    expect(creditBalance(legacy)).toBe(3)
    expect(isProEntitlement(legacy)).toBe(true)
  })

  it('formats quota periods as YYYY-MM', () => {
    expect(currentQuotaPeriod(new Date('2026-08-03T12:00:00Z'))).toBe('2026-08')
  })
})
