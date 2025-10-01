import { Skeleton, TextSkeleton, CardSkeleton, StatSkeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"

export function OverviewSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Skeleton className="w-2 h-2" variant="circle" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-6 w-16" variant="rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" variant="rounded" />
          <Skeleton className="h-8 w-20" variant="rounded" />
          <Skeleton className="h-8 w-24" variant="rounded" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    </section>
  )
}

export function ScreenshotsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Main screenshot skeleton */}
      <div className="space-y-4">
        <Skeleton className="aspect-video w-full" variant="rounded" />

        {/* Thumbnail row */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-20 h-12 shrink-0"
              variant="rounded"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function AnalysisSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="space-y-6">
        {/* Key insights skeleton */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            <TextSkeleton lines={2} />
            <TextSkeleton lines={1} className="w-3/4" />
          </div>
        </div>

        {/* Design system analysis skeleton */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" variant="rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-full" variant="rounded" />
            </div>
          </div>
        </div>

        {/* Recommendations skeleton */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-2 h-2 mt-2" variant="circle" />
                <TextSkeleton lines={1} className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function TokensSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="space-y-6">
        {/* Colors section skeleton */}
        <div className="border border-grep-3 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-20" variant="rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full" variant="rounded" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Typography skeleton */}
        <div className="border border-grep-3 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-20" variant="rounded" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-grep-2 rounded p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Spacing skeleton */}
        <div className="border border-grep-3 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-20" variant="rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-full bg-blue-100 dark:bg-blue-950" variant="rounded" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function TypographySkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="space-y-6">
        {/* Font families */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-grep-2 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-16" variant="rounded" />
                </div>
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Font sizes */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border border-grep-2 rounded">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function BrandSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="space-y-6">
        {/* Brand overview */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <TextSkeleton lines={2} />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-8 h-8" variant="circle" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Brand metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </section>
  )
}

export function ComponentsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-36" />
      </div>

      <div className="space-y-6">
        {/* Components overview */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-grep-2 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-6 h-6" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-20 w-full mb-3" variant="rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Component patterns */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-grep-2 rounded">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-12" variant="rounded" />
                  <Skeleton className="h-6 w-16" variant="rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function LayoutSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="space-y-6">
        {/* Layout overview */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="aspect-video w-full mb-2" variant="rounded" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Pattern analysis */}
        <div className="border border-grep-3 rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-grep-2 rounded">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16" variant="rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}