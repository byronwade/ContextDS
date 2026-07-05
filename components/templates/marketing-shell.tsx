import { cn } from "@/lib/utils"

interface MarketingShellProps {
  children: React.ReactNode
  className?: string
  ambient?: boolean
}

export function MarketingShell({
  children,
  className,
  ambient = true,
}: MarketingShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col antialiased",
        ambient && "page-ambient",
        className
      )}
    >
      {children}
    </div>
  )
}
