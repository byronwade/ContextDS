import type { Metadata } from 'next'
import type { Route } from 'next'
import Link from 'next/link'
import { CheckIcon, MinusIcon } from '@phosphor-icons/react/dist/ssr'
import { AppShell } from '@/components/organisms/app-shell'
import { PageCanvas } from '@/components/molecules/page-canvas'
import { ProCheckoutButton } from '@/components/molecules/pro-checkout-button'
import { Button } from '@/components/ui/button'
import { BILLING, PRO_PLAN } from '@/lib/billing/config'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — designcontracts.sh',
  description: `Free URL scans for everyone. Pro is $${BILLING.proPriceUsd}/mo for App Packs (≥${BILLING.minAppPackImages} screenshots), Studio, and MCP.`,
  openGraph: {
    title: 'Pricing — designcontracts.sh',
    description: `Pro $${BILLING.proPriceUsd}/mo — ${BILLING.appPacksPerMonth} App Packs from product UI screenshots.`,
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
      'Full Design System Dossier for any scanned site',
      'Library access with community contracts',
      'DESIGN.md + tokens.json export',
      'Public MCP read tools (get_tokens, layout_profile)',
    ],
    cta: { label: 'Start scanning', href: '/' as Route, kind: 'link' as const },
    highlight: false,
  },
  {
    name: 'Pro',
    price: `$${BILLING.proPriceUsd}`,
    period: 'per month',
    description: `Application Design Contracts from real product UI — ${BILLING.appPacksPerMonth} App Packs included.`,
    features: [
      `App Packs: ≥${BILLING.minAppPackImages} screenshots → web-app Design Contract`,
      `${BILLING.appPacksPerMonth} App Packs / month (≈ $${(BILLING.proPriceUsd / BILLING.appPacksPerMonth).toFixed(2)} each)`,
      `${BILLING.trialDays}-day free trial`,
      'Everything in Free, unlimited accurate URL scans',
      'Design Contract Studio — author + export',
      'MCP server API key',
      'Private contracts & version history',
    ],
    cta: { label: 'Start free trial', kind: 'checkout' as const },
    highlight: true,
  },
  {
    name: 'Team',
    price: '$29',
    period: 'per seat / month',
    description: 'Shared contract libraries for product teams and agencies.',
    features: [
      'Everything in Pro',
      'Shared team workspace and contract library',
      'Org-wide MCP keys with usage analytics',
      'Role-based permissions & SSO',
      'Onboarding + migration help',
    ],
    cta: { label: 'Contact us', href: '/contact' as Route, kind: 'link' as const },
    highlight: false,
  },
]

const comparison: Array<{
  feature: string
  free: string | boolean
  pro: string | boolean
  team: string | boolean
}> = [
  { feature: 'Public URL scans', free: true, pro: 'Unlimited', team: 'Unlimited' },
  {
    feature: `App Packs (≥${BILLING.minAppPackImages} screenshots)`,
    free: false,
    pro: `${BILLING.appPacksPerMonth} / mo`,
    team: 'Higher limits',
  },
  { feature: 'Design System Dossier', free: true, pro: true, team: true },
  { feature: 'Design Contract Studio', free: false, pro: true, team: true },
  { feature: 'MCP server (write tools + API key)', free: false, pro: true, team: true },
  { feature: 'Private contracts', free: false, pro: true, team: true },
  { feature: 'Team workspace & SSO', free: false, pro: false, team: true },
]

const faqs = [
  {
    question: 'Why aren’t App Packs $1/month?',
    answer: `Each App Pack runs multimodal vision across ≥${BILLING.minAppPackImages} screenshots. At roughly $0.15–$0.40 in AI cost per pack, $${BILLING.proPriceUsd}/mo with ${BILLING.appPacksPerMonth} included packs stays cheap for you (~$${(BILLING.proPriceUsd / BILLING.appPacksPerMonth).toFixed(2)}/pack) while covering compute with a little margin.`,
  },
  {
    question: 'What is an App Pack?',
    answer: `A Pro feature that turns ${BILLING.minAppPackImages}–${BILLING.maxAppPackImages} product UI screenshots (IDE, dashboard, authenticated chrome) into an installable web-app Design Contract. Public URL scans usually only see marketing sites — App Packs are how you capture real app design.`,
  },
  {
    question: 'What exactly is a Design Contract?',
    answer:
      "An installable pack — DESIGN.md grammar, agent skills, references and config — that pins a site's design system so AI agents keep new UI on-system over time. Scans produce one automatically; Pro App Packs do the same from screenshots.",
  },
  {
    question: 'Can I cancel anytime?',
    answer: `Yes — manage billing in the Stripe Customer Portal from this page after checkout. Pro includes a ${BILLING.trialDays}-day trial so you can try App Packs before paying.`,
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
              Scan free. App Packs on Pro.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              URL scans stay free. Pro ({PRO_PLAN.priceLabel}) unlocks multi-screenshot
              application contracts — {BILLING.appPacksPerMonth} App Packs / month,{' '}
              {BILLING.trialDays}-day trial.
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
                      Recommended
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
                {plan.cta.kind === 'checkout' ? (
                  <div className="mt-8">
                    <ProCheckoutButton
                      label={plan.cta.label}
                      variant="secondary"
                      className="border-transparent bg-[var(--ui-accent)] text-[var(--ui-on-primary)] hover:bg-[var(--ui-accent-hover)]"
                    />
                  </div>
                ) : (
                  <Button
                    asChild
                    variant={plan.highlight ? 'secondary' : 'outline'}
                    className="mt-8 w-full"
                  >
                    <Link href={plan.cta.href}>{plan.cta.label}</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-display-lg text-center text-[var(--ui-ink)]">Compare plans</h2>
            <div className="mt-8 overflow-x-auto rounded-[var(--radius-paper)] border border-[var(--ui-border)] bg-[var(--ui-paper)]">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Free</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--ui-accent)]">Pro</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Team</th>
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
                        <CellValue value={row.pro} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CellValue value={row.team} />
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
              Capture app UI that crawlers never see
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Attach {BILLING.minAppPackImages}+ product screenshots on Pro — or paste a public URL
              for a free marketing-surface scan.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="w-full max-w-[220px]">
                <ProCheckoutButton label="Start Pro trial" />
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
