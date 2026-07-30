import { Suspense } from "react"
import { Metadata } from "next"
import ScanClient from "./client"

export const metadata: Metadata = {
  title: "Scan → Design Contract | Design Contracts",
  description:
    "Turn any public site into an installable Design Contract — DESIGN.md grammar, agent skills, references, and check/verify workflow.",
  openGraph: {
    title: "Scan → Design Contract | Design Contracts",
    description:
      "Scan a site, download a Design Contract pack, and keep every new component on-brand.",
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
