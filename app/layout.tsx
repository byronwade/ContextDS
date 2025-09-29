import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SkipLinks } from "@/components/atoms/skip-links";
import { ErrorBoundary } from "@/components/atoms/error-boundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
