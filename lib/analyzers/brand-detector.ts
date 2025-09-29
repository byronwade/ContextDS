import type { Page } from 'playwright'

export interface BrandAnalysis {
  identity: BrandIdentity
  components: ComponentLibraryDetection
  designLanguage: DesignLanguage
  maturity: BrandMaturity
}

export interface BrandIdentity {
  logo: LogoAnalysis
  colors: BrandColorAnalysis
  typography: BrandTypographyAnalysis
  voice: BrandVoice
  consistency: ConsistencyAnalysis
}

export interface LogoAnalysis {
  elements: Array<{
    type: 'text' | 'image' | 'svg' | 'icon'
    content: string
    bounds: { x: number; y: number; width: number; height: number }
    colors: string[]
    style: 'wordmark' | 'symbol' | 'combination' | 'emblem'
    quality: number
  }>
  placement: 'header-left' | 'header-center' | 'sidebar' | 'footer' | 'multiple'
  responsive: boolean
  consistency: number
}

export interface BrandColorAnalysis {
  primary: Array<{ color: string; usage: number; semantic: string }>
  secondary: Array<{ color: string; usage: number; semantic: string }>
  palette: {
    size: number
    harmony: 'monochromatic' | 'complementary' | 'triadic' | 'analogous' | 'custom'
    temperature: 'warm' | 'cool' | 'neutral'
    saturation: 'vibrant' | 'muted' | 'mixed'
  }
  accessibility: {
    contrastCompliance: number
    colorBlindSafe: boolean
    lowVisionFriendly: boolean
  }
  semantic: {
    success: string[]
    warning: string[]
    error: string[]
    info: string[]
    neutral: string[]
  }
}

export interface BrandTypographyAnalysis {
  hierarchy: {
    levels: number
    scaleRatio: number
    consistency: number
  }
  families: Array<{
    name: string
    role: 'primary' | 'secondary' | 'accent' | 'monospace'
    classification: 'serif' | 'sans-serif' | 'display' | 'monospace' | 'custom'
    personality: string[]
    usage: number
  }>
  personality: 'modern' | 'traditional' | 'playful' | 'technical' | 'elegant' | 'bold'
}

export interface BrandVoice {
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful' | 'minimal'
  personality: string[]
  terminology: {
    technical: number
    casual: number
    formal: number
    jargon: string[]
  }
  messaging: {
    valueProposition: string[]
    keyMessages: string[]
    ctaPatterns: string[]
  }
}

export interface ComponentLibraryDetection {
  detected: DetectedLibrary[]
  customization: CustomizationLevel
  patterns: ComponentPatterns
  completeness: number
}

export interface DetectedLibrary {
  name: string
  type: 'react' | 'vue' | 'angular' | 'css' | 'design-system'
  version?: string
  confidence: number
  evidence: LibraryEvidence[]
  coverage: {
    components: number
    customization: number
    theming: boolean
  }
}

export interface LibraryEvidence {
  type: 'className' | 'domStructure' | 'cssSignature' | 'scriptTag' | 'stylePattern'
  description: string
  examples: string[]
  confidence: number
}

export interface ComponentPatterns {
  buttons: ButtonPatternAnalysis
  forms: FormPatternAnalysis
  navigation: NavigationPatternAnalysis
  cards: CardPatternAnalysis
  feedback: FeedbackPatternAnalysis
}

export interface ButtonPatternAnalysis {
  variants: Array<{
    name: string
    styles: any
    semantics: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link'
    usage: number
  }>
  states: Array<{
    state: 'default' | 'hover' | 'focus' | 'active' | 'disabled'
    modifications: any
    accessibility: boolean
  }>
  sizes: Array<{ size: string; dimensions: any; usage: number }>
  consistency: number
}

export interface FormPatternAnalysis {
  inputs: {
    baseStyles: any
    states: any
    validation: boolean
    accessibility: number
  }
  labels: {
    strategy: 'above' | 'inline' | 'floating' | 'hidden'
    consistency: number
  }
  validation: {
    inline: boolean
    onSubmit: boolean
    realTime: boolean
    accessibility: boolean
  }
}

export interface NavigationPatternAnalysis {
  structure: {
    type: 'horizontal' | 'vertical' | 'sidebar' | 'hamburger' | 'mega'
    levels: number
    responsive: boolean
  }
  styling: {
    activeStates: boolean
    hoverEffects: boolean
    transitions: boolean
  }
  accessibility: {
    ariaNavigation: boolean
    keyboardNavigation: boolean
    focusManagement: boolean
  }
}

export interface CardPatternAnalysis {
  variants: Array<{
    elevation: number
    borderRadius: number
    usage: number
  }>
  content: {
    layouts: string[]
    commonElements: string[]
  }
  interactions: {
    hover: boolean
    clickable: boolean
    expandable: boolean
  }
}

export interface FeedbackPatternAnalysis {
  notifications: {
    toasts: boolean
    banners: boolean
    inline: boolean
    positioning: string
  }
  loading: {
    spinners: boolean
    skeletons: boolean
    progressBars: boolean
    overlays: boolean
  }
  states: {
    success: boolean
    error: boolean
    warning: boolean
    info: boolean
  }
}

export interface DesignLanguage {
  style: 'material' | 'flat' | 'neumorphic' | 'glassmorphic' | 'minimalist' | 'expressive' | 'custom'
  characteristics: {
    depth: 'flat' | 'layered' | 'deep'
    corners: 'sharp' | 'rounded' | 'circular'
    shadows: 'none' | 'subtle' | 'prominent'
    colors: 'monochromatic' | 'duotone' | 'colorful'
    animation: 'none' | 'subtle' | 'expressive'
  }
  influences: string[]
  uniqueness: number
}

export interface ConsistencyAnalysis {
  overall: number
  categories: {
    colors: number
    typography: number
    spacing: number
    components: number
    interactions: number
  }
  violations: Array<{
    category: string
    description: string
    severity: 'low' | 'medium' | 'high'
    suggestions: string[]
  }>
}

export interface CustomizationLevel {
  level: 'none' | 'light' | 'moderate' | 'heavy' | 'complete'
  areas: {
    theming: boolean
    components: boolean
    layout: boolean
    interactions: boolean
  }
  overrides: string[]
  brandAlignment: number
}

export interface BrandMaturity {
  level: 'inconsistent' | 'basic' | 'developing' | 'mature' | 'systematic'
  score: number
  factors: {
    consistency: number
    completeness: number
    accessibility: number
    scalability: number
    innovation: number
  }
  recommendations: string[]
}

export class BrandDetector {
  private componentLibraries = new Map<string, ComponentLibrarySignature>()

  constructor() {
    this.initializeComponentSignatures()
  }

  private initializeComponentSignatures() {
    // Material-UI / MUI
    this.componentLibraries.set('mui', {
      name: 'Material-UI',
      type: 'react',
      signatures: {
        classPatterns: [
          /\bMui[A-Z]\w*/g,
          /\bmui-\d+-\w+/g,
          /\bMuiButton-root/g,
          /\bMuiTypography-\w+/g
        ],
        domStructures: [
          '[class*="MuiButton"]',
          '[class*="MuiPaper"]',
          '[class*="MuiTypography"]',
          '.MuiThemeProvider'
        ],
        cssSignatures: [
          /@mui\/material/,
          /--mui-/,
          /\.MuiButton-/
        ]
      },
      components: ['Button', 'TextField', 'Card', 'AppBar', 'Typography', 'Paper']
    })

    // Ant Design
    this.componentLibraries.set('antd', {
      name: 'Ant Design',
      type: 'react',
      signatures: {
        classPatterns: [
          /\bant-\w+/g,
          /\bant-btn-\w+/g,
          /\bant-input\b/g,
          /\bant-card\b/g
        ],
        domStructures: [
          '[class*="ant-btn"]',
          '[class*="ant-input"]',
          '[class*="ant-card"]',
          '.ant-layout'
        ],
        cssSignatures: [
          /antd/,
          /@ant-design/,
          /--ant-/
        ]
      },
      components: ['Button', 'Input', 'Card', 'Table', 'Menu', 'Layout']
    })

    // Chakra UI
    this.componentLibraries.set('chakra', {
      name: 'Chakra UI',
      type: 'react',
      signatures: {
        classPatterns: [
          /\bchakra-\w+/g,
          /\bcss-\w{6,}/g // Emotion CSS classes
        ],
        domStructures: [
          '[data-theme]',
          '.chakra-ui-light',
          '.chakra-ui-dark'
        ],
        cssSignatures: [
          /@chakra-ui/,
          /--chakra-/,
          /\.css-\w{6}/
        ]
      },
      components: ['Button', 'Input', 'Box', 'Stack', 'Text']
    })

    // Mantine
    this.componentLibraries.set('mantine', {
      name: 'Mantine',
      type: 'react',
      signatures: {
        classPatterns: [
          /\bmantine-\w+/g,
          /\bm_\w+/g
        ],
        domStructures: [
          '[class*="mantine-"]',
          '[data-mantine-color-scheme]'
        ],
        cssSignatures: [
          /@mantine/,
          /--mantine-/
        ]
      },
      components: ['Button', 'TextInput', 'Card', 'AppShell', 'Title']
    })

    // React Bootstrap
    this.componentLibraries.set('react-bootstrap', {
      name: 'React Bootstrap',
      type: 'react',
      signatures: {
        classPatterns: [
          /\bbtn-\w+/g,
          /\bform-\w+/g,
          /\bcard\b/g,
          /\bnavbar\b/g
        ],
        domStructures: [
          '.container-fluid',
          '.row',
          '[class*="col-"]'
        ],
        cssSignatures: [
          /bootstrap/,
          /\$grid-/,
          /\.btn-primary/
        ]
      },
      components: ['Button', 'Form', 'Card', 'Navbar', 'Container']
    })

    // Semantic UI
    this.componentLibraries.set('semantic-ui', {
      name: 'Semantic UI',
      type: 'css',
      signatures: {
        classPatterns: [
          /\bui\s+\w+/g,
          /\bsemantic-ui/g
        ],
        domStructures: [
          '.ui.button',
          '.ui.menu',
          '.ui.card'
        ],
        cssSignatures: [
          /semantic-ui/,
          /\.ui\./
        ]
      },
      components: ['Button', 'Menu', 'Card', 'Form', 'Grid']
    })
  }

  async analyzeBrand(page: Page): Promise<BrandAnalysis> {
    const [
      identity,
      components,
      designLanguage
    ] = await Promise.all([
      this.analyzeBrandIdentity(page),
      this.detectComponentLibrary(page),
      this.analyzeDesignLanguage(page)
    ])

    const maturity = this.assessBrandMaturity(identity, components, designLanguage)

    return {
      identity,
      components,
      designLanguage,
      maturity
    }
  }

  private async analyzeBrandIdentity(page: Page): Promise<BrandIdentity> {
    const brandData = await page.evaluate(() => {
      const results = {
        logo: { elements: [], placement: 'header-left', responsive: false, consistency: 0 },
        colors: {
          primary: [],
          secondary: [],
          palette: { size: 0, harmony: 'custom', temperature: 'neutral', saturation: 'mixed' },
          accessibility: { contrastCompliance: 0, colorBlindSafe: false, lowVisionFriendly: false },
          semantic: { success: [], warning: [], error: [], info: [], neutral: [] }
        },
        typography: {
          hierarchy: { levels: 0, scaleRatio: 1.2, consistency: 0 },
          families: [],
          personality: 'modern'
        },
        voice: {
          tone: 'professional',
          personality: [],
          terminology: { technical: 0, casual: 0, formal: 0, jargon: [] },
          messaging: { valueProposition: [], keyMessages: [], ctaPatterns: [] }
        },
        consistency: {
          overall: 0,
          categories: { colors: 0, typography: 0, spacing: 0, components: 0, interactions: 0 },
          violations: []
        }
      }

      // Logo detection with multiple strategies
      const logoSelectors = [
        'img[alt*="logo" i]',
        'img[src*="logo" i]',
        '.logo img',
        '[class*="logo"] img',
        'header img:first-child',
        '.brand img',
        '[aria-label*="logo" i]',
        'svg[class*="logo"]',
        'h1 img',
        '.navbar-brand img'
      ]

      const logoElements: any[] = []

      logoSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect()
          const computed = getComputedStyle(element)

          if (rect.width > 0 && rect.height > 0) {
            const logoData = {
              type: element.tagName.toLowerCase() === 'svg' ? 'svg' : 'image',
              content: element.getAttribute('src') || element.getAttribute('alt') || '',
              bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              colors: this.extractElementColors(element, computed),
              style: this.classifyLogoStyle(element, rect),
              quality: this.calculateLogoQuality(element, rect, computed)
            }

            logoElements.push(logoData)
          }
        })
      })

      results.logo.elements = logoElements

      // Determine logo placement
      if (logoElements.length > 0) {
        const firstLogo = logoElements[0]
        if (firstLogo.bounds.x < 100 && firstLogo.bounds.y < 100) {
          results.logo.placement = 'header-left'
        } else if (firstLogo.bounds.x > window.innerWidth * 0.4 && firstLogo.bounds.y < 100) {
          results.logo.placement = 'header-center'
        }
      }

      // Brand color extraction from key areas
      const brandAreas = [
        document.querySelector('header'),
        document.querySelector('.hero, [class*="hero"]'),
        document.querySelector('.navbar'),
        document.querySelector('main > section:first-child')
      ].filter(Boolean)

      const brandColors = new Map<string, number>()

      brandAreas.forEach(area => {
        if (area) {
          const computed = getComputedStyle(area)
          const bgColor = computed.backgroundColor
          const textColor = computed.color

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
            brandColors.set(bgColor, (brandColors.get(bgColor) || 0) + 5) // Higher weight for brand areas
          }

          if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
            brandColors.set(textColor, (brandColors.get(textColor) || 0) + 3)
          }

          // Check for accent colors in buttons, links
          const accentElements = area.querySelectorAll('button, a, .btn, [class*="button"]')
          accentElements.forEach(accent => {
            const accentComputed = getComputedStyle(accent)
            const accentBg = accentComputed.backgroundColor
            const accentText = accentComputed.color

            if (accentBg && accentBg !== 'rgba(0, 0, 0, 0)') {
              brandColors.set(accentBg, (brandColors.get(accentBg) || 0) + 8) // High weight for interactive elements
            }
          })
        }
      })

      // Sort and categorize brand colors
      const sortedBrandColors = Array.from(brandColors.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)

      results.colors.primary = sortedBrandColors.slice(0, 3).map(([color, usage]) => ({
        color,
        usage,
        semantic: this.inferColorSemantic(color)
      }))

      results.colors.secondary = sortedBrandColors.slice(3, 6).map(([color, usage]) => ({
        color,
        usage,
        semantic: this.inferColorSemantic(color)
      }))

      // Typography analysis
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const fontFamilies = new Map<string, number>()

      headings.forEach(heading => {
        const computed = getComputedStyle(heading)
        const family = computed.fontFamily
        fontFamilies.set(family, (fontFamilies.get(family) || 0) + 1)
      })

      results.typography.families = Array.from(fontFamilies.entries()).map(([family, usage]) => ({
        name: family,
        role: usage > 3 ? 'primary' : 'secondary',
        classification: this.classifyFontFamily(family),
        personality: this.inferTypographyPersonality(family),
        usage
      }))

      // Voice and tone analysis
      const textContent = document.body.textContent?.toLowerCase() || ''
      const headingText = Array.from(headings).map(h => h.textContent || '').join(' ').toLowerCase()

      // Analyze tone from text patterns
      const toneIndicators = {
        professional: ['solution', 'enterprise', 'industry', 'platform', 'service', 'business'],
        casual: ['hey', 'awesome', 'cool', 'fun', 'love', 'easy', 'simple'],
        friendly: ['welcome', 'help', 'support', 'community', 'together', 'join'],
        authoritative: ['leading', 'expert', 'trusted', 'proven', 'authority', 'standard'],
        playful: ['amazing', 'delightful', 'magical', 'exciting', 'wonderful', 'fantastic'],
        minimal: ['clean', 'simple', 'minimal', 'pure', 'essential', 'focused']
      }

      let dominantTone = 'professional'
      let maxScore = 0

      Object.entries(toneIndicators).forEach(([tone, indicators]) => {
        const score = indicators.filter(indicator => textContent.includes(indicator)).length
        if (score > maxScore) {
          maxScore = score
          dominantTone = tone
        }
      })

      results.voice.tone = dominantTone as any

      // Extract CTAs and value propositions
      const ctaElements = document.querySelectorAll('button, .btn, .cta, [class*="cta"], a[class*="button"]')
      const ctaTexts = Array.from(ctaElements).map(el => el.textContent?.trim()).filter(Boolean)

      results.voice.messaging.ctaPatterns = [...new Set(ctaTexts)].slice(0, 10)

      return results

      // Helper functions
      function extractElementColors(element: Element, computed: CSSStyleDeclaration): string[] {
        const colors = []

        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          colors.push(computed.backgroundColor)
        }
        if (computed.color && computed.color !== 'rgba(0, 0, 0, 0)') {
          colors.push(computed.color)
        }
        if (computed.borderColor && computed.borderColor !== 'rgba(0, 0, 0, 0)') {
          colors.push(computed.borderColor)
        }

        return colors
      }

      function classifyLogoStyle(element: Element, rect: DOMRect): 'wordmark' | 'symbol' | 'combination' | 'emblem' {
        const hasText = element.textContent && element.textContent.trim().length > 0
        const aspectRatio = rect.width / rect.height

        if (hasText && aspectRatio > 2) return 'wordmark'
        if (!hasText && aspectRatio < 1.5) return 'symbol'
        if (hasText && aspectRatio < 2) return 'combination'
        return 'emblem'
      }

      function calculateLogoQuality(element: Element, rect: DOMRect, computed: CSSStyleDeclaration): number {
        let quality = 50

        // Size quality
        if (rect.width >= 120 && rect.width <= 300) quality += 20
        if (rect.height >= 30 && rect.height <= 80) quality += 20

        // Position quality
        if (rect.y < 100) quality += 15 // In header area

        // Image quality (for img elements)
        if (element.tagName === 'IMG') {
          const src = element.getAttribute('src') || ''
          if (src.includes('.svg')) quality += 20 // Vector graphics
          if (src.includes('@2x') || src.includes('retina')) quality += 10
        }

        // SVG quality
        if (element.tagName === 'SVG') {
          quality += 25 // Vector graphics are high quality
        }

        return Math.min(100, quality)
      }

      function inferColorSemantic(color: string): string {
        // Convert to RGB for analysis
        const rgb = this.parseColor(color)
        if (!rgb) return 'neutral'

        const { r, g, b } = rgb

        // Simple semantic classification
        if (r > 200 && g < 100 && b < 100) return 'error'
        if (r < 100 && g > 200 && b < 100) return 'success'
        if (r > 200 && g > 200 && b < 100) return 'warning'
        if (r < 100 && g < 100 && b > 200) return 'info'
        if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return 'neutral'

        return 'brand'
      }

      function classifyFontFamily(family: string): 'serif' | 'sans-serif' | 'display' | 'monospace' | 'custom' {
        const lowerFamily = family.toLowerCase()

        if (lowerFamily.includes('serif') && !lowerFamily.includes('sans')) return 'serif'
        if (lowerFamily.includes('mono') || lowerFamily.includes('code')) return 'monospace'
        if (lowerFamily.includes('display') || lowerFamily.includes('headline')) return 'display'
        if (lowerFamily.includes('sans') || lowerFamily.includes('arial') || lowerFamily.includes('helvetica')) return 'sans-serif'

        return 'custom'
      }

      function inferTypographyPersonality(family: string): string[] {
        const personality = []
        const lowerFamily = family.toLowerCase()

        if (lowerFamily.includes('modern') || lowerFamily.includes('contemporary')) personality.push('modern')
        if (lowerFamily.includes('classic') || lowerFamily.includes('traditional')) personality.push('traditional')
        if (lowerFamily.includes('playful') || lowerFamily.includes('fun')) personality.push('playful')
        if (lowerFamily.includes('tech') || lowerFamily.includes('code')) personality.push('technical')
        if (lowerFamily.includes('elegant') || lowerFamily.includes('refined')) personality.push('elegant')

        return personality.length > 0 ? personality : ['neutral']
      }

      function parseColor(color: string): { r: number; g: number; b: number } | null {
        // Simple RGB parsing - in production would use proper color parsing library
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (rgbMatch) {
          return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
          }
        }
        return null
      }
    })

    return brandData as BrandIdentity
  }

  private async detectComponentLibrary(page: Page): Promise<ComponentLibraryDetection> {
    const detected: DetectedLibrary[] = []

    for (const [key, signature] of this.componentLibraries.entries()) {
      const analysis = await page.evaluate((sig) => {
        const evidence: any[] = []
        let totalConfidence = 0

        // Check class patterns
        const allClasses = Array.from(document.querySelectorAll('[class]'))
          .flatMap(el => Array.from(el.classList))
          .join(' ')

        sig.signatures.classPatterns?.forEach(pattern => {
          const matches = allClasses.match(pattern) || []
          if (matches.length > 0) {
            evidence.push({
              type: 'className',
              description: `Found ${matches.length} class pattern matches`,
              examples: matches.slice(0, 5),
              confidence: Math.min(90, matches.length * 5)
            })
            totalConfidence += Math.min(90, matches.length * 5)
          }
        })

        // Check DOM structures
        sig.signatures.domStructures?.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            evidence.push({
              type: 'domStructure',
              description: `Found ${elements.length} DOM structure matches`,
              examples: [selector],
              confidence: Math.min(80, elements.length * 10)
            })
            totalConfidence += Math.min(80, elements.length * 10)
          }
        })

        // Calculate component coverage
        const detectedComponents = sig.components.filter(component => {
          const componentSelector = `[class*="${component}"], .${component.toLowerCase()}`
          return document.querySelector(componentSelector) !== null
        })

        const coverage = {
          components: detectedComponents.length,
          customization: this.assessCustomization(sig.name),
          theming: this.hasCustomTheming(sig.name)
        }

        return {
          evidence,
          confidence: Math.min(100, totalConfidence / evidence.length || 0),
          coverage
        }

        function assessCustomization(libraryName: string): number {
          // Look for custom CSS variables or overrides
          const rootStyle = getComputedStyle(document.documentElement)
          let customizations = 0

          for (let i = 0; i < rootStyle.length; i++) {
            const prop = rootStyle[i]
            if (prop.startsWith('--') && !prop.includes(libraryName.toLowerCase())) {
              customizations++
            }
          }

          return Math.min(100, customizations * 2)
        }

        function hasCustomTheming(libraryName: string): boolean {
          // Check for theme providers or custom theme configurations
          const themeSelectors = [
            '[data-theme]',
            '.theme-provider',
            '[class*="theme"]',
            '.dark',
            '.light'
          ]

          return themeSelectors.some(selector => document.querySelector(selector) !== null)
        }
      }, signature)

      if (analysis.confidence > 30) { // Minimum threshold
        detected.push({
          name: signature.name,
          type: signature.type,
          confidence: Math.round(analysis.confidence),
          evidence: analysis.evidence,
          coverage: analysis.coverage
        })
      }
    }

    // Analyze component patterns
    const patterns = await this.analyzeComponentPatterns(page)

    // Calculate overall completeness
    const completeness = detected.length > 0
      ? detected.reduce((sum, lib) => sum + lib.coverage.components, 0) / detected.length
      : 0

    return {
      detected: detected.sort((a, b) => b.confidence - a.confidence),
      customization: this.assessOverallCustomization(detected),
      patterns,
      completeness
    }
  }

  private async analyzeComponentPatterns(page: Page): Promise<ComponentPatterns> {
    const patterns = await page.evaluate(() => {
      const results = {
        buttons: {
          variants: [],
          states: [],
          sizes: [],
          consistency: 0
        },
        forms: {
          inputs: { baseStyles: {}, states: {}, validation: false, accessibility: 0 },
          labels: { strategy: 'above', consistency: 0 },
          validation: { inline: false, onSubmit: false, realTime: false, accessibility: false }
        },
        navigation: {
          structure: { type: 'horizontal', levels: 1, responsive: false },
          styling: { activeStates: false, hoverEffects: false, transitions: false },
          accessibility: { ariaNavigation: false, keyboardNavigation: false, focusManagement: false }
        },
        cards: {
          variants: [],
          content: { layouts: [], commonElements: [] },
          interactions: { hover: false, clickable: false, expandable: false }
        },
        feedback: {
          notifications: { toasts: false, banners: false, inline: false, positioning: 'top-right' },
          loading: { spinners: false, skeletons: false, progressBars: false, overlays: false },
          states: { success: false, error: false, warning: false, info: false }
        }
      }

      // Analyze button patterns
      const buttons = document.querySelectorAll('button, [role="button"], .btn, input[type="submit"]')
      const buttonVariants = new Map<string, any>()

      buttons.forEach(btn => {
        const computed = getComputedStyle(btn)
        const styleKey = `${computed.backgroundColor}-${computed.borderRadius}-${computed.padding}`

        if (!buttonVariants.has(styleKey)) {
          buttonVariants.set(styleKey, {
            styles: {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              borderRadius: computed.borderRadius,
              padding: computed.padding,
              fontSize: computed.fontSize
            },
            usage: 0,
            semantic: this.inferButtonSemantic(btn, computed)
          })
        }

        buttonVariants.get(styleKey)!.usage++
      })

      results.buttons.variants = Array.from(buttonVariants.values()).map((variant, index) => ({
        name: variant.semantic || `variant-${index + 1}`,
        styles: variant.styles,
        semantics: variant.semantic,
        usage: variant.usage
      }))

      // Analyze form patterns
      const inputs = document.querySelectorAll('input, textarea, select')
      if (inputs.length > 0) {
        const firstInput = inputs[0]
        const computed = getComputedStyle(firstInput)

        results.forms.inputs.baseStyles = {
          border: computed.border,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          backgroundColor: computed.backgroundColor
        }

        // Check validation patterns
        results.forms.validation.inline = document.querySelector('.error, .invalid, [aria-invalid="true"]') !== null
        results.forms.validation.accessibility = document.querySelector('[aria-describedby], [aria-errormessage]') !== null
      }

      // Analyze navigation patterns
      const navs = document.querySelectorAll('nav, .navbar, [role="navigation"]')
      if (navs.length > 0) {
        const primaryNav = navs[0]
        const computed = getComputedStyle(primaryNav)

        results.navigation.structure.type = computed.flexDirection === 'column' ? 'vertical' : 'horizontal'
        results.navigation.structure.responsive = computed.display === 'flex' || computed.display === 'grid'
        results.navigation.accessibility.ariaNavigation = primaryNav.hasAttribute('aria-label') || primaryNav.hasAttribute('aria-labelledby')
      }

      return results

      function inferButtonSemantic(btn: Element, computed: CSSStyleDeclaration): string {
        const classes = Array.from(btn.classList).join(' ').toLowerCase()
        const text = btn.textContent?.toLowerCase() || ''

        if (classes.includes('primary') || text.includes('get started') || text.includes('sign up')) return 'primary'
        if (classes.includes('secondary') || classes.includes('outline')) return 'secondary'
        if (classes.includes('danger') || classes.includes('delete') || text.includes('delete')) return 'destructive'
        if (classes.includes('ghost') || classes.includes('text')) return 'ghost'
        if (btn.tagName === 'A' || classes.includes('link')) return 'link'

        return 'primary'
      }
    })

    return patterns as ComponentPatterns
  }

  private async analyzeDesignLanguage(page: Page): Promise<DesignLanguage> {
    const designData = await page.evaluate(() => {
      const characteristics = {
        depth: 'flat' as const,
        corners: 'rounded' as const,
        shadows: 'subtle' as const,
        colors: 'colorful' as const,
        animation: 'subtle' as const
      }

      // Analyze depth through shadows and layering
      const shadowElements = document.querySelectorAll('*')
      let shadowCount = 0
      let prominentShadows = 0

      Array.from(shadowElements).slice(0, 100).forEach(el => {
        const computed = getComputedStyle(el)
        if (computed.boxShadow !== 'none') {
          shadowCount++
          if (computed.boxShadow.includes('10px') || computed.boxShadow.includes('20px')) {
            prominentShadows++
          }
        }
      })

      if (shadowCount === 0) characteristics.depth = 'flat'
      else if (prominentShadows > shadowCount * 0.3) characteristics.depth = 'deep'
      else characteristics.depth = 'layered'

      // Analyze corner styles
      const borderRadiusElements = Array.from(shadowElements).slice(0, 50)
      const roundedElements = borderRadiusElements.filter(el => {
        const computed = getComputedStyle(el)
        const radius = parseFloat(computed.borderRadius) || 0
        return radius > 8
      })

      if (roundedElements.length === 0) characteristics.corners = 'sharp'
      else if (roundedElements.some(el => parseFloat(getComputedStyle(el).borderRadius) > 20)) characteristics.corners = 'circular'
      else characteristics.corners = 'rounded'

      // Analyze color usage
      const colorVariety = new Set<string>()
      Array.from(shadowElements).slice(0, 100).forEach(el => {
        const computed = getComputedStyle(el)
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          colorVariety.add(computed.backgroundColor)
        }
      })

      if (colorVariety.size < 5) characteristics.colors = 'monochromatic'
      else if (colorVariety.size < 10) characteristics.colors = 'duotone'
      else characteristics.colors = 'colorful'

      // Determine overall style
      let style: DesignLanguage['style'] = 'custom'

      if (characteristics.depth === 'flat' && characteristics.corners === 'sharp') {
        style = 'flat'
      } else if (characteristics.corners === 'circular' && characteristics.shadows === 'subtle') {
        style = 'material'
      } else if (characteristics.depth === 'flat' && characteristics.colors === 'monochromatic') {
        style = 'minimalist'
      }

      return {
        style,
        characteristics,
        influences: [], // Would need more sophisticated analysis
        uniqueness: this.calculateUniqueness(characteristics)
      }

      function calculateUniqueness(chars: any): number {
        // Calculate how unique this design language is
        let uniqueness = 50

        // Uncommon combinations increase uniqueness
        if (chars.depth === 'deep' && chars.corners === 'sharp') uniqueness += 20
        if (chars.colors === 'monochromatic' && chars.shadows === 'prominent') uniqueness += 15
        if (chars.animation === 'expressive') uniqueness += 10

        return Math.min(100, uniqueness)
      }
    })

    return designData as DesignLanguage
  }

  private assessOverallCustomization(libraries: DetectedLibrary[]): CustomizationLevel {
    if (libraries.length === 0) {
      return {
        level: 'complete',
        areas: { theming: true, components: true, layout: true, interactions: true },
        overrides: [],
        brandAlignment: 100
      }
    }

    const avgCustomization = libraries.reduce((sum, lib) => sum + lib.coverage.customization, 0) / libraries.length

    let level: CustomizationLevel['level']
    if (avgCustomization < 10) level = 'none'
    else if (avgCustomization < 30) level = 'light'
    else if (avgCustomization < 60) level = 'moderate'
    else if (avgCustomization < 85) level = 'heavy'
    else level = 'complete'

    return {
      level,
      areas: {
        theming: libraries.some(lib => lib.coverage.theming),
        components: avgCustomization > 40,
        layout: avgCustomization > 60,
        interactions: avgCustomization > 80
      },
      overrides: [], // Would extract from CSS analysis
      brandAlignment: Math.round(avgCustomization)
    }
  }

  private assessBrandMaturity(
    identity: BrandIdentity,
    components: ComponentLibraryDetection,
    designLanguage: DesignLanguage
  ): BrandMaturity {
    const factors = {
      consistency: identity.consistency.overall,
      completeness: (identity.logo.elements.length > 0 ? 25 : 0) +
                   (identity.colors.primary.length > 0 ? 25 : 0) +
                   (identity.typography.families.length > 0 ? 25 : 0) +
                   (components.detected.length > 0 ? 25 : 0),
      accessibility: identity.colors.accessibility.contrastCompliance,
      scalability: components.completeness,
      innovation: designLanguage.uniqueness
    }

    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length

    let level: BrandMaturity['level']
    if (totalScore >= 90) level = 'systematic'
    else if (totalScore >= 75) level = 'mature'
    else if (totalScore >= 60) level = 'developing'
    else if (totalScore >= 40) level = 'basic'
    else level = 'inconsistent'

    const recommendations = this.generateBrandRecommendations(factors, { identity, components, designLanguage })

    return {
      level,
      score: Math.round(totalScore),
      factors: Object.fromEntries(
        Object.entries(factors).map(([key, value]) => [key, Math.round(value)])
      ) as any,
      recommendations
    }
  }

  private generateBrandRecommendations(
    factors: BrandMaturity['factors'],
    analysis: { identity: BrandIdentity; components: ComponentLibraryDetection; designLanguage: DesignLanguage }
  ): string[] {
    const recommendations: string[] = []

    if (factors.consistency < 70) {
      recommendations.push('Improve visual consistency across components and pages')
    }

    if (factors.completeness < 80) {
      recommendations.push('Develop a more comprehensive component library')
    }

    if (factors.accessibility < 70) {
      recommendations.push('Improve color contrast and accessibility compliance')
    }

    if (analysis.identity.logo.elements.length === 0) {
      recommendations.push('Add a consistent logo or brand mark')
    }

    if (analysis.components.detected.length === 0) {
      recommendations.push('Consider adopting a component library or design system')
    }

    if (factors.innovation < 50) {
      recommendations.push('Explore unique design elements to differentiate your brand')
    }

    return recommendations
  }
}

interface ComponentLibrarySignature {
  name: string
  type: 'react' | 'vue' | 'angular' | 'css' | 'design-system'
  signatures: {
    classPatterns?: RegExp[]
    domStructures?: string[]
    cssSignatures?: RegExp[]
  }
  components: string[]
}