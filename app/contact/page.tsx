"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Mail, Clock, Send, MessageCircle, Calendar, Loader2, CheckCircle, Briefcase, Users } from "lucide-react"
import { CalendlyPopup } from "@/components/calendly-popup"
import CalendlyButton from "@/components/calendly-button"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    inquiryType: "",
    website: "", // Honeypot field - bots will fill this, humans won't see it
  })
  const [formLoadTime] = useState(() => Date.now().toString()) // Track when form loaded
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      setSubmitStatus("idle")
      setErrorMessage("")

      console.log("Submitting form:", formData)

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          formLoadTime, // Include timing for bot detection
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit form")
      }

      console.log("Form submitted successfully:", data)
      setSubmitStatus("success")

      // Reset form after successful submission
      setFormData({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
        inquiryType: "",
        website: "", // Reset honeypot field too
      })
    } catch (error: any) {
      console.error("Form submission error:", error)
      setSubmitStatus("error")
      setErrorMessage(error.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactMethods = [
    {
      icon: Mail,
      title: "Deal Review & Support",
      description: "Have a deal you're evaluating? Send it over — we'll review and point out pricing gaps, risks, and key considerations.",
      contact: "steven.morello@nextax.ai",
      availability: "Response within 24 hours",
    },
    {
      icon: MessageCircle,
      title: "Live Deal Chat",
      description: "Ask questions in real-time while reviewing a deal.",
      contact: "Available directly inside the platform",
      availability: "AI-assisted + human follow-up when needed",
    },
    {
      icon: Calendar,
      title: "Schedule Consultation",
      description: "Book a strategy session",
      contact: (
        <CalendlyButton
          url="https://calendly.com/steven-morello-nextax"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded text-sm inline-block transition-colors"
        >
          Book Now
        </CalendlyButton>
      ),
      availability: "30-minute consultation",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <MessageCircle className="w-4 h-4 mr-2" />
            Get in Touch
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Talk to Us About
            <span className="block text-emerald-400">Your Next Acquisition</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Questions about a deal? Want a second opinion on pricing, risk, or market positioning? We'll help you pressure-test the numbers before you commit time, capital, or an LOI.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
            {contactMethods.map((method, i) => (
              <Card
                key={i}
                className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors w-full sm:w-80 flex-shrink-0"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <method.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{method.title}</h3>
                  <p className="text-slate-400 text-sm mb-3">{method.description}</p>
                  <p className="text-emerald-400 font-medium mb-2">{method.contact}</p>
                  <p className="text-slate-500 text-xs">{method.availability}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Send Us a Deal or Question</CardTitle>
                <p className="text-slate-400">
                  Share a deal, question, or use case — we'll respond with insights, not just answers.
                </p>
              </CardHeader>
              <CardContent>
                {submitStatus === "success" ? (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-300 mb-4">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => setSubmitStatus("idle")}
                      variant="outline"
                      className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6 relative">
                    {/* Honeypot field - hidden from humans, visible to bots */}
                    <div
                      className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden"
                      aria-hidden="true"
                    >
                      <label htmlFor="website">Website</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          className="bg-slate-900 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          className="bg-slate-900 border-slate-600 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-white">
                          Company / Search Fund (optional)
                        </Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Your company or fund name"
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inquiryType" className="text-white">
                          What do you need help with?
                        </Label>
                        <Select
                          value={formData.inquiryType}
                          onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reviewing-deal">Reviewing a Deal</SelectItem>
                            <SelectItem value="pricing-valuation">Pricing / Valuation Question</SelectItem>
                            <SelectItem value="market-intelligence">Market Intelligence Question</SelectItem>
                            <SelectItem value="platform-demo">Platform Demo / Access</SelectItem>
                            <SelectItem value="partnership">Partnership / Integration</SelectItem>
                            <SelectItem value="general">General Question</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-white">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Brief subject line"
                        className="bg-slate-900 border-slate-600 text-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-white">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Paste deal details, listing link, or describe what you're evaluating..."
                        className="bg-slate-900 border-slate-600 text-white"
                        rows={6}
                        required
                      />
                    </div>

                    {submitStatus === "error" && (
                      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-200">
                        <p>{errorMessage || "Something went wrong. Please try again."}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Submit & Get Feedback
                          <Send className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Work With Us — credibility + trust */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Work With Us</h2>
                <p className="text-slate-300 mb-8">
                  Built by operators with institutional underwriting experience — for the buyers who actually have to live with the deal.
                </p>
              </div>

              <div className="space-y-6">
                {/* Founder */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-2">Founder</h3>
                        <p className="text-emerald-400 text-sm font-medium mb-2">Steven Morello</p>
                        <p className="text-slate-300 text-sm mb-3">
                          Former Big 4 (EY) & Private Equity (Morgan Stanley)
                        </p>
                        <p className="text-slate-300 text-sm">
                          Focused on helping buyers make better acquisition decisions through structured underwriting and market intelligence.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Who This Is For */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-3">Who This Is For</h3>
                        <ul className="space-y-1.5 text-sm text-slate-300 mb-3">
                          <li>• Searchers evaluating deals</li>
                          <li>• Independent sponsors</li>
                          <li>• SMB buyers & operators</li>
                          <li>• Lenders & advisors</li>
                        </ul>
                        <p className="text-emerald-400 text-sm">
                          If you're looking at deals — this is built for you.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Availability */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-3">Availability</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-300">AI Support:</span>
                          <span className="text-emerald-400 font-medium">24/7</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Direct Response:</span>
                          <span className="text-white font-medium">Within 24 hours</span>
                        </div>
                        <div className="pt-3 border-t border-slate-700 mt-3">
                          <p className="text-emerald-400 text-sm">
                            For active deals, priority responses available.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Quick answers to common questions about deal evaluation and how the platform works.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "How accurate is the underwriting analysis?",
                answer:
                  "Built on structured frameworks used in Big 4 and private equity deal reviews, combined with live and historical transaction data. Outputs are designed to support decision-making — not replace diligence.",
              },
              {
                question: "Can I use this before submitting an LOI?",
                answer:
                  "Yes — that's the primary use case. Most users run deals through the platform before engaging brokers or starting formal diligence.",
              },
              {
                question: "Do you review deals directly?",
                answer:
                  "Yes — you can submit deals through this page or the platform for additional review and feedback.",
              },
              {
                question: "Is my data secure with NexTax.AI?",
                answer:
                  "Absolutely. We use bank-level encryption, maintain SOC 2 compliance, and follow strict data privacy protocols. Your information is never shared with third parties.",
              },
              {
                question: "Can I speak with a human expert if needed?",
                answer:
                  "Yes. While the platform handles most evaluation work automatically, you always have access to direct review and strategic feedback for complex deals.",
              },
            ].map((faq, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-3">{faq.question}</h3>
                  <p className="text-slate-300">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
