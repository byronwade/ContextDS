"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type StatusType = "completed" | "pending" | "failed" | "scanning" | "queued"

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle,
    variant: "default" as const,
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
  },
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  },
  scanning: {
    label: "Scanning",
    icon: AlertCircle,
    variant: "outline" as const,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
  },
  queued: {
    label: "Queued",
    icon: Clock,
    variant: "secondary" as const,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, "flex items-center gap-1", className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}