import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Brain, Zap, Search, Palette, Type, Code, Target } from "lucide-react"

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

interface AIReasoningDisplayProps {
  className?: string
  isActive?: boolean
  progress?: ScanProgress | null
  metrics?: ScanMetrics | null
}

export function AIReasoningDisplay({ className, isActive = true, progress, metrics }: AIReasoningDisplayProps) {
  const [recentThoughts, setRecentThoughts] = useState<Array<{
    message: string,
    phase: string,
    timestamp: number,
    step: number,
    icon: any,
    color: string,
    bg: string
  }>>([])
  const [currentInsight, setCurrentInsight] = useState("")

  // Map phases to icons and colors
  const getPhaseIcon = (phase: string) => {
    if (phase.toLowerCase().includes('dom') || phase.toLowerCase().includes('html')) return Search
    if (phase.toLowerCase().includes('color') || phase.toLowerCase().includes('palette')) return Palette
    if (phase.toLowerCase().includes('font') || phase.toLowerCase().includes('typography')) return Type
    if (phase.toLowerCase().includes('css') || phase.toLowerCase().includes('token')) return Code
    if (phase.toLowerCase().includes('component') || phase.toLowerCase().includes('element')) return Target
    if (phase.toLowerCase().includes('analyz') || phase.toLowerCase().includes('process')) return Brain
    return Zap
  }

  const getPhaseColor = (phase: string) => {
    if (phase.toLowerCase().includes('dom') || phase.toLowerCase().includes('html')) return { color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" }
    if (phase.toLowerCase().includes('color') || phase.toLowerCase().includes('palette')) return { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" }
    if (phase.toLowerCase().includes('font') || phase.toLowerCase().includes('typography')) return { color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" }
    if (phase.toLowerCase().includes('css') || phase.toLowerCase().includes('token')) return { color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" }
    if (phase.toLowerCase().includes('component') || phase.toLowerCase().includes('element')) return { color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30" }
    return { color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" }
  }

  useEffect(() => {
    if (!isActive || !progress) return

    // Add new progress update to thoughts
    const phaseColors = getPhaseColor(progress.phase)
    const newThought = {
      message: progress.message,
      phase: progress.phase,
      timestamp: progress.timestamp,
      step: progress.step,
      icon: getPhaseIcon(progress.phase),
      color: phaseColors.color,
      bg: phaseColors.bg
    }

    setRecentThoughts(prev => [newThought, ...prev.slice(0, 4)])

    // Update insights from progress details
    if (progress.details && progress.details.length > 0) {
      setCurrentInsight(progress.details[0])
    }
  }, [progress?.timestamp, isActive])

  if (!isActive) return null

  const currentThoughtData = recentThoughts[0]
  const confidence = metrics?.qualityScore || (progress?.step || 0) / (progress?.totalSteps || 1) * 100

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900", className)}>
      {/* AI Brain Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Brain className="w-8 h-8 text-blue-500 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">AI Scanner</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Analyzing with {confidence.toFixed(1)}% confidence
          </p>
        </div>
        <div className="ml-auto">
          <div className="h-2 w-32 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current Thought */}
      {currentThoughtData && (
        <div className={cn(
          "p-4 rounded-lg mb-4 border-l-4 border-l-blue-500 animate-in slide-in-from-left duration-500",
          currentThoughtData.bg
        )}>
          <div className="flex items-center gap-3">
            <currentThoughtData.icon className={cn("w-5 h-5", currentThoughtData.color)} />
            <span className="font-medium text-foreground">
              {progress?.phase || "Analyzing"}:
            </span>
          </div>
          <p className="mt-2 text-neutral-700 dark:text-neutral-300 font-mono text-sm">
            {currentThoughtData.message}
          </p>
        </div>
      )}

      {/* Recent Insights */}
      {currentInsight && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-lg mb-4 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">
              Latest Insight
            </span>
          </div>
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {currentInsight}
          </p>
        </div>
      )}

      {/* Thought History */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
          Recent Analysis Steps:
        </div>
        {recentThoughts.slice(1).map((thought, i) => (
          <div
            key={thought.timestamp}
            className="flex items-center gap-3 p-2 rounded opacity-75 hover:opacity-100 transition-opacity"
            style={{ opacity: 1 - (i * 0.2) }}
          >
            <thought.icon className={cn("w-4 h-4", thought.color)} />
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
              {thought.message}
            </span>
            <div className="ml-auto text-xs text-neutral-500">
              Step {thought.step}
            </div>
          </div>
        ))}
      </div>

      {/* Processing Indicators */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Search className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">Scanning</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-500 animate-pulse" />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">Analyzing</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <Zap className="w-6 h-6 text-emerald-500 animate-bounce" />
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">Extracting</div>
        </div>
      </div>
    </div>
  )
}