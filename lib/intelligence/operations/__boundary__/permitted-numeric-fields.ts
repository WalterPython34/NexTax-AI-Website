// lib/intelligence/operations/__boundary__/permitted-numeric-fields.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — Permitted Numeric Fields Allowlist
//
// Enforces Invariants #4 (No Aggregate Scores) and #1 (Threshold
// Manifests) by inverting the prohibition: instead of listing what's
// forbidden, this allowlist enumerates every numeric field a CP-10
// type is permitted to expose.
//
// Boundary tests verify that every numeric field in every exported
// CP-10 type has its name present in this allowlist. Numeric fields
// whose names are NOT present fail the boundary check.
//
// CONSTITUTIONAL CATEGORIES (the only acceptable numeric semantics):
//
//   1. Counts — integer count of distinct things of one kind.
//      Examples: critical_count, affected_personality_count
//
//   2. Durations — measured time elapsed.
//      Examples: days_open, snapshots_since_appearance
//
//   3. Threshold values — configuration carried on the threshold
//      manifest itself. These are stored configuration, not blended
//      output.
//
//   4. Indices and depths — positional values used for ordering or
//      tree traversal. Examples: rank, trace_depth
//
//   5. Schema versions — non-semantic integers identifying the schema
//      shape. Example: schema_version
//
// PROHIBITED categories (these will never appear here):
//
//   - Aggregate scores (overall_score, health_score, quality_index)
//   - Probability surfaces (likelihood, probability, confidence)
//   - Weighted blends across operational dimensions
//
// Adding entries requires governance review.
// Removing entries is always safe (it only tightens the constitution).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permitted numeric field names. Case-sensitive exact match.
 *
 * Categories are documented inline so adding a new entry forces
 * justification of which constitutional category it falls under.
 */
export const PERMITTED_NUMERIC_FIELDS: ReadonlySet<string> = new Set([
  // ── Category 1: Counts ──
  // Counts of items in a state or with a property.
  "critical_count",
  "high_count",
  "moderate_count",
  "low_count",
  "stalled_count",
  "chronic_count",
  "active_count",
  "satisfied_count",
  "regressed_count",
  "evolved_count",
  "open_count",
  "persisted_count",
  "new_count",
  "resolved_count",
  "emerging_count",
  "worsening_count",
  "improving_count",
  "intermittent_count",
  "persistent_stable_count",
  "decision_ready_count",
  "structurally_blocked_count",
  "evidence_insufficient_count",
  "all_paths_declined_count",
  "affected_personality_count",
  "blocks_comfort_condition_count",
  "blocking_structural_concern_count",
  "missing_evidence_count",
  "interested_personality_count",
  "cautious_personality_count",
  "declined_personality_count",
  "appearance_count",
  "snapshots_since_appearance",
  "observation_count",
  "material_change_count",
  "stalled_path_count",
  "watchlist_entry_count",
  "watchlist_firing_count",
  "not_yet_implemented_portfolio_count",
  "fragment_count",
  "artifact_count",
  "total_traces",
  "unique_fragments",
  "unique_artifacts",
  "max_trace_depth",

  // ── Category 2: Durations ──
  // Measured elapsed time. Always non-negative.
  "days_open",
  "days_since_first_seen",
  "days_since_last_seen",
  "days_since_last_satisfied",
  "days_since_last_evaluation",

  // ── Category 3: Threshold values (manifest configuration) ──
  // These appear ONLY on the ThresholdManifest type itself.
  "stalled_days_default",
  "stalled_snapshots_default",
  "chronic_snapshot_threshold",
  "chronic_days_threshold",
  "regression_window_days",
  "material_score_delta_threshold",
  "material_band_change_severity_significant",
  "material_band_change_severity_notable",
  "worsening_window_snapshots",
  "intermittent_oscillation_threshold",
  "critical_personality_breadth",
  "high_personality_breadth",
  "readiness_min_evidence_score",
  "readiness_min_interested_count",
  "readiness_max_structural_concern_count",

  // ── Category 4: Indices and depths ──
  "rank",
  "trace_depth",

  // ── Category 5: Schema versions ──
  // Non-semantic integers identifying a row shape.
  "schema_version",
]);

/**
 * Allowlist version. Stamped onto every CP-10 artifact via
 * operations_version metadata. Increments when this allowlist changes.
 */
export const PERMITTED_NUMERIC_FIELDS_VERSION =
  "cp10-permitted-numeric-v0.1.0";

/**
 * Test whether a field name is on the permitted numeric allowlist.
 */
export function isPermittedNumericField(fieldName: string): boolean {
  return PERMITTED_NUMERIC_FIELDS.has(fieldName);
}
