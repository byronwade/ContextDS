import { redirect } from 'next/navigation'

type SearchParams = Promise<{ url?: string | string[] }>

/**
 * Legacy /scan route — chat now lives on `/`.
 * Preserve ?url= deep links.
 */
export default async function ScanPage({
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
