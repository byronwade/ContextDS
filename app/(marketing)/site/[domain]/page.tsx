"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { ScanResultsLayout } from "@/components/organisms/scan-results-layout"
import { useScanStore } from "@/stores/scan-store"

export default function SitePage() {
  const params = useParams()
  const domain = params.domain as string
  const [searchQuery, setSearchQuery] = useState(domain || "")

  const {
    isScanning: scanLoading,
    result: scanResult,
    error: scanError,
    metrics: scanMetrics,
    progress: scanProgress,
    scanId,
    startScan,
    resetScan
  } = useScanStore()

  useEffect(() => {
    setSearchQuery(domain || "")
  }, [domain])

  useEffect(() => {
    if (domain) {
      // Check if domain exists in database first, then scan if needed
      checkExistingData(domain)
    }
  }, [domain])

  const checkExistingData = async (domain: string) => {
    try {
      // Check if we have existing data for this domain
      const response = await fetch(`/api/sites/${encodeURIComponent(domain)}`)

      if (response.ok) {
        const existingData = await response.json()
        if (existingData.hasData) {
          // Domain exists with data, but still trigger a fresh scan to update
          startScan(domain)
        } else {
          // No existing data, start fresh scan
          startScan(domain)
        }
      } else {
        // No existing data, start fresh scan
        startScan(domain)
      }
    } catch (error) {
      console.error('Error checking existing data:', error)
      // Fall back to scanning
      startScan(domain)
    }
  }

  const handleCopyToken = (value: string) => {
    navigator.clipboard.writeText(value)
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

  const generateCSS = (tokens: any) => {
    let css = ':root {\n'
    if (tokens.colors) {
      css += '  /* Colors */\n'
      tokens.colors.forEach((token: any, i: number) => {
        css += `  --color-${i + 1}: ${token.value};\n`
      })
    }
    css += '}\n'
    return css
  }

  const handleShareUrl = () => {
    const shareUrl = `${window.location.origin}/site/${encodeURIComponent(domain)}`
    navigator.clipboard.writeText(shareUrl)
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden antialiased">
      {/* Header */}
      <VercelHeader
        currentPage="site"
        showSearch={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onScan={(newDomain) => {
          // Allow scanning different domains from the site page
          window.location.href = `/site/${encodeURIComponent(newDomain)}`
        }}
        isScanning={scanLoading}
      />

      {/* Scan Results */}
      <ScanResultsLayout
        result={scanResult}
        isLoading={scanLoading}
        scanId={scanId}
        progress={scanProgress}
        error={scanError}
        onCopy={handleCopyToken}
        onExport={handleExport}
        onShare={handleShareUrl}
        showDiff={false}
        onToggleDiff={() => {}}
        onNewScan={() => {
          resetScan()
          // Restart scan for current domain
          if (domain) {
            checkExistingData(domain)
          }
        }}
        onScanHistory={() => {
          console.log('Show scan history')
        }}
      />
    </div>
  )
}