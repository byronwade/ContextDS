'use client'

/**
 * Shared primitives for the Design System Dossier.
 * Quiet density: hairline borders, mono metadata, serif display — see DESIGN.md.
 */

import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function useCopy(timeout = 1400) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = useCallback(
    (key: string, value: string) => {
      void navigator.clipboard?.writeText(value).catch(() => {})
      setCopiedKey(key)
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current))
      }, timeout)
    },
    [timeout]
  )
  return { copiedKey, copy }
}

export function downloadText(fileName: string, content: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** Best-effort webfont loading so specimens render in the site's real faces. */
const loadedFonts = new Set<string>()
export function ensureGoogleFont(family: string) {
  const name = family.trim()
  if (!name || loadedFonts.has(name)) return
  if (/^(-apple-system|system-ui|blinkmacsystemfont|segoe ui|arial|helvetica( neue)?|times( new roman)?|georgia|courier( new)?|verdana|tahoma|sans-serif|serif|monospace|ui-sans-serif|ui-serif|ui-monospace|inherit|initial)$/i.test(name)) {
    return
  }
  loadedFonts.add(name)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`
  link.dataset.dossierFont = name
  document.head.appendChild(link)
}

export function Overline({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground',
        className
      )}
    >
      {children}
    </p>
  )
}

export function SectionShell({
  id,
  overline,
  title,
  lede,
  actions,
  children,
  className,
}: {
  id: string
  overline: string
  title: string
  lede?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-28 border-t border-border/40 py-14 first:border-t-0', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <Overline>{overline}</Overline>
          <h2 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          {lede ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {lede}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  )
}

export function MonoStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-lg text-foreground" title={hint ?? value}>
        {value}
      </p>
    </div>
  )
}

export function CopyChip({
  value,
  copyKey,
  copiedKey,
  onCopy,
  label,
  className,
}: {
  value: string
  copyKey?: string
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  label?: string
  className?: string
}) {
  const key = copyKey ?? value
  const copied = copiedKey === key
  return (
    <button
      type="button"
      onClick={() => onCopy(key, value)}
      className={cn(
        'group inline-flex max-w-full items-center gap-1.5 rounded-md border border-[color:var(--soft-border)] bg-secondary/40 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground',
        className
      )}
      title={`Copy ${value}`}
    >
      <span className="truncate">{label ?? value}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-[oklch(0.78_0.08_185)]" />
      ) : (
        <Copy className="size-3 shrink-0 opacity-50 group-hover:opacity-100" />
      )}
    </button>
  )
}

/** Hairline stat row used across dossier rails. */
export function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-sm text-foreground">{value}</span>
    </div>
  )
}
