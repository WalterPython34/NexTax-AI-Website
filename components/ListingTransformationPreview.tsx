"use client"

// components/ListingTransformationPreview.tsx
//
// Conversion asset: shows a messy broker-style listing transformed into a
// structured underwriting memo. Designed as a 3-second hook — the After side
// feels visibly more polished than the Before side.
//
// Drop-in anywhere. No required props. Zero external state.
//
// Visual strategy:
//   LEFT  (Before) — cramped, monospaced, slightly cluttered, muted slate
//   RIGHT (After)  — structured grid, emerald accents, scale-105, brighter
//   MIDDLE        — subtle arrow indicator (desktop only)

import React from "react"

export interface ListingTransformationPreviewProps {
  /** Optional CTA handlers. If omitted, the component renders without CTAs. */
  onAnalyzeDeal?: () => void
  onViewMemo?:    () => void
  /** Optional class for outer container (margin/padding tuning by parent). */
  className?:     string
}

export function ListingTransformationPreview({
  onAnalyzeDeal,
  onViewMemo,
  className = "",
}: ListingTransformationPreviewProps) {
  return (
    <section className={`w-full ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Section header ────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mb-5">
            Before / After
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Know if a deal is worth buying <span className="text-emerald-400">&mdash; before you commit capital</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            From broker listings to pricing, risk, and lender-ready decisions in minutes.
          </p>
          <p className="text-xs uppercase tracking-wider text-emerald-400/80 font-semibold mt-5">
            Takes ~60 seconds to generate
          </p>
        </div>

        {/* ─── Comparison grid ───────────────────────────────────────── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1.05fr] gap-6 lg:gap-4 items-stretch">

          {/* ─── LEFT — BEFORE ─────────────────────────────────────── */}
          <div className="relative rounded-xl border border-slate-700/60 bg-slate-900/60 p-6 sm:p-7 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-2 py-0.5 rounded border border-slate-700/80 bg-slate-900/50">
                Before
              </span>
              <span className="text-[10px] text-slate-600">Raw broker listing</span>
            </div>

            {/* Listing — copy-paste-from-email feel, intentionally uncomfortable */}
            <div className="font-mono text-[12.5px] leading-[1.5] text-slate-500">
              <p className="text-slate-400 font-semibold mb-1.5">
                Specialty Trade business in Texas
              </p>
              <p>Asking: $2,450,000</p>
              <p>Cash flow: $780,000</p>
              <p>Owner retiring</p>
              <p>Experienced staff in place</p>
              <p>Strong margins</p>
              <p>Great growth opportunity</p>
              <p className="text-slate-600 italic mt-1">
                &ldquo;Seller says business is recession resistant&rdquo;
              </p>
              <div className="pt-2.5 mt-2.5 border-t border-slate-700/40">
                <p className="text-[10.5px] text-slate-600">
                  &mdash; contact broker for financials &mdash;
                </p>
              </div>
            </div>

            {/* Pain-point footer — why this isn't enough */}
            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-400/80 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="text-[11px] text-amber-400/90 leading-relaxed">
                No multiples. No benchmarks. No financing view. No decision.
              </div>
            </div>
          </div>

          {/* ─── MIDDLE — Arrow indicator (desktop only) ──────────── */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 font-semibold">
                AcquiFlow
              </span>
            </div>
          </div>

          {/* Mobile arrow — between cards */}
          <div className="flex lg:hidden items-center justify-center -my-2">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 13l7 7 7-7" />
                </svg>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-emerald-500/70 font-semibold">
                AcquiFlow
              </span>
            </div>
          </div>

          {/* ─── RIGHT — AFTER ─────────────────────────────────────── */}
          <div className="relative rounded-xl border border-emerald-500/40 bg-slate-900/60 p-6 sm:p-7 shadow-xl shadow-emerald-500/5 lg:scale-[1.02]">
            {/* Subtle inner glow on top edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10">
                After
              </span>
              <span className="text-[10px] text-emerald-400/80 font-medium">
                Structured underwriting output
              </span>
            </div>

            {/* Verdict chip — actionable framing, not internal jargon */}
            <div className="flex items-center gap-2 mb-5 pb-5 border-b border-slate-700/50">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                IC Verdict
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-bold tracking-wide">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                PROCEED TO DILIGENCE
              </span>
            </div>

            {/* Key metrics — 2x2 grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <Metric label="Adjusted SDE" value="$640K"  sub="−18% normalized" tone="amber" />
              <Metric label="Trust Score"  value="72"     sub="Adjustments material" tone="amber" />
              <Metric label="DSCR"         value="1.28x"  sub="Marginal coverage" tone="amber" />
              <Metric label="Risk"         value="Moderate" sub="3 material flags" tone="amber" />
            </div>

            {/* Financing strip */}
            <div className="mb-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                    Financing
                  </div>
                  <div className="text-xs text-slate-200">
                    Possible &mdash; conditional on documentation
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-400 uppercase tracking-wider">
                  Conditional
                </span>
              </div>
            </div>

            {/* Offer strategy strip */}
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/25">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                Offer Range
              </div>
              <div className="text-sm text-slate-100 font-mono tracking-tight">
                <span className="text-emerald-400 font-bold">$1.8M</span>
                <span className="text-slate-500 mx-1.5">–</span>
                <span className="text-emerald-400 font-bold">$2.1M</span>
                <span className="text-[10px] text-slate-500 ml-2">(2.85x–3.3x adj. SDE)</span>
              </div>
            </div>

            {/* Red flags + diligence questions */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/25">
                <div className="text-[9px] uppercase tracking-wider text-red-400 font-bold mb-1">
                  2 Red Flags
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  Customer concentration
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  Add-back exposure
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/25">
                <div className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold mb-1">
                  2 Diligence Q&apos;s
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  Top-customer revenue %
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  Add-back substantiation
                </div>
              </div>
            </div>

            {/* ── HARD CONCLUSION BANNER — clarity beats analysis ─────── */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/40">
                <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-amber-400/80 font-bold mb-1">
                    Bottom line
                  </div>
                  <div className="text-sm font-bold text-amber-100 leading-snug">
                    Proceed with caution &mdash; pricing needs adjustment.
                  </div>
                  <div className="text-[11px] text-amber-200/70 leading-relaxed mt-1">
                    Renegotiate to $1.8M&ndash;$2.1M and require add-back substantiation before LOI.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CTAs ──────────────────────────────────────────────────── */}
        {(onAnalyzeDeal || onViewMemo) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-12">
            {onAnalyzeDeal && (
              <button
                type="button"
                onClick={onAnalyzeDeal}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors w-full sm:w-auto"
              >
                Analyze a Real Deal
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {onViewMemo && (
              <button
                type="button"
                onClick={onViewMemo}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/15 font-semibold text-sm transition-colors w-full sm:w-auto"
              >
                View Full Investment Memo
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Metric tile — used in the After grid ───────────────────────────────────
function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub:   string
  tone:  "amber" | "emerald" | "slate"
}) {
  const valueColor =
    tone === "amber"   ? "text-amber-400" :
    tone === "emerald" ? "text-emerald-400" :
                         "text-slate-200"
  return (
    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${valueColor}`}>
        {value}
      </div>
      <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">
        {sub}
      </div>
    </div>
  )
}

export default ListingTransformationPreview
