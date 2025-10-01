"use client"

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
  }
  status?: "success" | "warning" | "error" | "info" | "neutral"
  subtitle?: string
  progress?: number
  isLoading?: boolean
  onClick?: () => void
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  status = "neutral",
  subtitle,
  progress,
  isLoading = false,
  onClick
}: MetricCardProps) {
  const statusStyles = {
    success: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20",
    warning: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20",
    error: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20",
    info: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20",
    neutral: "border-grep-2 bg-grep-0 hover:border-grep-4 hover:shadow-sm"
  }

  const valueStyles = {
    success: "text-green-700 dark:text-green-400",
    warning: "text-orange-700 dark:text-orange-400",
    error: "text-red-700 dark:text-red-400",
    info: "text-blue-700 dark:text-blue-400",
    neutral: "text-foreground"
  }

  const iconStyles = {
    success: "text-green-600 dark:text-green-500",
    warning: "text-orange-600 dark:text-orange-500",
    error: "text-red-600 dark:text-red-500",
    info: "text-blue-600 dark:text-blue-500",
    neutral: "text-grep-7"
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-all duration-200",
        statusStyles[status],
        onClick && "cursor-pointer",
        isLoading && "animate-pulse"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-grep-9">
          {label}
        </div>
        {Icon && (
          <Icon className={cn("h-4 w-4", iconStyles[status])} />
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        {isLoading ? (
          <div className="h-8 w-20 bg-grep-2 rounded animate-pulse" />
        ) : (
          <div className={cn(
            "text-3xl font-bold tabular-nums",
            valueStyles[status]
          )}>
            {value}
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-grep-7 mb-2">
          {subtitle}
        </div>
      )}

      {/* Progress bar */}
      {progress !== undefined && !isLoading && (
        <div className="w-full h-1.5 bg-grep-2 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              status === "success" && "bg-green-500",
              status === "warning" && "bg-orange-500",
              status === "error" && "bg-red-500",
              status === "info" && "bg-blue-500",
              status === "neutral" && "bg-grep-7"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Trend indicator */}
      {trend && !isLoading && (
        <div className={cn(
          "absolute top-3 right-3 flex items-center gap-1 text-xs font-mono",
          trend.direction === "up" && "text-green-600",
          trend.direction === "down" && "text-red-600",
          trend.direction === "neutral" && "text-grep-7"
        )}>
          {trend.direction === "up" && "↑"}
          {trend.direction === "down" && "↓"}
          {trend.value}%
        </div>
      )}
    </div>
  )
}
