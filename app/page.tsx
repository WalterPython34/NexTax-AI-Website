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
                  <span className="block text-cyan-400 mt-2">before you commit capital.</span>
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

            {/* Hero Visual - Deal Analysis Animation Placeholder */}
            <div className="relative">
              <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl" />
                <div className="relative space-y-6">
                  {/* Simulated Deal Analysis Output */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Deal Analysis</h3>
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Processing</Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-sm">Adjusted SDE</span>
                        <span className="text-red-400 font-mono">$285,000 ↓</span>
                      </div>
                      <div className="text-xs text-slate-500">Seller claimed: $340,000</div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-sm">DSCR</span>
                        <span className="text-red-400 font-mono">1.18x</span>
                      </div>
                      <div className="text-xs text-slate-500">Below 1.25x threshold</div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-sm">Valuation Gap</span>
                        <span className="text-yellow-400 font-mono">-22%</span>
                      </div>
                      <div className="text-xs text-slate-500">Overpriced vs comps</div>
                    </div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-semibold">Deal Fails Under Stress</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof Strip */}
      <section className="py-12 bg-slate-900/50 border-y border-slate-800">
        <div className="container mx-auto px-4">
          <p className="text-center text-slate-500 text-sm mb-8 uppercase tracking-wide">Built for serious buyers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-8">
            <div>
              <div className="text-3xl font-bold text-cyan-400">100+</div>
              <div className="text-sm text-slate-400 mt-1">Financial signals analyzed per deal</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">40+</div>
              <div className="text-sm text-slate-400 mt-1">Industries benchmarked</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400">Real</div>
              <div className="text-sm text-slate-400 mt-1">Transaction comps — not listings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400">Minutes</div>
              <div className="text-sm text-slate-400 mt-1">Lender-ready outputs</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <span>Analyzing deals across 40+ industries</span>
            <span className="hidden sm:inline">•</span>
            <span>100+ financial signals evaluated per deal</span>
            <span className="hidden sm:inline">•</span>
            <span>Designed for lender-ready underwriting</span>
          </div>
        </div>
      </section>

      {/* Why Deals Fall Apart */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Most deals don&apos;t fail from lack of effort —<br />
              <span className="text-red-400">they fail from bad assumptions.</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Deals look attractive on the surface but break under scrutiny.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Inflated Earnings",
                description: "Seller add-backs often overstate true cash flow.",
                color: "red",
              },
              {
                icon: TrendingDown,
                title: "Weak Debt Coverage",
                description: 'Deals that "work on paper" collapse under financing pressure.',
                color: "red",
              },
              {
                icon: BarChart3,
                title: "No Real Benchmarking",
                description: "Buyers rely on listings — not actual transaction comps.",
                color: "yellow",
              },
              {
                icon: DollarSign,
                title: "Overpriced Deals",
                description: "Without data, buyers consistently overpay.",
                color: "yellow",
              },
            ].map((item, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-red-500/30 transition-colors">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 mb-4 rounded-lg ${item.color === "red" ? "bg-red-500/20" : "bg-yellow-500/20"} flex items-center justify-center`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color === "red" ? "text-red-400" : "text-yellow-400"}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How AcquiFlow Works */}
      <section id="how-it-works" className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 mb-4">Platform Workflow</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">How Serious Buyers Evaluate Deals with AcquiFlow</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Input the Deal",
                description: "Enter purchase price, SDE, revenue, and financing assumptions.",
                icon: Calculator,
              },
              {
                step: "02",
                title: "Underwrite It",
                description: "Normalize earnings, adjust add-backs, and stress test debt coverage.",
                icon: Scale,
              },
              {
                step: "03",
                title: "Benchmark It",
                description: "Compare against real transaction data across your industry.",
                icon: BarChart3,
              },
              {
                step: "04",
                title: "Decide with Confidence",
                description: "Instantly see if the deal holds up — or where it breaks.",
                icon: Target,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full hover:border-cyan-500/30 transition-colors">
                  <div className="text-cyan-500 font-mono text-sm mb-4">{item.step}</div>
                  <div className="w-12 h-12 mb-4 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-slate-700">
                    <ArrowRight className="w-4 h-4 text-slate-600 absolute -right-1 -top-2" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Placeholder for animations */}
          <div className="mt-12 text-center">
            <p className="text-slate-500 text-sm">[Animation/video placeholder — deal flow visualization]</p>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              What You&apos;ll Know <span className="text-cyan-400">Before You Make an Offer</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: DollarSign,
                title: "True Cash Flow (After Add-Back Scrutiny)",
                description: "Know the real earnings after pressure-testing seller adjustments",
              },
              {
                icon: TrendingUp,
                title: "Will This Deal Survive SBA Financing?",
                description: "See how the deal performs under realistic lending scenarios",
              },
              {
                icon: Target,
                title: "What This Business Is Actually Worth",
                description: "Get a defensible valuation range based on real transaction data",
              },
              {
                icon: AlertTriangle,
                title: "Where This Deal Breaks Under Pressure",
                description: "Instantly identify weaknesses before you commit capital",
              },
              {
                icon: BarChart3,
                title: "How This Deal Compares to Real Transactions",
                description: "Benchmark against actual closed deals — not listing prices",
              },
              {
                icon: FileText,
                title: "What a Lender Will See Immediately",
                description: "Export a clean, structured view for financing conversations",
              },
            ].map((item, i) => (
              <Card key={i} className="bg-slate-800/30 border-slate-700 hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-10 h-10 mb-4 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
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
