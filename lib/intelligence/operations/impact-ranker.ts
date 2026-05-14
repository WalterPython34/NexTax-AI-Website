// lib/intelligence/operations/impact-ranker.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Impact Ranker
//
// Multi-factor categorical classification of unresolved recovery items.
//
// Each unresolved item carries structured ImpactDimensions:
//   - affects_binding_constraint (boolean)
//   - affects_closest_path (boolean)
//   - affected_personality_count (count)
//   - blocks_comfort_condition_count (count)
//   - is_on_critical_fragility_node (boolean)
//   - days_open (duration)
//
// Classification is a CATEGORICAL REDUCTION applied to these
// dimensions — never a blended numeric score. The buyer sees:
//   "this item is critical BECAUSE it affects the binding constraint
//    AND 4 personalities" — not "this item scored 0.73."
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #1 (Threshold Manifest) — critical_personality_breadth
//   and high_personality_breadth come from the supplied manifest.
//
//   Invariant #3 (Observation Provenance) — every ranked item and
//   workflow group carries provenance.
//
//   Invariant #4 (No Aggregate Scores) — classification produced by
//   explicit rule over named dimensions; no weighted sums, no
//   numeric "impact score" output.
//
//   Invariant #5 Check 5 (No Nondeterminism) — Date.now() permitted
//   only in provenance construction.
//
// What this module does NOT do:
//
//   - Generate "next action" or "recommendation" prose
//   - Predict resolution probability or time
//   - Compute autonomous workflow plans
//   - Rank items by a numeric weighted sum
//
// What this module DOES:
//
//   - Classify each item via explicit rule
//   - Sort items deterministically (classification → days_open → id)
//   - Group items that share resolution roots (target / personality /
//     fragility node) — the clustering view
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EvaluationSnapshot,
  EvaluationStateSummary,
  RecoveryPathHistoryEntry,
} from "../persistence/types";
import type {
  ImpactClassification,
  ImpactDimensions,
  ImpactRankingReport,
  ObservationProvenance,
  RankedRecoveryItem,
  RecoveryWorkflowGroup,
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

export interface RankImpactInput {
  readonly deal_id: string;
  /** The current snapshot the ranking is computed against. */
  readonly snapshot: EvaluationSnapshot;
  /**
   * State summary for the snapshot — needed for binding_constraint
   * axis, closest_path personality, comfort condition counts, and
   * critical fragility hotspot identification.
   */
  readonly state_summary: EvaluationStateSummary;
  /**
   * Recovery history rows for the deal. Module filters internally
   * to currently-unresolved items (status != satisfied at most
   * recent appearance).
   */
  readonly history: ReadonlyArray<RecoveryPathHistoryEntry>;
  readonly thresholds: ThresholdManifest;
  /**
   * Reference timestamp for computing days_open. Defaults to the
   * snapshot's evaluated_at (the most architecturally honest
   * reference: ranking computed AT this snapshot, not at "now").
   */
  readonly reference_at?: string;
  readonly computed_at?: string;
}

/**
 * Rank unresolved recovery items by their structured impact dimensions
 * and group related items together.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * Returns an ImpactRankingReport with:
 *   - ranked_items: each unresolved item with classification + dimensions
 *   - workflow_groups: items clustered by shared resolution root
 *   - per-classification counts for dashboard summary
 */
export function rankImpact(input: RankImpactInput): ImpactRankingReport {
  const {
    deal_id,
    snapshot,
    state_summary,
    history,
    thresholds,
    computed_at,
  } = input;

  const reference_at = input.reference_at ?? snapshot.created_at;
  const provenance = buildProvenance(snapshot, thresholds, computed_at);

  // Pull the unresolved items (last status != satisfied)
  const unresolvedLifecycles = collectUnresolvedLifecycles(history);

  // Pre-compute dimension prerequisites from state_summary + history
  const ctx = buildClassificationContext(state_summary, history);

  // Compute dimensions + classification for each item
  const rankedItems: RankedRecoveryItem[] = unresolvedLifecycles.map(
    (lifecycle, _idx) => {
      const dimensions = computeImpactDimensions(
        lifecycle,
        ctx,
        reference_at,
      );
      const classification = classifyImpact(dimensions, thresholds);
      return {
        item_kind: lifecycle.item_kind,
        item_id: lifecycle.item_id,
        item_label: lifecycle.item_label,
        rank: 0, // placeholder; assigned after sort
        impact_classification: classification,
        impact_dimensions: dimensions,
        trace_to_artifacts: buildTraceForItem(lifecycle),
        provenance,
      };
    },
  );

  // Sort by classification → days_open desc → item_id for deterministic order
  rankedItems.sort(rankedItemOrder);

  // Assign rank numbers (1-indexed positional values, NOT scores)
  const finalRanked: RankedRecoveryItem[] = rankedItems.map((item, i) => ({
    ...item,
    rank: i + 1,
  }));

  // Build workflow groups
  const workflowGroups = buildWorkflowGroups(finalRanked, provenance);

  const counts = countByClassification(finalRanked);

  return {
    deal_id,
    snapshot_id: snapshot.snapshot_id,
    critical_count: counts.critical,
    high_count: counts.high,
    moderate_count: counts.moderate,
    low_count: counts.low,
    ranked_items: finalRanked,
    workflow_groups: workflowGroups,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION RULE
//
// Categorical reduction over impact dimensions. Documented as an
// explicit decision tree. No multiplication, no weighted sums.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify an item's impact via explicit rule.
 *
 * Rule (priority order — first match wins):
 *
 *   critical:
 *     affects_binding_constraint AND
 *     affected_personality_count >= critical_personality_breadth
 *
 *   high:
 *     affects_binding_constraint OR
 *     is_on_critical_fragility_node OR
 *     affects_closest_path
 *
 *   moderate:
 *     affected_personality_count >= high_personality_breadth OR
 *     blocks_comfort_condition_count > 0
 *
 *   low:
 *     (default)
 *
 * The rule is auditable: every "critical" classification can be
 * explained by pointing at its dimensions. No hidden weights, no
 * opaque numeric thresholds beyond the manifest's named values.
 */
export function classifyImpact(
  dims: ImpactDimensions,
  thresholds: ThresholdManifest,
): ImpactClassification {
  if (
    dims.affects_binding_constraint &&
    dims.affected_personality_count >= thresholds.critical_personality_breadth
  ) {
    return "critical";
  }
  if (
    dims.affects_binding_constraint ||
    dims.is_on_critical_fragility_node ||
    dims.affects_closest_path
  ) {
    return "high";
  }
  if (
    dims.affected_personality_count >= thresholds.high_personality_breadth ||
    dims.blocks_comfort_condition_count > 0
  ) {
    return "moderate";
  }
  return "low";
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE COLLECTION
// ─────────────────────────────────────────────────────────────────────────────

interface UnresolvedLifecycle {
  readonly item_kind: RecoveryPathHistoryEntry["item_kind"];
  readonly item_id: string;
  readonly item_label: string | null;
  readonly addresses_target_id: string | null;
  readonly first_appeared_at: string;
  readonly last_seen_at: string;
  readonly entries: ReadonlyArray<RecoveryPathHistoryEntry>;
  /** Most recent entry — carries the current relationships */
  readonly lastEntry: RecoveryPathHistoryEntry;
}

/**
 * Group history entries by (item_kind, item_id), then return only the
 * lifecycles whose most recent entry has a non-satisfied status.
 */
function collectUnresolvedLifecycles(
  history: ReadonlyArray<RecoveryPathHistoryEntry>,
): ReadonlyArray<UnresolvedLifecycle> {
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

  const lifecycles: UnresolvedLifecycle[] = [];
  for (const [, entries] of groupMap) {
    const sorted = entries.slice().sort((a, b) => {
      if (a.evaluated_at !== b.evaluated_at) {
        return a.evaluated_at < b.evaluated_at ? -1 : 1;
      }
      if (a.snapshot_id < b.snapshot_id) return -1;
      if (a.snapshot_id > b.snapshot_id) return 1;
      return 0;
    });
    const lastEntry = sorted[sorted.length - 1];
    if (lastEntry.status === "satisfied") continue; // skip resolved

    const firstEntry = sorted[0];
    lifecycles.push({
      item_kind: lastEntry.item_kind,
      item_id: lastEntry.item_id,
      item_label: lastEntry.item_label ?? firstEntry.item_label,
      addresses_target_id:
        lastEntry.addresses_target_id ?? firstEntry.addresses_target_id,
      first_appeared_at: firstEntry.evaluated_at,
      last_seen_at: lastEntry.evaluated_at,
      entries: sorted,
      lastEntry,
    });
  }

  // Deterministic outer ordering
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
// DIMENSION COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

interface ClassificationContext {
  readonly binding_constraint_axis: string | null;
  readonly closest_path_personality: string | null;
  /** Set of item_ids that are at critical fragility nodes per state_summary */
  readonly critical_fragility_hotspots: ReadonlySet<string>;
  /** For each comfort condition target, count of how many comfort conditions reference it */
  readonly comfort_condition_blocks_by_target: ReadonlyMap<string, number>;
  /** Snapshot's dominant_constraint axis name (binding constraint) */
  readonly highest_fragility_axis: string | null;
}

/**
 * Pre-compute the prerequisites for impact dimension calculation from
 * the snapshot's state_summary and the recovery history itself.
 *
 * Architectural note: CP-9 stores cross-references ON each
 * RecoveryPathHistoryEntry via `related_personality_ids` and
 * `related_axis_keys`. The state_summary carries scalar axis-level
 * fields (dominant_constraint_axis, closest_recoverable_profile, etc.)
 * Personality-breadth and axis-relationship dimensions come from the
 * per-item relationships, not from state_summary lookups.
 *
 * For each piece of data we read from state_summary, this function
 * handles the case where the field is absent (e.g., null when the
 * snapshot has no binding constraint or no closest path) by
 * defaulting to null/empty. The classification still works; items
 * just get a lower classification by default when context is missing.
 */
function buildClassificationContext(
  state_summary: EvaluationStateSummary,
  history: ReadonlyArray<RecoveryPathHistoryEntry>,
): ClassificationContext {
  // Binding constraint axis — CP-9 names this `dominant_constraint_axis`
  // in state_summary (the architecturally-equivalent surface)
  const binding_constraint_axis = state_summary.dominant_constraint_axis ?? null;

  // Closest path personality
  const closest_path_personality =
    state_summary.closest_recoverable_profile ?? null;

  // Highest fragility axis (drives critical hotspot membership)
  const highest_fragility_axis = state_summary.highest_fragility_axis ?? null;

  // Critical fragility hotspots: items whose addresses_target_id or
  // item_id references the highest-fragility axis directly. This is
  // a deterministic rule rather than an opaque "hotspot" list — we
  // identify hotspots by their axis affinity.
  const hotspotSet = new Set<string>();
  if (highest_fragility_axis !== null) {
    const axisStem = stemForAxis(highest_fragility_axis);
    for (const entry of history) {
      if (
        (entry.addresses_target_id !== null &&
          axisStem !== null &&
          entry.addresses_target_id.includes(axisStem)) ||
        (axisStem !== null && entry.item_id.includes(axisStem))
      ) {
        hotspotSet.add(entry.item_id);
      }
    }
  }

  // Comfort condition blocks-by-target: how many comfort conditions
  // reference each addresses_target. Recovery priorities that address
  // the same target as a comfort condition can "block" it. Comfort
  // conditions themselves don't carry addresses_target_id reliably
  // (we saw `null` on the inspection), so we derive blocking from
  // related_axis_keys on the comfort condition + the addresses_target
  // on the priority.
  const ccBlocksByTarget = new Map<string, number>();
  for (const entry of history) {
    if (entry.item_kind !== "comfort_condition") continue;
    if (entry.status === "satisfied") continue;
    // For each related axis, count this comfort condition as blocking
    // items addressing that axis
    const relatedAxes = entry.related_axis_keys ?? [];
    for (const axis of relatedAxes) {
      const stem = stemForAxis(axis);
      if (stem !== null) {
        ccBlocksByTarget.set(stem, (ccBlocksByTarget.get(stem) ?? 0) + 1);
      }
    }
  }

  return {
    binding_constraint_axis,
    closest_path_personality,
    critical_fragility_hotspots: hotspotSet,
    comfort_condition_blocks_by_target: ccBlocksByTarget,
    highest_fragility_axis,
  };
}

/**
 * Convert an axis key (e.g., "durability_score") to a stem used for
 * matching against addresses_target_id values (e.g., "durability").
 * Returns null if no recognized stem applies.
 */
function stemForAxis(axis: string): string | null {
  if (axis.includes("durability")) return "durability";
  if (axis.includes("financial")) return "financial";
  if (axis.includes("evidence_quality") || axis.includes("evidence"))
    return "evidence";
  if (axis.includes("fragility") || axis.includes("assumption"))
    return "fragility";
  if (axis.includes("scenario") || axis.includes("uncertainty"))
    return "scenario";
  return null;
}

/**
 * Compute the impact dimensions for one unresolved item.
 *
 * Each dimension reads from either:
 *   - the item's own properties (item_kind, addresses_target_id,
 *     related_personality_ids, related_axis_keys on the CP-9 row)
 *   - the snapshot's state_summary (binding constraint axis,
 *     closest path personality)
 *   - duration math (days_open)
 *
 * All dimensions are boolean OR positive integer count OR non-negative
 * integer count. No blended values.
 */
function computeImpactDimensions(
  lifecycle: UnresolvedLifecycle,
  ctx: ClassificationContext,
  reference_at: string,
): ImpactDimensions {
  // affects_binding_constraint: item's related_axis_keys includes the
  // binding constraint axis, OR addresses_target_id references it,
  // OR item_id contains the axis stem
  let affects_binding_constraint = false;
  if (ctx.binding_constraint_axis !== null) {
    const axisStem = stemForAxis(ctx.binding_constraint_axis);
    // Check related_axis_keys (the canonical CP-9 reference)
    const relatedAxes = lifecycle.lastEntry.related_axis_keys ?? [];
    for (const axis of relatedAxes) {
      if (axis === ctx.binding_constraint_axis) {
        affects_binding_constraint = true;
        break;
      }
    }
    // Check addresses_target_id stem match
    if (
      !affects_binding_constraint &&
      axisStem !== null &&
      lifecycle.addresses_target_id !== null &&
      lifecycle.addresses_target_id.includes(axisStem)
    ) {
      affects_binding_constraint = true;
    }
    // Fallback: item_id stem match
    if (
      !affects_binding_constraint &&
      axisStem !== null &&
      lifecycle.item_id.includes(axisStem)
    ) {
      affects_binding_constraint = true;
    }
  }

  // affects_closest_path: item's related_personality_ids includes
  // the closest path personality
  let affects_closest_path = false;
  if (ctx.closest_path_personality !== null) {
    const relatedPersonalities =
      lifecycle.lastEntry.related_personality_ids ?? [];
    for (const p of relatedPersonalities) {
      if (p === ctx.closest_path_personality) {
        affects_closest_path = true;
        break;
      }
    }
    // Also check item_id prefix and addresses_target_id
    if (!affects_closest_path) {
      if (
        lifecycle.item_id.startsWith(ctx.closest_path_personality + ".") ||
        lifecycle.item_id.startsWith(ctx.closest_path_personality + "_") ||
        (lifecycle.addresses_target_id !== null &&
          lifecycle.addresses_target_id.includes(ctx.closest_path_personality))
      ) {
        affects_closest_path = true;
      }
    }
  }

  // affected_personality_count: distinct personalities in
  // related_personality_ids
  const personalities = new Set<string>();
  const relatedPersonalities =
    lifecycle.lastEntry.related_personality_ids ?? [];
  for (const p of relatedPersonalities) {
    if (typeof p === "string") personalities.add(p);
  }
  const affected_personality_count = personalities.size;

  // blocks_comfort_condition_count: for recovery_priority items,
  // count the comfort conditions blocked by the target this priority
  // addresses
  let blocks_comfort_condition_count = 0;
  if (
    lifecycle.item_kind === "recovery_priority" &&
    lifecycle.addresses_target_id !== null
  ) {
    // The target string is like "durability.customer_documentation"
    // — strip to the axis stem (first segment before the dot)
    const dotIdx = lifecycle.addresses_target_id.indexOf(".");
    const targetStem =
      dotIdx > 0
        ? lifecycle.addresses_target_id.substring(0, dotIdx)
        : lifecycle.addresses_target_id;
    blocks_comfort_condition_count =
      ctx.comfort_condition_blocks_by_target.get(targetStem) ?? 0;
  }

  // is_on_critical_fragility_node: item is in the hotspots set
  // (which was built from the highest_fragility_axis stem matching)
  const is_on_critical_fragility_node = ctx.critical_fragility_hotspots.has(
    lifecycle.item_id,
  );

  // days_open
  const days_open = daysBetween(lifecycle.first_appeared_at, reference_at);

  return {
    affects_binding_constraint,
    affects_closest_path,
    affected_personality_count,
    blocks_comfort_condition_count,
    is_on_critical_fragility_node,
    days_open,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW GROUPING
//
// Items clustered by shared resolution root. Three group_kinds:
//
//   shared_target — items whose addresses_target_id is the same.
//     Resolving the target unblocks all members.
//
//   shared_personality — items whose personality_breadth references
//     the same personality_id. Provides the "all items affecting
//     bank_x" view.
//
//   shared_fragility_node — items at the same fragility hotspot.
// ─────────────────────────────────────────────────────────────────────────────

function buildWorkflowGroups(
  rankedItems: ReadonlyArray<RankedRecoveryItem>,
  provenance: ObservationProvenance,
): ReadonlyArray<RecoveryWorkflowGroup> {
  // Index items by shared keys
  const byTarget = new Map<string, RankedRecoveryItem[]>();
  // Note: shared_personality + shared_fragility_node require state_summary
  // metadata that we've already used inside the dimensions. For grouping
  // we use addresses_target_id (the most reliable cross-item reference)
  // and is_on_critical_fragility_node (already on the dimensions).

  for (const item of rankedItems) {
    // shared_target: group by addresses_target_id when present
    // (We need to surface this via the trace artifacts since the
    // RankedRecoveryItem doesn't carry addresses_target_id directly —
    // it's in the lifecycle. Use trace_to_artifacts for the target
    // reference if it was recorded as such.)
    // For now, group by item_id prefix that matches axis name patterns —
    // items whose IDs share the same axis stem represent the same
    // structural target.
    const targetKey = extractAxisStem(item.item_id);
    if (targetKey !== null) {
      let group = byTarget.get(targetKey);
      if (!group) {
        group = [];
        byTarget.set(targetKey, group);
      }
      group.push(item);
    }
  }

  const groups: RecoveryWorkflowGroup[] = [];
  for (const [targetKey, items] of byTarget) {
    if (items.length < 2) continue; // only groups of 2+ are meaningful
    groups.push({
      group_kind: "shared_target",
      group_key: targetKey,
      items,
      aggregate_impact_classification: maxClassification(
        items.map((i) => i.impact_classification),
      ),
      provenance,
    });
  }

  // Fragility node grouping
  const byHotspot: RankedRecoveryItem[] = [];
  for (const item of rankedItems) {
    if (item.impact_dimensions.is_on_critical_fragility_node) {
      byHotspot.push(item);
    }
  }
  if (byHotspot.length >= 2) {
    groups.push({
      group_kind: "shared_fragility_node",
      group_key: "critical_fragility_hotspot",
      items: byHotspot,
      aggregate_impact_classification: maxClassification(
        byHotspot.map((i) => i.impact_classification),
      ),
      provenance,
    });
  }

  // Sort groups by aggregate classification then group_key
  groups.sort((a, b) => {
    const ca =
      CLASSIFICATION_RANK[a.aggregate_impact_classification] -
      CLASSIFICATION_RANK[b.aggregate_impact_classification];
    if (ca !== 0) return ca;
    if (a.group_kind !== b.group_kind)
      return a.group_kind < b.group_kind ? -1 : 1;
    if (a.group_key < b.group_key) return -1;
    if (a.group_key > b.group_key) return 1;
    return 0;
  });

  return groups;
}

/**
 * Extract a stable axis stem from an item_id for shared_target
 * clustering. The CP-9 item_id convention places the axis name in
 * a consistent position separated by dots; we extract the first
 * substring that matches a known axis or comfort dimension name.
 *
 * Returns null if no stem can be extracted (the item is not
 * groupable).
 */
const KNOWN_AXIS_STEMS: ReadonlyArray<string> = [
  "financial_score",
  "durability_score",
  "evidence_quality",
  "assumption_fragility",
  "scenario_uncertainty",
  "customer_concentration",
  "customer_documentation",
  "customer_transferability",
  "through_cycle_viability",
  "lender_stress_failure",
  "compression",
  "hotspot_concentration",
  "durable_cash_flow",
  "working_capital_stability",
  "transition_execution",
];

function extractAxisStem(itemId: string): string | null {
  for (const stem of KNOWN_AXIS_STEMS) {
    if (itemId.includes(stem)) return stem;
  }
  return null;
}

const CLASSIFICATION_RANK: Record<ImpactClassification, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
};

function maxClassification(
  classifications: ReadonlyArray<ImpactClassification>,
): ImpactClassification {
  let best: ImpactClassification = "low";
  for (const c of classifications) {
    if (CLASSIFICATION_RANK[c] < CLASSIFICATION_RANK[best]) best = c;
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function daysBetween(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  const diff = toMs - fromMs;
  if (diff <= 0) return 0;
  return Math.floor(diff / 86_400_000);
}

function buildTraceForItem(
  lifecycle: UnresolvedLifecycle,
): ReadonlyArray<{ artifact_type: string; artifact_id: string }> {
  const traces: { artifact_type: string; artifact_id: string }[] = [
    {
      artifact_type: lifecycle.item_kind,
      artifact_id: lifecycle.item_id,
    },
  ];
  if (lifecycle.addresses_target_id !== null) {
    traces.push({
      artifact_type: "addresses_target",
      artifact_id: lifecycle.addresses_target_id,
    });
  }
  return traces;
}

interface ClassificationCounts {
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

function countByClassification(
  items: ReadonlyArray<RankedRecoveryItem>,
): ClassificationCounts {
  const counts: ClassificationCounts = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };
  for (const item of items) {
    counts[item.impact_classification] += 1;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ORDERING
// ─────────────────────────────────────────────────────────────────────────────

function rankedItemOrder(a: RankedRecoveryItem, b: RankedRecoveryItem): number {
  const classDiff =
    CLASSIFICATION_RANK[a.impact_classification] -
    CLASSIFICATION_RANK[b.impact_classification];
  if (classDiff !== 0) return classDiff;
  // Within same classification: longer days_open first
  if (a.impact_dimensions.days_open !== b.impact_dimensions.days_open) {
    return b.impact_dimensions.days_open - a.impact_dimensions.days_open;
  }
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
  snapshot: EvaluationSnapshot,
  thresholds: ThresholdManifest,
  computed_at?: string,
): ObservationProvenance {
  return {
    computed_at: computed_at ?? new Date(Date.now()).toISOString(),
    operations_version: OPERATIONS_MODULE_VERSION,
    threshold_manifest_id: thresholds.manifest_id,
    derived_from_snapshot_ids: [snapshot.snapshot_id],
    derived_from_event_ids: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA + SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/impact-ranker",
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
        `CP-10 impact-ranker BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
