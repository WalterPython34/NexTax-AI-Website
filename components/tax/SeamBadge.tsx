"use client";

// components/tax/SeamBadge.tsx
// ═════════════════════════════════════════════════════════════════════════════
// SeamBadge — shared provenance/seam tag.
//
// Extracted from TaxAssumptionsTab so BOTH the tab and the TaxDrilldownDrawer can
// import it from one place. (The drawer cannot import it back out of the tab —
// the tab imports the drawer, which would be a circular dependency.)
//
// SEAM axis (provenance) vs the firewall:
//   • FACT       — buyer-entered structural fact / saved deal field.
//   • ASSUMPTION — buyer-entered planning assumption.
//   • DERIVED    — computed by AcquiFlow from entered facts + assumptions.   ← NEW
//   • COMPUTED   — "analysis only" firewall tag for OPS-only dollar previews.
//
// EXTRACTED is intentionally ABSENT here: the system captures no document-level
// provenance in v1, so a document-sourced seam would be fabricated precision.
// It is reserved only in the drilldown Provenance type, never assigned.
// ═════════════════════════════════════════════════════════════════════════════

import React from "react";

export const SEAM = {
  FACT:       { label: "imported from deal",  color: "#34D399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
  ASSUMPTION: { label: "buyer input",         color: "#FCD34D", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  COMPUTED:   { label: "analysis only",       color: "#A5B4FC", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)" },
  // NEW — distinct from COMPUTED. Neutral slate; reads as "AcquiFlow worked this
  // out from your inputs," not as a fact, an assumption, or an ops-only dollar.
  DERIVED:    { label: "acquiflow-derived",   color: "#94A3B8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
} as const;

export type SeamKind = keyof typeof SEAM;

export function SeamBadge({ kind }: { kind: SeamKind }) {
  const s = SEAM[kind];
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 20, color: s.color, background: s.bg,
      border: `1px solid ${s.border}`, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}
