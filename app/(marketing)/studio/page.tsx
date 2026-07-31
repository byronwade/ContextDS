import type { Metadata } from 'next'
import StudioClient from '@/components/studio/studio-client'

export const metadata: Metadata = {
  title: 'Studio — author your own Design Contract | designcontracts.sh',
  description:
    'Define colors, typography, spacing and shape by hand and export an installable Design Contract — the same grammar the scanner produces. A Pro feature.',
}

export default function StudioPage() {
  return <StudioClient />
}
