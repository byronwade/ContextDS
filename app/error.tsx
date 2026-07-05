"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <>
      <MarketingHeader showSearch />

      <main className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <div className="max-w-lg text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="mb-8 text-muted-foreground">
            An unexpected error occurred. You can try again, or return to the homepage.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </>
  )
}
