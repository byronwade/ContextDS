"use client"

import { useState, useMemo } from "react"
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
  TrendingUp,
  Target,
  Zap,
  Shield,
  Lightbulb,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultsTabs, type TabId } from "./results-tabs"
import { MetricCard } from "@/components/molecules/metric-card"
import { TokenGrid } from "@/components/molecules/token-grid"
import { InsightCard } from "@/components/molecules/insight-card"
import { ComponentShowcase } from "@/components/molecules/component-showcase"
import { ScreenshotGallery } from "@/components/molecules/screenshot-gallery"
import { FontPreview } from "@/components/molecules/font-preview"

type ScanResult = any

interface ScanProgress {
  step: number
  totalSteps: number
  phase: string
  message: string
  data?: string
  time?: string
  details?: string[]
  logs?: string[]
  timestamp: number
}

interface ScanResultsLayoutProps {
  result: ScanResult
  isLoading: boolean
  scanId?: string | null
  progress?: ScanProgress | null
  metrics?: any | null
  onCopy: (value: string) => void
  onExport: (format: string) => void
  onShare: () => void
  showDiff?: boolean
  onToggleDiff?: () => void
  onNewScan?: () => void
  onScanHistory?: () => void
}

// Helper to get confidence status
function getConfidenceStatus(score: number): "success" | "info" | "warning" {
  if (score >= 80) return "success"
  if (score >= 60) return "info"
  return "warning"
}

export function ScanResultsLayout({
  result,
  isLoading,
  scanId,
  progress,
  metrics,
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

  // Real-time store for live updates
  const { metrics: liveMetrics, isConnected, activities, addActivity } = useRealtimeStore()

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:px-12 md:py-10">

          {/* Clean loading experience matching grep.app */}
          {isLoading && !result ? (
            <>
              <section
                id="overview"
                ref={(el) => { sectionRefs.current['overview'] = el }}
                className="mb-12 space-y-6"
              >
                <Card className="border border-grep-2 bg-grep-0">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.3em] text-grep-9">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "h-2 w-2 rounded-full animate-pulse",
                          liveMetrics ? "bg-blue-500" : "bg-gray-400"
                        )} />
                        <span>Live Design System Analysis</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Real-time data counter */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] tracking-normal text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded font-mono">
                            {((liveMetrics?.totalTokens || metrics?.tokens || 0) + (metrics?.cssRules || 0) + (metrics?.colors || 0) + (metrics?.variables || 0)).toLocaleString()} data points
                          </span>
                        </div>
                        {progress?.time && (
                          <span className="text-[10px] tracking-normal text-grep-8">{progress.time}</span>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold font-mono text-foreground">
                      {searchParams.get('domain') || 'Preparing scan'}
                    </CardTitle>
                    <CardDescription className="text-sm text-grep-9">
                      {progress?.phase || 'Real-time design token extraction and component analysis'}
                    </CardDescription>

                    {/* Enhanced Progress Bar */}
                    {progress && progress.totalSteps > 0 && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                            {progress.phase || 'Analyzing'}
                          </div>
                          <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            {progress.step}/{progress.totalSteps}
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          {progress.message || 'Collecting live CSS, tokens, and component fingerprints'}
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Real-time Analysis Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* CSS Extraction */}
                      <div className={cn(
                        "p-4 rounded-lg border transition-all duration-300",
                        progress?.phase?.includes('css') || progress?.phase?.includes('CSS')
                          ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                          : "bg-background border-grep-2"
                      )}>
                        <div className="flex items-start gap-3 mb-2">
                          <Code2 className={cn(
                            "h-5 w-5 mt-0.5 flex-shrink-0",
                            progress?.phase?.includes('css') || progress?.phase?.includes('CSS') ? "text-blue-600 dark:text-blue-400" : "text-grep-7"
                          )} />
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-semibold mb-1",
                              progress?.phase?.includes('css') || progress?.phase?.includes('CSS') ? "text-blue-700 dark:text-blue-300" : "text-grep-9"
                            )}>CSS Extraction</div>
                            <div className={cn(
                              "text-xs leading-relaxed",
                              progress?.phase?.includes('css') || progress?.phase?.includes('CSS') ? "text-blue-600 dark:text-blue-400" : "text-grep-7"
                            )}>
                              {progress?.phase?.includes('css') || progress?.phase?.includes('CSS') ? "Extracting stylesheets and computed styles..." : "Waiting for CSS analysis"}
                            </div>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-2",
                            progress?.phase?.includes('css') || progress?.phase?.includes('CSS') ? "bg-blue-500 animate-pulse" : "bg-gray-400"
                          )} />
                        </div>
                        <div className="text-lg font-bold font-mono text-blue-600">
                          {metrics?.cssRules || '0'}
                        </div>
                        <div className="text-xs text-grep-7 uppercase tracking-wide">CSS Rules</div>
                      </div>

                      {/* Token Analysis */}
                      <div className={cn(
                        "p-4 rounded-lg border transition-all duration-300",
                        progress?.phase?.includes('token') || progress?.phase?.includes('Token')
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-background border-grep-2"
                      )}>
                        <div className="flex items-start gap-3 mb-2">
                          <Palette className={cn(
                            "h-5 w-5 mt-0.5 flex-shrink-0",
                            progress?.phase?.includes('token') || progress?.phase?.includes('Token') ? "text-green-600 dark:text-green-400" : "text-grep-7"
                          )} />
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-semibold mb-1",
                              progress?.phase?.includes('token') || progress?.phase?.includes('Token') ? "text-green-700 dark:text-green-300" : "text-grep-9"
                            )}>Token Analysis</div>
                            <div className={cn(
                              "text-xs leading-relaxed",
                              progress?.phase?.includes('token') || progress?.phase?.includes('Token') ? "text-green-600 dark:text-green-400" : "text-grep-7"
                            )}>
                              {progress?.phase?.includes('token') || progress?.phase?.includes('Token') ? "Analyzing design tokens and variables..." : "Waiting for token extraction"}
                            </div>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-2",
                            progress?.phase?.includes('token') || progress?.phase?.includes('Token') ? "bg-green-500 animate-pulse" : "bg-gray-400"
                          )} />
                        </div>
                        <div className="text-lg font-bold font-mono text-green-600">
                          {liveMetrics?.totalTokens || metrics?.tokens || '0'}
                        </div>
                        <div className="text-xs text-grep-7 uppercase tracking-wide">Design Tokens</div>
                      </div>

                      {/* Component Detection */}
                      <div className={cn(
                        "p-4 rounded-lg border transition-all duration-300",
                        progress?.phase?.includes('component') || progress?.phase?.includes('Component')
                          ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                          : "bg-background border-grep-2"
                      )}>
                        <div className="flex items-start gap-3 mb-2">
                          <Box className={cn(
                            "h-5 w-5 mt-0.5 flex-shrink-0",
                            progress?.phase?.includes('component') || progress?.phase?.includes('Component') ? "text-purple-600 dark:text-purple-400" : "text-grep-7"
                          )} />
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-semibold mb-1",
                              progress?.phase?.includes('component') || progress?.phase?.includes('Component') ? "text-purple-700 dark:text-purple-300" : "text-grep-9"
                            )}>Component Detection</div>
                            <div className={cn(
                              "text-xs leading-relaxed",
                              progress?.phase?.includes('component') || progress?.phase?.includes('Component') ? "text-purple-600 dark:text-purple-400" : "text-grep-7"
                            )}>
                              {progress?.phase?.includes('component') || progress?.phase?.includes('Component') ? "Identifying UI component patterns..." : "Waiting for component analysis"}
                            </div>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-2",
                            progress?.phase?.includes('component') || progress?.phase?.includes('Component') ? "bg-purple-500 animate-pulse" : "bg-gray-400"
                          )} />
                        </div>
                        <div className="text-lg font-bold font-mono text-purple-600">
                          {metrics?.components || (progress?.step > 2 ? '...' : '0')}
                        </div>
                        <div className="text-xs text-grep-7 uppercase tracking-wide">Components</div>
                      </div>

                      {/* Layout Analysis */}
                      <div className={cn(
                        "p-4 rounded-lg border transition-all duration-300",
                        progress?.phase?.includes('layout') || progress?.phase?.includes('Layout')
                          ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                          : "bg-background border-grep-2"
                      )}>
                        <div className="flex items-start gap-3 mb-2">
                          <Grid3x3 className={cn(
                            "h-5 w-5 mt-0.5 flex-shrink-0",
                            progress?.phase?.includes('layout') || progress?.phase?.includes('Layout') ? "text-orange-600 dark:text-orange-400" : "text-grep-7"
                          )} />
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-semibold mb-1",
                              progress?.phase?.includes('layout') || progress?.phase?.includes('Layout') ? "text-orange-700 dark:text-orange-300" : "text-grep-9"
                            )}>Layout Analysis</div>
                            <div className={cn(
                              "text-xs leading-relaxed",
                              progress?.phase?.includes('layout') || progress?.phase?.includes('Layout') ? "text-orange-600 dark:text-orange-400" : "text-grep-7"
                            )}>
                              {progress?.phase?.includes('layout') || progress?.phase?.includes('Layout') ? "Analyzing grid systems and spacing..." : "Waiting for layout analysis"}
                            </div>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-2",
                            progress?.phase?.includes('layout') || progress?.phase?.includes('Layout') ? "bg-orange-500 animate-pulse" : "bg-gray-400"
                          )} />
                        </div>
                        <div className="text-lg font-bold font-mono text-orange-600">
                          {metrics?.colors || '0'}
                        </div>
                        <div className="text-xs text-grep-7 uppercase tracking-wide">Color Palette</div>
                      </div>
                    </div>

                    {/* Live Processing Details */}
                    {progress?.details?.length && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-grep-9">Live Processing Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {progress.details.slice(0, 6).map((detail, index) => (
                            <div key={`${detail}-${index}`} className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                              <span className="mt-1 h-1 w-1 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Show cards as data streams in - prioritize scan metrics, fall back to live metrics */}
                  {((metrics?.tokens !== undefined && metrics.tokens > 0) || (liveMetrics?.totalTokens > 0)) && (
                    <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 animate-in slide-in-from-bottom duration-300">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex items-center justify-between">
                          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
                            Design tokens
                          </CardDescription>
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full animate-pulse",
                            isConnected ? "bg-emerald-500" : "bg-neutral-400"
                          )} />
                        </div>
                        <div className="text-lg font-mono text-emerald-900 dark:text-emerald-100">
                          {(metrics?.tokens || liveMetrics?.totalTokens || 0).toLocaleString()}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-emerald-700 dark:text-emerald-300">
                          {(metrics?.colors || 0) > 0 && `${metrics.colors} colors`}
                          {(metrics?.colors || 0) > 0 && (metrics?.variables || 0) > 0 && ' · '}
                          {(metrics?.variables || 0) > 0 && `${metrics.variables} variables`}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          {isConnected ? 'Live' : 'Just discovered'} • {new Date().toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {metrics?.cssRules !== undefined && metrics.cssRules > 0 && (
                    <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 animate-in slide-in-from-bottom duration-300">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex items-center justify-between">
                          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.3em] text-blue-700 dark:text-blue-300">
                            CSS Rules
                          </CardDescription>
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <div className="text-lg font-mono text-blue-900 dark:text-blue-100">
                          {metrics.cssRules.toLocaleString()}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          Stylesheet analysis complete
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Parsed • {new Date().toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {metrics?.qualityScore !== undefined && metrics.qualityScore > 0 && (
                    <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 animate-in slide-in-from-bottom duration-300">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex items-center justify-between">
                          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.3em] text-purple-700 dark:text-purple-300">
                            Quality Score
                          </CardDescription>
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                        </div>
                        <div className="text-lg font-mono text-purple-900 dark:text-purple-100">
                          {metrics.qualityScore.toFixed(0)}%
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-purple-700 dark:text-purple-300">
                          {metrics.qualityScore >= 80 ? 'High confidence' : metrics.qualityScore >= 60 ? 'Medium confidence' : 'Low confidence'}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          Calculated • {new Date().toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {progress && progress.totalSteps > 0 && (
                    <Card className="border border-grep-2 bg-grep-0">
                      <CardHeader className="space-y-2 pb-3">
                        <CardDescription className="text-[11px] font-medium uppercase tracking-[0.3em] text-grep-9">
                          Live Progress
                        </CardDescription>
                        <div className="text-lg font-mono text-foreground">
                          {progress.step}/{progress.totalSteps}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-grep-9">
                          {((progress.step / progress.totalSteps) * 100).toFixed(0)}% complete
                        </div>
                        <div className="text-xs text-grep-8">
                          {progress.phase}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>

              {/* Only show sections when actively being processed or have data */}
              {secondarySections
                .filter(section => {
                  const isActivelyProcessing = progress?.phase?.toLowerCase().includes(section.id.toLowerCase()) ||
                                             progress?.phase?.toLowerCase().includes(section.label.toLowerCase().split(' ')[0]);
                  // Show if actively processing or if we have relevant data
                  return isActivelyProcessing;
                })
                .map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={(el) => { sectionRefs.current[section.id] = el }}
                  className="mb-12 animate-in slide-in-from-bottom duration-500"
                >
                  <Card className="border border-grep-2 bg-grep-0">
                    <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-grep-9">
                          {section.label}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      </div>
                      <span className="text-xs font-mono text-grep-8">
                        Processing live data...
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-sm text-grep-9">
                            {progress?.message || `Analyzing ${section.label.toLowerCase()}`}
                          </span>
                        </div>

                        {progress?.details && progress.details.length > 0 && (
                          <div className="pl-4 space-y-1">
                            {progress.details.slice(0, 3).map((detail, index) => (
                              <div key={index} className="flex items-start gap-2 text-xs">
                                <span className="mt-1 h-1 w-1 rounded-full bg-grep-6 flex-shrink-0" />
                                <span className="text-grep-8">{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {progress?.logs && progress.logs.length > 0 && (
                          <div className="pl-4">
                            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-grep-9 mb-1">
                              Live Stream
                            </div>
                            <div className="space-y-0.5 max-h-16 overflow-y-auto">
                              {progress.logs.slice(-3).map((log, index) => (
                                <div key={index} className="text-xs font-mono text-grep-8 break-all">
                                  {log}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              ))}
            </>
          ) : (
            <>


          {/* Overview Section */}
          <section
            id="overview"
            ref={(el) => { sectionRefs.current['overview'] = el }}
            className="mb-8"
          >
            {/* Minimal Header - Vercel style */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {isLoading && !result ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <div className="h-7 w-48 bg-grep-2 animate-pulse rounded" />
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <h1 className="text-xl font-medium text-foreground break-all">
                      {result?.domain}
                    </h1>
                  </>
                )}
                {result?.versionInfo && (
                  <>
                    <span className="text-grep-7 hidden sm:inline">·</span>
                    <Badge variant="secondary" className="h-6 font-mono text-xs">
                      v{result.versionInfo.versionNumber}
                    </Badge>
                    {result.versionInfo.isNewVersion && result.versionInfo.changeCount > 0 && (
                      <Badge variant="outline" className="h-6 font-mono text-xs border-blue-300 dark:border-blue-900 text-blue-700 dark:text-blue-400">
                        {result.versionInfo.changeCount} changes
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {result && (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {result?.versionInfo?.diff && result.versionInfo.changeCount > 0 && onToggleDiff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleDiff}
                      className="h-8 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <History className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{showDiff ? 'Hide Changes' : 'View Changes'}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(JSON.stringify(result?.curatedTokens, null, 2))}
                    className="h-8 px-3 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
                  >
                    <Copy className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShare}
                    className="hidden md:inline-flex h-8 px-3 text-xs font-medium border-grep-3 hover:border-grep-4 hover:bg-grep-1"
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
                        <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Export</span>
                        <ChevronDown className="h-3 w-3 sm:ml-1.5 opacity-60" />
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
                      <DropdownMenuItem onClick={() => onExport('ai-analysis')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        AI Analysis
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport('component-library')} className="font-mono text-xs">
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Component Library
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {/* Tokens Count */}
              <div className="group relative p-3 sm:p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-blue-400 hover:shadow-lg transition-all duration-300">
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
              <div className="group relative p-3 sm:p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-green-400 hover:shadow-lg transition-all duration-300">
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
              <div className="group relative p-3 sm:p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-purple-400 hover:shadow-lg transition-all duration-300">
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
              <div className="group relative p-3 sm:p-5 rounded-lg border border-grep-3 bg-gradient-to-br from-grep-0 to-grep-1 hover:border-cyan-400 hover:shadow-lg transition-all duration-300">
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

          {/* Screenshots Section - Moved to Top */}
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
              <ScreenshotGallery scanId={scanId} />
            </section>
          )}

          {/* AI Analysis Section - Enhanced */}
          <section
            id="analysis"
            ref={(el) => { sectionRefs.current['analysis'] = el }}
            className="mb-8"
          >
            <EnhancedAIAnalysisDisplay
              spec={result?.designSystemSpec}
              componentLibrary={result?.componentLibrary}
              brandAnalysis={result?.brandAnalysis}
              layoutDNA={result?.layoutDNA}
              curatedTokens={result?.curatedTokens}
              progress={progress}
              metrics={metrics}
              isLoading={isLoading}
              onCopy={onCopy}
            />
          </section>

          {/* Component Library Section */}
          {isLoading && !result ? (
            <section
              id="components"
              ref={(el) => { sectionRefs.current['components'] = el }}
              className="mb-8"
            >
              <div className="h-5 w-32 bg-grep-2 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
                <div className="h-24 bg-grep-2 animate-pulse rounded" />
              </div>
            </section>
          ) : result?.componentLibrary && (
            <section
              id="components"
              ref={(el) => { sectionRefs.current['components'] = el }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold font-mono text-foreground mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Advanced Component Library
              </h2>
              <AdvancedComponentLibrary componentLibrary={result.componentLibrary} onCopy={onCopy} />
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

            </>
          )}

        </div>
      </main>
    </div>
  )
}
