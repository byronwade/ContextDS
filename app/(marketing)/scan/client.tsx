"use client"

import { useEffect, useState, useCallback, useEffectEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useScanStore } from "@/stores/scan-store"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ViewMode = "scan" | "results"

const EXAMPLES = ["stripe.com", "linear.app", "github.com", "vercel.com", "notion.so"]

export default function ScanClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialUrl = searchParams.get("url") || ""

  const [url, setUrl] = useState(initialUrl)
  const [viewMode, setViewMode] = useState<ViewMode>("scan")

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
      setViewMode("results")
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
    if (!result?.curatedTokens && !result?.designMd) return

    if (format === "design-md" && result.designMd) {
      downloadBlob(result.designMd.markdown, result.designMd.fileName, "text/markdown")
      return
    }

    if (format === "skill" && result.designSkill) {
      downloadBlob(result.designSkill.markdown, "SKILL.md", "text/markdown")
      return
    }

    const content = JSON.stringify(result.curatedTokens ?? result.tokens, null, 2)
    downloadBlob(content, `${result.domain || "tokens"}-tokens.json`, "application/json")
  }

  const handleShare = () => {
    const domain = result?.domain || url
    if (!domain) return
    const shareUrl = `${window.location.origin}/site/${encodeURIComponent(domain)}`
    void navigator.clipboard.writeText(shareUrl)
  }

  const showResults = viewMode === "results" && (result || isScanning || error)

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F3F6F8] text-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(1200px 600px at 10% -10%, rgba(13,148,136,0.18), transparent 55%), radial-gradient(900px 500px at 90% 0%, rgba(15,23,42,0.08), transparent 50%), linear-gradient(180deg, #F8FAFC 0%, #EEF3F6 45%, #F3F6F8 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <VercelHeader currentPage="scan" showSearch={false} isScanning={isScanning} />

        <main
          className="flex flex-1 flex-col"
          id="main-content"
          role="main"
          aria-label="Design token scanner"
        >
          {!showResults ? (
            <section className="relative flex flex-1 flex-col justify-center px-6 pb-20 pt-10 sm:px-10">
              <div className="mx-auto w-full max-w-4xl">
                <p className="mb-5 animate-fade-in font-mono text-xs uppercase tracking-[0.28em] text-teal-800">
                  ContextDS
                </p>
                <h1 className="max-w-3xl animate-slide-in font-serif text-5xl leading-[0.95] tracking-tight text-slate-950 sm:text-6xl md:text-7xl">
                  Turn any site into DESIGN.md
                </h1>
                <p className="mt-5 max-w-xl animate-fade-in text-base text-slate-600 sm:text-lg">
                  Scan public CSS → extract tokens → ship an agent-readable design system
                  and Cursor skill in seconds.
                </p>

                <form
                  className="mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
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
                    className="h-14 flex-1 border-slate-300/80 bg-white/80 text-base shadow-sm backdrop-blur"
                    aria-label="Website URL to scan"
                  />
                  <Button
                    type="submit"
                    disabled={!url.trim() || isScanning}
                    className="h-14 gap-2 bg-slate-950 px-6 text-white hover:bg-slate-800"
                  >
                    {isScanning ? "Scanning…" : "Scan site"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                {error && (
                  <p className="mt-4 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5 text-teal-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Outputs DESIGN.md + skill
                  </span>
                  <span>W3C tokens</span>
                  <span>No paid database</span>
                </div>

                <div className="mt-10">
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Try
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {EXAMPLES.map((site, index) => (
                      <button
                        key={site}
                        type="button"
                        onClick={() => {
                          setUrl(site)
                          void handleScan(site)
                        }}
                        disabled={isScanning}
                        className="text-sm text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-teal-800 hover:decoration-teal-700"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-0 hidden h-[42vh] w-[46vw] max-w-xl opacity-90 lg:block"
              >
                <div className="absolute inset-6 rounded-[2px] border border-slate-900/10 bg-white/50 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                  <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-teal-800">
                    DESIGN.md preview
                  </div>
                  <div className="space-y-2 font-mono text-[11px] leading-relaxed text-slate-700">
                    <p>---</p>
                    <p>name: your-site.com</p>
                    <p>colors:</p>
                    <p className="pl-3">primary: &quot;#0F172A&quot;</p>
                    <p className="pl-3">tertiary: &quot;#0D9488&quot;</p>
                    <p>typography:</p>
                    <p className="pl-3">h1: …</p>
                    <p>---</p>
                    <p className="pt-2 text-slate-500">## Overview</p>
                    <p className="text-slate-500">Agent-readable identity…</p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-slate-200/80 bg-white/50 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-2 text-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Scanner
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNewScan}>
                    New scan
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-white/40">
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
    </div>
  )
}

function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
