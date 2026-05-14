// lib/intelligence/operations/stalled-path-detector.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Stalled Path Detector
//
// Pure function over a deal's recovery lifecycle history that emits
// StalledPath[] for items exceeding configured thresholds.
//
// Stall detection is BINARY THRESHOLDING. No prediction of when an
// item will resolve. No probability estimate. Just: "this item has
// been open longer than the configured threshold."
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #1 (Threshold Manifest) — `stalled_days_default` and
//   `stalled_snapshots_default` come from the supplied manifest, not
//   hardcoded constants.
//
//   Invariant #3 (Observation Provenance) — every StalledPath and
//   the wrapping StalledPathReport carry ObservationProvenance.
//
//   Invariant #4 (No Aggregate Scores) — outputs are categorical:
//   stall_reason enum + threshold_kind enum + counts/durations.
//   No "stall severity" numeric score.
//
//   Invariant #5 Check 5 (No Nondeterminism) — `Date.now()` permitted
//   only for stamping provenance.computed_at and reference_at.
//
// Stall reason taxonomy (four mutually-exclusive categories):
//
//   no_evaluations_taken
//     The item's last appearance is the only appearance. The deal
//     has had no subsequent snapshots — there's been no opportunity
//     to make progress. Distinct from active stalling because the
//     buyer simply hasn't re-evaluated.
//
//   evaluations_taken_no_progress
//     The item has appeared in 2+ snapshots with non-satisfied
//     status throughout. The deal is being actively evaluated, but
//     this item never resolves.
//
//   regressed_after_satisfaction
//     The item was satisfied at some prior snapshot but is now
//     unsatisfied (regressed or evolved). This is the highest-
//     concern stall — diligence work was undone.
//
//   evolved_repeatedly
//     The item has 2+ appearances with `evolved` status. The
//     priority is being restated rather than resolved.
//
// What this module does NOT do:
//   - Predict when items will resolve
//   - Recommend resolution paths
//   - Rank items (impact-ranker handles ranking)
//   - Generate prose
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RecoveryPathHistoryEntry,
} from "../persistence/types";
import type {
  ObservationProvenance,
  StallReason,
  StalledPath,
  StalledPathReport,
  ThresholdKind,
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

export interface DetectStalledPathsInput {
  readonly deal_id: string;
  /**
   * All RecoveryPathHistoryEntry rows for the deal, ordered
   * chronologically (earliest first). The orchestrator handles
   * sorting; this module assumes the input is already in order.
   * Items within each snapshot can appear in any order.
   */
  readonly history: ReadonlyArray<RecoveryPathHistoryEntry>;
  readonly thresholds: ThresholdManifest;
  /**
   * Reference timestamp for computing days_open. Defaults to "now".
   * Specifying this explicitly is useful for replay scenarios where
   * the "current time" should be the time of the last snapshot.
   */
  readonly reference_at?: string;
  readonly computed_at?: string;
}

/**
 * Detect stalled recovery paths from a deal's lifecycle history.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * Process:
 *   1. Group history entries by (item_kind, item_id) — the lifecycle
 *      identity. addresses_target_id is NOT used as the grouping key
 *      because evolved items have different (kind, id) pairs even
 *      when they address the same underlying target.
 *   2. For each lifecycle, compute days_open and
 *      snapshots_since_appearance.
 *   3. Filter to lifecycles whose current status is NOT satisfied
 *      AND that exceed either threshold.
 *   4. Classify each stalled lifecycle into a stall_reason.
 *
 * Returns a StalledPathReport with all stalled paths.
 */
export function detectStalledPaths(
  input: DetectStalledPathsInput,
): StalledPathReport {
  const { deal_id, history, thresholds, computed_at, reference_at } = input;
  const provenance = buildProvenance(history, thresholds, computed_at);
  const reference = reference_at ?? new Date(Date.now()).toISOString();

  // Group by (item_kind, item_id)
  const groups = groupByLifecycle(history);

  const stalled: StalledPath[] = [];
  for (const lifecycle of groups) {
    const stalledPath = classifyLifecycle(
      lifecycle,
      thresholds,
      reference,
      provenance,
    );
    if (stalledPath) stalled.push(stalledPath);
  }

  // Deterministic ordering: stall_reason rank, then days_open desc,
  // then item_kind, then item_id
  stalled.sort(stalledPathOrder);

  return {
    deal_id,
    stalled_path_count: stalled.length,
    stalled_paths: stalled,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE GROUPING
// ─────────────────────────────────────────────────────────────────────────────

interface Lifecycle {
  readonly item_kind: RecoveryPathHistoryEntry["item_kind"];
  readonly item_id: string;
  readonly item_label: string | null;
  readonly entries: ReadonlyArray<RecoveryPathHistoryEntry>;
}

/**
 * Group history entries by (item_kind, item_id). Within each group,
 * entries are sorted by evaluated_at then snapshot_id for
 * deterministic ordering.
 *
 * Returns lifecycles sorted by (item_kind, item_id) for deterministic
 * outer iteration.
 */
function groupByLifecycle(
  history: ReadonlyArray<RecoveryPathHistoryEntry>,
): ReadonlyArray<Lifecycle> {
  const groupMap = new Map<string, RecoveryPathHistoryEntry[]>();

  for (const entry of history) {
    const key = entry.item_kind + "::" + entry.item_id;
    let group = groupMap.get(key);
    if (!group) {
      group = [];
      groupMap.set(key, group);
    }
    group.push(entry);
  }

  const lifecycles: Lifecycle[] = [];
  for (const [, entries] of groupMap) {
    // Chronological sort within lifecycle
    const sortedEntries = entries.slice().sort((a, b) => {
      if (a.evaluated_at !== b.evaluated_at) {
        return a.evaluated_at < b.evaluated_at ? -1 : 1;
      }
      if (a.snapshot_id < b.snapshot_id) return -1;
      if (a.snapshot_id > b.snapshot_id) return 1;
      return 0;
    });
    const first = sortedEntries[0];
    lifecycles.push({
      item_kind: first.item_kind,
      item_id: first.item_id,
      item_label:
        sortedEntries[sortedEntries.length - 1].item_label ??
        first.item_label,
      entries: sortedEntries,
    });
  }

  // Outer-group sort for deterministic output
  lifecycles.sort((a, b) => {
    if (a.item_kind !== b.item_kind)
      return a.item_kind < b.item_kind ? -1 : 1;
    if (a.item_id < b.item_id) return -1;
    if (a.item_id > b.item_id) return 1;
    return 0;
  });

  return lifecycles;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-LIFECYCLE CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

function classifyLifecycle(
  lifecycle: Lifecycle,
  thresholds: ThresholdManifest,
  reference_at: string,
  provenance: ObservationProvenance,
): StalledPath | null {
  const entries = lifecycle.entries;
  if (entries.length === 0) return null;

  const lastEntry = entries[entries.length - 1];
  const firstEntry = entries[0];

  // Item is no longer unresolved → not stalled
  if (lastEntry.status === "satisfied") return null;

  const days_open = daysBetween(firstEntry.evaluated_at, reference_at);
  const snapshots_since_appearance = entries.length;

  // Threshold check — at least one must be exceeded
  const exceedsDays = days_open >= thresholds.stalled_days_default;
  const exceedsSnapshots =
    snapshots_since_appearance >= thresholds.stalled_snapshots_default;
  if (!exceedsDays && !exceedsSnapshots) return null;

  // Classify stall_reason
  const stall_reason = inferStallReason(entries);

  // Identify which threshold was crossed first (or the days threshold
  // when both apply — days_open is the primary axis of time)
  const threshold_kind: ThresholdKind = exceedsDays
    ? "days_open"
    : "snapshots_unresolved";

  return {
    item_kind: lifecycle.item_kind,
    item_id: lifecycle.item_id,
    item_label: lifecycle.item_label,
    first_appeared_at: firstEntry.evaluated_at,
    days_open,
    snapshots_since_appearance,
    stall_reason,
    threshold_kind,
    provenance,
  };
}

/**
 * Determine the stall_reason for a lifecycle that has been classified
 * as stalled.
 *
 * Mutually exclusive — each lifecycle gets exactly one stall_reason.
 * Priority order applied when multiple categories apply:
 *
 *   1. regressed_after_satisfaction — strongest signal (diligence
 *      work was undone). Wins if ANY entry had satisfied status
 *      AND the lifecycle is now unsatisfied.
 *   2. evolved_repeatedly — wins if 2+ entries have status="evolved".
 *   3. no_evaluations_taken — wins if exactly 1 entry exists (lifecycle
 *      appeared once and has had no follow-up snapshots covering it).
 *   4. evaluations_taken_no_progress — default for lifecycles with 2+
 *      entries that don't match the above.
 */
function inferStallReason(
  entries: ReadonlyArray<RecoveryPathHistoryEntry>,
): StallReason {
  const lastEntry = entries[entries.length - 1];

  // Priority 1: regressed_after_satisfaction
  // Look for any prior satisfied state followed by current non-satisfied
  let hasPriorSatisfaction = false;
  for (let i = 0; i < entries.length - 1; i += 1) {
    if (entries[i].status === "satisfied") {
      hasPriorSatisfaction = true;
      break;
    }
  }
  // Also catch the case where lastEntry.status === "regressed" without
  // explicit prior satisfaction (CP-9 marks status=regressed on the
  // entry that re-opens after satisfaction)
  if (hasPriorSatisfaction || lastEntry.status === "regressed") {
    return "regressed_after_satisfaction";
  }

  // Priority 2: evolved_repeatedly
  let evolvedCount = 0;
  for (const e of entries) {
    if (e.status === "evolved") evolvedCount += 1;
  }
  if (evolvedCount >= 2) {
    return "evolved_repeatedly";
  }

  // Priority 3: no_evaluations_taken
  if (entries.length === 1) {
    return "no_evaluations_taken";
  }

  // Priority 4: default
  return "evaluations_taken_no_progress";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the integer number of days between two ISO 8601 timestamps.
 * Days computed as floor((to_ms - from_ms) / 86_400_000).
 *
 * Returns 0 if `to` is earlier than `from`. Pure function; no
 * nondeterminism.
 */
function daysBetween(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  const diff = toMs - fromMs;
  if (diff <= 0) return 0;
  return Math.floor(diff / 86_400_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ORDERING
// ─────────────────────────────────────────────────────────────────────────────

const STALL_REASON_RANK: Record<StallReason, number> = {
  regressed_after_satisfaction: 0,
  evolved_repeatedly: 1,
  evaluations_taken_no_progress: 2,
  no_evaluations_taken: 3,
};

function stalledPathOrder(a: StalledPath, b: StalledPath): number {
  const reasonDiff =
    STALL_REASON_RANK[a.stall_reason] - STALL_REASON_RANK[b.stall_reason];
  if (reasonDiff !== 0) return reasonDiff;
  // Within same stall_reason, longer days_open first
  if (a.days_open !== b.days_open) return b.days_open - a.days_open;
  if (a.item_kind !== b.item_kind)
    return a.item_kind < b.item_kind ? -1 : 1;
  if (a.item_id < b.item_id) return -1;
  if (a.item_id > b.item_id) return 1;
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
  // Sort a copy to ensure chronological order without mutating input
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
  module_name: "operations/stalled-path-detector",
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
        `CP-10 stalled-path-detector BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
