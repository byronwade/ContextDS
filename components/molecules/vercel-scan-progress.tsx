"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle, Loader2, Zap, Sparkles, Download, Share2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ScanStep {
  id: string
  label: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress?: number
  duration?: number
}

interface VercelScanProgressProps {
  domain: string
  isLoading: boolean
  progress: number
  currentStep?: string
  steps?: ScanStep[]
  error?: string | null
  result?: {
    tokensFound: number
    confidence: number
    processingTime: number
    summary?: any
  } | null
  onNewScan?: () => void
  onViewResults?: () => void
  onExport?: () => void
  onShare?: () => void
  className?: string
}

const defaultSteps: ScanStep[] = [
  {
    id: 'fetch',
    label: 'Fetching website',
    description: 'Loading page content and assets',
    status: 'pending'
  },
  {
    id: 'extract',
    label: 'Extracting CSS',
    description: 'Analyzing stylesheets and computed styles',
    status: 'pending'
  },
  {
    id: 'analyze',
    label: 'Analyzing patterns',
    description: 'Detecting design tokens and components',
    status: 'pending'
  },
  {
    id: 'generate',
    label: 'Generating tokens',
    description: 'Creating standardized design token format',
    status: 'pending'
  },
  {
    id: 'validate',
    label: 'Validating results',
    description: 'Ensuring token quality and completeness',
    status: 'pending'
  }
]

export function VercelScanProgress({
  domain,
  isLoading,
  progress,
  currentStep,
  steps = defaultSteps,
  error,
  result,
  onNewScan,
  onViewResults,
  onExport,
  onShare,
  className
}: VercelScanProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress)
    }, 100)
    return () => clearTimeout(timer)
  }, [progress])

  // Update step status based on progress
  useEffect(() => {
    if (isLoading && progress > 0) {
      const stepIndex = Math.floor((progress / 100) * steps.length)
      setCurrentStepIndex(Math.min(stepIndex, steps.length - 1))
    }
  }, [progress, isLoading, steps.length])

  // Update steps status
  const updatedSteps = steps.map((step, index) => {
    if (error) {
      return {
        ...step,
        status: index <= currentStepIndex ? 'error' as const : 'pending' as const
      }
    }
    if (!isLoading && result) {
      return { ...step, status: 'completed' as const }
    }
    if (index < currentStepIndex) {
      return { ...step, status: 'completed' as const }
    }
    if (index === currentStepIndex && isLoading) {
      return { ...step, status: 'running' as const }
    }
    return { ...step, status: 'pending' as const }
  })

  const getStepIcon = (step: ScanStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }

  return (
    <div className={cn(
      "w-full max-w-4xl mx-auto space-y-6",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full transition-colors duration-300",
            error ? "bg-destructive" :
            result ? "bg-success" :
            isLoading ? "bg-warning animate-pulse" : "bg-muted-foreground"
          )} />
          <h2 className="text-lg font-semibold text-foreground font-mono">
            {error ? 'Scan Failed' :
             result ? 'Scan Complete' :
             isLoading ? 'Scanning' : 'Ready to Scan'} • {domain}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono">
          {isLoading && (
            <span className="text-primary font-medium">
              {animatedProgress.toFixed(0)}%
            </span>
          )}
          {result && (
            <span className="text-success font-medium">
              {formatDuration(result.processingTime)}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(isLoading || result) && (
        <div className="space-y-2">
          <Progress
            value={result ? 100 : animatedProgress}
            className={cn(
              "h-2 bg-muted transition-all duration-500",
              result && "bg-success/20"
            )}
          />
          {isLoading && (
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>Extracting design tokens...</span>
              <span>{animatedProgress.toFixed(0)}% complete</span>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-destructive">Scan Failed</h3>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={onNewScan}
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      {(isLoading || result) && !error && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="space-y-3">
            {updatedSteps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md transition-all duration-200",
                  step.status === 'running' && "bg-primary/5 border border-primary/20",
                  step.status === 'completed' && "bg-success/5",
                  step.status === 'error' && "bg-destructive/5"
                )}
              >
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-medium text-sm",
                      step.status === 'completed' && "text-success",
                      step.status === 'running' && "text-primary",
                      step.status === 'error' && "text-destructive",
                      step.status === 'pending' && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    {step.status === 'running' && (
                      <span className="text-xs text-primary animate-pulse">
                        Working...
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success State */}
      {result && !error && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-success text-lg">
                Successfully scanned {domain}
              </h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">{result.tokensFound}</span>
                  <span className="text-muted-foreground">tokens found</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span>
                  <span className="text-muted-foreground">confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">{formatDuration(result.processingTime)}</span>
                  <span className="text-muted-foreground">processing</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={onViewResults}
                  className="bg-gradient-to-r from-primary to-chart-5 text-primary-foreground hover:from-primary/90 hover:to-chart-5/90"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Results
                </Button>
                <Button
                  onClick={onExport}
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Tokens
                </Button>
                <Button
                  onClick={onShare}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={onNewScan}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  New Scan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}