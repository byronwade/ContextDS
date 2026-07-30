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
        'relative flex items-baseline gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 transition-colors duration-300',
        bumped && 'bg-primary/10'
      )}
    >
      <AnimatedCounter
        value={value}
        formatCompact
        suffix={suffix}
        emptyLabel={emptyLabel}
        showZero={!emptyLabel}
        className={cn(
          'font-mono text-[11px] font-semibold tracking-tight',
          emphasize || bumped ? 'text-primary' : 'text-foreground'
        )}
      />
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {bumped ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-1 font-mono text-[9px] font-semibold text-primary animate-in fade-in-0 zoom-in-95 duration-300"
          aria-hidden
        >
          +
        </span>
      ) : null}
    </div>
  )
}

/**
 * Live Redis-backed platform counters with tick-up animations.
 */
export function AppStatsHeader({ className }: { className?: string }) {
  const stats = useStatsStore((s) => s.stats)
  const lastBumpedFields = useStatsStore((s) => s.lastBumpedFields)
  const startPolling = useStatsStore((s) => s.startPolling)
  const bumpEvent = useStatsStore((s) => s.bumpEvent)

  useEffect(() => startPolling(4_000), [startPolling])

  // Optimistic bumps when this tab tracks an event
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
        'flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-[var(--sidebar)]/40 px-2 scrollbar-none sm:gap-3 sm:px-3',
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
            ? 'Live counters from Upstash Redis — updates every few seconds'
            : 'Redis not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN'
        }
      >
        <span className="relative flex size-1.5">
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60',
              redisLive ? 'bg-emerald-500' : 'bg-amber-400'
            )}
          />
          <span
            className={cn(
              'relative inline-flex size-1.5 rounded-full',
              redisLive ? 'bg-emerald-600' : 'bg-amber-500'
            )}
          />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {mode}
        </span>
      </div>
    </div>
  )
}
