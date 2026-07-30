"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { VercelHeader } from "@/components/organisms/vercel-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const EXAMPLES = ["stripe.com", "linear.app", "vercel.com", "notion.so"]

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
    router.push(`/scan?url=${encodeURIComponent(domain)}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 520px at 12% -8%, oklch(0.9 0.04 190 / 0.55), transparent 58%), radial-gradient(800px 420px at 88% 0%, oklch(0.93 0.02 230 / 0.45), transparent 52%), linear-gradient(180deg, oklch(0.99 0.004 210) 0%, oklch(0.975 0.008 205) 50%, oklch(0.985 0.004 210) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(oklch(0.4 0.02 230 / 0.08) 0.7px, transparent 0.7px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 78%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <VercelHeader currentPage="home" showSearch={false} />

        <main
          id="main-content"
          className="flex flex-1 flex-col justify-center px-4 pb-20 pt-10 sm:px-6"
          role="main"
          aria-label="designcontracts.sh home"
        >
          <section className="mx-auto w-full max-w-3xl">
            <h1 className="animate-slide-in font-serif text-5xl leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl">
              designcontracts
              <span className="text-teal-800/80 dark:text-teal-300/90">.sh</span>
            </h1>
            <p className="mt-5 max-w-xl animate-fade-in text-base text-muted-foreground sm:text-lg">
              Scan any public site. Download a Design Contract agents can resolve, check, and verify.
            </p>

            <form
              className="mt-10 animate-slide-in"
              onSubmit={(event) => {
                event.preventDefault()
                startScan(url)
              }}
            >
              <div className="flex flex-col gap-3 rounded-[1.35rem] border border-[color:var(--soft-border)] bg-card/80 p-2 shadow-[var(--soft-shadow)] backdrop-blur-sm sm:flex-row sm:items-center">
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="stripe.com"
                  className="h-12 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                  aria-label="Website URL to scan"
                />
                <Button
                  type="submit"
                  disabled={!url.trim()}
                  className="h-12 gap-2 rounded-2xl bg-primary px-6 text-primary-foreground hover:opacity-90"
                >
                  Scan site
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-2">
              {EXAMPLES.map((site) => (
                <button
                  key={site}
                  type="button"
                  onClick={() => startScan(site)}
                  className="rounded-xl border border-[color:var(--soft-border)] bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-teal-700/25 hover:bg-card hover:text-foreground"
                >
                  {site}
                </button>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-16 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
            {[
              {
                title: "World-class scan",
                body: "Static CSS + Project Wallace + optional Docker Playwright for CSS-in-JS.",
              },
              {
                title: "Installable contract",
                body: "DESIGN.md, AGENTS.md, Skill, and references in one ZIP.",
              },
              {
                title: "Enforced forever",
                body: "resolve → check → verify keeps every new component on-brand.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[color:var(--soft-border)] bg-card/70 p-5 shadow-[var(--soft-shadow)] animate-fade-in"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <h2 className="text-sm font-medium text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </section>
        </main>
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
