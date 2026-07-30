import type { Metadata } from 'next'
import CommunityClient from './client'

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'Library — Design Contracts',
  description:
    'Browse scanned Design Contracts from public sites — tokens, layout DNA, and installable packs.',
  openGraph: {
    title: 'Library — Design Contracts',
    description: 'Browse scanned Design Contracts from public sites.',
=======
  title: "Community — Design Contracts",
  description: "Explore and discover design tokens from top websites. Community-driven database of design systems, colors, typography, and spacing tokens.",
  openGraph: {
    title: "Community — Design Contracts",
    description: "Explore and discover design tokens from top websites",
>>>>>>> cursor/branding-64c0
  },
}

export default function CommunityPage() {
  return <CommunityClient />
}
