// components/ProLockOverlay.tsx
"use client";

import React from "react";

export interface ProLockOverlayProps {
  /** Bold headline inside the lock card — e.g. "You're likely overpaying" */
  headline?:   string;
  /** Supporting sentence below the headline */
  subtext?:    string;
  /** Primary CTA button label */
  ctaLabel?:   string;
  /** Feature bullets */
  bullets?:    string[];
  /** Called when user clicks CTA — parent decides what unlock means */
  onUnlock:    () => void;
  /** Footer note beneath the button */
  footerNote?: string;
}

export function ProLockOverlay({
  headline   = "Unlock Full Deal Underwriting",
  subtext,
  ctaLabel   = "Unlock Full Analysis →",
  bullets    = [
    "Adjusted SDE (true earnings)",
    "Risk flags & trust score",
    "Market comps & percentile",
    "Negotiation strategy",
  ],
  onUnlock,
  footerNote = "1 free unlock available · Upgrade to Pro for unlimited access",
}: ProLockOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto mx-4 w-full max-w-[300px] rounded-2xl border border-indigo-500/25 bg-[rgba(8,12,19,0.96)] p-5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.55)]">

        {/* Lock icon */}
        <div className="mb-2 text-xl">🔒</div>

        {/* Headline */}
        <p className="mb-1 font-['Inter_Tight',sans-serif] text-[14px] font-bold leading-snug text-slate-100">
          {headline}
        </p>

        {/* Subtext */}
        {subtext && (
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            {subtext}
          </p>
        )}

        {/* Feature bullets */}
        <ul className="mb-4 space-y-1 text-left">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2 text-[11px] text-slate-400">
              <span className="mt-px shrink-0 text-indigo-400">✓</span>
              {b}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onUnlock}
          className="mb-1.5 w-full rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          {ctaLabel}
        </button>

        {/* Footer */}
        {footerNote && (
          <p className="text-[10px] text-slate-600">{footerNote}</p>
        )}
      </div>
    </div>
  );
}

export default ProLockOverlay;
