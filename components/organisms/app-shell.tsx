'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  BookOpenIcon,
  BooksIcon,
  ChatCircleIcon,
  IconContext,
  ListIcon,
  PenNibIcon,
  PlugsIcon,
  PlusIcon,
  SidebarIcon,
  SidebarSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { ThemeToggle } from '@/components/atoms/theme-toggle'
import { AppStatsHeader } from '@/components/molecules/app-stats-header'
import { Button } from '@/components/ui/button'
import {
  getChatsServerSnapshot,
  getChatsSnapshot,
  subscribeChats,
  type ChatSummary,
} from '@/lib/chat-history'
import { pushRecent, readRecents, type RecentDomain } from '@/lib/recents'
import { cn } from '@/lib/utils'

export type AppShellPage =
  | 'chat'
  | 'library'
  | 'studio'
  | 'docs'
  | 'mcp'
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
  { href: '/', label: 'Chat', page: 'chat' as const, icon: ChatCircleIcon, pro: false },
  { href: '/community', label: 'Library', page: 'library' as const, icon: BooksIcon, pro: false },
  { href: '/studio', label: 'Studio', page: 'studio' as const, icon: PenNibIcon, pro: true },
  { href: '/mcp', label: 'MCP', page: 'mcp' as const, icon: PlugsIcon, pro: true },
  { href: '/docs', label: 'Docs', page: 'docs' as const, icon: BookOpenIcon, pro: false },
] as const

function SidebarBody({
  currentPage,
  recents,
  chats,
  onNavigate,
}: {
  currentPage: AppShellPage
  recents: RecentDomain[]
  chats: ChatSummary[]
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-1 px-2.5 py-3">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-2 flex items-baseline gap-0.5 rounded-lg px-2 py-1.5 outline-offset-4 transition-opacity hover:opacity-90"
        aria-label="designcontracts.sh home"
      >
        <span className="font-serif text-[15px] tracking-tight text-sidebar-foreground">
          designcontracts
        </span>
        <span className="font-mono text-[10px] text-[var(--ui-accent)]">.sh</span>
      </Link>

      <Link
        href="/"
        onClick={onNavigate}
        className="mb-2 inline-flex items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent"
      >
        <PlusIcon className="size-3.5 opacity-80" aria-hidden />
        New chat
      </Link>

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
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              {item.label}
              {item.pro ? (
                <span className="ml-auto rounded-full border border-[color-mix(in_oklab,var(--ui-accent)_35%,transparent)] px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--ui-accent)]">
                  Pro
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="flex min-h-0 flex-col">
          <p className="px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Recent chats
          </p>
          <ul className="flex flex-col gap-0.5">
            {chats.length === 0 ? (
              <li className="px-2.5 py-1.5 text-xs text-muted-foreground/80">
                Conversations show up here
              </li>
            ) : (
              chats.slice(0, 8).map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={`/?chat=${chat.id}` as '/'}
                    onClick={onNavigate}
                    className="block truncate rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    title={chat.title}
                  >
                    {chat.title}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {recents.length > 0 ? (
          <div className="flex min-h-0 flex-col">
            <p className="px-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Sites
            </p>
            <ul className="flex flex-col gap-0.5">
              {recents.slice(0, 6).map((item) => (
                <li key={item.domain}>
                  <Link
                    href={`/site/${item.domain}` as `/site/${string}`}
                    onClick={onNavigate}
                    className="block truncate rounded-lg px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  >
                    {item.domain}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-sidebar-border px-1 pt-2">
        <span className="px-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          App
        </span>
        <ThemeToggle />
      </div>
    </div>
  )
}

/**
 * Full-viewport product chrome: sidebar + main canvas. No marketing footer.
 * See DESIGN.md.
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
  const chats = useSyncExternalStore(
    subscribeChats,
    getChatsSnapshot,
    getChatsServerSnapshot
  )

  useEffect(() => {
    setRecents(readRecents())
  }, [])

  useEffect(() => {
    if (!recentDomain) return
    setRecents(pushRecent(recentDomain))
  }, [recentDomain])

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
    <div
      className={cn(
        'flex h-dvh max-h-dvh overflow-hidden bg-background text-foreground',
        className
      )}
    >
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative z-20 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex',
          collapsed ? 'w-[52px]' : 'w-[240px]'
        )}
        aria-label="App sidebar"
      >
        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-2 px-1.5 py-3">
            <Link
              href="/"
              className="flex size-9 items-center justify-center rounded-lg font-serif text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Chat"
            >
              d
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
                    'flex size-9 items-center justify-center rounded-lg transition',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="size-4" />
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
              <SidebarSimpleIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="relative flex h-full flex-col">
            <SidebarBody currentPage={currentPage} recents={recents} chats={chats} />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-3"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <SidebarIcon className="size-4" />
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col bg-sidebar shadow-xl">
            <SidebarBody
              currentPage={currentPage}
              recents={recents}
              chats={chats}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[color:var(--soft-border)] px-3 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            {mobileOpen ? <XIcon className="size-4" /> : <ListIcon className="size-4" />}
          </Button>
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="font-serif text-base tracking-tight">designcontracts</span>
            <span className="font-mono text-[10px] text-[var(--ui-accent)]">.sh</span>
          </Link>
        </header>

        {/* Utility strip — live Redis platform counters */}
        <div className="hidden h-9 shrink-0 items-center border-b border-[color:var(--soft-border)] px-2 md:flex">
          <AppStatsHeader className="w-full border-0 bg-transparent" />
        </div>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden" id="main-content">
          {children}
        </main>
      </div>
    </div>
    </IconContext.Provider>
  )
}

/** @deprecated Prefer AppShell — thin top bar kept for transitional imports */
export { AppChrome } from '@/components/organisms/app-chrome'
