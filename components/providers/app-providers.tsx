'use client'

import { ThemeProvider, useTheme } from 'next-themes'
import { type ReactNode, useEffect } from 'react'
import { CommandMenu } from '@/components/organisms/command-menu'
import { Toaster } from '@/components/ui/sonner'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

/** Cmd/Ctrl+Shift+D (and bare `d` when not typing) toggles light/dark. */
function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const isChord =
        event.key.toLowerCase() === 'd' &&
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey
      const isBareD = event.key.toLowerCase() === 'd' && !event.metaKey && !event.ctrlKey && !event.altKey

      if (!isChord && !isBareD) return
      event.preventDefault()
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [resolvedTheme, setTheme])

  return null
}

/**
 * Root client shell: next-themes, Sonner toasts, command palette, theme hotkey.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors closeButton position="bottom-right" />
      <CommandMenu />
      <ThemeHotkey />
    </ThemeProvider>
  )
}
