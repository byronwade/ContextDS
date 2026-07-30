'use client'

import Link from 'next/link'
import { ArrowUpRight, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  if (fromBrand.length > 0) return fromBrand.slice(0, 8)
  return (data.tokens?.colors ?? [])
    .map((c) => c.value)
    .filter(Boolean)
    .slice(0, 8)
}

function isPending(state?: string): boolean {
  return state === 'input-streaming' || state === 'input-available'
}

export function ScanResultWidget({ data, state, className }: ScanResultWidgetProps) {
  if (isPending(state)) {
    return (
      <div
        className={cn(
          'border border-[color:var(--soft-border)] bg-background/70 px-4 py-4',
          className
        )}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-[oklch(0.78_0.08_185)]" />
          Scanning{data.domain ? ` ${data.domain}` : ''}…
        </div>
      </div>
    )
  }

  if (data.found === false) {
    return (
      <div
        className={cn(
          'border border-[color:var(--soft-border)] bg-background/70 px-4 py-4 text-sm text-muted-foreground',
          className
        )}
      >
        No cached contract for <span className="text-foreground">{data.domain}</span>. The agent will
        scan next.
      </div>
    )
  }

  const domain = data.domain
  if (!domain) return null

  const colors = colorList(data)
  const font =
    data.brand?.primaryFont || data.tokens?.typography?.families?.[0]?.value || null
  const graph = data.graph?.summary || data.graphSummary || null
  const tokenCount =
    data.summary?.tokensExtracted ??
    (data.tokens?.colors?.length || 0) + (data.tokens?.typography?.families?.length || 0)
  const confidence = data.summary?.confidence
  const downloadHref = data.designContract?.download || `/api/contracts/download?domain=${domain}`

  return (
    <div
      className={cn(
        'overflow-hidden border border-[color:var(--soft-border)] bg-background/80',
        className
      )}
    >
      {data.screenshots?.[0]?.url ? (
        <div className="relative aspect-[16/7] w-full overflow-hidden border-b border-[color:var(--soft-border)] bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.screenshots[0].url}
            alt={`${domain} capture`}
            className="h-full w-full object-cover object-top"
          />
        </div>
      ) : null}

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Design Contract
              {data.status ? ` · ${data.status}` : ''}
              {data.mode ? ` · ${data.mode}` : ''}
            </p>
            <h3 className="mt-1 font-serif text-2xl tracking-tight text-foreground">{domain}</h3>
          </div>
          {typeof confidence === 'number' ? (
            <p className="font-mono text-xs text-muted-foreground">
              {Math.round(confidence)}% confidence
            </p>
          ) : null}
        </div>

        {data.brand?.personality ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{data.brand.personality}</p>
        ) : null}

        {colors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Primary colors">
            {colors.map((value) => (
              <span
                key={value}
                title={value}
                className="h-7 w-7 border border-white/10"
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          {tokenCount ? <span>{tokenCount} tokens</span> : null}
          {font ? <span>{font}</span> : null}
          {graph?.roleCount != null ? <span>{graph.roleCount} roles</span> : null}
          {graph?.componentCount != null ? <span>{graph.componentCount} components</span> : null}
          {graph?.nodeCount != null ? <span>{graph.nodeCount} graph nodes</span> : null}
        </div>

        {data.designContract?.installCommand ? (
          <code className="block overflow-x-auto border border-[color:var(--soft-border)] bg-muted/30 px-3 py-2 font-mono text-[11px] text-foreground">
            {data.designContract.installCommand}
          </code>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="h-9 rounded-md gap-1.5">
            <Link href={`/site/${domain}` as `/site/${string}`}>
              View full results
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9 rounded-md gap-1.5">
            <a href={downloadHref}>
              <Download className="h-3.5 w-3.5" />
              Download pack
            </a>
          </Button>
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
