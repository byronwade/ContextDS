"use client"

import Link from "next/link"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Sparkles, Palette, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { RecentScansDropdown } from "@/components/molecules/recent-scans-dropdown"
import { AnimatedCounter } from "@/components/atoms/animated-counter"
import { useRealtimeStore } from "@/stores/realtime-store"
import { useStatsStore } from "@/stores/stats-store"
import { cn } from "@/lib/utils"

interface MarketingHeaderProps {
  currentPage?: "home" | "features" | "pricing" | "docs" | "about" | "community" | "metrics" | "scan" | "site" | "contact"
  showSearch?: boolean
}

export function MarketingHeader({ currentPage = "home", showSearch = false }: MarketingHeaderProps) {
  const router = useRouter()
  const { metrics, isConnected } = useRealtimeStore()
  const { stats, loadStats } = useStatsStore()

  // Load stats on mount if not already loaded
  React.useEffect(() => {
    if (!stats) {
      loadStats()
    }
  }, [stats, loadStats])

  // Search functionality state
  const [viewMode, setViewMode] = useState<"search" | "scan">("search")
  const [query, setQuery] = useState("")
  const [scanLoading, setScanLoading] = useState(false)
  const [caseInsensitive, setCaseInsensitive] = useState(false)
  const [wholeWords, setWholeWords] = useState(false)
  const [useRegex, setUseRegex] = useState(false)

  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const handleScan = async () => {
    const target = query.trim()
    if (!target) return

    setScanLoading(true)
    try {
      // Navigate to home with scan parameters
      router.push(`/?scan=${encodeURIComponent(target)}`)
    } catch (error) {
      console.error('Scan error:', error)
    } finally {
      setScanLoading(false)
    }
  }

  const handleSearch = () => {
    if (!query.trim()) return
    router.push(`/?q=${encodeURIComponent(query)}`)
  }

  const onClearResults = () => {
    setQuery("")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-grep-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-h-[56px] sm:min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between md:flex-nowrap">

        {/* Left: Brand + Live Stats */}
        <div className="flex items-center pl-3 sm:pl-4 md:pl-6 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 pr-2 sm:pr-3">
            <Link className="outline-offset-4 flex items-center gap-1.5 sm:gap-2" href="/">
              <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-base sm:text-lg font-semibold text-black dark:text-white">ContextDS</span>
              <span className="hidden xs:inline text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">Beta</span>
            </Link>
          </div>

          {/* Live Stats - grep.app style */}
          <div className="hidden lg:flex items-center space-x-6 text-sm text-grep-9 font-mono border-l border-grep-2 pl-4">
            <div className="flex items-center space-x-1">
              <AnimatedCounter
                value={(metrics?.totalTokens && metrics.totalTokens > 0) ? metrics.totalTokens : (stats?.tokens || 0)}
                formatCompact={true}
                className="text-foreground font-medium"
              />
              <span>tokens</span>
            </div>
            <div className="flex items-center space-x-1">
              <AnimatedCounter
                value={(metrics?.totalSites && metrics.totalSites > 0) ? metrics.totalSites : (stats?.sites || 0)}
                formatCompact={true}
                className="text-foreground font-medium"
              />
              <span>sites</span>
            </div>
          </div>
        </div>

        {/* Center: Search Input (if showSearch is true) */}
        {showSearch && (
          <div className="order-1 flex w-full items-center justify-center border-t border-grep-2 px-3 sm:px-4 py-2.5 sm:py-3 md:order-none md:border-none md:px-3 md:py-0">
            <div className="relative z-10 w-full flex-grow max-w-2xl">

              {/* Mode Dropdown Selector */}
              <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
                <button
                  onClick={() => {
                    setViewMode(viewMode === "search" ? "scan" : "search")
                    onClearResults()
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-[13px] font-medium text-foreground hover:text-grep-9 transition-colors"
                  title={`Mode: ${viewMode} (click to switch)`}
                >
                  {viewMode === "search" ? (
                    <Search className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span className="capitalize hidden xs:inline">{viewMode}</span>
                  <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </button>
                <div className="w-px h-3 sm:h-4 bg-grep-3" />
              </div>

              {/* Input */}
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    if (viewMode === "scan") {
                      handleScan()
                    } else {
                      handleSearch()
                    }
                  }
                }}
                placeholder={
                  viewMode === "scan"
                    ? "Paste URL..."
                    : `Search ${((metrics?.totalTokens && metrics.totalTokens > 0) ? metrics.totalTokens : (stats?.tokens || 17000)).toLocaleString()}+ tokens`
                }
                id="search-input"
                className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 py-1 text-xs sm:text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-9 sm:h-[42px] md:h-9 max-md:max-w-none pl-[55px] xs:pl-[85px] sm:pl-[105px] pr-[90px] xs:pr-[96px] sm:pr-[104px]"
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
              />

              {/* Right Controls */}
              <div className="absolute right-1.5 sm:right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 sm:gap-1">
                {viewMode === "search" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCaseInsensitive(!caseInsensitive)}
                      className={cn(
                        "border border-transparent inline-flex items-center justify-center rounded-md text-sm text-grep-9 font-medium transition-colors h-6 sm:h-6 px-1 min-w-6",
                        caseInsensitive && "bg-grep-11 border-grep-6 text-foreground"
                      )}
                      aria-pressed={caseInsensitive}
                      title="Match case"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                        <path d="M11.6667 11C12.7713 11 13.6667 10.1046 13.6667 9C13.6667 7.89543 12.7713 7 11.6667 7C10.5621 7 9.66669 7.89543 9.66669 9C9.66669 10.1046 10.5621 11 11.6667 11Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M13.6667 7V11" stroke="currentColor" strokeWidth="1.5"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.26242 10.0789L2.63419 11.8414L2.57767 12H0.985229L1.22126 11.3378L4.22128 2.92102L5.63421 2.92102L8.63419 11.3378L8.87023 12H7.27779L7.22126 11.8414L6.59305 10.0789H6.5777H3.2777H3.26242ZM3.79707 8.57885H6.0584L4.92774 5.40668L3.79707 8.57885Z" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWholeWords(!wholeWords)}
                      className={cn(
                        "border border-transparent inline-flex items-center justify-center rounded-md text-sm text-grep-9 font-medium transition-colors h-6 sm:h-6 px-1 min-w-6",
                        wholeWords && "bg-grep-11 border-grep-6 text-foreground"
                      )}
                      aria-pressed={wholeWords}
                      title="Match whole words"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                        <path d="M4.66669 10C5.77126 10 6.66669 9.10457 6.66669 8C6.66669 6.89543 5.77126 6 4.66669 6C3.56212 6 2.66669 6.89543 2.66669 8C2.66669 9.10457 3.56212 10 4.66669 10Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6.66669 6V10" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M11.3333 10C12.4379 10 13.3333 9.10457 13.3333 8C13.3333 6.89543 12.4379 6 11.3333 6C10.2287 6 9.33331 6.89543 9.33331 8C9.33331 9.10457 10.2287 10 11.3333 10Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M9.33331 4.66675V10.0001" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M1 11V13H15V11" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseRegex(!useRegex)}
                      className={cn(
                        "border border-transparent inline-flex items-center justify-center rounded-md text-sm text-grep-9 font-medium transition-colors h-6 sm:h-6 px-1 min-w-6",
                        useRegex && "bg-grep-11 border-grep-6 text-foreground"
                      )}
                      aria-pressed={useRegex}
                      title="Use regular expression"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                        <path d="M10.8867 2V8.66667" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 3.66675L13.7733 7.00008" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 7.00008L13.7733 3.66675" stroke="currentColor" strokeWidth="1.5"/>
                        <rect x="2" y="9" width="4" height="4" fill="currentColor"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <Button
                    onClick={handleScan}
                    disabled={!query.trim() || scanLoading}
                    size="sm"
                    className="h-7 px-2 xs:px-2.5 sm:px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] xs:text-xs font-medium rounded hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-none border-0"
                  >
                    {scanLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 xs:mr-1" />
                        <span className="hidden xs:inline">Scan</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right: Navigation + Theme Toggle */}
        <div className="flex min-h-[56px] sm:min-h-[64px] select-none items-center justify-end gap-1.5 sm:gap-2 pr-2 sm:pr-4 md:pr-6">
          <RecentScansDropdown />
          <Link href="/community" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium text-grep-9 hover:text-foreground">
              Community
            </Button>
          </Link>
          <Link href="/docs" className="hidden lg:inline-flex">
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium text-grep-9 hover:text-foreground">
              Docs
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
