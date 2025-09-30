import { useState, useEffect, useCallback } from 'react'

interface RealtimeStats {
  tokens: number
  sites: number
  scans: number
  loading: boolean
  error: string | null
  lastUpdate: Date | null
}

/**
 * Real-time database stats hook using optimized queries
 * Updates every 5 seconds for live header display
 */
export function useRealtimeStats(updateInterval = 5000) {
  const [stats, setStats] = useState<RealtimeStats>({
    tokens: 0,
    sites: 0,
    scans: 0,
    loading: true,
    error: null,
    lastUpdate: null
  })

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats/realtime', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) {
        // Silently skip 404s (Turbopack hot reload issue)
        if (response.status === 404) {
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      setStats({
        tokens: data.tokens || 0,
        sites: data.sites || 0,
        scans: data.scans || 0,
        loading: false,
        error: null,
        lastUpdate: new Date()
      })
    } catch (error) {
      // Silently handle errors - don't spam console during dev
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Stats failed'
      }))
    }
  }, []) // Empty deps - function never changes

  useEffect(() => {
    // Initial fetch
    fetchStats()

    // Set up interval for real-time updates
    const interval = setInterval(fetchStats, updateInterval)

    return () => clearInterval(interval)
  }, [updateInterval]) // Remove fetchStats from deps to prevent recreation

  return stats
}