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
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, Calendar, Loader2, CheckCircle } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    inquiryType: "",
  })
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
        body: JSON.stringify(formData),
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
      title: "Email Support",
      description: "Get help via email",
      contact: "hello@nextax.ai",
      availability: "24/7 response within 4 hours",
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak with our team",
      contact: "1-800-NEXTAX",
      availability: "Mon-Fri 9AM-6PM PST",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Instant messaging support",
      contact: "Available on website",
      availability: "24/7 AI + Human backup",
    },
    {
      icon: Calendar,
      title: "Schedule Consultation",
      description: "Book a strategy session",
      contact: "calendly.com/nextax",
      availability: "30-min free consultation",
    },
  ]

  const offices = [
    {
      city: "San Francisco",
      address: "123 Market Street, Suite 500",
      zipcode: "San Francisco, CA 94105",
      phone: "(415) 555-0123",
    },
    {
      city: "New York",
      address: "456 Broadway, Floor 20",
      zipcode: "New York, NY 10013",
      phone: "(212) 555-0456",
    },
    {
      city: "Austin",
      address: "789 Congress Ave, Suite 300",
      zipcode: "Austin, TX 78701",
      phone: "(512) 555-0789",
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
            We're Here to Help
            <span className="block text-emerald-400">Your Business Succeed</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Have questions about our AI tax services? Need help with business formation? Our expert team is ready to
            assist you every step of the way.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
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
                <CardTitle className="text-2xl text-white">Send us a Message</CardTitle>
                <p className="text-slate-400">Fill out the form below and we'll get back to you within 24 hours.</p>
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
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your full name"
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
                          Company (Optional)
                        </Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Your company name"
                          className="bg-slate-900 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inquiryType" className="text-white">
                          Inquiry Type
                        </Label>
                        <Select onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}>
                          <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                            <SelectValue placeholder="Select inquiry type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Question</SelectItem>
                            <SelectItem value="sales">Sales Inquiry</SelectItem>
                            <SelectItem value="support">Technical Support</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="media">Media/Press</SelectItem>
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
                        placeholder="Tell us how we can help you..."
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
                          Send Message
                          <Send className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Office Locations */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Our Offices</h2>
                <p className="text-slate-300 mb-8">
                  Visit us at one of our locations or schedule a virtual meeting with our team.
                </p>
              </div>

              <div className="space-y-6">
                {offices.map((office, i) => (
                  <Card key={i} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-2">{office.city}</h3>
                          <p className="text-slate-300 text-sm mb-1">{office.address}</p>
                          <p className="text-slate-300 text-sm mb-2">{office.zipcode}</p>
                          <p className="text-emerald-400 text-sm">{office.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Business Hours */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-3">Business Hours</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Monday - Friday:</span>
                          <span className="text-white">9:00 AM - 6:00 PM PST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Saturday:</span>
                          <span className="text-white">10:00 AM - 4:00 PM PST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Sunday:</span>
                          <span className="text-slate-400">Closed</span>
                        </div>
                        <div className="pt-2 border-t border-slate-700 mt-3">
                          <div className="flex justify-between">
                            <span className="text-slate-300">AI Support:</span>
                            <span className="text-emerald-400">24/7 Available</span>
                          </div>
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
              Quick answers to common questions about our services and platform.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "How quickly can you help me start my business?",
                answer:
                  "With StartSmart, we can get your business legally formed and ready to operate in 48 hours or less. This includes entity formation, EIN acquisition, and basic compliance setup.",
              },
              {
                question: "What makes your AI different from other tax software?",
                answer:
                  "Our AI is specifically trained on tax scenarios and business formation processes. Unlike generic software, our GPTs understand context, can handle complex situations, and provide personalized recommendations.",
              },
              {
                question: "Do you work with existing businesses or just startups?",
                answer:
                  "We work with businesses of all sizes - from pre-launch startups to established enterprises. Our platform scales to meet your needs as you grow.",
              },
              {
                question: "Is my data secure with NexTax.AI?",
                answer:
                  "Absolutely. We use bank-level encryption, maintain SOC 2 compliance, and follow strict data privacy protocols. Your information is never shared with third parties.",
              },
              {
                question: "Can I speak with a human expert if needed?",
                answer:
                  "Yes! While our AI handles most tasks automatically, you always have access to our human experts for complex situations or strategic advice.",
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
