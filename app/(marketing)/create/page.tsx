import type { Metadata } from 'next'
import CreateClient from '@/components/create/create-client'

export const metadata: Metadata = {
  title: 'Create a Design Contract',
  description:
    'Generate installable Design Contracts from a brief, token import, blend of scanned sites, URL scan, or App Pack screenshots.',
}

export default function CreatePage() {
  return <CreateClient />
}
