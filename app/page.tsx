"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SampleMemoPreviewModal } from "@/components/SampleMemoPreviewModal"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Shield,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  BarChart3,
  FileText,
  Target,
  Calculator,
  Scale,
  Lock,
  Play,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { ListingTransformationPreview } from "@/components/ListingTransformationPreview"

// FAQ Data
const preLofiFaqs = [
  {
    question: "How do I know seller add-backs will hold up under lender scrutiny?",
    answer: "We pressure-test earnings integrity to ensure normalized cash flow is defensible.",
  },
  {
    question: "Will this deal survive SBA underwriting under conservative assumptions?",
    answer: "We evaluate debt coverage durability before LOI to reduce late-stage resets.",
  },
  {
    question: "Am I underestimating working capital requirements post-close?",
    answer: "We model normalized working capital and liquidity buffers to prevent surprises.",
  },
  {
    question: "Should this be structured as an asset or stock purchase?",
    answer: "We analyze structure alignment for long-term tax efficiency and lender comfort.",
  },
  {
    question: "What happens if revenue or margins compress after closing?",
    answer: "We run downside scenarios to define a durable offer range and walk-away threshold.",
  },
]

function PreLoiFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10 text-center">
            <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 mb-4">Due Diligence</Badge>
            <h2 className="text-3xl font-bold text-white mb-3">Pre-LOI Questions We Help Buyers Answer</h2>
            <div className="w-16 h-px bg-cyan-500/50 mx-auto" />
          </div>

          <div className="space-y-2">
            {preLofiFaqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-800 rounded-lg overflow-hidden transition-colors hover:border-slate-700"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-slate-200 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-4 pt-0">
                    <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [showSampleModal, setShowSampleModal] = useState(false)
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5" />
        <div className="relative container mx-auto px-4 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-sm px-3 py-1.5">
                <BarChart3 className="w-4 h-4 mr-2" />
                Deal Analysis Platform
              </Badge>

              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Know if a deal deserves an LOI 
                  <span className="block text-emerald-500 mt-2">before you commit capital.</span>
                </h1>

                <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                  AcquiFlow helps SMB buyers normalize seller earnings, benchmark against real transaction data, 
                  stress-test financing, and generate lender-ready deal outputs — 
                  before spending serious time or money on diligence.
                </p>

                
                <p className="text-sm text-slate-500 mt-2">
                  Built using real-world underwriting frameworks used by lenders and institutional investors.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/deal-reality-check">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-8 py-6 text-lg w-full sm:w-auto"
                  >
                    Analyze a Deal
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/how-it-works">
                <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-lg w-full sm:w-auto bg-transparent"
                >
                See Sample Analysis
               </Button>
                </Link>              
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-slate-400 hover:text-white px-6 py-6 text-lg"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Play className="mr-2 w-4 h-4" />
                  How It Works
                </Button>
              </div>
              <p className="text-base text-slate-400 mt-4">
                  Built for searchers, acquisition entrepreneurs, independent sponsors, and SMB buyers evaluating real deals.
                </p>
            </div>

           {/* Hero Visual — Deal Decision Snapshot */}
<div className="relative max-w-[88%] mx-auto">
  <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-7 border border-slate-700 shadow-2xl shadow-black/30">
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl pointer-events-none" />
    
    <div className="relative space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-700/60">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-semibold mb-1">
            Sample Output · Specialty Trade Services
          </div>
          <h3 className="text-lg font-bold text-white">Deal Decision Snapshot</h3>
        </div>
        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold tracking-wide flex-shrink-0">
          ⚠ INVESTIGATE
        </Badge>
      </div>

      {/* Metrics — 2x2 grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Adjusted SDE
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">$640K</div>
          <div className="text-[10px] text-slate-500 mt-0.5">−18% vs reported</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            DSCR
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">1.28x</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Marginal coverage</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Valuation Gap
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">+20%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Above justified range</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Trust Score
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">72/100</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Adjustments material</div>
        </div>
      </div>

      {/* Recommended posture strip */}
      <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-lg p-3.5">
        <div className="flex items-start gap-2.5">
          <Target className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-0.5">
              Recommended Posture
            </div>
            <div className="text-sm text-slate-100 font-semibold">
              Renegotiate before LOI
            </div>
          </div>
        </div>
      </div>

      {/* Bottom alert — earnings adjustment */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-[12px] text-amber-100/90 leading-relaxed">
            Seller-reported earnings require adjustment. Validate add-backs before submitting an offer.
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
            </div>
        </div>
      </section>

      {/* Bad Assumptions — wake-up moment before the platform pitch */}
      <section className="py-24 border-t border-slate-800">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-5">
              Most deals don&apos;t fail from lack of effort —{" "}
              <span className="text-red-400">they fail from bad assumptions.</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              AcquiFlow replaces guesswork with structured underwriting before you commit capital.
            </p>
          </div>

          {/* 4 cards — flat, terminal-style, generous spacing */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: "Inflated Earnings",
                description: "Seller add-backs often overstate true cash flow.",
              },
              {
                icon: TrendingDown,
                title: "Fragile Debt Coverage",
                description: "Deals that \u201cwork on paper\u201d fail under real financing terms.",
              },
              {
                icon: BarChart3,
                title: "No Real Benchmarking",
                description: "Buyers rely on listings \u2014 not actual transaction comps.",
              },
              {
                icon: DollarSign,
                title: "Mispriced Deals",
                description: "Without data, buyers consistently overpay.",
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="bg-slate-900/40 border border-slate-800 rounded-lg p-7 hover:border-emerald-400/40 transition-colors"
                >
                  <div className="w-10 h-10 mb-5 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-slate-300" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Closer — single line, slightly muted, separated visually */}
          <p className="text-center text-sm sm:text-base text-slate-300 mt-14 max-w-3xl mx-auto leading-relaxed">
            AcquiFlow surfaces these issues instantly — <span className="text-emerald-400 font-medium">before LOI, before diligence, before capital is at risk.</span>
          </p>
        </div>
      </section>
      
      {/* How AcquiFlow Works — lender-grade underwriting workflow */}
      <section id="how-it-works" className="py-24 bg-slate-900/50 border-t border-slate-800">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 mb-5">
              Platform Workflow
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
              How serious buyers evaluate deals with{" "}
              <span className="text-cyan-400">AcquiFlow</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              A lender-style underwriting workflow — simplified for speed, not stripped of rigor.
            </p>
          </div>

          {/* 4 numbered steps with subtle gradient progression + metric chips */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              {
                step: "01",
                title: "Input the Deal",
                description: "Enter price, SDE, revenue, and financing assumptions.",
                icon: Calculator,
                chip: null,
                accent: "from-slate-900/60 to-slate-900/40",
              },
              {
                step: "02",
                title: "Normalize Earnings",
                description: "Pressure-test add-backs and reconstruct true cash flow.",
                icon: Scale,
                chip: "−18% normalized",
                accent: "from-slate-900/60 to-cyan-950/30",
              },
              {
                step: "03",
                title: "Benchmark & Stress Test",
                description: "Compare against real transactions and test debt coverage under realistic scenarios.",
                icon: BarChart3,
                chip: "DSCR 1.18x",
                accent: "from-cyan-950/30 to-cyan-950/40",
              },
              {
                step: "04",
                title: "Decide with Confidence",
                description: "Instantly see if the deal holds up — or where it breaks.",
                icon: Target,
                chip: "+20% overpriced",
                accent: "from-cyan-950/40 to-emerald-950/40",
              },
            ].map((item, i, arr) => {
              const Icon = item.icon
              return (
                <div key={i} className="relative">
                  <div
                    className={`bg-gradient-to-br ${item.accent} border border-slate-800 rounded-lg p-6 h-full hover:border-cyan-400/40 transition-colors`}
                  >
                    {/* Step number — monospace, terminal-style */}
                    <div className="text-cyan-400/80 font-mono text-xs font-bold tracking-wider mb-4">
                      STEP {item.step}
                    </div>

                    {/* Icon — flat, slate-toned for terminal feel */}
                    <div className="w-10 h-10 mb-5 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cyan-300" />
                    </div>

                    {/* Title + body */}
                    <h3 className="text-base font-semibold text-white mb-2 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      {item.description}
                    </p>

                    {/* Metric chip — only on steps that have one */}
                    {item.chip && (
                      <div className="inline-flex items-center px-2 py-1 rounded font-mono text-[11px] font-semibold bg-slate-800/80 border border-slate-700 text-amber-400">
                        {item.chip}
                      </div>
                    )}
                  </div>

                  {/* Connecting arrow — desktop only, between cards */}
                  {i < arr.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10 items-center justify-center">
                      <div className="w-7 h-px bg-gradient-to-r from-cyan-500/40 to-cyan-500/10" />
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-500/50 -ml-1" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What You'll Know — outcome-focused, premium card design */}
      <section className="py-24 border-t border-slate-800">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              What you&rsquo;ll know{" "}
              <span className="text-cyan-400">before you make an offer</span>
            </h2>
          </div>

          {/* 6-card outcome grid — premium spacing, subtle hover lift */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: DollarSign,
                title: "True Cash Flow",
                description: "See earnings after real add-back scrutiny — not seller narratives.",
              },
              {
                icon: TrendingUp,
                title: "Will It Survive Financing?",
                description: "Instantly test DSCR under realistic SBA-style assumptions.",
              },
              {
                icon: Target,
                title: "What It\u2019s Actually Worth",
                description: "Get a defensible valuation range based on real transactions — not listings.",
              },
              {
                icon: AlertTriangle,
                title: "Where It Breaks",
                description: "Identify exactly what kills the deal under pressure.",
              },
              {
                icon: BarChart3,
                title: "How It Compares",
                description: "Benchmark against real closed deals in your industry.",
              },
              {
                icon: FileText,
                title: "What a Lender Will See",
                description: "Export a clean, structured view for financing conversations.",
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 hover:border-cyan-400/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Icon — circular background, subtle glow */}
                  <div className="w-12 h-12 mb-5 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>

                  {/* Title — bigger, tighter line height */}
                  <h3 className="text-lg font-bold text-white mb-2.5 leading-tight">
                    {item.title}
                  </h3>

                  {/* Body — tighter line height for readability */}
                  <p className="text-sm text-slate-400 leading-snug">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Closer line — the conversion line */}
          <p className="text-center text-base sm:text-lg text-slate-300 mt-14 max-w-3xl mx-auto leading-relaxed">
            This is the difference between{" "}
            <span className="text-slate-500">liking a deal</span>{" "}
            and{" "}
            <span className="text-emerald-400 font-semibold">knowing if it works.</span>
          </p>
        </div>
      </section>

      {/* Sample Analysis Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              See What a Real Deal Analysis Looks Like
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            {/* Left - Screenshot placeholder */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 aspect-video flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">[Deal Analysis Dashboard Screenshot]</p>
              </div>
            </div>

            {/* Right - Text block */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Real insights. Not guesses.</h3>
              <ul className="space-y-4">
                {[
                  "Adjusted SDE reduced from $340K → $285K",
                  "DSCR falls below lender threshold (1.18x)",
                  "Business is overpriced by ~22% vs real comps",
                  "Deal fails under conservative stress scenarios",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                 size="lg"
                 variant="outline"
                 onClick={() => setShowSampleModal(true)}
                 className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg bg-transparent"
              >
                See a Sample Analysis
                <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Split */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Use the platform — or get full underwriting support
            </h2>
          </div>
          <p className="text-center text-slate-400 mb-16 max-w-2xl mx-auto">
            Use the platform yourself — or get expert-level underwriting support when the deal matters most.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* SaaS Card */}
            <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/30 transition-colors">
              <CardContent className="p-8">
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 mb-4">Platform</Badge>
                <h3 className="text-2xl font-bold text-white mb-2">AcquiFlow Platform</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$29–$79</span>
                  <span className="text-slate-400 ml-2">/ month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Analyze unlimited deals",
                    "Benchmark against real comps",
                    "Stress test financing",
                    "Save & compare opportunities",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/deal-reality-check">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold">
                    Start Analyzing
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Service Card */}
            <Card className="bg-slate-800/50 border-emerald-500/30 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-8">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 mb-4">Advisory</Badge>
                <h3 className="text-2xl font-bold text-white mb-2">Pro Deal Analysis</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$1,500</span>
                  <span className="text-slate-400 ml-2">starting</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Full deal underwriting",
                    "Custom financial modeling",
                    "Tax-aware deal structuring",
                    "Lender-ready report",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/acquisitions">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
                    Get a Pro Analysis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Section - Reduced emphasis */}
      <section className="py-12 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-500" />
                <span className="text-slate-400 text-sm">Your data is protected with bank-level encryption</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                {["256-bit encryption", "SOC 2 compliant", "100% data ownership"].map((item, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Stop guessing. Start making data-driven acquisition decisions.
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Know if a deal is worth buying — before you commit capital.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/deal-reality-check">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-10 py-6 text-lg"
              >
                Analyze Your First Deal
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
           <Button
           size="lg"
           variant="outline"
           onClick={() => setShowSampleModal(true)}
          className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg bg-transparent"
          >
           See a Sample Analysis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>          
            
          </div>
        </div>
      </section>

      {/* Pre-LOI FAQ */}
      <PreLoiFaq />

      {/* Compliance Footer */}
     <section className="py-8 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <p className="text-center text-slate-500 text-xs max-w-3xl mx-auto">
            NexTax.AI provides financial analysis tools and educational content. This is not legal, tax, or investment
            advice. Consult qualified professionals before making business decisions. All transaction data used for
            benchmarking is anonymized and aggregated.
          </p>
        </div>
      </section>

      {/* Sample Memo Preview Modal — opens from "See a Sample Analysis" buttons */}
      {showSampleModal && (
        <SampleMemoPreviewModal
          onClose={() => setShowSampleModal(false)}
          onAnalyzeDeal={() => {
            setShowSampleModal(false)
            router.push("/buyer-dashboard")
          }}
          onUpgrade={() => {
            setShowSampleModal(false)
            router.push("/pricing")
          }}
        />
      )}
    </div>
  )
}
