"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ScanProgressViewer } from '@/components/organisms/scan-progress-viewer'
import { ComprehensiveAnalysisDisplay } from '@/components/organisms/comprehensive-analysis-display'
import { FontPreviewCard, preloadFonts } from '@/components/molecules/font-preview'
import { Button } from '@/components/ui/button'
import { Copy, Download, Share2, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ScanResultPayload = {
  status: "completed" | "failed"
  domain?: string
  summary?: {
    tokensExtracted: number
    curatedCount?: {
      colors: number
      fonts: number
      sizes: number
      spacing: number
      radius: number
      shadows: number
    }
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }
  curatedTokens?: {
    colors: Array<{
      name: string
      value: string
      usage: number
      confidence: number
      percentage: number
      category: string
      semantic?: string
      preview?: any
    }>
    typography: {
      families: Array<{
        name: string
        value: string
        usage: number
        confidence: number
        percentage: number
        category: string
        semantic?: string
        preview?: any
      }>
      sizes: Array<any>
      weights: Array<any>
    }
    spacing: Array<any>
    radius: Array<any>
    shadows: Array<any>
    motion: Array<any>
  }
  comprehensiveAnalysis?: any
  error?: string
}

// Font Preview Component
function FontPreview({ fontFamily, className, children }: { fontFamily: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} style={{ fontFamily }}>
      {children}
    </div>
  )
}

export default function ScanDomainPage() {
  const params = useParams()
  const router = useRouter()
  const domain = decodeURIComponent(params.domain as string)

  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null)
  const [scanLoading, setScanLoading] = useState(true)
  const [scanError, setScanError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!domain) return

    const performScan = async () => {
      setScanLoading(true)
      setScanResult(null)
      setScanError(null)

      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: domain.startsWith("http") ? domain : `https://${domain}`,
            prettify: false,
            quality: "standard"
          })
        })

        if (!response.ok) {
          throw new Error(`Scan failed with status ${response.status}`)
        }

        const result = (await response.json()) as ScanResultPayload

        if (result.status === "failed") {
          throw new Error(result.error || "Scan failed")
        }

        // Preload fonts for preview (non-blocking)
        if (result.curatedTokens?.typography?.families) {
          const fontFamilies = result.curatedTokens.typography.families.map(f => f.value)
          preloadFonts(fontFamilies)
        }

        setScanResult(result)
      } catch (error) {
        setScanError(error instanceof Error ? error.message : "Scan failed")
      } finally {
        setScanLoading(false)
      }
    }

    performScan()
  }, [domain])

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
  }

  const handleShareUrl = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (scanLoading) {
    return (
      <div className="min-h-screen bg-grep-0 flex items-center justify-center p-4">
        <ScanProgressViewer domain={domain} />
      </div>
    )
  }

  if (scanError) {
    return (
      <div className="min-h-screen bg-grep-0 flex items-center justify-center p-4 md:p-12">
        <div className="w-full max-w-3xl">
          <div className="mb-6 flex items-center justify-between border-b border-grep-2 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="text-lg font-medium text-foreground font-mono">
                {domain}
              </h2>
            </div>
            <div className="text-sm text-red-600 dark:text-red-400 font-mono">
              FAILED
            </div>
          </div>

          <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
            <div className="border-b border-grep-2 bg-background">
              <div className="px-4 py-2.5 flex items-start gap-3">
                <span className="shrink-0 w-4 text-center text-red-600 dark:text-red-400">
                  ✗
                </span>
                <div className="flex-1">
                  <div className="text-foreground">scan-failed</div>
                  <div className="mt-1 text-grep-9">
                    {scanError}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-grep-2 bg-background px-4 py-3 flex items-center gap-2">
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
              >
                ↻ Retry
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs font-mono text-grep-9 hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!scanResult) {
    return null
  }

  return (
    <div className="min-h-screen bg-grep-0">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 border-b border-grep-2 bg-grep-0/95 backdrop-blur supports-[backdrop-filter]:bg-grep-0/60">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-grep-9 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h1 className="text-base md:text-lg font-medium text-foreground font-mono">
                {scanResult.domain}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareUrl}
              className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
            >
              {copied ? (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  copied!
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 mr-1" />
                  share
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens, null, 2))}
              className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              copy json
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(scanResult.curatedTokens, null, 2)], { type: "application/json" })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement("a")
                anchor.href = url
                anchor.download = `${scanResult.domain}-tokens.json`
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
                URL.revokeObjectURL(url)
              }}
              className="h-7 px-2 text-xs font-mono text-grep-9 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
        {/* Summary Stats */}
        <div className="mb-6 rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-grep-2">
            <div className="px-4 py-3 border-b border-grep-2 md:border-b-0">
              <div className="text-grep-9 text-xs mb-1">tokens</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {scanResult.summary?.tokensExtracted || 0}
              </div>
            </div>
            <div className="px-4 py-3 border-b border-grep-2 md:border-b-0">
              <div className="text-grep-9 text-xs mb-1">confidence</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {scanResult.summary?.confidence || 0}%
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-grep-9 text-xs mb-1">complete</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {scanResult.summary?.completeness || 0}%
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-grep-9 text-xs mb-1">quality</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {scanResult.summary?.reliability || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive Analysis */}
        {scanResult.comprehensiveAnalysis && (
          <ComprehensiveAnalysisDisplay analysis={scanResult.comprehensiveAnalysis} />
        )}

        {/* Token Categories */}
        {scanResult.curatedTokens && (
          <div className="space-y-4">
            {/* Colors */}
            {scanResult.curatedTokens.colors && scanResult.curatedTokens.colors.length > 0 && (
              <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                  <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                    Colors ({scanResult.curatedTokens.colors.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.colors, null, 2))}
                    className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                  >
                    copy
                  </Button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {scanResult.curatedTokens.colors.map((token, index) => (
                      <button
                        key={`color-${index}`}
                        onClick={() => handleCopyToken(String(token.value))}
                        className="group flex flex-col gap-2 p-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors"
                        title={`${token.value} · ${token.usage} uses (${token.percentage}% of colors)`}
                      >
                        <div
                          className="w-full h-16 rounded border border-grep-3"
                          style={{ backgroundColor: String(token.value) }}
                        />
                        <div className="text-left w-full">
                          <code className="text-xs text-foreground block truncate">{token.value}</code>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-grep-9">{token.usage} uses</span>
                            <div className="flex items-center gap-1">
                              <div className="w-8 h-0.5 bg-grep-3 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${token.percentage}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-grep-9 tabular-nums">{token.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Typography */}
            {scanResult.curatedTokens.typography?.families && scanResult.curatedTokens.typography.families.length > 0 && (
              <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                  <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                    Typography ({scanResult.curatedTokens.typography.families.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.typography.families, null, 2))}
                    className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                  >
                    copy
                  </Button>
                </div>
                <div className="divide-y divide-grep-2">
                  {scanResult.curatedTokens.typography.families.map((token, index) => (
                    <button
                      key={`font-${index}`}
                      onClick={() => handleCopyToken(String(token.value))}
                      className="w-full px-4 py-3 text-left hover:bg-background transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <code className="text-sm text-foreground truncate flex-1">{token.value}</code>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-grep-9">{token.percentage}%</span>
                          <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <FontPreview fontFamily={String(token.value)} className="relative">
                        <div className="flex items-baseline gap-4 not-mono">
                          <span className="text-2xl text-foreground">Aa</span>
                          <span className="text-xl text-grep-9">Bb Cc</span>
                          <span className="text-base text-grep-9">123 abc</span>
                          <span className="text-sm text-grep-9">The quick brown fox</span>
                        </div>
                      </FontPreview>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spacing */}
            {scanResult.curatedTokens.spacing && scanResult.curatedTokens.spacing.length > 0 && (
              <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                  <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                    Spacing ({scanResult.curatedTokens.spacing.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.spacing, null, 2))}
                    className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                  >
                    copy
                  </Button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {scanResult.curatedTokens.spacing.map((token, index) => (
                      <button
                        key={`spacing-${index}`}
                        onClick={() => handleCopyToken(String(token.value))}
                        className="flex items-center gap-2 px-3 py-2 rounded border border-grep-2 bg-background hover:border-foreground transition-colors group"
                        title={`${token.percentage}% usage`}
                      >
                        <div className="w-1 h-4 bg-foreground rounded-sm" style={{ width: `${Math.min(parseInt(token.value) / 2, 24)}px` }} />
                        <code className="text-xs text-foreground">{token.value}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Radius */}
            {scanResult.curatedTokens.radius && scanResult.curatedTokens.radius.length > 0 && (
              <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                  <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                    Radius ({scanResult.curatedTokens.radius.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.radius, null, 2))}
                    className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                  >
                    copy
                  </Button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {scanResult.curatedTokens.radius.map((token, index) => (
                      <button
                        key={`radius-${index}`}
                        onClick={() => handleCopyToken(String(token.value))}
                        className="flex flex-col items-center gap-2 p-3 rounded border border-grep-2 bg-background hover:border-foreground transition-colors"
                        title={`${token.percentage}% usage`}
                      >
                        <div className="w-12 h-12 bg-foreground" style={{ borderRadius: String(token.value) }} />
                        <code className="text-xs text-foreground">{token.value}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Shadows */}
            {scanResult.curatedTokens.shadows && scanResult.curatedTokens.shadows.length > 0 && (
              <div className="rounded-md border border-grep-2 bg-grep-0 font-mono text-[13px] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-grep-2 bg-background flex items-center justify-between">
                  <span className="text-grep-9 text-xs uppercase tracking-wide font-semibold">
                    Shadows ({scanResult.curatedTokens.shadows.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyToken(JSON.stringify(scanResult.curatedTokens.shadows, null, 2))}
                    className="h-6 px-2 text-xs text-grep-9 hover:text-foreground"
                  >
                    copy
                  </Button>
                </div>
                <div className="divide-y divide-grep-2">
                  {scanResult.curatedTokens.shadows.map((token, index) => (
                    <button
                      key={`shadow-${index}`}
                      onClick={() => handleCopyToken(String(token.value))}
                      className="w-full px-4 py-3 text-left hover:bg-background transition-colors group flex items-center gap-4"
                    >
                      <div className="w-16 h-16 shrink-0 bg-background rounded border border-grep-3 flex items-center justify-center">
                        <div className="w-10 h-10 bg-grep-0 rounded" style={{ boxShadow: String(token.value) }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <code className="text-xs text-foreground block truncate">{token.value}</code>
                        <div className="text-[10px] text-grep-9 mt-1">{token.percentage}% usage</div>
                      </div>
                      <Copy className="h-3.5 w-3.5 text-grep-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}