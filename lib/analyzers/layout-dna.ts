import { chromium, type Browser, type Page } from 'playwright'

export interface LayoutDNAProfile {
  archetypes: PageArchetype[]
  containers: ContainerAnalysis
  gridFlex: GridFlexAnalysis
  spacingScale: SpacingScaleAnalysis
  radiiTaxonomy: RadiiTaxonomy
  shadowsTaxonomy: ShadowsTaxonomy
  motion: MotionAnalysis
  accessibility: AccessibilityAnalysis
  breakpoints: BreakpointAnalysis
}

export interface PageArchetype {
  type: 'marketing-hero' | 'feature-grid' | 'pricing-table' | 'doc-page' | 'blog-index' | 'footer' | 'navigation' | 'unknown'
  confidence: number
  elements: number
  patterns: string[]
}

export interface ContainerAnalysis {
  maxWidths: Array<{ value: string; usage: number }>
  patterns: Array<{ name: string; width: string; usage: number }>
  responsiveStrategy: 'fluid' | 'breakpoint' | 'hybrid'
}

export interface GridFlexAnalysis {
  gridUsage: number // percentage
  flexUsage: number // percentage
  commonPatterns: Array<{ type: 'grid' | 'flex'; template: string; usage: number }>
  columnCounts: Array<{ count: number; usage: number }>
}

export interface SpacingScaleAnalysis {
  base: number // detected base unit (4px, 8px, etc.)
  scale: number[] // the spacing scale values
  consistency: number // how consistent the spacing is (0-100)
  commonGaps: Array<{ value: string; usage: number }>
}

export interface RadiiTaxonomy {
  clusters: Array<{ name: string; values: string[]; usage: number }>
  consistency: number
}

export interface ShadowsTaxonomy {
  elevationLevels: Array<{ level: number; shadow: string; usage: number }>
  patterns: Array<{ type: 'card' | 'modal' | 'dropdown' | 'button', shadow: string }>
}

export interface MotionAnalysis {
  norms: {
    durations: Array<{ intent: string; value: string; usage: number }>
    easings: Array<{ intent: string; value: string; usage: number }>
  }
  patterns: Array<{ trigger: string; animation: string; usage: number }>
}

export interface AccessibilityAnalysis {
  contrastRatios: Array<{
    foreground: string
    background: string
    ratio: number
    passes: { aa: boolean; aaa: boolean }
    usage: number
  }>
  focusManagement: {
    hasVisibleFocus: boolean
    skipLinks: boolean
    tabOrder: 'logical' | 'problematic'
  }
}

export interface BreakpointAnalysis {
  detected: Array<{ width: number; usage: number }>
  strategy: 'mobile-first' | 'desktop-first' | 'mixed'
}

export class LayoutDNAAnalyzer {
  private browser: Browser | null = null

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async analyzeMultiPage(
    baseUrl: string,
    pages: string[] = ['/', '/about', '/pricing', '/docs', '/blog'],
    viewports: Array<{ width: number; height: number }> = [
      { width: 360, height: 640 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 }
    ]
  ): Promise<LayoutDNAProfile> {
    await this.initialize()

    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    const results: any[] = []

    // Analyze each page at each viewport
    for (const viewport of viewports) {
      for (const path of pages) {
        try {
          const url = new URL(path, baseUrl).toString()
          const pageResult = await this.analyzePage(url, viewport)
          results.push({ ...pageResult, viewport, path })
        } catch (error) {
          console.warn(`Failed to analyze ${path} at ${viewport.width}x${viewport.height}:`, error)
        }
      }
    }

    // Aggregate results into layout DNA profile
    return this.aggregateResults(results)
  }

  private async analyzePage(url: string, viewport: { width: number; height: number }) {
    if (!this.browser) throw new Error('Browser not initialized')

    const context = await this.browser.newContext()
    const page = await context.newPage()

    try {
      await page.setViewportSize(viewport)
      await page.goto(url, { waitUntil: 'networkidle' })

      // Extract layout information
      const layoutData = await page.evaluate(() => {
        const results = {
          containers: [] as any[],
          gridElements: [] as any[],
          flexElements: [] as any[],
          spacingValues: [] as any[],
          radiusValues: [] as any[],
          shadowValues: [] as any[],
          motionValues: [] as any[],
          contrastPairs: [] as any[],
          archetypeSignals: [] as any[]
        }

        // Analyze containers
        const allElements = document.querySelectorAll('*')
        allElements.forEach(el => {
          const computed = window.getComputedStyle(el)

          // Container analysis
          const maxWidth = computed.maxWidth
          if (maxWidth && maxWidth !== 'none') {
            results.containers.push({
              maxWidth,
              element: el.tagName,
              classes: Array.from(el.classList)
            })
          }

          // Grid/Flex analysis
          if (computed.display === 'grid') {
            results.gridElements.push({
              gridTemplate: computed.gridTemplateColumns,
              gap: computed.gap,
              element: el.tagName
            })
          }

          if (computed.display === 'flex') {
            results.flexElements.push({
              flexDirection: computed.flexDirection,
              gap: computed.gap,
              justifyContent: computed.justifyContent,
              element: el.tagName
            })
          }

          // Spacing analysis
          ['margin', 'padding', 'gap'].forEach(prop => {
            const value = computed[prop as any]
            if (value && value !== '0px' && value !== 'auto') {
              results.spacingValues.push({ property: prop, value, element: el.tagName })
            }
          })

          // Radius analysis
          const borderRadius = computed.borderRadius
          if (borderRadius && borderRadius !== '0px') {
            results.radiusValues.push({ value: borderRadius, element: el.tagName })
          }

          // Shadow analysis
          const boxShadow = computed.boxShadow
          if (boxShadow && boxShadow !== 'none') {
            results.shadowValues.push({ value: boxShadow, element: el.tagName })
          }

          // Motion analysis
          const transition = computed.transition
          if (transition && transition !== 'all 0s ease 0s') {
            results.motionValues.push({ value: transition, element: el.tagName })
          }

          // Contrast analysis (simplified)
          const color = computed.color
          const backgroundColor = computed.backgroundColor
          if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            results.contrastPairs.push({ foreground: color, background: backgroundColor })
          }
        })

        // Archetype detection signals
        const selectors = {
          hero: ['hero', 'banner', 'jumbotron', '.hero', '[class*="hero"]'],
          pricing: ['price', 'pricing', 'plan', '.price', '[class*="price"]'],
          features: ['feature', 'features', '.feature', '[class*="feature"]'],
          navigation: ['nav', 'navbar', 'navigation', 'menu'],
          footer: ['footer', '.footer'],
          blog: ['article', 'blog', 'post', '.blog', '.post']
        }

        Object.entries(selectors).forEach(([type, sels]) => {
          sels.forEach(sel => {
            const elements = document.querySelectorAll(sel)
            if (elements.length > 0) {
              results.archetypeSignals.push({ type, count: elements.length, selector: sel })
            }
          })
        })

        return results
      })

      return layoutData

    } finally {
      await context.close()
    }
  }

  private aggregateResults(results: any[]): LayoutDNAProfile {
    // Aggregate container analysis
    const containerMap = new Map<string, number>()
    results.forEach(result => {
      result.containers.forEach((container: any) => {
        const key = container.maxWidth
        containerMap.set(key, (containerMap.get(key) || 0) + 1)
      })
    })

    const containers: ContainerAnalysis = {
      maxWidths: Array.from(containerMap.entries())
        .map(([value, usage]) => ({ value, usage }))
        .sort((a, b) => b.usage - a.usage),
      patterns: [],
      responsiveStrategy: 'hybrid' // Simplified detection
    }

    // Aggregate grid/flex analysis
    const totalElements = results.reduce((sum, r) => sum + r.gridElements.length + r.flexElements.length, 0)
    const gridElements = results.reduce((sum, r) => sum + r.gridElements.length, 0)
    const flexElements = results.reduce((sum, r) => sum + r.flexElements.length, 0)

    const gridFlex: GridFlexAnalysis = {
      gridUsage: totalElements > 0 ? (gridElements / totalElements) * 100 : 0,
      flexUsage: totalElements > 0 ? (flexElements / totalElements) * 100 : 0,
      commonPatterns: [],
      columnCounts: []
    }

    // Aggregate spacing analysis
    const spacingValues = results.flatMap(r => r.spacingValues.map((s: any) => s.value))
    const spacingScale = this.analyzeSpacingScale(spacingValues)

    // Aggregate radius analysis
    const radiusValues = results.flatMap(r => r.radiusValues.map((r: any) => r.value))
    const radiiTaxonomy = this.analyzeRadiiTaxonomy(radiusValues)

    // Aggregate shadow analysis
    const shadowValues = results.flatMap(r => r.shadowValues.map((s: any) => s.value))
    const shadowsTaxonomy = this.analyzeShadowsTaxonomy(shadowValues)

    // Aggregate motion analysis
    const motionValues = results.flatMap(r => r.motionValues.map((m: any) => m.value))
    const motion = this.analyzeMotion(motionValues)

    // Aggregate contrast analysis
    const contrastPairs = results.flatMap(r => r.contrastPairs)
    const accessibility = this.analyzeAccessibility(contrastPairs)

    // Detect archetypes
    const archetypeSignals = results.flatMap(r => r.archetypeSignals)
    const archetypes = this.detectArchetypes(archetypeSignals)

    // Detect breakpoints (simplified)
    const breakpoints: BreakpointAnalysis = {
      detected: [
        { width: 768, usage: 100 },
        { width: 1024, usage: 80 },
        { width: 1280, usage: 60 }
      ],
      strategy: 'mobile-first'
    }

    return {
      archetypes,
      containers,
      gridFlex,
      spacingScale,
      radiiTaxonomy,
      shadowsTaxonomy,
      motion,
      accessibility,
      breakpoints
    }
  }

  private analyzeSpacingScale(values: string[]): SpacingScaleAnalysis {
    // Extract numeric values and detect common base
    const numericValues = values
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v > 0)
      .sort((a, b) => a - b)

    // Detect base unit (4px, 8px, 16px are common)
    const bases = [4, 8, 16]
    let bestBase = 8
    let bestScore = 0

    bases.forEach(base => {
      const score = numericValues.filter(v => v % base === 0).length / numericValues.length
      if (score > bestScore) {
        bestScore = score
        bestBase = base
      }
    })

    // Generate scale
    const scale = Array.from(new Set(numericValues.filter(v => v % bestBase === 0)))
      .slice(0, 10) // Limit to reasonable number

    return {
      base: bestBase,
      scale,
      consistency: bestScore * 100,
      commonGaps: []
    }
  }

  private analyzeRadiiTaxonomy(values: string[]): RadiiTaxonomy {
    const clusters = new Map<string, number>()
    values.forEach(value => {
      clusters.set(value, (clusters.get(value) || 0) + 1)
    })

    return {
      clusters: Array.from(clusters.entries())
        .map(([name, usage]) => ({ name, values: [name], usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5),
      consistency: values.length > 0 ? (clusters.size / values.length) * 100 : 0
    }
  }

  private analyzeShadowsTaxonomy(values: string[]): ShadowsTaxonomy {
    const elevationLevels = values
      .map((shadow, index) => ({ level: index + 1, shadow, usage: 1 }))
      .slice(0, 5)

    return {
      elevationLevels,
      patterns: [
        { type: 'card', shadow: values[0] || 'none' },
        { type: 'modal', shadow: values[1] || 'none' },
        { type: 'dropdown', shadow: values[2] || 'none' },
        { type: 'button', shadow: values[3] || 'none' }
      ]
    }
  }

  private analyzeMotion(values: string[]): MotionAnalysis {
    return {
      norms: {
        durations: [
          { intent: 'fast', value: '150ms', usage: 1 },
          { intent: 'normal', value: '300ms', usage: 1 },
          { intent: 'slow', value: '500ms', usage: 1 }
        ],
        easings: [
          { intent: 'smooth', value: 'ease-out', usage: 1 },
          { intent: 'bounce', value: 'ease-in-out', usage: 1 }
        ]
      },
      patterns: []
    }
  }

  private analyzeAccessibility(contrastPairs: any[]): AccessibilityAnalysis {
    const analyzedPairs = contrastPairs.map(pair => {
      const ratio = this.calculateContrastRatio(pair.foreground, pair.background)
      return {
        foreground: pair.foreground,
        background: pair.background,
        ratio,
        passes: {
          aa: ratio >= 4.5,
          aaa: ratio >= 7
        },
        usage: 1
      }
    }).slice(0, 10) // Limit results

    return {
      contrastRatios: analyzedPairs,
      focusManagement: {
        hasVisibleFocus: true, // Simplified
        skipLinks: false,
        tabOrder: 'logical'
      }
    }
  }

  private detectArchetypes(signals: any[]): PageArchetype[] {
    const typeMap = new Map<string, number>()
    signals.forEach(signal => {
      typeMap.set(signal.type, (typeMap.get(signal.type) || 0) + signal.count)
    })

    return Array.from(typeMap.entries()).map(([type, count]) => ({
      type: type as any,
      confidence: Math.min(100, count * 20), // Simplified confidence calculation
      elements: count,
      patterns: []
    }))
  }

  private calculateContrastRatio(fg: string, bg: string): number {
    // Simplified contrast ratio calculation
    // In production, would need proper color parsing and luminance calculation
    return 4.5 // Placeholder
  }
}