'use client'

/**
 * Premium entitlements (client).
 *
 * Credits-first: App Pack credits never expire.
 * Pro is optional (MCP key + monthly credit top-up).
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { BILLING } from '@/lib/billing/config'

const STORAGE_KEY = 'dc.entitlement.pro'

export type CheckoutSku = 'pack_single' | 'pack_bundle' | 'pro'

type EntitlementSnapshot = {
  isPro: boolean
  plan: 'free' | 'credits' | 'pro'
  appPackCredits: number
  appPacksRemaining: number
  appPacksPerMonth: number
  minAppPackImages: number
  billingConfigured: boolean
  ready: boolean
}

const listeners = new Set<() => void>()
let snapshot: EntitlementSnapshot = {
  isPro: false,
  plan: 'free',
  appPackCredits: 0,
  appPacksRemaining: 0,
  appPacksPerMonth: BILLING.proCreditsPerMonth,
  minAppPackImages: BILLING.minAppPackImages,
  billingConfigured: false,
  ready: false,
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function readLegacyFlag(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    const override = params.get('pro')
    if (override === '1') {
      localStorage.setItem(STORAGE_KEY, '1')
      return true
    }
    if (override === '0') {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

async function refreshEntitlement(): Promise<void> {
  try {
    const response = await fetch('/api/billing/entitlement', { cache: 'no-store' })
    if (response.ok) {
      const data = (await response.json()) as {
        isPro?: boolean
        plan?: 'free' | 'credits' | 'pro'
        appPackCredits?: number
        appPacksRemaining?: number
        appPacksPerMonth?: number
        minAppPackImages?: number
        billingConfigured?: boolean
      }
      const credits = data.appPackCredits ?? data.appPacksRemaining ?? 0
      const legacyPro = readLegacyFlag()
      snapshot = {
        isPro: Boolean(data.isPro) || legacyPro,
        plan: data.plan || (legacyPro ? 'pro' : credits > 0 ? 'credits' : 'free'),
        appPackCredits: credits,
        appPacksRemaining: credits,
        appPacksPerMonth: data.appPacksPerMonth ?? BILLING.proCreditsPerMonth,
        minAppPackImages: data.minAppPackImages ?? BILLING.minAppPackImages,
        billingConfigured: Boolean(data.billingConfigured),
        ready: true,
      }
      emit()
      return
    }
  } catch {
    // fall through
  }
  snapshot = {
    ...snapshot,
    isPro: readLegacyFlag(),
    ready: true,
  }
  emit()
}

export function useEntitlements() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot
  )

  useEffect(() => {
    void refreshEntitlement()
  }, [])

  return {
    isPro: state.isPro,
    plan: state.plan,
    ready: state.ready,
    appPackCredits: state.appPackCredits,
    appPacksRemaining: state.appPacksRemaining,
    appPacksPerMonth: state.appPacksPerMonth,
    minAppPackImages: state.minAppPackImages,
    billingConfigured: state.billingConfigured,
    refresh: refreshEntitlement,
  }
}

export async function startCheckout(
  sku: CheckoutSku = 'pack_single',
  email?: string
): Promise<string> {
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, ...(email ? { email } : {}) }),
  })
  const data = (await response.json()) as { url?: string; error?: string }
  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Could not start checkout')
  }
  return data.url
}

/** @deprecated Prefer startCheckout('pro') */
export async function startProCheckout(email?: string): Promise<string> {
  return startCheckout('pro', email)
}

export function useCheckout(sku: CheckoutSku = 'pack_single') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkout = async (email?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = await startCheckout(sku, email)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  return { checkout, loading, error }
}

/** @deprecated Prefer useCheckout('pro') */
export function useProCheckout() {
  return useCheckout('pro')
}

export const PRO_FEATURES = [
  `${BILLING.proCreditsPerMonth} App Pack credits every month (unused stack)`,
  'Personal MCP API key for Claude / Cursor',
  'Studio DESIGN.md + full pack ZIP',
  'For people who keep designing in the agent loop',
] as const
