import { TrendingUp, Palette, Type, Box } from 'lucide-react'

/**
 * StatsSection - Server Component
 *
 * Fetches stats server-side and streams to client.
 * No client-side JavaScript required for display.
 */
export async function StatsSection() {
  // Fetch stats server-side
  const stats = await fetchStats()

  return (
    <div className="border-b border-gray-200 bg-gradient-to-b from-gray-50/50 to-white py-12 dark:border-gray-800 dark:from-gray-900/50 dark:to-black">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <StatCard
            icon={<Box className="h-5 w-5" />}
            label="Sites Analyzed"
            value={stats.sites.toLocaleString()}
            trend="+12% this week"
          />
          <StatCard
            icon={<Palette className="h-5 w-5" />}
            label="Design Tokens"
            value={stats.tokens.toLocaleString()}
            trend={`${stats.categories.colors} colors`}
          />
          <StatCard
            icon={<Type className="h-5 w-5" />}
            label="Typography Sets"
            value={stats.categories.typography.toLocaleString()}
            trend="Across all sites"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Active Scans"
            value={stats.scans.toLocaleString()}
            trend="Last 30 days"
          />
        </div>

        {/* Recent Activity */}
        {stats.recentActivity && stats.recentActivity.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h3 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
              Recent Activity
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentActivity.slice(0, 6).map((activity, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {activity.domain || 'Unknown site'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {activity.tokens} tokens • {formatDate(activity.scannedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: string
}

function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {trend && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {trend}
        </div>
      )}
    </div>
  )
}

// Server-side fetch function
async function fetchStats() {
  try {
    // Use internal URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001'

    const response = await fetch(`${baseUrl}/api/stats`, {
      // Revalidate every 60 seconds
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Stats API returned ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    // Return fallback data
    return {
      sites: 0,
      tokens: 0,
      scans: 0,
      tokenSets: 0,
      categories: {
        colors: 0,
        typography: 0,
        spacing: 0,
        shadows: 0,
        radius: 0,
        motion: 0,
      },
      averageConfidence: 0,
      recentActivity: [],
      popularSites: [],
    }
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Recently'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}