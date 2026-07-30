'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowUp, Clock, ExternalLink, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppShell } from '@/components/organisms/app-shell'
import { trackClientEvent } from '@/lib/analytics/track-client'
import { useVotingStore } from '@/stores/voting-store'
import { cn } from '@/lib/utils'

type Site = {
  id: string
  domain: string
  title: string | null
  description: string | null
  favicon: string | null
  tokensCount: number
  popularity: number
  votes: number
  lastScanned: string | null
  hasVoted: boolean
}

type SortOption = 'votes' | 'recent' | 'tokens'

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 2592000)}mo ago`
}

export default function CommunityClient() {
  const [sites, setSites] = useState<Site[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('votes')
  const [votingId, setVotingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)
  const { hasVoted, addVote, loadVotes } = useVotingStore()

  useEffect(() => {
    loadVotes()
  }, [loadVotes])

  useEffect(() => {
    trackClientEvent('library_view')
  }, [])

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const response = await fetch(`/api/community/sites?sort=${sortBy}`)
        if (!response.ok) throw new Error('Failed to load sites')
        const data = await response.json()
        if (cancelled) return
        const next = (data.sites || []).map((site: Site) => ({
          ...site,
          hasVoted: hasVoted(site.id),
        }))
        setSites(next)
      } catch (error) {
        console.error('Error loading sites:', error)
        if (!cancelled) setSites([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [sortBy, hasVoted])

  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites
    const q = searchQuery.toLowerCase()
    return sites.filter(
      (site) =>
        site.domain.toLowerCase().includes(q) ||
        site.title?.toLowerCase().includes(q) ||
        site.description?.toLowerCase().includes(q)
    )
  }, [searchQuery, sites])

  const handleVote = async (siteId: string) => {
    if (hasVoted(siteId)) return
    setVotingId(siteId)
    try {
      const response = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      })
      if (!response.ok) return
      addVote(siteId)
      setSites((prev) =>
        prev.map((site) =>
          site.id === siteId
            ? {
                ...site,
                votes: site.votes + 1,
                popularity: site.popularity + 1,
                hasVoted: true,
              }
            : site
        )
      )
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setVotingId(null)
    }
  }

  const loading = !loaded || isPending

  return (
    <AppShell currentPage="library">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        role="region"
        aria-label="Design Contracts library"
      >
        {/* Location bar */}
        <div className="paper__toolbar !min-h-11 shrink-0 justify-between !px-3 sm:!px-4">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-[var(--ui-ink)]">
              Library
            </h1>
            <p className="truncate text-[12px] text-[var(--ui-ink-muted)]">
              Design Contracts from public sites
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/">New scan</Link>
          </Button>
        </div>

        {/* View bar — search + sort */}
        <div className="paper__toolbar !min-h-11 shrink-0 flex-wrap !gap-2 !px-3 sm:!px-4">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ui-ink-muted)]"
              aria-hidden
            />
            <Input
              id="community-search"
              type="search"
              placeholder="Search domains…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8"
              aria-label="Search scanned sites"
            />
          </div>
          <p className="font-mono text-[11px] tabular-nums text-[var(--ui-ink-muted)]">
            {filteredSites.length} {filteredSites.length === 1 ? 'site' : 'sites'}
          </p>
          <div
            className="ml-auto flex rounded-[7px] bg-[var(--ui-paper)] p-0.5 shadow-[var(--shadow-control)]"
            role="tablist"
            aria-label="Sort options"
          >
            {(
              [
                ['votes', 'Popular'],
                ['recent', 'Recent'],
                ['tokens', 'Tokens'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={sortBy === value}
                onClick={() => setSortBy(value)}
                className={cn(
                  'h-7 rounded-[6px] px-2.5 text-[12px] transition-colors',
                  sortBy === value
                    ? 'bg-[var(--ui-paper-selected)] font-medium text-[var(--ui-ink)]'
                    : 'text-[var(--ui-ink-secondary)] hover:text-[var(--ui-ink)]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Operational list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col" role="status" aria-label="Loading sites">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse border-b border-[var(--ui-border-soft)] bg-[var(--ui-paper-subtle)]/60"
                />
              ))}
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="mx-auto max-w-[712px] px-4 py-16 text-center">
              <h2 className="text-lg font-semibold text-[var(--ui-ink)]">No sites yet</h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] text-[var(--ui-ink-secondary)]">
                {searchQuery
                  ? 'Nothing matched that search.'
                  : 'Scan a public site and it will show up here.'}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {searchQuery ? (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                ) : null}
                <Button asChild size="sm">
                  <Link href="/">Open chat</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col">
              {filteredSites.map((site) => (
                <li
                  key={site.id}
                  className="group flex min-h-11 items-center gap-3 border-b border-[var(--ui-border-soft)] px-3 transition-colors hover:bg-[var(--ui-paper-hover)] sm:px-4"
                >
                  {site.favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={site.favicon}
                      alt=""
                      className="size-6 shrink-0 rounded-[4px] border border-[var(--ui-border-soft)] bg-[var(--ui-paper)] object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-[var(--ui-border-soft)] bg-[var(--ui-paper-subtle)] font-mono text-[9px] text-[var(--ui-ink-muted)]"
                      aria-hidden
                    >
                      {site.domain.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <Link
                      href={`/site/${site.domain}`}
                      className="truncate text-[13px] font-medium text-[var(--ui-ink)] hover:text-[var(--ui-accent)]"
                    >
                      {site.title || site.domain}
                    </Link>
                    <span className="hidden shrink-0 font-mono text-[11px] text-[var(--ui-ink-muted)] sm:inline">
                      {site.domain}
                    </span>
                  </div>

                  <span className="hidden items-center gap-1 font-mono text-[11px] tabular-nums text-[var(--ui-ink-muted)] md:inline-flex">
                    <Sparkles className="size-3" aria-hidden />
                    {site.tokensCount}
                  </span>
                  <span className="hidden items-center gap-1 font-mono text-[11px] text-[var(--ui-ink-muted)] lg:inline-flex">
                    <Clock className="size-3" aria-hidden />
                    {formatTimeAgo(site.lastScanned)}
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleVote(site.id)}
                    disabled={site.hasVoted || votingId === site.id}
                    className={cn(
                      'inline-flex h-7 items-center gap-1 rounded-[7px] px-2 font-mono text-[11px] tabular-nums shadow-[var(--shadow-control)] transition',
                      site.hasVoted
                        ? 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]'
                        : 'bg-[var(--ui-paper)] text-[var(--ui-ink-secondary)] hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]'
                    )}
                    aria-label={`Vote for ${site.domain}`}
                    aria-pressed={site.hasVoted}
                  >
                    <ArrowUp className={cn('size-3', site.hasVoted && 'fill-current')} />
                    {site.votes}
                  </button>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/site/${site.domain}`}>Open</Link>
                  </Button>
                  <Button asChild size="icon-sm" variant="ghost">
                    <a
                      href={`https://${site.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit ${site.domain}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
