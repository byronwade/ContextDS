import { MarketingShell } from "@/components/templates/marketing-shell"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketingShell>{children}</MarketingShell>
}
