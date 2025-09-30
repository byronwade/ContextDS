import { gzipSync, gunzipSync } from 'zlib'

/**
 * Compress CSS content using gzip
 * Reduces storage by ~70% for CSS files
 *
 * @param css Raw CSS string
 * @returns Base64 encoded gzip compressed string
 */
export function compressCss(css: string): string {
  if (!css || css.length === 0) return ''

  try {
    const buffer = Buffer.from(css, 'utf-8')
    const compressed = gzipSync(buffer, { level: 9 }) // Max compression
    return compressed.toString('base64')
  } catch (error) {
    console.error('CSS compression failed:', error)
    // Return original on error (will be stored uncompressed)
    return css
  }
}

/**
 * Decompress gzip compressed CSS content
 *
 * @param compressed Base64 encoded gzip string
 * @returns Original CSS string
 */
export function decompressCss(compressed: string): string {
  if (!compressed || compressed.length === 0) return ''

  try {
    // Check if it's actually compressed (base64 encoded)
    // If it starts with typical CSS characters, it's not compressed
    if (compressed.startsWith('.') || compressed.startsWith('#') || compressed.startsWith('@')) {
      return compressed // Not compressed, return as-is
    }

    const buffer = Buffer.from(compressed, 'base64')
    const decompressed = gunzipSync(buffer)
    return decompressed.toString('utf-8')
  } catch (error) {
    console.error('CSS decompression failed:', error)
    // If decompression fails, assume it was stored uncompressed
    return compressed
  }
}

/**
 * Calculate compression ratio
 *
 * @param original Original size in bytes
 * @param compressed Compressed size in bytes
 * @returns Compression ratio as percentage
 */
export function compressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0
  return Math.round(((original - compressed) / original) * 100)
}

/**
 * Get storage savings statistics
 */
export function getCompressionStats(css: string): {
  originalSize: number
  compressedSize: number
  ratio: number
  savings: string
} {
  const compressed = compressCss(css)
  const originalSize = Buffer.byteLength(css, 'utf-8')
  const compressedSize = Buffer.byteLength(compressed, 'base64')
  const ratio = compressionRatio(originalSize, compressedSize)

  return {
    originalSize,
    compressedSize,
    ratio,
    savings: `${ratio}% (${formatBytes(originalSize)} → ${formatBytes(compressedSize)})`
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i) * 10) / 10} ${sizes[i]}`
}