import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'

export const metadata: Metadata = {
  title: 'About — designcontracts.sh',
  description:
    'Design Contracts turns public sites into installable, AI-readable design systems.',
}

const principles = [
  {
    title: 'Contracts, not dumps',
    body: 'Agents need relationships — tokens tied to roles, components, and layout DNA — not a flat CSS inventory.',
  },
  {
    title: 'Chat-first workspace',
    body: 'Scanning lives inside conversation. Open a contract from an inline widget; never force a marketing tour.',
  },
  {
    title: 'Public web, privacy-aware',
    body: 'We scan public CSS with robots respect and clear opt-out. Store only what agents need to rebuild UI.',
  },
  {
    title: 'Open standards',
    body: 'W3C design tokens, MCP tools, and installable packs that fit Claude Code and other agent workflows.',
  },
] as const

export default function AboutPage() {
  return (
    <AppShell currentPage="about">
      <PageCanvas>
        <h1 className="font-normal tracking-tight text-3xl tracking-tight text-foreground sm:text-4xl">About</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          designcontracts.sh makes every public design system discoverable and installable for AI
          agents — starting from a URL in chat.
        </p>

        <section className="mt-12 space-y-8">
          {principles.map((item) => (
            <div
              key={item.title}
              className="border-t border-[color:var(--soft-border)] pt-6 first:border-t-0 first:pt-0"
            >
              <h2 className="text-[15px] font-medium text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open Chat
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-xl border border-[color:var(--soft-border)] px-4 text-sm font-medium text-foreground transition hover:bg-muted/40"
          >
            Contact
          </Link>
        </div>
      </PageCanvas>
    </AppShell>
  )
}
