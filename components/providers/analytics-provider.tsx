'use client'

/**
 * Analytics Provider — Vercel Web Analytics + Speed Insights
 * Suspense-safe so useSearchParams does not block the shell.
 */

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, Suspense, useEffect } from 'react'

function RouteAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const query = searchParams?.toString()
    trackPageView(query ? `${pathname}?${query}` : pathname)
  }, [pathname, searchParams])

  return null
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense
        fallback={
          <span className="sr-only" role="status">
            Loading analytics…
          </span>
        }
      >
        <RouteAnalytics />
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (
    typeof window !== 'undefined' &&
    (window as Window & { va?: (...args: unknown[]) => void }).va
  ) {
    ;(window as Window & { va?: (...args: unknown[]) => void }).va?.('track', eventName, properties)
  }
}

export function trackPageView(url: string) {
  if (
    typeof window !== 'undefined' &&
    (window as Window & { va?: (...args: unknown[]) => void }).va
  ) {
    ;(window as Window & { va?: (...args: unknown[]) => void }).va?.('pageview', { url })
  }

  // Keep analytics non-blocking
  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    const blob = new Blob(
      [
        JSON.stringify({
          url,
          referrer: document.referrer,
        }),
      ],
      { type: 'application/json' }
    )
    navigator.sendBeacon('/api/analytics/pageview', blob)
    return
  }

  void fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    }),
    keepalive: true,
  }).catch(() => {})
}

export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', { query, resultsCount })
  void fetch('/api/analytics/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, resultsCount }),
    keepalive: true,
  }).catch(() => {})
}

export function trackScanRequest(url: string) {
  trackEvent('scan_request', { url })
  void fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'scan_request',
      eventName: 'Scan Requested',
      properties: { url },
    }),
    keepalive: true,
  }).catch(() => {})
}
