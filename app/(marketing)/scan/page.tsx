import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Scan → Agent | Design Contracts',
  description:
    'Scanning is handled by the Design Contracts agent. Paste a URL and get an installable contract inline.',
}

type ScanPageProps = {
  searchParams?: Promise<{ url?: string }> | { url?: string }
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  const url = params?.url?.trim()
  if (url) {
    redirect(`/agent?url=${encodeURIComponent(url)}`)
  }
  redirect('/agent')
}
