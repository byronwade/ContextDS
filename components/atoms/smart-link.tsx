'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ComponentProps } from 'react'

/**
 * SmartLink - Optimized Link component with prefetch on hover
 *
 * Makes navigation feel instant by prefetching route data when user hovers.
 * Falls back gracefully for touch devices (prefetch on touchstart).
 *
 * Usage: Drop-in replacement for Next.js Link
 * <SmartLink href="/site/example.com">View Site</SmartLink>
 */
export function SmartLink({
  href,
  children,
  prefetch = false,  // Disable default prefetch (we'll do it on hover)
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter()
  let prefetchTimeout: NodeJS.Timeout | null = null

  const handleMouseEnter = () => {
    // Debounce prefetch by 50ms (avoid prefetching during rapid mouse movement)
    prefetchTimeout = setTimeout(() => {
      if (typeof href === 'string') {
        router.prefetch(href)
      }
    }, 50)
  }

  const handleMouseLeave = () => {
    // Cancel prefetch if user moves away quickly
    if (prefetchTimeout) {
      clearTimeout(prefetchTimeout)
      prefetchTimeout = null
    }
  }

  const handleTouchStart = () => {
    // For touch devices, prefetch immediately on touch
    if (typeof href === 'string') {
      router.prefetch(href)
    }
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </Link>
  )
}