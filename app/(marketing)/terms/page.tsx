import { Metadata } from "next"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"

export const metadata: Metadata = {
  title: "Terms of Service - ContextDS",
  description: "Terms of Service for ContextDS design token extraction platform.",
  openGraph: {
    title: "Terms of Service - ContextDS",
    description: "Legal terms and conditions for using ContextDS",
  },
}

export default function TermsPage() {
  return (
    <>
      <MarketingHeader currentPage="terms" showSearch={true} />

      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">
              Last updated: December 2024
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using ContextDS ("Service"), you accept and agree to be bound by the
                terms and provision of this agreement. If you do not agree to abide by the above,
                please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="mb-4">
                ContextDS provides automated design token extraction and analysis services for public
                websites. Our service:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Analyzes publicly accessible CSS and design patterns</li>
                <li>Extracts design tokens in standardized formats</li>
                <li>Provides layout DNA analysis and insights</li>
                <li>Offers API access and AI agent integration tools</li>
                <li>Maintains a community directory of analyzed sites</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Robots.txt Compliance</h2>
              <p className="mb-4">
                ContextDS respects the robots.txt standard and web crawling best practices:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>We check and honor robots.txt files before analyzing any website</li>
                <li>We respect crawl delays and user-agent restrictions</li>
                <li>Website owners can opt-out by adding "ContextDS" to their robots.txt disallow list</li>
                <li>We provide a clear opt-out mechanism for website owners who prefer not to be analyzed</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. User Accounts and API Usage</h2>
              <p className="mb-4">
                When you create an account with us, you must provide information that is accurate,
                complete, and current at all times. You are responsible for:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Safeguarding your account password and API keys</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Complying with rate limits and usage quotas</li>
                <li>Using the service only for lawful purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Prohibited Uses</h2>
              <p className="mb-4">
                You may not use our service:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>To violate any local, state, national, or international law</li>
                <li>To analyze websites that explicitly prohibit automated analysis</li>
                <li>To circumvent security measures or access private/protected content</li>
                <li>To overload our systems or interfere with service operation</li>
                <li>To resell or redistribute our data without permission</li>
                <li>To reverse engineer or attempt to extract our proprietary algorithms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
              <p className="mb-4">
                The service and its original content, features, and functionality are and will remain
                the exclusive property of ContextDS and its licensors. The service is protected by
                copyright, trademark, and other laws.
              </p>
              <p className="mb-4">
                Our extraction tools are built upon MIT-licensed open source projects, primarily
                Project Wallace. We respect and comply with all applicable licenses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Content and Data</h2>
              <p className="mb-4">
                Regarding the design tokens and analysis data we provide:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>We only analyze publicly accessible content</li>
                <li>Design tokens are derived facts about publicly available CSS</li>
                <li>You are granted a license to use extracted tokens for your projects</li>
                <li>We do not claim ownership of the underlying design systems</li>
                <li>Website owners retain all rights to their original designs and content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Privacy and Data Protection</h2>
              <p className="mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also
                governs your use of the service, to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Service Availability</h2>
              <p className="mb-4">
                We strive to provide reliable service but do not guarantee:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Uninterrupted access to the service</li>
                <li>Error-free operation</li>
                <li>Compatibility with all websites or use cases</li>
                <li>Permanent availability of analyzed data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Billing and Subscriptions</h2>
              <p className="mb-4">
                For paid services:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Subscription fees are charged in advance on a recurring basis</li>
                <li>You may cancel your subscription at any time</li>
                <li>Refunds are provided according to our refund policy</li>
                <li>Usage limits apply based on your subscription tier</li>
                <li>We reserve the right to modify pricing with notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
              <p className="mb-4">
                In no event shall ContextDS, nor its directors, employees, partners, agents,
                suppliers, or affiliates, be liable for any indirect, incidental, special,
                consequential, or punitive damages, including without limitation, loss of profits,
                data, use, goodwill, or other intangible losses, resulting from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
              <p className="mb-4">
                We may terminate or suspend your access immediately, without prior notice or liability,
                for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
              <p className="mb-4">
                Upon termination, your right to use the service will cease immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms
                at any time. If a revision is material, we will try to provide at least 30 days
                notice prior to any new terms taking effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
              <p className="mb-4">
                These Terms shall be interpreted and governed by the laws of the jurisdiction
                in which ContextDS operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Email: legal@contextds.com</li>
                <li>Contact form: /contact</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">16. Website Owner Rights</h2>
              <p className="mb-4">
                If you own a website that has been analyzed by ContextDS and would like to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Remove your site from our directory</li>
                <li>Prevent future analysis</li>
                <li>Request data deletion</li>
                <li>Report any concerns</li>
              </ul>
              <p className="mb-4">
                Please contact us using the information above. We respect website owners' rights
                and will respond promptly to legitimate requests.
              </p>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </>
  )
}