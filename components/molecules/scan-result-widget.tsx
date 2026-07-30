'use client'

import Link from 'next/link'
import { ArrowUpRight, Loader2 } from 'lucide-react'
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
          'flex items-center gap-2.5 rounded-xl border border-[color:var(--soft-border)] bg-secondary/30 px-3.5 py-3',
          className
        )}
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin text-[oklch(0.78_0.08_185)]" />
        <p className="text-sm text-muted-foreground">
          Scanning{data.domain ? ` ${data.domain}` : ''}…
        </p>
      </div>
    )
  }

  if (data.found === false) {
    return (
      <div
        className={cn(
          'rounded-xl border border-[color:var(--soft-border)] bg-secondary/30 px-3.5 py-3 text-sm text-muted-foreground',
          className
        )}
      >
        No cached contract for <span className="text-foreground">{data.domain}</span>. Scanning
        next…
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
        'overflow-hidden rounded-xl border border-[color:var(--soft-border)] bg-secondary/25',
        className
      )}
    >
      <div className="flex items-stretch gap-0">
        {data.screenshots?.[0]?.url ? (
          <div className="relative hidden w-28 shrink-0 overflow-hidden border-r border-[color:var(--soft-border)] sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.screenshots[0].url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top opacity-90"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Contract
                {typeof confidence === 'number' ? ` · ${Math.round(confidence)}%` : ''}
              </p>
              <p className="mt-0.5 truncate font-medium tracking-tight text-foreground">
                {domain}
              </p>
            </div>
            <Link
              href={`/site/${domain}` as `/site/${string}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
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
                  className="size-4 rounded-sm border border-white/10"
                  style={{ backgroundColor: value }}
                />
              ))}
              <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
                {[tokenCount ? `${tokenCount} tokens` : null, font].filter(Boolean).join(' · ')}
              </span>
            </div>
          ) : null}

          {install ? (
            <code className="block truncate font-mono text-[11px] text-muted-foreground">
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
  return name === 'scan_site' || name === 'get_tokens'
}

export function asScanWidgetPayload(output: unknown): ScanWidgetPayload | null {
  if (!output || typeof output !== 'object') return null
  const data = output as ScanWidgetPayload
  if (!data.domain && data.found === undefined) return null
  return data
}
