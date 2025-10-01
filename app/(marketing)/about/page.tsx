import { Metadata } from "next"
import {
  Heart,
  Target,
  Users,
  Lightbulb,
  Globe,
  Code,
  Palette,
  Zap,
  Shield,
  Rocket
} from "lucide-react"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "About - ContextDS",
  description: "Learn about our mission to make design tokens accessible to everyone through AI-powered extraction and analysis.",
  openGraph: {
    title: "About - ContextDS",
    description: "Making design tokens accessible through AI",
  },
}

const values = [
  {
    icon: Lightbulb,
    title: "Innovation First",
    description: "We push the boundaries of what's possible with AI and design system analysis."
  },
  {
    icon: Globe,
    title: "Open by Default",
    description: "We believe in transparency, open standards, and community-driven development."
  },
  {
    icon: Users,
    title: "Developer Experience",
    description: "Every decision is made with developers and designers in mind."
  },
  {
    icon: Shield,
    title: "Privacy Focused",
    description: "We respect privacy, follow web standards, and provide clear opt-out mechanisms."
  }
]

const timeline = [
  {
    year: "2024",
    quarter: "Q1",
    title: "The Vision",
    description: "Recognized the need for automated design token extraction while working with multiple design systems."
  },
  {
    year: "2024",
    quarter: "Q2",
    title: "First Prototype",
    description: "Built initial CSS analysis engine with basic token detection capabilities."
  },
  {
    year: "2024",
    quarter: "Q3",
    title: "AI Integration",
    description: "Integrated AI-powered pattern recognition and layout DNA analysis."
  },
  {
    year: "2024",
    quarter: "Q4",
    title: "Public Beta",
    description: "Launched public beta with community directory and MCP integration."
  }
]

const stats = [
  {
    number: "10,000+",
    label: "Websites Analyzed"
  },
  {
    number: "500K+",
    label: "Design Tokens Extracted"
  },
  {
    number: "95%+",
    label: "Accuracy Rate"
  },
  {
    number: "< 30s",
    label: "Average Analysis Time"
  }
]

export default function AboutPage() {
  return (
    <>
      <MarketingHeader currentPage="about" showSearch={true} />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6">
              Our Story
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Making design tokens{" "}
              <span className="text-blue-600 dark:text-blue-400">accessible</span>{" "}
              to everyone
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              We believe that every design system should be discoverable, analyzable, and
              actionable. Our mission is to democratize access to design tokens through
              AI-powered extraction and analysis.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Accelerate Design Systems</h3>
                      <p className="text-muted-foreground">
                        Reduce the time it takes to analyze and extract design tokens from weeks to seconds.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Heart className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Empower Creativity</h3>
                      <p className="text-muted-foreground">
                        Help designers and developers learn from the best design systems on the web.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Code className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Enable AI Workflows</h3>
                      <p className="text-muted-foreground">
                        Provide AI agents with structured, actionable design token data for intelligent design decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <Card key={index} className="border-muted text-center">
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {stat.number}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
              <p className="text-muted-foreground">
                The principles that guide every decision we make
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value) => (
                <Card key={value.title} className="border-muted text-center">
                  <CardContent className="p-6">
                    <value.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground text-sm">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
              <p className="text-muted-foreground">
                From idea to the platform that's changing how we work with design tokens
              </p>
            </div>

            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div key={index} className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-400 text-white dark:text-black flex items-center justify-center font-bold">
                      {item.quarter}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <Badge variant="outline">{item.year}</Badge>
                    </div>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Built with Modern Technology</h2>
              <p className="text-muted-foreground">
                Leveraging the latest in AI, web technologies, and design system standards
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-muted">
                <CardContent className="p-6 text-center">
                  <Palette className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">CSS Analysis Engine</h3>
                  <p className="text-muted-foreground text-sm">
                    Advanced CSS parsing and analysis using Project Wallace's MIT-licensed extractors.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6 text-center">
                  <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">AI Pattern Recognition</h3>
                  <p className="text-muted-foreground text-sm">
                    Machine learning models trained on thousands of design systems for intelligent token detection.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6 text-center">
                  <Rocket className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Modern Infrastructure</h3>
                  <p className="text-muted-foreground text-sm">
                    Built on Next.js 15, Supabase, and optimized for performance and scalability.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Open Source Commitment</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              We believe in giving back to the community. Our extraction tools are built on
              MIT-licensed open source projects, and we contribute back to the ecosystem.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-muted">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Based on Project Wallace</h3>
                  <p className="text-muted-foreground text-sm">
                    Our CSS extraction engine is built on Project Wallace's excellent MIT-licensed tools,
                    ensuring compatibility and reliability.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">W3C Standards</h3>
                  <p className="text-muted-foreground text-sm">
                    All our token outputs follow W3C design token standards, ensuring
                    compatibility with design tools and workflows.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Let's build the future together</h2>
            <p className="text-muted-foreground mb-8">
              Have questions about our mission, technology, or want to contribute to our vision?
              We'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Get in touch
              </a>
              <a
                href="/community"
                className="px-6 py-3 border border-muted-foreground/20 hover:bg-muted rounded-md font-medium transition-colors"
              >
                Join community
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  )
}