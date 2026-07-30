import { Suspense } from "react"
import { Metadata } from "next"
import ScanClient from "./client"

export const metadata: Metadata = {
  title: "Scan → DESIGN.md | ContextDS",
  description:
    "Turn any public site into W3C design tokens, a Google-compatible DESIGN.md, and a Cursor/Claude agent skill.",
  openGraph: {
    title: "Scan → DESIGN.md | ContextDS",
    description:
      "Extract tokens and generate agent-readable DESIGN.md + skills from any public website.",
  },
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading scanner…
        </div>
      }
    >
      <ScanClient />
    </Suspense>
  )
}
