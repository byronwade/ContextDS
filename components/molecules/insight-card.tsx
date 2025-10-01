"use client"

import { cn } from "@/lib/utils"
import { LucideIcon, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InsightCardProps {
  title: string
  description: string
  icon?: LucideIcon
  severity?: "critical" | "high" | "medium" | "low" | "info"
  impact?: "high" | "medium" | "low"
  effort?: "high" | "medium" | "low"
  recommendation?: string
  metrics?: Array<{
    label: string
    value: string | number
  }>
  onClick?: () => void
}

export function InsightCard({
  title,
  description,
  icon: Icon,
  severity = "info",
  impact,
  effort,
  recommendation,
  metrics,
  onClick
}: InsightCardProps) {
  const severityStyles = {
    critical: {
      border: "border-red-300 dark:border-red-800",
      bg: "bg-red-50 dark:bg-red-950/20",
      text: "text-red-700 dark:text-red-400",
      icon: "text-red-600 dark:text-red-500"
    },
    high: {
      border: "border-orange-300 dark:border-orange-800",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      text: "text-orange-700 dark:text-orange-400",
      icon: "text-orange-600 dark:text-orange-500"
    },
    medium: {
      border: "border-yellow-300 dark:border-yellow-800",
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: "text-yellow-600 dark:text-yellow-500"
    },
    low: {
      border: "border-blue-300 dark:border-blue-800",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      text: "text-blue-700 dark:text-blue-400",
      icon: "text-blue-600 dark:text-blue-500"
    },
    info: {
      border: "border-grep-3",
      bg: "bg-grep-0",
      text: "text-foreground",
      icon: "text-grep-7"
    }
  }

  const styles = severityStyles[severity] || severityStyles.info

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all duration-200",
        styles.border,
        styles.bg,
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        {Icon && (
          <div className={cn("mt-0.5", styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-semibold mb-1", styles.text)}>
            {title}
          </h4>
          <p className="text-xs text-grep-9 leading-relaxed">
            {description}
          </p>
        </div>
        {onClick && (
          <ChevronRight className="h-4 w-4 text-grep-7 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Badges */}
      {(impact || effort) && (
        <div className="flex items-center gap-2 mb-3">
          {impact && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              Impact: {impact}
            </Badge>
          )}
          {effort && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              Effort: {effort}
            </Badge>
          )}
        </div>
      )}

      {/* Metrics */}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {metrics.map((metric, index) => (
            <div key={index} className="text-xs">
              <div className="text-grep-7">{metric.label}</div>
              <div className={cn("font-mono font-semibold", styles.text)}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mt-3 pt-3 border-t border-grep-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-grep-9 mb-1">
            Recommendation
          </div>
          <p className="text-xs text-grep-8 leading-relaxed">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  )
}
