import Link from "next/link"
import { Github, Twitter } from "lucide-react"

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-grep-2 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Token Scanner
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link href="/metrics" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Metrics
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Guides
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Examples
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  License
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-grep-9 hover:text-foreground transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-grep-2 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-grep-9">
            © {new Date().getFullYear()} ContextDS. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-grep-9 hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-grep-9 hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
