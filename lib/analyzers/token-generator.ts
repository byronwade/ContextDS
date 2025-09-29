import type { AnalysisResult } from './css-analyzer'

export interface W3CDesignToken {
  $type: string
  $value: string | number | object
  $description?: string
  $extensions?: {
    'contextds.usage': number
    'contextds.confidence': number
    'contextds.source': string
  }
}

export interface W3CTokenSet {
  $schema: string
  $metadata: {
    name: string
    version: string
    generatedAt: string
    source: {
      url: string
      extractedAt: string
    }
    tools: {
      extractor: string
      analyzer: string
      generator: string
    }
  }
  color?: { [key: string]: W3CDesignToken }
  dimension?: { [key: string]: W3CDesignToken }
  typography?: { [key: string]: W3CDesignToken }
  shadow?: { [key: string]: W3CDesignToken }
  transition?: { [key: string]: W3CDesignToken }
}

export class W3CTokenGenerator {
  generateTokenSet(
    analysis: AnalysisResult,
    metadata: {
      name: string
      version: string
      sourceUrl: string
      extractedAt: string
    }
  ): W3CTokenSet {
    const tokenSet: W3CTokenSet = {
      $schema: 'https://design-tokens.github.io/community-group/format/',
      $metadata: {
        name: metadata.name,
        version: metadata.version,
        generatedAt: new Date().toISOString(),
        source: {
          url: metadata.sourceUrl,
          extractedAt: metadata.extractedAt
        },
        tools: {
          extractor: '@projectwallace/extract-css-core',
          analyzer: '@projectwallace/css-analyzer',
          generator: 'contextds-token-generator'
        }
      }
    }

    // Convert colors to W3C format
    if (analysis.colors.length > 0) {
      tokenSet.color = {}
      analysis.colors.forEach((color, index) => {
        tokenSet.color![color.name] = {
          $type: 'color',
          $value: color.value,
          $description: `Color token extracted from CSS (usage: ${color.usage} times)`,
          $extensions: {
            'contextds.usage': color.usage,
            'contextds.confidence': color.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })
    }

    // Convert spacing to W3C dimension format
    if (analysis.spacing.length > 0) {
      tokenSet.dimension = {}
      analysis.spacing.forEach((spacing, index) => {
        tokenSet.dimension![spacing.name] = {
          $type: 'dimension',
          $value: spacing.value,
          $description: `Spacing token for ${spacing.property} (usage: ${spacing.usage} times)`,
          $extensions: {
            'contextds.usage': spacing.usage,
            'contextds.confidence': spacing.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })

      // Add radius tokens to dimension as well
      analysis.radius.forEach((radius, index) => {
        tokenSet.dimension![radius.name] = {
          $type: 'dimension',
          $value: radius.value,
          $description: `Border radius token (usage: ${radius.usage} times)`,
          $extensions: {
            'contextds.usage': radius.usage,
            'contextds.confidence': radius.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })
    }

    // Convert typography to W3C format
    if (analysis.typography.length > 0) {
      tokenSet.typography = {}

      // Group typography by property type
      const fontFamilies = analysis.typography.filter(t => t.property === 'font-family')
      const fontSizes = analysis.typography.filter(t => t.property === 'font-size')
      const lineHeights = analysis.typography.filter(t => t.property === 'line-height')
      const fontWeights = analysis.typography.filter(t => t.property === 'font-weight')

      // Font families
      fontFamilies.forEach((font, index) => {
        tokenSet.typography![font.name] = {
          $type: 'fontFamily',
          $value: this.parseFontFamily(font.value),
          $description: `Font family token (usage: ${font.usage} times)`,
          $extensions: {
            'contextds.usage': font.usage,
            'contextds.confidence': font.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })

      // Font sizes
      fontSizes.forEach((size, index) => {
        tokenSet.typography![size.name] = {
          $type: 'dimension',
          $value: size.value,
          $description: `Font size token (usage: ${size.usage} times)`,
          $extensions: {
            'contextds.usage': size.usage,
            'contextds.confidence': size.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })

      // Line heights
      lineHeights.forEach((lineHeight, index) => {
        tokenSet.typography![lineHeight.name] = {
          $type: 'number',
          $value: this.parseLineHeight(lineHeight.value),
          $description: `Line height token (usage: ${lineHeight.usage} times)`,
          $extensions: {
            'contextds.usage': lineHeight.usage,
            'contextds.confidence': lineHeight.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })

      // Font weights
      fontWeights.forEach((weight, index) => {
        tokenSet.typography![weight.name] = {
          $type: 'fontWeight',
          $value: this.parseFontWeight(weight.value),
          $description: `Font weight token (usage: ${weight.usage} times)`,
          $extensions: {
            'contextds.usage': weight.usage,
            'contextds.confidence': weight.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })
    }

    // Convert shadows to W3C format
    if (analysis.shadows.length > 0) {
      tokenSet.shadow = {}
      analysis.shadows.forEach((shadow, index) => {
        tokenSet.shadow![shadow.name] = {
          $type: 'shadow',
          $value: this.parseShadow(shadow.value),
          $description: `Shadow token (usage: ${shadow.usage} times)`,
          $extensions: {
            'contextds.usage': shadow.usage,
            'contextds.confidence': shadow.confidence,
            'contextds.source': 'css-analysis'
          }
        }
      })
    }

    // Convert motion to W3C transition format
    if (analysis.motion.length > 0) {
      tokenSet.transition = {}
      analysis.motion.forEach((motion, index) => {
        if (motion.property === 'transition-duration' || motion.property === 'animation-duration') {
          tokenSet.transition![motion.name] = {
            $type: 'duration',
            $value: this.parseDuration(motion.value),
            $description: `Duration token (usage: ${motion.usage} times)`,
            $extensions: {
              'contextds.usage': motion.usage,
              'contextds.confidence': motion.confidence,
              'contextds.source': 'css-analysis'
            }
          }
        } else if (motion.property === 'transition-timing-function') {
          tokenSet.transition![motion.name] = {
            $type: 'cubicBezier',
            $value: this.parseTimingFunction(motion.value),
            $description: `Timing function token (usage: ${motion.usage} times)`,
            $extensions: {
              'contextds.usage': motion.usage,
              'contextds.confidence': motion.confidence,
              'contextds.source': 'css-analysis'
            }
          }
        }
      })
    }

    return tokenSet
  }

  // Helper methods for parsing CSS values to W3C format
  private parseFontFamily(value: string): string[] {
    return value
      .split(',')
      .map(family => family.trim().replace(/['"]/g, ''))
      .filter(family => family.length > 0)
  }

  private parseLineHeight(value: string): number | string {
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return num
  }

  private parseFontWeight(value: string): number | string {
    const weightMap: { [key: string]: number } = {
      'thin': 100,
      'extralight': 200,
      'light': 300,
      'normal': 400,
      'medium': 500,
      'semibold': 600,
      'bold': 700,
      'extrabold': 800,
      'black': 900
    }

    const num = parseInt(value)
    if (!isNaN(num)) return num

    const lowerValue = value.toLowerCase()
    return weightMap[lowerValue] || value
  }

  private parseShadow(value: string): object {
    // Parse box-shadow value into W3C shadow format
    // This is a simplified parser - a full implementation would handle all shadow syntax
    const parts = value.split(' ')

    if (parts.length >= 4) {
      return {
        offsetX: parts[0],
        offsetY: parts[1],
        blur: parts[2],
        spread: parts[3] || '0px',
        color: parts.slice(4).join(' ') || '#000000'
      }
    }

    return { value } // Fallback for complex shadows
  }

  private parseDuration(value: string): string {
    // Normalize duration to milliseconds format
    const num = parseFloat(value)
    if (value.includes('s') && !value.includes('ms')) {
      return `${num * 1000}ms`
    }
    return value
  }

  private parseTimingFunction(value: string): number[] | string {
    // Parse cubic-bezier values
    const cubicMatch = value.match(/cubic-bezier\\(([^)]+)\\)/)
    if (cubicMatch) {
      const values = cubicMatch[1].split(',').map(v => parseFloat(v.trim()))
      if (values.length === 4 && values.every(v => !isNaN(v))) {
        return values
      }
    }

    // Return common timing functions as-is
    const commonFunctions = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']
    if (commonFunctions.includes(value)) {
      return value
    }

    return value // Fallback
  }

  // Generate confidence-based token recommendations
  generateRecommendations(tokenSet: W3CTokenSet): {
    highConfidence: string[]
    lowConfidence: string[]
    duplicates: string[]
    improvements: string[]
  } {
    const recommendations = {
      highConfidence: [] as string[],
      lowConfidence: [] as string[],
      duplicates: [] as string[],
      improvements: [] as string[]
    }

    // Analyze all token categories
    const allCategories = [tokenSet.color, tokenSet.dimension, tokenSet.typography, tokenSet.shadow, tokenSet.transition]

    allCategories.forEach(category => {
      if (!category) return

      Object.entries(category).forEach(([name, token]) => {
        const confidence = token.$extensions?.['contextds.confidence'] || 0

        if (confidence > 80) {
          recommendations.highConfidence.push(name)
        } else if (confidence < 40) {
          recommendations.lowConfidence.push(name)
        }
      })
    })

    // Detect potential duplicates (simplified)
    if (tokenSet.color) {
      const colorValues = new Map<string, string[]>()
      Object.entries(tokenSet.color).forEach(([name, token]) => {
        const value = token.$value as string
        if (!colorValues.has(value)) {
          colorValues.set(value, [])
        }
        colorValues.get(value)!.push(name)
      })

      colorValues.forEach((names, value) => {
        if (names.length > 1) {
          recommendations.duplicates.push(...names)
        }
      })
    }

    // General improvements
    if (recommendations.lowConfidence.length > 10) {
      recommendations.improvements.push('Consider reviewing low-confidence tokens for accuracy')
    }

    if (recommendations.duplicates.length > 0) {
      recommendations.improvements.push('Consolidate duplicate color values')
    }

    return recommendations
  }
}