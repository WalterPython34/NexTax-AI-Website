// lib/intelligence/narrative/synthesis/per-axis.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Per-Axis Interpretation Synthesis
//
// CP-8 Module: Translates each axis state into institutional meaning
// rather than score recitation.
//
// What this module computes:
//
//   Given the CP-5 axis composition result, produce one AxisInterpretation
//   per axis (5 total: financial_score, durability_score, evidence_quality,
//   assumption_fragility, underwriting_uncertainty) that carries:
//
//     - axis key
//     - score and band (echoed for traceability)
//     - institutional_meaning: what this axis state MEANS to underwriters,
//       not just what the number is
//     - source_ids: top contributing components driving the reading
//
//   The institutional_meaning prose is structured by band — concerning
//   bands produce different framing than strong bands; the prose surfaces
//   the underwriting consequence of the band, not the band itself.
//
// This is the SYNTHESIS_OVER_RECITATION_PRINCIPLE in concentrated form:
//
//   BAD synthesis (score recitation):
//     "The durability_score is 21.0, which falls in the concerning band.
//      This is below 30."
//
//   GOOD synthesis (institutional meaning):
//     "Durability sits in the concerning band: the deal carries
//      through-cycle survivability risk that lenders requiring
//      demonstrated cycle resilience cannot reconcile without specific
//      evidence the business survived recent compression."
//
//   The first describes the number; the second describes the underwriting
//   consequence. Templates render the institutional meaning; the score is
//   carried for traceability only.
//
// What this module does NOT do:
//
//   - Generate the final prose (axis-templates.ts renders the fragments)
//   - Restate scores as the primary content
//   - Make recommendations
//   - Re-interpret upstream truth (reads CP-5 output as authoritative)
//
// Algorithm:
//
//   For each axis:
//     1. Read score and band from CP-5 axis composition
//     2. Select the institutional meaning prose by axis × band
//     3. Identify top contributing components by absolute contribution
//        magnitude (top 3 by default) — these become source_ids
//     4. Build AxisInterpretation record
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  AxisCompositionResult,
  AxisScore,
  UncertaintyAxisScore,
} from "../../axes/types";
import type {
  AxisInterpretation,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of top contributing components to surface per axis interpretation.
 * Used for source_ids — the structured trace of what drove the reading.
 *
 * 3 is the institutionally informative limit: enough to show the primary
 * drivers without flooding the trace.
 */
export const TOP_COMPONENTS_PER_AXIS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL MEANING PROSE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The full prose translation table: each (axis, band) pair maps to the
 * institutional meaning of that axis state.
 *
 * Bands by axis:
 *   - financial_score / durability_score / evidence_quality:
 *       concerning / cautionary / moderate / strong
 *   - assumption_fragility:
 *       low_concentration / moderate_concentration / elevated_concentration / highly_concentrated
 *   - underwriting_uncertainty:
 *       low_uncertainty / moderate_uncertainty / elevated_uncertainty / severe_uncertainty
 *
 * Each entry is a deterministic plain-language interpretation. Editing
 * any of these is a governance decision because it changes what the
 * narrative layer says about deals at that axis state.
 */
const AXIS_MEANING_MATRIX: Readonly<Record<string, string>> = {
  // ── financial_score ──
  "financial_score.strong":
    "Coverage and earnings quality read as strong: cash flow services debt comfortably with cushion under standard normalization, leaving room for personality simulations to focus on durability and evidence rather than financial survivability.",
  "financial_score.moderate":
    "Coverage and earnings quality read as moderate: cash flow services debt without comfortable cushion. The financial profile is workable but does not provide buffer against diligence-driven adjustments or scenario compression.",
  "financial_score.cautionary":
    "Coverage and earnings quality read as cautionary: cash flow services debt only at marginal levels, making the deal sensitive to addback diligence, scenario stress, or modest revenue normalization.",
  "financial_score.concerning":
    "Coverage and earnings quality read as concerning: cash flow does not service debt at comfortable levels under any reasonable normalization, which produces fatal discomforts for personalities focused on coverage durability.",

  // ── durability_score ──
  "durability_score.strong":
    "Durability reads as strong: the operating model demonstrates through-cycle resilience and the deal survives normalization scenarios with comfortable margin, making lender personalities focused on cycle survivability institutionally comfortable.",
  "durability_score.moderate":
    "Durability reads as moderate: the operating model shows reasonable resilience but scenario clearance shows compression rather than comfortable margin. Through-cycle viability is plausible but not visibly demonstrated.",
  "durability_score.cautionary":
    "Durability reads as cautionary: the operating model shows compression under multiple normalization or stress scenarios. Personalities requiring through-cycle survivability cannot reach interested posture without specific cycle-resilience evidence.",
  "durability_score.concerning":
    "Durability reads as concerning: the operating model does not demonstrate through-cycle resilience and produces fatal or deal-breaker discomforts in personalities that underwrite to cycle survivability rather than point-in-time coverage.",

  // ── evidence_quality ──
  "evidence_quality.strong":
    "Evidence quality reads as strong: primary metrics rest on verified sources (tax returns, accountant-prepared exports, bank-statement reconciliation), giving personalities committee-defensible documentary support without significant source upgrade work.",
  "evidence_quality.moderate":
    "Evidence quality reads as moderate: primary metrics rest on workable sources but with notable gaps or unsupported adjustments. Most personalities can form posture but documentation-strict personalities cannot reach interested without source upgrades.",
  "evidence_quality.cautionary":
    "Evidence quality reads as cautionary: primary metrics rest on weak or partially verifiable sources. Documentation-strict personalities cannot reach interested posture under this evidence base; less documentation-sensitive personalities may still form posture from other axes.",
  "evidence_quality.concerning":
    "Evidence quality reads as concerning: primary metrics rest on unverifiable sources, producing automatic decline in personalities that require documentary support for committee defensibility.",

  // ── assumption_fragility (inverted: lower score = better, higher = worse) ──
  "assumption_fragility.low_concentration":
    "Assumption fragility reads as low concentration: favorable conclusions distribute across multiple independent assumptions, meaning no single assumption failure cascades through multiple findings. Diligence focus can prioritize the most impactful single concerns rather than defending many simultaneous claims.",
  "assumption_fragility.moderate_concentration":
    "Assumption fragility reads as moderate concentration: several assumptions support multiple conclusions but no single assumption dominates the deal's underwriting logic. Diligence priorities can target the concentrated assumptions without fundamentally reshaping the deal structure.",
  "assumption_fragility.elevated_concentration":
    "Assumption fragility reads as elevated concentration: a small number of assumptions support many favorable conclusions, meaning multiple ways the post-close business could deviate from current operations simultaneously. The deal's underwriting strength depends materially on those assumptions holding.",
  "assumption_fragility.highly_concentrated":
    "Assumption fragility reads as highly concentrated: too many favorable conclusions depend on a small set of assumptions, producing fatal discomforts for personalities sensitive to concentrated bets (seller-note, cashflow lender). The deal cannot be made comfortable by diligence on a single workstream — multiple independent assumptions need simultaneous validation.",

  // ── underwriting_uncertainty (inverted: lower score = better, higher = worse) ──
  "underwriting_uncertainty.low_uncertainty":
    "Underwriting uncertainty reads as low: the engine has sufficient data and industry-specific model coverage to produce confident posture readings. Personality simulations reflect axis truth rather than data gaps.",
  "underwriting_uncertainty.moderate_uncertainty":
    "Underwriting uncertainty reads as moderate: some data inputs are missing or industry coverage is partial. Personality posture is informed but specific diligence acquisitions would strengthen the readings.",
  "underwriting_uncertainty.elevated_uncertainty":
    "Underwriting uncertainty reads as elevated: significant data gaps or partial model coverage limit how confidently personality posture can be formed. Multiple personalities surface information needs that gate primary analysis.",
  "underwriting_uncertainty.severe_uncertainty":
    "Underwriting uncertainty reads as severe: substantial data gaps, missing primary inputs, or fallback fingerprint resolution limit the engine's confidence in posture readings. This is often a model coverage limitation (registry gap) rather than a deal characteristic — narrative templates frame this distinction explicitly.",
};

/**
 * Look up the institutional meaning prose for an axis × band pair.
 * Returns a defensive fallback if the band is unrecognized — should never
 * happen given the typed unions, but defends against deserialized data.
 */
function institutionalMeaningFor(axis: AxisKey, band: string): string {
  const key = `${axis}.${band}`;
  const direct = AXIS_MEANING_MATRIX[key];
  if (direct) return direct;
  return (
    `${axis} reads at band "${band}". Institutional interpretation for this ` +
    `axis-band combination is not yet declared in the synthesis matrix; ` +
    `narrative templates should treat this as a coverage gap in the ` +
    `interpretation layer rather than an institutional verdict.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the top N contributing components by absolute contribution magnitude.
 *
 * Components carry signed `contribution` values; we sort by absolute value
 * to surface the most impactful drivers regardless of sign. Both
 * positive (favorable) and negative (unfavorable) contributors are
 * candidates — the goal is to surface the components that most shape
 * the axis reading, not just the negative ones.
 */
function topContributingComponents(
  axis: AxisScore | UncertaintyAxisScore,
  limit: number,
): ReadonlyArray<string> {
  const components = [...axis.components];
  components.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return components.slice(0, limit).map((c) => c.component_id);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface PerAxisInputs {
  readonly axis_composition_result: AxisCompositionResult;
}

/**
 * Build AxisInterpretation records for all 5 axes.
 *
 * Pure deterministic function. Always returns exactly 5 records in
 * stable order: financial_score, durability_score, evidence_quality,
 * assumption_fragility, underwriting_uncertainty.
 *
 * Each record translates the axis score+band into institutional meaning
 * (synthesis, not recitation) and carries the top contributing component
 * IDs for traceability.
 */
export function buildPerAxisInterpretations(
  inputs: PerAxisInputs,
): ReadonlyArray<AxisInterpretation> {
  const { axis_composition_result: result } = inputs;

  const axes: ReadonlyArray<{
    axis: AxisKey;
    score: AxisScore | UncertaintyAxisScore;
  }> = [
    { axis: "financial_score", score: result.financial_score },
    { axis: "durability_score", score: result.durability_score },
    { axis: "evidence_quality", score: result.evidence_quality },
    { axis: "assumption_fragility", score: result.assumption_fragility },
    { axis: "underwriting_uncertainty", score: result.underwriting_uncertainty },
  ];

  return axes.map(({ axis, score }) => ({
    axis,
    score: score.score,
    band: score.band,
    institutional_meaning: institutionalMeaningFor(axis, score.band),
    source_ids: topContributingComponents(score, TOP_COMPONENTS_PER_AXIS),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarize one axis interpretation for governance / debug inspection.
 */
export function summarizeAxisInterpretation(
  interpretation: AxisInterpretation,
): ReadonlyArray<string> {
  return [
    `${interpretation.axis} = ${interpretation.score.toFixed(1)} (${interpretation.band})`,
    `  top contributing components (${interpretation.source_ids.length}):`,
    ...interpretation.source_ids.map((id) => `    - ${id}`),
    `  institutional_meaning:`,
    `    ${interpretation.institutional_meaning}`,
  ];
}
