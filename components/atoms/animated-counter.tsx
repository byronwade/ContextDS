'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  className?: string
  formatCompact?: boolean
  /** Optional suffix after the number (e.g. "%") */
  suffix?: string
  /** Placeholder when value is empty / zero and showZero is false */
  emptyLabel?: string
  showZero?: boolean
  durationMs?: number
}

function formatCompactNumber(num: number): string {
  if (!Number.isFinite(num) || num < 0) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(num))
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Smoothly ticks a number toward `value` and flashes when it increases.
 */
export function AnimatedCounter({
  value,
  className,
  formatCompact = false,
  suffix = '',
  emptyLabel,
  showZero = true,
  durationMs = 700,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [bump, setBump] = useState(false)
  const prevValueRef = useRef(value)
  const rafRef = useRef<number | null>(null)
  const bumpTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const previous = prevValueRef.current
    if (value === previous) return

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const increased = value > previous
    if (increased) {
      setBump(true)
      if (bumpTimerRef.current != null) window.clearTimeout(bumpTimerRef.current)
      bumpTimerRef.current = window.setTimeout(() => setBump(false), 900)
    }

    if (prefersReducedMotion()) {
      setDisplayValue(value)
      prevValueRef.current = value
      return
    }

    const startValue = previous
    const endValue = value
    const startTime = performance.now()
    const duration = Math.min(1200, Math.max(280, durationMs))

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // ease-out cubic
      const ease = 1 - (1 - progress) ** 3
      const current = startValue + (endValue - startValue) * ease
      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
        prevValueRef.current = endValue
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  useEffect(() => {
    return () => {
      if (bumpTimerRef.current != null) window.clearTimeout(bumpTimerRef.current)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const rounded = Math.round(displayValue)
  if (!showZero && rounded <= 0 && emptyLabel) {
    return <span className={className}>{emptyLabel}</span>
  }

  const text = formatCompact
    ? formatCompactNumber(displayValue)
    : String(rounded)

  return (
    <span
      className={cn(
        'inline-block tabular-nums transition-[color,transform] duration-300 ease-out',
        bump && 'scale-110 text-primary',
        className
      )}
      data-bump={bump || undefined}
    >
      {text}
      {suffix}
    </span>
  )
}
