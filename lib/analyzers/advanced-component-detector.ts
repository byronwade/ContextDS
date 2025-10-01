/**
 * Advanced Component Detection System
 *
 * Multi-strategy component detection using:
 * 1. CSS Selector Patterns - Common class names, data attributes
 * 2. Computed Styles Analysis - Visual characteristics
 * 3. ARIA Patterns - Accessibility attributes
 * 4. Semantic HTML - Element types and relationships
 * 5. Component Composition - Parent-child structure
 * 6. Visual Signatures - Unique visual properties
 */

import type { W3CDesignTokenSet } from './w3c-tokenizer'

// Component detection confidence levels
export type ConfidenceLevel = 'very-high' | 'high' | 'medium' | 'low'

// Comprehensive component type list (51 types)
export type ComponentType =
  | 'accordion'
  | 'alert'
  | 'alert-dialog'
  | 'aspect-ratio'
  | 'avatar'
  | 'badge'
  | 'breadcrumb'
  | 'button'
  | 'calendar'
  | 'card'
  | 'carousel'
  | 'chart'
  | 'checkbox'
  | 'collapsible'
  | 'combobox'
  | 'command'
  | 'context-menu'
  | 'data-table'
  | 'date-picker'
  | 'dialog'
  | 'drawer'
  | 'dropdown-menu'
  | 'form'
  | 'hover-card'
  | 'input'
  | 'input-otp'
  | 'label'
  | 'menubar'
  | 'navigation-menu'
  | 'pagination'
  | 'popover'
  | 'progress'
  | 'radio-group'
  | 'resizable'
  | 'scroll-area'
  | 'select'
  | 'separator'
  | 'sheet'
  | 'sidebar'
  | 'skeleton'
  | 'slider'
  | 'sonner'
  | 'switch'
  | 'table'
  | 'tabs'
  | 'textarea'
  | 'toast'
  | 'toggle'
  | 'toggle-group'
  | 'tooltip'
  | 'typography'

// Detection strategy weights (8 strategies total = 100%)
const STRATEGY_WEIGHTS = {
  cssSelector: 0.12,         // Class names, data attributes (12%)
  computedStyle: 0.08,       // Basic visual properties (8%)
  ariaPattern: 0.18,         // Accessibility attributes (18%)
  semanticHtml: 0.08,        // HTML element types (8%)
  composition: 0.08,         // Parent-child structure (8%)
  visualSignature: 0.12,     // Advanced visual fingerprints (12%)
  frameworkPattern: 0.17,    // Framework-specific patterns (17%)
  behavioralAnalysis: 0.17   // Interaction patterns and behavior (17%)
}

// Extracted component with full design tokens
export interface ExtractedComponent {
  type: ComponentType
  variant?: string
  confidence: number
  confidenceLevel: ConfidenceLevel
  usage: number
  selectors: string[]

  // Design Tokens - Base state
  tokens: {
    // Layout
    display?: string
    position?: string
    width?: string
    height?: string
    minWidth?: string
    maxWidth?: string
    minHeight?: string
    maxHeight?: string

    // Spacing
    padding?: string
    paddingTop?: string
    paddingRight?: string
    paddingBottom?: string
    paddingLeft?: string
    margin?: string
    marginTop?: string
    marginRight?: string
    marginBottom?: string
    marginLeft?: string
    gap?: string

    // Typography
    fontFamily?: string
    fontSize?: string
    fontWeight?: string
    lineHeight?: string
    letterSpacing?: string
    textAlign?: string
    textTransform?: string
    textDecoration?: string
    color?: string

    // Background
    backgroundColor?: string
    backgroundImage?: string
    backgroundSize?: string
    backgroundPosition?: string

    // Border
    border?: string
    borderWidth?: string
    borderStyle?: string
    borderColor?: string
    borderRadius?: string
    borderTopLeftRadius?: string
    borderTopRightRadius?: string
    borderBottomLeftRadius?: string
    borderBottomRightRadius?: string

    // Shadow & Effects
    boxShadow?: string
    textShadow?: string
    opacity?: string
    filter?: string
    backdropFilter?: string

    // Transform & Animation
    transform?: string
    transformOrigin?: string
    transition?: string
    animation?: string

    // Flexbox
    flexDirection?: string
    justifyContent?: string
    alignItems?: string
    alignContent?: string
    flexWrap?: string
    flex?: string

    // Grid
    gridTemplateColumns?: string
    gridTemplateRows?: string
    gridGap?: string

    // Other
    cursor?: string
    overflow?: string
    zIndex?: string
    userSelect?: string
  }

  // Interactive States
  states: {
    hover?: Partial<ExtractedComponent['tokens']>
    focus?: Partial<ExtractedComponent['tokens']>
    active?: Partial<ExtractedComponent['tokens']>
    disabled?: Partial<ExtractedComponent['tokens']>
    checked?: Partial<ExtractedComponent['tokens']>
    selected?: Partial<ExtractedComponent['tokens']>
    expanded?: Partial<ExtractedComponent['tokens']>
    pressed?: Partial<ExtractedComponent['tokens']>
  }

  // Component-specific metadata
  metadata: {
    // ARIA attributes
    role?: string
    ariaLabel?: string
    ariaDescribedBy?: string
    ariaExpanded?: string
    ariaChecked?: string
    ariaSelected?: string
    ariaHidden?: string
    ariaDisabled?: string

    // Structural info
    parentType?: ComponentType
    childTypes?: ComponentType[]
    siblings?: number
    depth?: number

    // Framework detection
    detectedFrameworks?: string[]
    frameworkConfidence?: Record<string, number>
    isUtilityFirst?: boolean
    isCustomDesignSystem?: boolean

    // Cross-element validation
    clusterSize?: number
    consistencyScore?: number
    repetitionBoost?: number
    isVariantFamily?: boolean
    isOutlier?: boolean

    // Detection details
    detectionStrategies: {
      cssSelector: number
      computedStyle: number
      ariaPattern: number
      semanticHtml: number
      composition: number
      visualSignature: number
      frameworkPattern: number
      behavioralAnalysis: number
    }
  }

  // Examples and usage
  examples: {
    html?: string
    css?: string
    usage?: string
  }
}

export interface ComponentLibrary {
  components: ExtractedComponent[]
  summary: {
    totalComponents: number
    byType: Record<ComponentType, number>
    averageConfidence: number
    detectionAccuracy: ConfidenceLevel
    frameworks?: {
      detected: string[]
      byFramework: Record<string, number>
      totalWithFramework: number
      utilityFirstCount: number
      customDesignSystemCount: number
    }
  }
}

/**
 * Advanced component detection from computed styles
 */
export function detectComponents(
  computedStyles: any[],
  tokenSet: W3CDesignTokenSet
): ComponentLibrary {
  const components: ExtractedComponent[] = []

  // Process each element
  for (const element of computedStyles) {
    const detectedComponents = detectComponentType(element)
    components.push(...detectedComponents)
  }

  // Deduplicate and aggregate
  const deduped = deduplicateComponents(components)

  // Apply cross-element validation (validates through repetition and consistency)
  const validated = applyCrossElementValidation(deduped)

  // Detect and filter outliers
  const withoutOutliers = detectOutliers(validated)

  // Calculate summary
  const summary = calculateSummary(withoutOutliers)

  return {
    components: withoutOutliers,
    summary
  }
}

/**
 * Detect component type using multiple strategies
 */
function detectComponentType(element: any): ExtractedComponent[] {
  const detected: ExtractedComponent[] = []

  // Try each component pattern
  const patterns = getAllComponentPatterns()

  for (const [type, pattern] of Object.entries(patterns)) {
    const scores = {
      cssSelector: pattern.cssSelector?.(element) ?? 0,
      computedStyle: pattern.computedStyle?.(element) ?? 0,
      ariaPattern: pattern.ariaPattern?.(element) ?? 0,
      semanticHtml: pattern.semanticHtml?.(element) ?? 0,
      composition: pattern.composition?.(element) ?? 0,
      visualSignature: pattern.visualSignature?.(element) ?? 0,
      frameworkPattern: pattern.frameworkPattern?.(element) ?? 0,
      behavioralAnalysis: pattern.behavioralAnalysis?.(element) ?? 0
    }

    // Calculate weighted confidence
    const confidence = calculateConfidence(scores)

    // Threshold: 50% confidence minimum
    if (confidence >= 50) {
      const component = extractComponentTokens(
        type as ComponentType,
        element,
        confidence,
        scores
      )
      detected.push(component)
    }
  }

  return detected
}

/**
 * Calculate weighted confidence score
 */
function calculateConfidence(scores: Record<string, number>): number {
  let totalScore = 0
  let totalWeight = 0

  for (const [strategy, score] of Object.entries(scores)) {
    const weight = STRATEGY_WEIGHTS[strategy as keyof typeof STRATEGY_WEIGHTS] || 0
    totalScore += score * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.min(100, (totalScore / totalWeight) * 100) : 0
}

/**
 * Extract complete design tokens from element
 */
function extractComponentTokens(
  type: ComponentType,
  element: any,
  confidence: number,
  detectionScores: Record<string, number>
): ExtractedComponent {
  const styles = element.computedStyle || {}
  const selector = element.selector || 'unknown'

  // Extract base tokens
  const tokens = extractBaseTokens(styles)

  // Extract state tokens
  const states = extractStateTokens(element)

  // Extract metadata
  const metadata = extractMetadata(element, detectionScores)

  // Determine confidence level
  const confidenceLevel = getConfidenceLevel(confidence)

  return {
    type,
    variant: detectVariant(type, styles),
    confidence: Math.round(confidence),
    confidenceLevel,
    usage: 1,
    selectors: [selector],
    tokens,
    states,
    metadata,
    examples: generateExamples(type, tokens, states)
  }
}

/**
 * Extract base CSS tokens from computed styles
 */
function extractBaseTokens(styles: any): ExtractedComponent['tokens'] {
  return {
    // Layout
    display: styles.display,
    position: styles.position,
    width: styles.width !== 'auto' ? styles.width : undefined,
    height: styles.height !== 'auto' ? styles.height : undefined,
    minWidth: styles.minWidth,
    maxWidth: styles.maxWidth,
    minHeight: styles.minHeight,
    maxHeight: styles.maxHeight,

    // Spacing
    padding: styles.padding,
    paddingTop: styles.paddingTop,
    paddingRight: styles.paddingRight,
    paddingBottom: styles.paddingBottom,
    paddingLeft: styles.paddingLeft,
    margin: styles.margin,
    marginTop: styles.marginTop,
    marginRight: styles.marginRight,
    marginBottom: styles.marginBottom,
    marginLeft: styles.marginLeft,
    gap: styles.gap,

    // Typography
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    lineHeight: styles.lineHeight,
    letterSpacing: styles.letterSpacing,
    textAlign: styles.textAlign,
    textTransform: styles.textTransform,
    textDecoration: styles.textDecoration,
    color: styles.color,

    // Background
    backgroundColor: styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ? styles.backgroundColor : undefined,
    backgroundImage: styles.backgroundImage !== 'none' ? styles.backgroundImage : undefined,
    backgroundSize: styles.backgroundSize,
    backgroundPosition: styles.backgroundPosition,

    // Border
    border: styles.border,
    borderWidth: styles.borderWidth,
    borderStyle: styles.borderStyle,
    borderColor: styles.borderColor,
    borderRadius: styles.borderRadius,
    borderTopLeftRadius: styles.borderTopLeftRadius,
    borderTopRightRadius: styles.borderTopRightRadius,
    borderBottomLeftRadius: styles.borderBottomLeftRadius,
    borderBottomRightRadius: styles.borderBottomRightRadius,

    // Shadow & Effects
    boxShadow: styles.boxShadow !== 'none' ? styles.boxShadow : undefined,
    textShadow: styles.textShadow !== 'none' ? styles.textShadow : undefined,
    opacity: styles.opacity !== '1' ? styles.opacity : undefined,
    filter: styles.filter !== 'none' ? styles.filter : undefined,
    backdropFilter: styles.backdropFilter !== 'none' ? styles.backdropFilter : undefined,

    // Transform & Animation
    transform: styles.transform !== 'none' ? styles.transform : undefined,
    transformOrigin: styles.transformOrigin,
    transition: styles.transition !== 'all 0s ease 0s' ? styles.transition : undefined,
    animation: styles.animation !== 'none' ? styles.animation : undefined,

    // Flexbox
    flexDirection: styles.flexDirection,
    justifyContent: styles.justifyContent,
    alignItems: styles.alignItems,
    alignContent: styles.alignContent,
    flexWrap: styles.flexWrap,
    flex: styles.flex,

    // Grid
    gridTemplateColumns: styles.gridTemplateColumns,
    gridTemplateRows: styles.gridTemplateRows,
    gridGap: styles.gridGap,

    // Other
    cursor: styles.cursor !== 'auto' ? styles.cursor : undefined,
    overflow: styles.overflow !== 'visible' ? styles.overflow : undefined,
    zIndex: styles.zIndex !== 'auto' ? styles.zIndex : undefined,
    userSelect: styles.userSelect !== 'auto' ? styles.userSelect : undefined
  }
}

/**
 * Extract state tokens (hover, focus, etc.)
 */
function extractStateTokens(element: any): ExtractedComponent['states'] {
  const states: ExtractedComponent['states'] = {}

  // Extract from pseudo-class styles if available
  if (element.hover) {
    states.hover = extractBaseTokens(element.hover)
  }
  if (element.focus) {
    states.focus = extractBaseTokens(element.focus)
  }
  if (element.active) {
    states.active = extractBaseTokens(element.active)
  }
  if (element.disabled) {
    states.disabled = extractBaseTokens(element.disabled)
  }

  return states
}

/**
 * Extract metadata
 */
function extractMetadata(element: any, detectionScores: Record<string, number>): ExtractedComponent['metadata'] {
  // Import framework detection functions
  const { detectFramework, isUtilityFirstCSS, isCustomDesignSystem, getFrameworkConfidence } = require('./component-patterns/types')

  // Detect frameworks
  const detectedFrameworks = detectFramework(element)
  const isUtilityFirst = isUtilityFirstCSS(element)
  const isCustom = isCustomDesignSystem(element)

  // Calculate confidence for each detected framework
  const frameworkConfidence: Record<string, number> = {}
  for (const framework of detectedFrameworks) {
    frameworkConfidence[framework] = getFrameworkConfidence(element, framework)
  }

  return {
    role: element.role,
    ariaLabel: element.ariaLabel,
    ariaDescribedBy: element.ariaDescribedBy,
    ariaExpanded: element.ariaExpanded,
    ariaChecked: element.ariaChecked,
    ariaSelected: element.ariaSelected,
    ariaHidden: element.ariaHidden,
    ariaDisabled: element.ariaDisabled,
    detectedFrameworks: detectedFrameworks.length > 0 ? detectedFrameworks : undefined,
    frameworkConfidence: Object.keys(frameworkConfidence).length > 0 ? frameworkConfidence : undefined,
    isUtilityFirst: isUtilityFirst || undefined,
    isCustomDesignSystem: isCustom || undefined,
    detectionStrategies: detectionScores
  }
}

/**
 * Detect variant from styles
 */
function detectVariant(type: ComponentType, styles: any): string | undefined {
  // Common variant patterns
  if (type === 'button') {
    if (styles.backgroundColor && styles.color) return 'solid'
    if (styles.borderWidth && !styles.backgroundColor) return 'outline'
    if (!styles.backgroundColor && !styles.borderWidth) return 'ghost'
  }

  if (type === 'badge') {
    if (styles.backgroundColor) return 'solid'
    if (styles.borderWidth) return 'outline'
  }

  if (type === 'alert') {
    if (styles.backgroundColor?.includes('red')) return 'destructive'
    if (styles.backgroundColor?.includes('yellow')) return 'warning'
    if (styles.backgroundColor?.includes('blue')) return 'info'
  }

  return undefined
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 90) return 'very-high'
  if (confidence >= 75) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}

/**
 * Generate usage examples
 */
function generateExamples(
  type: ComponentType,
  tokens: ExtractedComponent['tokens'],
  states: ExtractedComponent['states']
): ExtractedComponent['examples'] {
  return {
    usage: `Use for ${type} components with ${tokens.display || 'inline'} display`
  }
}

/**
 * Deduplicate similar components
 */
function deduplicateComponents(components: ExtractedComponent[]): ExtractedComponent[] {
  const grouped = new Map<string, ExtractedComponent[]>()

  // Group by type + variant
  for (const component of components) {
    const key = `${component.type}-${component.variant || 'default'}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(component)
  }

  // Merge duplicates
  const deduped: ExtractedComponent[] = []

  for (const [, group] of grouped) {
    if (group.length === 1) {
      deduped.push(group[0])
      continue
    }

    // Merge multiple instances
    const merged = group[0]
    merged.usage = group.length
    merged.selectors = [...new Set(group.flatMap(c => c.selectors))]
    merged.confidence = Math.min(100, Math.round(
      group.reduce((sum, c) => sum + c.confidence, 0) / group.length
    ))

    deduped.push(merged)
  }

  return deduped.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculate summary statistics
 */
function calculateSummary(components: ExtractedComponent[]): ComponentLibrary['summary'] {
  const byType: Record<string, number> = {}
  let totalConfidence = 0

  // Framework statistics
  const allFrameworks = new Set<string>()
  const byFramework: Record<string, number> = {}
  let totalWithFramework = 0
  let utilityFirstCount = 0
  let customDesignSystemCount = 0

  for (const component of components) {
    byType[component.type] = (byType[component.type] || 0) + 1
    totalConfidence += component.confidence

    // Track frameworks
    if (component.metadata.detectedFrameworks) {
      totalWithFramework++
      for (const framework of component.metadata.detectedFrameworks) {
        allFrameworks.add(framework)
        byFramework[framework] = (byFramework[framework] || 0) + 1
      }
    }

    // Track utility-first CSS usage
    if (component.metadata.isUtilityFirst) {
      utilityFirstCount++
    }

    // Track custom design systems
    if (component.metadata.isCustomDesignSystem) {
      customDesignSystemCount++
    }
  }

  const averageConfidence = components.length > 0
    ? totalConfidence / components.length
    : 0

  const summary: ComponentLibrary['summary'] = {
    totalComponents: components.length,
    byType: byType as Record<ComponentType, number>,
    averageConfidence: Math.min(100, Math.round(averageConfidence)),
    detectionAccuracy: getConfidenceLevel(Math.min(100, averageConfidence))
  }

  // Add framework statistics if any frameworks detected
  if (allFrameworks.size > 0 || utilityFirstCount > 0 || customDesignSystemCount > 0) {
    summary.frameworks = {
      detected: Array.from(allFrameworks).sort(),
      byFramework,
      totalWithFramework,
      utilityFirstCount,
      customDesignSystemCount
    }
  }

  return summary
}

/**
 * Cross-Element Pattern Matching
 * Validates component detection through repetition and consistency analysis
 */
interface PatternCluster {
  components: ExtractedComponent[]
  averageConfidence: number
  consistencyScore: number
  isVariantFamily: boolean
}

function applyCrossElementValidation(components: ExtractedComponent[]): ExtractedComponent[] {
  // Group components by type
  const byType = new Map<ComponentType, ExtractedComponent[]>()

  for (const component of components) {
    if (!byType.has(component.type)) {
      byType.set(component.type, [])
    }
    byType.get(component.type)!.push(component)
  }

  // Validate each component type
  const validated: ExtractedComponent[] = []

  for (const [type, typeComponents] of byType) {
    // Skip if only one instance (can't validate through repetition)
    if (typeComponents.length === 1) {
      validated.push(...typeComponents)
      continue
    }

    // Cluster components by similarity
    const clusters = clusterBySimilarity(typeComponents)

    // Analyze each cluster
    for (const cluster of clusters) {
      const validatedCluster = validateCluster(cluster, typeComponents.length)
      validated.push(...validatedCluster)
    }
  }

  return validated
}

/**
 * Cluster components by visual and structural similarity
 */
function clusterBySimilarity(components: ExtractedComponent[]): PatternCluster[] {
  const clusters: PatternCluster[] = []

  // Group by variant first
  const variantGroups = new Map<string, ExtractedComponent[]>()

  for (const component of components) {
    const variantKey = component.variant || 'default'
    if (!variantGroups.has(variantKey)) {
      variantGroups.set(variantKey, [])
    }
    variantGroups.get(variantKey)!.push(component)
  }

  // Create clusters from variant groups
  for (const [variant, groupComponents] of variantGroups) {
    // Calculate consistency score
    const consistencyScore = calculateConsistencyScore(groupComponents)

    // Calculate average confidence
    const averageConfidence =
      groupComponents.reduce((sum, c) => sum + c.confidence, 0) / groupComponents.length

    // Determine if this is a variant family (multiple variants with similar patterns)
    const isVariantFamily = variantGroups.size > 1

    clusters.push({
      components: groupComponents,
      averageConfidence,
      consistencyScore,
      isVariantFamily
    })
  }

  return clusters
}

/**
 * Calculate consistency score based on token similarity
 */
function calculateConsistencyScore(components: ExtractedComponent[]): number {
  if (components.length < 2) return 100

  // Compare key design tokens across components
  const keyTokens = [
    'borderRadius',
    'padding',
    'fontSize',
    'fontWeight',
    'display'
  ]

  let consistentCount = 0
  let totalChecks = 0

  for (const token of keyTokens) {
    const values = components
      .map(c => c.tokens[token as keyof typeof c.tokens])
      .filter(Boolean)

    if (values.length < 2) continue

    // Check if values are consistent
    const uniqueValues = new Set(values)
    totalChecks++

    // Allow for slight variations (e.g., "8px" vs "8.5px")
    if (uniqueValues.size === 1) {
      consistentCount++
    } else if (uniqueValues.size <= 2) {
      // Slight variation is acceptable
      consistentCount += 0.5
    }
  }

  return totalChecks > 0 ? (consistentCount / totalChecks) * 100 : 100
}

/**
 * Validate cluster and boost confidence based on patterns
 */
function validateCluster(cluster: PatternCluster, totalTypeCount: number): ExtractedComponent[] {
  const { components, consistencyScore, isVariantFamily } = cluster

  // Repetition boost: More instances = higher confidence
  const repetitionBoost = Math.min(components.length * 5, 15) // Max 15% boost

  // Consistency boost: Higher consistency = higher confidence
  const consistencyBoost = (consistencyScore / 100) * 10 // Max 10% boost

  // Variant family boost: If part of a variant family, boost confidence
  const variantFamilyBoost = isVariantFamily ? 5 : 0

  // Statistical significance: Large sample size increases confidence
  const sampleRatio = components.length / totalTypeCount
  const statisticalBoost = sampleRatio > 0.5 ? 5 : 0 // If >50% of type, boost by 5%

  // Total boost
  const totalBoost = repetitionBoost + consistencyBoost + variantFamilyBoost + statisticalBoost

  // Apply boost to all components in cluster
  return components.map(component => ({
    ...component,
    confidence: Math.min(100, component.confidence + totalBoost),
    confidenceLevel: getConfidenceLevel(
      Math.min(100, component.confidence + totalBoost)
    ) as ConfidenceLevel,
    metadata: {
      ...component.metadata,
      clusterSize: components.length,
      consistencyScore,
      repetitionBoost,
      isVariantFamily
    }
  }))
}

/**
 * Detect outliers - components that don't match the pattern
 */
function detectOutliers(components: ExtractedComponent[]): ExtractedComponent[] {
  const byType = new Map<ComponentType, ExtractedComponent[]>()

  for (const component of components) {
    if (!byType.has(component.type)) {
      byType.set(component.type, [])
    }
    byType.get(component.type)!.push(component)
  }

  const withoutOutliers: ExtractedComponent[] = []

  for (const [type, typeComponents] of byType) {
    if (typeComponents.length < 3) {
      // Not enough data to detect outliers
      withoutOutliers.push(...typeComponents)
      continue
    }

    // Calculate median confidence
    const confidences = typeComponents.map(c => c.confidence).sort((a, b) => a - b)
    const median = confidences[Math.floor(confidences.length / 2)]

    // Filter out components with confidence significantly below median
    const threshold = median * 0.6 // 60% of median

    for (const component of typeComponents) {
      if (component.confidence >= threshold) {
        withoutOutliers.push(component)
      } else {
        // Mark as low confidence outlier
        withoutOutliers.push({
          ...component,
          metadata: {
            ...component.metadata,
            isOutlier: true
          }
        })
      }
    }
  }

  return withoutOutliers
}

/**
 * Get all component patterns
 */
function getAllComponentPatterns(): Record<ComponentType, any> {
  const { patterns } = require('./component-patterns')
  return patterns
}
