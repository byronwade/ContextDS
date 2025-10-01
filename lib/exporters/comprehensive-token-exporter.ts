/**
 * Comprehensive Token Exporter
 * Production-ready exports following industry standards and best practices
 *
 * Supported formats:
 * - W3C Design Tokens (DTCG) - Official specification
 * - Figma Tokens v2 - Tokens Studio format
 * - Tailwind v4 - CSS-first @theme configuration
 * - CSS Variables - Modern custom properties
 * - SCSS - Advanced Sass maps and functions
 * - TypeScript - Fully typed with const assertions
 */

import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

export interface ExportMetadata {
  name: string
  version?: string
  author?: string
  description?: string
  homepage?: string
}

export interface ExportOptions {
  format: ExportFormat
  tokens: CuratedTokenSet
  metadata?: ExportMetadata
  options?: {
    includeComments?: boolean
    prettify?: boolean
    prefix?: string
    cssVarFormat?: 'kebab-case' | 'camelCase'
    tailwindVersion?: 3 | 4
  }
}

export type ExportFormat =
  | 'w3c-json'        // W3C Design Tokens Community Group format
  | 'figma'           // Figma Tokens Plugin format
  | 'figma-variables' // Figma Variables API format
  | 'tailwind'        // Tailwind CSS configuration
  | 'css'             // CSS Custom Properties
  | 'scss'            // SCSS with maps and functions
  | 'sass'            // Sass (indented syntax)
  | 'less'            // Less variables
  | 'stylus'          // Stylus variables
  | 'ts'              // TypeScript const definitions
  | 'js'              // JavaScript ES6 module
  | 'json'            // Raw JSON
  | 'yaml'            // YAML format
  | 'style-dictionary'// Style Dictionary format
  | 'theo'            // Salesforce Theo format
  | 'swift'           // iOS Swift
  | 'kotlin'          // Android Kotlin
  | 'xml'             // Android XML
  | 'dart'            // Flutter Dart

/**
 * Main export function
 */
export function exportTokens(options: ExportOptions): string {
  const { format } = options

  switch (format) {
    case 'w3c-json':
      return exportToW3C(options)
    case 'figma':
      return exportToFigmaTokens(options)
    case 'figma-variables':
      return exportToFigmaVariables(options)
    case 'tailwind':
      return exportToTailwind(options)
    case 'css':
      return exportToCSS(options)
    case 'scss':
      return exportToSCSS(options)
    case 'sass':
      return exportToSass(options)
    case 'less':
      return exportToLess(options)
    case 'stylus':
      return exportToStylus(options)
    case 'ts':
      return exportToTypeScript(options)
    case 'js':
      return exportToJavaScript(options)
    case 'json':
      return exportToJSON(options)
    case 'yaml':
      return exportToYAML(options)
    case 'style-dictionary':
      return exportToStyleDictionary(options)
    case 'theo':
      return exportToTheo(options)
    case 'swift':
      return exportToSwift(options)
    case 'kotlin':
      return exportToKotlin(options)
    case 'xml':
      return exportToXML(options)
    case 'dart':
      return exportToDart(options)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * W3C Design Tokens Community Group Format
 * Specification: https://www.designtokens.org/tr/drafts/format/
 */
function exportToW3C(options: ExportOptions): string {
  const { tokens, metadata } = options
  const w3cTokens: any = {
    $type: 'designTokens',
    $version: '1.0.0',
    ...(metadata?.description && { $description: metadata.description }),
    ...(metadata && {
      $metadata: {
        name: metadata.name,
        ...(metadata.version && { version: metadata.version }),
        ...(metadata.author && { author: metadata.author }),
        ...(metadata.homepage && { homepage: metadata.homepage }),
        createdAt: new Date().toISOString(),
        tool: 'ContextDS',
        toolVersion: '1.0.0'
      }
    })
  }

  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    w3cTokens.color = {}
    tokens.colors.forEach((color, index) => {
      const name = color.semantic || color.name || `color-${index + 1}`
      w3cTokens.color[sanitizeTokenName(name)] = {
        $type: 'color',
        $value: color.value,
        ...(color.semantic && { $description: color.semantic }),
        $extensions: {
          'contextds.usage': color.usage || 0,
          'contextds.percentage': color.percentage || 0,
          'contextds.confidence': color.confidence || 0
        }
      }
    })
  }

  // Typography - Font Families
  if (tokens.typography?.families && tokens.typography.families.length > 0) {
    w3cTokens.fontFamily = {}
    tokens.typography.families.forEach((font, index) => {
      const name = font.semantic || font.name || `font-${index + 1}`
      w3cTokens.fontFamily[sanitizeTokenName(name)] = {
        $type: 'fontFamily',
        $value: [font.value],
        $extensions: {
          'contextds.usage': font.usage || 0,
          'contextds.percentage': font.percentage || 0
        }
      }
    })
  }

  // Typography - Font Sizes
  if (tokens.typography?.sizes && tokens.typography.sizes.length > 0) {
    w3cTokens.fontSize = {}
    tokens.typography.sizes.forEach((size, index) => {
      const name = size.semantic || size.name || `size-${index + 1}`
      const parsed = parseDimension(size.value)
      w3cTokens.fontSize[sanitizeTokenName(name)] = {
        $type: 'dimension',
        $value: parsed.value + parsed.unit,
        $extensions: {
          'contextds.usage': size.usage || 0
        }
      }
    })
  }

  // Typography - Font Weights
  if (tokens.typography?.weights && tokens.typography.weights.length > 0) {
    w3cTokens.fontWeight = {}
    tokens.typography.weights.forEach((weight, index) => {
      const name = weight.semantic || weight.name || `weight-${index + 1}`
      w3cTokens.fontWeight[sanitizeTokenName(name)] = {
        $type: 'fontWeight',
        $value: parseInt(weight.value) || weight.value,
        $extensions: {
          'contextds.usage': weight.usage || 0
        }
      }
    })
  }

  // Spacing
  if (tokens.spacing && tokens.spacing.length > 0) {
    w3cTokens.spacing = {}
    tokens.spacing.forEach((space, index) => {
      const name = space.semantic || space.name || `spacing-${index + 1}`
      const parsed = parseDimension(space.value)
      w3cTokens.spacing[sanitizeTokenName(name)] = {
        $type: 'dimension',
        $value: parsed.value + parsed.unit,
        $extensions: {
          'contextds.usage': space.usage || 0,
          'contextds.percentage': space.percentage || 0
        }
      }
    })
  }

  // Border Radius
  if (tokens.radius && tokens.radius.length > 0) {
    w3cTokens.borderRadius = {}
    tokens.radius.forEach((rad, index) => {
      const name = rad.semantic || rad.name || `radius-${index + 1}`
      const parsed = parseDimension(rad.value)
      w3cTokens.borderRadius[sanitizeTokenName(name)] = {
        $type: 'dimension',
        $value: parsed.value + parsed.unit,
        $extensions: {
          'contextds.usage': rad.usage || 0,
          'contextds.percentage': rad.percentage || 0
        }
      }
    })
  }

  // Shadows
  if (tokens.shadows && tokens.shadows.length > 0) {
    w3cTokens.shadow = {}
    tokens.shadows.forEach((shadow, index) => {
      const name = shadow.semantic || shadow.name || `shadow-${index + 1}`
      w3cTokens.shadow[sanitizeTokenName(name)] = {
        $type: 'shadow',
        $value: shadow.value,
        $extensions: {
          'contextds.usage': shadow.usage || 0,
          'contextds.percentage': shadow.percentage || 0,
          'contextds.original': shadow.value
        }
      }
    })
  }

  // Motion/Transitions
  if (tokens.motion && tokens.motion.length > 0) {
    w3cTokens.duration = {}
    tokens.motion.forEach((motion, index) => {
      const name = motion.semantic || motion.name || `duration-${index + 1}`
      const parsed = parseDuration(motion.value)
      w3cTokens.duration[sanitizeTokenName(name)] = {
        $type: 'duration',
        $value: parsed.value + parsed.unit,
        $extensions: {
          'contextds.usage': motion.usage || 0
        }
      }
    })
  }

  return JSON.stringify(w3cTokens, null, 2)
}

/**
 * Figma Tokens Plugin Format (Tokens Studio)
 * Spec: https://docs.tokens.studio/
 */
function exportToFigmaTokens(options: ExportOptions): string {
  const { tokens, metadata } = options
  const figmaTokens: any = {
    $metadata: {
      tokenSetOrder: ['global'],
      ...(metadata && {
        name: metadata.name,
        version: metadata.version,
        author: metadata.author
      })
    },
    global: {}
  }

  const globalSet = figmaTokens.global

  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    globalSet.colors = {}
    tokens.colors.forEach((color, index) => {
      const name = color.semantic || color.name || `color-${index + 1}`
      globalSet.colors[sanitizeTokenName(name)] = {
        value: color.value,
        type: 'color',
        ...(color.semantic && { description: color.semantic })
      }
    })
  }

  // Typography
  if (tokens.typography?.families) {
    globalSet.fontFamilies = {}
    tokens.typography.families.forEach((font, index) => {
      const name = font.semantic || font.name || `font-${index + 1}`
      globalSet.fontFamilies[sanitizeTokenName(name)] = {
        value: font.value,
        type: 'fontFamilies'
      }
    })
  }

  if (tokens.typography?.sizes) {
    globalSet.fontSizes = {}
    tokens.typography.sizes.forEach((size, index) => {
      const name = size.semantic || size.name || `size-${index + 1}`
      globalSet.fontSizes[sanitizeTokenName(name)] = {
        value: size.value,
        type: 'fontSizes'
      }
    })
  }

  if (tokens.typography?.weights) {
    globalSet.fontWeights = {}
    tokens.typography.weights.forEach((weight, index) => {
      const name = weight.semantic || weight.name || `weight-${index + 1}`
      globalSet.fontWeights[sanitizeTokenName(name)] = {
        value: weight.value,
        type: 'fontWeights'
      }
    })
  }

  // Spacing
  if (tokens.spacing) {
    globalSet.spacing = {}
    tokens.spacing.forEach((space, index) => {
      const name = space.semantic || space.name || `spacing-${index + 1}`
      globalSet.spacing[sanitizeTokenName(name)] = {
        value: space.value,
        type: 'spacing'
      }
    })
  }

  // Border Radius
  if (tokens.radius) {
    globalSet.borderRadius = {}
    tokens.radius.forEach((rad, index) => {
      const name = rad.semantic || rad.name || `radius-${index + 1}`
      globalSet.borderRadius[sanitizeTokenName(name)] = {
        value: rad.value,
        type: 'borderRadius'
      }
    })
  }

  // Shadows
  if (tokens.shadows) {
    globalSet.boxShadow = {}
    tokens.shadows.forEach((shadow, index) => {
      const name = shadow.semantic || shadow.name || `shadow-${index + 1}`
      globalSet.boxShadow[sanitizeTokenName(name)] = {
        value: shadow.value,
        type: 'boxShadow'
      }
    })
  }

  return JSON.stringify(figmaTokens, null, 2)
}

/**
 * Figma Variables API Format
 * For direct import into Figma via REST API
 */
function exportToFigmaVariables(options: ExportOptions): string {
  const { tokens } = options
  const variables: any[] = []

  // Colors as color variables
  if (tokens.colors) {
    tokens.colors.forEach((color, index) => {
      const name = color.semantic || color.name || `color-${index + 1}`
      variables.push({
        name: sanitizeTokenName(name),
        resolvedType: 'COLOR',
        valuesByMode: {
          'default': parseColorToRGBA(color.value)
        }
      })
    })
  }

  // Spacing as float variables
  if (tokens.spacing) {
    tokens.spacing.forEach((space, index) => {
      const name = space.semantic || space.name || `spacing-${index + 1}`
      const parsed = parseDimension(space.value)
      variables.push({
        name: sanitizeTokenName(name),
        resolvedType: 'FLOAT',
        valuesByMode: {
          'default': parseFloat(parsed.value)
        }
      })
    })
  }

  return JSON.stringify({ variables }, null, 2)
}

/**
 * Tailwind CSS v4 Configuration
 * Uses @theme directive with CSS variables
 */
function exportToTailwind(options: ExportOptions): string {
  const { tokens, metadata, options: opts } = options
  const version = opts?.tailwindVersion || 4
  const includeComments = opts?.includeComments !== false

  if (version === 4) {
    // Tailwind v4 CSS-first configuration
    let css = includeComments
      ? `/* ${metadata?.name || 'Design Tokens'} - Tailwind CSS v4 */\n/* Generated: ${new Date().toISOString()} */\n/* https://tailwindcss.com/docs/v4 */\n\n`
      : ''

    css += `@import "tailwindcss";\n\n`
    css += `@theme {\n`

    // Colors (--color-* namespace)
    if (tokens.colors && tokens.colors.length > 0) {
      if (includeComments) css += `  /* Colors */\n`
      tokens.colors.forEach(color => {
        const name = color.semantic || color.name || color.value
        css += `  --color-${sanitizeCSSVarName(name)}: ${color.value};\n`
      })
      css += `\n`
    }

    // Spacing (--spacing-* namespace)
    if (tokens.spacing && tokens.spacing.length > 0) {
      if (includeComments) css += `  /* Spacing */\n`
      tokens.spacing.forEach(space => {
        const name = space.semantic || space.name || space.value
        css += `  --spacing-${sanitizeCSSVarName(name)}: ${space.value};\n`
      })
      css += `\n`
    }

    // Font families (--font-* namespace)
    if (tokens.typography?.families && tokens.typography.families.length > 0) {
      if (includeComments) css += `  /* Font Families */\n`
      tokens.typography.families.forEach(font => {
        const name = font.semantic || font.name || font.value
        css += `  --font-${sanitizeCSSVarName(name)}: ${font.value};\n`
      })
      css += `\n`
    }

    // Font sizes (--font-size-* namespace)
    if (tokens.typography?.sizes && tokens.typography.sizes.length > 0) {
      if (includeComments) css += `  /* Font Sizes */\n`
      tokens.typography.sizes.forEach(size => {
        const name = size.semantic || size.name || size.value
        css += `  --font-size-${sanitizeCSSVarName(name)}: ${size.value};\n`
      })
      css += `\n`
    }

    // Border radius (--radius-* namespace)
    if (tokens.radius && tokens.radius.length > 0) {
      if (includeComments) css += `  /* Border Radius */\n`
      tokens.radius.forEach(rad => {
        const name = rad.semantic || rad.name || rad.value
        css += `  --radius-${sanitizeCSSVarName(name)}: ${rad.value};\n`
      })
      css += `\n`
    }

    // Shadows (--shadow-* namespace)
    if (tokens.shadows && tokens.shadows.length > 0) {
      if (includeComments) css += `  /* Shadows */\n`
      tokens.shadows.forEach(shadow => {
        const name = shadow.semantic || shadow.name || 'shadow'
        css += `  --shadow-${sanitizeCSSVarName(name)}: ${shadow.value};\n`
      })
      css += `\n`
    }

    css += `}\n`

    return css
  } else {
    // Tailwind v3 JavaScript configuration
    return exportToTailwindV3(options)
  }
}

/**
 * Tailwind CSS v3 JavaScript Configuration
 */
function exportToTailwindV3(options: ExportOptions): string {
  const { tokens, metadata } = options
  const config: any = {
    theme: {
      extend: {}
    }
  }

  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    config.theme.extend.colors = {}
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      config.theme.extend.colors[sanitizeCSSVarName(name)] = color.value
    })
  }

  // Spacing
  if (tokens.spacing && tokens.spacing.length > 0) {
    config.theme.extend.spacing = {}
    tokens.spacing.forEach(space => {
      const name = space.semantic || space.name || space.value
      config.theme.extend.spacing[sanitizeCSSVarName(name)] = space.value
    })
  }

  // Font families
  if (tokens.typography?.families) {
    config.theme.extend.fontFamily = {}
    tokens.typography.families.forEach(font => {
      const name = font.semantic || font.name || font.value
      config.theme.extend.fontFamily[sanitizeCSSVarName(name)] = [font.value, 'sans-serif']
    })
  }

  // Font sizes
  if (tokens.typography?.sizes) {
    config.theme.extend.fontSize = {}
    tokens.typography.sizes.forEach(size => {
      const name = size.semantic || size.name || size.value
      config.theme.extend.fontSize[sanitizeCSSVarName(name)] = size.value
    })
  }

  // Border radius
  if (tokens.radius) {
    config.theme.extend.borderRadius = {}
    tokens.radius.forEach(rad => {
      const name = rad.semantic || rad.name || rad.value
      config.theme.extend.borderRadius[sanitizeCSSVarName(name)] = rad.value
    })
  }

  // Shadows
  if (tokens.shadows) {
    config.theme.extend.boxShadow = {}
    tokens.shadows.forEach(shadow => {
      const name = shadow.semantic || shadow.name || 'shadow'
      config.theme.extend.boxShadow[sanitizeCSSVarName(name)] = shadow.value
    })
  }

  let output = `/** @type {import('tailwindcss').Config} */\n`
  output += `module.exports = ${JSON.stringify(config, null, 2)}\n`

  return output
}

/**
 * Modern CSS Custom Properties
 * Organized by category with proper comments
 */
function exportToCSS(options: ExportOptions): string {
  const { tokens, metadata, options: opts } = options
  const includeComments = opts?.includeComments !== false
  const prefix = opts?.prefix || ''

  let css = includeComments
    ? `/* ${metadata?.name || 'Design Tokens'} - CSS Custom Properties */\n/* Generated: ${new Date().toISOString()} */\n\n`
    : ''

  css += `:root {\n`

  // Colors
  if (tokens.colors && tokens.colors.length > 0) {
    if (includeComments) css += `  /* Colors (${tokens.colors.length}) */\n`
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      if (includeComments && color.usage) {
        css += `  /* ${color.usage} uses */\n`
      }
      css += `  --${prefix}${sanitizeCSSVarName(name)}: ${color.value};\n`
    })
    css += `\n`
  }

  // Typography - Font Families
  if (tokens.typography?.families && tokens.typography.families.length > 0) {
    if (includeComments) css += `  /* Font Families (${tokens.typography.families.length}) */\n`
    tokens.typography.families.forEach(font => {
      const name = font.semantic || font.name || font.value
      css += `  --${prefix}font-${sanitizeCSSVarName(name)}: ${font.value};\n`
    })
    css += `\n`
  }

  // Typography - Font Sizes
  if (tokens.typography?.sizes && tokens.typography.sizes.length > 0) {
    if (includeComments) css += `  /* Font Sizes (${tokens.typography.sizes.length}) */\n`
    tokens.typography.sizes.forEach(size => {
      const name = size.semantic || size.name || size.value
      css += `  --${prefix}font-size-${sanitizeCSSVarName(name)}: ${size.value};\n`
    })
    css += `\n`
  }

  // Typography - Font Weights
  if (tokens.typography?.weights && tokens.typography.weights.length > 0) {
    if (includeComments) css += `  /* Font Weights (${tokens.typography.weights.length}) */\n`
    tokens.typography.weights.forEach(weight => {
      const name = weight.semantic || weight.name || weight.value
      css += `  --${prefix}font-weight-${sanitizeCSSVarName(name)}: ${weight.value};\n`
    })
    css += `\n`
  }

  // Spacing
  if (tokens.spacing && tokens.spacing.length > 0) {
    if (includeComments) css += `  /* Spacing (${tokens.spacing.length}) */\n`
    tokens.spacing.forEach(space => {
      const name = space.semantic || space.name || space.value
      css += `  --${prefix}spacing-${sanitizeCSSVarName(name)}: ${space.value};\n`
    })
    css += `\n`
  }

  // Border Radius
  if (tokens.radius && tokens.radius.length > 0) {
    if (includeComments) css += `  /* Border Radius (${tokens.radius.length}) */\n`
    tokens.radius.forEach(rad => {
      const name = rad.semantic || rad.name || rad.value
      css += `  --${prefix}radius-${sanitizeCSSVarName(name)}: ${rad.value};\n`
    })
    css += `\n`
  }

  // Shadows
  if (tokens.shadows && tokens.shadows.length > 0) {
    if (includeComments) css += `  /* Shadows (${tokens.shadows.length}) */\n`
    tokens.shadows.forEach(shadow => {
      const name = shadow.semantic || shadow.name || 'shadow'
      css += `  --${prefix}shadow-${sanitizeCSSVarName(name)}: ${shadow.value};\n`
    })
    css += `\n`
  }

  // Motion
  if (tokens.motion && tokens.motion.length > 0) {
    if (includeComments) css += `  /* Transitions & Durations (${tokens.motion.length}) */\n`
    tokens.motion.forEach(motion => {
      const name = motion.semantic || motion.name || motion.value
      css += `  --${prefix}duration-${sanitizeCSSVarName(name)}: ${motion.value};\n`
    })
    css += `\n`
  }

  css += `}\n`

  return css
}

/**
 * SCSS with Advanced Features
 * Includes maps, functions, and mixins
 */
function exportToSCSS(options: ExportOptions): string {
  const { tokens, metadata, options: opts } = options
  const includeComments = opts?.includeComments !== false
  const prefix = opts?.prefix || ''

  let scss = includeComments
    ? `// ${metadata?.name || 'Design Tokens'} - SCSS Variables & Maps\n// Generated: ${new Date().toISOString()}\n\n`
    : ''

  // Color variables and map
  if (tokens.colors && tokens.colors.length > 0) {
    if (includeComments) scss += `// Colors (${tokens.colors.length})\n`
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      scss += `$${prefix}${sanitizeSCSSVarName(name)}: ${color.value};\n`
    })

    scss += `\n$${prefix}colors: (\n`
    tokens.colors.forEach((color, index) => {
      const name = color.semantic || color.name || color.value
      const comma = index < tokens.colors.length - 1 ? ',' : ''
      scss += `  '${sanitizeSCSSVarName(name)}': $${prefix}${sanitizeSCSSVarName(name)}${comma}\n`
    })
    scss += `);\n\n`

    // Color getter function
    if (includeComments) scss += `// Usage: color('primary') or color('primary', 0.5)\n`
    scss += `@function color($name, $opacity: 1) {\n`
    scss += `  @if not map-has-key($${prefix}colors, $name) {\n`
    scss += `    @error "Color '#{$name}' not found in $colors map";\n`
    scss += `  }\n`
    scss += `  @return rgba(map-get($${prefix}colors, $name), $opacity);\n`
    scss += `}\n\n`
  }

  // Spacing variables and map
  if (tokens.spacing && tokens.spacing.length > 0) {
    if (includeComments) scss += `// Spacing (${tokens.spacing.length})\n`
    tokens.spacing.forEach(space => {
      const name = space.semantic || space.name || space.value
      scss += `$${prefix}spacing-${sanitizeSCSSVarName(name)}: ${space.value};\n`
    })

    scss += `\n$${prefix}spacing: (\n`
    tokens.spacing.forEach((space, index) => {
      const name = space.semantic || space.name || space.value
      const comma = index < tokens.spacing.length - 1 ? ',' : ''
      scss += `  '${sanitizeSCSSVarName(name)}': $${prefix}spacing-${sanitizeSCSSVarName(name)}${comma}\n`
    })
    scss += `);\n\n`

    // Spacing getter function
    if (includeComments) scss += `// Usage: spacing('sm') or spacing('md')\n`
    scss += `@function spacing($name) {\n`
    scss += `  @if not map-has-key($${prefix}spacing, $name) {\n`
    scss += `    @error "Spacing '#{$name}' not found in $spacing map";\n`
    scss += `  }\n`
    scss += `  @return map-get($${prefix}spacing, $name);\n`
    scss += `}\n\n`
  }

  // Typography
  if (tokens.typography?.families) {
    if (includeComments) scss += `// Font Families\n`
    tokens.typography.families.forEach(font => {
      const name = font.semantic || font.name || font.value
      scss += `$${prefix}font-${sanitizeSCSSVarName(name)}: ${font.value};\n`
    })
    scss += `\n`
  }

  if (tokens.typography?.sizes) {
    if (includeComments) scss += `// Font Sizes\n`
    scss += `$${prefix}font-sizes: (\n`
    tokens.typography.sizes.forEach((size, index) => {
      const name = size.semantic || size.name || size.value
      const comma = index < tokens.typography.sizes.length - 1 ? ',' : ''
      scss += `  '${sanitizeSCSSVarName(name)}': ${size.value}${comma}\n`
    })
    scss += `);\n\n`
  }

  // Border Radius
  if (tokens.radius && tokens.radius.length > 0) {
    if (includeComments) scss += `// Border Radius\n`
    scss += `$${prefix}radius: (\n`
    tokens.radius.forEach((rad, index) => {
      const name = rad.semantic || rad.name || rad.value
      const comma = index < tokens.radius.length - 1 ? ',' : ''
      scss += `  '${sanitizeSCSSVarName(name)}': ${rad.value}${comma}\n`
    })
    scss += `);\n\n`
  }

  // Shadows
  if (tokens.shadows && tokens.shadows.length > 0) {
    if (includeComments) scss += `// Box Shadows\n`
    scss += `$${prefix}shadows: (\n`
    tokens.shadows.forEach((shadow, index) => {
      const name = shadow.semantic || shadow.name || 'shadow'
      const comma = index < tokens.shadows.length - 1 ? ',' : ''
      scss += `  '${sanitizeSCSSVarName(name)}': ${shadow.value}${comma}\n`
    })
    scss += `);\n\n`
  }

  return scss
}

/**
 * TypeScript with Full Type Safety
 * Const assertions and branded types
 */
function exportToTypeScript(options: ExportOptions): string {
  const { tokens, metadata } = options

  let ts = `/**\n * ${metadata?.name || 'Design Tokens'}\n`
  ts += ` * Generated: ${new Date().toISOString()}\n`
  ts += ` * @module DesignTokens\n */\n\n`

  // Type definitions
  ts += `/** Brand type for design tokens */\n`
  ts += `type Brand<K, T> = K & { __brand: T };\n\n`

  ts += `/** Color token (hex, rgb, hsl) */\n`
  ts += `export type ColorToken = Brand<string, 'ColorToken'>;\n\n`

  ts += `/** Dimension token (px, rem, em, etc.) */\n`
  ts += `export type DimensionToken = Brand<string, 'DimensionToken'>;\n\n`

  ts += `/** Duration token (ms, s) */\n`
  ts += `export type DurationToken = Brand<string, 'DurationToken'>;\n\n`

  // Generate token constants with const assertions
  if (tokens.colors && tokens.colors.length > 0) {
    ts += `/** Color tokens */\n`
    ts += `export const colors = {\n`
    tokens.colors.forEach((color, index) => {
      const name = color.semantic || color.name || `color${index + 1}`
      ts += `  ${sanitizeJSVarName(name)}: '${color.value}' as ColorToken,\n`
    })
    ts += `} as const;\n\n`

    ts += `export type ColorTokenKey = keyof typeof colors;\n\n`
  }

  if (tokens.spacing && tokens.spacing.length > 0) {
    ts += `/** Spacing tokens */\n`
    ts += `export const spacing = {\n`
    tokens.spacing.forEach((space, index) => {
      const name = space.semantic || space.name || `spacing${index + 1}`
      ts += `  ${sanitizeJSVarName(name)}: '${space.value}' as DimensionToken,\n`
    })
    ts += `} as const;\n\n`

    ts += `export type SpacingTokenKey = keyof typeof spacing;\n\n`
  }

  if (tokens.typography?.families) {
    ts += `/** Font family tokens */\n`
    ts += `export const fontFamilies = {\n`
    tokens.typography.families.forEach((font, index) => {
      const name = font.semantic || font.name || `font${index + 1}`
      ts += `  ${sanitizeJSVarName(name)}: '${font.value}',\n`
    })
    ts += `} as const;\n\n`

    ts += `export type FontFamilyKey = keyof typeof fontFamilies;\n\n`
  }

  if (tokens.typography?.sizes) {
    ts += `/** Font size tokens */\n`
    ts += `export const fontSizes = {\n`
    tokens.typography.sizes.forEach((size, index) => {
      const name = size.semantic || size.name || `size${index + 1}`
      ts += `  ${sanitizeJSVarName(name)}: '${size.value}' as DimensionToken,\n`
    })
    ts += `} as const;\n\n`

    ts += `export type FontSizeKey = keyof typeof fontSizes;\n\n`
  }

  if (tokens.radius && tokens.radius.length > 0) {
    ts += `/** Border radius tokens */\n`
    ts += `export const borderRadius = {\n`
    tokens.radius.forEach((rad, index) => {
      const name = rad.semantic || rad.name || `radius${index + 1}`
      ts += `  ${sanitizeJSVarName(name)}: '${rad.value}' as DimensionToken,\n`
    })
    ts += `} as const;\n\n`

    ts += `export type BorderRadiusKey = keyof typeof borderRadius;\n\n`
  }

  if (tokens.shadows && tokens.shadows.length > 0) {
    ts += `/** Shadow tokens */\n`
    ts += `export const shadows = {\n`
    tokens.shadows.forEach((shadow, index) => {
      const name = shadow.semantic || shadow.name || `shadow${index + 1}`
      ts += `  ${sanitizeJSVarName(name)}: '${shadow.value}',\n`
    })
    ts += `} as const;\n\n`

    ts += `export type ShadowKey = keyof typeof shadows;\n\n`
  }

  // Unified design tokens object
  ts += `/** All design tokens */\n`
  ts += `export const designTokens = {\n`
  if (tokens.colors?.length) ts += `  colors,\n`
  if (tokens.spacing?.length) ts += `  spacing,\n`
  if (tokens.typography?.families?.length) ts += `  fontFamilies,\n`
  if (tokens.typography?.sizes?.length) ts += `  fontSizes,\n`
  if (tokens.radius?.length) ts += `  borderRadius,\n`
  if (tokens.shadows?.length) ts += `  shadows,\n`
  ts += `} as const;\n\n`

  ts += `export type DesignTokens = typeof designTokens;\n`

  return ts
}

/**
 * JavaScript ES6 Module
 */
function exportToJavaScript(options: ExportOptions): string {
  const ts = exportToTypeScript(options)
  // Remove TypeScript-specific syntax
  return ts
    .replace(/: ColorToken/g, '')
    .replace(/: DimensionToken/g, '')
    .replace(/: DurationToken/g, '')
    .replace(/type Brand.*\n/g, '')
    .replace(/export type.*\n/g, '')
    .replace(/\/\*\* Brand type.*\*\/\n/g, '')
    .replace(/\/\*\* Color token.*\*\/\n/g, '')
    .replace(/\/\*\* Dimension token.*\*\/\n/g, '')
    .replace(/\/\*\* Duration token.*\*\/\n/g, '')
    .replace(/ as const/g, '')
}

/**
 * Raw JSON Export
 */
function exportToJSON(options: ExportOptions): string {
  const { tokens } = options
  return JSON.stringify(tokens, null, 2)
}

/**
 * YAML Export
 */
function exportToYAML(options: ExportOptions): string {
  const { tokens, metadata } = options

  // Simple YAML generation (for complex use cases, consider yaml library)
  let yaml = `# ${metadata?.name || 'Design Tokens'}\n`
  yaml += `# Generated: ${new Date().toISOString()}\n\n`

  if (tokens.colors) {
    yaml += `colors:\n`
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      yaml += `  ${sanitizeYAMLKey(name)}: "${color.value}"\n`
    })
    yaml += `\n`
  }

  if (tokens.spacing) {
    yaml += `spacing:\n`
    tokens.spacing.forEach(space => {
      const name = space.semantic || space.name || space.value
      yaml += `  ${sanitizeYAMLKey(name)}: "${space.value}"\n`
    })
    yaml += `\n`
  }

  return yaml
}

// Additional export formats (Style Dictionary, Theo, Swift, Kotlin, XML, Dart) would continue here...
// For brevity, I'll include stubs for these

function exportToStyleDictionary(options: ExportOptions): string {
  return exportToW3C(options) // Style Dictionary supports W3C format
}

function exportToTheo(options: ExportOptions): string {
  // Theo format is similar to W3C
  return exportToW3C(options)
}

function exportToSass(options: ExportOptions): string {
  // Sass indented syntax
  return exportToSCSS(options).replace(/\{/g, '').replace(/\}/g, '').replace(/;/g, '')
}

function exportToLess(options: ExportOptions): string {
  // Less variables (@ prefix instead of $)
  return exportToSCSS(options).replace(/\$/g, '@')
}

function exportToStylus(options: ExportOptions): string {
  // Stylus doesn't require $, :, or ;
  const scss = exportToSCSS(options)
  return scss.replace(/\$/g, '').replace(/:/g, ' =').replace(/;/g, '')
}

function exportToSwift(options: ExportOptions): string {
  // iOS Swift implementation
  const { tokens, metadata } = options
  let swift = `// ${metadata?.name || 'Design Tokens'}\n`
  swift += `// Generated: ${new Date().toISOString()}\n\n`
  swift += `import UIKit\n\n`
  swift += `extension UIColor {\n`

  if (tokens.colors) {
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      const rgba = parseColorToRGBA(color.value)
      swift += `    static let ${sanitizeSwiftName(name)} = UIColor(red: ${rgba.r}, green: ${rgba.g}, blue: ${rgba.b}, alpha: ${rgba.a})\n`
    })
  }

  swift += `}\n`
  return swift
}

function exportToKotlin(options: ExportOptions): string {
  // Android Kotlin implementation
  const { tokens, metadata } = options
  let kotlin = `// ${metadata?.name || 'Design Tokens'}\n`
  kotlin += `// Generated: ${new Date().toISOString()}\n\n`
  kotlin += `package com.example.tokens\n\n`
  kotlin += `object DesignTokens {\n`

  if (tokens.colors) {
    kotlin += `    object Colors {\n`
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      kotlin += `        const val ${sanitizeKotlinName(name)} = "${color.value}"\n`
    })
    kotlin += `    }\n`
  }

  kotlin += `}\n`
  return kotlin
}

function exportToXML(options: ExportOptions): string {
  // Android XML resources
  const { tokens } = options
  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`
  xml += `<!-- Generated Design Tokens -->\n`
  xml += `<resources>\n`

  if (tokens.colors) {
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      xml += `    <color name="${sanitizeXMLName(name)}">${color.value}</color>\n`
    })
  }

  xml += `</resources>\n`
  return xml
}

function exportToDart(options: ExportOptions): string {
  // Flutter Dart implementation
  const { tokens, metadata } = options
  let dart = `// ${metadata?.name || 'Design Tokens'}\n`
  dart += `// Generated: ${new Date().toISOString()}\n\n`
  dart += `import 'package:flutter/material.dart';\n\n`
  dart += `class DesignTokens {\n`

  if (tokens.colors) {
    tokens.colors.forEach(color => {
      const name = color.semantic || color.name || color.value
      const rgba = parseColorToRGBA(color.value)
      dart += `  static const Color ${sanitizeDartName(name)} = Color.fromRGBO(${Math.round(rgba.r * 255)}, ${Math.round(rgba.g * 255)}, ${Math.round(rgba.b * 255)}, ${rgba.a});\n`
    })
  }

  dart += `}\n`
  return dart
}

// ============================================================================
// Utility Functions
// ============================================================================

function sanitizeTokenName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

function sanitizeCSSVarName(name: string): string {
  return sanitizeTokenName(name)
}

function sanitizeSCSSVarName(name: string): string {
  return name
    .replace(/[^a-z0-9-_]/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

function sanitizeJSVarName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/^[0-9]/, '_$&')
}

function sanitizeYAMLKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function sanitizeSwiftName(name: string): string {
  return sanitizeJSVarName(name)
}

function sanitizeKotlinName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_')
}

function sanitizeXMLName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}

function sanitizeDartName(name: string): string {
  return sanitizeJSVarName(name)
}

function parseDimension(value: string): { value: string; unit: string } {
  const match = value.match(/^([0-9.]+)(.*)$/)
  if (match) {
    return {
      value: match[1],
      unit: match[2] || 'px'
    }
  }
  return { value: value, unit: '' }
}

function parseDuration(value: string): { value: string; unit: string } {
  const match = value.match(/^([0-9.]+)(ms|s)?$/)
  if (match) {
    return {
      value: match[1],
      unit: match[2] || 'ms'
    }
  }
  return { value: value, unit: 'ms' }
}

function parseColorToRGBA(color: string): { r: number; g: number; b: number; a: number } {
  // Simple hex to RGBA conversion
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }
  // Default fallback
  return { r: 0, g: 0, b: 0, a: 1 }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    'w3c-json': 'json',
    'figma': 'json',
    'figma-variables': 'json',
    'tailwind': 'css',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'stylus': 'styl',
    'ts': 'ts',
    'js': 'js',
    'json': 'json',
    'yaml': 'yaml',
    'style-dictionary': 'json',
    'theo': 'json',
    'swift': 'swift',
    'kotlin': 'kt',
    'xml': 'xml',
    'dart': 'dart'
  }
  return extensions[format]
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    'w3c-json': 'application/json',
    'figma': 'application/json',
    'figma-variables': 'application/json',
    'tailwind': 'text/css',
    'css': 'text/css',
    'scss': 'text/x-scss',
    'sass': 'text/x-sass',
    'less': 'text/x-less',
    'stylus': 'text/x-stylus',
    'ts': 'application/typescript',
    'js': 'application/javascript',
    'json': 'application/json',
    'yaml': 'text/yaml',
    'style-dictionary': 'application/json',
    'theo': 'application/json',
    'swift': 'text/x-swift',
    'kotlin': 'text/x-kotlin',
    'xml': 'application/xml',
    'dart': 'application/dart'
  }
  return mimeTypes[format]
}
