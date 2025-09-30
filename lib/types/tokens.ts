/**
 * Token type definitions for type-safe token manipulation
 */

export interface TokenValue {
  value: string
  confidence: number
  usage?: number
}

export interface ColorToken extends TokenValue {
  semantic?: string
}

export interface TypographyToken extends TokenValue {
  property: string
}

export interface MotionToken extends TokenValue {
  property: string
}

export interface CuratedTokens {
  colors: ColorToken[]
  typography: {
    families: TokenValue[]
    sizes: TokenValue[]
    weights?: TokenValue[]
    lineHeights?: TokenValue[]
  }
  spacing: TokenValue[]
  radius?: TokenValue[]
  shadows?: TokenValue[]
  gradients?: TokenValue[]
  motion?: MotionToken[]
}

export interface W3CToken {
  $value: string
  $type: string
  $description?: string
  [key: string]: unknown
}

export interface W3CTokenSet {
  [key: string]: W3CToken | W3CTokenSet
}

export interface ExportFormats {
  css: string
  scss: string
  javascript: string
  json: string
  typescript: string
  swift?: string
  kotlin?: string
  figma?: string
}