"use client"

export interface StoredScanResult {
  id: string
  url: string
  domain: string
  status: 'completed' | 'failed' | 'partial'
  scannedAt: string

  // Core data
  tokens: {
    colors: Array<{
      name: string
      value: string
      confidence: number
      usage: number
      semantic?: string
    }>
    typography: Array<{
      name: string
      value: string
      property: string
      confidence: number
      usage: number
    }>
    spacing: Array<{
      name: string
      value: string
      confidence: number
      usage: number
    }>
    radius?: Array<{
      name: string
      value: string
      confidence: number
      usage: number
    }>
    shadows?: Array<{
      name: string
      value: string
      confidence: number
      usage: number
    }>
    motion?: Array<{
      name: string
      value: string
      property: string
      confidence: number
      usage: number
    }>
  }

  // Summary metrics
  summary: {
    tokensExtracted: number
    confidence: number
    completeness: number
    reliability: number
    processingTime: number
  }

  // Analysis results
  layoutDNA?: any
  brandAnalysis?: any
  accessibilityReport?: any
  frameworks?: {
    detected: string[]
    confidence: number
    evidence: string[]
  }

  // Metadata
  metadata: {
    strategiesUsed: string[]
    fallbacksUsed: string[]
    aiModelsUsed: string[]
    totalCost: number
    compressionUsed: boolean
    extractionStrategies: number
    qualityEnhancements?: string[]
  }

  error?: string
}

export interface ScanHistory {
  scans: StoredScanResult[]
  totalScans: number
  lastUpdated: string
}

class ScanStorage {
  private readonly STORAGE_KEY = 'contextds-scan-results'
  private readonly HISTORY_KEY = 'contextds-scan-history'
  private readonly MAX_STORED_SCANS = 50 // Limit localStorage usage

  // Store scan result with deduplication and optimization
  storeScanResult(result: StoredScanResult): void {
    try {
      const existing = this.getScanHistory()

      // Remove existing scan for same domain to avoid duplicates
      existing.scans = existing.scans.filter(scan => scan.domain !== result.domain)

      // Add new scan at the beginning
      existing.scans.unshift(result)

      // Limit storage size
      if (existing.scans.length > this.MAX_STORED_SCANS) {
        existing.scans = existing.scans.slice(0, this.MAX_STORED_SCANS)
      }

      // Update metadata
      existing.totalScans = existing.scans.length
      existing.lastUpdated = new Date().toISOString()

      // Store in localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing))

      console.log(`Stored scan result for ${result.domain} - ${result.summary.tokensExtracted} tokens`)

    } catch (error) {
      console.error('Failed to store scan result:', error)
    }
  }

  // Get scan result by domain
  getScanResult(domain: string): StoredScanResult | null {
    try {
      const history = this.getScanHistory()
      return history.scans.find(scan => scan.domain === domain) || null
    } catch (error) {
      console.error('Failed to get scan result:', error)
      return null
    }
  }

  // Get all scan history
  getScanHistory(): ScanHistory {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load scan history:', error)
    }

    // Return empty history
    return {
      scans: [],
      totalScans: 0,
      lastUpdated: new Date().toISOString()
    }
  }

  // Get recent scans for search/display
  getRecentScans(limit: number = 10): StoredScanResult[] {
    const history = this.getScanHistory()
    return history.scans
      .filter(scan => scan.status === 'completed')
      .slice(0, limit)
  }

  // Search through stored tokens
  searchStoredTokens(query: string, options: {
    caseInsensitive?: boolean
    category?: string
    minConfidence?: number
  } = {}): Array<{
    id: string
    type: 'token'
    name: string
    value: string
    site: string
    category: string
    confidence: number
    usage?: number
    scannedAt: string
  }> {
    const history = this.getScanHistory()
    const results: any[] = []

    const searchTerm = options.caseInsensitive ? query.toLowerCase() : query

    history.scans.forEach(scan => {
      if (scan.status !== 'completed') return

      // Search through all token categories
      Object.entries(scan.tokens).forEach(([category, tokens]) => {
        if (options.category && category !== options.category) return

        tokens.forEach((token, index) => {
          const tokenName = options.caseInsensitive ? token.name.toLowerCase() : token.name
          const tokenValue = options.caseInsensitive ? token.value.toLowerCase() : token.value

          if (tokenName.includes(searchTerm) || tokenValue.includes(searchTerm)) {
            if (!options.minConfidence || token.confidence >= options.minConfidence) {
              results.push({
                id: `${scan.id}-${category}-${index}`,
                type: 'token',
                name: token.name,
                value: token.value,
                site: scan.domain,
                category,
                confidence: token.confidence,
                usage: token.usage,
                scannedAt: scan.scannedAt
              })
            }
          }
        })
      })
    })

    // Sort by confidence and recency
    return results.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 5) return confidenceDiff
      return new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    }).slice(0, 50) // Limit results
  }

  // Get storage statistics
  getStorageStats(): {
    totalScans: number
    totalTokens: number
    storageSize: number
    oldestScan: string | null
    newestScan: string | null
    averageConfidence: number
    topDomains: Array<{ domain: string; scans: number }>
  } {
    const history = this.getScanHistory()

    let totalTokens = 0
    let totalConfidence = 0
    let confidenceCount = 0
    const domainCounts = new Map<string, number>()

    history.scans.forEach(scan => {
      if (scan.status === 'completed') {
        totalTokens += scan.summary.tokensExtracted
        totalConfidence += scan.summary.confidence
        confidenceCount++

        domainCounts.set(scan.domain, (domainCounts.get(scan.domain) || 0) + 1)
      }
    })

    const topDomains = Array.from(domainCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, scans]) => ({ domain, scans }))

    const timestamps = history.scans.map(s => s.scannedAt).sort()

    return {
      totalScans: history.scans.length,
      totalTokens,
      storageSize: new Blob([localStorage.getItem(this.STORAGE_KEY) || '']).size,
      oldestScan: timestamps[0] || null,
      newestScan: timestamps[timestamps.length - 1] || null,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      topDomains
    }
  }

  // Export scan data
  exportScanData(format: 'json' | 'csv' = 'json'): string {
    const history = this.getScanHistory()

    if (format === 'csv') {
      const headers = ['Domain', 'URL', 'Tokens Extracted', 'Confidence', 'Scanned At', 'Status']
      const rows = history.scans.map(scan => [
        scan.domain,
        scan.url,
        scan.summary.tokensExtracted.toString(),
        scan.summary.confidence.toString(),
        scan.scannedAt,
        scan.status
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(history, null, 2)
  }

  // Import scan data
  importScanData(data: string, format: 'json' | 'csv' = 'json'): boolean {
    try {
      if (format === 'json') {
        const imported = JSON.parse(data) as ScanHistory
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(imported))
        return true
      }

      // CSV import would be implemented here
      return false

    } catch (error) {
      console.error('Failed to import scan data:', error)
      return false
    }
  }

  // Clear all scan data
  clearAllScans(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('Cleared all scan data')
    } catch (error) {
      console.error('Failed to clear scan data:', error)
    }
  }

  // Clear old scans (keep only recent ones)
  clearOldScans(keepDays: number = 30): number {
    try {
      const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000)
      const history = this.getScanHistory()

      const before = history.scans.length
      history.scans = history.scans.filter(scan =>
        new Date(scan.scannedAt).getTime() > cutoff
      )

      const removed = before - history.scans.length

      if (removed > 0) {
        history.totalScans = history.scans.length
        history.lastUpdated = new Date().toISOString()
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
      }

      return removed

    } catch (error) {
      console.error('Failed to clear old scans:', error)
      return 0
    }
  }

  // Get scan analytics for dashboard
  getScanAnalytics(): {
    totalScans: number
    successRate: number
    averageTokens: number
    averageConfidence: number
    scansByDay: Array<{ date: string; count: number }>
    topCategories: Array<{ category: string; tokens: number }>
    qualityTrend: 'improving' | 'stable' | 'declining'
  } {
    const history = this.getScanHistory()
    const completedScans = history.scans.filter(s => s.status === 'completed')

    // Calculate daily scan counts
    const scansByDay = new Map<string, number>()
    history.scans.forEach(scan => {
      const date = scan.scannedAt.split('T')[0]
      scansByDay.set(date, (scansByDay.get(date) || 0) + 1)
    })

    // Calculate token category distribution
    const categoryTotals = new Map<string, number>()
    completedScans.forEach(scan => {
      Object.entries(scan.tokens).forEach(([category, tokens]) => {
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + tokens.length)
      })
    })

    const topCategories = Array.from(categoryTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([category, tokens]) => ({ category, tokens }))

    // Calculate quality trend (simplified)
    const recentScans = completedScans.slice(0, 10)
    const olderScans = completedScans.slice(10, 20)

    let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (recentScans.length >= 5 && olderScans.length >= 5) {
      const recentAvg = recentScans.reduce((sum, s) => sum + s.summary.confidence, 0) / recentScans.length
      const olderAvg = olderScans.reduce((sum, s) => sum + s.summary.confidence, 0) / olderScans.length

      if (recentAvg > olderAvg + 5) qualityTrend = 'improving'
      else if (recentAvg < olderAvg - 5) qualityTrend = 'declining'
    }

    return {
      totalScans: history.scans.length,
      successRate: history.scans.length > 0 ? (completedScans.length / history.scans.length) * 100 : 0,
      averageTokens: completedScans.length > 0 ? completedScans.reduce((sum, s) => sum + s.summary.tokensExtracted, 0) / completedScans.length : 0,
      averageConfidence: completedScans.length > 0 ? completedScans.reduce((sum, s) => sum + s.summary.confidence, 0) / completedScans.length : 0,
      scansByDay: Array.from(scansByDay.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 30)
        .map(([date, count]) => ({ date, count })),
      topCategories,
      qualityTrend
    }
  }

  // Check if browser supports localStorage
  isAvailable(): boolean {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  // Get total storage usage
  getStorageUsage(): {
    used: number
    available: number
    percentage: number
  } {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY) || ''
      const used = new Blob([data]).size
      const available = 5 * 1024 * 1024 // 5MB typical localStorage limit

      return {
        used,
        available,
        percentage: (used / available) * 100
      }
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 }
    }
  }

  // Optimize storage (remove redundant data, compress if needed)
  optimizeStorage(): {
    sizeBefore: number
    sizeAfter: number
    scansRemoved: number
  } {
    try {
      const before = this.getStorageUsage()
      const history = this.getScanHistory()

      const optimized = {
        scans: history.scans.map(scan => ({
          ...scan,
          // Remove large metadata that's not essential for display
          layoutDNA: scan.layoutDNA ? { summary: 'Layout DNA available' } : undefined,
          brandAnalysis: scan.brandAnalysis ? { summary: 'Brand analysis available' } : undefined,
          accessibilityReport: scan.accessibilityReport ? {
            overallScore: scan.accessibilityReport.overallScore,
            wcagLevel: scan.accessibilityReport.wcagLevel
          } : undefined
        })).slice(0, 30), // Keep only 30 most recent
        totalScans: Math.min(30, history.totalScans),
        lastUpdated: new Date().toISOString()
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(optimized))

      const after = this.getStorageUsage()
      const scansRemoved = history.scans.length - optimized.scans.length

      console.log(`Storage optimized: ${before.used} → ${after.used} bytes, ${scansRemoved} scans removed`)

      return {
        sizeBefore: before.used,
        sizeAfter: after.used,
        scansRemoved
      }

    } catch (error) {
      console.error('Storage optimization failed:', error)
      return { sizeBefore: 0, sizeAfter: 0, scansRemoved: 0 }
    }
  }

  // Backup data to file download
  downloadBackup(): void {
    try {
      const history = this.getScanHistory()
      const data = JSON.stringify(history, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `contextds-scan-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Backup download failed:', error)
    }
  }
}

// Global instance
export const scanStorage = new ScanStorage()

// Utility functions
export function convertApiResultToStoredResult(apiResult: any): StoredScanResult {
  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url: apiResult.url,
    domain: apiResult.domain,
    status: apiResult.status,
    scannedAt: apiResult.metadata?.extractedAt || new Date().toISOString(),

    tokens: apiResult.tokens,
    summary: apiResult.summary,

    layoutDNA: apiResult.layoutDNA,
    brandAnalysis: apiResult.brandAnalysis,
    accessibilityReport: apiResult.accessibilityReport,
    frameworks: apiResult.frameworks,

    metadata: apiResult.metadata,
    error: apiResult.error
  }
}

export function getTokensForSearch(): Array<{
  id: string
  type: 'token'
  name: string
  value: string
  site: string
  category: string
  confidence: number
  usage?: number
}> {
  const history = scanStorage.getScanHistory()
  const tokens: any[] = []

  history.scans.forEach(scan => {
    if (scan.status !== 'completed') return

    Object.entries(scan.tokens).forEach(([category, tokenList]) => {
      tokenList.forEach((token, index) => {
        tokens.push({
          id: `${scan.id}-${category}-${index}`,
          type: 'token',
          name: token.name,
          value: token.value,
          site: scan.domain,
          category,
          confidence: token.confidence,
          usage: token.usage
        })
      })
    })
  })

  return tokens.sort((a, b) => b.confidence - a.confidence)
}

export function getSitesForSearch(): Array<{
  id: string
  type: 'site'
  domain: string
  title?: string
  tokensExtracted: number
  confidence: number
  lastScanned: string
  frameworks?: string[]
}> {
  const history = scanStorage.getScanHistory()

  return history.scans
    .filter(scan => scan.status === 'completed')
    .map(scan => ({
      id: scan.id,
      type: 'site' as const,
      domain: scan.domain,
      title: scan.brandAnalysis?.style || scan.domain,
      tokensExtracted: scan.summary.tokensExtracted,
      confidence: scan.summary.confidence,
      lastScanned: scan.scannedAt,
      frameworks: scan.frameworks?.detected
    }))
    .sort((a, b) => new Date(b.lastScanned).getTime() - new Date(a.lastScanned).getTime())
}