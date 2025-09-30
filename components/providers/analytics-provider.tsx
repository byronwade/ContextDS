'use client'

/**
 * Analytics Provider
 * Integrates Vercel Web Analytics and Speed Insights
 */

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      // Track page views
      trackPageView(pathname)
    }
  }, [pathname, searchParams])

  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

// Helper function to track custom events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', eventName, properties)
  }
}

// Helper function to track page views
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('pageview', { url })
  }

  // Also send to our database
  fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    })
  }).catch(() => {
    // Silent fail - analytics shouldn't break the app
  })
}

// Helper function to track search
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', {
    query,
    resultsCount
  })

  // Also send to our database
  fetch('/api/analytics/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, resultsCount })
  }).catch(() => {
    // Silent fail
  })
}

// Helper function to track scan request
export function trackScanRequest(url: string) {
  trackEvent('scan_request', { url })

  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'scan_request',
      eventName: 'Scan Requested',
      properties: { url }
    })
  }).catch(() => {
    // Silent fail
  })
}