'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  BookOpen,
  Library,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Plus,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/atoms/theme-toggle'
import { AppStatsHeader } from '@/components/molecules/app-stats-header'
import { Button } from '@/components/ui/button'
import { pushRecent, readRecents, type RecentDomain } from '@/lib/recents'
import { cn } from '@/lib/utils'

export type AppShellPage =
  | 'chat'
  | 'library'
  | 'docs'
  | 'site'
  | 'features'
  | 'pricing'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'metrics'

type AppShellProps = {
  currentPage: AppShellPage
  children: React.ReactNode
  /** Optional domain to record in Recents (site detail) */
  recentDomain?: string
  className?: string
}

const PRIMARY_NAV = [
  { href: '/', label: 'Chat', page: 'chat' as const, icon: MessageSquare },
  { href: '/community', label: 'Library', page: 'library' as const, icon: Library },
  { href: '/docs', label: 'Docs', page: 'docs' as const, icon: BookOpen },
] as const

const MORE_NAV = [
  { href: '/features', label: 'Features', page: 'features' as const },
  { href: '/pricing', label: 'Pricing', page: 'pricing' as const },
  { href: '/about', label: 'About', page: 'about' as const },
] as const

const LEGAL_LINKS = [
  { href: '/contact', label: 'Contact', page: 'contact' as const },
  { href: '/privacy', label: 'Privacy', page: 'privacy' as const },
  { href: '/terms', label: 'Terms', page: 'terms' as const },
] as const

function SidebarBody({
  currentPage,
  recents,
  onNavigate,
}: {
  currentPage: AppShellPage
  recents: RecentDomain[]
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-1 px-2.5 py-3">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-1 flex items-baseline gap-0.5 rounded-[7px] px-2 py-1.5 outline-offset-4 transition-colors hover:bg-[var(--ui-paper-hover)]"
        aria-label="designcontracts.sh home"
      >
        <span className="text-[15px] font-medium tracking-tight text-[var(--ui-ink)]">
          designcontracts
        </span>
        <span className="font-mono text-[10px] text-[var(--ui-accent)]">.sh</span>
      </Link>

      <Button asChild size="sm" className="mb-2 w-full justify-start gap-2">
        <Link href="/" onClick={onNavigate}>
          <Plus className="size-3.5 opacity-90" aria-hidden />
          New chat
        </Link>
      </Button>

      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {PRIMARY_NAV.map((item) => {
          const active = currentPage === item.page
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-[7px] px-2.5 text-[13px] transition-colors',
                active
                  ? 'bg-[var(--ui-paper-selected)] text-[var(--ui-ink)]'
                  : 'text-[var(--ui-ink-secondary)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="px-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-ink-muted)]">
          Recents
        </p>
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {recents.length === 0 ? (
            <li className="px-2.5 py-1.5 text-xs text-[var(--ui-ink-muted)]">
              Scanned sites show up here
            </li>
          ) : (
            recents.map((item) => (
              <li key={item.domain}>
                <Link
                  href={`/site/${item.domain}` as `/site/${string}`}
                  onClick={onNavigate}
                  className="block h-7 truncate rounded-[7px] px-2.5 font-mono text-[12px] leading-7 text-[var(--ui-ink-secondary)] transition hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
                >
                  {item.domain}
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <nav
        className="mt-2 flex flex-col gap-0.5 border-t border-[var(--ui-border-soft)] pt-2"
        aria-label="More"
      >
        <p className="px-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-ink-muted)]">
          More
        </p>
        {MORE_NAV.map((item) => {
          const active = currentPage === item.page
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex h-7 items-center rounded-[7px] px-2.5 text-[13px] transition-colors',
                active
                  ? 'bg-[var(--ui-paper-selected)] text-[var(--ui-ink)]'
                  : 'text-[var(--ui-ink-secondary)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
        <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 px-2.5 pb-1">
          {LEGAL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.08em] transition-colors',
                currentPage === item.page
                  ? 'text-[var(--ui-ink)]'
                  : 'text-[var(--ui-ink-muted)] hover:text-[var(--ui-ink)]'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-1 flex flex-col gap-2 border-t border-[var(--ui-border-soft)] px-1 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-ink-muted)]">
            Theme
          </span>
        </div>
        <ThemeToggle className="w-full" />
      </div>
    </div>
  )
}

/**
 * Warm Paper Workbench shell:
 * outer canvas → 240px sidebar → inset paper workspace (toolbar/stats + body).
 */
export function AppShell({
  currentPage,
  children,
  recentDomain,
  className,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [recents, setRecents] = useState<RecentDomain[]>([])

  useEffect(() => {
    setRecents(readRecents())
  }, [])

  useEffect(() => {
    if (!recentDomain) return
    setRecents(pushRecent(recentDomain))
  }, [recentDomain])

  return (
    <div
      className={cn(
        'flex h-dvh max-h-dvh overflow-hidden bg-[var(--ui-canvas)] text-[var(--ui-ink)]',
        className
      )}
    >
      {/* Global sidebar on canvas */}
      <aside
        className={cn(
          'relative z-20 hidden shrink-0 flex-col md:flex',
          collapsed ? 'w-[52px]' : 'w-[240px]'
        )}
        aria-label="App sidebar"
      >
        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-1.5 px-1.5 py-3">
            <Link
              href="/"
              className="flex size-8 items-center justify-center rounded-[7px] text-sm font-medium text-[var(--ui-ink)] hover:bg-[var(--ui-paper-hover)]"
              aria-label="Chat"
            >
              <span>
                d<span className="text-[var(--ui-accent)]">.</span>
              </span>
            </Link>
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon
              const active = currentPage === item.page
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-[7px] transition',
                    active
                      ? 'bg-[var(--ui-paper-selected)] text-[var(--ui-ink)]'
                      : 'text-[var(--ui-ink-secondary)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]'
                  )}
                >
                  <Icon className="size-3.5" />
                </Link>
              )
            })}
            <Button
              variant="ghost"
              size="icon-sm"
              className="mt-auto"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <PanelLeft className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="relative flex h-full flex-col">
            <SidebarBody currentPage={currentPage} recents={recents} />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-3"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(43,39,35,0.35)]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col border-r border-[var(--ui-border-edge)] bg-[var(--ui-canvas)] shadow-[var(--shadow-float)]">
            <SidebarBody
              currentPage={currentPage}
              recents={recents}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {/* Inset paper workspace */}
      <div className="flex min-w-0 flex-1 flex-col p-0 md:p-2 md:pl-0">
        <div className="paper paper--shell flex min-h-0 flex-1 flex-col rounded-none border-0 shadow-none md:rounded-[var(--radius-shell)] md:border md:shadow-[var(--shadow-paper)]">
          {/* Mobile location bar */}
          <header className="paper__toolbar flex h-11 shrink-0 items-center gap-2 border-b border-[var(--ui-border-soft)] px-2 md:hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
            </Button>
            <Link href="/" className="flex items-baseline gap-0.5">
              <span className="text-[15px] font-medium tracking-tight">designcontracts</span>
              <span className="font-mono text-[10px] text-[var(--ui-accent)]">.sh</span>
            </Link>
          </header>

          {/* Utility strip — live Redis stats */}
          <div className="paper__toolbar !min-h-9 !px-0 !py-0">
            <AppStatsHeader className="w-full border-0 bg-transparent" />
          </div>

          <main
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ui-paper)]"
            id="main-content"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

/** @deprecated Prefer AppShell — thin top bar kept for transitional imports */
export { AppChrome } from '@/components/organisms/app-chrome'
