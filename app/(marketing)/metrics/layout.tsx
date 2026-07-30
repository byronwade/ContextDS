import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metrics',
  robots: { index: false, follow: false },
}

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return children
}
