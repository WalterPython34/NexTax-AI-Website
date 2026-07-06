// app/sell/thinking-about-selling/page.tsx
// NexTax.AI — Sell-Side funnel, page 1 of 3 (top of funnel → Business Value Snapshot)
// Self-contained: no component imports, inline SVG icons, Tailwind only.
// Assumes shared nav/footer come from the root layout.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thinking About Selling Your Business? | NexTax.AI",
  description:
    "Find out what your business is worth — and what buyers will actually pay — before you're at the negotiating table. Business Value Snapshot from $495.",
};

/* ---------- inline icons (no external deps) ---------- */
const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`h-5 w-5 flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" opacity="0.35" /><path d="m9 12 2 2 4-4" />
  </svg>
);
const Warn = ({ className = "" }: { className?: string }) => (
  <svg className={`h-5 w-5 flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
const Arrow = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

/* ---------- page ---------- */
export default function ThinkingAboutSellingPage() {
  const buyerPriced = [
    {
      title: "Normalized earnings — not your P&L",
      body: "Buyers reprice your earnings after adjusting owner compensation, personal expenses, one-time items, and related-party arrangements. The number they use is rarely the number you see.",
    },
    {
      title: "Customer concentration",
      body: "A top customer above ~20% of revenue shows up as a discount to your multiple, an earn-out, or a holdback — often all three.",
    },
    {
      title: "Owner dependence",
      body: "If the business is you — key relationships, key decisions, key knowledge — buyers price the transition risk, not the trailing cash flow.",
    },
    {
      title: "Quality of your records",
      body: "Clean, reconciled, CPA-ready financials raise buyer confidence. Records that can't survive diligence quietly cost more than any adjustment.",
    },
  ];

  const snapshot = [
    "An estimated value range for your business — low / mid / high",
    "The multiple applied and what's driving it",
    "Comparable transactions in your industry and size band",
    "Your biggest strengths — and your biggest value detractors",
    "Clear next steps, whether you sell in one year or five",
  ];

  const timeline = [
    {
      when: "2–3 years out",
      what: "The best time to find out. Every value detractor is still fixable — concentration, records, owner dependence, margins.",
      tone: "emerald",
    },
    {
      when: "1 year out",
      what: "Still time to fix the fast things: financial records, add-back documentation, working capital discipline.",
      tone: "teal",
    },
    {
      when: "At market",
      what: "The number is the number. Buyers price what they see — and their underwriters look for exactly the issues above.",
      tone: "amber",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0e17] text-slate-100 antialiased">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-teal-300">
            For Business Owners
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Thinking About Selling?
            <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Find Out What It&apos;s Worth First.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Most owners learn what their business is really worth at the negotiating
            table — after it&apos;s too late to change the answer. A Business Value
            Snapshot tells you now, while every detractor is still fixable.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Get Your Value Snapshot <Arrow />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-7 py-3.5 font-semibold text-slate-200 transition hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Book a 15-Minute Intro Call
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Snapshots start at <span className="font-semibold text-slate-200">$495</span>. Confidential. No listing, no commitment.
          </p>
        </div>
      </section>

      {/* ---------- WHAT BUYERS ACTUALLY PRICE ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-300">
              The Buyer&apos;s Lens
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              We Underwrite Deals for Buyers Every Day.
              <span className="block text-teal-300">Here&apos;s What They Actually Price.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Your asking price starts with your P&amp;L. The buyer&apos;s offer starts
              with their underwriting. These four things decide the gap between the two.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {buyerPriced.map((item) => (
              <div key={item.title} className="rounded-xl border border-white/5 bg-slate-900/50 p-6">
                <div className="flex items-start gap-3">
                  <Warn className="mt-0.5 text-amber-400" />
                  <div>
                    <h3 className="font-semibold text-slate-100">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- WHAT A SNAPSHOT ANSWERS ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                The Business Value Snapshot
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                A concise, owner-friendly report that answers the question you
                actually have: <em className="text-teal-300 not-italic font-medium">
                &quot;Approximately what is my business worth — and why?&quot;</em>
              </p>
              <ul className="mt-7 space-y-3.5">
                {snapshot.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-slate-300">
                    <Check className="mt-0.5 text-emerald-400" />
                    <span className="text-sm leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-xs leading-relaxed text-slate-500">
                An indication of value for planning purposes — not a certified
                appraisal or a conclusion of value under AICPA SSVS No. 1.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-b from-slate-900/80 to-slate-900/40 p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Starting at</p>
              <p className="mt-2 text-5xl font-bold">$495</p>
              <p className="mt-3 text-sm text-slate-400">
                Priced by size and complexity, up to $995. Delivered as a clean,
                board-ready PDF with a walkthrough call.
              </p>
              <Link
                href="/contact"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                Get Started <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TIMELINE ---------- */}
      <section className="border-t border-white/5 bg-[#0c1120]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            When Should You Find Out?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-300">
            Value isn&apos;t fixed at the moment you sell — it&apos;s built in the
            years before. The earlier you know the number, the more of it you control.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {timeline.map((t) => (
              <div key={t.when} className="rounded-xl border border-white/5 bg-slate-900/50 p-6">
                <p
                  className={
                    t.tone === "emerald"
                      ? "text-sm font-bold uppercase tracking-wider text-emerald-400"
                      : t.tone === "teal"
                      ? "text-sm font-bold uppercase tracking-wider text-teal-400"
                      : "text-sm font-bold uppercase tracking-wider text-amber-400"
                  }
                >
                  {t.when}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{t.what}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/sell/get-market-ready" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-300 transition hover:text-teal-200">
              Already planning to sell? See how to get market-ready <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- CTA PANEL ---------- */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-10 text-center">
            <h2 className="text-3xl font-bold text-white">
              Know Your Number Before a Buyer Tells You Theirs.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-50/90">
              Confidential, owner-friendly, and built by the team that underwrites
              acquisitions for the other side of the table.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Get Your Value Snapshot <Arrow />
              </Link>
              <Link
                href="/sell/sell-side-advisory"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                See All Sell-Side Services
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
            provides business advisory and financial analysis services only. A Business
            Value Snapshot is an indication of value for planning purposes and is not a
            certified business appraisal, a conclusion of value under AICPA SSVS No. 1,
            or an appraisal under USPAP, and should not be used for tax reporting,
            litigation, or financial reporting purposes. NexTax.AI does not provide
            legal advice; consult qualified legal counsel for legal matters.
          </p>
        </div>
      </section>
    </main>
  );
}
