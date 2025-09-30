"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  Copy,
  Download,
  Share2,
  History,
  Palette,
  Type,
  Box,
  Grid3x3,
  Zap,
  Code2,
  BarChart3,
  Eye,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ComprehensiveAnalysisDisplay } from "./comprehensive-analysis-display"
import { TokenResultsDisplay } from "./token-results-display"
import { TokenDiffViewer } from "./token-diff-viewer"
import { ScreenshotGallery } from "@/components/molecules/screenshot-gallery"
import { TypographySection } from "./typography-section"
import { LayoutPatternsSection } from "./layout-patterns-section"
import { BrandAnalysisSection } from "./brand-analysis-section"

type ScanResult = any // Import from scan-store if needed

interface ScanProgress {
  step: number
  totalSteps: number
  phase: string
  message: string
  data?: string
  time?: string
  details?: string[]
  timestamp: number
}

interface ScanResultsLayoutProps {
  result: ScanResult
  isLoading: boolean
  scanId?: string | null
  progress?: ScanProgress | null
  onCopy: (value: string) => void
  onExport: (format: string) => void
  onShare: () => void
  showDiff?: boolean
  onToggleDiff?: () => void
  onNewScan?: () => void
  onScanHistory?: () => void
}

const sections = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'analysis', label: 'AI Analysis', icon: Zap },
  { id: 'tokens', label: 'Design Tokens', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'brand', label: 'Brand Analysis', icon: Box },
  { id: 'layout', label: 'Layout Patterns', icon: Grid3x3 },
  { id: 'screenshots', label: 'Screenshots', icon: Eye },
] as const

export function ScanResultsLayout({
  result,
  isLoading,
  scanId,
  progress,
  onCopy,
  onExport,
  onShare,
  showDiff = false,
  onToggleDiff,
  onNewScan,
  onScanHistory
}: ScanResultsLayoutProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialSection = searchParams.get('section') || 'overview'

  const [activeSection, setActiveSection] = useState(initialSection)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const mainContentRef = useRef<HTMLDivElement | null>(null)

  // Sync active section with URL on mount
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && sections.some(s => s.id === section)) {
      setActiveSection(section)
      // Scroll to section after a short delay to ensure DOM is ready
      setTimeout(() => {
        const element = sectionRefs.current[section]
        if (element && mainContentRef.current) {
          const elementTop = element.offsetTop
          mainContentRef.current.scrollTo({ top: elementTop - 80, behavior: 'smooth' })
        }
      }, 100)
    }
  }, [searchParams])

  // Auto-scroll and highlight active section
  useEffect(() => {
    const mainContent = mainContentRef.current
    if (!mainContent) return

    const handleScroll = () => {
      const scrollPosition = mainContent.scrollTop + 100

      for (const section of sections) {
        const element = sectionRefs.current[section.id]
        if (element) {
          const elementTop = element.offsetTop
          const elementHeight = element.offsetHeight
          if (scrollPosition >= elementTop && scrollPosition < elementTop + elementHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    mainContent.addEventListener('scroll', handleScroll)
    return () => mainContent.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const mainContent = mainContentRef.current
    const element = sectionRefs.current[sectionId]
    if (element && mainContent) {
      const elementTop = element.offsetTop
      mainContent.scrollTo({ top: elementTop - 80, behavior: 'smooth' })
      setActiveSection(sectionId)

      // Update URL without page reload
      const params = new URLSearchParams(searchParams.toString())
      params.set('section', sectionId)
      router.push(`?${params.toString()}`, { scroll: false })
    }
  }

  // Always show the layout, use skeletons when loading
  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* ChatGPT-style Left Sidebar Navigation */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-grep-2 bg-grep-0 transition-all h-full",
        sidebarCollapsed ? "w-14" : "w-56"
      )}>
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-grep-3 bg-grep-0 shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className={cn("w-2 h-2 rounded-full", isLoading ? "bg-blue-500 animate-pulse" : "bg-green-500")} />
              <span className="text-[11px] font-mono font-bold text-foreground tracking-wide">RESULTS</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-7 w-7 p-0 hover:bg-grep-2"
          >
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform text-grep-9",
              sidebarCollapsed ? "rotate-90" : "-rotate-90"
            )} />
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {/* Quick Actions Section */}
          {!sidebarCollapsed && (
            <div className="mb-4">
              <button
                onClick={onNewScan}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium transition-all text-foreground hover:bg-grep-1 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-grep-1 flex items-center justify-center">
                  <Copy className="h-4 w-4" />
                </div>
                <span>New scan</span>
              </button>
              <button
                onClick={onScanHistory}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium transition-all text-foreground hover:bg-grep-1 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-grep-1 flex items-center justify-center">
                  <History className="h-4 w-4" />
                </div>
                <span>Scan history</span>
              </button>
            </div>
          )}

          {/* Sections Heading */}
          {!sidebarCollapsed && (
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-grep-9 uppercase tracking-wider">Sections</h3>
            </div>
          )}

          {/* Section Links */}
          <div className="px-2 space-y-0.5">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id

              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium transition-all rounded-md",
                    isActive
                      ? "bg-grep-1 text-foreground"
                      : "text-grep-9 hover:bg-grep-1 hover:text-foreground"
                  )}
                  title={sidebarCollapsed ? section.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{section.label}</span>}
                </button>
              )
            })}
          </div>

          {/* Export Section */}
          {!sidebarCollapsed && (
            <div className="mt-6">
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-grep-9 uppercase tracking-wider">Export</h3>
              </div>
              <div className="px-2 space-y-0.5">
                <button
                  onClick={onShare}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium transition-all rounded-md text-grep-9 hover:bg-grep-1 hover:text-foreground"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">Share Results</span>
                </button>
                <button
                  onClick={() => onExport('json')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium transition-all rounded-md text-grep-9 hover:bg-grep-1 hover:text-foreground"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="truncate">Export Tokens</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Footer - User Section Style */}
        {!sidebarCollapsed && result && (
          <div className="p-3 border-t border-grep-3 bg-grep-0 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-grep-1 cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {result.domain?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">{result.domain}</div>
                <div className="text-xs text-grep-9 truncate">v{result.versionInfo?.versionNumber || 1}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8 md:px-12 md:py-10">


          {/* Overview Section */}
          <section
            id="overview"
            ref={(el) => { sectionRefs.current['overview'] = el }}
            className="mb-8"
          >
            {/* Minimal Header - Vercel style */}
            <div className="mb-8 flex items-center justify-between pb-6">
              <div className="flex items-center gap-3">
                {isLoading && !result ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <div className="h-7 w-48 bg-grep-2 animate-pulse rounded" />
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <h1 className="text-xl font-medium text-foreground">
                      {result?.domain}
                    </h1>
                  </>
                )}
                {result?.versionInfo && (
                  <>
                    <span className="text-grep-7">·</span>
                    <Badge variant="secondary" className="h-6 font-mono text-xs">
                      v{result.versionInfo.versionNumber}
                    </Badge>
                    {result.versionInfo.isNewVersion && result.versionInfo.changeCount > 0 && (
                      <Badge variant="outline" className="h-6 font-mono text-xs border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-400">
                        {result.versionInfo.changeCount} changes from v{result.versionInfo.previousVersionNumber}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {result && (
                <div className="flex items-center gap-2">
                  {result?.versionInfo?.diff && result.versionInfo.changeCount > 0 && onToggleDiff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleDiff}
                      className="h-8 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <History className="h-3.5 w-3.5 mr-1.5" />
                      {showDiff ? 'Hide Changes' : 'View Changes'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(JSON.stringify(result?.curatedTokens, null, 2))}
                    className="h-8 px-3 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Tokens
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShare}
                    className="h-8 px-3 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Export
                        <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-grep-9">
                        Common Formats
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onExport('json')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('css')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        CSS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('scss')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        SCSS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('js')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        JavaScript
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('ts')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        TypeScript
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-grep-9">
                        Design Tools
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onExport('figma')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Figma
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('xd')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Adobe XD
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-grep-9">
                        Platform-Specific
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onExport('swift')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Swift (iOS)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('android')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Android XML
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('tailwind')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Tailwind Config
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>


            {/* Enhanced Stats Grid with Visual Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Tokens Count */}
              <div className="group relative p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-blue-400 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl font-bold tabular-nums text-foreground">
                    {isLoading ? (
                      <div className="h-9 w-20 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      result?.summary?.tokensExtracted || 0
                    )}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <div className="text-xs text-grep-9 font-semibold tracking-wide uppercase mb-2">Design Tokens</div>
                {!isLoading && result?.summary?.curatedCount && (
                  <div className="text-[10px] text-grep-7 font-mono">
                    {result.summary.curatedCount.colors}c · {result.summary.curatedCount.fonts}f · {result.summary.curatedCount.spacing}s
                  </div>
                )}
              </div>

              {/* Confidence Score */}
              <div className="group relative p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-green-400 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "text-3xl font-bold tabular-nums transition-colors",
                    isLoading ? "" :
                    (result?.summary?.confidence || 0) >= 80 ? "text-green-600 dark:text-green-500" :
                    (result?.summary?.confidence || 0) >= 60 ? "text-blue-600 dark:text-blue-500" :
                    "text-orange-600 dark:text-orange-500"
                  )}>
                    {isLoading ? (
                      <div className="h-9 w-20 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      `${result?.summary?.confidence || 0}%`
                    )}
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isLoading ? "bg-blue-500 animate-pulse" :
                    (result?.summary?.confidence || 0) >= 80 ? "bg-green-500" :
                    (result?.summary?.confidence || 0) >= 60 ? "bg-blue-500" :
                    "bg-orange-500"
                  )} />
                </div>
                <div className="text-xs text-grep-9 font-semibold tracking-wide uppercase mb-2">Confidence</div>
                {!isLoading && (
                  <div className="w-full h-1.5 bg-grep-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        (result?.summary?.confidence || 0) >= 80 ? "bg-green-500" :
                        (result?.summary?.confidence || 0) >= 60 ? "bg-blue-500" :
                        "bg-orange-500"
                      )}
                      style={{ width: `${result?.summary?.confidence || 0}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Completeness */}
              <div className="group relative p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-purple-400 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "text-3xl font-bold tabular-nums transition-colors",
                    isLoading ? "" :
                    (result?.summary?.completeness || 0) >= 80 ? "text-purple-600 dark:text-purple-500" :
                    (result?.summary?.completeness || 0) >= 60 ? "text-blue-600 dark:text-blue-500" :
                    "text-orange-600 dark:text-orange-500"
                  )}>
                    {isLoading ? (
                      <div className="h-9 w-20 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      `${result?.summary?.completeness || 0}%`
                    )}
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isLoading ? "bg-blue-500 animate-pulse" :
                    (result?.summary?.completeness || 0) >= 80 ? "bg-purple-500" :
                    (result?.summary?.completeness || 0) >= 60 ? "bg-blue-500" :
                    "bg-orange-500"
                  )} />
                </div>
                <div className="text-xs text-grep-9 font-semibold tracking-wide uppercase mb-2">Completeness</div>
                {!isLoading && (
                  <div className="w-full h-1.5 bg-grep-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        (result?.summary?.completeness || 0) >= 80 ? "bg-purple-500" :
                        (result?.summary?.completeness || 0) >= 60 ? "bg-blue-500" :
                        "bg-orange-500"
                      )}
                      style={{ width: `${result?.summary?.completeness || 0}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Reliability */}
              <div className="group relative p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-cyan-400 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "text-3xl font-bold tabular-nums transition-colors",
                    isLoading ? "" :
                    (result?.summary?.reliability || 0) >= 80 ? "text-cyan-600 dark:text-cyan-500" :
                    (result?.summary?.reliability || 0) >= 60 ? "text-blue-600 dark:text-blue-500" :
                    "text-orange-600 dark:text-orange-500"
                  )}>
                    {isLoading ? (
                      <div className="h-9 w-20 bg-grep-2 animate-pulse rounded" />
                    ) : (
                      `${result?.summary?.reliability || 0}%`
                    )}
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isLoading ? "bg-blue-500 animate-pulse" :
                    (result?.summary?.reliability || 0) >= 80 ? "bg-cyan-500" :
                    (result?.summary?.reliability || 0) >= 60 ? "bg-blue-500" :
                    "bg-orange-500"
                  )} />
                </div>
                <div className="text-xs text-grep-9 font-semibold tracking-wide uppercase mb-2">Reliability</div>
                {!isLoading && (
                  <div className="w-full h-1.5 bg-grep-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        (result?.summary?.reliability || 0) >= 80 ? "bg-cyan-500" :
                        (result?.summary?.reliability || 0) >= 60 ? "bg-blue-500" :
                        "bg-orange-500"
                      )}
                      style={{ width: `${result?.summary?.reliability || 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Version Diff */}
            {showDiff && result?.versionInfo?.diff && (
              <div className="mb-6">
                <TokenDiffViewer
                  diff={result.versionInfo.diff}
                  oldVersion={result.versionInfo.previousVersionNumber || 1}
                  newVersion={result.versionInfo.versionNumber}
                  domain={result.domain || ''}
                  onCopy={onCopy}
                  onExport={() => {
                    const blob = new Blob([JSON.stringify(result.versionInfo.diff, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const anchor = document.createElement("a")
                    anchor.href = url
                    anchor.download = `${result.domain}-v${result.versionInfo.previousVersionNumber}-to-v${result.versionInfo.versionNumber}-diff.json`
                    document.body.appendChild(anchor)
                    anchor.click()
                    anchor.remove()
                  }}
                />
              </div>
            )}
          </section>

          {/* AI Analysis Section */}
          {isLoading && !result?.comprehensiveAnalysis ? (
            <section
              id="analysis"
              ref={(el) => { sectionRefs.current['analysis'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
              </div>
            </section>
          ) : result?.comprehensiveAnalysis && (
            <section
              id="analysis"
              ref={(el) => { sectionRefs.current['analysis'] = el }}
              className="mb-8"
            >
              <ComprehensiveAnalysisDisplay analysis={result.comprehensiveAnalysis} />
            </section>
          )}

          {/* Design Tokens Section */}
          {isLoading && !result?.curatedTokens ? (
            <section
              id="tokens"
              ref={(el) => { sectionRefs.current['tokens'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-32 bg-grep-2 animate-pulse rounded" />
                <div className="h-32 bg-grep-2 animate-pulse rounded" />
                <div className="h-32 bg-grep-2 animate-pulse rounded" />
              </div>
            </section>
          ) : result?.curatedTokens && (
            <section
              id="tokens"
              ref={(el) => { sectionRefs.current['tokens'] = el }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold font-mono text-foreground mb-4 flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Design Tokens
              </h2>
              <TokenResultsDisplay
                tokens={result.curatedTokens}
                domain={result.domain || ''}
                onCopy={onCopy}
                onExport={(category) => {
                  const categoryData = category === 'typography'
                    ? result.curatedTokens.typography?.families
                    : result.curatedTokens[category as keyof typeof result.curatedTokens]
                  if (categoryData) {
                    const blob = new Blob([JSON.stringify(categoryData, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const anchor = document.createElement("a")
                    anchor.href = url
                    anchor.download = `${result.domain}-${category}.json`
                    document.body.appendChild(anchor)
                    anchor.click()
                    anchor.remove()
                  }
                }}
              />
            </section>
          )}

          {/* Typography Section */}
          {isLoading && !result?.curatedTokens?.typography ? (
            <section
              id="typography"
              ref={(el) => { sectionRefs.current['typography'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
              </div>
            </section>
          ) : result?.curatedTokens?.typography && (
            <section
              id="typography"
              ref={(el) => { sectionRefs.current['typography'] = el }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold font-mono text-foreground mb-4 flex items-center gap-2">
                <Type className="h-5 w-5" />
                Typography
              </h2>
              <TypographySection typography={result.curatedTokens.typography} onCopy={onCopy} />
            </section>
          )}

          {/* Brand Analysis Section */}
          {isLoading && !result?.brandAnalysis ? (
            <section
              id="brand"
              ref={(el) => { sectionRefs.current['brand'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-32 bg-grep-2 animate-pulse rounded" />
              </div>
            </section>
          ) : result?.brandAnalysis && (
            <section
              id="brand"
              ref={(el) => { sectionRefs.current['brand'] = el }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold font-mono text-foreground mb-4 flex items-center gap-2">
                <Box className="h-5 w-5" />
                Brand Analysis
              </h2>
              <BrandAnalysisSection brandAnalysis={result.brandAnalysis} />
            </section>
          )}

          {/* Layout Patterns Section */}
          {isLoading && !result?.layoutDNA ? (
            <section
              id="layout"
              ref={(el) => { sectionRefs.current['layout'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
              </div>
            </section>
          ) : result?.layoutDNA && (
            <section
              id="layout"
              ref={(el) => { sectionRefs.current['layout'] = el }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold font-mono text-foreground mb-4 flex items-center gap-2">
                <Grid3x3 className="h-5 w-5" />
                Layout Patterns
              </h2>
              <LayoutPatternsSection layoutDNA={result.layoutDNA} />
            </section>
          )}

          {/* Screenshots Section */}
          {isLoading && !result ? (
            <section
              id="screenshots"
              ref={(el) => { sectionRefs.current['screenshots'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="aspect-video bg-grep-2 animate-pulse rounded" />
            </section>
          ) : result && scanId && (
            <section
              id="screenshots"
              ref={(el) => { sectionRefs.current['screenshots'] = el }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold font-mono text-foreground mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Component Screenshots
              </h2>
              <ScreenshotGallery scanId={scanId} />
            </section>
          )}

        </div>
      </main>
    </div>
  )
}