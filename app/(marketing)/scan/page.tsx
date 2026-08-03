import { redirect } from 'next/navigation'

type SearchParams = Promise<{
  url?: string | string[]
  system?: string | string[]
}>

/**
 * Legacy /scan route — chat now lives on `/`.
 * Preserve ?url= and ?system= deep links (Library continue / fork).
 */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const rawUrl = Array.isArray(params.url) ? params.url[0] : params.url
  const url = rawUrl?.trim()
  const rawSystem = Array.isArray(params.system) ? params.system[0] : params.system
  const system = rawSystem?.trim()

  const query = new URLSearchParams()
  if (url) query.set('url', url)
  if (system) query.set('system', system)
  const qs = query.toString()
  redirect(qs ? `/?${qs}` : '/')
}
