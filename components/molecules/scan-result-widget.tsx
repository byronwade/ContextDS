'use client'

import Link from 'next/link'
import {
  ArrowUpRightIcon as ArrowUpRight,
  CircleNotchIcon as Loader2,
} from '@/lib/phosphor'
import { stashSiteHandoff } from '@/lib/site-handoff'
import { cn } from '@/lib/utils'

export type ScanWidgetPayload = {
  domain?: string
  status?: string
  found?: boolean
  summary?: {
    tokensExtracted?: number
    confidence?: number
    completeness?: number
    processingTime?: number
    curatedCount?: Record<string, number>
  }
  tokens?: {
    colors?: Array<{ name?: string; value: string; usage?: number }>
    typography?: {
      families?: Array<{ name?: string; value: string }>
    }
  }
  brand?: {
    primaryColors?: string[]
    personality?: string
    primaryFont?: string | null
  }
  graph?: { summary?: GraphSummary } | null
  graphSummary?: GraphSummary | null
  designContract?: {
    title?: string
    installCommand?: string
    download?: string
    summary?: { colorCount?: number; typographyCount?: number; fileCount?: number }
  } | null
  screenshots?: Array<{ label?: string; url: string }>
  mode?: string
  browserEngine?: string | null
  scannerConfigured?: boolean
}

type GraphSummary = {
  nodeCount?: number
  edgeCount?: number
  roleCount?: number
  componentCount?: number
}

type ScanResultWidgetProps = {
  data: ScanWidgetPayload
  state?: string
  className?: string
}

function colorList(data: ScanWidgetPayload): string[] {
  const fromBrand = data.brand?.primaryColors?.filter(Boolean) ?? []
  if (fromBrand.length > 0) return fromBrand.slice(0, 6)
  return (data.tokens?.colors ?? [])
    .map((c) => c.value)
    .filter(Boolean)
    .slice(0, 6)
}

function isPending(state?: string): boolean {
  return state === 'input-streaming' || state === 'input-available'
}

export function ScanResultWidget({ data, state, className }: ScanResultWidgetProps) {
  if (isPending(state)) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper)] px-3 py-2.5',
          className
        )}
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--ui-ink-muted)]" />
        <p className="text-[13px] text-[var(--ui-ink-secondary)]">
          Scanning{data.domain ? ` ${data.domain}` : ''}…
        </p>
      </div>
    )
  }

  if (data.found === false) {
    return (
      <div
        className={cn(
          'rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] px-3 py-2.5 text-[13px] text-[var(--ui-ink-secondary)]',
          className
        )}
      >
        No cached contract for <span className="text-[var(--ui-ink)]">{data.domain}</span>.
        Scanning next…
      </div>
    )
  }

  const domain = data.domain
  if (!domain) return null

  const colors = colorList(data)
  const font =
    data.brand?.primaryFont || data.tokens?.typography?.families?.[0]?.value || null
  const tokenCount =
    data.summary?.tokensExtracted ??
    (data.tokens?.colors?.length || 0) + (data.tokens?.typography?.families?.length || 0)
  const confidence = data.summary?.confidence
  const install = data.designContract?.installCommand

  return (
    <div
      className={cn(
        'paper overflow-hidden',
        className
      )}
    >
      <div className="flex items-stretch gap-0">
        {data.screenshots?.[0]?.url ? (
          <div className="relative hidden w-28 shrink-0 overflow-hidden border-r border-[var(--ui-border-soft)] sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.screenshots[0].url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top opacity-90"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--ui-ink-muted)]">
                Contract
                {typeof confidence === 'number' ? ` · ${Math.round(confidence)}%` : ''}
                {data.mode ? ` · ${data.mode}` : ''}
                {data.browserEngine === 'vercel-chromium'
                  ? ' · vercel scanner'
                  : data.browserEngine
                    ? ` · ${data.browserEngine}`
                    : ''}
              </p>
              <p className="mt-0.5 truncate text-[14px] font-medium tracking-tight text-[var(--ui-ink)]">
                {domain}
              </p>
            </div>
            <Link prefetch={false}
              href={`/site/${domain}` as `/site/${string}`}
              onClick={() => stashSiteHandoff(domain, data)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] px-2.5 text-[12px] text-[var(--ui-ink-secondary)] transition hover:bg-[var(--ui-paper-hover)] hover:text-[var(--ui-ink)]"
            >
              Open
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {colors.length > 0 ? (
            <div className="flex items-center gap-1" aria-label="Primary colors">
              {colors.map((value) => (
                <span
                  key={value}
                  title={value}
                  className="size-3.5 rounded-[3px] border border-[var(--ui-border-soft)]"
                  style={{ backgroundColor: value }}
                />
              ))}
              <span className="ml-2 truncate font-mono text-[11px] text-[var(--ui-ink-muted)]">
                {[tokenCount ? `${tokenCount} tokens` : null, font].filter(Boolean).join(' · ')}
              </span>
            </div>
          ) : null}

          {install ? (
            <code className="block truncate font-mono text-[11px] text-[var(--ui-ink-muted)]">
              {install}
            </code>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** True when a tool part should render as the scan results widget. */
export function isScanResultToolName(name: string): boolean {
  return name === 'scan_site' || name === 'get_tokens' || name === 'contract_from_screenshot'
}

export function asScanWidgetPayload(output: unknown): ScanWidgetPayload | null {
  if (!output || typeof output !== 'object') return null
  const data = output as ScanWidgetPayload
  if (!data.domain && data.found === undefined) return null
  return data
}
