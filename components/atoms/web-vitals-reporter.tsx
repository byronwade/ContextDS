'use client'

import { useWebVitals } from '@/hooks/use-web-vitals'

export function WebVitalsReporter() {
  useWebVitals({
    enabled: process.env.NODE_ENV === 'production',
    debug: process.env.NODE_ENV === 'development',
    reportCallback: (metric) => {
      // Send to your analytics endpoint
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metric),
        }).catch(() => {
          // Silently fail - don't block user experience
        })
      }
    },
  })

  return null // This component doesn't render anything
}