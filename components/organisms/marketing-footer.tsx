import { Github } from "lucide-react"
import Link from "next/link"

const columns = [
  {
    title: "Product",
    links: [
      { href: "/scan", label: "Scan" },
      { href: "/community", label: "Library" },
      { href: "/pricing", label: "Pricing" },
      { href: "/features", label: "Features" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs#api", label: "API" },
      { href: "/docs#mcp", label: "MCP server" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-[color:var(--soft-border)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-baseline gap-1">
          <span className="font-serif text-xl tracking-tight text-foreground">designcontracts</span>
          <span className="font-mono text-[11px] text-[oklch(0.78_0.08_185)]">.sh</span>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.href}-${link.label}`}>
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

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--soft-border)] pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} designcontracts.sh
          </p>
          <a
            href="https://github.com/byronwade/ContextDS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub repository"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  )
}
