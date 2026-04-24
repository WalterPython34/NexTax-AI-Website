"use client"

// components/pricing/AcquisitionsPricing.tsx
//
// Acquisitions pricing view — built to sell, not to list features.
// Structure:
//   1. Hero
//   2. Before / After transformation
//   3. "What you walk away with" (outcomes, not features)
//   4. Pricing cards (Free / Pro — 2 tiers only)
//   5. Feature breakdown
//   6. FAQ
//   7. Repeat CTA
//
// Stripe Pro price ID + "analyze a deal" entry point are wired in.

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

// ── Stripe Pro price ID (provided) ───────────────────────────────────────────
const PRO_PRICE_ID = "price_1TPbTTGA3ir6ndSx14wKWA27"

// ── Outcomes — what users walk away with (NOT features) ─────────────────────
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
    body:  "Structured like a PE-style IC memo. Benchmarks, red flags, normalization, financing outlook — exportable to PDF for your banker or attorney.",
  },
  {
    icon: Shield,
    title: "Identified risk and weak spots",
    body:  "Add-back exposure, customer concentration, owner dependence — flagged with evidentiary basis so you know what's inferred vs. verified.",
  },
  {
    icon: TrendingDown,
    title: "A structured negotiation position",
    body:  "LOI Builder with pre-drafted language, negotiation anchors, and walk-away logic grounded in fair-value analysis.",
  },
]

// ── FAQ — objection handling ────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AcquisitionsPricing() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <HeroSection />
      <BeforeAfterSection />
      <OutcomesSection />
      <PricingCardsSection />
      <FeatureMatrixSection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  )
}

// ─── 1. HERO ────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="pt-12 pb-8 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/25 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-5">
        <Sparkles className="w-3.5 h-3.5" />
        NexTax Intelligence · Acquisitions
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-4 max-w-3xl mx-auto">
        Stop wasting time on the wrong deals.
      </h1>
      <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
        Get structured underwriting, real comps, and decision-ready outputs — before you commit to LOI.
      </p>
      <p className="text-xs text-slate-500 mt-3 italic">
        Replaces spreadsheets, broker guesswork, and back-of-the-envelope underwriting.
      </p>
    </section>
  )
}

// ─── 2. BEFORE / AFTER ──────────────────────────────────────────────────────
function BeforeAfterSection() {
  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          From messy listings to real decisions
        </h2>
        <p className="text-sm text-slate-400">
          What a typical BizBuySell listing looks like — and what it becomes in NexTax.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* BEFORE — messy broker listing */}
        <Card className="bg-slate-900/30 border-slate-700/60 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-slate-600 text-slate-400">
                Before
              </Badge>
              <span className="text-[10px] text-slate-500">Raw broker listing</span>
            </div>
            <CardTitle className="text-base text-slate-200">Specialty Trade Services — Texas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-[11px] leading-relaxed text-slate-400">
            <p>Asking: $2,450,000. Owner retiring after 22 yrs. MUST SELL!!</p>
            <p>Cash flow: $780,000 (owner says). All reasonable offers considered.</p>
            <p>Revenue: approx $4M. "Great books." 30+ employees. Real estate separate.</p>
            <p>Add-backs incl. family vehicle, owner travel, consulting fees, various...</p>
            <p className="text-slate-500">&mdash; contact broker for financials &mdash;</p>
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400/90">
                No multiples. No benchmarks. No diligence path.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AFTER — structured output */}
        <Card className="bg-gradient-to-br from-indigo-950/40 to-violet-950/30 border-indigo-500/30 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-1">
              <Badge className="text-[10px] uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border-indigo-400/40">
                After
              </Badge>
              <span className="text-[10px] text-indigo-300/80">Structured output</span>
            </div>
            <CardTitle className="text-base text-slate-100 flex items-center gap-2">
              Specialty Trade Services — TX
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[9px] font-bold tracking-wider">
                ⚠ INVESTIGATE
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Adjusted SDE"  value="$640K" accent="warn" sub="−18% vs reported" />
              <MiniMetric label="Multiple"      value="3.83x" accent="warn" sub="Top quartile" />
              <MiniMetric label="DSCR"          value="1.28x" accent="warn" sub="Marginal" />
            </div>
            <div className="p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/20">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold mb-1">
                Offer strategy
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Anchor <span className="text-emerald-400 font-semibold">$1.82M</span> · Range $1.75M–$2.05M · Max $2.05M
              </div>
            </div>
            <div className="p-2.5 rounded-md bg-red-500/5 border border-red-500/20 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-red-400/80 font-semibold">
                Red flags (2)
              </div>
              <div className="text-[11px] text-slate-300">• Customer concentration 32% (hard flag)</div>
              <div className="text-[11px] text-slate-300">• Add-backs elevated (18% of SDE)</div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-indigo-500/20">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] text-indigo-300">
                Verdict, benchmarks, diligence plan — in 60 seconds.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-sm text-slate-400 mt-6">
        <span className="text-indigo-400 font-semibold">This is what Pro unlocks.</span>
      </p>
    </section>
  )
}

function MiniMetric({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent: "warn" | "ok"
}) {
  const color = accent === "warn" ? "text-amber-400" : "text-emerald-400"
  return (
    <div className="p-2 rounded-md bg-slate-900/40 border border-slate-700/40">
      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">{label}</div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}

// ─── 3. OUTCOMES — "What you walk away with" ────────────────────────────────
function OutcomesSection() {
  return (
    <section className="py-12">
      <div className="text-center mb-9">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          What you walk away with from every deal
        </h2>
        <p className="text-sm text-slate-400">
          Outcomes, not features — the decisions NexTax helps you defend.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {OUTCOMES.map((o) => {
          const Icon = o.icon
          return (
            <Card
              key={o.title}
              className="bg-slate-900/40 border-slate-700/50 hover:border-indigo-500/40 transition-colors"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-indigo-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 leading-tight">{o.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{o.body}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

// ─── 4. PRICING CARDS ───────────────────────────────────────────────────────
function PricingCardsSection() {
  return (
    <section className="py-12" id="pricing-cards">
      <div className="text-center mb-9">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          Pricing
        </h2>
        <p className="text-sm text-slate-400">
          Two tiers. No contracts. Cancel anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {/* FREE */}
        <Card className="bg-slate-900/40 border-slate-700/50 relative">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-slate-300" />
              </div>
              <CardTitle className="text-base text-white">Free</CardTitle>
            </div>
            <p className="text-xs text-slate-400 mb-4">For early deal screening.</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-xs text-slate-500">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {[
                "Basic underwriting preview",
                "Limited comps visibility",
                "1 deal memo preview",
                "Limited market insights",
                "Up to 10 deal analyses / month",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/buyer-dashboard" className="block pt-3">
              <Button
                variant="outline"
                className="w-full border-slate-600 bg-slate-800/40 hover:bg-slate-800 text-slate-100"
              >
                Start free
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* PRO */}
        <Card className="bg-gradient-to-br from-indigo-950/40 to-violet-950/30 border-indigo-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-violet-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Most popular
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center">
                <Crown className="w-4 h-4 text-indigo-300" />
              </div>
              <CardTitle className="text-base text-white">Pro</CardTitle>
            </div>
            <p className="text-xs text-slate-300 mb-4">For serious acquisition decisions.</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-white">$39</span>
              <span className="text-xs text-slate-400">/month</span>
            </div>
            <p className="text-[10px] text-indigo-300/80 mt-1">Cancel anytime.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {[
                "Full underwriting across all tabs",
                "Full comps + percentile positioning",
                "Deal memo (PDF export)",
                "LOI Builder + negotiation ranges",
                "Compare deals side-by-side",
                "Market saturation + competitor analysis",
                "Unlimited deal analysis",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-xs text-slate-200">
                  <CheckCircle className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="pt-3">
              <StripeCheckoutButton
                priceId={PRO_PRICE_ID}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-semibold"
              >
                Upgrade to Pro
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </StripeCheckoutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ─── 5. FEATURE MATRIX (optional depth) ─────────────────────────────────────
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
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight">
          What's in each plan
        </h2>
        <p className="text-xs text-slate-400">
          Free lets you screen. Pro lets you execute.
        </p>
      </div>

      <Card className="bg-slate-900/40 border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/60">
                <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Feature</th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Free</th>
                <th className="text-center py-3 px-4 text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.feature}
                  className={`border-b border-slate-700/30 ${i % 2 === 0 ? "bg-slate-900/20" : ""}`}
                >
                  <td className="py-2.5 px-4 text-xs text-slate-200">{r.feature}</td>
                  <td className="py-2.5 px-4 text-center">
                    <MatrixCell value={r.free} accent="free" />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <MatrixCell value={r.pro} accent="pro" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

function MatrixCell({ value, accent }: { value: boolean | string; accent: "free" | "pro" }) {
  if (value === true) {
    return <CheckCircle className={`w-4 h-4 inline ${accent === "pro" ? "text-indigo-400" : "text-slate-400"}`} />
  }
  if (value === false) {
    return <X className="w-4 h-4 inline text-slate-700" />
  }
  return <span className={`text-[11px] ${accent === "pro" ? "text-indigo-300" : "text-slate-500"}`}>{value}</span>
}

// ─── 6. FAQ ─────────────────────────────────────────────────────────────────
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <section className="py-12 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight">
          Frequently asked
        </h2>
      </div>
      <div className="space-y-2">
        {FAQS.map((f, i) => {
          const open = openIdx === i
          return (
            <div
              key={i}
              className="border border-slate-700/50 rounded-lg bg-slate-900/30 overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-900/50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-100">{f.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-700/30">
                  {f.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── 7. FINAL CTA ───────────────────────────────────────────────────────────
function FinalCtaSection() {
  return (
    <section className="py-16 mb-8">
      <Card className="bg-gradient-to-br from-indigo-950/50 to-violet-950/40 border-indigo-500/30">
        <CardContent className="py-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            Before you sign an LOI,<br />
            <span className="text-indigo-300">know what the deal is actually worth.</span>
          </h2>
          <p className="text-sm text-slate-400 mb-7 max-w-xl mx-auto">
            Start with a free analysis. Upgrade when you're ready to execute.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/buyer-dashboard">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-semibold px-6"
              >
                Analyze a deal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <StripeCheckoutButton
              priceId={PRO_PRICE_ID}
              variant="outline"
              className="border-indigo-400/40 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-200"
            >
              <Lock className="w-4 h-4 mr-2" />
              Upgrade to Pro — $39/mo
            </StripeCheckoutButton>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default AcquisitionsPricing
