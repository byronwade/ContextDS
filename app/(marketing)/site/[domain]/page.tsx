'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/organisms/app-shell'
import { ScanResultsLayout } from '@/components/organisms/scan-results-layout'
import { storedScanToClientResult } from '@/lib/scanner/scan-client-result'
import { useScanStore } from '@/stores/scan-store'

type SiteApiResponse = {
  hasData?: boolean
  shouldRescan?: boolean
  domain?: string
  scan?: Parameters<typeof storedScanToClientResult>[0] | null
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
    scanId,
    startScan,
    resetScan,
    setResult,
  } = useScanStore()

  useEffect(() => {
    if (!domain || loadedFor.current === domain) return
    loadedFor.current = domain
    void loadSite(domain)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per domain
  }, [domain])

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

  const generateCSS = (tokens: {
    colors?: Array<{ value: string }>
  }) => {
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

  return (
    <AppShell currentPage="site" recentDomain={domain}>
      <ScanResultsLayout
        result={scanResult}
        isLoading={scanLoading}
        scanId={scanId}
        progress={scanProgress}
        error={scanError}
        onCopy={handleCopyToken}
        onExport={handleExport}
        onShare={handleShareUrl}
        onNewScan={() => {
          resetScan()
          if (domain) {
            void startScan(domain, 'accurate')
          }
        }}
      />
    </AppShell>
  )
}
