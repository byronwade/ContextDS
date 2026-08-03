import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
 className={cn(
        "h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--ui-border-edge)] bg-[var(--ui-paper)] px-4 py-3 text-sm text-[var(--ui-ink)] shadow-none outline-none transition-[background-color,border-color] duration-120 selection:bg-[var(--ui-accent-soft)] selection:text-[var(--ui-ink)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--ui-ink-muted)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:bg-[var(--ui-paper-hover)]",
        "focus-visible:border-[var(--ui-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]",
        "aria-invalid:outline-[var(--ui-danger)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
