import { analyze } from '@projectwallace/css-analyzer'
import type { CSSSource } from '../extractors/css-extractor'

export interface AnalysisResult {
  colors: ColorToken[]
  typography: TypographyToken[]
  spacing: SpacingToken[]
  radius: RadiusToken[]
  shadows: ShadowToken[]
  motion: MotionToken[]
  metadata: AnalysisMetadata
}

export interface ColorToken {
  name: string
  value: string
  type: 'color'
  hex?: string
  rgb?: { r: number; g: number; b: number }
  hsl?: { h: number; s: number; l: number }
  usage: number
  confidence: number
}

export interface TypographyToken {
  name: string
  value: string
  type: 'typography'
  property: 'font-family' | 'font-size' | 'line-height' | 'font-weight'
  usage: number
  confidence: number
}

export interface SpacingToken {
  name: string
  value: string
  type: 'spacing'
  property: 'margin' | 'padding' | 'gap'
  usage: number
  confidence: number
}

export interface RadiusToken {
  name: string
  value: string
  type: 'radius'
  usage: number
  confidence: number
}

export interface ShadowToken {
  name: string
  value: string
  type: 'shadow'
  usage: number
  confidence: number
}

export interface MotionToken {
  name: string
  value: string
  type: 'motion'
  property: 'transition-duration' | 'animation-duration' | 'transition-timing-function'
  usage: number
  confidence: number
}

export interface AnalysisMetadata {
  totalRules: number
  totalDeclarations: number
  totalSelectors: number
  complexity: number
  duplicates: number
  analyzedAt: string
}

export class CSSAnalyzer {
  private colorFrequency = new Map<string, number>()
  private typographyFrequency = new Map<string, number>()
  private spacingFrequency = new Map<string, number>()
  private radiusFrequency = new Map<string, number>()
  private shadowFrequency = new Map<string, number>()
  private motionFrequency = new Map<string, number>()

  async analyzeCSSSources(sources: CSSSource[]): Promise<AnalysisResult> {
    // Combine all CSS content
    const combinedCSS = sources
      .map(source => source.content)
      .join('\\n')

    // Use Project Wallace analyzer for detailed metrics
    const wallaceAnalysis = analyze(combinedCSS)

    // Extract tokens from the analysis
    const colors = this.extractColors(wallaceAnalysis)
    const typography = this.extractTypography(wallaceAnalysis)
    const spacing = this.extractSpacing(wallaceAnalysis)
    const radius = this.extractRadius(wallaceAnalysis)
    const shadows = this.extractShadows(wallaceAnalysis)
    const motion = this.extractMotion(wallaceAnalysis)

    const metadata: AnalysisMetadata = {
      totalRules: wallaceAnalysis.rules?.total || 0,
      totalDeclarations: wallaceAnalysis.declarations?.total || 0,
      totalSelectors: wallaceAnalysis.selectors?.total || 0,
      complexity: wallaceAnalysis.rules?.total || 0,
      duplicates: wallaceAnalysis.declarations?.unique || 0,
      analyzedAt: new Date().toISOString()
    }

    return {
      colors,
      typography,
      spacing,
      radius,
      shadows,
      motion,
      metadata
    }
  }

  private extractColors(analysis: any): ColorToken[] {
    const colors: ColorToken[] = []

    if (analysis.colors?.unique) {
      analysis.colors.unique.forEach((color: any, index: number) => {
        const usage = analysis.colors.totalUniqueColorValues?.[index] || 1

        colors.push({
          name: this.generateColorName(color, index),
          value: color,
          type: 'color',
          hex: this.normalizeColorToHex(color),
          usage,
          confidence: this.calculateConfidence(usage, analysis.colors.total || 1)
        })
      })
    }

    return this.sortByUsage(colors)
  }

  private extractTypography(analysis: any): TypographyToken[] {
    const typography: TypographyToken[] = []

    // Font families
    if (analysis.declarations?.byProperty?.['font-family']) {
      analysis.declarations.byProperty['font-family'].forEach((decl: any, index: number) => {
        typography.push({
          name: this.generateFontFamilyName(decl.value, index),
          value: decl.value,
          type: 'typography',
          property: 'font-family',
          usage: decl.count || 1,
          confidence: this.calculateConfidence(decl.count || 1, analysis.declarations.total)
        })
      })
    }

    // Font sizes
    if (analysis.declarations?.byProperty?.['font-size']) {
      analysis.declarations.byProperty['font-size'].forEach((decl: any, index: number) => {
        typography.push({
          name: this.generateFontSizeName(decl.value, index),
          value: decl.value,
          type: 'typography',
          property: 'font-size',
          usage: decl.count || 1,
          confidence: this.calculateConfidence(decl.count || 1, analysis.declarations.total)
        })
      })
    }

    return this.sortByUsage(typography)
  }

  private extractSpacing(analysis: any): SpacingToken[] {
    const spacing: SpacingToken[] = []
    const spacingProperties = ['margin', 'padding', 'gap', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right']

    spacingProperties.forEach(property => {
      if (analysis.declarations?.byProperty?.[property]) {
        analysis.declarations.byProperty[property].forEach((decl: any, index: number) => {
          spacing.push({
            name: this.generateSpacingName(decl.value, property, index),
            value: decl.value,
            type: 'spacing',
            property: property.includes('margin') ? 'margin' : property.includes('padding') ? 'padding' : 'gap',
            usage: decl.count || 1,
            confidence: this.calculateConfidence(decl.count || 1, analysis.declarations.total)
          })
        })
      }
    })

    return this.sortByUsage(spacing)
  }

  private extractRadius(analysis: any): RadiusToken[] {
    const radius: RadiusToken[] = []

    if (analysis.declarations?.byProperty?.['border-radius']) {
      analysis.declarations.byProperty['border-radius'].forEach((decl: any, index: number) => {
        radius.push({
          name: this.generateRadiusName(decl.value, index),
          value: decl.value,
          type: 'radius',
          usage: decl.count || 1,
          confidence: this.calculateConfidence(decl.count || 1, analysis.declarations.total)
        })
      })
    }

    return this.sortByUsage(radius)
  }

  private extractShadows(analysis: any): ShadowToken[] {
    const shadows: ShadowToken[] = []

    if (analysis.declarations?.byProperty?.['box-shadow']) {
      analysis.declarations.byProperty['box-shadow'].forEach((decl: any, index: number) => {
        shadows.push({
          name: this.generateShadowName(decl.value, index),
          value: decl.value,
          type: 'shadow',
          usage: decl.count || 1,
          confidence: this.calculateConfidence(decl.count || 1, analysis.declarations.total)
        })
      })
    }

    return this.sortByUsage(shadows)
  }

  private extractMotion(analysis: any): MotionToken[] {
    const motion: MotionToken[] = []
    const motionProperties = ['transition-duration', 'animation-duration', 'transition-timing-function']

    motionProperties.forEach(property => {
      if (analysis.declarations?.byProperty?.[property]) {
        analysis.declarations.byProperty[property].forEach((decl: any, index: number) => {
          motion.push({
            name: this.generateMotionName(decl.value, property, index),
            value: decl.value,
            type: 'motion',
            property: property as any,
            usage: decl.count || 1,
            confidence: this.calculateConfidence(decl.count || 1, analysis.declarations.total)
          })
        })
      }
    })

    return this.sortByUsage(motion)
  }

  // Helper methods for token naming
  private generateColorName(color: string, index: number): string {
    // Try to detect semantic meaning
    const normalized = this.normalizeColorToHex(color)
    if (normalized) {
      const { r, g, b } = this.hexToRgb(normalized) || { r: 0, g: 0, b: 0 }

      // Basic color categorization
      if (r > 200 && g < 100 && b < 100) return `red-${index + 1}`
      if (r < 100 && g > 200 && b < 100) return `green-${index + 1}`
      if (r < 100 && g < 100 && b > 200) return `blue-${index + 1}`
      if (r > 200 && g > 200 && b < 100) return `yellow-${index + 1}`
      if (r > 200 && g < 100 && b > 200) return `magenta-${index + 1}`
      if (r < 100 && g > 200 && b > 200) return `cyan-${index + 1}`
      if (r > 200 && g > 200 && b > 200) return `white-${index + 1}`
      if (r < 100 && g < 100 && b < 100) return `black-${index + 1}`
    }

    return `color-${index + 1}`
  }

  private generateFontFamilyName(family: string, index: number): string {
    const clean = family.replace(/['"]/g, '').split(',')[0].trim()
    return `font-${clean.toLowerCase().replace(/\\s+/g, '-')}-${index + 1}`
  }

  private generateFontSizeName(size: string, index: number): string {
    const normalized = this.normalizeFontSize(size)
    return `text-${normalized}-${index + 1}`
  }

  private generateSpacingName(value: string, property: string, index: number): string {
    const normalized = this.normalizeSpacing(value)
    const prefix = property.includes('margin') ? 'm' : property.includes('padding') ? 'p' : 'gap'
    return `${prefix}-${normalized}-${index + 1}`
  }

  private generateRadiusName(value: string, index: number): string {
    const normalized = this.normalizeRadius(value)
    return `rounded-${normalized}-${index + 1}`
  }

  private generateShadowName(value: string, index: number): string {
    if (value.includes('inset')) return `shadow-inset-${index + 1}`
    return `shadow-${index + 1}`
  }

  private generateMotionName(value: string, property: string, index: number): string {
    if (property.includes('duration')) {
      const ms = this.parseDuration(value)
      if (ms < 200) return `duration-fast-${index + 1}`
      if (ms < 500) return `duration-normal-${index + 1}`
      return `duration-slow-${index + 1}`
    }
    return `motion-${index + 1}`
  }

  // Utility methods
  private calculateConfidence(usage: number, total: number): number {
    return Math.min(100, (usage / total) * 100)
  }

  private sortByUsage<T extends { usage: number }>(tokens: T[]): T[] {
    return tokens.sort((a, b) => b.usage - a.usage)
  }

  private normalizeColorToHex(color: string): string | undefined {
    // Basic color normalization - would need more robust implementation
    if (color.startsWith('#')) return color
    if (color.startsWith('rgb')) {
      // Parse RGB and convert to hex
      const match = color.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/)
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }
    }
    return undefined
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  private normalizeFontSize(size: string): string {
    const num = parseFloat(size)
    if (size.includes('px')) {
      if (num <= 12) return 'xs'
      if (num <= 14) return 'sm'
      if (num <= 16) return 'base'
      if (num <= 18) return 'lg'
      if (num <= 24) return 'xl'
      return 'xxl'
    }
    return 'base'
  }

  private normalizeSpacing(value: string): string {
    const num = parseFloat(value)
    if (value.includes('px')) {
      if (num <= 4) return 'xs'
      if (num <= 8) return 'sm'
      if (num <= 16) return 'md'
      if (num <= 24) return 'lg'
      if (num <= 32) return 'xl'
      return 'xxl'
    }
    return 'md'
  }

  private normalizeRadius(value: string): string {
    const num = parseFloat(value)
    if (value.includes('px')) {
      if (num <= 2) return 'none'
      if (num <= 4) return 'sm'
      if (num <= 8) return 'md'
      if (num <= 16) return 'lg'
      return 'xl'
    }
    return 'md'
  }

  private parseDuration(value: string): number {
    const num = parseFloat(value)
    if (value.includes('s') && !value.includes('ms')) {
      return num * 1000
    }
    return num
  }
}