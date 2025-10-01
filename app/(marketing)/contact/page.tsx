import { Metadata } from "next"
import {
  Mail,
  MessageSquare,
  HelpCircle,
  Building2,
  Shield,
  Bug,
  Lightbulb,
  Users
} from "lucide-react"
import { MarketingHeader } from "@/components/organisms/marketing-header"
import { MarketingFooter } from "@/components/organisms/marketing-footer"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const metadata: Metadata = {
  title: "Contact - ContextDS",
  description: "Get in touch with the ContextDS team. Support, sales, partnerships, and general inquiries welcome.",
  openGraph: {
    title: "Contact - ContextDS",
    description: "Get in touch with our team",
  },
}

const contactTypes = [
  {
    icon: HelpCircle,
    title: "General Support",
    description: "Questions about features, usage, or getting started",
    email: "support@contextds.com",
    response: "Usually within 24 hours"
  },
  {
    icon: Building2,
    title: "Sales & Enterprise",
    description: "Enterprise plans, custom integrations, and partnerships",
    email: "sales@contextds.com",
    response: "Usually within 4 hours"
  },
  {
    icon: Bug,
    title: "Bug Reports",
    description: "Found a bug or technical issue? Let us know",
    email: "bugs@contextds.com",
    response: "Usually within 12 hours"
  },
  {
    icon: Shield,
    title: "Privacy & Legal",
    description: "GDPR requests, website removal, legal questions",
    email: "legal@contextds.com",
    response: "Usually within 48 hours"
  },
  {
    icon: Lightbulb,
    title: "Feature Requests",
    description: "Ideas for new features or improvements",
    email: "features@contextds.com",
    response: "Usually within 1 week"
  },
  {
    icon: Users,
    title: "Community",
    description: "Join our community discussions and get help from other users",
    email: "community@contextds.com",
    response: "Join our Discord server"
  }
]

const faqs = [
  {
    question: "How do I remove my website from your directory?",
    answer: "You can request removal by emailing legal@contextds.com or by adding 'ContextDS' to your robots.txt disallow list. We'll process removal requests within 48 hours."
  },
  {
    question: "Can I get enterprise pricing?",
    answer: "Yes! Enterprise plans include custom integrations, on-premises deployment, SLA guarantees, and dedicated support. Contact our sales team for a quote."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee for all paid plans. Contact support if you're not satisfied with our service."
  },
  {
    question: "How can I contribute to ContextDS?",
    answer: "We welcome contributions! You can report bugs, suggest features, contribute to our open-source components, or join our community discussions."
  }
]

export default function ContactPage() {
  return (
    <>
      <MarketingHeader currentPage="contact" showSearch={true} />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Get in{" "}
              <span className="text-blue-600 dark:text-blue-400">touch</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Have questions, feedback, or need help? We're here to support you.
              Choose the best way to reach our team.
            </p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contactTypes.map((contact) => (
                <Card key={contact.title} className="border-muted">
                  <CardHeader>
                    <contact.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <h3 className="font-semibold">{contact.title}</h3>
                    <p className="text-muted-foreground text-sm">{contact.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Email</div>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Response time</div>
                        <div className="text-sm text-muted-foreground">{contact.response}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Send us a message</h2>
              <p className="text-muted-foreground">
                Prefer to send a message? Fill out the form below and we'll get back to you.
              </p>
            </div>

            <Card className="border-muted">
              <CardContent className="p-6">
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your name" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your.email@example.com" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="What's this about?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="support">General Support</SelectItem>
                        <SelectItem value="sales">Sales & Enterprise</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="legal">Privacy & Legal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input id="company" placeholder="Your company name" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us how we can help..."
                      className="mt-1 min-h-[120px]"
                    />
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>
              <p className="text-muted-foreground">
                Quick answers to common questions
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-muted">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Join our community</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with other developers, share your experiences, and get help from the community.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-muted">
                <CardContent className="p-6">
                  <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Discord Community</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Join our Discord server for real-time discussions, help, and community support.
                  </p>
                  <Button variant="outline">Join Discord</Button>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-6">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">GitHub Discussions</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Participate in feature discussions, report issues, and contribute to our roadmap.
                  </p>
                  <Button variant="outline">View Discussions</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Security Issues or Emergencies</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  If you've discovered a security vulnerability or need immediate assistance with
                  a critical issue, please contact us directly:
                </p>
                <a
                  href="mailto:security@contextds.com"
                  className="text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                  security@contextds.com
                </a>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  )
}