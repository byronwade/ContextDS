import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AppChrome } from '@/components/organisms/app-chrome'
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
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <AppChrome currentPage="home" />
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col"
        role="main"
        aria-label="Design Contracts chat"
      >
        <Suspense fallback={<ChatFallback />}>
          <ScanChat />
        </Suspense>
      </main>
    </div>
  )
}
