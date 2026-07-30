"use client"

import { useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  try {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored && ["light", "dark", "system"].includes(stored)) return stored
  } catch {
    /* ignore */
  }
  return "dark"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
  const actualTheme = theme === "system" ? systemTheme : theme
  root.classList.remove("light", "dark")
  root.classList.add(actualTheme)
  root.style.colorScheme = actualTheme
}

export function useTheme() {
  // Dark-first product — Vercel/Cursor density by default
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  const setTheme = (next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem("theme", next)
    } catch {
      /* ignore */
    }
    applyTheme(next)
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => applyTheme("system")
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  return { theme, setTheme }
}
