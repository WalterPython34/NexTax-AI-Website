// lib/intelligence/narrative/templates/axis-templates.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Per-Axis Narrative Fragment Templates
//
// CP-8 Module: Wraps per-axis interpretations into NarrativeFragment
// records of kind `axis_interpretation`.
//
// Most of the institutional prose for axes is already produced by the
// synthesis layer (per-axis.ts populates AxisInterpretation.institutional_meaning).
// This template's role is structural:
//
//   - Wrap each AxisInterpretation in a NarrativeFragment
//   - Attach mandatory traceability fields (source_ids from top
//     contributing components, related_axis_keys, etc.)
//   - Mark fragments appropriately for validator framing checks
//   - Produce stable fragment IDs
//
// This is the "lightest" template in CP-8 by design — the synthesis
// layer does most of the work. The constitutional commitment is that
// templates render structured intelligence; the synthesis IS the
// intelligence. Axis interpretation is a pure render case.
//
// Architectural commitments enforced:
//
//   - Every fragment carries source_ids (top contributing component IDs
//     from CP-5)
//   - related_axis_keys contains the specific axis being interpreted
//   - The prose itself is from synthesis — templates do not rewrite
//     it (the institutional_meaning was governance-reviewed when
//     per-axis.ts was approved)
//   - Fragments do NOT propose buyer action — axis interpretations are
//     descriptive readings, not action prescriptions. Action surfaces
//     in recovery-templates.ts and posture-templates.ts.
//   - The "severe_uncertainty" institutional_meaning explicitly mentions
//     coverage gap framing, so axis fragments for that band MUST mark
//     references_coverage_gap=true. Other bands mark it false.
//
// What this module does NOT do:
//
//   - Generate new prose (synthesis owns axis institutional meaning)
//   - Make recommendations
//   - Combine multiple axes into a single fragment (one fragment per axis)
//   - Filter axes — every axis gets a fragment for completeness
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  AxisInterpretation,
  NarrativeFragment,
} from "../types";
import { NARRATIVE_TEMPLATES_VERSION } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface AxisFragmentInputs {
  readonly per_axis: ReadonlyArray<AxisInterpretation>;
}

/**
 * Build axis_interpretation fragments for every axis.
 *
 * Pure deterministic function. Returns one NarrativeFragment per axis
 * in the per_axis array (in stable axis order).
 */
export function buildAxisFragments(
  inputs: AxisFragmentInputs,
): ReadonlyArray<NarrativeFragment> {
  return inputs.per_axis.map((interpretation) => buildOneFragment(interpretation));
}

function buildOneFragment(interpretation: AxisInterpretation): NarrativeFragment {
  // The institutional_meaning prose is produced by synthesis. Templates
  // wrap it into a fragment with traceability — no prose rewriting.
  const prose = interpretation.institutional_meaning;

  // Coverage gap detection: when the axis is underwriting_uncertainty
  // at the severe_uncertainty band, the synthesis prose explicitly
  // mentions coverage gap framing. Mark the fragment accordingly so
  // validators can verify the framing.
  const referencesCoverageGap = detectCoverageGapReference(interpretation);

  return {
    fragment_id: makeFragmentId(interpretation.axis),
    kind: "axis_interpretation",
    prose,
    source_ids: collectSourceIds(interpretation),
    related_axis_keys: [interpretation.axis],
    related_personality_ids: [],
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: false, // axis interpretation describes axis truth, not posture
    references_coverage_gap: referencesCoverageGap,
    proposes_buyer_action: false,         // descriptive reading, not prescription
    narrative_principle_applied: "synthesis_over_recitation",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE GAP REFERENCE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect whether an axis interpretation's institutional meaning prose
 * references coverage gap framing.
 *
 * This currently fires only for underwriting_uncertainty.severe_uncertainty,
 * where the synthesis prose explicitly mentions "model coverage limitation
 * (registry gap)". Other axes/bands don't reference coverage gap directly.
 *
 * The check is keyword-based for defensive matching. If the synthesis
 * matrix ever adds new entries referencing coverage gap, this detector
 * will pick them up automatically.
 */
function detectCoverageGapReference(interpretation: AxisInterpretation): boolean {
  const lower = interpretation.institutional_meaning.toLowerCase();
  return (
    lower.includes("model coverage limitation") ||
    lower.includes("registry gap") ||
    lower.includes("fallback fingerprint")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACEABILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collect source IDs for the fragment.
 *
 * Source IDs include:
 *   - the axis key as a stable reference ("axis.{axis}={band}")
 *   - all top contributing component IDs from the interpretation
 *
 * This gives validators and downstream consumers complete traceability:
 * given the fragment, they can identify which axis was interpreted,
 * what band it sat in, and which components drove the reading.
 */
function collectSourceIds(interpretation: AxisInterpretation): ReadonlyArray<string> {
  return [
    `axis.${interpretation.axis}=${interpretation.band}`,
    ...interpretation.source_ids,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let fragmentCounter = 0;
function makeFragmentId(axis: AxisKey): string {
  fragmentCounter += 1;
  return `fragment.axis_interpretation.${axis}.${fragmentCounter}-${Math.random().toString(36).slice(2, 6)}`;
}
