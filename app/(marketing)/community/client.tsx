'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowUp, Clock, ExternalLink, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarketingFooter } from '@/components/organisms/marketing-footer'
import { VercelHeader } from '@/components/organisms/vercel-header'
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
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 420px at 15% -10%, oklch(0.45 0.04 185 / 0.14), transparent 55%), radial-gradient(700px 400px at 100% 0%, oklch(1 0 0 / 0.03), transparent 45%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <VercelHeader currentPage="community" showSearch />

        <main id="main-content" className="flex-1" role="main" aria-label="Design Contracts library">
          <section className="border-b border-[color:var(--soft-border)] px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
            <div className="mx-auto max-w-5xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Library
              </p>
              <h1 className="mt-3 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
                Scanned systems
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Browse Design Contracts pulled from public sites. Open one, or ask Scan to gather a
                new system.
              </p>

              <div className="relative mt-8 max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="community-search"
                  type="search"
                  placeholder="Search domains…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 border-[color:var(--soft-border)] bg-background/70 pl-10"
                  aria-label="Search scanned sites"
                />
              </div>
            </div>
          </section>

          <section className="sticky top-14 z-20 border-b border-[color:var(--soft-border)] bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="font-mono text-[11px] text-muted-foreground">
                {filteredSites.length} {filteredSites.length === 1 ? 'site' : 'sites'}
              </p>
              <div
                className="flex gap-1 border border-[color:var(--soft-border)] p-1"
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
                      'px-3 py-1.5 text-xs transition-colors sm:text-sm',
                      sortBy === value
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 py-8 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-5xl">
              {loading ? (
                <div className="space-y-3" role="status" aria-label="Loading sites">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse border border-[color:var(--soft-border)] bg-muted/20"
                    />
                  ))}
                </div>
              ) : filteredSites.length === 0 ? (
                <div className="border border-[color:var(--soft-border)] px-6 py-16 text-center">
                  <h2 className="font-serif text-2xl text-foreground">No sites yet</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {searchQuery
                      ? 'Nothing matched that search.'
                      : 'Scan a public site and it will show up here.'}
                  </p>
                  <div className="mt-6 flex justify-center gap-2">
                    {searchQuery ? (
                      <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear search
                      </Button>
                    ) : null}
                    <Button asChild>
                      <Link href="/scan">Open Scan</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--soft-border)] border border-[color:var(--soft-border)]">
                  {filteredSites.map((site) => (
                    <li
                      key={site.id}
                      className="group flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <div className="flex min-w-0 items-start gap-3 sm:items-center">
                        {site.favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={site.favicon}
                            alt=""
                            className="mt-0.5 h-8 w-8 shrink-0 border border-[color:var(--soft-border)] bg-background object-cover sm:mt-0"
                          />
                        ) : (
                          <div
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[color:var(--soft-border)] bg-muted/40 font-mono text-[10px] text-muted-foreground sm:mt-0"
                            aria-hidden
                          >
                            {site.domain.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/site/${site.domain}`}
                            className="font-serif text-xl tracking-tight text-foreground transition-colors hover:text-[oklch(0.78_0.08_185)]"
                          >
                            {site.title || site.domain}
                          </Link>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {site.domain}
                          </p>
                          {site.description ? (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {site.description}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" aria-hidden />
                              {site.tokensCount} tokens
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden />
                              {formatTimeAgo(site.lastScanned)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => void handleVote(site.id)}
                          disabled={site.hasVoted || votingId === site.id}
                          className={cn(
                            'inline-flex h-9 items-center gap-1.5 border px-2.5 font-mono text-xs transition-colors',
                            site.hasVoted
                              ? 'border-[oklch(0.78_0.08_185_/0.45)] bg-[oklch(0.78_0.08_185_/0.08)] text-[oklch(0.78_0.08_185)]'
                              : 'border-[color:var(--soft-border)] text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                          )}
                          aria-label={`Vote for ${site.domain}`}
                          aria-pressed={site.hasVoted}
                        >
                          <ArrowUp className={cn('h-3.5 w-3.5', site.hasVoted && 'fill-current')} />
                          {site.votes}
                        </button>
                        <Button asChild size="sm" variant="outline" className="h-9 rounded-md">
                          <Link href={`/site/${site.domain}`}>View</Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="h-9 w-9 rounded-md px-0">
                          <a
                            href={`https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Visit ${site.domain}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </div>
  )
}
