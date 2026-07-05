import { Metadata } from "next"
import Link from "next/link"
import { Check, Star, Zap, Users, Building2 } from "lucide-react"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Pricing - ContextDS",
  description: "Simple, transparent pricing for design token extraction. Start free, upgrade as you grow.",
  openGraph: {
    title: "Pricing - ContextDS",
    description: "Simple pricing for AI-powered design token extraction",
  },
}

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring and small projects",
    icon: Star,
    features: [
      "10 token extractions per month",
      "Basic design token export",
      "Community directory access",
      "Standard CSS analysis",
      "Public token sets only",
      "Community support"
    ],
    limitations: [
      "No layout DNA analysis",
      "No private token sets",
      "No API access",
      "No priority support"
    ],
    cta: "Start free",
    href: "/scan",
    popular: false
  },
  {
    name: "Pro",
    price: "$9.95",
    period: "per month",
    description: "For designers and developers building design systems",
    icon: Zap,
    features: [
      "Unlimited token extractions",
      "Full layout DNA analysis",
      "Private token sets",
      "MCP API access",
      "Advanced export formats",
      "Version history & diffs",
      "Priority email support",
      "Custom token aliasing",
      "Bulk operations",
      "Webhook integrations"
    ],
    limitations: [],
    cta: "Start Pro trial",
    href: "/contact?subject=sales",
    popular: true
  },
  {
    name: "Team",
    price: "$29",
    period: "per month",
    description: "For teams collaborating on design systems",
    icon: Users,
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Collaborative features",
      "Shared token libraries",
      "Team analytics",
      "Role-based permissions",
      "SSO integration",
      "Priority chat support",
      "Team onboarding",
      "Advanced security"
    ],
    limitations: [],
    cta: "Contact sales",
    href: "/contact?subject=sales",
    popular: false
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For large organizations with custom needs",
    icon: Building2,
    features: [
      "Everything in Team",
      "Custom integrations",
      "On-premises deployment",
      "SLA guarantees",
      "Dedicated support",
      "Custom training",
      "Advanced analytics",
      "Audit logging",
      "Custom branding",
      "Volume discounts"
    ],
    limitations: [],
    cta: "Contact sales",
    href: "/contact?subject=sales",
    popular: false
  }
]

const faqs = [
  {
    question: "What counts as a token extraction?",
    answer: "A token extraction is analyzing one website/URL to generate design tokens. Each scan counts as one extraction, regardless of how many tokens are found."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to Pro features until the end of your billing period."
  },
  {
    question: "What's included in the free plan?",
    answer: "The free plan includes 10 monthly extractions, basic token export, and access to our community directory. Perfect for trying out the platform."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, we'll provide a full refund within the first 14 days."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. Enterprise customers can also pay by invoice."
  },
  {
    question: "Is there a trial for paid plans?",
    answer: "Yes! Pro and Team plans come with a 14-day free trial. No credit card required to start your trial."
  }
]

export default function PricingPage() {
  return (
    <>
      <MarketingHeader currentPage="pricing" showSearch />

      <main className="flex-1">
        <section className="px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="hero-badge mx-auto mb-6 w-fit">Transparent pricing</p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              Simple plans for{" "}
              <span className="text-gradient-brand">every team</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-success" />
                14-day free trial
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-success" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-success" />
                No setup fees
              </span>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative overflow-hidden border-border/70 bg-card/60 backdrop-blur-sm ${
                    plan.popular ? "border-primary/40 shadow-lg ring-1 ring-primary/20" : ""
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-4">
                    <plan.icon className="mx-auto mb-2 h-8 w-8 text-primary" />
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground">/{plan.period}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <Button
                      className="mb-6 w-full"
                      variant={plan.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>

                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}

                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-start gap-2 opacity-60">
                          <div className="h-4 w-4 mt-0.5 flex-shrink-0 flex items-center justify-center">
                            <div className="h-0.5 w-2 bg-muted-foreground rounded" />
                          </div>
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="bg-muted/20 px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Compare plans</h2>
              <p className="text-muted-foreground">
                See exactly what's included in each plan
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-medium">Feature</th>
                    <th className="text-center py-4 px-4 font-medium">Free</th>
                    <th className="py-4 px-4 text-center font-medium text-primary">Pro</th>
                    <th className="text-center py-4 px-4 font-medium">Team</th>
                    <th className="text-center py-4 px-4 font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-muted">
                    <td className="py-4 px-4">Monthly extractions</td>
                    <td className="py-4 px-4 text-center">10</td>
                    <td className="py-4 px-4 text-center text-primary">Unlimited</td>
                    <td className="py-4 px-4 text-center">Unlimited</td>
                    <td className="py-4 px-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-4 px-4">Layout DNA analysis</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center text-primary">✓</td>
                    <td className="py-4 px-4 text-center">✓</td>
                    <td className="py-4 px-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-4 px-4">API access</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center text-primary">✓</td>
                    <td className="py-4 px-4 text-center">✓</td>
                    <td className="py-4 px-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-4 px-4">Team collaboration</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">✓</td>
                    <td className="py-4 px-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-4 px-4">SSO integration</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">✓</td>
                    <td className="py-4 px-4 text-center">✓</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-4 px-4">Custom deployment</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">—</td>
                    <td className="py-4 px-4 text-center">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about our pricing
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-muted">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">
              Start with our free plan and upgrade when you need more power.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="px-8 py-3" asChild>
                <Link href="/scan">Start free trial</Link>
              </Button>
              <Button variant="outline" className="px-8 py-3" asChild>
                <Link href="/contact?subject=sales">Contact sales</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  )
}