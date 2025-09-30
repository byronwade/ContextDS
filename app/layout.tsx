import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SkipLinks } from "@/components/atoms/skip-links";
import { ErrorBoundary } from "@/components/atoms/error-boundary";
import { WebVitalsReporter } from "@/components/atoms/web-vitals-reporter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Non-blocking font loading
  preload: true,   // Preload critical font
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,  // Don't preload monospace (used less)
});

export const metadata: Metadata = {
  title: "ContextDS - Design Tokens Made Fast",
  description: "Search across design systems, extract design tokens, and analyze layout DNA from any website. AI-powered design token extraction platform.",
  keywords: ["design tokens", "CSS extraction", "design systems", "web analysis", "UI tokens"],
  authors: [{ name: "ContextDS Team" }],
  openGraph: {
    title: "ContextDS - Design Tokens Made Fast",
    description: "AI-powered design token extraction platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resource hints for faster loading */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://ep-delicate-breeze-adofco8i-pooler.c-2.us-east-1.aws.neon.tech" crossOrigin="anonymous" />

        {/* Prefetch critical API routes */}
        <link rel="prefetch" href="/api/stats" as="fetch" crossOrigin="anonymous" />

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
                  const stored = localStorage.getItem('theme') || 'system';
                  setTheme(stored);
                } catch (e) {
                  setTheme('system');
                }
              })();
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipLinks />
        <WebVitalsReporter />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
