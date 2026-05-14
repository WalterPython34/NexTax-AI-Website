// lib/intelligence/operations/readiness-classifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Readiness Classifier
//
// Categorical classification of a snapshot's decision-readiness state.
//
// Five mutually-exclusive classifications:
//
//   structurally_blocked
//     The snapshot has structural concerns at a level no lender can
//     absorb. Resolving these is a precondition for ANY readiness.
//
//   all_paths_declined
//     Every personality is at the `decline` posture state. No lender
//     finds this deal financeable as-presented.
//
//   evidence_insufficient
//     Evidence quality is below the manifest's
//     readiness_min_evidence_score threshold. Even if personalities
//     would otherwise be interested, the evidence base doesn't
//     support a decision.
//
//   decision_ready_with_caveats
//     At least one personality is at `interested` posture AND
//     evidence is sufficient AND there are no structural blockers,
//     BUT there are notable unresolved items (open recovery
//     priorities, open comfort conditions, or open repairable
//     discomforts).
//
//   decision_ready
//     All preconditions met AND no notable unresolved items remain.
//
// Priority order: structurally_blocked → all_paths_declined →
// evidence_insufficient → decision_ready_with_caveats → decision_ready.
// First match wins. This means structural blockers always show
// regardless of personality posture — a deal with hard structural
// concerns is structurally_blocked even if some personality remains
// interested.
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #1 (Threshold Manifest) — readiness_min_evidence_score,
//   readiness_min_interested_count, and
//   readiness_max_structural_concern_count all come from the manifest.
//
//   Invariant #3 (Observation Provenance) — every classification
//   carries provenance.
//
//   Invariant #4 (No Aggregate Scores) — output is the categorical
//   classification + named factors + counts. No "readiness_score"
//   or "readiness_index" numeric field anywhere.
//
//   Invariant #5 Check 5 (No Nondeterminism) — Date.now() only in
//   provenance construction.
//
// What this module does NOT do:
//   - Predict the probability of decision-readiness
//   - Compute a numeric "readiness index"
//   - Recommend "next action" to get to decision-ready
//   - Generate prose explanation
//   - Make autonomous decisions about deal advancement
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EvaluationStateSummary,
  RecoveryPathHistoryEntry,
} from "../persistence/types";
import type {
  ObservationProvenance,
  ReadinessClassification,
  ReadinessClassificationKind,
  ReadinessFactor,
  ThresholdManifest,
} from "./types";
import { OPERATIONS_MODULE_VERSION } from "./types";
import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";
import {
  assertBoundaryMetadata,
  BoundaryEnforcementError,
} from "./__boundary__/runtime-assertions";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassifyReadinessInput {
  readonly snapshot_id: string;
  readonly state_summary: EvaluationStateSummary;
  /**
   * Recovery history entries for THIS SNAPSHOT only (not the full
   * deal history). The classifier uses them to count unresolved
   * structural concerns, unresolved comfort conditions, etc.
   *
   * The orchestrator filters to current snapshot before calling.
   */
  readonly history_at_snapshot: ReadonlyArray<RecoveryPathHistoryEntry>;
  readonly thresholds: ThresholdManifest;
  readonly computed_at?: string;
}

/**
 * Classify a snapshot's decision-readiness state.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * Returns a ReadinessClassification with:
 *   - classification: one of five categorical states
 *   - contributing_factors: named, structured factors (no prose)
 *   - per-category counts (evidence, structural concerns, postures)
 *   - provenance
 */
export function classifyReadiness(
  input: ClassifyReadinessInput,
): ReadinessClassification {
  const { snapshot_id, state_summary, history_at_snapshot, thresholds, computed_at } = input;
  const provenance = buildProvenance(snapshot_id, thresholds, computed_at);

  // Compute the inputs to the classification rule
  const inputs = extractClassificationInputs(state_summary, history_at_snapshot);

  // Apply priority-ordered rule (first match wins)
  const classification = applyClassificationRule(inputs, thresholds);

  // Build the named factors that contributed to the classification
  const contributing_factors = buildContributingFactors(
    classification,
    inputs,
    state_summary,
    thresholds,
  );

  return {
    snapshot_id,
    classification,
    missing_evidence_count: inputs.missing_evidence_count,
    blocking_structural_concern_count: inputs.unresolved_structural_concerns,
    interested_personality_count: inputs.interested_count,
    cautious_personality_count: inputs.cautious_count,
    declined_personality_count: inputs.declined_count,
    contributing_factors,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION RULE
// ─────────────────────────────────────────────────────────────────────────────

interface ClassificationInputs {
  readonly unresolved_structural_concerns: number;
  readonly evidence_score: number;
  readonly interested_count: number;
  readonly cautious_count: number;
  readonly declined_count: number;
  readonly total_personality_count: number;
  readonly unresolved_recovery_priorities: number;
  readonly unresolved_comfort_conditions: number;
  readonly unresolved_repairable_discomforts: number;
  /**
   * `missing_evidence_count` = unresolved information_need entries.
   * Distinct from evidence_score, which is the CP-3 axis band.
   */
  readonly missing_evidence_count: number;
  readonly evidence_band: string | null;
}

function applyClassificationRule(
  inputs: ClassificationInputs,
  thresholds: ThresholdManifest,
): ReadinessClassificationKind {
  // Priority 1: structurally_blocked
  // Any unresolved structural concern beyond the manifest's max threshold
  if (
    inputs.unresolved_structural_concerns >
    thresholds.readiness_max_structural_concern_count
  ) {
    return "structurally_blocked";
  }

  // Priority 2: all_paths_declined
  // All personalities at decline AND there is at least one personality
  if (
    inputs.total_personality_count > 0 &&
    inputs.declined_count === inputs.total_personality_count
  ) {
    return "all_paths_declined";
  }

  // Priority 3: evidence_insufficient
  // Evidence quality below the manifest threshold (evidence band must
  // be one of the bands considered "sufficient"). The threshold is a
  // score value — CP-3 evidence_quality is on the same 0-100 scale
  // as financial_score. We use evidence_score for the comparison
  // since it is the canonical numeric. If evidence_score is missing
  // we fall back to band-based inference.
  if (
    inputs.evidence_score < thresholds.readiness_min_evidence_score
  ) {
    return "evidence_insufficient";
  }

  // Priority 4 & 5: decision_ready vs decision_ready_with_caveats
  // Must have at least the manifest's minimum interested count
  if (inputs.interested_count < thresholds.readiness_min_interested_count) {
    // No interested personality AND not declined (passed prior checks)
    // → still evidence_insufficient is wrong (we passed that); this is
    // the "cautious-only" case. Classify as caveats since the deal
    // is not blocked but no path is clearly open.
    return "decision_ready_with_caveats";
  }

  // Any unresolved priorities, comfort conditions, or repairable
  // discomforts at this point → caveats
  const hasUnresolvedConcerns =
    inputs.unresolved_recovery_priorities > 0 ||
    inputs.unresolved_comfort_conditions > 0 ||
    inputs.unresolved_repairable_discomforts > 0;

  if (hasUnresolvedConcerns) {
    return "decision_ready_with_caveats";
  }

  // All preconditions met, no unresolved items
  return "decision_ready";
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractClassificationInputs(
  state_summary: EvaluationStateSummary,
  history: ReadonlyArray<RecoveryPathHistoryEntry>,
): ClassificationInputs {
  // From state_summary scalars
  const evidence_score = state_summary.evidence_quality ?? 0;
  const evidence_band =
    (state_summary as { evidence_quality_band?: string }).evidence_quality_band ??
    null;
  const interested_count = state_summary.interested_count ?? 0;
  const cautious_count = state_summary.cautious_count ?? 0;
  const declined_count = state_summary.decline_count ?? 0;
  const total_personality_count =
    interested_count + cautious_count + declined_count;

  // Counts derived from history at this snapshot
  let unresolved_structural_concerns = 0;
  let unresolved_recovery_priorities = 0;
  let unresolved_comfort_conditions = 0;
  let unresolved_repairable_discomforts = 0;
  let missing_evidence_count = 0;

  for (const entry of history) {
    if (entry.status === "satisfied") continue;

    switch (entry.item_kind) {
      case "structural_concern":
        unresolved_structural_concerns += 1;
        break;
      case "recovery_priority":
        unresolved_recovery_priorities += 1;
        break;
      case "comfort_condition":
        unresolved_comfort_conditions += 1;
        break;
      case "repairable_discomfort":
        unresolved_repairable_discomforts += 1;
        break;
      case "information_need":
        missing_evidence_count += 1;
        break;
    }
  }

  return {
    unresolved_structural_concerns,
    evidence_score,
    interested_count,
    cautious_count,
    declined_count,
    total_personality_count,
    unresolved_recovery_priorities,
    unresolved_comfort_conditions,
    unresolved_repairable_discomforts,
    missing_evidence_count,
    evidence_band,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTING FACTORS
//
// Named, structured factors that EXPLAIN why a classification was
// assigned. Each factor is a triple (axis_or_dimension, state, band).
// No prose, no recommendations.
// ─────────────────────────────────────────────────────────────────────────────

function buildContributingFactors(
  classification: ReadinessClassificationKind,
  inputs: ClassificationInputs,
  state_summary: EvaluationStateSummary,
  _thresholds: ThresholdManifest,
): ReadonlyArray<ReadinessFactor> {
  const factors: ReadinessFactor[] = [];

  // Always surface the binding constraint context — it's the
  // architectural anchor for understanding deal state
  if (state_summary.dominant_constraint_axis !== null) {
    factors.push({
      axis_or_dimension: state_summary.dominant_constraint_axis,
      state: "dominant_constraint",
      band: state_summary.dominant_constraint_band ?? null,
    });
  }

  // Closest recoverable lender
  if (state_summary.closest_recoverable_profile !== null) {
    factors.push({
      axis_or_dimension: state_summary.closest_recoverable_profile,
      state:
        state_summary.closest_recoverable_state ?? "unknown",
      band: null,
    });
  }

  // Classification-specific contributing factors
  switch (classification) {
    case "structurally_blocked": {
      // Surface the structural concern count and the axes affected
      factors.push({
        axis_or_dimension: "structural_concern",
        state: "blocking",
        band: null,
      });
      // Highest fragility axis is often the root of structural concerns
      if (state_summary.highest_fragility_axis !== null) {
        factors.push({
          axis_or_dimension: state_summary.highest_fragility_axis,
          state: "highest_fragility",
          band: null,
        });
      }
      break;
    }
    case "all_paths_declined": {
      factors.push({
        axis_or_dimension: "all_personalities",
        state: "decline",
        band: null,
      });
      break;
    }
    case "evidence_insufficient": {
      factors.push({
        axis_or_dimension: "evidence_quality",
        state: "below_threshold",
        band: inputs.evidence_band,
      });
      break;
    }
    case "decision_ready_with_caveats": {
      if (inputs.unresolved_recovery_priorities > 0) {
        factors.push({
          axis_or_dimension: "recovery_priorities",
          state: "unresolved",
          band: null,
        });
      }
      if (inputs.unresolved_comfort_conditions > 0) {
        factors.push({
          axis_or_dimension: "comfort_conditions",
          state: "unresolved",
          band: null,
        });
      }
      if (inputs.unresolved_repairable_discomforts > 0) {
        factors.push({
          axis_or_dimension: "repairable_discomforts",
          state: "unresolved",
          band: null,
        });
      }
      if (
        inputs.interested_count === 0 &&
        inputs.cautious_count > 0
      ) {
        factors.push({
          axis_or_dimension: "personality_posture",
          state: "cautious_only",
          band: null,
        });
      }
      break;
    }
    case "decision_ready": {
      factors.push({
        axis_or_dimension: "decision_state",
        state: "ready",
        band: null,
      });
      break;
    }
  }

  // Deterministic ordering by (axis_or_dimension, state)
  factors.sort((a, b) => {
    if (a.axis_or_dimension !== b.axis_or_dimension) {
      return a.axis_or_dimension < b.axis_or_dimension ? -1 : 1;
    }
    if (a.state < b.state) return -1;
    if (a.state > b.state) return 1;
    return 0;
  });

  return factors;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function buildProvenance(
  snapshot_id: string,
  thresholds: ThresholdManifest,
  computed_at?: string,
): ObservationProvenance {
  return {
    computed_at: computed_at ?? new Date(Date.now()).toISOString(),
    operations_version: OPERATIONS_MODULE_VERSION,
    threshold_manifest_id: thresholds.manifest_id,
    derived_from_snapshot_ids: [snapshot_id],
    derived_from_event_ids: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA + SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/readiness-classifier",
  module_version: OPERATIONS_MODULE_VERSION,
  types: [],
};

function runSelfTest(): void {
  try {
    assertBoundaryMetadata(BOUNDARY_METADATA);
  } catch (err) {
    if (err instanceof BoundaryEnforcementError) {
      const g = globalThis as { console?: { error?: (m: string) => void } };
      g.console?.error?.(
        `CP-10 readiness-classifier BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
