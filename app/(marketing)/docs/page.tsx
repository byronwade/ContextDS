import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'

export const metadata: Metadata = {
  title: 'Docs — designcontracts.sh',
  description:
    'Scan any public site into an installable Design Contract pack for AI agents and design systems.',
}

const endpoints = [
  {
    method: 'POST',
    path: '/api/scan',
    body: '{ "url": "https://stripe.com", "mode": "accurate" }',
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
    <AppShell currentPage="docs">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="font-normal tracking-tight text-3xl tracking-tight text-foreground sm:text-4xl">Docs</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Turn any public website into an installable Design Contract — tokens, layout DNA, a
            semantic graph, and agent-ready guidance.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-medium tracking-tight text-foreground">Quick start</h2>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              <li>
                Open{' '}
                <Link href="/" className="text-foreground underline-offset-4 hover:underline">
                  Chat
                </Link>{' '}
                and paste a public URL.
              </li>
              <li>
                Scan gathers tokens via tools and shows an inline Design Contract — Open loads the
                saved results (no second scan).
              </li>
              <li>Download the pack and install it with the Design CLI.</li>
            </ol>
            <pre className="overflow-x-auto rounded-2xl border border-[color:var(--soft-border)] bg-card/60 p-4 font-mono text-xs leading-relaxed">
              {`npx --yes github:byronwade/Design init
npx --yes github:byronwade/Design resolve --request "rebuild the hero"`}
            </pre>
          </section>

          <section className="mt-12 space-y-5">
            <h2 className="text-sm font-medium tracking-tight text-foreground">HTTP API</h2>
            {endpoints.map((endpoint) => (
              <article
                key={endpoint.path}
                className="space-y-2 rounded-2xl border border-[color:var(--soft-border)] bg-card/40 px-4 py-4"
              >
                <p className="font-mono text-sm text-foreground">
                  <span className="text-muted-foreground">{endpoint.method}</span> {endpoint.path}
                </p>
                <p className="text-sm text-muted-foreground">{endpoint.note}</p>
                {endpoint.body ? (
                  <pre className="overflow-x-auto rounded-xl bg-muted/40 p-3 font-mono text-xs">
                    {endpoint.body}
                  </pre>
                ) : null}
              </article>
            ))}
          </section>

          <section className="mt-12 space-y-3">
            <h2 className="text-sm font-medium tracking-tight text-foreground">Chat agent</h2>
            <p className="text-sm text-muted-foreground">
              Chat uses the Vercel AI SDK + AI Gateway (`ToolLoopAgent`) with tools{' '}
              <code className="text-foreground">scan_site</code>,{' '}
              <code className="text-foreground">get_tokens</code>,{' '}
              <code className="text-foreground">resolve_graph</code>, and{' '}
              <code className="text-foreground">get_contract_download</code>.
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-[color:var(--soft-border)] bg-card/60 p-4 font-mono text-xs leading-relaxed">
              {`POST /api/agent/chat
{ "messages": [ /* UIMessage[] from useChat */ ] }

# .env.local
AI_GATEWAY_API_KEY=...
SCANNER_SERVICE_URL=https://designcontracts-scanner.vercel.app`}
            </pre>
          </section>

          <section className="mt-12 space-y-3 pb-16">
            <h2 className="text-sm font-medium tracking-tight text-foreground">Accurate scans</h2>
            <p className="text-sm text-muted-foreground">
              When <code className="text-foreground">SCANNER_SERVICE_URL</code> is set, chat defaults
              to accurate browser capture via the Vercel Chromium scanner.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
