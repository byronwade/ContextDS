"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultsTabs, type TabId } from "./results-tabs"
import { TokenGrid } from "@/components/molecules/token-grid"
import { FontPreviewCard } from "@/components/molecules/font-preview"

type ScanResult = {
  status?: string
  domain?: string
  summary?: {
    tokensExtracted?: number
    curatedCount?: Record<string, number>
    confidence?: number
    completeness?: number
    reliability?: number
    processingTime?: number
  }
  curatedTokens?: {
    colors?: Array<{ name?: string; value: string; usage?: number; confidence?: number }>
    typography?: {
      families?: Array<{ name?: string; value: string; usage?: number }>
      sizes?: Array<{ name?: string; value: string }>
      weights?: Array<{ name?: string; value: string }>
    }
    spacing?: Array<{ name?: string; value: string; usage?: number }>
    radius?: Array<{ name?: string; value: string }>
    shadows?: Array<{ name?: string; value: string }>
    motion?: Array<{ name?: string; value: string }>
  }
  brandAnalysis?: {
    primaryColors?: string[]
    personality?: string
    primaryFont?: string | null
  }
  layoutDNA?: Record<string, unknown>
  designMd?: {
    markdown: string
    fileName: string
    summary?: {
      colorCount: number
      typographyCount: number
      spacingCount: number
      hasComponents: boolean
    }
  }
  designSkill?: {
    markdown: string
    fileName: string
    skillName: string
    description: string
  }
  designContract?: {
    slug: string
    title: string
    profile: string
    installCommand: string
    summary?: {
      colorCount: number
      typographyCount: number
      spacingCount: number
      fileCount: number
    }
  }
  semanticGraph?: {
    schemaVersion: number
    summary: {
      nodeCount: number
      edgeCount: number
      tokenCount: number
      roleCount: number
      componentCount: number
      layoutCount: number
      patternCount: number
    }
    nodes?: unknown[]
    edges?: unknown[]
  }
  screenshots?: Array<{
    label: string
    url: string
    mime?: string
    viewport?: string
  }>
  cacheHit?: boolean
  metadata?: {
    cssSources?: number
    mode?: string
    engine?: string
  }
}

interface ScanProgress {
  step: number
  totalSteps: number
  phase: string
  message: string
  timestamp: number
}

interface ScanMetrics {
  cssRules: number
  variables: number
  colors: number
  tokens: number
  qualityScore: number
}

interface ScanResultsLayoutProps {
  result: ScanResult | null
  isLoading: boolean
  scanId?: string | null
  progress?: ScanProgress | null
  metrics?: ScanMetrics | null
  error?: string | null
  onCopy: (value: string) => void
  onExport: (format: string) => void
  onShare: () => void
  onNewScan?: () => void
}

export function ScanResultsLayout({
  result,
  isLoading,
  progress,
  metrics,
  error,
  onCopy,
  onExport,
  onShare,
  onNewScan,
}: ScanResultsLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const tokenCount = useMemo(() => {
    const curated = result?.curatedTokens
    if (!curated) return 0
    return (
      (curated.colors?.length || 0) +
      (curated.typography?.families?.length || 0) +
      (curated.spacing?.length || 0) +
      (curated.radius?.length || 0) +
      (curated.shadows?.length || 0)
    )
  }, [result?.curatedTokens])

  const copyText = async (key: string, value: string) => {
    onCopy(value)
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* parent may already handle */
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1600)
  }

  const downloadText = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-12 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-destructive">
            Scan failed
          </p>
          <h2 className="font-serif text-3xl tracking-tight text-foreground">{error}</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewScan}>Try again</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Back to Chat
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !result) {
    const pct = Math.min(
      95,
      ((progress?.step || 1) / (progress?.totalSteps || 5)) * 100
    )
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
          <div className="flex items-center gap-3 text-foreground">
            <Clock className="size-4 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium tracking-tight">
              {progress?.message || "Scanning public CSS…"}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full origin-left rounded-full bg-foreground transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Extracting tokens, layout DNA, and an installable Design Contract pack.
          </p>
        </div>
      </div>
    )
  }

  const colors = result.curatedTokens?.colors || []
  const families = result.curatedTokens?.typography?.families || []

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{result.domain}</Badge>
            {result.cacheHit ? <Badge variant="outline">cached</Badge> : null}
            <Badge variant="outline">
              {result.metadata?.mode || result.metadata?.engine || "scan"}
            </Badge>
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            {result.domain}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {result.summary?.tokensExtracted || tokenCount} tokens ·{" "}
            {Math.round(result.summary?.confidence || 0)}% confidence
            {result.designContract
              ? ` · ${result.designContract.summary?.fileCount ?? 0} pack files`
              : ""}
            {result.brandAnalysis?.personality
              ? ` · ${result.brandAnalysis.personality}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {result.domain ? (
            <Button
              size="sm"
              onClick={() => {
                window.location.href = `/api/contracts/download?domain=${encodeURIComponent(result.domain!)}`
              }}
            >
              <Download data-icon="inline-start" />
              Download pack
            </Button>
          ) : null}
          {result.designMd ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText(result.designMd!.fileName, result.designMd!.markdown)
              }
            >
              <FileText data-icon="inline-start" />
              DESIGN.md
            </Button>
          ) : null}
          {result.designSkill ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText("SKILL.md", result.designSkill!.markdown)
              }
            >
              <Sparkles data-icon="inline-start" />
              Skill
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => onExport("json")}>
            Tokens JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={onShare}>
            <Share2 data-icon="inline-start" />
            Share
          </Button>
          {onNewScan ? (
            <Button variant="ghost" size="sm" onClick={onNewScan}>
              New scan
            </Button>
          ) : null}
        </div>
      </header>

      <ResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{ tokens: tokenCount }}
      />

      <div className="mt-8">
        {activeTab === "overview" && (
          <div className="space-y-10 animate-fade-in">
            {result.screenshots?.[0]?.url ? (
              <section className="overflow-hidden rounded-2xl border border-[color:var(--soft-border)] bg-card/70 shadow-[var(--soft-shadow)]">
                <div className="flex items-center justify-between px-5 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Captured surface
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {result.screenshots[0].label || "homepage"}
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.screenshots[0].url}
                  alt={`Screenshot of ${result.domain || "scanned site"}`}
                  className="max-h-[420px] w-full object-cover object-top"
                />
              </section>
            ) : null}

            {result.semanticGraph && (
              <section className="rounded-2xl border border-[color:var(--soft-border)] bg-card/70 p-5 shadow-[var(--soft-shadow)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Semantic design graph
                    </p>
                    <h3 className="mt-1 font-serif text-2xl tracking-tight">
                      How the system links together
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      Tokens fill roles, components use those roles, and layout nodes place them —
                      so agents can generate a contract that matches how the UI actually works.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      downloadText(
                        `${result.domain || "design"}-graph.json`,
                        JSON.stringify(result.semanticGraph, null, 2)
                      )
                    }
                  >
                    graph.json
                  </Button>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Tokens", result.semanticGraph.summary.tokenCount],
                    ["Roles", result.semanticGraph.summary.roleCount],
                    ["Components", result.semanticGraph.summary.componentCount],
                    ["Patterns", result.semanticGraph.summary.patternCount],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-[color:var(--soft-border)] bg-background/50 px-3 py-3"
                    >
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 font-mono text-xl text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Palette
                </p>
                <div className="flex flex-wrap gap-2">
                  {(result.brandAnalysis?.primaryColors?.length
                    ? result.brandAnalysis.primaryColors
                    : colors.slice(0, 8).map((c) => c.value)
                  ).map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => void copyText(color, color)}
                      className="group relative size-14 overflow-hidden rounded-lg border border-border transition-transform hover:-translate-y-0.5"
                      style={{ background: color }}
                    >
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {copiedKey === color ? "copied" : color}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <StatRow label="CSS sources" value={String(result.metadata?.cssSources ?? "—")} />
                <StatRow
                  label="Confidence"
                  value={`${Math.round(result.summary?.confidence || 0)}%`}
                />
                <StatRow
                  label="Completeness"
                  value={`${Math.round(result.summary?.completeness || 0)}%`}
                />
                <StatRow
                  label="Live metrics"
                  value={
                    metrics
                      ? `${metrics.colors} colors · ${metrics.tokens} tokens`
                      : `${colors.length} colors`
                  }
                />
              </div>
            </section>

            {families.length > 0 && (
              <section>
                <p className="mb-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Typography
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {families.slice(0, 4).map((font, index) => (
                    <FontPreviewCard
                      key={`${font.value}-${index}`}
                      fontFamily={String(font.value)}
                      usage={font.usage}
                      onCopy={() => onCopy(String(font.value))}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              <ArtifactCard
                title="Design Contract pack"
                subtitle={
                  result.designContract?.installCommand ||
                  "ZIP with DESIGN.md, AGENTS.md, skills, references, config"
                }
                ready={Boolean(result.designContract || result.designMd)}
                onCopy={() =>
                  result.designContract?.installCommand &&
                  void copyText("install", result.designContract.installCommand)
                }
                onOpen={() => {
                  if (result.domain) {
                    window.location.href = `/api/contracts/download?domain=${encodeURIComponent(result.domain)}`
                  }
                }}
                copied={copiedKey === "install"}
                openLabel="Download ZIP"
                copyLabel="Copy install cmd"
              />
              <ArtifactCard
                title="DESIGN.md grammar"
                subtitle="Product grammar + Google token front matter for agents"
                ready={Boolean(result.designMd)}
                onCopy={() =>
                  result.designMd &&
                  void copyText("design-md", result.designMd.markdown)
                }
                onOpen={() => setActiveTab("design-md")}
                copied={copiedKey === "design-md"}
              />
            </section>
          </div>
        )}

        {activeTab === "tokens" && (
          <div className="space-y-10 animate-fade-in">
            {colors.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Colors</h3>
                <TokenGrid
                  tokens={colors.map((token) => ({
                    name: token.name || token.value,
                    value: token.value,
                    usage: token.usage,
                    confidence: token.confidence,
                  }))}
                  type="color"
                  onCopy={onCopy}
                />
              </section>
            )}
            {(result.curatedTokens?.spacing?.length || 0) > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Spacing</h3>
                <TokenGrid
                  tokens={(result.curatedTokens?.spacing || []).map((token) => ({
                    name: token.name || String(token.value),
                    value: String(token.value),
                    usage: token.usage,
                  }))}
                  type="spacing"
                  columns={4}
                  onCopy={onCopy}
                />
              </section>
            )}
            {(result.curatedTokens?.radius?.length || 0) > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Radius</h3>
                <TokenGrid
                  tokens={(result.curatedTokens?.radius || []).map((token) => ({
                    name: token.name || String(token.value),
                    value: String(token.value),
                  }))}
                  type="radius"
                  columns={4}
                  onCopy={onCopy}
                />
              </section>
            )}
            {(result.curatedTokens?.shadows?.length || 0) > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Shadows</h3>
                <TokenGrid
                  tokens={(result.curatedTokens?.shadows || []).map((token) => ({
                    name: token.name || "shadow",
                    value: String(token.value),
                  }))}
                  type="shadow"
                  columns={3}
                  onCopy={onCopy}
                />
              </section>
            )}
          </div>
        )}

        {activeTab === "design-md" && result.designMd && (
          <MarkdownPanel
            title="DESIGN.md"
            subtitle="Drop at project root. Point Cursor/Claude rules at this file before generating UI."
            markdown={result.designMd.markdown}
            onCopy={() => void copyText("design-md", result.designMd!.markdown)}
            onDownload={() =>
              downloadText(result.designMd!.fileName, result.designMd!.markdown)
            }
            copied={copiedKey === "design-md"}
          />
        )}

        {activeTab === "skill" && result.designSkill && (
          <MarkdownPanel
            title={result.designSkill.skillName}
            subtitle={result.designSkill.description}
            markdown={result.designSkill.markdown}
            onCopy={() => void copyText("skill", result.designSkill!.markdown)}
            onDownload={() =>
              downloadText("SKILL.md", result.designSkill!.markdown)
            }
            copied={copiedKey === "skill"}
          />
        )}

        {activeTab === "layout" && (
          <div className="animate-fade-in flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Layout DNA inferred from collected CSS (containers, breakpoints, grid/flex mix, archetypes).
            </p>
            <pre className="overflow-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground">
              {JSON.stringify(result.layoutDNA ?? {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  )
}

function ArtifactCard({
  title,
  subtitle,
  ready,
  onCopy,
  onOpen,
  copied,
  openLabel = "View",
  copyLabel = "Copy",
}: {
  title: string
  subtitle: string
  ready: boolean
  onCopy: () => void
  onOpen: () => void
  copied: boolean
  openLabel?: string
  copyLabel?: string
}) {
  return (
    <div className="border-t border-border/70 pt-4">
      <div className="mb-2 flex items-center gap-2">
        {ready ? (
          <CheckCircle2 className="size-4 text-foreground" />
        ) : (
          <Clock className="size-4 text-muted-foreground" />
        )}
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onOpen} disabled={!ready}>
          {openLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCopy} disabled={!ready}>
          <Copy data-icon="inline-start" />
          {copied ? "Copied" : copyLabel}
        </Button>
      </div>
    </div>
  )
}

function MarkdownPanel({
  title,
  subtitle,
  markdown,
  onCopy,
  onDownload,
  copied,
}: {
  title: string
  subtitle: string
  markdown: string
  onCopy: () => void
  onDownload: () => void
  copied: boolean
}) {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy data-icon="inline-start" />
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={onDownload}>
            <Download data-icon="inline-start" />
            Download
          </Button>
        </div>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-muted/40 p-5 font-mono text-xs leading-relaxed text-foreground">
        {markdown}
      </pre>
    </div>
  )
}
