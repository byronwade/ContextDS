import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingFooter } from '@/components/organisms/marketing-footer'
import { VercelHeader } from '@/components/organisms/vercel-header'

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
    body: 'Fast uses static CSS for Hobby-friendly latency. Accurate adds Docker Playwright capture when SCANNER_SERVICE_URL is set.',
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
    <div className="min-h-screen bg-background">
      <VercelHeader currentPage="features" />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Features</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
          designcontracts.sh
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything needed to turn a live site into AI-readable design context — without the old
          ContextDS dashboard clutter.
        </p>

        <div className="mt-14 space-y-10">
          {features.map((feature) => (
            <section
              key={feature.title}
              className="border-t border-border/60 pt-8 first:border-t-0 first:pt-0"
            >
              <h2 className="text-xl font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-2 text-muted-foreground">{feature.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background"
          >
            Open Scan
          </Link>
          <Link
            href="/docs"
            className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm font-medium text-foreground"
          >
            Read the docs
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
