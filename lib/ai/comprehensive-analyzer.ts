/**
 * Comprehensive AI-Powered Design System Analysis
 * Multi-layer analysis using GPT-4o for deep insights
 */

import { generateText, generateObject } from 'ai'
import { createGateway } from 'ai'
import { z } from 'zod'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

// Configure Vercel AI Gateway
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
})

// Comprehensive analysis schema
const AnalysisSchema = z.object({
  designSystemScore: z.object({
    overall: z.number().min(0).max(100),
    maturity: z.enum(['prototype', 'developing', 'mature', 'systematic', 'enterprise']),
    completeness: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
    scalability: z.number().min(0).max(100)
  }),

  componentArchitecture: z.object({
    detectedPatterns: z.array(z.string()),
    buttonVariants: z.array(z.string()),
    formComponents: z.array(z.string()),
    cardPatterns: z.array(z.string()),
    navigationPatterns: z.array(z.string()),
    complexity: z.enum(['simple', 'moderate', 'complex', 'enterprise']),
    reusability: z.number().min(0).max(100)
  }),

  accessibility: z.object({
    wcagLevel: z.enum(['A', 'AA', 'AAA', 'non-compliant']),
    contrastIssues: z.array(z.object({
      background: z.string(),
      foreground: z.string(),
      ratio: z.number(),
      recommendation: z.string()
    })),
    colorBlindness: z.object({
      safeForProtanopia: z.boolean(),
      safeForDeuteranopia: z.boolean(),
      safeForTritanopia: z.boolean(),
      recommendations: z.array(z.string())
    }),
    focusIndicators: z.object({
      present: z.boolean(),
      quality: z.enum(['poor', 'adequate', 'good', 'excellent'])
    }),
    overallScore: z.number().min(0).max(100)
  }),

  tokenNamingConventions: z.object({
    strategy: z.enum(['semantic', 'literal', 'mixed', 'inconsistent']),
    examples: z.array(z.object({
      token: z.string(),
      rating: z.enum(['excellent', 'good', 'poor']),
      suggestion: z.string().optional()
    })).optional(),
    consistencyScore: z.number().min(0).max(100),
    recommendations: z.array(z.string())
  }),

  designPatterns: z.object({
    identified: z.array(z.object({
      pattern: z.string().optional(),
      confidence: z.number(),
      examples: z.array(z.string()).optional()
    })),
    antiPatterns: z.array(z.object({
      issue: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      recommendation: z.string()
    }))
  }),

  brandIdentity: z.object({
    primaryColors: z.array(z.string()),
    colorPersonality: z.string(),
    typographicVoice: z.string(),
    visualStyle: z.array(z.string()),
    industryAlignment: z.string()
  }),

  recommendations: z.object({
    quick_wins: z.array(z.object({
      title: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      effort: z.enum(['low', 'medium', 'high'])
    })),
    long_term: z.array(z.object({
      title: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      effort: z.enum(['low', 'medium', 'high'])
    })),
    critical: z.array(z.object({
      issue: z.string(),
      solution: z.string()
    }))
  })
})

export type ComprehensiveAnalysis = z.infer<typeof AnalysisSchema>

/**
 * Generate comprehensive design system analysis
 */
export async function analyzeDesignSystemComprehensive(
  curatedTokens: CuratedTokenSet,
  metadata: {
    domain: string
    url: string
  }
): Promise<ComprehensiveAnalysis> {
  // Input validation
  if (!curatedTokens || !curatedTokens.colors || !Array.isArray(curatedTokens.colors)) {
    console.error('Invalid curatedTokens structure:', curatedTokens)
    return getMinimalFallback()
  }

  try {
    const prompt = buildComprehensivePrompt(curatedTokens, metadata)

    // Use GPT-4o for advanced reasoning and structured output
    const { object } = await generateObject({
      model: gateway('openai/gpt-4o'), // Most capable model for deep analysis
      schema: AnalysisSchema,
      prompt,
      temperature: 0.4, // Balanced creativity and consistency
      maxTokens: 4000
    })

    return object
  } catch (error) {
    console.error('Comprehensive AI analysis failed:', error)

    try {
      return generateEnhancedFallback(curatedTokens, metadata)
    } catch (fallbackError) {
      console.error('Fallback analysis also failed:', fallbackError)
      return getMinimalFallback()
    }
  }
}

/**
 * Minimal fallback when all analysis fails
 */
function getMinimalFallback(): ComprehensiveAnalysis {
  return {
    designSystemScore: {
      overall: 50,
      maturity: 'developing',
      completeness: 40,
      consistency: 50,
      scalability: 50
    },
    componentArchitecture: {
      detectedPatterns: [],
      buttonVariants: [],
      formComponents: [],
      cardPatterns: [],
      navigationPatterns: [],
      complexity: 'simple',
      reusability: 50
    },
    accessibility: {
      wcagLevel: 'A',
      contrastIssues: [],
      colorBlindness: {
        safeForProtanopia: true,
        safeForDeuteranopia: true,
        safeForTritanopia: true,
        recommendations: ['Unable to analyze accessibility']
      },
      focusIndicators: {
        present: false,
        quality: 'poor'
      },
      overallScore: 50
    },
    tokenNamingConventions: {
      strategy: 'inconsistent',
      examples: [],
      consistencyScore: 50,
      recommendations: ['Unable to analyze token naming']
    },
    designPatterns: {
      identified: [],
      antiPatterns: []
    },
    brandIdentity: {
      primaryColors: [],
      colorPersonality: 'Unknown',
      typographicVoice: 'Unknown',
      visualStyle: ['Unable to analyze'],
      industryAlignment: 'Unknown'
    },
    recommendations: {
      quick_wins: [],
      long_term: [],
      critical: []
    }
  }
}

/**
 * Build comprehensive analysis prompt
 */
function buildComprehensivePrompt(tokens: CuratedTokenSet, metadata: { domain: string }): string {
  // Prepare detailed token data
  const colorAnalysis = tokens.colors.map(c =>
    `${c.value} (${c.semantic || 'unnamed'}, ${c.percentage}% usage, ${c.confidence}% confidence)`
  ).join('\n  ')

  const fontAnalysis = tokens.typography.families.map(f =>
    `${f.value} (${f.semantic || 'unnamed'}, ${f.percentage}% usage)`
  ).join('\n  ')

  const spacingAnalysis = tokens.spacing.map(s =>
    `${s.value} (${s.percentage}% usage)`
  ).join(', ')

  const radiusAnalysis = tokens.radius.map(r =>
    `${r.value} (${r.percentage}% usage)`
  ).join(', ')

  const shadowAnalysis = tokens.shadows.map(s =>
    `${s.value} (${s.percentage}% usage)`
  ).join('\n  ')

  return `You are a senior design system architect analyzing "${metadata.domain}". Provide comprehensive, actionable insights.

EXTRACTED DESIGN TOKENS:

Colors (${tokens.colors.length} total):
  ${colorAnalysis}

Typography (${tokens.typography.families.length} families):
  ${fontAnalysis}

Font Sizes (${tokens.typography.sizes.length}):
  ${tokens.typography.sizes.map(s => s.value).join(', ')}

Font Weights (${tokens.typography.weights.length}):
  ${tokens.typography.weights.map(w => w.value).join(', ')}

Spacing System (${tokens.spacing.length} values):
  ${spacingAnalysis}

Border Radius (${tokens.radius.length} values):
  ${radiusAnalysis}

Shadows (${tokens.shadows.length} elevations):
  ${shadowAnalysis}

Motion/Transitions (${tokens.motion.length}):
  ${tokens.motion.map(m => m.value).join(', ')}

ANALYSIS REQUIREMENTS:

1. DESIGN SYSTEM SCORING:
   - Calculate overall maturity (0-100)
   - Assess completeness, consistency, scalability
   - Classify maturity level (prototype → enterprise)

2. COMPONENT ARCHITECTURE:
   - Detect button variants, form patterns, card types
   - Identify navigation patterns
   - Assess component complexity and reusability
   - List specific detected patterns

3. ACCESSIBILITY AUDIT:
   - Check color contrast ratios
   - Evaluate WCAG compliance level
   - Test for colorblindness safety
   - Assess focus indicator quality
   - Provide specific contrast issues with recommendations

4. TOKEN NAMING:
   - Analyze naming strategy (semantic vs literal)
   - Rate specific token names (excellent/good/poor)
   - Suggest improvements for poorly named tokens
   - Calculate naming consistency score

5. DESIGN PATTERNS:
   - Identify industry-standard patterns used
   - Flag anti-patterns and issues (severity: low/medium/high/critical)
   - Provide specific examples and recommendations

6. BRAND IDENTITY:
   - Determine primary brand colors
   - Describe color personality and mood
   - Analyze typographic voice
   - Identify visual style keywords
   - Suggest industry alignment
   - Compare to similar brands if recognizable

7. ACTIONABLE RECOMMENDATIONS:
   - Quick wins (high impact, low effort)
   - Long-term improvements (strategic)
   - Critical issues requiring immediate attention

Provide specific, technical, actionable insights. Reference exact token values when making recommendations.`
}

/**
 * Enhanced rule-based fallback with deeper analysis
 */
function generateEnhancedFallback(tokens: CuratedTokenSet, metadata: { domain: string }): ComprehensiveAnalysis {
  // Component detection
  const hasButtons = tokens.radius.some(r => parseFloat(r.value) > 20) // Rounded buttons
  const hasForms = tokens.spacing.length >= 6 && tokens.radius.length >= 2
  const hasCards = tokens.shadows.length >= 2
  const hasNav = tokens.colors.length >= 5 // Likely has navigation states

  const buttonVariants = detectButtonVariants(tokens)
  const formComponents = hasForms ? ['Input fields', 'Form layouts', 'Field spacing'] : []
  const cardPatterns = hasCards ? ['Card elevation', 'Shadow hierarchy'] : []
  const navPatterns = hasNav ? ['Navigation states', 'Active indicators'] : []

  // Accessibility scoring
  const contrastIssues = detectContrastIssues(tokens.colors)
  const wcagLevel = contrastIssues.length === 0 ? 'AAA' : contrastIssues.length < 3 ? 'AA' : 'A'
  const accessibilityScore = Math.max(40, 100 - (contrastIssues.length * 15))

  // Naming analysis
  const namingStrategy = analyzeNamingStrategy(tokens)
  const namingExamples = tokens.colors.slice(0, 3).map(c => ({
    token: c.name,
    rating: c.semantic ? 'good' as const : 'poor' as const,
    suggestion: c.semantic ? undefined : `Consider semantic name like "primary-blue" or "accent"`
  }))

  // Pattern detection
  const patterns = detectDesignPatterns(tokens)
  const antiPatterns = detectAntiPatterns(tokens)

  // Maturity assessment
  const totalTokens = tokens.colors.length + tokens.typography.families.length +
                     tokens.spacing.length + tokens.radius.length + tokens.shadows.length
  const maturity = totalTokens >= 30 ? 'systematic' :
                  totalTokens >= 20 ? 'mature' :
                  totalTokens >= 10 ? 'developing' : 'prototype'

  const consistencyScore = calculateConsistencyScore(tokens)

  return {
    designSystemScore: {
      overall: Math.min(100, Math.round((consistencyScore + accessibilityScore + (totalTokens * 2)) / 3)),
      maturity,
      completeness: Math.min(100, totalTokens * 3),
      consistency: Math.min(100, consistencyScore),
      scalability: tokens.spacing.length >= 8 ? 90 : 70
    },

    componentArchitecture: {
      detectedPatterns: [
        ...buttonVariants.map(v => `Button: ${v}`),
        ...formComponents,
        ...cardPatterns,
        ...navPatterns
      ],
      buttonVariants,
      formComponents,
      cardPatterns,
      navigationPatterns: navPatterns,
      complexity: totalTokens > 30 ? 'complex' : totalTokens > 15 ? 'moderate' : 'simple',
      reusability: hasCards && hasForms && hasButtons ? 85 : 65
    },

    accessibility: {
      wcagLevel,
      contrastIssues,
      colorBlindness: {
        safeForProtanopia: true,
        safeForDeuteranopia: true,
        safeForTritanopia: true,
        recommendations: contrastIssues.length > 0
          ? ['Review color contrast for better accessibility']
          : ['Color palette appears accessible']
      },
      focusIndicators: {
        present: tokens.colors.some(c => c.semantic?.includes('Focus')),
        quality: 'adequate'
      },
      overallScore: accessibilityScore
    },

    tokenNamingConventions: {
      strategy: namingStrategy,
      examples: namingExamples,
      consistencyScore: namingStrategy === 'semantic' ? 90 : namingStrategy === 'mixed' ? 70 : 50,
      recommendations: namingStrategy === 'literal'
        ? ['Adopt semantic naming (e.g., "primary" instead of "blue-500")']
        : ['Maintain consistent naming strategy across all token categories']
    },

    designPatterns: {
      identified: patterns,
      antiPatterns
    },

    brandIdentity: {
      primaryColors: tokens.colors.slice(0, 3).map(c => c.value),
      colorPersonality: inferColorPersonality(tokens.colors),
      typographicVoice: inferTypographicVoice(tokens.typography),
      visualStyle: inferVisualStyle(tokens),
      industryAlignment: inferIndustry(metadata.domain)
    },

    recommendations: {
      quick_wins: generateQuickWins(tokens, antiPatterns),
      long_term: generateLongTermImprovements(tokens, maturity),
      critical: antiPatterns
        .filter(ap => ap.severity === 'critical' || ap.severity === 'high')
        .map(ap => ({
          issue: ap.issue,
          solution: ap.recommendation
        }))
    }
  }
}

/**
 * Helper: Detect button variants from radius and spacing
 */
function detectButtonVariants(tokens: CuratedTokenSet): string[] {
  const variants: string[] = []

  // Check for rounded buttons
  if (tokens.radius.some(r => parseFloat(r.value) >= 24)) {
    variants.push('Pill/Rounded')
  }

  // Check for sharp buttons
  if (tokens.radius.some(r => parseFloat(r.value) <= 4)) {
    variants.push('Sharp/Minimal')
  }

  // Check for medium radius (most common)
  if (tokens.radius.some(r => {
    const val = parseFloat(r.value)
    return val > 4 && val < 12
  })) {
    variants.push('Standard/Rounded')
  }

  // Check for size variations
  if (tokens.spacing.length >= 5) {
    variants.push('Multiple sizes (sm/md/lg)')
  }

  return variants.length > 0 ? variants : ['Standard buttons']
}

/**
 * Helper: Detect potential contrast issues
 */
function detectContrastIssues(colors: any[]): Array<{
  background: string
  foreground: string
  ratio: number
  recommendation: string
}> {
  const issues: Array<any> = []

  // Simple heuristic: check very light colors against white, very dark against black
  const lightColors = colors.filter(c => {
    const hex = c.value.toLowerCase()
    return hex.includes('fff') || hex.includes('faf') || hex.includes('f5f')
  })

  if (lightColors.length > 3) {
    issues.push({
      background: '#ffffff',
      foreground: lightColors[0].value,
      ratio: 1.2, // Estimated
      recommendation: 'Ensure sufficient contrast between light colors and white backgrounds'
    })
  }

  return issues
}

/**
 * Helper: Analyze naming strategy
 */
function analyzeNamingStrategy(tokens: CuratedTokenSet): 'semantic' | 'literal' | 'mixed' | 'inconsistent' {
  const semanticCount = tokens.colors.filter(c => c.semantic?.match(/primary|secondary|accent|neutral/i)).length
  const literalCount = tokens.colors.filter(c => c.name?.match(/blue|red|green|gray/i)).length

  if (semanticCount > literalCount * 2) return 'semantic'
  if (literalCount > semanticCount * 2) return 'literal'
  return 'mixed'
}

/**
 * Helper: Detect design patterns
 */
function detectDesignPatterns(tokens: CuratedTokenSet): Array<{
  pattern: string
  confidence: number
  examples: string[]
}> {
  const patterns: Array<any> = []

  // Spacing scale pattern
  if (tokens.spacing.length >= 6) {
    patterns.push({
      pattern: '8-point grid system',
      confidence: 85,
      examples: tokens.spacing.slice(0, 4).map(s => s.value)
    })
  }

  // Elevation system
  if (tokens.shadows.length >= 3) {
    patterns.push({
      pattern: 'Material Design elevation system',
      confidence: 75,
      examples: tokens.shadows.slice(0, 3).map(s => s.value)
    })
  }

  // Typography scale
  if (tokens.typography.sizes.length >= 5) {
    patterns.push({
      pattern: 'Modular type scale',
      confidence: 80,
      examples: tokens.typography.sizes.slice(0, 5).map(s => s.value)
    })
  }

  // Color system
  if (tokens.colors.length >= 8) {
    patterns.push({
      pattern: 'Systematic color palette',
      confidence: 90,
      examples: tokens.colors.slice(0, 8).map(c => c.value)
    })
  }

  return patterns
}

/**
 * Helper: Detect anti-patterns and issues
 */
function detectAntiPatterns(tokens: CuratedTokenSet): Array<{
  issue: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}> {
  const antiPatterns: Array<any> = []

  // Too few colors
  if (tokens.colors.length < 4) {
    antiPatterns.push({
      issue: 'Insufficient color palette',
      severity: 'medium',
      recommendation: 'Add neutral grays and accent colors for better hierarchy and feedback states'
    })
  }

  // Too many colors (inconsistent)
  if (tokens.colors.length > 20) {
    antiPatterns.push({
      issue: 'Excessive color variations',
      severity: 'medium',
      recommendation: 'Consolidate similar colors to improve consistency and maintainability'
    })
  }

  // Only one font family
  if (tokens.typography.families.length === 1) {
    antiPatterns.push({
      issue: 'Single font family - limited typographic hierarchy',
      severity: 'low',
      recommendation: 'Consider adding a complementary font for headings or code blocks'
    })
  }

  // No spacing system
  if (tokens.spacing.length < 4) {
    antiPatterns.push({
      issue: 'Underdeveloped spacing system',
      severity: 'high',
      recommendation: 'Establish a consistent spacing scale (4px or 8px base) for layout consistency'
    })
  }

  // No shadows (lack of depth)
  if (tokens.shadows.length === 0) {
    antiPatterns.push({
      issue: 'No elevation/shadow system',
      severity: 'low',
      recommendation: 'Add subtle shadows to create visual hierarchy and depth'
    })
  }

  // Inconsistent radius values
  if (tokens.radius.length > 8) {
    antiPatterns.push({
      issue: 'Too many border radius values',
      severity: 'medium',
      recommendation: 'Standardize to 3-4 radius values (e.g., none, sm, md, lg, full)'
    })
  }

  return antiPatterns
}

/**
 * Helper: Calculate consistency score
 */
function calculateConsistencyScore(tokens: CuratedTokenSet): number {
  let score = 50 // Base score

  // Reward systematic spacing
  if (tokens.spacing.length >= 6 && tokens.spacing.length <= 12) score += 15

  // Reward color palette balance
  if (tokens.colors.length >= 6 && tokens.colors.length <= 16) score += 15

  // Reward typography scale
  if (tokens.typography.sizes.length >= 4 && tokens.typography.sizes.length <= 8) score += 10

  // Reward shadow system
  if (tokens.shadows.length >= 2 && tokens.shadows.length <= 6) score += 10

  return Math.min(100, score)
}

/**
 * Helper: Infer color personality
 */
function inferColorPersonality(colors: any[]): string {
  const hasBlues = colors.some(c => c.value.match(/#[0-4][0-9a-f]{2}[8-f][0-9a-f]/i))
  const hasReds = colors.some(c => c.value.match(/#[ef][0-9a-f][0-4]/i))
  const hasPurples = colors.some(c => c.value.match(/#[6-9][0-4][a-f]/i))

  if (hasBlues && !hasReds) return 'Trustworthy, professional, technical'
  if (hasReds && hasBlues) return 'Bold, energetic, action-oriented'
  if (hasPurples) return 'Creative, innovative, premium'
  return 'Balanced, modern, versatile'
}

/**
 * Helper: Infer typographic voice
 */
function inferTypographicVoice(typography: any): string {
  const families = typography.families.map((f: any) => f.value.toLowerCase())

  const hasSerif = families.some((f: string) => f.includes('serif') && !f.includes('sans'))
  const hasMono = families.some((f: string) => f.includes('mono') || f.includes('code'))
  const hasGeometric = families.some((f: string) => f.includes('geist') || f.includes('inter') || f.includes('helvetica'))

  if (hasSerif && hasMono) return 'Traditional yet technical'
  if (hasSerif) return 'Classic, editorial, authoritative'
  if (hasMono && hasGeometric) return 'Modern, developer-focused, precise'
  if (hasMono) return 'Technical, code-centric'
  if (hasGeometric) return 'Clean, modern, minimalist'
  return 'Contemporary, approachable'
}

/**
 * Helper: Infer visual style
 */
function inferVisualStyle(tokens: CuratedTokenSet): string[] {
  const styles: string[] = []

  // Rounded vs sharp
  const avgRadius = tokens.radius.reduce((sum, r) => sum + parseFloat(r.value), 0) / tokens.radius.length
  if (avgRadius > 12) styles.push('Soft/Rounded')
  else if (avgRadius < 4) styles.push('Sharp/Geometric')
  else styles.push('Balanced roundness')

  // Shadow depth
  if (tokens.shadows.length >= 4) styles.push('Rich elevation')
  else if (tokens.shadows.length <= 1) styles.push('Flat/Minimal')

  // Color richness
  if (tokens.colors.length >= 12) styles.push('Vibrant palette')
  else if (tokens.colors.length <= 5) styles.push('Minimalist')

  return styles
}

/**
 * Helper: Infer industry
 */
function inferIndustry(domain: string): string {
  const d = domain.toLowerCase()

  if (d.includes('stripe') || d.includes('pay')) return 'FinTech/Payments'
  if (d.includes('github') || d.includes('code')) return 'Developer Tools'
  if (d.includes('linear') || d.includes('notion')) return 'Productivity/SaaS'
  if (d.includes('figma') || d.includes('design')) return 'Design Tools'
  if (d.includes('vercel') || d.includes('deploy')) return 'Cloud Infrastructure'

  return 'Technology/SaaS'
}

/**
 * Helper: Generate quick wins
 */
function generateQuickWins(tokens: CuratedTokenSet, antiPatterns: any[]): Array<{
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
}> {
  const wins: Array<any> = []

  // Add focus states if missing
  if (!tokens.colors.some(c => c.semantic?.includes('Focus'))) {
    wins.push({
      title: 'Add focus indicator colors',
      description: 'Define dedicated colors for keyboard focus states to improve accessibility',
      impact: 'high',
      effort: 'low'
    })
  }

  // Consolidate radius values if too many
  if (tokens.radius.length > 6) {
    wins.push({
      title: 'Standardize border radius values',
      description: `Reduce ${tokens.radius.length} radius values to 4-5 standard options`,
      impact: 'medium',
      effort: 'low'
    })
  }

  // Add shadows if missing
  if (tokens.shadows.length === 0) {
    wins.push({
      title: 'Create elevation system',
      description: 'Add 3-4 shadow values for cards, modals, and dropdowns',
      impact: 'medium',
      effort: 'low'
    })
  }

  return wins.slice(0, 5)
}

/**
 * Helper: Generate long-term improvements
 */
function generateLongTermImprovements(tokens: CuratedTokenSet, maturity: string): Array<{
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
}> {
  const improvements: Array<any> = []

  if (maturity === 'prototype' || maturity === 'developing') {
    improvements.push({
      title: 'Establish design token documentation',
      description: 'Document usage guidelines and component patterns for consistency',
      impact: 'high',
      effort: 'high'
    })
  }

  improvements.push({
    title: 'Create semantic naming system',
    description: 'Migrate to semantic token names (primary, secondary, etc.) instead of literal colors',
    impact: 'high',
    effort: 'medium'
  })

  improvements.push({
    title: 'Build component library',
    description: 'Codify patterns into reusable components with Storybook or similar',
    impact: 'high',
    effort: 'high'
  })

  return improvements.slice(0, 4)
}