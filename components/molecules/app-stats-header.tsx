'use client'

import { useEffect } from 'react'
import { useStatsStore } from '@/stores/stats-store'
import { cn } from '@/lib/utils'

function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(value))
}

function StatItem({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span
        className={cn(
          'font-mono text-[11px] font-semibold tabular-nums tracking-tight',
          emphasize ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

/**
 * Live Redis-backed platform counters shown under the app chrome header.
 */
export function AppStatsHeader({ className }: { className?: string }) {
  const stats = useStatsStore((s) => s.stats)
  const startPolling = useStatsStore((s) => s.startPolling)

  useEffect(() => startPolling(15_000), [startPolling])

  const sites = stats?.sites ?? 0
  const scans = stats?.scans ?? 0
  const tokens = stats?.tokens ?? 0
  const opens = stats?.contractOpens ?? 0
  const chats = stats?.chatMessages ?? 0
  const downloads = stats?.downloads ?? 0
  const libraryViews = stats?.libraryViews ?? 0
  const confidence = stats?.avgConfidence ?? 0
  const mode = stats?.storage.mode ?? '…'
  const redisLive = Boolean(stats?.storage.redis)

  return (
    <div
      className={cn(
        'flex h-9 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-[var(--sidebar)]/40 px-3 scrollbar-none sm:gap-4 sm:px-4',
        className
      )}
      aria-label="Platform stats"
    >
      <StatItem label="sites" value={formatCompact(sites)} emphasize={sites > 0} />
      <StatItem label="scans" value={formatCompact(scans)} />
      <StatItem label="tokens" value={formatCompact(tokens)} />
      <StatItem label="opens" value={formatCompact(opens)} />
      <StatItem label="chats" value={formatCompact(chats)} />
      <StatItem label="views" value={formatCompact(libraryViews)} />
      <StatItem label="zips" value={formatCompact(downloads)} />
      <StatItem
        label="conf"
        value={confidence > 0 ? `${Math.round(confidence * 100)}%` : '—'}
      />
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
            'size-1.5 rounded-full',
            redisLive ? 'bg-emerald-600' : 'bg-amber-500'
          )}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {mode}
        </span>
      </div>
    </div>
  )
}
