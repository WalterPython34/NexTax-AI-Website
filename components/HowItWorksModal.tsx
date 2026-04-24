"use client";

// components/HowItWorksModal.tsx
//
// Decision-workflow guide modal for AcquiFlow. Opens from the
// "How to Evaluate a Deal" button on the buyer-dashboard Home hero.

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
  onAnalyzeDeal?: () => void;
}

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
    title: "Normalize Earnings (SDE \u2192 True Cash Flow)",
    body:  "Aggressive add-backs are flagged, owner compensation is adjusted to market, and true lender-relevant cash flow is calculated \u2014 the earnings basis an underwriter would actually accept.",
  },
  {
    n: 3,
    icon:  TrendingDown,
    title: "Stress Test Financing (DSCR & Downside)",
    body:  "Model SBA loan structure, DSCR under multiple scenarios, and downside compression \u2014 what coverage looks like if revenue drops 10%, 15%, or 20% post-close.",
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
    body:  "Output a structured IC-grade memo \u2014 clean summary, identified risks, normalization bridge, financing outlook \u2014 formatted the way a lender or buy-side advisor expects to read it.",
  },
  {
    n: 6,
    icon:  CheckCircle,
    title: "Make a Go / No-Go Decision",
    body:  "Receive a defensible verdict: Proceed, Renegotiate, or Walk Away. Every recommendation is backed by the specific metrics, benchmarks, and red flags that drove it.",
  },
];

export function HowItWorksModal({ open, onClose, onAnalyzeDeal }: HowItWorksModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  const handleAnalyzeClick = () => {
    onClose();
    if (onAnalyzeDeal) {
      setTimeout(() => onAnalyzeDeal(), 180);
    }
  };

  if (!open) return null;

  // ─── Inline style fallbacks — bypass styled-jsx to avoid SWC issues ────────
  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 500,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    animation: "nxtax-fade-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const modalWrapperStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 501,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16, pointerEvents: "none",
  };

  const modalBodyStyle: React.CSSProperties = {
    pointerEvents: "auto",
    width: "100%", maxWidth: 768, maxHeight: "88vh",
    display: "flex", flexDirection: "column",
    borderRadius: 16,
    background: "#0F172A", border: "1px solid rgba(51, 65, 85, 0.8)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
    overflow: "hidden",
    animation: "nxtax-modal-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  return (
    <>
      <div onClick={onClose} style={overlayStyle} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-labelledby="how-it-works-title" style={modalWrapperStyle}>
        <div style={modalBodyStyle} onClick={(e) => e.stopPropagation()}>

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-7 pt-6 pb-5 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mb-2.5">
                Decision workflow
              </div>
              <h2 id="how-it-works-title" className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
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
                  <div key={step.n} className="flex gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {step.n}
                      </div>
                      <Icon className="w-4 h-4 text-emerald-400/70" />
                    </div>
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
                &ldquo;Most deals don&rsquo;t fail because they&rsquo;re bad &mdash; they fail because they weren&rsquo;t properly underwritten.&rdquo;
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

      {/* Animations — injected via standard <style> tag (no styled-jsx) */}
      <style>{`@keyframes nxtax-fade-in{from{opacity:0}to{opacity:1}}@keyframes nxtax-modal-in{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HowItWorksButton
// ═══════════════════════════════════════════════════════════════════════════

interface HowItWorksButtonProps {
  className?:     string;
  variant?:       "primary" | "secondary";
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
        className={"inline-flex items-center justify-center gap-2 px-[18px] py-[11px] rounded-[9px] text-[13px] font-medium cursor-pointer transition-colors " + styles + " " + className}
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
