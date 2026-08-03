import type { Metadata } from "next"
import type { Route } from "next"
import Link from "next/link"
import { CheckIcon, MinusIcon } from "@phosphor-icons/react/dist/ssr"
import { AppShell } from "@/components/organisms/app-shell"
import { PageCanvas } from "@/components/molecules/page-canvas"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Pricing — designcontracts.sh",
  description:
    "Free scans for everyone. Pro adds the Design Contract Studio, the MCP server, private contracts and unlimited accurate scans.",
  openGraph: {
    title: "Pricing — designcontracts.sh",
    description:
      "Free scans for everyone. Pro unlocks the Studio and the MCP server.",
  },
}

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Scan public sites and read every contract in the Library.",
    features: [
      "10 scans per month",
      "Full Design System Dossier for any scanned site",
      "Library access with community contracts",
      "DESIGN.md + tokens.json export",
      "Public MCP read tools (get_tokens, layout_profile)",
    ],
    cta: { label: "Start scanning", href: "/" },
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "Author your own contracts and bring them into your agent.",
    features: [
      "Everything in Free, unlimited accurate scans",
      "Design Contract Studio — author + export your own systems",
      "MCP server API key — scan_tokens, research_artifacts, compose_pack",
      "Private contracts & version history",
      "Semantic graph + full pack downloads via API",
      "Priority support",
    ],
    cta: { label: "Upgrade to Pro", href: "/studio" },
    highlight: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "per seat / month",
    description: "Shared contract libraries for product teams and agencies.",
    features: [
      "Everything in Pro",
      "Shared team workspace and contract library",
      "Org-wide MCP keys with usage analytics",
      "Role-based permissions & SSO",
      "Onboarding + migration help",
    ],
    cta: { label: "Contact us", href: "/contact" },
    highlight: false,
  },
]

const comparison: Array<{
  feature: string
  free: string | boolean
  pro: string | boolean
  team: string | boolean
}> = [
  { feature: "Site scans", free: "10 / month", pro: "Unlimited", team: "Unlimited" },
  { feature: "Design System Dossier", free: true, pro: true, team: true },
  { feature: "Design Contract Studio", free: false, pro: true, team: true },
  { feature: "MCP server (write tools + API key)", free: false, pro: true, team: true },
  { feature: "Private contracts", free: false, pro: true, team: true },
  { feature: "Team workspace & SSO", free: false, pro: false, team: true },
]

const faqs = [
  {
    question: "What exactly is a Design Contract?",
    answer:
      "An installable pack — DESIGN.md grammar, agent skills, references and config — that pins a site's design system so AI agents keep new UI on-system over time. Scans produce one automatically; Pro lets you author your own in the Studio.",
  },
  {
    question: "What does the MCP server add?",
    answer:
      "It exposes designcontracts.sh as tools inside Claude, Cursor and any MCP client: fetch a site's tokens mid-build, profile its layout, trigger scans and compose packs without leaving your editor. Read tools are free; scanning, research and pack composition need a Pro key.",
  },
  {
    question: "Do I need Pro to use scanned contracts?",
    answer:
      "No. Every public scan's dossier, DESIGN.md and pack download stay free. Pro is for creating your own contracts, private storage, and the full MCP toolset.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes — cancel whenever you like and keep Pro until the end of the billing period. Paid plans come with a 14-day money-back guarantee.",
  },
]

function CellValue({ value }: { value: string | boolean }) {
 if (value === true) return <CheckIcon weight="duotone" className="mx-auto size-4 text-[var(--ui-success)]" />
 if (value === false) return <MinusIcon weight="duotone" className="mx-auto size-4 text-muted-foreground/40" />
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
              Scan free. Create with Pro.
            </h1>
 <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Reading design systems is free forever. Pro is for making your own —
              the Studio, the MCP server, and private contracts.
            </p>
          </div>
        </section>

 <section className="px-4 py-12 sm:px-6">
 <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
 className={cn(
                  "flex flex-col rounded-[var(--radius-paper)] border p-8",
                  plan.highlight
                    ? "border-[var(--ui-ink)] bg-[var(--ui-ink)] text-[var(--ui-canvas)]"
                    : "border-[var(--ui-border)] bg-[var(--ui-paper)]"
                )}
              >
 <div className="flex items-center justify-between">
                  <h2
 className={cn(
                      "text-display-sm",
                      plan.highlight ? "text-[var(--ui-canvas)]" : "text-[var(--ui-ink)]"
                    )}
                  >
                    {plan.name}
                  </h2>
                  {plan.highlight && (
 <span className="rounded-full bg-[var(--ui-canvas)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-canvas)]">
                      Recommended
                    </span>
                  )}
                </div>
 <p className="mt-4">
                  <span
 className={cn(
                      "font-mono text-4xl",
                      plan.highlight ? "text-[var(--ui-canvas)]" : "text-[var(--ui-ink)]"
                    )}
                  >
                    {plan.price}
                  </span>
                  <span
 className={cn(
                      "ml-2 font-mono text-[11px]",
                      plan.highlight ? "text-[var(--ui-canvas)]/70" : "text-muted-foreground"
                    )}
                  >
                    {plan.period}
                  </span>
                </p>
                <p
 className={cn(
                    "mt-3 text-sm leading-relaxed",
                    plan.highlight ? "text-[var(--ui-canvas)]/75" : "text-muted-foreground"
                  )}
                >
                  {plan.description}
                </p>
 <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
 className={cn(
                        "flex items-start gap-2.5 text-sm",
                        plan.highlight ? "text-[var(--ui-canvas)]/80" : "text-muted-foreground"
                      )}
                    >
                      <CheckIcon
                        weight="duotone"
 className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          plan.highlight ? "text-[var(--ui-canvas)]" : "text-[var(--ui-success)]"
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.highlight ? "secondary" : "outline"}
 className={cn(
                    "mt-8 w-full",
                    plan.highlight &&
                      "border-transparent bg-[var(--ui-accent)] text-[var(--ui-on-primary)] hover:bg-[var(--ui-accent-hover)]"
                  )}
                >
                  <Link href={plan.cta.href as Route}>{plan.cta.label}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

 <section className="px-4 py-12 sm:px-6">
 <div className="mx-auto max-w-3xl">
 <h2 className="text-display-lg text-center text-[var(--ui-ink)]">
              Compare plans
            </h2>
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
 <td className="px-4 py-3 text-center"><CellValue value={row.free} /></td>
 <td className="px-4 py-3 text-center"><CellValue value={row.pro} /></td>
 <td className="px-4 py-3 text-center"><CellValue value={row.team} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

 <section className="px-4 py-12 sm:px-6">
 <div className="mx-auto max-w-2xl">
 <h2 className="text-display-lg text-center text-[var(--ui-ink)]">
              Questions
            </h2>
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
              Gather your first system in seconds
            </h2>
 <p className="mt-3 text-sm text-muted-foreground">
              Paste a URL in Chat — the dossier, the pack and the philosophy are free.
            </p>
 <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/">Open chat</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/studio">Try the Studio</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageCanvas>
    </AppShell>
  )
}
