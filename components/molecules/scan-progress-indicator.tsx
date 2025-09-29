"use client"

import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/atoms/loading-spinner"
import { StatusBadge } from "@/components/atoms/status-badge"
import { cn } from "@/lib/utils"

interface ScanProgressIndicatorProps {
  status: "queued" | "scanning" | "completed" | "failed"
  progress?: number // 0-100
  currentStep?: string
  queuePosition?: number
  className?: string
}

export function ScanProgressIndicator({
  status,
  progress = 0,
  currentStep,
  queuePosition,
  className
}: ScanProgressIndicatorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        {status === "scanning" && (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      {status === "queued" && queuePosition !== undefined && (
        <p className="text-sm text-muted-foreground">
          Position {queuePosition} in queue
        </p>
      )}

      {status === "scanning" && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          {currentStep && (
            <p className="text-sm text-muted-foreground">{currentStep}</p>
          )}
        </div>
      )}

      {status === "completed" && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Scan completed successfully
        </p>
      )}

      {status === "failed" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Scan failed. Please try again.
        </p>
      )}
    </div>
  )
}