'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

/**
 * App theme hook — wraps next-themes so the sidebar toggle and ThemeProvider share state.
 */
export function useTheme() {
  const { theme, setTheme: setNextTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const setTheme = (next: Theme) => {
    setNextTheme(next)
  }

  return {
    theme: (theme as Theme | undefined) ?? 'light',
    setTheme,
    resolved: (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
    mounted,
  }
}
