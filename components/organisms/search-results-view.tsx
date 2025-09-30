"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, Copy, Sparkles, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

type SearchResult = {
  id: string
  type: "token"
  name: string
  value: string | number | string[]
  category: string
  site?: string | null
  confidence?: number
  usage?: number
  source?: string
}

interface SearchResultsViewProps {
  results: SearchResult[]
  loading: boolean
  onScanSite?: (site: string) => void
  onLoadMore?: () => void
}

export function SearchResultsView({ results, loading, onScanSite, onLoadMore }: SearchResultsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'color':
      case 'colors':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20'
      case 'typography':
      case 'font':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20'
      case 'spacing':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20'
      case 'radius':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20'
      case 'shadow':
      case 'shadows':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20'
      default:
        return 'text-grep-9 bg-grep-1'
    }
  }

  const formatValue = (value: string | number | string[]) => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return String(value)
  }

  const getVisualPreview = (result: SearchResult) => {
    const category = result.category.toLowerCase()
    const value = String(result.value)

    if (category === 'color' || category === 'colors') {
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded border border-grep-3 shadow-sm"
            style={{ backgroundColor: value }}
          />
        </div>
      )
    }

    if (category === 'spacing') {
      const numValue = parseInt(value) || 0
      return (
        <div className="flex items-center gap-2">
          <div
            className="h-6 bg-foreground rounded"
            style={{ width: `${Math.min(numValue / 2, 60)}px` }}
          />
        </div>
      )
    }

    if (category === 'radius') {
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 bg-foreground"
            style={{ borderRadius: value }}
          />
        </div>
      )
    }

    return null
  }

  return (
    <>
      {/* Results Header */}
      <div className="flex min-h-[48px] w-full flex-row items-center justify-between border-b border-grep-2 px-4 text-[13px]/[13px] bg-background sticky top-0 z-10">
        <div className="flex flex-row items-center gap-3">
          <span className="font-semibold text-foreground font-mono">{results.length.toLocaleString()}</span>
          <span className="text-grep-9 font-mono">design tokens</span>
          {results.length > 0 && (
            <>
              <span className="text-grep-7">·</span>
              <span className="text-grep-9 font-mono text-xs">
                {new Set(results.map(r => r.site)).size} sites
              </span>
            </>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-3 select-none gap-1 text-xs font-mono">
            <span>Compact</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex max-h-full w-full flex-1 flex-col space-y-3 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="w-full space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex w-full flex-col overflow-hidden rounded-md border border-grep-2 animate-pulse">
                <div className="h-12 bg-grep-1 border-b border-grep-2"></div>
                <div className="h-28 bg-grep-0"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.map((result) => (
          <div
            key={result.id}
            className="group flex w-full flex-col overflow-hidden rounded-md border border-grep-2 bg-grep-0 hover:border-foreground transition-all"
          >
            {/* Result Header */}
            <div className="flex min-h-11 w-full items-center justify-between border-b border-grep-2 bg-background px-4 py-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {result.site && (
                    <>
                      <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-blue-500 to-purple-500 shrink-0" />
                      <a
                        href={`https://${result.site}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:underline truncate font-mono"
                      >
                        {result.site}
                      </a>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-grep-7 hidden sm:inline">/</span>
                  <Badge variant="secondary" className={cn("text-xs font-mono h-5", getCategoryColor(result.category))}>
                    {result.category}
                  </Badge>
                  {result.confidence && result.confidence >= 80 && (
                    <Badge variant="outline" className="text-xs font-mono h-5 border-green-300 dark:border-green-900 text-green-700 dark:text-green-400">
                      {result.confidence}% confident
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {result.site && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onScanSite?.(result.site!)}
                    className="h-7 px-2 text-xs gap-1 font-mono text-grep-9 hover:text-white hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <Sparkles className="h-3 w-3" />
                    Scan
                  </Button>
                )}
              </div>
            </div>

            {/* Result Content */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Token Name */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground font-mono">{result.name}</span>
                    {result.usage && (
                      <span className="text-xs text-grep-9 font-mono">
                        {result.usage} {result.usage === 1 ? 'use' : 'uses'}
                      </span>
                    )}
                  </div>

                  {/* Token Value */}
                  <div className="flex items-center gap-3">
                    {getVisualPreview(result)}
                    <code className="flex-1 text-sm font-mono bg-grep-1 px-3 py-2 rounded border border-grep-2 truncate">
                      {formatValue(result.value)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(formatValue(result.value), result.id)}
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      {copiedId === result.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-grep-7" />
                      )}
                    </Button>
                  </div>

                  {/* Source Info */}
                  {result.source && (
                    <div className="flex items-center gap-2 text-xs text-grep-9 font-mono">
                      <span className="text-grep-7">→</span>
                      <span className="truncate">{result.source}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && results.length > 0 && onLoadMore && (
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="w-full h-10 font-mono text-sm shadow-none border-grep-3 hover:border-foreground"
          >
            Load More Results
          </Button>
        )}

        {!loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-grep-2 flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 font-mono">No tokens found</h3>
            <p className="text-sm text-grep-9 max-w-md font-mono">
              Try scanning a website instead to extract design tokens
            </p>
          </div>
        )}

        <div className="min-h-3"></div>
      </div>
    </>
  )
}