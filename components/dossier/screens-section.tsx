'use client'

import { useMemo, useState } from 'react'
import {
  DeviceMobileIcon,
  DeviceTabletIcon,
  DesktopIcon,
  ArrowSquareOutIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { SectionShell } from './shared'

type Screenshot = {
  label: string
  url: string
  mime?: string
  viewport?: string
}

const VIEWPORT_META: Record<string, { icon: typeof DesktopIcon; label: string; frame: string }> = {
  desktop: { icon: DesktopIcon, label: 'Desktop', frame: 'aspect-[16/10]' },
  tablet: { icon: DeviceTabletIcon, label: 'Tablet', frame: 'aspect-[3/4] max-w-[420px]' },
  mobile: { icon: DeviceMobileIcon, label: 'Mobile', frame: 'aspect-[9/19.5] max-w-[280px]' },
}

export function ScreensSection({
  screenshots,
  domain,
}: {
  screenshots: Screenshot[]
  domain: string
}) {
  const pages = useMemo(() => {
    const map = new Map<string, Screenshot[]>()
    for (const shot of screenshots) {
      const page = shot.label.replace(/ · full$/, '')
      const bucket = map.get(page) ?? []
      bucket.push(shot)
      map.set(page, bucket)
    }
    return Array.from(map.entries())
  }, [screenshots])

  const [activePage, setActivePage] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  if (screenshots.length === 0) return null

  const [pageLabel, shots] = pages[Math.min(activePage, pages.length - 1)]
  const active = shots[Math.min(activeIndex, shots.length - 1)]
  const activeMeta = VIEWPORT_META[active.viewport ?? 'desktop'] ?? VIEWPORT_META.desktop

  return (
    <SectionShell
      id="screens"
      overline={`Screens · ${screenshots.length} captures`}
      title="The system in situ"
      lede="Visual ground truth captured during the scan — the live pages the tokens were extracted from, across viewports."
    >
      {pages.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {pages.map(([label], index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setActivePage(index)
                setActiveIndex(0)
              }}
              className={cn(
                'rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors',
                index === activePage
                  ? 'bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              /{label === 'homepage' ? '' : label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="flex min-h-[320px] items-start justify-center rounded-2xl border border-[color:var(--soft-border)] bg-[var(--ui-paper-subtle)] p-6">
          <figure
            className={cn(
              'w-full overflow-hidden rounded-xl border border-[color:var(--soft-border)] bg-card shadow-[var(--shadow-paper)]',
              activeMeta.frame
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={`${domain} — ${pageLabel} (${activeMeta.label})`}
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
          </figure>
        </div>

        <div className="flex flex-row gap-2 lg:flex-col">
          {shots.map((shot, index) => {
            const meta = VIEWPORT_META[shot.viewport ?? 'desktop'] ?? VIEWPORT_META.desktop
            const Icon = meta.icon
            const isFull = / · full$/.test(shot.label)
            return (
              <button
                key={`${shot.url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                  index === activeIndex
                    ? 'bg-[var(--ui-accent-soft)] text-foreground'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    index === activeIndex && 'text-[var(--ui-accent)]'
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium">
                    {meta.label}
                    {isFull ? ' · full page' : ''}
                  </span>
                </span>
              </button>
            )
          })}
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowSquareOutIcon className="size-3.5" />
            open original
          </a>
        </div>
      </div>
    </SectionShell>
  )
}
