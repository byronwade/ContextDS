import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'

export const metadata: Metadata = {
  title: 'Features — designcontracts.sh',
  description:
    'Design Contracts extracts tokens, layout DNA, and a semantic graph so AI agents can rebuild UI with real system context.',
}

const features = [
  {
    title: 'Scan to Design Contract',
    body: 'One URL becomes DESIGN.md, AGENTS.md, skills, graph.json, and an installable ZIP compatible with the Design engine.',
  },
  {
    title: 'Semantic design graph',
    body: 'Tokens link to roles, components, layouts, and patterns — so agents get relationships, not a flat dump.',
  },
  {
    title: 'Fast + accurate modes',
    body: 'Fast uses static CSS for Hobby-friendly latency. Accurate adds the Vercel Chromium scanner when SCANNER_SERVICE_URL is set.',
  },
  {
    title: 'Wallace-aware tokenization',
    body: 'W3C extraction merged with Project Wallace values for stronger color, type, and spacing coverage.',
  },
  {
    title: 'Serverless by default',
    body: 'Vercel Blob + Upstash Redis (with memory fallback). No paid Postgres required for the scan path.',
  },
  {
    title: 'Scan chat',
    body: 'AI SDK messaging UI on Vercel AI Gateway. Scan sites, read the semantic graph, and hand you an installable contract pack inline.',
  },
  {
    title: 'MCP-ready',
    body: 'scan_site / get_tokens / get_design_md / get_contract_download expose the same curated packs and ZIP URLs to Claude Code and other agents.',
  },
] as const

export default function FeaturesPage() {
  return (
    <AppShell currentPage="features">
      <PageCanvas variant="document">
        <h1 className="text-display-md text-[var(--ui-ink)]">Features</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
          Turn a live site into AI-readable design context — without dashboard clutter.
        </p>

        <div className="mt-10 space-y-8">
          {features.map((feature) => (
            <section
              key={feature.title}
              className="border-t border-[var(--ui-border-soft)] pt-6 first:border-t-0 first:pt-0"
            >
              <h2 className="text-[14px] font-semibold tracking-tight text-[var(--ui-ink)]">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
                {feature.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--ui-accent)] px-[18px] text-sm font-medium text-[var(--ui-on-primary)] transition hover:bg-[var(--ui-accent-hover)]"
          >
            Open Chat
          </Link>
          <Link
            href="/docs"
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] px-[18px] text-sm font-medium text-[var(--ui-ink)] transition hover:bg-[var(--ui-paper-hover)]"
          >
            Read the docs
          </Link>
        </div>
      </PageCanvas>
    </AppShell>
  )
}
