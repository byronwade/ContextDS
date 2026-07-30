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
            "radial-gradient(900px 480px at 50% -10%, oklch(0.45 0.04 185 / 0.16), transparent 55%), radial-gradient(700px 500px at 100% 10%, oklch(1 0 0 / 0.04), transparent 45%), linear-gradient(180deg, oklch(0.14 0.006 260) 0%, oklch(0.11 0.005 260) 100%)",
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
                <h1 className="animate-slide-in font-serif text-[clamp(3rem,8vw,5.25rem)] leading-[0.92] tracking-[-0.03em] text-foreground">
                  designcontracts
                  <span className="font-mono text-[0.55em] tracking-normal text-[oklch(0.78_0.08_185)]">
                    .sh
                  </span>
                </h1>
                <p className="mt-5 max-w-xl animate-fade-in text-base text-muted-foreground sm:text-lg">
                  Scan a live site into an installable Design Contract — tokens, layout DNA,
                  DESIGN.md, and agent enforcement.
                </p>

                <form
                  className="mt-10 max-w-xl"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleScan(url, mode)
                  }}
                >
                  <div className="border border-[color:var(--soft-border)] bg-background/60 p-1.5 backdrop-blur-md sm:rounded-lg">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="stripe.com"
                        disabled={isScanning}
                        className="h-11 flex-1 rounded-md border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                        aria-label="Website URL to scan"
                      />
                      <Button
                        type="submit"
                        disabled={!url.trim() || isScanning}
                        className="h-11 gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
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
                          "rounded-md border px-3 py-1.5 text-xs transition",
                          mode === option.id
                            ? "border-[oklch(0.78_0.08_185_/0.45)] bg-[oklch(0.78_0.08_185_/0.1)] text-foreground"
                            : "border-[color:var(--soft-border)] bg-card/40 text-muted-foreground hover:text-foreground"
                        )}
                        title={option.hint}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </form>

                {error && (
                  <p className="mt-4 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 text-[oklch(0.78_0.08_185)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Installable contract pack
                  </span>
                  <span>DESIGN.md grammar</span>
                  <span>resolve → check → verify</span>
                </div>

                <p className="mt-8 text-sm text-muted-foreground">
                  Try{" "}
                  {EXAMPLES.map((site, index) => (
                    <span key={site}>
                      {index > 0 ? (index === EXAMPLES.length - 1 ? ", or " : ", ") : null}
                      <button
                        type="button"
                        onClick={() => {
                          setUrl(site)
                          void handleScan(site, mode)
                        }}
                        disabled={isScanning}
                        className="text-foreground/90 underline decoration-[color:var(--soft-border)] underline-offset-4 transition hover:decoration-[oklch(0.78_0.08_185)]"
                      >
                        {site}
                      </button>
                    </span>
                  ))}
                </p>
              </div>
            </section>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-[color:var(--soft-border)] bg-background/70 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-2 rounded-md"
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
