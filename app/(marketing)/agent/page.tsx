import { redirect } from 'next/navigation'

type AgentPageProps = {
  searchParams?: Promise<{ url?: string }> | { url?: string }
}

/** Legacy /agent route — Scan is the product name. */
export default async function AgentPage({ searchParams }: AgentPageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  const url = params?.url?.trim()
  if (url) {
    redirect(`/scan?url=${encodeURIComponent(url)}`)
  }
  redirect('/scan')
}
