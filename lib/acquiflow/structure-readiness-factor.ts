// lib/acquiflow/structure-readiness-factor.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intel — Structure Readiness Factor (Stage 3 / Prototype)
//
// Pure derivation: TaxStructureSection → a single factor object that the Intel
// memo's "Structure of the read" section renders alongside CP's contributing
// factors. This module is the PROTOTYPE for the factor architecture that will
// later expand to:
//   - transferability_readiness
//   - lender_readiness
//   - dscr_readiness
//   - valuation_readiness
//
// ARCHITECTURAL FIREWALL: this module reads ONLY the presentation-layer output
// of buildTaxStructureSection. It does NOT call the engine, does NOT touch CP,
// and is NEVER written back to evaluation_snapshots. The factor is rendered as
// a PEER of CP's contributing_factors at render time — it is NEVER injected
// INTO CP.contributing_factors. CP remains frozen and reasons independently.
//
// CONSTITUTIONAL DISCIPLINE (Tax Intelligence Constitution):
//   - "Evidence-status dashboard, not judgment."
//   - "Missing evidence reduces certainty but does not suppress visibility."
//   - "AcquiFlow has not actually performed diligence" — reasons read as
//     observations under current assumptions, not as verdicts.
//
// ALL READINESS JUDGMENT LIVES IN THE BUILDER. This module is a 1:1 mapping
// from builder-declared signal to factor state. Adding new readiness_signal
// states is a single-line change here.
// ─────────────────────────────────────────────────────────────────────────────

import type { TaxStructureSection } from "@/lib/acquiflow/tax-structure-section";

// ── Factor shape (peer of CP's contributing_factors at render time) ─────────
// `source` tag enables future filtering/grouping when other factor sources
// land (transferability, lender, DSCR, valuation). Cheap to add now, expensive
// to retrofit later.
export interface StructureReadinessFactor {
  axis_or_dimension: "tax_structure_readiness";
  source:            "tax_structure";
  state:             "pending_input" | "interested" | "cautious";
  band:              string;  // from taxStructure.structure_label (builder owns vocab)
  reason:            string;  // from taxStructure.readiness_signal.reason
}

/**
 * Derive the structure-readiness factor from a TaxStructureSection.
 *
 * Returns null when the input is undefined — i.e., the route never produced a
 * section for this deal (e.g., no row, or builder threw). The caller should
 * omit the factor entirely from the rendered list in that case (honest
 * absence — no factor row, no UI noise).
 *
 * When the section IS present, the builder's readiness_signal drives the
 * factor state:
 *   - unavailable → pending_input  (no buyer inputs / no structure selected)
 *   - favorable   → interested     (clean structural read under assumptions)
 *   - open        → cautious       (structural questions remain open)
 *
 * The factor's `band` field passes through `structure_label` verbatim from the
 * builder — so new structure types (336(e), F reorg, internal rollover, etc.)
 * land in Intel automatically as the builder grows. The builder is the single
 * source of vocabulary truth.
 */
export function deriveStructureReadinessFactor(
  section: TaxStructureSection | undefined | null,
): StructureReadinessFactor | null {
  // Honest absence — no section means no signal to surface. The factor row
  // simply does not render. This is distinct from "buyer hasn't entered
  // assumptions" (which produces a section with present:false and a real
  // readiness_signal of "unavailable") — that case DOES render the factor.
  if (!section) return null;

  // The builder is required to emit a readiness_signal. If for any reason
  // it's missing (older builder version, malformed data), degrade gracefully
  // to pending_input with a neutral reason rather than throw.
  const signal = section.readiness_signal;
  if (!signal) {
    return {
      axis_or_dimension: "tax_structure_readiness",
      source:            "tax_structure",
      state:             "pending_input",
      band:              section.structure_label ?? "Not yet specified",
      reason:            "Tax structure data is incomplete for this deal.",
    };
  }

  // Map builder signal state → factor state. The builder owns all judgment.
  // This switch is the single point of mapping — adding states is one line.
  const factorState: StructureReadinessFactor["state"] =
    signal.state === "favorable"   ? "interested"   :
    signal.state === "open"        ? "cautious"     :
    /* "unavailable" */              "pending_input";

  return {
    axis_or_dimension: "tax_structure_readiness",
    source:            "tax_structure",
    state:             factorState,
    band:              section.structure_label,
    reason:            signal.reason,
  };
}
