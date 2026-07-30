"use client"

import { useEffect, useState, useCallback, useEffectEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useScanStore } from "@/stores/scan-store"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { useRealtimeStore } from "@/stores/realtime-store"
import { LiveActivityFeed } from "@/components/molecules/live-activity-feed"
import { LiveMetricsDashboard } from "@/components/molecules/live-metrics-dashboard"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { VercelHeader } from "@/components/organisms/vercel-header"
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type ViewMode = "scan" | "results"

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
    result,
    error,
    metrics,
    progress,
    scanId,
    startScan,
    resetScan,
  } = useScanStore()

  const handleScan = useCallback(
    async (targetUrl: string) => {
      const trimmed = targetUrl.trim()
      if (!trimmed) return

      setUrl(trimmed)
      setViewMode("scan")
      resetScan()
      await startScan(trimmed)
    },
    [startScan, resetScan]
  )

  const onInitialUrl = useEffectEvent((value: string) => {
    if (value) {
      void handleScan(value)
    }
  })

  useEffect(() => {
    onInitialUrl(initialUrl)
  }, [initialUrl])

  useEffect(() => {
    if (result && (result.status === "completed" || result.status === "failed")) {
      setViewMode("results")
    }
  }, [result])

  const handleBack = () => {
    setViewMode("scan")
    resetScan()
    router.push("/scan")
  }

  const handleNewScan = () => {
    setViewMode("scan")
    setUrl("")
    resetScan()
  }

  const handleCopyToken = (value: string) => {
    void navigator.clipboard.writeText(value)
  }

  const handleExport = (format: string) => {
    if (!result?.curatedTokens) return

    let content = ""
    let mimeType = "text/plain"
    let extension = format

    switch (format) {
      case "json":
        content = JSON.stringify(result.curatedTokens, null, 2)
        mimeType = "application/json"
        break
      case "css":
        content = generateCSS(result.curatedTokens)
        mimeType = "text/css"
        break
      default:
        content = JSON.stringify(result.curatedTokens, null, 2)
        mimeType = "application/json"
        extension = "json"
    }

    const blob = new Blob([content], { type: mimeType })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = `${result.domain || "tokens"}-tokens.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  const handleShare = () => {
    const domain = result?.domain || url
    if (!domain) return
    const shareUrl = `${window.location.origin}/site/${encodeURIComponent(domain)}`
    void navigator.clipboard.writeText(shareUrl)
  }

  const showResults = viewMode === "results" && (result || isScanning || error)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <VercelHeader currentPage="scan" showSearch={false} isScanning={isScanning} />

      <main
        className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden"
        id="main-content"
        role="main"
        aria-label="Design token scanner"
      >
        {!showResults ? (
          <>
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <div className="mx-auto w-full max-w-2xl space-y-8 text-center">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                    Scan Any Website
                  </h1>
                  <p className="text-base text-muted-foreground sm:text-lg">
                    Extract design tokens from any public website. Get colors,
                    typography, spacing, and more in seconds.
                  </p>
                </div>

                <form
                  className="flex w-full flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleScan(url)
                  }}
                >
                  <Input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="stripe.com"
                    disabled={isScanning}
                    className="h-12 flex-1"
                    aria-label="Website URL to scan"
                  />
                  <Button
                    type="submit"
                    disabled={!url.trim() || isScanning}
                    className="h-12 gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {isScanning ? "Scanning…" : "Scan"}
                  </Button>
                </form>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
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
                  <LiveActivityFeed compact={true} limit={5} />
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
                    {result?.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {result?.status === "failed" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {isScanning && <Clock className="h-4 w-4 animate-spin text-blue-500" />}
                    <span className="text-sm font-medium">
                      {result?.domain || url || "Scanning..."}
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
              <ScanResultsLayout
                result={result}
                isLoading={isScanning}
                scanId={scanId}
                progress={progress}
                metrics={metrics}
                error={error}
                onCopy={handleCopyToken}
                onExport={handleExport}
                onShare={handleShare}
                onNewScan={handleNewScan}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function generateCSS(tokens: {
  colors?: Array<{ value: string }>
}): string {
  let css = ":root {\n"
  if (tokens.colors) {
    css += "  /* Colors */\n"
    tokens.colors.forEach((token, index) => {
      css += `  --color-${index + 1}: ${token.value};\n`
    })
  }
  css += "}\n"
  return css
}
