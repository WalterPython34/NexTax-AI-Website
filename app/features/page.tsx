"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  FileText,
  Target,
  CheckCircle,
  ArrowRight,
  Layers,
  Scale,
  LineChart,
  Shield,
  Briefcase,
  PieChart,
  Map,
  Percent,
  Bell,
  GitCompare,
} from "lucide-react"
import Link from "next/link"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black pt-16">
      {/* SECTION 1 — HERO */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Copy */}
            <div className="space-y-6">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                ACQUIFLOW FEATURES
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Everything You Need to Underwrite, Compare, and Choose Better Deals
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                AcquiFlow turns raw listings, CIMs, and seller-provided numbers into decision-grade acquisition analysis — with normalized earnings, real transaction benchmarks, financing stress tests, risk flags, LOI guidance, and lender-ready outputs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/deal-reality-check">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-8 py-6 text-lg w-full sm:w-auto"
                  >
                    Analyze a Deal
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/sample-deal">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-lg w-full sm:w-auto bg-transparent"
                  >
                    See Sample Analysis
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right - Dashboard mockup */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-slate-400">Deal Analysis Dashboard</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Live</Badge>
                </div>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">Adjusted SDE</div>
                    <div className="text-2xl font-bold text-white">$285,000</div>
                    <div className="text-xs text-red-400 mt-1">↓ $55K from seller claim</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">DSCR</div>
                    <div className="text-2xl font-bold text-amber-400">1.18x</div>
                    <div className="text-xs text-amber-400 mt-1">Below 1.25x threshold</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">Valuation Gap</div>
                    <div className="text-2xl font-bold text-red-400">-22%</div>
                    <div className="text-xs text-slate-500 mt-1">vs. benchmark range</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">Risk Flags</div>
                    <div className="text-2xl font-bold text-amber-400">3</div>
                    <div className="text-xs text-slate-500 mt-1">Requires attention</div>
                  </div>
                </div>

                {/* Verdict */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-red-400">Deal Fails Under Stress</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">DSCR drops below 1.0x under conservative assumptions. Renegotiate or walk.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — BUILT FOR SERIOUS BUYERS */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Built for Serious Buyers Before the LOI</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-cyan-400">100+</div>
              <div className="text-sm text-slate-400 mt-2">Financial signals evaluated per deal</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400">40+</div>
              <div className="text-sm text-slate-400 mt-2">Industries benchmarked with real transaction data</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400">Real</div>
              <div className="text-sm text-slate-400 mt-2">Transaction comps — not listing guesses</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400">Minutes</div>
              <div className="text-sm text-slate-400 mt-2">To lender-ready outputs</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — CORE FEATURE GRID */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">What AcquiFlow Analyzes</h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Every deal is reviewed across the same decision framework serious buyers, lenders, and advisors care about.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: DollarSign,
                title: "Normalized Earnings",
                description: "Adjust reported SDE for aggressive add-backs, owner compensation gaps, one-time items, and questionable adjustments.",
              },
              {
                icon: TrendingUp,
                title: "DSCR & Financing Stress Test",
                description: "See whether the deal can support debt under realistic SBA-style financing assumptions and downside scenarios.",
              },
              {
                icon: BarChart3,
                title: "Market Benchmarking",
                description: "Compare asking multiples against real transaction data by industry instead of relying only on broker narratives.",
              },
              {
                icon: AlertTriangle,
                title: "Risk Flag Engine",
                description: "Surface issues such as weak coverage, inflated earnings, valuation gaps, concentration risk, and fragile downside protection.",
              },
              {
                icon: Scale,
                title: "LOI & Negotiation Guidance",
                description: "Translate the analysis into offer ranges, walk-away pricing, seller note logic, earnout considerations, and buyer protections.",
              },
              {
                icon: FileText,
                title: "Deal Memo Output",
                description: "Generate an IC-style memo with investment snapshot, red flags, diligence priorities, lender summary, and recommendation logic.",
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — REAL DEAL WALKTHROUGH */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">From Seller Claim to Buyer Decision</h2>
          </div>

          {/* Workflow Steps */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {[
              {
                step: "01",
                title: "Input the Deal",
                description: "Enter asking price, revenue, SDE, industry, location, and financing assumptions — or paste listing details.",
                icon: Layers,
              },
              {
                step: "02",
                title: "Normalize the Earnings",
                description: "AcquiFlow adjusts the seller's numbers into a cleaner cash-flow view buyers and lenders can actually evaluate.",
                icon: DollarSign,
              },
              {
                step: "03",
                title: "Benchmark & Stress Test",
                description: "The platform compares the deal to real transaction benchmarks and tests whether debt coverage holds under pressure.",
                icon: BarChart3,
              },
              {
                step: "04",
                title: "Decide the Posture",
                description: "Proceed, renegotiate, pause, or walk — with pricing discipline, LOI guidance, and diligence priorities.",
                icon: Target,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full">
                  <div className="text-cyan-400 text-sm font-mono mb-3">Step {item.step}</div>
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sample Result */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6">
              <div className="text-sm text-slate-500 mb-4 uppercase tracking-wide">Sample Analysis Result</div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-slate-500">Seller-reported SDE</div>
                  <div className="text-lg font-semibold text-slate-300">$340,000</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Adjusted SDE</div>
                  <div className="text-lg font-semibold text-white">$285,000</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">DSCR</div>
                  <div className="text-lg font-semibold text-amber-400">1.18x</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Valuation Gap</div>
                  <div className="text-lg font-semibold text-red-400">-22%</div>
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <span className="text-sm text-red-400 font-medium">Result: Deal fails under stress — renegotiate or walk</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — LENDER-READY OUTPUTS */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Outputs Built for Financing Conversations</h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              AcquiFlow does not just give you a score. It produces structured outputs that help buyers communicate clearly with lenders, partners, attorneys, and advisors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Lender Readiness Summary",
                description: "Shows whether the deal appears financeable, where coverage breaks, and what must improve before lender outreach.",
              },
              {
                icon: Briefcase,
                title: "SBA Financing View",
                description: "Estimate loan amount, down payment, debt service, DSCR, and equity recovery under SBA-style assumptions.",
              },
              {
                icon: FileText,
                title: "Deal Memo",
                description: "Export a clean, professional memo summarizing valuation, risks, benchmarks, diligence priorities, and recommendation.",
              },
              {
                icon: Scale,
                title: "LOI Structure Guidance",
                description: "Use analysis-driven pricing ranges, seller support suggestions, and buyer protection language before drafting an offer.",
              },
            ].map((item, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — DASHBOARD SCREENSHOTS */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">See the Full Deal Workflow in One Dashboard</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Underwriting Summary",
                description: "Instantly see verdict, score, DSCR, asking multiple, adjusted earnings, and key risk signals.",
                icon: LineChart,
              },
              {
                title: "Stress Test",
                description: "Model downside scenarios and see where debt coverage breaks under conservative assumptions.",
                icon: TrendingUp,
              },
              {
                title: "Market Comps",
                description: "Compare asking price to transaction-backed benchmark ranges for the selected industry.",
                icon: BarChart3,
              },
              {
                title: "Lender Readiness",
                description: "See financing feasibility, coverage gaps, and what lenders will flag before you apply.",
                icon: Shield,
              },
              {
                title: "LOI Builder",
                description: "Translate analysis into anchor offer, target range, max justified price, and buyer protections.",
                icon: Scale,
              },
              {
                title: "Deal Memo",
                description: "Generate an IC-style memo with investment thesis, risks, benchmarks, and recommendation.",
                icon: FileText,
              },
            ].map((item, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Screenshot placeholder */}
                <div className="aspect-video bg-slate-900/50 flex items-center justify-center border-b border-slate-700">
                  <item.icon className="w-12 h-12 text-slate-600" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — COMPARE DEALS */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Stack Deals Side by Side</h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Most buyers evaluate one deal at a time. AcquiFlow helps you compare multiple opportunities so the best use of your time and capital becomes obvious.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: TrendingUp, text: "Compare DSCR and downside durability" },
              { icon: BarChart3, text: "Compare asking multiple vs benchmark range" },
              { icon: DollarSign, text: "Compare adjusted SDE and valuation gap" },
              { icon: GitCompare, text: "Compare deal risk, lender readiness, and negotiation posture" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/compare">
              <Button
                size="lg"
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg bg-transparent"
              >
                Compare Your Deals
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 8 — MARKET INTEL */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Market Intelligence Beyond the Listing</h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Use deal data, industry benchmarks, and local market signals to understand whether an opportunity deserves deeper diligence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            {[
              { icon: BarChart3, text: "Industry benchmark ranges" },
              { icon: Map, text: "Local market saturation checks" },
              { icon: PieChart, text: "Representative transaction comps" },
              { icon: Percent, text: "Pricing percentile indicators" },
              { icon: Bell, text: "Personalized deal feed signals" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3 bg-slate-800/30 rounded-lg p-6 border border-slate-700 text-center">
                <item.icon className="w-8 h-8 text-emerald-400" />
                <span className="text-slate-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/market-intel">
              <Button
                size="lg"
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-8 py-6 text-lg bg-transparent"
              >
                Explore Market Intel
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 9 — PLATFORM VS ADVISORY */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Use the Platform — or Get Full Underwriting Support</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* SaaS Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">AcquiFlow Platform</h3>
                  <div className="text-3xl font-bold text-cyan-400">$29–$79<span className="text-lg text-slate-400">/month</span></div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Analyze unlimited deals",
                    "Benchmark against real comps",
                    "Stress test financing",
                    "Save and compare opportunities",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <span className="text-slate-300">{item}</span>
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

            {/* Advisory Card */}
            <Card className="bg-slate-800/50 border-emerald-500/50">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Pro Deal Analysis</h3>
                  <div className="text-3xl font-bold text-emerald-400">$1,500<span className="text-lg text-slate-400"> starting</span></div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Full deal underwriting",
                    "Custom financial modeling",
                    "Tax-aware deal structuring",
                    "Lender-ready report",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/acquisitions">
                  <Button
                    variant="outline"
                    className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                  >
                    Get a Pro Analysis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 10 — FINAL CTA */}
      <section className="py-20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Know If a Deal Is Worth Buying Before You Commit Capital
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Stop relying on seller claims, broker narratives, and spreadsheet guesswork. Run the deal through a decision-grade acquisition workflow before you make an offer.
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
            <Link href="/sample-deal">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-10 py-6 text-lg bg-transparent"
              >
                See Sample Analysis
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
