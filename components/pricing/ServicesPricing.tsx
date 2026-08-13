"use client"
// components/pricing/ServicesPricing.tsx
//
// MAIN pricing page — routes visitors by who they are, then presents all four
// service lines with high-level pricing and links to the detailed pages.
// Hero + audience router → Buy-Side → Sell-Side → AcquiFlow → Fractional CFO
// (featured, with its own pricing card) → Final CTA → Scope footnote.
//
// ── CONFIG — edit these before shipping ────────────────────────────────────
//  · CFO_PRICE / CFO_PRICE_NOTE   ← placeholder; set your real number/tiers
//  · CFO_CTA_HREF                 ← /fractional-cfo once that page exists;
//                                   points at /contact until then
//  · Price ranges on each service ← confirm against current tier pricing
// ───────────────────────────────────────────────────────────────────────────
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  ArrowRight,
  Search,
  Store,
  Calculator,
  MonitorSmartphone,
  Sparkles,
} from "lucide-react"

const CFO_PRICE = "$1,500"          // TODO: set real starting price
const CFO_PRICE_NOTE = "/month"
const CFO_CTA_HREF = "/contact"     // TODO: swap to /fractional-cfo when built

// ─── Audience router chips (anchor-scroll to sections) ─────────────────────
const ROUTES = [
  { icon: Search,            label: "I'm buying a business",  sub: "Pre-LOI underwriting & QoE-lite",   href: "#buy-side" },
  { icon: Store,             label: "I'm selling a business", sub: "Valuation & sale preparation",       href: "#sell-side" },
  { icon: Calculator,        label: "I need a finance team",  sub: "Fractional CFO & accounting",        href: "#fractional-cfo" },
  { icon: MonitorSmartphone, label: "I want the software",    sub: "AcquiFlow deal intelligence",        href: "#acquiflow" },
]

// ─── The three linked service lines (CFO gets its own featured section) ────
const SERVICES = [
  {
    id:        "buy-side",
    kicker:    "01 · Buy-Side M&A",
    title:     "Pre-LOI Underwriting & QoE-Lite",
    audience:  "For buyers evaluating a deal — before you sign the LOI.",
    body:      "Structured, PE-style underwriting on the seller's numbers: real earnings, real comps, lender fit, and a clear proceed / renegotiate / walk verdict — in days, not weeks.",
    features: [
      "SDE / EBITDA normalization & add-back review",
      "Debt-service (DSCR) viability & SBA structuring check",
      "Supportable price range with negotiation positioning",
      "Structured decision memo + strategy call",
    ],
    priceLabel: "Fixed-fee tiers",
    price:      "$495–$2,500",
    priceNote:  "Deal Snapshot → Full Underwriting & Negotiation Support · 3–5 day turnaround",
    cta:        "Explore Buy-Side Services",
    href:       "/acquisitions",
    reverse:    false,
  },
  {
    id:        "sell-side",
    kicker:    "02 · Sell-Side Advisory",
    title:     "Business Valuation & Sale Preparation",
    audience:  "For owners who want to know their number — or grow it before they sell.",
    body:      "What your business is really worth, from real transaction data — plus what buyers will attack, what each fix is worth, and whether your price survives a lender's math.",
    features: [
      "Value range built on real comparable sales (DealStats)",
      "EBITDA / SDE normalization & owner-comp benchmarking",
      "Financeability check — will a buyer's bank say yes?",
      "Value-improvement roadmap & pre-sale readiness",
    ],
    priceLabel: "Three packages",
    price:      "$495–$4,000+",
    priceNote:  "Value Snapshot → Optimization Review → Pre-Sale Readiness",
    cta:        "Explore Sell-Side Services",
    href:       "/sell/sell-side-advisory",
    reverse:    true,
  },
  {
    id:        "acquiflow",
    kicker:    "03 · The Platform",
    title:     "AcquiFlow — Deal Intelligence Software",
    audience:  "For buyers who want structured underwriting on every deal they screen.",
    body:      "The engine behind our services, in your hands: upload a deal, get a verdict, benchmarks, red flags, and a lender-ready memo in minutes. Screen more deals; commit to the right one.",
    features: [
      "Deal verdict + DSCR screening in 60 seconds",
      "Real transaction comps with percentile positioning",
      "LOI builder, negotiation ranges & PDF deal memos",
      "Market saturation & competitor analysis",
    ],
    priceLabel: "Simple SaaS pricing",
    price:      "$0 / $49",           // NOTE: hero/FAQ on /acquisitions say $39 — reconcile!
    priceNote:  "Free deal screening · Pro unlocks full underwriting · cancel anytime",
    cta:        "Explore AcquiFlow",
    href:       "/acquiflow",
    reverse:    false,
  },
]

const CFO_FEATURES_LEFT = [
  "Monthly close oversight & financial statements you can trust",
  "Cash-flow forecasting, KPI dashboard & budget vs. actual",
  "Lender & SBA-ready reporting packages",
  "Annual valuation pulse — always know your number",
  "Led by former Big 4 & private equity professionals",
]

const CFO_CARD_FEATURES = [
  "Monthly close review & owner report",
  "Quarterly strategy session",
  "Cash-flow & KPI dashboard",
  "Lender-ready financial package",
  "Scale up: add bookkeeping, forecasting, board support",
]

export function ServicesPricing() {
  return (
    <>
      <HeroSection />
      {SERVICES.map((svc) => (
        <ServiceSection key={svc.id} svc={svc} />
      ))}
      <FractionalCfoSection />
      <FinalCtaSection />
      <ScopeFootnote />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — HERO + AUDIENCE ROUTER
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Services &amp; Pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            One firm. <span className="text-emerald-400">Every side</span> of the deal.
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Buy-side underwriting, sell-side valuation, fractional CFO services, and the
            AcquiFlow platform — pick your path below.
          </p>

          {/* Audience router — anchor links */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {ROUTES.map((r) => {
              const Icon = r.icon
              return (
                <a key={r.href} href={r.href}>
                  <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/60 hover:-translate-y-0.5 transition-all cursor-pointer h-full">
                    <CardContent className="py-5 px-5 text-left">
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4.5 h-4.5 text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-white leading-snug">{r.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 pl-12">{r.sub}</p>
                    </CardContent>
                  </Card>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENS 2–4 — SERVICE PANELS (alternating layout, price box + route CTA)
// ═══════════════════════════════════════════════════════════════════════════
function ServiceSection({ svc }: { svc: (typeof SERVICES)[number] }) {
  return (
    <section className="py-8 scroll-mt-24" id={svc.id}>
      <div className="container mx-auto px-4">
        <Card className="bg-slate-800/50 border-slate-700 max-w-6xl mx-auto">
          <CardContent
            className={`py-10 px-8 md:px-12 flex flex-col gap-10 md:items-center ${
              svc.reverse ? "md:flex-row-reverse" : "md:flex-row"
            }`}
          >
            {/* Text side */}
            <div className="flex-[1.25]">
              <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-3 font-mono">
                {svc.kicker}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                {svc.title}
              </h2>
              <p className="text-emerald-300/90 text-sm font-semibold mb-4">{svc.audience}</p>
              <p className="text-slate-400 text-[15px] leading-relaxed mb-5">{svc.body}</p>
              <div className="space-y-2.5 mb-7">
                {svc.features.map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <Link href={svc.href}>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-7 h-11">
                  {svc.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Price box side */}
            <div className="flex-[0.9] w-full">
              <Card className="bg-slate-900/60 border-slate-700">
                <CardContent className="py-8 px-7 text-center">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold font-mono mb-2">
                    {svc.priceLabel}
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">{svc.price}</div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-5">{svc.priceNote}</p>
                  <Link href={svc.href}>
                    <Button
                      variant="outline"
                      className="border-emerald-500/40 bg-transparent hover:bg-emerald-500/10 text-emerald-300"
                    >
                      See details
                    </Button>
                  </Link>
                  <div className="text-[10px] text-slate-600 font-mono mt-4">→ {svc.href}</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 5 — FRACTIONAL CFO (featured section + its own pricing card)
// ═══════════════════════════════════════════════════════════════════════════
function FractionalCfoSection() {
  return (
    <section className="py-8 scroll-mt-24" id="fractional-cfo">
      <div className="container mx-auto px-4">
        <Card className="max-w-6xl mx-auto border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-emerald-950/30">
          <CardContent className="py-10 px-8 md:px-12 flex flex-col md:flex-row gap-10">
            {/* Text side */}
            <div className="flex-[1.25]">
              <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-3 font-mono">
                04 · Ongoing Finance Partner
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                Fractional CFO &amp; Accounting Services
              </h2>
              <p className="text-emerald-300/90 text-sm font-semibold mb-4">
                For owners who want deal-grade finance discipline every month — not just at the transaction.
              </p>
              <p className="text-slate-400 text-[15px] leading-relaxed mb-5">
                The same rigor we bring to acquisitions, applied to running your business: clean
                monthly numbers, lender-ready reporting, and a partner who&rsquo;s already thinking
                about what your business will be worth when you&rsquo;re ready to sell.
              </p>
              <div className="space-y-2.5 mb-6">
                {CFO_FEATURES_LEFT.map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 italic">
                Books that are always diligence-ready are worth real money at exit — financial
                record quality is a multiple driver in every valuation we run.
              </p>
            </div>

            {/* Pricing card side */}
            <div className="flex-[0.95] w-full">
              <Card className="relative bg-slate-950/70 border-emerald-500/60 shadow-xl shadow-emerald-500/10">
                <div className="absolute -top-3.5 left-6">
                  <span className="inline-block bg-emerald-500 text-white text-[11px] font-bold tracking-wide rounded-full px-4 py-1">
                    Most Popular Service
                  </span>
                </div>
                <CardContent className="pt-9 pb-8 px-7">
                  <div className="text-lg font-bold text-white">Fractional CFO</div>
                  <p className="text-xs text-slate-500 italic mb-4">
                    Your finance department, without the payroll.
                  </p>
                  <div className="mb-1">
                    <span className="text-4xl font-bold text-white">{CFO_PRICE}</span>
                    <span className="text-slate-400 text-base">{CFO_PRICE_NOTE}</span>
                  </div>
                  {/* TODO: remove before ship — placeholder flag */}
                  <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold font-mono mb-5">
                    [Placeholder — set starting price &amp; tiers]
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {CFO_CARD_FEATURES.map((f) => (
                      <div key={f} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] text-slate-300">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={CFO_CTA_HREF} className="block">
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-12 text-base">
                      Book an Intro Call
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-[10px] text-slate-600 font-mono text-center mt-3">
                    → suggest: /fractional-cfo (page not built yet)
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 6 — FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════
function FinalCtaSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <Card className="bg-slate-800/50 border-slate-700 max-w-4xl mx-auto">
          <CardContent className="py-14 px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Not sure which fits?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Fifteen minutes beats an hour of reading pricing pages. No pitch — just where you
              are, what you need, and whether we&rsquo;re the right fit.
            </p>
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-10 h-12 text-base shadow-lg shadow-emerald-500/20"
              >
                Book a Free Intro Call
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 7 — ADVISORY / LEGAL SCOPE FOOTNOTE
// ═══════════════════════════════════════════════════════════════════════════
function ScopeFootnote() {
  return (
    <section className="pb-16">
      <div className="container mx-auto px-4">
        <p className="text-center text-[11px] text-slate-600 leading-relaxed max-w-3xl mx-auto">
          NexTax.AI provides business and financial advisory services only and does not provide
          legal advice — legal matters remain with your attorney. Valuation deliverables are
          indications of value for planning purposes, not certified appraisals under AICPA SSVS
          No. 1 or USPAP.
        </p>
      </div>
    </section>
  )
}

export default ServicesPricing
