import type { Metadata } from 'next'
import type { Route } from 'next'
import Link from 'next/link'
import { CheckIcon, MinusIcon } from '@phosphor-icons/react/dist/ssr'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'
import { CheckoutButton } from '@/components/molecules/pro-checkout-button'
import { Button } from '@/components/ui/button'
import { BILLING, CREDIT_SKUS, PRO_PLAN } from '@/lib/billing/config'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — designcontracts.sh',
  description: `Buy App Pack credits (never expire) from $${BILLING.packSingleUsd}. Optional Pro $${BILLING.proPriceUsd}/mo for MCP + monthly credits.`,
  openGraph: {
    title: 'Pricing — designcontracts.sh',
    description: `Credits-first App Packs. $${BILLING.packSingleUsd} for one, $${BILLING.packBundleUsd} for five. Pro optional.`,
  },
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Scan public sites and read every contract in the Library.',
    features: [
      'Public URL scans (marketing surfaces)',
      'Full Design System Dossier',
      'Library access',
      'DESIGN.md + tokens.json from scans',
      'Public MCP read tools',
    ],
    cta: { kind: 'link' as const, label: 'Start scanning', href: '/' as Route },
    highlight: false,
  },
  {
    name: 'App Pack credits',
    price: CREDIT_SKUS.pack_single.priceLabel,
    period: 'one-time',
    description:
      'Pay for the work you actually do. Credits never expire — generate one system and move on.',
    features: [
      `${CREDIT_SKUS.pack_single.priceLabel} → ${CREDIT_SKUS.pack_single.credits} App Pack`,
      `${CREDIT_SKUS.pack_bundle.priceLabel} → ${CREDIT_SKUS.pack_bundle.credits} App Packs (best value)`,
      `≥${BILLING.minAppPackImages} product UI screenshots per pack`,
      'Credits never expire or auto-renew',
      'No subscription required',
    ],
    cta: { kind: 'credits' as const },
    highlight: true,
  },
  {
    name: 'Pro',
    price: `$${BILLING.proPriceUsd}`,
    period: 'per month',
    description:
      'For people who live in the agent loop — not a one-shot download.',
    features: PRO_PLAN.features,
    cta: { kind: 'pro' as const, label: 'Start Pro trial' },
    highlight: false,
  },
]

const comparison: Array<{
  feature: string
  free: string | boolean
  credits: string | boolean
  pro: string | boolean
}> = [
  { feature: 'Public URL scans', free: true, credits: true, pro: true },
  {
    feature: `App Packs (≥${BILLING.minAppPackImages} screenshots)`,
    free: false,
    credits: 'Pay per pack',
    pro: `${BILLING.proCreditsPerMonth} / mo + buy more`,
  },
  { feature: 'Credits never expire', free: false, credits: true, pro: true },
  { feature: 'Personal MCP API key', free: false, credits: false, pro: true },
  { feature: 'Studio DESIGN.md + full pack ZIP', free: false, credits: false, pro: true },
  { feature: 'CSS remeasure of App Packs', free: false, credits: true, pro: true },
  { feature: 'Subscription', free: false, credits: false, pro: true },
]

const faqs = [
  {
    question: 'Why not only a monthly plan?',
    answer: `Most people generate one application Design Contract (or a few tweaks) and leave. Charging $${BILLING.proPriceUsd}/mo for that invites cancel-after-month-1 churn. Credits match the real job: pay once, credits never expire.`,
  },
  {
    question: 'When should I buy Pro?',
    answer: `When you keep pulling contracts into Claude / Cursor via MCP, iterate across many apps, or want Studio export. Pro adds ${BILLING.proCreditsPerMonth} credits every month (unused stack) plus a personal MCP key — sticky value beyond a single pack.`,
  },
  {
    question: 'What is an App Pack?',
    answer: `${BILLING.minAppPackImages}–${BILLING.maxAppPackImages} product UI screenshots → one installable web-app Design Contract. Public URL scans usually only see marketing sites.`,
  },
  {
    question: 'Do unused Pro credits disappear?',
    answer:
      'No. Monthly Pro credits stack onto your balance. If you cancel Pro, leftover credits stay for App Packs; the MCP key stops working.',
  },
]

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <CheckIcon weight="duotone" className="mx-auto size-4 text-[var(--ui-success)]" />
  }
  if (value === false) {
    return <MinusIcon weight="duotone" className="mx-auto size-4 text-muted-foreground/40" />
  }
  return <span className="font-mono text-xs text-foreground">{value}</span>
}

export default function PricingPage() {
  return (
    <AppShell currentPage="pricing">
      <PageCanvas variant="operational">
        <section className="px-4 pb-4 pt-10 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-ink-muted)]">
              Pricing
            </p>
            <h1 className="text-display-lg mt-3 text-[var(--ui-ink)] sm:text-[56px] sm:tracking-[-1.6px]">
              Pay for packs. Subscribe only if you stay.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              URL scans stay free. App Packs are one-time credits that never expire.
              Pro is optional — for MCP + monthly top-ups if you keep designing in your agent.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'flex flex-col rounded-[var(--radius-paper)] border p-8',
                  plan.highlight
                    ? 'border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--ui-canvas)]'
                    : 'border-[var(--ui-border)] bg-[var(--ui-paper)]'
                )}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className={cn(
                      'text-display-sm',
                      plan.highlight ? 'text-[var(--ui-canvas)]' : 'text-[var(--ui-ink)]'
                    )}
                  >
                    {plan.name}
                  </h2>
                  {plan.highlight ? (
                    <span className="rounded-full bg-[var(--ui-canvas)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-canvas)]">
                      Most people
                    </span>
                  ) : null}
                </div>
                <p className="mt-4">
                  <span
                    className={cn(
                      'font-mono text-4xl',
                      plan.highlight ? 'text-[var(--ui-canvas)]' : 'text-[var(--ui-ink)]'
                    )}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={cn(
                      'ml-2 font-mono text-[11px]',
                      plan.highlight ? 'text-[var(--ui-canvas)]/70' : 'text-muted-foreground'
                    )}
                  >
                    {plan.period}
                  </span>
                </p>
                <p
                  className={cn(
                    'mt-3 text-sm leading-relaxed',
                    plan.highlight ? 'text-[var(--ui-canvas)]/75' : 'text-muted-foreground'
                  )}
                >
                  {plan.description}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={cn(
                        'flex items-start gap-2.5 text-sm',
                        plan.highlight ? 'text-[var(--ui-canvas)]/80' : 'text-muted-foreground'
                      )}
                    >
                      <CheckIcon
                        weight="duotone"
                        className={cn(
                          'mt-0.5 size-3.5 shrink-0',
                          plan.highlight ? 'text-[var(--ui-canvas)]' : 'text-[var(--ui-success)]'
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.cta.kind === 'credits' ? (
                  <div className="mt-8 space-y-2">
                    <CheckoutButton
                      sku="pack_single"
                      label={`Buy 1 pack · $${BILLING.packSingleUsd}`}
                      variant="secondary"
                      className="border-transparent bg-[var(--ui-accent)] text-[var(--ui-on-primary)] hover:bg-[var(--ui-accent-hover)]"
                    />
                    <CheckoutButton
                      sku="pack_bundle"
                      label={`Buy 5 packs · $${BILLING.packBundleUsd}`}
                      variant="outline"
                      className="border-[var(--ui-canvas)]/30 bg-transparent text-[var(--ui-canvas)] hover:bg-[var(--ui-canvas)]/10"
                    />
                  </div>
                ) : plan.cta.kind === 'pro' ? (
                  <div className="mt-8">
                    <CheckoutButton sku="pro" label={plan.cta.label} variant="outline" />
                  </div>
                ) : (
                  <Button asChild variant="outline" className="mt-8 w-full">
                    <Link href={plan.cta.href}>{plan.cta.label}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-display-lg text-center text-[var(--ui-ink)]">Compare</h2>
            <div className="mt-8 overflow-x-auto rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper)]">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Free</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--ui-accent)]">
                      Credits
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.feature} className="border-b border-border/30 last:border-b-0">
                      <td className="px-4 py-3 text-foreground">{row.feature}</td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.free} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.credits} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.pro} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-display-lg text-center text-[var(--ui-ink)]">Questions</h2>
            <div className="mt-8 space-y-0 border-t border-border/40">
              {faqs.map((faq) => (
                <details key={faq.question} className="group border-b border-border/40 py-4">
                  <summary className="cursor-pointer select-none list-none text-[15px] font-medium text-foreground transition-colors hover:text-[var(--ui-accent)]">
                    {faq.question}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 text-center sm:px-6">
          <div className="mx-auto max-w-xl">
            <h2 className="text-display-lg text-[var(--ui-ink)]">
              One system, or a seat in the loop
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Most people buy a pack. Subscribe only if MCP and monthly credits earn their keep.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="w-full max-w-[220px]">
                <CheckoutButton
                  sku="pack_single"
                  label={`Get 1 App Pack · $${BILLING.packSingleUsd}`}
                />
              </div>
              <Button asChild variant="outline">
                <Link href="/">Open chat</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageCanvas>
    </AppShell>
  )
}
