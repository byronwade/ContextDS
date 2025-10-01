import { cn } from "@/lib/utils"
import { useRealtimeStore } from "@/stores/realtime-store"
import { TrendingUp, Globe, Zap, Users, Activity, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface LiveMetricsDashboardProps {
  className?: string
  layout?: 'grid' | 'horizontal' | 'compact'
}

export function LiveMetricsDashboard({ className, layout = 'grid' }: LiveMetricsDashboardProps) {
  const { metrics, isConnected, lastUpdate } = useRealtimeStore()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const metricsData = [
    {
      title: "Total Scans",
      value: metrics.totalScans,
      icon: Zap,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      change: "+12% today"
    },
    {
      title: "Design Tokens",
      value: metrics.totalTokens,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      change: "+8% today"
    },
    {
      title: "Sites Analyzed",
      value: metrics.totalSites,
      icon: Globe,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      change: "+24% today"
    },
    {
      title: "Active Scans",
      value: metrics.activeScans,
      icon: Activity,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      change: "Live",
      isLive: true
    }
  ]

  if (layout === 'compact') {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        {metricsData.map((metric, index) => (
          <div key={metric.title} className="flex items-center gap-2">
            <metric.icon className={cn("w-4 h-4", metric.color)} />
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-mono font-bold text-foreground">
                {formatNumber(metric.value)}
              </span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {metric.title.split(' ')[0].toLowerCase()}
              </span>
            </div>
            {metric.isLive && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
        ))}
      </div>
    )
  }

  if (layout === 'horizontal') {
    return (
      <div className={cn("flex gap-4 overflow-x-auto", className)}>
        {metricsData.map((metric) => (
          <Card key={metric.title} className={cn(
            "min-w-48 border",
            metric.borderColor,
            metric.bgColor
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className={cn("text-xs", metric.color)}>
                  {metric.title}
                </CardDescription>
                <metric.icon className={cn("w-4 h-4", metric.color)} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end justify-between">
                <div className="text-2xl font-mono font-bold text-foreground">
                  {formatNumber(metric.value)}
                </div>
                <div className={cn(
                  "text-xs",
                  metric.isLive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-600 dark:text-neutral-400"
                )}>
                  {metric.change}
                  {metric.isLive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block ml-1" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-neutral-600 dark:text-neutral-400">
            {isConnected ? 'Live Data Stream' : 'Disconnected'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-neutral-500 font-mono">
            Updated {getTimeAgo(lastUpdate)}
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsData.map((metric) => (
          <Card key={metric.title} className={cn(
            "border transition-all duration-300 hover:shadow-lg",
            metric.borderColor,
            metric.bgColor
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {metric.title}
              </CardTitle>
              <metric.icon className={cn("w-4 h-4", metric.color)} />
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-mono font-bold text-foreground">
                    {formatNumber(metric.value)}
                  </div>
                  <p className={cn(
                    "text-xs mt-1",
                    metric.isLive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-600 dark:text-neutral-400"
                  )}>
                    {metric.change}
                  </p>
                </div>
                {metric.isLive && (
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                      LIVE
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Domains */}
      {metrics.topDomains && metrics.topDomains.length > 0 && (
        <Card className="border border-neutral-200 dark:border-neutral-700">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Popular Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topDomains.slice(0, 5).map((item, index) => (
                <div key={item.domain} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 w-4">#{index + 1}</span>
                    <span className="text-sm text-foreground font-mono">
                      {item.domain}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    {item.scans} scans
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}