import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SkipLinks } from "@/components/atoms/skip-links";
import { ErrorBoundary } from "@/components/atoms/error-boundary";
import { WebVitalsReporter } from "@/components/atoms/web-vitals-reporter";
import { ComprehensiveSEOTracking } from "@/components/atoms/seo-analytics";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { generateHomepageMetadata } from "@/lib/seo/meta-tags";
import { generateOrganizationSchema, generateWebsiteSchema, generateSoftwareApplicationSchema } from "@/lib/seo/structured-data";
import { RESOURCE_HINTS } from "@/lib/seo/performance";
import "./globals.css";

/** CursorGothic substitute — Inter @ 400 with tight tracking for display */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["Fira Code", "ui-monospace", "Menlo", "Monaco", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  ...generateHomepageMetadata(),
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://designcontracts.sh"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate structured data for root level
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();
  const softwareApplicationSchema = generateSoftwareApplicationSchema();

  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        {/* SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://designcontracts.sh" />

        {/* Resource hints for performance */}
        {RESOURCE_HINTS.dnsPrefetch.map((href) => (
          <link key={href} rel="dns-prefetch" href={href} />
        ))}

        {RESOURCE_HINTS.preconnect.map(({ href, crossOrigin }) => (
          <link key={href} rel="preconnect" href={href} crossOrigin={crossOrigin ? "anonymous" : undefined} />
        ))}

        {RESOURCE_HINTS.preload.map(({ href, as, type, crossOrigin }) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as={as}
            type={type}
            crossOrigin={crossOrigin ? "anonymous" : undefined}
          />
        ))}

        {RESOURCE_HINTS.prefetch.map((href) => (
          <link key={href} rel="prefetch" href={href} />
        ))}

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Cream-first brand theme colors (Cursor editorial) */}
        <meta name="theme-color" content="#f7f7f4" />
        <meta name="theme-color" content="#f7f7f4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1916" media="(prefers-color-scheme: dark)" />

        {/* Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema)
          }}
        />

        {/* Critical CSS will be inlined by Next.js */}

        {/* Performance optimization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Theme initialization - prevent FOUC
                function setTheme(theme) {
                  const root = document.documentElement;
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const actualTheme = theme === 'system' ? systemTheme : theme;

                  root.classList.remove('light', 'dark');
                  root.classList.add(actualTheme);
                  root.style.colorScheme = actualTheme;
                }

                try {
                  const stored = localStorage.getItem('theme') || 'light';
                  setTheme(stored);
                } catch (e) {
                  setTheme('light');
                }

                // Performance optimizations
                // Preload critical resources when network is idle
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(() => {
                    // Preload critical API endpoints
                    fetch('/api/stats', { method: 'HEAD' }).catch(() => {});

                    // Warm up critical routes
                    const criticalRoutes = ['/community', '/scan'];
                    criticalRoutes.forEach(route => {
                      const link = document.createElement('link');
                      link.rel = 'prefetch';
                      link.href = route;
                      document.head.appendChild(link);
                    });
                  });
                }

                // Prevent layout shift for dynamic content
                document.addEventListener('DOMContentLoaded', () => {
                  // Reserve space for elements that might cause layout shift
                  const dynamicElements = document.querySelectorAll('[data-dynamic-content]');
                  dynamicElements.forEach(el => {
                    if (!el.style.minHeight) {
                      el.style.minHeight = '200px';
                    }
                  });
                });
              })();
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <SkipLinks />
        <WebVitalsReporter />
        <ComprehensiveSEOTracking />
        <AnalyticsProvider>
          <TooltipProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </TooltipProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
