"use client"

import { useState, useEffect } from "react"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { VercelScanInput } from "@/components/molecules/vercel-scan-input"
import { VercelScanProgress } from "@/components/molecules/vercel-scan-progress"
import { cn } from "@/lib/utils"

interface VercelScanDemoProps {
  className?: string
}

export function VercelScanDemo({ className }: VercelScanDemoProps) {
  const [searchValue, setSearchValue] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanResult, setScanResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Mock recent sites data
  const recentSites = [
    { domain: "stripe.com", tokens: 847, lastScanned: new Date().toISOString() },
    { domain: "linear.app", tokens: 623, lastScanned: new Date(Date.now() - 86400000).toISOString() },
    { domain: "github.com", tokens: 1284, lastScanned: new Date(Date.now() - 172800000).toISOString() },
    { domain: "vercel.com", tokens: 456, lastScanned: new Date(Date.now() - 259200000).toISOString() },
    { domain: "figma.com", tokens: 932, lastScanned: new Date(Date.now() - 345600000).toISOString() }
  ]

  // Mock scanning process
  const handleScan = async (url: string) => {
    console.log("Starting scan for:", url)
    setIsScanning(true)
    setProgress(0)
    setScanResult(null)
    setError(null)

    // Simulate scanning progress
    const progressSteps = [0, 15, 35, 60, 80, 95, 100]

    for (let i = 0; i < progressSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))
      setProgress(progressSteps[i])
    }

    // Simulate scan completion
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful result
    const mockResult = {
      tokensFound: Math.floor(Math.random() * 1000) + 200,
      confidence: 0.85 + Math.random() * 0.1,
      processingTime: 2.3 + Math.random() * 1.2,
      summary: {
        colors: Math.floor(Math.random() * 50) + 20,
        typography: Math.floor(Math.random() * 30) + 10,
        spacing: Math.floor(Math.random() * 25) + 8,
        components: Math.floor(Math.random() * 40) + 15
      }
    }

    setScanResult(mockResult)
    setIsScanning(false)
  }

  const handleNewScan = () => {
    setSearchValue("")
    setProgress(0)
    setScanResult(null)
    setError(null)
    setIsScanning(false)
  }

  const handleViewResults = () => {
    console.log("Viewing detailed results...")
  }

  const handleExport = () => {
    console.log("Exporting tokens...")
  }

  const handleShare = () => {
    console.log("Sharing scan results...")
  }

  // Get domain from URL for display
  const getDomainFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url.includes('://') ? url : `https://${url}`)
      return urlObj.hostname
    } catch {
      return url
    }
  }

  const currentDomain = searchValue ? getDomainFromUrl(searchValue) : ""

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Vercel-inspired Header */}
      <VercelHeader
        currentPage="home"
        showSearch={true}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onScan={handleScan}
        isScanning={isScanning}
        recentSites={recentSites}
      />

      {/* Main Content */}
      <main className="container-context py-12">

        {/* Hero Section (when no scan is active) */}
        {!isScanning && !scanResult && !error && (
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Extract design tokens<br />from any website
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Scan websites like Stripe, Linear, and GitHub to extract colors, typography, and spacing.
                Search across thousands of design tokens with AI-powered insights.
              </p>
            </div>

            {/* Large Search Input */}
            <div className="max-w-3xl mx-auto">
              <VercelScanInput
                value={searchValue}
                onChange={setSearchValue}
                onScan={handleScan}
                isLoading={isScanning}
                recentSites={recentSites}
                placeholder="Enter any website URL to extract design tokens..."
              />
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
              <div className="p-6 rounded-lg border border-border bg-card/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5v12a2 2 0 002 2 2 2 0 002-2V3z"/>
                    <path d="M17 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM17 3h-2v12a2 2 0 002 2 2 2 0 002-2V3z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Design Tokens</h3>
                <p className="text-sm text-muted-foreground">Extract colors, typography, spacing, and shadows with high accuracy and confidence scores.</p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card/50">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-chart-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
                    <path d="M21 16c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Component Analysis</h3>
                <p className="text-sm text-muted-foreground">Detect UI patterns, component libraries, and design system maturity automatically.</p>
              </div>

              <div className="p-6 rounded-lg border border-border bg-card/50">
                <div className="w-10 h-10 rounded-lg bg-chart-5/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-chart-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-2">AI Insights</h3>
                <p className="text-sm text-muted-foreground">Get intelligent recommendations for improving design consistency and accessibility.</p>
              </div>
            </div>
          </div>
        )}

        {/* Scanning Progress or Results */}
        {(isScanning || scanResult || error) && (
          <div className="max-w-5xl mx-auto">
            <VercelScanProgress
              domain={currentDomain}
              isLoading={isScanning}
              progress={progress}
              error={error}
              result={scanResult}
              onNewScan={handleNewScan}
              onViewResults={handleViewResults}
              onExport={handleExport}
              onShare={handleShare}
            />
          </div>
        )}

        {/* Popular Sites Examples */}
        {!isScanning && !scanResult && !error && (
          <div className="max-w-4xl mx-auto mt-20">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-center mb-6">
              Try scanning popular sites
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {recentSites.slice(0, 5).map((site) => (
                <button
                  key={site.domain}
                  onClick={() => {
                    setSearchValue(site.domain)
                    setTimeout(() => handleScan(site.domain), 100)
                  }}
                  className="group px-4 py-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-card/80 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-muted-foreground group-hover:bg-primary transition-colors" />
                  {site.domain}
                  <span className="text-xs text-muted-foreground">{site.tokens}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}