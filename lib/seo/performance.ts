/**
 * Core Web Vitals and Performance Optimization for ContextDS
 * Tools for monitoring and optimizing LCP, FID, CLS, and other performance metrics
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

export interface PerformanceMetric {
  name: 'CLS' | 'INP' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

export interface PerformanceThresholds {
  LCP: { good: number; poor: number }
  INP: { good: number; poor: number }
  CLS: { good: number; poor: number }
  FCP: { good: number; poor: number }
  TTFB: { good: number; poor: number }
}

// Google's Core Web Vitals thresholds
export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
}

export type PerformanceCallback = (metric: PerformanceMetric) => void

/**
 * Initialize Web Vitals monitoring
 */
export function initializeWebVitals(onMetric: PerformanceCallback) {
  // Only run in browser
  if (typeof window === 'undefined') return

  const reportMetric = (metric: any) => {
    const rating = getRating(metric.name as keyof PerformanceThresholds, metric.value)

    onMetric({
      name: metric.name,
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType
    })
  }

  onCLS(reportMetric)
  onINP(reportMetric)
  onFCP(reportMetric)
  onLCP(reportMetric)
  onTTFB(reportMetric)
}

/**
 * Get performance rating based on thresholds
 */
export function getRating(
  metric: keyof PerformanceThresholds,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_THRESHOLDS[metric]

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Generate performance recommendations
 */
export function generatePerformanceRecommendations(metrics: PerformanceMetric[]): {
  recommendations: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: string
} {
  const recommendations: string[] = []
  let priority: 'high' | 'medium' | 'low' = 'low'

  for (const metric of metrics) {
    if (metric.rating === 'poor') {
      priority = 'high'

      switch (metric.name) {
        case 'LCP':
          recommendations.push(
            'Optimize images with next/image and proper sizing',
            'Enable browser caching and CDN',
            'Reduce server response time',
            'Remove unused JavaScript and CSS',
            'Use preload for critical resources'
          )
          break

        case 'INP':
          recommendations.push(
            'Reduce main thread blocking time',
            'Split large JavaScript bundles',
            'Use code splitting and lazy loading',
            'Optimize third-party scripts',
            'Minimize layout thrashing'
          )
          break

        case 'CLS':
          recommendations.push(
            'Set explicit dimensions for images and videos',
            'Reserve space for dynamic content',
            'Avoid inserting content above existing content',
            'Use transform instead of changing layout properties',
            'Preload web fonts to avoid FOIT/FOUT'
          )
          break

        case 'FCP':
          recommendations.push(
            'Reduce render-blocking resources',
            'Minimize unused CSS',
            'Optimize web fonts loading',
            'Use critical CSS inlining',
            'Enable text compression'
          )
          break

        case 'TTFB':
          recommendations.push(
            'Optimize server processing time',
            'Use CDN for static assets',
            'Enable database query optimization',
            'Implement proper caching strategies',
            'Consider edge computing solutions'
          )
          break
      }
    } else if (metric.rating === 'needs-improvement' && priority !== 'high') {
      priority = 'medium'
    }
  }

  // Remove duplicates
  const uniqueRecommendations = [...new Set(recommendations)]

  return {
    recommendations: uniqueRecommendations,
    priority,
    estimatedImpact: priority === 'high'
      ? 'Significant improvement expected'
      : priority === 'medium'
        ? 'Moderate improvement expected'
        : 'Minor improvement expected'
  }
}

/**
 * Performance monitoring configuration for different page types
 */
export const PERFORMANCE_CONFIG = {
  homepage: {
    targetLCP: 2000,
    targetINP: 100,
    targetCLS: 0.05,
    criticalResources: ['fonts', 'hero-image', 'initial-css']
  },
  scan: {
    targetLCP: 2500,
    targetINP: 100,
    targetCLS: 0.1,
    criticalResources: ['scan-interface', 'fonts']
  },
  community: {
    targetLCP: 2200,
    targetINP: 100,
    targetCLS: 0.08,
    criticalResources: ['token-grid', 'fonts', 'images']
  },
  site: {
    targetLCP: 2000,
    targetINP: 100,
    targetCLS: 0.1,
    criticalResources: ['token-data', 'visualization', 'fonts']
  }
}

/**
 * Generate performance optimization script for injection
 */
export function generatePerformanceScript(): string {
  return `
    // Performance optimizations (fonts handled automatically by Next.js)
    (function() {

      // Prefetch likely navigation targets
      const prefetchTargets = ['/community', '/scan', '/docs'];
      prefetchTargets.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
      });

      // Optimize images with Intersection Observer
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              observer.unobserve(img);
            }
          });
        });

        document.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
          });
        });
      }

      // Reduce layout shift for dynamic content
      function reserveSpace(element, minHeight = 200) {
        if (element && !element.style.minHeight) {
          element.style.minHeight = minHeight + 'px';
        }
      }

      // Apply to common dynamic containers
      document.addEventListener('DOMContentLoaded', () => {
        const dynamicContainers = document.querySelectorAll('[data-dynamic]');
        dynamicContainers.forEach(container => {
          reserveSpace(container);
        });
      });
    })();
  `
}

/**
 * Resource hints configuration
 */
export const RESOURCE_HINTS = {
  // DNS prefetch for external domains
  dnsPrefetch: [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://api.contextds.com'
  ],

  // Preconnect for critical third-party resources
  preconnect: [
    { href: 'https://fonts.googleapis.com', crossOrigin: true },
    { href: 'https://api.contextds.com', crossOrigin: true }
  ],

  // Preload critical assets (fonts handled automatically by Next.js)
  preload: [],

  // Prefetch likely navigation targets
  prefetch: [
    '/community',
    '/scan',
    '/docs',
    '/api/stats'
  ]
}

/**
 * Generate resource hints for HTML head
 */
export function generateResourceHints(): Array<{
  rel: string
  href: string
  as?: string
  type?: string
  crossOrigin?: boolean | string
}> {
  const hints: Array<{
    rel: string
    href: string
    as?: string
    type?: string
    crossOrigin?: boolean | string
  }> = []

  // DNS prefetch
  RESOURCE_HINTS.dnsPrefetch.forEach(href => {
    hints.push({ rel: 'dns-prefetch', href })
  })

  // Preconnect
  RESOURCE_HINTS.preconnect.forEach(({ href, crossOrigin }) => {
    hints.push({ rel: 'preconnect', href, crossOrigin })
  })

  // Preload
  RESOURCE_HINTS.preload.forEach(({ href, as, type, crossOrigin }) => {
    hints.push({ rel: 'preload', href, as, type, crossOrigin })
  })

  // Prefetch
  RESOURCE_HINTS.prefetch.forEach(href => {
    hints.push({ rel: 'prefetch', href })
  })

  return hints
}

/**
 * Performance monitoring for Next.js
 */
export function reportWebVitalsToAnalytics(metric: PerformanceMetric) {
  // Send to analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    })
  }

  // Send to custom analytics
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/performance', {
      method: 'POST',
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        timestamp: Date.now()
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(console.error)
  }
}