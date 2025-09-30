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
      console.error('Failed to fetch realtime stats:', error)
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Stats failed'
      }))
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchStats()

    // Set up interval for real-time updates
    const interval = setInterval(fetchStats, updateInterval)

    return () => clearInterval(interval)
  }, [fetchStats, updateInterval])

  return stats
}