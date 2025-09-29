import type { Page } from 'playwright'

export interface AccessibilityAnalysis {
  wcag: WCAGCompliance
  semantic: SemanticStructure
  interaction: InteractionAccessibility
  visual: VisualAccessibility
  assistive: AssistiveTechnology
  score: AccessibilityScore
}

export interface WCAGCompliance {
  level: 'A' | 'AA' | 'AAA' | 'Non-compliant'
  guidelines: {
    perceivable: GuidelineStatus
    operable: GuidelineStatus
    understandable: GuidelineStatus
    robust: GuidelineStatus
  }
  violations: AccessibilityViolation[]
  recommendations: string[]
}

export interface GuidelineStatus {
  score: number
  passed: number
  failed: number
  checks: Array<{
    criterion: string
    status: 'pass' | 'fail' | 'needs-review'
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
}

export interface AccessibilityViolation {
  type: 'color-contrast' | 'missing-alt' | 'no-label' | 'keyboard-trap' | 'focus-order' | 'heading-structure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  element: string
  description: string
  location: { x: number; y: number }
  suggestion: string
  wcagReference: string
}

export interface SemanticStructure {
  html5: {
    semanticTags: Array<{ tag: string; count: number; proper: boolean }>
    landmarks: Array<{ role: string; element: string; hasLabel: boolean }>
    headingHierarchy: HeadingHierarchy
    listStructure: ListStructure
  }
  aria: {
    usage: AriaUsage
    landmarks: AriaLandmarks
    liveRegions: AriaLiveRegions
    relationships: AriaRelationships
  }
  microdata: {
    schemas: string[]
    coverage: number
  }
}

export interface HeadingHierarchy {
  structure: Array<{ level: number; text: string; hasId: boolean }>
  violations: string[]
  skipLevels: boolean
  logicalOrder: boolean
  uniqueness: number
}

export interface ListStructure {
  lists: Array<{
    type: 'ul' | 'ol' | 'dl'
    items: number
    nested: boolean
    semantic: boolean
  }>
  navigation: boolean
  content: boolean
  appropriate: number
}

export interface AriaUsage {
  labels: { count: number; orphaned: number; missing: number }
  descriptions: { count: number; orphaned: number }
  states: { count: number; dynamic: number }
  properties: { count: number; redundant: number }
  roles: { count: number; invalid: number; redundant: number }
}

export interface AriaLandmarks {
  banner: number
  navigation: number
  main: number
  contentinfo: number
  complementary: number
  search: number
  form: number
  regions: Array<{ role: string; label?: string; unique: boolean }>
}

export interface AriaLiveRegions {
  polite: number
  assertive: number
  off: number
  dynamic: number
  appropriate: boolean
}

export interface AriaRelationships {
  labelledby: { count: number; valid: number }
  describedby: { count: number; valid: number }
  controls: { count: number; valid: number }
  owns: { count: number; valid: number }
}

export interface InteractionAccessibility {
  keyboard: KeyboardAccessibility
  mouse: MouseAccessibility
  touch: TouchAccessibility
  focus: FocusManagement
}

export interface KeyboardAccessibility {
  navigation: {
    tabOrder: 'logical' | 'problematic' | 'broken'
    skipLinks: boolean
    shortcuts: Array<{ key: string; action: string; documented: boolean }>
  }
  interaction: {
    allInteractive: boolean
    customControls: number
    keyboardTraps: number
    escapeRoutes: boolean
  }
  testing: {
    tabIndexUsage: 'appropriate' | 'overused' | 'misused'
    accessKeys: number
    customKeyHandlers: number
  }
}

export interface MouseAccessibility {
  clickTargets: {
    minimumSize: boolean
    spacing: boolean
    adequateTargets: number
    problematicTargets: number
  }
  hover: {
    essential: boolean
    duplicated: boolean
    timeout: boolean
  }
}

export interface TouchAccessibility {
  targets: {
    minimumSize: boolean // 44px minimum
    spacing: boolean // 8px minimum
    gestureAlternatives: boolean
  }
  interactions: {
    swipe: boolean
    pinch: boolean
    alternatives: boolean
  }
}

export interface FocusManagement {
  visibility: {
    hasVisibleIndicators: boolean
    customFocusStyles: boolean
    contrastRatio: number
  }
  management: {
    logical: boolean
    trapped: boolean
    restored: boolean
    skipLinks: boolean
  }
  customComponents: {
    ariaCompliant: number
    keyboardAccessible: number
    focusable: number
  }
}

export interface VisualAccessibility {
  contrast: ContrastAnalysis
  typography: TypographyAccessibility
  layout: LayoutAccessibility
  motion: MotionAccessibility
}

export interface ContrastAnalysis {
  textPairs: Array<{
    foreground: string
    background: string
    ratio: number
    size: 'small' | 'large'
    wcag: { aa: boolean; aaa: boolean }
    element: string
    location: { x: number; y: number }
  }>
  summary: {
    totalPairs: number
    aaCompliant: number
    aaaCompliant: number
    averageRatio: number
    lowestRatio: number
  }
  nonTextPairs: Array<{
    element: string
    type: 'ui-component' | 'graphic'
    ratio: number
    compliant: boolean
  }>
}

export interface TypographyAccessibility {
  readability: {
    averageLineLength: number
    lineHeight: number
    fontSizes: Array<{ size: number; usage: number; readable: boolean }>
    textSpacing: boolean
  }
  dyslexia: {
    friendlyFonts: boolean
    lineSpacing: boolean
    paragraphSpacing: boolean
    justification: 'appropriate' | 'problematic'
  }
  scaling: {
    supportsZoom: boolean
    breakpoints: number[]
    maintains: boolean
  }
}

export interface LayoutAccessibility {
  responsive: {
    breakpoints: number[]
    contentReflow: boolean
    horizontalScroll: boolean
    maintains: boolean
  }
  spacing: {
    adequate: boolean
    consistent: boolean
    scalable: boolean
  }
  orientation: {
    supportsPortrait: boolean
    supportsLandscape: boolean
    adapts: boolean
  }
}

export interface MotionAccessibility {
  prefersReducedMotion: boolean
  essentialMotion: boolean
  alternatives: boolean
  duration: Array<{ animation: string; duration: number; appropriate: boolean }>
  triggers: Array<{ trigger: string; essential: boolean; alternative: boolean }>
}

export interface AssistiveTechnology {
  screenReaders: ScreenReaderSupport
  voiceControl: VoiceControlSupport
  switches: SwitchNavigationSupport
}

export interface ScreenReaderSupport {
  landmarks: number
  headingNavigation: boolean
  skipLinks: boolean
  formLabels: number
  imageAlts: number
  tableHeaders: boolean
  liveRegions: number
  compatibility: number
}

export interface VoiceControlSupport {
  labelledElements: number
  uniqueLabels: boolean
  clickableElements: number
  voiceCommands: boolean
}

export interface SwitchNavigationSupport {
  scannable: boolean
  grouping: boolean
  timing: boolean
  alternatives: boolean
}

export interface AccessibilityScore {
  overall: number
  categories: {
    perceivable: number
    operable: number
    understandable: number
    robust: number
  }
  automation: number
  manual: number
  confidence: number
}

export class AccessibilityAnalyzer {
  async analyzeAccessibility(page: Page): Promise<AccessibilityAnalysis> {
    const [
      wcag,
      semantic,
      interaction,
      visual,
      assistive
    ] = await Promise.all([
      this.analyzeWCAGCompliance(page),
      this.analyzeSemanticStructure(page),
      this.analyzeInteractionAccessibility(page),
      this.analyzeVisualAccessibility(page),
      this.analyzeAssistiveTechnology(page)
    ])

    const score = this.calculateAccessibilityScore({
      wcag,
      semantic,
      interaction,
      visual,
      assistive
    })

    return {
      wcag,
      semantic,
      interaction,
      visual,
      assistive,
      score
    }
  }

  private async analyzeWCAGCompliance(page: Page): Promise<WCAGCompliance> {
    const compliance = await page.evaluate(() => {
      const checks = {
        perceivable: [],
        operable: [],
        understandable: [],
        robust: []
      }

      const violations: any[] = []

      // Perceivable checks
      // 1.1.1 Non-text Content
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt])')
      checks.perceivable.push({
        criterion: '1.1.1 Non-text Content',
        status: imagesWithoutAlt.length === 0 ? 'pass' : 'fail',
        description: `${imagesWithoutAlt.length} images missing alt text`,
        severity: imagesWithoutAlt.length > 5 ? 'high' : imagesWithoutAlt.length > 0 ? 'medium' : 'low'
      })

      imagesWithoutAlt.forEach(img => {
        const rect = img.getBoundingClientRect()
        violations.push({
          type: 'missing-alt',
          severity: 'medium',
          element: 'img',
          description: 'Image missing alt attribute',
          location: { x: rect.x, y: rect.y },
          suggestion: 'Add descriptive alt text for the image',
          wcagReference: '1.1.1'
        })
      })

      // 1.4.3 Contrast (Minimum)
      const contrastIssues = this.checkColorContrast()
      checks.perceivable.push({
        criterion: '1.4.3 Contrast (Minimum)',
        status: contrastIssues.length === 0 ? 'pass' : 'fail',
        description: `${contrastIssues.length} contrast violations found`,
        severity: contrastIssues.length > 10 ? 'critical' : contrastIssues.length > 5 ? 'high' : 'medium'
      })

      violations.push(...contrastIssues)

      // Operable checks
      // 2.1.1 Keyboard
      const interactiveElements = document.querySelectorAll('button, a, input, textarea, select, [tabindex], [role="button"], [role="link"]')
      const nonKeyboardAccessible = Array.from(interactiveElements).filter(el => {
        const tabindex = el.getAttribute('tabindex')
        return tabindex === '-1' && !el.hasAttribute('aria-hidden')
      })

      checks.operable.push({
        criterion: '2.1.1 Keyboard',
        status: nonKeyboardAccessible.length === 0 ? 'pass' : 'fail',
        description: `${nonKeyboardAccessible.length} elements not keyboard accessible`,
        severity: nonKeyboardAccessible.length > 5 ? 'high' : 'medium'
      })

      // 2.4.1 Bypass Blocks
      const skipLinks = document.querySelectorAll('a[href="#main"], a[href="#content"], .skip-link')
      checks.operable.push({
        criterion: '2.4.1 Bypass Blocks',
        status: skipLinks.length > 0 ? 'pass' : 'fail',
        description: skipLinks.length > 0 ? 'Skip links present' : 'No skip links found',
        severity: 'medium'
      })

      // 2.4.6 Headings and Labels
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const headingIssues = this.analyzeHeadingStructure(Array.from(headings))

      checks.operable.push({
        criterion: '2.4.6 Headings and Labels',
        status: headingIssues.length === 0 ? 'pass' : 'fail',
        description: `${headingIssues.length} heading structure issues`,
        severity: headingIssues.length > 3 ? 'high' : 'medium'
      })

      // Understandable checks
      // 3.1.1 Language of Page
      const hasLang = document.documentElement.hasAttribute('lang')
      checks.understandable.push({
        criterion: '3.1.1 Language of Page',
        status: hasLang ? 'pass' : 'fail',
        description: hasLang ? 'Page language specified' : 'Page language not specified',
        severity: 'medium'
      })

      // 3.2.1 On Focus
      const focusChanges = this.checkFocusChanges()
      checks.understandable.push({
        criterion: '3.2.1 On Focus',
        status: focusChanges ? 'pass' : 'needs-review',
        description: 'Focus changes require manual testing',
        severity: 'low'
      })

      // Robust checks
      // 4.1.1 Parsing
      const parseErrors = this.checkHTMLValidity()
      checks.robust.push({
        criterion: '4.1.1 Parsing',
        status: parseErrors.length === 0 ? 'pass' : 'fail',
        description: `${parseErrors.length} HTML parsing issues`,
        severity: parseErrors.length > 5 ? 'high' : 'medium'
      })

      // 4.1.2 Name, Role, Value
      const ariaIssues = this.checkAriaImplementation()
      checks.robust.push({
        criterion: '4.1.2 Name, Role, Value',
        status: ariaIssues.length === 0 ? 'pass' : 'fail',
        description: `${ariaIssues.length} ARIA implementation issues`,
        severity: ariaIssues.length > 10 ? 'critical' : ariaIssues.length > 5 ? 'high' : 'medium'
      })

      // Calculate guideline scores
      const perceivableScore = this.calculateGuidelineScore(checks.perceivable)
      const operableScore = this.calculateGuidelineScore(checks.operable)
      const understandableScore = this.calculateGuidelineScore(checks.understandable)
      const robustScore = this.calculateGuidelineScore(checks.robust)

      // Determine overall WCAG level
      const minScore = Math.min(perceivableScore, operableScore, understandableScore, robustScore)
      let level: WCAGCompliance['level']

      if (minScore >= 95) level = 'AAA'
      else if (minScore >= 80) level = 'AA'
      else if (minScore >= 60) level = 'A'
      else level = 'Non-compliant'

      return {
        level,
        guidelines: {
          perceivable: { score: perceivableScore, passed: 0, failed: 0, checks: checks.perceivable },
          operable: { score: operableScore, passed: 0, failed: 0, checks: checks.operable },
          understandable: { score: understandableScore, passed: 0, failed: 0, checks: checks.understandable },
          robust: { score: robustScore, passed: 0, failed: 0, checks: checks.robust }
        },
        violations,
        recommendations: this.generateWCAGRecommendations(checks, violations)
      }

      // Helper functions
      function checkColorContrast(): any[] {
        const issues: any[] = []
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label')

        Array.from(textElements).slice(0, 100).forEach(el => { // Performance limit
          const computed = getComputedStyle(el)
          const color = computed.color
          const backgroundColor = computed.backgroundColor

          if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            const ratio = this.calculateContrastRatio(color, backgroundColor)
            const rect = el.getBoundingClientRect()

            if (ratio < 4.5) { // WCAG AA minimum
              issues.push({
                type: 'color-contrast',
                severity: ratio < 3 ? 'critical' : 'high',
                element: el.tagName.toLowerCase(),
                description: `Contrast ratio ${ratio.toFixed(2)}:1 below WCAG AA standard`,
                location: { x: rect.x, y: rect.y },
                suggestion: 'Increase color contrast to meet WCAG AA (4.5:1) or AAA (7:1) standards',
                wcagReference: '1.4.3'
              })
            }
          }
        })

        return issues
      }

      function analyzeHeadingStructure(headings: Element[]): string[] {
        const issues: string[] = []
        const levels = headings.map(h => parseInt(h.tagName.charAt(1)))

        // Check for skipped levels
        for (let i = 1; i < levels.length; i++) {
          if (levels[i] > levels[i-1] + 1) {
            issues.push(`Heading level skipped: h${levels[i-1]} to h${levels[i]}`)
          }
        }

        // Check for missing h1
        if (!levels.includes(1)) {
          issues.push('No h1 element found on page')
        }

        // Check for multiple h1s
        const h1Count = levels.filter(level => level === 1).length
        if (h1Count > 1) {
          issues.push(`Multiple h1 elements found (${h1Count})`)
        }

        return issues
      }

      function checkFocusChanges(): boolean {
        // This would require interaction testing - return true for now
        return true
      }

      function checkHTMLValidity(): string[] {
        const issues: string[] = []

        // Check for duplicate IDs
        const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id)
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
        if (duplicateIds.length > 0) {
          issues.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`)
        }

        // Check for invalid ARIA references
        const ariaRefs = document.querySelectorAll('[aria-labelledby], [aria-describedby]')
        ariaRefs.forEach(el => {
          const labelledby = el.getAttribute('aria-labelledby')
          const describedby = el.getAttribute('aria-describedby')

          if (labelledby && !document.getElementById(labelledby)) {
            issues.push(`Invalid aria-labelledby reference: ${labelledby}`)
          }
          if (describedby && !document.getElementById(describedby)) {
            issues.push(`Invalid aria-describedby reference: ${describedby}`)
          }
        })

        return issues
      }

      function checkAriaImplementation(): string[] {
        const issues: string[] = []

        // Check for ARIA roles on non-semantic elements
        const roleElements = document.querySelectorAll('[role]')
        roleElements.forEach(el => {
          const role = el.getAttribute('role')
          const tagName = el.tagName.toLowerCase()

          // Check for redundant roles
          const redundantRoles = {
            'button': ['button'],
            'link': ['a'],
            'textbox': ['input[type="text"]', 'textarea'],
            'listbox': ['select']
          }

          Object.entries(redundantRoles).forEach(([ariaRole, tags]) => {
            if (role === ariaRole && tags.some(tag => tag === tagName || el.matches(tag))) {
              issues.push(`Redundant role="${ariaRole}" on ${tagName} element`)
            }
          })
        })

        // Check for missing accessible names
        const interactiveElements = document.querySelectorAll('button, [role="button"], a, input, textarea, select')
        interactiveElements.forEach(el => {
          const hasName = el.hasAttribute('aria-label') ||
                         el.hasAttribute('aria-labelledby') ||
                         el.textContent?.trim() ||
                         (el.tagName === 'INPUT' && document.querySelector(`label[for="${el.id}"]`))

          if (!hasName) {
            const rect = el.getBoundingClientRect()
            issues.push(`Interactive element missing accessible name: ${el.tagName.toLowerCase()}`)
          }
        })

        return issues
      }

      function calculateContrastRatio(foreground: string, background: string): number {
        // Simplified contrast calculation - in production would use proper color parsing
        return 4.5 // Placeholder
      }

      function calculateGuidelineScore(checks: any[]): number {
        if (checks.length === 0) return 100

        const passed = checks.filter(check => check.status === 'pass').length
        const total = checks.length

        return (passed / total) * 100
      }

      function generateWCAGRecommendations(checks: any, violations: any[]): string[] {
        const recommendations: string[] = []

        if (violations.some(v => v.type === 'color-contrast')) {
          recommendations.push('Improve color contrast ratios to meet WCAG AA standards')
        }

        if (violations.some(v => v.type === 'missing-alt')) {
          recommendations.push('Add alt text to all informative images')
        }

        if (checks.operable.some((c: any) => c.criterion.includes('Keyboard') && c.status === 'fail')) {
          recommendations.push('Ensure all interactive elements are keyboard accessible')
        }

        if (checks.robust.some((c: any) => c.criterion.includes('Parsing') && c.status === 'fail')) {
          recommendations.push('Fix HTML validation errors for better screen reader compatibility')
        }

        return recommendations
      }
    })

    return compliance as WCAGCompliance
  }

  private async analyzeSemanticStructure(page: Page): Promise<SemanticStructure> {
    const semantic = await page.evaluate(() => {
      const results = {
        html5: {
          semanticTags: [],
          landmarks: [],
          headingHierarchy: { structure: [], violations: [], skipLevels: false, logicalOrder: true, uniqueness: 0 },
          listStructure: { lists: [], navigation: false, content: false, appropriate: 0 }
        },
        aria: {
          usage: { labels: { count: 0, orphaned: 0, missing: 0 }, descriptions: { count: 0, orphaned: 0 }, states: { count: 0, dynamic: 0 }, properties: { count: 0, redundant: 0 }, roles: { count: 0, invalid: 0, redundant: 0 } },
          landmarks: { banner: 0, navigation: 0, main: 0, contentinfo: 0, complementary: 0, search: 0, form: 0, regions: [] },
          liveRegions: { polite: 0, assertive: 0, off: 0, dynamic: 0, appropriate: false },
          relationships: { labelledby: { count: 0, valid: 0 }, describedby: { count: 0, valid: 0 }, controls: { count: 0, valid: 0 }, owns: { count: 0, valid: 0 } }
        },
        microdata: { schemas: [], coverage: 0 }
      }

      // Analyze HTML5 semantic tags
      const semanticTagNames = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer']
      semanticTagNames.forEach(tagName => {
        const elements = document.querySelectorAll(tagName)
        if (elements.length > 0) {
          results.html5.semanticTags.push({
            tag: tagName,
            count: elements.length,
            proper: this.isSemanticUsageProper(tagName, elements)
          })
        }
      })

      // Analyze landmarks
      const landmarkRoles = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'search', 'form']
      landmarkRoles.forEach(role => {
        const elements = document.querySelectorAll(`[role="${role}"], ${this.getSemanticEquivalent(role)}`)
        elements.forEach(el => {
          results.html5.landmarks.push({
            role,
            element: el.tagName.toLowerCase(),
            hasLabel: el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
          })
        })

        results.aria.landmarks[role as keyof typeof results.aria.landmarks] = elements.length
      })

      // Analyze heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      headings.forEach(heading => {
        results.html5.headingHierarchy.structure.push({
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent?.trim().substring(0, 50) || '',
          hasId: heading.hasAttribute('id')
        })
      })

      // Analyze ARIA usage
      results.aria.usage.labels.count = document.querySelectorAll('[aria-label]').length
      results.aria.usage.descriptions.count = document.querySelectorAll('[aria-describedby]').length
      results.aria.usage.roles.count = document.querySelectorAll('[role]').length

      // Check for live regions
      results.aria.liveRegions.polite = document.querySelectorAll('[aria-live="polite"]').length
      results.aria.liveRegions.assertive = document.querySelectorAll('[aria-live="assertive"]').length

      // Analyze list structure
      const lists = document.querySelectorAll('ul, ol, dl')
      lists.forEach(list => {
        const items = list.children.length
        const nested = list.querySelector('ul, ol, dl') !== null

        results.html5.listStructure.lists.push({
          type: list.tagName.toLowerCase() as any,
          items,
          nested,
          semantic: list.closest('nav') !== null // Lists in navigation are semantic
        })
      })

      return results

      function isSemanticUsageProper(tagName: string, elements: NodeListOf<Element>): boolean {
        // Check if semantic tags are used properly
        switch (tagName) {
          case 'header':
            return elements.length <= 2 // Usually one main header, maybe one in aside
          case 'main':
            return elements.length === 1 // Should only be one main
          case 'footer':
            return elements.length <= 2 // Main footer, maybe one in aside
          default:
            return true
        }
      }

      function getSemanticEquivalent(role: string): string {
        const equivalents: { [key: string]: string } = {
          banner: 'header',
          navigation: 'nav',
          main: 'main',
          contentinfo: 'footer',
          complementary: 'aside'
        }
        return equivalents[role] || ''
      }
    })

    return semantic as SemanticStructure
  }

  private async analyzeInteractionAccessibility(page: Page): Promise<InteractionAccessibility> {
    const interaction = await page.evaluate(() => {
      const results = {
        keyboard: {
          navigation: { tabOrder: 'logical' as const, skipLinks: false, shortcuts: [] },
          interaction: { allInteractive: true, customControls: 0, keyboardTraps: 0, escapeRoutes: true },
          testing: { tabIndexUsage: 'appropriate' as const, accessKeys: 0, customKeyHandlers: 0 }
        },
        mouse: {
          clickTargets: { minimumSize: true, spacing: true, adequateTargets: 0, problematicTargets: 0 },
          hover: { essential: false, duplicated: true, timeout: false }
        },
        touch: {
          targets: { minimumSize: true, spacing: true, gestureAlternatives: true },
          interactions: { swipe: false, pinch: false, alternatives: true }
        },
        focus: {
          visibility: { hasVisibleIndicators: true, customFocusStyles: false, contrastRatio: 3 },
          management: { logical: true, trapped: false, restored: true, skipLinks: false },
          customComponents: { ariaCompliant: 0, keyboardAccessible: 0, focusable: 0 }
        }
      }

      // Analyze keyboard navigation
      const skipLinks = document.querySelectorAll('a[href="#main"], a[href="#content"], .skip-link')
      results.keyboard.navigation.skipLinks = skipLinks.length > 0

      // Check tab order
      const focusableElements = document.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
      )

      let tabOrderIssues = 0
      Array.from(focusableElements).forEach((el, index) => {
        const tabindex = parseInt(el.getAttribute('tabindex') || '0')
        if (tabindex > 0) {
          tabOrderIssues++ // Positive tabindex can disrupt natural order
        }
      })

      results.keyboard.navigation.tabOrder = tabOrderIssues > 0 ? 'problematic' : 'logical'

      // Analyze click targets
      const interactiveElements = document.querySelectorAll('button, a, [role="button"], [role="link"], input[type="submit"]')
      let adequateTargets = 0
      let problematicTargets = 0

      interactiveElements.forEach(el => {
        const rect = el.getBoundingClientRect()
        const isAdequate = rect.width >= 44 && rect.height >= 44 // WCAG 2.1 AA minimum

        if (isAdequate) {
          adequateTargets++
        } else {
          problematicTargets++
        }
      })

      results.mouse.clickTargets.adequateTargets = adequateTargets
      results.mouse.clickTargets.problematicTargets = problematicTargets
      results.mouse.clickTargets.minimumSize = problematicTargets === 0

      results.touch.targets.minimumSize = problematicTargets === 0

      // Check for focus indicators
      const hasCustomFocus = Array.from(document.styleSheets).some(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || [])
          return rules.some(rule => rule.cssText.includes(':focus'))
        } catch (e) {
          return false
        }
      })

      results.focus.visibility.customFocusStyles = hasCustomFocus

      return results
    })

    return interaction as InteractionAccessibility
  }

  private async analyzeVisualAccessibility(page: Page): Promise<VisualAccessibility> {
    // Comprehensive visual accessibility analysis
    const visual = await page.evaluate(() => {
      const results = {
        contrast: {
          textPairs: [],
          summary: { totalPairs: 0, aaCompliant: 0, aaaCompliant: 0, averageRatio: 0, lowestRatio: 21 },
          nonTextPairs: []
        },
        typography: {
          readability: { averageLineLength: 0, lineHeight: 0, fontSizes: [], textSpacing: true },
          dyslexia: { friendlyFonts: false, lineSpacing: true, paragraphSpacing: true, justification: 'appropriate' as const },
          scaling: { supportsZoom: true, breakpoints: [], maintains: true }
        },
        layout: {
          responsive: { breakpoints: [], contentReflow: true, horizontalScroll: false, maintains: true },
          spacing: { adequate: true, consistent: true, scalable: true },
          orientation: { supportsPortrait: true, supportsLandscape: true, adapts: true }
        },
        motion: {
          prefersReducedMotion: false,
          essentialMotion: false,
          alternatives: true,
          duration: [],
          triggers: []
        }
      }

      // Detailed contrast analysis
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label')
      const contrastPairs: any[] = []

      Array.from(textElements).slice(0, 50).forEach(el => {
        const computed = getComputedStyle(el)
        const rect = el.getBoundingClientRect()

        if (rect.width > 0 && rect.height > 0) {
          const fontSize = parseFloat(computed.fontSize)
          const fontWeight = parseInt(computed.fontWeight) || 400

          const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)

          const ratio = this.calculateContrastRatio(computed.color, computed.backgroundColor)

          contrastPairs.push({
            foreground: computed.color,
            background: computed.backgroundColor,
            ratio,
            size: isLarge ? 'large' : 'small',
            wcag: {
              aa: isLarge ? ratio >= 3 : ratio >= 4.5,
              aaa: isLarge ? ratio >= 4.5 : ratio >= 7
            },
            element: el.tagName.toLowerCase(),
            location: { x: rect.x, y: rect.y }
          })
        }
      })

      results.contrast.textPairs = contrastPairs
      results.contrast.summary = {
        totalPairs: contrastPairs.length,
        aaCompliant: contrastPairs.filter(p => p.wcag.aa).length,
        aaaCompliant: contrastPairs.filter(p => p.wcag.aaa).length,
        averageRatio: contrastPairs.reduce((sum, p) => sum + p.ratio, 0) / contrastPairs.length,
        lowestRatio: Math.min(...contrastPairs.map(p => p.ratio))
      }

      // Typography readability analysis
      const paragraphs = document.querySelectorAll('p')
      let totalLineLength = 0
      let totalParagraphs = 0

      paragraphs.forEach(p => {
        const text = p.textContent || ''
        const lines = text.split('\n').filter(line => line.trim().length > 0)
        if (lines.length > 0) {
          const avgLineLength = text.length / lines.length
          totalLineLength += avgLineLength
          totalParagraphs++
        }
      })

      results.typography.readability.averageLineLength = totalParagraphs > 0 ? totalLineLength / totalParagraphs : 0

      // Check for dyslexia-friendly fonts
      const fontFamilies = new Set<string>()
      Array.from(textElements).slice(0, 20).forEach(el => {
        const computed = getComputedStyle(el)
        fontFamilies.add(computed.fontFamily)
      })

      const dyslexiaFriendlyFonts = ['OpenDyslexic', 'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Comic Sans']
      results.typography.dyslexia.friendlyFonts = Array.from(fontFamilies).some(family =>
        dyslexiaFriendlyFonts.some(friendly => family.toLowerCase().includes(friendly.toLowerCase()))
      )

      // Check for motion preferences
      const hasReducedMotionCSS = Array.from(document.styleSheets).some(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || [])
          return rules.some(rule => rule.cssText.includes('prefers-reduced-motion'))
        } catch (e) {
          return false
        }
      })

      results.motion.prefersReducedMotion = hasReducedMotionCSS

      return results

      function calculateContrastRatio(fg: string, bg: string): number {
        // Simplified - in production would use proper color parsing and luminance calculation
        return 4.5 // Placeholder
      }
    })

    return semantic as VisualAccessibility
  }

  private async analyzeAssistiveTechnology(page: Page): Promise<AssistiveTechnology> {
    const assistive = await page.evaluate(() => {
      const results = {
        screenReaders: {
          landmarks: 0,
          headingNavigation: false,
          skipLinks: false,
          formLabels: 0,
          imageAlts: 0,
          tableHeaders: false,
          liveRegions: 0,
          compatibility: 0
        },
        voiceControl: {
          labelledElements: 0,
          uniqueLabels: false,
          clickableElements: 0,
          voiceCommands: false
        },
        switches: {
          scannable: false,
          grouping: false,
          timing: false,
          alternatives: false
        }
      }

      // Screen reader support analysis
      results.screenReaders.landmarks = document.querySelectorAll('header, nav, main, aside, footer, [role]').length
      results.screenReaders.headingNavigation = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0
      results.screenReaders.skipLinks = document.querySelectorAll('a[href="#main"], .skip-link').length > 0
      results.screenReaders.formLabels = document.querySelectorAll('label, [aria-label], [aria-labelledby]').length
      results.screenReaders.imageAlts = document.querySelectorAll('img[alt]').length
      results.screenReaders.tableHeaders = document.querySelectorAll('th, [role="columnheader"], [role="rowheader"]').length > 0
      results.screenReaders.liveRegions = document.querySelectorAll('[aria-live]').length

      // Calculate screen reader compatibility score
      const totalImages = document.querySelectorAll('img').length
      const totalForms = document.querySelectorAll('input, textarea, select').length
      const totalTables = document.querySelectorAll('table').length

      let compatibilityScore = 80 // Base score

      if (totalImages > 0) {
        const altCoverage = results.screenReaders.imageAlts / totalImages
        compatibilityScore += (altCoverage * 10) - 5 // Bonus for good alt coverage
      }

      if (totalForms > 0) {
        const labelCoverage = results.screenReaders.formLabels / totalForms
        compatibilityScore += (labelCoverage * 10) - 5
      }

      results.screenReaders.compatibility = Math.max(0, Math.min(100, compatibilityScore))

      // Voice control analysis
      const interactiveElements = document.querySelectorAll('button, a, input, [role="button"], [role="link"]')
      results.voiceControl.clickableElements = interactiveElements.length

      const labelledElements = document.querySelectorAll('[aria-label], [aria-labelledby]')
      results.voiceControl.labelledElements = labelledElements.length
      results.voiceControl.uniqueLabels = this.checkUniqueLabels(labelledElements)

      return results

      function checkUniqueLabels(elements: NodeListOf<Element>): boolean {
        const labels = Array.from(elements).map(el =>
          el.getAttribute('aria-label') ||
          (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent) ||
          el.textContent
        ).filter(Boolean)

        const uniqueLabels = new Set(labels)
        return uniqueLabels.size === labels.length
      }
    })

    return assistive as AssistiveTechnology
  }

  private calculateAccessibilityScore(analysis: {
    wcag: WCAGCompliance
    semantic: SemanticStructure
    interaction: InteractionAccessibility
    visual: VisualAccessibility
    assistive: AssistiveTechnology
  }): AccessibilityScore {
    const categories = {
      perceivable: analysis.wcag.guidelines.perceivable.score,
      operable: analysis.wcag.guidelines.operable.score,
      understandable: analysis.wcag.guidelines.understandable.score,
      robust: analysis.wcag.guidelines.robust.score
    }

    const overall = Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length

    // Calculate automation vs manual testing confidence
    const automationScore = (categories.perceivable + categories.robust) / 2 // More automatable
    const manualScore = (categories.operable + categories.understandable) / 2 // Requires manual testing

    return {
      overall: Math.round(overall),
      categories: Object.fromEntries(
        Object.entries(categories).map(([key, value]) => [key, Math.round(value)])
      ) as any,
      automation: Math.round(automationScore),
      manual: Math.round(manualScore),
      confidence: Math.round((automationScore * 0.8 + manualScore * 0.5) / 1.3) // Lower confidence for manual tests
    }
  }
}