import { Metadata } from "next"
import CommunityClient from "./client"

export const metadata: Metadata = {
  title: "Community — Design Contracts",
  description: "Explore and discover design tokens from top websites. Community-driven database of design systems, colors, typography, and spacing tokens.",
  openGraph: {
    title: "Community — Design Contracts",
    description: "Explore and discover design tokens from top websites",
  },
}

export default function CommunityPage() {
  return <CommunityClient />
}