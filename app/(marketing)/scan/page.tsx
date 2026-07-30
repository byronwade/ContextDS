import { Suspense } from "react"
import { Metadata } from "next"
import ScanClient from "./client"

export const metadata: Metadata = {
  title: "Scan Website - ContextDS Design Token Scanner",
  description:
    "Extract design tokens from any website. Scan for colors, typography, spacing, shadows, and more with AI-powered analysis.",
  openGraph: {
    title: "Scan Website - ContextDS Design Token Scanner",
    description: "Extract design tokens from any website with AI-powered analysis",
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
