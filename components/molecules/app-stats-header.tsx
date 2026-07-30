'use client'

import { useEffect } from 'react'
import { AnimatedCounter } from '@/components/atoms/animated-counter'
import {
  STATS_BUMP_EVENT,
  type StatsBumpDetail,
} from '@/lib/analytics/track-client'
import { useStatsStore, type PlatformStats } from '@/stores/stats-store'
import { cn } from '@/lib/utils'

function StatItem({
  label,
  value,
  emphasize,
  bumped,
  suffix,
  emptyLabel,
}: {
  label: string
  value: number
  emphasize?: boolean
  bumped?: boolean
  suffix?: string
  emptyLabel?: string
}) {
  return (
    <div
      className={cn(
        'relative flex items-baseline gap-1.5 whitespace-nowrap rounded-[6px] px-1.5 py-0.5 transition-colors duration-300',
        bumped && 'bg-[var(--ui-accent-soft)]'
      )}
    >
      <AnimatedCounter
        value={value}
        formatCompact
        suffix={suffix}
        emptyLabel={emptyLabel}
        showZero={!emptyLabel}
        className={cn(
          'font-mono text-[11px] font-semibold tracking-tight font-tabular',
          emphasize || bumped ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-ink)]'
        )}
      />
      <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--ui-ink-muted)]">
        {label}
      </span>
      {bumped ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-1 font-mono text-[9px] font-semibold text-[var(--ui-accent)] animate-in fade-in-0 zoom-in-95 duration-300"
          aria-hidden
        >
          +
        </span>
      ) : null}
    </div>
  )
}

/**
 * Live Redis-backed platform counters — integrated paper toolbar strip.
 */
export function AppStatsHeader({ className }: { className?: string }) {
  const stats = useStatsStore((s) => s.stats)
  const lastBumpedFields = useStatsStore((s) => s.lastBumpedFields)
  const startPolling = useStatsStore((s) => s.startPolling)
  const bumpEvent = useStatsStore((s) => s.bumpEvent)

  useEffect(() => startPolling(4_000), [startPolling])

  useEffect(() => {
    const onBump = (event: Event) => {
      const detail = (event as CustomEvent<StatsBumpDetail>).detail
      if (!detail?.event) return
      bumpEvent(detail.event, detail.by ?? 1)
    }
    window.addEventListener(STATS_BUMP_EVENT, onBump)
    return () => window.removeEventListener(STATS_BUMP_EVENT, onBump)
  }, [bumpEvent])

  const bumped = (field: keyof PlatformStats) => lastBumpedFields.includes(field)

  const sites = stats?.sites ?? 0
  const scans = stats?.scans ?? 0
  const tokens = stats?.tokens ?? 0
  const opens = stats?.contractOpens ?? 0
  const chats = stats?.chatMessages ?? 0
  const downloads = stats?.downloads ?? 0
  const libraryViews = stats?.libraryViews ?? 0
  const confidencePct =
    stats && stats.avgConfidence > 0
      ? Math.round(
          stats.avgConfidence > 1 ? stats.avgConfidence : stats.avgConfidence * 100
        )
      : 0
  const mode = stats?.storage.mode ?? '…'
  const redisLive = Boolean(stats?.storage.redis)

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center gap-1.5 overflow-x-auto px-2 scrollbar-none sm:gap-2 sm:px-3',
        className
      )}
      aria-label="Platform stats"
      aria-live="polite"
    >
      <StatItem label="sites" value={sites} emphasize={sites > 0} bumped={bumped('sites')} />
      <StatItem label="scans" value={scans} bumped={bumped('scans')} />
      <StatItem label="tokens" value={tokens} bumped={bumped('tokens')} />
      <StatItem label="opens" value={opens} bumped={bumped('contractOpens')} />
      <StatItem label="chats" value={chats} bumped={bumped('chatMessages')} />
      <StatItem label="views" value={libraryViews} bumped={bumped('libraryViews')} />
      <StatItem label="zips" value={downloads} bumped={bumped('downloads')} />
      <StatItem
        label="conf"
        value={confidencePct}
        suffix={confidencePct > 0 ? '%' : undefined}
        emptyLabel="—"
        bumped={bumped('avgConfidence')}
      />
      <div
        className="ml-auto hidden items-center gap-1.5 sm:flex"
        title={
          redisLive
            ? 'Live counters from Upstash Redis'
            : 'Redis not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN'
        }
      >
        <span className="relative flex size-1.5">
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-50',
              redisLive ? 'bg-[var(--ui-success)]' : 'bg-[var(--ui-warning)]'
            )}
          />
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              redisLive ? 'bg-[var(--ui-success)]' : 'bg-[var(--ui-warning)]'
            )}
          />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ui-ink-muted)]">
          {mode}
        </span>
      </div>
    </div>
  )
}
