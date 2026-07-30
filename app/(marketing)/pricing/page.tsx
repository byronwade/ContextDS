import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — designcontracts.sh',
  description: 'Simple pricing for Design Contract extraction. Start free, scale when you need API volume.',
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
      <PageCanvas innerClassName="max-w-4xl">
        <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Start free in Chat. Upgrade when you need volume, API, or team features.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'flex flex-col rounded-2xl border border-[color:var(--soft-border)] bg-card/40 p-5',
                plan.highlighted && 'bg-card/80 ring-1 ring-foreground/10'
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">{plan.name}</h2>
                {plan.highlighted ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/50" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={cn(
                  'mt-6 inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium transition',
                  plan.highlighted
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'border border-[color:var(--soft-border)] text-foreground hover:bg-muted/40'
                )}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Questions?{' '}
          <Link href="/contact" className="text-foreground underline-offset-4 hover:underline">
            Contact us
          </Link>
          .
        </p>
      </PageCanvas>
    </AppShell>
  )
}
