'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const OPTIONS: Array<{
  value: Theme
  icon: typeof Moon
  label: string
  short: string
}> = [
  { value: 'dark', icon: Moon, label: 'Dark', short: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light', short: 'Light' },
  { value: 'system', icon: Monitor, label: 'System', short: 'Auto' },
]

/**
 * Compact segmented theme control — bevel track + sliding active pill.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, mounted } = useTheme()
  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === theme)
  )

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        'relative inline-flex h-8 items-stretch rounded-[8px] bg-[var(--ui-paper-subtle)] p-0.5 shadow-[var(--shadow-control)]',
        className
      )}
      data-mounted={mounted || undefined}
    >
      {/* Sliding active pill */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0.5 bottom-0.5 w-[calc((100%-4px)/3)] rounded-[6px] bg-[var(--ui-paper)] shadow-[var(--shadow-control)] transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(calc(${activeIndex} * 100%))`,
          left: 2,
        }}
      />

      {OPTIONS.map((option) => {
        const Icon = option.icon
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              'relative z-10 flex h-7 min-w-[30px] flex-1 items-center justify-center gap-1 rounded-[6px] px-1.5 text-[11px] font-medium transition-colors duration-150',
              active
                ? 'text-[var(--ui-ink)]'
                : 'text-[var(--ui-ink-muted)] hover:text-[var(--ui-ink-secondary)]'
            )}
          >
            <Icon
              className={cn(
                'size-3.5 shrink-0',
                active && 'text-[var(--ui-accent)]'
              )}
              aria-hidden
            />
            <span className="sr-only sm:not-sr-only sm:inline">{option.short}</span>
          </button>
        )
      })}
    </div>
  )
}
