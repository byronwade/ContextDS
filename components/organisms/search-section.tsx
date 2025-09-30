'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSearchStore } from '@/stores/search-store'
import { useScanStore } from '@/stores/scan-store'
import { ComprehensiveAnalysisDisplay } from '@/components/organisms/comprehensive-analysis-display'

type ViewMode = 'search' | 'scan'

/**
 * SearchSection - Client Component
 *
 * Interactive search and scan functionality.
 * Separated from server components for optimal performance.
 */
export function SearchSection() {
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [query, setQuery] = useState('')

  // Zustand stores
  const { results, loading: searchLoading, search, clearSearch } = useSearchStore()
  const { scanResult, scanLoading, startScan, clearScan } = useScanStore()

  // Auto-search with debounce
  useEffect(() => {
    if (viewMode !== 'search') return

    if (!query.trim()) {
      clearSearch()
      return
    }

    const timeoutId = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, viewMode, search, clearSearch])

  const handleScan = useCallback(async () => {
    if (!query.trim()) return
    clearSearch()
    await startScan(query)
  }, [query, startScan, clearSearch])

  const handleModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    clearSearch()
    clearScan()
  }, [clearSearch, clearScan])

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Mode Switcher */}
      <div className="mb-6 flex justify-center gap-2">
        <Button
          variant={viewMode === 'search' ? 'default' : 'outline'}
          onClick={() => handleModeChange('search')}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Search Tokens
        </Button>
        <Button
          variant={viewMode === 'scan' ? 'default' : 'outline'}
          onClick={() => handleModeChange('scan')}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Scan Site
        </Button>
      </div>

      {/* Search/Scan Input */}
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            id="search-input"
            type="text"
            placeholder={
              viewMode === 'search'
                ? 'Search design tokens... (e.g., "primary blue", "spacing-4")'
                : 'Enter URL to scan... (e.g., "stripe.com")'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && viewMode === 'scan') {
                handleScan()
              }
            }}
            className="h-14 pl-12 pr-32 text-lg"
            disabled={searchLoading || scanLoading}
          />
          {viewMode === 'scan' && (
            <Button
              onClick={handleScan}
              disabled={!query.trim() || scanLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {scanLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Scan
                </>
              )}
            </Button>
          )}
        </div>

        {/* Quick Examples */}
        {!query && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Try:</span>
            {viewMode === 'search' ? (
              <>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setQuery('primary blue')}
                >
                  primary blue
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setQuery('spacing')}
                >
                  spacing
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setQuery('font-size')}
                >
                  font-size
                </Badge>
              </>
            ) : (
              <>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setQuery('stripe.com')}
                >
                  stripe.com
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setQuery('github.com')}
                >
                  github.com
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setQuery('vercel.com')}
                >
                  vercel.com
                </Badge>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results Area */}
      <div className="mx-auto mt-8 max-w-6xl">
        {/* Search Results */}
        {viewMode === 'search' && results.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Found {results.length} token{results.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result: any) => (
                <div
                  key={result.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-mono text-sm font-medium">{result.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {result.category}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {result.value}
                  </div>
                  {result.site && (
                    <div className="mt-2 text-xs text-gray-500">
                      from {result.site}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan Results */}
        {viewMode === 'scan' && scanResult && (
          <ComprehensiveAnalysisDisplay result={scanResult} />
        )}

        {/* Loading States */}
        {searchLoading && viewMode === 'search' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty States */}
        {!searchLoading && !scanLoading && results.length === 0 && !scanResult && query && (
          <div className="py-12 text-center text-gray-500">
            <p>No results found for "{query}"</p>
            <p className="mt-2 text-sm">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )
}