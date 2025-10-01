"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCounterProps {
  value: number
  className?: string
  formatCompact?: boolean
}

export function AnimatedCounter({ value, className, formatCompact = false }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevValueRef = useRef(value)

  const formatValue = (num: number) => {
    if (!formatCompact) return num.toString()
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsAnimating(true)

      // Animate the counter up to new value
      const startValue = prevValueRef.current
      const endValue = value
      const duration = 800 // ms
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOut)

        setDisplayValue(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setDisplayValue(endValue)
          setIsAnimating(false)
          prevValueRef.current = endValue
        }
      }

      animate()
    }
  }, [value])

  return (
    <span
      className={cn(
        "transition-all duration-300",
        isAnimating && "text-emerald-500 scale-110",
        className
      )}
    >
      {formatValue(displayValue)}
    </span>
  )
}