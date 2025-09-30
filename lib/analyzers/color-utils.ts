/**
 * Comprehensive color utilities for W3C Design Token format
 * Converts colors between formats and provides proper W3C-compliant output
 */

export interface RGBColor {
  r: number
  g: number
  b: number
  a?: number
}

export interface HSLColor {
  h: number
  s: number
  l: number
  a?: number
}

export interface W3CColor {
  colorSpace: 'srgb' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec2020'
  components: [number, number, number] | [number, number, number, number]
  alpha?: number
}

/**
 * Parse any CSS color string into RGB values
 */
export function parseColor(color: string): RGBColor | null {
  const trimmed = color.trim().toLowerCase()

  // Hex colors
  if (trimmed.startsWith('#')) {
    return parseHex(trimmed)
  }

  // RGB/RGBA
  if (trimmed.startsWith('rgb')) {
    return parseRGB(trimmed)
  }

  // HSL/HSLA
  if (trimmed.startsWith('hsl')) {
    return parseHSL(trimmed)
  }

  // Named colors
  const named = parseNamedColor(trimmed)
  if (named) return named

  return null
}

/**
 * Parse hex color (#rgb, #rrggbb, #rgba, #rrggbbaa)
 */
function parseHex(hex: string): RGBColor | null {
  const cleanHex = hex.replace('#', '')

  let r: number, g: number, b: number, a = 1

  if (cleanHex.length === 3 || cleanHex.length === 4) {
    // Short format: #rgb or #rgba
    r = parseInt(cleanHex[0] + cleanHex[0], 16)
    g = parseInt(cleanHex[1] + cleanHex[1], 16)
    b = parseInt(cleanHex[2] + cleanHex[2], 16)
    if (cleanHex.length === 4) {
      a = parseInt(cleanHex[3] + cleanHex[3], 16) / 255
    }
  } else if (cleanHex.length === 6 || cleanHex.length === 8) {
    // Full format: #rrggbb or #rrggbbaa
    r = parseInt(cleanHex.slice(0, 2), 16)
    g = parseInt(cleanHex.slice(2, 4), 16)
    b = parseInt(cleanHex.slice(4, 6), 16)
    if (cleanHex.length === 8) {
      a = parseInt(cleanHex.slice(6, 8), 16) / 255
    }
  } else {
    return null
  }

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    return null
  }

  return { r, g, b, a }
}

/**
 * Parse rgb() or rgba() format
 */
function parseRGB(rgb: string): RGBColor | null {
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/)

  if (!match) return null

  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])
  const a = match[4] ? parseFloat(match[4]) : 1

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
    return null
  }

  return { r, g, b, a }
}

/**
 * Parse hsl() or hsla() format and convert to RGB
 */
function parseHSL(hsl: string): RGBColor | null {
  const match = hsl.match(/hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*(?:,\s*([0-9.]+)\s*)?\)/)

  if (!match) return null

  const h = parseFloat(match[1])
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100
  const a = match[4] ? parseFloat(match[4]) : 1

  if (isNaN(h) || isNaN(s) || isNaN(l) || isNaN(a)) {
    return null
  }

  return hslToRgb({ h, s, l, a })
}

/**
 * Parse named CSS colors
 */
function parseNamedColor(name: string): RGBColor | null {
  const namedColors: Record<string, string> = {
    'aliceblue': '#f0f8ff',
    'antiquewhite': '#faebd7',
    'aqua': '#00ffff',
    'aquamarine': '#7fffd4',
    'azure': '#f0ffff',
    'beige': '#f5f5dc',
    'bisque': '#ffe4c4',
    'black': '#000000',
    'blanchedalmond': '#ffebcd',
    'blue': '#0000ff',
    'blueviolet': '#8a2be2',
    'brown': '#a52a2a',
    'burlywood': '#deb887',
    'cadetblue': '#5f9ea0',
    'chartreuse': '#7fff00',
    'chocolate': '#d2691e',
    'coral': '#ff7f50',
    'cornflowerblue': '#6495ed',
    'cornsilk': '#fff8dc',
    'crimson': '#dc143c',
    'cyan': '#00ffff',
    'darkblue': '#00008b',
    'darkcyan': '#008b8b',
    'darkgoldenrod': '#b8860b',
    'darkgray': '#a9a9a9',
    'darkgreen': '#006400',
    'darkkhaki': '#bdb76b',
    'darkmagenta': '#8b008b',
    'darkolivegreen': '#556b2f',
    'darkorange': '#ff8c00',
    'darkorchid': '#9932cc',
    'darkred': '#8b0000',
    'darksalmon': '#e9967a',
    'darkseagreen': '#8fbc8f',
    'darkslateblue': '#483d8b',
    'darkslategray': '#2f4f4f',
    'darkturquoise': '#00ced1',
    'darkviolet': '#9400d3',
    'deeppink': '#ff1493',
    'deepskyblue': '#00bfff',
    'dimgray': '#696969',
    'dodgerblue': '#1e90ff',
    'firebrick': '#b22222',
    'floralwhite': '#fffaf0',
    'forestgreen': '#228b22',
    'fuchsia': '#ff00ff',
    'gainsboro': '#dcdcdc',
    'ghostwhite': '#f8f8ff',
    'gold': '#ffd700',
    'goldenrod': '#daa520',
    'gray': '#808080',
    'green': '#008000',
    'greenyellow': '#adff2f',
    'honeydew': '#f0fff0',
    'hotpink': '#ff69b4',
    'indianred': '#cd5c5c',
    'indigo': '#4b0082',
    'ivory': '#fffff0',
    'khaki': '#f0e68c',
    'lavender': '#e6e6fa',
    'lavenderblush': '#fff0f5',
    'lawngreen': '#7cfc00',
    'lemonchiffon': '#fffacd',
    'lightblue': '#add8e6',
    'lightcoral': '#f08080',
    'lightcyan': '#e0ffff',
    'lightgoldenrodyellow': '#fafad2',
    'lightgray': '#d3d3d3',
    'lightgreen': '#90ee90',
    'lightpink': '#ffb6c1',
    'lightsalmon': '#ffa07a',
    'lightseagreen': '#20b2aa',
    'lightskyblue': '#87cefa',
    'lightslategray': '#778899',
    'lightsteelblue': '#b0c4de',
    'lightyellow': '#ffffe0',
    'lime': '#00ff00',
    'limegreen': '#32cd32',
    'linen': '#faf0e6',
    'magenta': '#ff00ff',
    'maroon': '#800000',
    'mediumaquamarine': '#66cdaa',
    'mediumblue': '#0000cd',
    'mediumorchid': '#ba55d3',
    'mediumpurple': '#9370db',
    'mediumseagreen': '#3cb371',
    'mediumslateblue': '#7b68ee',
    'mediumspringgreen': '#00fa9a',
    'mediumturquoise': '#48d1cc',
    'mediumvioletred': '#c71585',
    'midnightblue': '#191970',
    'mintcream': '#f5fffa',
    'mistyrose': '#ffe4e1',
    'moccasin': '#ffe4b5',
    'navajowhite': '#ffdead',
    'navy': '#000080',
    'oldlace': '#fdf5e6',
    'olive': '#808000',
    'olivedrab': '#6b8e23',
    'orange': '#ffa500',
    'orangered': '#ff4500',
    'orchid': '#da70d6',
    'palegoldenrod': '#eee8aa',
    'palegreen': '#98fb98',
    'paleturquoise': '#afeeee',
    'palevioletred': '#db7093',
    'papayawhip': '#ffefd5',
    'peachpuff': '#ffdab9',
    'peru': '#cd853f',
    'pink': '#ffc0cb',
    'plum': '#dda0dd',
    'powderblue': '#b0e0e6',
    'purple': '#800080',
    'red': '#ff0000',
    'rosybrown': '#bc8f8f',
    'royalblue': '#4169e1',
    'saddlebrown': '#8b4513',
    'salmon': '#fa8072',
    'sandybrown': '#f4a460',
    'seagreen': '#2e8b57',
    'seashell': '#fff5ee',
    'sienna': '#a0522d',
    'silver': '#c0c0c0',
    'skyblue': '#87ceeb',
    'slateblue': '#6a5acd',
    'slategray': '#708090',
    'snow': '#fffafa',
    'springgreen': '#00ff7f',
    'steelblue': '#4682b4',
    'tan': '#d2b48c',
    'teal': '#008080',
    'thistle': '#d8bfd8',
    'tomato': '#ff6347',
    'turquoise': '#40e0d0',
    'violet': '#ee82ee',
    'wheat': '#f5deb3',
    'white': '#ffffff',
    'whitesmoke': '#f5f5f5',
    'yellow': '#ffff00',
    'yellowgreen': '#9acd32'
  }

  const hex = namedColors[name]
  return hex ? parseHex(hex) : null
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSLColor): RGBColor {
  const { h, s, l, a = 1 } = hsl
  const hNorm = h / 360

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const r = Math.round(hueToRgb(p, q, hNorm + 1 / 3) * 255)
  const g = Math.round(hueToRgb(p, q, hNorm) * 255)
  const b = Math.round(hueToRgb(p, q, hNorm - 1 / 3) * 255)

  return { r, g, b, a }
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / diff + 2) / 6
        break
      case b:
        h = ((r - g) / diff + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100) / 100,
    l: Math.round(l * 100) / 100,
    a: rgb.a
  }
}

/**
 * Convert RGB to W3C Design Token color format
 */
export function rgbToW3C(rgb: RGBColor): W3CColor {
  const components: [number, number, number] | [number, number, number, number] =
    rgb.a !== undefined && rgb.a !== 1
      ? [
          Math.round((rgb.r / 255) * 1000) / 1000,
          Math.round((rgb.g / 255) * 1000) / 1000,
          Math.round((rgb.b / 255) * 1000) / 1000,
          Math.round(rgb.a * 1000) / 1000
        ]
      : [
          Math.round((rgb.r / 255) * 1000) / 1000,
          Math.round((rgb.g / 255) * 1000) / 1000,
          Math.round((rgb.b / 255) * 1000) / 1000
        ]

  return {
    colorSpace: 'srgb',
    components
  }
}

/**
 * Convert any color string to W3C Design Token format
 */
export function toW3CColor(color: string): W3CColor | null {
  const rgb = parseColor(color)
  if (!rgb) return null
  return rgbToW3C(rgb)
}

/**
 * Get semantic color name based on RGB values
 */
export function getSemanticColorName(rgb: RGBColor, index: number): string {
  const hsl = rgbToHsl(rgb)
  const { h, s, l } = hsl

  // Grayscale colors
  if (s < 0.1) {
    if (l > 0.95) return `white-${index}`
    if (l > 0.85) return `gray-50-${index}`
    if (l > 0.75) return `gray-100-${index}`
    if (l > 0.65) return `gray-200-${index}`
    if (l > 0.55) return `gray-300-${index}`
    if (l > 0.45) return `gray-400-${index}`
    if (l > 0.35) return `gray-500-${index}`
    if (l > 0.25) return `gray-600-${index}`
    if (l > 0.15) return `gray-700-${index}`
    if (l > 0.05) return `gray-800-${index}`
    return `black-${index}`
  }

  // Chromatic colors
  const shade = l > 0.7 ? 'light' : l > 0.4 ? 'base' : 'dark'

  if (h >= 345 || h < 15) return `red-${shade}-${index}`
  if (h >= 15 && h < 45) return `orange-${shade}-${index}`
  if (h >= 45 && h < 65) return `yellow-${shade}-${index}`
  if (h >= 65 && h < 150) return `green-${shade}-${index}`
  if (h >= 150 && h < 200) return `cyan-${shade}-${index}`
  if (h >= 200 && h < 260) return `blue-${shade}-${index}`
  if (h >= 260 && h < 290) return `purple-${shade}-${index}`
  if (h >= 290 && h < 345) return `pink-${shade}-${index}`

  return `color-${index}`
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGBColor): string {
  const r = rgb.r.toString(16).padStart(2, '0')
  const g = rgb.g.toString(16).padStart(2, '0')
  const b = rgb.b.toString(16).padStart(2, '0')

  if (rgb.a !== undefined && rgb.a !== 1) {
    const a = Math.round(rgb.a * 255).toString(16).padStart(2, '0')
    return `#${r}${g}${b}${a}`
  }

  return `#${r}${g}${b}`
}