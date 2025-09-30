/**
 * Multi-Format Token Exporter
 * Exports W3C Design Tokens to Figma, Adobe XD, Swift, Android, CSS, SCSS, JS/TS
 */

import type { W3CTokenSet } from '@/lib/analyzers/w3c-tokenizer'
import type { CuratedTokenSet } from '@/lib/analyzers/token-curator'

export type ExportFormat = 'figma' | 'xd' | 'swift' | 'android' | 'css' | 'scss' | 'js' | 'ts' | 'json'

export interface ExportOptions {
  format: ExportFormat
  tokens: W3CTokenSet | CuratedTokenSet
  metadata?: {
    name: string
    version?: string
    author?: string
  }
}

/**
 * Main export function - routes to appropriate format
 */
export function exportTokens(options: ExportOptions): string {
  const { format, tokens } = options

  switch (format) {
    case 'figma':
      return exportToFigma(tokens, options.metadata)
    case 'xd':
      return exportToAdobeXD(tokens, options.metadata)
    case 'swift':
      return exportToSwift(tokens, options.metadata)
    case 'android':
      return exportToAndroid(tokens, options.metadata)
    case 'css':
      return exportToCSS(tokens, options.metadata)
    case 'scss':
      return exportToSCSS(tokens, options.metadata)
    case 'js':
      return exportToJavaScript(tokens, options.metadata)
    case 'ts':
      return exportToTypeScript(tokens, options.metadata)
    case 'json':
      return JSON.stringify(tokens, null, 2)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Export to Figma Tokens Plugin Format
 */
function exportToFigma(tokens: any, metadata?: any): string {
  const figmaTokens: any = {}

  // Convert W3C format to Figma Tokens format
  if (tokens.$metadata || tokens.color) {
    // W3C format
    const w3c = tokens as W3CTokenSet

    if (w3c.color) {
      figmaTokens.color = {}
      Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
        const components = token.$value?.components || token.$value
        if (Array.isArray(components)) {
          figmaTokens.color[name] = {
            value: rgbToHex(components),
            type: 'color',
            description: token.$description
          }
        }
      })
    }

    if (w3c.typography) {
      figmaTokens.fontFamilies = {}
      figmaTokens.fontSizes = {}
      figmaTokens.fontWeights = {}

      Object.entries(w3c.typography).forEach(([name, token]: [string, any]) => {
        if (token.$type === 'fontFamily') {
          figmaTokens.fontFamilies[name] = {
            value: Array.isArray(token.$value) ? token.$value[0] : token.$value,
            type: 'fontFamily'
          }
        } else if (token.$type === 'dimension' && name.includes('size')) {
          const dim = token.$value as { value: number; unit: string }
          figmaTokens.fontSizes[name] = {
            value: `${dim.value}${dim.unit}`,
            type: 'fontSize'
          }
        } else if (token.$type === 'fontWeight') {
          figmaTokens.fontWeights[name] = {
            value: token.$value,
            type: 'fontWeight'
          }
        }
      })
    }

    if (w3c.dimension) {
      figmaTokens.spacing = {}
      Object.entries(w3c.dimension).forEach(([name, token]: [string, any]) => {
        if (!name.includes('size')) {
          const dim = token.$value as { value: number; unit: string }
          figmaTokens.spacing[name] = {
            value: `${dim.value}${dim.unit}`,
            type: 'spacing'
          }
        }
      })
    }

    if (w3c.shadow) {
      figmaTokens.boxShadow = {}
      Object.entries(w3c.shadow).forEach(([name, token]: [string, any]) => {
        figmaTokens.boxShadow[name] = {
          value: token.$extensions?.['contextds.original'] || formatShadow(token.$value),
          type: 'boxShadow'
        }
      })
    }

    if (w3c.radius) {
      figmaTokens.borderRadius = {}
      Object.entries(w3c.radius).forEach(([name, token]: [string, any]) => {
        const dim = token.$value as { value: number; unit: string }
        figmaTokens.borderRadius[name] = {
          value: `${dim.value}${dim.unit}`,
          type: 'borderRadius'
        }
      })
    }
  }

  return JSON.stringify(figmaTokens, null, 2)
}

/**
 * Export to Adobe XD Format
 */
function exportToAdobeXD(tokens: any, metadata?: any): string {
  const xdTokens: any = {
    version: '1.0.0',
    tokens: {}
  }

  // Similar structure to Figma but with XD-specific formatting
  if (tokens.color || tokens.$metadata) {
    const w3c = tokens as W3CTokenSet

    if (w3c.color) {
      xdTokens.tokens.colors = {}
      Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
        const components = token.$value?.components || token.$value
        if (Array.isArray(components)) {
          xdTokens.tokens.colors[name] = {
            value: {
              r: Math.round(components[0] * 255),
              g: Math.round(components[1] * 255),
              b: Math.round(components[2] * 255),
              a: components[3] !== undefined ? components[3] : 1
            },
            type: 'color'
          }
        }
      })
    }
  }

  return JSON.stringify(xdTokens, null, 2)
}

/**
 * Export to Swift/iOS Format
 */
function exportToSwift(tokens: any, metadata?: any): string {
  const name = metadata?.name || 'DesignTokens'
  let swift = `// ${name} - Generated Design Tokens\n`
  swift += `// Generated: ${new Date().toISOString()}\n\n`
  swift += `import UIKit\n\n`
  swift += `extension UIColor {\n\n`

  const w3c = tokens as W3CTokenSet

  if (w3c.color) {
    Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
      const components = token.$value?.components || []
      if (Array.isArray(components)) {
        const r = components[0] || 0
        const g = components[1] || 0
        const b = components[2] || 0
        const a = components[3] !== undefined ? components[3] : 1

        const swiftName = toSwiftName(name)
        swift += `    static let ${swiftName} = UIColor(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, alpha: ${a.toFixed(3)})\n`
      }
    })
  }

  swift += `}\n\n`

  // Add spacing constants
  if (w3c.dimension) {
    swift += `struct Spacing {\n\n`
    Object.entries(w3c.dimension).forEach(([name, token]: [string, any]) => {
      const dim = token.$value as { value: number; unit: string }
      if (dim && dim.unit === 'px') {
        const swiftName = toSwiftName(name)
        swift += `    static let ${swiftName}: CGFloat = ${dim.value}\n`
      }
    })
    swift += `}\n`
  }

  return swift
}

/**
 * Export to Android XML Format
 */
function exportToAndroid(tokens: any, metadata?: any): string {
  const w3c = tokens as W3CTokenSet
  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`
  xml += `<!-- Generated Design Tokens -->\n`
  xml += `<!-- Generated: ${new Date().toISOString()} -->\n\n`

  // Colors
  xml += `<!-- Colors -->\n`
  xml += `<resources>\n\n`

  if (w3c.color) {
    Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
      const components = token.$value?.components || []
      if (Array.isArray(components)) {
        const hex = rgbToHex(components)
        const androidName = toAndroidName(name)
        xml += `    <color name="${androidName}">${hex}</color>\n`
      }
    })
  }

  xml += `\n</resources>\n\n`

  // Dimensions
  xml += `<!-- Dimensions -->\n`
  xml += `<resources>\n\n`

  if (w3c.dimension) {
    Object.entries(w3c.dimension).forEach(([name, token]: [string, any]) => {
      const dim = token.$value as { value: number; unit: string }
      if (dim && (dim.unit === 'px' || dim.unit === 'dp')) {
        const androidName = toAndroidName(name)
        xml += `    <dimen name="${androidName}">${dim.value}dp</dimen>\n`
      }
    })
  }

  xml += `\n</resources>\n`

  return xml
}

/**
 * Export to CSS Variables
 */
function exportToCSS(tokens: any, metadata?: any): string {
  let css = `/* ${metadata?.name || 'Design Tokens'} */\n`
  css += `/* Generated: ${new Date().toISOString()} */\n\n`
  css += `:root {\n`

  const w3c = tokens as W3CTokenSet

  if (w3c.color) {
    css += `\n  /* Colors */\n`
    Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
      const components = token.$value?.components || []
      if (Array.isArray(components)) {
        const hex = rgbToHex(components)
        css += `  --${toCSSVarName(name)}: ${hex};\n`
      }
    })
  }

  if (w3c.typography) {
    css += `\n  /* Typography */\n`
    Object.entries(w3c.typography).forEach(([name, token]: [string, any]) => {
      const value = Array.isArray(token.$value) ? token.$value[0] : token.$value
      if (typeof value === 'object' && 'value' in value) {
        css += `  --${toCSSVarName(name)}: ${value.value}${value.unit};\n`
      } else if (typeof value === 'string') {
        css += `  --${toCSSVarName(name)}: ${value};\n`
      } else if (typeof value === 'number') {
        css += `  --${toCSSVarName(name)}: ${value};\n`
      }
    })
  }

  if (w3c.dimension) {
    css += `\n  /* Spacing */\n`
    Object.entries(w3c.dimension).forEach(([name, token]: [string, any]) => {
      const dim = token.$value as { value: number; unit: string }
      css += `  --${toCSSVarName(name)}: ${dim.value}${dim.unit};\n`
    })
  }

  if (w3c.shadow) {
    css += `\n  /* Shadows */\n`
    Object.entries(w3c.shadow).forEach(([name, token]: [string, any]) => {
      const value = token.$extensions?.['contextds.original'] || String(token.$value)
      css += `  --${toCSSVarName(name)}: ${value};\n`
    })
  }

  css += `}\n`

  return css
}

/**
 * Export to SCSS Variables
 */
function exportToSCSS(tokens: any, metadata?: any): string {
  let scss = `// ${metadata?.name || 'Design Tokens'}\n`
  scss += `// Generated: ${new Date().toISOString()}\n\n`

  const w3c = tokens as W3CTokenSet

  if (w3c.color) {
    scss += `// Colors\n`
    Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
      const components = token.$value?.components || []
      if (Array.isArray(components)) {
        const hex = rgbToHex(components)
        scss += `$${toSCSSVarName(name)}: ${hex};\n`
      }
    })
    scss += `\n`
  }

  if (w3c.dimension) {
    scss += `// Spacing\n`
    Object.entries(w3c.dimension).forEach(([name, token]: [string, any]) => {
      const dim = token.$value as { value: number; unit: string }
      scss += `$${toSCSSVarName(name)}: ${dim.value}${dim.unit};\n`
    })
    scss += `\n`
  }

  return scss
}

/**
 * Export to JavaScript/TypeScript
 */
function exportToJavaScript(tokens: any, metadata?: any): string {
  const name = metadata?.name || 'designTokens'

  let js = `// ${metadata?.name || 'Design Tokens'}\n`
  js += `// Generated: ${new Date().toISOString()}\n\n`
  js += `export const ${name} = {\n`

  const w3c = tokens as W3CTokenSet

  if (w3c.color) {
    js += `  color: {\n`
    Object.entries(w3c.color).forEach(([name, token]: [string, any]) => {
      const components = token.$value?.components || []
      if (Array.isArray(components)) {
        const hex = rgbToHex(components)
        js += `    ${toJSName(name)}: '${hex}',\n`
      }
    })
    js += `  },\n\n`
  }

  if (w3c.dimension) {
    js += `  spacing: {\n`
    Object.entries(w3c.dimension).forEach(([name, token]: [string, any]) => {
      const dim = token.$value as { value: number; unit: string }
      js += `    ${toJSName(name)}: '${dim.value}${dim.unit}',\n`
    })
    js += `  },\n\n`
  }

  js += `}\n`

  return js
}

function exportToTypeScript(tokens: any, metadata?: any): string {
  const js = exportToJavaScript(tokens, metadata)

  // Add TypeScript types
  let ts = `// TypeScript Design Tokens\n`
  ts += `\n`
  ts += `export interface DesignTokens {\n`
  ts += `  color: Record<string, string>\n`
  ts += `  spacing: Record<string, string>\n`
  ts += `}\n\n`
  ts += js

  return ts
}

/**
 * Helper functions
 */

function rgbToHex(components: number[]): string {
  const r = Math.round(components[0] * 255)
  const g = Math.round(components[1] * 255)
  const b = Math.round(components[2] * 255)

  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

  // Add alpha if present
  if (components[3] !== undefined && components[3] !== 1) {
    const a = Math.round(components[3] * 255)
    return `${hex}${a.toString(16).padStart(2, '0')}`
  }

  return hex.toUpperCase()
}

function formatShadow(shadowObj: any): string {
  if (typeof shadowObj === 'string') return shadowObj

  return `${shadowObj.offsetX?.value || 0}${shadowObj.offsetX?.unit || 'px'} ${shadowObj.offsetY?.value || 0}${shadowObj.offsetY?.unit || 'px'} ${shadowObj.blur?.value || 0}${shadowObj.blur?.unit || 'px'} ${shadowObj.spread?.value || 0}${shadowObj.spread?.unit || 'px'} ${shadowObj.color || '#000'}`
}

function toSwiftName(name: string): string {
  // Convert to camelCase for Swift
  return name
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toLowerCase())
}

function toAndroidName(name: string): string {
  // Convert to snake_case for Android
  return name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).toLowerCase()
}

function toCSSVarName(name: string): string {
  // Already kebab-case for CSS
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

function toSCSSVarName(name: string): string {
  // Same as CSS but without --
  return toCSSVarName(name)
}

function toJSName(name: string): string {
  // camelCase for JavaScript
  return name
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(.)/, (_, char) => char.toLowerCase())
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    figma: 'json',
    xd: 'json',
    swift: 'swift',
    android: 'xml',
    css: 'css',
    scss: 'scss',
    js: 'js',
    ts: 'ts',
    json: 'json'
  }

  return extensions[format]
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    figma: 'application/json',
    xd: 'application/json',
    swift: 'text/plain',
    android: 'application/xml',
    css: 'text/css',
    scss: 'text/plain',
    js: 'application/javascript',
    ts: 'application/typescript',
    json: 'application/json'
  }

  return mimeTypes[format]
}