import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — designcontracts.sh',
  description:
    'Simple pricing for Design Contract extraction. Start free, scale when you need API volume.',
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Explore chat scans and the public library.',
    features: [
      'Chat-based site scans',
      'Installable contract packs',
      'Library access',
      'Community support',
    ],
    cta: { href: '/', label: 'Open Chat' },
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9.95',
    period: '/ month',
    description: 'Higher volume and API access for builders.',
    features: [
      'Unlimited chat scans',
      'Accurate scanner mode',
      'API + MCP access',
      'Private contract storage',
      'Priority support',
    ],
    cta: { href: '/contact', label: 'Talk to us' },
    highlighted: true,
  },
  {
    name: 'Team',
    price: 'Custom',
    period: '',
    description: 'Shared workspaces and volume for orgs.',
    features: [
      'Everything in Pro',
      'Shared library',
      'SSO / seat management',
      'SLA options',
    ],
    cta: { href: '/contact', label: 'Contact sales' },
    highlighted: false,
  },
] as const

export default function PricingPage() {
  return (
    <AppShell currentPage="pricing">
      <PageCanvas variant="document" innerClassName="max-w-4xl">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ui-ink)] sm:text-[26px]">
          Pricing
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--ui-ink-secondary)]">
          Start free in Chat. Upgrade when you need volume, API, or team features.
        </p>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'flex flex-col rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-paper)] p-4 shadow-[var(--shadow-paper)]',
                plan.highlighted && 'border-[var(--ui-border-edge)] bg-[var(--ui-paper)] ring-1 ring-[var(--ui-accent)]/20'
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[13px] font-semibold text-[var(--ui-ink)]">{plan.name}</h2>
                {plan.highlighted ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ui-accent)]">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-[var(--ui-ink)] tabular-nums">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-[12px] text-[var(--ui-ink-muted)]">{plan.period}</span>
                ) : null}
              </p>
              <p className="mt-2 text-[13px] text-[var(--ui-ink-secondary)]">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-[var(--ui-ink-secondary)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--ui-ink-muted)]"
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={cn(
                  'mt-5 inline-flex h-8 items-center justify-center rounded-[7px] text-[13px] font-medium transition',
                  plan.highlighted
                    ? 'bg-[var(--ui-accent)] text-[var(--ui-paper)] shadow-[var(--shadow-control-primary)] hover:bg-[var(--ui-accent-hover)]'
                    : 'bg-[var(--ui-paper)] text-[var(--ui-ink)] shadow-[var(--shadow-control)] hover:bg-[var(--ui-paper-hover)]'
                )}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-[var(--ui-ink-secondary)]">
          Questions?{' '}
          <Link
            href="/contact"
            className="text-[var(--ui-ink)] underline-offset-4 hover:underline"
          >
            Contact us
          </Link>
          .
        </p>
      </PageCanvas>
    </AppShell>
  )
}
