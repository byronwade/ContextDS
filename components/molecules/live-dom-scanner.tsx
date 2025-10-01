import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Code, Layers, Zap, Target, Search } from "lucide-react"

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

interface ScanMetrics {
  cssRules: number
  variables: number
  colors: number
  tokens: number
  qualityScore: number
}

interface DOMElement {
  tag: string
  id?: string
  classes: string[]
  depth: number
  scanning: boolean
  analyzed: boolean
  color: string
  children: DOMElement[]
}

interface LiveDOMScannerProps {
  className?: string
  isActive?: boolean
  progress?: ScanProgress | null
  metrics?: ScanMetrics | null
}

export function LiveDOMScanner({ className, isActive = true, progress, metrics }: LiveDOMScannerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [discoveredElements, setDiscoveredElements] = useState<Set<string>>(new Set())
  const [recentLogs, setRecentLogs] = useState<string[]>([])

  useEffect(() => {
    if (!isActive || !progress) return

    // Update current path based on scan phase
    if (progress.phase.toLowerCase().includes('dom') || progress.phase.toLowerCase().includes('html')) {
      setCurrentPath(['html', 'body', progress.phase.split(' ').pop() || 'element'])
    } else if (progress.phase.toLowerCase().includes('css')) {
      setCurrentPath(['stylesheet', 'rules', 'selectors'])
    } else if (progress.phase.toLowerCase().includes('token')) {
      setCurrentPath(['tokens', 'design-system', 'values'])
    } else if (progress.phase.toLowerCase().includes('component')) {
      setCurrentPath(['components', 'library', 'variants'])
    }

    // Track discovered elements from logs
    if (progress.logs && progress.logs.length > 0) {
      const newElements = new Set(discoveredElements)
      progress.logs.forEach(log => {
        // Extract element selectors from logs
        const elementMatches = log.match(/\b(div|span|button|input|header|footer|nav|main|section|article|h[1-6]|p|a|img)\b/gi)
        if (elementMatches) {
          elementMatches.forEach(match => newElements.add(match.toLowerCase()))
        }

        // Extract class names
        const classMatches = log.match(/\.[a-zA-Z][a-zA-Z0-9-_]*/g)
        if (classMatches) {
          classMatches.forEach(match => newElements.add(match))
        }
      })
      setDiscoveredElements(newElements)
      setRecentLogs(progress.logs.slice(-10))
    }
  }, [progress?.timestamp, isActive])

  const scanProgressPercent = progress ? (progress.step / progress.totalSteps) * 100 : 0
  const foundElements = discoveredElements.size
  const extractedTokens = metrics?.tokens || 0


  if (!isActive) return null

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Layers className="w-6 h-6 text-purple-500" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">DOM Structure Scanner</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Live element analysis
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{foundElements}</div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">Elements Found</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-neutral-600 dark:text-neutral-400">Scanning Progress</span>
          <span className="font-mono">{scanProgressPercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${scanProgressPercent}%` }}
          />
        </div>
        {progress && (
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            Step {progress.step} of {progress.totalSteps}
          </div>
        )}
      </div>

      {/* Current Path */}
      <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
        <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
          Current Phase:
        </div>
        <div className="font-mono text-sm text-foreground">
          {progress?.phase || 'Initializing scan...'}
        </div>
        {currentPath.length > 0 && (
          <div className="mt-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
            Path: {currentPath.join(' > ')}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {foundElements}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">Elements</div>
        </div>
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {extractedTokens}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Tokens</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {progress?.step || 0}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">Step</div>
        </div>
      </div>

      {/* Discovered Elements */}
      <div className="max-h-96 overflow-y-auto bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
        <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-3 flex items-center gap-2">
          <Code className="w-4 h-4" />
          Discovered Elements ({discoveredElements.size})
        </div>
        <div className="space-y-2">
          {Array.from(discoveredElements).map((element, i) => (
            <div key={element} className="flex items-center gap-2 p-2 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
              <Target className="w-3 h-3 text-blue-500" />
              <span className="font-mono text-sm text-foreground">{element}</span>
              <div className="ml-auto text-xs text-neutral-500">
                #{i + 1}
              </div>
            </div>
          ))}
          {discoveredElements.size === 0 && (
            <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
              <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No elements discovered yet...</p>
            </div>
          )}
        </div>

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
              Recent Scan Logs:
            </div>
            <div className="space-y-1">
              {recentLogs.slice(-5).map((log, i) => (
                <div key={i} className="text-xs font-mono text-neutral-600 dark:text-neutral-400 p-2 bg-white dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}