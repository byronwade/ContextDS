import Link from "next/link"
import { Github, Palette, Twitter } from "lucide-react"

const footerLinks = {
  product: [
    { label: "Token Scanner", href: "/scan" },
    { label: "Community", href: "/community" },
    { label: "Metrics", href: "/metrics" },
    { label: "Pricing", href: "/pricing" },
  ],
  resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/docs#api" },
    { label: "Features", href: "/features" },
    { label: "MCP Server", href: "/docs#mcp" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Login", href: "/login" },
    { label: "Sign up", href: "/signup" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
}

export function MarketingFooter() {
  return (
    <footer className="mt-auto w-full border-t border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-8 rounded-2xl border border-border/60 bg-card/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Ready to scan?
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Turn any website into design tokens
            </h2>
            <p className="text-sm text-muted-foreground">
              Extract colors, typography, spacing, and layout DNA — then use them in your AI workflow.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
            <Link
              href="/scan"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Start scanning
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Read the docs
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="mb-3 text-sm font-semibold capitalize text-foreground">
                {section}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <Palette className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">ContextDS</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ContextDS. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/byronwade/ContextDS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
