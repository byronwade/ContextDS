'use client'

import { useTheme } from 'next-themes'
import { type ReactNode, useEffect } from 'react'
import { Toaster } from 'sonner'
import { CommandMenu } from '@/components/organisms/command-menu'
import { ThemeProvider } from '@/components/providers/theme-provider'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

/** Cmd/Ctrl+Shift+D toggles light/dark when not typing. */
function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.key.toLowerCase() !== 'd') return
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      event.preventDefault()
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [resolvedTheme, setTheme])

  return null
}

/**
 * Root client chrome helpers that must sit under ThemeProvider
 * (command palette + theme hotkey). Toast + ThemeProvider mount from layout.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CommandMenu />
      <ThemeHotkey />
    </>
  )
}

export { ThemeProvider, Toaster }
