import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "default" | "rounded" | "circle"
  animated?: boolean
}

export function Skeleton({
  className,
  variant = "default",
  animated = true
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-grep-2",
        animated && "animate-pulse",
        variant === "rounded" && "rounded-md",
        variant === "circle" && "rounded-full",
        className
      )}
    />
  )
}

export function TextSkeleton({
  lines = 1,
  className,
  animated = true
}: {
  lines?: number
  className?: string
  animated?: boolean
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
          animated={animated}
        />
      ))}
    </div>
  )
}

export function CardSkeleton({
  className,
  animated = true
}: {
  className?: string
  animated?: boolean
}) {
  return (
    <div className={cn("border border-grep-3 rounded-lg p-4 space-y-3", className)}>
      <Skeleton className="h-6 w-1/3" animated={animated} />
      <Skeleton className="h-4 w-full" animated={animated} />
      <Skeleton className="h-4 w-2/3" animated={animated} />
    </div>
  )
}

export function StatSkeleton({
  className,
  animated = true
}: {
  className?: string
  animated?: boolean
}) {
  return (
    <div className={cn("p-3 sm:p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1", className)}>
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-9 w-20" animated={animated} />
        <Skeleton className="w-2 h-2" variant="circle" animated={animated} />
      </div>
      <Skeleton className="h-3 w-24 mb-2" animated={animated} />
      <Skeleton className="h-1.5 w-full" variant="rounded" animated={animated} />
    </div>
  )
}