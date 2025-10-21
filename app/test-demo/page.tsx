"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Rocket, MessageSquare, FileText, BarChart3, CheckCircle, ArrowRight } from "lucide-react"

export default function TestDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">All-in-One Platform</Badge>
            <h1 className="text-5xl md:text-6xl lg:text-6xl font-bold text-white mb-6 text-balance">
              Everything You Need to Launch and Grow — All in One Platform 
            </h1>
            <p className="text-xl text-slate-300 mb-8 text-pretty">
              StartSmart combines our live tax experts support with AI automation to guide you through every stage of starting and
              managing your business — faster, easier, and smarter.
            </p>

            {/* Video Placeholder */}
            <div className="relative max-w-3xl mx-auto mb-8">
              <div className="aspect-video bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <Rocket className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">Dashboard Demo Video</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Forming your LLC → EIN Approved → Your Business Is Ready 🎉
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Rocket className="w-5 h-5 mr-2" />
                  Try StartSmart Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                See Features Below
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: AI Business Formation (Left Image / Right Text) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1">
              <div className="aspect-video bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <Rocket className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">Business Formation Tool Screenshot</p>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">🧱 Launch Your Business in Record Time</h2>
              <p className="text-xl text-slate-300 mb-8">
                Form your LLC or S-Corp in as little as 48 hours with guided AI workflows and expert support every step
                of the way.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Auto-generated LLC documents and filings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">EIN setup with IRS integration</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Compliance reminders and status tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Real human review before submission</span>
                </li>
              </ul>
              <Link href="/signup?plan=pro">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Start My LLC
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: AI Chat + Expert Help (Right Image / Left Text) */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">💬 Instant Answers, Real Expertise</h2>
              <p className="text-xl text-slate-300 mb-8">
                From tax strategies to entity questions, StartSmart AI gives clear, actionable guidance — backed by real
                tax professionals for complete peace of mind.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Ask anything, anytime — AI + expert-supported</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Context-aware answers specific to your business</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Save chats for audit trails or future reference</span>
                </li>
              </ul>
              <Link href="/startsmart-gpt">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Try the AI Assistant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Image */}
            <div>
              <div className="aspect-video bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">Ask StartSmart Chat UI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Document Hub + Compliance Tracker (Left Image / Right Text) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1">
              <div className="aspect-video bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">Document Hub & Compliance Tracker</p>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">📂 Stay Organized and 100% Compliant</h2>
              <p className="text-xl text-slate-300 mb-8">
                Keep your documents, deadlines, and filings in one secure place — auto-organized by entity, state, and
                due date.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Upload, auto-tag, and retrieve key business docs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Real-time compliance calendar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Tax deadlines and state filing alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Bank-level encryption + private cloud storage</span>
                </li>
              </ul>
              <Link href="/features/compliance">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Explore the Doc Hub
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Business & Tax Dashboard (Right Image / Left Text) */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">📊 Your Business, At a Glance</h2>
              <p className="text-xl text-slate-300 mb-8">
                Track your growth, compliance, and tax savings all in one intuitive dashboard — powered by real-time
                data and automation.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Dynamic overview of business metrics</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Tax savings and deductions analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Alerts for expiring licenses or filings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                  <span className="text-slate-300">Syncs seamlessly with QuickBooks and Stripe</span>
                </li>
              </ul>
              <Link href="/demo">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  See Dashboard Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Image */}
            <div>
              <div className="aspect-video bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-slate-400">Business & Tax Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial + Trust Block */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">⭐ Loved by Founders, Built for You</h2>
          <p className="text-xl text-slate-300 mb-12">
            Join thousands of entrepreneurs who launched confidently with StartSmart.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-emerald-400 mb-2">1,000+</div>
                <div className="text-slate-300">Businesses Launched</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-emerald-400 mb-2">4.9/5</div>
                <div className="text-slate-300">Satisfaction Rating</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-emerald-400 mb-2">50 States</div>
                <div className="text-slate-300">Trusted Nationwide</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">🎯 Ready to Launch Smarter?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join today and start your business with confidence — for less than your morning coffee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Rocket className="w-5 h-5 mr-2" />
                Start My Business Now
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
              >
                Compare Plans
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
