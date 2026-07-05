"use client"

import { useTheme } from "@/hooks/use-theme"
import { Monitor, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: "system" as const, icon: Monitor, label: "Switch to system theme" },
    { value: "light" as const, icon: Sun, label: "Switch to light theme" },
    { value: "dark" as const, icon: Moon, label: "Switch to dark theme" },
  ]

  const activeIndex = themes.findIndex((t) => t.value === theme)

  return (
    <div
      className="relative flex h-8 w-[96px] items-center justify-between rounded-full border border-border bg-muted/50 p-0.5"
      role="group"
      aria-label="Theme selection"
    >
      <div
        className="absolute h-7 w-7 rounded-full border border-border bg-card shadow-sm transition-transform duration-200"
        style={{
          transform: `translateX(calc(${activeIndex * 32}px + 2px))`,
        }}
      />

      {themes.map((themeOption) => {
        const Icon = themeOption.icon
        const isActive = theme === themeOption.value

        return (
          <button
            key={themeOption.value}
            type="button"
            onClick={() => setTheme(themeOption.value)}
            className={cn(
              "relative z-10 flex h-7 w-8 items-center justify-center rounded-full transition-colors duration-200",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={themeOption.label}
            aria-pressed={isActive}
            title={themeOption.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
