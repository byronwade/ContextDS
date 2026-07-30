import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketingFooter } from '@/components/organisms/marketing-footer'
import { VercelHeader } from '@/components/organisms/vercel-header'
import { ScanChat } from './client'

export const metadata: Metadata = {
  title: 'Scan — Design Contracts',
  description:
    'Scan any public site into an installable Design Contract. Results appear inline; open the full page when you need every tab.',
}

export default function ScanPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(800px 400px at 20% -10%, oklch(0.45 0.04 185 / 0.12), transparent 55%)',
        }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <VercelHeader currentPage="scan" />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
          <header className="mb-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Scan · Design Contracts
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
              designcontracts
              <span className="font-mono text-[0.55em] text-[oklch(0.78_0.08_185)]">.sh</span>
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Paste a URL. Scan gathers tokens, layout DNA, and a contract pack — results land
              inline with a path to the full library view.
            </p>
          </header>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading scan…</div>}>
            <ScanChat />
          </Suspense>
        </main>
        <MarketingFooter />
      </div>
    </div>
  )
}
