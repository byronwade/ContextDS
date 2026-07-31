'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ListIcon as Menu, XIcon as X } from '@/lib/phosphor'
import { ThemeToggle } from '@/components/atoms/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/community', label: 'Library' },
  { href: '/docs', label: 'Docs' },
] as const

type AppChromeProps = {
  currentPage?: 'home' | 'scan' | 'community' | 'docs' | 'site'
  className?: string
}

/**
 * Thin app chrome for the chat-first product surface.
 * No marketing CTA, no footer — just brand + secondary nav.
 */
export function AppChrome({ currentPage = 'home', className }: AppChromeProps) {
  const [open, setOpen] = useState(false)

  return (
    <header
      className={cn(
        'relative z-50 flex h-12 shrink-0 items-center border-b border-[color:var(--soft-border)] bg-background/85 px-3 backdrop-blur-xl sm:px-4',
        className
      )}
      role="banner"
    >
      <Link
        href="/"
        className="flex items-baseline gap-0.5 outline-offset-4 transition-opacity hover:opacity-80"
        aria-label="designcontracts.sh home"
      >
        <span className="font-serif text-base tracking-tight text-foreground sm:text-lg">
          designcontracts
        </span>
        <span className="font-mono text-[10px] text-[oklch(0.78_0.08_185)]">.sh</span>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <nav className="hidden items-center gap-0.5 sm:flex" aria-label="App navigation">
          {NAV.map((item) => {
            const active =
              (item.href === '/community' && currentPage === 'community') ||
              (item.href === '/docs' && currentPage === 'docs')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-2.5 py-1 text-sm transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {open ? (
        <nav
          className="absolute inset-x-0 top-12 z-50 border-b border-[color:var(--soft-border)] bg-background/95 px-3 py-2 backdrop-blur-xl sm:hidden"
          aria-label="Mobile navigation"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
