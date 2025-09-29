import type { Page } from 'playwright'

export interface DesignSystemAnalysis {
  frameworks: DetectedFramework[]
  components: ComponentLibrary
  patterns: DesignPatterns
  designTokens: ExtractedDesignTokens
  semanticStructure: SemanticAnalysis
  maturity: DesignSystemMaturity
}

export interface DetectedFramework {
  name: string
  type: 'css' | 'component' | 'design-system'
  version?: string
  confidence: number
  evidence: FrameworkEvidence[]
  customization: CustomizationLevel
}

export interface FrameworkEvidence {
  type: 'class-pattern' | 'css-signature' | 'dom-structure' | 'script-tag' | 'custom-properties'
  description: string
  examples: string[]
  strength: number
}

export interface ComponentLibrary {
  buttons: ButtonAnalysis
  forms: FormAnalysis
  navigation: NavigationAnalysis
  layout: LayoutAnalysis
  feedback: FeedbackAnalysis
  data: DataDisplayAnalysis
}

export interface ButtonAnalysis {
  variants: Array<{
    name: string
    styles: ButtonStyles
    usage: number
    context: string[]
  }>
  states: Array<{
    state: 'hover' | 'focus' | 'active' | 'disabled'
    modifications: any
    hasTransition: boolean
  }>
  patterns: {
    primaryAction: ButtonStyles
    secondaryAction: ButtonStyles
    destructive?: ButtonStyles
    ghost?: ButtonStyles
  }
}

export interface ButtonStyles {
  backgroundColor: string
  color: string
  border: string
  borderRadius: string
  padding: string
  fontSize: string
  fontWeight: string
  transition: string
  boxShadow: string
}

export interface FormAnalysis {
  inputStyles: {
    base: any
    focus: any
    error: any
    disabled: any
  }
  validationPatterns: {
    inlineValidation: boolean
    errorStyling: any
    successStyling: any
  }
  labelStrategy: 'above' | 'inline' | 'floating' | 'hidden'
  accessibility: {
    hasLabels: boolean
    hasErrorMessages: boolean
    usesAriaInvalid: boolean
    keyboardNavigation: boolean
  }
}

export interface NavigationAnalysis {
  primary: {
    type: 'horizontal' | 'vertical' | 'hamburger' | 'sidebar'
    responsive: boolean
    styles: any
    items: number
  }
  secondary?: {
    type: string
    context: string
    styles: any
  }
  breadcrumbs: boolean
  pagination: {
    present: boolean
    style: 'numbered' | 'prev-next' | 'infinite-scroll'
  }
}

export interface LayoutAnalysis {
  grid: {
    system: 'css-grid' | 'flexbox' | 'float' | 'table' | 'hybrid'
    breakpoints: Array<{ width: number; columns: number }>
    containers: Array<{ maxWidth: string; padding: string; usage: number }>
  }
  spacing: {
    system: 'multiplicative' | 'additive' | 'arbitrary'
    base: number
    scale: number[]
    consistency: number
  }
  density: 'compact' | 'comfortable' | 'spacious'
}

export interface FeedbackAnalysis {
  notifications: {
    toasts: boolean
    banners: boolean
    modals: boolean
    styles: any
  }
  loading: {
    spinners: boolean
    skeletons: boolean
    progressBars: boolean
    styles: any
  }
  states: {
    empty: boolean
    error: boolean
    success: boolean
  }
}

export interface DataDisplayAnalysis {
  tables: {
    responsive: boolean
    sorting: boolean
    filtering: boolean
    styles: any
  }
  cards: {
    variants: Array<{ style: any; usage: number }>
    hasElevation: boolean
    responsiveBehavior: string
  }
  lists: {
    styled: boolean
    hasIcons: boolean
    hasDividers: boolean
  }
}

export interface DesignPatterns {
  colorSystem: ColorSystemAnalysis
  typographySystem: TypographySystemAnalysis
  motionSystem: MotionSystemAnalysis
  iconSystem: IconSystemAnalysis
}

export interface ColorSystemAnalysis {
  palette: {
    primary: string[]
    secondary: string[]
    neutral: string[]
    semantic: {
      success: string[]
      warning: string[]
      error: string[]
      info: string[]
    }
  }
  usage: {
    systematicUsage: boolean
    semanticConsistency: number
    contrastCompliance: number
  }
  derivation: {
    hasShades: boolean
    systematicShading: boolean
    alphaVariants: boolean
  }
}

export interface TypographySystemAnalysis {
  hierarchy: {
    levels: number
    consistent: boolean
    scaleRatio: number
  }
  families: Array<{
    family: string
    role: 'primary' | 'secondary' | 'monospace' | 'display'
    usage: number
    fallbacks: string[]
  }>
  weights: {
    available: number[]
    systematic: boolean
  }
  lineHeight: {
    systematic: boolean
    ratios: number[]
  }
}

export interface MotionSystemAnalysis {
  transitions: {
    systematic: boolean
    durations: string[]
    easings: string[]
    properties: string[]
  }
  animations: {
    keyframes: Array<{ name: string; definition: string }>
    systematic: boolean
  }
  microInteractions: {
    hover: boolean
    focus: boolean
    active: boolean
    loading: boolean
  }
}

export interface IconSystemAnalysis {
  type: 'font-icons' | 'svg-icons' | 'image-icons' | 'mixed'
  library?: string
  systematic: boolean
  sizes: string[]
  usage: number
}

export interface ExtractedDesignTokens {
  tokenFormat: 'css-variables' | 'sass-variables' | 'js-tokens' | 'style-dictionary' | 'none'
  organization: 'semantic' | 'categorical' | 'mixed' | 'none'
  namingConvention: 'kebab-case' | 'camelCase' | 'snake_case' | 'mixed'
  tokens: {
    colors: Array<{ name: string; value: string; category: string }>
    spacing: Array<{ name: string; value: string; usage: number }>
    typography: Array<{ name: string; value: string; property: string }>
    borders: Array<{ name: string; value: string; usage: number }>
    shadows: Array<{ name: string; value: string; usage: number }>
    motion: Array<{ name: string; value: string; property: string }>
  }
}

export interface SemanticAnalysis {
  htmlSemantics: {
    usesSemanticTags: boolean
    headingHierarchy: boolean
    landmarkRoles: number
    listStructure: boolean
  }
  cssArchitecture: {
    methodology: 'BEM' | 'OOCSS' | 'SMACSS' | 'Atomic' | 'Utility-First' | 'Mixed' | 'None'
    organization: 'component-based' | 'page-based' | 'utility-based' | 'mixed'
    scalability: number
  }
  designConsistency: {
    colorConsistency: number
    spacingConsistency: number
    typographyConsistency: number
    componentConsistency: number
  }
}

export interface DesignSystemMaturity {
  level: 'none' | 'basic' | 'intermediate' | 'advanced' | 'enterprise'
  score: number
  factors: {
    tokenization: number
    componentization: number
    documentation: number
    accessibility: number
    consistency: number
    scalability: number
  }
  recommendations: string[]
}

export interface CustomizationLevel {
  level: 'none' | 'light' | 'moderate' | 'heavy' | 'complete'
  customTheme: boolean
  brandAlignment: number
  overrides: string[]
}

export class DesignSystemDetector {
  private frameworkSignatures = new Map<string, FrameworkSignature>()

  constructor() {
    this.initializeFrameworkSignatures()
  }

  private initializeFrameworkSignatures() {
    // CSS Frameworks
    this.frameworkSignatures.set('tailwindcss', {
      name: 'Tailwind CSS',
      type: 'css',
      signatures: {
        classPatterns: [
          /\b(flex|grid|bg-|text-|p-|m-|w-|h-|space-|gap-|rounded-|shadow-)\w*/g,
          /\b(sm|md|lg|xl|2xl):/g,
          /\b(hover|focus|active|disabled):/g
        ],
        cssPatterns: [
          /@tailwind\s+(base|components|utilities)/,
          /@apply\s+/,
          /theme\(/
        ],
        customProperties: [
          /--tw-/
        ]
      },
      confidence: {
        classPatternWeight: 0.4,
        cssPatternWeight: 0.4,
        customPropsWeight: 0.2
      }
    })

    this.frameworkSignatures.set('bootstrap', {
      name: 'Bootstrap',
      type: 'css',
      signatures: {
        classPatterns: [
          /\b(container|row|col-|btn|navbar|card|modal|dropdown|nav|badge|alert|form-)/g,
          /\b(btn-(primary|secondary|success|danger|warning|info|light|dark))/g,
          /\b(text-(primary|secondary|success|danger|warning|info|light|dark|muted))/g
        ],
        cssPatterns: [
          /@import.*bootstrap/,
          /\.container\s*{/,
          /\$grid-breakpoints/,
          /\$spacer/
        ]
      },
      confidence: {
        classPatternWeight: 0.6,
        cssPatternWeight: 0.4
      }
    })

    // Component Libraries
    this.frameworkSignatures.set('mui', {
      name: 'Material-UI',
      type: 'component',
      signatures: {
        classPatterns: [
          /\bMui[A-Z]\w*/g,
          /\bmui-\w+/g,
          /\b(MuiButton|MuiTextField|MuiTypography|MuiCard|MuiPaper)/g
        ],
        domPatterns: [
          '[class*="MuiButton"]',
          '[class*="MuiTypography"]',
          '[class*="MuiPaper"]'
        ]
      },
      confidence: {
        classPatternWeight: 0.7,
        domPatternWeight: 0.3
      }
    })

    this.frameworkSignatures.set('antd', {
      name: 'Ant Design',
      type: 'component',
      signatures: {
        classPatterns: [
          /\bant-\w+/g,
          /\b(ant-btn|ant-input|ant-card|ant-table|ant-form)/g
        ],
        customProperties: [
          /--ant-/
        ]
      },
      confidence: {
        classPatternWeight: 0.8,
        customPropsWeight: 0.2
      }
    })

    this.frameworkSignatures.set('chakra', {
      name: 'Chakra UI',
      type: 'component',
      signatures: {
        classPatterns: [
          /\bchakra-\w+/g,
          /\bcss-\w{6,}/g // Emotion CSS classes
        ],
        customProperties: [
          /--chakra-/
        ]
      },
      confidence: {
        classPatternWeight: 0.6,
        customPropsWeight: 0.4
      }
    })
  }

  async analyzeDesignSystem(page: Page): Promise<DesignSystemAnalysis> {
    const [
      frameworks,
      components,
      patterns,
      tokens,
      semantics
    ] = await Promise.all([
      this.detectFrameworks(page),
      this.analyzeComponents(page),
      this.analyzeDesignPatterns(page),
      this.extractDesignTokens(page),
      this.analyzeSemanticStructure(page)
    ])

    const maturity = this.assessMaturity({
      frameworks,
      components,
      patterns,
      tokens,
      semantics
    })

    return {
      frameworks,
      components,
      patterns,
      designTokens: tokens,
      semanticStructure: semantics,
      maturity
    }
  }

  private async detectFrameworks(page: Page): Promise<DetectedFramework[]> {
    const detected: DetectedFramework[] = []

    const analysis = await page.evaluate(() => {
      const results = {
        classNames: Array.from(document.querySelectorAll('[class]'))
          .flatMap(el => Array.from(el.classList))
          .join(' '),
        cssContent: '',
        customProperties: [],
        scripts: Array.from(document.querySelectorAll('script[src]'))
          .map(script => script.getAttribute('src'))
          .filter(Boolean),
        domStructures: {
          hasMuiRoot: document.querySelector('.MuiThemeProvider, #__next, [data-mui-theme]') !== null,
          hasChakraProvider: document.querySelector('[data-theme], .chakra-ui-light, .chakra-ui-dark') !== null,
          hasAntdConfig: document.querySelector('[class*="ant-"], .ant-design-pro') !== null
        }
      }

      // Extract CSS content from stylesheets
      try {
        Array.from(document.styleSheets).forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || [])
            rules.forEach(rule => {
              results.cssContent += rule.cssText + '\n'
            })
          } catch (e) {
            // Cross-origin restrictions
          }
        })
      } catch (e) {
        console.warn('CSS content extraction failed')
      }

      // Extract custom properties
      const rootStyles = getComputedStyle(document.documentElement)
      for (let i = 0; i < rootStyles.length; i++) {
        const prop = rootStyles[i]
        if (prop.startsWith('--')) {
          results.customProperties.push(prop)
        }
      }

      return results
    })

    // Analyze each framework signature
    for (const [key, signature] of this.frameworkSignatures.entries()) {
      const evidence: FrameworkEvidence[] = []
      let totalConfidence = 0
      let weightSum = 0

      // Check class patterns
      if (signature.signatures.classPatterns) {
        const classMatches = signature.signatures.classPatterns.flatMap(pattern => {
          const matches = analysis.classNames.match(pattern) || []
          return matches
        })

        if (classMatches.length > 0) {
          const strength = Math.min(100, classMatches.length * 5)
          evidence.push({
            type: 'class-pattern',
            description: `Found ${classMatches.length} class pattern matches`,
            examples: classMatches.slice(0, 5),
            strength
          })

          totalConfidence += strength * (signature.confidence.classPatternWeight || 0.5)
          weightSum += signature.confidence.classPatternWeight || 0.5
        }
      }

      // Check CSS patterns
      if (signature.signatures.cssPatterns) {
        const cssMatches = signature.signatures.cssPatterns.filter(pattern =>
          pattern.test(analysis.cssContent)
        )

        if (cssMatches.length > 0) {
          const strength = Math.min(100, cssMatches.length * 20)
          evidence.push({
            type: 'css-signature',
            description: `Found ${cssMatches.length} CSS signature matches`,
            examples: cssMatches.map(p => p.source).slice(0, 3),
            strength
          })

          totalConfidence += strength * (signature.confidence.cssPatternWeight || 0.3)
          weightSum += signature.confidence.cssPatternWeight || 0.3
        }
      }

      // Check custom properties
      if (signature.signatures.customProperties) {
        const propMatches = signature.signatures.customProperties.flatMap(pattern => {
          return analysis.customProperties.filter(prop =>
            pattern.test(prop)
          )
        })

        if (propMatches.length > 0) {
          const strength = Math.min(100, propMatches.length * 10)
          evidence.push({
            type: 'custom-properties',
            description: `Found ${propMatches.length} custom property matches`,
            examples: propMatches.slice(0, 3),
            strength
          })

          totalConfidence += strength * (signature.confidence.customPropsWeight || 0.2)
          weightSum += signature.confidence.customPropsWeight || 0.2
        }
      }

      // Check DOM structures
      if (signature.signatures.domPatterns) {
        const domMatches = await page.evaluate((patterns) => {
          return patterns.filter(pattern => document.querySelector(pattern) !== null)
        }, signature.signatures.domPatterns)

        if (domMatches.length > 0) {
          const strength = Math.min(100, domMatches.length * 30)
          evidence.push({
            type: 'dom-structure',
            description: `Found ${domMatches.length} DOM structure matches`,
            examples: domMatches,
            strength
          })

          totalConfidence += strength * 0.4
          weightSum += 0.4
        }
      }

      // Calculate final confidence
      const finalConfidence = weightSum > 0 ? totalConfidence / weightSum : 0

      if (finalConfidence > 20 && evidence.length > 0) { // Minimum threshold
        detected.push({
          name: signature.name,
          type: signature.type,
          confidence: Math.round(finalConfidence),
          evidence,
          customization: await this.assessCustomization(page, key, signature)
        })
      }
    }

    return detected.sort((a, b) => b.confidence - a.confidence)
  }

  private async analyzeComponents(page: Page): Promise<ComponentLibrary> {
    const componentData = await page.evaluate(() => {
      const analysis = {
        buttons: { variants: [], states: [], patterns: {} },
        forms: { inputStyles: {}, validationPatterns: {}, labelStrategy: 'above', accessibility: {} },
        navigation: { primary: {}, secondary: undefined, breadcrumbs: false, pagination: {} },
        layout: { grid: {}, spacing: {}, density: 'comfortable' },
        feedback: { notifications: {}, loading: {}, states: {} },
        data: { tables: {}, cards: {}, lists: {} }
      }

      // Analyze buttons comprehensively
      const buttons = document.querySelectorAll('button, [role="button"], .btn, input[type="submit"], input[type="button"]')
      const buttonVariants = new Map<string, any>()

      buttons.forEach((btn, index) => {
        if (index > 50) return // Performance limit

        const computed = getComputedStyle(btn)
        const classes = Array.from(btn.classList).join(' ')

        const buttonStyle = {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          border: computed.border,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          transition: computed.transition,
          boxShadow: computed.boxShadow,
          textTransform: computed.textTransform
        }

        // Group similar buttons
        const styleKey = JSON.stringify(buttonStyle)
        if (!buttonVariants.has(styleKey)) {
          buttonVariants.set(styleKey, {
            style: buttonStyle,
            usage: 0,
            contexts: [],
            classes: new Set()
          })
        }

        const variant = buttonVariants.get(styleKey)!
        variant.usage++
        variant.classes.add(classes)

        // Determine context
        const parent = btn.closest('header, nav, main, footer, form, .hero, .cta')
        if (parent) {
          variant.contexts.push(parent.tagName.toLowerCase())
        }
      })

      // Convert to analysis format
      Array.from(buttonVariants.entries()).forEach(([styleKey, data], index) => {
        const isPrimary = data.usage > 3 && (
          data.style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          data.style.backgroundColor !== 'transparent'
        )

        analysis.buttons.variants.push({
          name: isPrimary ? 'primary' : `variant-${index + 1}`,
          styles: data.style,
          usage: data.usage,
          context: Array.from(new Set(data.contexts))
        })
      })

      // Analyze form inputs
      const inputs = document.querySelectorAll('input, textarea, select')
      if (inputs.length > 0) {
        const firstInput = inputs[0]
        const computed = getComputedStyle(firstInput)

        analysis.forms.inputStyles.base = {
          border: computed.border,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          fontSize: computed.fontSize,
          backgroundColor: computed.backgroundColor
        }

        // Check for focus styles (simplified)
        analysis.forms.inputStyles.focus = {
          hasFocusStyles: computed.outline !== 'none' || computed.boxShadow !== 'none'
        }

        // Check validation patterns
        const hasErrorInputs = document.querySelector('input[aria-invalid="true"], .error input, .invalid input') !== null
        analysis.forms.validationPatterns.inlineValidation = hasErrorInputs

        // Check label strategy
        const labels = document.querySelectorAll('label')
        const inputsWithLabels = Array.from(inputs).filter(input => {
          const id = input.getAttribute('id')
          return id && document.querySelector(`label[for="${id}"]`)
        })

        analysis.forms.accessibility.hasLabels = inputsWithLabels.length / inputs.length > 0.8
      }

      // Analyze navigation
      const navElements = document.querySelectorAll('nav, [role="navigation"], .navbar, .nav-menu')
      if (navElements.length > 0) {
        const primaryNav = navElements[0]
        const computed = getComputedStyle(primaryNav)
        const links = primaryNav.querySelectorAll('a, [role="link"]')

        analysis.navigation.primary = {
          type: computed.flexDirection === 'column' ? 'vertical' : 'horizontal',
          responsive: computed.display === 'flex' || computed.display === 'grid',
          styles: {
            backgroundColor: computed.backgroundColor,
            padding: computed.padding,
            borderBottom: computed.borderBottom
          },
          items: links.length
        }

        // Check for breadcrumbs
        analysis.navigation.breadcrumbs = document.querySelector('.breadcrumb, [aria-label*="breadcrumb"]') !== null
      }

      // Analyze layout grid system
      const gridElements = document.querySelectorAll('[style*="grid"], .grid, [class*="grid"]')
      const flexElements = document.querySelectorAll('[style*="flex"], .flex, [class*="flex"]')

      analysis.layout.grid = {
        system: gridElements.length > flexElements.length ? 'css-grid' : 'flexbox',
        breakpoints: [], // Would need media query analysis
        containers: this.analyzeContainers()
      }

      // Analyze spacing system
      const spacingValues = new Set<number>()
      Array.from(document.querySelectorAll('*')).slice(0, 200).forEach(el => {
        const computed = getComputedStyle(el)
        const margin = this.parseSpacing(computed.margin)
        const padding = this.parseSpacing(computed.padding)

        margin.forEach(m => spacingValues.add(m))
        padding.forEach(p => spacingValues.add(p))
      })

      const spacingArray = Array.from(spacingValues).filter(v => v > 0).sort((a, b) => a - b)
      analysis.layout.spacing = {
        system: this.detectSpacingSystem(spacingArray),
        base: this.detectSpacingBase(spacingArray),
        scale: spacingArray.slice(0, 10),
        consistency: this.calculateSpacingConsistency(spacingArray)
      }

      return analysis

      // Helper functions
      function analyzeContainers() {
        const containers = document.querySelectorAll('.container, [class*="container"], main, .content, .wrapper')
        const containerData: any[] = []

        containers.forEach(container => {
          const computed = getComputedStyle(container)
          containerData.push({
            maxWidth: computed.maxWidth,
            padding: computed.padding,
            margin: computed.margin,
            usage: 1
          })
        })

        return containerData
      }
    })

    // Add helper methods to the browser context
    const helpers = await page.evaluate(() => {
      return {
        parseSpacing: (spacing: string): number[] => {
          return spacing.split(' ')
            .map(s => parseFloat(s))
            .filter(n => !isNaN(n) && n > 0)
        },

        detectSpacingSystem: (values: number[]): 'multiplicative' | 'additive' | 'arbitrary' => {
          if (values.length < 3) return 'arbitrary'

          // Check for multiplicative pattern (each value is multiple of base)
          const base = values[0]
          const isMultiplicative = values.every(v => v % base === 0)

          if (isMultiplicative) return 'multiplicative'

          // Check for additive pattern (consistent increments)
          const increments = values.slice(1).map((v, i) => v - values[i])
          const avgIncrement = increments.reduce((sum, inc) => sum + inc, 0) / increments.length
          const isAdditive = increments.every(inc => Math.abs(inc - avgIncrement) < avgIncrement * 0.2)

          return isAdditive ? 'additive' : 'arbitrary'
        },

        detectSpacingBase: (values: number[]): number => {
          const commonBases = [4, 8, 16]
          let bestBase = 8
          let bestScore = 0

          commonBases.forEach(base => {
            const score = values.filter(v => v % base === 0).length / values.length
            if (score > bestScore) {
              bestScore = score
              bestBase = base
            }
          })

          return bestBase
        },

        calculateSpacingConsistency: (values: number[]): number => {
          if (values.length < 2) return 0

          const base = values[0]
          const consistent = values.filter(v => v % base === 0).length
          return (consistent / values.length) * 100
        }
      }
    })

    return componentData as ComponentLibrary
  }

  private async analyzeDesignPatterns(page: Page): Promise<DesignPatterns> {
    const patterns = await page.evaluate(() => {
      const results = {
        colorSystem: {
          palette: { primary: [], secondary: [], neutral: [], semantic: {} },
          usage: { systematicUsage: false, semanticConsistency: 0, contrastCompliance: 0 },
          derivation: { hasShades: false, systematicShading: false, alphaVariants: false }
        },
        typographySystem: {
          hierarchy: { levels: 0, consistent: false, scaleRatio: 0 },
          families: [],
          weights: { available: [], systematic: false },
          lineHeight: { systematic: false, ratios: [] }
        },
        motionSystem: {
          transitions: { systematic: false, durations: [], easings: [], properties: [] },
          animations: { keyframes: [], systematic: false },
          microInteractions: { hover: false, focus: false, active: false, loading: false }
        },
        iconSystem: {
          type: 'mixed' as const,
          systematic: false,
          sizes: [],
          usage: 0
        }
      }

      // Analyze color system
      const colorMap = new Map<string, number>()
      const semanticColors = {
        success: new Set<string>(),
        warning: new Set<string>(),
        error: new Set<string>(),
        info: new Set<string>()
      }

      Array.from(document.querySelectorAll('*')).slice(0, 500).forEach(el => {
        const computed = getComputedStyle(el)
        const bgColor = computed.backgroundColor
        const color = computed.color

        // Track color usage
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          colorMap.set(bgColor, (colorMap.get(bgColor) || 0) + 1)
        }
        if (color && color !== 'rgba(0, 0, 0, 0)') {
          colorMap.set(color, (colorMap.get(color) || 0) + 1)
        }

        // Detect semantic color usage
        const classes = Array.from(el.classList).join(' ')
        if (classes.includes('success') || classes.includes('green')) {
          if (bgColor) semanticColors.success.add(bgColor)
          if (color) semanticColors.success.add(color)
        }
        if (classes.includes('warning') || classes.includes('yellow')) {
          if (bgColor) semanticColors.warning.add(bgColor)
          if (color) semanticColors.warning.add(color)
        }
        if (classes.includes('error') || classes.includes('danger') || classes.includes('red')) {
          if (bgColor) semanticColors.error.add(bgColor)
          if (color) semanticColors.error.add(color)
        }
        if (classes.includes('info') || classes.includes('blue')) {
          if (bgColor) semanticColors.info.add(bgColor)
          if (color) semanticColors.info.add(color)
        }
      })

      // Process color analysis
      const sortedColors = Array.from(colorMap.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)

      results.colorSystem.palette.primary = sortedColors.slice(0, 3).map(([color]) => color)
      results.colorSystem.palette.semantic = {
        success: Array.from(semanticColors.success),
        warning: Array.from(semanticColors.warning),
        error: Array.from(semanticColors.error),
        info: Array.from(semanticColors.info)
      }

      // Analyze typography system
      const fontFamilies = new Map<string, number>()
      const fontSizes = new Map<string, number>()
      const fontWeights = new Map<string, number>()

      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      headings.forEach(heading => {
        const computed = getComputedStyle(heading)

        fontFamilies.set(computed.fontFamily, (fontFamilies.get(computed.fontFamily) || 0) + 1)
        fontSizes.set(computed.fontSize, (fontSizes.get(computed.fontSize) || 0) + 1)
        fontWeights.set(computed.fontWeight, (fontWeights.get(computed.fontWeight) || 0) + 1)
      })

      results.typographySystem.hierarchy.levels = headings.length
      results.typographySystem.families = Array.from(fontFamilies.entries()).map(([family, usage]) => ({
        family,
        role: 'primary' as const,
        usage,
        fallbacks: family.split(',').map(f => f.trim())
      }))

      // Analyze motion system
      const elementsWithTransitions = document.querySelectorAll('[style*="transition"], .transition, [class*="transition"]')
      const hasHoverEffects = document.querySelector(':hover') !== null // Simplified

      results.motionSystem.microInteractions = {
        hover: hasHoverEffects || elementsWithTransitions.length > 0,
        focus: document.querySelector(':focus-visible') !== null,
        active: true, // Assume present
        loading: document.querySelector('.loading, .spinner, [class*="loading"]') !== null
      }

      // Analyze icon system
      const svgIcons = document.querySelectorAll('svg')
      const iconFonts = document.querySelectorAll('[class*="icon"], i[class*="fa"]')

      results.iconSystem = {
        type: svgIcons.length > iconFonts.length ? 'svg-icons' : 'font-icons',
        systematic: svgIcons.length > 5 || iconFonts.length > 5,
        sizes: Array.from(new Set(Array.from(svgIcons).map(svg => {
          const computed = getComputedStyle(svg)
          return computed.width
        }))),
        usage: svgIcons.length + iconFonts.length
      }

      return results
    })

    return componentData as ComponentLibrary
  }

  private async extractDesignTokens(page: Page): Promise<ExtractedDesignTokens> {
    const tokenData = await page.evaluate(() => {
      const results = {
        tokenFormat: 'none' as const,
        organization: 'none' as const,
        namingConvention: 'mixed' as const,
        tokens: {
          colors: [] as any[],
          spacing: [] as any[],
          typography: [] as any[],
          borders: [] as any[],
          shadows: [] as any[],
          motion: [] as any[]
        }
      }

      // Detect token format
      const customProps = Array.from(document.querySelectorAll('[style*="--"]'))
      const rootStyle = getComputedStyle(document.documentElement)

      const cssVariables = []
      for (let i = 0; i < rootStyle.length; i++) {
        const prop = rootStyle[i]
        if (prop.startsWith('--')) {
          cssVariables.push({
            name: prop,
            value: rootStyle.getPropertyValue(prop).trim()
          })
        }
      }

      if (cssVariables.length > 0) {
        results.tokenFormat = 'css-variables'

        // Analyze naming conventions
        const kebabCase = cssVariables.filter(v => v.name.includes('-')).length
        const camelCase = cssVariables.filter(v => /[A-Z]/.test(v.name)).length

        results.namingConvention = kebabCase > camelCase ? 'kebab-case' : 'camelCase'

        // Categorize tokens
        cssVariables.forEach(variable => {
          const name = variable.name
          const value = variable.value

          if (name.includes('color') || name.includes('bg') || name.includes('text')) {
            results.tokens.colors.push({
              name,
              value,
              category: this.categorizeColorToken(name)
            })
          } else if (name.includes('space') || name.includes('gap') || name.includes('margin') || name.includes('padding')) {
            results.tokens.spacing.push({
              name,
              value,
              usage: 1 // Would need more analysis
            })
          } else if (name.includes('font') || name.includes('text') || name.includes('size')) {
            results.tokens.typography.push({
              name,
              value,
              property: name.includes('family') ? 'font-family' : name.includes('size') ? 'font-size' : 'other'
            })
          }
        })

        // Determine organization
        const hasSemanticNames = cssVariables.some(v =>
          v.name.includes('primary') || v.name.includes('secondary') || v.name.includes('accent')
        )
        results.organization = hasSemanticNames ? 'semantic' : 'categorical'
      }

      return results

      function categorizeColorToken(name: string): string {
        if (name.includes('primary') || name.includes('brand')) return 'primary'
        if (name.includes('secondary')) return 'secondary'
        if (name.includes('success') || name.includes('green')) return 'success'
        if (name.includes('warning') || name.includes('yellow')) return 'warning'
        if (name.includes('error') || name.includes('danger') || name.includes('red')) return 'error'
        if (name.includes('info') || name.includes('blue')) return 'info'
        if (name.includes('neutral') || name.includes('gray') || name.includes('grey')) return 'neutral'
        return 'other'
      }
    })

    return tokenData as ExtractedDesignTokens
  }

  private async analyzeSemanticStructure(page: Page): Promise<SemanticAnalysis> {
    const semanticData = await page.evaluate(() => {
      const results = {
        htmlSemantics: {
          usesSemanticTags: false,
          headingHierarchy: false,
          landmarkRoles: 0,
          listStructure: false
        },
        cssArchitecture: {
          methodology: 'None' as const,
          organization: 'mixed' as const,
          scalability: 0
        },
        designConsistency: {
          colorConsistency: 0,
          spacingConsistency: 0,
          typographyConsistency: 0,
          componentConsistency: 0
        }
      }

      // Analyze HTML semantics
      const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer']
      const usedSemanticTags = semanticTags.filter(tag => document.querySelector(tag))
      results.htmlSemantics.usesSemanticTags = usedSemanticTags.length >= 3

      // Check heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)))
      let validHierarchy = true

      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] > headingLevels[i-1] + 1) {
          validHierarchy = false
          break
        }
      }

      results.htmlSemantics.headingHierarchy = validHierarchy

      // Count landmark roles
      results.htmlSemantics.landmarkRoles = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]').length

      // Check list structure
      results.htmlSemantics.listStructure = document.querySelectorAll('ul, ol').length > 0

      // Analyze CSS architecture
      const allClasses = Array.from(document.querySelectorAll('[class]'))
        .flatMap(el => Array.from(el.classList))

      // Detect BEM pattern
      const bemPattern = /^[a-z]+(__[a-z]+)?(--[a-z]+)?$/
      const bemClasses = allClasses.filter(cls => bemPattern.test(cls))

      // Detect utility-first (Tailwind-like)
      const utilityPattern = /^(bg-|text-|p-|m-|w-|h-|flex|grid)/
      const utilityClasses = allClasses.filter(cls => utilityPattern.test(cls))

      if (bemClasses.length > allClasses.length * 0.3) {
        results.cssArchitecture.methodology = 'BEM'
      } else if (utilityClasses.length > allClasses.length * 0.3) {
        results.cssArchitecture.methodology = 'Utility-First'
      } else {
        results.cssArchitecture.methodology = 'Mixed'
      }

      return results
    })

    return semanticData as SemanticAnalysis
  }

  private async assessCustomization(
    page: Page,
    frameworkKey: string,
    signature: FrameworkSignature
  ): Promise<CustomizationLevel> {
    const customization = await page.evaluate((fwKey) => {
      const results = {
        level: 'none' as const,
        customTheme: false,
        brandAlignment: 0,
        overrides: [] as string[]
      }

      // Check for custom CSS variables that override framework defaults
      const rootStyle = getComputedStyle(document.documentElement)
      const customProps = []

      for (let i = 0; i < rootStyle.length; i++) {
        const prop = rootStyle[i]
        if (prop.startsWith('--') && !prop.includes(fwKey)) {
          customProps.push(prop)
        }
      }

      results.customTheme = customProps.length > 10

      // Detect brand-specific customizations
      const brandIndicators = ['brand', 'primary', 'accent', 'theme']
      const brandCustomizations = customProps.filter(prop =>
        brandIndicators.some(indicator => prop.includes(indicator))
      )

      results.brandAlignment = (brandCustomizations.length / Math.max(customProps.length, 1)) * 100

      // Determine customization level
      if (customProps.length === 0) {
        results.level = 'none'
      } else if (customProps.length < 5) {
        results.level = 'light'
      } else if (customProps.length < 20) {
        results.level = 'moderate'
      } else if (customProps.length < 50) {
        results.level = 'heavy'
      } else {
        results.level = 'complete'
      }

      return results
    }, frameworkKey)

    return customization as CustomizationLevel
  }

  private assessMaturity(analysis: {
    frameworks: DetectedFramework[]
    components: ComponentLibrary
    patterns: DesignPatterns
    tokens: ExtractedDesignTokens
    semantics: SemanticAnalysis
  }): DesignSystemMaturity {
    const factors = {
      tokenization: this.scoreTokenization(analysis.tokens),
      componentization: this.scoreComponentization(analysis.components),
      documentation: 50, // Would need to scan for design system docs
      accessibility: this.scoreAccessibility(analysis.semantics),
      consistency: this.scoreConsistency(analysis.patterns),
      scalability: this.scoreScalability(analysis.semantics.cssArchitecture)
    }

    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length

    let level: DesignSystemMaturity['level']
    if (totalScore >= 90) level = 'enterprise'
    else if (totalScore >= 75) level = 'advanced'
    else if (totalScore >= 60) level = 'intermediate'
    else if (totalScore >= 40) level = 'basic'
    else level = 'none'

    const recommendations = this.generateRecommendations(factors, analysis)

    return {
      level,
      score: Math.round(totalScore),
      factors: Object.fromEntries(
        Object.entries(factors).map(([key, value]) => [key, Math.round(value)])
      ) as any,
      recommendations
    }
  }

  private scoreTokenization(tokens: ExtractedDesignTokens): number {
    let score = 0

    if (tokens.tokenFormat !== 'none') score += 30
    if (tokens.organization === 'semantic') score += 25
    if (tokens.namingConvention !== 'mixed') score += 15

    const tokenCount = Object.values(tokens.tokens).reduce((sum, arr) => sum + arr.length, 0)
    score += Math.min(30, tokenCount * 2) // Up to 30 points for token coverage

    return Math.min(100, score)
  }

  private scoreComponentization(components: ComponentLibrary): number {
    let score = 0

    if (components.buttons.variants.length > 1) score += 20
    if (components.forms.accessibility.hasLabels) score += 20
    if (components.navigation.primary.responsive) score += 15
    if (components.layout.spacing.consistency > 70) score += 25
    if (components.feedback.loading.spinners || components.feedback.loading.skeletons) score += 10
    if (components.data.cards.variants.length > 0) score += 10

    return Math.min(100, score)
  }

  private scoreAccessibility(semantics: SemanticAnalysis): number {
    let score = 0

    if (semantics.htmlSemantics.usesSemanticTags) score += 25
    if (semantics.htmlSemantics.headingHierarchy) score += 25
    if (semantics.htmlSemantics.landmarkRoles > 2) score += 20
    if (semantics.htmlSemantics.listStructure) score += 15

    return Math.min(100, score)
  }

  private scoreConsistency(patterns: DesignPatterns): number {
    let score = 0

    if (patterns.colorSystem.usage.systematicUsage) score += 30
    if (patterns.typographySystem.hierarchy.consistent) score += 25
    if (patterns.motionSystem.transitions.systematic) score += 20
    if (patterns.iconSystem.systematic) score += 15

    return Math.min(100, score)
  }

  private scoreScalability(cssArch: SemanticAnalysis['cssArchitecture']): number {
    const methodologyScores = {
      'BEM': 90,
      'Atomic': 85,
      'OOCSS': 75,
      'SMACSS': 75,
      'Utility-First': 80,
      'Mixed': 50,
      'None': 20
    }

    return methodologyScores[cssArch.methodology] || 20
  }

  private generateRecommendations(
    factors: DesignSystemMaturity['factors'],
    analysis: any
  ): string[] {
    const recommendations: string[] = []

    if (factors.tokenization < 60) {
      recommendations.push('Implement CSS custom properties for design tokens')
    }

    if (factors.componentization < 60) {
      recommendations.push('Standardize component variants and states')
    }

    if (factors.accessibility < 70) {
      recommendations.push('Improve semantic HTML structure and ARIA usage')
    }

    if (factors.consistency < 70) {
      recommendations.push('Establish consistent design patterns across components')
    }

    if (factors.scalability < 60) {
      recommendations.push('Adopt a CSS methodology like BEM or utility-first approach')
    }

    return recommendations
  }
}

interface FrameworkSignature {
  name: string
  type: 'css' | 'component' | 'design-system'
  signatures: {
    classPatterns?: RegExp[]
    cssPatterns?: RegExp[]
    customProperties?: RegExp[]
    domPatterns?: string[]
    scriptPatterns?: RegExp[]
  }
  confidence: {
    classPatternWeight?: number
    cssPatternWeight?: number
    customPropsWeight?: number
    domPatternWeight?: number
    scriptPatternWeight?: number
  }
}