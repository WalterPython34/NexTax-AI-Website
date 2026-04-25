"use client"

// app/partners/page.tsx
//
// Hidden partner landing page for AcquiFlow.
// NOT linked from the main nav. Reached only by direct URL: /partners
//
// Tone: institutional, partnership-focused. Not affiliate-marketing.
// Audience: SMB buyer communities, lenders, brokers, diligence providers.

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Users,
  Banknote,
  Briefcase,
  ClipboardCheck,
  Target,
  Clock,
  TrendingUp,
  Handshake,
  ChevronRight,
  Mail,
} from "lucide-react"

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">

      {/* ─── 1. HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 pointer-events-none" />
        <div className="relative container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Handshake className="w-3.5 h-3.5" />
              AcquiFlow Partner Program
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
              Help buyers screen better deals{" "}
              <span className="text-emerald-400">before they commit capital.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-8">
              AcquiFlow gives SMB buyers a structured pre-LOI underwriting workflow — normalized earnings, benchmark-backed pricing, debt coverage stress testing, lender readiness, and deal memo outputs — before they spend serious money on diligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-6 text-base w-full sm:w-auto"
                >
                  Discuss Partnership
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/buyer-dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-base w-full sm:w-auto bg-transparent"
                >
                  View AcquiFlow
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. WHO THIS IS FOR ──────────────────────────────────── */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Built for partners who <span className="text-emerald-400">influence serious SMB buyers</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              {
                icon: Users,
                title: "SMB Buyer Communities",
                body: "Help members move from deal curiosity to disciplined screening.",
              },
              {
                icon: Banknote,
                title: "Lenders",
                body: "Receive better-prepared borrowers with clearer coverage, structure, and risk context.",
              },
              {
                icon: Briefcase,
                title: "Brokers & Deal Sources",
                body: "Help buyers engage more seriously before tying up seller time.",
              },
              {
                icon: ClipboardCheck,
                title: "Diligence Providers",
                body: "Create a cleaner handoff from pre-LOI screening to deeper post-LOI diligence.",
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/40 transition-colors">
                  <CardContent className="pt-7 pb-7">
                    <div className="w-12 h-12 mb-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-tight">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── 3. PARTNER VALUE ────────────────────────────────────── */}
      <section className="py-20 border-t border-slate-800 bg-slate-900/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Why partners send buyers to <span className="text-emerald-400">AcquiFlow</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: Target,
                title: "Better-prepared buyers",
                body: "Buyers arrive with normalized earnings, benchmark context, financing assumptions, and clear diligence priorities.",
              },
              {
                icon: Clock,
                title: "Less wasted time",
                body: "Weak or mispriced deals can be filtered before buyers spend on full diligence or lender review.",
              },
              {
                icon: TrendingUp,
                title: "Cleaner financing conversations",
                body: "AcquiFlow helps buyers understand DSCR, SBA-style assumptions, equity needs, and lender readiness before outreach.",
              },
              {
                icon: Handshake,
                title: "Aligned economics",
                body: "Partners can participate when referred buyers upgrade, without having to build or maintain underwriting software themselves.",
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/40 transition-colors">
                  <CardContent className="p-7">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white mb-2 leading-tight">{item.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              A simple <span className="text-emerald-400">referral workflow</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Send buyers to AcquiFlow",
                body: "Use a partner link, private landing page, or direct introduction.",
              },
              {
                step: "02",
                title: "Buyer analyzes a deal",
                body: "They can screen deals, compare opportunities, benchmark pricing, and generate lender-ready outputs.",
              },
              {
                step: "03",
                title: "Partner participates when they upgrade",
                body: "Referral economics are tracked through a simple partner arrangement.",
              },
            ].map((item, i, arr) => (
              <div key={i} className="relative">
                <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/40 transition-colors h-full">
                  <CardContent className="p-7">
                    <div className="text-emerald-400 font-mono text-sm font-bold mb-4 tracking-wider">
                      {item.step}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-tight">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
                  </CardContent>
                </Card>
                {i < arr.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. REFERRAL ECONOMICS ──────────────────────────────── */}
      <section className="py-20 border-t border-slate-800 bg-slate-900/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Simple, flexible <span className="text-emerald-400">partner economics</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* Option A — Rev share */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-7">
                <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 mb-4">
                  Option A
                </Badge>
                <h3 className="text-lg font-bold text-white mb-2">Recurring Rev Share</h3>
                <div className="text-2xl font-bold text-emerald-400 mb-4 font-mono">
                  20%–30%
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Of subscription revenue for referred Pro users.
                </p>
                <div className="pt-4 border-t border-slate-700/60">
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Best for
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Communities, lenders, brokers, and repeat referral partners.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Option B — Flat fee */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-7">
                <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 mb-4">
                  Option B
                </Badge>
                <h3 className="text-lg font-bold text-white mb-2">Flat Conversion Fee</h3>
                <div className="text-2xl font-bold text-cyan-400 mb-4 font-mono">
                  $100–$300
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Per converted Pro customer.
                </p>
                <div className="pt-4 border-t border-slate-700/60">
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Best for
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Partners who prefer simple one-time economics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-xs text-slate-500 italic mt-8 max-w-2xl mx-auto">
            Final partner terms depend on referral volume, audience fit, and partnership structure.
          </p>
        </div>
      </section>

      {/* ─── 6. STRATEGIC CALLOUT ───────────────────────────────── */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-emerald-500/30 max-w-4xl mx-auto">
            <CardContent className="p-10 sm:p-12">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-1 h-8 bg-emerald-500 flex-shrink-0 mt-1" />
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  The goal is not lead generation.<br />
                  <span className="text-emerald-400">It is better deal flow.</span>
                </h2>
              </div>
              <p className="text-base text-slate-300 leading-relaxed pl-4">
                AcquiFlow is designed to sit upstream of diligence, lending, and advisory conversations. When buyers screen deals with a consistent underwriting framework first, every downstream partner receives a cleaner, more informed buyer.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── 7. CTA ──────────────────────────────────────────────── */}
      <section className="py-20 border-t border-slate-800 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Interested in partnering with <span className="text-emerald-400">AcquiFlow</span>?
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
            If your audience includes SMB buyers, searchers, acquisition entrepreneurs, lenders, brokers, or diligence teams, let&rsquo;s discuss whether AcquiFlow can support your ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-6 text-base w-full sm:w-auto"
              >
                <Mail className="mr-2 w-4 h-4" />
                Discuss Partnership
              </Button>
            </Link>
            <Link
              href="/buyer-dashboard"
              className="text-sm text-slate-400 hover:text-emerald-400 transition-colors underline-offset-4 hover:underline"
            >
              View AcquiFlow
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 8. DISCLAIMER ──────────────────────────────────────── */}
      <section className="py-10 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-slate-500 max-w-3xl mx-auto leading-relaxed">
            AcquiFlow provides financial analysis tools and educational content. It is not legal, tax, investment, or lending advice. Buyers should consult qualified professionals before making acquisition decisions.
          </p>
        </div>
      </section>

    </div>
  )
}
