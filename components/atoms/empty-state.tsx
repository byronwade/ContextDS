"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Icon className="h-6 w-6 text-neutral-400" />
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
          {description}
        </p>
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4"
          variant="outline"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}