// components/BlurGateSection.tsx
// Freemium gate wrapper for underwriting panel tab content.
//
// Structure (free users):
//   ┌─────────────────────────────┐  ← parent tab content area
//   │  ProLockedBanner            │  ← always above, never obscured
//   ├─────────────────────────────┤
//   │  [visible preview block]    │  ← previewHeight px, fully visible
//   │    real content, no blur    │    and clickable/scrollable
//   │    gradient fade at bottom  │
//   ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│  ← blur starts here
//   │  [locked block]             │  ← position:relative container
//   │    blurred content          │
//   │    + ProLockOverlay on top  │  ← overlay only over locked block
//   └─────────────────────────────┘
//
// The overlay is mounted INSIDE the locked block, not over the full wrapper,
// so the visible preview strip is never obstructed.
//
// Interaction contract:
//   - Panel opens normally for ALL users
//   - Tab bar is always clickable for ALL users
//   - Verdict banner, score insights, benchmark panel: always visible
//   - Notes panel: never wrapped here — Notes button always works
//   - Only the locked block below the preview line is gated


"use client";

import React from "react";
import { ProLockOverlay, type ProLockOverlayProps } from "./ProLockOverlay";

export interface BlurGateSectionProps
  extends Omit<ProLockOverlayProps, "onUnlock"> {
  isUnlocked:     boolean;
  onUnlock:       () => void;
  previewHeight?: number;
  children:       React.ReactNode;
}

export function ProLockedBanner() {
  return (
    <div className="mb-3 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-[12px] leading-snug text-indigo-200">
      ⚡ Full underwriting is available in Pro — pricing risk, trust-adjusted
      earnings, comps, and negotiation strategy are partially hidden below.
    </div>
  );
}

export function BlurGateSection({
  isUnlocked,
  onUnlock,
  previewHeight = 220,
  headline,
  subtext,
  ctaLabel,
  bullets,
  footerNote,
  children,
}: BlurGateSectionProps) {
  if (isUnlocked) return <>{children}</>;

  return (
    <div>
      {/* ── 1. Banner — always above, never obscured ── */}
      <ProLockedBanner />

      {/* ── 2. Visible preview block — fully unobstructed ──
              Clips to previewHeight px. Gradient signals "more below".
              No overlay here — preview is 100% accessible. */}
      <div style={{ height: previewHeight, overflow: "hidden", position: "relative" }}>
        <div style={{ pointerEvents: "none" }}>
          {children}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: Math.round(previewHeight * 0.45),
            background: "linear-gradient(to bottom, transparent, rgba(13,17,23,0.97))",
          }}
        />
      </div>

      {/* ── 3. Locked block — blurred + overlay ──
              position:relative contains ProLockOverlay (absolute inset-0)
              so the overlay CANNOT bleed up over the preview above. */}
      <div className="relative overflow-hidden rounded-xl" style={{ minHeight: 200 }}>
        {/* Blurred ghost */}
        <div
          className="pointer-events-none select-none"
          style={{ filter: "blur(7px)", opacity: 0.22 }}
          aria-hidden="true"
        >
          {children}
        </div>
        {/* Solid cover so blurred text isn't legible */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "rgba(13,17,23,0.82)" }}
        />
        {/* Lock overlay — inside locked block only */}
        <ProLockOverlay
          headline={headline}
          subtext={subtext}
          ctaLabel={ctaLabel}
          bullets={bullets}
          footerNote={footerNote}
          onUnlock={onUnlock}
        />
      </div>
    </div>
  );
}

export default BlurGateSection;
