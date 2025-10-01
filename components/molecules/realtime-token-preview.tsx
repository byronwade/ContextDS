"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface RecentColor {
  name: string
  value: string
  siteDomain: string
  createdAt: string
}

interface RealtimeTokenPreviewProps {
  className?: string
}

export function RealtimeTokenPreview({ className }: RealtimeTokenPreviewProps) {
  const [colors, setColors] = useState<RecentColor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const fetchColors = async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await fetch('/api/tokens/recent-colors')
        const data = await response.json()

        // Use real data if available, otherwise fallback
        if (data && data.length > 0) {
          setColors(data)
        } else {
          // Fallback colors when no real data
          setColors([
            { name: 'primary', value: '#0070f3', siteDomain: 'vercel.com', createdAt: new Date().toISOString() },
            { name: 'secondary', value: '#7928ca', siteDomain: 'github.com', createdAt: new Date().toISOString() },
            { name: 'accent', value: '#ff0080', siteDomain: 'stripe.com', createdAt: new Date().toISOString() },
            { name: 'success', value: '#50e3c2', siteDomain: 'linear.app', createdAt: new Date().toISOString() }
          ])
        }
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Failed to fetch recent colors:', error)
        // Only set fallback if we don't have any colors yet
        if (colors.length === 0) {
          setColors([
            { name: 'primary', value: '#0070f3', siteDomain: 'vercel.com', createdAt: new Date().toISOString() },
            { name: 'secondary', value: '#7928ca', siteDomain: 'github.com', createdAt: new Date().toISOString() },
            { name: 'accent', value: '#ff0080', siteDomain: 'stripe.com', createdAt: new Date().toISOString() },
            { name: 'success', value: '#50e3c2', siteDomain: 'linear.app', createdAt: new Date().toISOString() }
          ])
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    // Initial load with longer delay to show loading state
    setTimeout(() => fetchColors(), 800)

    // Refresh colors every 30 seconds
    const interval = setInterval(() => fetchColors(true), 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center gap-4 px-5 py-4 rounded-xl border border-grep-2 bg-grep-0", className)}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-grep-2 animate-pulse" />
          <div className="w-10 h-10 rounded-lg bg-grep-2 animate-pulse" />
          <div className="w-10 h-10 rounded-lg bg-grep-2 animate-pulse" />
          <div className="w-10 h-10 rounded-lg bg-grep-2 animate-pulse" />
        </div>
        <div className="w-px h-10 bg-grep-3" />
        <div className="text-left">
          <div className="w-24 h-3 bg-grep-2 animate-pulse rounded mb-1" />
          <div className="w-32 h-3 bg-grep-2 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center gap-4 px-5 py-4 rounded-xl border border-grep-2 bg-grep-0", className)}>
      <div className="flex items-center gap-2">
        {colors.slice(0, 4).map((color, index) => (
          <div
            key={`${color.value}-${index}`}
            className={cn(
              "group relative w-10 h-10 rounded-lg border-2 border-grep-3 shadow-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-md",
              refreshing && "animate-pulse"
            )}
            style={{ backgroundColor: color.value }}
            title={`${color.name} from ${color.siteDomain}`}
          >
            <div className="absolute inset-0 bg-black/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            {refreshing && (
              <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse" />
            )}
          </div>
        ))}
      </div>
      <div className="w-px h-10 bg-grep-3" />
      <div className="text-left">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[10px] text-grep-9 uppercase tracking-wide font-semibold">
            Live Tokens
          </p>
          {refreshing && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
        <code className="text-xs text-foreground font-mono">
          {colors.slice(0, 2).map(c => c.value).join(', ')}...
        </code>
        {lastUpdate && (
          <div className="text-[9px] text-grep-8 mt-0.5 font-mono">
            {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}