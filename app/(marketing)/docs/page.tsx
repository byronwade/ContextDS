import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'

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
    method: 'POST',
    path: '/api/contracts/from-image',
    body: '{ "images": [{ "imageBase64": "<…>" }, "…×5+" ], "name": "Cursor", "preferApp": true }',
    note: 'App Pack — ≥5 product UI screenshots → web-app Design Contract. Requires credits ($4/$15) or Pro.',
  },
  {
    method: 'POST',
    path: '/api/billing/checkout',
    body: '{ "sku": "pack_single" | "pack_bundle" | "pro", "email": "you@example.com" }',
    note: 'Stripe Checkout — default pack_single (one-time credits).',
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
      <PageCanvas variant="document">
          <h1 className="text-display-md text-[var(--ui-ink)]">Docs</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
            Turn any public website into an installable Design Contract — tokens, layout DNA, a
            semantic graph, and agent-ready guidance.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-[13px] font-medium tracking-tight text-[var(--ui-ink)]">
              Quick start
            </h2>
            <ol className="list-decimal space-y-2.5 pl-5 text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
              <li>
                Open{' '}
                <Link
                  href="/"
                  className="text-[var(--ui-ink)] underline-offset-4 hover:underline"
                >
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
            <pre className="overflow-x-auto rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-3.5 font-mono text-[12px] leading-relaxed">
              {`npx --yes github:byronwade/Design init --profile web-marketing --app-type marketing-site
npx --yes github:byronwade/Design resolve --request "rebuild the hero"`}
            </pre>
          </section>

          <section className="mt-12 space-y-3">
            <h2 className="text-[13px] font-medium tracking-tight text-[var(--ui-ink)]">
              Enforce with the engine
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
              Installed packs are upheld by the Design engine. Init with a profile plus one of four
              app types — <code className="text-[var(--ui-ink)]">saas-workbench</code>,{' '}
              <code className="text-[var(--ui-ink)]">admin-console</code>,{' '}
              <code className="text-[var(--ui-ink)]">content-studio</code>, or{' '}
              <code className="text-[var(--ui-ink)]">marketing-site</code> — then run the loop:
            </p>
            <pre className="overflow-x-auto rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-3.5 font-mono text-[12px] leading-relaxed">
              {`npx --yes github:byronwade/Design init --profile web-app --app-type saas-workbench
npx --yes github:byronwade/Design resolve --request "rebuild the hero"
# build the change with the resolved semantic tokens
npx --yes github:byronwade/Design check
npx --yes github:byronwade/Design verify --mode release`}
            </pre>
            <p className="text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
              <code className="text-[var(--ui-ink)]">verify --mode release</code> emits receipts.
              Scans also seed{' '}
              <code className="text-[var(--ui-ink)]">.design/receipts/contextds-drift.json</code> —
              observation-only drift evidence that never rewrites DESIGN.md.
            </p>
          </section>

          <section className="mt-12 space-y-3">
            <h2 className="text-[13px] font-medium tracking-tight text-[var(--ui-ink)]">
              HTTP API
            </h2>
            {endpoints.map((endpoint) => (
              <article
                key={endpoint.path}
                className="space-y-2 rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-paper)] px-3.5 py-3"
              >
                <p className="font-mono text-[13px] text-[var(--ui-ink)]">
                  <span className="text-[var(--ui-ink-muted)]">{endpoint.method}</span>{' '}
                  {endpoint.path}
                </p>
                <p className="text-[13px] text-[var(--ui-ink-secondary)]">{endpoint.note}</p>
                {endpoint.body ? (
                  <pre className="overflow-x-auto rounded-[8px] bg-[var(--ui-paper-subtle)] p-2.5 font-mono text-[11px]">
                    {endpoint.body}
                  </pre>
                ) : null}
              </article>
            ))}
          </section>

          <section className="mt-12 space-y-3">
            <h2 className="text-[13px] font-medium tracking-tight text-[var(--ui-ink)]">
              Chat agent
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
              Chat uses the Vercel AI SDK + AI Gateway (`ToolLoopAgent`) with tools including{' '}
              <code className="text-[var(--ui-ink)]">scan_site</code>,{' '}
              <code className="text-[var(--ui-ink)]">contract_from_screenshot</code>,{' '}
              <code className="text-[var(--ui-ink)]">get_tokens</code>, and{' '}
              <code className="text-[var(--ui-ink)]">get_contract_download</code>. Attach an app
              screenshot when you need product UI (IDE/dashboard) instead of marketing pages.
            </p>
            <pre className="overflow-x-auto rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-paper-subtle)] p-3.5 font-mono text-[12px] leading-relaxed">
              {`POST /api/agent/chat
{ "messages": [ /* UIMessage[] from useChat */ ] }

# .env.local
AI_GATEWAY_API_KEY=...
SCANNER_SERVICE_URL=https://designcontracts-scanner.vercel.app`}
            </pre>
          </section>

          <section className="mt-12 space-y-3">
            <h2 className="text-[13px] font-medium tracking-tight text-[var(--ui-ink)]">
              Accurate scans
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
              When <code className="text-[var(--ui-ink)]">SCANNER_SERVICE_URL</code> is set, chat
              defaults to accurate browser capture via the Vercel Chromium scanner.
            </p>
          </section>

          <section className="mt-12 space-y-3 pb-8">
            <h2 className="text-[13px] font-medium tracking-tight text-[var(--ui-ink)]">
              App Packs (application UI)
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
              Public crawls usually see marketing sites. For product chrome (Cursor, dashboards,
              workbenches), attach at least five screenshots in chat or POST{' '}
              <code className="text-[var(--ui-ink)]">/api/contracts/from-image</code>. Vision
              synthesizes a <code className="text-[var(--ui-ink)]">web-app</code> Design Contract
              across the set. Buy one-time credits ($4 / 1 pack, $15 / 5 — never expire) or optional
              Pro ($12/mo for MCP + monthly credits) at{' '}
              <code className="text-[var(--ui-ink)]">/pricing</code>. Requires AI Gateway.
              Local/dev: set <code className="text-[var(--ui-ink)]">BILLING_BYPASS=1</code>.
            </p>
          </section>
      </PageCanvas>
    </AppShell>
  )
}
