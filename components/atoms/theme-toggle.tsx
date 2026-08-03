"use client"

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"
import { useTheme, type Theme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const OPTIONS: Array<{ value: Theme; icon: typeof SunIcon; label: string }> = [
  { value: "system", icon: DesktopIcon, label: "System theme" },
  { value: "light", icon: SunIcon, label: "Light theme" },
  { value: "dark", icon: MoonIcon, label: "Dark theme" },
]

/**
 * Segmented theme control — pill track, sliding thumb, hairline ring.
 * Geometry: 2px padding + three 28px cells, so the thumb always sits
 * concentric with the track (no clipped corners on the last cell).
 */
export function ThemeToggle({ className }: { className?: string }) {
  // mounted is false during SSR/hydration so the thumb only renders once theme is known
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
