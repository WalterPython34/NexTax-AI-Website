// components/BlurGateSection.tsx
// Wraps any content in a freemium gate:
//   - Pro users → children rendered normally, no overlay
//   - Free users → top `previewHeight` px visible + fade + blur + lock overlay
//
// Interaction design:
//   - Panel opens normally for all users
//   - Tabs are clickable for all users
//   - Only the lower portion of each tab's content is gated
//   - Notes are never gated (don't wrap notes content here)
//
// Usage:
//   <BlurGateSection
//     isPro={isPro}
//     onUnlock={handleFreeUnlock}
//     previewHeight={220}
//     ctaLabel="Unlock Stress Test →"
//   >
//     {/* full tab content */}
//   </BlurGateSection>

"use client";

import React from "react";
import { ProLockOverlay, type ProLockOverlayProps } from "./ProLockOverlay";

export interface BlurGateSectionProps
  extends Omit<ProLockOverlayProps, "onUnlock"> {
  /** If true, renders children without any gating */
  isPro:         boolean;
  /** Called when the free user clicks the CTA */
  onUnlock:      () => void;
  /** Height (px) of the visible preview strip before the blur begins */
  previewHeight?: number;
  children:      React.ReactNode;
}

export function ProLockedBanner() {
  return (
    <div className="mb-4 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-200">
      ⚡ Full underwriting is available in Pro — pricing risk, trust-adjusted
      earnings, comps, and negotiation strategy are partially hidden below.
    </div>
  );
}

export function BlurGateSection({
  isPro,
  onUnlock,
  previewHeight = 220,
  ctaLabel,
  bullets,
  footerNote,
  children,
}: BlurGateSectionProps) {
  // Pro users: render children as-is, no gating whatsoever
  if (isPro) return <>{children}</>;

  return (
    <div className="space-y-3">
      {/* Banner — above gated content */}
      <ProLockedBanner />

      {/* Gated section */}
      <div className="relative overflow-hidden rounded-xl">

        {/* Blurred content preview */}
        <div
          className="pointer-events-none select-none"
          style={{ filter: "blur(5px)", opacity: 0.28 }}
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Gradient fade — top visible strip fades into blur */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: previewHeight,
            background:
              "linear-gradient(to bottom, transparent 40%, rgba(13,17,23,0.96) 100%)",
          }}
        />

        {/* Hard fade cover — everything below the preview */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            top: previewHeight,
            background: "rgba(13,17,23,0.97)",
          }}
        />

        {/* Lock overlay — sits above everything */}
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
