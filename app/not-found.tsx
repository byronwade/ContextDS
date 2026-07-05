import Link from "next/link"
import { Search, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"

export default function NotFound() {
  return (
    <>
      <MarketingHeader showSearch />

      <main className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <div className="max-w-lg text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            404
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="mb-8 text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Try scanning a
            site or browsing the community directory.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/scan">
                <Search className="mr-2 h-4 w-4" />
                Scan a site
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/community">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Community
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </>
  )
}
