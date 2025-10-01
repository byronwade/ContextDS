import { cn } from "@/lib/utils"
import { useRealtimeStore } from "@/stores/realtime-store"
import { Clock, Zap, Users, Timer } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"

interface LiveScanQueueProps {
  className?: string
  compact?: boolean
  limit?: number
}

export function LiveScanQueue({ className, compact = false, limit = 5 }: LiveScanQueueProps) {
  const { metrics, isConnected, activities } = useRealtimeStore()

  // Get real queue-related activities only
  const queueActivities = useMemo(() => {
    return activities
      .filter(activity =>
        activity.isReal === true && (
          activity.type === 'scan_started' ||
          activity.type === 'scan_completed' ||
          activity.type === 'queue_updated'
        )
      )
      .slice(0, limit)
  }, [activities, limit])

  const getTimeFromNow = (timestamp: number) => {
    const seconds = Math.floor((timestamp - Date.now()) / 1000)
    if (seconds <= 0) return 'Processing...'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'scan_started':
        return 'bg-blue-500'
      case 'scan_completed':
        return 'bg-emerald-500'
      case 'queue_updated':
        return 'bg-orange-500'
      default:
        return 'bg-neutral-500'
    }
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
          )} />
          <span className="font-medium">Scan Queue</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            {metrics?.activeScans || 0} active
          </Badge>
        </div>
        <div className="space-y-1">
          {queueActivities.slice(0, 3).map((activity) => (
            <div key={activity.id} className="flex items-center gap-2 text-xs">
              <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(activity.type))} />
              <span className="text-neutral-700 dark:text-neutral-300 truncate flex-1">
                {activity.domain}
              </span>
              {activity.data?.estimatedTime && (
                <span className="text-neutral-500 font-mono">
                  {activity.data.estimatedTime}s
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("border border-neutral-200 dark:border-neutral-700", className)}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <CardTitle className="text-sm font-medium text-foreground">
              Scan Queue
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        <CardDescription className="text-xs">
          {metrics?.queueLength || 0} sites in queue • {metrics?.avgProcessingTime || 0}s avg
        </CardDescription>
      </CardHeader>

      {/* Queue Status */}
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
              {metrics?.activeScans || 0}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Active</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-mono font-bold text-orange-600 dark:text-orange-400">
              {metrics?.queueLength || 0}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Queued</div>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {metrics?.avgProcessingTime || 0}s
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Avg Time</div>
          </div>
        </div>

        {/* Recent Queue Activity */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Recent Activity
          </div>

          {queueActivities.length === 0 ? (
            <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No recent queue activity</p>
            </div>
          ) : (
            queueActivities.map((activity, index) => (
              <div
                key={activity.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                  index === 0 && "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                )}
                style={{
                  opacity: 1 - (index * 0.15),
                  animationDelay: `${index * 50}ms`
                }}
              >
                <div className={cn("w-2 h-2 rounded-full", getStatusColor(activity.type))} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-foreground truncate">
                      {activity.domain}
                    </p>
                    {activity.data?.position && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        #{activity.data.position}
                      </Badge>
                    )}
                  </div>

                  {activity.data?.estimatedTime && (
                    <div className="flex items-center gap-1 mt-1">
                      <Timer className="w-3 h-3 text-neutral-500" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {activity.data.estimatedTime}s estimated
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-neutral-500 font-mono shrink-0">
                  {Math.floor((Date.now() - activity.timestamp) / 1000)}s ago
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}