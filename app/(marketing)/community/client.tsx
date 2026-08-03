'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppShell } from '@/components/organisms/app-shell'
import { ensureGoogleFont } from '@/components/dossier/shared'
import { PencilSimpleIcon } from '@/lib/phosphor'
import { originLabel, type SystemOrigin } from '@/lib/design-system/working-system'
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
  confidence?: number | null
  curatedCount?: {
    colors: number
    fonts: number
    sizes: number
    spacing: number
    radius: number
    shadows: number
  } | null
  preview?: {
    colors: string[]
    fonts: string[]
    radius: string | null
    personality: string | null
  } | null
}

/** A user-authored system stored by /api/systems — blank, blended or forked. */
type LibrarySystem = {
  id: string
  slug: string
  name: string
  origin: SystemOrigin
  visibility: 'public' | 'private'
  createdAt: string
  updatedAt: string
  revisionCount: number
  preview: {
    colors: string[]
    fonts: string[]
    radius: string | null
    personality: string | null
  }
}

type SortOption = 'votes' | 'recent' | 'tokens'

type KindFilter = 'all' | 'sites' | 'systems'

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

/** Deterministic fallback band when a scan predates stored previews. */
function fallbackBand(domain: string): string {
  let hash = 0
  for (const char of domain) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return `linear-gradient(120deg, oklch(0.35 0.04 ${hash}) 0%, oklch(0.22 0.02 ${(hash + 40) % 360}) 100%)`
}

function SiteCard({
  site,
  loadFont,
  votingId,
  onVote,
}: {
  site: Site
  loadFont: boolean
  votingId: string | null
  onVote: (siteId: string) => void
}) {
  const colors = site.preview?.colors ?? []
  const primaryFont = site.preview?.fonts?.[0] ?? null

  useEffect(() => {
    if (loadFont && primaryFont) ensureGoogleFont(primaryFont)
  }, [loadFont, primaryFont])

  const radiusPx = (() => {
    const raw = site.preview?.radius
    if (!raw) return null
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return null
    return raw.includes('rem') || raw.includes('em') ? n * 16 : n
  })()

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper)] transition-colors duration-150 hover:border-[var(--ui-border-edge)]">
      {/* Palette band — the site's system at a glance */}
      <Link prefetch={false}
        href={`/site/${site.domain}`}
        className="block h-14 w-full"
        aria-label={`Open ${site.domain} design contract`}
        tabIndex={-1}
      >
        {colors.length > 0 ? (
          <span className="flex h-full w-full">
            {colors.map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-full min-w-0 flex-1 transition-[flex-grow] duration-300"
                style={{ background: color, flexGrow: index === 0 ? 2.5 : 1 }}
              />
            ))}
          </span>
        ) : (
          <span className="block h-full w-full" style={{ background: fallbackBand(site.domain) }} />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          {site.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.favicon}
              alt=""
              className="mt-0.5 size-8 shrink-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-paper)] object-cover"
            />
          ) : (
            <div
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] font-mono text-[10px] text-[var(--ui-ink-muted)]"
              aria-hidden
            >
              {site.domain.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link prefetch={false}
              href={`/site/${site.domain}`}
              className="block truncate text-lg font-medium tracking-tight text-foreground transition-colors after:absolute after:inset-0 hover:text-[var(--ui-accent)]"
              style={primaryFont ? { fontFamily: `'${primaryFont}', sans-serif` } : undefined}
            >
              {site.title?.replace(/ design tokens$/i, '') || site.domain}
            </Link>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{site.domain}</p>
          </div>
        </div>

        {site.preview?.personality ? (
          <p className="line-clamp-1 text-xs italic text-muted-foreground">
            “{site.preview.personality}”
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <SparkleIcon className="size-3" aria-hidden />
              {site.tokensCount}
            </span>
            {primaryFont ? <span className="truncate">{primaryFont}</span> : null}
            {radiusPx !== null ? (
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block size-2.5 border-l border-t border-current"
                  style={{ borderTopLeftRadius: Math.min(radiusPx, 8) }}
                  aria-hidden
                />
                {site.preview?.radius}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3" aria-hidden />
              {formatTimeAgo(site.lastScanned)}
            </span>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onVote(site.id)}
              disabled={site.hasVoted || votingId === site.id}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-[var(--radius-md)] border px-2.5 text-[11px] transition-colors',
                site.hasVoted
                  ? 'border-[color-mix(in_oklab,var(--ui-accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--ui-accent)_8%,transparent)] text-[var(--ui-accent)]'
                  : 'border-[var(--ui-border)] text-[var(--ui-ink-muted)] hover:border-[var(--ui-border-edge)] hover:text-[var(--ui-ink)]'
              )}
              aria-label={`Vote for ${site.domain}`}
              aria-pressed={site.hasVoted}
            >
              <ArrowUpIcon className={cn('size-3', site.hasVoted && 'fill-current')} />
              {site.votes}
            </button>
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${site.domain}`}
              className="inline-flex size-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--ui-border)] text-[var(--ui-ink-muted)] transition-colors hover:border-[var(--ui-border-edge)] hover:text-[var(--ui-ink)]"
            >
              <ArrowUpRightIcon className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </li>
  )
}

function SystemCard({ system, loadFont }: { system: LibrarySystem; loadFont: boolean }) {
  const colors = system.preview?.colors ?? []
  const primaryFont = system.preview?.fonts?.[0] ?? null
  // Typed routes: the query string is opaque to the route type, hence the cast.
  const href = `/?system=${encodeURIComponent(system.id)}` as Route
  const [forking, setForking] = useState(false)

  useEffect(() => {
    if (loadFont && primaryFont) ensureGoogleFont(primaryFont)
  }, [loadFont, primaryFont])

  const radiusPx = (() => {
    const raw = system.preview?.radius
    if (!raw) return null
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return null
    return raw.includes('rem') || raw.includes('em') ? n * 16 : n
  })()

  const forkSystem = async () => {
    if (forking) return
    setForking(true)
    const response = await fetch('/api/systems/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId: system.id }),
    })
    const data = (await response.json().catch(() => null)) as {
      canvasHref?: string
      error?: string
    } | null
    if (!response.ok || !data?.canvasHref) {
      setForking(false)
      return
    }
    trackClientEvent('system_forked')
    window.location.href = data.canvasHref
  }

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper)] transition-colors duration-150 hover:border-[var(--ui-border-edge)]">
      {/* Palette band — the authored system at a glance */}
      <Link prefetch={false}
        href={href}
        className="block h-14 w-full"
        aria-label={`Continue editing ${system.name}`}
        tabIndex={-1}
      >
        {colors.length > 0 ? (
          <span className="flex h-full w-full">
            {colors.map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-full min-w-0 flex-1 transition-[flex-grow] duration-300"
                style={{ background: color, flexGrow: index === 0 ? 2.5 : 1 }}
              />
            ))}
          </span>
        ) : (
          <span className="block h-full w-full" style={{ background: fallbackBand(system.slug) }} />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] text-[var(--ui-ink-muted)]"
            aria-hidden
          >
            <SparkleIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Link prefetch={false}
              href={href}
              className="block truncate text-lg font-medium tracking-tight text-foreground transition-colors after:absolute after:inset-0 hover:text-[var(--ui-accent)]"
              style={primaryFont ? { fontFamily: `'${primaryFont}', sans-serif` } : undefined}
            >
              {system.name}
            </Link>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {originLabel(system.origin)}
            </p>
          </div>
        </div>

        {system.preview?.personality ? (
          <p className="line-clamp-1 text-xs italic text-muted-foreground">
            “{system.preview.personality}”
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <SparkleIcon className="size-3" aria-hidden />
              {system.preview?.colors?.length ?? 0}
            </span>
            {primaryFont ? <span className="truncate">{primaryFont}</span> : null}
            {radiusPx !== null ? (
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block size-2.5 border-l border-t border-current"
                  style={{ borderTopLeftRadius: Math.min(radiusPx, 8) }}
                  aria-hidden
                />
                {system.preview?.radius}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3" aria-hidden />
              {formatTimeAgo(system.updatedAt)}
            </span>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void forkSystem()}
              disabled={forking}
              className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-ink-muted)] transition-colors hover:border-[var(--ui-border-edge)] hover:text-[var(--ui-ink)] disabled:opacity-50"
              aria-label={`Fork ${system.name}`}
              data-testid="system-fork"
            >
              <SparkleIcon className="size-3" aria-hidden />
              {forking ? 'Forking…' : 'Fork'}
            </button>
            <Link prefetch={false}
              href={href}
              className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-ink-muted)] transition-colors hover:border-[var(--ui-border-edge)] hover:text-[var(--ui-ink)]"
              aria-label={`Continue editing ${system.name}`}
            >
              <PencilSimpleIcon className="size-3" aria-hidden />
              Continue
            </Link>
          </div>
        </div>
      </div>
    </li>
  )
}

export default function CommunityClient() {
  const [sites, setSites] = useState<Site[]>([])
  const [systems, setSystems] = useState<LibrarySystem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('votes')
  const [votingId, setVotingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)
  const { hasVoted, addVote, loadVotes } = useVotingStore()

  useEffect(() => {
    loadVotes()
    trackClientEvent('library_view')
  }, [loadVotes])

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      const response = await fetch(`/api/community/sites?sort=${sortBy}`)
      if (!response.ok) {
        if (!cancelled) {
          setSites([])
          setLoaded(true)
        }
        return
      }
      const data = await response.json()
      if (cancelled) return
      const next = (data.sites || []).map((site: Site) => ({
        ...site,
        hasVoted: hasVoted(site.id),
      }))
      setSites(next)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [sortBy, hasVoted])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const response = await fetch('/api/systems?limit=100&visibility=public')
      if (!response.ok) {
        if (!cancelled) setSystems([])
        return
      }
      const data = await response.json()
      if (cancelled) return
      setSystems(Array.isArray(data.systems) ? data.systems : [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredSites = useMemo(() => {
    if (kind === 'systems') return []
    if (!searchQuery.trim()) return sites
    const q = searchQuery.toLowerCase()
    return sites.filter(
      (site) =>
        site.domain.toLowerCase().includes(q) ||
        site.title?.toLowerCase().includes(q) ||
        site.description?.toLowerCase().includes(q)
    )
  }, [kind, searchQuery, sites])

  const filteredSystems = useMemo(() => {
    if (kind === 'sites') return []
    if (!searchQuery.trim()) return systems
    const q = searchQuery.toLowerCase()
    return systems.filter(
      (system) =>
        system.name.toLowerCase().includes(q) ||
        system.slug.toLowerCase().includes(q) ||
        originLabel(system.origin).toLowerCase().includes(q)
    )
  }, [kind, searchQuery, systems])

  const handleVote = async (siteId: string) => {
    if (hasVoted(siteId)) return
    setVotingId(siteId)
    const response = await fetch('/api/community/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId }),
    }).catch((error: unknown) => {
      console.error('Error voting:', error)
      return null
    })
    if (response?.ok) {
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
    }
    setVotingId(null)
  }

  const loading = !loaded || isPending
  const totalShown = filteredSites.length + filteredSystems.length

  return (
    <AppShell currentPage="library">
      <div className="min-h-0 flex-1 overflow-y-auto" role="region" aria-label="Design Contracts library">
        <section className="border-b border-[var(--ui-border-soft)] px-4 pb-6 pt-8 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-display-md text-[var(--ui-ink)]">Library</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
              Every card previews a real system — palette, primary face, corner language.
              Open one, or ask Chat to gather a new site.
            </p>

            <div className="relative mt-6 max-w-xl">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ui-ink-muted)]"
                aria-hidden
              />
              <Input
                id="community-search"
                type="search"
                placeholder="Search domains and systems…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-[var(--radius-md)] border-[var(--ui-border-edge)] bg-[var(--ui-paper)] pl-10"
                aria-label="Search scanned sites and user systems"
              />
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-20 border-b border-[var(--ui-border-soft)] bg-[var(--ui-paper)]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <p className="text-[12px] text-[var(--ui-ink-muted)]">
              {totalShown} {totalShown === 1 ? 'system' : 'systems'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-0.5"
                role="tablist"
                aria-label="Library filter"
              >
                {(
                  [
                    ['all', 'All'],
                    ['sites', 'Sites'],
                    ['systems', 'Systems'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={kind === value}
                    onClick={() => setKind(value)}
                    className={cn(
                      'rounded-[6px] px-2.5 py-1.5 text-[12px] transition-colors sm:text-[13px]',
                      kind === value
                        ? 'border border-[var(--ui-border)] bg-[var(--ui-paper)] text-[var(--ui-ink)]'
                        : 'text-[var(--ui-ink-muted)] hover:text-[var(--ui-ink)]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {kind === 'systems' ? null : (
                <div
                  className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-0.5"
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
                      disabled={loading}
                      onClick={() => setSortBy(value)}
                      className={cn(
                        'rounded-[6px] px-2.5 py-1.5 text-[12px] transition-colors sm:text-[13px] disabled:opacity-50',
                        sortBy === value
                          ? 'border border-[var(--ui-border)] bg-[var(--ui-paper)] text-[var(--ui-ink)]'
                          : 'text-[var(--ui-ink-muted)] hover:text-[var(--ui-ink)]'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-5xl">
            {loading ? (
              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                role="status"
                aria-label="Loading sites"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)]"
                  />
                ))}
              </div>
            ) : totalShown === 0 ? (
              <div className="rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper)] px-6 py-20 text-center">
                <h2 className="text-display-sm text-[var(--ui-ink)]">
                  {kind === 'systems' ? 'No systems yet' : 'No sites yet'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--ui-ink-secondary)]">
                  {searchQuery
                    ? 'Nothing matched that search.'
                    : kind === 'systems'
                      ? 'Author a system on the canvas and it will show up here.'
                      : 'Scan a public site and it will show up here.'}
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  {searchQuery ? (
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear search
                    </Button>
                  ) : null}
                  <Button asChild>
                    <Link prefetch={false} href="/">Open chat</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSystems.map((system, index) => (
                  <SystemCard key={system.id} system={system} loadFont={index < 12} />
                ))}
                {filteredSites.map((site, index) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    loadFont={index < 12}
                    votingId={votingId}
                    onVote={(siteId) => void handleVote(siteId)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
