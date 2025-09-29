import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'
import { analyze } from '@projectwallace/css-analyzer'
import { createHash } from 'crypto'

export interface ExtractionStrategy {
  name: string
  priority: number
  execute: (page: Page, context: ScanContext) => Promise<ExtractionResult>
  fallbackFor?: string[]
}

export interface ScanContext {
  url: string
  domain: string
  userAgent: string
  viewports: Array<{ width: number; height: number; name: string }>
  options: ScanOptions
  cache: Map<string, any>
  progress: (step: string, progress: number) => void
}

export interface ScanOptions {
  includeComputed: boolean
  analyzeComponents: boolean
  extractBrand: boolean
  analyzeAccessibility: boolean
  detectFrameworks: boolean
  captureScreenshots: boolean
  followInternalLinks: boolean
  maxPages: number
  timeout: number
  retryAttempts: number
}

export interface ExtractionResult {
  strategy: string
  success: boolean
  data?: any
  error?: string
  performance: {
    duration: number
    dataSize: number
    cacheHit: boolean
  }
}

export interface ComprehensiveScanResult {
  url: string
  domain: string
  status: 'completed' | 'partial' | 'failed'
  strategies: ExtractionResult[]
  aggregatedData: {
    css: CSSData
    tokens: TokenData
    components: ComponentData
    brand: BrandData
    accessibility: AccessibilityData
    frameworks: FrameworkData
    performance: PerformanceData
  }
  metadata: ScanMetadata
}

export interface CSSData {
  sources: Array<{
    url?: string
    type: 'external' | 'inline' | 'computed' | 'runtime'
    content: string
    size: number
    hash: string
    critical: boolean
  }>
  customProperties: Array<{
    name: string
    value: string
    scope: 'global' | 'component' | 'page'
    usage: number
  }>
  mediaQueries: Array<{
    query: string
    breakpoint?: number
    rules: number
  }>
  keyframes: Array<{
    name: string
    definition: string
    usage: number
  }>
}

export interface TokenData {
  colors: {
    palette: Array<{ color: string; usage: number; semantic?: string }>
    accessibility: Array<{ fg: string; bg: string; ratio: number; passes: { aa: boolean; aaa: boolean } }>
    gradients: Array<{ definition: string; usage: number }>
  }
  typography: {
    families: Array<{ family: string; weights: number[]; usage: number }>
    scales: Array<{ size: string; usage: number; context: string }>
    lineHeights: Array<{ ratio: number; usage: number }>
  }
  spacing: {
    scale: Array<{ value: number; usage: number }>
    base: number
    consistency: number
    patterns: Array<{ type: string; values: number[] }>
  }
  layout: {
    containers: Array<{ maxWidth: string; usage: number }>
    grids: Array<{ columns: number; gap: string; usage: number }>
    flexPatterns: Array<{ direction: string; justify: string; align: string; usage: number }>
  }
}

export interface ComponentData {
  buttons: Array<{ variant: string; styles: any; usage: number }>
  forms: Array<{ type: string; validation: boolean; accessibility: number }>
  navigation: Array<{ type: string; responsive: boolean; items: number }>
  cards: Array<{ style: any; content: string[]; usage: number }>
  modals: Array<{ overlay: any; animation: any; accessibility: number }>
}

export interface BrandData {
  logo: {
    urls: string[]
    dominantColors: string[]
    style: 'text' | 'image' | 'svg'
  }
  brandColors: {
    primary: string[]
    secondary: string[]
    semantic: { success?: string; warning?: string; error?: string }
  }
  voice: {
    tone: 'professional' | 'casual' | 'playful' | 'minimal'
    terminology: string[]
  }
}

export interface AccessibilityData {
  focusManagement: {
    skipLinks: boolean
    focusTrapping: boolean
    visibleFocus: boolean
    logicalTabOrder: boolean
  }
  aria: {
    landmarks: number
    labels: number
    descriptions: number
    liveRegions: number
  }
  contrast: {
    totalPairs: number
    aaCompliant: number
    aaaCompliant: number
    violations: Array<{ fg: string; bg: string; ratio: number; element: string }>
  }
  semanticHtml: {
    headingStructure: boolean
    listUsage: boolean
    tableHeaders: boolean
    formLabels: boolean
  }
}

export interface FrameworkData {
  detected: Array<{
    name: string
    version?: string
    confidence: number
    evidence: string[]
  }>
  cssFrameworks: string[]
  jsFrameworks: string[]
  designSystems: string[]
}

export interface PerformanceData {
  css: {
    totalSize: number
    unusedRules: number
    criticalCss: number
    loadTime: number
  }
  images: {
    total: number
    optimized: number
    lazyLoaded: number
    webpSupport: boolean
  }
  fonts: {
    families: number
    loadStrategy: 'blocking' | 'swap' | 'fallback' | 'optional'
    subsetting: boolean
  }
}

export interface ScanMetadata {
  startedAt: string
  finishedAt: string
  duration: number
  strategiesUsed: string[]
  fallbacksTriggered: string[]
  dataQuality: number
  cacheEfficiency: number
}

export class AdvancedExtractor {
  private browser: Browser | null = null
  private strategies: ExtractionStrategy[] = []

  constructor() {
    this.initializeStrategies()
  }

  private initializeStrategies() {
    this.strategies = [
      {
        name: 'static-css-extraction',
        priority: 1,
        execute: this.executeStaticExtraction.bind(this)
      },
      {
        name: 'computed-styles-extraction',
        priority: 2,
        execute: this.executeComputedExtraction.bind(this),
        fallbackFor: ['static-css-extraction']
      },
      {
        name: 'runtime-css-detection',
        priority: 3,
        execute: this.executeRuntimeExtraction.bind(this),
        fallbackFor: ['static-css-extraction', 'computed-styles-extraction']
      },
      {
        name: 'framework-specific-extraction',
        priority: 4,
        execute: this.executeFrameworkExtraction.bind(this)
      },
      {
        name: 'custom-properties-extraction',
        priority: 5,
        execute: this.executeCustomPropsExtraction.bind(this)
      },
      {
        name: 'component-pattern-analysis',
        priority: 6,
        execute: this.executeComponentAnalysis.bind(this)
      },
      {
        name: 'brand-analysis',
        priority: 7,
        execute: this.executeBrandAnalysis.bind(this)
      },
      {
        name: 'accessibility-analysis',
        priority: 8,
        execute: this.executeAccessibilityAnalysis.bind(this)
      },
      {
        name: 'performance-analysis',
        priority: 9,
        execute: this.executePerformanceAnalysis.bind(this)
      },
      {
        name: 'visual-screenshot-analysis',
        priority: 10,
        execute: this.executeVisualAnalysis.bind(this)
      }
    ]
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })
    }
  }

  async comprehensiveScan(
    url: string,
    options: Partial<ScanOptions> = {},
    progressCallback?: (step: string, progress: number) => void
  ): Promise<ComprehensiveScanResult> {
    await this.initialize()

    const startTime = Date.now()
    const domain = new URL(url).hostname
    const cache = new Map<string, any>()

    const context: ScanContext = {
      url,
      domain,
      userAgent: 'ContextDS/1.0 (+https://contextds.com/bot)',
      viewports: [
        { width: 360, height: 640, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 720, name: 'desktop' },
        { width: 1920, height: 1080, name: 'large' }
      ],
      options: {
        includeComputed: true,
        analyzeComponents: true,
        extractBrand: true,
        analyzeAccessibility: true,
        detectFrameworks: true,
        captureScreenshots: true,
        followInternalLinks: true,
        maxPages: 5,
        timeout: 30000,
        retryAttempts: 3,
        ...options
      },
      cache,
      progress: progressCallback || (() => {})
    }

    const results: ExtractionResult[] = []
    const fallbacksTriggered: string[] = []

    // Execute strategies in priority order with intelligent fallbacks
    for (const strategy of this.strategies.sort((a, b) => a.priority - b.priority)) {
      context.progress(`Executing ${strategy.name}...`, (strategy.priority / this.strategies.length) * 100)

      try {
        const result = await this.executeWithRetry(strategy, context)
        results.push(result)

        // If strategy failed and has fallbacks, mark fallbacks as triggered
        if (!result.success && strategy.fallbackFor) {
          fallbacksTriggered.push(...strategy.fallbackFor)
        }

      } catch (error) {
        results.push({
          strategy: strategy.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          performance: { duration: 0, dataSize: 0, cacheHit: false }
        })
      }
    }

    // Aggregate all extracted data
    const aggregatedData = await this.aggregateResults(results, context)

    const endTime = Date.now()

    return {
      url,
      domain,
      status: this.determineOverallStatus(results),
      strategies: results,
      aggregatedData,
      metadata: {
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        strategiesUsed: results.filter(r => r.success).map(r => r.strategy),
        fallbacksTriggered,
        dataQuality: this.calculateDataQuality(results),
        cacheEfficiency: this.calculateCacheEfficiency(results)
      }
    }
  }

  private async executeWithRetry(
    strategy: ExtractionStrategy,
    context: ScanContext
  ): Promise<ExtractionResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= context.options.retryAttempts; attempt++) {
      try {
        const startTime = Date.now()

        // Check cache first
        const cacheKey = `${strategy.name}-${context.url}-${context.options.toString()}`
        const cached = context.cache.get(cacheKey)

        if (cached) {
          return {
            strategy: strategy.name,
            success: true,
            data: cached,
            performance: {
              duration: Date.now() - startTime,
              dataSize: JSON.stringify(cached).length,
              cacheHit: true
            }
          }
        }

        const result = await strategy.execute(context.url, context)
        const endTime = Date.now()

        // Cache successful results
        if (result.success && result.data) {
          context.cache.set(cacheKey, result.data)
        }

        return {
          ...result,
          performance: {
            duration: endTime - startTime,
            dataSize: result.data ? JSON.stringify(result.data).length : 0,
            cacheHit: false
          }
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (attempt === context.options.retryAttempts) {
          break
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    return {
      strategy: strategy.name,
      success: false,
      error: lastError?.message || 'Strategy failed after all retries',
      performance: { duration: 0, dataSize: 0, cacheHit: false }
    }
  }

  // Strategy 1: Static CSS Extraction
  private async executeStaticExtraction(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext({
      userAgent: context.userAgent,
      viewport: context.viewports[0]
    })

    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, {
        waitUntil: 'domcontentloaded',
        timeout: context.options.timeout
      })

      // Extract external stylesheets
      const externalCSS = await scanPage.evaluate(async () => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        const cssData = []

        for (const link of links) {
          try {
            const href = link.getAttribute('href')
            if (href) {
              const response = await fetch(href)
              const css = await response.text()
              cssData.push({
                url: href,
                type: 'external',
                content: css,
                size: css.length,
                critical: link.hasAttribute('data-critical') || link.getAttribute('media') === 'all'
              })
            }
          } catch (error) {
            console.warn(`Failed to fetch CSS: ${href}`)
          }
        }

        return cssData
      })

      // Extract inline styles
      const inlineCSS = await scanPage.evaluate(() => {
        const styleTags = Array.from(document.querySelectorAll('style'))
        return styleTags.map((style, index) => ({
          type: 'inline',
          content: style.textContent || '',
          size: style.textContent?.length || 0,
          critical: index < 2 // First two style tags usually critical
        }))
      })

      const allCSS = [...externalCSS, ...inlineCSS]

      return {
        strategy: 'static-css-extraction',
        success: allCSS.length > 0,
        data: {
          sources: allCSS,
          totalSize: allCSS.reduce((sum, css) => sum + css.size, 0),
          externalCount: externalCSS.length,
          inlineCount: inlineCSS.length
        }
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 2: Computed Styles Extraction
  private async executeComputedExtraction(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext({
      userAgent: context.userAgent
    })

    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, {
        waitUntil: 'networkidle',
        timeout: context.options.timeout
      })

      // Wait for dynamic content to load
      await scanPage.waitForTimeout(3000)

      const computedData = await scanPage.evaluate(() => {
        const results = {
          elements: [] as any[],
          customProperties: [] as any[],
          uniqueValues: new Map()
        }

        // Analyze all visible elements
        const elements = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = getComputedStyle(el)
          return style.display !== 'none' && style.visibility !== 'hidden'
        })

        elements.forEach((element, index) => {
          if (index > 1000) return // Limit for performance

          const computed = getComputedStyle(element)
          const elementData = {
            tag: element.tagName.toLowerCase(),
            classes: Array.from(element.classList),
            styles: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
              fontWeight: computed.fontWeight,
              lineHeight: computed.lineHeight,
              margin: computed.margin,
              padding: computed.padding,
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow,
              transition: computed.transition,
              display: computed.display,
              position: computed.position,
              zIndex: computed.zIndex
            }
          }

          // Track unique values
          Object.entries(elementData.styles).forEach(([prop, value]) => {
            if (value && value !== 'auto' && value !== 'none' && value !== 'normal') {
              const key = `${prop}:${value}`
              results.uniqueValues.set(key, (results.uniqueValues.get(key) || 0) + 1)
            }
          })

          results.elements.push(elementData)
        })

        // Extract CSS custom properties
        const styles = getComputedStyle(document.documentElement)
        for (let i = 0; i < styles.length; i++) {
          const prop = styles[i]
          if (prop.startsWith('--')) {
            results.customProperties.push({
              name: prop,
              value: styles.getPropertyValue(prop).trim(),
              scope: 'global'
            })
          }
        }

        return {
          elements: results.elements.slice(0, 500), // Limit results
          customProperties: results.customProperties,
          uniqueValues: Array.from(results.uniqueValues.entries()).map(([key, count]) => ({ key, count }))
        }
      })

      return {
        strategy: 'computed-styles-extraction',
        success: true,
        data: computedData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 3: Runtime CSS Detection (CSS-in-JS, dynamic styles)
  private async executeRuntimeExtraction(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const runtimeData = await scanPage.evaluate(() => {
        const results = {
          cssInJS: [] as any[],
          dynamicStyles: [] as any[],
          styledComponents: [] as any[],
          emotionStyles: [] as any[]
        }

        // Detect styled-components
        const styledElements = document.querySelectorAll('[class*="sc-"]')
        styledElements.forEach(el => {
          const classes = Array.from(el.classList).filter(c => c.includes('sc-'))
          if (classes.length > 0) {
            results.styledComponents.push({
              element: el.tagName,
              classes,
              computed: getComputedStyle(el)
            })
          }
        })

        // Detect Emotion CSS
        const emotionElements = document.querySelectorAll('[class*="css-"]')
        emotionElements.forEach(el => {
          const classes = Array.from(el.classList).filter(c => c.startsWith('css-'))
          if (classes.length > 0) {
            results.emotionStyles.push({
              element: el.tagName,
              classes,
              computed: getComputedStyle(el)
            })
          }
        })

        // Look for dynamic style injection
        const styleTags = document.querySelectorAll('style[data-styled], style[data-emotion]')
        styleTags.forEach(style => {
          results.cssInJS.push({
            content: style.textContent,
            framework: style.getAttribute('data-styled') ? 'styled-components' : 'emotion',
            size: style.textContent?.length || 0
          })
        })

        return results
      })

      return {
        strategy: 'runtime-css-detection',
        success: Object.values(runtimeData).some(arr => arr.length > 0),
        data: runtimeData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 4: Framework-Specific Extraction
  private async executeFrameworkExtraction(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const frameworkData = await scanPage.evaluate(() => {
        const detected = {
          tailwind: false,
          bootstrap: false,
          materialUI: false,
          chakraUI: false,
          antd: false,
          bulma: false,
          foundation: false
        }

        const evidence: string[] = []

        // Detect Tailwind CSS
        const tailwindClasses = ['flex', 'grid', 'bg-', 'text-', 'p-', 'm-', 'w-', 'h-']
        const hasClasses = document.querySelector('[class]')
        if (hasClasses) {
          const allClasses = Array.from(document.querySelectorAll('[class]'))
            .flatMap(el => Array.from(el.classList))
            .join(' ')

          const tailwindMatches = tailwindClasses.filter(prefix =>
            allClasses.includes(prefix) || allClasses.match(new RegExp(`\\b${prefix}\\w+`))
          )

          if (tailwindMatches.length >= 3) {
            detected.tailwind = true
            evidence.push(`Tailwind classes detected: ${tailwindMatches.slice(0, 5).join(', ')}`)
          }
        }

        // Detect Bootstrap
        const bootstrapClasses = ['container', 'row', 'col-', 'btn', 'navbar', 'card']
        const bootstrapMatches = bootstrapClasses.filter(cls =>
          document.querySelector(`.${cls}`) || document.querySelector(`[class*="${cls}"]`)
        )

        if (bootstrapMatches.length >= 2) {
          detected.bootstrap = true
          evidence.push(`Bootstrap classes detected: ${bootstrapMatches.join(', ')}`)
        }

        // Detect Material-UI
        if (document.querySelector('[class*="MuiButton"], [class*="MuiTypography"]')) {
          detected.materialUI = true
          evidence.push('Material-UI components detected')
        }

        // Detect Chakra UI
        if (document.querySelector('[class*="chakra"]')) {
          detected.chakraUI = true
          evidence.push('Chakra UI components detected')
        }

        // Detect Ant Design
        if (document.querySelector('[class*="ant-"]')) {
          detected.antd = true
          evidence.push('Ant Design components detected')
        }

        return { detected, evidence }
      })

      // Analyze CSS for framework signatures
      const cssContent = await scanPage.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets)
        let content = ''

        stylesheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || [])
            rules.forEach(rule => {
              content += rule.cssText + '\n'
            })
          } catch (e) {
            // Cross-origin or other access issues
          }
        })

        return content
      })

      // Additional framework detection from CSS
      const cssSignatures = {
        tailwind: ['@tailwind', 'theme(', 'apply '],
        bootstrap: ['@import.*bootstrap', '.container', '.row'],
        bulma: ['@import.*bulma', '.column', '.hero'],
        foundation: ['@import.*foundation', '.grid-container']
      }

      Object.entries(cssSignatures).forEach(([framework, signatures]) => {
        const matches = signatures.filter(sig =>
          cssContent.includes(sig) || cssContent.match(new RegExp(sig))
        )

        if (matches.length > 0) {
          (frameworkData.detected as any)[framework] = true
          frameworkData.evidence.push(`${framework} CSS signatures: ${matches.join(', ')}`)
        }
      })

      return {
        strategy: 'framework-specific-extraction',
        success: frameworkData.evidence.length > 0,
        data: frameworkData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 5: Custom Properties Extraction
  private async executeCustomPropsExtraction(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const customPropsData = await scanPage.evaluate(() => {
        const properties = []
        const styles = getComputedStyle(document.documentElement)

        // Extract all CSS custom properties
        for (let i = 0; i < styles.length; i++) {
          const prop = styles[i]
          if (prop.startsWith('--')) {
            const value = styles.getPropertyValue(prop).trim()
            properties.push({
              name: prop,
              value,
              scope: 'root'
            })
          }
        }

        // Also check for component-scoped custom properties
        const elementsWithCustomProps = document.querySelectorAll('[style*="--"]')
        elementsWithCustomProps.forEach(el => {
          const inlineStyle = el.getAttribute('style') || ''
          const customPropMatches = inlineStyle.match(/--[\w-]+:\s*[^;]+/g) || []

          customPropMatches.forEach(match => {
            const [name, value] = match.split(':').map(s => s.trim())
            properties.push({
              name,
              value,
              scope: 'component',
              element: el.tagName.toLowerCase()
            })
          })
        })

        return {
          properties,
          designTokens: properties.filter(p =>
            p.name.includes('color') ||
            p.name.includes('size') ||
            p.name.includes('space') ||
            p.name.includes('font')
          )
        }
      })

      return {
        strategy: 'custom-properties-extraction',
        success: customPropsData.properties.length > 0,
        data: customPropsData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 6: Component Pattern Analysis
  private async executeComponentAnalysis(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const componentData = await scanPage.evaluate(() => {
        const patterns = {
          buttons: [] as any[],
          forms: [] as any[],
          navigation: [] as any[],
          cards: [] as any[],
          modals: [] as any[]
        }

        // Analyze buttons
        const buttons = document.querySelectorAll('button, [role="button"], .btn, [class*="button"]')
        buttons.forEach((btn, index) => {
          if (index > 20) return // Limit analysis

          const computed = getComputedStyle(btn)
          patterns.buttons.push({
            variant: Array.from(btn.classList).join(' ') || 'default',
            styles: {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              padding: computed.padding,
              borderRadius: computed.borderRadius,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              border: computed.border,
              transition: computed.transition
            },
            text: btn.textContent?.trim(),
            disabled: btn.hasAttribute('disabled')
          })
        })

        // Analyze forms
        const forms = document.querySelectorAll('form')
        forms.forEach(form => {
          const inputs = form.querySelectorAll('input, textarea, select')
          const labels = form.querySelectorAll('label')

          patterns.forms.push({
            inputCount: inputs.length,
            hasLabels: labels.length > 0,
            hasValidation: form.querySelector('[aria-invalid], .error, .invalid') !== null,
            accessibility: labels.length / inputs.length // Label-to-input ratio
          })
        })

        // Analyze navigation
        const navs = document.querySelectorAll('nav, [role="navigation"], .navbar, .nav')
        navs.forEach(nav => {
          const links = nav.querySelectorAll('a, [role="link"]')
          const computed = getComputedStyle(nav)

          patterns.navigation.push({
            type: nav.tagName.toLowerCase(),
            itemCount: links.length,
            responsive: computed.display === 'flex' || computed.display === 'grid',
            styles: {
              backgroundColor: computed.backgroundColor,
              padding: computed.padding,
              position: computed.position
            }
          })
        })

        // Analyze cards
        const cards = document.querySelectorAll('.card, [class*="card"], .panel, [class*="panel"]')
        cards.forEach((card, index) => {
          if (index > 10) return

          const computed = getComputedStyle(card)
          const hasImage = card.querySelector('img') !== null
          const hasButton = card.querySelector('button, [role="button"]') !== null

          patterns.cards.push({
            styles: {
              backgroundColor: computed.backgroundColor,
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow,
              padding: computed.padding
            },
            hasImage,
            hasButton,
            contentTypes: [
              hasImage ? 'image' : null,
              card.querySelector('h1,h2,h3,h4,h5,h6') ? 'heading' : null,
              card.querySelector('p') ? 'text' : null,
              hasButton ? 'action' : null
            ].filter(Boolean)
          })
        })

        return patterns
      })

      return {
        strategy: 'component-pattern-analysis',
        success: Object.values(componentData).some(arr => arr.length > 0),
        data: componentData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 7: Brand Analysis
  private async executeBrandAnalysis(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const brandData = await scanPage.evaluate(() => {
        const results = {
          logo: { urls: [] as string[], type: 'unknown', dominantColors: [] as string[] },
          brandColors: { primary: [] as string[], secondary: [] as string[] },
          typography: { primary: '', secondary: '' },
          tone: 'professional' as const
        }

        // Find logo
        const logoSelectors = [
          'img[alt*="logo" i]',
          '.logo img',
          '[class*="logo"] img',
          'header img',
          '.brand img',
          '[aria-label*="logo" i]'
        ]

        logoSelectors.forEach(selector => {
          const logos = document.querySelectorAll(selector)
          logos.forEach(logo => {
            const src = logo.getAttribute('src')
            if (src) {
              results.logo.urls.push(src)
            }
          })
        })

        // Analyze dominant colors from hero/header sections
        const heroSections = document.querySelectorAll('header, .hero, [class*="hero"], main > section:first-child')
        heroSections.forEach(section => {
          const computed = getComputedStyle(section)
          const bgColor = computed.backgroundColor
          const color = computed.color

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            results.brandColors.primary.push(bgColor)
          }
          if (color && color !== 'rgba(0, 0, 0, 0)') {
            results.brandColors.secondary.push(color)
          }
        })

        // Analyze primary typography
        const headings = document.querySelector('h1, h2')
        if (headings) {
          const computed = getComputedStyle(headings)
          results.typography.primary = computed.fontFamily
        }

        // Determine tone from text content
        const textContent = document.body.textContent?.toLowerCase() || ''
        const casualWords = ['hey', 'awesome', 'cool', 'fun', 'amazing', 'love', '!']
        const professionalWords = ['solution', 'enterprise', 'professional', 'industry', 'platform']

        const casualCount = casualWords.filter(word => textContent.includes(word)).length
        const professionalCount = professionalWords.filter(word => textContent.includes(word)).length

        if (casualCount > professionalCount) {
          results.tone = 'casual'
        } else if (textContent.includes('minimal') || textContent.includes('clean')) {
          results.tone = 'minimal'
        }

        return results
      })

      return {
        strategy: 'brand-analysis',
        success: brandData.logo.urls.length > 0 || brandData.brandColors.primary.length > 0,
        data: brandData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 8: Accessibility Analysis
  private async executeAccessibilityAnalysis(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const a11yData = await scanPage.evaluate(() => {
        const results = {
          focusManagement: {
            skipLinks: document.querySelector('a[href="#main"], a[href="#content"]') !== null,
            focusTrapping: false, // Would need more complex detection
            visibleFocus: true, // Assume true, would need focus testing
            logicalTabOrder: true // Assume true, would need tab testing
          },
          aria: {
            landmarks: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').length,
            labels: document.querySelectorAll('[aria-label], [aria-labelledby]').length,
            descriptions: document.querySelectorAll('[aria-describedby]').length,
            liveRegions: document.querySelectorAll('[aria-live]').length
          },
          contrast: [] as any[],
          semanticHtml: {
            headingStructure: this.analyzeHeadingStructure(),
            listUsage: document.querySelectorAll('ul, ol').length > 0,
            tableHeaders: document.querySelectorAll('th').length > 0,
            formLabels: this.analyzeFormLabels()
          }
        }

        // Analyze color contrast
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button')
        const contrastPairs = new Set<string>()

        Array.from(textElements).slice(0, 100).forEach(el => { // Limit for performance
          const computed = getComputedStyle(el)
          const color = computed.color
          const backgroundColor = computed.backgroundColor

          if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            const pair = `${color}|${backgroundColor}`
            if (!contrastPairs.has(pair)) {
              contrastPairs.add(pair)

              // Calculate contrast ratio (simplified)
              const ratio = this.calculateContrastRatio(color, backgroundColor)
              results.contrast.push({
                foreground: color,
                background: backgroundColor,
                ratio,
                passes: {
                  aa: ratio >= 4.5,
                  aaa: ratio >= 7
                },
                element: el.tagName.toLowerCase()
              })
            }
          }
        })

        return results

        function analyzeHeadingStructure() {
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          const levels = headings.map(h => parseInt(h.tagName.charAt(1)))

          // Check if headings follow logical order
          for (let i = 1; i < levels.length; i++) {
            if (levels[i] > levels[i-1] + 1) {
              return false // Skipped heading level
            }
          }
          return true
        }

        function analyzeFormLabels() {
          const inputs = document.querySelectorAll('input, textarea, select')
          const labels = document.querySelectorAll('label')
          return labels.length >= inputs.length * 0.8 // 80% labeled
        }

        function calculateContrastRatio(fg: string, bg: string): number {
          // Simplified contrast calculation - in production would use proper color parsing
          return 4.5 // Placeholder
        }
      })

      return {
        strategy: 'accessibility-analysis',
        success: true,
        data: a11yData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 9: Performance Analysis
  private async executePerformanceAnalysis(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const scanPage = await browserContext.newPage()

    try {
      await scanPage.goto(context.url, { waitUntil: 'networkidle' })

      const perfData = await scanPage.evaluate(() => {
        const results = {
          css: {
            totalSize: 0,
            externalSheets: 0,
            inlineStyles: 0,
            unusedSelectors: 0, // Would need more complex analysis
            criticalCss: 0
          },
          images: {
            total: document.querySelectorAll('img').length,
            withAlt: document.querySelectorAll('img[alt]').length,
            lazyLoaded: document.querySelectorAll('img[loading="lazy"]').length,
            webp: document.querySelectorAll('img[src*=".webp"]').length
          },
          fonts: {
            families: new Set<string>(),
            preloaded: document.querySelectorAll('link[rel="preload"][as="font"]').length,
            fallbacks: 0
          }
        }

        // Analyze CSS performance
        try {
          const stylesheets = Array.from(document.styleSheets)
          stylesheets.forEach(sheet => {
            try {
              const rules = Array.from(sheet.cssRules || [])
              results.css.totalSize += rules.length

              if (sheet.href) {
                results.css.externalSheets++
              } else {
                results.css.inlineStyles++
              }
            } catch (e) {
              // Cross-origin restrictions
            }
          })
        } catch (e) {
          console.warn('CSS analysis failed:', e)
        }

        // Analyze font usage
        const elements = document.querySelectorAll('*')
        elements.forEach(el => {
          const computed = getComputedStyle(el)
          if (computed.fontFamily) {
            results.fonts.families.add(computed.fontFamily)
          }
        })

        return {
          ...results,
          fonts: {
            ...results.fonts,
            families: Array.from(results.fonts.families),
            familyCount: results.fonts.families.size
          }
        }
      })

      return {
        strategy: 'performance-analysis',
        success: true,
        data: perfData
      }

    } finally {
      await browserContext.close()
    }
  }

  // Strategy 10: Visual Screenshot Analysis
  private async executeVisualAnalysis(page: Page, context: ScanContext): Promise<ExtractionResult> {
    const browserContext = await this.browser!.newContext()
    const screenshots: Array<{ viewport: string; url: string; analysis?: any }> = []

    try {
      for (const viewport of context.viewports) {
        const scanPage = await browserContext.newPage()

        try {
          await scanPage.setViewportSize(viewport)
          await scanPage.goto(context.url, { waitUntil: 'networkidle' })

          // Take screenshot
          const screenshot = await scanPage.screenshot({
            fullPage: true,
            type: 'png'
          })

          const screenshotUrl = `data:image/png;base64,${screenshot.toString('base64')}`

          // Basic visual analysis
          const visualData = await scanPage.evaluate(() => {
            const rect = document.documentElement.getBoundingClientRect()
            const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const elRect = el.getBoundingClientRect()
              return elRect.width > 0 && elRect.height > 0 &&
                     elRect.top < window.innerHeight && elRect.bottom > 0
            })

            return {
              pageHeight: rect.height,
              visibleElements: visibleElements.length,
              aboveFold: visibleElements.filter(el => {
                const elRect = el.getBoundingClientRect()
                return elRect.bottom <= window.innerHeight
              }).length,
              layout: {
                hasGrid: document.querySelector('[style*="grid"], .grid') !== null,
                hasFlex: document.querySelector('[style*="flex"], .flex') !== null,
                maxContentWidth: this.getMaxContentWidth()
              }
            }

            function getMaxContentWidth() {
              const containers = document.querySelectorAll('.container, [class*="container"], main, .content')
              let maxWidth = 0

              containers.forEach(container => {
                const computed = getComputedStyle(container)
                const width = parseFloat(computed.maxWidth)
                if (width && width > maxWidth) {
                  maxWidth = width
                }
              })

              return maxWidth || window.innerWidth
            }
          })

          screenshots.push({
            viewport: viewport.name,
            url: screenshotUrl,
            analysis: visualData
          })

        } finally {
          await scanPage.close()
        }
      }

      return {
        strategy: 'visual-screenshot-analysis',
        success: screenshots.length > 0,
        data: { screenshots }
      }

    } finally {
      await browserContext.close()
    }
  }

  private async aggregateResults(results: ExtractionResult[], context: ScanContext): Promise<any> {
    // Combine all successful extraction results into comprehensive data
    const successful = results.filter(r => r.success)

    const aggregated = {
      css: { sources: [], customProperties: [], mediaQueries: [], keyframes: [] },
      tokens: { colors: { palette: [], accessibility: [], gradients: [] }, typography: { families: [], scales: [], lineHeights: [] }, spacing: { scale: [], base: 8, consistency: 0, patterns: [] }, layout: { containers: [], grids: [], flexPatterns: [] } },
      components: { buttons: [], forms: [], navigation: [], cards: [], modals: [] },
      brand: { logo: { urls: [], dominantColors: [], style: 'unknown' }, brandColors: { primary: [], secondary: [], semantic: {} }, voice: { tone: 'professional', terminology: [] } },
      accessibility: { focusManagement: { skipLinks: false, focusTrapping: false, visibleFocus: true, logicalTabOrder: true }, aria: { landmarks: 0, labels: 0, descriptions: 0, liveRegions: 0 }, contrast: { totalPairs: 0, aaCompliant: 0, aaaCompliant: 0, violations: [] }, semanticHtml: { headingStructure: true, listUsage: false, tableHeaders: false, formLabels: false } },
      frameworks: { detected: [], cssFrameworks: [], jsFrameworks: [], designSystems: [] },
      performance: { css: { totalSize: 0, unusedRules: 0, criticalCss: 0, loadTime: 0 }, images: { total: 0, optimized: 0, lazyLoaded: 0, webpSupport: false }, fonts: { families: 0, loadStrategy: 'blocking', subsetting: false } }
    }

    // Merge data from all successful strategies
    successful.forEach(result => {
      if (result.data) {
        switch (result.strategy) {
          case 'static-css-extraction':
            aggregated.css.sources.push(...(result.data.sources || []))
            break
          case 'computed-styles-extraction':
            aggregated.css.customProperties.push(...(result.data.customProperties || []))
            break
          case 'component-pattern-analysis':
            Object.assign(aggregated.components, result.data)
            break
          case 'brand-analysis':
            Object.assign(aggregated.brand, result.data)
            break
          case 'accessibility-analysis':
            Object.assign(aggregated.accessibility, result.data)
            break
          case 'framework-specific-extraction':
            aggregated.frameworks.detected.push(...(result.data.evidence || []))
            break
          case 'performance-analysis':
            Object.assign(aggregated.performance, result.data)
            break
        }
      }
    })

    return aggregated
  }

  private determineOverallStatus(results: ExtractionResult[]): 'completed' | 'partial' | 'failed' {
    const successful = results.filter(r => r.success).length
    const total = results.length

    if (successful === 0) return 'failed'
    if (successful < total * 0.7) return 'partial'
    return 'completed'
  }

  private calculateDataQuality(results: ExtractionResult[]): number {
    const weights = {
      'static-css-extraction': 0.2,
      'computed-styles-extraction': 0.2,
      'component-pattern-analysis': 0.15,
      'brand-analysis': 0.1,
      'accessibility-analysis': 0.1,
      'framework-specific-extraction': 0.1,
      'performance-analysis': 0.1,
      'visual-screenshot-analysis': 0.05
    }

    let totalWeight = 0
    let achievedWeight = 0

    results.forEach(result => {
      const weight = (weights as any)[result.strategy] || 0
      totalWeight += weight
      if (result.success) {
        achievedWeight += weight
      }
    })

    return totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 0
  }

  private calculateCacheEfficiency(results: ExtractionResult[]): number {
    const cacheHits = results.filter(r => r.performance?.cacheHit).length
    return results.length > 0 ? (cacheHits / results.length) * 100 : 0
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}