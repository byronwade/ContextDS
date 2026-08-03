'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps, ReactNode } from 'react'

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider> & {
  children: ReactNode
}

/** next-themes ThemeProvider for the App Router shell (attribute="class"). */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
