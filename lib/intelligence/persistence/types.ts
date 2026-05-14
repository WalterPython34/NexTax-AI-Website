// lib/intelligence/persistence/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Persistence Type Contracts
//
// This module mirrors the SQL schema in
// supabase/migrations/20260513000000_cp9_persistence.sql.
//
// The TypeScript contracts conform to the persistence contract, NOT the
// other way around. When the schema evolves, these types are regenerated;
// downstream modules consume the types so the persistence layer remains
// the source of truth.
//
// Architectural commitments encoded in the type system:
//
//   1. Append-only — no UPDATE shape exists. The only mutation API is
//      "create new snapshot." There is no PartialEvaluationSnapshot.
//
//   2. Replay integrity — schema_version + CPVersionManifest + canonical
//      hash are required on every snapshot.
//
//   3. Two-layer input preservation — raw_input_payload and
//      normalized_engine_inputs are distinct fields with different
//      shapes; future re-normalization is possible from the raw payload.
//
//   4. Structured deltas only — EvaluationDelta compares structured
//      artifacts (axes, postures, fragility, recovery). Narrative deltas
//      are not in the delta type — they are derived downstream by
//      re-running CP-8 templates over the structured delta.
//
//   5. Replay modes are typed distinctly — HistoricalReplayResult is the
//      stored snapshot returned verbatim; ForwardReplayResult is a new
//      EvaluationSnapshot flagged forward_replay with replay_source_snapshot_id.
//
//   6. Lineage is mandatory on every snapshot — every snapshot knows its
//      parent (or null if root) and root_evaluation_id.
//
//   7. Explainability ledger is computed, not generated — the ledger
//      walks the trace graph already implicit in CP-8 source_ids. CP-9
//      formalizes the graph shape.
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
  RuleEngineResult,
} from "../rules/types";
import type {
  AxisKey,
  FingerprintResolution,
} from "../types";
import type {
  NarrativeOutput,
} from "../narrative/types";
import type {
  PersonalityId,
} from "../personalities/types";

// ─────────────────────────────────────────────────────────────────────────────
// VERSION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CP-9 persistence module version. Bumped when the persistence module
 * itself changes shape (separate from schema_version which tracks the
 * Postgres schema).
 */
export const PERSISTENCE_MODULE_VERSION = "cp9-v0.1.0" as const;

/**
 * Schema version corresponds to the SQL migration. Application code MUST
 * write this value into snapshot.schema_version on every insert.
 *
 * When the migration is updated:
 *   - Bump SCHEMA_VERSION here
 *   - Bump the schema_version column comment in the SQL migration
 *   - Update PERSISTENCE_MODULE_VERSION
 */
export const SCHEMA_VERSION = 1 as const;
export type SchemaVersion = typeof SCHEMA_VERSION;

// ─────────────────────────────────────────────────────────────────────────────
// CP VERSION MANIFEST
//
// Mirrors the `cp_versions` JSONB column. The check constraint in the SQL
// migration enforces that all 7 keys are present; the TypeScript shape
// enforces it at compile time.
// ─────────────────────────────────────────────────────────────────────────────

export interface CPVersionManifest {
  readonly cp2: string;  // industry fingerprints + assumption taxonomy + metric relevance + source types
  readonly cp3: string;  // rule engine catalogue + pattern catalogue
  readonly cp4: string;  // scenario catalogue
  readonly cp5: string;  // axis composition + fragility graph
  readonly cp6: string;  // personality catalogue
  readonly cp7: string;  // posture simulator
  readonly cp8: string;  // narrative layer
}

/**
 * Helper type for the seven required keys.
 */
export type CPVersionKey = keyof CPVersionManifest;

export const CP_VERSION_KEYS: ReadonlyArray<CPVersionKey> = [
  "cp2",
  "cp3",
  "cp4",
  "cp5",
  "cp6",
  "cp7",
  "cp8",
];

// ─────────────────────────────────────────────────────────────────────────────
// ENUM UNIONS (mirror the Postgres cp9_* enums)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Why the evaluation was performed. Mirrors cp9_change_reason.
 *
 * "initial_evaluation" — first snapshot for the deal
 * "revised_financials" — buyer or seller updated financial figures
 * "tax_returns_uploaded" — evidence upgrade
 * "customer_concentration_support" — diligence on top customer
 * "addback_substantiation" — add-back schedule support uploaded
 * "qoe_findings" — quality of earnings findings applied
 * "lender_request" — lender requested re-evaluation
 * "seller_revised_terms" — deal structure changed
 * "buyer_initiated_recheck" — buyer asked for a fresh read
 * "engine_upgrade" — CP version updated; snapshot regenerated
 * "forward_replay" — explicit forward replay of an earlier snapshot
 * "other" — escape hatch with required change_description
 */
export type ChangeReason =
  | "initial_evaluation"
  | "revised_financials"
  | "tax_returns_uploaded"
  | "customer_concentration_support"
  | "addback_substantiation"
  | "qoe_findings"
  | "lender_request"
  | "seller_revised_terms"
  | "buyer_initiated_recheck"
  | "engine_upgrade"
  | "forward_replay"
  | "other";

export const CHANGE_REASONS: ReadonlyArray<ChangeReason> = [
  "initial_evaluation",
  "revised_financials",
  "tax_returns_uploaded",
  "customer_concentration_support",
  "addback_substantiation",
  "qoe_findings",
  "lender_request",
  "seller_revised_terms",
  "buyer_initiated_recheck",
  "engine_upgrade",
  "forward_replay",
  "other",
];

/**
 * Replay origin distinguishes original evaluations from replays.
 * Mirrors cp9_replay_origin.
 *
 * "original" — first-pass evaluation; replay_source_snapshot_id is null
 * "historical_replay" — reconstructed exactly from stored artifacts (no
 *   re-computation); replay_source_snapshot_id points to the stored snapshot
 * "forward_replay" — raw inputs re-run through current engine versions;
 *   replay_source_snapshot_id points to the snapshot whose raw inputs
 *   were used
 */
export type ReplayOrigin =
  | "original"
  | "historical_replay"
  | "forward_replay";

export const REPLAY_ORIGINS: ReadonlyArray<ReplayOrigin> = [
  "original",
  "historical_replay",
  "forward_replay",
];

/**
 * Categories of upstream artifacts that narrative fragments trace to.
 * Mirrors cp9_artifact_type.
 *
 * Used by the explainability ledger to type each fragment → artifact edge.
 */
export type ArtifactType =
  | "rule_firing"
  | "scenario_outcome"
  | "axis_component"
  | "comfort_condition"
  | "discomfort"
  | "deal_breaker"
  | "fragility_node"
  | "fingerprint_signal"
  | "input_metric"
  | "posture_state"
  | "recovery_priority"
  | "structural_concern"
  | "coverage_gap_signal"
  | "assumption_concentration";

export const ARTIFACT_TYPES: ReadonlyArray<ArtifactType> = [
  "rule_firing",
  "scenario_outcome",
  "axis_component",
  "comfort_condition",
  "discomfort",
  "deal_breaker",
  "fragility_node",
  "fingerprint_signal",
  "input_metric",
  "posture_state",
  "recovery_priority",
  "structural_concern",
  "coverage_gap_signal",
  "assumption_concentration",
];

/**
 * Recovery item lifecycle status across snapshots. Mirrors cp9_recovery_status.
 *
 * Status is computed at snapshot-build time by comparing the current
 * snapshot's recovery items to the parent snapshot's.
 *
 * "open" — present in this snapshot, not in parent (new concern)
 * "persisted" — present in this snapshot AND parent (carryover)
 * "satisfied" — present in parent, NOT in this snapshot (resolved)
 * "regressed" — was satisfied in parent, now open again
 * "evolved" — changed shape but addresses same target (e.g., recovery
 *   priority swapped from "upgrade to tax returns" to "upgrade to
 *   accountant exports" — different items, same target_id)
 */
export type RecoveryStatus =
  | "open"
  | "persisted"
  | "satisfied"
  | "regressed"
  | "evolved";

export const RECOVERY_STATUSES: ReadonlyArray<RecoveryStatus> = [
  "open",
  "persisted",
  "satisfied",
  "regressed",
  "evolved",
];

/**
 * Recovery item kind. Mirrors cp9_recovery_item_kind.
 *
 * Distinguishes the source layer of each item so the recovery path
 * tracker can query by kind ("all open recovery_priorities for this
 * deal" vs "all repairable_discomforts for this deal").
 */
export type RecoveryItemKind =
  | "recovery_priority"
  | "comfort_condition"
  | "repairable_discomfort"
  | "information_need"
  | "structural_concern";

export const RECOVERY_ITEM_KINDS: ReadonlyArray<RecoveryItemKind> = [
  "recovery_priority",
  "comfort_condition",
  "repairable_discomfort",
  "information_need",
  "structural_concern",
];

/**
 * Institutional memory event categories. Mirrors cp9_memory_event_type.
 *
 * Records real-world events occurring during deal lifecycle. Eventually
 * correlates engine readings to actual deal outcomes.
 */
export type MemoryEventType =
  | "lender_contacted"
  | "lender_requested_documentation"
  | "lender_pre_approval"
  | "lender_declined"
  | "loi_submitted"
  | "loi_accepted"
  | "loi_rejected"
  | "loi_expired"
  | "seller_revised_terms"
  | "seller_provided_documentation"
  | "buyer_uploaded_documents"
  | "qoe_started"
  | "qoe_completed"
  | "retrade_occurred"
  | "sba_application_submitted"
  | "sba_approved"
  | "sba_declined"
  | "deal_closed"
  | "deal_died"
  | "deal_paused"
  | "note"
  | "other";

export const MEMORY_EVENT_TYPES: ReadonlyArray<MemoryEventType> = [
  "lender_contacted",
  "lender_requested_documentation",
  "lender_pre_approval",
  "lender_declined",
  "loi_submitted",
  "loi_accepted",
  "loi_rejected",
  "loi_expired",
  "seller_revised_terms",
  "seller_provided_documentation",
  "buyer_uploaded_documents",
  "qoe_started",
  "qoe_completed",
  "retrade_occurred",
  "sba_application_submitted",
  "sba_approved",
  "sba_declined",
  "deal_closed",
  "deal_died",
  "deal_paused",
  "note",
  "other",
];

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION LINEAGE
//
// Lineage block carried on every snapshot.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationLineage {
  /**
   * Direct predecessor snapshot. Null for the first snapshot of an
   * evaluation chain (root).
   */
  readonly parent_snapshot_id: string | null;

  /**
   * Root evaluation identifier — engine-side stable ID of the first
   * snapshot in this evaluation chain. Equals the snapshot's own
   * evaluation_id when this is the root.
   */
  readonly root_evaluation_id: string;

  /**
   * Why this evaluation was performed. Typed enum; "other" requires
   * a non-empty change_description.
   */
  readonly change_reason: ChangeReason;

  /**
   * Optional free-form description. Required when change_reason="other".
   */
  readonly change_description: string | null;

  /**
   * User who initiated this evaluation. Null when triggered by system
   * (cron, engine upgrade, etc.).
   */
  readonly triggered_by: string | null;

  /**
   * Optional link to an institutional_memory_event that caused this
   * evaluation. E.g., "lender_requested_documentation" event triggered
   * the buyer to upload new tax returns, which triggered this snapshot.
   */
  readonly triggered_by_event_id: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW vs NORMALIZED INPUT PAYLOADS
//
// Two distinct shapes preserved on every snapshot. Future re-normalization
// is possible from raw_input_payload even if CP-2 normalization evolves.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw input payload — exactly what arrived from the user/system.
 *
 * Shape is deliberately loose (JSON-compatible record) because the raw
 * payload may vary across input channels:
 *   - direct form submission (typed fields + raw labels)
 *   - file uploads (file references + extracted values)
 *   - API ingestion (third-party deal-flow integrations)
 *   - lender intake imports
 *
 * Treat this as preservation-of-truth: never re-parse for analytics;
 * always re-normalize through CP-2 if values are needed.
 */
export interface RawInputPayload {
  readonly [field: string]: unknown;
}

/**
 * Normalized engine inputs — the CP-2 EngineInputs shape that the engine
 * actually evaluated against at the snapshot moment.
 *
 * This is a structural copy preserved for replay. If CP-2 normalization
 * logic changes, this snapshot's normalized inputs remain frozen at the
 * normalization that produced this evaluation.
 *
 * The shape mirrors CP-2 EngineInputs but is JSON-safe (numbers, strings,
 * booleans, nested objects, arrays). It is deliberately loose-typed here
 * because the CP-2 type may evolve; the canonical hash captures the
 * exact bytes that fed the engine.
 */
export interface NormalizedEngineInputs {
  readonly industry_key: string;
  readonly deal_source_type: string;
  readonly [field: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SNAPSHOT ARTIFACT PAYLOAD
//
// The full pipeline output bundled into a single JSON-safe payload that
// goes into the `artifact_payload` JSONB column.
//
// The check constraint on the SQL migration requires that
// axis_composition_result, batch_posture_result, and narrative_output
// keys be present. The TypeScript shape enforces all required keys.
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalSnapshotPayload {
  readonly fingerprint_resolution: FingerprintResolution;
  readonly rule_engine_result: RuleEngineResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
  readonly axis_composition_result: AxisCompositionResult;
  readonly batch_posture_result: BatchSimulationResult;
  readonly narrative_output: NarrativeOutput;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION SNAPSHOT
//
// Mirrors the evaluation_snapshots table row shape.
//
// All fields are readonly — snapshots are immutable both at the database
// layer (triggers reject UPDATE/DELETE) and at the type layer. No
// PartialEvaluationSnapshot or UpdateEvaluationSnapshot type exists by
// design.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationSnapshot {
  // ── Identity ──
  readonly snapshot_id: string;            // uuid, generated by database
  readonly evaluation_id: string;          // engine-side stable identifier
  readonly deal_id: string;                // uuid
  readonly user_id: string;                // uuid
  readonly team_id: string | null;         // uuid; preserved for forward compatibility

  // ── Replay integrity ──
  readonly schema_version: SchemaVersion;
  readonly cp_versions: CPVersionManifest;
  readonly canonical_evaluation_hash: string;  // 64-char hex SHA-256
  readonly replay_origin: ReplayOrigin;
  readonly replay_source_snapshot_id: string | null;

  // ── Inputs ──
  readonly raw_input_payload: RawInputPayload;
  readonly normalized_engine_inputs: NormalizedEngineInputs;

  // ── Full pipeline artifacts ──
  readonly artifact_payload: CanonicalSnapshotPayload;

  // ── Lineage ──
  readonly lineage: EvaluationLineage;

  // ── Provenance ──
  readonly created_at: string;             // ISO timestamp
}

/**
 * Input shape for creating a new snapshot. Excludes database-generated
 * fields (snapshot_id, created_at) and exposes the lineage as a nested
 * object for ergonomic construction.
 */
export interface EvaluationSnapshotInsert {
  readonly evaluation_id: string;
  readonly deal_id: string;
  readonly user_id: string;
  readonly team_id: string | null;
  readonly schema_version: SchemaVersion;
  readonly cp_versions: CPVersionManifest;
  readonly canonical_evaluation_hash: string;
  readonly replay_origin: ReplayOrigin;
  readonly replay_source_snapshot_id: string | null;
  readonly raw_input_payload: RawInputPayload;
  readonly normalized_engine_inputs: NormalizedEngineInputs;
  readonly artifact_payload: CanonicalSnapshotPayload;
  readonly lineage: EvaluationLineage;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION STATE SUMMARY
//
// Mirrors the evaluation_state_summaries table row shape.
//
// Compact denormalized projection for dashboard queries. NEVER query the
// snapshot JSONB blob for dashboards — query this shape.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationStateSummary {
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly user_id: string;
  readonly team_id: string | null;

  // ── Binding constraint surface ──
  readonly dominant_constraint_axis: AxisKey | null;
  readonly dominant_constraint_band: string | null;
  readonly dominant_constraint_repairability: "repairable" | "structural" | null;

  // ── Highest-impact axis surface ──
  readonly highest_fragility_axis: AxisKey | null;

  // ── Posture distribution ──
  readonly interested_count: number;
  readonly cautious_count: number;
  readonly decline_count: number;

  // ── Closest recoverable lender profile ──
  readonly closest_recoverable_profile: PersonalityId | null;
  readonly closest_recoverable_state: "interested" | "cautious" | "decline" | null;
  readonly closest_recoverable_all_declined: boolean | null;

  // ── Signal counts ──
  readonly fatal_signal_count: number;
  readonly repairable_signal_count: number;
  readonly deal_breaker_count: number;
  readonly unresolved_comfort_conditions: number;
  readonly satisfied_comfort_conditions: number;
  readonly unresolved_recovery_priorities: number;

  // ── Coverage gap ──
  readonly is_coverage_gap: boolean;
  readonly coverage_gap_affected_count: number;

  // ── Fingerprint ──
  readonly fingerprint_key: string;
  readonly fingerprint_is_fallback: boolean;

  // ── Top assumption concentration ──
  readonly top_assumption_key: string | null;
  readonly top_assumption_evidence_band:
    | "strong"
    | "moderate"
    | "cautionary"
    | "concerning"
    | null;

  // ── Axis scores ──
  readonly financial_score: number | null;
  readonly durability_score: number | null;
  readonly evidence_quality: number | null;
  readonly assumption_fragility: number | null;
  readonly underwriting_uncertainty: number | null;

  // ── Provenance ──
  readonly created_at: string;
  readonly evaluated_at: string;
}

/**
 * Insert shape for evaluation_state_summaries (omits database-generated created_at).
 */
export type EvaluationStateSummaryInsert = Omit<EvaluationStateSummary, "created_at">;

// ─────────────────────────────────────────────────────────────────────────────
// EXPLAINABILITY TRACE
//
// Mirrors the explainability_traces table row shape.
//
// One row per (fragment_id → upstream artifact) edge. The graph of traces
// for a given snapshot answers:
//   - "Which fragments cited rule sba.dscr_floor_check?" (reverse trace)
//   - "What artifacts support fragment {abc}?" (forward trace)
//   - "Show me the full chain from headline down to input metric."
// ─────────────────────────────────────────────────────────────────────────────

export interface ExplainabilityTrace {
  readonly trace_id: string;
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly user_id: string;

  // ── Fragment side ──
  readonly fragment_id: string;
  readonly fragment_kind: string;   // NarrativeFragmentKind

  // ── Upstream artifact side ──
  readonly artifact_type: ArtifactType;
  readonly artifact_id: string;

  // ── Trace structure ──
  readonly trace_depth: number;     // 0 = direct citation; N = N hops upstream
  readonly parent_trace_id: string | null;

  // ── Optional context ──
  readonly artifact_metadata: Record<string, unknown> | null;

  // ── Provenance ──
  readonly created_at: string;
}

export type ExplainabilityTraceInsert = Omit<ExplainabilityTrace, "trace_id" | "created_at">;

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY PATH HISTORY ENTRY
//
// Mirrors the recovery_path_history table row shape.
//
// One row per (snapshot × recovery item) observation. Lifecycle status is
// computed by comparing to the parent snapshot's items.
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryPathHistoryEntry {
  readonly history_id: string;
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly user_id: string;

  // ── Recovery item identity ──
  readonly item_kind: RecoveryItemKind;
  readonly item_id: string;
  readonly item_label: string | null;

  // ── Lifecycle status ──
  readonly status: RecoveryStatus;

  // ── Relationships ──
  readonly related_personality_ids: ReadonlyArray<PersonalityId>;
  readonly related_axis_keys: ReadonlyArray<AxisKey>;
  readonly addresses_target_id: string | null;

  // ── Lineage anchors ──
  readonly first_seen_snapshot_id: string | null;
  readonly last_seen_snapshot_id: string | null;
  readonly resolved_at_snapshot_id: string | null;

  // ── Item-specific payload ──
  readonly item_payload: Record<string, unknown> | null;

  // ── Provenance ──
  readonly created_at: string;
  readonly evaluated_at: string;
}

export type RecoveryPathHistoryInsert = Omit<RecoveryPathHistoryEntry, "history_id" | "created_at">;

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL MEMORY EVENT
//
// Mirrors the institutional_memory_events table row shape.
//
// Append-only. Records real-world events occurring during deal lifecycle.
// ─────────────────────────────────────────────────────────────────────────────

export interface InstitutionalMemoryEvent {
  readonly event_id: string;
  readonly deal_id: string;
  readonly user_id: string;
  readonly team_id: string | null;

  // ── Event identity ──
  readonly event_type: MemoryEventType;
  readonly event_at: string;       // when the event actually occurred
  readonly recorded_at: string;    // when it was logged to AcquiFlow

  // ── Optional links ──
  readonly related_snapshot_id: string | null;
  readonly parent_event_id: string | null;

  // ── Payload ──
  readonly event_payload: Record<string, unknown>;
  readonly notes: string | null;

  // ── Provenance ──
  readonly recorded_by: string;    // user_id who logged the event
}

export type InstitutionalMemoryEventInsert = Omit<
  InstitutionalMemoryEvent,
  "event_id" | "recorded_at"
>;

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL HASH INPUT
//
// The exact shape that gets canonicalized and SHA-256-hashed to produce
// the canonical_evaluation_hash on a snapshot.
//
// IMPORTANT: this shape excludes:
//   - timestamps (would make every hash unique)
//   - snapshot_id, evaluation_id, deal_id, user_id (identity, not state)
//   - lineage fields (lineage is metadata, not state)
//   - raw_input_payload (raw payload may include file references with
//     varying URLs that don't change the actual evaluation)
//
// The hash is computed over normalized engine inputs and the full
// pipeline artifacts. Two evaluations with identical normalized inputs
// AND identical artifact outputs AND identical CP/schema versions
// produce the same hash.
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalHashInput {
  readonly schema_version: SchemaVersion;
  readonly cp_versions: CPVersionManifest;
  readonly normalized_engine_inputs: NormalizedEngineInputs;
  readonly fingerprint_resolution: FingerprintResolution;
  readonly rule_engine_result: RuleEngineResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
  readonly axis_composition_result: AxisCompositionResult;
  readonly batch_posture_result: BatchSimulationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION DELTA
//
// Computed-only type. Not stored in any table. The delta engine produces
// this on demand by comparing two snapshots.
//
// CRITICAL: deltas compare STRUCTURED ARTIFACTS only. Never prose.
// Narrative deltas (if needed for UI) are derived downstream by running
// CP-8 templates over the structured delta.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comparison result for a single axis. Numeric delta + band transition.
 */
export interface AxisDelta {
  readonly axis: AxisKey;
  readonly score_before: number;
  readonly score_after: number;
  readonly score_delta: number;        // after - before
  readonly band_before: string;
  readonly band_after: string;
  readonly band_transition:
    | "improved"      // moved to a better band
    | "degraded"      // moved to a worse band
    | "unchanged";    // same band (regardless of score delta)
  readonly version_drift_warning: boolean;  // true when CP-5 version differs between snapshots
}

/**
 * Comparison result for a single personality's posture.
 */
export interface PostureDelta {
  readonly personality_id: PersonalityId;
  readonly state_before: "interested" | "cautious" | "decline";
  readonly state_after: "interested" | "cautious" | "decline";
  readonly state_transition:
    | "improved"      // decline → cautious, cautious → interested, decline → interested
    | "degraded"      // reverse direction
    | "unchanged";
  readonly coverage_gap_before: boolean;
  readonly coverage_gap_after: boolean;
  readonly fatal_count_before: number;
  readonly fatal_count_after: number;
  readonly repairable_count_before: number;
  readonly repairable_count_after: number;
  readonly version_drift_warning: boolean;  // true when CP-6 or CP-7 version differs
}

/**
 * Fragility graph node delta.
 *
 * status:
 *   "resolved" — node in `before`, not in `after`
 *   "persisted" — node in both
 *   "new" — node in `after`, not in `before`
 */
export interface FragilityNodeDelta {
  readonly assumption_key: string;
  readonly assumption_name: string;
  readonly status: "resolved" | "persisted" | "new";
  readonly conclusion_count_before: number | null;
  readonly conclusion_count_after: number | null;
  readonly evidence_strength_before: number | null;
  readonly evidence_strength_after: number | null;
}

/**
 * Recovery priority delta.
 */
export interface RecoveryPriorityDelta {
  readonly priority_id: string;
  readonly label: string;
  readonly status: RecoveryStatus;
  readonly leverage_count_before: number | null;
  readonly leverage_count_after: number | null;
}

/**
 * Comfort condition delta.
 */
export interface ComfortConditionDelta {
  readonly comfort_condition_id: string;
  readonly personality_id: PersonalityId;
  readonly status:
    | "newly_satisfied"
    | "persisted_satisfied"
    | "persisted_unsatisfied"
    | "regressed_unsatisfied"   // was satisfied; now unsatisfied
    | "new_unsatisfied";        // not in before; unsatisfied in after
}

/**
 * Structural concern delta.
 */
export interface StructuralConcernDelta {
  readonly concern_id: string;
  readonly description: string;
  readonly status: "resolved" | "persisted" | "new";
  readonly affected_personalities_before: ReadonlyArray<PersonalityId>;
  readonly affected_personalities_after: ReadonlyArray<PersonalityId>;
}

/**
 * Coverage gap state delta.
 */
export interface CoverageGapDelta {
  readonly status: "emerged" | "persisted" | "resolved" | "unchanged_absent";
  readonly affected_personalities_before: ReadonlyArray<PersonalityId>;
  readonly affected_personalities_after: ReadonlyArray<PersonalityId>;
}

/**
 * Binding constraint delta.
 *
 * "unchanged" — same axis, same band, same repairability
 * "shifted_axis" — different axis
 * "shifted_band" — same axis, different band
 * "shifted_repairability" — same axis & band, different repairability
 * "resolved" — binding constraint existed in before, none in after
 * "emerged" — none in before, binding constraint in after
 */
export interface BindingConstraintDelta {
  readonly status:
    | "unchanged"
    | "shifted_axis"
    | "shifted_band"
    | "shifted_repairability"
    | "resolved"
    | "emerged";
  readonly axis_before: AxisKey | null;
  readonly axis_after: AxisKey | null;
  readonly band_before: string | null;
  readonly band_after: string | null;
  readonly repairability_before: "repairable" | "structural" | null;
  readonly repairability_after: "repairable" | "structural" | null;
}

/**
 * Closest path delta.
 */
export interface ClosestPathDelta {
  readonly status:
    | "unchanged"
    | "shifted_profile"        // different personality
    | "shifted_state"          // same personality, different posture
    | "shifted_both"
    | "newly_available"        // before: no closest path (e.g., empty batch); after: present
    | "lost";                  // before: present; after: none
  readonly personality_before: PersonalityId | null;
  readonly personality_after: PersonalityId | null;
  readonly state_before: "interested" | "cautious" | "decline" | null;
  readonly state_after: "interested" | "cautious" | "decline" | null;
}

/**
 * Information need delta.
 */
export interface InformationNeedDelta {
  readonly info_need_id: string;
  readonly personality_id: PersonalityId;
  readonly status: "satisfied" | "persisted" | "new";
}

/**
 * Full evaluation delta — the comparison output type.
 *
 * Carries:
 *   - The two snapshot IDs being compared
 *   - Per-axis comparisons (5 always present)
 *   - Per-personality posture comparisons (one per personality)
 *   - Fragility / recovery / comfort / structural / coverage / binding /
 *     closest-path comparisons
 *   - Version drift summary (which CP versions differ between snapshots)
 *
 * Narrative is NOT included — derived downstream from this structure.
 */
export interface EvaluationDelta {
  readonly delta_id: string;                     // generated, not stored
  readonly computed_at: string;                  // ISO timestamp

  // ── Snapshots being compared ──
  readonly before_snapshot_id: string;
  readonly after_snapshot_id: string;
  readonly before_evaluated_at: string;
  readonly after_evaluated_at: string;

  // ── Version drift surface ──
  readonly cp_version_drift: ReadonlyArray<CPVersionKey>;  // keys where versions differ
  readonly schema_version_drift: boolean;

  // ── Structured comparisons ──
  readonly axis_deltas: ReadonlyArray<AxisDelta>;
  readonly posture_deltas: ReadonlyArray<PostureDelta>;
  readonly fragility_node_deltas: ReadonlyArray<FragilityNodeDelta>;
  readonly recovery_priority_deltas: ReadonlyArray<RecoveryPriorityDelta>;
  readonly comfort_condition_deltas: ReadonlyArray<ComfortConditionDelta>;
  readonly information_need_deltas: ReadonlyArray<InformationNeedDelta>;
  readonly structural_concern_deltas: ReadonlyArray<StructuralConcernDelta>;
  readonly coverage_gap_delta: CoverageGapDelta;
  readonly binding_constraint_delta: BindingConstraintDelta;
  readonly closest_path_delta: ClosestPathDelta;

  // ── Summary stats ──
  readonly summary: {
    readonly axes_improved: number;
    readonly axes_degraded: number;
    readonly postures_improved: number;
    readonly postures_degraded: number;
    readonly fragility_nodes_resolved: number;
    readonly fragility_nodes_new: number;
    readonly comfort_conditions_newly_satisfied: number;
    readonly comfort_conditions_regressed: number;
    readonly recovery_priorities_satisfied: number;
    readonly recovery_priorities_new: number;
    readonly structural_concerns_resolved: number;
    readonly structural_concerns_new: number;
  };

  readonly version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLAINABILITY LEDGER VIEW
//
// Computed graph view of explainability_traces for a single snapshot.
// Not stored — assembled on demand.
//
// Two natural traversal directions:
//   - Forward: fragment → its supporting artifacts (used by "explain
//     this fragment" UI)
//   - Reverse: artifact → fragments citing it (used by "where does
//     rule X appear?" UI)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One node in the trace graph (typed artifact reference).
 */
export interface LedgerArtifactNode {
  readonly artifact_type: ArtifactType;
  readonly artifact_id: string;
  readonly artifact_metadata: Record<string, unknown> | null;
}

/**
 * Forward chain from a fragment to all its supporting artifacts,
 * organized by depth.
 */
export interface LedgerFragmentChain {
  readonly fragment_id: string;
  readonly fragment_kind: string;
  readonly direct_artifacts: ReadonlyArray<LedgerArtifactNode>;       // depth 0
  readonly upstream_artifacts: ReadonlyArray<LedgerArtifactNode>;     // depth > 0
  readonly max_depth: number;
}

/**
 * Reverse chain from an artifact to all fragments citing it.
 */
export interface LedgerArtifactCitations {
  readonly artifact_type: ArtifactType;
  readonly artifact_id: string;
  readonly citing_fragment_ids: ReadonlyArray<string>;
  readonly citation_count: number;
}

export interface ExplainabilityLedger {
  readonly snapshot_id: string;
  readonly computed_at: string;
  readonly fragment_chains: ReadonlyArray<LedgerFragmentChain>;
  readonly artifact_citations: ReadonlyArray<LedgerArtifactCitations>;
  readonly summary: {
    readonly total_traces: number;
    readonly unique_fragments: number;
    readonly unique_artifacts: number;
    readonly max_trace_depth: number;
  };
  readonly version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY RESULT TYPES
//
// Two distinct replay modes, typed differently. They never share a return
// shape because they have different semantics:
//
//   Historical replay reconstructs the EXACT historical state from the
//   stored snapshot. No re-computation. Returns the stored payload.
//
//   Forward replay runs the stored raw inputs through current (or
//   specified target) engine versions. Returns a NEW EvaluationSnapshot
//   flagged with replay_origin=forward_replay.
// ─────────────────────────────────────────────────────────────────────────────

export interface HistoricalReplayResult {
  readonly mode: "historical_replay";
  readonly source_snapshot_id: string;
  readonly snapshot: EvaluationSnapshot;       // returned verbatim from storage
  readonly retrieved_at: string;
}

export interface ForwardReplayResult {
  readonly mode: "forward_replay";
  readonly source_snapshot_id: string;
  readonly target_cp_versions: CPVersionManifest;
  readonly source_cp_versions: CPVersionManifest;
  readonly snapshot: EvaluationSnapshot;       // newly built with replay_origin=forward_replay
  readonly delta: EvaluationDelta | null;       // optional delta vs source snapshot
  readonly replayed_at: string;
}

export type ReplayResult = HistoricalReplayResult | ForwardReplayResult;

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE ERROR SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export type PersistenceErrorCode =
  | "schema_version_mismatch"
  | "cp_versions_missing_keys"
  | "hash_format_invalid"
  | "hash_collision_within_deal"      // unique (deal_id, hash) violation
  | "replay_source_required"
  | "replay_source_not_found"
  | "snapshot_not_found"
  | "snapshot_immutable_violation"    // tried to update/delete
  | "rls_access_denied"
  | "unknown";

export interface PersistenceError {
  readonly code: PersistenceErrorCode;
  readonly message: string;
  readonly context: Record<string, unknown> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE / OK RESULT WRAPPERS
//
// All persistence write operations return a discriminated union of
// { ok: true, value } | { ok: false, error }. This keeps error handling
// explicit at the call site rather than relying on thrown exceptions.
// ─────────────────────────────────────────────────────────────────────────────

export type PersistenceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PersistenceError };
