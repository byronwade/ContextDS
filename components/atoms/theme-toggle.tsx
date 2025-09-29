"use client"

import { useTheme } from '@/hooks/use-theme'
import { Monitor, Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'system' as const, icon: Monitor, label: 'Switch to system theme' },
    { value: 'light' as const, icon: Sun, label: 'Switch to light theme' },
    { value: 'dark' as const, icon: Moon, label: 'Switch to dark theme' }
  ]

  const activeIndex = themes.findIndex(t => t.value === theme)

  return (
    <div className="relative flex h-8 w-[96px] items-center justify-between rounded-full border border-neutral-200 dark:border-neutral-700">
      {/* Active indicator */}
      <div
        className="absolute h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 transition-transform duration-200"
        style={{
          transform: `translateX(calc(${activeIndex * 32}px - 1px))`
        }}
      />

      {/* Theme buttons */}
      {themes.map((themeOption, index) => {
        const Icon = themeOption.icon
        const isActive = theme === themeOption.value

        return (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`relative z-10 mx-[-1px] flex h-8 w-8 items-center justify-center transition-colors duration-200 ${
              isActive
                ? 'text-foreground'
                : 'text-neutral-500 hover:text-foreground'
            }`}
            aria-label={themeOption.label}
            title={themeOption.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}