"use client"

// components/pricing/AcquisitionsPricing.tsx
//
// Acquisitions pricing — matches Formation pricing design system.
// Uses: bg-slate-800/50 cards, emerald-500 accents, emerald icon circles,
// scale-105 popular card lift, Most Popular ribbon, same typography.

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StripeCheckoutButton } from "@/components/stripe-checkout-button"
import {
  CheckCircle,
  X,
  ArrowRight,
  Zap,
  Crown,
  FileText,
  Target,
  Shield,
  Scale,
  TrendingDown,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react"

const PRO_PRICE_ID = "price_1TPbTTGA3ir6ndSx14wKWA27"

const OUTCOMES = [
  {
    icon: Target,
    title: "A clear go / no-go decision",
    body:  "Every deal gets a verdict — Proceed, Investigate, or Pass — synthesized across pricing, coverage, earnings quality, and lender fit.",
  },
  {
    icon: Scale,
    title: "A defendable offer range",
    body:  "Opening anchor, reasonable range, and max-justified ceiling — each with the SDE multiple that supports it.",
  },
  {
    icon: FileText,
    title: "A lender-ready deal memo",
    body:  "Structured like a PE-style IC memo. Benchmarks, red flags, normalization, financing outlook — exportable to PDF.",
  },
  {
    icon: Shield,
    title: "Identified risk and weak spots",
    body:  "Add-back exposure, customer concentration, owner dependence — flagged with evidentiary basis so you know what's verified vs. inferred.",
  },
  {
    icon: TrendingDown,
    title: "A structured negotiation position",
    body:  "LOI Builder with pre-drafted language, negotiation anchors, and walk-away logic grounded in fair-value analysis.",
  },
]

const FAQS = [
  {
    q: "Where does the benchmark data come from?",
    a: "A blend of DealStats closed-transaction data (over 5,600 verified SMB sales), RMA industry benchmarks, and IBISWorld market intelligence — all normalized into what we call NexTax Intelligence. We never show raw licensed data; we show the blended signal.",
  },
  {
    q: "Is this a replacement for a Quality of Earnings report?",
    a: "No. This is the step before QoE. We identify whether a deal is worth pursuing, where the valuation risks are, and what to negotiate. For deals you're serious about, a full QoE by a CPA is still the right next step — and our memo gives your provider a head start.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel with one click. You'll retain access through the end of your current billing period. No contracts, no refund games.",
  },
  {
    q: "How many deals can I analyze on the free plan?",
    a: "Ten per calendar month. It resets on the 1st. Saved deals stay fully accessible forever — the cap only applies to new analyses.",
  },
  {
    q: "Will lenders accept the deal memo?",
    a: "Our memos mirror the structure used by institutional investment committees: verdict, benchmarking, normalization, lender perspective, offer strategy, diligence priorities. Lenders and buy-side advisors read them the way they'd read any other deal document. They're a starting point for conversations, not a replacement for formal underwriting.",
  },
  {
    q: "What if I have both a Formation and Acquisitions plan?",
    a: "They're separate subscriptions — your formation package and the Acquisitions Pro plan don't overlap. Pay for what you actually use.",
  },
]

const ACQ_PACKAGES = [
  {
    name:        "Free",
    icon:         Zap,
    price:       "$0",
    priceNote:   "/month",
    description: "For early deal screening",
    features: [
      "Basic underwriting preview",
      "Limited comps visibility",
      "1 deal memo preview",
      "Limited market insights",
      "Up to 10 deal analyses / month",
    ],
    popular: false,
    cta:     "Start free",
    ctaHref: "/buyer-dashboard",
    savings: "",
  },
  {
    name:        "Pro",
    icon:         Crown,
    price:       "$39",
    priceNote:   "/month",
    description: "For serious acquisition decisions",
    features: [
      "Full underwriting across all tabs",
      "Full comps + percentile positioning",
      "Deal memo (PDF export)",
      "LOI Builder + negotiation ranges",
      "Compare deals side-by-side",
      "Market saturation + competitor analysis",
      "Unlimited deal analysis",
    ],
    popular: true,
    cta:     "Upgrade to Pro",
    ctaHref: null,
    savings: "Cancel anytime",
  },
]

export function AcquisitionsPricing() {
  return (
    <>
      <HeroSection />
      <BeforeAfterSection />
      <OutcomesSection />
      <PricingCardsSection />
      <FeatureMatrixSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  )
}

function HeroSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            NexTax Intelligence · Acquisitions
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Stop wasting time on <span className="text-emerald-400">the wrong deals</span>
          </h1>
          <p className="text-xl text-slate-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            Get structured underwriting, real comps, and decision-ready outputs — before you commit to LOI.
          </p>
          <p className="text-sm text-slate-500 italic">
            Replaces spreadsheets, broker guesswork, and back-of-the-envelope underwriting.
          </p>
        </div>
      </div>
    </section>
  )
}

function BeforeAfterSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            From messy listings to <span className="text-emerald-400">real decisions</span>
          </h2>
          <p className="text-slate-400">
            What a typical BizBuySell listing looks like — and what it becomes in NexTax.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs uppercase tracking-wider border-slate-600 text-slate-400">
                  Before
                </Badge>
                <span className="text-xs text-slate-500">Raw broker listing</span>
              </div>
              <CardTitle className="text-xl text-slate-200">Specialty Trade Services — Texas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-sm text-slate-400 leading-relaxed">
              <p>Asking: $2,450,000. Owner retiring after 22 yrs. MUST SELL!!</p>
              <p>Cash flow: $780,000 (owner says). All reasonable offers considered.</p>
              <p>Revenue: approx $4M. "Great books." 30+ employees.</p>
              <p>Add-backs incl. family vehicle, owner travel, consulting fees…</p>
              <p className="text-slate-500 pt-2 border-t border-slate-700/50">— contact broker for financials —</p>
              <div className="mt-4 pt-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-400/90">
                  No multiples. No benchmarks. No diligence path.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-emerald-500/50 shadow-lg shadow-emerald-500/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 uppercase tracking-wider">
                  After
                </Badge>
                <span className="text-xs text-emerald-400/80">Structured output</span>
              </div>
              <CardTitle className="text-xl text-white flex items-center gap-2 flex-wrap">
                Specialty Trade Services — TX
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold tracking-wider">
                  ⚠ INVESTIGATE
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <MiniMetric label="Adjusted SDE" value="$640K" sub="−18% vs reported" />
                <MiniMetric label="Multiple"     value="3.83x" sub="Top quartile" />
                <MiniMetric label="DSCR"         value="1.28x" sub="Marginal" />
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                  Offer strategy
                </div>
                <div className="text-sm text-slate-200 font-mono">
                  Anchor <span className="text-emerald-400 font-bold">$1.82M</span> · Range $1.75M–$2.05M · Max $2.05M
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1.5">
                <div className="text-xs uppercase tracking-wider text-red-400 font-semibold">
                  Red flags (2)
                </div>
                <div className="text-sm text-slate-200">• Customer concentration 32% (hard flag)</div>
                <div className="text-sm text-slate-200">• Add-backs elevated (18% of SDE)</div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-700/60">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-emerald-300">
                  Verdict, benchmarks, diligence plan — in 60 seconds.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-base text-slate-300 mt-10">
          <span className="text-emerald-400 font-semibold">This is what Pro unlocks.</span>
        </p>
      </div>
    </section>
  )
}

function MiniMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/60">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-base font-bold font-mono text-amber-400">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}

function OutcomesSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            What you walk away with <span className="text-emerald-400">from every deal</span>
          </h2>
          <p className="text-slate-400">
            Outcomes, not features — the decisions NexTax helps you defend.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {OUTCOMES.map((o) => {
            const Icon = o.icon
            return (
              <Card
                key={o.title}
                className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <CardContent className="pt-8 pb-8">
                  <div className="w-14 h-14 mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3 leading-tight">{o.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{o.body}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingCardsSection() {
  return (
    <section className="py-20" id="pricing-cards">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Simple, transparent <span className="text-emerald-400">pricing</span>
          </h2>
          <p className="text-slate-400">
            Two tiers. No contracts. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {ACQ_PACKAGES.map((pkg) => {
            const Icon = pkg.icon
            return (
              <Card
                key={pkg.name}
                className={`relative bg-slate-800/50 border-slate-700 ${
                  pkg.popular ? "border-emerald-500/50 scale-105 shadow-xl shadow-emerald-500/10" : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">{pkg.name}</CardTitle>
                  <p className="text-slate-400">{pkg.description}</p>
                  <div className="mt-6">
                    <span className="text-5xl font-bold text-white">{pkg.price}</span>
                    <span className="text-slate-400 text-lg">{pkg.priceNote}</span>
                  </div>
                  {pkg.savings && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 mt-3 border-0">
                      {pkg.savings}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {pkg.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    {pkg.ctaHref ? (
                      <Link href={pkg.ctaHref} className="block">
                        <Button
                          variant="outline"
                          className="w-full border-slate-600 bg-slate-900/50 hover:bg-slate-700 text-white h-12 text-base"
                        >
                          {pkg.cta}
                        </Button>
                      </Link>
                    ) : (
                      <StripeCheckoutButton
                        priceId={PRO_PRICE_ID}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-12 text-base"
                      >
                        {pkg.cta}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </StripeCheckoutButton>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FeatureMatrixSection() {
  const rows = [
    { feature: "Deal verdict + DSCR screening",           free: true,   pro: true },
    { feature: "Trust badge + trajectory indicator",      free: true,   pro: true },
    { feature: "Stress test (full downside scenarios)",   free: "Preview", pro: true },
    { feature: "Lender readiness (specific reasons)",     free: "Count tease", pro: true },
    { feature: "SBA financing structure",                 free: "Range only", pro: true },
    { feature: "Negotiation playbook",                    free: false,  pro: true },
    { feature: "LOI Builder with counsel-grade language", free: false,  pro: true },
    { feature: "Full deal memo (9 sections)",             free: "Summary",  pro: true },
    { feature: "PDF export (lender-ready)",               free: false,  pro: true },
    { feature: "Comps with percentile positioning",       free: "Range only", pro: true },
    { feature: "Trending multiples (SDE + revenue)",      free: "Top 3", pro: "All 12" },
    { feature: "Local market saturation check",           free: "3/month", pro: "Unlimited" },
    { feature: "Side-by-side deal comparison",            free: false,  pro: true },
    { feature: "Evidence profile (hard/soft flags)",      free: true,   pro: true },
    { feature: "Deal analyses per month",                 free: "10",   pro: "Unlimited" },
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            What's in <span className="text-emerald-400">each plan</span>
          </h2>
          <p className="text-slate-400">
            Free lets you screen. Pro lets you execute.
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 overflow-hidden max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left py-4 px-6 text-xs uppercase tracking-wider text-slate-400 font-semibold">Feature</th>
                  <th className="text-center py-4 px-6 text-xs uppercase tracking-wider text-slate-400 font-semibold">Free</th>
                  <th className="text-center py-4 px-6 text-xs uppercase tracking-wider text-emerald-400 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.feature}
                    className={`border-b border-slate-700/50 ${i % 2 === 0 ? "bg-slate-900/20" : ""}`}
                  >
                    <td className="py-3 px-6 text-sm text-slate-200">{r.feature}</td>
                    <td className="py-3 px-6 text-center">
                      <MatrixCell value={r.free} accent="free" />
                    </td>
                    <td className="py-3 px-6 text-center">
                      <MatrixCell value={r.pro} accent="pro" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  )
}

function MatrixCell({ value, accent }: { value: boolean | string; accent: "free" | "pro" }) {
  if (value === true) {
    return <CheckCircle className={`w-5 h-5 inline ${accent === "pro" ? "text-emerald-400" : "text-slate-400"}`} />
  }
  if (value === false) {
    return <X className="w-5 h-5 inline text-slate-600" />
  }
  return <span className={`text-sm font-medium ${accent === "pro" ? "text-emerald-300" : "text-slate-400"}`}>{value}</span>
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Frequently <span className="text-emerald-400">asked</span>
          </h2>
        </div>
        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQS.map((f, i) => {
            const open = openIdx === i
            return (
              <Card
                key={i}
                className="bg-slate-800/50 border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/70 transition-colors"
                >
                  <span className="text-base font-semibold text-white">{f.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-emerald-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-300 leading-relaxed">
                    {f.a}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FinalCtaSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 max-w-4xl mx-auto">
          <CardContent className="py-14 px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
              Before you sign an LOI,<br />
              <span className="text-emerald-400">know what the deal is actually worth.</span>
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto text-lg">
              Start with a free analysis. Upgrade when you're ready to execute.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/buyer-dashboard">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 h-12 text-base"
                >
                  Analyze a deal
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <StripeCheckoutButton
                priceId={PRO_PRICE_ID}
                variant="outline"
                className="border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 h-12 text-base px-8"
              >
                <Lock className="w-4 h-4 mr-2" />
                Upgrade to Pro — $39/mo
              </StripeCheckoutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default AcquisitionsPricing
