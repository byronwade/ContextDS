import { Skeleton, TextSkeleton, CardSkeleton, StatSkeleton } from "@/components/atoms/skeleton"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export const OverviewSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="overview" ref={ref} className={cn("mb-8", className)}>
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
)
OverviewSkeleton.displayName = "OverviewSkeleton"

export const ScreenshotsSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="screenshots" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Main screenshot skeleton */}
        <div className="space-y-4">
          <div className="relative">
            <Skeleton className="aspect-video w-full" variant="rounded" />
            {/* Overlay elements to simulate screenshot content */}
            <div className="absolute inset-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-8 w-32" variant="rounded" />
                <Skeleton className="h-8 w-24" variant="rounded" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8">
                <Skeleton className="h-24 w-full" variant="rounded" />
                <Skeleton className="h-24 w-full" variant="rounded" />
                <Skeleton className="h-24 w-full" variant="rounded" />
              </div>
              <div className="mt-6 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>

          {/* Thumbnail row */}
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative">
                <Skeleton className="w-20 h-12 shrink-0" variant="rounded" />
                <div className="absolute inset-1">
                  <Skeleton className="h-2 w-12" />
                  <Skeleton className="h-1 w-8 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }
)
ScreenshotsSkeleton.displayName = "ScreenshotsSkeleton"

export const AnalysisSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="analysis" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="space-y-6">
          {/* Key insights skeleton */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="w-2 h-2 mt-2" variant="circle" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="w-2 h-2 mt-2" variant="circle" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Design system analysis skeleton */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="w-8 h-8" variant="circle" />
                  <Skeleton className="w-8 h-8" variant="circle" />
                  <Skeleton className="w-8 h-8" variant="circle" />
                  <Skeleton className="w-8 h-8" variant="circle" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" variant="rounded" />
                  <Skeleton className="h-6 w-3/4" variant="rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations skeleton */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-3 border border-neutral-100 dark:border-neutral-800 rounded">
                  <Skeleton className="w-6 h-6 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
)
AnalysisSkeleton.displayName = "AnalysisSkeleton"

export const ComponentsSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="components" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-36" />
        </div>

        <div className="space-y-6">
          {/* Components overview */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-neutral-100 dark:border-neutral-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-6 h-6" variant="rounded" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="relative">
                    <Skeleton className="h-20 w-full mb-3" variant="rounded" />
                    {/* Simulate component preview */}
                    <div className="absolute inset-2 space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-6 w-20 mt-2" variant="rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Component patterns */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-neutral-100 dark:border-neutral-800 rounded">
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
)
ComponentsSkeleton.displayName = "ComponentsSkeleton"

export const TokensSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="tokens" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="space-y-6">
          {/* Colors section skeleton */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-20" variant="rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="relative">
                    <Skeleton className="aspect-square w-full" variant="rounded" />
                    {/* Simulate color preview */}
                    <div className="absolute inset-2 rounded">
                      <div className={`w-full h-full rounded ${
                        i % 4 === 0 ? 'bg-blue-300' :
                        i % 4 === 1 ? 'bg-green-300' :
                        i % 4 === 2 ? 'bg-purple-300' : 'bg-red-300'
                      } opacity-30`} />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>

          {/* Typography skeleton */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-20" variant="rounded" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-neutral-100 dark:border-neutral-800 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className={`h-6 w-full ${i === 0 ? 'h-8' : i === 1 ? 'h-6' : 'h-4'}`} />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spacing skeleton */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-20" variant="rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="relative p-2 border border-neutral-200 dark:border-neutral-600 rounded">
                    <Skeleton className={`w-full bg-blue-200 dark:bg-blue-800 ${
                      i < 2 ? 'h-2' : i < 4 ? 'h-4' : i < 6 ? 'h-8' : 'h-12'
                    }`} variant="rounded" />
                  </div>
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
)
TokensSkeleton.displayName = "TokensSkeleton"

export const TypographySkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="typography" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="space-y-6">
          {/* Font families */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-neutral-100 dark:border-neutral-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-16" variant="rounded" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <div className="flex gap-4">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32 mt-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Font sizes */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border border-neutral-100 dark:border-neutral-800 rounded">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className={`w-64 ${
                    i === 0 ? 'h-12' : i === 1 ? 'h-10' : i === 2 ? 'h-8' : i === 3 ? 'h-6' : i === 4 ? 'h-5' : 'h-4'
                  }`} />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
)
TypographySkeleton.displayName = "TypographySkeleton"

export const BrandSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="brand" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="space-y-6">
          {/* Brand overview */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="relative">
                      <Skeleton className="w-8 h-8" variant="circle" />
                      <div className={`absolute inset-1 rounded-full ${
                        i % 5 === 0 ? 'bg-blue-400' :
                        i % 5 === 1 ? 'bg-green-400' :
                        i % 5 === 2 ? 'bg-purple-400' :
                        i % 5 === 3 ? 'bg-red-400' : 'bg-yellow-400'
                      } opacity-40`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Brand metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900">
              <Skeleton className="h-6 w-24 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900">
              <Skeleton className="h-6 w-28 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900">
              <Skeleton className="h-6 w-20 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </section>
    )
  }
)
BrandSkeleton.displayName = "BrandSkeleton"

export const LayoutSkeleton = forwardRef<HTMLElement, { className?: string }>(
  ({ className }, ref) => {
    return (
      <section id="layout" ref={ref} className={cn("mb-8", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="space-y-6">
          {/* Layout overview */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="relative">
                    <Skeleton className="aspect-video w-full mb-2" variant="rounded" />
                    {/* Simulate layout preview */}
                    <div className="absolute inset-2 space-y-1">
                      <Skeleton className="h-2 w-3/4" />
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        <Skeleton className="h-8" variant="rounded" />
                        <Skeleton className="h-8" variant="rounded" />
                      </div>
                      <Skeleton className="h-1 w-full" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Pattern analysis */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-neutral-100 dark:border-neutral-800 rounded">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" variant="rounded" />
                    <Skeleton className="w-2 h-2" variant="circle" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
)
LayoutSkeleton.displayName = "LayoutSkeleton"