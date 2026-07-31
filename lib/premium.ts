'use client'

/**
 * Premium entitlements (client stub).
 *
 * Billing isn't wired yet — Pro is a local flag so the gated surfaces
 * (Studio export, MCP keys) can ship and be tested end-to-end:
 *   - visiting any page with `?pro=1` enables Pro on this browser
 *   - `?pro=0` clears it
 * Swap `readEntitlement` for a real subscription lookup when billing lands.
 */

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'dc.entitlement.pro'

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

function readEntitlement(): boolean {
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

export function useEntitlements() {
  const isPro = useSyncExternalStore(subscribe, readEntitlement, () => false)
  const ready = useSyncExternalStore(subscribe, () => true, () => false)
  return { isPro, ready }
}

export const PRO_FEATURES = [
  'Design Contract Studio — author and export your own contracts',
  'MCP server access — tokens and contracts inside Claude, Cursor and any MCP client',
  'Unlimited accurate scans with browser capture',
  'Private contracts and version history',
] as const
