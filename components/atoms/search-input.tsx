"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (query: string) => void
  loading?: boolean
  showIcon?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, loading, showIcon = true, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && onSearch) {
        onSearch((event.target as HTMLInputElement).value)
      }
      onKeyDown?.(event)
    }

    return (
      <div className="relative group">
        {showIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400 transition-colors duration-200 group-focus-within:text-blue-500" />
          </div>
        )}
        <Input
          ref={ref}
          className={cn(
            "transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 hover:border-neutral-300",
            "dark:focus:border-blue-500 dark:focus:ring-blue-900/20 dark:hover:border-neutral-600",
            showIcon && "pl-10",
            className
          )}
          onKeyDown={handleKeyDown}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          {...props}
        />
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"