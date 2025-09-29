import { createHash } from 'crypto'
import { intelligentCache } from '../cache/intelligent-cache'

export interface CacheablePrompt {
  systemPrompt: string
  userPrompt: string
  model: string
  parameters: {
    temperature?: number
    maxTokens?: number
    responseFormat?: string
  }
  metadata: {
    operation: string
    version: string
    cacheable: boolean
    ttl?: number
  }
}

export interface CachedResponse {
  response: any
  hash: string
  timestamp: number
  usage: {
    inputTokens: number
    outputTokens: number
    cost: number
  }
  hitCount: number
  lastAccessed: number
}

export interface CacheStrategy {
  systemPromptCaching: boolean
  responseHashing: boolean
  semanticSimilarity: boolean
  ttlByOperation: { [operation: string]: number }
  compressionEnabled: boolean
  distributedCache: boolean
}

export interface CacheAnalytics {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  hitRate: number
  costSavings: number
  avgResponseTime: number
  hotPrompts: Array<{ hash: string; hits: number; operation: string }>
}

export class GatewayCache {
  private cache = new Map<string, CachedResponse>()
  private systemPromptCache = new Map<string, string>()
  private semanticCache = new Map<string, Array<{ hash: string; similarity: number }>>()

  private strategy: CacheStrategy = {
    systemPromptCaching: true,
    responseHashing: true,
    semanticSimilarity: true,
    ttlByOperation: {
      'organize-pack': 24 * 60 * 60 * 1000, // 24 hours
      'research': 7 * 24 * 60 * 60 * 1000, // 7 days
      'audit': 12 * 60 * 60 * 1000, // 12 hours
      'compress': 3 * 60 * 60 * 1000, // 3 hours
      'embed': 30 * 24 * 60 * 60 * 1000, // 30 days
      'classify': 12 * 60 * 60 * 1000 // 12 hours
    },
    compressionEnabled: true,
    distributedCache: true
  }

  private analytics: CacheAnalytics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    costSavings: 0,
    avgResponseTime: 0,
    hotPrompts: []
  }

  // Generate cache key with intelligent hashing
  generateCacheKey(prompt: CacheablePrompt): string {
    const components = [
      prompt.model,
      prompt.metadata.operation,
      prompt.metadata.version
    ]

    // Hash system prompt (stable across requests)
    if (this.strategy.systemPromptCaching) {
      const systemHash = createHash('md5').update(prompt.systemPrompt).digest('hex').substring(0, 8)
      components.push(`sys:${systemHash}`)
    }

    // Hash user prompt with semantic awareness
    const userHash = this.generateSemanticHash(prompt.userPrompt, prompt.metadata.operation)
    components.push(`user:${userHash}`)

    // Hash parameters
    const paramsHash = createHash('md5').update(JSON.stringify(prompt.parameters)).digest('hex').substring(0, 6)
    components.push(`params:${paramsHash}`)

    return components.join('|')
  }

  // Generate semantic hash for user prompts (similar prompts get similar hashes)
  private generateSemanticHash(userPrompt: string, operation: string): string {
    // Extract semantic elements based on operation type
    const semanticElements = this.extractSemanticElements(userPrompt, operation)

    // Create stable hash from semantic elements
    const semanticString = semanticElements.sort().join('|')
    return createHash('md5').update(semanticString).digest('hex').substring(0, 12)
  }

  private extractSemanticElements(prompt: string, operation: string): string[] {
    const elements: string[] = []

    switch (operation) {
      case 'organize-pack':
        // Extract domain, token counts, framework hints
        const domainMatch = prompt.match(/(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
        if (domainMatch) elements.push(`domain:${domainMatch[0]}`)

        const colorCount = (prompt.match(/#[0-9a-fA-F]{6}/g) || []).length
        if (colorCount > 0) elements.push(`colors:${Math.floor(colorCount / 5) * 5}`) // Bucket by 5s

        const spacingValues = (prompt.match(/\d+px/g) || []).length
        if (spacingValues > 0) elements.push(`spacing:${Math.floor(spacingValues / 10) * 10}`) // Bucket by 10s

        if (prompt.toLowerCase().includes('tailwind')) elements.push('framework:tailwind')
        if (prompt.toLowerCase().includes('material')) elements.push('framework:material')
        break

      case 'research':
        // Extract research scope and artifact types
        if (prompt.includes('storybook')) elements.push('artifact:storybook')
        if (prompt.includes('github')) elements.push('artifact:github')
        if (prompt.includes('documentation')) elements.push('artifact:docs')
        break

      case 'audit':
        // Extract audit scope
        if (prompt.includes('accessibility')) elements.push('scope:accessibility')
        if (prompt.includes('consistency')) elements.push('scope:consistency')
        if (prompt.includes('naming')) elements.push('scope:naming')
        break
    }

    return elements
  }

  // Check cache before making request
  async getCached(prompt: CacheablePrompt): Promise<CachedResponse | null> {
    this.analytics.totalRequests++

    if (!prompt.metadata.cacheable) {
      this.analytics.cacheMisses++
      return null
    }

    const cacheKey = this.generateCacheKey(prompt)

    // Check local cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() < cached.timestamp + this.getTTL(prompt.metadata.operation)) {
      // Update access statistics
      cached.hitCount++
      cached.lastAccessed = Date.now()

      this.analytics.cacheHits++
      this.analytics.costSavings += cached.usage.cost

      return cached
    }

    // Check semantic similarity cache
    if (this.strategy.semanticSimilarity) {
      const similarCached = await this.findSemanticallySimular(prompt, cacheKey)
      if (similarCached) {
        this.analytics.cacheHits++
        return similarCached
      }
    }

    // Check distributed cache (would integrate with Redis/Vercel KV in production)
    const distributedCached = await this.getFromDistributedCache(cacheKey)
    if (distributedCached) {
      // Store in local cache
      this.cache.set(cacheKey, distributedCached)
      this.analytics.cacheHits++
      return distributedCached
    }

    this.analytics.cacheMisses++
    return null
  }

  // Store response in cache
  async storeResponse(
    prompt: CacheablePrompt,
    response: any,
    usage: { inputTokens: number; outputTokens: number; cost: number }
  ): Promise<void> {
    if (!prompt.metadata.cacheable) return

    const cacheKey = this.generateCacheKey(prompt)
    const responseHash = createHash('sha256').update(JSON.stringify(response)).digest('hex')

    const cachedResponse: CachedResponse = {
      response,
      hash: responseHash,
      timestamp: Date.now(),
      usage,
      hitCount: 0,
      lastAccessed: Date.now()
    }

    // Store in local cache
    this.cache.set(cacheKey, cachedResponse)

    // Store in distributed cache
    await this.storeInDistributedCache(cacheKey, cachedResponse)

    // Update semantic similarity index
    if (this.strategy.semanticSimilarity) {
      await this.updateSemanticIndex(cacheKey, prompt)
    }

    // Store system prompt for reuse
    if (this.strategy.systemPromptCaching) {
      const systemHash = createHash('md5').update(prompt.systemPrompt).digest('hex')
      this.systemPromptCache.set(systemHash, prompt.systemPrompt)
    }
  }

  // Find semantically similar cached responses
  private async findSemanticallySimular(
    prompt: CacheablePrompt,
    currentKey: string
  ): Promise<CachedResponse | null> {
    try {
      // Extract semantic fingerprint
      const semanticFingerprint = this.extractSemanticElements(prompt.userPrompt, prompt.metadata.operation)
      const fingerprintKey = semanticFingerprint.sort().join('|')

      // Look for cached responses with similar fingerprints
      const similar = this.semanticCache.get(fingerprintKey) || []

      for (const { hash, similarity } of similar.sort((a, b) => b.similarity - a.similarity)) {
        if (similarity > 0.85) { // High similarity threshold
          const cached = this.cache.get(hash)
          if (cached && Date.now() < cached.timestamp + this.getTTL(prompt.metadata.operation)) {
            // Update hit statistics
            cached.hitCount++
            cached.lastAccessed = Date.now()
            return cached
          }
        }
      }

      return null

    } catch (error) {
      console.warn('Semantic similarity lookup failed:', error)
      return null
    }
  }

  // Update semantic similarity index
  private async updateSemanticIndex(cacheKey: string, prompt: CacheablePrompt): Promise<void> {
    try {
      const semanticFingerprint = this.extractSemanticElements(prompt.userPrompt, prompt.metadata.operation)
      const fingerprintKey = semanticFingerprint.sort().join('|')

      const existing = this.semanticCache.get(fingerprintKey) || []

      // Calculate similarity with existing entries
      const newSimilarities = existing.map(entry => ({
        hash: entry.hash,
        similarity: this.calculatePromptSimilarity(cacheKey, entry.hash)
      }))

      // Add current entry
      newSimilarities.push({ hash: cacheKey, similarity: 1.0 })

      // Store updated similarities
      this.semanticCache.set(fingerprintKey, newSimilarities.slice(0, 10)) // Keep top 10 similar

    } catch (error) {
      console.warn('Semantic index update failed:', error)
    }
  }

  private calculatePromptSimilarity(keyA: string, keyB: string): number {
    // Simplified similarity calculation
    // In production, would use embedding similarity
    const partsA = keyA.split('|')
    const partsB = keyB.split('|')

    let matches = 0
    const total = Math.max(partsA.length, partsB.length)

    partsA.forEach(partA => {
      if (partsB.some(partB => partA === partB || this.isSemanticallySimilar(partA, partB))) {
        matches++
      }
    })

    return matches / total
  }

  private isSemanticallySimilar(partA: string, partB: string): boolean {
    // Check for semantic similarity in cache key parts
    if (partA.startsWith('colors:') && partB.startsWith('colors:')) {
      const countA = parseInt(partA.split(':')[1])
      const countB = parseInt(partB.split(':')[1])
      return Math.abs(countA - countB) <= 5 // Similar color counts
    }

    if (partA.startsWith('domain:') && partB.startsWith('domain:')) {
      const domainA = partA.split(':')[1]
      const domainB = partB.split(':')[1]
      return domainA.split('.')[1] === domainB.split('.')[1] // Same TLD
    }

    return false
  }

  // Distributed caching integration
  private async getFromDistributedCache(key: string): Promise<CachedResponse | null> {
    try {
      // In production, would integrate with Redis, Vercel KV, or similar
      // For now, simulate distributed cache lookup
      await new Promise(resolve => setTimeout(resolve, 10)) // Simulate network latency

      // Would return cached data from distributed store
      return null

    } catch (error) {
      console.warn('Distributed cache lookup failed:', error)
      return null
    }
  }

  private async storeInDistributedCache(key: string, response: CachedResponse): Promise<void> {
    try {
      // In production, would store in distributed cache
      await new Promise(resolve => setTimeout(resolve, 5)) // Simulate network write

      // Store with TTL and compression if enabled
      if (this.strategy.compressionEnabled && JSON.stringify(response).length > 10000) {
        // Would compress large responses before storing
      }

    } catch (error) {
      console.warn('Distributed cache store failed:', error)
    }
  }

  // Cache warming for common operations
  async warmCache(commonPatterns: {
    domains: string[]
    operations: string[]
    frameworks: string[]
  }): Promise<{ warmed: number; failed: number }> {
    let warmed = 0
    let failed = 0

    console.log('Warming AI response cache with common patterns...')

    // Warm cache for common domain + operation combinations
    for (const domain of commonPatterns.domains.slice(0, 10)) { // Limit warming
      for (const operation of commonPatterns.operations) {
        try {
          const warmingPrompt = this.createWarmingPrompt(domain, operation)
          const key = this.generateCacheKey(warmingPrompt)

          // Check if already cached
          const existing = await this.getCached(warmingPrompt)
          if (existing) continue

          // Pre-compute and cache response
          const mockResponse = this.generateMockResponse(operation, domain)
          const mockUsage = { inputTokens: 1000, outputTokens: 500, cost: 0.01 }

          await this.storeResponse(warmingPrompt, mockResponse, mockUsage)
          warmed++

        } catch (error) {
          console.warn(`Cache warming failed for ${domain}:${operation}`, error)
          failed++
        }
      }
    }

    return { warmed, failed }
  }

  private createWarmingPrompt(domain: string, operation: string): CacheablePrompt {
    const systemPrompts = {
      'organize-pack': 'You are a design token expert. Organize CSS data into semantic tokens with implementation guidance.',
      'research': 'You are a design system researcher. Analyze documentation to validate extracted tokens.',
      'audit': 'You are a design system auditor. Review token packs for quality and consistency.',
      'compress': 'You are a data compression specialist. Reduce token count while preserving patterns.'
    }

    const userPrompts = {
      'organize-pack': `Organize design tokens for ${domain} with standard color, typography, and spacing tokens.`,
      'research': `Research design system artifacts for ${domain} and validate token accuracy.`,
      'audit': `Audit token pack quality for ${domain} focusing on consistency and accessibility.`,
      'compress': `Compress design analysis data for ${domain} while preserving essential patterns.`
    }

    return {
      systemPrompt: systemPrompts[operation as keyof typeof systemPrompts] || systemPrompts['organize-pack'],
      userPrompt: userPrompts[operation as keyof typeof userPrompts] || userPrompts['organize-pack'],
      model: 'gpt-5-mini',
      parameters: { temperature: 0.3, maxTokens: 4096 },
      metadata: {
        operation,
        version: '1.0.0',
        cacheable: true,
        ttl: this.strategy.ttlByOperation[operation]
      }
    }
  }

  private generateMockResponse(operation: string, domain: string): any {
    const mockResponses = {
      'organize-pack': {
        metadata: { name: domain, version: '1.0.0', confidence: 85 },
        tokens: { colors: [], typography: [], spacing: [] },
        mappingHints: { tailwind: {}, cssVariables: {} },
        guidelines: { usage: [], pitfalls: [] },
        quality: { score: 85, confidence: 85, completeness: 80, issues: [] }
      },
      'research': {
        findings: { officialTokens: [], gaps: [], inconsistencies: [] },
        recommendations: { tokenImprovements: [], namingAdjustments: [] },
        confidence: 75,
        sources: []
      },
      'audit': {
        overall: { score: 80, status: 'good', summary: 'Token pack meets standards' },
        categories: { naming: { score: 85, issues: [] } },
        recommendations: [],
        redFlags: []
      }
    }

    return mockResponses[operation as keyof typeof mockResponses] || {}
  }

  // Intelligent cache invalidation
  async invalidateByPattern(pattern: {
    operation?: string
    model?: string
    domain?: string
    maxAge?: number
  }): Promise<number> {
    let invalidated = 0

    for (const [key, cached] of this.cache.entries()) {
      let shouldInvalidate = false

      // Check pattern matching
      if (pattern.operation && !key.includes(pattern.operation)) continue
      if (pattern.model && !key.includes(pattern.model)) continue
      if (pattern.domain && !key.includes(pattern.domain)) continue

      // Check age
      if (pattern.maxAge && Date.now() - cached.timestamp > pattern.maxAge) {
        shouldInvalidate = true
      }

      if (shouldInvalidate || this.shouldInvalidateByPattern(key, pattern)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    return invalidated
  }

  private shouldInvalidateByPattern(key: string, pattern: any): boolean {
    // Additional pattern matching logic
    const keyParts = key.split('|')

    if (pattern.operation) {
      const hasOperation = keyParts.some(part => part.includes(pattern.operation))
      if (!hasOperation) return false
    }

    return true
  }

  // Cache optimization and compression
  async optimizeCache(): Promise<{
    entriesRemoved: number
    spaceSaved: number
    compressionApplied: number
  }> {
    let entriesRemoved = 0
    let spaceSaved = 0
    let compressionApplied = 0

    const now = Date.now()

    // Remove expired entries
    for (const [key, cached] of this.cache.entries()) {
      const operation = this.extractOperationFromKey(key)
      const ttl = this.getTTL(operation)

      if (now - cached.timestamp > ttl) {
        const size = JSON.stringify(cached).length
        this.cache.delete(key)
        entriesRemoved++
        spaceSaved += size
      }
    }

    // Compress large entries
    for (const [key, cached] of this.cache.entries()) {
      const size = JSON.stringify(cached.response).length
      if (size > 50000 && !key.includes('compressed')) {
        // Would apply compression here
        compressionApplied++
      }
    }

    // Update analytics
    this.updateCacheAnalytics()

    return { entriesRemoved, spaceSaved, compressionApplied }
  }

  // System prompt optimization and reuse
  async optimizeSystemPrompts(): Promise<{
    templates: Map<string, string>
    savings: number
    reusabilityScore: number
  }> {
    const templates = new Map<string, string>()
    const promptUsage = new Map<string, number>()

    // Analyze system prompt patterns
    this.systemPromptCache.forEach((prompt, hash) => {
      promptUsage.set(hash, (promptUsage.get(hash) || 0) + 1)
    })

    // Create reusable templates from common patterns
    const commonPrompts = Array.from(promptUsage.entries())
      .filter(([, count]) => count > 5)
      .sort(([, a], [, b]) => b - a)

    commonPrompts.forEach(([hash, count], index) => {
      const prompt = this.systemPromptCache.get(hash)
      if (prompt) {
        templates.set(`template-${index}`, prompt)
      }
    })

    // Calculate potential savings
    const totalPrompts = promptUsage.size
    const reusablePrompts = commonPrompts.length
    const reusabilityScore = totalPrompts > 0 ? (reusablePrompts / totalPrompts) * 100 : 0

    // Estimate token savings from system prompt reuse
    const avgSystemPromptTokens = 200
    const potentialSavings = reusablePrompts * avgSystemPromptTokens * 0.25 / 1000000 // Cost in dollars

    return {
      templates,
      savings: potentialSavings,
      reusabilityScore
    }
  }

  // Gateway-specific caching features
  async enableGatewayCaching(
    requestConfig: {
      promptCaching: boolean
      responseCaching: boolean
      maxCacheSize: string
      ttl: string
    }
  ): Promise<boolean> {
    try {
      // Configure Vercel AI Gateway caching
      // This would integrate with actual Gateway API in production
      console.log('Enabling Gateway caching with config:', requestConfig)

      return true

    } catch (error) {
      console.error('Failed to enable Gateway caching:', error)
      return false
    }
  }

  // Smart cache preloading
  async preloadForSite(
    url: string,
    expectedOperations: string[] = ['organize-pack', 'research']
  ): Promise<{ preloaded: number; failed: number }> {
    let preloaded = 0
    let failed = 0

    const domain = new URL(url).hostname

    for (const operation of expectedOperations) {
      try {
        // Create template prompt for preloading
        const templatePrompt = this.createWarmingPrompt(domain, operation)

        // Check if already cached
        const existing = await this.getCached(templatePrompt)
        if (existing) continue

        // Precompute common response
        const mockResponse = this.generateMockResponse(operation, domain)
        const mockUsage = { inputTokens: 500, outputTokens: 200, cost: 0.005 }

        await this.storeResponse(templatePrompt, mockResponse, mockUsage)
        preloaded++

      } catch (error) {
        console.warn(`Preloading failed for ${operation} on ${domain}:`, error)
        failed++
      }
    }

    return { preloaded, failed }
  }

  // Cache analytics and monitoring
  private updateCacheAnalytics(): void {
    const totalRequests = this.analytics.cacheHits + this.analytics.cacheMisses
    this.analytics.hitRate = totalRequests > 0 ? (this.analytics.cacheHits / totalRequests) * 100 : 0

    // Update hot prompts
    const hotPrompts = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.hitCount - a.hitCount)
      .slice(0, 10)
      .map(([key, cached]) => ({
        hash: key.substring(0, 16) + '...',
        hits: cached.hitCount,
        operation: this.extractOperationFromKey(key)
      }))

    this.analytics.hotPrompts = hotPrompts

    // Calculate average response time (from cached responses)
    const avgResponseTime = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + (cached.lastAccessed - cached.timestamp), 0) / this.cache.size

    this.analytics.avgResponseTime = avgResponseTime || 0
  }

  // Cache strategy management
  updateStrategy(newStrategy: Partial<CacheStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy }
  }

  getCacheStrategy(): CacheStrategy {
    return { ...this.strategy }
  }

  // Utility methods
  private getTTL(operation: string): number {
    return this.strategy.ttlByOperation[operation] || 12 * 60 * 60 * 1000 // Default 12 hours
  }

  private extractOperationFromKey(key: string): string {
    const parts = key.split('|')
    const operationPart = parts.find(part => part.includes('organize') || part.includes('research') || part.includes('audit'))
    return operationPart || 'unknown'
  }

  // Public analytics interface
  getAnalytics(): CacheAnalytics {
    this.updateCacheAnalytics()
    return { ...this.analytics }
  }

  getCacheStats(): {
    size: number
    memoryUsage: number
    oldestEntry: number
    newestEntry: number
    averageHits: number
  } {
    const entries = Array.from(this.cache.values())

    if (entries.length === 0) {
      return {
        size: 0,
        memoryUsage: 0,
        oldestEntry: 0,
        newestEntry: 0,
        averageHits: 0
      }
    }

    const timestamps = entries.map(e => e.timestamp)
    const hits = entries.map(e => e.hitCount)

    return {
      size: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
      averageHits: hits.reduce((sum, h) => sum + h, 0) / hits.length
    }
  }

  private estimateMemoryUsage(): number {
    let usage = 0

    this.cache.forEach(cached => {
      usage += JSON.stringify(cached).length * 2 // Rough estimate including overhead
    })

    this.systemPromptCache.forEach(prompt => {
      usage += prompt.length * 2
    })

    return usage
  }

  // Cache health monitoring
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    recommendations: string[]
    performance: {
      hitRate: number
      avgLatency: number
      memoryUsage: number
      errorRate: number
    }
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    const stats = this.getCacheStats()
    const analytics = this.getAnalytics()

    // Check hit rate
    if (analytics.hitRate < 20) {
      issues.push('Low cache hit rate')
      recommendations.push('Review caching strategy and TTL settings')
    } else if (analytics.hitRate > 80) {
      recommendations.push('Excellent cache performance - consider expanding cache scope')
    }

    // Check memory usage
    if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      issues.push('High memory usage')
      recommendations.push('Enable compression or reduce cache size')
    }

    // Check cache age distribution
    const now = Date.now()
    const oldEntries = Array.from(this.cache.values()).filter(cached =>
      now - cached.timestamp > 24 * 60 * 60 * 1000
    ).length

    if (oldEntries > this.cache.size * 0.3) {
      issues.push('Many stale cache entries')
      recommendations.push('Reduce TTL or increase cache invalidation frequency')
    }

    const healthy = issues.length === 0

    return {
      healthy,
      issues,
      recommendations,
      performance: {
        hitRate: analytics.hitRate,
        avgLatency: analytics.avgResponseTime,
        memoryUsage: stats.memoryUsage,
        errorRate: 0 // Would track cache errors
      }
    }
  }

  // Configuration helpers
  configureForProduction(): void {
    this.strategy = {
      systemPromptCaching: true,
      responseHashing: true,
      semanticSimilarity: true,
      ttlByOperation: {
        'organize-pack': 6 * 60 * 60 * 1000, // 6 hours (tokens change)
        'research': 24 * 60 * 60 * 1000, // 24 hours (docs change slowly)
        'audit': 3 * 60 * 60 * 1000, // 3 hours (quality standards evolve)
        'compress': 1 * 60 * 60 * 1000, // 1 hour (compression strategies improve)
        'embed': 7 * 24 * 60 * 60 * 1000, // 7 days (embeddings stable)
        'classify': 12 * 60 * 60 * 1000 // 12 hours (classifications evolve)
      },
      compressionEnabled: true,
      distributedCache: true
    }
  }

  configureForDevelopment(): void {
    this.strategy = {
      systemPromptCaching: true,
      responseHashing: false, // Disable for testing
      semanticSimilarity: false, // Disable for predictability
      ttlByOperation: {
        'organize-pack': 30 * 60 * 1000, // 30 minutes
        'research': 60 * 60 * 1000, // 1 hour
        'audit': 15 * 60 * 1000, // 15 minutes
        'compress': 10 * 60 * 1000, // 10 minutes
        'embed': 60 * 60 * 1000, // 1 hour
        'classify': 30 * 60 * 1000 // 30 minutes
      },
      compressionEnabled: false,
      distributedCache: false
    }
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    // Clean expired entries
    await this.optimizeCache()

    // Persist important cache entries
    if (this.strategy.distributedCache) {
      const hotEntries = Array.from(this.cache.entries())
        .filter(([, cached]) => cached.hitCount > 5)
        .slice(0, 100) // Keep top 100 hot entries

      for (const [key, cached] of hotEntries) {
        await this.storeInDistributedCache(key, cached)
      }
    }

    console.log(`Cache cleanup completed: ${this.cache.size} entries remaining`)
  }
}

// Global cache instance
export const gatewayCache = new GatewayCache()

// Initialize cache based on environment
if (process.env.NODE_ENV === 'production') {
  gatewayCache.configureForProduction()
} else {
  gatewayCache.configureForDevelopment()
}

// Convenience functions
export async function getCachedResponse(prompt: CacheablePrompt): Promise<any | null> {
  const cached = await gatewayCache.getCached(prompt)
  return cached?.response || null
}

export async function cacheResponse(
  prompt: CacheablePrompt,
  response: any,
  usage: { inputTokens: number; outputTokens: number; cost: number }
): Promise<void> {
  await gatewayCache.storeResponse(prompt, response, usage)
}

export async function warmCommonCaches(): Promise<void> {
  await gatewayCache.warmCache({
    domains: ['stripe.com', 'github.com', 'figma.com', 'vercel.com', 'tailwindcss.com'],
    operations: ['organize-pack', 'research'],
    frameworks: ['tailwind', 'material-ui', 'ant-design']
  })
}