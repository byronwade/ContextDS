"use client"

import { MagnifyingGlassIcon as Search } from '@/lib/phosphor'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface SearchFormProps {
  placeholder?: string
  onSearch: (query: string) => void
  className?: string
}

export function SearchForm({
  placeholder = "Search sites and tokens...",
  onSearch,
  className
}: SearchFormProps) {
  const [query, setQuery] = useState("")
  const inputId = "search-input"

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = query.trim()
    if (!next) {
      setError('Enter a search query.')
      return
    }
    setError(null)
    onSearch(next)
  }

  return (
    <form onSubmit={handleSubmit} className={className} role="search" aria-label="Site and token search" noValidate>
      <div className="relative flex w-full items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          id={inputId}
          type="search"
          placeholder={placeholder}
          value={query}
          required
          minLength={1}
          onChange={(e) => {
            setQuery(e.target.value)
            if (error) setError(null)
          }}
          className="pl-10 pr-20"
          aria-label="Search for sites and design tokens"
          aria-describedby={error ? 'search-error' : 'search-help'}
          aria-invalid={Boolean(error)}
        />
        <div id="search-help" className="sr-only">
          Enter a website URL or site name to search for design tokens
        </div>
        <Button
          type="submit"
          size="sm"
          className="absolute right-1"
          disabled={!query.trim()}
          aria-label="Submit search"
        >
          Search
        </Button>
      </div>
      {error ? (
        <p id="search-error" role="alert" data-slot="form-message" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}