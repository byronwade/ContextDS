/**
 * Minimal Grep-Style Header with Smart Mode Switching
 *
 * Design Philosophy:
 * - Grep.app minimal aesthetic (no colors, no badges, clean)
 * - Mode is clear from: icon prefix, placeholder text, and contextual controls
 * - Single click to switch modes (dropdown-style button)
 * - Input transforms based on context
 */

import { Search, Sparkles, ChevronDown, Loader2, Palette } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SmartLink } from "@/components/atoms/smart-link"

type ViewMode = "search" | "scan"

interface MinimalHeaderProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  query: string
  setQuery: (query: string) => void
  caseInsensitive: boolean
  setCaseInsensitive: (value: boolean) => void
  wholeWords: boolean
  setWholeWords: (value: boolean) => void
  useRegex: boolean
  setUseRegex: (value: boolean) => void
  scanLoading: boolean
  onScan: () => void
  onClearResults: () => void
  stats?: { tokens: number; sites: number } | null
}

export function MinimalHeader({
  viewMode,
  setViewMode,
  query,
  setQuery,
  caseInsensitive,
  setCaseInsensitive,
  wholeWords,
  setWholeWords,
  useRegex,
  setUseRegex,
  scanLoading,
  onScan,
  onClearResults,
  stats
}: MinimalHeaderProps) {
  return (
    <div className="flex min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between border-b border-grep-2 md:flex-nowrap">

      {/* Left: Brand */}
      <div className="flex pl-4 md:pl-6">
        <div className="flex items-center space-x-2 pr-3">
          <SmartLink className="outline-offset-4" href="/">
            <svg aria-label="ContextDS" className="fill-black dark:fill-white" viewBox="0 0 75 65" height="22">
              <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
            </svg>
          </SmartLink>
          <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24" className="stroke-grep-4" style={{width: '22px', height: '22px'}}>
            <path d="M16.88 3.549L7.12 20.451"></path>
          </svg>
          <SmartLink className="outline-offset-4" href="/">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-black dark:text-white">ContextDS</span>
            </div>
          </SmartLink>
        </div>
      </div>

      {/* Center: Contextual Input (grep-style) */}
      <div className="order-1 flex w-full items-center justify-center border-t border-grep-2 px-4 py-3 md:order-none md:border-none md:px-3 md:py-0">
        <div className="relative z-10 w-full flex-grow max-w-2xl">

          {/* Mode Selector Dropdown (like grep.app's repo selector) */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
            <button
              onClick={() => {
                setViewMode(viewMode === "search" ? "scan" : "search")
                onClearResults()
              }}
              className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:text-grep-9 transition-colors"
              title={`Mode: ${viewMode === "search" ? "Search" : "Scan"} (click to switch)`}
            >
              {viewMode === "search" ? (
                <Search className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="capitalize">{viewMode}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="w-px h-4 bg-grep-3" />
          </div>

          {/* Input - placeholder makes mode crystal clear */}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && viewMode === "scan") {
                onScan()
              }
            }}
            placeholder={
              viewMode === "scan"
                ? "Paste URL (stripe.com, github.com, linear.app...)"
                : `Search ${stats?.tokens.toLocaleString() || '17,000'}+ design tokens`
            }
            id="search-input"
            className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 px-3 py-1 text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-[42px] md:h-9 max-md:max-w-none"
            style={{paddingLeft: '105px', paddingRight: viewMode === "search" ? '96px' : '72px'}}
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />

          {/* Right Controls - Contextual based on mode */}
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {viewMode === "search" ? (
              <>
                {/* Grep-style toggle buttons */}
                <button
                  type="button"
                  onClick={() => setCaseInsensitive(!caseInsensitive)}
                  className={cn(
                    "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors h-6 px-1 min-w-6",
                    caseInsensitive && "bg-grep-11 border-grep-6 text-foreground"
                  )}
                  aria-pressed={caseInsensitive}
                  title="Match case"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                    <path d="M11.6667 11C12.7713 11 13.6667 10.1046 13.6667 9C13.6667 7.89543 12.7713 7 11.6667 7C10.5621 7 9.66669 7.89543 9.66669 9C9.66669 10.1046 10.5621 11 11.6667 11Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M13.6667 7V11" stroke="currentColor" strokeWidth="1.5"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.26242 10.0789L2.63419 11.8414L2.57767 12H0.985229L1.22126 11.3378L4.22128 2.92102L5.63421 2.92102L8.63419 11.3378L8.87023 12H7.27779L7.22126 11.8414L6.59305 10.0789H6.5777H3.2777H3.26242ZM3.79707 8.57885H6.0584L4.92774 5.40668L3.79707 8.57885Z" fill="currentColor"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setWholeWords(!wholeWords)}
                  className={cn(
                    "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors h-6 px-1 min-w-6",
                    wholeWords && "bg-grep-11 border-grep-6 text-foreground"
                  )}
                  aria-pressed={wholeWords}
                  title="Match whole words"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
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
                    "border border-transparent inline-flex items-center justify-center gap-2 rounded-md text-sm text-grep-9 font-medium transition-colors h-6 px-1 min-w-6",
                    useRegex && "bg-grep-11 border-grep-6 text-foreground"
                  )}
                  aria-pressed={useRegex}
                  title="Use regular expression"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                    <path d="M10.8867 2V8.66667" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 3.66675L13.7733 7.00008" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 7.00008L13.7733 3.66675" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="2" y="9" width="4" height="4" fill="currentColor"/>
                  </svg>
                </button>
              </>
            ) : (
              <Button
                onClick={onScan}
                disabled={!query.trim() || scanLoading}
                size="sm"
                className="h-7 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-none border-0"
              >
                {scanLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Scan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Minimal */}
      <div className="flex min-h-[64px] select-none items-center justify-end gap-3 pr-4 md:pr-6">
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-8 px-3 text-xs">
          Docs
        </Button>
      </div>
    </div>
  )
}