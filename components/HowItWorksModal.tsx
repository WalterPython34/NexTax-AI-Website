"use client";

// components/HowItWorksModal.tsx
//
// Decision-workflow guide modal for AcquiFlow. Opens from the
// "How to Evaluate a Deal" button on the buyer-dashboard Home hero.
//
// Content is written in institutional-underwriting voice — this is a deal
// evaluation workflow, not a generic SaaS onboarding tutorial.

import React, { useEffect, useCallback, useState } from "react";
import {
  X,
  Clipboard,
  Calculator,
  TrendingDown,
  BarChart,
  FileText,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface HowItWorksModalProps {
  open:           boolean;
  onClose:        () => void;
  /** Optional — called when user clicks "Try it on a real deal". Usually
   *  closes the modal and opens the Analyze Deal flow. If not provided,
   *  the CTA falls back to closing the modal only. */
  onAnalyzeDeal?: () => void;
}

// ── Step data — 6 sections of the underwriting workflow ─────────────────────
const STEPS = [
  {
    n: 1,
    icon:  Clipboard,
    title: "Capture Deal Inputs",
    body:  "Enter asking price, revenue, cash flow (SDE), and industry. The system immediately structures the deal and benchmarks it against real closed transactions in that segment.",
  },
  {
    n: 2,
    icon:  Calculator,
    title: "Normalize Earnings (SDE → True Cash Flow)",
    body:  "Aggressive add-backs are flagged, owner compensation is adjusted to market, and true lender-relevant cash flow is calculated — the earnings basis an underwriter would actually accept.",
  },
  {
    n: 3,
    icon:  TrendingDown,
    title: "Stress Test Financing (DSCR & Downside)",
    body:  "Model SBA loan structure, DSCR under multiple scenarios, and downside compression — what coverage looks like if revenue drops 10%, 15%, or 20% post-close.",
  },
  {
    n: 4,
    icon:  BarChart,
    title: "Benchmark Against Real Transactions",
    body:  "Compare the deal's multiple, margin, and risk profile against the peer universe. See exactly where this transaction sits in the distribution of comparable closed deals.",
  },
  {
    n: 5,
    icon:  FileText,
    title: "Generate Lender-Ready Summary",
    body:  "Output a structured IC-grade memo — clean summary, identified risks, normalization bridge, financing outlook — formatted the way a lender or buy-side advisor expects to read it.",
  },
  {
    n: 6,
    icon:  CheckCircle,
    title: "Make a Go / No-Go Decision",
    body:  "Receive a defensible verdict: Proceed, Renegotiate, or Walk Away. Every recommendation is backed by the specific metrics, benchmarks, and red flags that drove it.",
  },
];

export function HowItWorksModal({ open, onClose, onAnalyzeDeal }: HowItWorksModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key to close
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  // Handle CTA click — fire analyze callback if provided, then close
  const handleAnalyzeClick = () => {
    onClose();
    if (onAnalyzeDeal) {
      // Tiny delay so the close animation reads before the next modal opens
      setTimeout(() => onAnalyzeDeal(), 180);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        className="fixed inset-0 z-[501] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="
            pointer-events-auto
            w-full max-w-3xl max-h-[88vh]
            flex flex-col
            rounded-2xl
            bg-slate-900 border border-slate-700/80
            shadow-2xl shadow-black/50
            overflow-hidden
            animate-modal-in
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-7 pt-6 pb-5 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mb-2.5">
                Decision workflow
              </div>
              <h2
                id="how-it-works-title"
                className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight"
              >
                How to Evaluate a Deal
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Used by SMB buyers to evaluate deals before LOI and underwriting.
              </p>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Quickly identify overpriced, risky, or poorly structured deals before committing time or capital.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-7 py-6">
            <div className="space-y-4">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.n}
                    className="flex gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 transition-colors"
                  >
                    {/* Numbered circle + icon stack */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {step.n}
                      </div>
                      <Icon className="w-4 h-4 text-emerald-400/70" />
                    </div>
                    {/* Title + body */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug mb-1.5">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Closing callout quote */}
            <div className="mt-7 p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30">
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed text-center italic">
                &ldquo;Most deals don&rsquo;t fail because they&rsquo;re bad —
                they fail because they weren&rsquo;t properly underwritten.&rdquo;
              </p>
            </div>

            {/* Primary CTA */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleAnalyzeClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
              >
                Try it on a real deal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animation keyframes — scoped to this component */}
      <style jsx global>{`
        @keyframes nxtax-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes nxtax-modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in  { animation: nxtax-fade-in  180ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        .animate-modal-in { animation: nxtax-modal-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1); }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HowItWorksButton — drop this wherever the button is needed.
// ═══════════════════════════════════════════════════════════════════════════

interface HowItWorksButtonProps {
  /** Optional extra Tailwind classes for layout tuning. */
  className?: string;
  /** primary = emerald filled; secondary = subtle matches "View sample" button. */
  variant?:  "primary" | "secondary";
  /** Optional — wire to the parent's onAnalyze handler to open Analyze Deal flow. */
  onAnalyzeDeal?: () => void;
}

export function HowItWorksButton({
  className = "",
  variant   = "secondary",
  onAnalyzeDeal,
}: HowItWorksButtonProps) {
  const [open, setOpen] = useState(false);

  const styles = variant === "primary"
    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
    : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/10";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-[18px] py-[11px] rounded-[9px] text-[13px] font-medium cursor-pointer transition-colors ${styles} ${className}`}
      >
        How to Evaluate a Deal
      </button>
      <HowItWorksModal
        open={open}
        onClose={() => setOpen(false)}
        onAnalyzeDeal={onAnalyzeDeal}
      />
    </>
  );
}

export default HowItWorksModal;
