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
        'relative flex items-baseline gap-1 whitespace-nowrap px-1 py-0.5 transition-colors duration-300',
        bumped && 'text-[var(--ui-accent)]'
      )}
    >
      <AnimatedCounter
        value={value}
        formatCompact
        suffix={suffix}
        emptyLabel={emptyLabel}
        showZero={!emptyLabel}
        className={cn(
          'font-mono text-[11px] font-medium tabular-nums tracking-tight',
          emphasize || bumped ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-ink)]'
        )}
      />
      <span className="text-[11px] text-[var(--ui-ink-muted)]">{label}</span>
    </div>
  )
}

/**
 * Quiet live counters — integrated paper toolbar strip.
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
  const mode = stats?.storage.mode ?? '…'
  const redisLive = Boolean(stats?.storage.redis)

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center gap-3 overflow-x-auto px-3 scrollbar-none sm:px-4',
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
      <StatItem label="zips" value={downloads} bumped={bumped('downloads')} />
      <div
        className="ml-auto hidden items-center gap-1.5 sm:flex"
        title={
          redisLive
            ? 'Live counters from Upstash Redis'
            : 'Redis not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN'
        }
      >
        <span
          className={cn(
            'inline-flex size-1.5 rounded-full',
            redisLive ? 'bg-[var(--ui-success)]' : 'bg-[var(--ui-warning)]'
          )}
        />
        <span className="text-[11px] text-[var(--ui-ink-muted)]">{mode}</span>
      </div>
    </div>
  )
}
