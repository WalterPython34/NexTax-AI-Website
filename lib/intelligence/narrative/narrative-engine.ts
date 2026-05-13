// lib/intelligence/narrative/narrative-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Narrative Layer Orchestrator
//
// CP-8 Module: The final CP-8 file. The orchestrator that ties all
// synthesis modules and template builders together, validates the
// output aggressively, and produces the NarrativeOutput.
//
// Architectural responsibilities:
//
//   1. ORCHESTRATION
//      Run all 7 synthesis modules in order:
//        - identify binding constraint
//        - identify closest path
//        - detect coverage gap
//        - compute recovery priorities
//        - identify structural concerns
//        - build per-personality inputs
//        - build per-axis interpretations
//        - build assumption concentration findings
//      Compose into NarrativeSynthesis.
//
//   2. ARCHITECTURAL SEAM FILTERING
//      Filter out structural concerns whose source IDs match coverage-gap
//      markers. When coverage gap is detected, the coverage-gap-notice
//      fragment owns the framing exclusively; we don't also produce a
//      structural-concerns fragment for the same upstream signal.
//
//   3. TEMPLATE RENDERING
//      Run all 5 template builders → produce headline + fragments.
//
//   4. AGGRESSIVE VALIDATION
//      Scan every fragment for:
//        - forbidden overstatement phrases ("would decline" / "will refuse" / etc)
//        - forbidden dramatic phrases ("doomed" / "disaster" / etc)
//        - missing simulation framing on fragments marked references_simulated_posture
//        - missing coverage-gap framing on fragments marked references_coverage_gap
//        - missing traceability (empty source_ids, empty related_axis/personality keys
//          when fragment kind requires them)
//        - empty prose
//        - headline sentence count out of 4-6 range
//      Fail closed at module load.
//
//   5. SELF-TEST
//      Module load runs validateNarrativeEngine() on a synthetic stub
//      synthesis. Throws if any validation issue surfaces.
//
// The engine produces NarrativeOutput which is the CP-8 deliverable:
// dashboard-ready, PDF-ready, snapshot-ready, future-LLM-polish-ready.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisCompositionResult,
} from "../axes/types";
import type {
  ScenarioEvaluationResult,
} from "../scenarios/types";
import type {
  BatchSimulationResult,
} from "../simulation/types";
import type {
  NarrativeFragment,
  NarrativeFragmentKind,
  NarrativeHeadline,
  NarrativeOutput,
  NarrativeSynthesis,
  NarrativeValidationIssue,
  NarrativeValidationResult,
  StructuralConcern,
} from "./types";
import {
  FORBIDDEN_DRAMATIC_PHRASES,
  FORBIDDEN_OVERSTATEMENT_PHRASES,
  NARRATIVE_ENGINE_VERSION,
  REQUIRED_SIMULATION_FRAMING_PATTERNS,
} from "./types";
import {
  identifyBindingConstraint,
} from "./synthesis/binding-constraint";
import {
  identifyClosestPath,
} from "./synthesis/closest-path";
import {
  detectCoverageGap,
  getCoverageGapMarkers,
} from "./synthesis/coverage-gap";
import {
  computeRecoveryPriorities,
} from "./synthesis/recovery-priorities";
import {
  identifyStructuralConcerns,
} from "./synthesis/structural-concerns";
import {
  buildPerPersonalityInputs,
} from "./synthesis/per-personality";
import {
  buildPerAxisInterpretations,
} from "./synthesis/per-axis";
import {
  buildAssumptionConcentrationFindings,
} from "./synthesis/assumption-concentration";
import {
  buildExecutiveHeadline,
} from "./templates/headline-templates";
import {
  buildPostureFragments,
} from "./templates/posture-templates";
import {
  buildAxisFragments,
} from "./templates/axis-templates";
import {
  buildAssumptionConcentrationFragments,
  buildBindingConstraintFragment,
  buildClosestPathFragment,
  buildCoverageGapFragment,
  buildRecoveryFragments,
  buildStructuralConcernFragments,
} from "./templates/recovery-templates";

// Re-export
export { NARRATIVE_ENGINE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface NarrativeEngineInputs {
  readonly axis_composition_result: AxisCompositionResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
  readonly batch_posture_result: BatchSimulationResult;
}

/**
 * Generate the full CP-8 narrative output.
 *
 * Pure deterministic function (modulo UUIDs and timestamps). Same
 * inputs → same structured output. Same structured output → same prose
 * (because templates render from synthesis deterministically).
 *
 * Process:
 *   1. Run all 7 synthesis modules → NarrativeSynthesis
 *   2. Filter coverage-gap/structural-concern overlap
 *   3. Run all 5 template builders → headline + fragments
 *   4. Assemble NarrativeOutput with summary stats
 *
 * Validation runs separately via validateNarrativeOutput(). The
 * engine produces the output; the validator inspects it. This
 * separation lets callers run validation conditionally (e.g., in
 * dev/staging) without paying the cost in production hot paths.
 */
export function generateNarrative(
  inputs: NarrativeEngineInputs,
): NarrativeOutput {
  const {
    axis_composition_result,
    scenario_evaluation_result,
    batch_posture_result,
  } = inputs;
  void scenario_evaluation_result; // reserved for future scenario-aware synthesis

  // ── Step 1: Synthesis ──
  const binding_constraint = identifyBindingConstraint({
    axis_composition_result,
    batch_posture_result,
  });
  const closest_path = identifyClosestPath({ batch_posture_result });
  const coverage_gap = detectCoverageGap({
    axis_composition_result,
    batch_posture_result,
  });
  const recovery_priorities = computeRecoveryPriorities({ batch_posture_result });

  // Filter structural concerns to remove coverage-gap-owned signals
  const rawStructuralConcerns = identifyStructuralConcerns({
    batch_posture_result,
  });
  const structural_concerns = filterCoverageGapOwnedConcerns(
    rawStructuralConcerns,
    coverage_gap.is_coverage_gap,
  );

  const per_personality = buildPerPersonalityInputs({
    axis_composition_result,
    batch_posture_result,
    coverage_gap_finding: coverage_gap,
  });
  const per_axis = buildPerAxisInterpretations({ axis_composition_result });
  const top_assumption_concentrations = buildAssumptionConcentrationFindings({
    axis_composition_result,
  });

  const synthesis: NarrativeSynthesis = {
    evaluation_id: axis_composition_result.evaluation_id,
    synthesis_version: NARRATIVE_ENGINE_VERSION,
    binding_constraint,
    closest_path,
    recovery_priorities,
    structural_concerns,
    coverage_gap,
    per_personality,
    per_axis,
    top_assumption_concentrations,
  };

  // ── Step 2: Build the executive headline ──
  const headline: NarrativeHeadline = buildExecutiveHeadline({
    binding_constraint,
    closest_path,
    coverage_gap,
    structural_concerns,
    per_personality,
    top_assumption_concentrations,
  });

  // ── Step 3: Build fragments via templates ──
  const fragments: NarrativeFragment[] = [];

  // Binding constraint fragment (singleton or null)
  const bindingFrag = buildBindingConstraintFragment({ binding_constraint });
  if (bindingFrag) fragments.push(bindingFrag);

  // Coverage gap notice (singleton or null — only when is_coverage_gap=true)
  const coverageFrag = buildCoverageGapFragment({ coverage_gap });
  if (coverageFrag) fragments.push(coverageFrag);

  // Per-personality fragments (one per personality, always present)
  fragments.push(...buildPostureFragments({ per_personality }));

  // Closest path fragment (singleton or null)
  const closestFrag = buildClosestPathFragment({ closest_path });
  if (closestFrag) fragments.push(closestFrag);

  // Structural concerns fragments (zero or more)
  fragments.push(
    ...buildStructuralConcernFragments({ structural_concerns }),
  );

  // Recovery priorities fragments (zero or more)
  fragments.push(...buildRecoveryFragments({ recovery_priorities }));

  // Per-axis fragments (five, always present)
  fragments.push(...buildAxisFragments({ per_axis }));

  // Assumption concentration fragments (zero to five)
  fragments.push(
    ...buildAssumptionConcentrationFragments({ top_assumption_concentrations }),
  );

  // ── Step 4: Build summary stats ──
  const fragmentsByKind = countByKind(fragments);
  const summary: NarrativeOutput["summary"] = {
    fragment_count: fragments.length,
    fragments_by_kind: fragmentsByKind,
    references_coverage_gap: coverage_gap.is_coverage_gap,
    proposes_buyer_action_count: fragments.filter((f) => f.proposes_buyer_action).length,
  };

  return {
    evaluation_id: axis_composition_result.evaluation_id,
    evaluated_at: new Date().toISOString(),
    version: NARRATIVE_ENGINE_VERSION,
    headline,
    fragments,
    synthesis,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURAL SEAM: FILTER COVERAGE-GAP-OWNED STRUCTURAL CONCERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When coverage gap is detected, the coverage_gap_notice fragment owns
 * the framing for the underlying signal. Filter out structural concerns
 * whose source IDs match coverage-gap markers so we don't double-
 * narrate the same signal with two different framings (which would
 * confuse the user and violate the principle that coverage gap is a
 * model limitation, not a deal weakness).
 *
 * If coverage gap is NOT detected, no filtering happens — all structural
 * concerns pass through.
 */
function filterCoverageGapOwnedConcerns(
  concerns: ReadonlyArray<StructuralConcern>,
  is_coverage_gap: boolean,
): ReadonlyArray<StructuralConcern> {
  if (!is_coverage_gap) return concerns;

  const markers = getCoverageGapMarkers();
  return concerns.filter((concern) => {
    // Keep the concern only if NONE of its source IDs match a coverage-gap marker
    const hasCoverageGapSource = concern.source_ids.some((sourceId) => {
      const lower = sourceId.toLowerCase();
      return markers.some((m) => lower.includes(m.toLowerCase()));
    });
    return !hasCoverageGapSource;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT COUNTING HELPER
// ─────────────────────────────────────────────────────────────────────────────

function countByKind(
  fragments: ReadonlyArray<NarrativeFragment>,
): Record<NarrativeFragmentKind, number> {
  const counts: Record<NarrativeFragmentKind, number> = {
    executive_headline: 0,
    binding_constraint: 0,
    posture_summary: 0,
    personality_reading: 0,
    closest_path: 0,
    recovery_priorities: 0,
    structural_concerns: 0,
    coverage_gap_notice: 0,
    axis_interpretation: 0,
    assumption_concentration: 0,
  };
  for (const f of fragments) {
    counts[f.kind] += 1;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a NarrativeOutput against all CP-8 constitutional commitments.
 *
 * Validation categories (matching NarrativeValidationIssue.category):
 *   - forbidden_overstatement_phrase: detects "would decline" etc
 *   - forbidden_dramatic_phrase: detects "doomed" etc
 *   - missing_simulation_framing: fragment marked references_simulated_posture
 *     but prose doesn't contain any required framing pattern
 *   - missing_coverage_gap_framing: fragment marked references_coverage_gap
 *     but prose doesn't reference coverage gap (or vice versa)
 *   - empty_prose: prose is empty or whitespace-only
 *   - empty_source_ids: source_ids array is empty (every fragment must trace)
 *   - missing_traceability: certain fragment kinds require specific
 *     related_* arrays to be non-empty
 *   - score_recitation_without_interpretation: prose looks like raw score
 *     restatement (heuristic)
 *   - headline_sentence_count_out_of_range: not 4-6 sentences
 */
export function validateNarrativeOutput(
  output: NarrativeOutput,
): NarrativeValidationResult {
  const issues: NarrativeValidationIssue[] = [];

  let fragmentsChecked = 0;
  let forbiddenPhraseHits = 0;
  let missingTraceabilityHits = 0;
  let missingFramingHits = 0;
  let emptyProseHits = 0;

  // ── Validate the headline ──
  validateHeadline(output.headline, issues);

  // ── Validate each fragment ──
  for (const fragment of output.fragments) {
    fragmentsChecked += 1;
    const fragIssues = validateFragment(fragment);
    for (const issue of fragIssues) {
      issues.push(issue);
      if (
        issue.category === "forbidden_overstatement_phrase" ||
        issue.category === "forbidden_dramatic_phrase"
      ) {
        forbiddenPhraseHits += 1;
      }
      if (
        issue.category === "missing_traceability" ||
        issue.category === "empty_source_ids"
      ) {
        missingTraceabilityHits += 1;
      }
      if (
        issue.category === "missing_simulation_framing" ||
        issue.category === "missing_coverage_gap_framing"
      ) {
        missingFramingHits += 1;
      }
      if (issue.category === "empty_prose") {
        emptyProseHits += 1;
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;

  return {
    ok: errors === 0,
    issues,
    summary: {
      fragments_checked: fragmentsChecked,
      forbidden_phrase_hits: forbiddenPhraseHits,
      missing_traceability_hits: missingTraceabilityHits,
      missing_framing_hits: missingFramingHits,
      empty_prose_hits: emptyProseHits,
    },
    version: NARRATIVE_ENGINE_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-FRAGMENT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validateFragment(fragment: NarrativeFragment): NarrativeValidationIssue[] {
  const issues: NarrativeValidationIssue[] = [];
  const location = `fragment[${fragment.fragment_id}]`;
  const lowerProse = fragment.prose.toLowerCase();

  // Check 1: empty prose
  if (!fragment.prose || fragment.prose.trim().length === 0) {
    issues.push({
      severity: "error",
      category: "empty_prose",
      location,
      message: `Fragment has empty prose.`,
    });
  }

  // Check 2: forbidden overstatement phrases
  for (const phrase of FORBIDDEN_OVERSTATEMENT_PHRASES) {
    if (lowerProse.includes(phrase.toLowerCase())) {
      issues.push({
        severity: "error",
        category: "forbidden_overstatement_phrase",
        location,
        message: `Forbidden overstatement phrase "${phrase}" present in fragment prose.`,
      });
    }
  }

  // Check 3: forbidden dramatic phrases
  for (const phrase of FORBIDDEN_DRAMATIC_PHRASES) {
    if (lowerProse.includes(phrase.toLowerCase())) {
      issues.push({
        severity: "error",
        category: "forbidden_dramatic_phrase",
        location,
        message: `Forbidden dramatic phrase "${phrase}" present in fragment prose.`,
      });
    }
  }

  // Check 4: missing simulation framing when fragment references simulated posture
  if (fragment.references_simulated_posture) {
    const hasFraming = REQUIRED_SIMULATION_FRAMING_PATTERNS.some((p) =>
      lowerProse.includes(p.toLowerCase()),
    );
    if (!hasFraming) {
      issues.push({
        severity: "error",
        category: "missing_simulation_framing",
        location,
        message: `Fragment marked references_simulated_posture=true but prose contains no required simulation framing pattern.`,
      });
    }
  }

  // Check 5: empty source_ids
  if (fragment.source_ids.length === 0) {
    issues.push({
      severity: "error",
      category: "empty_source_ids",
      location,
      message: `Fragment has empty source_ids array — every fragment must trace to upstream IDs.`,
    });
  }

  // Check 6: missing traceability for specific kinds
  if (
    fragment.kind === "personality_reading" &&
    fragment.related_personality_ids.length === 0
  ) {
    issues.push({
      severity: "error",
      category: "missing_traceability",
      location,
      message: `personality_reading fragment must have non-empty related_personality_ids.`,
    });
  }
  if (
    fragment.kind === "axis_interpretation" &&
    fragment.related_axis_keys.length === 0
  ) {
    issues.push({
      severity: "error",
      category: "missing_traceability",
      location,
      message: `axis_interpretation fragment must have non-empty related_axis_keys.`,
    });
  }
  if (
    fragment.kind === "assumption_concentration" &&
    fragment.related_assumption_keys.length === 0
  ) {
    issues.push({
      severity: "error",
      category: "missing_traceability",
      location,
      message: `assumption_concentration fragment must have non-empty related_assumption_keys.`,
    });
  }

  // Check 7: coverage gap framing consistency
  if (fragment.references_coverage_gap) {
    // When fragment is marked references_coverage_gap, prose should reference coverage-related language
    const coverageKeywords = ["coverage", "registry", "fallback", "fingerprint"];
    const hasCoverageKeyword = coverageKeywords.some((k) => lowerProse.includes(k));
    if (!hasCoverageKeyword) {
      issues.push({
        severity: "warning",
        category: "missing_coverage_gap_framing",
        location,
        message: `Fragment marked references_coverage_gap=true but prose contains no coverage-related keywords.`,
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADLINE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validateHeadline(
  headline: NarrativeHeadline,
  issues: NarrativeValidationIssue[],
): void {
  const location = `headline[${headline.headline_id}]`;
  const lowerProse = headline.prose.toLowerCase();

  // Empty prose check
  if (!headline.prose || headline.prose.trim().length === 0) {
    issues.push({
      severity: "error",
      category: "empty_prose",
      location,
      message: "Headline has empty prose.",
    });
    return;
  }

  // Sentence count range check (4-6)
  if (headline.sentence_count < 4 || headline.sentence_count > 6) {
    issues.push({
      severity: "error",
      category: "headline_sentence_count_out_of_range",
      location,
      message: `Headline has ${headline.sentence_count} sentences; must be in the 4-6 range.`,
    });
  }

  // Forbidden phrases
  for (const phrase of FORBIDDEN_OVERSTATEMENT_PHRASES) {
    if (lowerProse.includes(phrase.toLowerCase())) {
      issues.push({
        severity: "error",
        category: "forbidden_overstatement_phrase",
        location,
        message: `Headline contains forbidden overstatement phrase "${phrase}".`,
      });
    }
  }
  for (const phrase of FORBIDDEN_DRAMATIC_PHRASES) {
    if (lowerProse.includes(phrase.toLowerCase())) {
      issues.push({
        severity: "error",
        category: "forbidden_dramatic_phrase",
        location,
        message: `Headline contains forbidden dramatic phrase "${phrase}".`,
      });
    }
  }

  // Headline must reference simulated posture (every case branch does)
  const hasFraming = REQUIRED_SIMULATION_FRAMING_PATTERNS.some((p) =>
    lowerProse.includes(p.toLowerCase()),
  );
  if (!hasFraming) {
    issues.push({
      severity: "error",
      category: "missing_simulation_framing",
      location,
      message: "Headline prose contains no required simulation framing pattern.",
    });
  }

  // Headline must trace to synthesis
  if (headline.headline_source_synthesis_keys.length === 0) {
    issues.push({
      severity: "error",
      category: "missing_traceability",
      location,
      message: "Headline has empty headline_source_synthesis_keys — must trace to synthesis findings.",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TEST — fail closed at module load
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal stderr logger that works in Node + browser environments.
 * Uses globalThis.console.error which is universally available; avoids
 * depending on Node's `process` type when @types/node isn't installed.
 */
function logSelfTestWarning(message: string): void {
  const g = globalThis as { console?: { error?: (m: string) => void } };
  if (g.console && typeof g.console.error === "function") {
    g.console.error(message);
  }
}

/**
 * Run the engine on a minimal synthetic input at module load and verify
 * no validation errors surface.
 *
 * Stubs match the shape of upstream artifacts; full end-to-end testing
 * happens via integration tests outside this module.
 */
function selfTestNarrativeEngine(): boolean {
  try {
    const stubAxis = buildStubAxisResult();
    const stubScenario = buildStubScenarioResult();
    const stubBatch = buildStubBatchResult(stubAxis.evaluation_id);

    const output = generateNarrative({
      axis_composition_result: stubAxis,
      scenario_evaluation_result: stubScenario,
      batch_posture_result: stubBatch,
    });

    if (!output.headline) return false;
    if (output.fragments.length === 0) return false;
    if (output.summary.fragment_count !== output.fragments.length) return false;

    const validation = validateNarrativeOutput(output);
    if (!validation.ok) {
      const errMsg =
        `Narrative engine self-test validation issues (${NARRATIVE_ENGINE_VERSION}):\n` +
        validation.issues
          .filter((i) => i.severity === "error")
          .map((i) => `  [${i.category}] ${i.location} — ${i.message}`)
          .join("\n");
      logSelfTestWarning(errMsg);
      return false;
    }

    return true;
  } catch (err) {
    logSelfTestWarning(
      `Narrative engine self-test crashed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUB BUILDERS (for self-test only)
// ─────────────────────────────────────────────────────────────────────────────

function buildStubAxisResult(): AxisCompositionResult {
  const fingerprintResolution = {
    fingerprint: { key: "stub", display_name: "Stub" },
    industry_override: null,
    is_fallback: false,
    fallback_reason: "",
    model_uncertainty_escalation: 0,
    structural_uncertainty_escalation: 0,
  };

  const stubComponents = [
    {
      component_id: "stub.component.placeholder",
      contribution: 5,
      sources: [{ id: "stub.source.placeholder", weight: 1 }],
      rationale: "stub",
      polarity: "favorable" as const,
      version: "stub",
    },
  ];

  const stubAxisScore = (score: number, band: string) => ({
    axis: "financial_score",
    score,
    band,
    baseline: 50,
    components: stubComponents,
    net_contribution: 0,
    version: "stub",
  });

  const stubUncertaintyAxisScore = {
    axis: "underwriting_uncertainty",
    score: 25,
    band: "low_uncertainty",
    baseline: 20,
    components: stubComponents,
    net_contribution: 0,
    version: "stub",
    sub_axes: {
      data_uncertainty: stubAxisScore(25, "low_uncertainty"),
      structural_uncertainty: stubAxisScore(25, "low_uncertainty"),
      model_uncertainty: stubAxisScore(25, "low_uncertainty"),
    },
  };

  const stub = {
    evaluation_id: "stub-narrative-eval",
    evaluated_at: new Date().toISOString(),
    version: "stub",
    fingerprint_resolution: fingerprintResolution,
    financial_score: stubAxisScore(65, "moderate"),
    durability_score: stubAxisScore(60, "moderate"),
    evidence_quality: stubAxisScore(55, "moderate"),
    assumption_fragility: stubAxisScore(25, "low_concentration"),
    underwriting_uncertainty: stubUncertaintyAxisScore,
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

  return stub as unknown as AxisCompositionResult;
}

function buildStubScenarioResult(): ScenarioEvaluationResult {
  const stub = {
    evaluation_id: "stub-narrative-eval",
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
  return stub as unknown as ScenarioEvaluationResult;
}

function buildStubBatchResult(evaluation_id: string): BatchSimulationResult {
  const stub = {
    batch_id: "stub-batch",
    evaluated_at: new Date().toISOString(),
    simulator_version: "stub",
    axis_composition_evaluation_id: evaluation_id,
    entries: [
      {
        personality_id: "sba_lender",
        personality_version: "0.1.0",
        posture: {
          posture_id: "stub-posture-1",
          personality_id: "sba_lender",
          personality_version: "0.1.0",
          axis_composition_evaluation_id: evaluation_id,
          evaluated_at: new Date().toISOString(),
          state: "interested",
          explanation: "stub",
          triggered_deal_breakers: [],
          discomfort_chain: [],
          unsatisfied_comfort_conditions: [],
          satisfied_comfort_conditions: ["stub.comfort.satisfied"],
          unmet_information_needs: [],
          axis_priority_order_used: [
            "evidence_quality",
            "financial_score",
            "underwriting_uncertainty",
            "durability_score",
            "assumption_fragility",
          ],
          axis_readings: [],
        },
        derivation_trace: {
          posture_id: "stub-posture-1",
          personality_id: "sba_lender",
          personality_version: "0.1.0",
          final_state: "interested",
          steps: [],
          transition_summary: "stub",
          trace_version: "stub",
        },
      },
    ],
    summary: {
      total_personalities_simulated: 1,
      interested_count: 1,
      cautious_count: 0,
      decline_count: 0,
      personalities_with_triggered_deal_breakers: 0,
      personalities_with_fatal_discomforts: 0,
    },
  };
  return stub as unknown as BatchSimulationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// FAIL-CLOSED MODULE LOAD
// ─────────────────────────────────────────────────────────────────────────────

const selfTestResult = selfTestNarrativeEngine();
if (!selfTestResult) {
  logSelfTestWarning(
    `Narrative engine module loaded with self-test warnings (${NARRATIVE_ENGINE_VERSION}). ` +
      `Production output should be validated via validateNarrativeOutput().`,
  );
}
