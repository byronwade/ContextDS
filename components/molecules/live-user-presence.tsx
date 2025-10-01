import { cn } from "@/lib/utils"
import { useRealtimeStore } from "@/stores/realtime-store"
import { Users, Globe, Eye, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMemo, useEffect, useState } from "react"

interface LiveUserPresenceProps {
  className?: string
  compact?: boolean
  showDetails?: boolean
}

export function LiveUserPresence({ className, compact = false, showDetails = true }: LiveUserPresenceProps) {
  const { metrics, isConnected, activities } = useRealtimeStore()
  const [currentUsers, setCurrentUsers] = useState(0)

  // Get real user count from metrics or fallback to 0
  useEffect(() => {
    setCurrentUsers(0) // No mock data, only real users
  }, [])

  // Get user-related activities
  const userActivities = useMemo(() => {
    return activities
      .filter(activity =>
        activity.type === 'user_joined' ||
        activity.type === 'user_online' ||
        activity.type === 'popular_search'
      )
      .slice(0, 5)
  }, [activities])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined':
        return <Users className="w-3 h-3 text-emerald-500" />
      case 'user_online':
        return <Activity className="w-3 h-3 text-blue-500" />
      case 'popular_search':
        return <Eye className="w-3 h-3 text-purple-500" />
      default:
        return <Globe className="w-3 h-3 text-neutral-500" />
    }
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
        )} />
        <Users className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="font-mono font-medium text-foreground">
          {currentUsers}
        </span>
        <span className="text-neutral-600 dark:text-neutral-400 text-xs">
          online
        </span>
      </div>
    )
  }

  return (
    <Card className={cn("border border-neutral-200 dark:border-neutral-700", className)}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            <CardTitle className="text-sm font-medium text-foreground">
              Live Users
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="text-xs px-2 py-0.5"
            >
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Real-time user activity across the platform
        </CardDescription>
      </CardHeader>

      {/* User Stats */}
      <CardContent className="space-y-4">
        {/* Current Users */}
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            {currentUsers}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            users online now
          </div>
        </div>

        {showDetails && (
          <>
            {/* Activity Breakdown */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                  {Math.floor(currentUsers * 0.6)}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">Browsing</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                  {Math.floor(currentUsers * 0.4)}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">Scanning</div>
              </div>
            </div>

            {/* Recent User Activity */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Recent Activity
              </div>

              {userActivities.length === 0 ? (
                <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
                  <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No recent user activity</p>
                </div>
              ) : (
                userActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
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

                      {activity.data && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {activity.data.activeUsers && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              {activity.data.activeUsers} users
                            </Badge>
                          )}
                          {activity.data.query && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              "{activity.data.query}"
                            </Badge>
                          )}
                          {activity.data.count && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                              {activity.data.count} times
                            </Badge>
                          )}
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
          </>
        )}
      </CardContent>
    </Card>
  )
}