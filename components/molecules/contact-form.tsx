"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

const SUBJECT_EMAILS: Record<string, string> = {
  support: "support@contextds.com",
  sales: "sales@contextds.com",
  bug: "bugs@contextds.com",
  feature: "features@contextds.com",
  legal: "legal@contextds.com",
  other: "support@contextds.com",
}

export function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("support")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and message.")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "contact_form_submitted",
          properties: {
            subject,
            hasCompany: Boolean(company.trim()),
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit")
      }

      const recipient = SUBJECT_EMAILS[subject] ?? SUBJECT_EMAILS.support
      const mailtoSubject = encodeURIComponent(
        `[ContextDS ${subject}] Message from ${name.trim()}`
      )
      const mailtoBody = encodeURIComponent(
        `Name: ${name.trim()}\nEmail: ${email.trim()}${
          company.trim() ? `\nCompany: ${company.trim()}` : ""
        }\n\n${message.trim()}`
      )

      window.location.href = `mailto:${recipient}?subject=${mailtoSubject}&body=${mailtoBody}`
      toast.success("Opening your email client to send the message.")
    } catch {
      toast.error("Something went wrong. Please email support@contextds.com directly.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-muted">
      <CardContent className="p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                className="mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                className="mt-1"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
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
            <Input
              id="company"
              placeholder="Your company name"
              className="mt-1"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell us how we can help..."
              className="mt-1 min-h-[120px]"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={submitting}
          >
            <Mail className="mr-2 h-4 w-4" />
            {submitting ? "Preparing..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
