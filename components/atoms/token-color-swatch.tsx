"use client"

import { cn } from "@/lib/utils"

interface TokenColorSwatchProps {
  color: string
  size?: "sm" | "md" | "lg"
  className?: string
  showBorder?: boolean
}

export function TokenColorSwatch({
  color,
  size = "md",
  className,
  showBorder = true
}: TokenColorSwatchProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <div
      className={cn(
        "rounded-md",
        sizeClasses[size],
        showBorder && "border border-border",
        className
      )}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}