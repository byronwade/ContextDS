'use client'

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
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ThemeToggle } from '@/components/atoms/theme-toggle'
import { AppStatsHeader } from '@/components/molecules/app-stats-header'
import { Button } from '@/components/ui/button'
import {
  type ChatSummary,
  getChatsServerSnapshot,
  getChatsSnapshot,
  subscribeChats,
} from '@/lib/chat-history'
import { pushRecent, type RecentDomain, readRecents } from '@/lib/recents'
import { cn } from '@/lib/utils'

export type AppShellPage =
  | 'chat'
  | 'library'
  | 'create'
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
  { href: '/create', label: 'Create', page: 'create' as const, icon: PlusIcon, pro: false },
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
    <div className="flex h-full flex-col px-3 py-3">
      <Link
        prefetch={false}
        href="/"
        onClick={onNavigate}
        className="mb-3 flex items-baseline gap-0.5 px-1.5 py-1 outline-offset-4 transition-opacity hover:opacity-80"
        aria-label="designcontracts.sh home"
      >
        <span className="text-[15px] font-normal tracking-[-0.02em] text-[var(--ui-ink)]">
          designcontracts
        </span>
        <span className="font-mono text-[10px] text-[var(--ui-accent)]">.sh</span>
      </Link>

      <Link
        prefetch={false}
        href="/"
        onClick={onNavigate}
        className="mb-3 inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] px-3 text-[13px] text-[var(--ui-ink)] transition hover:bg-[var(--ui-paper-hover)]"
      >
        <PlusIcon className="size-3.5 opacity-70" aria-hidden />
        New chat
      </Link>

      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {PRIMARY_NAV.map((item) => {
          const active = currentPage === item.page
          const Icon = item.icon
          return (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 text-[13px] transition-colors',
                active
                  ? 'bg-[var(--ui-paper-selected)] text-[var(--ui-ink)]'
                  : 'text-[var(--ui-ink-secondary)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-4 shrink-0 opacity-75" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.pro ? (
                <span className="rounded-[var(--radius-xs)] bg-[var(--ui-paper)] px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--ui-ink-muted)]">
                  Pro
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <div className="flex min-h-0 flex-col">
          <p className="px-2.5 pb-1.5 text-[11px] text-[var(--ui-ink-muted)]">Recent</p>
          <ul className="flex flex-col gap-0.5">
            {chats.length === 0 ? (
              <li className="px-2.5 py-1.5 text-[12px] text-[var(--ui-ink-muted-soft)]">
                Conversations show up here
              </li>
            ) : (
              chats.slice(0, 8).map((chat) => (
                <li key={chat.id}>
                  <Link
                    prefetch={false}
                    href={`/?chat=${chat.id}` as '/'}
                    onClick={onNavigate}
                    className="block truncate rounded-[var(--radius-md)] px-2.5 py-1.5 text-[12px] text-[var(--ui-ink-secondary)] transition hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
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
            <p className="px-2.5 pb-1.5 text-[11px] text-[var(--ui-ink-muted)]">Sites</p>
            <ul className="flex flex-col gap-0.5">
              {recents.slice(0, 6).map((item) => (
                <li key={item.domain}>
                  <Link
                    prefetch={false}
                    href={`/site/${item.domain}` as `/site/${string}`}
                    onClick={onNavigate}
                    className="block truncate rounded-[var(--radius-md)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--ui-ink-secondary)] transition hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
                  >
                    {item.domain}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 border-t border-[var(--ui-border-soft)] pt-3">
        <ThemeToggle fullWidth />
      </div>
    </div>
  )
}

/**
 * Full-viewport product chrome: cream canvas sidebar + inset white workspace.
 * Hairline-only depth. See DESIGN.md.
 */
export function AppShell({ currentPage, children, recentDomain, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [recents, setRecents] = useState<RecentDomain[]>([])
  const chats = useSyncExternalStore(subscribeChats, getChatsSnapshot, getChatsServerSnapshot)

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
          'flex h-dvh max-h-dvh overflow-hidden bg-[var(--ui-canvas)] text-[var(--ui-ink)]',
          className
        )}
      >
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
                prefetch={false}
                href="/"
                className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-sm font-normal text-[var(--ui-accent)] hover:bg-[var(--ui-paper-hover)]"
                aria-label="Chat"
              >
                d
              </Link>
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon
                const active = currentPage === item.page
                return (
                  <Link
                    prefetch={false}
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-[var(--radius-md)] transition',
                      active
                        ? 'bg-[var(--ui-paper-selected)] text-[var(--ui-ink)]'
                        : 'text-[var(--ui-ink-muted)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]'
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
                className="absolute right-2 top-2.5"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <SidebarIcon className="size-4" />
              </Button>
            </div>
          )}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[var(--ui-ink)]/20"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(280px,88vw)] flex-col border-r border-[var(--ui-border)] bg-[var(--ui-canvas)]">
              <SidebarBody
                currentPage={currentPage}
                recents={recents}
                chats={chats}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-0 md:p-3">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--ui-border-soft)] px-3 md:hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              {mobileOpen ? <XIcon className="size-4" /> : <ListIcon className="size-4" />}
            </Button>
            <Link prefetch={false} href="/" className="flex items-baseline gap-0.5">
              <span className="text-[15px] font-normal tracking-[-0.02em]">designcontracts</span>
              <span className="font-mono text-[10px] text-[var(--ui-accent)]">.sh</span>
            </Link>
          </header>

          <main
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--ui-paper)] md:rounded-[var(--radius-shell)] md:border md:border-[var(--ui-border-edge)]"
            id="main-content"
          >
            <div className="hidden shrink-0 border-b border-[var(--ui-border-soft)] bg-[var(--ui-paper-subtle)] md:block">
              <AppStatsHeader />
            </div>
            {children}
          </main>
        </div>
      </div>
    </IconContext.Provider>
  )
}

/** @deprecated Prefer AppShell — thin top bar kept for transitional imports */
export { AppChrome } from '@/components/organisms/app-chrome'
