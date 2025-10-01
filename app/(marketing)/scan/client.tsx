"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useScanStore, type ScanResult } from "@/stores/scan-store"

// Force dynamic rendering for scan page (uses searchParams)
export const dynamic = 'force-dynamic'
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { useRealtimeStore } from "@/stores/realtime-store"
import { LiveActivityFeed } from "@/components/molecules/live-activity-feed"
import { LiveMetricsDashboard } from "@/components/molecules/live-metrics-dashboard"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { ThemeToggle } from "@/components/atoms/theme-toggle"

import { ProgressiveScanner } from "@/components/organisms/progressive-scanner"
import { VercelHeader } from "@/components/organisms/vercel-header"

import {
  Search,
  Zap,
  BarChart3,
  Sparkles,
  ArrowRight,
  Eye,
  Palette,
  Type,
  Ruler,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type ViewMode = "scan" | "results"

export default function ScanClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get initial URL from search params
  const initialUrl = searchParams.get('url') || ''

  // URL and scan state
  const [url, setUrl] = useState(initialUrl)
  const [viewMode, setViewMode] = useState<ViewMode>(initialUrl ? "scan" : "scan")

  // Current scan state
  const [currentScanId, setCurrentScanId] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  // Real-time stats
  const realtimeStats = useRealtimeStats(5000)
  const { metrics: liveMetrics, isConnected, activities } = useRealtimeStore()

  // Scan store
  const {
    scans,
    isScanning,
    startScan,
    addScanResult,
    getScanById,
    clearScanById
  } = useScanStore()

  // Start scan on mount if URL provided
  useEffect(() => {
    if (initialUrl && !isScanning) {
      handleScan(initialUrl)
    }
  }, [initialUrl])

  // Handle URL scanning
  const handleScan = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return

    const scanId = Date.now().toString()
    setCurrentScanId(scanId)
    setScanResult(null)
    setViewMode("scan")

    try {
      await startScan(targetUrl, scanId)
    } catch (error) {
      console.error('Scan failed:', error)
    }
  }, [startScan])

  // Monitor current scan progress
  useEffect(() => {
    if (currentScanId) {
      const scan = getScanById(currentScanId)
      if (scan?.result) {
        setScanResult(scan.result)
        if (scan.result.status === 'completed' || scan.result.status === 'failed') {
          setViewMode("results")
        }
      }
    }
  }, [scans, currentScanId, getScanById])

  const handleBack = () => {
    setViewMode("scan")
    setScanResult(null)
    setCurrentScanId(null)
    router.push('/scan')
  }

  const handleNewScan = () => {
    setViewMode("scan")
    setScanResult(null)
    setCurrentScanId(null)
    setUrl('')
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <VercelHeader
        currentPage="scan"
        showSearch={false}
        isScanning={isScanning}
      />

      {/* Main Content */}
      <main className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden" id="main-content" role="main" aria-label="Design token scanner">
        {viewMode === "scan" ? (
          <>
            {/* Scanner View */}
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <div className="w-full max-w-2xl mx-auto text-center space-y-8">
                {/* Title */}
                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                    Scan Any Website
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    Extract design tokens from any public website. Get colors, typography, spacing, and more in seconds.
                  </p>
                </div>

                {/* Progressive Scanner */}
                <ProgressiveScanner
                  onScan={handleScan}
                  initialUrl={url}
                  isScanning={isScanning}
                  className="w-full"
                />

                {/* Live Stats */}
                {realtimeStats && (
                  <div className="pt-8">
                    <LiveMetricsDashboard
                      layout="horizontal"
                      className="justify-center"
                    />
                  </div>
                )}

                {/* Popular Sites */}
                <div className="pt-8">
                  <p className="text-sm text-muted-foreground mb-4">Try scanning:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['stripe.com', 'linear.app', 'github.com', 'vercel.com', 'figma.com'].map((site) => (
                      <button
                        key={site}
                        onClick={() => {
                          setUrl(site)
                          handleScan(site)
                        }}
                        className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                        disabled={isScanning}
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity */}
            {activities.length > 0 && (
              <div className="border-t border-border bg-muted/50 p-6">
                <div className="max-w-4xl mx-auto">
                  <LiveActivityFeed compact={true} limit={5} />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Results View */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Results Header */}
              <div className="border-b border-border bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Scanner
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2">
                      {scanResult?.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {scanResult?.status === 'failed' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {scanResult?.status === 'scanning' && (
                        <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      <span className="text-sm font-medium">
                        {scanResult?.domain || 'Scanning...'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewScan}
                    className="gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    New Scan
                  </Button>
                </div>
              </div>

              {/* Results Content */}
              <div className="flex-1 overflow-auto">
                {scanResult && (
                  <ScanResultsLayout
                    result={scanResult}
                    onNewScan={handleNewScan}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}