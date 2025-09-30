import { useEffect } from 'react'

export interface WebVitalsMetric {
  id: string
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender'
}

interface WebVitalsConfig {
  enabled?: boolean
  debug?: boolean
  reportCallback?: (metric: WebVitalsMetric) => void
}

export function useWebVitals(config: WebVitalsConfig = {}) {
  const { enabled = true, debug = false, reportCallback } = config

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Dynamic import to avoid loading web-vitals in SSR
    import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB, onINP }) => {
      const reportMetric = (metric: WebVitalsMetric) => {
        if (debug) {
          console.log('[Web Vitals]', metric.name, {
            value: metric.value,
            rating: metric.rating,
            id: metric.id,
          })
        }

        // Send to analytics
        if (reportCallback) {
          reportCallback(metric)
        }

        // Send to your analytics provider
        if (typeof window !== 'undefined' && (window as any).gtag) {
          ;(window as any).gtag('event', metric.name, {
            event_category: 'Web Vitals',
            event_label: metric.id,
            value: Math.round(metric.value),
            non_interaction: true,
          })
        }

        // Send to Vercel Analytics
        if (typeof window !== 'undefined' && (window as any).va) {
          ;(window as any).va('event', {
            name: metric.name,
            data: {
              value: metric.value,
              rating: metric.rating,
            },
          })
        }
      }

      // Register all Web Vitals
      onCLS(reportMetric)
      onFCP(reportMetric)
      onFID(reportMetric)
      onLCP(reportMetric)
      onTTFB(reportMetric)
      onINP(reportMetric)
    })
  }, [enabled, debug, reportCallback])
}

// Helper to get Web Vitals thresholds
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // ms
  FID: { good: 100, poor: 300 }, // ms
  CLS: { good: 0.1, poor: 0.25 }, // score
  FCP: { good: 1800, poor: 3000 }, // ms
  TTFB: { good: 800, poor: 1800 }, // ms
  INP: { good: 200, poor: 500 }, // ms
} as const

// Helper to determine rating
export function getMetricRating(
  name: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name]
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}