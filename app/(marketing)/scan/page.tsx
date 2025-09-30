"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useScanStore, type ScanResult } from "@/stores/scan-store"

// Force dynamic rendering for scan page (uses searchParams)
export const dynamic = 'force-dynamic'
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { ThemeToggle } from "@/components/atoms/theme-toggle"
import { RecentScansDropdown } from "@/components/molecules/recent-scans-dropdown"
import { RealtimeStat } from "@/components/atoms/realtime-stat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Palette, Search, Sparkles, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours - hard expiry
const REVALIDATE_AFTER = 15 * 60 * 1000 // 15 minutes - soft revalidation

interface CachedScan {
  result: ScanResult
  timestamp: number
  scanId: string
}

function getCacheAge(timestamp: number): string {
  const age = Date.now() - timestamp
  const minutes = Math.floor(age / 60000)
  const hours = Math.floor(age / 3600000)
  const days = Math.floor(age / 86400000)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function shouldRevalidate(timestamp: number): boolean {
  return Date.now() - timestamp > REVALIDATE_AFTER
}

// Inner component that uses useSearchParams
function ScanPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const domain = searchParams.get("domain")
  const forceScan = searchParams.get("force") === "true"

  const {
    isScanning,
    result: scanResult,
    scanId,
    progress,
    startScan,
    resetScan,
    setResult
  } = useScanStore()

  const [mounted, setMounted] = useState(false)
  const [cachedResult, setCachedResult] = useState<ScanResult | null>(null)
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<"search" | "scan">("scan")

  // Real-time stats
  const realtimeStats = useRealtimeStats(5000)

  // Smart cache with revalidation
  useEffect(() => {
    if (hasInitialized) return

    setMounted(true)

    if (!domain) {
      router.push("/")
      return
    }

    // Check cache
    try {
      const cacheKey = `scan_${domain}`
      const cached = localStorage.getItem(cacheKey)

      if (cached && !forceScan) {
        const data: CachedScan = JSON.parse(cached)
        const isHardExpired = Date.now() - data.timestamp > CACHE_DURATION
        const needsRevalidation = shouldRevalidate(data.timestamp)

        if (isHardExpired) {
          console.log("🗑️ Cache expired (>24h) for", domain)
          localStorage.removeItem(cacheKey)
        } else {
          console.log("📦 Using cached scan results for", domain, `(${getCacheAge(data.timestamp)})`)
          setCachedResult(data.result)
          setCacheTimestamp(data.timestamp)
          setResult(data.result)
          setHasInitialized(true)

          // Stale-while-revalidate: if >15min old, refresh in background
          if (needsRevalidation) {
            console.log("🔄 Cache is stale (>15m), revalidating in background...")
            setIsRevalidating(true)
            startScan(domain).finally(() => {
              setIsRevalidating(false)
            })
          }
          return
        }
      }
    } catch (error) {
      console.error("Failed to load cached results:", error)
    }

    // No cache or force scan - start new scan
    if (!isScanning && !scanResult) {
      console.log("🚀 Starting new scan for", domain)
      startScan(domain)
      setHasInitialized(true)
    }
  }, [domain, forceScan, router, isScanning, scanResult, startScan, setResult, hasInitialized])

  // Save scan results to localStorage
  useEffect(() => {
    if (scanResult && scanResult.domain && scanId) {
      try {
        const cacheKey = `scan_${scanResult.domain}`
        const cacheData: CachedScan = {
          result: scanResult,
          timestamp: Date.now(),
          scanId
        }
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        console.log("💾 Saved scan results to cache for", scanResult.domain)
      } catch (error) {
        console.error("Failed to cache scan results:", error)
      }
    }
  }, [scanResult, scanId])

  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value)
  }, [])

  const handleExport = useCallback((format: string) => {
    if (!scanResult?.curatedTokens) return

    let content = ""
    let filename = `${scanResult.domain}-tokens`
    let mimeType = "text/plain"

    switch (format) {
      case "json":
        content = JSON.stringify(scanResult.curatedTokens, null, 2)
        filename += ".json"
        mimeType = "application/json"
        break
      case "css":
        content = generateCSS(scanResult.curatedTokens)
        filename += ".css"
        mimeType = "text/css"
        break
      case "scss":
        content = generateSCSS(scanResult.curatedTokens)
        filename += ".scss"
        mimeType = "text/scss"
        break
      case "js":
        content = generateJS(scanResult.curatedTokens)
        filename += ".js"
        mimeType = "text/javascript"
        break
      case "ts":
        content = generateTS(scanResult.curatedTokens)
        filename += ".ts"
        mimeType = "text/typescript"
        break
      default:
        content = JSON.stringify(scanResult.curatedTokens, null, 2)
        filename += ".json"
        mimeType = "application/json"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }, [scanResult])

  const handleShare = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
  }, [])

  const handleNewScan = useCallback(() => {
    resetScan()
    router.push("/")
  }, [router, resetScan])

  const handleScanHistory = useCallback(() => {
    router.push("/#recent-scans")
  }, [router])

  const handleSearch = useCallback(() => {
    const query = searchQuery.trim()
    if (!query) return

    if (searchMode === "scan") {
      // Navigate to home and trigger scan
      router.push(`/?scan=${encodeURIComponent(query)}`)
    } else {
      // Navigate to home with search query
      router.push(`/?q=${encodeURIComponent(query)}`)
    }
  }, [searchQuery, searchMode, router])

  const handleForceRefresh = useCallback(() => {
    if (!domain) return
    console.log("🔄 Force refreshing scan for", domain)
    setCachedResult(null)
    setCacheTimestamp(null)
    setIsRevalidating(false)
    resetScan()
    startScan(domain)
  }, [domain, resetScan, startScan])

  // Redirect to home if no domain - in useEffect to avoid render issues
  useEffect(() => {
    if (!domain && typeof window !== 'undefined') {
      router.push("/")
    }
  }, [domain, router])

  // Don't render if no domain
  if (!domain) {
    return null
  }

  const displayResult = scanResult || cachedResult
  const isLoading = (isScanning || !mounted) && !cachedResult

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden antialiased">
      {/* Subtle top loading indicator + Progress info */}
      {isLoading && (
        <>
          <div className="absolute top-0 left-0 right-0 z-50 h-[2px] bg-grep-2">
            <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{
              width: progress ? `${(progress.step / progress.totalSteps) * 100}%` : '30%'
            }} />
          </div>
          {progress && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-grep-2 rounded-lg shadow-lg px-4 py-3 min-w-[320px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{progress.phase}</div>
                  <div className="text-xs text-grep-9 mt-0.5">{progress.message}</div>
                </div>
                <div className="text-xs font-mono text-grep-9 tabular-nums">
                  {progress.step}/{progress.totalSteps}
                </div>
              </div>
              {progress.details && progress.details.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-grep-2 pt-2">
                  {progress.details.slice(-3).map((detail, i) => (
                    <div key={i} className="text-xs text-grep-9 font-mono flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-grep-7" />
                      {detail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Header - matching home page */}
      <header className="flex min-h-[64px] w-full shrink-0 flex-wrap items-center justify-between border-b border-grep-2 md:flex-nowrap">
        {/* Left: Brand + Live Stats */}
        <div className="flex items-center pl-4 md:pl-6 gap-4">
          <div className="flex items-center gap-2 pr-3">
            <Link className="outline-offset-4 flex items-center gap-2" href="/">
              <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-black dark:text-white">ContextDS</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">Beta</span>
            </Link>
          </div>

          {/* Real-time Stats - Minimal Display */}
          <div className="hidden lg:flex items-center gap-3 border-l border-grep-2 pl-4">
            <RealtimeStat
              value={realtimeStats.tokens}
              label="tokens"
              loading={realtimeStats.loading}
            />
            <div className="w-px h-3 bg-grep-3" />
            <RealtimeStat
              value={realtimeStats.sites}
              label="sites"
              loading={realtimeStats.loading}
            />
          </div>
        </div>

        {/* Center: Search/Scan Input */}
        <div className="order-1 flex w-full items-center justify-center border-t border-grep-2 px-4 py-3 md:order-none md:border-none md:px-3 md:py-0">
          <div className="relative z-10 w-full flex-grow max-w-2xl">
            {/* Mode Dropdown Selector */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
              <button
                onClick={() => setSearchMode(searchMode === "search" ? "scan" : "search")}
                className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:text-grep-9 transition-colors"
                title={`Mode: ${searchMode} (click to switch)`}
              >
                {searchMode === "search" ? (
                  <Search className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span className="capitalize">{searchMode}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="w-px h-4 bg-grep-3" />
            </div>

            {/* Input */}
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleSearch()
                }
              }}
              placeholder={
                searchMode === "scan"
                  ? "Scan another site..."
                  : `Search ${realtimeStats.tokens > 0 ? realtimeStats.tokens.toLocaleString() + '+' : '17,000+'} tokens`
              }
              className="flex w-full min-w-0 shrink rounded-md border border-grep-4 bg-grep-0 px-3 py-1 text-sm transition-colors focus-visible:border-grep-12 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grep-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-grep-7 h-[42px] md:h-9 max-md:max-w-none"
              style={{paddingLeft: '105px', paddingRight: '72px'}}
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />

            {/* Right Controls */}
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {searchMode === "scan" && (
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  size="sm"
                  className="h-7 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-none border-0"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Scan
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex min-h-[64px] select-none items-center justify-end gap-2 pr-4 md:pr-6">
          {/* Cache age indicator */}
          {cacheTimestamp && !isRevalidating && (
            <div className="flex items-center gap-2 px-2 py-1 rounded border border-grep-2 bg-grep-0">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-grep-9 font-mono">{getCacheAge(cacheTimestamp)}</span>
            </div>
          )}

          {/* Revalidating indicator */}
          {isRevalidating && (
            <div className="flex items-center gap-2 px-2 py-1 rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Updating...</span>
            </div>
          )}

          {/* Force refresh button */}
          {displayResult && !isLoading && (
            <Button
              onClick={handleForceRefresh}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground"
              title="Force refresh scan"
            >
              <Loader2 className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          )}

          <RecentScansDropdown />
          <Link href="/community">
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground">
              Community
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground">
            Docs
          </Button>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex h-8 px-3 text-xs font-medium text-grep-9 hover:text-foreground">
            API
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Scan Results - Show immediately with loading states */}
      <ScanResultsLayout
        result={displayResult}
        isLoading={isLoading}
        scanId={scanId}
        progress={progress}
        onCopy={handleCopy}
        onExport={handleExport}
        onShare={handleShare}
        showDiff={showDiff}
        onToggleDiff={() => setShowDiff(!showDiff)}
        onNewScan={handleNewScan}
        onScanHistory={handleScanHistory}
      />
    </div>
  )
}

// Wrap in Suspense to handle useSearchParams() properly
export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  )
}

// Export generators
function generateCSS(tokens: any): string {
  let css = ':root {\n'

  if (tokens.colors) {
    tokens.colors.forEach((token: any) => {
      const name = token.name || token.key
      css += `  --color-${name}: ${token.value};\n`
    })
  }

  if (tokens.typography?.families) {
    tokens.typography.families.forEach((token: any, i: number) => {
      css += `  --font-family-${i + 1}: ${token.value};\n`
    })
  }

  if (tokens.spacing) {
    tokens.spacing.forEach((token: any) => {
      const name = token.name || token.key
      css += `  --spacing-${name}: ${token.value};\n`
    })
  }

  css += '}\n'
  return css
}

function generateSCSS(tokens: any): string {
  let scss = '// Design Tokens\n\n'

  if (tokens.colors) {
    scss += '// Colors\n'
    tokens.colors.forEach((token: any) => {
      const name = token.name || token.key
      scss += `$color-${name}: ${token.value};\n`
    })
    scss += '\n'
  }

  if (tokens.typography?.families) {
    scss += '// Typography\n'
    tokens.typography.families.forEach((token: any, i: number) => {
      scss += `$font-family-${i + 1}: ${token.value};\n`
    })
    scss += '\n'
  }

  if (tokens.spacing) {
    scss += '// Spacing\n'
    tokens.spacing.forEach((token: any) => {
      const name = token.name || token.key
      scss += `$spacing-${name}: ${token.value};\n`
    })
    scss += '\n'
  }

  return scss
}

function generateJS(tokens: any): string {
  return `// Design Tokens\n\nexport const tokens = ${JSON.stringify(tokens, null, 2)}\n`
}

function generateTS(tokens: any): string {
  let ts = '// Design Tokens\n\n'
  ts += 'export const tokens = {\n'

  if (tokens.colors && tokens.colors.length > 0) {
    ts += '  colors: {\n'
    tokens.colors.forEach((token: any, i: number) => {
      ts += `    color${i + 1}: '${token.value}',\n`
    })
    ts += '  },\n\n'
  }

  if (tokens.typography?.families && tokens.typography.families.length > 0) {
    ts += '  fonts: {\n'
    tokens.typography.families.forEach((token: any, i: number) => {
      ts += `    font${i + 1}: '${token.value}',\n`
    })
    ts += '  },\n\n'
  }

  if (tokens.spacing && tokens.spacing.length > 0) {
    ts += '  spacing: {\n'
    tokens.spacing.forEach((token: any, i: number) => {
      ts += `    space${i + 1}: '${token.value}',\n`
    })
    ts += '  },\n\n'
  }

  ts += '} as const\n\n'
  ts += 'export type Tokens = typeof tokens\n'
  return ts
}