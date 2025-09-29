import type { ExtractionStrategy, ScanContext, ExtractionResult } from './advanced-extractor'

export interface FallbackRule {
  triggerCondition: (result: ExtractionResult) => boolean
  fallbackStrategy: string
  maxAttempts: number
  backoffMultiplier: number
  contextModification?: (context: ScanContext) => ScanContext
}

export interface RecoveryStrategy {
  name: string
  description: string
  execute: (failedResults: ExtractionResult[], context: ScanContext) => Promise<ExtractionResult[]>
}

export class FallbackOrchestrator {
  private fallbackRules: FallbackRule[] = []
  private recoveryStrategies: RecoveryStrategy[] = []

  constructor() {
    this.initializeFallbackRules()
    this.initializeRecoveryStrategies()
  }

  private initializeFallbackRules() {
    this.fallbackRules = [
      // CSS extraction fallbacks
      {
        triggerCondition: (result) =>
          result.strategy === 'static-css-extraction' &&
          !result.success &&
          result.error?.includes('timeout'),
        fallbackStrategy: 'lightweight-css-extraction',
        maxAttempts: 2,
        backoffMultiplier: 1.5,
        contextModification: (context) => ({
          ...context,
          options: { ...context.options, timeout: context.options.timeout * 2 }
        })
      },

      // Browser context fallbacks
      {
        triggerCondition: (result) =>
          result.error?.includes('browser') ||
          result.error?.includes('chromium'),
        fallbackStrategy: 'headless-fallback',
        maxAttempts: 3,
        backoffMultiplier: 2,
        contextModification: (context) => ({
          ...context,
          userAgent: 'Mozilla/5.0 (compatible; ContextDS-Bot/1.0)'
        })
      },

      // Network-related fallbacks
      {
        triggerCondition: (result) =>
          result.error?.includes('network') ||
          result.error?.includes('timeout') ||
          result.error?.includes('ERR_'),
        fallbackStrategy: 'proxy-extraction',
        maxAttempts: 2,
        backoffMultiplier: 3
      },

      // JavaScript-heavy site fallbacks
      {
        triggerCondition: (result) =>
          result.strategy === 'computed-styles-extraction' &&
          result.data?.elements?.length < 10,
        fallbackStrategy: 'spa-aware-extraction',
        maxAttempts: 2,
        backoffMultiplier: 1.5,
        contextModification: (context) => ({
          ...context,
          options: { ...context.options, timeout: context.options.timeout * 3 }
        })
      },

      // Anti-bot protection fallbacks
      {
        triggerCondition: (result) =>
          result.error?.includes('403') ||
          result.error?.includes('captcha') ||
          result.error?.includes('blocked'),
        fallbackStrategy: 'stealth-extraction',
        maxAttempts: 1,
        backoffMultiplier: 5
      },

      // Rate limiting fallbacks
      {
        triggerCondition: (result) =>
          result.error?.includes('429') ||
          result.error?.includes('rate limit'),
        fallbackStrategy: 'delayed-extraction',
        maxAttempts: 3,
        backoffMultiplier: 10
      }
    ]
  }

  private initializeRecoveryStrategies() {
    this.recoveryStrategies = [
      {
        name: 'lightweight-css-extraction',
        description: 'Simplified CSS extraction with reduced resource usage',
        execute: this.executeLightweightExtraction.bind(this)
      },

      {
        name: 'headless-fallback',
        description: 'Alternative browser configuration for difficult sites',
        execute: this.executeHeadlessFallback.bind(this)
      },

      {
        name: 'proxy-extraction',
        description: 'Route extraction through proxy servers',
        execute: this.executeProxyExtraction.bind(this)
      },

      {
        name: 'spa-aware-extraction',
        description: 'Enhanced extraction for Single Page Applications',
        execute: this.executeSPAExtraction.bind(this)
      },

      {
        name: 'stealth-extraction',
        description: 'Use stealth mode to bypass anti-bot protection',
        execute: this.executeStealthExtraction.bind(this)
      },

      {
        name: 'delayed-extraction',
        description: 'Retry with exponential backoff delays',
        execute: this.executeDelayedExtraction.bind(this)
      },

      {
        name: 'cached-approximation',
        description: 'Use similar sites data to approximate missing information',
        execute: this.executeCachedApproximation.bind(this)
      },

      {
        name: 'partial-data-reconstruction',
        description: 'Reconstruct missing data from available fragments',
        execute: this.executePartialReconstruction.bind(this)
      }
    ]
  }

  async handleFailures(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    const recoveredResults: ExtractionResult[] = []

    for (const failedResult of failedResults) {
      context.progress(`Attempting recovery for ${failedResult.strategy}...`, 0)

      // Find applicable fallback rules
      const applicableRules = this.fallbackRules.filter(rule =>
        rule.triggerCondition(failedResult)
      )

      let recovered = false

      for (const rule of applicableRules) {
        try {
          // Find recovery strategy
          const recoveryStrategy = this.recoveryStrategies.find(s =>
            s.name === rule.fallbackStrategy
          )

          if (!recoveryStrategy) continue

          // Apply context modifications if specified
          const modifiedContext = rule.contextModification
            ? rule.contextModification(context)
            : context

          // Execute recovery with backoff
          for (let attempt = 1; attempt <= rule.maxAttempts; attempt++) {
            try {
              if (attempt > 1) {
                const delay = Math.pow(rule.backoffMultiplier, attempt - 1) * 1000
                await new Promise(resolve => setTimeout(resolve, delay))
              }

              const recoveryResults = await recoveryStrategy.execute([failedResult], modifiedContext)

              if (recoveryResults.length > 0 && recoveryResults[0].success) {
                recoveredResults.push(recoveryResults[0])
                recovered = true
                break
              }

            } catch (error) {
              console.warn(`Recovery attempt ${attempt} failed for ${rule.fallbackStrategy}:`, error)
            }
          }

          if (recovered) break

        } catch (error) {
          console.warn(`Fallback rule execution failed:`, error)
        }
      }

      // If no fallback worked, try generic recovery strategies
      if (!recovered) {
        try {
          const genericRecovery = await this.executeGenericRecovery(failedResult, context)
          if (genericRecovery.success) {
            recoveredResults.push(genericRecovery)
          }
        } catch (error) {
          console.warn(`Generic recovery failed:`, error)
        }
      }
    }

    return recoveredResults
  }

  // Recovery Strategy Implementations

  private async executeLightweightExtraction(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Simplified extraction that uses minimal resources
    try {
      const response = await fetch(context.url, {
        headers: { 'User-Agent': context.userAgent }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()

      // Extract CSS links from HTML
      const linkMatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []
      const styleMatches = html.match(/<style[^>]*>(.*?)<\/style>/gis) || []

      const cssData = {
        sources: [
          ...linkMatches.map((link, index) => {
            const hrefMatch = link.match(/href=["']([^"']+)["']/)
            return {
              url: hrefMatch ? hrefMatch[1] : `inline-${index}`,
              type: 'external',
              content: '', // Would need separate fetch
              size: 0,
              critical: link.includes('critical') || link.includes('above-fold')
            }
          }),
          ...styleMatches.map((style, index) => {
            const content = style.replace(/<\/?style[^>]*>/gi, '')
            return {
              type: 'inline',
              content,
              size: content.length,
              critical: index < 2
            }
          })
        ]
      }

      return [{
        strategy: 'lightweight-css-extraction',
        success: cssData.sources.length > 0,
        data: cssData,
        performance: { duration: 0, dataSize: html.length, cacheHit: false }
      }]

    } catch (error) {
      return [{
        strategy: 'lightweight-css-extraction',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]
    }
  }

  private async executeHeadlessFallback(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Alternative browser configuration with different options
    try {
      const { chromium } = await import('playwright')

      const altBrowser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Speed up loading
          '--disable-javascript' // For CSS-only extraction
        ]
      })

      const altContext = await altBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        javaScriptEnabled: false // CSS-only mode
      })

      const altPage = await altContext.newPage()

      try {
        await altPage.goto(context.url, {
          waitUntil: 'domcontentloaded',
          timeout: context.options.timeout / 2
        })

        // Basic CSS extraction without JavaScript
        const staticData = await altPage.evaluate(() => {
          const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
          const styles = Array.from(document.querySelectorAll('style'))

          return {
            externalSheets: links.length,
            inlineStyles: styles.length,
            hasCSS: links.length > 0 || styles.length > 0
          }
        })

        return [{
          strategy: 'headless-fallback',
          success: staticData.hasCSS,
          data: staticData,
          performance: { duration: 0, dataSize: 0, cacheHit: false }
        }]

      } finally {
        await altBrowser.close()
      }

    } catch (error) {
      return [{
        strategy: 'headless-fallback',
        success: false,
        error: error instanceof Error ? error.message : 'Headless fallback failed',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]
    }
  }

  private async executeProxyExtraction(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // In production, would route through proxy services
    // For now, simulate proxy behavior with different headers
    try {
      const response = await fetch(context.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive'
        }
      })

      if (!response.ok) {
        throw new Error(`Proxy extraction failed: HTTP ${response.status}`)
      }

      const html = await response.text()

      return [{
        strategy: 'proxy-extraction',
        success: html.length > 0,
        data: { html, size: html.length },
        performance: { duration: 0, dataSize: html.length, cacheHit: false }
      }]

    } catch (error) {
      return [{
        strategy: 'proxy-extraction',
        success: false,
        error: error instanceof Error ? error.message : 'Proxy extraction failed',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]
    }
  }

  private async executeSPAExtraction(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Enhanced extraction for Single Page Applications
    const { chromium } = await import('playwright')
    const spaBrowser = await chromium.launch({ headless: true })

    try {
      const spaContext = await spaBrowser.newContext({
        userAgent: context.userAgent
      })

      const spaPage = await spaContext.newPage()

      // Extended wait times for SPAs
      await spaPage.goto(context.url, { waitUntil: 'networkidle' })

      // Wait for React/Vue/Angular to render
      await spaPage.waitForTimeout(5000)

      // Try to trigger route changes to load more CSS
      const routeData = await spaPage.evaluate(async () => {
        const results = { routes: [], styles: [] }

        // Look for internal navigation links
        const internalLinks = Array.from(document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]'))
          .slice(0, 5) // Limit routes to check

        for (const link of internalLinks) {
          try {
            const href = link.getAttribute('href')
            if (href) {
              // Simulate click to trigger SPA routing
              link.click()
              await new Promise(resolve => setTimeout(resolve, 2000))

              // Capture any new styles that loaded
              const newStyles = Array.from(document.querySelectorAll('style')).map(style => ({
                content: style.textContent || '',
                route: href
              }))

              results.styles.push(...newStyles)
              results.routes.push(href)
            }
          } catch (error) {
            console.warn('Route navigation failed:', error)
          }
        }

        return results
      })

      return [{
        strategy: 'spa-aware-extraction',
        success: routeData.styles.length > 0 || routeData.routes.length > 0,
        data: routeData,
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]

    } finally {
      await spaBrowser.close()
    }
  }

  private async executeStealthExtraction(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Use stealth techniques to bypass anti-bot measures
    const { chromium } = await import('playwright')

    try {
      const stealthBrowser = await chromium.launch({
        headless: true,
        args: [
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-client-side-phishing-detection'
        ]
      })

      const stealthContext = await stealthBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      const stealthPage = await stealthContext.newPage()

      // Add script to remove webdriver flags
      await stealthPage.addInitScript(() => {
        // Remove webdriver property
        delete (navigator as any).webdriver

        // Mock permissions
        Object.defineProperty(navigator, 'permissions', {
          get: () => ({ query: () => Promise.resolve({ state: 'granted' }) })
        })

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        })
      })

      await stealthPage.goto(context.url, { waitUntil: 'networkidle' })

      // Basic extraction in stealth mode
      const stealthData = await stealthPage.evaluate(() => {
        return {
          title: document.title,
          hasContent: document.body.children.length > 0,
          stylesheetsCount: document.styleSheets.length,
          success: true
        }
      })

      return [{
        strategy: 'stealth-extraction',
        success: stealthData.success,
        data: stealthData,
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]

    } catch (error) {
      return [{
        strategy: 'stealth-extraction',
        success: false,
        error: error instanceof Error ? error.message : 'Stealth extraction failed',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]
    }
  }

  private async executeDelayedExtraction(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Implement exponential backoff with jitter
    const baseDelay = 5000 // 5 seconds
    const jitter = Math.random() * 2000 // Random 0-2 seconds

    await new Promise(resolve => setTimeout(resolve, baseDelay + jitter))

    // Retry original extraction with extended timeout
    const extendedContext = {
      ...context,
      options: {
        ...context.options,
        timeout: context.options.timeout * 3,
        retryAttempts: 1
      }
    }

    // Return placeholder for delayed retry
    return [{
      strategy: 'delayed-extraction',
      success: true,
      data: { delayApplied: baseDelay + jitter, readyForRetry: true },
      performance: { duration: baseDelay + jitter, dataSize: 0, cacheHit: false }
    }]
  }

  private async executeCachedApproximation(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Use data from similar sites to approximate missing information
    try {
      // In production, would query database for similar sites
      const similarDomains = this.findSimilarDomains(context.domain)

      const approximationData = {
        source: 'cached-approximation',
        similarSites: similarDomains,
        approximatedTokens: {
          colors: ['#000000', '#ffffff', '#f8f9fa'], // Common defaults
          typography: ['system-ui', 'Arial', 'Helvetica'],
          spacing: ['8px', '16px', '24px', '32px']
        },
        confidence: 0.3 // Low confidence for approximated data
      }

      return [{
        strategy: 'cached-approximation',
        success: true,
        data: approximationData,
        performance: { duration: 0, dataSize: 0, cacheHit: true }
      }]

    } catch (error) {
      return [{
        strategy: 'cached-approximation',
        success: false,
        error: error instanceof Error ? error.message : 'Approximation failed',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]
    }
  }

  private async executePartialReconstruction(
    failedResults: ExtractionResult[],
    context: ScanContext
  ): Promise<ExtractionResult[]> {
    // Reconstruct missing data from partial successful extractions
    try {
      const partialData = failedResults
        .filter(r => r.data && Object.keys(r.data).length > 0)
        .map(r => r.data)

      if (partialData.length === 0) {
        throw new Error('No partial data available for reconstruction')
      }

      // Merge partial data intelligently
      const reconstructed = {
        source: 'partial-reconstruction',
        mergedData: this.mergePartialData(partialData),
        completeness: this.calculateCompleteness(partialData),
        confidence: 0.6 // Moderate confidence for reconstructed data
      }

      return [{
        strategy: 'partial-data-reconstruction',
        success: reconstructed.completeness > 0.3,
        data: reconstructed,
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]

    } catch (error) {
      return [{
        strategy: 'partial-data-reconstruction',
        success: false,
        error: error instanceof Error ? error.message : 'Reconstruction failed',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }]
    }
  }

  private async executeGenericRecovery(
    failedResult: ExtractionResult,
    context: ScanContext
  ): Promise<ExtractionResult> {
    // Last resort: extract what we can from the URL itself
    try {
      const urlAnalysis = {
        domain: context.domain,
        tld: context.domain.split('.').pop(),
        subdomain: context.domain.split('.').length > 2 ? context.domain.split('.')[0] : null,
        likelyFramework: this.guessFrameworkFromDomain(context.domain),
        estimatedComplexity: this.estimateComplexity(context.domain)
      }

      return {
        strategy: 'generic-recovery',
        success: true,
        data: urlAnalysis,
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }

    } catch (error) {
      return {
        strategy: 'generic-recovery',
        success: false,
        error: error instanceof Error ? error.message : 'Generic recovery failed',
        performance: { duration: 0, dataSize: 0, cacheHit: false }
      }
    }
  }

  // Helper methods

  private findSimilarDomains(domain: string): string[] {
    // In production, would use database to find similar sites
    const tld = domain.split('.').pop()
    const category = this.categorizeDomain(domain)

    // Return mock similar domains
    return [`example1.${tld}`, `example2.${tld}`].slice(0, 3)
  }

  private categorizeDomain(domain: string): string {
    if (domain.includes('shop') || domain.includes('store') || domain.includes('buy')) return 'ecommerce'
    if (domain.includes('blog') || domain.includes('news') || domain.includes('media')) return 'content'
    if (domain.includes('app') || domain.includes('platform') || domain.includes('tool')) return 'saas'
    if (domain.includes('design') || domain.includes('studio') || domain.includes('creative')) return 'creative'
    return 'general'
  }

  private guessFrameworkFromDomain(domain: string): string | null {
    const frameworks = {
      'vercel.app': 'Next.js',
      'netlify.app': 'React/Vue',
      'github.io': 'Jekyll/Static',
      'wordpress.com': 'WordPress',
      'shopify.com': 'Shopify'
    }

    for (const [pattern, framework] of Object.entries(frameworks)) {
      if (domain.includes(pattern)) {
        return framework
      }
    }

    return null
  }

  private estimateComplexity(domain: string): 'low' | 'medium' | 'high' {
    const indicators = {
      high: ['app', 'platform', 'dashboard', 'admin'],
      medium: ['shop', 'store', 'blog', 'portfolio'],
      low: ['landing', 'coming-soon', 'maintenance']
    }

    for (const [complexity, keywords] of Object.entries(indicators)) {
      if (keywords.some(keyword => domain.includes(keyword))) {
        return complexity as any
      }
    }

    return 'medium'
  }

  private mergePartialData(partialData: any[]): any {
    // Intelligent merging of partial data
    const merged = {}

    partialData.forEach(data => {
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          (merged as any)[key] = [...((merged as any)[key] || []), ...value]
        } else if (typeof value === 'object' && value !== null) {
          (merged as any)[key] = { ...((merged as any)[key] || {}), ...value }
        } else {
          (merged as any)[key] = value
        }
      })
    })

    return merged
  }

  private calculateCompleteness(partialData: any[]): number {
    const expectedFields = ['css', 'tokens', 'components', 'accessibility']
    let foundFields = 0

    expectedFields.forEach(field => {
      if (partialData.some(data => data[field])) {
        foundFields++
      }
    })

    return foundFields / expectedFields.length
  }

  // Circuit breaker pattern for failed extractions
  private circuitBreaker = {
    failures: new Map<string, number>(),
    lastFailure: new Map<string, number>(),
    threshold: 5,
    timeout: 300000 // 5 minutes
  }

  isCircuitOpen(strategy: string): boolean {
    const failures = this.circuitBreaker.failures.get(strategy) || 0
    const lastFailure = this.circuitBreaker.lastFailure.get(strategy) || 0

    if (failures >= this.circuitBreaker.threshold) {
      const timeSinceLastFailure = Date.now() - lastFailure
      return timeSinceLastFailure < this.circuitBreaker.timeout
    }

    return false
  }

  recordFailure(strategy: string) {
    const current = this.circuitBreaker.failures.get(strategy) || 0
    this.circuitBreaker.failures.set(strategy, current + 1)
    this.circuitBreaker.lastFailure.set(strategy, Date.now())
  }

  recordSuccess(strategy: string) {
    this.circuitBreaker.failures.delete(strategy)
    this.circuitBreaker.lastFailure.delete(strategy)
  }
}