import { redirect } from 'next/navigation'

type CommunityDomainPageProps = {
  params: Promise<{ domain: string }> | { domain: string }
}

/** Legacy community detail → shared site results surface. */
export default async function CommunityDomainPage({ params }: CommunityDomainPageProps) {
  const resolved = params instanceof Promise ? await params : params
  const domain = decodeURIComponent(resolved.domain || '').trim()
  if (!domain) redirect('/community')
  redirect(`/site/${encodeURIComponent(domain)}`)
}
