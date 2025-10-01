/**
 * Image Optimization and SEO for ContextDS
 * Utilities for optimizing images, generating alt text, and improving LCP
 */

export interface ImageSEOProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  domain?: string
  tokenType?: string
  category?: string
}

export interface ImageOptimizationConfig {
  formats: string[]
  quality: number
  sizes: string
  loading: 'lazy' | 'eager'
  decoding: 'async' | 'sync' | 'auto'
}

/**
 * Generate SEO-optimized alt text for design token images
 */
export function generateDesignTokenAltText(params: {
  domain: string
  tokenType: 'color' | 'typography' | 'spacing' | 'shadow' | 'radius' | 'layout'
  tokenName?: string
  context?: string
}): string {
  const { domain, tokenType, tokenName, context } = params

  const typeDescriptions = {
    color: 'color palette',
    typography: 'typography system',
    spacing: 'spacing scale',
    shadow: 'shadow effects',
    radius: 'border radius',
    layout: 'layout structure'
  }

  const baseDescription = `${domain} ${typeDescriptions[tokenType]}`

  if (tokenName) {
    return `${tokenName} ${tokenType} token from ${domain} design system`
  }

  if (context) {
    return `${baseDescription} ${context} - extracted design tokens`
  }

  return `${baseDescription} - design tokens extracted from ${domain}`
}

/**
 * Generate Open Graph image for site analysis
 */
export function generateOGImageUrl(params: {
  domain: string
  tokens: number
  categories: string[]
  theme?: 'light' | 'dark'
  width?: number
  height?: number
}): string {
  const { domain, tokens, categories, theme = 'light', width = 1200, height = 630 } = params

  const searchParams = new URLSearchParams({
    domain,
    tokens: tokens.toString(),
    categories: categories.slice(0, 4).join(','),
    theme,
    width: width.toString(),
    height: height.toString()
  })

  return `/api/og/site?${searchParams.toString()}`
}

/**
 * Generate optimal image configuration for different use cases
 */
export const IMAGE_CONFIGS: Record<string, ImageOptimizationConfig> = {
  hero: {
    formats: ['webp', 'avif'],
    quality: 90,
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    loading: 'eager',
    decoding: 'async'
  },
  tokenPreview: {
    formats: ['webp', 'avif'],
    quality: 85,
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw',
    loading: 'lazy',
    decoding: 'async'
  },
  thumbnail: {
    formats: ['webp', 'avif'],
    quality: 80,
    sizes: '(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 200px',
    loading: 'lazy',
    decoding: 'async'
  },
  logo: {
    formats: ['webp', 'svg'],
    quality: 95,
    sizes: '(max-width: 768px) 120px, 150px',
    loading: 'eager',
    decoding: 'sync'
  },
  socialShare: {
    formats: ['webp', 'png'],
    quality: 90,
    sizes: '1200px',
    loading: 'lazy',
    decoding: 'async'
  }
}

/**
 * Generate responsive image props for Next.js Image component
 */
export function generateImageProps(
  src: string,
  alt: string,
  config: keyof typeof IMAGE_CONFIGS,
  options: {
    width?: number
    height?: number
    priority?: boolean
    className?: string
  } = {}
): Record<string, any> {
  const imageConfig = IMAGE_CONFIGS[config]
  const { width, height, priority = false, className } = options

  return {
    src,
    alt,
    width,
    height,
    priority,
    className,
    quality: imageConfig.quality,
    sizes: imageConfig.sizes,
    loading: priority ? 'eager' : imageConfig.loading,
    decoding: imageConfig.decoding,
    placeholder: 'blur' as const,
    blurDataURL: generateBlurDataURL(width || 800, height || 600)
  }
}

/**
 * Generate base64 blur placeholder for images
 */
export function generateBlurDataURL(width: number, height: number): string {
  // Generate a simple gradient blur placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Image preloading utilities for LCP optimization
 */
export function preloadCriticalImages(images: Array<{ src: string; type: string }>) {
  if (typeof window === 'undefined') return

  images.forEach(({ src, type }) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    link.type = type
    document.head.appendChild(link)
  })
}

/**
 * Lazy loading with Intersection Observer for non-critical images
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      })
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        const src = img.dataset.src

        if (src) {
          img.src = src
          img.classList.remove('lazy-loading')
          img.classList.add('lazy-loaded')
          this.observer?.unobserve(img)
        }
      }
    })
  }

  observe(element: HTMLElement) {
    this.observer?.observe(element)
  }

  disconnect() {
    this.observer?.disconnect()
  }
}

/**
 * Generate WebP/AVIF versions of images for better compression
 */
export function generateOptimizedImageSources(
  src: string,
  quality: number = 85
): Array<{ src: string; type: string }> {
  const sources = []

  // AVIF version (best compression, modern browsers)
  sources.push({
    src: `${src}?format=avif&quality=${quality}`,
    type: 'image/avif'
  })

  // WebP version (good compression, wide support)
  sources.push({
    src: `${src}?format=webp&quality=${quality}`,
    type: 'image/webp'
  })

  // Original format as fallback
  sources.push({
    src,
    type: 'image/jpeg'
  })

  return sources
}

/**
 * Calculate optimal image dimensions for different viewports
 */
export function calculateResponsiveDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSizes: Array<{ breakpoint: number; maxWidth: number }>
): Array<{ width: number; height: number; breakpoint: number }> {
  const aspectRatio = originalHeight / originalWidth

  return maxSizes.map(({ breakpoint, maxWidth }) => {
    const width = Math.min(originalWidth, maxWidth)
    const height = Math.round(width * aspectRatio)

    return { width, height, breakpoint }
  })
}

/**
 * Generate schema.org ImageObject for SEO
 */
export function generateImageSchema(params: {
  url: string
  alt: string
  width: number
  height: number
  caption?: string
  license?: string
}) {
  const { url, alt, width, height, caption, license } = params

  return {
    '@type': 'ImageObject',
    url,
    width,
    height,
    caption: alt,
    description: caption || alt,
    license: license || 'https://creativecommons.org/licenses/by/4.0/',
    author: {
      '@type': 'Organization',
      name: 'ContextDS'
    }
  }
}

/**
 * Performance monitoring for images
 */
export function trackImagePerformance(imageSrc: string) {
  if (typeof window === 'undefined') return

  const img = new Image()
  const startTime = performance.now()

  img.onload = () => {
    const loadTime = performance.now() - startTime

    // Track image load performance
    if ('gtag' in window) {
      ;(window as any).gtag('event', 'image_load', {
        event_category: 'Performance',
        event_label: imageSrc,
        value: Math.round(loadTime),
        custom_parameter_1: 'image_load_time'
      })
    }

    // Send to analytics API
    fetch('/api/analytics/image-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        src: imageSrc,
        loadTime,
        timestamp: Date.now()
      })
    }).catch(console.error)
  }

  img.onerror = () => {
    // Track image load errors
    if ('gtag' in window) {
      ;(window as any).gtag('event', 'image_error', {
        event_category: 'Performance',
        event_label: imageSrc,
        value: 1
      })
    }
  }

  img.src = imageSrc
}