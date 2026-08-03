'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ComponentProps, useEffect, useRef } from 'react'

/**
 * SmartLink — Link with hover/touch prefetch (default prefetch off to cut
 * Vercel compute). Prefetch fires on intentional hover after a short debounce.
 */
export function SmartLink({
  href,
  children,
  prefetch = false,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  ...props
}: ComponentProps<typeof Link>) {
  const router = useRouter()
  const prefetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (prefetchTimeout.current) clearTimeout(prefetchTimeout.current)
    }
  }, [])

  const schedulePrefetch = () => {
    if (typeof href !== 'string') return
    if (prefetchTimeout.current) clearTimeout(prefetchTimeout.current)
    prefetchTimeout.current = setTimeout(() => {
      router.prefetch(href)
    }, 50)
  }

  const cancelPrefetch = () => {
    if (prefetchTimeout.current) {
      clearTimeout(prefetchTimeout.current)
      prefetchTimeout.current = null
    }
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        schedulePrefetch()
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        cancelPrefetch()
        onMouseLeave?.(event)
      }}
      onTouchStart={(event) => {
        if (typeof href === 'string') router.prefetch(href)
        onTouchStart?.(event)
      }}
      {...props}
    >
      {children}
    </Link>
  )
}
