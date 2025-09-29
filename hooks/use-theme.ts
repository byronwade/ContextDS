"use client"

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    // Get stored theme or default to system
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    // Determine the actual theme to apply
    const actualTheme = theme === 'system' ? systemTheme : theme

    // Apply theme
    root.classList.remove('light', 'dark')
    root.classList.add(actualTheme)

    // Set color-scheme for proper browser behavior
    root.style.colorScheme = actualTheme

    // Store in localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light'
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
      root.style.colorScheme = systemTheme
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return { theme, setTheme }
}