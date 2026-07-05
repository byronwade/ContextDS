"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useScanStore } from "@/stores/scan-store"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { useRealtimeStore } from "@/stores/realtime-store"
import { LiveActivityFeed } from "@/components/molecules/live-activity-feed"
import { LiveMetricsDashboard } from "@/components/molecules/live-metrics-dashboard"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { ProgressiveScanner } from "@/components/organisms/progressive-scanner"
import { VercelHeader } from "@/components/organisms/vercel-header"
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type ViewMode = "scan" | "results"

function normalizeDomain(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ""
  try {
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    return new URL(url).hostname
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] ?? trimmed
  }
}

export default function ScanClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialUrl = searchParams.get("url") || ""

  const [url, setUrl] = useState(initialUrl)
  const [viewMode, setViewMode] = useState<ViewMode>("scan")

  const realtimeStats = useRealtimeStats(5000)
  const { activities } = useRealtimeStore()

  const {
    isScanning,
    result: scanResult,
    error: scanError,
    startScan,
    resetScan,
  } = useScanStore()

  const handleScan = useCallback(
    async (targetUrl: string) => {
      const domain = normalizeDomain(targetUrl)
      if (!domain) return

      setUrl(domain)
      setViewMode("scan")
      resetScan()

      try {
        await startScan(domain)
      } catch (error) {
        console.error("Scan failed:", error)
      }
    },
    [resetScan, startScan]
  )

  useEffect(() => {
    if (initialUrl && !isScanning && !scanResult) {
      void handleScan(initialUrl)
    }
  }, [initialUrl, isScanning, scanResult, handleScan])

  useEffect(() => {
    if (scanResult?.status === "completed" || scanResult?.status === "failed") {
      setViewMode("results")
    }
  }, [scanResult])

  const handleBack = () => {
    setViewMode("scan")
    resetScan()
    router.push("/scan")
  }

  const handleNewScan = () => {
    setViewMode("scan")
    resetScan()
    setUrl("")
    router.push("/scan")
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <VercelHeader currentPage="scan" showSearch={false} isScanning={isScanning} />

      <main
        className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden"
        id="main-content"
        role="main"
        aria-label="Design token scanner"
      >
        {viewMode === "scan" ? (
          <>
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <div className="mx-auto w-full max-w-2xl space-y-8 text-center">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                    Scan Any Website
                  </h1>
                  <p className="text-base text-muted-foreground sm:text-lg">
                    Extract design tokens from any public website. Get colors, typography,
                    spacing, and more in seconds.
                  </p>
                </div>

                <ProgressiveScanner
                  onScan={handleScan}
                  initialUrl={url}
                  isScanning={isScanning}
                  className="w-full"
                />

                {scanError && (
                  <p className="text-sm text-red-500" role="alert">
                    {scanError}
                  </p>
                )}

                {realtimeStats && (
                  <div className="pt-8">
                    <LiveMetricsDashboard layout="horizontal" className="justify-center" />
                  </div>
                )}

                <div className="pt-8">
                  <p className="mb-4 text-sm text-muted-foreground">Try scanning:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["stripe.com", "linear.app", "github.com", "vercel.com", "figma.com"].map(
                      (site) => (
                        <button
                          key={site}
                          type="button"
                          onClick={() => {
                            setUrl(site)
                            void handleScan(site)
                          }}
                          className="rounded-md bg-muted px-3 py-1.5 text-sm transition-colors hover:bg-muted/80"
                          disabled={isScanning}
                        >
                          {site}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {activities.length > 0 && (
              <div className="border-t border-border bg-muted/50 p-6">
                <div className="mx-auto max-w-4xl">
                  <LiveActivityFeed compact limit={5} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-border bg-background px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Scanner
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2">
                    {scanResult?.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {scanResult?.status === "failed" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {isScanning && (
                      <Clock className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    <span className="text-sm font-medium">
                      {scanResult?.domain || url || "Scanning..."}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleNewScan} className="gap-2">
                  <Zap className="h-4 w-4" />
                  New Scan
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {scanResult && (
                <ScanResultsLayout result={scanResult} onNewScan={handleNewScan} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
