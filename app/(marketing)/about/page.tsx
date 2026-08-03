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
      <PageCanvas variant="document">
        <h1 className="text-display-md text-[var(--ui-ink)]">About</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
          designcontracts.sh makes every public design system discoverable and installable for AI
          agents — starting from a URL in chat.
        </p>

        <section className="mt-10 space-y-6">
          {principles.map((item) => (
            <div
              key={item.title}
              className="border-t border-[var(--ui-border-soft)] pt-5 first:border-t-0 first:pt-0"
            >
              <h2 className="text-[14px] font-semibold text-[var(--ui-ink)]">{item.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ui-ink-secondary)]">
                {item.body}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-2">
          <Link prefetch={false}
            href="/"
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--ui-accent)] px-[18px] text-sm font-medium text-[var(--ui-on-primary)] transition hover:bg-[var(--ui-accent-hover)]"
          >
            Open Chat
          </Link>
          <Link prefetch={false}
            href="/contact"
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] px-[18px] text-sm font-medium text-[var(--ui-ink)] transition hover:bg-[var(--ui-paper-hover)]"
          >
            Contact
          </Link>
        </div>
      </PageCanvas>
    </AppShell>
  )
}
