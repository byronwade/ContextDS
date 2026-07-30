'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/organisms/app-shell'
import { ScanResultsLayout } from '@/components/organisms/scan-results-layout'
import { PageCanvas } from '@/components/molecules/page-canvas'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { storedScanToClientResult } from '@/lib/scanner/scan-client-result'
import {
  handoffToScanResult,
  normalizeDomain,
  readSiteHandoff,
} from '@/lib/site-handoff'
import { useScanStore } from '@/stores/scan-store'
import Link from 'next/link'

type SiteApiResponse = {
  hasData?: boolean
  shouldRescan?: boolean
  domain?: string
  scan?: Parameters<typeof storedScanToClientResult>[0] | null
}

type LoadPhase = 'hydrating' | 'ready' | 'missing' | 'scanning' | 'error'

export default function SitePage() {
  const params = useParams()
  const rawDomain = params.domain as string
  const domain = normalizeDomain(rawDomain || '')
  const loadedFor = useRef<string | null>(null)
  const [phase, setPhase] = useState<LoadPhase>('hydrating')
  const [loadError, setLoadError] = useState<string | null>(null)

  const {
    isScanning: scanLoading,
    result: scanResult,
    error: scanError,
    progress: scanProgress,
    scanId,
    startScan,
    resetScan,
    setResult,
  } = useScanStore()

  useEffect(() => {
    if (!domain || loadedFor.current === domain) return
    loadedFor.current = domain
    void hydrateSite(domain)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per domain
  }, [domain])

  useEffect(() => {
    if (scanLoading) {
      setPhase('scanning')
      return
    }
    if (scanResult?.domain === domain) {
      setPhase('ready')
    }
  }, [scanLoading, scanResult, domain])

  const hydrateSite = async (target: string) => {
    setPhase('hydrating')
    setLoadError(null)

    // 1) Instant handoff from Chat Open (same tab) — never blocks on storage.
    const handoff = readSiteHandoff(target)
    if (handoff) {
      const fromHandoff = handoffToScanResult(handoff)
      if (fromHandoff) {
        setResult(fromHandoff)
        setPhase('ready')
      }
    }

    // 2) Durable cache (Blob / Redis) — upgrade handoff with full pack when available.
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(target)}`)
      if (response.ok) {
        const existing = (await response.json()) as SiteApiResponse
        if (existing.hasData && existing.scan) {
          setResult(storedScanToClientResult(existing.scan))
          setPhase('ready')
          return
        }
      }
    } catch (error) {
      console.error('Error loading cached site data:', error)
    }

    // 3) No cache — show empty state. Do NOT auto-rescan (avoids infinite loading
    // when scanner/env is misconfigured on preview deploys).
    if (!handoff) {
      setPhase('missing')
    }
  }

  const handleCopyToken = (value: string) => {
    void navigator.clipboard.writeText(value)
  }

  const handleExport = (format: string) => {
    if (!scanResult?.curatedTokens) return

    let content = ''
    let mimeType = 'text/plain'
    let extension: string = format

    switch (format) {
      case 'json':
        content = JSON.stringify(scanResult.curatedTokens, null, 2)
        mimeType = 'application/json'
        break
      case 'css':
        content = generateCSS(scanResult.curatedTokens)
        mimeType = 'text/css'
        break
      default:
        content = JSON.stringify(scanResult.curatedTokens, null, 2)
        mimeType = 'application/json'
        extension = 'json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${domain}-tokens.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const generateCSS = (tokens: { colors?: Array<{ value: string }> }) => {
    let css = ':root {\n'
    if (tokens.colors) {
      css += '  /* Colors */\n'
      tokens.colors.forEach((token, i) => {
        css += `  --color-${i + 1}: ${token.value};\n`
      })
    }
    css += '}\n'
    return css
  }

  const handleShareUrl = () => {
    const shareUrl = `${window.location.origin}/site/${encodeURIComponent(domain)}`
    void navigator.clipboard.writeText(shareUrl)
  }

  const runFreshScan = () => {
    setLoadError(null)
    resetScan()
    setPhase('scanning')
    void startScan(domain, 'accurate').catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Scan failed')
      setPhase('error')
    })
  }

  return (
    <AppShell currentPage="site" recentDomain={domain}>
      {phase === 'hydrating' && !scanResult ? (
        <PageCanvas>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        </PageCanvas>
      ) : null}

      {phase === 'missing' && !scanResult ? (
        <PageCanvas>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Contract
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            {domain}
          </h1>
          <p className="mt-2 max-w-lg text-[15px] text-muted-foreground">
            No saved Design Contract for this domain yet. Scan from Chat, or run one here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={runFreshScan}>Scan now</Button>
            <Button variant="outline" asChild>
              <Link href={`/?url=${encodeURIComponent(domain)}`}>Open in Chat</Link>
            </Button>
          </div>
        </PageCanvas>
      ) : null}

      {(phase === 'ready' || phase === 'scanning' || phase === 'error' || scanResult) &&
      (scanResult || scanLoading || scanError || loadError) ? (
        <ScanResultsLayout
          result={scanResult}
          isLoading={scanLoading || phase === 'scanning'}
          scanId={scanId}
          progress={scanProgress}
          error={scanError || loadError}
          onCopy={handleCopyToken}
          onExport={handleExport}
          onShare={handleShareUrl}
          onNewScan={runFreshScan}
        />
      ) : null}
    </AppShell>
  )
}
