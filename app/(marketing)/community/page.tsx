import { Metadata } from "next"
import CommunityClient from "./client"

export const metadata: Metadata = {
  title: "Community - ContextDS Design Token Database",
  description: "Explore and discover design tokens from top websites. Community-driven database of design systems, colors, typography, and spacing tokens.",
  openGraph: {
    title: "Community - ContextDS Design Token Database",
    description: "Explore and discover design tokens from top websites",
  },
}

export default function CommunityPage() {
  return <CommunityClient />
}