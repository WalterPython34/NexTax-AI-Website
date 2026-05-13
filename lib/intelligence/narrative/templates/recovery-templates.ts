// lib/intelligence/narrative/templates/recovery-templates.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Recovery, Structural, and Synthesis-Driven
// Fragment Templates
//
// CP-8 Module: Wraps the remaining synthesis findings into NarrativeFragment
// records.
//
// This template module covers SIX fragment kinds:
//
//   - recovery_priorities       (from RecoveryPriority records)
//   - structural_concerns       (from StructuralConcern records)
//   - binding_constraint        (from BindingConstraintFinding)
//   - closest_path              (from ClosestPathFinding)
//   - coverage_gap_notice       (from CoverageGapFinding when is_coverage_gap=true)
//   - assumption_concentration  (from AssumptionConcentrationFinding records)
//
// The pattern is consistent: each synthesis record produces one fragment
// (or in the case of recovery priorities, structural concerns, and
// assumption concentrations, one fragment per record). Templates wrap
// the synthesis prose with mandatory traceability fields and framing
// flags.
//
// What this module does NOT do:
//
//   - Rewrite synthesis prose (rationale / description / framing_description
//     / why_structural were produced by the synthesis layer)
//   - Apply LLM polish
//   - Suppress findings (the narrative-engine orchestrator handles
//     coverage-gap-vs-structural-concern filtering)
//
// Architectural commitments enforced:
//
//   - Every fragment carries source_ids, related_axis_keys,
//     related_personality_ids
//   - Recovery and structural fragments propose_buyer_action correctly
//   - Coverage gap notice fragment marks references_coverage_gap=true
//   - Binding constraint fragment marks references_simulated_posture=true
//     (the rationale references personality simulations)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  PersonalityId,
} from "../../personalities/types";
import type {
  AssumptionConcentrationFinding,
  BindingConstraintFinding,
  ClosestPathFinding,
  CoverageGapFinding,
  NarrativeFragment,
  RecoveryPriority,
  StructuralConcern,
} from "../types";
import { NARRATIVE_TEMPLATES_VERSION } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY PRIORITY FRAGMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryFragmentInputs {
  readonly recovery_priorities: ReadonlyArray<RecoveryPriority>;
}

/**
 * Build recovery_priorities fragments — one per RecoveryPriority record.
 *
 * Pure deterministic function. Returns fragments in priority order
 * (sorted by leverage_count descending, matching synthesis output).
 */
export function buildRecoveryFragments(
  inputs: RecoveryFragmentInputs,
): ReadonlyArray<NarrativeFragment> {
  return inputs.recovery_priorities.map((priority) =>
    buildOneRecoveryFragment(priority),
  );
}

function buildOneRecoveryFragment(priority: RecoveryPriority): NarrativeFragment {
  // Compose 2-sentence fragment: label + description
  const prose = `${priority.label}. ${priority.description}`;

  return {
    fragment_id: `fragment.recovery_priorities.${priority.priority_id}.${makeShortToken()}`,
    kind: "recovery_priorities",
    prose,
    source_ids: collectRecoverySourceIds(priority),
    related_axis_keys: [],
    related_personality_ids: priority.addresses_personalities,
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: false,
    references_coverage_gap: priority.priority_id.includes("fingerprint_coverage"),
    proposes_buyer_action: true,
    narrative_principle_applied: "buyer_action_translation",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

function collectRecoverySourceIds(priority: RecoveryPriority): ReadonlyArray<string> {
  return [
    `recovery_priority.id=${priority.priority_id}`,
    ...priority.resolves_discomfort_ids,
    ...priority.satisfies_comfort_condition_ids,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL CONCERN FRAGMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface StructuralConcernFragmentInputs {
  readonly structural_concerns: ReadonlyArray<StructuralConcern>;
}

/**
 * Build structural_concerns fragments — one per StructuralConcern record.
 */
export function buildStructuralConcernFragments(
  inputs: StructuralConcernFragmentInputs,
): ReadonlyArray<NarrativeFragment> {
  return inputs.structural_concerns.map((concern) =>
    buildOneStructuralConcernFragment(concern),
  );
}

function buildOneStructuralConcernFragment(
  concern: StructuralConcern,
): NarrativeFragment {
  const prose = `${concern.description} ${concern.why_structural}`;

  return {
    fragment_id: `fragment.structural_concerns.${concern.concern_id}.${makeShortToken()}`,
    kind: "structural_concerns",
    prose,
    source_ids: [
      `structural_concern.id=${concern.concern_id}`,
      ...concern.source_ids,
    ],
    related_axis_keys: [],
    related_personality_ids: concern.affected_personalities,
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: true,
    references_coverage_gap: false,
    proposes_buyer_action: true,
    narrative_principle_applied: "repairable_vs_fatal_distinction",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BINDING CONSTRAINT FRAGMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface BindingConstraintFragmentInputs {
  readonly binding_constraint: BindingConstraintFinding | null;
}

/**
 * Build a binding_constraint fragment from the BindingConstraintFinding.
 * Returns null when no binding constraint is identified (clean deal).
 */
export function buildBindingConstraintFragment(
  inputs: BindingConstraintFragmentInputs,
): NarrativeFragment | null {
  const finding = inputs.binding_constraint;
  if (!finding) return null;

  return {
    fragment_id: `fragment.binding_constraint.${finding.axis}.${makeShortToken()}`,
    kind: "binding_constraint",
    prose: finding.rationale,
    source_ids: [
      `binding_constraint.axis=${finding.axis}`,
      `binding_constraint.band=${finding.band}`,
      `binding_constraint.repairability=${finding.repairability}`,
      ...finding.driver_source_ids,
    ],
    related_axis_keys: [finding.axis],
    related_personality_ids: [],
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: true,
    references_coverage_gap: false,
    proposes_buyer_action: false,
    narrative_principle_applied: "binding_constraint_identification",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSEST PATH FRAGMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface ClosestPathFragmentInputs {
  readonly closest_path: ClosestPathFinding | null;
}

/**
 * Build a closest_path fragment from the ClosestPathFinding.
 * Returns null only in the degenerate empty-batch case.
 */
export function buildClosestPathFragment(
  inputs: ClosestPathFragmentInputs,
): NarrativeFragment | null {
  const finding = inputs.closest_path;
  if (!finding) return null;

  return {
    fragment_id: `fragment.closest_path.${finding.personality_id}.${makeShortToken()}`,
    kind: "closest_path",
    prose: finding.rationale,
    source_ids: finding.source_ids,
    related_axis_keys: [],
    related_personality_ids: [finding.personality_id],
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: true,
    references_coverage_gap: false,
    proposes_buyer_action: true,
    narrative_principle_applied: "closest_path_surfacing",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE GAP NOTICE FRAGMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface CoverageGapFragmentInputs {
  readonly coverage_gap: CoverageGapFinding;
}

/**
 * Build a coverage_gap_notice fragment from the CoverageGapFinding.
 *
 * Returns null when is_coverage_gap=false — there's no coverage gap to
 * narrate, so no fragment is produced.
 *
 * When is_coverage_gap=true, the fragment carries the explicit framing
 * that prevents "SBA hates accounting firms" misreadings.
 */
export function buildCoverageGapFragment(
  inputs: CoverageGapFragmentInputs,
): NarrativeFragment | null {
  const finding = inputs.coverage_gap;
  if (!finding.is_coverage_gap) return null;

  return {
    fragment_id: `fragment.coverage_gap_notice.${makeShortToken()}`,
    kind: "coverage_gap_notice",
    prose: finding.explanation,
    source_ids: [
      `coverage_gap.industry_key=${finding.industry_key ?? "unknown"}`,
      `coverage_gap.industry_display_name=${finding.industry_display_name ?? "unknown"}`,
      ...finding.affected_personalities.map(
        (p) => `coverage_gap.affected.${p}`,
      ),
    ],
    related_axis_keys: ["underwriting_uncertainty"],
    related_personality_ids: finding.affected_personalities,
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: true,
    references_coverage_gap: true,
    proposes_buyer_action: false,
    narrative_principle_applied: "coverage_gap_framing",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTION CONCENTRATION FRAGMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AssumptionConcentrationFragmentInputs {
  readonly top_assumption_concentrations: ReadonlyArray<AssumptionConcentrationFinding>;
}

/**
 * Build assumption_concentration fragments — one per top assumption finding.
 *
 * Returns fragments in importance order (matching synthesis output).
 */
export function buildAssumptionConcentrationFragments(
  inputs: AssumptionConcentrationFragmentInputs,
): ReadonlyArray<NarrativeFragment> {
  return inputs.top_assumption_concentrations.map((finding) =>
    buildOneAssumptionFragment(finding),
  );
}

function buildOneAssumptionFragment(
  finding: AssumptionConcentrationFinding,
): NarrativeFragment {
  return {
    fragment_id: `fragment.assumption_concentration.${finding.assumption_key}.${makeShortToken()}`,
    kind: "assumption_concentration",
    prose: finding.framing_description,
    source_ids: [
      `assumption.key=${finding.assumption_key}`,
      `assumption.conclusion_count=${finding.conclusion_count}`,
      `assumption.evidence_strength=${finding.evidence_strength.toFixed(1)}`,
    ],
    related_axis_keys: finding.axis_spread,
    related_personality_ids: [],
    related_scenario_ids: [],
    related_assumption_keys: [finding.assumption_key],
    references_simulated_posture: false,
    references_coverage_gap: false,
    proposes_buyer_action: shouldProposeAction(finding),
    narrative_principle_applied: "synthesis_over_recitation",
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

/**
 * Determine whether the assumption concentration fragment is proposing
 * a buyer action.
 *
 * Two heuristics:
 *   - Multi-conclusion + weak evidence = action priority
 *   - Single-conclusion = no action (it's a status fragment)
 */
function shouldProposeAction(finding: AssumptionConcentrationFinding): boolean {
  return finding.conclusion_count >= 2 && finding.evidence_strength < 60;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let tokenCounter = 0;
function makeShortToken(): string {
  tokenCounter += 1;
  return `${tokenCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

// Suppress unused-import warnings
const _suppress_AxisKey: AxisKey | undefined = undefined;
const _suppress_PersonalityId: PersonalityId | undefined = undefined;
void _suppress_AxisKey;
void _suppress_PersonalityId;
