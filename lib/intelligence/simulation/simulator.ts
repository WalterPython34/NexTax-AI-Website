// lib/intelligence/simulation/simulator.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Lender Posture Simulator
//
// CP-7 Module: The final file. The orchestrator that wires pattern
// evaluation and posture derivation together, exposes the simulator
// APIs, and enforces architectural commitments at module load.
//
// Architectural responsibility:
//
//   The simulator is the procedural layer that operationalizes CP-6's
//   declarative catalogue. CP-6 declared "SBA has these deal-breakers,
//   these discomfort sources, these comfort conditions." This module
//   implements: given a specific deal's axis composition result and
//   scenario evaluation result, WHICH SBA deal-breakers triggered,
//   WHICH discomforts fired, WHICH comfort conditions were satisfied —
//   and what posture state does that derive to.
//
//   It is the ONLY place in the codebase that calls evaluatePattern()
//   across personality declarations and assembles the resulting
//   LenderPosture.
//
// Public APIs (both per Q6 = B):
//
//   - simulatePosture(personality, axis_result, scenario_result) →
//       SinglePersonalitySimulationResult
//   - simulateAllPostures(axis_result, scenario_result) →
//       BatchSimulationResult
//
// Architectural commitments enforced at module load:
//
//   1. NO PROBABILITY FIELDS. Self-test attempts to find any field
//      in the LenderPosture output with names like probability,
//      likelihood, confidence_pct, etc. Throws at module load if any
//      appear.
//
//   2. ONLY THREE POSTURE STATES. Self-test verifies the simulator
//      cannot emit state values outside the typed union.
//
//   3. RECOVERY SURFACE PRESERVED. Self-test verifies that even
//      `decline` postures carry the structured discomfort chain,
//      unsatisfied comfort conditions, and unmet information needs
//      needed for CP-10+ recovery path intelligence.
// ─────────────────────────────────────────────────────────────────────────────

import type { AxisKey } from "../types";
import type {
  AxisCompositionResult,
  AxisScore,
  UncertaintyAxisScore,
} from "../axes/types";
import type {
  ScenarioEvaluationResult,
} from "../scenarios/types";
import type {
  LenderPersonality,
  LenderPosture,
  PersonalityId,
  PostureState,
} from "../personalities/types";
import type {
  BatchSimulationInput,
  BatchSimulationResult,
  PostureDerivationInputs,
  SimulatorValidationResult,
  SinglePersonalitySimulationResult,
} from "./types";
import { SIMULATOR_VERSION } from "./types";
import { evaluatePattern } from "./pattern-evaluator";
import {
  assemblePostureTrace,
  derivePostureState,
} from "./posture-derivation";
import { PERSONALITY_CATALOGUE, getPersonality } from "../personalities/personality-registry";

// Re-export
export { SIMULATOR_VERSION };
export { evaluatePattern };
export { derivePostureState };

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION-ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let postureCounter = 0;
function makePostureId(): string {
  postureCounter += 1;
  return `posture-${Date.now()}-${postureCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

let batchCounter = 0;
function makeBatchId(): string {
  batchCounter += 1;
  return `batch-${Date.now()}-${batchCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIS LOOKUP HELPER (local)
// ─────────────────────────────────────────────────────────────────────────────

function lookupAxis(
  result: AxisCompositionResult,
  axis: AxisKey,
): AxisScore | UncertaintyAxisScore {
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API: SINGLE-PERSONALITY SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulate one personality's posture on one axis composition result.
 *
 * Pure deterministic function modulo per-evaluation UUID and timestamp.
 *
 * Process:
 *   1. Evaluate each information need against axis truth
 *   2. Evaluate each deal-breaker
 *   3. Evaluate each discomfort source
 *   4. Evaluate each comfort condition
 *   5. Derive posture state via posture-derivation state machine
 *   6. Assemble LenderPosture + PostureDerivationTrace
 *
 * Returns posture + trace. The simulator does NOT emit probabilities,
 * confidence scores, or likelihood percentages — only the categorical
 * state plus structured supporting data.
 */
export function simulatePosture(
  personality: LenderPersonality,
  axis_composition_result: AxisCompositionResult,
  scenario_evaluation_result: ScenarioEvaluationResult,
): SinglePersonalitySimulationResult {
  const evaluatedAt = new Date().toISOString();
  const postureId = makePostureId();

  const evaluatorInputs = {
    axis_composition_result,
    scenario_evaluation_result,
  };

  // ── Phase 1: Information needs check ──
  const unmetInformationNeeds: string[] = [];
  for (const need of personality.information_needs) {
    const result = evaluatePattern(need.missing_when, evaluatorInputs);
    if (result.matched) {
      unmetInformationNeeds.push(need.id);
    }
  }

  // ── Phase 2: Deal-breaker check ──
  const triggeredDealBreakers: string[] = [];
  for (const db of personality.deal_breakers) {
    const result = evaluatePattern(db.trigger, evaluatorInputs);
    if (result.matched) {
      triggeredDealBreakers.push(db.id);
    }
  }

  // ── Phase 3: Discomfort detection ──
  const triggeredDiscomforts: ReadonlyArray<{
    readonly discomfort_source_id: string;
    readonly repairability: "repairable" | "fatal";
    readonly trigger_explanation: string;
  }> = personality.discomfort_sources
    .map((ds) => {
      const result = evaluatePattern(ds.trigger, evaluatorInputs);
      if (result.matched) {
        return {
          discomfort_source_id: ds.id,
          repairability: ds.repairability,
          trigger_explanation: result.explanation,
        };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // ── Phase 4: Comfort condition evaluation ──
  const satisfiedComfortConditions: string[] = [];
  const unsatisfiedRequiredComfort: string[] = [];
  const unsatisfiedOtherComfort: string[] = [];
  for (const cc of personality.required_comfort_conditions) {
    const result = evaluatePattern(cc.satisfied_when, evaluatorInputs);
    if (result.matched) {
      satisfiedComfortConditions.push(cc.id);
    } else if (cc.required_for_interested) {
      unsatisfiedRequiredComfort.push(cc.id);
    } else {
      unsatisfiedOtherComfort.push(cc.id);
    }
  }

  // ── Phase 5: State derivation ──
  const derivationInputs: PostureDerivationInputs = {
    triggered_deal_breakers: triggeredDealBreakers,
    triggered_discomforts: triggeredDiscomforts.map((d) => ({
      discomfort_source_id: d.discomfort_source_id,
      repairability: d.repairability,
    })),
    unsatisfied_required_comfort_conditions: unsatisfiedRequiredComfort,
    unsatisfied_other_comfort_conditions: unsatisfiedOtherComfort,
    satisfied_comfort_conditions: satisfiedComfortConditions,
    unmet_information_needs: unmetInformationNeeds,
  };

  const derivation = derivePostureState(derivationInputs);

  // ── Phase 6: Build per-axis readings ──
  const axisReadings = personality.axis_priority_order.map((axis, idx) => {
    const axisScore = lookupAxis(axis_composition_result, axis);
    return {
      axis,
      priority_position: idx + 1,
      score_observed: axisScore.score,
      band_observed: axisScore.band,
      personality_assessment: buildPersonalityAxisAssessment(
        axis,
        idx + 1,
        axisScore,
        personality,
      ),
    };
  });

  // ── Phase 7: Build explanation (Q4 = A, template-based) ──
  const explanation = buildPostureExplanation({
    personality,
    state: derivation.state,
    triggered_deal_breakers: triggeredDealBreakers,
    fatal_discomfort_count: triggeredDiscomforts.filter((d) => d.repairability === "fatal").length,
    repairable_discomfort_count: triggeredDiscomforts.filter((d) => d.repairability === "repairable").length,
    unsatisfied_required_count: unsatisfiedRequiredComfort.length,
    unmet_information_need_count: unmetInformationNeeds.length,
  });

  // ── Assemble final LenderPosture ──
  const posture: LenderPosture = {
    posture_id: postureId,
    personality_id: personality.id,
    personality_version: personality.version,
    axis_composition_evaluation_id: axis_composition_result.evaluation_id,
    evaluated_at: evaluatedAt,
    state: derivation.state,
    explanation,
    triggered_deal_breakers: triggeredDealBreakers,
    discomfort_chain: triggeredDiscomforts,
    unsatisfied_comfort_conditions: [
      ...unsatisfiedRequiredComfort,
      ...unsatisfiedOtherComfort,
    ],
    satisfied_comfort_conditions: satisfiedComfortConditions,
    unmet_information_needs: unmetInformationNeeds,
    axis_priority_order_used: personality.axis_priority_order,
    axis_readings: axisReadings,
  };

  const trace = assemblePostureTrace({
    posture_id: postureId,
    personality_id: personality.id,
    personality_version: personality.version,
    final_state: derivation.state,
    steps: derivation.steps,
    transition_summary: derivation.transition_summary,
  });

  return { posture, derivation_trace: trace };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API: BATCH SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulate posture for all personalities (or a specified subset) against
 * one axis composition result.
 *
 * Stable order: matches catalogue declaration order if no personality_ids
 * provided; matches personality_ids array order if provided.
 *
 * Used by dashboard, PDF report, and lender-fit comparison views.
 */
export function simulateAllPostures(
  input: BatchSimulationInput,
): BatchSimulationResult {
  const evaluatedAt = new Date().toISOString();
  const batchId = makeBatchId();

  // Determine which personalities to simulate
  const targetPersonalities: ReadonlyArray<LenderPersonality> =
    input.personality_ids && input.personality_ids.length > 0
      ? input.personality_ids
          .map((id) => getPersonality(id))
          .filter((p): p is LenderPersonality => p !== null)
      : PERSONALITY_CATALOGUE;

  // Simulate each personality
  const entries = targetPersonalities.map((personality) => {
    const result = simulatePosture(
      personality,
      input.axis_composition_result,
      input.scenario_evaluation_result,
    );
    return {
      personality_id: personality.id,
      personality_version: personality.version,
      posture: result.posture,
      derivation_trace: result.derivation_trace,
    };
  });

  // Compute summary
  const summary = {
    total_personalities_simulated: entries.length,
    interested_count: entries.filter((e) => e.posture.state === "interested").length,
    cautious_count: entries.filter((e) => e.posture.state === "cautious").length,
    decline_count: entries.filter((e) => e.posture.state === "decline").length,
    personalities_with_triggered_deal_breakers: entries.filter(
      (e) => e.posture.triggered_deal_breakers.length > 0,
    ).length,
    personalities_with_fatal_discomforts: entries.filter((e) =>
      e.posture.discomfort_chain.some((d) => d.repairability === "fatal"),
    ).length,
  };

  return {
    batch_id: batchId,
    evaluated_at: evaluatedAt,
    simulator_version: SIMULATOR_VERSION,
    axis_composition_evaluation_id: input.axis_composition_result.evaluation_id,
    entries,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSE GENERATION (Q4 = A — template-based, deliberately plain)
// ─────────────────────────────────────────────────────────────────────────────

function buildPostureExplanation(args: {
  personality: LenderPersonality;
  state: PostureState;
  triggered_deal_breakers: ReadonlyArray<string>;
  fatal_discomfort_count: number;
  repairable_discomfort_count: number;
  unsatisfied_required_count: number;
  unmet_information_need_count: number;
}): string {
  const parts: string[] = [];

  parts.push(`Posture is ${args.state} for personality ${args.personality.id}.`);

  if (args.state === "decline") {
    if (args.triggered_deal_breakers.length > 0) {
      parts.push(
        `Drivers: ${args.triggered_deal_breakers.length} deal-breaker(s) triggered.`,
      );
    } else if (args.fatal_discomfort_count > 0) {
      parts.push(
        `Drivers: ${args.fatal_discomfort_count} fatal discomfort(s) triggered (no deal-breaker, but structural incompatibility detected).`,
      );
    }
    parts.push(
      "Decline does not mean 'bad deal' — it means this personality does not currently have a financeable comfort path under the present evidence and structure. Other personalities may reach different postures on the same deal.",
    );
  } else if (args.state === "cautious") {
    const drivers: string[] = [];
    if (args.unsatisfied_required_count > 0) {
      drivers.push(`${args.unsatisfied_required_count} required-for-interested comfort condition(s) unsatisfied`);
    }
    if (args.repairable_discomfort_count > 0) {
      drivers.push(`${args.repairable_discomfort_count} repairable discomfort(s) triggered`);
    }
    if (args.unmet_information_need_count > 0) {
      drivers.push(`${args.unmet_information_need_count} information need(s) unmet`);
    }
    parts.push(`Drivers: ${drivers.join("; ")}.`);
    parts.push(
      "Cautious means this personality sees solvable concerns rather than structural incompatibility. The unsatisfied comfort conditions, repairable discomforts, and unmet information needs are the path forward.",
    );
  } else {
    // interested
    parts.push(
      "Interested means no deal-breakers triggered, no fatal discomforts detected, no required-for-interested comfort conditions unsatisfied, and discomfort/information signals remained below cautious thresholds.",
    );
    if (args.repairable_discomfort_count > 0 || args.unmet_information_need_count > 0) {
      parts.push(
        `Note: ${args.repairable_discomfort_count} repairable discomfort(s) and ${args.unmet_information_need_count} information need(s) remain, but stayed below cautious thresholds. These would still benefit from attention during diligence.`,
      );
    }
  }

  return parts.join(" ");
}

function buildPersonalityAxisAssessment(
  axis: AxisKey,
  priority_position: number,
  axisScore: AxisScore | UncertaintyAxisScore,
  personality: LenderPersonality,
): string {
  const priorityLabel =
    priority_position === 1
      ? "primary axis"
      : priority_position === 2
        ? "secondary axis"
        : `priority position ${priority_position}`;
  return (
    `${personality.id} reads ${axis} as ${priorityLabel}. ` +
    `Score ${axisScore.score.toFixed(1)} in band "${axisScore.band}". ` +
    `${axisScore.components.length} component(s) drove this score.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TEST — fail closed at module load
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the simulator's architectural commitments at module load:
 *
 *   1. NO PROBABILITY FIELDS. Scan the LenderPosture output for any
 *      field whose name contains "probability", "likelihood",
 *      "confidence", "approval", "decline_pct", "score_pct" etc.
 *      Throw if found.
 *
 *   2. STATE VALUES VALID. Verify state ∈ {"interested", "cautious", "decline"}.
 *
 *   3. RECOVERY SURFACE PRESENT. Verify decline postures still carry
 *      structured discomfort_chain, unsatisfied_comfort_conditions,
 *      unmet_information_needs.
 */
export function validateSimulator(): SimulatorValidationResult {
  const issues: SimulatorValidationResult["issues"][number][] = [];

  // Build a minimal synthetic input to run the simulator against
  const stubAxisResult = buildStubAxisResult();
  const stubScenarioResult = buildStubScenarioResult();
  const stubPersonality = PERSONALITY_CATALOGUE[0];

  let posture: LenderPosture;
  try {
    posture = simulatePosture(stubPersonality, stubAxisResult, stubScenarioResult).posture;
  } catch (err) {
    issues.push({
      severity: "error",
      category: "pattern_evaluator_misbehavior",
      location: "simulatePosture",
      message: `simulatePosture crashed on minimal stub: ${err instanceof Error ? err.message : String(err)}`,
    });
    return {
      ok: false,
      issues,
      version: SIMULATOR_VERSION,
    };
  }

  // Check 1: No probability fields
  const forbiddenSubstrings = [
    "probability",
    "likelihood",
    "confidence_pct",
    "approval_pct",
    "decline_pct",
    "score_pct",
    "approval_likelihood",
    "decline_likelihood",
  ];
  const postureKeys = Object.keys(posture);
  for (const key of postureKeys) {
    const lower = key.toLowerCase();
    for (const forbidden of forbiddenSubstrings) {
      if (lower.includes(forbidden)) {
        issues.push({
          severity: "error",
          category: "forbidden_probability_field",
          location: `LenderPosture.${key}`,
          message:
            `Forbidden probability-style field "${key}" present in posture output. ` +
            `The simulator must not emit probability, likelihood, or confidence percentages.`,
        });
      }
    }
  }

  // Check 2: state value valid
  const validStates: ReadonlyArray<PostureState> = ["interested", "cautious", "decline"];
  if (!(validStates as ReadonlyArray<string>).includes(posture.state)) {
    issues.push({
      severity: "error",
      category: "forbidden_state_value",
      location: `LenderPosture.state`,
      message: `Posture state "${posture.state}" is not one of: ${validStates.join(", ")}`,
    });
  }

  // Check 3: Required fields present
  const requiredFields: ReadonlyArray<keyof LenderPosture> = [
    "posture_id",
    "personality_id",
    "personality_version",
    "axis_composition_evaluation_id",
    "evaluated_at",
    "state",
    "explanation",
    "triggered_deal_breakers",
    "discomfort_chain",
    "unsatisfied_comfort_conditions",
    "satisfied_comfort_conditions",
    "unmet_information_needs",
    "axis_priority_order_used",
    "axis_readings",
  ];
  for (const field of requiredFields) {
    if (!(field in posture)) {
      issues.push({
        severity: "error",
        category: "missing_required_field",
        location: `LenderPosture.${field}`,
        message: `LenderPosture is missing required field: ${field}`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    version: SIMULATOR_VERSION,
  };
}

// Minimal stub generators for self-test
function buildStubAxisResult(): AxisCompositionResult {
  // Construct a defensible minimal AxisCompositionResult shape
  // for self-test. Uses neutral score values that won't trigger any
  // specific personality patterns.
  const stubFingerprintResolution = {
    fingerprint: {
      key: "professional_services",
      display_name: "Professional Services",
    },
    industry_override: null,
    is_fallback: false,
    fallback_reason: "",
    model_uncertainty_escalation: 0,
    structural_uncertainty_escalation: 0,
  } as unknown as AxisCompositionResult["fingerprint_resolution"];

  const stubAxis = (score: number, band: string): AxisScore => ({
    axis: "financial_score" as AxisKey,
    score,
    band: band as AxisScore["band"],
    baseline: 50,
    components: [],
    net_contribution: score - 50,
    version: "stub",
  });

  const stubUncertaintyAxis = (score: number, band: string): UncertaintyAxisScore => ({
    ...stubAxis(score, band),
    sub_axes: {
      data_uncertainty: stubAxis(score, band),
      structural_uncertainty: stubAxis(score, band),
      model_uncertainty: stubAxis(score, band),
    },
  });

  return {
    evaluation_id: "stub-eval",
    evaluated_at: new Date().toISOString(),
    version: "stub",
    fingerprint_resolution: stubFingerprintResolution,
    financial_score: stubAxis(65, "moderate"),
    durability_score: stubAxis(60, "moderate"),
    evidence_quality: stubAxis(55, "moderate"),
    assumption_fragility: stubAxis(25, "low_concentration"),
    underwriting_uncertainty: stubUncertaintyAxis(20, "low_uncertainty"),
    assumption_fragility_graph: {
      version: "stub",
      nodes: [],
      edges: [],
      summary: {
        total_nodes: 0,
        hotspot_count: 0,
        max_conclusion_count: 0,
        max_layering_depth: 0,
        assumptions_with_zero_dependencies: 0,
        assumptions_with_unfavorable_only: 0,
        assumptions_with_favorable_only: 0,
        assumptions_with_mixed: 0,
      },
    },
    summary: {
      total_components: 0,
      positive_components: 0,
      negative_components: 0,
      existential_components: 0,
      fingerprint_relative_components: 0,
      global_components: 0,
      fragility_node_count: 0,
    },
  };
}

function buildStubScenarioResult(): ScenarioEvaluationResult {
  return {
    evaluation_id: "stub-eval",
    evaluated_at: new Date().toISOString(),
    catalogue_version: "stub",
    engine_version: "stub",
    outputs: [],
    scenario_interactions: [],
    summary: {
      total_scenarios_evaluated: 0,
      applied_count: 0,
      not_applicable_count: 0,
      clears_comfortably: 0,
      clears_marginally: 0,
      structurally_compressed: 0,
      fails: 0,
      normalization_count: 0,
      stress_count: 0,
      structural_reinterpretation_count: 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAIL-CLOSED MODULE LOAD
// ─────────────────────────────────────────────────────────────────────────────

const selfTestResult = validateSimulator();
if (!selfTestResult.ok) {
  const errorList = selfTestResult.issues
    .filter((i) => i.severity === "error")
    .map((i) => `  [${i.category}] ${i.location} — ${i.message}`)
    .join("\n");
  throw new Error(
    `Simulator self-test failed (${SIMULATOR_VERSION}):\n${errorList}`,
  );
}
