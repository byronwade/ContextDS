import { cn } from "@/lib/utils"
import { useRealtimeStore } from "@/stores/realtime-store"
import { Activity, Zap, Globe, Users, Target, Clock } from "lucide-react"
import { useMemo } from "react"

interface LiveActivityFeedProps {
  className?: string
  limit?: number
  compact?: boolean
}

export function LiveActivityFeed({ className, limit = 10, compact = false }: LiveActivityFeedProps) {
  const { activities, isConnected, lastUpdate } = useRealtimeStore()

  const recentActivities = useMemo(() => {
    // Filter out mock activities - only show real activities
    return activities.filter(activity => activity.isReal === true).slice(0, limit)
  }, [activities, limit])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'scan_started':
        return <Zap className="w-3 h-3 text-blue-500" />
      case 'scan_completed':
        return <Target className="w-3 h-3 text-emerald-500" />
      case 'tokens_extracted':
        return <Zap className="w-3 h-3 text-purple-500" />
      case 'user_joined':
        return <Users className="w-3 h-3 text-orange-500" />
      case 'site_analyzed':
        return <Globe className="w-3 h-3 text-cyan-500" />
      default:
        return <Activity className="w-3 h-3 text-neutral-500" />
    }
  }

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
          )} />
          <span className="font-medium">Live Activity</span>
          {lastUpdate && (
            <span className="font-mono">{getTimeAgo(lastUpdate)}</span>
          )}
        </div>
        <div className="space-y-1">
          {recentActivities.slice(0, 3).map((activity) => (
            <div key={activity.id} className="flex items-center gap-2 text-xs">
              {getActivityIcon(activity.type)}
              <span className="text-neutral-700 dark:text-neutral-300 truncate">
                {activity.message}
              </span>
              <span className="text-neutral-500 font-mono ml-auto">
                {getTimeAgo(activity.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          <h3 className="font-medium text-foreground">Live Activity</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Activity Stream */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {recentActivities.length === 0 ? (
          <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Waiting for activity...</p>
          </div>
        ) : (
          recentActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg transition-all duration-300",
                index === 0 && "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              )}
              style={{
                opacity: 1 - (index * 0.1),
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="mt-1">
                {getActivityIcon(activity.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {activity.message}
                </p>

                {activity.domain && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    {activity.domain}
                  </p>
                )}

                {activity.data && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(activity.data).slice(0, 2).map(([key, value]) => (
                      <span key={key} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-xs rounded">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-neutral-500 font-mono shrink-0">
                {getTimeAgo(activity.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
            Last update: {getTimeAgo(lastUpdate)}
          </div>
        </div>
      )}
    </div>
  )
}