"use client"

import { VercelHeader, type VercelHeaderProps } from "@/components/organisms/vercel-header"

export type MarketingHeaderProps = VercelHeaderProps

/** @deprecated Use VercelHeader directly — kept for backward compatibility */
export function MarketingHeader(props: MarketingHeaderProps) {
  return <VercelHeader {...props} />
}
