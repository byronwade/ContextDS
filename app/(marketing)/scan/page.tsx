import { Metadata } from "next"
import { Suspense } from "react"
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

export const dynamic = "force-dynamic"

function ScanLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-blue-500" />
        <p className="text-sm text-muted-foreground">Loading scanner...</p>
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<ScanLoading />}>
      <ScanClient />
    </Suspense>
  )
}
