"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ConfidenceMeterProps {
  value: number // 0-1 or 0-100
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function ConfidenceMeter({
  value,
  size = "md",
  showLabel = false,
  className
}: ConfidenceMeterProps) {
  // Normalize to 0-100 if needed
  const normalizedValue = value > 1 ? value : value * 100

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3"
  }

  const getColorClass = (value: number) => {
    if (value >= 80) return "bg-green-500"
    if (value >= 60) return "bg-yellow-500"
    if (value >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        value={normalizedValue}
        className={cn("flex-1", sizeClasses[size])}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground min-w-[3rem]">
          {Math.round(normalizedValue)}%
        </span>
      )}
    </div>
  )
}