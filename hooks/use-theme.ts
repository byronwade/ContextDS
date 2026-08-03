'use client'

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const DEFAULT_THEME: Theme = 'light'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
  const actualTheme = theme === 'system' ? systemTheme : theme
  root.classList.remove('light', 'dark')
  root.classList.add(actualTheme)
  root.style.colorScheme = actualTheme

  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (meta) {
    meta.setAttribute('content', actualTheme === 'dark' ? '#161612' : '#f7f7f4')
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  const setTheme = (next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* ignore */
    }
    applyTheme(next)
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    setResolved(next === 'system' ? systemTheme : next)
  }

  useEffect(() => {
    const stored = readStoredTheme()
    setThemeState(stored)
    applyTheme(stored)
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    setResolved(stored === 'system' ? systemTheme : stored)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      applyTheme('system')
      setResolved(mediaQuery.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  return { theme, setTheme, resolved, mounted }
}
