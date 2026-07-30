import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'

export const metadata: Metadata = {
  title: 'Contact — designcontracts.sh',
  description: 'Get in touch with the designcontracts.sh team.',
}

const channels = [
  {
    title: 'Support',
    email: 'support@designcontracts.sh',
    body: 'Product questions, scan issues, getting started.',
  },
  {
    title: 'Sales & enterprise',
    email: 'sales@designcontracts.sh',
    body: 'Team plans, volume, and partnerships.',
  },
  {
    title: 'Privacy & removal',
    email: 'legal@designcontracts.sh',
    body: 'Opt-out, GDPR, and directory removal requests.',
  },
] as const

export default function ContactPage() {
  return (
    <AppShell currentPage="contact">
      <PageCanvas>
        <h1 className="font-normal tracking-tight text-3xl tracking-tight text-foreground sm:text-4xl">
          Contact
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Reach the team directly — no ticket maze.
        </p>

        <div className="mt-12 space-y-8">
          {channels.map((channel) => (
            <section
              key={channel.email}
              className="border-t border-[color:var(--soft-border)] pt-6 first:border-t-0 first:pt-0"
            >
              <h2 className="text-[15px] font-medium text-foreground">{channel.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{channel.body}</p>
              <a
                href={`mailto:${channel.email}`}
                className="mt-2 inline-block font-mono text-sm text-foreground underline-offset-4 hover:underline"
              >
                {channel.email}
              </a>
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Prefer to explore first?{' '}
          <Link href="/" className="text-foreground underline-offset-4 hover:underline">
            Open Chat
          </Link>{' '}
          or browse the{' '}
          <Link href="/community" className="text-foreground underline-offset-4 hover:underline">
            Library
          </Link>
          .
        </p>
      </PageCanvas>
    </AppShell>
  )
}
