import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-[7px] border-0 bg-[var(--ui-paper)] px-2.5 py-1 text-[13px] text-[var(--ui-ink)] shadow-[var(--shadow-control)] outline-none transition-[background-color,box-shadow] duration-120 selection:bg-[var(--ui-accent-soft)] selection:text-[var(--ui-ink)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-[var(--ui-ink-muted)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:bg-[var(--ui-paper-hover)] hover:shadow-[var(--shadow-control-hover)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]",
        "aria-invalid:outline-[var(--ui-danger)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
