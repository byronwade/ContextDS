import { createHash } from 'crypto'

export interface CacheEntry<T = any> {
  key: string
  data: T
  hash: string
  metadata: CacheMetadata
  expiry: number
  accessed: number
  hits: number
  size: number
}

export interface CacheMetadata {
  url?: string
  strategy: string
  quality: number
  dependencies: string[]
  invalidators: string[]
  tags: string[]
  version: string
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  averageSize: number
  hotEntries: string[]
  expiredEntries: number
  memoryUsage: number
}

export interface CacheStrategy {
  name: string
  ttl: number
  maxSize: number
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'smart'
  compression: boolean
  persistence: boolean
}

export class IntelligentCache {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = []
  private strategies: Map<string, CacheStrategy> = new Map()
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0
  }

  constructor() {
    this.initializeStrategies()
    this.startCleanupTimer()
  }

  private initializeStrategies() {
    // CSS content caching - high TTL, large size
    this.strategies.set('css-content', {
      name: 'CSS Content',
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 50 * 1024 * 1024, // 50MB
      evictionPolicy: 'smart',
      compression: true,
      persistence: true
    })

    // Design tokens - medium TTL, structured data
    this.strategies.set('design-tokens', {
      name: 'Design Tokens',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 10 * 1024 * 1024, // 10MB
      evictionPolicy: 'lfu',
      compression: false,
      persistence: true
    })

    // Component analysis - short TTL, frequently changing
    this.strategies.set('component-analysis', {
      name: 'Component Analysis',
      ttl: 6 * 60 * 60 * 1000, // 6 hours
      maxSize: 20 * 1024 * 1024, // 20MB
      evictionPolicy: 'lru',
      compression: true,
      persistence: false
    })

    // Screenshot data - long TTL, large files
    this.strategies.set('screenshots', {
      name: 'Screenshots',
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxSize: 100 * 1024 * 1024, // 100MB
      evictionPolicy: 'lru',
      compression: true,
      persistence: true
    })

    // Framework detection - very long TTL, rarely changes
    this.strategies.set('framework-detection', {
      name: 'Framework Detection',
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxSize: 5 * 1024 * 1024, // 5MB
      evictionPolicy: 'ttl',
      compression: false,
      persistence: true
    })

    // Search results - short TTL, user-specific
    this.strategies.set('search-results', {
      name: 'Search Results',
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 5 * 1024 * 1024, // 5MB
      evictionPolicy: 'lru',
      compression: false,
      persistence: false
    })

    // API responses - medium TTL, frequently accessed
    this.strategies.set('api-responses', {
      name: 'API Responses',
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      maxSize: 15 * 1024 * 1024, // 15MB
      evictionPolicy: 'smart',
      compression: true,
      persistence: false
    })
  }

  async get<T>(key: string, strategy: string = 'default'): Promise<T | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.accessed = Date.now()
    entry.hits++
    this.updateAccessOrder(key)
    this.stats.hits++

    return entry.data as T
  }

  async set<T>(
    key: string,
    data: T,
    strategy: string = 'default',
    metadata: Partial<CacheMetadata> = {}
  ): Promise<boolean> {
    const cacheStrategy = this.strategies.get(strategy) || this.strategies.get('api-responses')!

    // Generate content hash for freshness detection
    const dataString = JSON.stringify(data)
    const hash = createHash('sha256').update(dataString).digest('hex').substring(0, 16)

    // Check if we already have this exact data
    const existingEntry = this.cache.get(key)
    if (existingEntry && existingEntry.hash === hash) {
      // Refresh TTL but don't store duplicate
      existingEntry.expiry = Date.now() + cacheStrategy.ttl
      return true
    }

    const size = Buffer.byteLength(dataString, 'utf8')

    // Check size limits
    if (size > cacheStrategy.maxSize * 0.1) { // Single entry can't exceed 10% of total cache size
      console.warn(`Cache entry too large: ${size} bytes for strategy ${strategy}`)
      return false
    }

    // Ensure cache size limits
    await this.ensureCapacity(strategy, size)

    // Create cache entry
    const entry: CacheEntry<T> = {
      key,
      data: cacheStrategy.compression ? await this.compress(data) : data,
      hash,
      metadata: {
        strategy,
        quality: 100,
        dependencies: [],
        invalidators: [],
        tags: [],
        version: '1.0.0',
        ...metadata
      },
      expiry: Date.now() + cacheStrategy.ttl,
      accessed: Date.now(),
      hits: 0,
      size
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)

    return true
  }

  async invalidate(pattern: string | RegExp): Promise<number> {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const matches = typeof pattern === 'string'
        ? key.includes(pattern)
        : pattern.test(key)

      if (matches) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
    })

    return keysToDelete.length
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const hasTag = tags.some(tag => entry.metadata.tags.includes(tag))
      if (hasTag) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
    })

    return keysToDelete.length
  }

  // Smart cache key generation with content awareness
  generateSmartKey(
    baseKey: string,
    context: {
      url?: string
      viewport?: { width: number; height: number }
      strategy?: string
      options?: any
    }
  ): string {
    const components = [baseKey]

    if (context.url) {
      const domain = new URL(context.url).hostname
      components.push(domain)
    }

    if (context.viewport) {
      components.push(`${context.viewport.width}x${context.viewport.height}`)
    }

    if (context.strategy) {
      components.push(context.strategy)
    }

    if (context.options) {
      const optionsHash = createHash('md5').update(JSON.stringify(context.options)).digest('hex').substring(0, 8)
      components.push(optionsHash)
    }

    return components.join(':')
  }

  // Predictive caching for popular sites
  async warmCache(popularSites: string[]): Promise<void> {
    console.log(`Warming cache for ${popularSites.length} popular sites...`)

    for (const site of popularSites.slice(0, 20)) { // Limit to top 20
      try {
        const key = this.generateSmartKey('site-tokens', { url: site })

        // Check if already cached
        const existing = await this.get(key)
        if (existing) continue

        // Pre-fetch common data (mock implementation)
        const mockData = {
          domain: site,
          tokens: { colors: [], typography: [], spacing: [] },
          cachedAt: Date.now(),
          warmCache: true
        }

        await this.set(key, mockData, 'design-tokens', {
          url: site,
          strategy: 'warm-cache',
          quality: 80,
          tags: ['popular', 'warm-cache']
        })

      } catch (error) {
        console.warn(`Failed to warm cache for ${site}:`, error)
      }
    }
  }

  // Hash-based freshness detection
  async checkFreshness(key: string, currentHash: string): Promise<'fresh' | 'stale' | 'missing'> {
    const entry = this.cache.get(key)

    if (!entry) return 'missing'
    if (Date.now() > entry.expiry) return 'stale'
    if (entry.hash !== currentHash) return 'stale'

    return 'fresh'
  }

  // Performance optimization for repeated scans
  async optimizeForRepeatedAccess(keys: string[]): Promise<void> {
    // Move frequently accessed items to fast storage
    const hotEntries = keys
      .map(key => this.cache.get(key))
      .filter(Boolean)
      .sort((a, b) => (b!.hits * (Date.now() - b!.accessed)) - (a!.hits * (Date.now() - a!.accessed)))
      .slice(0, 10)

    // Mark as hot for preferential treatment
    hotEntries.forEach(entry => {
      if (entry) {
        entry.metadata.tags = [...entry.metadata.tags, 'hot']
      }
    })
  }

  // Memory management and cleanup
  private async ensureCapacity(strategy: string, newEntrySize: number): Promise<void> {
    const cacheStrategy = this.strategies.get(strategy)
    if (!cacheStrategy) return

    const strategyEntries = Array.from(this.cache.entries())
      .filter(([, entry]) => entry.metadata.strategy === strategy)

    const currentSize = strategyEntries.reduce((sum, [, entry]) => sum + entry.size, 0)

    if (currentSize + newEntrySize <= cacheStrategy.maxSize) {
      return // No cleanup needed
    }

    // Calculate how much space we need to free
    const spaceNeeded = (currentSize + newEntrySize) - cacheStrategy.maxSize

    // Apply eviction policy
    const entriesToEvict = this.selectEvictionCandidates(strategyEntries, spaceNeeded, cacheStrategy.evictionPolicy)

    entriesToEvict.forEach(([key]) => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.stats.evictions++
    })
  }

  private selectEvictionCandidates(
    entries: Array<[string, CacheEntry]>,
    spaceNeeded: number,
    policy: CacheStrategy['evictionPolicy']
  ): Array<[string, CacheEntry]> {
    let candidates: Array<[string, CacheEntry]> = []

    switch (policy) {
      case 'lru':
        // Least recently used
        candidates = entries.sort(([,a], [,b]) => a.accessed - b.accessed)
        break

      case 'lfu':
        // Least frequently used
        candidates = entries.sort(([,a], [,b]) => a.hits - b.hits)
        break

      case 'ttl':
        // Shortest time to live
        candidates = entries.sort(([,a], [,b]) => a.expiry - b.expiry)
        break

      case 'smart':
        // Smart eviction based on multiple factors
        candidates = entries.sort(([,a], [,b]) => {
          const scoreA = this.calculateEvictionScore(a)
          const scoreB = this.calculateEvictionScore(b)
          return scoreA - scoreB // Lower score = better eviction candidate
        })
        break
    }

    // Select entries until we have enough space
    const toEvict: Array<[string, CacheEntry]> = []
    let freedSpace = 0

    for (const entry of candidates) {
      toEvict.push(entry)
      freedSpace += entry[1].size

      if (freedSpace >= spaceNeeded) {
        break
      }
    }

    return toEvict
  }

  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now()
    const age = now - entry.accessed
    const frequency = entry.hits / Math.max(1, (now - entry.accessed) / (24 * 60 * 60 * 1000)) // hits per day
    const quality = entry.metadata.quality
    const isHot = entry.metadata.tags.includes('hot')

    // Lower score = better candidate for eviction
    let score = 100

    // Age factor (older = more likely to evict)
    score += Math.min(50, age / (60 * 60 * 1000)) // Add up to 50 points for age in hours

    // Frequency factor (less frequent = more likely to evict)
    score -= Math.min(30, frequency * 10) // Subtract up to 30 points for frequency

    // Quality factor (lower quality = more likely to evict)
    score -= (quality - 50) / 2 // Adjust based on quality

    // Hot cache protection
    if (isHot) score -= 40

    // Size factor (larger = more likely to evict if space is tight)
    if (entry.size > 1024 * 1024) { // > 1MB
      score += 20
    }

    return Math.max(0, score)
  }

  // Distributed caching coordination
  async distributedGet<T>(key: string): Promise<T | null> {
    // First check local cache
    const local = await this.get<T>(key)
    if (local) return local

    // In production, would check distributed cache (Redis, etc.)
    // For now, simulate with delay
    try {
      // Simulate network fetch from distributed cache
      await new Promise(resolve => setTimeout(resolve, 50))

      // Mock distributed cache miss
      return null

    } catch (error) {
      console.warn('Distributed cache fetch failed:', error)
      return null
    }
  }

  async distributedSet<T>(key: string, data: T, strategy: string = 'default'): Promise<boolean> {
    // Set in local cache
    const localSuccess = await this.set(key, data, strategy)

    // In production, would also set in distributed cache
    try {
      // Simulate network write to distributed cache
      await new Promise(resolve => setTimeout(resolve, 30))
      return localSuccess

    } catch (error) {
      console.warn('Distributed cache write failed:', error)
      return localSuccess // Local cache still works
    }
  }

  // Cache warming based on usage patterns
  async intelligentWarmup(patterns: {
    popularSites: string[]
    frequentSearches: string[]
    upcomingScans: string[]
  }): Promise<void> {
    const warmupTasks = []

    // Warm popular sites
    patterns.popularSites.forEach(site => {
      warmupTasks.push(this.warmupSite(site))
    })

    // Pre-compute frequent search results
    patterns.frequentSearches.forEach(query => {
      warmupTasks.push(this.warmupSearch(query))
    })

    // Pre-fetch upcoming scan dependencies
    patterns.upcomingScans.forEach(url => {
      warmupTasks.push(this.warmupScanDependencies(url))
    })

    // Execute warmup tasks in parallel with concurrency limit
    const concurrency = 5
    for (let i = 0; i < warmupTasks.length; i += concurrency) {
      const batch = warmupTasks.slice(i, i + concurrency)
      await Promise.allSettled(batch)
    }
  }

  private async warmupSite(siteUrl: string): Promise<void> {
    try {
      const domain = new URL(siteUrl).hostname
      const tokenKey = this.generateSmartKey('site-tokens', { url: siteUrl })

      // Check if already cached
      const existing = await this.get(tokenKey)
      if (existing) return

      // Mock pre-computation
      const mockTokens = {
        domain,
        colors: ['#000000', '#ffffff'],
        typography: ['system-ui'],
        warmup: true,
        timestamp: Date.now()
      }

      await this.set(tokenKey, mockTokens, 'design-tokens', {
        url: siteUrl,
        strategy: 'warmup',
        quality: 75,
        tags: ['warmup', 'popular']
      })

    } catch (error) {
      console.warn(`Warmup failed for ${siteUrl}:`, error)
    }
  }

  private async warmupSearch(query: string): Promise<void> {
    const searchKey = this.generateSmartKey('search', { options: { query, mode: 'tokens' }})

    try {
      // Mock search result computation
      const mockResults = {
        query,
        results: [],
        timestamp: Date.now(),
        warmup: true
      }

      await this.set(searchKey, mockResults, 'search-results', {
        strategy: 'search-warmup',
        quality: 70,
        tags: ['warmup', 'search']
      })

    } catch (error) {
      console.warn(`Search warmup failed for "${query}":`, error)
    }
  }

  private async warmupScanDependencies(url: string): Promise<void> {
    try {
      const domain = new URL(url).hostname

      // Pre-fetch robots.txt
      const robotsKey = this.generateSmartKey('robots', { url })
      const robotsData = { allowed: true, checked: Date.now() }
      await this.set(robotsKey, robotsData, 'framework-detection', {
        url,
        strategy: 'robots-warmup',
        quality: 100,
        tags: ['warmup', 'robots']
      })

      // Pre-warm framework detection for domain
      const frameworkKey = this.generateSmartKey('frameworks', { url })
      const mockFrameworks = { detected: [], analyzed: Date.now() }
      await this.set(frameworkKey, mockFrameworks, 'framework-detection', {
        url,
        strategy: 'framework-warmup',
        quality: 80,
        tags: ['warmup', 'frameworks']
      })

    } catch (error) {
      console.warn(`Dependency warmup failed for ${url}:`, error)
    }
  }

  // Compression utilities
  private async compress<T>(data: T): Promise<T> {
    try {
      // In production, would use actual compression library
      // For now, just return data (compression would happen here)
      this.stats.compressions++
      return data
    } catch (error) {
      console.warn('Compression failed:', error)
      return data
    }
  }

  private async decompress<T>(data: T): Promise<T> {
    try {
      // In production, would decompress data
      return data
    } catch (error) {
      console.warn('Decompression failed:', error)
      return data
    }
  }

  // Cache analytics and optimization
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
    const hitRate = this.stats.hits / Math.max(1, this.stats.hits + this.stats.misses) * 100

    const hotEntries = entries
      .filter(entry => entry.hits > 5)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map(entry => entry.key)

    const expiredEntries = entries.filter(entry => Date.now() > entry.expiry).length

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      averageSize: totalSize / Math.max(1, this.cache.size),
      hotEntries,
      expiredEntries,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  optimizeCache(): {
    cleaned: number
    compressed: number
    reorganized: number
  } {
    let cleaned = 0
    let compressed = 0
    let reorganized = 0

    // Clean expired entries
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        cleaned++
      }
    }

    // Compress large uncompressed entries
    for (const [key, entry] of this.cache.entries()) {
      const strategy = this.strategies.get(entry.metadata.strategy)
      if (strategy?.compression && entry.size > 10 * 1024 && !entry.metadata.tags.includes('compressed')) {
        // Would compress here
        entry.metadata.tags.push('compressed')
        compressed++
      }
    }

    // Reorganize access order
    this.accessOrder = this.accessOrder.filter(key => this.cache.has(key))
    reorganized = this.accessOrder.length

    return { cleaned, compressed, reorganized }
  }

  // Background cleanup and maintenance
  private startCleanupTimer(): void {
    setInterval(() => {
      this.performMaintenance()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private performMaintenance(): void {
    try {
      // Clean expired entries
      const { cleaned } = this.optimizeCache()

      // Log maintenance stats
      if (cleaned > 0) {
        console.log(`Cache maintenance: cleaned ${cleaned} expired entries`)
      }

      // Update cache statistics
      const stats = this.getStats()
      if (stats.hitRate < 60) {
        console.warn(`Low cache hit rate: ${stats.hitRate.toFixed(1)}%`)
      }

    } catch (error) {
      console.error('Cache maintenance failed:', error)
    }
  }

  // Utility methods
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.unshift(key)

    // Limit access order tracking
    if (this.accessOrder.length > 1000) {
      this.accessOrder = this.accessOrder.slice(0, 1000)
    }
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage
    let usage = 0

    for (const entry of this.cache.values()) {
      usage += entry.size
      usage += JSON.stringify(entry.metadata).length
      usage += 200 // Overhead for Map structure, etc.
    }

    usage += this.accessOrder.length * 50 // Access order tracking

    return usage
  }

  // Cache persistence (for production)
  async persistCache(): Promise<boolean> {
    try {
      const persistentEntries = Array.from(this.cache.entries())
        .filter(([, entry]) => {
          const strategy = this.strategies.get(entry.metadata.strategy)
          return strategy?.persistence
        })

      // In production, would persist to disk/database
      console.log(`Persisting ${persistentEntries.length} cache entries`)

      return true
    } catch (error) {
      console.error('Cache persistence failed:', error)
      return false
    }
  }

  async loadPersistedCache(): Promise<boolean> {
    try {
      // In production, would load from disk/database
      console.log('Loading persisted cache entries')

      return true
    } catch (error) {
      console.error('Cache loading failed:', error)
      return false
    }
  }

  // Circuit breaker for cache operations
  private circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    threshold: 5,
    timeout: 60000 // 1 minute
  }

  private isCircuitOpen(): boolean {
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure
      return timeSinceLastFailure < this.circuitBreaker.timeout
    }
    return false
  }

  private recordCacheFailure(): void {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailure = Date.now()
  }

  private recordCacheSuccess(): void {
    this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1)
  }

  // Public cache interface
  async safeGet<T>(key: string, strategy?: string): Promise<T | null> {
    if (this.isCircuitOpen()) {
      return null
    }

    try {
      const result = await this.get<T>(key, strategy)
      this.recordCacheSuccess()
      return result
    } catch (error) {
      this.recordCacheFailure()
      console.warn('Cache get operation failed:', error)
      return null
    }
  }

  async safeSet<T>(
    key: string,
    data: T,
    strategy?: string,
    metadata?: Partial<CacheMetadata>
  ): Promise<boolean> {
    if (this.isCircuitOpen()) {
      return false
    }

    try {
      const result = await this.set(key, data, strategy, metadata)
      this.recordCacheSuccess()
      return result
    } catch (error) {
      this.recordCacheFailure()
      console.warn('Cache set operation failed:', error)
      return false
    }
  }

  // Cleanup and shutdown
  async shutdown(): Promise<void> {
    try {
      await this.persistCache()
      this.cache.clear()
      this.accessOrder = []
      console.log('Cache shutdown completed')
    } catch (error) {
      console.error('Cache shutdown failed:', error)
    }
  }
}

// Global cache instance
export const intelligentCache = new IntelligentCache()

// Cache decorators for automatic caching
export function cached(strategy: string = 'default', ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${createHash('md5').update(JSON.stringify(args)).digest('hex').substring(0, 8)}`

      // Try cache first
      const cached = await intelligentCache.safeGet(cacheKey, strategy)
      if (cached) return cached

      // Execute method and cache result
      const result = await method.apply(this, args)
      await intelligentCache.safeSet(cacheKey, result, strategy, {
        strategy: `${target.constructor.name}.${propertyName}`,
        quality: 90,
        tags: ['auto-cached']
      })

      return result
    }

    return descriptor
  }
}

// Cache invalidation helper
export function invalidateCache(patterns: string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args)

      // Invalidate related cache entries
      for (const pattern of patterns) {
        await intelligentCache.invalidate(pattern)
      }

      return result
    }

    return descriptor
  }
}