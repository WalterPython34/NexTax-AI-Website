"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  CheckCircle,
  Shield,
  TrendingUp,
  BarChart3,
  FileText,
  Target,
  AlertTriangle,
  DollarSign,
  Building2,
  Users,
  Clock,
  ChevronRight,
  X,
  Search,
  Scale,
  Briefcase,
} from "lucide-react"
import Link from "next/link"

export default function AcquisitionsPage() {
  const analysisList = [
    "SDE recalculation & earnings normalization",
    "Owner compensation adjustment modeling",
    "One-time expense / add-back validation",
    "Deal structure comparison (seller vs buyer terms)",
    "DSCR & SBA viability stress-testing",
    "Working capital sensitivity",
    "Scenario modeling (flat / recovery / decline cases)",
    "DCF-based decision support range",
    "Negotiation leverage analysis",
    "Red flag summary + due diligence questions",
  ]

  const idealFor = [
    "SBA buyers evaluating acquisitions",
    "Searchers reviewing multiple listings",
    "First-time acquisition entrepreneurs",
    "Buyers seeking pre-LOI confidence",
    "E-commerce, services, and local business acquisitions",
  ]

  const notFor = [
    "Court-defensible valuation opinions",
    "Audit or attestation services",
    "Tax compliance or legal structuring advice",
    "Formal fairness opinions",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30 text-sm px-4 py-2">
              <BarChart3 className="w-4 h-4 mr-2" />
              Acquisition Intelligence for SMB Buyers
            </Badge>

            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
              Professional Buy-Side Financial Underwriting
              <span className="block text-emerald-400 mt-2">For Your Main Street Acquisition</span>
            </h1>

            <p className="text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto text-pretty">
              Pre-QoE financial modeling, scenario analysis, and deal-structure benchmarking to help you decide:
            </p>
            <p className="text-2xl font-semibold text-white italic">
              Should I buy this business — and what should I pay?
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-6 text-lg font-semibold"
                >
                  Book a 15-Minute Intro Call
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-transparent px-8 py-6 text-lg"
                >
                  Request a Deal Snapshot
                </Button>
              </Link>
            </div>

            {/* Trust Bar */}
            <div className="flex flex-wrap justify-center gap-6 pt-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Designed for SBA & searcher buyers</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>3-5 business day turnaround</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Decision-support analysis (not a QoE replacement)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: The Problem */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Most SMB Buyers Underwrite Deals With Basic Calculators.
            </h2>
            <p className="text-lg text-emerald-400 max-w-2xl mx-auto mb-4">
              Online listing calculators are helpful — but they rarely pressure-test the variables that determine whether a deal actually works.
            </p>
            <p className="text-lg text-slate-100 max-w-4xl mx-auto">
            The difference between a “good deal” and a bad one is often hidden inside normalization and structure.
             </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {[
              "Seller's Discretionary Earnings (SDE) distortions",
              "Owner compensation normalization",
              "Working capital assumptions",
              "Revenue decline scenarios",
              "Debt service coverage sensitivity",
              "True cash-on-cash return under different structures",
            ].map((item, i) => (
              <Card key={i} className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">{item}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-orange-500/10 border border-amber-500/30 rounded-lg p-6 text-center">
            <p className="text-slate-200 text-lg">
              By the time buyers discover the real risk, they've already submitted an LOI — or spent{" "}
              <span className="text-amber-300 font-semibold">$15k-$25k</span> on a Quality of Earnings report.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: What We Do */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">
              What We Analyze
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              NexTax.AI Acquisition Intelligence
            </h2>
            <p className="text-lg text-emerald-400">
              We apply institutional-style underwriting discipline to Main Street deals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {analysisList.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Where We Fit */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-4xl font-bold text-white mb-4">
              {"We're the Step Before QoE."}
            </h2>
            <p className="text-lg text-cyan-400">
              We help buyers decide whether to proceed before capital is committed and diligence costs escalate.
            </p>
          </div>

          {/* Buyer Journey */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {[
              { label: "Listing", icon: Search, active: false },
              { label: "Initial Calculator", icon: DollarSign, active: false },
              { label: "NexTax Underwriting", icon: BarChart3, active: true },
              { label: "LOI", icon: FileText, active: false },
              { label: "QoE", icon: Scale, active: false },
              { label: "Close", icon: CheckCircle, active: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
                  step.active
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-slate-800/30 border-slate-700/50 text-slate-400"
                }`}>
                  <step.icon className="w-4 h-4" />
                  <span className={`text-sm font-medium ${step.active ? "text-emerald-300" : ""}`}>{step.label}</span>
                </div>
                {i < 5 && <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />}
              </div>
            ))}
          </div>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-8">
              <p className="text-slate-300 text-lg mb-6 text-center">
                We are not a replacement for Quality of Earnings or formal valuation services. We help you decide whether to:
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Move forward", icon: ArrowRight },
                  { label: "Renegotiate", icon: Target },
                  { label: "Adjust your offer", icon: TrendingUp },
                  { label: "Walk away early", icon: Shield },
                ].map((action, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                    <action.icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">{action.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 4: Deliverables */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">What You Receive</h2>
            <p className="text-lg text-slate-200">Every engagement includes:</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Structured Decision Memo", desc: "PDF summary with clear recommendation", icon: FileText },
              { title: "Underwriting Model Outputs", desc: "Detailed financial analysis workbook", icon: BarChart3 },
              { title: "Sensitivity Analysis", desc: "Deal structure scenario comparisons", icon: TrendingUp },
              { title: "Risk Assessment", desc: "Clear identification of deal risks", icon: AlertTriangle },
              { title: "Offer Guidance Framework", desc: "Data-driven negotiation support", icon: Target },
              { title: "1-2 Strategy Calls", desc: "Direct discussion of findings", icon: Users },
            ].map((item, i) => (
              <Card key={i} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <item.icon className="w-8 h-8 text-emerald-400 mb-3" />
                  <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-slate-300 mt-8 italic">Our goal is clarity — not complexity.</p>
          <p className="text-center text-emerald-400 mt-8 italic">We help acquisition buyers stress-test earnings, structure, and debt coverage before LOI so deals survive underwriting.</p>
        </div>
      </section>

      {/* Section 5: Use Case Example */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-4">Case Study</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Example Engagement: Retail Services Acquisition
            </h2>
            <p className="text-lg text-slate-300">
            Enterprise Value: Sub-$1M SBA-backed transaction.
            </p>
          </div>

          <Card className="bg-gradient-to-br from-emerald-600 to-cyan-600 border-slate-700/50">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Initial Review Showed:</h3>
                  <div className="space-y-3">
                    {[
                      "Declining revenue trend",
                      "Thin reported margins",
                      "Large owner compensation swings",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-slate-200">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">After Normalization & Modeling:</h3>
                  <div className="space-y-3">
                    {[
                      "Adjusted margins materially improved under buyer comp assumptions",
                      "Deal structure differences identified over six figures in economic impact",
                      "Working capital negotiation became the primary leverage point",
                      "Buyer received clear offer guidance before proceeding",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-200 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                <p className="text-emerald-300 font-medium text-lg">
                  The result: informed decision-making before entering deeper diligence.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 6: Who This Is For */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Who This Is For</h2>
            <p className="text-lg text-slate-200">
            Built for acquisition entrepreneurs and SBA buyers evaluating $300K–$3M businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-emerald-300 mb-6">Ideal For:</h3>
                <div className="space-y-3">
                  {idealFor.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-slate-400 mb-6">Not Designed For:</h3>
                <div className="space-y-3">
                  {notFor.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <X className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 7: Engagement Options */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Engagement Options</h2>
            <p className="text-lg text-slate-400">
            Pricing depends on deal complexity, financial quality, and timeline.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Deal Snapshot */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-8">
                <p className="text-emerald-400 text-sm font-medium mb-2">Starting at</p>
                <p className="text-4xl font-bold text-white mb-1">$1,500</p>
                <h3 className="text-xl font-semibold text-white mt-4 mb-2">Deal Risk Assessment</h3>
                <p className="text-slate-400 text-sm mb-6">
                  High-level underwriting to determine whether to pursue a deal.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "Earnings normalization review",
                    "Debt & Solvency viability check",
                    "Key red flags",
                    "Decision memo",
                    "Strategy call",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/contact">
                  <Button variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent">
                    Book Intro Call
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Full Underwriting */}
            <Card className="bg-gradient-to-b from-emerald-600 to-emerald-400 border-emerald-500/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-cyan-500 text-white border-0 px-4">Most Engaged Tier</Badge>
              </div>
              <CardContent className="p-8">
                <p className="text-emerald-300 text-sm font-medium mb-2">Starting at</p>
                <p className="text-4xl font-bold text-white mb-1">$3,900</p>
                <h3 className="text-xl font-semibold text-white mt-4 mb-2">Full Underwriting</h3>
                <p className="text-slate-800 text-sm mb-6">
                  Comprehensive modeling to support offer structuring and negotiation.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "Full scenario modeling",
                    "Deal structure sensitivity",
                    "Working capital analysis",
                    "DCF-based decision range",
                    "Deal comparison & risk assessment",
                    "Stuctural & Tax optimization analysis (Asset vs Stock sale)",
                    "Negotiation leverage summary",
                    "Two strategy sessions",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                      <span className="text-slate-800 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/contact">
                  <Button className="w-full border-slate-600 bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                    Book Intro Call
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* LOI / Lender Support */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-8">
                <p className="text-cyan-400 text-sm font-medium mb-2">Custom</p>
                <p className="text-4xl font-bold text-white mb-1">Transaction Advisory & Lender Support</p>
                <h3 className="text-xl font-semibold text-white mt-4 mb-2">LOI / Lender Support</h3>
                <p className="text-slate-400 text-sm mb-6">
                  For buyers moving forward and needing structured financial narrative support.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "LOI drafting support",
                    "Lender package preparation",
                    "Financial narrative development",
                    "Ongoing deal advisory",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href="/contact">
                  <Button variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent">
                    Discuss Your Deal
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 8: About Steve */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Built by a Corporate Finance Operator</h2>
          <p className="text-lg text-slate-300 leading-relaxed mb-4">
            Steve Morello is a finance and tax executive with experience supporting operating companies and transaction environments, 
            including experience at EY (Big Four) and within Morgan Stanley’s Private Equity division.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed mb-4">
            He built NexTax.AI to bring structured financial intelligence to entrepreneurs — from business formation to acquisition.
          </p>
          <p className="text-emerald-400 italic">
            The goal: apply disciplined underwriting thinking typically seen in institutional settings to Main Street buyers.
          </p>
          <div className="mt-8">
            <Link href="/about">
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-transparent">
                <Briefcase className="w-4 h-4 mr-2" />
                Learn More About Steve
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 border-emerald-500/30">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Underwrite the Deal Before You Submit an LOI.
              </h2>
              <p className="text-slate-700 mb-8 max-w-xl mx-auto">
                Get clarity on whether to move forward, renegotiate, or walk away — before you spend $15k+ on formal diligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-8"
                  >
                    Book Intro Call
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-600 bg-transparent px-8"
                  >
                    Discuss Your Deal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Compliance Footer */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="border-t border-slate-800 pt-8">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              <span className="text-slate-400 font-medium">Important:</span> NexTax.AI provides financial modeling and decision-support analysis only. This service does not constitute a certified valuation, fairness opinion, audit, review, or attestation engagement. For legal, tax, or formal valuation opinions, consult a licensed professional.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
