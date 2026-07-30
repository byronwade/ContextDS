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
    body: 'scan_tokens / get_tokens expose the same curated packs and contract download URLs to Claude Code and other agents.',
  },
] as const

export default function FeaturesPage() {
  return (
    <AppShell currentPage="features">
      <PageCanvas>
        <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Features
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Turn a live site into AI-readable design context — without dashboard clutter.
        </p>

        <div className="mt-12 space-y-10">
          {features.map((feature) => (
            <section
              key={feature.title}
              className="border-t border-[color:var(--soft-border)] pt-8 first:border-t-0 first:pt-0"
            >
              <h2 className="text-[15px] font-medium tracking-tight text-foreground">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
          >
            Open Chat
          </Link>
          <Link
            href="/docs"
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--soft-border)] px-4 text-sm font-medium text-foreground transition hover:bg-muted/40"
          >
            Read the docs
          </Link>
        </div>
      </PageCanvas>
    </AppShell>
  )
}
