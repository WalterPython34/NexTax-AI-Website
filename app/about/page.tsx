import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Award,
  Bot,
  Shield,
  Scale,
  ExternalLink,
  Linkedin,
  TrendingUp,
  ClipboardList,
  BookOpen,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"

const CANONICAL = "https://www.nextax.ai/about"
const LINKEDIN = "https://www.linkedin.com/in/steve-morello-95b468365/"

export const metadata: Metadata = {
  title: "About NexTax.AI — Institutional-Grade Deal Analysis for SMB Buyers",
  description:
    "NexTax.AI develops deal-intelligence tools for SMB acquisition buyers, including AcquiFlow, a buyer deal-intelligence platform for pre-LOI screening, SBA loan readiness, and financial analysis.",
  alternates: { canonical: CANONICAL },
}

export default function AboutPage() {
  const founder = {
    name: "Steve Morello",
    role: "CEO & Founder",
    image: "/images/steve-morello-headshot.jpg",
    credentials: [
      "Former Morgan Stanley Private Equity",
      "Big 4 Tax Experience (EY, KPMG)",
      "20+ Years Tax & Deal Structuring",
      "M&A Tax & Transaction Specialist",
      "Finance Leader in Cybersecurity & Fintech",
    ],
    linkedin: LINKEDIN,
  }

  const values = [
    {
      icon: Bot,
      title: "Signal Over Noise",
      description:
        "We don’t surface more data — we surface the right data. Every metric, adjustment, and flag is designed to improve decision quality, not overwhelm it.",
    },
    {
      icon: Shield,
      title: "Lender-Grade Thinking",
      description:
        "Our models reflect how lenders and experienced operators actually evaluate deals — from DSCR durability to earnings quality and structure risk.",
    },
    {
      icon: Scale,
      title: "Honest About the Data",
      description:
        "One valuation basis per screen, never two. When benchmark coverage is thin for an industry, we say so — a modeled estimate is labeled a modeled estimate, never dressed up as market data.",
    },
    {
      icon: Users,
      title: "Built for Real Decisions",
      description:
        "This isn’t a dashboard. It’s a workflow — from first pass to LOI — designed to help buyers move faster without sacrificing rigor.",
    },
  ]

  const stats = [
    { number: "< 60 sec", label: "Time to analyze a deal" },
    { number: "41+", label: "Industries benchmarked with real transaction data" },
    { number: "100+", label: "Financial signals evaluated per deal" },
    { number: "24/7", label: "AI-powered underwriting assistant" },
  ]

  const products = [
    {
      icon: TrendingUp,
      name: "AcquiFlow",
      badge: "Flagship Platform",
      badgeClass: "bg-emerald-500 text-emerald-300 border-emerald-500/30",
      description:
        "Pre-LOI deal intelligence for serious buyers. Scores deals against thousands of closed transactions, stress-tests DSCR, verifies earnings quality, and produces a clear verdict with a lender-ready package — before you spend a dollar on formal diligence.",
      href: "/acquiflow",
      cta: "Explore AcquiFlow",
      flagship: true,
    },
    {
      icon: ClipboardList,
      name: "Deal Reality Check",
      badge: "Free Tool",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      description:
        "Score any acquisition on pricing, debt coverage, and risk, benchmarked against real closed transactions. No signup required.",
      href: "/deal-reality-check",
      cta: "Run a free Deal Reality Check",
      flagship: false,
    },
    {
      icon: CheckCircle,
      name: "SBA Deal Check",
      badge: "Free Tool",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      description:
        "The first test an SBA lender runs: a deterministic 1.25x debt-service coverage screen with benchmarked owner replacement cost. A verdict in about a minute.",
      href: "/sba-checker",
      cta: "Screen a deal against lender coverage",
      flagship: false,
    },
    {
      icon: BookOpen,
      name: "The Complete Pre-LOI SMB Acquisition Checklist",
      badge: "Free Guide",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      description:
        "How professional buyers pressure-test small business deals before making an offer: financial documents, customer concentration tiers, the ratios lenders check, and the red flags that kill deals after the LOI.",
      href: "/resources/pre-loi-smb-acquisition-checklist",
      cta: "Read the complete pre-LOI checklist",
      flagship: false,
    },
  ]

  const methodology = [
    {
      title: "Benchmark methodology",
      body: "Valuation and margin benchmarks are built from licensed closed-transaction and financial-statement databases, surfaced as blended NexTax Intelligence. We never display raw licensed records, and we prefer size-matched cohorts over national averages whenever the sample supports it.",
    },
    {
      title: "What our analyses are",
      body: "Screening estimates that organize the pre-LOI decision: pricing versus market, debt-service coverage, risk flags, and diligence priorities. They are designed to be handed to your lender, CPA, and attorney — not to replace them.",
    },
    {
      title: "What they are not",
      body: "Not lender approval. Not a Quality of Earnings conclusion. Not legal, tax, or investment advice. When a deal needs verification, our tools say “Earnings Verification Required” — and mean it.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 pt-16">
      {/* Hero Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <Users className="w-4 h-4 mr-2" />
            About NexTax.AI
          </Badge>
          <div className="relative mx-auto w-fit mb-4">
            {/* Soft emerald aura behind the logo video */}
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-emerald-500/40 via-cyan-400/25 to-emerald-500/40 blur-2xl opacity-70"
            />
            <video
              src="/videos/Exploding_NexTax.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="relative max-h-[240px] mx-auto rounded-xl border border-emerald-500/40 object-contain bg-slate-900 py-2 shadow-[0_0_45px_rgba(16,185,129,0.28)]"
            />
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-8">
            Bringing Institutional-Grade Deal Analysis
            <span className="block text-emerald-400">to SMB Buyers</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            NexTax.AI combines Big 4 tax expertise, private equity experience, and real transaction data to help buyers underwrite deals with clarity, confidence, and lender-ready precision.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">{stat.number}</div>
                <div className="text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Built This (absorbs the former Our Story section) */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-10 text-center">Why We Built This</h2>
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div className="space-y-5 text-lg text-slate-300">
                <p>
                  Most SMB buyers aren&apos;t losing deals because of effort — they&apos;re losing because of incomplete
                  information. Deals look attractive on the surface and fall apart under scrutiny: inflated earnings,
                  aggressive add-backs, weak coverage, unrealistic pricing.
                </p>
                <p>
                  Our founder spent two decades inside the rooms where deals are underwritten properly — Big 4 tax
                  practices, Wall Street private equity, high-growth technology companies. In that world, every
                  assumption is tested, every risk is surfaced, and every decision is grounded in data. In the SMB
                  market, he watched buyers make six and seven-figure decisions on seller-provided numbers that
                  didn&apos;t survive first contact with a lender.
                </p>
                <p className="font-medium text-white">
                  Institutional-quality underwriting existed. It just wasn&apos;t accessible to everyday buyers.
                  NexTax.AI was built to close that gap — and AcquiFlow is how we deliver it.
                </p>
              </div>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">
                    A platform where any buyer can
                  </h3>
                  <ul className="space-y-5">
                    <li className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-white font-medium">Normalize earnings</div>
                        <div className="text-slate-400 text-sm">
                          Challenge add-backs before the seller&apos;s number becomes your number
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-white font-medium">Benchmark against real closed deals</div>
                        <div className="text-slate-400 text-sm">Not asking prices. Transactions that actually happened</div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-white font-medium">Stress-test the financing</div>
                        <div className="text-slate-400 text-sm">The same 1.25x coverage screen an SBA lender runs first</div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-white font-medium">Generate a lender-ready view</div>
                        <div className="text-slate-400 text-sm">Walk into underwriting with the answers already organized</div>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What We Build (entity section) */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 text-center">What We Build</h2>
            <p className="border-l-4 border-emerald-500 bg-emerald-500/5 rounded-r-xl px-6 py-4 text-lg text-slate-200 max-w-3xl mx-auto mb-10">
              NexTax.AI develops deal-intelligence tools for SMB acquisition buyers, including AcquiFlow, a buyer
              deal-intelligence platform for pre-LOI screening, SBA loan readiness, and financial analysis.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {products.map((p) => (
                <Card
                  key={p.name}
                  className={`border-slate-700 hover:border-emerald-500/50 transition-colors ${
                    p.flagship
                      ? "md:col-span-2 bg-slate-800/80 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-emerald-500/40"
                      : "bg-slate-800/50"
                  }`}
                >
                  <CardContent className="p-7">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <p.icon className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-xl font-bold text-white">{p.name}</h3>
                      <Badge className={p.badgeClass}>{p.badge}</Badge>
                    </div>
                    <p className="text-slate-300 mb-4">{p.description}</p>
                    <Link href={p.href} className="text-emerald-400 font-semibold hover:text-emerald-300">
                      {p.cta} →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-slate-400 text-sm max-w-3xl mx-auto mt-8">
              AcquiFlow provides screening estimates and decision support. It does not replace a Quality of Earnings
              review, legal counsel, tax advice, or lender underwriting — it makes sure you arrive at each of those
              steps with better questions.
            </p>
          </div>
        </div>
      </section>

      {/* Meet the Founder */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Meet the Founder</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Built at the intersection of tax, private equity, and real-world deal execution.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="text-center lg:text-left flex-shrink-0">
                    <div className="w-48 h-48 mx-auto lg:mx-0 mb-4 rounded-xl bg-slate-700 overflow-hidden">
                      <img src={founder.image} alt={founder.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">{founder.name}</h3>
                    <p className="text-emerald-400 font-semibold mb-4">{founder.role}</p>
                    <Link href={founder.linkedin} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10">
                        <Linkedin className="mr-2 w-4 h-4" />
                        LinkedIn Profile
                        <ExternalLink className="ml-2 w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex-1 space-y-6">
                    <p className="text-slate-300 leading-relaxed">
                      Steve has spent 20+ years in tax, M&amp;A structuring, and financial operations — supporting
                      private equity transactions, global tax functions, and finance leadership in cybersecurity and
                      fintech. NexTax.AI brings that institutional discipline to SMB acquisitions: financial rigor, tax
                      insight, and automation in a single decision workflow.
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      The goal is simple: help buyers make better decisions, faster, and avoid the mistakes that only
                      show up after the check clears.
                    </p>
                    <div>
                      <h4 className="font-semibold text-white mb-3">Professional Credentials</h4>
                      <div className="flex flex-wrap gap-2">
                        {founder.credentials.map((credential) => (
                          <span
                            key={credential}
                            className="inline-flex items-center gap-1.5 text-sm text-slate-300 border border-slate-600 rounded-full px-3 py-1 bg-slate-900/40"
                          >
                            <Award className="w-3.5 h-3.5 text-emerald-400" />
                            {credential}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-2xl font-semibold text-white mb-6">
                &ldquo;Give every serious buyer the analytical edge of a seasoned deal team — without the cost, delay,
                or guesswork.&rdquo;
              </p>
              <p className="text-slate-300 mb-6">
                Too many buyers rely on broker-provided numbers, surface-level comps, or manual spreadsheets that miss
                critical risks.
              </p>
              <p className="text-slate-300">
                By combining tax expertise, transaction data, and structured underwriting logic, we help buyers move
                from &ldquo;this looks interesting&rdquo; to &ldquo;this is a disciplined decision.&rdquo;
              </p>
            </div>
            <div className="relative">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">The Problem We Solve</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-red-500/20">
                      <h4 className="text-red-400 font-semibold mb-2">Traditional Deal Evaluation</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• Reliance on broker-reported SDE</li>
                        <li>• Inconsistent or inflated add-backs</li>
                        <li>• No standardized benchmarking</li>
                        <li>• Manual spreadsheet analysis</li>
                        <li>• Lender perspective arrives too late</li>
                      </ul>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-emerald-500/20">
                      <h4 className="text-emerald-400 font-semibold mb-2">With NexTax.AI</h4>
                      <ul className="text-slate-300 text-sm space-y-1">
                        <li>• Adjusted earnings with validation logic</li>
                        <li>• Trust scoring + add-back flags</li>
                        <li>• Benchmarking across real closed transactions</li>
                        <li>• Instant DSCR + financing viability</li>
                        <li>• Lender-ready outputs from day one</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Our Operating Principles</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              These principles guide how we build tools for serious buyers making real capital decisions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <value.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
                      <p className="text-slate-300">{value.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology & Trust */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 text-center">Where Our Numbers Come From</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 text-center">
              Every figure in a NexTax.AI analysis has a defined source and a defined limit. This is the standard we
              hold our own outputs to.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {methodology.map((m) => (
                <Card key={m.title} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <h3 className="text-white font-semibold mb-3">{m.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{m.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-8 text-center">
              Content on this page reviewed by NexTax.AI · Last updated July 2026 · Questions about methodology?{" "}
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent px-8 py-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              See what your next deal looks like through a lender&apos;s eyes.
            </h2>
            <p className="text-slate-300 mb-8">Start free. No credit card, no signup for the screening tools.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/deal-reality-check">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                  Run a Free Deal Reality Check
                </Button>
              </Link>
              <Link href="/acquiflow">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 bg-transparent px-8"
                >
                  Explore AcquiFlow
                </Button>
              </Link>
            </div>
            <p className="text-slate-500 text-sm mt-6">
              Or start with the reading:{" "}
              <Link
                href="/resources/pre-loi-smb-acquisition-checklist"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                The Complete Pre-LOI SMB Acquisition Checklist
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* AboutPage + Person entity schema, referencing the sitewide Organization @id */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "AboutPage",
                "@id": `${CANONICAL}/#aboutpage`,
                url: CANONICAL,
                name: "About NexTax.AI",
                about: { "@id": "https://www.nextax.ai/#organization" },
              },
              {
                "@type": "Person",
                "@id": "https://www.nextax.ai/about/#steve-morello",
                name: "Steve Morello",
                jobTitle: "CEO & Founder",
                worksFor: { "@id": "https://www.nextax.ai/#organization" },
                sameAs: [LINKEDIN],
                knowsAbout: [
                  "M&A Tax Structuring",
                  "SMB Acquisitions",
                  "Private Equity Transactions",
                  "SBA Acquisition Financing",
                ],
              },
            ],
          }),
        }}
      />
    </div>
  )
}
