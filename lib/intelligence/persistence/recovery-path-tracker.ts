// lib/intelligence/persistence/recovery-path-tracker.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Recovery Path Tracker
//
// Cross-snapshot lifecycle queries.
//
// The snapshot-builder emits per-snapshot status records: "at snapshot X,
// item Y is open/persisted/satisfied/regressed/evolved." This module
// reads ACROSS those records to answer richer questions:
//
//   - When did this recovery item first appear?
//   - How long has it been open?
//   - Which items have been satisfied in the last N snapshots?
//   - Which items have regressed (was satisfied, now unsatisfied)?
//   - What's the satisfaction velocity for this deal?
//   - Which items address the same target across multiple snapshots?
//
// Architectural commitments:
//
//   1. Pure projection over stored records. No recomputation of status —
//      the snapshot-builder is the canonical source of status for each
//      snapshot. The tracker only INDEXES and AGGREGATES.
//
//   2. Repository-aware convenience APIs for the common queries; pure
//      functions over arrays for callers that already have the data.
//
//   3. Item identity uses (item_kind, item_id) as the key. The
//      addresses_target_id field provides cross-evolution identity for
//      recovery_priorities whose IDs shift across snapshots.
//
//   4. Time ordering uses evaluated_at, which is wall-clock time at
//      evaluation. The snapshot_id ordering is a fallback when
//      evaluated_at ties.
//
//   5. No writes. All operations are read-only.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PersistenceResult,
  RecoveryItemKind,
  RecoveryPathHistoryEntry,
  RecoveryStatus,
} from "./types";
import { PERSISTENCE_MODULE_VERSION } from "./types";
import { SnapshotRepository } from "./snapshot-repository";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregated lifecycle view of a single recovery item across snapshots.
 *
 * Represents the item's history: when it was first seen, what its
 * current status is, whether it has ever been satisfied/regressed.
 *
 * The `appearances` array gives the full chronological history for
 * callers that want to render lifecycle timelines. For most dashboard
 * queries the summary fields are enough.
 */
export interface ItemLifecycle {
  readonly item_kind: RecoveryItemKind;
  readonly item_id: string;
  readonly item_label: string | null;
  readonly addresses_target_id: string | null;

  /** ISO timestamp of the earliest snapshot containing this item. */
  readonly first_appeared_at: string;
  readonly first_appeared_snapshot_id: string;

  /** ISO timestamp of the most recent snapshot containing this item. */
  readonly last_seen_at: string;
  readonly last_seen_snapshot_id: string;

  /**
   * Status at the most recent snapshot. Note that "satisfied" means
   * the item was resolved at the latest snapshot; if a later snapshot
   * has not been taken, the item is no longer being tracked.
   */
  readonly current_status: RecoveryStatus;

  /** True if the item has EVER been satisfied (resolved at any point). */
  readonly was_ever_satisfied: boolean;

  /** True if the item went satisfied → unsatisfied at some point. */
  readonly has_regressed: boolean;

  /** Total number of snapshots where this item appears. */
  readonly appearance_count: number;

  /**
   * Full chronological history of this item. Index 0 = first
   * appearance; last index = most recent.
   */
  readonly appearances: ReadonlyArray<RecoveryPathHistoryEntry>;
}

/**
 * Summary of recovery progress for a deal between two reference points.
 *
 * Useful for "how is this deal progressing?" dashboards. Computed from
 * the recovery_path_history records of the two snapshots.
 */
export interface RecoveryProgress {
  readonly deal_id: string;
  readonly from_snapshot_id: string;
  readonly to_snapshot_id: string;
  readonly from_evaluated_at: string;
  readonly to_evaluated_at: string;

  /** Items present at `from` and resolved by `to`. */
  readonly satisfied_count: number;
  readonly satisfied_items: ReadonlyArray<{
    readonly item_kind: RecoveryItemKind;
    readonly item_id: string;
    readonly item_label: string | null;
  }>;

  /** Items present at both snapshots. */
  readonly persisted_count: number;

  /** Items present at `to` but not `from` (new concerns surfacing). */
  readonly new_count: number;
  readonly new_items: ReadonlyArray<{
    readonly item_kind: RecoveryItemKind;
    readonly item_id: string;
    readonly item_label: string | null;
  }>;

  /** Items that were satisfied at `from` but reappeared as open at `to`. */
  readonly regressed_count: number;
  readonly regressed_items: ReadonlyArray<{
    readonly item_kind: RecoveryItemKind;
    readonly item_id: string;
    readonly item_label: string | null;
  }>;

  /**
   * Items present at `to` with the same `addresses_target_id` as
   * an item at `from`, but under a different item_id. Indicates
   * priority restating.
   */
  readonly evolved_count: number;
  readonly evolved_items: ReadonlyArray<{
    readonly item_kind: RecoveryItemKind;
    readonly from_item_id: string;
    readonly to_item_id: string;
    readonly addresses_target_id: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE FUNCTIONS — operate on already-fetched records
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the lifecycle view for a single recovery item from its
 * appearance history.
 *
 * Pre-condition: `appearances` must all share the same
 * (item_kind, item_id) and be ordered chronologically. Caller is
 * responsible for filtering and sorting. The `buildItemLifecycles`
 * helper below does both in one pass when working from a full
 * history dataset.
 */
export function buildItemLifecycle(
  appearances: ReadonlyArray<RecoveryPathHistoryEntry>,
): ItemLifecycle | null {
  if (appearances.length === 0) return null;

  const first = appearances[0];
  const last = appearances[appearances.length - 1];

  let wasEverSatisfied = false;
  let hasRegressed = false;
  for (const a of appearances) {
    if (a.status === "satisfied") wasEverSatisfied = true;
    if (a.status === "regressed") hasRegressed = true;
  }

  return {
    item_kind: first.item_kind,
    item_id: first.item_id,
    item_label: last.item_label ?? first.item_label,
    addresses_target_id: last.addresses_target_id ?? first.addresses_target_id,
    first_appeared_at: first.evaluated_at,
    first_appeared_snapshot_id: first.snapshot_id,
    last_seen_at: last.evaluated_at,
    last_seen_snapshot_id: last.snapshot_id,
    current_status: last.status,
    was_ever_satisfied: wasEverSatisfied,
    has_regressed: hasRegressed,
    appearance_count: appearances.length,
    appearances,
  };
}

/**
 * Build ItemLifecycle records for every distinct item in a flat
 * history dataset. Groups by (item_kind, item_id), sorts each group
 * chronologically, and constructs the aggregate.
 *
 * Pure function. Same input → same output.
 *
 * Returns an array sorted by (item_kind, item_id) for deterministic
 * output ordering.
 */
export function buildItemLifecycles(
  history: ReadonlyArray<RecoveryPathHistoryEntry>,
): ReadonlyArray<ItemLifecycle> {
  // Group by (item_kind, item_id)
  const groups = new Map<string, RecoveryPathHistoryEntry[]>();
  for (const entry of history) {
    const key = `${entry.item_kind}::${entry.item_id}`;
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }
    group.push(entry);
  }

  // Build lifecycles
  const lifecycles: ItemLifecycle[] = [];
  for (const [, group] of groups) {
    // Sort chronologically (evaluated_at, then snapshot_id as tiebreaker)
    group.sort((a, b) => {
      if (a.evaluated_at !== b.evaluated_at)
        return a.evaluated_at < b.evaluated_at ? -1 : 1;
      return a.snapshot_id < b.snapshot_id ? -1 : a.snapshot_id > b.snapshot_id ? 1 : 0;
    });
    const lifecycle = buildItemLifecycle(group);
    if (lifecycle) lifecycles.push(lifecycle);
  }

  // Sort output by (item_kind, item_id) for deterministic ordering
  lifecycles.sort((a, b) => {
    if (a.item_kind !== b.item_kind) return a.item_kind < b.item_kind ? -1 : 1;
    return a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : 0;
  });

  return lifecycles;
}

/**
 * Compute recovery progress between two history datasets (one per
 * snapshot).
 *
 * `fromHistory` should be the recovery items recorded for the earlier
 * snapshot; `toHistory` for the later. Both are arrays of entries (as
 * fetched via repository.getRecoveryPathHistory).
 *
 * Status semantics:
 *   - satisfied: item in `from` (with any non-satisfied status), not
 *     in `to`. Or: item in `to` explicitly marked status="satisfied".
 *   - persisted: same item_id in both.
 *   - new: item in `to`, no match in `from` (by id OR target).
 *   - regressed: item in `to` with status="regressed" — was satisfied
 *     at `from`, now appears again.
 *   - evolved: item in `to` with different item_id but same
 *     addresses_target_id as a `from` item.
 *
 * This is the same logic the snapshot-builder uses internally for
 * status computation, exposed here as a cross-snapshot query.
 */
export function computeRecoveryProgress(
  deal_id: string,
  fromSnapshot: { snapshot_id: string; evaluated_at: string },
  fromHistory: ReadonlyArray<RecoveryPathHistoryEntry>,
  toSnapshot: { snapshot_id: string; evaluated_at: string },
  toHistory: ReadonlyArray<RecoveryPathHistoryEntry>,
): RecoveryProgress {
  // Index `from` entries by (kind, id) and by (kind, target)
  const fromById = new Map<string, RecoveryPathHistoryEntry>();
  const fromByTarget = new Map<string, RecoveryPathHistoryEntry>();
  const itemKeyOf = (kind: RecoveryItemKind, id: string) => `${kind}::${id}`;
  const targetKeyOf = (kind: RecoveryItemKind, target: string) =>
    `${kind}::${target}`;

  for (const entry of fromHistory) {
    fromById.set(itemKeyOf(entry.item_kind, entry.item_id), entry);
    if (entry.addresses_target_id !== null) {
      fromByTarget.set(
        targetKeyOf(entry.item_kind, entry.addresses_target_id),
        entry,
      );
    }
  }

  // Index `to` entries by (kind, id) and by (kind, target)
  const toById = new Map<string, RecoveryPathHistoryEntry>();
  const toByTarget = new Map<string, RecoveryPathHistoryEntry>();
  for (const entry of toHistory) {
    toById.set(itemKeyOf(entry.item_kind, entry.item_id), entry);
    if (entry.addresses_target_id !== null) {
      toByTarget.set(
        targetKeyOf(entry.item_kind, entry.addresses_target_id),
        entry,
      );
    }
  }

  const satisfied_items: RecoveryProgress["satisfied_items"][number][] = [];
  const new_items: RecoveryProgress["new_items"][number][] = [];
  const regressed_items: RecoveryProgress["regressed_items"][number][] = [];
  const evolved_items: RecoveryProgress["evolved_items"][number][] = [];

  let persisted_count = 0;

  // Walk `to` entries to classify them
  const evolvedTargetsSeen = new Set<string>();
  for (const toEntry of toHistory) {
    const key = itemKeyOf(toEntry.item_kind, toEntry.item_id);
    const directFromMatch = fromById.get(key);

    if (toEntry.status === "regressed") {
      regressed_items.push({
        item_kind: toEntry.item_kind,
        item_id: toEntry.item_id,
        item_label: toEntry.item_label,
      });
    } else if (toEntry.status === "satisfied") {
      // explicit satisfied row
      satisfied_items.push({
        item_kind: toEntry.item_kind,
        item_id: toEntry.item_id,
        item_label: toEntry.item_label,
      });
    } else if (toEntry.status === "persisted") {
      persisted_count += 1;
    } else if (toEntry.status === "evolved") {
      // Find the from-side item with the same target
      if (toEntry.addresses_target_id !== null) {
        const targetKey = targetKeyOf(
          toEntry.item_kind,
          toEntry.addresses_target_id,
        );
        const fromTargetMatch = fromByTarget.get(targetKey);
        if (fromTargetMatch) {
          evolved_items.push({
            item_kind: toEntry.item_kind,
            from_item_id: fromTargetMatch.item_id,
            to_item_id: toEntry.item_id,
            addresses_target_id: toEntry.addresses_target_id,
          });
          evolvedTargetsSeen.add(targetKey);
        }
      }
    } else if (toEntry.status === "open") {
      // Check whether it's truly new (no target match in `from`)
      const targetKey =
        toEntry.addresses_target_id !== null
          ? targetKeyOf(toEntry.item_kind, toEntry.addresses_target_id)
          : null;
      if (targetKey === null || !fromByTarget.has(targetKey)) {
        new_items.push({
          item_kind: toEntry.item_kind,
          item_id: toEntry.item_id,
          item_label: toEntry.item_label,
        });
      }
    }
    void directFromMatch;
  }

  return {
    deal_id,
    from_snapshot_id: fromSnapshot.snapshot_id,
    to_snapshot_id: toSnapshot.snapshot_id,
    from_evaluated_at: fromSnapshot.evaluated_at,
    to_evaluated_at: toSnapshot.evaluated_at,
    satisfied_count: satisfied_items.length,
    satisfied_items,
    persisted_count,
    new_count: new_items.length,
    new_items,
    regressed_count: regressed_items.length,
    regressed_items,
    evolved_count: evolved_items.length,
    evolved_items,
  };
}

/**
 * Filter a lifecycle array to only currently-open items.
 *
 * "Currently open" means status at last appearance is one of:
 *   open, persisted, regressed, evolved
 *
 * Excludes items whose last appearance was "satisfied" (resolved).
 */
export function filterOpenLifecycles(
  lifecycles: ReadonlyArray<ItemLifecycle>,
): ReadonlyArray<ItemLifecycle> {
  return lifecycles.filter(
    (l) =>
      l.current_status === "open" ||
      l.current_status === "persisted" ||
      l.current_status === "regressed" ||
      l.current_status === "evolved",
  );
}

/**
 * Filter a lifecycle array to items that have ever regressed.
 *
 * Regression — going from satisfied back to unsatisfied — is the most
 * important risk signal in recovery tracking. A regression indicates
 * that diligence work was undone, the data quality slipped, or new
 * concerns surfaced under the same target.
 */
export function filterRegressedLifecycles(
  lifecycles: ReadonlyArray<ItemLifecycle>,
): ReadonlyArray<ItemLifecycle> {
  return lifecycles.filter((l) => l.has_regressed);
}

/**
 * Sort lifecycles by age (oldest first_appeared_at first).
 *
 * Useful for "stalest open items" dashboards — the items that have
 * been around the longest without resolution.
 */
export function sortLifecyclesByAge(
  lifecycles: ReadonlyArray<ItemLifecycle>,
): ReadonlyArray<ItemLifecycle> {
  return lifecycles
    .slice()
    .sort((a, b) => {
      if (a.first_appeared_at !== b.first_appeared_at)
        return a.first_appeared_at < b.first_appeared_at ? -1 : 1;
      return a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : 0;
    });
}

/**
 * Filter lifecycles by item kind.
 *
 * Common queries:
 *   - "all open recovery_priorities" → filter by "recovery_priority"
 *   - "all comfort conditions" → filter by "comfort_condition"
 */
export function filterLifecyclesByKind(
  lifecycles: ReadonlyArray<ItemLifecycle>,
  kind: RecoveryItemKind,
): ReadonlyArray<ItemLifecycle> {
  return lifecycles.filter((l) => l.item_kind === kind);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY-AWARE CONVENIENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the full recovery lifecycle for a deal by walking all
 * snapshots in the deal's chain and aggregating their recovery
 * histories.
 *
 * Process:
 *   1. Fetch all snapshots for the deal (chronological)
 *   2. For each snapshot, fetch its recovery_path_history rows
 *   3. Combine and build per-item lifecycles
 *
 * Returns a sorted array of ItemLifecycle records. Items present at
 * any snapshot in the chain are represented.
 *
 * Performance: N+1 query pattern (one snapshot fetch + N recovery
 * fetches). For deals with many snapshots, consider batching the
 * recovery fetches via a dedicated repository method (not currently
 * exposed; can be added if needed).
 */
export async function fetchDealRecoveryLifecycle(
  repository: SnapshotRepository,
  deal_id: string,
): Promise<PersistenceResult<ReadonlyArray<ItemLifecycle>>> {
  const chainResult = await repository.getSnapshotChainForDeal(deal_id);
  if (!chainResult.ok) return chainResult;

  const allHistory: RecoveryPathHistoryEntry[] = [];
  for (const snapshot of chainResult.value) {
    const historyResult = await repository.getRecoveryPathHistory(
      snapshot.snapshot_id,
    );
    if (!historyResult.ok) return historyResult;
    allHistory.push(...historyResult.value);
  }

  return { ok: true, value: buildItemLifecycles(allHistory) };
}

/**
 * Fetch the latest snapshot's recovery items for a deal, organized
 * as currently-open lifecycles.
 *
 * "Currently open" = present in the latest snapshot with non-
 * satisfied status. For a dashboard view of "what's outstanding right
 * now."
 */
export async function fetchOpenItemsForDeal(
  repository: SnapshotRepository,
  deal_id: string,
): Promise<PersistenceResult<ReadonlyArray<ItemLifecycle>>> {
  const lifecyclesResult = await fetchDealRecoveryLifecycle(repository, deal_id);
  if (!lifecyclesResult.ok) return lifecyclesResult;
  return { ok: true, value: filterOpenLifecycles(lifecyclesResult.value) };
}

/**
 * Compute recovery progress between two specific snapshots.
 *
 * Convenience wrapper combining two repository fetches with
 * computeRecoveryProgress. Most common dashboard query.
 */
export async function fetchRecoveryProgress(
  repository: SnapshotRepository,
  deal_id: string,
  from_snapshot_id: string,
  to_snapshot_id: string,
): Promise<PersistenceResult<RecoveryProgress>> {
  const [fromSnap, toSnap, fromHist, toHist] = await Promise.all([
    repository.getSnapshotById(from_snapshot_id),
    repository.getSnapshotById(to_snapshot_id),
    repository.getRecoveryPathHistory(from_snapshot_id),
    repository.getRecoveryPathHistory(to_snapshot_id),
  ]);

  if (!fromSnap.ok) return fromSnap;
  if (!toSnap.ok) return toSnap;
  if (!fromHist.ok) return fromHist;
  if (!toHist.ok) return toHist;

  return {
    ok: true,
    value: computeRecoveryProgress(
      deal_id,
      {
        snapshot_id: fromSnap.value.snapshot_id,
        evaluated_at: fromSnap.value.created_at,
      },
      fromHist.value,
      {
        snapshot_id: toSnap.value.snapshot_id,
        evaluated_at: toSnap.value.created_at,
      },
      toHist.value,
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute summary statistics for a set of lifecycles. Useful for
 * "deal health" headline numbers.
 */
export interface RecoveryLifecycleStats {
  readonly total_items: number;
  readonly by_kind: Record<RecoveryItemKind, number>;
  readonly by_current_status: Record<RecoveryStatus, number>;
  readonly currently_open: number;
  readonly currently_satisfied: number;
  readonly ever_regressed: number;
  readonly never_satisfied: number;
}

export function computeRecoveryLifecycleStats(
  lifecycles: ReadonlyArray<ItemLifecycle>,
): RecoveryLifecycleStats {
  const by_kind: Record<RecoveryItemKind, number> = {
    recovery_priority: 0,
    comfort_condition: 0,
    repairable_discomfort: 0,
    information_need: 0,
    structural_concern: 0,
  };
  const by_current_status: Record<RecoveryStatus, number> = {
    open: 0,
    persisted: 0,
    satisfied: 0,
    regressed: 0,
    evolved: 0,
  };
  let everRegressed = 0;
  let neverSatisfied = 0;
  let currentlyOpen = 0;
  let currentlySatisfied = 0;

  for (const l of lifecycles) {
    by_kind[l.item_kind] += 1;
    by_current_status[l.current_status] += 1;
    if (l.has_regressed) everRegressed += 1;
    if (!l.was_ever_satisfied) neverSatisfied += 1;
    if (l.current_status === "satisfied") {
      currentlySatisfied += 1;
    } else {
      currentlyOpen += 1;
    }
  }

  return {
    total_items: lifecycles.length,
    by_kind,
    by_current_status,
    currently_open: currentlyOpen,
    currently_satisfied: currentlySatisfied,
    ever_regressed: everRegressed,
    never_satisfied: neverSatisfied,
  };
}
