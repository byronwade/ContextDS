import type { Metadata } from 'next'
import { MarketingFooter } from '@/components/organisms/marketing-footer'
import { VercelHeader } from '@/components/organisms/vercel-header'
import { AgentChat } from './client'

export const metadata: Metadata = {
  title: 'Agent — designcontracts.sh',
  description:
    'Chat with the Design Contract agent. Scan sites, inspect semantic graphs, and install AI-ready design packs via Vercel AI Gateway.',
}

export default function AgentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VercelHeader currentPage="agent" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">AI Gateway · ToolLoopAgent</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
            designcontracts.sh
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Ask the agent to scan a site, explain the system graph, or hand you an installable
            Design Contract pack. Powered by the Vercel AI SDK and AI Gateway.
          </p>
        </header>
        <AgentChat />
      </main>
      <MarketingFooter />
    </div>
  )
}
