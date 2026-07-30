import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Internal demo',
  robots: { index: false, follow: false },
}

export default function UltrafastDemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
