"use client"

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RealtimeStatProps {
  value: number
  label: string
  loading?: boolean
  className?: string
}

export function RealtimeStat({ value, label, loading, className }: RealtimeStatProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true)

      // Animate number change
      const duration = 300
      const steps = 20
      const increment = (value - displayValue) / steps
      let current = displayValue
      let step = 0

      const timer = setInterval(() => {
        step++
        current += increment

        if (step >= steps) {
          setDisplayValue(value)
          setIsAnimating(false)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.round(current))
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }
  }, [value, displayValue])

  return (
    <div className={cn("flex items-center gap-1.5 text-[13px]", className)}>
      <span className={cn(
        "font-semibold tabular-nums text-foreground transition-all duration-200",
        isAnimating && "scale-110"
      )}>
        {loading ? '—' : displayValue.toLocaleString()}
      </span>
      <span className="text-grep-9">{label}</span>
    </div>
  )
}