import { describe, expect, it } from 'vitest'
import {
  BILLING,
  PRO_PLAN,
  currentQuotaPeriod,
  isProEntitlement,
  type Entitlement,
} from '@/lib/billing/config'

describe('billing config', () => {
  it('keeps Pro cheap but above multi-image vision COGS', () => {
    expect(BILLING.proPriceUsd).toBe(9)
    expect(BILLING.appPacksPerMonth).toBe(12)
    expect(BILLING.minAppPackImages).toBe(5)
    expect(BILLING.maxAppPackImages).toBeGreaterThanOrEqual(BILLING.minAppPackImages)
    expect(PRO_PLAN.priceLabel).toBe('$9/mo')
    // Effective list price per included pack stays under $1
    expect(BILLING.proPriceUsd / BILLING.appPacksPerMonth).toBeLessThan(1)
  })

  it('treats expired or canceled entitlements as not Pro', () => {
    const active: Entitlement = {
      plan: 'pro',
      status: 'active',
      periodEnd: Date.now() + 60_000,
      source: 'stripe',
    }
    expect(isProEntitlement(active)).toBe(true)
    expect(
      isProEntitlement({ ...active, status: 'canceled' })
    ).toBe(false)
    expect(
      isProEntitlement({ ...active, periodEnd: Date.now() - 1000 })
    ).toBe(false)
  })

  it('formats quota periods as YYYY-MM', () => {
    expect(currentQuotaPeriod(new Date('2026-08-03T12:00:00Z'))).toBe('2026-08')
  })
})
