// lib/intelligence/operations/structural-trajectory.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Structural Trajectory Classifier
//
// Pure function over a deal's recovery lifecycle history that emits
// StructuralTrajectory[] classifying each structural concern across
// the snapshot chain.
//
// Six-state classification:
//
//   emerging
//     The concern appears in only one snapshot (the most recent for
//     this concern). No trajectory yet.
//
//   worsening
//     The concern's `affected_personality_count` is trending upward
//     across the worsening_window_snapshots most recent appearances.
//     More personalities are affected over time.
//
//   improving
//     The concern's affected count is trending downward.
//
//   persistent_stable
//     The concern has appeared in 2+ snapshots with the SAME affected
//     count. Not getting worse, not getting better — just hasn't
//     resolved.
//
//   intermittent
//     The concern oscillates: present, absent, present again, etc.
//     Threshold: intermittent_oscillation_threshold transitions
//     between absent/present.
//
//   resolved
//     The concern's most recent appearance had status="satisfied".
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #1 (Threshold Manifest) — worsening_window_snapshots
//   and intermittent_oscillation_threshold come from manifest.
//
//   Invariant #3 (Observation Provenance) — every trajectory and the
//   wrapping report carries provenance.
//
//   Invariant #4 (No Aggregate Scores) — output is categorical
//   classification + structured observation series. No "severity
//   trajectory score." Counts in the report are single-dimension
//   (worsening_count, improving_count, etc.) — never blended.
//
//   Invariant #5 Check 5 (No Nondeterminism) — Date.now() permitted
//   only in provenance construction.
//
// What this module does NOT do:
//   - Predict future trajectory (no forecasting)
//   - Score severity numerically
//   - Recommend resolution
//   - Generate prose
//
// Note on affected_personality_count semantics:
//   CP-9's RecoveryPathHistoryEntry carries optional structured
//   metadata via `addresses_target_id` and similar fields. The
//   affected_personality_count is the number of distinct personality
//   IDs that referenced this structural concern at that snapshot.
//   This count comes from the recovery_path_history row's
//   structural_concern_observations JSONB (carried in the row's
//   `metadata` field when item_kind='structural_concern'), or
//   defaults to 1 when no metadata is available.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RecoveryPathHistoryEntry,
} from "../persistence/types";
import type {
  ObservationProvenance,
  StructuralTrajectory,
  StructuralTrajectoryKind,
  StructuralTrajectoryReport,
  ThresholdManifest,
  TrajectoryObservation,
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

export interface ClassifyStructuralTrajectoriesInput {
  readonly deal_id: string;
  /**
   * All recovery_path_history entries for the deal. Module filters
   * internally to entries with item_kind='structural_concern'.
   */
  readonly history: ReadonlyArray<RecoveryPathHistoryEntry>;
  readonly thresholds: ThresholdManifest;
  readonly computed_at?: string;
}

/**
 * Classify structural concern trajectories across the snapshot chain.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * Returns a StructuralTrajectoryReport with one trajectory per
 * distinct concern_id present in the history, plus per-state count
 * fields for the dashboard summary line.
 */
export function classifyStructuralTrajectories(
  input: ClassifyStructuralTrajectoriesInput,
): StructuralTrajectoryReport {
  const { deal_id, history, thresholds, computed_at } = input;
  const provenance = buildProvenance(history, thresholds, computed_at);

  // Filter to structural concerns only
  const concerns = history.filter(
    (e) => e.item_kind === "structural_concern",
  );

  // Group by concern item_id
  const groups = groupByConcern(concerns);

  const trajectories: StructuralTrajectory[] = [];
  for (const group of groups) {
    const trajectory = classifyConcern(group, thresholds, provenance);
    trajectories.push(trajectory);
  }

  // Deterministic ordering: trajectory kind rank, then concern_id
  trajectories.sort(trajectoryOrder);

  // Per-state summary counts
  const counts = countByTrajectory(trajectories);

  return {
    deal_id,
    worsening_count: counts.worsening,
    improving_count: counts.improving,
    persistent_stable_count: counts.persistent_stable,
    intermittent_count: counts.intermittent,
    emerging_count: counts.emerging,
    resolved_count: counts.resolved,
    trajectories,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPING
// ─────────────────────────────────────────────────────────────────────────────

interface ConcernGroup {
  readonly concern_id: string;
  readonly entries: ReadonlyArray<RecoveryPathHistoryEntry>;
}

function groupByConcern(
  concerns: ReadonlyArray<RecoveryPathHistoryEntry>,
): ReadonlyArray<ConcernGroup> {
  const groupMap = new Map<string, RecoveryPathHistoryEntry[]>();

  for (const entry of concerns) {
    const key = entry.item_id;
    let group = groupMap.get(key);
    if (!group) {
      group = [];
      groupMap.set(key, group);
    }
    group.push(entry);
  }

  const groups: ConcernGroup[] = [];
  for (const [concern_id, entries] of groupMap) {
    // Chronological sort
    const sortedEntries = entries.slice().sort((a, b) => {
      if (a.evaluated_at !== b.evaluated_at) {
        return a.evaluated_at < b.evaluated_at ? -1 : 1;
      }
      if (a.snapshot_id < b.snapshot_id) return -1;
      if (a.snapshot_id > b.snapshot_id) return 1;
      return 0;
    });
    groups.push({ concern_id, entries: sortedEntries });
  }

  // Outer-group sort for deterministic iteration
  groups.sort((a, b) => {
    if (a.concern_id < b.concern_id) return -1;
    if (a.concern_id > b.concern_id) return 1;
    return 0;
  });

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

function classifyConcern(
  group: ConcernGroup,
  thresholds: ThresholdManifest,
  provenance: ObservationProvenance,
): StructuralTrajectory {
  const entries = group.entries;
  const observations: TrajectoryObservation[] = entries.map((e) => ({
    snapshot_id: e.snapshot_id,
    evaluated_at: e.evaluated_at,
    affected_personality_count: extractAffectedPersonalityCount(e),
  }));

  const trajectory = inferTrajectoryKind(entries, observations, thresholds);

  return {
    concern_id: group.concern_id,
    trajectory,
    observation_count: observations.length,
    observations,
    provenance,
  };
}

/**
 * Apply classification rules to a chronological sequence of
 * appearances for one concern.
 *
 * Priority order (mutually exclusive — exactly one kind assigned):
 *
 *   1. resolved — last entry's status is "satisfied"
 *   2. emerging — only 1 observation total
 *   3. intermittent — series oscillates absent/present beyond threshold
 *   4. worsening — affected count trending up in worsening_window
 *   5. improving — affected count trending down in worsening_window
 *   6. persistent_stable — default; series exists but no trend
 */
function inferTrajectoryKind(
  entries: ReadonlyArray<RecoveryPathHistoryEntry>,
  observations: ReadonlyArray<TrajectoryObservation>,
  thresholds: ThresholdManifest,
): StructuralTrajectoryKind {
  const lastEntry = entries[entries.length - 1];

  // Priority 1: resolved
  if (lastEntry.status === "satisfied") {
    return "resolved";
  }

  // Priority 2: emerging
  if (entries.length === 1) {
    return "emerging";
  }

  // Priority 3: intermittent
  // Intermittence is determined by the regression marker: if the
  // concern has 2+ status="regressed" transitions, it has appeared,
  // disappeared, and reappeared multiple times.
  let regressionTransitions = 0;
  for (const e of entries) {
    if (e.status === "regressed") regressionTransitions += 1;
  }
  if (regressionTransitions >= thresholds.intermittent_oscillation_threshold) {
    return "intermittent";
  }

  // Priority 4 & 5: trend analysis over the recent window
  const windowSize = thresholds.worsening_window_snapshots;
  const recentObs = observations.slice(-windowSize);
  if (recentObs.length >= 2) {
    const trend = computeTrend(recentObs);
    if (trend > 0) return "worsening";
    if (trend < 0) return "improving";
    // trend === 0 falls through to persistent_stable
  }

  // Priority 6: default
  return "persistent_stable";
}

/**
 * Compute trend direction over a window of observations.
 *
 * Returns:
 *   > 0 — counts trending upward (more personalities affected)
 *   < 0 — counts trending downward
 *   === 0 — counts unchanged or oscillating with no net direction
 *
 * Uses simple sign-of-net-change: compare first and last counts.
 * Robust to single-step fluctuation; clear at the endpoints.
 * No regression coefficient, no statistical fitting — just the
 * net direction across the window.
 */
function computeTrend(
  observations: ReadonlyArray<TrajectoryObservation>,
): number {
  if (observations.length < 2) return 0;
  const first = observations[0].affected_personality_count;
  const last = observations[observations.length - 1].affected_personality_count;
  if (last > first) return 1;
  if (last < first) return -1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the affected_personality_count from a structural concern
 * history entry.
 *
 * CP-9 RecoveryPathHistoryEntry carries item-specific metadata for
 * structural concerns in the entry's `metadata` field (when present).
 * The expected shape is { affected_personality_count: number, ... }.
 *
 * Defaults to 1 when:
 *   - metadata is absent
 *   - metadata.affected_personality_count is missing or not a positive integer
 *
 * The default of 1 reflects the minimum case: a structural concern
 * affecting at least one personality. Without explicit count metadata,
 * we cannot distinguish breadth; we assume the conservative minimum.
 */
function extractAffectedPersonalityCount(
  entry: RecoveryPathHistoryEntry,
): number {
  const md = (entry as { metadata?: unknown }).metadata;
  if (md === null || md === undefined || typeof md !== "object") return 1;
  const candidate = (md as Record<string, unknown>).affected_personality_count;
  if (
    typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate > 0
  ) {
    return candidate;
  }
  return 1;
}

interface TrajectoryCounts {
  worsening: number;
  improving: number;
  persistent_stable: number;
  intermittent: number;
  emerging: number;
  resolved: number;
}

function countByTrajectory(
  trajectories: ReadonlyArray<StructuralTrajectory>,
): TrajectoryCounts {
  const counts: TrajectoryCounts = {
    worsening: 0,
    improving: 0,
    persistent_stable: 0,
    intermittent: 0,
    emerging: 0,
    resolved: 0,
  };
  for (const t of trajectories) {
    counts[t.trajectory] += 1;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ORDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trajectory kind rank — worsening first (highest concern), resolved
 * last (lowest concern). Used solely for deterministic output ordering;
 * this is NOT an aggregate severity score.
 */
const TRAJECTORY_RANK: Record<StructuralTrajectoryKind, number> = {
  worsening: 0,
  intermittent: 1,
  persistent_stable: 2,
  emerging: 3,
  improving: 4,
  resolved: 5,
};

function trajectoryOrder(
  a: StructuralTrajectory,
  b: StructuralTrajectory,
): number {
  const rankDiff = TRAJECTORY_RANK[a.trajectory] - TRAJECTORY_RANK[b.trajectory];
  if (rankDiff !== 0) return rankDiff;
  if (a.concern_id < b.concern_id) return -1;
  if (a.concern_id > b.concern_id) return 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function buildProvenance(
  history: ReadonlyArray<RecoveryPathHistoryEntry>,
  thresholds: ThresholdManifest,
  computed_at?: string,
): ObservationProvenance {
  // Collect distinct snapshot_ids in chronological order
  const seen = new Set<string>();
  const ordered: string[] = [];
  const sortedByTime = history
    .slice()
    .sort((a, b) => (a.evaluated_at < b.evaluated_at ? -1 : 1));
  for (const entry of sortedByTime) {
    if (!seen.has(entry.snapshot_id)) {
      seen.add(entry.snapshot_id);
      ordered.push(entry.snapshot_id);
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
  module_name: "operations/structural-trajectory",
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
        `CP-10 structural-trajectory BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
