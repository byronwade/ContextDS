"use client"

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"
import { useTheme, type Theme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const OPTIONS: Array<{ value: Theme; icon: typeof SunIcon; label: string; short: string }> = [
  { value: "light", icon: SunIcon, label: "Light theme", short: "Light" },
  { value: "system", icon: DesktopIcon, label: "System theme", short: "Auto" },
  { value: "dark", icon: MoonIcon, label: "Dark theme", short: "Dark" },
]

/**
 * Theme segment — hairline track. Use `fullWidth` in the sidebar footer.
 */
export function ThemeToggle({
  className,
  fullWidth = false,
}: {
  className?: string
  fullWidth?: boolean
}) {
  const { theme, setTheme, mounted } = useTheme()

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === theme)
  )

  if (fullWidth) {
    return (
      <div
        role="radiogroup"
        aria-label="Color theme"
        className={cn(
          "relative grid h-9 w-full grid-cols-3 rounded-[var(--radius-md)] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-0.5",
          className
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-[6px] border border-[var(--ui-border)] bg-[var(--ui-paper)] transition-transform duration-200 ease-out",
            !mounted && "opacity-0"
          )}
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {OPTIONS.map((option) => {
          const isActive = mounted && theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={option.label}
              title={option.label}
              onClick={() => setTheme(option.value)}
              className={cn(
                "relative z-10 flex items-center justify-center rounded-[6px] text-[12px] transition-colors duration-200",
                isActive
                  ? "text-[var(--ui-ink)]"
                  : "text-[var(--ui-ink-muted)] hover:text-[var(--ui-ink)]"
              )}
            >
              {option.short}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "relative inline-flex h-8 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-[2px]",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-[2px] top-[2px] size-7 rounded-full border border-[var(--ui-border)] bg-[var(--ui-paper)] shadow-none transition-transform duration-200 ease-out",
          !mounted && "opacity-0"
        )}
        style={{ transform: `translateX(${activeIndex * 28}px)` }}
      />
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = mounted && theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative z-10 flex size-7 items-center justify-center rounded-full transition-colors duration-200",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" weight="duotone" />
          </button>
        )
      })}
    </div>
  )
}
