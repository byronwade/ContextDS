import type { Page } from 'playwright'
import { createHash } from 'crypto'

export interface VisualAnalysis {
  screenshots: ScreenshotAnalysis[]
  colorDominance: ColorDominanceAnalysis
  layoutStructure: LayoutStructureAnalysis
  visualHierarchy: VisualHierarchyAnalysis
  brandElements: BrandElementAnalysis
  patterns: VisualPatternAnalysis
  accessibility: VisualAccessibilityAnalysis
}

export interface ScreenshotAnalysis {
  viewport: { width: number; height: number; name: string }
  image: {
    url: string
    size: number
    hash: string
    dimensions: { width: number; height: number }
  }
  zones: LayoutZone[]
  colorPalette: ExtractedColor[]
  visualElements: DetectedElement[]
  layoutMetrics: LayoutMetrics
}

export interface LayoutZone {
  name: string
  bounds: { x: number; y: number; width: number; height: number }
  purpose: 'header' | 'hero' | 'navigation' | 'content' | 'sidebar' | 'footer' | 'unknown'
  dominantColors: string[]
  textDensity: number
  interactionElements: number
}

export interface ExtractedColor {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  usage: number
  dominance: number
  context: 'background' | 'text' | 'accent' | 'brand'
  accessibility: {
    contrastRatio?: number
    wcagLevel: 'AA' | 'AAA' | 'fail'
  }
}

export interface DetectedElement {
  type: 'button' | 'input' | 'card' | 'image' | 'text' | 'icon' | 'logo'
  bounds: { x: number; y: number; width: number; height: number }
  styles: {
    backgroundColor?: string
    borderRadius?: number
    shadow?: boolean
    gradient?: boolean
  }
  text?: string
  confidence: number
}

export interface LayoutMetrics {
  contentWidth: number
  maxContentWidth: number
  sidebars: number
  columns: number
  gridSystem: 'flexbox' | 'css-grid' | 'float' | 'table' | 'mixed'
  density: 'sparse' | 'comfortable' | 'dense'
  whitespaceRatio: number
}

export interface ColorDominanceAnalysis {
  primary: ExtractedColor[]
  secondary: ExtractedColor[]
  accent: ExtractedColor[]
  neutral: ExtractedColor[]
  gradients: Array<{
    colors: string[]
    direction: string
    usage: number
  }>
  colorHarmony: {
    scheme: 'monochromatic' | 'complementary' | 'triadic' | 'analogous' | 'custom'
    balance: number
    temperature: 'warm' | 'cool' | 'neutral'
  }
}

export interface LayoutStructureAnalysis {
  headerHeight: number
  footerHeight: number
  contentRatio: number
  asymmetry: number
  gridAlignment: boolean
  responsiveBreakpoints: number[]
  navigationPattern: 'horizontal' | 'vertical' | 'sidebar' | 'hamburger' | 'mixed'
}

export interface VisualHierarchyAnalysis {
  textSizes: Array<{ size: number; usage: number; context: string }>
  textWeights: Array<{ weight: number; usage: number }>
  headingStructure: {
    levels: number
    consistent: boolean
    scaling: number
  }
  focusFlow: {
    logical: boolean
    foldPriority: string[]
    callToActionStrength: number
  }
}

export interface BrandElementAnalysis {
  logos: Array<{
    bounds: { x: number; y: number; width: number; height: number }
    type: 'text' | 'image' | 'svg'
    dominantColors: string[]
    style: 'minimal' | 'decorative' | 'text-based' | 'icon-based'
  }>
  brandColors: {
    extracted: string[]
    consistency: number
    brandAlignment: number
  }
  visualIdentity: {
    style: 'modern' | 'traditional' | 'playful' | 'minimal' | 'corporate'
    personality: string[]
    maturity: number
  }
}

export interface VisualPatternAnalysis {
  buttons: {
    shapes: Array<{ borderRadius: number; usage: number }>
    sizes: Array<{ dimensions: { width: number; height: number }; usage: number }>
    styles: Array<{ type: 'filled' | 'outlined' | 'text' | 'floating'; usage: number }>
  }
  cards: {
    elevations: Array<{ shadow: string; usage: number }>
    aspectRatios: Array<{ ratio: number; usage: number }>
    layouts: Array<{ type: 'image-top' | 'image-left' | 'text-only'; usage: number }>
  }
  spacing: {
    verticalRhythm: number
    horizontalConsistency: number
    margins: number[]
    padding: number[]
  }
}

export interface VisualAccessibilityAnalysis {
  contrastIssues: Array<{
    elementType: string
    foreground: string
    background: string
    ratio: number
    severity: 'low' | 'medium' | 'high'
    suggestion: string
  }>
  textReadability: {
    averageLineLength: number
    textDensity: number
    readabilityScore: number
  }
  interactionTargets: {
    averageSize: number
    tooSmall: number
    adequateSpacing: boolean
  }
}

export class VisualAnalyzer {
  async analyzeVisual(
    page: Page,
    viewports: Array<{ width: number; height: number; name: string }>
  ): Promise<VisualAnalysis> {
    const screenshots: ScreenshotAnalysis[] = []

    // Capture and analyze each viewport
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(1000) // Allow layout to settle

      const screenshotData = await this.captureAndAnalyzeScreenshot(page, viewport)
      screenshots.push(screenshotData)
    }

    // Aggregate cross-viewport analysis
    const colorDominance = this.analyzeColorDominance(screenshots)
    const layoutStructure = this.analyzeLayoutStructure(screenshots)
    const visualHierarchy = this.analyzeVisualHierarchy(screenshots)
    const brandElements = this.analyzeBrandElements(screenshots)
    const patterns = this.analyzeVisualPatterns(screenshots)
    const accessibility = this.analyzeVisualAccessibility(screenshots)

    return {
      screenshots,
      colorDominance,
      layoutStructure,
      visualHierarchy,
      brandElements,
      patterns,
      accessibility
    }
  }

  private async captureAndAnalyzeScreenshot(
    page: Page,
    viewport: { width: number; height: number; name: string }
  ): Promise<ScreenshotAnalysis> {
    // Take high-quality screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
      quality: 90
    })

    const screenshotUrl = `data:image/png;base64,${screenshot.toString('base64')}`
    const hash = createHash('sha256').update(screenshot).digest('hex').substring(0, 16)

    // Analyze page structure for layout zones
    const layoutAnalysis = await page.evaluate(() => {
      const zones: any[] = []
      const elements: any[] = []

      // Detect major layout zones
      const zoneSelectors = [
        { selector: 'header, [role="banner"]', purpose: 'header' },
        { selector: '.hero, [class*="hero"], .banner, [class*="banner"]', purpose: 'hero' },
        { selector: 'nav, [role="navigation"]', purpose: 'navigation' },
        { selector: 'main, [role="main"], .content, [class*="content"]', purpose: 'content' },
        { selector: 'aside, [role="complementary"], .sidebar, [class*="sidebar"]', purpose: 'sidebar' },
        { selector: 'footer, [role="contentinfo"]', purpose: 'footer' }
      ]

      zoneSelectors.forEach(({ selector, purpose }) => {
        const els = document.querySelectorAll(selector)
        els.forEach(el => {
          const rect = el.getBoundingClientRect()
          const computed = getComputedStyle(el)

          if (rect.width > 0 && rect.height > 0) {
            zones.push({
              name: purpose,
              bounds: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              purpose,
              dominantColors: [
                computed.backgroundColor,
                computed.color
              ].filter(c => c && c !== 'rgba(0, 0, 0, 0)'),
              textDensity: (el.textContent || '').length / (rect.width * rect.height) * 10000,
              interactionElements: el.querySelectorAll('button, a, input, [role="button"]').length
            })
          }
        })
      })

      // Detect visual elements
      const elementSelectors = [
        { selector: 'button, [role="button"]', type: 'button' },
        { selector: 'input, textarea', type: 'input' },
        { selector: '.card, [class*="card"]', type: 'card' },
        { selector: 'img', type: 'image' },
        { selector: 'svg', type: 'icon' }
      ]

      elementSelectors.forEach(({ selector, type }) => {
        const els = document.querySelectorAll(selector)
        Array.from(els).slice(0, 20).forEach(el => { // Limit for performance
          const rect = el.getBoundingClientRect()
          const computed = getComputedStyle(el)

          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              type,
              bounds: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              styles: {
                backgroundColor: computed.backgroundColor,
                borderRadius: parseFloat(computed.borderRadius) || 0,
                shadow: computed.boxShadow !== 'none',
                gradient: computed.backgroundImage.includes('gradient')
              },
              text: el.textContent?.trim().substring(0, 50),
              confidence: this.calculateElementConfidence(el, computed, rect)
            })
          }
        })
      })

      // Calculate layout metrics
      const contentEl = document.querySelector('main, [role="main"], .content') || document.body
      const contentRect = contentEl.getBoundingClientRect()

      const layoutMetrics = {
        contentWidth: contentRect.width,
        maxContentWidth: this.getMaxContentWidth(),
        sidebars: document.querySelectorAll('aside, .sidebar').length,
        columns: this.detectColumnCount(),
        gridSystem: this.detectGridSystem(),
        density: this.calculateDensity(),
        whitespaceRatio: this.calculateWhitespaceRatio()
      }

      return {
        zones,
        elements,
        layoutMetrics
      }

      function calculateElementConfidence(el: Element, computed: CSSStyleDeclaration, rect: DOMRect): number {
        let confidence = 50

        // Size-based confidence
        if (rect.width > 100 && rect.height > 30) confidence += 20
        if (rect.width < 20 || rect.height < 20) confidence -= 30

        // Style-based confidence
        if (computed.backgroundColor !== 'rgba(0, 0, 0, 0)') confidence += 15
        if (computed.borderRadius !== '0px') confidence += 10
        if (computed.boxShadow !== 'none') confidence += 10

        // Content-based confidence
        if (el.textContent && el.textContent.trim().length > 0) confidence += 15

        return Math.max(0, Math.min(100, confidence))
      }

      function getMaxContentWidth(): number {
        const containers = document.querySelectorAll('.container, [class*="container"], main')
        let maxWidth = 0

        containers.forEach(container => {
          const computed = getComputedStyle(container)
          const width = parseFloat(computed.maxWidth) || container.getBoundingClientRect().width
          if (width > maxWidth) maxWidth = width
        })

        return maxWidth || window.innerWidth
      }

      function detectColumnCount(): number {
        const gridElements = document.querySelectorAll('[style*="grid-template-columns"]')
        if (gridElements.length > 0) {
          const firstGrid = gridElements[0] as HTMLElement
          const computed = getComputedStyle(firstGrid)
          const columns = computed.gridTemplateColumns.split(' ').length
          return columns
        }
        return 1
      }

      function detectGridSystem(): 'flexbox' | 'css-grid' | 'float' | 'table' | 'mixed' {
        const gridCount = document.querySelectorAll('[style*="grid"], .grid').length
        const flexCount = document.querySelectorAll('[style*="flex"], .flex').length
        const floatCount = document.querySelectorAll('[style*="float"]').length

        if (gridCount > flexCount && gridCount > floatCount) return 'css-grid'
        if (flexCount > gridCount && flexCount > floatCount) return 'flexbox'
        if (floatCount > 0) return 'float'
        return 'mixed'
      }

      function calculateDensity(): 'sparse' | 'comfortable' | 'dense' {
        const totalElements = document.querySelectorAll('*').length
        const viewportArea = window.innerWidth * window.innerHeight
        const density = totalElements / (viewportArea / 10000)

        if (density < 5) return 'sparse'
        if (density > 15) return 'dense'
        return 'comfortable'
      }

      function calculateWhitespaceRatio(): number {
        const bodyRect = document.body.getBoundingClientRect()
        const elements = Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const rect = el.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          })

        const totalElementArea = elements.reduce((sum, el) => {
          const rect = el.getBoundingClientRect()
          return sum + (rect.width * rect.height)
        }, 0)

        const totalArea = bodyRect.width * bodyRect.height
        return totalArea > 0 ? (totalArea - totalElementArea) / totalArea : 0
      }
    })

    // Extract colors from screenshot using canvas analysis
    const colorPalette = await this.extractColorsFromScreenshot(page, screenshot)

    return {
      viewport,
      image: {
        url: screenshotUrl,
        size: screenshot.length,
        hash,
        dimensions: viewport
      },
      zones: layoutAnalysis.zones,
      colorPalette,
      visualElements: layoutAnalysis.elements,
      layoutMetrics: layoutAnalysis.layoutMetrics
    }
  }

  private async extractColorsFromScreenshot(page: Page, screenshot: Buffer): Promise<ExtractedColor[]> {
    // Use canvas to analyze screenshot colors
    const colorAnalysis = await page.evaluate((imageData) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const img = new Image()

        img.onload = () => {
          canvas.width = Math.min(img.width, 400) // Limit size for performance
          canvas.height = Math.min(img.height, 300)

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const pixels = imageData.data

          const colorFreq = new Map<string, number>()
          const totalPixels = pixels.length / 4

          // Sample every 4th pixel for performance
          for (let i = 0; i < pixels.length; i += 16) {
            const r = pixels[i]
            const g = pixels[i + 1]
            const b = pixels[i + 2]
            const a = pixels[i + 3]

            if (a > 128) { // Skip transparent pixels
              const hex = this.rgbToHex(r, g, b)
              colorFreq.set(hex, (colorFreq.get(hex) || 0) + 1)
            }
          }

          // Get most frequent colors
          const sortedColors = Array.from(colorFreq.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([hex, count]) => {
              const rgb = this.hexToRgb(hex)!
              const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b)

              return {
                hex,
                rgb,
                hsl,
                usage: count,
                dominance: (count / totalPixels) * 100,
                context: this.determineColorContext(rgb),
                accessibility: {
                  wcagLevel: 'AA' as const // Would need proper calculation
                }
              }
            })

          resolve(sortedColors)
        }

        img.src = imageData
      })

      function rgbToHex(r: number, g: number, b: number): string {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
      }

      function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null
      }

      function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
        r /= 255
        g /= 255
        b /= 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h, s, l = (max + min) / 2

        if (max === min) {
          h = s = 0 // achromatic
        } else {
          const d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
            default: h = 0
          }

          h /= 6
        }

        return {
          h: Math.round(h * 360),
          s: Math.round(s * 100),
          l: Math.round(l * 100)
        }
      }

      function determineColorContext(rgb: { r: number; g: number; b: number }): 'background' | 'text' | 'accent' | 'brand' {
        const { r, g, b } = rgb
        const brightness = (r * 299 + g * 587 + b * 114) / 1000

        if (brightness > 240) return 'background'
        if (brightness < 50) return 'text'
        if (Math.abs(r - g) > 50 || Math.abs(g - b) > 50 || Math.abs(r - b) > 50) return 'accent'
        return 'brand'
      }
    }, `data:image/png;base64,${screenshot.toString('base64')}`)

    return colorAnalysis as ExtractedColor[]
  }

  private analyzeColorDominance(screenshots: ScreenshotAnalysis[]): ColorDominanceAnalysis {
    // Aggregate color data across all screenshots
    const allColors = screenshots.flatMap(s => s.colorPalette)
    const colorMap = new Map<string, { total: number; usage: number }>()

    allColors.forEach(color => {
      const existing = colorMap.get(color.hex) || { total: 0, usage: 0 }
      colorMap.set(color.hex, {
        total: existing.total + color.usage,
        usage: existing.usage + color.dominance
      })
    })

    const sortedColors = Array.from(colorMap.entries())
      .map(([hex, data]) => {
        const firstOccurrence = allColors.find(c => c.hex === hex)!
        return {
          ...firstOccurrence,
          usage: data.total,
          dominance: data.usage / screenshots.length
        }
      })
      .sort((a, b) => b.dominance - a.dominance)

    // Categorize colors
    const primary = sortedColors.slice(0, 3)
    const secondary = sortedColors.slice(3, 8)
    const neutral = sortedColors.filter(c => this.isNeutralColor(c))
    const accent = sortedColors.filter(c => !this.isNeutralColor(c) && !primary.includes(c) && !secondary.includes(c))

    // Analyze color harmony
    const colorHarmony = this.analyzeColorHarmony(primary)

    return {
      primary,
      secondary,
      accent: accent.slice(0, 5),
      neutral: neutral.slice(0, 5),
      gradients: [], // Would analyze from CSS
      colorHarmony
    }
  }

  private analyzeLayoutStructure(screenshots: ScreenshotAnalysis[]): LayoutStructureAnalysis {
    // Analyze layout consistency across viewports
    const desktopScreenshot = screenshots.find(s => s.viewport.name === 'desktop') || screenshots[0]

    if (!desktopScreenshot) {
      return {
        headerHeight: 0,
        footerHeight: 0,
        contentRatio: 0,
        asymmetry: 0,
        gridAlignment: false,
        responsiveBreakpoints: [],
        navigationPattern: 'horizontal'
      }
    }

    const headerZone = desktopScreenshot.zones.find(z => z.purpose === 'header')
    const footerZone = desktopScreenshot.zones.find(z => z.purpose === 'footer')
    const contentZone = desktopScreenshot.zones.find(z => z.purpose === 'content')

    const headerHeight = headerZone?.bounds.height || 0
    const footerHeight = footerZone?.bounds.height || 0
    const contentHeight = contentZone?.bounds.height || 0
    const totalHeight = desktopScreenshot.image.dimensions.height

    return {
      headerHeight,
      footerHeight,
      contentRatio: contentHeight / totalHeight,
      asymmetry: this.calculateAsymmetry(desktopScreenshot.zones),
      gridAlignment: this.detectGridAlignment(desktopScreenshot.zones),
      responsiveBreakpoints: this.detectBreakpoints(screenshots),
      navigationPattern: this.detectNavigationPattern(desktopScreenshot.zones)
    }
  }

  private analyzeVisualHierarchy(screenshots: ScreenshotAnalysis[]): VisualHierarchyAnalysis {
    // Aggregate text analysis across screenshots
    const desktopScreenshot = screenshots.find(s => s.viewport.name === 'desktop') || screenshots[0]

    // Mock implementation - in production would analyze text elements
    return {
      textSizes: [
        { size: 32, usage: 5, context: 'heading' },
        { size: 24, usage: 12, context: 'subheading' },
        { size: 16, usage: 150, context: 'body' },
        { size: 14, usage: 45, context: 'caption' }
      ],
      textWeights: [
        { weight: 400, usage: 180 },
        { weight: 500, usage: 25 },
        { weight: 600, usage: 12 },
        { weight: 700, usage: 8 }
      ],
      headingStructure: {
        levels: 3,
        consistent: true,
        scaling: 1.25 // Modular scale ratio
      },
      focusFlow: {
        logical: true,
        foldPriority: ['hero', 'primary-cta', 'features'],
        callToActionStrength: 85
      }
    }
  }

  private analyzeBrandElements(screenshots: ScreenshotAnalysis[]): BrandElementAnalysis {
    // Extract brand-specific visual elements
    const logos = screenshots.flatMap(s =>
      s.visualElements
        .filter(el => el.type === 'image' && (
          (el.text && el.text.toLowerCase().includes('logo')) ||
          el.bounds.y < 100 // Likely in header
        ))
        .map(el => ({
          bounds: el.bounds,
          type: 'image' as const,
          dominantColors: [], // Would extract from image
          style: 'minimal' as const
        }))
    )

    // Analyze brand color consistency
    const headerColors = screenshots.flatMap(s => {
      const headerZone = s.zones.find(z => z.purpose === 'header')
      return headerZone?.dominantColors || []
    })

    const uniqueBrandColors = [...new Set(headerColors)]

    return {
      logos: logos.slice(0, 3), // Limit results
      brandColors: {
        extracted: uniqueBrandColors,
        consistency: this.calculateColorConsistency(headerColors),
        brandAlignment: 85 // Mock score
      },
      visualIdentity: {
        style: this.determineVisualStyle(screenshots),
        personality: ['professional', 'modern', 'clean'],
        maturity: 78
      }
    }
  }

  private analyzeVisualPatterns(screenshots: ScreenshotAnalysis[]): VisualPatternAnalysis {
    // Aggregate pattern analysis
    const allButtons = screenshots.flatMap(s =>
      s.visualElements.filter(el => el.type === 'button')
    )

    const buttonShapes = this.groupByProperty(allButtons, 'styles.borderRadius')
    const buttonSizes = this.groupByDimensions(allButtons)

    const allCards = screenshots.flatMap(s =>
      s.visualElements.filter(el => el.type === 'card')
    )

    return {
      buttons: {
        shapes: buttonShapes.map(({ value, count }) => ({
          borderRadius: value as number,
          usage: count
        })),
        sizes: buttonSizes,
        styles: [
          { type: 'filled', usage: allButtons.filter(b => b.styles.backgroundColor).length },
          { type: 'outlined', usage: allButtons.filter(b => !b.styles.backgroundColor).length }
        ]
      },
      cards: {
        elevations: allCards.map(c => ({
          shadow: c.styles.shadow ? 'elevated' : 'flat',
          usage: 1
        })),
        aspectRatios: this.calculateAspectRatios(allCards),
        layouts: [{ type: 'image-top', usage: allCards.length }]
      },
      spacing: {
        verticalRhythm: this.calculateVerticalRhythm(screenshots),
        horizontalConsistency: this.calculateHorizontalConsistency(screenshots),
        margins: [8, 16, 24, 32], // Mock values
        padding: [8, 12, 16, 20, 24]
      }
    }
  }

  private analyzeVisualAccessibility(screenshots: ScreenshotAnalysis[]): VisualAccessibilityAnalysis {
    // Aggregate accessibility analysis across viewports
    const allColors = screenshots.flatMap(s => s.colorPalette)

    const contrastIssues = allColors
      .filter(color => color.accessibility.wcagLevel === 'fail')
      .map(color => ({
        elementType: 'text',
        foreground: color.hex,
        background: '#ffffff', // Mock background
        ratio: 2.1, // Mock ratio
        severity: 'high' as const,
        suggestion: 'Increase color contrast or use a darker shade'
      }))

    return {
      contrastIssues,
      textReadability: {
        averageLineLength: 65, // Characters
        textDensity: 0.6, // Characters per pixel
        readabilityScore: 82
      },
      interactionTargets: {
        averageSize: 44, // Pixels
        tooSmall: 0,
        adequateSpacing: true
      }
    }
  }

  // Helper methods

  private isNeutralColor(color: ExtractedColor): boolean {
    const { r, g, b } = color.rgb
    const diff = Math.max(r, g, b) - Math.min(r, g, b)
    return diff < 30 // Low saturation indicates neutral
  }

  private analyzeColorHarmony(colors: ExtractedColor[]): ColorDominanceAnalysis['colorHarmony'] {
    if (colors.length < 2) {
      return { scheme: 'monochromatic', balance: 50, temperature: 'neutral' }
    }

    const hues = colors.map(c => c.hsl.h)
    const hueDifferences = []

    for (let i = 1; i < hues.length; i++) {
      hueDifferences.push(Math.abs(hues[i] - hues[0]))
    }

    // Determine color scheme
    let scheme: ColorDominanceAnalysis['colorHarmony']['scheme'] = 'custom'

    if (hueDifferences.every(diff => diff < 30)) {
      scheme = 'monochromatic'
    } else if (hueDifferences.some(diff => Math.abs(diff - 180) < 30)) {
      scheme = 'complementary'
    } else if (hueDifferences.some(diff => Math.abs(diff - 120) < 30)) {
      scheme = 'triadic'
    } else if (hueDifferences.every(diff => diff < 60)) {
      scheme = 'analogous'
    }

    // Determine temperature
    const avgHue = hues.reduce((sum, hue) => sum + hue, 0) / hues.length
    let temperature: 'warm' | 'cool' | 'neutral' = 'neutral'

    if (avgHue > 0 && avgHue < 120) temperature = 'warm'
    else if (avgHue > 180 && avgHue < 300) temperature = 'cool'

    return {
      scheme,
      balance: this.calculateColorBalance(colors),
      temperature
    }
  }

  private calculateColorBalance(colors: ExtractedColor[]): number {
    const totalDominance = colors.reduce((sum, c) => sum + c.dominance, 0)
    const expectedDominance = 100 / colors.length

    const variance = colors.reduce((sum, c) => {
      return sum + Math.pow(c.dominance - expectedDominance, 2)
    }, 0) / colors.length

    // Lower variance = better balance
    return Math.max(0, 100 - variance)
  }

  private calculateAsymmetry(zones: LayoutZone[]): number {
    // Calculate layout asymmetry
    const contentZone = zones.find(z => z.purpose === 'content')
    if (!contentZone) return 0

    const centerX = contentZone.bounds.x + contentZone.bounds.width / 2
    const viewportCenter = contentZone.bounds.width / 2

    return Math.abs(centerX - viewportCenter) / viewportCenter
  }

  private detectGridAlignment(zones: LayoutZone[]): boolean {
    // Check if zones align to a grid
    const leftEdges = zones.map(z => z.bounds.x)
    const rightEdges = zones.map(z => z.bounds.x + z.bounds.width)

    const uniqueLefts = [...new Set(leftEdges)]
    const uniqueRights = [...new Set(rightEdges)]

    // If most zones share edge positions, likely grid-aligned
    return uniqueLefts.length <= zones.length * 0.5 && uniqueRights.length <= zones.length * 0.5
  }

  private detectBreakpoints(screenshots: ScreenshotAnalysis[]): number[] {
    return screenshots.map(s => s.viewport.width).sort((a, b) => a - b)
  }

  private detectNavigationPattern(zones: LayoutZone[]): LayoutStructureAnalysis['navigationPattern'] {
    const navZone = zones.find(z => z.purpose === 'navigation')
    const headerZone = zones.find(z => z.purpose === 'header')

    if (!navZone && !headerZone) return 'horizontal'

    const zone = navZone || headerZone!

    if (zone.bounds.height > zone.bounds.width) return 'vertical'
    if (zone.bounds.width < 200) return 'hamburger'
    if (zone.bounds.x > 0) return 'sidebar'

    return 'horizontal'
  }

  private groupByProperty<T>(items: T[], property: string): Array<{ value: any; count: number }> {
    const groups = new Map<any, number>()

    items.forEach(item => {
      const value = this.getNestedProperty(item, property)
      if (value !== undefined) {
        groups.set(value, (groups.get(value) || 0) + 1)
      }
    })

    return Array.from(groups.entries()).map(([value, count]) => ({ value, count }))
  }

  private groupByDimensions(items: any[]): Array<{ dimensions: { width: number; height: number }; usage: number }> {
    const dimensionMap = new Map<string, number>()

    items.forEach(item => {
      if (item.bounds) {
        const key = `${Math.round(item.bounds.width)}x${Math.round(item.bounds.height)}`
        dimensionMap.set(key, (dimensionMap.get(key) || 0) + 1)
      }
    })

    return Array.from(dimensionMap.entries()).map(([dimensions, usage]) => {
      const [width, height] = dimensions.split('x').map(Number)
      return { dimensions: { width, height }, usage }
    })
  }

  private calculateAspectRatios(cards: any[]): Array<{ ratio: number; usage: number }> {
    const ratioMap = new Map<number, number>()

    cards.forEach(card => {
      if (card.bounds && card.bounds.height > 0) {
        const ratio = Math.round((card.bounds.width / card.bounds.height) * 100) / 100
        ratioMap.set(ratio, (ratioMap.get(ratio) || 0) + 1)
      }
    })

    return Array.from(ratioMap.entries()).map(([ratio, usage]) => ({ ratio, usage }))
  }

  private calculateVerticalRhythm(screenshots: ScreenshotAnalysis[]): number {
    // Calculate vertical spacing consistency
    const desktopScreenshot = screenshots.find(s => s.viewport.name === 'desktop')
    if (!desktopScreenshot) return 0

    const verticalSpaces = []
    const zones = desktopScreenshot.zones.sort((a, b) => a.bounds.y - b.bounds.y)

    for (let i = 1; i < zones.length; i++) {
      const gap = zones[i].bounds.y - (zones[i-1].bounds.y + zones[i-1].bounds.height)
      if (gap > 0) {
        verticalSpaces.push(gap)
      }
    }

    if (verticalSpaces.length === 0) return 0

    // Check for rhythm (consistent spacing)
    const baseUnit = this.findCommonDivisor(verticalSpaces)
    const rhythmScore = verticalSpaces.filter(space => space % baseUnit === 0).length / verticalSpaces.length

    return rhythmScore * 100
  }

  private calculateHorizontalConsistency(screenshots: ScreenshotAnalysis[]): number {
    // Calculate horizontal alignment consistency
    const desktopScreenshot = screenshots.find(s => s.viewport.name === 'desktop')
    if (!desktopScreenshot) return 0

    const leftEdges = desktopScreenshot.zones.map(z => z.bounds.x)
    const rightEdges = desktopScreenshot.zones.map(z => z.bounds.x + z.bounds.width)

    const uniqueLefts = [...new Set(leftEdges)]
    const uniqueRights = [...new Set(rightEdges)]

    // More unique edges = less consistency
    const consistency = Math.max(0, 100 - (uniqueLefts.length + uniqueRights.length) * 5)
    return consistency
  }

  private calculateColorConsistency(colors: string[]): number {
    const uniqueColors = new Set(colors)
    return colors.length > 0 ? (uniqueColors.size / colors.length) * 100 : 0
  }

  private determineVisualStyle(screenshots: ScreenshotAnalysis[]): BrandElementAnalysis['visualIdentity']['style'] {
    // Analyze visual characteristics to determine style
    const allElements = screenshots.flatMap(s => s.visualElements)
    const roundedElements = allElements.filter(el => (el.styles.borderRadius || 0) > 8)
    const shadowElements = allElements.filter(el => el.styles.shadow)
    const gradientElements = allElements.filter(el => el.styles.gradient)

    if (roundedElements.length / allElements.length > 0.6) return 'modern'
    if (shadowElements.length / allElements.length > 0.4) return 'modern'
    if (gradientElements.length > 0) return 'modern'
    if (roundedElements.length === 0 && shadowElements.length === 0) return 'minimal'

    return 'traditional'
  }

  private findCommonDivisor(numbers: number[]): number {
    const commonDivisors = [4, 8, 12, 16, 20, 24]
    let bestDivisor = 8
    let bestScore = 0

    commonDivisors.forEach(divisor => {
      const score = numbers.filter(n => n % divisor === 0).length / numbers.length
      if (score > bestScore) {
        bestScore = score
        bestDivisor = divisor
      }
    })

    return bestDivisor
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}