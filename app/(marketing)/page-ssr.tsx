import { Suspense } from 'react'
import { HeroSection } from '@/components/organisms/hero-section'
import { StatsSection } from '@/components/organisms/stats-section'
import { SearchSection } from '@/components/organisms/search-section'
import { MinimalHeaderWrapper } from '@/components/organisms/minimal-header-wrapper'

/**
 * Homepage - Server Component with Streaming
 *
 * Architecture:
 * - Server Component (RSC) for initial shell
 * - Client components for interactive features (search, scan)
 * - Streaming with Suspense for progressive loading
 * - Stats fetched server-side and streamed
 */
export default async function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header loads immediately (static) */}
      <MinimalHeaderWrapper />

      {/* Main content with streaming sections */}
      <main id="main-content" className="flex-1">
        {/* Hero section - static, loads instantly */}
        <HeroSection />

        {/* Stats section - streams from server */}
        <Suspense fallback={<StatsPlaceholder />}>
          <StatsSection />
        </Suspense>

        {/* Search/Scan section - client interactive */}
        <Suspense fallback={<SearchPlaceholder />}>
          <SearchSection />
        </Suspense>
      </main>
    </div>
  )
}

// Loading placeholders (shown while streaming)
function StatsPlaceholder() {
  return (
    <div className="border-b border-gray-200 bg-gray-50/50 py-12 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchPlaceholder() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-full mb-6"></div>
        <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded"></div>
      </div>
    </div>
  )
}