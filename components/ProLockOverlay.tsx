// components/ProLockOverlay.tsx
// Standalone paywall overlay — renders on top of blurred content.
// Receives all config as props — no business logic, no API calls.
// Import alongside BlurGateSection for the full gate pattern.

"use client";

import React from "react";

export interface ProLockOverlayProps {
  /** Primary CTA label shown on the upgrade button */
  ctaLabel?:    string;
  /** Feature bullets shown in the paywall card */
  bullets?:     string[];
  /** Called when user clicks the CTA — parent decides what "unlock" means */
  onUnlock:     () => void;
  /** Secondary note shown beneath the button */
  footerNote?:  string;
}

export function ProLockOverlay({
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
      <div
        className="pointer-events-auto mx-4 w-full max-w-[290px] rounded-2xl border border-indigo-500/25 bg-[rgba(8,12,19,0.96)] p-5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
      >
        {/* Lock icon */}
        <div className="mb-2 text-xl">🔒</div>

        {/* Title */}
        <p className="mb-2 font-['Inter_Tight',sans-serif] text-sm font-bold leading-snug text-slate-100">
          Unlock Full Deal Underwriting
        </p>

        {/* Feature bullets */}
        <ul className="mb-4 space-y-1 text-left">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2 text-[11px] text-slate-400">
              <span className="mt-px shrink-0 text-indigo-400">✓</span>
              {b}
            </li>
          ))}
        </ul>

        {/* CTA button */}
        <button
          onClick={onUnlock}
          className="mb-1.5 w-full rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          {ctaLabel}
        </button>

        {/* Footer note */}
        {footerNote && (
          <p className="text-[10px] text-slate-600">{footerNote}</p>
        )}
      </div>
    </div>
  );
}

export default ProLockOverlay;
