"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const progressVariants = cva(
  "relative overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

interface ProgressBarProps extends VariantProps<typeof progressVariants> {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  label?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}

export function ProgressBar({
  value,
  max = 100,
  className,
  size,
  showLabel = false,
  label,
  color = 'blue'
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colorClasses = {
    blue: "bg-blue-500 dark:bg-blue-400",
    green: "bg-green-500 dark:bg-green-400",
    red: "bg-red-500 dark:bg-red-400",
    yellow: "bg-yellow-500 dark:bg-yellow-400",
    purple: "bg-purple-500 dark:bg-purple-400"
  }

  return (
    <div className="space-y-1">
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(progressVariants({ size }), className)}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}