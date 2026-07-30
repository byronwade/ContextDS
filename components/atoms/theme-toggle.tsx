"use client"

import { useTheme } from "@/hooks/use-theme"
import { Monitor, Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: "dark" as const, icon: Moon, label: "Switch to dark theme" },
    { value: "light" as const, icon: Sun, label: "Switch to light theme" },
    { value: "system" as const, icon: Monitor, label: "Switch to system theme" },
  ]

  const activeIndex = Math.max(
    0,
    themes.findIndex((t) => t.value === theme)
  )

  return (
    <div className="relative flex h-8 w-[96px] items-center justify-between rounded-md border border-border bg-card">
      <div
        className="absolute h-7 w-7 rounded-sm border border-border bg-background transition-transform duration-200"
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
            onClick={() => setTheme(themeOption.value)}
            className={`relative z-10 flex h-8 w-8 items-center justify-center transition-colors duration-200 ${
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={themeOption.label}
            title={themeOption.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
