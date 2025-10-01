import { Metadata } from "next"
import ScanClient from "./client"

export const metadata: Metadata = {
  title: "Scan Website - ContextDS Design Token Scanner",
  description: "Extract design tokens from any website. Scan for colors, typography, spacing, shadows, and more with AI-powered analysis.",
  openGraph: {
    title: "Scan Website - ContextDS Design Token Scanner",
    description: "Extract design tokens from any website with AI-powered analysis",
  },
}

// Force dynamic rendering for scan page (uses searchParams)
export const dynamic = 'force-dynamic'

export default function ScanPage() {
  return <ScanClient />
}