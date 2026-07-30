import type { Metadata } from 'next'
import CommunityClient from './client'

export const metadata: Metadata = {
  title: 'Library — Design Contracts',
  description:
    'Browse scanned Design Contracts from public sites — tokens, layout DNA, and installable packs.',
  openGraph: {
    title: 'Library — Design Contracts',
    description: 'Browse scanned Design Contracts from public sites.',
  },
}

export default function CommunityPage() {
  return <CommunityClient />
}
