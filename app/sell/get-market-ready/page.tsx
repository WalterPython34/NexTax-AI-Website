// app/sell/get-market-ready/page.tsx
// NexTax.AI — Sell-Side funnel, page 2 of 3 (mid-funnel → Value Optimization / Pre-Sale Readiness)
// Self-contained: no component imports, inline SVG icons, Tailwind only.
// Assumes shared nav/footer come from the root layout.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Get Your Business Market-Ready | NexTax.AI",
  description:
    "The gap between what you think your business is worth and what a buyer will pay lives in normalization and readiness. Close it before you go to market.",
};

/* ---------- inline icons ---------- */
const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`h-5 w-5 flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" opacity="0.35" /><path d="m9 12 2 2 4-4" />
  </svg>
);
const Arrow = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);
const Eye = () => (
  <svg className="h-5 w-5 flex-shrink-0 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

export default function GetMarketReadyPage() {
  const lensItems = [
    {
      q: "How credible are the reported earnings?",
      a: "Underwriters rebuild your earnings from source documents. Undocumented add-backs don't count — and they take neighboring add-backs down with them.",
    },
    {
      q: "Would the cash flow support acquisition financing?",
      a: "Most Main Street deals are SBA-financed. If your normalized cash flow can't cover the buyer's debt service with room to spare, your price gets repriced by the lender.",
    },
    {
      q: "What are the biggest diligence questions?",
      a: "Every open question extends diligence, and time kills deals. Answering them before you list is the cheapest deal insurance there is.",
    },
    {
      q: "Which issues will surface in negotiation?",
      a: "Concentration, owner dependence, and working capital gaps become earn-outs, holdbacks, and price adjustments — unless they're addressed first.",
    },
  ];

  const readiness = [
    ["Financial records", "Reconciled, consistent, and documented — every add-back with support behind it."],
    ["Customer concentration", "A plan (and progress) on reducing dependence on any single relationship."],
    ["Owner dependence", "Documented processes and a credible transition story a buyer can underwrite."],
    ["Working capital", "A defensible view of the normal level the business needs — before the buyer defines it for you."],
    ["Data room readiness", "The documents a serious buyer will ask for in week one, organized before they ask."],
  ];

  return (
    <main className="min-h-screen bg-[#0a0e17] text-slate-100 antialiased">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(13,148,136,0.1),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-teal-300">
            For Owners Preparing to Sell
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Get Your Business
            <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Market-Ready.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            The gap between what you think your business is worth and what a buyer
            will actually pay lives in two places: normalization and readiness.
            Both are fixable — before you go to market.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Book a 15-Minute Intro Call <Arrow />
            </Link>
            <Link
              href="/sell/sell-side-advisory"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-7 py-3.5 font-semibold text-slate-200 transition hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              See Services &amp; Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- THE BUYER'S LENS, FLIPPED ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
              The Buyer&apos;s Lens, Flipped
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              This Is How a Buyer&apos;s Underwriter
              <span className="block text-teal-300">Will Read Your Business.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              We underwrite acquisitions for buyers. Getting market-ready means
              answering their four questions before they ask them.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {lensItems.map((item) => (
              <div key={item.q} className="rounded-xl border border-white/5 bg-slate-900/50 p-6">
                <div className="flex items-start gap-3">
                  <Eye />
                  <div>
                    <h3 className="font-semibold text-slate-100">{item.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ILLUSTRATIVE NORMALIZATION MATH (mechanics demo) ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-teal-300">
              Why Normalization Moves the Number
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              A Multiple Applies to Every Normalized Dollar.
            </h2>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
            <div className="border-b border-white/5 bg-slate-900/80 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Illustrative math — round numbers, not a client result
              </p>
            </div>
            <div className="grid divide-y divide-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-7">
                <p className="text-sm font-semibold text-slate-400">As reported</p>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-400">Seller&apos;s discretionary earnings</dt><dd className="font-semibold text-slate-200">$400,000</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Undocumented add-backs</dt><dd className="font-semibold text-amber-400">rejected in diligence</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Multiple applied</dt><dd className="font-semibold text-slate-200">2.5x</dd></div>
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-3"><dt className="font-semibold text-slate-300">Indicated value</dt><dd className="text-lg font-bold text-slate-100">$1,000,000</dd></div>
                </dl>
              </div>
              <div className="bg-gradient-to-b from-emerald-500/10 to-transparent p-7">
                <p className="text-sm font-semibold text-emerald-300">Normalized &amp; documented</p>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-400">Normalized SDE, add-backs supported</dt><dd className="font-semibold text-slate-200">$450,000</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Diligence risk</dt><dd className="font-semibold text-emerald-400">addressed pre-market</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Multiple applied</dt><dd className="font-semibold text-slate-200">2.5x</dd></div>
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-3"><dt className="font-semibold text-slate-300">Indicated value</dt><dd className="text-lg font-bold text-emerald-300">$1,125,000</dd></div>
                </dl>
              </div>
            </div>
            <div className="border-t border-white/5 px-6 py-4">
              <p className="text-xs leading-relaxed text-slate-500">
                The mechanics, not a promise: every documented dollar of normalized
                earnings is multiplied, and every unresolved risk is discounted,
                structured around, or negotiated against. Your actual figures,
                adjustments, and multiple depend entirely on your business and market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- READINESS CHECKLIST TEASER ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            What &quot;Market-Ready&quot; Actually Means
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-300">
            Five areas decide how your business survives underwriting. We assess all
            five, then build a prioritized roadmap — each improvement tied to how it
            affects buyer confidence and value.
          </p>
          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {readiness.map(([title, body]) => (
              <div key={title} className="flex items-start gap-4 rounded-xl border border-white/5 bg-slate-900/50 p-5">
                <Check className="mt-0.5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-slate-100">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA PANEL ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-10 text-center">
            <h2 className="text-3xl font-bold text-white">
              Fix It Before the Buyer Prices It.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-50/90">
              A Value Optimization Review shows you exactly what a buyer&apos;s
              underwriter will find — and a roadmap to fix it while there&apos;s
              still time.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Book Intro Call <Arrow />
              </Link>
              <Link
                href="/sell/sell-side-advisory"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                See Services &amp; Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- DISCLAIMER ---------- */}
      <section className="border-t border-white/5 pb-16">
        <div className="mx-auto max-w-4xl px-6 pt-10">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-400">Important:</span> NexTax.AI
            provides business advisory and financial analysis services only. Value
            indications are for planning purposes and are not certified business
            appraisals, conclusions of value under AICPA SSVS No. 1, or appraisals
            under USPAP, and should not be used for tax reporting, litigation, or
            financial reporting purposes. Illustrations on this page show calculation
            mechanics with round numbers and are not client results or predictions.
            NexTax.AI does not provide legal advice; consult qualified legal counsel
            for legal matters.
          </p>
        </div>
      </section>
    </main>
  );
}
