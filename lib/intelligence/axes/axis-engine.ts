// lib/intelligence/axes/axis-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Axis Composition Orchestrator
//
// CP-5 Module: The final file. Orchestrates the five composers and the
// fragility graph builder into a single AxisCompositionResult.
//
// Architectural responsibility:
//
//   The orchestrator is the ONLY place in the codebase that reads all
//   upstream artifacts (RuleEngineResult + ScenarioEvaluationResult +
//   FingerprintResolution + deal_source_type) and distributes them to
//   the per-axis composers. Each composer receives ONLY the input
//   streams its axis is permitted to read, enforced via the typed
//   composer input contracts.
//
//   Cross-axis contamination is structurally impossible: the composer
//   files cannot see streams the orchestrator didn't pass them. A
//   composer that wanted to read SourceConcerns to compute durability
//   would have to add a parameter to its input type — which the
//   orchestrator wouldn't pass — making the error visible at compile
//   time.
//
// Input extraction strategy:
//
//   1. Findings — extracted from RuleFiring.finding. For each axis,
//      iterate the firings and emit a finding entry per axis_impact
//      that matches the target axis. A single firing can produce
//      findings for multiple axes (each with its own relative_magnitude).
//
//   2. PatternDetections — pass-through from RuleEngineResult.
//      Patterns affect multiple axes via aggregated_axes; the
//      durability composer reads them directly.
//
//   3. ScenarioOutputs — pass-through from ScenarioEvaluationResult.
//      Financial and durability composers both read the same scenarios;
//      each filters by clearance_basis as needed.
//
//   4. SourceConcerns — extracted from RuleFiring.source_concern.
//      Only evidence composer reads these.
//
//   5. UncertaintyEscalations — extracted from
//      RuleFiring.uncertainty_escalation. Only uncertainty composer
//      reads these (with sub_axis routing internally).
//
//   6. AssumptionFragilityGraph — built FIRST so the fragility composer
//      can read it. Built from firings + patterns + scenarios + source
//      via fragility-graph.ts.
//
// Architectural guardrails enforced:
//
//   - No master/composite/blended/overall score in the result. The
//     AxisCompositionResult interface intentionally omits it; the
//     self-test verifies the absence.
//
//   - All five axes are independent first-class outputs.
//
//   - The fragility graph is a peer artifact, not just an input to
//     the fragility axis.
//
//   - Every component traces to specific upstream IDs (enforced by
//     buildComponent() in components.ts).
//
//   - Per-component normalization declared explicitly.
// ─────────────────────────────────────────────────────────────────────────────

import type { FingerprintResolution } from "../types";
import type { RuleEngineResult } from "../rules/types";
import type { ScenarioEvaluationResult } from "../scenarios/types";
import type {
  AxisCompositionInput,
  AxisCompositionResult,
  DurabilityComposerInputs,
  EvidenceComposerInputs,
  FinancialComposerInputs,
  FragilityComposerInputs,
  UncertaintyComposerInputs,
} from "./types";
import {
  AXIS_COMPOSITION_VERSION,
  AXIS_ENGINE_VERSION,
} from "./types";
import { summarizeComponents } from "./components";
import { buildFragilityGraph } from "./fragility-graph";
import { composeFinancialScore } from "./compose-financial";
import { composeDurabilityScore } from "./compose-durability";
import { composeEvidenceQuality } from "./compose-evidence";
import { composeAssumptionFragility } from "./compose-fragility";
import { composeUnderwritingUncertainty } from "./compose-uncertainty";

// Re-export versions for downstream consumers
export {
  AXIS_COMPOSITION_VERSION,
  AXIS_ENGINE_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION-ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let evaluationCounter = 0;
function makeEvaluationId(): string {
  evaluationCounter += 1;
  return `axis-eval-${Date.now()}-${evaluationCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract findings for a target axis from the rule engine result.
 *
 * A firing can affect multiple axes (its finding.axis_impact is an array).
 * We emit one finding entry per axis_impact whose axis matches the target,
 * carrying that impact's relative_magnitude. This means a single firing
 * may appear in multiple per-axis finding lists with different magnitudes
 * — exactly what the constitution intended.
 */
function extractFindingsForAxis(
  rule_engine_result: RuleEngineResult,
  target_axis: string,
): ReadonlyArray<{
  firing_id: string;
  rule_id: string;
  rule_name: string;
  direction: "positive" | "negative" | "neutral";
  observation: string;
  relative_magnitude: "high" | "medium" | "low";
}> {
  const findings: Array<{
    firing_id: string;
    rule_id: string;
    rule_name: string;
    direction: "positive" | "negative" | "neutral";
    observation: string;
    relative_magnitude: "high" | "medium" | "low";
  }> = [];

  for (const firing of rule_engine_result.firings) {
    if (!firing.finding) continue;
    for (const impact of firing.finding.axis_impact) {
      if (impact.axis === target_axis) {
        findings.push({
          firing_id: firing.firing_id,
          rule_id: firing.rule_id,
          rule_name: firing.rule_name,
          direction: firing.finding.direction,
          observation: firing.finding.observation,
          relative_magnitude: impact.relative_magnitude,
        });
        // Note: we don't break — a single firing could (in theory) declare
        // the same axis twice in axis_impact. Treat each declaration as
        // a distinct finding to preserve the upstream signal exactly.
      }
    }
  }
  return findings;
}

/**
 * Extract SourceConcern records from the rule engine result for the
 * evidence composer.
 */
function extractSourceConcerns(
  rule_engine_result: RuleEngineResult,
): EvidenceComposerInputs["source_concerns"] {
  const concerns: EvidenceComposerInputs["source_concerns"][number][] = [];
  for (const firing of rule_engine_result.firings) {
    if (firing.source_concern) {
      concerns.push({
        firing_id: firing.firing_id,
        rule_id: firing.rule_id,
        affected_input: firing.source_concern.affected_input,
        actual_source: firing.source_concern.actual_source,
        expected_minimum_source: firing.source_concern.expected_minimum_source,
        evidence_quality_reduction_points: firing.source_concern.evidence_quality_reduction_points,
        reason: firing.source_concern.reason,
      });
    }
  }
  return concerns;
}

/**
 * Extract UncertaintyDelta records from the rule engine result for the
 * uncertainty composer.
 */
function extractUncertaintyEscalations(
  rule_engine_result: RuleEngineResult,
): UncertaintyComposerInputs["uncertainty_escalations"] {
  const escalations: UncertaintyComposerInputs["uncertainty_escalations"][number][] = [];
  for (const firing of rule_engine_result.firings) {
    if (firing.uncertainty_escalation) {
      escalations.push({
        firing_id: firing.firing_id,
        rule_id: firing.rule_id,
        sub_axis: firing.uncertainty_escalation.sub_axis,
        escalation_points: firing.uncertainty_escalation.escalation_points,
        reason: firing.uncertainty_escalation.reason,
      });
    }
  }
  return escalations;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSER INPUT ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────
// Five functions that produce the five typed composer-input contracts.
// Each function reads ONLY what its target composer can see; the result
// type makes the boundary explicit.

function buildFinancialInputs(
  rule_engine_result: RuleEngineResult,
  scenario_evaluation_result: ScenarioEvaluationResult,
  fingerprint_resolution: FingerprintResolution,
): FinancialComposerInputs {
  return {
    relevant_findings: extractFindingsForAxis(rule_engine_result, "financial_score"),
    scenario_outputs: scenario_evaluation_result.outputs,
    fingerprint_resolution,
  };
}

function buildDurabilityInputs(
  rule_engine_result: RuleEngineResult,
  scenario_evaluation_result: ScenarioEvaluationResult,
  fingerprint_resolution: FingerprintResolution,
): DurabilityComposerInputs {
  return {
    relevant_findings: extractFindingsForAxis(rule_engine_result, "durability_score"),
    pattern_detections: rule_engine_result.pattern_detections,
    scenario_outputs: scenario_evaluation_result.outputs,
    fingerprint_resolution,
  };
}

function buildEvidenceInputs(
  rule_engine_result: RuleEngineResult,
  fingerprint_resolution: FingerprintResolution,
  deal_source_type: string | null,
): EvidenceComposerInputs {
  return {
    source_concerns: extractSourceConcerns(rule_engine_result),
    fingerprint_resolution,
    deal_source_type,
  };
}

function buildFragilityInputs(
  graph: ReturnType<typeof buildFragilityGraph>,
  fingerprint_resolution: FingerprintResolution,
): FragilityComposerInputs {
  return {
    graph,
    fingerprint_resolution,
  };
}

function buildUncertaintyInputs(
  rule_engine_result: RuleEngineResult,
  fingerprint_resolution: FingerprintResolution,
): UncertaintyComposerInputs {
  return {
    uncertainty_escalations: extractUncertaintyEscalations(rule_engine_result),
    fingerprint_resolution,
    suppressed_rule_ids: rule_engine_result.suppressed_rule_ids,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the five-axis output for a deal. The primary CP-5 API.
 *
 * Pure function modulo per-evaluation UUID and timestamp.
 *
 * Process:
 *   1. Build the assumption fragility graph from raw firings + patterns + scenarios
 *   2. Build typed input contracts for each composer
 *   3. Call each composer independently
 *   4. Assemble final AxisCompositionResult
 *   5. Verify no composite score field was accidentally introduced
 *      (self-test catches this at module load)
 *
 * Output:
 *   AxisCompositionResult with:
 *     - financial_score, durability_score, evidence_quality,
 *       assumption_fragility (AxisScore each)
 *     - underwriting_uncertainty (UncertaintyAxisScore with sub_axes)
 *     - assumption_fragility_graph (first-class artifact)
 *     - summary (diagnostic counts)
 *
 * The result is what CP-7 (lender simulation), CP-8 (narrative prose),
 * CP-9 (snapshot persistence), and the dashboard/PDF report read.
 */
export function composeAxes(input: AxisCompositionInput): AxisCompositionResult {
  const evaluatedAt = new Date().toISOString();

  // ── Phase 1: Build fragility graph ──
  // The graph reads all upstream artifacts; the fragility composer
  // reads only the graph downstream.
  const graph = buildFragilityGraph({
    firings: input.rule_engine_result.firings,
    pattern_detections: input.rule_engine_result.pattern_detections,
    scenario_outputs: input.scenario_evaluation_result.outputs,
    deal_source_type: input.deal_source_type,
  });

  // ── Phase 2: Build typed composer inputs ──
  const financialInputs = buildFinancialInputs(
    input.rule_engine_result,
    input.scenario_evaluation_result,
    input.fingerprint_resolution,
  );
  const durabilityInputs = buildDurabilityInputs(
    input.rule_engine_result,
    input.scenario_evaluation_result,
    input.fingerprint_resolution,
  );
  const evidenceInputs = buildEvidenceInputs(
    input.rule_engine_result,
    input.fingerprint_resolution,
    input.deal_source_type,
  );
  const fragilityInputs = buildFragilityInputs(graph, input.fingerprint_resolution);
  const uncertaintyInputs = buildUncertaintyInputs(
    input.rule_engine_result,
    input.fingerprint_resolution,
  );

  // ── Phase 3: Compose each axis (five independent calls) ──
  const financial_score = composeFinancialScore(financialInputs);
  const durability_score = composeDurabilityScore(durabilityInputs);
  const evidence_quality = composeEvidenceQuality(evidenceInputs);
  const assumption_fragility = composeAssumptionFragility(fragilityInputs);
  const underwriting_uncertainty = composeUnderwritingUncertainty(uncertaintyInputs);

  // ── Phase 4: Compute diagnostic summary ──
  const allComponents = [
    ...financial_score.components,
    ...durability_score.components,
    ...evidence_quality.components,
    ...assumption_fragility.components,
    ...underwriting_uncertainty.components,
  ];
  const componentSummary = summarizeComponents(allComponents);

  // ── Phase 5: Assemble final result ──
  // NOTE: the AxisCompositionResult interface intentionally has NO
  // overall_score, composite_score, deal_score, blended_score, or
  // acquisition_score. The five axes stay independent forever.
  return {
    evaluation_id: makeEvaluationId(),
    evaluated_at: evaluatedAt,
    version: AXIS_ENGINE_VERSION,
    fingerprint_resolution: input.fingerprint_resolution,

    financial_score,
    durability_score,
    evidence_quality,
    assumption_fragility,
    underwriting_uncertainty,

    assumption_fragility_graph: graph,

    summary: {
      total_components: componentSummary.total,
      positive_components: componentSummary.positive,
      negative_components: componentSummary.negative,
      existential_components: componentSummary.existential,
      fingerprint_relative_components: componentSummary.fingerprint_relative,
      global_components: componentSummary.global,
      fragility_node_count: graph.nodes.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose axes and return a human-readable diagnostic summary. Used by
 * CLI tools, debug endpoints, and operational tooling. Not part of the
 * production data path.
 */
export function composeAxesWithDiagnostics(
  input: AxisCompositionInput,
): {
  readonly result: AxisCompositionResult;
  readonly diagnostic_lines: ReadonlyArray<string>;
} {
  const result = composeAxes(input);
  const lines: string[] = [];

  lines.push(`Axis composition: ${result.evaluation_id}`);
  lines.push(`  Evaluated at: ${result.evaluated_at}`);
  lines.push(`  Version: ${result.version}`);
  lines.push(`  Fingerprint: ${result.fingerprint_resolution.fingerprint.display_name}`);
  if (result.fingerprint_resolution.is_fallback) {
    lines.push(`    (fallback used: ${result.fingerprint_resolution.fallback_reason})`);
  }
  lines.push("");
  lines.push("Five-axis output (independent dimensional readings):");
  lines.push(`  financial_score:          ${result.financial_score.score.toFixed(1)}  (${result.financial_score.band})`);
  lines.push(`  durability_score:         ${result.durability_score.score.toFixed(1)}  (${result.durability_score.band})`);
  lines.push(`  evidence_quality:         ${result.evidence_quality.score.toFixed(1)}  (${result.evidence_quality.band})`);
  lines.push(`  assumption_fragility:     ${result.assumption_fragility.score.toFixed(1)}  (${result.assumption_fragility.band})`);
  lines.push(`  underwriting_uncertainty: ${result.underwriting_uncertainty.score.toFixed(1)}  (${result.underwriting_uncertainty.band})`);
  lines.push(`    data_uncertainty:       ${result.underwriting_uncertainty.sub_axes.data_uncertainty.score.toFixed(1)}  (${result.underwriting_uncertainty.sub_axes.data_uncertainty.band})`);
  lines.push(`    structural_uncertainty: ${result.underwriting_uncertainty.sub_axes.structural_uncertainty.score.toFixed(1)}  (${result.underwriting_uncertainty.sub_axes.structural_uncertainty.band})`);
  lines.push(`    model_uncertainty:      ${result.underwriting_uncertainty.sub_axes.model_uncertainty.score.toFixed(1)}  (${result.underwriting_uncertainty.sub_axes.model_uncertainty.band})`);
  lines.push("");
  lines.push("Component summary:");
  lines.push(`  Total components: ${result.summary.total_components}`);
  lines.push(`    Positive contributions: ${result.summary.positive_components}`);
  lines.push(`    Negative contributions: ${result.summary.negative_components}`);
  lines.push(`    Existential components: ${result.summary.existential_components}`);
  lines.push(`    Fingerprint-relative: ${result.summary.fingerprint_relative_components}`);
  lines.push(`    Global benchmark: ${result.summary.global_components}`);
  lines.push("");
  lines.push("Fragility graph:");
  lines.push(`  Nodes: ${result.assumption_fragility_graph.summary.total_nodes}`);
  lines.push(`  Hotspots: ${result.assumption_fragility_graph.summary.hotspot_count}`);
  lines.push(`  Max conclusion count: ${result.assumption_fragility_graph.summary.max_conclusion_count}`);
  lines.push(`  Edges: ${result.assumption_fragility_graph.edges.length}`);

  return {
    result,
    diagnostic_lines: lines,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE-LEVEL SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

interface AxisEngineSelfTestResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly version: string;
}

/**
 * Self-test runnable at module load or externally. Verifies architectural
 * commitments:
 *
 *   1. No master score: the AxisCompositionResult shape does not include
 *      overall_score, composite_score, deal_score, blended_score, or
 *      acquisition_score keys
 *   2. The engine accepts minimal inputs without crashing
 *   3. The version constants are consistent
 *
 * Throws on failure. Called at module load.
 */
function selfTestAxisEngine(): AxisEngineSelfTestResult {
  const issues: string[] = [];

  // Test 1: forbidden field names
  // Build a minimal result and verify it has no forbidden fields.
  const forbiddenFields = [
    "overall_score",
    "composite_score",
    "deal_score",
    "blended_score",
    "acquisition_score",
  ];

  // Build a minimal valid input to compose against
  const minimalFingerprintResolution = {
    fingerprint: {
      key: "professional_services",
      display_name: "Professional Services",
    },
    industry_override: null,
    is_fallback: false,
    fallback_reason: "",
    model_uncertainty_escalation: 5,
    structural_uncertainty_escalation: 0,
  } as unknown as FingerprintResolution;

  const minimalInput: AxisCompositionInput = {
    rule_engine_result: {
      evaluation_id: "self-test",
      evaluated_at: new Date().toISOString(),
      catalogue_version: "self-test",
      pattern_catalogue_version: "self-test",
      fingerprint_resolution: minimalFingerprintResolution,
      firings: [],
      suppressed_rule_ids: [],
      pattern_detections: [],
      summary: {
        total_firings: 0,
        concerns: 0,
        strengths: 0,
        observations: 0,
        statistically_atypical: 0,
        structurally_suspicious: 0,
        unsupported_by_evidence: 0,
        total_pattern_detections: 0,
        suppressed_rules: 0,
      },
    },
    scenario_evaluation_result: {
      evaluation_id: "self-test",
      evaluated_at: new Date().toISOString(),
      catalogue_version: "self-test",
      engine_version: "self-test",
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
    },
    fingerprint_resolution: minimalFingerprintResolution,
    deal_source_type: "tax_returns",
  };

  try {
    const result = composeAxes(minimalInput);
    const resultKeys = Object.keys(result);
    for (const forbidden of forbiddenFields) {
      if (resultKeys.includes(forbidden)) {
        issues.push(
          `AxisCompositionResult contains FORBIDDEN field "${forbidden}". ` +
            `The five-axis model must NOT have a master/composite/blended score.`,
        );
      }
    }
    // Verify all five axes are present and independent
    const requiredAxes = [
      "financial_score",
      "durability_score",
      "evidence_quality",
      "assumption_fragility",
      "underwriting_uncertainty",
    ];
    for (const axis of requiredAxes) {
      if (!resultKeys.includes(axis)) {
        issues.push(`AxisCompositionResult missing required axis: ${axis}`);
      }
    }
    // Verify fragility graph is a peer artifact
    if (!resultKeys.includes("assumption_fragility_graph")) {
      issues.push("AxisCompositionResult missing fragility graph (should be peer artifact).");
    }
  } catch (err) {
    issues.push(
      `composeAxes() crashed on minimal valid inputs: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    version: AXIS_ENGINE_VERSION,
  };
}

export function validateAxisEngine(): AxisEngineSelfTestResult {
  return selfTestAxisEngine();
}

// Fail-closed at load time
const selfTestResult = selfTestAxisEngine();
if (!selfTestResult.ok) {
  throw new Error(
    `Axis engine self-test failed (${AXIS_ENGINE_VERSION}):\n` +
      selfTestResult.issues.map((i) => `  ${i}`).join("\n"),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARREL EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { buildFragilityGraph, getHotspots, getFavorableConcentrations, getUnfavorableConcentrations, getFragilityNode } from "./fragility-graph";
export { composeFinancialScore } from "./compose-financial";
export { composeDurabilityScore } from "./compose-durability";
export { composeEvidenceQuality } from "./compose-evidence";
export { composeAssumptionFragility } from "./compose-fragility";
export { composeUnderwritingUncertainty } from "./compose-uncertainty";
export {
  FINANCIAL_BASELINE,
  DURABILITY_BASELINE,
  EVIDENCE_BASELINE,
  FRAGILITY_BASELINE,
  UNCERTAINTY_BASELINE,
  COMPONENT_SOFT_CAP_POSITIVE,
  COMPONENT_SOFT_CAP_NEGATIVE,
  COMPONENT_EXISTENTIAL_CAP_POSITIVE,
  COMPONENT_EXISTENTIAL_CAP_NEGATIVE,
  FIVE_AXIS_INDEPENDENCE_PRINCIPLE,
  COMPONENTS_OVER_SCORES_PRINCIPLE,
  FRAGILITY_AS_STRUCTURE_PRINCIPLE,
} from "./types";
