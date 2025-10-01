/**
 * SEO Analytics and Monitoring Component
 * Tracks Core Web Vitals, search console integration, and performance metrics
 */

'use client'

import { useEffect } from 'react'
import { initializeWebVitals, reportWebVitalsToAnalytics } from '@/lib/seo/performance'

interface SEOAnalyticsProps {
  trackingId?: string
  enableWebVitals?: boolean
  enableSearchConsole?: boolean
  enableClarityTracking?: boolean
}

export function SEOAnalytics({
  trackingId,
  enableWebVitals = true,
  enableSearchConsole = true,
  enableClarityTracking = true
}: SEOAnalyticsProps) {
  useEffect(() => {
    // Initialize Google Analytics 4 if tracking ID is provided
    if (trackingId && typeof window !== 'undefined') {
      // Load Google Analytics script
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
      script.async = true
      document.head.appendChild(script)

      // Initialize gtag
      window.dataLayer = window.dataLayer || []
      function gtag(...args: any[]) {
        window.dataLayer.push(arguments)
      }
      gtag('js', new Date())
      gtag('config', trackingId, {
        page_title: document.title,
        page_location: window.location.href,
        // Enhanced ecommerce for design token tracking
        custom_map: {
          custom_parameter_1: 'token_extractions',
          custom_parameter_2: 'scan_completions',
          custom_parameter_3: 'community_interactions'
        }
      })

      // Make gtag available globally
      ;(window as any).gtag = gtag
    }

    // Initialize Web Vitals monitoring
    if (enableWebVitals) {
      initializeWebVitals(reportWebVitalsToAnalytics)
    }

    // Initialize Search Console verification (if not already in head)
    if (enableSearchConsole && process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) {
      const existingVerification = document.querySelector('meta[name="google-site-verification"]')
      if (!existingVerification) {
        const meta = document.createElement('meta')
        meta.name = 'google-site-verification'
        meta.content = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
        document.head.appendChild(meta)
      }
    }

    // Initialize Microsoft Clarity for session recordings and heatmaps
    if (enableClarityTracking && process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) {
      const clarityScript = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
      `
      const script = document.createElement('script')
      script.innerHTML = clarityScript
      document.head.appendChild(script)
    }

    // Track page views
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
      })
    }

    // Track Core Web Vitals for search ranking correlation
    const trackCWVForSEO = () => {
      // Send CWV data to custom analytics endpoint for SEO analysis
      fetch('/api/analytics/seo-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          timestamp: Date.now(),
          user_agent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          connection: (navigator as any).connection?.effectiveType || 'unknown'
        })
      }).catch(console.error)
    }

    // Track after page load
    if (document.readyState === 'complete') {
      trackCWVForSEO()
    } else {
      window.addEventListener('load', trackCWVForSEO)
    }

    // Enhanced tracking for design token interactions
    const trackTokenInteractions = () => {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement

        // Track token card clicks
        if (target.closest('[data-token-card]')) {
          const tokenType = target.closest('[data-token-card]')?.getAttribute('data-token-type')
          if (window.gtag && tokenType) {
            window.gtag('event', 'token_interaction', {
              event_category: 'Design Tokens',
              event_label: tokenType,
              value: 1
            })
          }
        }

        // Track scan interactions
        if (target.closest('[data-scan-action]')) {
          const action = target.closest('[data-scan-action]')?.getAttribute('data-scan-action')
          if (window.gtag && action) {
            window.gtag('event', 'scan_action', {
              event_category: 'Site Scanner',
              event_label: action,
              value: 1
            })
          }
        }

        // Track community interactions
        if (target.closest('[data-community-action]')) {
          const action = target.closest('[data-community-action]')?.getAttribute('data-community-action')
          if (window.gtag && action) {
            window.gtag('event', 'community_interaction', {
              event_category: 'Community',
              event_label: action,
              value: 1
            })
          }
        }
      })
    }

    trackTokenInteractions()

    // Cleanup function
    return () => {
      window.removeEventListener('load', trackCWVForSEO)
    }
  }, [trackingId, enableWebVitals, enableSearchConsole, enableClarityTracking])

  // Track search queries for SEO insights
  useEffect(() => {
    if (typeof window === 'undefined') return

    const trackSearchQueries = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const searchQuery = urlParams.get('q') || urlParams.get('search') || urlParams.get('query')

      if (searchQuery && window.gtag) {
        window.gtag('event', 'search', {
          search_term: searchQuery,
          event_category: 'Site Search',
          value: searchQuery.length
        })
      }
    }

    trackSearchQueries()
  }, [])

  // Component doesn't render anything visible
  return null
}

// Enhanced Web Vitals reporter with SEO correlation
export function EnhancedWebVitalsReporter() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Track detailed performance metrics for SEO analysis
    const trackDetailedMetrics = () => {
      const timing = performance.timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      const metrics = {
        // Core metrics
        dom_content_loaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        load_complete: timing.loadEventEnd - timing.navigationStart,
        first_byte: timing.responseStart - timing.navigationStart,

        // Navigation timing
        dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcp_connection: timing.connectEnd - timing.connectStart,
        server_response: timing.responseEnd - timing.responseStart,
        dom_processing: timing.domComplete - timing.domLoading,

        // Resource timing
        total_resources: performance.getEntriesByType('resource').length,

        // Page info
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: Date.now()
      }

      // Send to analytics
      fetch('/api/analytics/performance-detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      }).catch(console.error)
    }

    // Track after load
    if (document.readyState === 'complete') {
      setTimeout(trackDetailedMetrics, 1000)
    } else {
      window.addEventListener('load', () => {
        setTimeout(trackDetailedMetrics, 1000)
      })
    }
  }, [])

  return null
}

// SEO-focused error tracking
export function SEOErrorTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const trackSEOErrors = (event: ErrorEvent) => {
      // Track JavaScript errors that might impact SEO
      const errorData = {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: Date.now()
      }

      // Send to analytics
      fetch('/api/analytics/seo-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(console.error)

      // Track in Google Analytics if available
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: event.message,
          fatal: false,
          event_category: 'SEO Errors'
        })
      }
    }

    window.addEventListener('error', trackSEOErrors)

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorData = {
        message: event.reason?.message || 'Unhandled Promise Rejection',
        reason: String(event.reason),
        url: window.location.href,
        timestamp: Date.now()
      }

      fetch('/api/analytics/seo-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(console.error)
    })

    return () => {
      window.removeEventListener('error', trackSEOErrors)
    }
  }, [])

  return null
}

// Combine all SEO tracking components
export function ComprehensiveSEOTracking({
  trackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  enableAll = true
}: {
  trackingId?: string
  enableAll?: boolean
}) {
  return (
    <>
      <SEOAnalytics
        trackingId={trackingId}
        enableWebVitals={enableAll}
        enableSearchConsole={enableAll}
        enableClarityTracking={enableAll}
      />
      <EnhancedWebVitalsReporter />
      <SEOErrorTracker />
    </>
  )
}

// Type declarations for global objects
declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
  }
}