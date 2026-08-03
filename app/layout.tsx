import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SkipLinks } from "@/components/atoms/skip-links";
import { ErrorBoundary } from "@/components/atoms/error-boundary";
import { WebVitalsReporter } from "@/components/atoms/web-vitals-reporter";
import { ComprehensiveSEOTracking } from "@/components/atoms/seo-analytics";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { AppProviders } from "@/components/providers/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { generateHomepageMetadata } from "@/lib/seo/meta-tags";
import { generateOrganizationSchema, generateWebsiteSchema, generateSoftwareApplicationSchema } from "@/lib/seo/structured-data";
import { safeJsonLd } from "@/lib/seo/safe-json-ld";
import { RESOURCE_HINTS } from "@/lib/seo/performance";
import "./globals.css";

/* Inter substitutes licensed CursorGothic; keep --font-geist-* var names for compat */
const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "Menlo", "Monaco", "Consolas", "monospace"],
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
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();
  const softwareApplicationSchema = generateSoftwareApplicationSchema();

  return (
 <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />

        <link rel="canonical" href="https://designcontracts.sh" />

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

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Light-first cream theme colors */}
        <meta name="theme-color" content="#f7f7f4" />
        <meta name="theme-color" content="#161612" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f7f7f4" media="(prefers-color-scheme: light)" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(websiteSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(softwareApplicationSchema),
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
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

                if ('requestIdleCallback' in window) {
                  requestIdleCallback(() => {
                    fetch('/api/stats', { method: 'HEAD' }).catch(() => {});

                    const criticalRoutes = ['/community', '/scan'];
                    criticalRoutes.forEach(route => {
                      const link = document.createElement('link');
                      link.rel = 'prefetch';
                      link.href = route;
                      document.head.appendChild(link);
                    });
                  });
                }

                document.addEventListener('DOMContentLoaded', () => {
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
        <AppProviders>
          <AnalyticsProvider>
            <TooltipProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </TooltipProvider>
          </AnalyticsProvider>
        </AppProviders>
      </body>
    </html>
  );
}
