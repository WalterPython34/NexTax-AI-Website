// app/sell/sell-side-advisory/page.tsx
// NexTax.AI — Sell-Side funnel, page 3 of 3 (conversion page; mirrors buy-side advisory structure)
// Self-contained: no component imports, inline SVG icons, Tailwind only.
// Assumes shared nav/footer come from the root layout.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sell-Side Advisory & Business Valuation | NexTax.AI",
  description:
    "Sell-side valuation and exit-readiness advisory for Michigan business owners — built by the team that underwrites acquisitions for buyers. From $495.",
};

/* ---------- inline icons ---------- */
const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`h-5 w-5 flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" opacity="0.35" /><path d="m9 12 2 2 4-4" />
  </svg>
);
const Cross = () => (
  <svg className="h-4 w-4 flex-shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);
const Arrow = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

/* ---------- data ---------- */
const analyzeGrid = [
  "Earnings normalization & add-back documentation",
  "EBITDA / SDE bridges (reported → normalized)",
  "Owner compensation benchmarking (BLS wage data)",
  "Market multiple analysis with comparable transactions",
  "Forward cash flow stress-test with sourced discount rate build-up",
  "Working capital analysis & peg positioning",
  "Financeability check: would this price survive an SBA lender?",
  "Value driver roadmap: improvement → value impact",
  "Buyer's Lens: diligence questions & negotiation flashpoints",
  "Data room & exit-readiness assessment",
];

const receive = [
  ["Valuation Report", "Institutional-quality PDF with your value range, method detail, and comparables"],
  ["EBITDA / SDE Bridges", "Exactly how reported earnings become the number buyers price"],
  ["Value Driver Roadmap", "Prioritized improvements tied to value impact (Level 2+)"],
  ["Buyer's Lens Assessment", "Your business as an acquirer's underwriter reads it (Level 3)"],
  ["Assumptions Register", "Every judgment call sourced and dated — nothing hidden"],
  ["Strategy Call", "Direct walkthrough of findings and next steps"],
];

const tiers = [
  {
    name: "Business Value Snapshot",
    price: "$495",
    tagline: "\u201CI just want to know approximately what my business is worth.\u201D",
    badge: null,
    highlight: false,
    features: [
      "Executive summary",
      "Estimated value range (low / mid / high)",
      "Multiple used & what drives it",
      "Comparable transactions",
      "Key strengths",
      "Biggest value detractors",
      "Recommended next steps",
    ],
    footnote: "Priced $495–$995 by size and complexity.",
  },
  {
    name: "Value Optimization Review",
    price: "$1,500",
    tagline: "For owners who want to grow the number before they sell it.",
    badge: "Most Engaged Tier",
    highlight: true,
    features: [
      "Everything in the Snapshot",
      "Full financial normalization (EBITDA / SDE bridges)",
      "Owner compensation benchmarking",
      "Working capital analysis",
      "Customer concentration review",
      "Margin benchmarking vs. industry",
      "Debt capacity / financeability check",
      "Exit-readiness assessment",
      "Value improvement roadmap",
    ],
    footnote: "Priced $1,500–$2,500 by size and complexity.",
  },
  {
    name: "Pre-Sale Readiness Assessment",
    price: "$4,000",
    tagline: "For owners planning to go to market.",
    badge: "Going to Market",
    highlight: false,
    features: [
      "Everything in the Optimization Review",
      "Sell-side diligence preparation",
      "Quality of earnings preparation",
      "Tax structure review (asset vs. stock)",
      "Deal structure options & trade-offs",
      "Buyer risk assessment (the Buyer's Lens)",
      "Data room readiness & document checklist",
      "Two strategy sessions",
    ],
    footnote: "Starting at $4,000; scoped to the transaction.",
  },
];

export default function SellSideAdvisoryPage() {
  return (
    <main className="min-h-screen bg-[#0a0e17] text-slate-100 antialiased">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.09),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-24 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-teal-300">
            Exit Intelligence for Business Owners
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Professional Sell-Side Valuation
            <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              For Your Business Exit
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Valuation, normalization, and exit-readiness advisory to help you answer:
          </p>
          <p className="mt-3 text-xl font-semibold italic text-slate-100">
            What is my business worth — and how do I make it worth more?
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Book a 15-Minute Intro Call <Arrow />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-7 py-3.5 font-semibold text-slate-200 transition hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Request a Value Snapshot
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span>Built for Michigan owner-operated businesses</span>
            <span>Confidential — no listing required</span>
            <span>Indication of value (not a certified appraisal)</span>
          </div>
        </div>
      </section>

      {/* ---------- DIFFERENTIATOR ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            We Underwrite Deals for Buyers.
            <span className="block text-teal-300">We Know Exactly What Kills Them.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-slate-300">
            Most valuations are built from the seller&apos;s side only. Ours are built
            by the team that runs buy-side underwriting every day — so your report
            reflects how acquirers and their lenders will actually read your business,
            not just what a formula says.
          </p>
          <div className="mx-auto mt-9 max-w-2xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-4">
            <p className="text-sm leading-relaxed text-amber-200/90">
              The difference between your asking price and the buyer&apos;s offer is
              usually decided inside normalization, financeability, and diligence
              readiness — before negotiation even starts.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- WHAT WE ANALYZE ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
              What We Analyze
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              NexTax.AI Exit Intelligence
            </h2>
            <p className="mt-4 text-slate-300">
              We apply institutional-style underwriting discipline to your side of the deal.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {analyzeGrid.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/50 p-5">
                <Check className="mt-0.5 text-emerald-400" />
                <span className="text-sm leading-relaxed text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- STEP BEFORE THE BROKER ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            We&apos;re the Step Before the Broker.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-teal-300">
            Know your number, fix your detractors, and prepare for diligence — before
            you list, before buyers set the narrative.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm">
            {["Thinking about it", "Value Snapshot", "Optimization", "Pre-Sale Readiness", "Go to market", "Close"].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span
                  className={
                    i === 1 || i === 2 || i === 3
                      ? "rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 font-medium text-emerald-300"
                      : "rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-slate-400"
                  }
                >
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-slate-600">›</span>}
              </span>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-white/10 bg-slate-900/50 p-6">
            <p className="text-sm leading-relaxed text-slate-300">
              We are not a business broker and this is not a certified appraisal.
              We help you decide whether to:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {["Sell now", "Improve first, sell later", "Reset your price expectations", "Hold and build value"].map((o) => (
                <div key={o} className="rounded-lg border border-white/5 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200">
                  {o}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- WHAT YOU RECEIVE ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">What You Receive</h2>
          <p className="mt-3 text-center text-slate-400">Deliverables scale with the tier you choose:</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {receive.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-white/5 bg-slate-900/50 p-6">
                <h3 className="font-semibold text-emerald-300">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm italic text-slate-400">
            Our goal is clarity — an honest number, honestly sourced.
          </p>
        </div>
      </section>

      {/* ---------- IDEAL FOR / NOT DESIGNED FOR ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">Who This Is For</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-300">
            Built for Michigan owner-operators of businesses roughly $300K–$10M in value.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent p-7">
              <h3 className="font-bold text-emerald-300">Ideal for:</h3>
              <ul className="mt-4 space-y-3">
                {[
                  "Owners 1–5 years from a planned exit",
                  "Owners fielding unsolicited buyer interest",
                  "Owners who want the number before talking to brokers",
                  "Partners planning buyouts or succession",
                  "Service, trades, manufacturing, and local businesses",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="mt-0.5 text-emerald-400" />{x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-7">
              <h3 className="font-bold text-slate-300">Not designed for:</h3>
              <ul className="mt-4 space-y-3">
                {[
                  "Court-defensible valuation opinions",
                  "Tax reporting, gift & estate, or ESOP valuations",
                  "Audit or attestation services",
                  "Legal structuring advice or purchase agreements",
                  "Formal fairness opinions",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-3 text-sm text-slate-400">
                    <Cross />{x}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-slate-500">
                Where these are needed, we&apos;ll say so plainly and help you find the
                right credentialed specialist or legal counsel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">Engagement Options</h2>
          <p className="mt-3 text-center text-slate-400">
            Pricing depends on business size, financial complexity, and timeline.
          </p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={
                  t.highlight
                    ? "relative flex flex-col rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-600/25 via-teal-600/15 to-slate-900/60 p-7"
                    : "relative flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-7"
                }
              >
                {t.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1 text-xs font-bold text-slate-950">
                    {t.badge}
                  </span>
                )}
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Starting at</p>
                <p className="mt-2 text-4xl font-bold">{t.price}</p>
                <h3 className="mt-3 text-lg font-bold text-slate-100">{t.name}</h3>
                <p className="mt-1 text-sm italic text-slate-400">{t.tagline}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className="mt-0.5 text-emerald-400" />{f}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs text-slate-500">{t.footnote}</p>
                <div className="mt-6 space-y-3">
                  <Link
                    href="/contact"
                    className="flex w-full items-center justify-center rounded-lg border border-white/15 bg-slate-950/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    Book Intro Call
                  </Link>
                  <Link
                    href="/contact"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    Get Started <Arrow />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
            Every engagement delivers an indication of value with a fully disclosed
            assumptions register — every market input sourced and dated. No black-box
            numbers.
          </p>
        </div>
      </section>

      {/* ---------- BUILT BY ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Built by a CPA &amp; M&amp;A Operator</h2>
          <p className="mt-5 leading-relaxed text-slate-300">
            Steve Morello is a CPA with Big Four M&amp;A tax experience who runs
            buy-side acquisition underwriting through NexTax.AI and AcquiFlow. Sell-side
            clients get the same discipline, pointed the other direction: your business,
            analyzed the way the buyer&apos;s side will analyze it.
          </p>
          <p className="mt-4 text-sm italic text-teal-300">
            The goal: owners who walk into a sale knowing their number — and knowing it will hold up.
          </p>
          <Link
            href="/about"
            className="mt-7 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            Learn More About Steve
          </Link>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-10 text-center">
            <h2 className="text-3xl font-bold text-white">
              Know Your Number Before the Market Sets It for You.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-50/90">
              Start with a Snapshot, or book a call and we&apos;ll tell you which tier
              actually fits — including &quot;none yet.&quot;
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Book Intro Call <Arrow />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Discuss Your Exit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CROSS-SELL STRIP (D5) ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center">
          <p className="text-sm text-slate-400">
            Buying instead of selling?{" "}
            <Link href="/buy-side-advisory" className="font-semibold text-teal-300 transition hover:text-teal-200">
              See Buy-Side Advisory →
            </Link>
          </p>
        </div>
      </section>

      {/* ---------- DISCLAIMER ---------- */}
      <section className="border-t border-white/5 pb-16">
        <div className="mx-auto max-w-4xl px-6 pt-10">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-400">Important:</span> NexTax.AI
            provides business advisory and financial analysis services only. All value
            indications are prepared for planning and transaction-readiness purposes
            and are not certified business appraisals, conclusions of value under
            AICPA SSVS No. 1, or appraisals under USPAP, and should not be used for
            tax reporting, litigation, or financial reporting purposes. NexTax.AI is
            not a business broker and does not provide legal advice; clients should
            engage qualified legal counsel for legal matters, including purchase
            agreements and regulatory compliance.
          </p>
        </div>
      </section>
    </main>
  );
}
