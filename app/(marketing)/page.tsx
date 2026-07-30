import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AppShell } from '@/components/organisms/app-shell'
import { ScanChat } from './scan/client'

export const metadata: Metadata = {
  title: 'Design Contracts',
  description:
    'Scan any public site into an installable Design Contract. Chat is the product — paste a URL and get tokens, layout DNA, and an install command.',
}

function ChatFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  )
}

export default function HomePage() {
  return (
    <AppShell currentPage="chat">
      <Suspense fallback={<ChatFallback />}>
        <ScanChat />
      </Suspense>
    </AppShell>
  )
}
