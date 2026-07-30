"use client"

import { useEffect, useState, useCallback, useEffectEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useScanStore } from "@/stores/scan-store"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ViewMode = "scan" | "results"
type ScanMode = "fast" | "accurate"

const EXAMPLES = ["stripe.com", "linear.app", "github.com", "vercel.com", "notion.so"]

export default function ScanClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialUrl = searchParams.get("url") || ""

  const [url, setUrl] = useState(initialUrl)
  const [viewMode, setViewMode] = useState<ViewMode>("scan")
  const [mode, setMode] = useState<ScanMode>("fast")

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
    async (targetUrl: string, scanMode: ScanMode = mode) => {
      const trimmed = targetUrl.trim()
      if (!trimmed) return

      setUrl(trimmed)
      setViewMode("results")
      resetScan()
      await startScan(trimmed, scanMode)
    },
    [startScan, resetScan, mode]
  )

  const onInitialUrl = useEffectEvent((value: string) => {
    if (value) void handleScan(value)
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
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 560px at 8% -12%, oklch(0.9 0.04 190 / 0.5), transparent 55%), radial-gradient(900px 480px at 92% 0%, oklch(0.94 0.015 230 / 0.4), transparent 50%), linear-gradient(180deg, oklch(0.99 0.004 210) 0%, oklch(0.97 0.01 205) 48%, oklch(0.985 0.004 210) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <VercelHeader currentPage="scan" showSearch={false} isScanning={isScanning} />

        <main
          className="flex flex-1 flex-col"
          id="main-content"
          role="main"
          aria-label="Design contract scanner"
        >
          {!showResults ? (
            <section className="relative flex flex-1 flex-col justify-center px-4 pb-20 pt-10 sm:px-8">
              <div className="mx-auto w-full max-w-3xl">
                <p className="mb-4 animate-fade-in font-mono text-[11px] uppercase tracking-[0.28em] text-teal-800/80 dark:text-teal-300/80">
                  designcontracts.sh
                </p>
                <h1 className="max-w-3xl animate-slide-in font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
                  Scan the design.
                  <br />
                  Keep the contract.
                </h1>
                <p className="mt-5 max-w-xl animate-fade-in text-base text-muted-foreground sm:text-lg">
                  The best path from a live site to an installable Design Contract —
                  tokens, layout DNA, DESIGN.md, and agent enforcement in one pass.
                </p>

                <form
                  className="mt-10"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleScan(url, mode)
                  }}
                >
                  <div className="rounded-[1.4rem] border border-[color:var(--soft-border)] bg-card/80 p-2 shadow-[var(--soft-shadow)] backdrop-blur-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="stripe.com"
                        disabled={isScanning}
                        className="h-12 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                        aria-label="Website URL to scan"
                      />
                      <Button
                        type="submit"
                        disabled={!url.trim() || isScanning}
                        className="h-12 gap-2 rounded-2xl bg-primary px-6 text-primary-foreground hover:opacity-90"
                      >
                        {isScanning ? "Scanning…" : "Scan site"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Mode</span>
                    {(
                      [
                        { id: "fast", label: "Fast", hint: "Static CSS + Wallace" },
                        { id: "accurate", label: "Accurate", hint: "Docker browser" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMode(option.id)}
                        className={cn(
                          "rounded-xl border px-3 py-1.5 text-xs transition",
                          mode === option.id
                            ? "border-teal-700/30 bg-teal-700/10 text-teal-900 dark:text-teal-200"
                            : "border-[color:var(--soft-border)] bg-card/50 text-muted-foreground hover:text-foreground"
                        )}
                        title={option.hint}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </form>

                {error && (
                  <p className="mt-4 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Installable contract pack
                  </span>
                  <span>DESIGN.md grammar</span>
                  <span>resolve → check → verify</span>
                </div>

                <div className="mt-10">
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Try
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((site) => (
                      <button
                        key={site}
                        type="button"
                        onClick={() => {
                          setUrl(site)
                          void handleScan(site, mode)
                        }}
                        disabled={isScanning}
                        className="rounded-xl border border-[color:var(--soft-border)] bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-teal-700/25 hover:text-foreground"
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-[color:var(--soft-border)] bg-card/50 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-2 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Scanner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewScan}
                    className="rounded-xl border-[color:var(--soft-border)]"
                  >
                    New scan
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-background/40">
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
