import { redirect } from 'next/navigation'

type SearchParams = Promise<{ url?: string | string[] }>

/** Legacy /agent → home chat */
export default async function AgentPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const raw = Array.isArray(params.url) ? params.url[0] : params.url
  const url = raw?.trim()
  if (url) {
    redirect(`/?url=${encodeURIComponent(url)}`)
  }
  redirect('/')
}
