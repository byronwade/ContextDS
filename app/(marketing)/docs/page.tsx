import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingFooter } from '@/components/organisms/marketing-footer'
import { VercelHeader } from '@/components/organisms/vercel-header'

export const metadata: Metadata = {
  title: 'Docs — designcontracts.sh',
  description:
    'Scan any public site into an installable Design Contract pack for AI agents and design systems.',
}

const endpoints = [
  {
    method: 'POST',
    path: '/api/scan',
    body: '{ "url": "https://stripe.com", "mode": "fast" }',
    note: 'Extract tokens, layout DNA, semantic graph, and a Design Contract pack.',
  },
  {
    method: 'GET',
    path: '/api/contracts/download?domain=stripe.com',
    body: null,
    note: 'Download the installable contract ZIP for the latest scan.',
  },
  {
    method: 'GET',
    path: '/api/scan/export-llm?domain=stripe.com',
    body: null,
    note: 'LLM-friendly JSON (or ?format=markdown) from the serverless store.',
  },
] as const

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <VercelHeader currentPage="docs" />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Documentation</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
          designcontracts.sh
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Turn any public website into an installable Design Contract — tokens, layout DNA, a
          semantic graph, and agent-ready guidance.
        </p>

        <section className="mt-14 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Quick start</h2>
          <ol className="list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              Open{' '}
              <Link href="/agent" className="text-foreground underline-offset-4 hover:underline">
                /agent
              </Link>{' '}
              and paste a public URL (or use the home search).
            </li>
            <li>
              The agent runs the scanner as a tool and shows an inline Design Contract widget —
              open View full results for every tab.
            </li>
            <li>Download the pack and install it with the Design CLI.</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
            {`npx --yes github:byronwade/Design init
npx --yes github:byronwade/Design resolve --request "rebuild the hero"`}
          </pre>
        </section>

        <section className="mt-14 space-y-6">
          <h2 className="text-xl font-semibold text-foreground">HTTP API</h2>
          {endpoints.map((endpoint) => (
            <article
              key={endpoint.path}
              className="space-y-2 border-t border-border/60 pt-6 first:border-t-0 first:pt-0"
            >
              <p className="font-mono text-sm text-foreground">
                <span className="text-muted-foreground">{endpoint.method}</span> {endpoint.path}
              </p>
              <p className="text-sm text-muted-foreground">{endpoint.note}</p>
              {endpoint.body ? (
                <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
                  {endpoint.body}
                </pre>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Design Contract agent</h2>
          <p className="text-muted-foreground">
            Chat with the ToolLoopAgent at{' '}
            <Link href="/agent" className="text-foreground underline-offset-4 hover:underline">
              /agent
            </Link>
            . It uses the Vercel AI SDK + AI Gateway and tools that call this same scan pipeline (
            <code className="text-foreground">scan_site</code>,{' '}
            <code className="text-foreground">get_tokens</code>,{' '}
            <code className="text-foreground">resolve_graph</code>,{' '}
            <code className="text-foreground">get_contract_download</code>).
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
            {`POST /api/agent/chat
{ "messages": [ /* UIMessage[] from useChat */ ] }

# .env.local
AI_GATEWAY_API_KEY=...
# optional model override
DESIGN_AGENT_MODEL=openai/gpt-5.4-mini`}
          </pre>
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">MCP</h2>
          <p className="text-muted-foreground">
            Agents can call <code className="text-foreground">scan_tokens</code> and{' '}
            <code className="text-foreground">get_tokens</code> with{' '}
            <code className="text-foreground">mode: &quot;fast&quot; | &quot;accurate&quot;</code>.
            Domains are normalized without <code className="text-foreground">www.</code> so cache
            lookups stay consistent.
          </p>
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Accurate scans</h2>
          <p className="text-muted-foreground">
            Run the Playwright scanner beside the Next app, then point the app at it:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
            {`bun run scanner:up
# .env.local
SCANNER_SERVICE_URL=http://localhost:4040
# optional
SCANNER_SERVICE_SECRET=shared-secret`}
          </pre>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
