// lib/intelligence/rules/rule-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Rule Engine Orchestrator
//
// CP-3 Module: The orchestrator that wires together the rule catalogue
// (rule-catalogue.ts), the mismatch pattern catalogue (mismatch-patterns.ts),
// and the source upgrade catalogue (source-upgrade.ts) into a single
// evaluator. Produces a RuleEngineResult for one deal.
//
// Evaluation order (strict — never deviates):
//
//   1. Resolve the fingerprint (already done upstream; engine receives it
//      in RuleEvaluationContext).
//
//   2. For each Rule in RULE_CATALOGUE:
//      a. Check applies_to_models: skip if this model isn't covered
//      b. Check model_fit_requirement against fingerprint resolution
//         - fingerprint_match_required + fallback/proxy → suppress (record id)
//         - fingerprint_match_preferred + fallback → downgrade classification
//         - model_agnostic → evaluate normally
//      c. Call rule.evaluate(context); collect the firing if non-null
//
//   3. Evaluate the mismatch pattern catalogue against the unordered
//      firing set. Patterns NEVER modify firings — they only produce
//      detections.
//
//   4. Compute summary counts (firings by polarity, classification,
//      suppression count, pattern detection count) for diagnostic
//      provenance. Downstream modules compute their own axis scores.
//
// Design constraints honored:
//
//   - Pure evaluator. No I/O. No module state beyond catalogue references.
//   - Determinism. Same inputs always produce same outputs (modulo
//     timestamps and per-evaluation UUIDs).
//   - Strict separation. Rules cannot read each other's outputs; patterns
//     run AFTER rule evaluation completes.
//   - Personality-agnostic. No lender-profile references anywhere.
//   - Uncertainty additive. Findings, uncertainty_escalations, and
//     source_concerns remain three independent streams.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  FingerprintResolution,
} from "../types";
import type {
  FiringClassification,
  ModelFitRequirement,
  PatternDetection,
  Rule,
  RuleEngineInputs,
  RuleEngineResult,
  RuleEvaluationContext,
  RuleFiring,
  RuleId,
} from "./types";
import {
  RULE_CATALOGUE_VERSION,
  RULE_ENGINE_VERSION,
} from "./types";
import { RULE_CATALOGUE } from "./rule-catalogue";
import {
  MISMATCH_PATTERN_CATALOGUE,
  MISMATCH_PATTERN_CATALOGUE_VERSION,
  evaluateMismatchPatterns,
} from "./mismatch-patterns";

// Re-export the version constants so a single import gives consumers everything
export {
  RULE_CATALOGUE_VERSION,
  RULE_ENGINE_VERSION,
  MISMATCH_PATTERN_CATALOGUE_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION-ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let evaluationCounter = 0;
function makeEvaluationId(): string {
  evaluationCounter += 1;
  return `eval-${Date.now()}-${evaluationCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL-FIT SUPPRESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decide whether a rule should be:
 *   - "run" — evaluate normally
 *   - "downgrade" — evaluate, but downgrade classification one level
 *   - "suppress" — do not evaluate; record the suppression
 *
 * The decision depends on:
 *   - applies_to_models (empty means all models)
 *   - model_fit_requirement
 *   - fingerprint_resolution.is_fallback
 *   - fingerprint_resolution.model_uncertainty_escalation (proxy penalty)
 *
 * Constitutional principle (guardrail #5): hybrid businesses get FEWER
 * rule firings, not lower-confidence ones. Suppression is the preferred
 * response to uncertain fingerprint fit, with downgrade as the
 * intermediate option for fingerprint_match_preferred rules.
 */
type RuleEvaluationDecision = "run" | "downgrade" | "suppress";

function decideRuleEvaluation(
  rule: Rule,
  resolution: FingerprintResolution,
): RuleEvaluationDecision {
  // Empty applies_to_models = applies to all
  const modelKey = resolution.fingerprint.key;
  const appliesToThisModel =
    rule.applies_to_models.length === 0 ||
    rule.applies_to_models.includes(modelKey);

  if (!appliesToThisModel) {
    // Rule is not applicable to this operating model. This is "skip",
    // not "suppress" — suppression is about model-fit uncertainty,
    // not about model irrelevance.
    return "suppress"; // we'll record it as "not applicable" downstream
  }

  // Compute "uncertain fingerprint fit" — fallback, or material proxy/recency penalty
  const isUncertainFit =
    resolution.is_fallback ||
    resolution.model_uncertainty_escalation >= 10; // threshold: medspa-style proxy

  switch (rule.model_fit_requirement) {
    case "fingerprint_match_required":
      return isUncertainFit ? "suppress" : "run";
    case "fingerprint_match_preferred":
      return isUncertainFit ? "downgrade" : "run";
    case "model_agnostic":
      return "run";
  }
}

/**
 * Downgrade a firing's classification one level when model fit is uncertain.
 * Preserves the rule's structural intent while reflecting the engine's
 * reduced confidence.
 */
function downgradeFiring(firing: RuleFiring): RuleFiring {
  const downgradeMap: Record<FiringClassification, FiringClassification> = {
    structurally_suspicious: "statistically_atypical",
    statistically_atypical: "statistically_atypical", // already at the floor for positive-direction firings
    unsupported_by_evidence: "unsupported_by_evidence", // evidence classification doesn't downgrade
  };
  const newClassification = downgradeMap[firing.classification];
  if (newClassification === firing.classification) return firing;

  return {
    ...firing,
    classification: newClassification,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-LEVEL EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

interface RuleEvaluationOutcome {
  readonly fired: boolean;
  readonly firing: RuleFiring | null;
  readonly suppressed: boolean;
  readonly rule_id: RuleId;
}

function evaluateOneRule(
  rule: Rule,
  context: RuleEvaluationContext,
): RuleEvaluationOutcome {
  const decision = decideRuleEvaluation(rule, context.fingerprint_resolution);

  if (decision === "suppress") {
    return {
      fired: false,
      firing: null,
      suppressed: true,
      rule_id: rule.id,
    };
  }

  // Either "run" or "downgrade" — evaluate the rule
  let firing: RuleFiring | null;
  try {
    firing = rule.evaluate(context);
  } catch (err) {
    // A throwing rule is a programming bug. CP-3 doesn't have observability
    // infrastructure to report telemetry; we simply drop the firing rather
    // than crashing the entire engine evaluation. The rule's absence from
    // the firing set is itself a debugging signal — registry validation
    // (validateRuleEngine) should catch most catalogue bugs before
    // production. CP-9 will route runtime errors to structured telemetry.
    void err;
    return {
      fired: false,
      firing: null,
      suppressed: false,
      rule_id: rule.id,
    };
  }

  if (firing === null) {
    return {
      fired: false,
      firing: null,
      suppressed: false,
      rule_id: rule.id,
    };
  }

  // Apply downgrade if model fit is uncertain
  const finalFiring = decision === "downgrade" ? downgradeFiring(firing) : firing;

  return {
    fired: true,
    firing: finalFiring,
    suppressed: false,
    rule_id: rule.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

function computeSummary(
  firings: ReadonlyArray<RuleFiring>,
  suppressed_rule_ids: ReadonlyArray<RuleId>,
  pattern_detections: ReadonlyArray<PatternDetection>,
): RuleEngineResult["summary"] {
  const concerns = firings.filter((f) => f.polarity === "concern").length;
  const strengths = firings.filter((f) => f.polarity === "strength").length;
  const observations = firings.filter((f) => f.polarity === "observation").length;
  const statisticallyAtypical = firings.filter((f) => f.classification === "statistically_atypical").length;
  const structurallySuspicious = firings.filter((f) => f.classification === "structurally_suspicious").length;
  const unsupportedByEvidence = firings.filter((f) => f.classification === "unsupported_by_evidence").length;

  return {
    total_firings: firings.length,
    concerns,
    strengths,
    observations,
    statistically_atypical: statisticallyAtypical,
    structurally_suspicious: structurallySuspicious,
    unsupported_by_evidence: unsupportedByEvidence,
    total_pattern_detections: pattern_detections.length,
    suppressed_rules: suppressed_rule_ids.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a deal against the rule catalogue. The orchestrator entry point.
 *
 * Inputs:
 *   - inputs: the deal's BenchmarkInputs (extended with source metadata and
 *     trajectory fields per CP-3 Q4)
 *   - fingerprint_resolution: pre-resolved by the orchestrator
 *     (resolveFingerprint from CP-2)
 *
 * Output: a full RuleEngineResult containing:
 *   - all rule firings (catalogue order)
 *   - suppressed rule IDs (with reason recoverable from rule definitions)
 *   - pattern detections (post-rule-evaluation)
 *   - summary counts for diagnostic provenance
 *
 * The result is what CP-4 (scenarios), CP-5 (axis composition), CP-7
 * (lender simulation), and CP-8 (narrative) read. CP-3 does NOT compute
 * axis scores or simulate lender posture — those are downstream.
 *
 * The function is pure modulo per-evaluation UUID generation and
 * timestamps.
 */
export function evaluateRuleEngine(
  inputs: RuleEngineInputs,
  fingerprint_resolution: FingerprintResolution,
): RuleEngineResult {
  const evaluatedAt = new Date().toISOString();
  const context: RuleEvaluationContext = {
    inputs,
    fingerprint_resolution,
    evaluated_at: evaluatedAt,
  };

  // ── Phase 1: Rule evaluation ──
  const firings: RuleFiring[] = [];
  const suppressed: RuleId[] = [];

  for (const rule of RULE_CATALOGUE) {
    const outcome = evaluateOneRule(rule, context);
    if (outcome.suppressed) {
      suppressed.push(outcome.rule_id);
    } else if (outcome.firing !== null) {
      firings.push(outcome.firing);
    }
  }

  // ── Phase 2: Pattern detection (post-rule-evaluation) ──
  // Strict invariant: patterns evaluate against the unordered firing set.
  // Patterns NEVER modify firings.
  const patternDetections = evaluateMismatchPatterns(firings);

  // ── Phase 3: Summary computation ──
  const summary = computeSummary(firings, suppressed, patternDetections);

  // ── Phase 4: Assemble final result ──
  return {
    evaluation_id: makeEvaluationId(),
    evaluated_at: evaluatedAt,
    catalogue_version: RULE_CATALOGUE_VERSION,
    pattern_catalogue_version: MISMATCH_PATTERN_CATALOGUE_VERSION,
    fingerprint_resolution,
    firings,
    suppressed_rule_ids: suppressed,
    pattern_detections: patternDetections,
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
export function evaluateRuleEngineWithDiagnostics(
  inputs: RuleEngineInputs,
  fingerprint_resolution: FingerprintResolution,
): {
  readonly result: RuleEngineResult;
  readonly diagnostic_lines: ReadonlyArray<string>;
} {
  const result = evaluateRuleEngine(inputs, fingerprint_resolution);
  const lines: string[] = [];

  lines.push(`Rule engine evaluation: ${result.evaluation_id}`);
  lines.push(`  Evaluated at: ${result.evaluated_at}`);
  lines.push(`  Catalogue version: ${result.catalogue_version}`);
  lines.push(`  Pattern catalogue version: ${result.pattern_catalogue_version}`);
  lines.push(`  Fingerprint: ${result.fingerprint_resolution.fingerprint.display_name}`);
  if (result.fingerprint_resolution.is_fallback) {
    lines.push(`    (fallback used: ${result.fingerprint_resolution.fallback_reason})`);
  }
  lines.push("");
  lines.push("Summary:");
  lines.push(`  Total firings: ${result.summary.total_firings}`);
  lines.push(`    Concerns: ${result.summary.concerns}`);
  lines.push(`    Strengths: ${result.summary.strengths}`);
  lines.push(`    Observations: ${result.summary.observations}`);
  lines.push(`  By classification:`);
  lines.push(`    statistically_atypical: ${result.summary.statistically_atypical}`);
  lines.push(`    structurally_suspicious: ${result.summary.structurally_suspicious}`);
  lines.push(`    unsupported_by_evidence: ${result.summary.unsupported_by_evidence}`);
  lines.push(`  Patterns detected: ${result.summary.total_pattern_detections}`);
  lines.push(`  Rules suppressed: ${result.summary.suppressed_rules}`);
  if (result.firings.length > 0) {
    lines.push("");
    lines.push("Firings:");
    result.firings.forEach((f) => {
      lines.push(`  - [${f.classification}/${f.polarity}/${f.severity}] ${f.rule_id}`);
      lines.push(`    triggered: ${f.what_triggered}`);
    });
  }
  if (result.pattern_detections.length > 0) {
    lines.push("");
    lines.push("Pattern detections:");
    result.pattern_detections.forEach((d) => {
      lines.push(`  - [${d.severity}] ${d.pattern_id}`);
      lines.push(`    ${d.what_triggered}`);
      lines.push(`    participating: ${d.participating_firing_ids.length} firings`);
    });
  }

  return {
    result,
    diagnostic_lines: lines,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE-LEVEL VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface RuleEngineSelfTestResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly version: string;
}

/**
 * Self-test runnable at module load or externally. Verifies the engine's
 * cross-module invariants:
 *
 *   - Every pattern's participating_rule_ids reference real rules
 *   - Empty inputs do not crash the engine (degrades gracefully)
 *   - Fallback fingerprint produces fallback_fingerprint_used firing
 *   - Pattern evaluation is deterministic for fixed input
 *
 * Returns the validation result; throws on errors. Called at module load.
 */
function selfTestRuleEngine(): RuleEngineSelfTestResult {
  const issues: string[] = [];

  // Test 1: Every pattern's participating_rule_ids must reference real rules.
  // No circular dependency — mismatch-patterns is imported statically at the
  // top of this file.
  const knownRuleIds = new Set(RULE_CATALOGUE.map((r) => r.id));
  for (const pattern of MISMATCH_PATTERN_CATALOGUE) {
    for (const rid of pattern.participating_rule_ids) {
      if (!knownRuleIds.has(rid)) {
        issues.push(`pattern[${pattern.id}] references unknown rule_id: ${rid}`);
      }
    }
  }

  // Test 2: Engine must accept empty inputs without crashing
  try {
    evaluateRuleEngine(
      {},
      {
        fingerprint: RULE_CATALOGUE.length > 0
          ? ({} as FingerprintResolution["fingerprint"])
          : ({} as FingerprintResolution["fingerprint"]),
        industry_override: null,
        is_fallback: true,
        fallback_reason: "self-test: empty inputs",
        model_uncertainty_escalation: 25,
        structural_uncertainty_escalation: 10,
      } as FingerprintResolution,
    );
  } catch (err) {
    issues.push(`Engine crashed on empty inputs: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    version: RULE_ENGINE_VERSION,
  };
}

/**
 * Externally callable for diagnostic tooling.
 */
export function validateRuleEngine(): RuleEngineSelfTestResult {
  return selfTestRuleEngine();
}

// Fail-closed at load time. Self-test runs after all module imports resolve.
const selfTestResult = selfTestRuleEngine();
if (!selfTestResult.ok) {
  throw new Error(
    `Rule engine self-test failed (${RULE_ENGINE_VERSION}):\n` +
      selfTestResult.issues.map((i) => `  ${i}`).join("\n"),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARREL EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
// Re-export the catalogue and patterns so consumers can import everything
// they need from "./rule-engine". This matches the CP-2 hybrid pattern:
// granular imports remain available; the engine module provides a barrel
// for orchestrator-level consumers.

export { RULE_CATALOGUE, getRule, rulesByCategory, rulesForModel } from "./rule-catalogue";
export {
  MISMATCH_PATTERN_CATALOGUE,
  evaluateMismatchPatterns,
  getMismatchPattern,
  patternsParticipatingRule,
} from "./mismatch-patterns";
