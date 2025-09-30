import { Sparkles, Zap, Search } from 'lucide-react'

/**
 * HeroSection - Server Component (Static)
 *
 * Pure server component with no interactivity.
 * Renders instantly as HTML with zero JavaScript.
 */
export function HeroSection() {
  return (
    <div className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-white via-blue-50/30 to-white py-20 dark:border-gray-800 dark:from-black dark:via-blue-950/20 dark:to-black">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-gray-100 dark:bg-grid-gray-900 [mask-image:linear-gradient(0deg,transparent,black)]" />

      <div className="container relative mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Sparkles className="h-4 w-4" />
          <span>AI-Powered Design Token Extraction</span>
        </div>

        {/* Heading */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
          Design Tokens Made{' '}
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Instant
          </span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          Extract W3C design tokens from any website. Search 35,000+ tokens across the web's best design systems.
          Powered by AI, optimized for speed.
        </p>

        {/* Features */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 text-left sm:grid-cols-3">
          <FeatureCard
            icon={<Search className="h-5 w-5" />}
            title="Instant Search"
            description="Search across thousands of design tokens in milliseconds"
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Fast Extraction"
            description="Scan any website and extract tokens in under 30 seconds"
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="AI Analysis"
            description="Smart token detection with confidence scoring"
          />
        </div>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
        {icon}
      </div>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}