/**
 * Ultra-Fast Cache System
 * Multi-layer caching for instant scanning results under 200ms
 */

import { LRUCache } from 'lru-cache'
import { db, sites, scans, tokenSets, layoutProfiles } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { hash } from 'crypto'

// Cache Configuration for Ultra Performance
const CACHE_SIZES = {
  scanResults: 500,    // Complete scan results
  cssContent: 1000,    // CSS source content
  tokenSets: 300,      // Generated token sets
  layoutDNA: 200,      // Layout analysis results
  aiAnalysis: 100,     // AI insights and analysis
  siteMetadata: 1000   // Site records and metadata
}

const CACHE_TTL = {
  scanResults: 1000 * 60 * 60 * 24,     // 24 hours
  cssContent: 1000 * 60 * 60 * 24 * 7,  // 7 days (CSS rarely changes)
  tokenSets: 1000 * 60 * 60 * 12,       // 12 hours
  layoutDNA: 1000 * 60 * 60 * 24,       // 24 hours
  aiAnalysis: 1000 * 60 * 60 * 24 * 3,  // 3 days (expensive to regenerate)
  siteMetadata: 1000 * 60 * 60 * 2      // 2 hours
}

export interface CachedScanResult {
  status: 'completed'
  domain: string
  url: string
  summary: any
  tokens: any
  curatedTokens: any
  layoutDNA: any
  promptPack: any
  aiInsights: any
  comprehensiveAnalysis: any
  designSystemSpec: any
  brandAnalysis: any
  componentLibrary: any
  versionInfo: any
  metadata: any
  database: any
  cacheInfo: {
    cached: true
    cacheHit: string
    retrievedAt: number
    originalScanTime: number
  }
}

export interface CacheKey {
  url: string
  mode: 'fast' | 'accurate'
  includeComputed: boolean
  version: string
}

export class UltraCache {
  private scanResults: LRUCache<string, CachedScanResult>
  private cssContent: LRUCache<string, any>
  private tokenSets: LRUCache<string, any>
  private layoutDNA: LRUCache<string, any>
  private aiAnalysis: LRUCache<string, any>
  private siteMetadata: LRUCache<string, any>

  constructor() {
    this.scanResults = new LRUCache({
      max: CACHE_SIZES.scanResults,
      ttl: CACHE_TTL.scanResults,
      allowStale: false,
      updateAgeOnGet: true
    })

    this.cssContent = new LRUCache({
      max: CACHE_SIZES.cssContent,
      ttl: CACHE_TTL.cssContent,
      allowStale: true,  // Stale CSS is often still valid
      updateAgeOnGet: true
    })

    this.tokenSets = new LRUCache({
      max: CACHE_SIZES.tokenSets,
      ttl: CACHE_TTL.tokenSets,
      allowStale: false,
      updateAgeOnGet: true
    })

    this.layoutDNA = new LRUCache({
      max: CACHE_SIZES.layoutDNA,
      ttl: CACHE_TTL.layoutDNA,
      allowStale: true,
      updateAgeOnGet: true
    })

    this.aiAnalysis = new LRUCache({
      max: CACHE_SIZES.aiAnalysis,
      ttl: CACHE_TTL.aiAnalysis,
      allowStale: true, // AI analysis can be stale and still valuable
      updateAgeOnGet: true
    })

    this.siteMetadata = new LRUCache({
      max: CACHE_SIZES.siteMetadata,
      ttl: CACHE_TTL.siteMetadata,
      allowStale: false,
      updateAgeOnGet: true
    })

    console.log('🚀 Ultra cache system initialized with multi-layer caching')
  }

  // Generate cache key for scan request
  private generateCacheKey(params: CacheKey): string {
    const normalized = params.url.toLowerCase().replace(/\/+$/, '') // Remove trailing slashes
    const keyData = `${normalized}|${params.mode}|${params.includeComputed}|${params.version}`
    return hash('sha256', keyData).toString('hex').slice(0, 16)
  }

  // Get complete cached scan result (fastest path - 5-10ms)
  async getCachedScanResult(params: CacheKey): Promise<CachedScanResult | null> {
    const key = this.generateCacheKey(params)
    const cached = this.scanResults.get(key)

    if (cached) {
      console.log(`⚡ CACHE HIT: Complete scan result for ${params.url} (${key})`)

      // Update retrieval timestamp
      cached.cacheInfo.retrievedAt = Date.now()

      return cached
    }

    console.log(`❌ CACHE MISS: No cached scan result for ${params.url}`)
    return null
  }

  // Store complete scan result for future instant retrieval
  setCachedScanResult(params: CacheKey, result: any, originalScanTime: number): void {
    const key = this.generateCacheKey(params)

    const cachedResult: CachedScanResult = {
      ...result,
      cacheInfo: {
        cached: true,
        cacheHit: 'full-result',
        retrievedAt: Date.now(),
        originalScanTime
      }
    }

    this.scanResults.set(key, cachedResult)
    console.log(`💾 CACHED: Complete scan result for ${params.url} (${originalScanTime}ms -> instant)`)
  }

  // Get cached CSS content by URL
  getCachedCssContent(url: string): any | null {
    const cached = this.cssContent.get(url)
    if (cached) {
      console.log(`⚡ CSS CACHE HIT: ${url}`)
      return cached
    }
    return null
  }

  // Store CSS content for reuse
  setCachedCssContent(url: string, content: any): void {
    this.cssContent.set(url, content)
    console.log(`💾 CSS CACHED: ${url} (${content.length || 0} sources)`)
  }

  // Get cached tokens for a domain
  getCachedTokens(domain: string): any | null {
    const cached = this.tokenSets.get(domain)
    if (cached) {
      console.log(`⚡ TOKEN CACHE HIT: ${domain}`)
      return cached
    }
    return null
  }

  // Store generated tokens
  setCachedTokens(domain: string, tokens: any): void {
    this.tokenSets.set(domain, tokens)
    console.log(`💾 TOKENS CACHED: ${domain}`)
  }

  // Get cached layout DNA
  getCachedLayoutDNA(url: string): any | null {
    const cached = this.layoutDNA.get(url)
    if (cached) {
      console.log(`⚡ LAYOUT CACHE HIT: ${url}`)
      return cached
    }
    return null
  }

  // Store layout analysis
  setCachedLayoutDNA(url: string, layoutDNA: any): void {
    this.layoutDNA.set(url, layoutDNA)
    console.log(`💾 LAYOUT CACHED: ${url}`)
  }

  // Get cached AI analysis
  getCachedAiAnalysis(domain: string): any | null {
    const cached = this.aiAnalysis.get(domain)
    if (cached) {
      console.log(`⚡ AI CACHE HIT: ${domain}`)
      return cached
    }
    return null
  }

  // Store AI analysis results
  setCachedAiAnalysis(domain: string, analysis: any): void {
    this.aiAnalysis.set(domain, analysis)
    console.log(`💾 AI ANALYSIS CACHED: ${domain}`)
  }

  // Get cached site metadata
  getCachedSiteMetadata(domain: string): any | null {
    const cached = this.siteMetadata.get(domain)
    if (cached) {
      console.log(`⚡ SITE CACHE HIT: ${domain}`)
      return cached
    }
    return null
  }

  // Store site metadata
  setCachedSiteMetadata(domain: string, metadata: any): void {
    this.siteMetadata.set(domain, metadata)
    console.log(`💾 SITE METADATA CACHED: ${domain}`)
  }

  // Try to reconstruct scan result from partial cache hits (fast path - 20-50ms)
  async tryPartialCacheReconstruction(params: CacheKey): Promise<CachedScanResult | null> {
    const domain = new URL(params.url).hostname

    console.log(`🔄 Attempting partial cache reconstruction for ${domain}`)

    const [
      cachedTokens,
      cachedLayout,
      cachedAi,
      cachedSite
    ] = await Promise.all([
      this.getCachedTokens(domain),
      this.getCachedLayoutDNA(params.url),
      this.getCachedAiAnalysis(domain),
      this.getCachedSiteMetadata(domain)
    ])

    // Need at least tokens and layout to reconstruct
    if (!cachedTokens || !cachedLayout) {
      console.log(`❌ Insufficient cached data for reconstruction`)
      return null
    }

    console.log(`⚡ PARTIAL RECONSTRUCTION: Using cached components for ${domain}`)

    // Reconstruct scan result from cached components
    const reconstructed: CachedScanResult = {
      status: 'completed',
      domain,
      url: params.url,
      summary: cachedTokens.summary || {
        tokensExtracted: 0,
        confidence: 80,
        completeness: 85,
        reliability: 90,
        processingTime: 0
      },
      tokens: cachedTokens.tokenGroups || cachedTokens.tokens,
      curatedTokens: cachedTokens.curatedTokens,
      layoutDNA: cachedLayout,
      promptPack: cachedTokens.promptPack || {},
      aiInsights: cachedAi?.insights || null,
      comprehensiveAnalysis: cachedAi?.comprehensive || null,
      designSystemSpec: cachedAi?.designSystem || null,
      brandAnalysis: cachedTokens.brandAnalysis || { style: 'modern', maturity: 'mature', consistency: 80 },
      componentLibrary: cachedAi?.components || null,
      versionInfo: cachedTokens.versionInfo || { versionNumber: 1, isNewVersion: false },
      metadata: {
        cssSources: cachedTokens.cssSources || 0,
        staticCssSources: cachedTokens.staticCssSources || 0,
        computedCssSources: cachedTokens.computedCssSources || 0,
        tokenSetId: cachedTokens.tokenSetId || 'cached',
        scanId: 'cached-scan',
        promptPackVersion: '2.1.0-cached',
        metrics: { totalDurationMs: 0, entries: [] },
        tokenQuality: cachedTokens.qualityInsights || {},
        isLargeSite: cachedSite?.isLargeSite || false,
        memoryUsedMb: 0
      },
      database: {
        siteId: cachedSite?.siteId || 'cached',
        scanId: 'cached-scan',
        tokenSetId: cachedTokens.tokenSetId || 'cached',
        stored: true
      },
      cacheInfo: {
        cached: true,
        cacheHit: 'partial-reconstruction',
        retrievedAt: Date.now(),
        originalScanTime: 0
      }
    }

    return reconstructed
  }

  // Try to get recent scan from database (medium path - 50-150ms)
  async tryDatabaseCache(params: CacheKey): Promise<CachedScanResult | null> {
    const domain = new URL(params.url).hostname

    console.log(`🗄️ Checking database cache for ${domain}`)

    try {
      // Get most recent successful scan
      const recentScan = await db
        .select({
          scan: scans,
          site: sites,
          tokenSet: tokenSets,
          layout: layoutProfiles
        })
        .from(scans)
        .innerJoin(sites, eq(scans.siteId, sites.id))
        .leftJoin(tokenSets, eq(tokenSets.scanId, scans.id))
        .leftJoin(layoutProfiles, eq(layoutProfiles.scanId, scans.id))
        .where(eq(sites.domain, domain))
        .orderBy(desc(scans.finishedAt))
        .limit(1)

      if (recentScan.length === 0) {
        console.log(`❌ No database cache found for ${domain}`)
        return null
      }

      const { scan, site, tokenSet, layout } = recentScan[0]

      // Check if scan is recent enough (within 24 hours)
      const scanAge = Date.now() - new Date(scan.finishedAt || scan.startedAt).getTime()
      if (scanAge > CACHE_TTL.scanResults) {
        console.log(`⏰ Database cache too old for ${domain} (${Math.round(scanAge / 1000 / 60)} minutes)`)
        return null
      }

      console.log(`⚡ DATABASE CACHE HIT: Recent scan found for ${domain}`)

      // Reconstruct from database
      const reconstructed: CachedScanResult = {
        status: 'completed',
        domain,
        url: params.url,
        summary: {
          tokensExtracted: Object.keys(tokenSet?.tokensJson || {}).length,
          confidence: parseFloat(tokenSet?.consensusScore || '0.8') * 100,
          completeness: 85,
          reliability: 90,
          processingTime: 0
        },
        tokens: tokenSet?.tokensJson || {},
        curatedTokens: null,
        layoutDNA: layout?.profileJson || {},
        promptPack: tokenSet?.packJson || {},
        aiInsights: null,
        comprehensiveAnalysis: null,
        designSystemSpec: null,
        brandAnalysis: { style: 'modern', maturity: 'mature', consistency: 80 },
        componentLibrary: null,
        versionInfo: {
          versionNumber: tokenSet?.versionNumber || 1,
          isNewVersion: false
        },
        metadata: {
          cssSources: scan.cssSourceCount || 0,
          staticCssSources: scan.cssSourceCount || 0,
          computedCssSources: 0,
          tokenSetId: tokenSet?.id || 'db-cached',
          scanId: scan.id,
          promptPackVersion: '2.1.0-db',
          metrics: scan.metricsJson || { totalDurationMs: 0, entries: [] },
          tokenQuality: {},
          isLargeSite: false,
          memoryUsedMb: 0
        },
        database: {
          siteId: site.id,
          scanId: scan.id,
          tokenSetId: tokenSet?.id || 'db-cached',
          stored: true
        },
        cacheInfo: {
          cached: true,
          cacheHit: 'database',
          retrievedAt: Date.now(),
          originalScanTime: scanAge
        }
      }

      // Store in memory cache for next time
      this.setCachedScanResult(params, reconstructed, scanAge)

      return reconstructed

    } catch (error) {
      console.error('Database cache lookup failed:', error)
      return null
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      scanResults: {
        size: this.scanResults.size,
        max: this.scanResults.max,
        hitRatio: this.scanResults.calculatedSize / this.scanResults.max
      },
      cssContent: {
        size: this.cssContent.size,
        max: this.cssContent.max,
        hitRatio: this.cssContent.calculatedSize / this.cssContent.max
      },
      tokenSets: {
        size: this.tokenSets.size,
        max: this.tokenSets.max,
        hitRatio: this.tokenSets.calculatedSize / this.tokenSets.max
      },
      layoutDNA: {
        size: this.layoutDNA.size,
        max: this.layoutDNA.max,
        hitRatio: this.layoutDNA.calculatedSize / this.layoutDNA.max
      },
      aiAnalysis: {
        size: this.aiAnalysis.size,
        max: this.aiAnalysis.max,
        hitRatio: this.aiAnalysis.calculatedSize / this.aiAnalysis.max
      },
      siteMetadata: {
        size: this.siteMetadata.size,
        max: this.siteMetadata.max,
        hitRatio: this.siteMetadata.calculatedSize / this.siteMetadata.max
      }
    }
  }

  // Clear all caches (for testing/debugging)
  clearAll(): void {
    this.scanResults.clear()
    this.cssContent.clear()
    this.tokenSets.clear()
    this.layoutDNA.clear()
    this.aiAnalysis.clear()
    this.siteMetadata.clear()
    console.log('🧹 All caches cleared')
  }

  // Warm cache with popular sites
  async warmCache(popularDomains: string[]): Promise<void> {
    console.log(`🔥 Warming cache with ${popularDomains.length} popular domains`)

    for (const domain of popularDomains) {
      try {
        const params: CacheKey = {
          url: `https://${domain}`,
          mode: 'fast',
          includeComputed: false,
          version: '2.1.0'
        }

        // Try database cache first
        const cached = await this.tryDatabaseCache(params)
        if (cached) {
          console.log(`🔥 Warmed cache for ${domain}`)
        }

      } catch (error) {
        console.warn(`Failed to warm cache for ${domain}:`, error)
      }
    }

    console.log('🔥 Cache warming completed')
  }
}

// Global cache instance
export const ultraCache = new UltraCache()

// Convenience functions
export async function getCachedScan(params: CacheKey): Promise<CachedScanResult | null> {
  // Try memory cache first (5-10ms)
  let result = await ultraCache.getCachedScanResult(params)
  if (result) return result

  // Try partial reconstruction (20-50ms)
  result = await ultraCache.tryPartialCacheReconstruction(params)
  if (result) return result

  // Try database cache (50-150ms)
  result = await ultraCache.tryDatabaseCache(params)
  if (result) return result

  return null
}

export function cacheScanResult(params: CacheKey, result: any, originalTime: number): void {
  ultraCache.setCachedScanResult(params, result, originalTime)
}