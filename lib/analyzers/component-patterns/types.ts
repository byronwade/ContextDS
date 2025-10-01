/**
 * Component Pattern Detection Interface
 * Defines the structure for component detection strategies
 */

export interface ComponentPattern {
  /**
   * CSS Selector Strategy (12% weight)
   * Detect by class names, data attributes, IDs
   */
  cssSelector?: (element: any) => number // Returns 0-100 score

  /**
   * Computed Style Strategy (8% weight)
   * Detect by visual characteristics
   */
  computedStyle?: (element: any) => number // Returns 0-100 score

  /**
   * ARIA Pattern Strategy (18% weight)
   * Detect by accessibility attributes
   */
  ariaPattern?: (element: any) => number // Returns 0-100 score

  /**
   * Semantic HTML Strategy (8% weight)
   * Detect by HTML element types
   */
  semanticHtml?: (element: any) => number // Returns 0-100 score

  /**
   * Composition Strategy (8% weight)
   * Detect by component structure
   */
  composition?: (element: any) => number // Returns 0-100 score

  /**
   * Visual Signature Strategy (12% weight)
   * Detect by unique visual patterns and component fingerprints
   */
  visualSignature?: (element: any) => number // Returns 0-100 score

  /**
   * Framework Pattern Strategy (17% weight)
   * Detect by framework-specific patterns (shadcn, Radix, MUI, Chakra, etc.)
   */
  frameworkPattern?: (element: any) => number // Returns 0-100 score

  /**
   * Behavioral Analysis Strategy (17% weight) - NEW
   * Detect by interaction patterns, animations, state changes, and user behavior
   */
  behavioralAnalysis?: (element: any) => number // Returns 0-100 score
}

/**
 * Helper functions for pattern matching
 */

// Check if selector contains any of the patterns
export function matchesSelector(selector: string, patterns: string[]): boolean {
  const lowerSelector = (selector || '').toLowerCase()
  return patterns.some(pattern => lowerSelector.includes(pattern.toLowerCase()))
}

// Check if element has ARIA attribute
export function hasAria(element: any, attribute: string, value?: string): boolean {
  const ariaValue = element[attribute]
  if (value) {
    return ariaValue === value
  }
  return !!ariaValue
}

// Check element tag name
export function isElement(element: any, tagNames: string[]): boolean {
  const tag = (element.tagName || '').toLowerCase()
  return tagNames.includes(tag)
}

// Check if styles match criteria
export function hasStyle(element: any, property: string, matcher: (value: any) => boolean): boolean {
  const value = element.computedStyle?.[property]
  return matcher(value)
}

// Score based on how many patterns match
export function scoreMatches(matches: boolean[], weight: number = 100): number {
  const matchCount = matches.filter(Boolean).length
  return (matchCount / matches.length) * weight
}

/**
 * Visual Signature Helper Functions
 */

// Check if padding follows a specific ratio pattern (common in design systems)
export function hasPaddingRatio(element: any, ratio: { x: number, y: number }, tolerance: number = 0.2): boolean {
  const styles = element.computedStyle
  if (!styles) return false

  const paddingTop = parseFloat(styles.paddingTop) || 0
  const paddingLeft = parseFloat(styles.paddingLeft) || 0

  if (paddingTop === 0 || paddingLeft === 0) return false

  const actualRatio = paddingLeft / paddingTop
  const expectedRatio = ratio.x / ratio.y
  const diff = Math.abs(actualRatio - expectedRatio)

  return diff <= tolerance
}

// Check for consistent border radius patterns
export function hasRoundedCorners(element: any, type: 'pill' | 'rounded' | 'circle'): boolean {
  const styles = element.computedStyle
  if (!styles?.borderRadius) return false

  const radius = styles.borderRadius
  const width = parseFloat(styles.width) || 0
  const height = parseFloat(styles.height) || 0

  if (type === 'pill') {
    // Pill buttons: borderRadius >= height/2
    const minDimension = Math.min(width, height)
    return parseFloat(radius) >= minDimension / 2
  }

  if (type === 'circle') {
    // Perfect circle: borderRadius = 50% and width = height
    return (radius === '50%' || parseFloat(radius) >= width / 2) && Math.abs(width - height) < 2
  }

  if (type === 'rounded') {
    // Subtle rounding: borderRadius between 4px and 12px
    const radiusPx = parseFloat(radius)
    return radiusPx >= 4 && radiusPx <= 12
  }

  return false
}

// Check for elevation/shadow patterns (cards, buttons)
export function hasElevation(element: any, level: 'low' | 'medium' | 'high'): boolean {
  const styles = element.computedStyle
  if (!styles?.boxShadow || styles.boxShadow === 'none') return false

  const shadow = styles.boxShadow

  // Count shadow layers (multiple shadows = higher elevation)
  const shadowCount = shadow.split(',').length

  // Check blur radius (higher blur = higher elevation)
  const blurMatch = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
  const blurRadius = blurMatch ? parseInt(blurMatch[3]) : 0

  if (level === 'low') return shadowCount <= 1 && blurRadius < 10
  if (level === 'medium') return shadowCount <= 2 && blurRadius >= 10 && blurRadius < 25
  if (level === 'high') return shadowCount >= 2 || blurRadius >= 25

  return false
}

// Check for transition/animation patterns
export function hasInteractiveTransition(element: any): boolean {
  const styles = element.computedStyle
  if (!styles?.transition || styles.transition === 'none') return false

  const transition = styles.transition.toLowerCase()

  // Common interactive properties
  const interactiveProps = ['background', 'color', 'transform', 'box-shadow', 'border', 'opacity']
  return interactiveProps.some(prop => transition.includes(prop))
}

// Check for focus ring patterns
export function hasFocusRing(element: any): boolean {
  const styles = element.computedStyle
  if (!styles) return false

  // Check for outline or box-shadow focus indicators
  const hasOutline = styles.outline && styles.outline !== 'none'
  const hasBoxShadow = styles.boxShadow && styles.boxShadow !== 'none' && styles.boxShadow.includes('rgb')

  return hasOutline || hasBoxShadow
}

// Check for typography scale patterns
export function matchesTypographyScale(element: any, scale: 'heading' | 'body' | 'caption'): boolean {
  const styles = element.computedStyle
  if (!styles?.fontSize) return false

  const fontSize = parseFloat(styles.fontSize)

  if (scale === 'heading') return fontSize >= 20
  if (scale === 'body') return fontSize >= 14 && fontSize < 20
  if (scale === 'caption') return fontSize < 14

  return false
}

// Check for flex/grid container patterns
export function isFlexContainer(element: any, direction?: 'row' | 'column'): boolean {
  const styles = element.computedStyle
  if (!styles || styles.display !== 'flex') return false

  if (direction) {
    return styles.flexDirection?.includes(direction)
  }

  return true
}

// Check for spacing scale patterns (8px grid, etc.)
export function matchesSpacingScale(element: any, baseUnit: number = 4): boolean {
  const styles = element.computedStyle
  if (!styles) return false

  const spacingProps = ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap']

  for (const prop of spacingProps) {
    const value = styles[prop]
    if (!value) continue

    const px = parseFloat(value)
    if (px > 0 && px % baseUnit === 0) {
      return true
    }
  }

  return false
}

// Check for aspect ratio patterns
export function hasAspectRatio(element: any, ratio?: string): boolean {
  const styles = element.computedStyle
  if (!styles) return false

  const width = parseFloat(styles.width) || 0
  const height = parseFloat(styles.height) || 0

  if (width === 0 || height === 0) return false

  const actualRatio = width / height

  if (ratio === '16:9') return Math.abs(actualRatio - 16/9) < 0.1
  if (ratio === '4:3') return Math.abs(actualRatio - 4/3) < 0.1
  if (ratio === '1:1') return Math.abs(actualRatio - 1) < 0.1

  // Any consistent aspect ratio
  return true
}

// Check for truncation patterns
export function hasTruncation(element: any): boolean {
  const styles = element.computedStyle
  if (!styles) return false

  return (
    styles.overflow === 'hidden' &&
    styles.textOverflow === 'ellipsis' &&
    styles.whiteSpace === 'nowrap'
  )
}

/**
 * Framework Pattern Detection Helper Functions
 * Detects components from major UI frameworks
 */

// Check for shadcn/ui patterns (built on Radix UI)
export function isShadcnComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // shadcn/ui uses Radix UI primitives with specific data attributes
  const hasRadixDataAttrs = !!(
    attrs['data-state'] ||
    attrs['data-disabled'] ||
    attrs['data-orientation'] ||
    attrs['data-side'] ||
    attrs['data-align']
  )

  // shadcn often uses Tailwind classes with specific patterns
  const hasShadcnClasses = selector.includes('data-[state') ||
                          selector.includes('data-[disabled') ||
                          selector.includes('radix-')

  return hasRadixDataAttrs || hasShadcnClasses
}

// Check for Radix UI primitives
export function isRadixComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}
  const styles = element.computedStyle || {}

  // Radix UI specific data attributes
  const radixDataAttrs = [
    'data-state',
    'data-disabled',
    'data-orientation',
    'data-side',
    'data-align',
    'data-radix-collection-item',
    'data-radix-scroll-area-viewport'
  ]

  const hasRadixAttrs = radixDataAttrs.some(attr => attrs[attr] !== undefined)

  // Radix CSS variables
  const hasRadixVars = Object.keys(styles).some(prop =>
    prop.startsWith('--radix-')
  )

  // Radix class prefixes
  const hasRadixClasses = selector.includes('radix-')

  return hasRadixAttrs || hasRadixVars || hasRadixClasses
}

// Check for Material UI (MUI) patterns
export function isMaterialUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // MUI class patterns: Mui[Component]-root, Mui[Component]-label, etc.
  const hasMuiClasses = /mui[a-z]+-(?:root|label|icon|disabled|focused|selected|checked)/i.test(selector)

  // MUI data attributes
  const hasMuiAttrs = !!(
    attrs['data-mui-internal-clone-element'] ||
    attrs['data-mui-test']
  )

  // MUI prefixes
  const hasMuiPrefix = selector.includes('mui-') ||
                      selector.includes('jss') // MUI often uses JSS

  return hasMuiClasses || hasMuiAttrs || hasMuiPrefix
}

// Check for Chakra UI patterns
export function isChakraComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}
  const styles = element.computedStyle || {}

  // Chakra class patterns
  const hasChakraClasses = selector.includes('chakra-') ||
                          selector.match(/css-[a-z0-9]+/) // Emotion CSS

  // Chakra data attributes
  const hasChakraAttrs = !!(
    attrs['data-theme'] ||
    attrs['data-chakra-component']
  )

  // Chakra CSS variables
  const hasChakraVars = Object.keys(styles).some(prop =>
    prop.startsWith('--chakra-')
  )

  return hasChakraClasses || hasChakraAttrs || hasChakraVars
}

// Check for Ant Design patterns
export function isAntDesignComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Ant Design uses ant- prefix for all components
  const hasAntPrefix = selector.includes('ant-')

  // Common Ant Design patterns
  const antPatterns = [
    'ant-btn',
    'ant-input',
    'ant-select',
    'ant-card',
    'ant-table',
    'ant-modal',
    'ant-dropdown',
    'ant-menu'
  ]

  const hasAntPattern = antPatterns.some(pattern => selector.includes(pattern))

  return hasAntPrefix || hasAntPattern
}

// Check for Headless UI patterns (Tailwind Labs)
export function isHeadlessUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // Headless UI data attributes
  const hasHeadlessAttrs = !!(
    attrs['data-headlessui-state'] ||
    attrs['data-headlessui-focus-visible']
  )

  // Headless UI class patterns (often no styling)
  const hasHeadlessClasses = selector.includes('headlessui-')

  return hasHeadlessAttrs || hasHeadlessClasses
}

// Check for NextUI patterns
export function isNextUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // NextUI class patterns
  const hasNextUIClasses = selector.includes('nextui-') ||
                          selector.includes('next-ui-')

  // NextUI data attributes
  const hasNextUIAttrs = !!(
    attrs['data-slot'] ||
    attrs['data-nextui-component']
  )

  return hasNextUIClasses || hasNextUIAttrs
}

// Check for Mantine patterns
export function isMantineComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}
  const styles = element.computedStyle || {}

  // Mantine class patterns
  const hasMantineClasses = selector.includes('mantine-') ||
                           selector.match(/m-[a-z0-9]+/)

  // Mantine data attributes
  const hasMantineAttrs = Object.keys(attrs).some(attr =>
    attr.startsWith('data-mantine-')
  )

  // Mantine CSS variables
  const hasMantineVars = Object.keys(styles).some(prop =>
    prop.startsWith('--mantine-')
  )

  return hasMantineClasses || hasMantineAttrs || hasMantineVars
}

// Check for React Aria / Adobe Spectrum patterns
export function isReactAriaComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // React Aria class patterns
  const hasReactAriaClasses = selector.includes('react-aria-') ||
                             selector.includes('spectrum-')

  // React Aria data attributes
  const hasReactAriaAttrs = Object.keys(attrs).some(attr =>
    attr.startsWith('data-react-aria-')
  )

  return hasReactAriaClasses || hasReactAriaAttrs
}

// Check for Ark UI patterns (Chakra's headless library)
export function isArkUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // Ark UI data attributes
  const hasArkAttrs = !!(
    attrs['data-scope'] ||
    attrs['data-part'] ||
    attrs['data-ark-component']
  )

  // Ark UI class patterns
  const hasArkClasses = selector.includes('ark-')

  return hasArkAttrs || hasArkClasses
}

// Check for PrimeReact patterns
export function isPrimeReactComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // PrimeReact uses p- prefix
  const hasPrimePrefix = selector.match(/p-[a-z]+/) &&
                        !selector.includes('padding') // Avoid CSS padding classes

  // Common PrimeReact patterns
  const primePatterns = [
    'p-button',
    'p-inputtext',
    'p-dropdown',
    'p-dialog',
    'p-datatable'
  ]

  const hasPrimePattern = primePatterns.some(pattern => selector.includes(pattern))

  return hasPrimePrefix || hasPrimePattern
}

// Check for DaisyUI patterns (Tailwind-based component library)
export function isDaisyUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // DaisyUI class patterns
  const daisyClasses = [
    'btn', 'btn-primary', 'btn-secondary', 'btn-accent',
    'card', 'card-body', 'card-title',
    'badge', 'badge-primary',
    'alert', 'alert-info', 'alert-success',
    'drawer', 'drawer-side', 'drawer-content',
    'modal', 'modal-box',
    'navbar', 'menu',
    'tabs', 'tab',
    'input', 'input-bordered',
    'select', 'select-bordered',
    'checkbox', 'toggle', 'radio',
    'progress', 'progress-bar',
    'tooltip',
    'dropdown', 'dropdown-content',
    'collapse', 'collapse-title',
    'avatar', 'avatar-group',
    'breadcrumbs',
    'loading', 'loading-spinner'
  ]

  const hasDaisyClasses = daisyClasses.some(cls => selector.includes(cls))

  return hasDaisyClasses
}

// Check for Semantic UI / Fomantic UI patterns
export function isSemanticUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Semantic UI uses 'ui' prefix with descriptive class names
  const hasUIPrefix = selector.includes('ui ')

  // Common Semantic UI patterns
  const semanticPatterns = [
    'ui button',
    'ui card',
    'ui input',
    'ui dropdown',
    'ui modal',
    'ui popup',
    'ui menu',
    'ui tab',
    'ui segment',
    'ui header',
    'ui list',
    'ui form',
    'ui grid',
    'ui container',
    'ui divider',
    'ui label',
    'ui message',
    'ui accordion',
    'ui checkbox',
    'ui progress',
    'ui table'
  ]

  const hasSemanticPattern = semanticPatterns.some(pattern => selector.includes(pattern))

  return hasUIPrefix || hasSemanticPattern
}

// Check for Blueprint.js patterns (Palantir's React UI toolkit)
export function isBlueprintComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Blueprint uses bp5- or bp4- or bp3- prefix (version-based)
  const hasBlueprintPrefix = /bp[3-5]-/.test(selector)

  // Common Blueprint patterns
  const blueprintPatterns = [
    'bp5-button',
    'bp5-card',
    'bp5-input',
    'bp5-dialog',
    'bp5-popover',
    'bp5-menu',
    'bp5-navbar',
    'bp5-tab',
    'bp5-select',
    'bp5-checkbox',
    'bp5-switch',
    'bp5-slider',
    'bp5-progress',
    'bp5-tag',
    'bp5-callout'
  ]

  const hasBlueprintPattern = blueprintPatterns.some(pattern => selector.includes(pattern))

  return hasBlueprintPrefix || hasBlueprintPattern
}

// Check for Fluent UI (Microsoft) patterns
export function isFluentUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}
  const styles = element.computedStyle || {}

  // Fluent UI class patterns (v9 uses fui- prefix, v8 uses ms-)
  const hasFluentClasses = selector.includes('fui-') ||
                          selector.includes('ms-') ||
                          selector.match(/ms-[A-Z][a-z]+/)

  // Fluent UI data attributes
  const hasFluentAttrs = Object.keys(attrs).some(attr =>
    attr.startsWith('data-fui-') || attr.startsWith('data-fluent-')
  )

  // Fluent UI CSS variables
  const hasFluentVars = Object.keys(styles).some(prop =>
    prop.startsWith('--fui-') || prop.startsWith('--fluent-')
  )

  return hasFluentClasses || hasFluentAttrs || hasFluentVars
}

// Check for Carbon Design System (IBM) patterns
export function isCarbonComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}

  // Carbon uses cds-- or bx-- prefix
  const hasCarbonPrefix = selector.includes('cds--') || selector.includes('bx--')

  // Carbon data attributes
  const hasCarbonAttrs = Object.keys(attrs).some(attr =>
    attr.startsWith('data-carbon-')
  )

  // Common Carbon patterns
  const carbonPatterns = [
    'cds--btn',
    'cds--accordion',
    'cds--modal',
    'cds--dropdown',
    'cds--tabs',
    'cds--tag',
    'cds--checkbox',
    'cds--toggle',
    'bx--btn',
    'bx--modal',
    'bx--dropdown'
  ]

  const hasCarbonPattern = carbonPatterns.some(pattern => selector.includes(pattern))

  return hasCarbonPrefix || hasCarbonAttrs || hasCarbonPattern
}

// Check for Shoelace (web components) patterns
export function isShoelaceComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const tagName = (element.tagName || '').toLowerCase()

  // Shoelace uses sl- prefix for custom elements
  const hasShoelaceTag = tagName.startsWith('sl-')

  // Shoelace class patterns
  const hasShoelaceClass = selector.includes('sl-')

  // Common Shoelace components
  const shoelaceComponents = [
    'sl-button',
    'sl-card',
    'sl-input',
    'sl-dialog',
    'sl-dropdown',
    'sl-menu',
    'sl-tab',
    'sl-checkbox',
    'sl-switch',
    'sl-badge',
    'sl-alert',
    'sl-avatar',
    'sl-progress-bar',
    'sl-tooltip'
  ]

  const hasShoelaceComponent = shoelaceComponents.some(comp =>
    tagName === comp || selector.includes(comp)
  )

  return hasShoelaceTag || hasShoelaceClass || hasShoelaceComponent
}

// Check for Vuetify patterns (Vue.js Material Design)
export function isVuetifyComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Vuetify uses v- prefix
  const hasVuetifyPrefix = /v-[a-z]/.test(selector)

  // Common Vuetify patterns
  const vuetifyPatterns = [
    'v-btn',
    'v-card',
    'v-input',
    'v-dialog',
    'v-menu',
    'v-tabs',
    'v-tab',
    'v-select',
    'v-checkbox',
    'v-switch',
    'v-slider',
    'v-progress',
    'v-alert',
    'v-badge',
    'v-avatar',
    'v-tooltip',
    'v-navigation-drawer',
    'v-app-bar'
  ]

  const hasVuetifyPattern = vuetifyPatterns.some(pattern => selector.includes(pattern))

  return hasVuetifyPrefix || hasVuetifyPattern
}

// Check for Element Plus / Element UI patterns (Vue.js)
export function isElementUIComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Element UI/Plus uses el- prefix
  const hasElementPrefix = /el-[a-z]/.test(selector)

  // Common Element UI patterns
  const elementPatterns = [
    'el-button',
    'el-card',
    'el-input',
    'el-dialog',
    'el-dropdown',
    'el-menu',
    'el-tabs',
    'el-select',
    'el-checkbox',
    'el-switch',
    'el-slider',
    'el-progress',
    'el-alert',
    'el-badge',
    'el-avatar',
    'el-tooltip',
    'el-table',
    'el-form'
  ]

  const hasElementPattern = elementPatterns.some(pattern => selector.includes(pattern))

  return hasElementPrefix || hasElementPattern
}

// Check for Quasar Framework patterns (Vue.js)
export function isQuasarComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Quasar uses q- prefix
  const hasQuasarPrefix = /q-[a-z]/.test(selector)

  // Common Quasar patterns
  const quasarPatterns = [
    'q-btn',
    'q-card',
    'q-input',
    'q-dialog',
    'q-menu',
    'q-tabs',
    'q-tab',
    'q-select',
    'q-checkbox',
    'q-toggle',
    'q-slider',
    'q-linear-progress',
    'q-badge',
    'q-avatar',
    'q-tooltip',
    'q-table',
    'q-drawer'
  ]

  const hasQuasarPattern = quasarPatterns.some(pattern => selector.includes(pattern))

  return hasQuasarPrefix || hasQuasarPattern
}

// Check for Ionic Framework patterns
export function isIonicComponent(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const tagName = (element.tagName || '').toLowerCase()

  // Ionic uses ion- prefix for custom elements
  const hasIonicTag = tagName.startsWith('ion-')

  // Ionic class patterns
  const hasIonicClass = selector.includes('ion-')

  // Common Ionic components
  const ionicComponents = [
    'ion-button',
    'ion-card',
    'ion-input',
    'ion-modal',
    'ion-menu',
    'ion-tabs',
    'ion-tab',
    'ion-select',
    'ion-checkbox',
    'ion-toggle',
    'ion-range',
    'ion-progress-bar',
    'ion-badge',
    'ion-avatar',
    'ion-alert',
    'ion-popover'
  ]

  const hasIonicComponent = ionicComponents.some(comp =>
    tagName === comp || selector.includes(comp)
  )

  return hasIonicTag || hasIonicClass || hasIonicComponent
}

// Aggregate framework detection - checks all frameworks
export function detectFramework(element: any): string[] {
  const frameworks: string[] = []

  // React-based frameworks
  if (isShadcnComponent(element)) frameworks.push('shadcn/ui')
  if (isRadixComponent(element)) frameworks.push('Radix UI')
  if (isMaterialUIComponent(element)) frameworks.push('Material UI')
  if (isChakraComponent(element)) frameworks.push('Chakra UI')
  if (isAntDesignComponent(element)) frameworks.push('Ant Design')
  if (isHeadlessUIComponent(element)) frameworks.push('Headless UI')
  if (isNextUIComponent(element)) frameworks.push('NextUI')
  if (isMantineComponent(element)) frameworks.push('Mantine')
  if (isReactAriaComponent(element)) frameworks.push('React Aria')
  if (isArkUIComponent(element)) frameworks.push('Ark UI')
  if (isPrimeReactComponent(element)) frameworks.push('PrimeReact')
  if (isBlueprintComponent(element)) frameworks.push('Blueprint.js')
  if (isFluentUIComponent(element)) frameworks.push('Fluent UI')
  if (isCarbonComponent(element)) frameworks.push('Carbon Design System')

  // Vue-based frameworks
  if (isVuetifyComponent(element)) frameworks.push('Vuetify')
  if (isElementUIComponent(element)) frameworks.push('Element Plus')
  if (isQuasarComponent(element)) frameworks.push('Quasar')

  // Framework-agnostic / Web Components
  if (isShoelaceComponent(element)) frameworks.push('Shoelace')
  if (isIonicComponent(element)) frameworks.push('Ionic')

  // CSS-first frameworks
  if (isDaisyUIComponent(element)) frameworks.push('DaisyUI')
  if (isSemanticUIComponent(element)) frameworks.push('Semantic UI')

  return frameworks
}

// Score framework detection confidence with nuanced matching
export function scoreFrameworkMatch(element: any, ...frameworks: string[]): number {
  const detected = detectFramework(element)

  // No frameworks specified = no framework filtering needed
  if (frameworks.length === 0) return 0

  // No frameworks detected = no match
  if (detected.length === 0) return 0

  // Check for exact matches first (highest confidence)
  const exactMatch = frameworks.some(fw =>
    detected.some(d => d.toLowerCase() === fw.toLowerCase())
  )
  if (exactMatch) return 100

  // Check for partial matches (medium confidence)
  const partialMatch = frameworks.some(fw =>
    detected.some(d =>
      d.toLowerCase().includes(fw.toLowerCase()) ||
      fw.toLowerCase().includes(d.toLowerCase())
    )
  )
  if (partialMatch) return 80

  // No match
  return 0
}

// Get framework confidence score for a specific framework
export function getFrameworkConfidence(element: any, frameworkName: string): number {
  const selector = (element.selector || '').toLowerCase()
  const attrs = element.attributes || {}
  const styles = element.computedStyle || {}
  const tagName = (element.tagName || '').toLowerCase()

  let confidence = 0
  let signals = 0

  // Framework-specific confidence scoring
  switch (frameworkName.toLowerCase()) {
    case 'shadcn/ui':
    case 'shadcn':
      if (isShadcnComponent(element)) {
        confidence += 100
        signals++
      }
      if (isRadixComponent(element)) {
        confidence += 80 // shadcn is built on Radix
        signals++
      }
      break

    case 'radix ui':
    case 'radix':
      if (isRadixComponent(element)) {
        confidence += 100
        signals++
      }
      break

    case 'material ui':
    case 'mui':
      if (isMaterialUIComponent(element)) {
        confidence += 100
        signals++
      }
      break

    case 'chakra ui':
    case 'chakra':
      if (isChakraComponent(element)) {
        confidence += 100
        signals++
      }
      break

    case 'daisyui':
    case 'daisy':
      if (isDaisyUIComponent(element)) {
        confidence += 100
        signals++
      }
      break

    case 'bootstrap':
      // Bootstrap detection (common utility classes)
      if (selector.match(/\b(btn|card|modal|dropdown|nav|badge|alert|form-control)\b/)) {
        confidence += 60
        signals++
      }
      if (selector.includes('data-bs-')) {
        confidence += 40
        signals++
      }
      break

    case 'tailwind':
    case 'tailwindcss':
      // Tailwind detection (utility-first pattern)
      const tailwindUtilities = [
        'flex', 'grid', 'hidden', 'block', 'inline',
        'text-', 'bg-', 'border-', 'rounded-',
        'p-', 'm-', 'w-', 'h-',
        'hover:', 'focus:', 'active:'
      ]
      const tailwindMatches = tailwindUtilities.filter(util => selector.includes(util))
      if (tailwindMatches.length >= 3) {
        confidence += Math.min(100, tailwindMatches.length * 15)
        signals++
      }
      break
  }

  return signals > 0 ? Math.round(confidence / signals) : 0
}

// Detect if element uses utility-first CSS (Tailwind, UnoCSS, etc.)
export function isUtilityFirstCSS(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()

  // Count utility class patterns
  const utilityPatterns = [
    /\b(flex|grid|block|inline|hidden)\b/,
    /\btext-(xs|sm|base|lg|xl|2xl|3xl)\b/,
    /\bbg-(white|black|gray|red|blue|green|yellow)\b/,
    /\bborder(-\d+)?\b/,
    /\brounded(-\w+)?\b/,
    /\b[pm][trblxy]?-\d+\b/,  // padding/margin utilities
    /\b[wh]-(\d+|full|screen|auto)\b/,  // width/height utilities
    /\bhover:/, /\bfocus:/, /\bactive:/  // state variants
  ]

  const matches = utilityPatterns.filter(pattern => pattern.test(selector))

  // If 4 or more utility patterns detected, likely utility-first
  return matches.length >= 4
}

// Detect custom design system (no known framework)
export function isCustomDesignSystem(element: any): boolean {
  const detected = detectFramework(element)
  const selector = (element.selector || '').toLowerCase()
  const styles = element.computedStyle || {}

  // No known frameworks detected
  if (detected.length > 0) return false

  // Check for design system indicators
  const hasCustomVars = Object.keys(styles).some(prop =>
    prop.startsWith('--') &&
    !prop.startsWith('--radix-') &&
    !prop.startsWith('--chakra-') &&
    !prop.startsWith('--mantine-') &&
    !prop.startsWith('--fui-')
  )

  const hasBEMNaming = /[a-z]+(__[a-z]+)?(--[a-z]+)?/.test(selector)
  const hasComponentPrefix = /^[a-z]+-[a-z]+/.test(selector)

  return hasCustomVars || hasBEMNaming || hasComponentPrefix
}

/**
 * BEHAVIORAL ANALYSIS HELPER FUNCTIONS
 * Analyze component behavior patterns, interactions, and state changes
 */

// Analyze transition behavior patterns
export function hasTransitionPattern(element: any, pattern: 'instant' | 'smooth' | 'elastic'): boolean {
  const styles = element.computedStyle
  if (!styles?.transition || styles.transition === 'none') return false

  const transition = styles.transition.toLowerCase()

  // Parse transition timing
  const durationMatch = transition.match(/([\d.]+)s/)
  const duration = durationMatch ? parseFloat(durationMatch[1]) : 0

  const timingFunction = transition.match(/ease|linear|ease-in|ease-out|ease-in-out|cubic-bezier/)

  if (pattern === 'instant') {
    return duration < 0.1
  }

  if (pattern === 'smooth') {
    return duration >= 0.2 && duration <= 0.4 && timingFunction !== null
  }

  if (pattern === 'elastic') {
    return duration > 0.4 || transition.includes('cubic-bezier')
  }

  return false
}

// Detect animation presence and characteristics
export function hasAnimationPattern(element: any, type?: 'pulse' | 'spin' | 'bounce' | 'fade' | 'slide'): boolean {
  const styles = element.computedStyle
  if (!styles?.animation || styles.animation === 'none') return false

  const animation = styles.animation.toLowerCase()

  if (!type) return true // Any animation

  // Check for specific animation types
  const animationPatterns: Record<string, RegExp[]> = {
    pulse: [/pulse/i, /heartbeat/i],
    spin: [/spin/i, /rotate/i, /loading/i],
    bounce: [/bounce/i, /spring/i],
    fade: [/fade/i, /opacity/i],
    slide: [/slide/i, /translate/i]
  }

  const patterns = animationPatterns[type] || []
  return patterns.some(pattern => pattern.test(animation))
}

// Check for cursor interaction patterns
export function hasCursorInteraction(element: any, cursorType?: 'pointer' | 'grab' | 'text' | 'move' | 'resize'): boolean {
  const styles = element.computedStyle
  if (!styles?.cursor || styles.cursor === 'auto' || styles.cursor === 'default') return false

  if (!cursorType) return true // Any non-default cursor

  return styles.cursor.includes(cursorType)
}

// Detect transform-based interactions (scale, rotate, translate)
export function hasTransformInteraction(element: any, transformType?: 'scale' | 'rotate' | 'translate' | 'skew'): boolean {
  const styles = element.computedStyle

  // Check hover/focus/active states for transform
  const states = [element.hover, element.focus, element.active].filter(Boolean)

  for (const state of states) {
    const transform = state.computedStyle?.transform
    if (!transform || transform === 'none') continue

    if (!transformType) return true // Any transform

    const transformLower = transform.toLowerCase()

    if (transformType === 'scale' && transformLower.includes('scale')) return true
    if (transformType === 'rotate' && transformLower.includes('rotate')) return true
    if (transformType === 'translate' && transformLower.includes('translate')) return true
    if (transformType === 'skew' && transformLower.includes('skew')) return true
  }

  return false
}

// Detect state change visual feedback
export function hasStateChangeFeedback(element: any): boolean {
  const baseStyles = element.computedStyle
  if (!baseStyles) return false

  // Check if any state (hover, focus, active) has different styles
  const states = [
    { name: 'hover', styles: element.hover?.computedStyle },
    { name: 'focus', styles: element.focus?.computedStyle },
    { name: 'active', styles: element.active?.computedStyle }
  ]

  // Properties that indicate state feedback
  const feedbackProperties = [
    'backgroundColor', 'color', 'borderColor',
    'boxShadow', 'opacity', 'transform'
  ]

  for (const state of states) {
    if (!state.styles) continue

    for (const prop of feedbackProperties) {
      const baseValue = baseStyles[prop]
      const stateValue = state.styles[prop]

      if (baseValue !== stateValue && stateValue && stateValue !== 'none') {
        return true
      }
    }
  }

  return false
}

// Analyze ripple/wave effect patterns (common in Material Design)
export function hasRippleEffect(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const styles = element.computedStyle || {}

  // Check for ripple-related class names
  const hasRippleClass = /ripple|wave|splash/.test(selector)

  // Check for pseudo-elements that might be ripples
  const hasAfterBefore = selector.includes('::after') || selector.includes('::before')

  // Check for radial gradients (often used in ripple effects)
  const hasRadialGradient = styles.backgroundImage?.includes('radial-gradient')

  // Check for transform from center (ripple typically scales from center)
  const hasScaleTransform = styles.transform?.includes('scale')
  const hasCenterOrigin = styles.transformOrigin === '50% 50%' || styles.transformOrigin === 'center'

  return hasRippleClass || (hasAfterBefore && hasRadialGradient) || (hasScaleTransform && hasCenterOrigin)
}

// Detect loading/skeleton patterns
export function hasLoadingPattern(element: any): boolean {
  const selector = (element.selector || '').toLowerCase()
  const styles = element.computedStyle || {}

  // Loading class patterns
  const hasLoadingClass = /loading|skeleton|placeholder|shimmer/.test(selector)

  // Pulse animation
  const hasPulseAnimation = hasAnimationPattern(element, 'pulse')

  // Shimmer gradient animation
  const hasGradientAnimation =
    styles.backgroundImage?.includes('gradient') &&
    styles.animation !== 'none'

  // Low opacity (common in skeletons)
  const hasSkeletonOpacity =
    styles.opacity &&
    parseFloat(styles.opacity) >= 0.1 &&
    parseFloat(styles.opacity) <= 0.3

  return hasLoadingClass || hasPulseAnimation || hasGradientAnimation || hasSkeletonOpacity
}

// Detect focus trap patterns (modals, dialogs)
export function hasFocusTrap(element: any): boolean {
  const styles = element.computedStyle || {}
  const selector = (element.selector || '').toLowerCase()

  // High z-index (overlays)
  const hasHighZIndex = styles.zIndex && parseInt(styles.zIndex) > 1000

  // Fixed or absolute positioning
  const hasOverlayPosition = styles.position === 'fixed' || styles.position === 'absolute'

  // Modal/dialog class patterns
  const hasModalClass = /modal|dialog|overlay|lightbox/.test(selector)

  // Backdrop filter (glassmorphism effect common in modals)
  const hasBackdrop = styles.backdropFilter && styles.backdropFilter !== 'none'

  return (hasHighZIndex && hasOverlayPosition) || hasModalClass || hasBackdrop
}

// Detect drag-and-drop behavior indicators
export function hasDragBehavior(element: any): boolean {
  const styles = element.computedStyle || {}
  const selector = (element.selector || '').toLowerCase()

  // Drag cursor
  const hasDragCursor = hasCursorInteraction(element, 'grab') || hasCursorInteraction(element, 'move')

  // Draggable class patterns
  const hasDraggableClass = /drag|draggable|sortable|movable/.test(selector)

  // User-select none (prevents text selection during drag)
  const hasUserSelectNone = styles.userSelect === 'none'

  // Touch action none (for mobile drag)
  const hasTouchActionNone = styles.touchAction === 'none'

  return hasDragCursor || hasDraggableClass || (hasUserSelectNone && hasTouchActionNone)
}

// Analyze scroll behavior patterns
export function hasScrollBehavior(element: any, type?: 'smooth' | 'snap' | 'virtual'): boolean {
  const styles = element.computedStyle || {}
  const selector = (element.selector || '').toLowerCase()

  const hasOverflow = styles.overflow === 'auto' || styles.overflow === 'scroll' ||
                     styles.overflowY === 'auto' || styles.overflowY === 'scroll' ||
                     styles.overflowX === 'auto' || styles.overflowX === 'scroll'

  if (!type) return hasOverflow

  if (type === 'smooth') {
    return hasOverflow && styles.scrollBehavior === 'smooth'
  }

  if (type === 'snap') {
    return hasOverflow && (
      styles.scrollSnapType !== 'none' ||
      /scroll.*snap/.test(selector)
    )
  }

  if (type === 'virtual') {
    // Virtual scroll typically has fixed height and specific class patterns
    return hasOverflow && /virtual|infinite.*scroll|lazy.*load/.test(selector)
  }

  return false
}

// Detect tooltip/popover behavior
export function hasPopupBehavior(element: any): boolean {
  const styles = element.computedStyle || {}
  const selector = (element.selector || '').toLowerCase()

  // Popup class patterns
  const hasPopupClass = /tooltip|popover|popup|hint|dropdown/.test(selector)

  // Absolute/fixed positioning with z-index
  const hasPopupPosition =
    (styles.position === 'absolute' || styles.position === 'fixed') &&
    styles.zIndex && parseInt(styles.zIndex) > 100

  // Small size (tooltips are typically compact)
  const width = parseFloat(styles.width)
  const isCompact = width > 0 && width < 400

  // Arrow/triangle indicators (common in tooltips)
  const hasArrow = selector.includes('arrow') || selector.includes('triangle')

  return hasPopupClass || (hasPopupPosition && isCompact) || hasArrow
}

// Detect click/tap feedback (active state)
export function hasClickFeedback(element: any): boolean {
  const activeStyles = element.active?.computedStyle
  const baseStyles = element.computedStyle

  if (!activeStyles || !baseStyles) return false

  // Check for visual changes on active state
  const hasOpacityChange =
    activeStyles.opacity !== baseStyles.opacity &&
    parseFloat(activeStyles.opacity) < parseFloat(baseStyles.opacity || '1')

  const hasScaleChange =
    activeStyles.transform !== baseStyles.transform &&
    activeStyles.transform?.includes('scale')

  const hasBackgroundChange =
    activeStyles.backgroundColor !== baseStyles.backgroundColor

  const hasBorderChange =
    activeStyles.borderColor !== baseStyles.borderColor

  return hasOpacityChange || hasScaleChange || hasBackgroundChange || hasBorderChange
}

// Analyze hover elevation patterns (cards, buttons)
export function hasHoverElevation(element: any): boolean {
  const hoverStyles = element.hover?.computedStyle
  const baseStyles = element.computedStyle

  if (!hoverStyles || !baseStyles) return false

  // Check if box-shadow increases on hover
  const baseShadow = baseStyles.boxShadow || 'none'
  const hoverShadow = hoverStyles.boxShadow || 'none'

  if (baseShadow === 'none' && hoverShadow !== 'none') return true

  // Parse shadow blur radius to detect elevation increase
  const baseBlur = parseShadowBlur(baseShadow)
  const hoverBlur = parseShadowBlur(hoverShadow)

  return hoverBlur > baseBlur
}

// Helper to parse blur radius from box-shadow
function parseShadowBlur(shadow: string): number {
  if (!shadow || shadow === 'none') return 0
  const match = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
  return match ? parseInt(match[3]) : 0
}

// Detect disabled state patterns
export function hasDisabledState(element: any): boolean {
  const disabledStyles = element.disabled?.computedStyle
  const baseStyles = element.computedStyle
  const selector = (element.selector || '').toLowerCase()

  // Disabled class or attribute
  const hasDisabledClass = /disabled|inactive/.test(selector)
  const hasAriaDisabled = element.ariaDisabled === 'true'

  if (!disabledStyles) return hasDisabledClass || hasAriaDisabled

  // Visual indicators of disabled state
  const hasReducedOpacity =
    parseFloat(disabledStyles.opacity || '1') < parseFloat(baseStyles.opacity || '1')

  const hasGrayedOut =
    disabledStyles.color?.includes('gray') ||
    disabledStyles.backgroundColor?.includes('gray')

  const hasNotAllowedCursor = disabledStyles.cursor === 'not-allowed'

  return hasDisabledClass || hasAriaDisabled || hasReducedOpacity ||
         hasGrayedOut || hasNotAllowedCursor
}

// Score behavioral patterns
export function scoreBehavioralPatterns(element: any, componentType: string): number {
  const behaviors: boolean[] = []

  // Interactive components should have state feedback
  const interactiveTypes = ['button', 'input', 'select', 'checkbox', 'radio', 'switch', 'toggle']
  if (interactiveTypes.includes(componentType)) {
    behaviors.push(hasStateChangeFeedback(element))
    behaviors.push(hasCursorInteraction(element, 'pointer'))
    behaviors.push(hasClickFeedback(element))
  }

  // Overlay components should have focus trap patterns
  const overlayTypes = ['modal', 'dialog', 'drawer', 'alert-dialog']
  if (overlayTypes.includes(componentType)) {
    behaviors.push(hasFocusTrap(element))
    behaviors.push(hasTransitionPattern(element, 'smooth'))
  }

  // Cards and hoverable components
  const hoverableTypes = ['card', 'button']
  if (hoverableTypes.includes(componentType)) {
    behaviors.push(hasHoverElevation(element))
    behaviors.push(hasTransformInteraction(element, 'scale'))
  }

  // Loading components
  if (componentType === 'skeleton' || componentType === 'progress') {
    behaviors.push(hasLoadingPattern(element))
    behaviors.push(hasAnimationPattern(element))
  }

  // Tooltip/popover behavior
  if (componentType === 'tooltip' || componentType === 'popover') {
    behaviors.push(hasPopupBehavior(element))
    behaviors.push(hasTransitionPattern(element, 'instant') || hasTransitionPattern(element, 'smooth'))
  }

  // Scroll areas
  if (componentType === 'scroll-area') {
    behaviors.push(hasScrollBehavior(element))
  }

  // General interactive behavior
  behaviors.push(hasInteractiveTransition(element))

  // Calculate score based on matched behaviors
  const matchCount = behaviors.filter(Boolean).length
  const totalChecks = behaviors.length

  return totalChecks > 0 ? (matchCount / totalChecks) * 100 : 0
}
