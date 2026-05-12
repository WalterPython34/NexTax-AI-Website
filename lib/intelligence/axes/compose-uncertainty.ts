// lib/intelligence/axes/compose-uncertainty.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Underwriting Uncertainty Composer
//
// CP-5 Module: Computes underwriting_uncertainty as a composite axis
// with three sub-axes: data_uncertainty, structural_uncertainty,
// model_uncertainty.
//
// The underwriting_uncertainty axis answers: "How confidently can a
// conclusion be defended?"
//
// This is the engine's institutional humility surface. Per CP-5
// guardrail: "evidence_quality = trustworthiness of inputs;
// underwriting_uncertainty = defensibility of conclusions; axis scores
// = dimensional readings." Underwriting uncertainty IS the engine's
// confidence layer; no per-axis confidence scores are added elsewhere.
//
// What this composer reads (and what it MUST NOT read):
//
//   PERMITTED INPUTS (UncertaintyComposerInputs):
//     - UncertaintyDelta records — extracted from RuleFiring.uncertainty_escalation
//       where the firing produced one. Each carries a sub_axis declaration
//       (data_uncertainty / structural_uncertainty / model_uncertainty)
//       and escalation_points.
//     - FingerprintResolution — for fingerprint model_uncertainty_escalation
//       (fallback fingerprint feeds model_uncertainty directly)
//     - suppressed_rule_ids — list of rule IDs that were suppressed due
//       to fingerprint-fit uncertainty (hybrid model signals)
//
//   FORBIDDEN INPUTS (type-enforced):
//     - Finding records → those feed financial_score / durability_score
//     - SourceConcern records → those feed evidence_quality
//     - Pattern/scenario records → those feed durability_score / fragility
//     - AssumptionFragilityGraph → that feeds assumption_fragility
//
// Architectural note on sub-axes:
//
//   Per CP-5 types contract, UncertaintyAxisScore extends AxisScore
//   with three sub_axes (each itself an AxisScore). The composite
//   score is the maximum of the three sub-axes (NOT a sum or average —
//   the engine reports the worst dimension as the headline). This
//   preserves the constitutional intent: a deal can be data-clean but
//   structurally uncertain (hybrid business model), and the worst
//   dimension is what the underwriter needs to know first.
//
// Sub-axis distinctions:
//
//   data_uncertainty — "Do we have what we need to evaluate this?"
//     Examples: SDE reported without addback schedule; DSCR missing
//     while leverage is high; customer concentration not disclosed.
//     This is about MISSING DATA, distinct from data being weak.
//     (Weak data → source_concerns → evidence_quality.)
//
//   structural_uncertainty — "Does what we see make sense as a
//     coherent business?" Examples: operating-model mismatch signals,
//     inventory in service business, EBITDA-operating gap thin in
//     asset-heavy. This is about the BUSINESS not matching its
//     expected shape, distinct from data quality.
//
//   model_uncertainty — "Does the engine's framework apply to this
//     deal at all?" Examples: fallback fingerprint, proxy benchmark,
//     small RMA sample, recency-impaired data. This is about
//     METHODOLOGY weakness, distinct from data or structure.
//
// Components produced PER SUB-AXIS:
//   data_uncertainty:
//     - data_escalations_aggregate
//     - missing_critical_data (existential when revenue source unknown)
//   structural_uncertainty:
//     - structural_escalations_aggregate
//     - operating_model_mismatch_signal
//   model_uncertainty:
//     - model_escalations_aggregate
//     - fingerprint_resolution_quality
//     - suppressed_rule_signal (hybrid model penalty)
//     - fallback_fingerprint_used (existential when is_fallback=true)
//
// Baseline: UNCERTAINTY_BASELINE = 20 (most deals begin "underwriteable
// until complexity emerges").
//
// Band strategy: "uncertainty" — higher score is worse.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisComponent,
  AxisScore,
  UncertaintyAxisScore,
  UncertaintyComposerInputs,
} from "./types";
import { UNCERTAINTY_BASELINE } from "./types";
import {
  assembleAxisScore,
  buildComponent,
  buildComponentId,
  sourceFromFingerprintSignal,
  sourceFromUncertaintyDelta,
} from "./components";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY COMPOSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the underwriting_uncertainty UncertaintyAxisScore.
 *
 * Returns four scores: composite + three sub-axes.
 *
 * Process:
 *   1. Bucket UncertaintyDelta records by sub_axis
 *   2. Compose each sub-axis independently via dedicated sub-composers
 *   3. Composite = the WORST sub-axis (max score), preserving "the
 *      engine reports the worst dimension as the headline"
 *   4. Composite components = union of sub-axis components for
 *      explanation continuity
 */
export function composeUnderwritingUncertainty(
  inputs: UncertaintyComposerInputs,
): UncertaintyAxisScore {
  // Bucket escalations by sub_axis
  const dataEscalations = inputs.uncertainty_escalations.filter(
    (e) => e.sub_axis === "data_uncertainty",
  );
  const structuralEscalations = inputs.uncertainty_escalations.filter(
    (e) => e.sub_axis === "structural_uncertainty",
  );
  const modelEscalations = inputs.uncertainty_escalations.filter(
    (e) => e.sub_axis === "model_uncertainty",
  );

  // Compose each sub-axis independently
  const dataAxis = composeDataUncertainty({
    escalations: dataEscalations,
    fingerprint_resolution: inputs.fingerprint_resolution,
  });
  const structuralAxis = composeStructuralUncertainty({
    escalations: structuralEscalations,
    fingerprint_resolution: inputs.fingerprint_resolution,
  });
  const modelAxis = composeModelUncertainty({
    escalations: modelEscalations,
    fingerprint_resolution: inputs.fingerprint_resolution,
    suppressed_rule_ids: inputs.suppressed_rule_ids,
  });

  // Composite = worst (max) sub-axis score
  // Rationale: a data-clean deal with hybrid structural uncertainty is
  // not "averaged" with the clean dimension — the structural uncertainty
  // is what the underwriter needs to know first.
  const compositeScore = Math.max(dataAxis.score, structuralAxis.score, modelAxis.score);

  // Composite components = union of all sub-axis components, ordered by
  // contribution magnitude (largest impact first) for narrative readability
  const allComponents = [
    ...dataAxis.components,
    ...structuralAxis.components,
    ...modelAxis.components,
  ];
  const orderedComponents = allComponents
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Build composite as an AxisScore — we can't just spread the sub-axes
  // because the score derives from max(), not from sum.
  // Use the worst sub-axis's baseline + clamped composite score
  // mathematics, but expose the composition cleanly.
  const compositeAxis = assembleCompositeAxis({
    score: compositeScore,
    components: orderedComponents,
  });

  return {
    ...compositeAxis,
    sub_axes: {
      data_uncertainty: dataAxis,
      structural_uncertainty: structuralAxis,
      model_uncertainty: modelAxis,
    },
  };
}

/**
 * Assemble the composite-level AxisScore. The score is provided directly
 * (the max across sub-axes); baseline is UNCERTAINTY_BASELINE for
 * narrative continuity; net_contribution is derived. The band is assigned
 * fresh from the composite score using the uncertainty band strategy.
 */
function assembleCompositeAxis(args: {
  score: number;
  components: ReadonlyArray<AxisComponent>;
}): AxisScore {
  // Use assembleAxisScore with the EXISTING components, but we override
  // the score after assembly because composite is max(), not sum().
  // However, assembleAxisScore clamps and assigns band based on score;
  // we need to honor the max() composite explicitly.
  //
  // Approach: build a synthetic single-component score where the
  // contribution is (composite_score - baseline). This preserves the
  // baseline display while ensuring the score reads correctly.
  //
  // The components array is preserved as the explanatory surface; the
  // single synthetic contribution is purely for the score field.
  const baseline = UNCERTAINTY_BASELINE;
  const syntheticContribution = args.score - baseline;

  // Build an AxisScore directly without going through assembleAxisScore,
  // because we need to set the score from max() rather than sum().
  // Use the existing band assignment by going through assembleAxisScore
  // with a single synthetic component, then replace the components array.
  const synthetic = assembleAxisScore({
    axis: "underwriting_uncertainty",
    baseline,
    components: [
      {
        component_id: "component.uncertainty.composite_synthetic",
        axis: "underwriting_uncertainty",
        name: "Composite (max across sub-axes)",
        contribution: syntheticContribution,
        contribution_explanation: "Composite score reflects the worst sub-axis (max across data, structural, model uncertainty).",
        reference_population: "all_fingerprints",
        existential_component: false,
        sources: [],
        depends_on_assumptions: [],
      },
    ],
    band_strategy: "uncertainty",
  });

  // Now replace the components array with the real per-sub-axis components.
  // The score, band, baseline, net_contribution come from the synthetic
  // assembly; the components come from the union for explanatory surface.
  return {
    ...synthetic,
    components: args.components,
    // Recompute net_contribution to match the displayed score
    net_contribution: synthetic.score - baseline,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA UNCERTAINTY SUB-AXIS
// ─────────────────────────────────────────────────────────────────────────────
// "Do we have what we need to evaluate this?"

interface SubAxisComposerInputs {
  readonly escalations: ReadonlyArray<UncertaintyComposerInputs["uncertainty_escalations"][number]>;
  readonly fingerprint_resolution: UncertaintyComposerInputs["fingerprint_resolution"];
}

function composeDataUncertainty(inputs: SubAxisComposerInputs): AxisScore {
  const components: AxisComponent[] = [];

  // Component: aggregate data escalations
  const aggregateComp = buildEscalationAggregateComponent({
    sub_axis: "data_uncertainty",
    escalations: inputs.escalations,
    name: "Data escalations aggregate",
    component_specific: "data_escalations_aggregate",
    explanation_prefix: "Missing or insufficient data signals reported by rule firings",
  });
  if (aggregateComp) components.push(aggregateComp);

  // Component: missing-critical-data existential
  // Fires when the deal-level evidence base is verbal_assertion-only AND
  // no rule fired for it (defensive — uncertainty escalations should already
  // have captured this case, but the existential ensures consistent treatment).
  // We can only detect this from the escalations themselves since this
  // composer doesn't read deal_source_type directly. Check if the
  // aggregate escalation crosses the threshold for "many critical fields
  // missing."
  const totalEscalation = inputs.escalations.reduce((acc, e) => acc + e.escalation_points, 0);
  if (totalEscalation >= 30) {
    components.push(
      buildComponent({
        component_id: buildComponentId("underwriting_uncertainty", "missing_critical_data"),
        axis: "underwriting_uncertainty",
        name: "Missing critical data (existential)",
        raw_contribution: 25, // existential cap allows up to 35
        contribution_explanation:
          `Aggregate data escalation of ${totalEscalation} points across ${inputs.escalations.length} ` +
          `data signals indicates multiple critical inputs are missing or insufficient. ` +
          `This is the existential case where the engine cannot conduct primary analysis until ` +
          `data gaps are filled — diligence effort should focus on data acquisition before further analytical work.`,
        reference_population: "all_fingerprints",
        existential_component: true,
        sources: inputs.escalations.map((e) => sourceFromUncertaintyDelta(e)),
        depends_on_assumptions: [],
      }),
    );
  }

  return assembleAxisScore({
    axis: "underwriting_uncertainty",
    baseline: UNCERTAINTY_BASELINE,
    components,
    band_strategy: "uncertainty",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL UNCERTAINTY SUB-AXIS
// ─────────────────────────────────────────────────────────────────────────────
// "Does what we see make sense as a coherent business?"

function composeStructuralUncertainty(inputs: SubAxisComposerInputs): AxisScore {
  const components: AxisComponent[] = [];

  // Component: aggregate structural escalations
  const aggregateComp = buildEscalationAggregateComponent({
    sub_axis: "structural_uncertainty",
    escalations: inputs.escalations,
    name: "Structural escalations aggregate",
    component_specific: "structural_escalations_aggregate",
    explanation_prefix:
      "Operating-model mismatch and structural-coherence signals reported by rule firings",
  });
  if (aggregateComp) components.push(aggregateComp);

  // Component: operating-model mismatch signal (heuristic from escalation count)
  // When 3+ structural escalations fire, the business is structurally
  // hybrid in ways that make the fingerprint's operating-model classification
  // partial.
  if (inputs.escalations.length >= 3) {
    components.push(
      buildComponent({
        component_id: buildComponentId("underwriting_uncertainty", "operating_model_mismatch"),
        axis: "underwriting_uncertainty",
        name: "Operating-model partial fit",
        raw_contribution: Math.min(10, inputs.escalations.length * 2.5),
        contribution_explanation:
          `${inputs.escalations.length} structural-coherence signals indicate the business does not fully ` +
          `match its operating-model fingerprint. The deal is structurally hybrid; the fingerprint's ` +
          `interaction rules and benchmark bands apply less reliably than for a clean-match deal.`,
        reference_population: "this_fingerprint",
        existential_component: false,
        sources: [
          sourceFromFingerprintSignal({
            fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
            signal_description: `Operating-model partial fit detected via ${inputs.escalations.length} structural signals`,
            signal_id: "fingerprint.partial_fit",
          }),
          ...inputs.escalations.map((e) => sourceFromUncertaintyDelta(e)),
        ],
        depends_on_assumptions: [],
      }),
    );
  }

  return assembleAxisScore({
    axis: "underwriting_uncertainty",
    baseline: UNCERTAINTY_BASELINE,
    components,
    band_strategy: "uncertainty",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL UNCERTAINTY SUB-AXIS
// ─────────────────────────────────────────────────────────────────────────────
// "Does the engine's framework apply to this deal at all?"

interface ModelUncertaintyInputs extends SubAxisComposerInputs {
  readonly suppressed_rule_ids: UncertaintyComposerInputs["suppressed_rule_ids"];
}

function composeModelUncertainty(inputs: ModelUncertaintyInputs): AxisScore {
  const components: AxisComponent[] = [];

  // Component: aggregate model escalations (e.g., proxy benchmark used)
  const aggregateComp = buildEscalationAggregateComponent({
    sub_axis: "model_uncertainty",
    escalations: inputs.escalations,
    name: "Model escalations aggregate",
    component_specific: "model_escalations_aggregate",
    explanation_prefix: "Methodology-quality signals reported by rule firings",
  });
  if (aggregateComp) components.push(aggregateComp);

  // Component: fingerprint resolution quality
  // Pulls model_uncertainty_escalation from FingerprintResolution directly.
  // This captures proxy benchmarks, recency penalties, small sample sizes,
  // and any other methodology weakness baked into the fingerprint result.
  const fpEscalation = inputs.fingerprint_resolution.model_uncertainty_escalation;
  if (fpEscalation > 0 && !inputs.fingerprint_resolution.is_fallback) {
    // Avoid double-counting: when is_fallback=true, the existential
    // component handles methodology weakness explicitly.
    components.push(
      buildComponent({
        component_id: buildComponentId("underwriting_uncertainty", "fingerprint_resolution_quality"),
        axis: "underwriting_uncertainty",
        name: "Fingerprint resolution methodology",
        raw_contribution: Math.min(15, fpEscalation),
        contribution_explanation:
          `Fingerprint resolution carries ${fpEscalation} model-uncertainty escalation points from ` +
          `methodology weakness (proxy benchmark, recency penalty, small sample size, or industry-override quality). ` +
          `The engine's framework applies, but the underlying reference data is imperfect for this operating model.`,
        reference_population: "this_fingerprint",
        existential_component: false,
        sources: [
          sourceFromFingerprintSignal({
            fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
            signal_description: `Fingerprint resolution: ${fpEscalation}-point model uncertainty (proxy/recency/sample factors)`,
          }),
        ],
        depends_on_assumptions: [],
      }),
    );
  }

  // Component: suppressed rule signal (hybrid-model rule density signal)
  // When many rules were suppressed due to fingerprint-fit uncertainty,
  // the engine effectively has less coverage on this deal.
  if (inputs.suppressed_rule_ids.length >= 5) {
    components.push(
      buildComponent({
        component_id: buildComponentId("underwriting_uncertainty", "suppressed_rules_coverage"),
        axis: "underwriting_uncertainty",
        name: "Suppressed-rule coverage gap",
        raw_contribution: Math.min(8, inputs.suppressed_rule_ids.length * 1),
        contribution_explanation:
          `${inputs.suppressed_rule_ids.length} rules were suppressed during evaluation due to operating-model ` +
          `fit uncertainty. The diagnostic surface for this deal is narrower than for a clean-match deal; ` +
          `some structural signals could not be evaluated.`,
        reference_population: "this_fingerprint",
        existential_component: false,
        sources: [
          sourceFromFingerprintSignal({
            fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
            signal_description: `${inputs.suppressed_rule_ids.length} rules suppressed during evaluation`,
            signal_id: "fingerprint.rule_suppression",
          }),
        ],
        depends_on_assumptions: [],
      }),
    );
  }

  // Existential: fallback fingerprint used
  if (inputs.fingerprint_resolution.is_fallback) {
    components.push(
      buildComponent({
        component_id: buildComponentId("underwriting_uncertainty", "fallback_fingerprint_used"),
        axis: "underwriting_uncertainty",
        name: "Fallback fingerprint (existential)",
        raw_contribution: 30, // existential cap allows up to 35
        contribution_explanation:
          `The industry was not in the fingerprint registry; the engine resolved to a fallback fingerprint. ` +
          `${inputs.fingerprint_resolution.fallback_reason ?? "No industry-specific operating-model classification available."} ` +
          `Without industry-specific operating-model priors, the engine cannot apply its full interaction-rule framework ` +
          `or benchmark calibration. This is the existential case for model_uncertainty.`,
        reference_population: "all_fingerprints",
        existential_component: true,
        sources: [
          sourceFromFingerprintSignal({
            fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
            signal_description: `Fallback fingerprint used: ${inputs.fingerprint_resolution.fallback_reason ?? "industry not in registry"}`,
            signal_id: "fingerprint.fallback_used",
          }),
        ],
        depends_on_assumptions: [],
      }),
    );
  }

  return assembleAxisScore({
    axis: "underwriting_uncertainty",
    baseline: UNCERTAINTY_BASELINE,
    components,
    band_strategy: "uncertainty",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ESCALATION AGGREGATE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

interface AggregateBuilderArgs {
  readonly sub_axis: "data_uncertainty" | "structural_uncertainty" | "model_uncertainty";
  readonly escalations: ReadonlyArray<UncertaintyComposerInputs["uncertainty_escalations"][number]>;
  readonly name: string;
  readonly component_specific: string;
  readonly explanation_prefix: string;
}

/**
 * Build an aggregate component summing escalation_points across a
 * sub-axis. Used by all three sub-axes; the per-escalation source list
 * is preserved for provenance.
 *
 * Contribution scaling:
 *   Each escalation_point translates 1:1 to contribution points, soft-
 *   capped at +15. Existential cases override with their own components.
 */
function buildEscalationAggregateComponent(
  args: AggregateBuilderArgs,
): AxisComponent | null {
  if (args.escalations.length === 0) return null;

  const totalPoints = args.escalations.reduce(
    (acc, e) => acc + e.escalation_points,
    0,
  );
  if (totalPoints === 0) return null;

  const ruleNames = args.escalations
    .slice(0, 3)
    .map((e) => e.reason.substring(0, 60))
    .join("; ");
  const moreText = args.escalations.length > 3 ? `; +${args.escalations.length - 3} more` : "";

  return buildComponent({
    component_id: buildComponentId("underwriting_uncertainty", args.component_specific),
    axis: "underwriting_uncertainty",
    name: args.name,
    raw_contribution: totalPoints, // positive direction = more uncertainty
    contribution_explanation:
      `${args.explanation_prefix}: ${args.escalations.length} escalation${args.escalations.length === 1 ? "" : "s"} ` +
      `totaling ${totalPoints} points. ` +
      `Sub-axis: ${args.sub_axis}. ` +
      `Reasons (sample): ${ruleNames}${moreText}.`,
    reference_population: "all_fingerprints",
    existential_component: false,
    sources: args.escalations.map((e) => sourceFromUncertaintyDelta(e)),
    depends_on_assumptions: [],
  });
}
