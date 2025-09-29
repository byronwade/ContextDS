"use client"

import { useEffect, useRef } from 'react'

interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
  className?: string
}

export function LiveRegion({ message, politeness = 'polite', className }: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (regionRef.current && message) {
      // Clear and then set the message to ensure screen readers announce it
      regionRef.current.textContent = ''
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message
        }
      }, 100)
    }
  }, [message])

  return (
    <div
      ref={regionRef}
      aria-live={politeness}
      aria-atomic="true"
      className={`sr-only ${className}`}
    />
  )
}