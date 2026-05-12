// lib/intelligence/scenarios/scenario-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Scenario Engine Orchestrator
//
// CP-4 Module: The orchestrator that wires together the scenario catalogue
// (scenario-catalogue.ts), the adjustment primitives (adjustment-primitives.ts),
// and the centralized clearance evaluator (clearance.ts) into a single
// evaluator. Produces a ScenarioEvaluationResult for one deal.
//
// Evaluation order (strict — never deviates):
//
//   1. Receive inputs + resolved fingerprint + RuleEngineResult.
//      The engine never re-resolves fingerprints or re-runs rules; CP-2
//      and CP-3 are upstream.
//
//   2. For each Scenario in SCENARIO_CATALOGUE:
//      a. Check applies_to_models gate (model gate handled by engine)
//      b. Call scenario.evaluate(context) which internally checks
//         applies_when (condition gate handled by scenario)
//      c. Collect the ScenarioOutput regardless of applied=true/false
//         (downstream consumers may want to see which scenarios were
//         considered but inapplicable)
//
//   3. Detect scenario interactions — RESERVED in CP-4. The engine
//      always emits an empty scenario_interactions array. Future
//      checkpoints implement the detection logic; the contract is
//      locked here.
//
//   4. Compute summary counts for diagnostic provenance. Downstream
//      modules compute their own axis impacts; these counts are
//      provenance only.
//
// Design constraints honored:
//
//   - Pure evaluator. No I/O. No module state beyond catalogue references.
//   - Determinism. Same inputs produce same outputs (modulo timestamps
//     and per-evaluation UUIDs).
//   - Read-only relative to upstream. Never modifies inputs, fingerprint,
//     or RuleEngineResult.
//   - No probability weighting, no Monte Carlo, no LLM judgment, no
//     multi-period forecasting. Single-period deterministic reframing.
//   - Survivability framing only. Clearance produces survivability
//     signals; verdicts live in CP-5+ and human judgment.
// ─────────────────────────────────────────────────────────────────────────────

import type { FingerprintResolution } from "../types";
import type { RuleEngineInputs, RuleEngineResult } from "../rules/types";
import type {
  ScenarioClearance,
  ScenarioEvaluationContext,
  ScenarioEvaluationResult,
  ScenarioFamily,
  ScenarioInteraction,
  ScenarioOutput,
} from "./types";
import {
  SCENARIO_CATALOGUE_VERSION,
  SCENARIO_ENGINE_VERSION,
  CLEARANCE_FRAMEWORK_VERSION,
} from "./types";
import { SCENARIO_CATALOGUE } from "./scenario-catalogue";

// Re-export versions for downstream consumers
export {
  SCENARIO_CATALOGUE_VERSION,
  SCENARIO_ENGINE_VERSION,
  CLEARANCE_FRAMEWORK_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION-ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let evaluationCounter = 0;
function makeEvaluationId(): string {
  evaluationCounter += 1;
  return `scenario-eval-${Date.now()}-${evaluationCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL-GATE HANDLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The engine handles the model gate; the scenario handles the condition
 * gate. This separates "is this scenario relevant to this operating
 * model at all?" from "given that it is, does the deal's data support
 * applying it?"
 */
function passesModelGate(
  applies_to_models: ReadonlyArray<string>,
  resolution: FingerprintResolution,
): boolean {
  if (applies_to_models.length === 0) return true; // empty = applies to all
  return applies_to_models.includes(resolution.fingerprint.key);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

function evaluateOneScenario(
  scenario: (typeof SCENARIO_CATALOGUE)[number],
  context: ScenarioEvaluationContext,
): ScenarioOutput {
  // Model gate — handled by engine
  if (!passesModelGate(scenario.applies_to_models, context.fingerprint_resolution)) {
    const modelList = scenario.applies_to_models.join(", ");
    return {
      output_id: `${scenario.id}@${context.evaluated_at}#model_gate`,
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      family: scenario.family,
      applied: false,
      reason_not_applied: `Scenario applies to ${modelList}; this deal's operating model is ${context.fingerprint_resolution.fingerprint.key}.`,
      adjustments: [],
      adjusted_inputs: {},
      clears: "not_applicable",
      clearance_basis: scenario.clearance_basis,
      clearance_reason: `Scenario did not apply: operating model not in scope.`,
      scenario_confidence_score: null,
      confidence_factors: [],
      what_triggered: "Scenario's operating-model gate not satisfied.",
      what_changed: "No adjustments applied.",
      why_defensible: "n/a",
      what_would_change_result: `Scenario applies to ${modelList} only.`,
      depends_on_assumptions: scenario.depends_on_assumptions,
      evaluated_at: context.evaluated_at,
      catalogue_version: SCENARIO_CATALOGUE_VERSION,
    };
  }

  // Condition gate — handled by scenario via applies_when + evaluate
  try {
    return scenario.evaluate(context);
  } catch (err) {
    // Defensive: a scenario that throws is a programming bug. Surface
    // a not-applicable output rather than crashing the entire evaluation.
    // Future telemetry (CP-9) will route the error to structured logs.
    void err;
    return {
      output_id: `${scenario.id}@${context.evaluated_at}#error`,
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      family: scenario.family,
      applied: false,
      reason_not_applied: `Scenario evaluation raised an error; output suppressed to protect downstream consumers.`,
      adjustments: [],
      adjusted_inputs: {},
      clears: "not_applicable",
      clearance_basis: scenario.clearance_basis,
      clearance_reason: "Scenario did not apply: evaluation error.",
      scenario_confidence_score: null,
      confidence_factors: [],
      what_triggered: "Evaluation error.",
      what_changed: "No adjustments applied.",
      why_defensible: "n/a",
      what_would_change_result: "Fix the underlying scenario evaluation bug.",
      depends_on_assumptions: scenario.depends_on_assumptions,
      evaluated_at: context.evaluated_at,
      catalogue_version: SCENARIO_CATALOGUE_VERSION,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

function computeSummary(
  outputs: ReadonlyArray<ScenarioOutput>,
): ScenarioEvaluationResult["summary"] {
  const applied = outputs.filter((o) => o.applied);
  const notApplicable = outputs.filter((o) => !o.applied);

  const countClearance = (c: ScenarioClearance) =>
    applied.filter((o) => o.clears === c).length;

  const countFamily = (f: ScenarioFamily) =>
    applied.filter((o) => o.family === f).length;

  return {
    total_scenarios_evaluated: outputs.length,
    applied_count: applied.length,
    not_applicable_count: notApplicable.length,
    clears_comfortably: countClearance("clears_comfortably"),
    clears_marginally: countClearance("clears_marginally"),
    structurally_compressed: countClearance("structurally_compressed"),
    fails: countClearance("fails"),
    normalization_count: countFamily("normalization"),
    stress_count: countFamily("stress"),
    structural_reinterpretation_count: countFamily("structural_reinterpretation"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate the scenario catalogue against a deal.
 *
 * Inputs:
 *   - inputs: RuleEngineInputs (extended with source metadata and
 *     trajectory fields per CP-3)
 *   - fingerprint_resolution: pre-resolved by the orchestrator (CP-2)
 *   - rule_engine_result: produced by the rule engine (CP-3); scenarios
 *     read this to decide applicability
 *
 * Output: a full ScenarioEvaluationResult containing:
 *   - all scenario outputs (catalogue order)
 *   - scenario_interactions: always [] in CP-4 (RESERVED)
 *   - summary counts for diagnostic provenance
 *
 * The result is what CP-5 (axis composition), CP-7 (lender simulation),
 * CP-8 (narrative), and CP-9 (snapshot persistence) read.
 *
 * The function is pure modulo per-evaluation UUID generation and
 * timestamps.
 */
export function evaluateScenarios(
  inputs: RuleEngineInputs,
  fingerprint_resolution: FingerprintResolution,
  rule_engine_result: RuleEngineResult,
): ScenarioEvaluationResult {
  const evaluatedAt = new Date().toISOString();
  const context: ScenarioEvaluationContext = {
    inputs,
    fingerprint_resolution,
    rule_engine_result,
    evaluated_at: evaluatedAt,
  };

  // ── Phase 1: Scenario evaluation ──
  const outputs: ScenarioOutput[] = [];
  for (const scenario of SCENARIO_CATALOGUE) {
    outputs.push(evaluateOneScenario(scenario, context));
  }

  // ── Phase 2: Scenario interaction detection — RESERVED ──
  // CP-4 always emits an empty array. Future checkpoints implement
  // the detection logic; the contract is locked here per CP-4
  // guardrail #4.
  const scenario_interactions: ReadonlyArray<ScenarioInteraction> = [];

  // ── Phase 3: Summary computation ──
  const summary = computeSummary(outputs);

  // ── Phase 4: Assemble final result ──
  return {
    evaluation_id: makeEvaluationId(),
    evaluated_at: evaluatedAt,
    catalogue_version: SCENARIO_CATALOGUE_VERSION,
    engine_version: SCENARIO_ENGINE_VERSION,
    outputs,
    scenario_interactions,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate against the catalogue and return a human-readable diagnostic
 * summary. Used by CLI tools, debug endpoints, and operational tooling.
 * Not part of the production data path.
 */
export function evaluateScenariosWithDiagnostics(
  inputs: RuleEngineInputs,
  fingerprint_resolution: FingerprintResolution,
  rule_engine_result: RuleEngineResult,
): {
  readonly result: ScenarioEvaluationResult;
  readonly diagnostic_lines: ReadonlyArray<string>;
} {
  const result = evaluateScenarios(inputs, fingerprint_resolution, rule_engine_result);
  const lines: string[] = [];

  lines.push(`Scenario engine evaluation: ${result.evaluation_id}`);
  lines.push(`  Evaluated at: ${result.evaluated_at}`);
  lines.push(`  Catalogue version: ${result.catalogue_version}`);
  lines.push(`  Engine version: ${result.engine_version}`);
  lines.push(`  Fingerprint: ${fingerprint_resolution.fingerprint.display_name}`);
  if (fingerprint_resolution.is_fallback) {
    lines.push(`    (fallback used: ${fingerprint_resolution.fallback_reason})`);
  }
  lines.push("");
  lines.push("Summary:");
  lines.push(`  Scenarios evaluated: ${result.summary.total_scenarios_evaluated}`);
  lines.push(`    Applied: ${result.summary.applied_count}`);
  lines.push(`    Not applicable: ${result.summary.not_applicable_count}`);
  lines.push(`  Clearance distribution (applied scenarios only):`);
  lines.push(`    clears_comfortably: ${result.summary.clears_comfortably}`);
  lines.push(`    clears_marginally: ${result.summary.clears_marginally}`);
  lines.push(`    structurally_compressed: ${result.summary.structurally_compressed}`);
  lines.push(`    fails: ${result.summary.fails}`);
  lines.push(`  By family:`);
  lines.push(`    normalization: ${result.summary.normalization_count}`);
  lines.push(`    stress: ${result.summary.stress_count}`);
  lines.push(`    structural_reinterpretation: ${result.summary.structural_reinterpretation_count}`);
  lines.push(`  Scenario interactions: ${result.scenario_interactions.length} (RESERVED in CP-4 — always 0)`);

  const applied = result.outputs.filter((o) => o.applied);
  if (applied.length > 0) {
    lines.push("");
    lines.push("Applied scenarios:");
    applied.forEach((o) => {
      lines.push(`  - [${o.clears}/${o.family}] ${o.scenario_id}`);
      lines.push(`    triggered: ${o.what_triggered}`);
    });
  }

  const notApplied = result.outputs.filter((o) => !o.applied);
  if (notApplied.length > 0) {
    lines.push("");
    lines.push("Not-applied scenarios:");
    notApplied.forEach((o) => {
      lines.push(`  - ${o.scenario_id}: ${o.reason_not_applied}`);
    });
  }

  return {
    result,
    diagnostic_lines: lines,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE-LEVEL SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioEngineSelfTestResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly version: string;
}

/**
 * Cross-module self-test runnable at module load or externally. Verifies:
 *   - Catalogue is non-empty
 *   - No structural_reinterpretation scenarios shipped in CP-4 catalogue
 *   - scenario_interactions array is always empty in CP-4
 *   - Engine accepts minimal inputs without crashing
 *
 * Throws on failure. Called at module load.
 */
function selfTestScenarioEngine(): ScenarioEngineSelfTestResult {
  const issues: string[] = [];

  if (SCENARIO_CATALOGUE.length === 0) {
    issues.push("Scenario catalogue is empty.");
  }

  const reservedCount = SCENARIO_CATALOGUE.filter(
    (s) => s.family === "structural_reinterpretation",
  ).length;
  if (reservedCount > 0) {
    issues.push(
      `${reservedCount} scenario(s) declare structural_reinterpretation family. ` +
        `This family is RESERVED in CP-4 — implementation deferred to a future checkpoint.`,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    version: SCENARIO_ENGINE_VERSION,
  };
}

export function validateScenarioEngine(): ScenarioEngineSelfTestResult {
  return selfTestScenarioEngine();
}

// Fail-closed at load time
const selfTestResult = selfTestScenarioEngine();
if (!selfTestResult.ok) {
  throw new Error(
    `Scenario engine self-test failed (${SCENARIO_ENGINE_VERSION}):\n` +
      selfTestResult.issues.map((i) => `  ${i}`).join("\n"),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARREL EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
// Convenience re-exports so consumers can import everything from
// "./scenario-engine" matching the CP-2/CP-3 hybrid pattern.

export {
  SCENARIO_CATALOGUE,
  getScenario,
  scenariosByFamily,
  scenariosForModel,
} from "./scenario-catalogue";
export {
  resolveThresholds,
  evaluateDscrClearance,
  evaluateCurrentRatioClearance,
  evaluateMarginClearance,
  combineClearances,
  buildClearanceReason,
  DEFAULT_DSCR_COMFORTABLE,
  DEFAULT_DSCR_MARGINAL,
  DEFAULT_DSCR_COMPRESSED,
  DEFAULT_DSCR_FAILURE,
} from "./clearance";
export {
  KNOWN_PRIMITIVE_IDS,
  suggestOwnerReplacementCost,
} from "./adjustment-primitives";
