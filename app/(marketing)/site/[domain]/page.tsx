'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/organisms/app-shell'
import { DesignDossier } from '@/components/dossier/design-dossier'
import { Button } from '@/components/ui/button'
import { storedScanToClientResult } from '@/lib/scanner/scan-client-result'
import { trackClientEvent } from '@/lib/analytics/track-client'
import {
  handoffToScanResult,
  normalizeDomain,
  readSiteHandoff,
} from '@/lib/site-handoff'
import { useScanStore } from '@/stores/scan-store'

type SiteApiResponse = {
  hasData?: boolean
  shouldRescan?: boolean
  domain?: string
  scan?: Parameters<typeof storedScanToClientResult>[0] | null
}

type LoadPhase = 'hydrating' | 'ready' | 'missing' | 'scanning' | 'error'

type TokenEntry = { name?: string; value: string | number }

function cssVarName(prefix: string, token: TokenEntry, index: number): string {
  const base = (token.name || `${prefix}-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `--${base.startsWith(prefix) ? base : `${prefix}-${base}`}`
}

function generateCSS(tokens: {
  colors?: TokenEntry[]
  typography?: { families?: TokenEntry[]; sizes?: TokenEntry[]; weights?: TokenEntry[] }
  spacing?: TokenEntry[]
  radius?: TokenEntry[]
  shadows?: TokenEntry[]
  motion?: TokenEntry[]
}): string {
  const lines: string[] = [':root {']
  const emit = (label: string, prefix: string, list?: TokenEntry[]) => {
    if (!list?.length) return
    lines.push(`  /* ${label} */`)
    list.forEach((token, index) => {
      lines.push(`  ${cssVarName(prefix, token, index)}: ${token.value};`)
    })
  }
  emit('Colors', 'color', tokens.colors)
  emit('Font families', 'font', tokens.typography?.families)
  emit('Font sizes', 'text', tokens.typography?.sizes)
  emit('Font weights', 'weight', tokens.typography?.weights)
  emit('Spacing', 'space', tokens.spacing)
  emit('Radius', 'radius', tokens.radius)
  emit('Shadows', 'shadow', tokens.shadows)
  emit('Motion', 'motion', tokens.motion)
  lines.push('}')
  return lines.join('\n') + '\n'
}

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
    startScan,
    resetScan,
    setResult,
  } = useScanStore()

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

    // 2) Durable cache (Blob / Redis) — upgrade handoff with the full pack.
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

    // 3) No cache — show an explicit empty state. Never auto-rescan (avoids
    // infinite loading when the scanner env is missing on a deploy).
    if (!handoff) {
      setPhase('missing')
    }
  }

  useEffect(() => {
    if (!domain || loadedFor.current === domain) return
    loadedFor.current = domain
    trackClientEvent('contract_open')
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

  const handleExport = (format: string) => {
    const curated = scanResult?.curatedTokens
    if (!curated) return

    const isCss = format === 'css'
    const content = isCss ? generateCSS(curated) : JSON.stringify(curated, null, 2)
    const blob = new Blob([content], {
      type: isCss ? 'text/css' : 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${domain}-tokens.${isCss ? 'css' : 'json'}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    trackClientEvent('download')
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

  if (phase === 'missing' && !scanResult) {
    return (
      <AppShell currentPage="site" recentDomain={domain}>
        <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-6 py-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Contract
          </p>
          <h1 className="font-serif text-4xl tracking-tight text-foreground">{domain}</h1>
          <p className="max-w-lg text-[15px] text-muted-foreground">
            No saved Design Contract for this domain yet. Scan from Chat, or run one here.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={runFreshScan}>Scan now</Button>
            <Button variant="outline" asChild>
              <Link href={`/?url=${encodeURIComponent(domain)}`}>Open in Chat</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell currentPage="site" recentDomain={domain}>
      <DesignDossier
        result={scanResult}
        isLoading={scanLoading || phase === 'hydrating' || phase === 'scanning'}
        progress={scanProgress}
        error={scanError || loadError}
        domain={domain}
        onExport={handleExport}
        onShare={handleShareUrl}
        onRescan={runFreshScan}
      />
    </AppShell>
  )
}
