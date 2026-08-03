'use client'

/**
 * Premium entitlements (client).
 *
 * Server source of truth: signed `dc_pro` cookie + Redis (see lib/billing/).
 * Client polls /api/billing/entitlement and keeps a short local cache.
 * Legacy `?pro=1` still works for local demos when BILLING_BYPASS isn't set.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { BILLING } from '@/lib/billing/config'

const STORAGE_KEY = 'dc.entitlement.pro'

type EntitlementSnapshot = {
  isPro: boolean
  appPacksRemaining: number
  appPacksPerMonth: number
  minAppPackImages: number
  billingConfigured: boolean
  ready: boolean
}

const listeners = new Set<() => void>()
let snapshot: EntitlementSnapshot = {
  isPro: false,
  appPacksRemaining: 0,
  appPacksPerMonth: BILLING.appPacksPerMonth,
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
        appPacksRemaining?: number
        appPacksPerMonth?: number
        minAppPackImages?: number
        billingConfigured?: boolean
      }
      snapshot = {
        isPro: Boolean(data.isPro) || readLegacyFlag(),
        appPacksRemaining: data.appPacksRemaining ?? 0,
        appPacksPerMonth: data.appPacksPerMonth ?? BILLING.appPacksPerMonth,
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
    ready: state.ready,
    appPacksRemaining: state.appPacksRemaining,
    appPacksPerMonth: state.appPacksPerMonth,
    minAppPackImages: state.minAppPackImages,
    billingConfigured: state.billingConfigured,
    refresh: refreshEntitlement,
  }
}

export async function startProCheckout(email?: string): Promise<string> {
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email ? { email } : {}),
  })
  const data = (await response.json()) as { url?: string; error?: string }
  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Could not start checkout')
  }
  return data.url
}

export function useProCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkout = async (email?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = await startProCheckout(email)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  return { checkout, loading, error }
}

export const PRO_FEATURES = [
  `${BILLING.appPacksPerMonth} App Packs / month — application Design Contracts from ≥${BILLING.minAppPackImages} screenshots`,
  'Design Contract Studio — author and export your own contracts',
  'MCP server access — tokens and contracts inside Claude, Cursor and any MCP client',
  'Unlimited accurate scans with browser capture',
  'Private contracts and version history',
] as const
