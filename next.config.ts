import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "stripe.com", pathname: "/**" },
      { protocol: "https", hostname: "github.com", pathname: "/**" },
      { protocol: "https", hostname: "figma.com", pathname: "/**" },
      { protocol: "https", hostname: "vercel.com", pathname: "/**" }
    ],
    domains: ["stripe.com", "github.com", "figma.com", "vercel.com"]
  },
  // Performance optimizations - no caching, pure architectural wins
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns'
    ],
    // Use optimized CSS loading
    optimizeCss: true,
  },
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true
};

export default nextConfig;
