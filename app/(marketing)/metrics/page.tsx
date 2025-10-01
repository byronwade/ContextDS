"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, TrendingUp, Search, Zap, Clock, CheckCircle, XCircle, BarChart3, Globe, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"

interface RealtimeStats {
  page_views: number
  api_requests: number
  scans: number
  searches: number
  avg_response_time: number
  successful_scans: number
  failed_scans: number
}

interface TimeSeriesPoint {
  time: string
  value: number
  avg_response_time?: number
  successful?: number
  failed?: number
}

interface TopEndpoint {
  endpoint: string
  request_count: number
  avg_response_time: number
  error_count: number
}

interface TopSearch {
  query: string
  search_count: number
  avg_results: number
  avg_response_time: number
}

interface RecentScan {
  domain: string
  status: string
  tokens_extracted: number
  confidence: number
  processing_time_ms: number
  created_at: string
}

export default function MetricsPage() {
  const [stats, setStats] = useState<RealtimeStats | null>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([])
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>([])
  const [topSearches, setTopSearches] = useState<TopSearch[]>([])
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [selectedMetric, setSelectedMetric] = useState<'page_views' | 'api_requests' | 'scans'>('page_views')
  const [timeRange, setTimeRange] = useState<'1' | '12' | '24'>('24')

  // Fetch realtime stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/metrics?type=summary')
        if (!response.ok) {
          console.error('Stats API error:', response.status, response.statusText)
          return
        }
        const data = await response.json()
        if (data.error) {
          console.error('Stats error:', data.error)
          return
        }
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch time series data
  useEffect(() => {
    const fetchTimeSeries = async () => {
      try {
        const response = await fetch(`/api/metrics?type=timeseries&metric=${selectedMetric}&hours=${timeRange}`)
        if (!response.ok) {
          console.error('Time series API error:', response.status)
          return
        }
        const { data } = await response.json()
        setTimeSeriesData(data || [])
      } catch (error) {
        console.error('Failed to fetch time series:', error)
      }
    }

    fetchTimeSeries()
    const interval = setInterval(fetchTimeSeries, 10000)
    return () => clearInterval(interval)
  }, [selectedMetric, timeRange])

  // Fetch top endpoints
  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const response = await fetch('/api/metrics?type=endpoints')
        if (!response.ok) {
          console.error('Endpoints API error:', response.status)
          return
        }
        const { endpoints } = await response.json()
        setTopEndpoints(endpoints || [])
      } catch (error) {
        console.error('Failed to fetch endpoints:', error)
      }
    }

    fetchEndpoints()
    const interval = setInterval(fetchEndpoints, 15000)
    return () => clearInterval(interval)
  }, [])

  // Fetch top searches
  useEffect(() => {
    const fetchSearches = async () => {
      try {
        const response = await fetch('/api/metrics?type=searches')
        if (!response.ok) {
          console.error('Searches API error:', response.status)
          return
        }
        const { searches } = await response.json()
        setTopSearches(searches || [])
      } catch (error) {
        console.error('Failed to fetch searches:', error)
      }
    }

    fetchSearches()
    const interval = setInterval(fetchSearches, 15000)
    return () => clearInterval(interval)
  }, [])

  // Fetch recent scans
  useEffect(() => {
    const fetchScans = async () => {
      try {
        const response = await fetch('/api/metrics?type=scans')
        if (!response.ok) {
          console.error('Scans API error:', response.status)
          return
        }
        const { scans } = await response.json()
        setRecentScans(scans || [])
      } catch (error) {
        console.error('Failed to fetch scans:', error)
      }
    }

    fetchScans()
    const interval = setInterval(fetchScans, 10000)
    return () => clearInterval(interval)
  }, [])

  const maxValue = Math.max(...timeSeriesData.map(d => d.value), 1)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader currentPage="metrics" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid - Grep Terminal Style */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-md border border-grep-2 bg-background p-4 font-mono">
            <div className="flex items-center justify-between mb-3">
              <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-grep-9 uppercase tracking-wide font-semibold">Page Views</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{(stats?.page_views || 0).toLocaleString()}</div>
            <p className="text-xs text-grep-9 mt-1">Last 5 minutes</p>
          </div>

          <div className="rounded-md border border-grep-2 bg-background p-4 font-mono">
            <div className="flex items-center justify-between mb-3">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs text-grep-9 uppercase tracking-wide font-semibold">API Requests</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{(stats?.api_requests || 0).toLocaleString()}</div>
            <p className="text-xs text-grep-9 mt-1">{stats?.avg_response_time || 0}ms avg</p>
          </div>

          <div className="rounded-md border border-grep-2 bg-background p-4 font-mono">
            <div className="flex items-center justify-between mb-3">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-grep-9 uppercase tracking-wide font-semibold">Scans</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{(stats?.scans || 0).toLocaleString()}</div>
            <p className="text-xs text-grep-9 mt-1">{stats?.successful_scans || 0} successful</p>
          </div>

          <div className="rounded-md border border-grep-2 bg-background p-4 font-mono">
            <div className="flex items-center justify-between mb-3">
              <Search className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs text-grep-9 uppercase tracking-wide font-semibold">Searches</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{(stats?.searches || 0).toLocaleString()}</div>
            <p className="text-xs text-grep-9 mt-1">Last 5 minutes</p>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-grep-2 bg-background flex items-center justify-between">
            <h2 className="text-xs font-semibold text-grep-9 uppercase tracking-wide">Activity Timeline</h2>
            <div className="flex items-center gap-2">
              {/* Metric Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-grep-2 p-1">
                <button
                  onClick={() => setSelectedMetric('page_views')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                    selectedMetric === 'page_views'
                      ? "bg-blue-500 text-white"
                      : "text-grep-9 hover:text-foreground"
                  )}
                >
                  Views
                </button>
                <button
                  onClick={() => setSelectedMetric('api_requests')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                    selectedMetric === 'api_requests'
                      ? "bg-purple-500 text-white"
                      : "text-grep-9 hover:text-foreground"
                  )}
                >
                  API
                </button>
                <button
                  onClick={() => setSelectedMetric('scans')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                    selectedMetric === 'scans'
                      ? "bg-emerald-500 text-white"
                      : "text-grep-9 hover:text-foreground"
                  )}
                >
                  Scans
                </button>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-grep-2 p-1">
                <button
                  onClick={() => setTimeRange('1')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                    timeRange === '1'
                      ? "bg-foreground text-background"
                      : "text-grep-9 hover:text-foreground"
                  )}
                >
                  1h
                </button>
                <button
                  onClick={() => setTimeRange('12')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                    timeRange === '12'
                      ? "bg-foreground text-background"
                      : "text-grep-9 hover:text-foreground"
                  )}
                >
                  12h
                </button>
                <button
                  onClick={() => setTimeRange('24')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                    timeRange === '24'
                      ? "bg-foreground text-background"
                      : "text-grep-9 hover:text-foreground"
                  )}
                >
                  24h
                </button>
              </div>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="p-4">
            <div className="h-64 flex items-end gap-1">
            {timeSeriesData.length > 0 ? (
              timeSeriesData.map((point, index) => {
                const height = (point.value / maxValue) * 100
                return (
                  <div
                    key={index}
                    className="flex-1 group relative"
                    style={{ minWidth: '4px' }}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        selectedMetric === 'page_views' && "bg-blue-500 hover:bg-blue-600",
                        selectedMetric === 'api_requests' && "bg-purple-500 hover:bg-purple-600",
                        selectedMetric === 'scans' && "bg-emerald-500 hover:bg-emerald-600"
                      )}
                      style={{ height: `${height}%` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
                        {point.value} {selectedMetric === 'api_requests' && point.avg_response_time && `(${point.avg_response_time}ms)`}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-grep-9 text-sm">
                Loading data...
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Endpoints */}
          <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-grep-2 bg-background">
              <h2 className="text-xs font-semibold text-grep-9 uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top API Endpoints
              </h2>
            </div>
            <div className="divide-y divide-grep-2">
              {topEndpoints.map((endpoint, index) => (
                <div key={index} className="px-4 py-3 hover:bg-background transition-colors">
                  <code className="text-xs text-foreground block truncate font-mono">{endpoint.endpoint}</code>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-grep-9">{endpoint.request_count} requests</span>
                    <span className="text-[10px] text-grep-9">{endpoint.avg_response_time}ms avg</span>
                    {endpoint.error_count > 0 && (
                      <span className="text-[10px] text-red-600 dark:text-red-400">{endpoint.error_count} errors</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Searches */}
          <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-grep-2 bg-background">
              <h2 className="text-xs font-semibold text-grep-9 uppercase tracking-wide flex items-center gap-2">
                <Search className="h-4 w-4" />
                Top Search Queries
              </h2>
            </div>
            <div className="divide-y divide-grep-2">
              {topSearches.map((search, index) => (
                <div key={index} className="px-4 py-3 hover:bg-background transition-colors">
                  <code className="text-xs text-foreground block truncate font-mono">{search.query}</code>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-grep-9">{search.search_count} searches</span>
                    <span className="text-[10px] text-grep-9">{search.avg_results} avg results</span>
                    <span className="text-[10px] text-grep-9">{search.avg_response_time}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="rounded-md border border-grep-2 bg-grep-0 overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-grep-2 bg-background">
            <h2 className="text-xs font-semibold text-grep-9 uppercase tracking-wide flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Scans
            </h2>
          </div>
          <div className="divide-y divide-grep-2">
            {recentScans.map((scan, index) => (
              <div key={index} className="px-4 py-3 hover:bg-background transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {scan.status === 'completed' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : scan.status === 'failed' ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  )}
                  <div>
                    <code className="text-xs text-foreground font-mono">{scan.domain}</code>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-grep-9">{scan.tokens_extracted} tokens</span>
                      <span className="text-[10px] text-grep-9">{scan.confidence}% confidence</span>
                      <span className="text-[10px] text-grep-9">{scan.processing_time_ms}ms</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-grep-9 font-mono">
                  {new Date(scan.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}

