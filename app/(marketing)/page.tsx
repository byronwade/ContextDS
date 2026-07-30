"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const EXAMPLES = ["stripe.com", "linear.app", "vercel.com", "cursor.com"]

function HomePageContent() {
  const router = useRouter()
  const [url, setUrl] = useState("")

  const startScan = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const domain = trimmed
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
    router.push(`/agent?url=${encodeURIComponent(domain)}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Full-bleed atmospheric plane — Vercel dark density */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 50% -10%, oklch(0.45 0.04 185 / 0.18), transparent 55%), radial-gradient(700px 500px at 100% 20%, oklch(1 0 0 / 0.04), transparent 45%), linear-gradient(180deg, oklch(0.14 0.006 260) 0%, oklch(0.11 0.005 260) 55%, oklch(0.12 0.005 260) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_72%)]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          animation: "grid-drift 28s linear infinite",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <VercelHeader currentPage="home" showSearch={false} />

        <main
          id="main-content"
          className="flex flex-1 flex-col"
          role="main"
          aria-label="designcontracts.sh home"
        >
          {/* Hero — brand first, one CTA, no cards */}
          <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <h1 className="animate-slide-in font-serif text-[clamp(3.25rem,9vw,5.75rem)] leading-[0.92] tracking-[-0.03em] text-foreground">
                designcontracts
                <span className="font-mono text-[0.55em] tracking-normal text-[oklch(0.78_0.08_185)]">
                  .sh
                </span>
              </h1>
              <p className="mt-6 max-w-lg animate-fade-in text-base leading-relaxed text-muted-foreground sm:text-lg">
                Ask the agent. It runs the scanner as a tool and hands you an installable Design
                Contract — resolve, check, verify.
              </p>

              <form
                className="mt-10 max-w-xl animate-slide-in"
                style={{ animationDelay: "80ms" }}
                onSubmit={(event) => {
                  event.preventDefault()
                  startScan(url)
                }}
              >
                <div className="flex flex-col gap-2 border border-[color:var(--soft-border)] bg-background/60 p-1.5 backdrop-blur-md sm:flex-row sm:items-center sm:rounded-lg">
                  <Input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="stripe.com"
                    className="h-11 flex-1 rounded-md border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                    aria-label="Website URL to scan"
                  />
                  <Button
                    type="submit"
                    disabled={!url.trim()}
                    className="h-11 gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Ask agent
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              <p
                className="mt-5 animate-fade-in text-sm text-muted-foreground"
                style={{ animationDelay: "140ms" }}
              >
                Try{" "}
                {EXAMPLES.map((site, index) => (
                  <span key={site}>
                    {index > 0 ? (index === EXAMPLES.length - 1 ? ", or " : ", ") : null}
                    <button
                      type="button"
                      onClick={() => startScan(site)}
                      className="text-foreground/90 underline decoration-[color:var(--soft-border)] underline-offset-4 transition hover:decoration-[oklch(0.78_0.08_185)]"
                    >
                      {site}
                    </button>
                  </span>
                ))}
              </p>
            </div>

            {/* Dominant product visual — edge-to-edge contract preview plane */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] overflow-hidden opacity-50 [mask-image:linear-gradient(to_top,black_10%,transparent_95%)]"
            >
              <pre className="mx-auto max-w-5xl px-4 font-mono text-[11px] leading-5 text-muted-foreground sm:text-xs">
                {`# DESIGN.md — stripe.com
tokens.color.brand.primary → #635BFF
tokens.type.display → sohne · 600
layout.archetype → marketing-hero
graph.role.cta → component.button.primary

$ npx github:byronwade/Design install stripe-com
→ resolve · check · verify`}
              </pre>
            </div>
          </section>

          {/* Below fold — one job: what you get */}
          <section className="border-t border-[color:var(--soft-border)] px-4 py-20 sm:px-6">
            <div className="mx-auto grid w-full max-w-5xl gap-12 sm:grid-cols-3 sm:gap-8">
              {[
                {
                  title: "Agent-first",
                  body: "Chat is the product. The scanner is a tool the agent calls when it needs fresh data.",
                },
                {
                  title: "Inline contracts",
                  body: "Results land in-chat as a Design Contract widget — open the full page when you need every tab.",
                },
                {
                  title: "Enforced forever",
                  body: "resolve → check → verify keeps every new component on-brand.",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <h2 className="text-sm font-medium tracking-tight text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}
