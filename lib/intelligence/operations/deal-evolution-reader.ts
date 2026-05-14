// lib/intelligence/operations/deal-evolution-reader.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Deal Evolution Reader
//
// Cross-snapshot trajectory view of a deal's readiness classification
// over time.
//
// Pure projection: composes CP-9 snapshot chain reads with CP-10's
// readiness-classifier to produce a chronological sequence of
// (snapshot_id, evaluated_at, classification) observations.
//
// What this lets the dashboard answer:
//
//   "When did this deal become structurally_blocked?"
//   "Did this deal pass through decision_ready and then regress?"
//   "How long has the deal been in evidence_insufficient?"
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #1 (Threshold Manifest) — every readiness classification
//   in the trajectory used the same manifest_id (consistent
//   interpretation across the chain).
//
//   Invariant #3 (Observation Provenance) — trajectory carries
//   provenance referencing ALL snapshot_ids in the chain (ordered
//   chronologically).
//
//   Invariant #4 (No Aggregate Scores) — output is an ordered
//   sequence of categorical readings + a count. No "trajectory
//   score" or "stability index."
//
//   Invariant #5 Check 5 (No Nondeterminism) — Date.now() permitted
//   only in provenance construction.
//
// What this module does NOT do:
//
//   - Predict the next classification
//   - Score the trajectory's "stability"
//   - Generate prose summaries
//   - Write to CP-9 (read-only)
//   - Modify or interpret CP-9 records — just reads them
//
// Architectural note: this module's `current_status` is the LAST
// observation's classification. There's no notion of "trend direction"
// — that's been deliberately omitted to avoid the temptation to add
// "improving / worsening / oscillating" classification on top of
// already-categorical readings, which would be a step toward
// aggregate stability scoring.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EvaluationSnapshot,
  EvaluationStateSummary,
  RecoveryPathHistoryEntry,
} from "../persistence/types";
import type {
  DealEvolutionTrajectory,
  ObservationProvenance,
  ReadinessClassificationKind,
  ReadinessTrajectoryPoint,
  ThresholdManifest,
} from "./types";
import { OPERATIONS_MODULE_VERSION } from "./types";
import { classifyReadiness } from "./readiness-classifier";
import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";
import {
  assertBoundaryMetadata,
  BoundaryEnforcementError,
} from "./__boundary__/runtime-assertions";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-snapshot input bundle that the orchestrator pre-fetches and
 * passes to this module. Each bundle corresponds to one snapshot in
 * the deal's chain.
 */
export interface SnapshotEvaluationBundle {
  readonly snapshot: EvaluationSnapshot;
  readonly state_summary: EvaluationStateSummary;
  /**
   * Recovery history entries that are tied to THIS snapshot only.
   * The orchestrator filters the full deal history per snapshot
   * before passing it in.
   */
  readonly history_at_snapshot: ReadonlyArray<RecoveryPathHistoryEntry>;
}

export interface BuildDealEvolutionInput {
  readonly deal_id: string;
  /**
   * The deal's full snapshot chain in chronological order
   * (earliest first). The orchestrator handles ordering;
   * this module assumes the input is already sorted.
   */
  readonly bundles: ReadonlyArray<SnapshotEvaluationBundle>;
  readonly thresholds: ThresholdManifest;
  readonly computed_at?: string;
}

/**
 * Build a deal's readiness evolution trajectory from its full
 * snapshot chain.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * For each snapshot in the chain:
 *   1. Run readiness-classifier with the snapshot's state_summary
 *      and history at that snapshot
 *   2. Record the (snapshot_id, evaluated_at, classification) tuple
 *
 * The trajectory is ordered chronologically. The final observation
 * defines `current_status`.
 *
 * Returns a DealEvolutionTrajectory with observation_count + sorted
 * observations + current_status + provenance.
 *
 * Edge case: empty bundles array. Returns trajectory with
 * observation_count=0 and current_status="evidence_insufficient"
 * (the safest default — no data to evaluate).
 */
export function buildDealEvolution(
  input: BuildDealEvolutionInput,
): DealEvolutionTrajectory {
  const { deal_id, bundles, thresholds, computed_at } = input;
  const provenance = buildProvenance(bundles, thresholds, computed_at);

  // Compute readiness classification at each snapshot
  const observations: ReadinessTrajectoryPoint[] = [];
  let current_status: ReadinessClassificationKind = "evidence_insufficient";

  // Ensure chronological ordering (defensive — caller is supposed to
  // pass chronological, but we sort to guarantee determinism)
  const sortedBundles = bundles.slice().sort((a, b) => {
    if (a.snapshot.created_at !== b.snapshot.created_at) {
      return a.snapshot.created_at < b.snapshot.created_at ? -1 : 1;
    }
    if (a.snapshot.snapshot_id < b.snapshot.snapshot_id) return -1;
    if (a.snapshot.snapshot_id > b.snapshot.snapshot_id) return 1;
    return 0;
  });

  for (const bundle of sortedBundles) {
    const classification = classifyReadiness({
      snapshot_id: bundle.snapshot.snapshot_id,
      state_summary: bundle.state_summary,
      history_at_snapshot: bundle.history_at_snapshot,
      thresholds,
      // Use the snapshot's own evaluated_at for the classification's
      // computed_at — keeps the per-snapshot reading deterministic
      computed_at: bundle.snapshot.created_at,
    });

    observations.push({
      snapshot_id: bundle.snapshot.snapshot_id,
      evaluated_at: bundle.snapshot.created_at,
      classification: classification.classification,
    });

    current_status = classification.classification;
  }

  return {
    deal_id,
    observation_count: observations.length,
    observations,
    current_status,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS (operate on an already-built trajectory)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the first observation in the trajectory whose classification
 * matches the given kind. Returns null if no observation matches.
 *
 * Useful for answering: "When did this deal first become
 * structurally_blocked?"
 */
export function firstObservationOf(
  trajectory: DealEvolutionTrajectory,
  kind: ReadinessClassificationKind,
): ReadinessTrajectoryPoint | null {
  for (const obs of trajectory.observations) {
    if (obs.classification === kind) return obs;
  }
  return null;
}

/**
 * Find the most recent observation in the trajectory whose
 * classification matches the given kind. Returns null if no
 * observation matches.
 *
 * Useful for "When was this deal last decision_ready?"
 */
export function lastObservationOf(
  trajectory: DealEvolutionTrajectory,
  kind: ReadinessClassificationKind,
): ReadinessTrajectoryPoint | null {
  for (let i = trajectory.observations.length - 1; i >= 0; i -= 1) {
    if (trajectory.observations[i].classification === kind) {
      return trajectory.observations[i];
    }
  }
  return null;
}

/**
 * Count how many distinct classification kinds the deal has passed
 * through across its trajectory.
 *
 * A deal that's been in evidence_insufficient the whole time has
 * traversed 1 distinct state. A deal that went through
 * structurally_blocked → evidence_insufficient → decision_ready_with_caveats
 * has traversed 3.
 *
 * This is a single-dimension count (number of distinct values seen),
 * NOT a stability score. The constitutional distinction matters:
 * a count is just a count, while a "stability score" would be an
 * aggregate.
 */
export function distinctClassificationsCount(
  trajectory: DealEvolutionTrajectory,
): number {
  const seen = new Set<string>();
  for (const obs of trajectory.observations) {
    seen.add(obs.classification);
  }
  return seen.size;
}

/**
 * Identify the contiguous run length of the trajectory's current
 * status. How many of the most recent observations share the same
 * classification?
 *
 * Useful for "this deal has been structurally_blocked for the last
 * 4 snapshots."
 *
 * Returns 0 if the trajectory is empty.
 */
export function currentStatusRunLength(
  trajectory: DealEvolutionTrajectory,
): number {
  if (trajectory.observations.length === 0) return 0;
  const target = trajectory.current_status;
  let count = 0;
  for (let i = trajectory.observations.length - 1; i >= 0; i -= 1) {
    if (trajectory.observations[i].classification === target) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function buildProvenance(
  bundles: ReadonlyArray<SnapshotEvaluationBundle>,
  thresholds: ThresholdManifest,
  computed_at?: string,
): ObservationProvenance {
  // Collect distinct snapshot_ids in chronological order
  const sortedBundles = bundles.slice().sort((a, b) => {
    if (a.snapshot.created_at !== b.snapshot.created_at) {
      return a.snapshot.created_at < b.snapshot.created_at ? -1 : 1;
    }
    if (a.snapshot.snapshot_id < b.snapshot.snapshot_id) return -1;
    if (a.snapshot.snapshot_id > b.snapshot.snapshot_id) return 1;
    return 0;
  });
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const bundle of sortedBundles) {
    const id = bundle.snapshot.snapshot_id;
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }

  return {
    computed_at: computed_at ?? new Date(Date.now()).toISOString(),
    operations_version: OPERATIONS_MODULE_VERSION,
    threshold_manifest_id: thresholds.manifest_id,
    derived_from_snapshot_ids: ordered,
    derived_from_event_ids: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA + SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/deal-evolution-reader",
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
        `CP-10 deal-evolution-reader BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
