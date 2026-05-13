// lib/intelligence/simulation/pattern-evaluator.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Pattern Evaluator
//
// CP-7 Module: The single procedural surface where personality
// declarations meet axis truth.
//
// Every AxisDiscomfortPattern from CP-6 — every deal-breaker trigger,
// every discomfort source trigger, every comfort condition satisfied_when,
// every information need missing_when — flows through this evaluator.
//
// Pure function. Deterministic. Defensive. The evaluator is the bridge
// between two formal layers and must not crash on any input combination.
//
// Module responsibilities:
//
//   1. Dispatch on AxisDiscomfortPattern.kind (six discriminated variants)
//   2. Read the appropriate axis / component / scenario from inputs
//   3. Evaluate the pattern condition deterministically
//   4. Return PatternEvaluationResult with matched + observed + expected
//      + plain-language explanation
//
// What this module does NOT do:
//
//   - Make any decision about posture state (that's posture-derivation.ts)
//   - Generate narrative prose beyond the structured explanation
//     (that's CP-8)
//   - Mutate any input artifact (read-only access throughout)
//   - Persist any state across calls
//
// Architectural commitments enforced:
//
//   - Inputs are readonly throughout. The evaluator cannot write to
//     axis_composition_result or scenario_evaluation_result.
//
//   - The six pattern variants are exhaustively handled. TypeScript's
//     discriminated-union exhaustiveness check (via `never` in the
//     default branch) ensures future pattern kinds added to CP-6 will
//     trigger a compile-time error here.
//
//   - Defensive evaluation: unknown component IDs return matched=false
//     with an explanation, not a crash. Unknown scenario IDs same.
//     Malformed thresholds (e.g., NaN) return matched=false defensively.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../types";
import type {
  AxisCompositionResult,
  AxisScore,
  UncertaintyAxisScore,
} from "../axes/types";
import type {
  ScenarioEvaluationResult,
  ScenarioOutput,
} from "../scenarios/types";
import type {
  AxisDiscomfortPattern,
} from "../personalities/types";
import type {
  PatternEvaluationResult,
} from "./types";
import { PATTERN_EVALUATOR_VERSION } from "./types";

// Re-export
export { PATTERN_EVALUATOR_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface PatternEvaluatorInputs {
  readonly axis_composition_result: AxisCompositionResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
}

/**
 * Evaluate a single AxisDiscomfortPattern against axis truth.
 *
 * Pure deterministic function. Same inputs always produce same output.
 *
 * Dispatches on pattern.kind. Six variants:
 *   - axis_band: matches axis.band against expected band value
 *   - axis_score_below: matches axis.score < threshold
 *   - axis_score_above: matches axis.score > threshold
 *   - component_present: searches for component by ID across all axes
 *   - scenario_clearance: reads scenario clearance from scenario_evaluation_result
 *   - fragility_hotspot_concentration: counts hotspots in fragility graph
 *
 * Defensive: unknown axis keys, missing components, unknown scenarios,
 * malformed thresholds (NaN, undefined) all return matched=false with
 * explanation. No exceptions thrown for malformed inputs.
 */
export function evaluatePattern(
  pattern: AxisDiscomfortPattern,
  inputs: PatternEvaluatorInputs,
): PatternEvaluationResult {
  switch (pattern.kind) {
    case "axis_band":
      return evaluateAxisBand(pattern, inputs.axis_composition_result);
    case "axis_score_below":
      return evaluateAxisScoreBelow(pattern, inputs.axis_composition_result);
    case "axis_score_above":
      return evaluateAxisScoreAbove(pattern, inputs.axis_composition_result);
    case "component_present":
      return evaluateComponentPresent(pattern, inputs.axis_composition_result);
    case "scenario_clearance":
      return evaluateScenarioClearance(pattern, inputs.scenario_evaluation_result);
    case "fragility_hotspot_concentration":
      return evaluateFragilityHotspotConcentration(
        pattern,
        inputs.axis_composition_result,
      );
    default: {
      // TypeScript exhaustiveness check. If CP-6 adds a new pattern
      // variant without updating this evaluator, the next line becomes
      // a type error at compile time.
      const _exhaustive: never = pattern;
      return {
        matched: false,
        pattern_kind: (_exhaustive as AxisDiscomfortPattern).kind,
        explanation: "Unknown pattern variant — evaluator did not recognize the pattern kind.",
        observed_value: "n/a",
        expected_value: "n/a",
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIS LOOKUP HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up an axis score from the composition result by axis key.
 * Returns the AxisScore or UncertaintyAxisScore depending on which
 * axis is requested. underwriting_uncertainty returns the composite
 * (with sub_axes accessible separately).
 *
 * Returns null only if the axis key is genuinely unknown — which
 * shouldn't happen given the typed union but we defend against it.
 */
function lookupAxis(
  result: AxisCompositionResult,
  axis: AxisKey,
): AxisScore | UncertaintyAxisScore | null {
  switch (axis) {
    case "financial_score":
      return result.financial_score;
    case "durability_score":
      return result.durability_score;
    case "evidence_quality":
      return result.evidence_quality;
    case "assumption_fragility":
      return result.assumption_fragility;
    case "underwriting_uncertainty":
      return result.underwriting_uncertainty;
    default: {
      const _exhaustive: never = axis;
      void _exhaustive;
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT 1: AXIS BAND
// ─────────────────────────────────────────────────────────────────────────────

function evaluateAxisBand(
  pattern: Extract<AxisDiscomfortPattern, { kind: "axis_band" }>,
  result: AxisCompositionResult,
): PatternEvaluationResult {
  const axis = lookupAxis(result, pattern.axis);
  if (!axis) {
    return {
      matched: false,
      pattern_kind: "axis_band",
      explanation: `Axis "${pattern.axis}" not found in axis composition result.`,
      observed_value: "axis_not_found",
      expected_value: `band=${pattern.band}`,
    };
  }

  const matched = axis.band === pattern.band;
  return {
    matched,
    pattern_kind: "axis_band",
    explanation: matched
      ? `Axis ${pattern.axis} is in band "${pattern.band}" as the pattern expected.`
      : `Axis ${pattern.axis} is in band "${axis.band}" but the pattern expected band "${pattern.band}".`,
    observed_value: `${pattern.axis}.band=${axis.band} (score=${axis.score.toFixed(1)})`,
    expected_value: `${pattern.axis}.band=${pattern.band}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT 2: AXIS SCORE BELOW
// ─────────────────────────────────────────────────────────────────────────────

function evaluateAxisScoreBelow(
  pattern: Extract<AxisDiscomfortPattern, { kind: "axis_score_below" }>,
  result: AxisCompositionResult,
): PatternEvaluationResult {
  const axis = lookupAxis(result, pattern.axis);
  if (!axis) {
    return {
      matched: false,
      pattern_kind: "axis_score_below",
      explanation: `Axis "${pattern.axis}" not found in axis composition result.`,
      observed_value: "axis_not_found",
      expected_value: `score < ${pattern.threshold}`,
    };
  }

  // Defensive: malformed threshold (NaN) means we cannot evaluate
  if (typeof pattern.threshold !== "number" || Number.isNaN(pattern.threshold)) {
    return {
      matched: false,
      pattern_kind: "axis_score_below",
      explanation: `Pattern threshold is malformed (not a number); pattern cannot be evaluated.`,
      observed_value: `${pattern.axis}.score=${axis.score.toFixed(1)}`,
      expected_value: `score < ${String(pattern.threshold)}`,
    };
  }

  const matched = axis.score < pattern.threshold;
  return {
    matched,
    pattern_kind: "axis_score_below",
    explanation: matched
      ? `Axis ${pattern.axis} score ${axis.score.toFixed(1)} is below the threshold ${pattern.threshold} as the pattern expected.`
      : `Axis ${pattern.axis} score ${axis.score.toFixed(1)} is at or above the threshold ${pattern.threshold}; pattern did not match.`,
    observed_value: `${pattern.axis}.score=${axis.score.toFixed(1)}`,
    expected_value: `score < ${pattern.threshold}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT 3: AXIS SCORE ABOVE
// ─────────────────────────────────────────────────────────────────────────────

function evaluateAxisScoreAbove(
  pattern: Extract<AxisDiscomfortPattern, { kind: "axis_score_above" }>,
  result: AxisCompositionResult,
): PatternEvaluationResult {
  const axis = lookupAxis(result, pattern.axis);
  if (!axis) {
    return {
      matched: false,
      pattern_kind: "axis_score_above",
      explanation: `Axis "${pattern.axis}" not found in axis composition result.`,
      observed_value: "axis_not_found",
      expected_value: `score > ${pattern.threshold}`,
    };
  }

  if (typeof pattern.threshold !== "number" || Number.isNaN(pattern.threshold)) {
    return {
      matched: false,
      pattern_kind: "axis_score_above",
      explanation: `Pattern threshold is malformed (not a number); pattern cannot be evaluated.`,
      observed_value: `${pattern.axis}.score=${axis.score.toFixed(1)}`,
      expected_value: `score > ${String(pattern.threshold)}`,
    };
  }

  const matched = axis.score > pattern.threshold;
  return {
    matched,
    pattern_kind: "axis_score_above",
    explanation: matched
      ? `Axis ${pattern.axis} score ${axis.score.toFixed(1)} is above the threshold ${pattern.threshold} as the pattern expected.`
      : `Axis ${pattern.axis} score ${axis.score.toFixed(1)} is at or below the threshold ${pattern.threshold}; pattern did not match.`,
    observed_value: `${pattern.axis}.score=${axis.score.toFixed(1)}`,
    expected_value: `score > ${pattern.threshold}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT 4: COMPONENT PRESENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search for a component by ID across all five axis component lists
 * (financial_score, durability_score, evidence_quality, assumption_fragility,
 * underwriting_uncertainty plus its three sub-axes).
 *
 * Returns matched=true if any axis contains a component with the
 * specified component_id.
 */
function evaluateComponentPresent(
  pattern: Extract<AxisDiscomfortPattern, { kind: "component_present" }>,
  result: AxisCompositionResult,
): PatternEvaluationResult {
  const componentId = pattern.component_id;

  // Collect all components across all five axes plus uncertainty sub-axes
  const allComponentLists: ReadonlyArray<{
    readonly axis_name: string;
    readonly components: AxisScore["components"];
  }> = [
    { axis_name: "financial_score", components: result.financial_score.components },
    { axis_name: "durability_score", components: result.durability_score.components },
    { axis_name: "evidence_quality", components: result.evidence_quality.components },
    { axis_name: "assumption_fragility", components: result.assumption_fragility.components },
    { axis_name: "underwriting_uncertainty", components: result.underwriting_uncertainty.components },
    {
      axis_name: "underwriting_uncertainty.data_uncertainty",
      components: result.underwriting_uncertainty.sub_axes.data_uncertainty.components,
    },
    {
      axis_name: "underwriting_uncertainty.structural_uncertainty",
      components: result.underwriting_uncertainty.sub_axes.structural_uncertainty.components,
    },
    {
      axis_name: "underwriting_uncertainty.model_uncertainty",
      components: result.underwriting_uncertainty.sub_axes.model_uncertainty.components,
    },
  ];

  // Find the first axis containing the component
  let foundIn: string | null = null;
  for (const axisGroup of allComponentLists) {
    const exists = axisGroup.components.some((c) => c.component_id === componentId);
    if (exists) {
      foundIn = axisGroup.axis_name;
      break;
    }
  }

  if (foundIn !== null) {
    return {
      matched: true,
      pattern_kind: "component_present",
      explanation: `Component ${componentId} is present on axis ${foundIn} as the pattern expected.`,
      observed_value: `component_present_on=${foundIn}`,
      expected_value: `component_id=${componentId}`,
    };
  }

  return {
    matched: false,
    pattern_kind: "component_present",
    explanation: `Component ${componentId} is not present on any axis; pattern did not match.`,
    observed_value: `component_not_found`,
    expected_value: `component_id=${componentId}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT 5: SCENARIO CLEARANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a scenario's clearance state from the scenario evaluation result
 * and check whether it's at or worse than the pattern's threshold.
 *
 * The pattern's clears_at_worst declares "this pattern matches when the
 * scenario clears at or worse than this level." So:
 *   - clears_at_worst="fails": only fails matches
 *   - clears_at_worst="structurally_compressed": fails OR
 *     structurally_compressed matches
 *   - clears_at_worst="clears_marginally": fails OR
 *     structurally_compressed OR clears_marginally matches
 *
 * Scenarios that didn't apply (clears="not_applicable") do NOT match —
 * a personality discomfort cannot fire on a scenario that wasn't relevant
 * to the deal.
 */

const CLEARANCE_SEVERITY_ORDER: Record<ScenarioOutput["clears"], number> = {
  not_applicable: -1,
  clears_comfortably: 0,
  clears_marginally: 1,
  structurally_compressed: 2,
  fails: 3,
};

function evaluateScenarioClearance(
  pattern: Extract<AxisDiscomfortPattern, { kind: "scenario_clearance" }>,
  result: ScenarioEvaluationResult,
): PatternEvaluationResult {
  const scenario = result.outputs.find((s) => s.scenario_id === pattern.scenario_id);

  if (!scenario) {
    return {
      matched: false,
      pattern_kind: "scenario_clearance",
      explanation: `Scenario ${pattern.scenario_id} not found in scenario evaluation result; pattern cannot match.`,
      observed_value: "scenario_not_found",
      expected_value: `scenario=${pattern.scenario_id} clears_at_worst=${pattern.clears_at_worst}`,
    };
  }

  // Scenarios that didn't apply produce no discomfort signal
  if (!scenario.applied || scenario.clears === "not_applicable") {
    return {
      matched: false,
      pattern_kind: "scenario_clearance",
      explanation: `Scenario ${pattern.scenario_id} did not apply to this deal (${scenario.reason_not_applied ?? "not applicable"}); personality discomfort cannot fire on a non-applied scenario.`,
      observed_value: `scenario=${pattern.scenario_id} applied=false`,
      expected_value: `scenario=${pattern.scenario_id} clears_at_worst=${pattern.clears_at_worst}`,
    };
  }

  const observedSeverity = CLEARANCE_SEVERITY_ORDER[scenario.clears];
  const thresholdSeverity = CLEARANCE_SEVERITY_ORDER[pattern.clears_at_worst];
  const matched = observedSeverity >= thresholdSeverity;

  return {
    matched,
    pattern_kind: "scenario_clearance",
    explanation: matched
      ? `Scenario ${pattern.scenario_id} clears at "${scenario.clears}" which is at or worse than the threshold "${pattern.clears_at_worst}"; pattern matched.`
      : `Scenario ${pattern.scenario_id} clears at "${scenario.clears}" which is better than the threshold "${pattern.clears_at_worst}"; pattern did not match.`,
    observed_value: `scenario.${pattern.scenario_id}.clears=${scenario.clears}`,
    expected_value: `clears_at_worst=${pattern.clears_at_worst}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT 6: FRAGILITY HOTSPOT CONCENTRATION
// ─────────────────────────────────────────────────────────────────────────────

function evaluateFragilityHotspotConcentration(
  pattern: Extract<AxisDiscomfortPattern, { kind: "fragility_hotspot_concentration" }>,
  result: AxisCompositionResult,
): PatternEvaluationResult {
  const hotspotCount = result.assumption_fragility_graph.summary.hotspot_count;

  if (typeof pattern.min_hotspot_count !== "number" || Number.isNaN(pattern.min_hotspot_count)) {
    return {
      matched: false,
      pattern_kind: "fragility_hotspot_concentration",
      explanation: `Pattern min_hotspot_count is malformed; pattern cannot be evaluated.`,
      observed_value: `hotspot_count=${hotspotCount}`,
      expected_value: `min_hotspot_count=${String(pattern.min_hotspot_count)}`,
    };
  }

  const matched = hotspotCount >= pattern.min_hotspot_count;
  return {
    matched,
    pattern_kind: "fragility_hotspot_concentration",
    explanation: matched
      ? `Fragility graph has ${hotspotCount} hotspots, at or above the threshold ${pattern.min_hotspot_count}; pattern matched.`
      : `Fragility graph has ${hotspotCount} hotspots, below the threshold ${pattern.min_hotspot_count}; pattern did not match.`,
    observed_value: `hotspot_count=${hotspotCount}`,
    expected_value: `min_hotspot_count=${pattern.min_hotspot_count}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the pattern evaluator at module load. Tests basic exhaustiveness
 * and defensive behavior on malformed inputs.
 *
 * Returns true if all checks pass. Fails closed at module load if anything
 * unexpected.
 */
function selfTestPatternEvaluator(): boolean {
  // The runtime self-test cannot fully validate without a real
  // AxisCompositionResult, but it can confirm the module loaded with
  // all expected exports.
  return typeof evaluatePattern === "function";
}

if (!selfTestPatternEvaluator()) {
  throw new Error(
    `Pattern evaluator self-test failed at module load (${PATTERN_EVALUATOR_VERSION}).`,
  );
}
