import { Metadata } from "next"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"

export const metadata: Metadata = {
  title: "Privacy Policy - ContextDS",
  description: "Privacy Policy for ContextDS design token extraction platform. Learn how we handle and protect your data.",
  openGraph: {
    title: "Privacy Policy - ContextDS",
    description: "How we handle and protect your data",
  },
}

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeader currentPage="privacy" showSearch={true} />

      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">
              Last updated: December 2024
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                ContextDS ("we," "our," or "us") is committed to protecting your privacy. This Privacy
                Policy explains how we collect, use, disclose, and safeguard your information when you
                use our design token extraction service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
              <p className="mb-4">
                We may collect personal information that you voluntarily provide when you:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Create an account (email address, name)</li>
                <li>Subscribe to our services (billing information)</li>
                <li>Contact us for support (communication details)</li>
                <li>Use our API (API usage logs)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Technical Information</h3>
              <p className="mb-4">
                We automatically collect certain technical information:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>IP addresses and device information</li>
                <li>Browser type and version</li>
                <li>Usage analytics and service performance metrics</li>
                <li>API request logs and usage patterns</li>
                <li>Error logs and diagnostic information</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Website Analysis Data</h3>
              <p className="mb-4">
                When analyzing websites for design tokens, we collect:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Publicly accessible CSS and styling information</li>
                <li>Layout patterns and design system data</li>
                <li>Website metadata (domain, title, description)</li>
                <li>Screenshots for visual analysis (when permitted)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Provide and maintain our design token extraction service</li>
                <li>Process your transactions and manage your account</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Improve our service through usage analytics</li>
                <li>Detect and prevent fraud or unauthorized access</li>
                <li>Comply with legal obligations</li>
                <li>Build and maintain our community directory</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
              <p className="mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties
                except in the following circumstances:
              </p>

              <h3 className="text-xl font-semibold mb-3">Service Providers</h3>
              <p className="mb-4">
                We may share information with trusted third-party service providers who assist us in:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Payment processing (Stripe)</li>
                <li>Database hosting (Supabase)</li>
                <li>Analytics and monitoring</li>
                <li>Customer support</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Legal Requirements</h3>
              <p className="mb-4">
                We may disclose your information if required to do so by law or in response to valid
                requests by public authorities.
              </p>

              <h3 className="text-xl font-semibold mb-3">Community Directory</h3>
              <p className="mb-4">
                Analyzed design tokens and website metadata may be included in our public community
                directory, but without any personal user information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="mb-4">
                We implement appropriate technical and organizational security measures to protect
                your information:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Encryption in transit and at rest</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication</li>
                <li>Secure coding practices</li>
                <li>Regular backups and disaster recovery</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
              <p className="mb-4">
                We retain your information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Improve our services</li>
              </ul>
              <p className="mb-4">
                You may request deletion of your account and associated data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
              <p className="mb-4">
                Depending on your location, you may have the following rights:
              </p>

              <h3 className="text-xl font-semibold mb-3">Access and Portability</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Request access to your personal information</li>
                <li>Receive a copy of your data in a portable format</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Correction and Deletion</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Update or correct your personal information</li>
                <li>Request deletion of your account and data</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">Communication Preferences</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Opt-out of marketing communications</li>
                <li>Manage notification preferences</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Website Owner Rights</h2>
              <p className="mb-4">
                If you own a website that we have analyzed:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>You can request removal from our directory</li>
                <li>You can prevent future analysis via robots.txt</li>
                <li>You can request deletion of extracted data</li>
                <li>We respect robots.txt and opt-out requests</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Cookies and Tracking</h2>
              <p className="mb-4">
                We use essential cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Maintain your session and authentication</li>
                <li>Remember your preferences</li>
                <li>Analyze service usage (with analytics tools)</li>
                <li>Improve user experience</li>
              </ul>
              <p className="mb-4">
                You can control cookies through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
              <p className="mb-4">
                Your information may be transferred to and processed in countries other than your own.
                We ensure appropriate safeguards are in place for international transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
              <p className="mb-4">
                Our service is not intended for children under 13. We do not knowingly collect
                personal information from children under 13. If we discover such collection,
                we will delete the information immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the "Last updated"
                date. For material changes, we will provide additional notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Third-Party Services</h2>
              <p className="mb-4">
                Our service integrates with third-party services that have their own privacy policies:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Supabase (Database and Authentication)</li>
                <li>Stripe (Payment Processing)</li>
                <li>Vercel (Hosting and Analytics)</li>
              </ul>
              <p className="mb-4">
                We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
              <p className="mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Email: privacy@contextds.com</li>
                <li>Contact form: /contact</li>
                <li>Data Protection Officer: dpo@contextds.com</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">15. GDPR Compliance</h2>
              <p className="mb-4">
                For users in the European Union, we comply with GDPR requirements:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Lawful basis for processing: Legitimate interest and consent</li>
                <li>Data minimization: We collect only necessary information</li>
                <li>Purpose limitation: Data used only for stated purposes</li>
                <li>Storage limitation: Data retained only as long as necessary</li>
                <li>Rights exercisable: Access, rectification, erasure, portability</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </>
  )
}