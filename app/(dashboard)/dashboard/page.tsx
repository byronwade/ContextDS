import { Metadata } from "next"
import Link from "next/link"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Dashboard - ContextDS",
  description: "Your ContextDS dashboard",
}

export default function DashboardPage() {
  return (
    <>
      <MarketingHeader showSearch />
      <main className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-2 font-semibold">Scan sites</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Extract design tokens from any public website.
              </p>
              <Button asChild>
                <Link href="/scan">Open scanner</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-2 font-semibold">Community</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Browse analyzed sites and vote on token accuracy.
              </p>
              <Button variant="outline" asChild>
                <Link href="/community">Browse directory</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-2 font-semibold">API & MCP</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Integrate ContextDS with Claude Code and your tools.
              </p>
              <Button variant="outline" asChild>
                <Link href="/docs">View docs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
