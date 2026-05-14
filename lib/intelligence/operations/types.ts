// lib/intelligence/operations/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Operational Types
//
// Every type in this file is constitutionally constrained. The
// boundary enforcement suite verifies at build time:
//
//   - Numeric fields: only names on PERMITTED_NUMERIC_FIELDS
//   - String fields: only names on PERMITTED_STRING_FIELDS
//   - No probability semantics
//   - No aggregate operational scores
//   - No prose fields
//   - No banned imports
//
// Every operational primitive carries an ObservationProvenance record.
// Without it, the primitive is invalid and cannot be produced or
// consumed by any CP-10 module.
//
// CONSTITUTIONAL INVARIANTS HONORED HERE:
//
//   #1 Threshold Manifest — every primitive's provenance references
//      threshold_manifest_id
//   #3 Observation Provenance — every primitive has the `provenance`
//      field
//   #4 No Aggregate Scores — no overall/health/quality/composite/
//      weighted numeric fields
//   #5 Boundary Enforcement — types validated at build time
//
// CONSTITUTIONAL CATEGORIES OF PERMITTED VALUES (only these):
//
//   - Identifiers (UUIDs, semantic keys)
//   - Enum-like classifications (short string unions)
//   - Timestamps (ISO 8601)
//   - Version strings
//   - Counts (integers, single-dimension)
//   - Durations (integers, measured time)
//   - Threshold values (configuration on the manifest)
//   - Booleans
//   - Pass-through fields from CP-9 (item_label, description, notes)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../types";
import type {
  PersonalityId,
} from "../personalities/types";
import type {
  RecoveryItemKind,
  RecoveryStatus,
} from "../persistence/types";

// ─────────────────────────────────────────────────────────────────────────────
// MODULE VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const OPERATIONS_MODULE_VERSION = "cp10-v0.1.0";
export const OPERATIONS_SCHEMA_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVATION PROVENANCE (Constitutional Invariant #3)
//
// Every CP-10 primitive carries provenance. Without it, the primitive
// cannot be replayed, verified, or audited.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provenance metadata stamped onto every CP-10 primitive.
 *
 * `computed_at` is the only permitted nondeterministic field. All other
 * provenance values are deterministic given the inputs.
 *
 * `derived_from_snapshot_ids` is ORDERED chronologically — the order
 * is part of the provenance, not just the set membership.
 */
export interface ObservationProvenance {
  readonly computed_at: string;                              // ISO 8601
  readonly operations_version: string;                       // "cp10-v0.1.0"
  readonly threshold_manifest_id: string;                    // FK reference
  readonly derived_from_snapshot_ids: ReadonlyArray<string>; // ordered
  readonly derived_from_event_ids: ReadonlyArray<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD MANIFEST (Constitutional Invariant #1)
//
// Immutable governance artifact. All CP-10 thresholds are stored on a
// manifest; primitives reference the manifest by id. Manifests are
// append-only — to change thresholds, create a new manifest.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration carried on a threshold manifest. Every numeric field
 * is a named threshold value that CP-10 modules consult instead of
 * hardcoding.
 *
 * Field names here all appear in PERMITTED_NUMERIC_FIELDS under the
 * "threshold values" category.
 */
export interface ThresholdManifest {
  readonly manifest_id: string;
  readonly version: string;
  readonly schema_version: number;
  readonly created_at: string;

  // ── Stalled path detection ──
  readonly stalled_days_default: number;
  readonly stalled_snapshots_default: number;

  // ── Chronic classification ──
  readonly chronic_snapshot_threshold: number;
  readonly chronic_days_threshold: number;

  // ── Regression detection ──
  readonly regression_window_days: number;

  // ── Material change classification ──
  readonly material_score_delta_threshold: number;
  readonly material_band_change_severity_significant: number;
  readonly material_band_change_severity_notable: number;

  // ── Structural trajectory ──
  readonly worsening_window_snapshots: number;
  readonly intermittent_oscillation_threshold: number;

  // ── Impact ranking ──
  readonly critical_personality_breadth: number;
  readonly high_personality_breadth: number;

  // ── Readiness classification ──
  readonly readiness_min_evidence_score: number;
  readonly readiness_min_interested_count: number;
  readonly readiness_max_structural_concern_count: number;
}

/**
 * Insert shape for creating a new threshold manifest. Excludes
 * computed fields (manifest_id is generated server-side, created_at
 * is server-stamped).
 */
export type ThresholdManifestInsert = Omit<
  ThresholdManifest,
  "manifest_id" | "created_at"
>;

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL CHANGE
//
// Detects what crossed a meaningful threshold between two snapshots.
// Noise filter — score drift of 2 points is not material; band
// transitions and posture state changes are.
// ─────────────────────────────────────────────────────────────────────────────

export type MaterialChangeKind =
  | "binding_constraint_shifted"
  | "closest_path_shifted"
  | "axis_band_crossed"
  | "posture_state_changed"
  | "coverage_gap_emerged"
  | "coverage_gap_resolved"
  | "comfort_condition_regressed"
  | "structural_concern_emerged"
  | "recovery_priority_evolved";

export type MaterialChangeSeverity =
  | "informational"
  | "notable"
  | "significant";

/**
 * One material change detected between two snapshots.
 *
 * The `axis_or_dimension` field carries the affected axis key, the
 * affected personality_id, or other dimension name — short enum-like
 * string. The `before_value` / `after_value` carry the actual band
 * names or state names. No score deltas are recorded here; if a band
 * changed, the band names tell the full story without exposing a
 * numeric delta that would invite blended-score thinking.
 */
export interface MaterialChange {
  readonly change_kind: MaterialChangeKind;
  readonly severity: MaterialChangeSeverity;
  readonly axis_or_dimension: string;
  readonly state_before: string | null;
  readonly state_after: string | null;
  readonly band_before: string | null;
  readonly band_after: string | null;
  readonly personality_id: PersonalityId | null;
  readonly trace_to_artifacts: ReadonlyArray<{
    readonly artifact_type: string;
    readonly artifact_id: string;
  }>;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT DIMENSIONS — multi-factor classification
//
// Each unresolved item carries structured impact dimensions. Classification
// is a categorical reduction over these dimensions — never a blended
// numeric score.
// ─────────────────────────────────────────────────────────────────────────────

export type ImpactClassification = "critical" | "high" | "moderate" | "low";

/**
 * Multi-factor dimensions of operational impact. Each field is either
 * a boolean (binary signal) or a count (single-dimension measurement).
 * Counts and booleans only — no aggregate scores.
 */
export interface ImpactDimensions {
  readonly affects_binding_constraint: boolean;
  readonly affects_closest_path: boolean;
  readonly affected_personality_count: number;
  readonly blocks_comfort_condition_count: number;
  readonly is_on_critical_fragility_node: boolean;
  readonly days_open: number;
}

/**
 * An unresolved recovery item with its impact dimensions and
 * categorical classification.
 *
 * `rank` is positional only — the order in the ranked list. It is NOT
 * a score. It exists so the UI can render the order without
 * re-sorting.
 */
export interface RankedRecoveryItem {
  readonly item_kind: RecoveryItemKind;
  readonly item_id: string;
  readonly item_label: string | null;
  readonly rank: number;
  readonly impact_classification: ImpactClassification;
  readonly impact_dimensions: ImpactDimensions;
  readonly trace_to_artifacts: ReadonlyArray<{
    readonly artifact_type: string;
    readonly artifact_id: string;
  }>;
  readonly provenance: ObservationProvenance;
}

/**
 * Grouping of ranked items that share an underlying target,
 * personality, or fragility node. Resolving the shared root unblocks
 * all members of the group.
 *
 * The aggregate classification is the most severe member's
 * classification — NOT a sum or blend. Categorical-only.
 */
export interface RecoveryWorkflowGroup {
  readonly group_kind:
    | "shared_target"
    | "shared_personality"
    | "shared_fragility_node";
  readonly group_key: string;
  readonly items: ReadonlyArray<RankedRecoveryItem>;
  readonly aggregate_impact_classification: ImpactClassification;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// STALLED PATH DETECTION
//
// Recovery items that have been open beyond the configured thresholds.
// Binary decision: stalled or not. No prediction about when it might
// resolve.
// ─────────────────────────────────────────────────────────────────────────────

export type StallReason =
  | "no_evaluations_taken"
  | "evaluations_taken_no_progress"
  | "regressed_after_satisfaction"
  | "evolved_repeatedly";

export type ThresholdKind = "days_open" | "snapshots_unresolved";

export interface StalledPath {
  readonly item_kind: RecoveryItemKind;
  readonly item_id: string;
  readonly item_label: string | null;
  readonly first_appeared_at: string;
  readonly days_open: number;
  readonly snapshots_since_appearance: number;
  readonly stall_reason: StallReason;
  readonly threshold_kind: ThresholdKind;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL TRAJECTORY
//
// For each structural concern, classify whether it's worsening,
// improving, persistent, intermittent, or resolved across the
// snapshot chain. Computed deterministically from the affected
// personality count series.
// ─────────────────────────────────────────────────────────────────────────────

export type StructuralTrajectoryKind =
  | "worsening"
  | "improving"
  | "persistent_stable"
  | "intermittent"
  | "emerging"
  | "resolved";

export interface TrajectoryObservation {
  readonly snapshot_id: string;
  readonly evaluated_at: string;
  readonly affected_personality_count: number;
}

export interface StructuralTrajectory {
  readonly concern_id: string;
  readonly trajectory: StructuralTrajectoryKind;
  readonly observation_count: number;
  readonly observations: ReadonlyArray<TrajectoryObservation>;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// READINESS CLASSIFICATION
//
// Categorical classification of the most recent snapshot's state.
// Five possible classifications. Each carries the named contributing
// factors — the buyer can see WHY a deal is in a given state.
// ─────────────────────────────────────────────────────────────────────────────

export type ReadinessClassificationKind =
  | "decision_ready"
  | "decision_ready_with_caveats"
  | "evidence_insufficient"
  | "structurally_blocked"
  | "all_paths_declined";

/**
 * A single contributing factor in a readiness classification.
 *
 * `axis_or_dimension` is the named axis or dimension that the factor
 * applies to. No numeric scoring — factors are binary signals.
 */
export interface ReadinessFactor {
  readonly axis_or_dimension: string;
  readonly state: string;
  readonly band: string | null;
}

export interface ReadinessClassification {
  readonly snapshot_id: string;
  readonly classification: ReadinessClassificationKind;
  readonly missing_evidence_count: number;
  readonly blocking_structural_concern_count: number;
  readonly interested_personality_count: number;
  readonly cautious_personality_count: number;
  readonly declined_personality_count: number;
  readonly contributing_factors: ReadonlyArray<ReadinessFactor>;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// MONITORING WATCHLIST (Constitutional Invariant #2 — three-scope abstraction)
//
// CP-10 implements `deal` and `global` scopes. `portfolio` scope is
// reserved — its schema exists, but evaluation returns a typed
// not_yet_implemented signal.
// ─────────────────────────────────────────────────────────────────────────────

export type WatchlistScopeKind = "deal" | "portfolio" | "global";

export type PortfolioFilterKind =
  | "industry_key"
  | "axis_band"
  | "trajectory"
  | "related_event_type"
  | "owner"
  | "fingerprint_fallback"
  | "readiness_classification";

/**
 * Filter configuration for portfolio-scope watchlist entries.
 * CP-10 stores these but does not yet evaluate them; portfolio
 * watchlist firings return typed not_yet_implemented results.
 */
export interface PortfolioFilter {
  readonly filter_kind: PortfolioFilterKind;
  readonly filter_value_text: string;
}

export type WatchlistTriggerKind =
  | "material_change"
  | "stalled_path"
  | "structural_worsening"
  | "readiness_state_change"
  | "regression";

/**
 * A user-configured monitoring subscription. Stored in
 * operations_watchlist_entries. Mutable in the sense that users can
 * enable/disable or update trigger configuration; the entry_id is
 * stable.
 */
export interface WatchlistEntry {
  readonly entry_id: string;
  readonly user_id: string;
  readonly team_id: string | null;
  readonly scope_kind: WatchlistScopeKind;
  readonly deal_id: string | null;          // present when scope_kind = "deal"
  readonly portfolio_filter: PortfolioFilter | null;  // present when scope_kind = "portfolio"
  readonly trigger_kind: WatchlistTriggerKind;
  readonly created_at: string;
}

export type WatchlistEntryInsert = Omit<WatchlistEntry, "entry_id" | "created_at">;

/**
 * A watchlist firing — produced when a watchlist entry matches a
 * detected condition. Pull-only in CP-10: firings are computed when
 * the user queries the watchlist, not pushed.
 *
 * The detected_primitive field is a discriminated union — the
 * trigger_kind tells the caller which shape to expect. We embed the
 * full primitive (with its own provenance) so the firing is
 * self-contained for audit.
 */
export type WatchlistFiringPrimitive =
  | { readonly trigger_kind: "material_change"; readonly primitive: MaterialChange }
  | { readonly trigger_kind: "stalled_path"; readonly primitive: StalledPath }
  | { readonly trigger_kind: "structural_worsening"; readonly primitive: StructuralTrajectory }
  | { readonly trigger_kind: "readiness_state_change"; readonly primitive: ReadinessClassification };

export interface WatchlistFiring {
  readonly firing_id: string;
  readonly entry_id: string;
  readonly fired_at: string;
  readonly detected_in_snapshot_id: string;
  readonly trigger_kind: WatchlistTriggerKind;
  readonly detected_primitive: WatchlistFiringPrimitive;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEAL EVOLUTION TRAJECTORY
//
// Cross-snapshot readiness state history. Lets the buyer see how the
// deal's classification evolved over time.
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadinessTrajectoryPoint {
  readonly snapshot_id: string;
  readonly evaluated_at: string;
  readonly classification: ReadinessClassificationKind;
}

export interface DealEvolutionTrajectory {
  readonly deal_id: string;
  readonly observation_count: number;
  readonly observations: ReadonlyArray<ReadinessTrajectoryPoint>;
  readonly current_status: ReadinessClassificationKind;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS ERROR + RESULT
//
// Same discriminated-union pattern as CP-9's PersistenceResult.
// Forces caller-side error handling.
// ─────────────────────────────────────────────────────────────────────────────

export type OperationsErrorCode =
  | "snapshot_not_found"
  | "manifest_not_found"
  | "rls_access_denied"
  | "invalid_threshold_manifest"
  | "watchlist_entry_not_found"
  | "portfolio_scope_not_yet_implemented"
  | "cp9_read_error"
  | "boundary_violation"
  | "unknown";

export interface OperationsError {
  readonly code: OperationsErrorCode;
  readonly message: string;
  readonly context: Record<string, unknown>;
}

export type OperationsResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: OperationsError };

// ─────────────────────────────────────────────────────────────────────────────
// COMPOUND REPORT SHAPES
//
// Higher-level views composed from the primitives above. Each carries
// its own provenance; their inner primitives carry their own.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Report bundling all material changes detected between two snapshots.
 * Returned by the material-change query surface.
 */
export interface MaterialChangeReport {
  readonly before_snapshot_id: string;
  readonly after_snapshot_id: string;
  readonly material_change_count: number;
  readonly changes: ReadonlyArray<MaterialChange>;
  readonly provenance: ObservationProvenance;
}

/**
 * Report bundling ranked items with their workflow groupings.
 * Returned by the impact ranking query surface.
 */
export interface ImpactRankingReport {
  readonly deal_id: string;
  readonly snapshot_id: string;
  readonly critical_count: number;
  readonly high_count: number;
  readonly moderate_count: number;
  readonly low_count: number;
  readonly ranked_items: ReadonlyArray<RankedRecoveryItem>;
  readonly workflow_groups: ReadonlyArray<RecoveryWorkflowGroup>;
  readonly provenance: ObservationProvenance;
}

/**
 * Report bundling all stalled paths for a deal.
 */
export interface StalledPathReport {
  readonly deal_id: string;
  readonly stalled_path_count: number;
  readonly stalled_paths: ReadonlyArray<StalledPath>;
  readonly provenance: ObservationProvenance;
}

/**
 * Report bundling structural trajectories for every structural
 * concern in a deal.
 */
export interface StructuralTrajectoryReport {
  readonly deal_id: string;
  readonly worsening_count: number;
  readonly improving_count: number;
  readonly persistent_stable_count: number;
  readonly intermittent_count: number;
  readonly emerging_count: number;
  readonly resolved_count: number;
  readonly trajectories: ReadonlyArray<StructuralTrajectory>;
  readonly provenance: ObservationProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME BOUNDARY METADATA
//
// Every CP-10 module exports a BOUNDARY_METADATA object describing its
// type surface. The runtime self-test validates the metadata against
// the allowlists at module load.
//
// Maintenance discipline: when adding a new type or field above, add
// the corresponding entry here. The boundary test will catch
// inconsistencies (a field exists in source but isn't in metadata,
// or vice versa).
// ─────────────────────────────────────────────────────────────────────────────

import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/types",
  module_version: OPERATIONS_MODULE_VERSION,
  types: [
    {
      type_name: "ObservationProvenance",
      fields: [
        { field_name: "computed_at", type_category: "string" },
        { field_name: "operations_version", type_category: "string" },
        { field_name: "threshold_manifest_id", type_category: "string" },
      ],
    },
    {
      type_name: "ThresholdManifest",
      fields: [
        { field_name: "manifest_id", type_category: "string" },
        { field_name: "version", type_category: "string" },
        { field_name: "schema_version", type_category: "number" },
        { field_name: "created_at", type_category: "string" },
        { field_name: "stalled_days_default", type_category: "number" },
        { field_name: "stalled_snapshots_default", type_category: "number" },
        { field_name: "chronic_snapshot_threshold", type_category: "number" },
        { field_name: "chronic_days_threshold", type_category: "number" },
        { field_name: "regression_window_days", type_category: "number" },
        { field_name: "material_score_delta_threshold", type_category: "number" },
        { field_name: "material_band_change_severity_significant", type_category: "number" },
        { field_name: "material_band_change_severity_notable", type_category: "number" },
        { field_name: "worsening_window_snapshots", type_category: "number" },
        { field_name: "intermittent_oscillation_threshold", type_category: "number" },
        { field_name: "critical_personality_breadth", type_category: "number" },
        { field_name: "high_personality_breadth", type_category: "number" },
        { field_name: "readiness_min_evidence_score", type_category: "number" },
        { field_name: "readiness_min_interested_count", type_category: "number" },
        { field_name: "readiness_max_structural_concern_count", type_category: "number" },
      ],
    },
    {
      type_name: "MaterialChange",
      fields: [
        { field_name: "change_kind", type_category: "string" },
        { field_name: "severity", type_category: "string" },
        { field_name: "axis_or_dimension", type_category: "string" },
        { field_name: "state_before", type_category: "string" },
        { field_name: "state_after", type_category: "string" },
        { field_name: "band_before", type_category: "string" },
        { field_name: "band_after", type_category: "string" },
        { field_name: "personality_id", type_category: "string" },
      ],
    },
    {
      type_name: "ImpactDimensions",
      fields: [
        { field_name: "affects_binding_constraint", type_category: "boolean" },
        { field_name: "affects_closest_path", type_category: "boolean" },
        { field_name: "affected_personality_count", type_category: "number" },
        { field_name: "blocks_comfort_condition_count", type_category: "number" },
        { field_name: "is_on_critical_fragility_node", type_category: "boolean" },
        { field_name: "days_open", type_category: "number" },
      ],
    },
    {
      type_name: "RankedRecoveryItem",
      fields: [
        { field_name: "item_kind", type_category: "string" },
        { field_name: "item_id", type_category: "string" },
        { field_name: "item_label", type_category: "string" },
        { field_name: "rank", type_category: "number" },
        { field_name: "impact_classification", type_category: "string" },
      ],
    },
    {
      type_name: "RecoveryWorkflowGroup",
      fields: [
        { field_name: "group_kind", type_category: "string" },
        { field_name: "group_key", type_category: "string" },
        { field_name: "aggregate_impact_classification", type_category: "string" },
      ],
    },
    {
      type_name: "StalledPath",
      fields: [
        { field_name: "item_kind", type_category: "string" },
        { field_name: "item_id", type_category: "string" },
        { field_name: "item_label", type_category: "string" },
        { field_name: "first_appeared_at", type_category: "string" },
        { field_name: "days_open", type_category: "number" },
        { field_name: "snapshots_since_appearance", type_category: "number" },
        { field_name: "stall_reason", type_category: "string" },
        { field_name: "threshold_kind", type_category: "string" },
      ],
    },
    {
      type_name: "TrajectoryObservation",
      fields: [
        { field_name: "snapshot_id", type_category: "string" },
        { field_name: "evaluated_at", type_category: "string" },
        { field_name: "affected_personality_count", type_category: "number" },
      ],
    },
    {
      type_name: "StructuralTrajectory",
      fields: [
        { field_name: "concern_id", type_category: "string" },
        { field_name: "trajectory", type_category: "string" },
        { field_name: "observation_count", type_category: "number" },
      ],
    },
    {
      type_name: "ReadinessFactor",
      fields: [
        { field_name: "axis_or_dimension", type_category: "string" },
        { field_name: "state", type_category: "string" },
        { field_name: "band", type_category: "string" },
      ],
    },
    {
      type_name: "ReadinessClassification",
      fields: [
        { field_name: "snapshot_id", type_category: "string" },
        { field_name: "classification", type_category: "string" },
        { field_name: "missing_evidence_count", type_category: "number" },
        { field_name: "blocking_structural_concern_count", type_category: "number" },
        { field_name: "interested_personality_count", type_category: "number" },
        { field_name: "cautious_personality_count", type_category: "number" },
        { field_name: "declined_personality_count", type_category: "number" },
      ],
    },
    {
      type_name: "PortfolioFilter",
      fields: [
        { field_name: "filter_kind", type_category: "string" },
        { field_name: "filter_value_text", type_category: "string" },
      ],
    },
    {
      type_name: "WatchlistEntry",
      fields: [
        { field_name: "entry_id", type_category: "string" },
        { field_name: "user_id", type_category: "string" },
        { field_name: "team_id", type_category: "string" },
        { field_name: "scope_kind", type_category: "string" },
        { field_name: "deal_id", type_category: "string" },
        { field_name: "trigger_kind", type_category: "string" },
        { field_name: "created_at", type_category: "string" },
      ],
    },
    {
      type_name: "WatchlistFiring",
      fields: [
        { field_name: "firing_id", type_category: "string" },
        { field_name: "entry_id", type_category: "string" },
        { field_name: "fired_at", type_category: "string" },
        { field_name: "detected_in_snapshot_id", type_category: "string" },
        { field_name: "trigger_kind", type_category: "string" },
      ],
    },
    {
      type_name: "ReadinessTrajectoryPoint",
      fields: [
        { field_name: "snapshot_id", type_category: "string" },
        { field_name: "evaluated_at", type_category: "string" },
        { field_name: "classification", type_category: "string" },
      ],
    },
    {
      type_name: "DealEvolutionTrajectory",
      fields: [
        { field_name: "deal_id", type_category: "string" },
        { field_name: "observation_count", type_category: "number" },
        { field_name: "current_status", type_category: "string" },
      ],
    },
    {
      type_name: "OperationsError",
      fields: [
        { field_name: "code", type_category: "string" },
        { field_name: "message", type_category: "string" },
      ],
    },
    {
      type_name: "MaterialChangeReport",
      fields: [
        { field_name: "before_snapshot_id", type_category: "string" },
        { field_name: "after_snapshot_id", type_category: "string" },
        { field_name: "material_change_count", type_category: "number" },
      ],
    },
    {
      type_name: "ImpactRankingReport",
      fields: [
        { field_name: "deal_id", type_category: "string" },
        { field_name: "snapshot_id", type_category: "string" },
        { field_name: "critical_count", type_category: "number" },
        { field_name: "high_count", type_category: "number" },
        { field_name: "moderate_count", type_category: "number" },
        { field_name: "low_count", type_category: "number" },
      ],
    },
    {
      type_name: "StalledPathReport",
      fields: [
        { field_name: "deal_id", type_category: "string" },
        { field_name: "stalled_path_count", type_category: "number" },
      ],
    },
    {
      type_name: "StructuralTrajectoryReport",
      fields: [
        { field_name: "deal_id", type_category: "string" },
        { field_name: "worsening_count", type_category: "number" },
        { field_name: "improving_count", type_category: "number" },
        { field_name: "persistent_stable_count", type_category: "number" },
        { field_name: "intermittent_count", type_category: "number" },
        { field_name: "emerging_count", type_category: "number" },
        { field_name: "resolved_count", type_category: "number" },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LOAD SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

import { assertBoundaryMetadata, BoundaryEnforcementError } from "./__boundary__/runtime-assertions";

function runSelfTest(): void {
  try {
    assertBoundaryMetadata(BOUNDARY_METADATA);
  } catch (err) {
    if (err instanceof BoundaryEnforcementError) {
      const g = globalThis as { console?: { error?: (m: string) => void } };
      g.console?.error?.(
        `CP-10 types module BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types from upstream modules that CP-10 references
// ─────────────────────────────────────────────────────────────────────────────

export type { AxisKey, PersonalityId, RecoveryItemKind, RecoveryStatus };
