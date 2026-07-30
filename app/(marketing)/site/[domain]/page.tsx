'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/organisms/app-shell'
import { DesignDossier } from '@/components/dossier/design-dossier'
import { storedScanToClientResult } from '@/lib/scanner/scan-client-result'
import { useScanStore } from '@/stores/scan-store'

type SiteApiResponse = {
  hasData?: boolean
  shouldRescan?: boolean
  domain?: string
  scan?: Parameters<typeof storedScanToClientResult>[0] | null
}

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
  const domain = params.domain as string
  const loadedFor = useRef<string | null>(null)

  const {
    isScanning: scanLoading,
    result: scanResult,
    error: scanError,
    progress: scanProgress,
    startScan,
    resetScan,
    setResult,
  } = useScanStore()

  const loadSite = async (target: string) => {
    resetScan()
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(target)}`)
      if (response.ok) {
        const existing = (await response.json()) as SiteApiResponse
        if (existing.hasData && existing.scan) {
          // Already scanned (e.g. from chat widget) — show results, do not rescan.
          setResult(storedScanToClientResult(existing.scan))
          return
        }
      }
    } catch (error) {
      console.error('Error loading cached site data:', error)
    }

    // No cached contract — run a quality scan via the browser scanner when configured.
    await startScan(target, 'accurate')
  }

  useEffect(() => {
    if (!domain || loadedFor.current === domain) return
    loadedFor.current = domain
    void loadSite(domain)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per domain
  }, [domain])

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
  }

  const handleShareUrl = () => {
    const shareUrl = `${window.location.origin}/site/${encodeURIComponent(domain)}`
    void navigator.clipboard.writeText(shareUrl)
  }

  return (
    <AppShell currentPage="site" recentDomain={domain}>
      <DesignDossier
        result={scanResult}
        isLoading={scanLoading}
        progress={scanProgress}
        error={scanError}
        domain={domain}
        onExport={handleExport}
        onShare={handleShareUrl}
        onRescan={() => {
          resetScan()
          if (domain) {
            void startScan(domain, 'accurate')
          }
        }}
      />
    </AppShell>
  )
}
