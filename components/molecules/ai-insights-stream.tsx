import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Info, Zap, Eye, Lightbulb } from "lucide-react"

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

interface InsightMessage {
  id: string
  type: 'discovery' | 'analysis' | 'recommendation' | 'warning' | 'success' | 'info'
  category: 'color' | 'typography' | 'spacing' | 'accessibility' | 'performance' | 'consistency' | 'branding'
  message: string
  confidence: number
  timestamp: number
  metadata?: Record<string, any>
}

interface AIInsightsStreamProps {
  className?: string
  isActive?: boolean
  progress?: ScanProgress | null
  metrics?: ScanMetrics | null
}

export function AIInsightsStream({ className, isActive = true, progress, metrics }: AIInsightsStreamProps) {
  const [messages, setMessages] = useState<InsightMessage[]>([])
  const [currentCategory, setCurrentCategory] = useState<string>('Initializing...')
  const [totalInsights, setTotalInsights] = useState(0)
  const [streamActive, setStreamActive] = useState(false)

  // Generate real insights based on progress and metrics
  const generateInsightFromProgress = (progress: ScanProgress, metrics?: ScanMetrics | null): InsightMessage | null => {
    const phase = progress.phase.toLowerCase()
    const timestamp = progress.timestamp

    // Extract insights from scan phase and data
    if (phase.includes('css') && metrics) {
      return {
        id: `insight-${timestamp}`,
        type: 'discovery',
        category: 'performance',
        message: `Found ${metrics.cssRules} CSS rules with ${metrics.variables} custom properties`,
        confidence: 0.95,
        timestamp,
        metadata: { source: 'CSS Parser', phase: progress.phase }
      }
    }

    if (phase.includes('color') && metrics) {
      return {
        id: `insight-${timestamp}`,
        type: 'analysis',
        category: 'color',
        message: `Detected ${metrics.colors} unique colors - analyzing palette consistency`,
        confidence: 0.88,
        timestamp,
        metadata: { source: 'Color Analyzer', phase: progress.phase }
      }
    }

    if (phase.includes('token') && metrics) {
      return {
        id: `insight-${timestamp}`,
        type: 'success',
        category: 'consistency',
        message: `Extracted ${metrics.tokens} design tokens with ${metrics.qualityScore.toFixed(0)}% confidence`,
        confidence: metrics.qualityScore / 100,
        timestamp,
        metadata: { source: 'Token Extractor', phase: progress.phase }
      }
    }

    if (phase.includes('dom') || phase.includes('html')) {
      return {
        id: `insight-${timestamp}`,
        type: 'info',
        category: 'accessibility',
        message: `Scanning DOM structure for semantic elements and accessibility patterns`,
        confidence: 0.85,
        timestamp,
        metadata: { source: 'DOM Scanner', phase: progress.phase }
      }
    }

    if (progress.details && progress.details.length > 0) {
      return {
        id: `insight-${timestamp}`,
        type: 'info',
        category: 'branding',
        message: progress.details[0],
        confidence: 0.80,
        timestamp,
        metadata: { source: 'Progress Details', phase: progress.phase }
      }
    }

    // Fallback insight from progress message
    return {
      id: `insight-${timestamp}`,
      type: 'analysis',
      category: 'performance',
      message: progress.message,
      confidence: (progress.step / progress.totalSteps),
      timestamp,
      metadata: { source: 'Scan Progress', phase: progress.phase }
    }
  }

  useEffect(() => {
    if (!isActive) return

    setStreamActive(true)

    if (progress) {
      const newInsight = generateInsightFromProgress(progress, metrics)
      if (newInsight) {
        setMessages(prev => [newInsight, ...prev.slice(0, 9)]) // Keep last 10 messages
        setCurrentCategory(`Analyzing ${newInsight.category}...`)
        setTotalInsights(prev => prev + 1)
      }
    }

    return () => {
      setStreamActive(false)
    }
  }, [progress?.timestamp, metrics?.tokens, isActive])

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'discovery': return Eye
      case 'analysis': return TrendingUp
      case 'recommendation': return Lightbulb
      case 'warning': return AlertTriangle
      case 'success': return CheckCircle
      case 'info': return Info
      default: return MessageSquare
    }
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'discovery': return 'text-blue-600 dark:text-blue-400'
      case 'analysis': return 'text-purple-600 dark:text-purple-400'
      case 'recommendation': return 'text-orange-600 dark:text-orange-400'
      case 'warning': return 'text-red-600 dark:text-red-400'
      case 'success': return 'text-emerald-600 dark:text-emerald-400'
      case 'info': return 'text-cyan-600 dark:text-cyan-400'
      default: return 'text-neutral-600 dark:text-neutral-400'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'color': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      'typography': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      'spacing': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      'accessibility': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'performance': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      'consistency': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      'branding': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
    }
    return colors[category as keyof typeof colors] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  if (!isActive) return null

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-900", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <MessageSquare className="w-8 h-8 text-emerald-500" />
          {streamActive && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">AI Insights Stream</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {currentCategory}
          </p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
              {totalInsights} insights
            </span>
          </div>
        </div>
      </div>

      {/* Live Stream Status */}
      <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Live Analysis Stream Active
          </span>
          <div className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-mono">
            Real-time
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Initializing AI analysis engine...</p>
          </div>
        )}

        {messages.map((message, index) => {
          const Icon = getMessageIcon(message.type)
          return (
            <div
              key={message.id}
              className={cn(
                "p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 animate-in slide-in-from-right duration-300",
                index === 0 && "bg-neutral-50 dark:bg-neutral-800 border-2 border-emerald-200 dark:border-emerald-700"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
                opacity: 1 - (index * 0.1)
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon className={cn("w-4 h-4", getMessageColor(message.type))} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium capitalize",
                      getCategoryColor(message.category)
                    )}>
                      {message.category}
                    </span>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-mono",
                      message.type === 'warning' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                      message.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                      'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    )}>
                      {message.type}
                    </span>
                    <div className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTimeAgo(message.timestamp)}
                    </div>
                  </div>

                  <p className="text-sm text-foreground mb-2">
                    {message.message}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Confidence:
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${message.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                          {(message.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {messages.filter(m => m.type === 'discovery').length}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">Discoveries</div>
        </div>
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {messages.filter(m => m.type === 'success').length}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Validated</div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {messages.filter(m => m.type === 'recommendation').length}
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Suggestions</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {messages.filter(m => m.type === 'warning').length}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">Issues</div>
        </div>
      </div>
    </div>
  )
}