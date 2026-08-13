"use client"
// components/pricing/FractionalCfoPage.tsx  →  route at /fractional-cfo
//
// Fractional CFO landing page — conversion-focused.
// Hero → Who it's for → What you get monthly → Pricing (Monthly w/ Stripe +
// Project/Custom w/ Calendly) → How it works → FAQ → Final CTA → Scope note.
//
// ── CONFIG — edit before shipping ──────────────────────────────────────────
//  · CFO_MONTHLY_PRICE_ID  ← create a recurring Price in Stripe ($X/month)
//  · CFO_PRICE             ← display price; keep in sync with Stripe
//  · CALENDLY_URL          ← confirmed: steven-morello-nextax
// ───────────────────────────────────────────────────────────────────────────
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StripeCheckoutButton } from "@/components/stripe-checkout-button"
import {
  CheckCircle,
  ArrowRight,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  LineChart,
  Landmark,
  Gauge,
  FileSpreadsheet,
  TrendingUp,
  Wrench,
  Crown,
} from "lucide-react"

const CFO_MONTHLY_PRICE_ID = "price_REPLACE_ME"  // TODO: create recurring Price in Stripe
const CFO_PRICE = "$1,500"                        // TODO: confirm; placeholder
const CFO_PRICE_NOTE = "/month"
const CALENDLY_URL = "https://calendly.com/steven-morello-nextax"

// ─── Who it's for ───────────────────────────────────────────────────────────
const AUDIENCES = [
  {
    title: "Owners running & growing",
    body:  "You've outgrown 'the bookkeeper does it' but can't justify a $200K CFO hire. You want numbers you trust, a forecast you actually use, and someone to call before big decisions.",
  },
  {
    title: "Owners 1–3 years from selling",
    body:  "Financial record quality is a multiple driver in every valuation we run. Clean, diligence-ready books — maintained monthly — are the cheapest value-creation lever you have.",
  },
  {
    title: "Buyers who just closed",
    body:  "You bought the business; now you inherit the seller's books. We rebuild the finance function post-close — the same rigor we used underwriting deals, now running yours.",
  },
]

// ─── What you get monthly — 6 outcome boxes ────────────────────────────────
const OUTCOMES = [
  {
    icon: ClipboardCheck,
    title: "A close you can trust",
    body:  "Monthly close oversight and review — accruals, reconciliations, and clean financial statements delivered on a schedule, every month.",
  },
  {
    icon: Gauge,
    title: "A KPI dashboard that matters",
    body:  "The handful of numbers that actually run your business — margin, cash runway, pipeline, labor efficiency — tracked and trended.",
  },
  {
    icon: LineChart,
    title: "A forward view of cash",
    body:  "13-week cash-flow forecasting and budget vs. actual, so surprises become plans instead of emergencies.",
  },
  {
    icon: Landmark,
    title: "Lender-ready reporting",
    body:  "Financial packages formatted the way banks and SBA lenders want them — ready when you need a line increase, equipment loan, or acquisition financing.",
  },
  {
    icon: TrendingUp,
    title: "An annual valuation pulse",
    body:  "Once a year we run your numbers through our valuation engine — so you always know what the business is worth and what's moving it.",
  },
  {
    icon: FileSpreadsheet,
    title: "A partner for the big calls",
    body:  "Pricing changes, hires, equipment, expansion, exit timing — a standing quarterly strategy session plus access when it matters.",
  },
]

// ─── FAQ ────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What's actually included each month?",
    a: "Close review and financial statements, KPI dashboard refresh, cash-flow forecast update, and a standing monthly owner call — plus a quarterly deep-dive strategy session. Scope flexes by tier; we agree it in writing before we start.",
  },
  {
    q: "Do I need to replace my bookkeeper or CPA?",
    a: "No. We sit above your bookkeeper (or can bring one) and alongside your tax CPA. Bookkeepers record, tax preparers file — we're the layer that turns the numbers into decisions. We're happy to coordinate directly with both.",
  },
  {
    q: "What software do you work with?",
    a: "QuickBooks Online is home base; we also work with common SMB stacks (payroll, POS, e-commerce platforms). If your books live somewhere unusual, book a call and we'll tell you honestly whether we're a fit.",
  },
  {
    q: "Is there a contract or minimum term?",
    a: "Month-to-month after an initial 90-day onboarding period — the first three months are where we clean up, build the dashboard, and establish the rhythm. Cancel anytime after that.",
  },
  {
    q: "How is this different from a typical fractional CFO?",
    a: "Most fractional CFOs come from corporate finance. We come from M&A — we underwrite business acquisitions and run sale-side valuations every week. That means your books get kept to the standard a buyer's diligence team would apply, and you always know what the business is worth.",
  },
]

export function FractionalCfoPage() {
  return (
    <>
      <HeroSection />
      <AudienceSection />
      <OutcomesSection />
      <PricingSection />
      <HowItWorksSection />
      <FaqSection />
      <FinalCtaSection />
      <ScopeFootnote />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — HERO
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Crown className="w-3.5 h-3.5" />
            NexTax Advisory · Fractional CFO
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Your finance department,{" "}
            <span className="text-emerald-400">without the payroll.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-5 max-w-3xl mx-auto leading-relaxed">
            Deal-grade financial discipline for your business, every month — clean numbers,
            forward-looking cash, lender-ready reporting, and a partner who always knows
            what your business is worth.
          </p>
          <p className="text-base text-slate-400 mb-8 max-w-2xl mx-auto">
            Led by former Big 4 &amp; private equity professionals. Michigan-based,
            serving owners nationwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 h-12 text-base shadow-lg shadow-emerald-500/20"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book a Free Intro Call
              </Button>
            </a>
            <a href="#cfo-pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-emerald-500/40 bg-transparent hover:bg-emerald-500/10 text-emerald-300 h-12 text-base px-8"
              >
                See Pricing
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 2 — WHO IT'S FOR
// ═══════════════════════════════════════════════════════════════════════════
function AudienceSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Built for owners at <span className="text-emerald-400">three moments</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {AUDIENCES.map((a) => (
            <Card key={a.title} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-bold text-white mb-3 leading-tight">{a.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 3 — WHAT YOU GET MONTHLY
// ═══════════════════════════════════════════════════════════════════════════
function OutcomesSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            What you get <span className="text-emerald-400">every month</span>
          </h2>
          <p className="text-slate-400">
            Outcomes, not hours — the finance function a larger company takes for granted.
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

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 4 — PRICING (Monthly w/ Stripe · Project/Custom w/ Calendly)
// ═══════════════════════════════════════════════════════════════════════════
function PricingSection() {
  return (
    <section className="py-16 scroll-mt-24" id="cfo-pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Simple <span className="text-emerald-400">engagement options</span>
          </h2>
          <p className="text-slate-400">
            A monthly partnership — or a defined project when that&rsquo;s what you need.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* ── Card 1 — Monthly Fractional CFO (Stripe) ── */}
          <Card className="relative bg-slate-800/50 border-emerald-500/50 shadow-xl shadow-emerald-500/10">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-emerald-500 text-white px-4 py-1">Most Popular</Badge>
            </div>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Crown className="w-8 h-8 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white">Monthly Fractional CFO</CardTitle>
              <p className="text-slate-400">Your finance department, on subscription</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-white">{CFO_PRICE}</span>
                <span className="text-slate-400 text-lg">{CFO_PRICE_NOTE}</span>
              </div>
              <p className="text-xs text-emerald-400/80 mt-3 italic">
                A fraction of one mid-level finance hire
              </p>
              <Badge className="bg-emerald-500/20 text-emerald-300 mt-3 border-0">
                Month-to-month after 90-day onboarding
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  "Monthly close review & financial statements",
                  "KPI dashboard & budget vs. actual",
                  "13-week cash-flow forecast",
                  "Lender & SBA-ready reporting package",
                  "Monthly owner call + quarterly strategy session",
                  "Annual valuation pulse — know your number",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 space-y-3">
                <StripeCheckoutButton
                  priceId={CFO_MONTHLY_PRICE_ID}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-12 text-base"
                >
                  Start Monthly CFO
                  <ArrowRight className="w-5 h-5 ml-2" />
                </StripeCheckoutButton>
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 bg-slate-900/50 hover:bg-slate-700 text-slate-300 h-11"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Prefer to talk first? Book a call
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* ── Card 2 — Project-Based / Custom (Calendly) ── */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Wrench className="w-8 h-8 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white">Project-Based / Custom</CardTitle>
              <p className="text-slate-400">Defined scope, defined price</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-white">Custom</span>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">
                Scoped and quoted after a short call — fixed fee, no surprises
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  "Books cleanup & historical catch-up",
                  "Diligence / QoE preparation before a sale",
                  "Forecast, budget & financial model builds",
                  "Post-acquisition finance function setup",
                  "Lender package assembly for a financing round",
                  "One-time deep-dive: pricing, margins, or cash",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-12 text-base">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book a Call — Get a Quote
                  </Button>
                </a>
              </div>
              <p className="text-xs text-slate-500 italic text-center pt-2 border-t border-slate-700/40">
                Many projects convert to monthly — project fees credit toward your first
                quarter of CFO service.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 5 — HOW IT WORKS
// ═══════════════════════════════════════════════════════════════════════════
function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Intro call",
      body:  "Fifteen minutes on where you are, what the books look like, and what you need. If we're not the right fit, we'll say so and point you somewhere better.",
    },
    {
      n: "02",
      title: "Diagnostic & onboarding (first 90 days)",
      body:  "We get into the books, fix what's broken, build your dashboard and forecast, and establish the monthly rhythm.",
    },
    {
      n: "03",
      title: "The monthly cadence",
      body:  "Close review → dashboard → forecast update → owner call. Quarter by quarter, the business gets easier to run — and worth more.",
    },
  ]
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            How it <span className="text-emerald-400">works</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((s) => (
            <Card key={s.n} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-8 pb-8">
                <div className="text-emerald-400 font-mono font-bold text-sm tracking-widest mb-3">
                  STEP {s.n}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 6 — FAQ
// ═══════════════════════════════════════════════════════════════════════════
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <section className="py-16">
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
              <Card key={i} className="bg-slate-800/50 border-slate-700 overflow-hidden">
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

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 7 — FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════
function FinalCtaSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <Card className="bg-gradient-to-r from-[#0B1F2A] to-[#0E2A38] border-white/10 max-w-4xl mx-auto shadow-2xl shadow-black/40">
          <CardContent className="py-14 px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
              Stop running a seven-figure business<br />
              <span className="text-emerald-400">on gut feel and a bank balance.</span>
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto text-base">
              Fifteen minutes tells you whether this fits. No pitch, no pressure.
            </p>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-10 h-12 text-base shadow-lg shadow-emerald-500/20"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Your Free Intro Call
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 8 — SCOPE FOOTNOTE
// ═══════════════════════════════════════════════════════════════════════════
function ScopeFootnote() {
  return (
    <section className="pb-16">
      <div className="container mx-auto px-4">
        <p className="text-center text-[11px] text-slate-600 leading-relaxed max-w-3xl mx-auto">
          NexTax.AI provides business and financial advisory services only and does not provide
          legal advice — legal matters remain with your attorney. Fractional CFO services are
          advisory in nature; attest services and tax return preparation are engaged separately
          where applicable.
        </p>
      </div>
    </section>
  )
}

export default FractionalCfoPage
