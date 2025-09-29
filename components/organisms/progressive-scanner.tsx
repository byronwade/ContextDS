"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Zap,
  Shield,
  Eye,
  Palette,
  Code,
  Hash,
  Activity,
  Gauge,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ScanningStrategy {
  id: string
  name: string
  description: string
  icon: any
  priority: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  duration?: number
  dataSize?: number
  error?: string
  fallbackTriggered?: boolean
  cacheHit?: boolean
}

export interface ScanProgress {
  overallProgress: number
  currentStrategy: string
  strategies: ScanningStrategy[]
  dataQuality: number
  performance: {
    totalDuration: number
    cacheEfficiency: number
    bytesProcessed: number
    strategiesCompleted: number
  }
  realTimeData: {
    tokensFound: number
    colorsExtracted: number
    componentsDetected: number
    frameworksDetected: string[]
  }
  fallbacks: Array<{
    original: string
    fallback: string
    reason: string
    timestamp: string
  }>
}

interface ProgressiveScannerProps {
  url: string
  onComplete: (result: any) => void
  onError: (error: string) => void
  className?: string
}

const strategyConfigs: Omit<ScanningStrategy, 'status' | 'progress' | 'duration' | 'dataSize'>[] = [
  {
    id: 'static-css',
    name: 'Static CSS Extraction',
    description: 'Extracting external stylesheets and inline styles',
    icon: Code,
    priority: 1
  },
  {
    id: 'computed-styles',
    name: 'Computed Styles Analysis',
    description: 'Analyzing rendered CSS and computed values',
    icon: Activity,
    priority: 2
  },
  {
    id: 'runtime-detection',
    name: 'Runtime CSS Detection',
    description: 'Detecting CSS-in-JS and dynamic styles',
    icon: Zap,
    priority: 3
  },
  {
    id: 'framework-detection',
    name: 'Framework Detection',
    description: 'Identifying design systems and CSS frameworks',
    icon: Shield,
    priority: 4
  },
  {
    id: 'custom-properties',
    name: 'Custom Properties',
    description: 'Extracting CSS custom properties and design tokens',
    icon: Hash,
    priority: 5
  },
  {
    id: 'component-analysis',
    name: 'Component Pattern Analysis',
    description: 'Analyzing UI components and interaction patterns',
    icon: Palette,
    priority: 6
  },
  {
    id: 'brand-analysis',
    name: 'Brand Analysis',
    description: 'Extracting brand colors, logos, and visual identity',
    icon: Eye,
    priority: 7
  },
  {
    id: 'accessibility-analysis',
    name: 'Accessibility Analysis',
    description: 'Checking color contrast, ARIA usage, and semantic structure',
    icon: CheckCircle,
    priority: 8
  },
  {
    id: 'performance-analysis',
    name: 'Performance Analysis',
    description: 'Analyzing CSS performance and optimization opportunities',
    icon: Gauge,
    priority: 9
  },
  {
    id: 'visual-analysis',
    name: 'Visual Screenshot Analysis',
    description: 'Capturing and analyzing visual layout across viewports',
    icon: Eye,
    priority: 10
  }
]

export function ProgressiveScanner({ url, onComplete, onError, className }: ProgressiveScannerProps) {
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    overallProgress: 0,
    currentStrategy: '',
    strategies: strategyConfigs.map(config => ({
      ...config,
      status: 'pending',
      progress: 0
    })),
    dataQuality: 0,
    performance: {
      totalDuration: 0,
      cacheEfficiency: 0,
      bytesProcessed: 0,
      strategiesCompleted: 0
    },
    realTimeData: {
      tokensFound: 0,
      colorsExtracted: 0,
      componentsDetected: 0,
      frameworksDetected: []
    },
    fallbacks: []
  })

  const [activeTab, setActiveTab] = useState("progress")
  const [isScanning, setIsScanning] = useState(false)

  const startScan = async () => {
    setIsScanning(true)
    const startTime = Date.now()

    try {
      // Initialize strategies
      setScanProgress(prev => ({
        ...prev,
        currentStrategy: strategyConfigs[0].name,
        strategies: prev.strategies.map(s => ({ ...s, status: 'pending', progress: 0 }))
      }))

      // Simulate progressive scanning
      for (let i = 0; i < strategyConfigs.length; i++) {
        const strategy = strategyConfigs[i]

        // Update current strategy
        setScanProgress(prev => ({
          ...prev,
          currentStrategy: strategy.name,
          overallProgress: (i / strategyConfigs.length) * 100,
          strategies: prev.strategies.map(s =>
            s.id === strategy.id
              ? { ...s, status: 'running', progress: 0 }
              : s
          )
        }))

        // Simulate strategy execution with progress updates
        const strategyStartTime = Date.now()

        for (let progress = 0; progress <= 100; progress += Math.random() * 15 + 5) {
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))

          setScanProgress(prev => ({
            ...prev,
            strategies: prev.strategies.map(s =>
              s.id === strategy.id
                ? { ...s, progress: Math.min(100, progress) }
                : s
            )
          }))
        }

        const strategyDuration = Date.now() - strategyStartTime

        // Simulate strategy completion with random success/failure
        const success = Math.random() > 0.15 // 85% success rate
        const dataSize = Math.floor(Math.random() * 50000) + 5000

        if (success) {
          setScanProgress(prev => ({
            ...prev,
            strategies: prev.strategies.map(s =>
              s.id === strategy.id
                ? {
                    ...s,
                    status: 'completed',
                    progress: 100,
                    duration: strategyDuration,
                    dataSize,
                    cacheHit: Math.random() > 0.7
                  }
                : s
            ),
            performance: {
              ...prev.performance,
              strategiesCompleted: prev.performance.strategiesCompleted + 1,
              bytesProcessed: prev.performance.bytesProcessed + dataSize
            },
            realTimeData: {
              ...prev.realTimeData,
              tokensFound: prev.realTimeData.tokensFound + Math.floor(Math.random() * 8) + 2,
              colorsExtracted: prev.realTimeData.colorsExtracted + Math.floor(Math.random() * 5) + 1,
              componentsDetected: prev.realTimeData.componentsDetected + Math.floor(Math.random() * 3),
              frameworksDetected: strategy.id === 'framework-detection'
                ? ['Tailwind CSS', 'React']
                : prev.realTimeData.frameworksDetected
            }
          }))
        } else {
          // Simulate fallback
          const fallbackStrategy = `${strategy.name} Fallback`

          setScanProgress(prev => ({
            ...prev,
            strategies: prev.strategies.map(s =>
              s.id === strategy.id
                ? {
                    ...s,
                    status: 'failed',
                    progress: 100,
                    duration: strategyDuration,
                    error: 'Network timeout',
                    fallbackTriggered: true
                  }
                : s
            ),
            fallbacks: [
              ...prev.fallbacks,
              {
                original: strategy.name,
                fallback: fallbackStrategy,
                reason: 'Network timeout - trying alternative approach',
                timestamp: new Date().toISOString()
              }
            ]
          }))

          // Simulate fallback execution
          await new Promise(resolve => setTimeout(resolve, 1000))

          setScanProgress(prev => ({
            ...prev,
            strategies: prev.strategies.map(s =>
              s.id === strategy.id
                ? {
                    ...s,
                    status: 'completed',
                    dataSize: Math.floor(dataSize * 0.7), // Partial data
                    fallbackTriggered: true
                  }
                : s
            ),
            performance: {
              ...prev.performance,
              strategiesCompleted: prev.performance.strategiesCompleted + 1,
              bytesProcessed: prev.performance.bytesProcessed + Math.floor(dataSize * 0.7)
            }
          }))
        }

        // Update data quality
        const completedStrategies = i + 1
        const successfulStrategies = scanProgress.strategies.filter(s => s.status === 'completed').length
        const dataQuality = (successfulStrategies / strategyConfigs.length) * 100

        setScanProgress(prev => ({
          ...prev,
          dataQuality,
          performance: {
            ...prev.performance,
            totalDuration: Date.now() - startTime,
            cacheEfficiency: prev.strategies.filter(s => s.cacheHit).length / Math.max(1, completedStrategies) * 100
          }
        }))
      }

      // Complete scan
      setScanProgress(prev => ({
        ...prev,
        overallProgress: 100,
        currentStrategy: 'Scan completed!'
      }))

      // Mock final result
      const mockResult = {
        url,
        domain: new URL(url).hostname,
        status: 'completed',
        tokensExtracted: scanProgress.realTimeData.tokensFound,
        componentsFound: scanProgress.realTimeData.componentsDetected,
        frameworksDetected: scanProgress.realTimeData.frameworksDetected,
        dataQuality: scanProgress.dataQuality,
        performance: scanProgress.performance
      }

      onComplete(mockResult)

    } catch (error) {
      onError(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    if (url && !isScanning) {
      startScan()
    }
  }, [url])

  const getStrategyIcon = (strategy: ScanningStrategy) => {
    const Icon = strategy.icon

    switch (strategy.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />
      case 'failed':
        return strategy.fallbackTriggered
          ? <RefreshCw className="h-5 w-5 text-warning" />
          : <XCircle className="h-5 w-5 text-destructive" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStrategyStatus = (strategy: ScanningStrategy) => {
    switch (strategy.status) {
      case 'completed':
        return strategy.fallbackTriggered ? 'Recovered' : 'Success'
      case 'failed':
        return 'Failed'
      case 'running':
        return 'Running'
      case 'skipped':
        return 'Skipped'
      default:
        return 'Pending'
    }
  }

  return (
    <div className={cn("space-context-xl", className)}>
      {/* Overall Progress Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-context-sm">
              <CardTitle className="text-headline">Scanning {new URL(url).hostname}</CardTitle>
              <p className="text-subtitle">{scanProgress.currentStrategy}</p>
            </div>
            <div className="text-right space-context-xs">
              <div className="text-context-3xl font-bold text-primary">
                {Math.round(scanProgress.overallProgress)}%
              </div>
              <div className="text-caption">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={scanProgress.overallProgress}
            className="h-3 bg-muted/50"
          />
          <div className="flex items-center justify-between mt-4 text-caption text-muted-foreground">
            <span>{scanProgress.performance.strategiesCompleted} of {strategyConfigs.length} strategies completed</span>
            <span>
              {scanProgress.performance.totalDuration > 0 &&
                `${Math.round(scanProgress.performance.totalDuration / 1000)}s elapsed`
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-interactive">
          <CardContent className="p-6 text-center">
            <div className="text-context-2xl font-bold text-chart-2">
              {scanProgress.realTimeData.tokensFound}
            </div>
            <div className="text-caption">Tokens Found</div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-6 text-center">
            <div className="text-context-2xl font-bold text-chart-3">
              {scanProgress.realTimeData.colorsExtracted}
            </div>
            <div className="text-caption">Colors Extracted</div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-6 text-center">
            <div className="text-context-2xl font-bold text-chart-4">
              {scanProgress.realTimeData.componentsDetected}
            </div>
            <div className="text-caption">Components</div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-6 text-center">
            <div className="text-context-2xl font-bold text-primary">
              {Math.round(scanProgress.dataQuality)}%
            </div>
            <div className="text-caption">Data Quality</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Progress Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Strategy Progress</TabsTrigger>
          <TabsTrigger value="data">Live Data</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="fallbacks">Fallbacks</TabsTrigger>
        </TabsList>

        {/* Strategy Progress Tab */}
        <TabsContent value="progress" className="space-context-lg">
          <div className="space-context-md">
            {scanProgress.strategies.map((strategy) => (
              <Card
                key={strategy.id}
                className={cn(
                  "transition-all duration-300",
                  strategy.status === 'running' && "border-primary/40 bg-primary/5",
                  strategy.status === 'completed' && !strategy.fallbackTriggered && "border-success/40 bg-success/5",
                  strategy.status === 'failed' && "border-destructive/40 bg-destructive/5",
                  strategy.fallbackTriggered && "border-warning/40 bg-warning/5"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {getStrategyIcon(strategy)}
                      <div>
                        <h4 className="text-body font-medium">{strategy.name}</h4>
                        <p className="text-caption text-muted-foreground">{strategy.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {strategy.cacheHit && (
                        <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                          Cached
                        </Badge>
                      )}
                      {strategy.fallbackTriggered && (
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          Fallback
                        </Badge>
                      )}
                      <Badge
                        variant={
                          strategy.status === 'completed' ? 'default' :
                          strategy.status === 'failed' ? 'destructive' :
                          strategy.status === 'running' ? 'secondary' :
                          'outline'
                        }
                      >
                        {getStrategyStatus(strategy)}
                      </Badge>
                    </div>
                  </div>

                  {strategy.status === 'running' && (
                    <div className="space-context-sm">
                      <Progress value={strategy.progress} className="h-2" />
                      <div className="flex justify-between text-caption text-muted-foreground">
                        <span>{Math.round(strategy.progress)}% complete</span>
                        <span>
                          {strategy.duration && `${Math.round(strategy.duration / 1000)}s`}
                        </span>
                      </div>
                    </div>
                  )}

                  {strategy.status === 'completed' && (
                    <div className="flex items-center justify-between text-caption text-muted-foreground">
                      <span>
                        {strategy.dataSize && `${Math.round(strategy.dataSize / 1024)}KB processed`}
                      </span>
                      <span>
                        {strategy.duration && `Completed in ${Math.round(strategy.duration / 1000)}s`}
                      </span>
                    </div>
                  )}

                  {strategy.status === 'failed' && strategy.error && (
                    <Alert className="mt-4 border-destructive/20 bg-destructive/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-caption">
                        {strategy.error}
                        {strategy.fallbackTriggered && " - Fallback strategy activated"}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Live Data Tab */}
        <TabsContent value="data" className="space-context-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Design Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-context-md">
                <div className="space-context-sm">
                  <div className="flex justify-between">
                    <span className="text-body">Total Tokens</span>
                    <span className="font-bold">{scanProgress.realTimeData.tokensFound}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body">Colors</span>
                    <span className="font-bold">{scanProgress.realTimeData.colorsExtracted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body">Components</span>
                    <span className="font-bold">{scanProgress.realTimeData.componentsDetected}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Detected Frameworks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-context-sm">
                  {scanProgress.realTimeData.frameworksDetected.length > 0 ? (
                    scanProgress.realTimeData.frameworksDetected.map((framework, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {framework}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-caption text-muted-foreground">
                      No frameworks detected yet...
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-context-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Processing Speed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-context-md">
                <div className="text-center">
                  <div className="text-context-2xl font-bold">
                    {Math.round(scanProgress.performance.bytesProcessed / Math.max(1, scanProgress.performance.totalDuration / 1000))}
                  </div>
                  <div className="text-caption">bytes/second</div>
                </div>
                <Progress
                  value={scanProgress.performance.cacheEfficiency}
                  className="h-2 mt-4"
                />
                <div className="text-caption text-center mt-2">
                  {Math.round(scanProgress.performance.cacheEfficiency)}% cache efficiency
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Data Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-context-md">
                <div className="text-center">
                  <div className="text-context-2xl font-bold text-primary">
                    {Math.round(scanProgress.dataQuality)}%
                  </div>
                  <div className="text-caption">Quality Score</div>
                </div>
                <Progress
                  value={scanProgress.dataQuality}
                  className="h-2 mt-4"
                />
                <div className="text-caption text-center mt-2">
                  Based on successful extractions
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-context-md">
                <div className="space-context-sm">
                  <div className="flex justify-between">
                    <span className="text-body">Total Duration</span>
                    <span className="font-bold">
                      {Math.round(scanProgress.performance.totalDuration / 1000)}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body">Avg per Strategy</span>
                    <span className="font-bold">
                      {scanProgress.performance.strategiesCompleted > 0
                        ? Math.round(scanProgress.performance.totalDuration / scanProgress.performance.strategiesCompleted / 1000)
                        : 0}s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fallbacks Tab */}
        <TabsContent value="fallbacks" className="space-context-lg">
          {scanProgress.fallbacks.length > 0 ? (
            <div className="space-context-md">
              {scanProgress.fallbacks.map((fallback, index) => (
                <Card key={index} className="border-warning/20 bg-warning/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <RefreshCw className="h-5 w-5 text-warning mt-1" />
                      <div className="flex-1">
                        <h4 className="text-body font-medium mb-2">
                          {fallback.original} → {fallback.fallback}
                        </h4>
                        <p className="text-caption text-muted-foreground mb-2">
                          {fallback.reason}
                        </p>
                        <div className="text-caption text-muted-foreground">
                          {new Date(fallback.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success/60" />
                <h3 className="text-title mb-2">No Fallbacks Needed</h3>
                <p className="text-caption text-muted-foreground">
                  All extraction strategies executed successfully without requiring fallback procedures.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {scanProgress.overallProgress === 100 && (
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setActiveTab("data")}
            className="shadow-md hover:shadow-lg"
          >
            View Results
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setScanProgress(prev => ({
                ...prev,
                overallProgress: 0,
                strategies: prev.strategies.map(s => ({ ...s, status: 'pending', progress: 0 }))
              }))
              startScan()
            }}
            className="shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Rescan
          </Button>
        </div>
      )}
    </div>
  )
}