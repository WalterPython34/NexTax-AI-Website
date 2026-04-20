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
  /**
   * Gate is open when true. Pass `canAccessFull` (= isPro || freeUnlocked)
   * not raw `isPro`, so one-time free unlocks are correctly handled.
   */
  isUnlocked:    boolean;
  /** Called when the free user clicks the CTA */
  onUnlock:      () => void;
  /**
   * Height (px) of the visible, unobstructed preview strip at the top.
   * Content below this line is blurred and covered by the lock overlay.
   */
  previewHeight?: number;
  children:      React.ReactNode;
}

// ── Banner shown above gated content ─────────────────────────────────────────
export function ProLockedBanner() {
  return (
    <div className="mb-3 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-[12px] leading-snug text-indigo-200">
      ⚡ Full underwriting is available in Pro — pricing risk, trust-adjusted
      earnings, comps, and negotiation strategy are partially hidden below.
    </div>
  );
}

// ── Main gate component ───────────────────────────────────────────────────────
export function BlurGateSection({
  isUnlocked,
  onUnlock,
  previewHeight = 220,
  ctaLabel,
  bullets,
  footerNote,
  children,
}: BlurGateSectionProps) {
  // Unlocked (Pro or free unlock used): render children as-is, zero wrapping
  if (isUnlocked) return <>{children}</>;

  return (
    <div>
      {/* ── 1. Banner — always above, never obscured ─────────────────────── */}
      <ProLockedBanner />

      {/* ── 2. Visible preview block — fully unobstructed ─────────────────
              Clips to previewHeight so nothing below is accessible.
              The gradient at the bottom signals "more below". */}
      <div
        style={{ height: previewHeight, overflow: "hidden", position: "relative" }}
      >
        {/* Real content — visible, no blur */}
        <div style={{ pointerEvents: "none" }}>
          {children}
        </div>
        {/* Gradient fade — communicates "content continues below" */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: Math.round(previewHeight * 0.45),
            background:
              "linear-gradient(to bottom, transparent, rgba(13,17,23,0.97))",
          }}
        />
      </div>

      {/* ── 3. Locked block — blurred content + overlay ───────────────────
              position:relative so ProLockOverlay (absolute inset-0) is
              contained here and CANNOT bleed up over the preview. */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ minHeight: 200 }}
      >
        {/* Blurred ghost of remaining content */}
        <div
          className="pointer-events-none select-none"
          style={{ filter: "blur(7px)", opacity: 0.22 }}
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Solid dark cover so blurred text isn't legible */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "rgba(13,17,23,0.82)" }}
        />

        {/* Lock overlay — absolute inset-0 inside this locked block only */}
        <ProLockOverlay
          onUnlock={onUnlock}
          ctaLabel={ctaLabel}
          bullets={bullets}
          footerNote={footerNote}
        />
      </div>
    </div>
  );
}

export default BlurGateSection;
