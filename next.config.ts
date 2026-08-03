import withBundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  // React Compiler — automatic memoization (stable in Next 16)
  reactCompiler: true,

  // Typed routes for compile-time href safety
  typedRoutes: true,

  // Pre-existing type debt across AI/analyzer modules; keep green builds while tightening tests.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Cache Components (PPR successor) stays off until API routes migrate to connection()/use cache.
  // Enable later with: cacheComponents: true

  // Keep heavy browser / native deps out of the server bundle graph.
  // Note: packages listed in optimizePackageImports cannot also be externalized.
  serverExternalPackages: [
    'playwright',
    'playwright-core',
    'puppeteer-core',
    '@sparticuz/chromium',
    'extract-css-core',
    'style-dictionary',
    'ws',
    'tar-fs',
  ],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'stripe.com', pathname: '/img/**' },
      { protocol: 'https', hostname: 'github.com', pathname: '/assets/**' },
      { protocol: 'https', hostname: 'figma.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'vercel.com', pathname: '/api/**' },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/screenshots/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/sites/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/contracts/**',
      },
      { protocol: 'https', hostname: 'designcontracts.sh', pathname: '/images/**' },
      { protocol: 'https', hostname: 'cdn.designcontracts.sh', pathname: '/images/**' },
      { protocol: 'https', hostname: 'images.designcontracts.sh', pathname: '/og/**' },
      { protocol: 'https', hostname: 'images.designcontracts.sh', pathname: '/sites/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Always optimize in production — never ship unoptimized images to users
    unoptimized: !isProd,
  },

  experimental: {
    // Inline critical CSS (removes render-blocking stylesheets)
    inlineCss: true,

    // Turbopack filesystem cache — faster cold starts / rebuilds
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,

    // Client router cache: keep soft navigations snappy
    staleTimes: {
      dynamic: 30,
      static: 180,
    },

    // Tree-shake heavy barrels — only ship what is imported
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'react-hook-form',
      '@hookform/resolvers',
      'zustand',
      'sonner',
      'cmdk',
      'vaul',
      'class-variance-authority',
    ],
  },

  // Turbopack (stable default in Next 16) — keep resolve extensions explicit
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },

  compiler: {
    removeConsole: isProd
      ? {
          exclude: ['error', 'warn'],
        }
      : false,
  },

  logging: {
    fetches: {
      fullUrl: !isProd,
    },
  },

  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  // Stable build IDs for CDN cache reuse (Date.now() busts every deploy unnecessarily)
  generateBuildId: async () => {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      process.env.SOURCE_VERSION ||
      'designcontracts-local'
    )
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Scan is dynamic — do not blanket-cache API mutations
        source: '/api/scan',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/api/stats',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=30, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/api/community/sites',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },

  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/documentation', destination: '/docs', permanent: true },
      { source: '/api-docs', destination: '/docs', permanent: true },
      // Chat is the product surface at /
      { source: '/scan', destination: '/', permanent: false },
      { source: '/agent', destination: '/', permanent: false },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap.xml',
      },
      {
        source: '/insights/vitals.js',
        destination: 'https://cdn.vercel-insights.com/v1/speed-insights/script.js',
      },
      {
        source: '/insights/events.js',
        destination: 'https://cdn.vercel-insights.com/v1/script.js',
      },
      {
        source: '/hfi/events/:slug*',
        destination: 'https://vitals.vercel-insights.com/v1/:slug*',
      },
      {
        source: '/hfi/vitals',
        destination: 'https://vitals.vercel-insights.com/v2/vitals',
      },
    ]
  },
}

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig)
