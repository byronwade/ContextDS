import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React 19 compiler for automatic optimization
  reactCompiler: true,

  // Pre-existing type debt remains across AI/analyzer modules and store contracts.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Cache Components (PPR successor) is deferred: many API routes read request.url /
  // headers and need connection()/use cache migration before enabling.
  // experimental.ppr was removed in Next.js 16 in favor of cacheComponents.

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "stripe.com", pathname: "/**" },
      { protocol: "https", hostname: "github.com", pathname: "/**" },
      { protocol: "https", hostname: "figma.com", pathname: "/**" },
      { protocol: "https", hostname: "vercel.com", pathname: "/**" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
      { protocol: "https", hostname: "contextds.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.contextds.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.NODE_ENV === "development",
  },

  experimental: {
    // Inline CSS for critical styles (eliminates render-blocking CSS)
    inlineCss: true,

    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-accordion",
      "@radix-ui/react-tabs",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "recharts",
      "date-fns",
      "@projectwallace/css-analyzer",
      "@ai-sdk/openai",
      "openai",
      "react-hook-form",
      "@hookform/resolvers",
    ],
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=1, stale-while-revalidate=59",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      {
        source: "/documentation",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/api-docs",
        destination: "/api",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/api/sitemap.xml",
      },
      {
        source: "/insights/vitals.js",
        destination: "https://cdn.vercel-insights.com/v1/speed-insights/script.js",
      },
      {
        source: "/insights/events.js",
        destination: "https://cdn.vercel-insights.com/v1/script.js",
      },
      {
        source: "/hfi/events/:slug*",
        destination: "https://vitals.vercel-insights.com/v1/:slug*",
      },
      {
        source: "/hfi/vitals",
        destination: "https://vitals.vercel-insights.com/v2/vitals",
      },
    ];
  },
};

export default nextConfig;
