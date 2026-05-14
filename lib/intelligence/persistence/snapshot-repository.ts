// lib/intelligence/persistence/snapshot-repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Snapshot Repository
//
// Typed Supabase read/write API. The only module in CP-9 that touches
// the database directly.
//
// Architectural commitments:
//
//   1. Atomic writes — every snapshot bundle is written via the
//      cp9_insert_snapshot_bundle Postgres function, which inserts the
//      snapshot row + state summary + recovery history rows +
//      explainability traces in a single transaction. Partial writes
//      are impossible by construction.
//
//   2. Typed errors — Postgres errors are mapped to typed
//      PersistenceErrorCode values. The application layer never has to
//      parse SQLSTATE codes or error message strings; all errors arrive
//      shaped as PersistenceResult.
//
//   3. RLS respected — every query runs under the caller's auth.uid().
//      No service-role bypass at this layer. RLS denials surface as
//      typed errors, not silent empty results.
//
//   4. Immutability honored — no update or delete operations exposed.
//      Snapshots are append-only at the database AND at the API layer.
//      The only "edit" path is "create a new snapshot."
//
//   5. Direct supabase-js usage (Option 1, no adapter) — the
//      SupabaseClient is passed in by the caller. CP-9 does NOT own
//      client construction; the application supplies the client at the
//      call site.
//
//   6. PersistenceResult<T> discriminated union — no thrown exceptions
//      for expected error conditions. Unexpected errors (network
//      failures, malformed responses) are caught and mapped to
//      code="unknown".
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type {
  EvaluationSnapshot,
  EvaluationStateSummary,
  ExplainabilityTrace,
  RecoveryPathHistoryEntry,
  PersistenceError,
  PersistenceErrorCode,
  PersistenceResult,
  RecoveryItemKind,
} from "./types";
import type {
  ParentRecoveryItemsContext,
  SnapshotBuilderOutput,
} from "./snapshot-builder";
import {
  PERSISTENCE_MODULE_VERSION,
} from "./types";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construct a typed snapshot repository over a Supabase client.
 *
 * The repository is stateless — no caching, no connection pooling,
 * just typed wrappers over Supabase queries. Construct fresh per
 * request handler or share across handlers as the caller prefers.
 *
 * Pass any SupabaseClient — the calling code controls auth state.
 * For end-user requests, supply a client created with the user's
 * access token (auth.uid() resolves to the user). For server-side
 * cron / admin operations, supply a service-role client (RLS
 * bypassed; rely on application-layer authorization instead).
 */
export function createSnapshotRepository(
  client: SupabaseClient,
): SnapshotRepository {
  return new SnapshotRepository(client);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class SnapshotRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ──────────────────────────────────────────────────────────────────
  // WRITE API
  // ──────────────────────────────────────────────────────────────────

  /**
   * Write a SnapshotBuilderOutput atomically.
   *
   * Internally calls the cp9_insert_snapshot_bundle Postgres function.
   * The function runs in a single transaction; all four artifact
   * tables either receive their rows or none do.
   *
   * Returns the generated snapshot_id on success. Application code
   * uses this for subsequent reads or as the parent_snapshot_id for
   * descendant snapshots.
   *
   * Error mapping:
   *   - SQLSTATE 23505 (unique violation on (deal_id, hash))
   *       → PersistenceErrorCode.hash_collision_within_deal
   *   - SQLSTATE 23514 (check constraint violation)
   *       → unknown with the constraint name in context
   *   - SQLSTATE 42501 (insufficient_privilege — RLS denial)
   *       → PersistenceErrorCode.rls_access_denied
   *   - SQLSTATE P0001 (raise_exception — immutability trigger)
   *       → PersistenceErrorCode.snapshot_immutable_violation
   *   - Other Postgres errors → unknown with code in context
   *   - Network / unexpected errors → unknown
   */
  async writeSnapshot(
    bundle: SnapshotBuilderOutput,
  ): Promise<PersistenceResult<string>> {
    try {
      const { data, error } = await this.client.rpc(
        "cp9_insert_snapshot_bundle",
        {
          // Snapshot fields
          p_evaluation_id: bundle.snapshot.evaluation_id,
          p_deal_id: bundle.snapshot.deal_id,
          p_user_id: bundle.snapshot.user_id,
          p_team_id: bundle.snapshot.team_id,
          p_schema_version: bundle.snapshot.schema_version,
          p_cp_versions: bundle.snapshot.cp_versions,
          p_canonical_evaluation_hash:
            bundle.snapshot.canonical_evaluation_hash,
          p_replay_origin: bundle.snapshot.replay_origin,
          p_replay_source_snapshot_id:
            bundle.snapshot.replay_source_snapshot_id,
          p_raw_input_payload: bundle.snapshot.raw_input_payload,
          p_normalized_engine_inputs: bundle.snapshot.normalized_engine_inputs,
          p_artifact_payload: bundle.snapshot.artifact_payload,
          p_parent_snapshot_id: bundle.snapshot.lineage.parent_snapshot_id,
          p_root_evaluation_id: bundle.snapshot.lineage.root_evaluation_id,
          p_change_reason: bundle.snapshot.lineage.change_reason,
          p_change_description: bundle.snapshot.lineage.change_description,
          p_triggered_by: bundle.snapshot.lineage.triggered_by,
          p_triggered_by_event_id:
            bundle.snapshot.lineage.triggered_by_event_id,

          // State summary (passed as JSONB; the RPC unpacks)
          p_state_summary: bundle.state_summary,

          // Dependent rows
          p_recovery_path_history: bundle.recovery_path_history,
          p_explainability_traces: bundle.explainability_traces,
        },
      );

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          pg_details: error.details,
          pg_hint: error.hint,
          canonical_hash: bundle.canonical_evaluation_hash,
          deal_id: bundle.snapshot.deal_id,
        });
      }

      if (typeof data !== "string") {
        return makeError(
          "unknown",
          "cp9_insert_snapshot_bundle returned non-string data",
          { received: typeof data, canonical_hash: bundle.canonical_evaluation_hash },
        );
      }

      return { ok: true, value: data };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error during snapshot write: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { canonical_hash: bundle.canonical_evaluation_hash },
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // READ API — single snapshot
  // ──────────────────────────────────────────────────────────────────

  /**
   * Fetch a snapshot by its UUID.
   *
   * Returns snapshot_not_found if no row matches OR if RLS denies
   * visibility (Postgres returns empty for both cases — the
   * distinction is invisible to the application, which is correct
   * security behavior).
   */
  async getSnapshotById(
    snapshot_id: string,
  ): Promise<PersistenceResult<EvaluationSnapshot>> {
    try {
      const { data, error } = await this.client
        .from("evaluation_snapshots")
        .select("*")
        .eq("snapshot_id", snapshot_id)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          snapshot_id,
        });
      }

      if (!data) {
        return makeError(
          "snapshot_not_found",
          `snapshot ${snapshot_id} not found (or RLS-hidden)`,
          { snapshot_id },
        );
      }

      return { ok: true, value: rowToSnapshot(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { snapshot_id },
      );
    }
  }

  /**
   * Fetch a snapshot by its engine-side evaluation_id.
   *
   * Returns the first match (evaluation_id is not unique — multiple
   * snapshots can share an evaluation_id when forward-replayed,
   * though most evaluation_ids will have exactly one snapshot). For
   * the canonical "this evaluation's original snapshot," filter
   * caller-side by replay_origin = 'original' if needed.
   */
  async getSnapshotByEvaluationId(
    evaluation_id: string,
  ): Promise<PersistenceResult<EvaluationSnapshot>> {
    try {
      const { data, error } = await this.client
        .from("evaluation_snapshots")
        .select("*")
        .eq("evaluation_id", evaluation_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          evaluation_id,
        });
      }

      if (!data) {
        return makeError(
          "snapshot_not_found",
          `no snapshot found for evaluation_id ${evaluation_id}`,
          { evaluation_id },
        );
      }

      return { ok: true, value: rowToSnapshot(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching snapshot by evaluation_id: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { evaluation_id },
      );
    }
  }

  /**
   * Fetch the latest snapshot for a deal (most recent created_at).
   *
   * The dashboard's primary read path. Hits the
   * (deal_id, created_at desc) index for O(log n) retrieval even on
   * deals with hundreds of snapshots.
   */
  async getLatestSnapshotForDeal(
    deal_id: string,
  ): Promise<PersistenceResult<EvaluationSnapshot>> {
    try {
      const { data, error } = await this.client
        .from("evaluation_snapshots")
        .select("*")
        .eq("deal_id", deal_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          deal_id,
        });
      }

      if (!data) {
        return makeError(
          "snapshot_not_found",
          `no snapshots found for deal ${deal_id}`,
          { deal_id },
        );
      }

      return { ok: true, value: rowToSnapshot(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching latest deal snapshot: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { deal_id },
      );
    }
  }

  /**
   * Fetch a snapshot by deal_id + canonical_evaluation_hash. Useful
   * for dedup verification ("does a snapshot with this exact state
   * already exist for this deal?").
   */
  async getSnapshotByDealAndHash(
    deal_id: string,
    canonical_evaluation_hash: string,
  ): Promise<PersistenceResult<EvaluationSnapshot>> {
    try {
      const { data, error } = await this.client
        .from("evaluation_snapshots")
        .select("*")
        .eq("deal_id", deal_id)
        .eq("canonical_evaluation_hash", canonical_evaluation_hash)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          deal_id,
          canonical_evaluation_hash,
        });
      }

      if (!data) {
        return makeError(
          "snapshot_not_found",
          `no snapshot found for deal ${deal_id} with hash ${canonical_evaluation_hash}`,
          { deal_id, canonical_evaluation_hash },
        );
      }

      return { ok: true, value: rowToSnapshot(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching snapshot by hash: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { deal_id, canonical_evaluation_hash },
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // READ API — collections
  // ──────────────────────────────────────────────────────────────────

  /**
   * Fetch the full snapshot chain for a deal, oldest first.
   *
   * Returns all snapshots whose root_evaluation_id matches the deal's
   * root chain. For deals with multiple unrelated evaluation chains
   * (rare but possible), all are returned ordered by created_at.
   *
   * Caller-side filtering by root_evaluation_id can isolate a single
   * chain.
   */
  async getSnapshotChainForDeal(
    deal_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<EvaluationSnapshot>>> {
    try {
      const { data, error } = await this.client
        .from("evaluation_snapshots")
        .select("*")
        .eq("deal_id", deal_id)
        .order("created_at", { ascending: true });

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          deal_id,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawSnapshotRow>;
      return { ok: true, value: rows.map(rowToSnapshot) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching snapshot chain: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { deal_id },
      );
    }
  }

  /**
   * Fetch the state summary for a snapshot.
   *
   * Dashboard queries should call this rather than getSnapshotById,
   * since the summary is the indexed projection. JSONB blob is
   * skipped.
   */
  async getStateSummary(
    snapshot_id: string,
  ): Promise<PersistenceResult<EvaluationStateSummary>> {
    try {
      const { data, error } = await this.client
        .from("evaluation_state_summaries")
        .select("*")
        .eq("snapshot_id", snapshot_id)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          snapshot_id,
        });
      }

      if (!data) {
        return makeError(
          "snapshot_not_found",
          `no state summary found for snapshot ${snapshot_id}`,
          { snapshot_id },
        );
      }

      return { ok: true, value: rowToStateSummary(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching state summary: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { snapshot_id },
      );
    }
  }

  /**
   * Fetch the recovery path history rows for a snapshot.
   *
   * Used by the recovery-path-tracker module to compute lifecycle
   * queries.
   */
  async getRecoveryPathHistory(
    snapshot_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<RecoveryPathHistoryEntry>>> {
    try {
      const { data, error } = await this.client
        .from("recovery_path_history")
        .select("*")
        .eq("snapshot_id", snapshot_id)
        .order("item_kind", { ascending: true })
        .order("item_id", { ascending: true });

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          snapshot_id,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawRecoveryRow>;
      return { ok: true, value: rows.map(rowToRecoveryHistoryEntry) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching recovery history: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { snapshot_id },
      );
    }
  }

  /**
   * Fetch the explainability trace rows for a snapshot.
   *
   * Used by the explainability-ledger module to assemble the graph
   * view (forward chains, reverse chains, citation summaries).
   */
  async getExplainabilityTraces(
    snapshot_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<ExplainabilityTrace>>> {
    try {
      const { data, error } = await this.client
        .from("explainability_traces")
        .select("*")
        .eq("snapshot_id", snapshot_id)
        .order("fragment_id", { ascending: true })
        .order("trace_depth", { ascending: true });

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          snapshot_id,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawTraceRow>;
      return { ok: true, value: rows.map(rowToExplainabilityTrace) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching explainability traces: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { snapshot_id },
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // BUILDER LINEAGE SUPPORT
  // ──────────────────────────────────────────────────────────────────

  /**
   * Build a ParentRecoveryItemsContext from a parent snapshot, for use
   * by snapshot-builder when constructing a descendant.
   *
   * The snapshot-builder needs to know the parent's recovery items
   * (with their identity, target, lineage anchor, and satisfaction
   * state) to compute lifecycle status on the child.
   *
   * Returns null for missing parent (caller should pass null to
   * snapshot-builder in that case, which signals "initial snapshot").
   */
  async getParentRecoveryItemsContext(
    parent_snapshot_id: string,
  ): Promise<PersistenceResult<ParentRecoveryItemsContext | null>> {
    const recoveryResult = await this.getRecoveryPathHistory(parent_snapshot_id);
    if (!recoveryResult.ok) {
      // If the parent snapshot doesn't exist, propagate as missing
      if (recoveryResult.error.code === "snapshot_not_found") {
        return { ok: true, value: null };
      }
      return recoveryResult;
    }

    const items = recoveryResult.value.map((entry) => ({
      item_kind: entry.item_kind,
      item_id: entry.item_id,
      addresses_target_id: entry.addresses_target_id,
      first_seen_snapshot_id: entry.first_seen_snapshot_id,
      was_satisfied_at_parent: entry.status === "satisfied",
    }));

    return {
      ok: true,
      value: {
        parent_snapshot_id,
        items,
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTGRES ERROR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a PostgrestError to a typed PersistenceErrorCode based on its
 * SQLSTATE code.
 *
 * SQLSTATE codes used here are standard ANSI / Postgres codes:
 *   - 23505: unique_violation
 *   - 23514: check_violation
 *   - 42501: insufficient_privilege (RLS denial)
 *   - P0001: raise_exception (custom from our immutability trigger)
 *   - 0LP01: invalid_grant_operation
 *
 * The error code is the first signal we inspect. Message-level
 * matching (e.g., looking for "duplicate key value" in the error
 * message) is a fallback and is fragile across Postgres versions.
 */
function mapPostgresError(error: PostgrestError): PersistenceErrorCode {
  const code = error.code;
  const message = (error.message || "").toLowerCase();

  // SQLSTATE 23505: unique_violation
  if (code === "23505") {
    // Specifically check whether it's the (deal_id, canonical_evaluation_hash)
    // constraint
    if (
      message.includes("evaluation_snapshots_hash_per_deal_unique") ||
      message.includes("canonical_evaluation_hash")
    ) {
      return "hash_collision_within_deal";
    }
    // Other unique violations
    return "unknown";
  }

  // SQLSTATE 42501: insufficient_privilege (RLS denial)
  if (code === "42501") {
    return "rls_access_denied";
  }

  // SQLSTATE P0001: raise_exception (from cp9_reject_mutation trigger
  // or any other server-side RAISE)
  if (code === "P0001") {
    if (
      message.includes("append-only") ||
      message.includes("not permitted")
    ) {
      return "snapshot_immutable_violation";
    }
    return "unknown";
  }

  // SQLSTATE 23514: check_violation (cp_versions keys, artifact_payload
  // keys, hash format, replay_origin consistency)
  if (code === "23514") {
    if (message.includes("cp_versions")) return "cp_versions_missing_keys";
    if (message.includes("hash_format")) return "hash_format_invalid";
    if (message.includes("replay_source")) return "replay_source_required";
    return "unknown";
  }

  // SQLSTATE PGRST116: PostgREST "no rows found" — Supabase-specific
  // when using .single() instead of .maybeSingle(); our code uses
  // .maybeSingle() so this shouldn't fire, but defend anyway
  if (code === "PGRST116") {
    return "snapshot_not_found";
  }

  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW ROW TYPES
//
// Supabase queries return loosely-typed records. We define minimal row
// shapes for the explicit casts used in rowToX functions below.
// ─────────────────────────────────────────────────────────────────────────────

interface RawSnapshotRow {
  snapshot_id: string;
  evaluation_id: string;
  deal_id: string;
  user_id: string;
  team_id: string | null;
  schema_version: number;
  cp_versions: Record<string, string>;
  canonical_evaluation_hash: string;
  replay_origin: string;
  replay_source_snapshot_id: string | null;
  raw_input_payload: Record<string, unknown>;
  normalized_engine_inputs: Record<string, unknown>;
  artifact_payload: Record<string, unknown>;
  parent_snapshot_id: string | null;
  root_evaluation_id: string;
  change_reason: string;
  change_description: string | null;
  triggered_by: string | null;
  triggered_by_event_id: string | null;
  created_at: string;
}

interface RawStateSummaryRow {
  snapshot_id: string;
  deal_id: string;
  user_id: string;
  team_id: string | null;
  dominant_constraint_axis: string | null;
  dominant_constraint_band: string | null;
  dominant_constraint_repairability: string | null;
  highest_fragility_axis: string | null;
  interested_count: number;
  cautious_count: number;
  decline_count: number;
  closest_recoverable_profile: string | null;
  closest_recoverable_state: string | null;
  closest_recoverable_all_declined: boolean | null;
  fatal_signal_count: number;
  repairable_signal_count: number;
  deal_breaker_count: number;
  unresolved_comfort_conditions: number;
  satisfied_comfort_conditions: number;
  unresolved_recovery_priorities: number;
  is_coverage_gap: boolean;
  coverage_gap_affected_count: number;
  fingerprint_key: string;
  fingerprint_is_fallback: boolean;
  top_assumption_key: string | null;
  top_assumption_evidence_band: string | null;
  financial_score: number | null;
  durability_score: number | null;
  evidence_quality: number | null;
  assumption_fragility: number | null;
  underwriting_uncertainty: number | null;
  created_at: string;
  evaluated_at: string;
}

interface RawRecoveryRow {
  history_id: string;
  snapshot_id: string;
  deal_id: string;
  user_id: string;
  item_kind: string;
  item_id: string;
  item_label: string | null;
  status: string;
  related_personality_ids: ReadonlyArray<string>;
  related_axis_keys: ReadonlyArray<string>;
  addresses_target_id: string | null;
  first_seen_snapshot_id: string | null;
  last_seen_snapshot_id: string | null;
  resolved_at_snapshot_id: string | null;
  item_payload: Record<string, unknown> | null;
  created_at: string;
  evaluated_at: string;
}

interface RawTraceRow {
  trace_id: string;
  snapshot_id: string;
  deal_id: string;
  user_id: string;
  fragment_id: string;
  fragment_kind: string;
  artifact_type: string;
  artifact_id: string;
  trace_depth: number;
  parent_trace_id: string | null;
  artifact_metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW → TYPED ENTITY CONVERTERS
//
// Postgres returns the snapshot's lineage fields as flat columns; we
// reconstruct the nested EvaluationLineage object here. This keeps the
// SQL schema flat (good for indexes and queries) while the TypeScript
// API exposes structured types (good for ergonomics).
// ─────────────────────────────────────────────────────────────────────────────

function rowToSnapshot(row: RawSnapshotRow): EvaluationSnapshot {
  return {
    snapshot_id: row.snapshot_id,
    evaluation_id: row.evaluation_id,
    deal_id: row.deal_id,
    user_id: row.user_id,
    team_id: row.team_id,
    schema_version: row.schema_version as 1,
    cp_versions: {
      cp2: row.cp_versions.cp2,
      cp3: row.cp_versions.cp3,
      cp4: row.cp_versions.cp4,
      cp5: row.cp_versions.cp5,
      cp6: row.cp_versions.cp6,
      cp7: row.cp_versions.cp7,
      cp8: row.cp_versions.cp8,
    },
    canonical_evaluation_hash: row.canonical_evaluation_hash,
    replay_origin: row.replay_origin as EvaluationSnapshot["replay_origin"],
    replay_source_snapshot_id: row.replay_source_snapshot_id,
    raw_input_payload: row.raw_input_payload,
    normalized_engine_inputs:
      row.normalized_engine_inputs as EvaluationSnapshot["normalized_engine_inputs"],
    artifact_payload:
      row.artifact_payload as unknown as EvaluationSnapshot["artifact_payload"],
    lineage: {
      parent_snapshot_id: row.parent_snapshot_id,
      root_evaluation_id: row.root_evaluation_id,
      change_reason: row.change_reason as EvaluationSnapshot["lineage"]["change_reason"],
      change_description: row.change_description,
      triggered_by: row.triggered_by,
      triggered_by_event_id: row.triggered_by_event_id,
    },
    created_at: row.created_at,
  };
}

function rowToStateSummary(row: RawStateSummaryRow): EvaluationStateSummary {
  return {
    snapshot_id: row.snapshot_id,
    deal_id: row.deal_id,
    user_id: row.user_id,
    team_id: row.team_id,
    dominant_constraint_axis:
      row.dominant_constraint_axis as EvaluationStateSummary["dominant_constraint_axis"],
    dominant_constraint_band: row.dominant_constraint_band,
    dominant_constraint_repairability:
      row.dominant_constraint_repairability as EvaluationStateSummary["dominant_constraint_repairability"],
    highest_fragility_axis:
      row.highest_fragility_axis as EvaluationStateSummary["highest_fragility_axis"],
    interested_count: row.interested_count,
    cautious_count: row.cautious_count,
    decline_count: row.decline_count,
    closest_recoverable_profile:
      row.closest_recoverable_profile as EvaluationStateSummary["closest_recoverable_profile"],
    closest_recoverable_state:
      row.closest_recoverable_state as EvaluationStateSummary["closest_recoverable_state"],
    closest_recoverable_all_declined: row.closest_recoverable_all_declined,
    fatal_signal_count: row.fatal_signal_count,
    repairable_signal_count: row.repairable_signal_count,
    deal_breaker_count: row.deal_breaker_count,
    unresolved_comfort_conditions: row.unresolved_comfort_conditions,
    satisfied_comfort_conditions: row.satisfied_comfort_conditions,
    unresolved_recovery_priorities: row.unresolved_recovery_priorities,
    is_coverage_gap: row.is_coverage_gap,
    coverage_gap_affected_count: row.coverage_gap_affected_count,
    fingerprint_key: row.fingerprint_key,
    fingerprint_is_fallback: row.fingerprint_is_fallback,
    top_assumption_key: row.top_assumption_key,
    top_assumption_evidence_band:
      row.top_assumption_evidence_band as EvaluationStateSummary["top_assumption_evidence_band"],
    financial_score: row.financial_score,
    durability_score: row.durability_score,
    evidence_quality: row.evidence_quality,
    assumption_fragility: row.assumption_fragility,
    underwriting_uncertainty: row.underwriting_uncertainty,
    created_at: row.created_at,
    evaluated_at: row.evaluated_at,
  };
}

function rowToRecoveryHistoryEntry(
  row: RawRecoveryRow,
): RecoveryPathHistoryEntry {
  return {
    history_id: row.history_id,
    snapshot_id: row.snapshot_id,
    deal_id: row.deal_id,
    user_id: row.user_id,
    item_kind: row.item_kind as RecoveryItemKind,
    item_id: row.item_id,
    item_label: row.item_label,
    status: row.status as RecoveryPathHistoryEntry["status"],
    related_personality_ids:
      row.related_personality_ids as RecoveryPathHistoryEntry["related_personality_ids"],
    related_axis_keys:
      row.related_axis_keys as RecoveryPathHistoryEntry["related_axis_keys"],
    addresses_target_id: row.addresses_target_id,
    first_seen_snapshot_id: row.first_seen_snapshot_id,
    last_seen_snapshot_id: row.last_seen_snapshot_id,
    resolved_at_snapshot_id: row.resolved_at_snapshot_id,
    item_payload: row.item_payload,
    created_at: row.created_at,
    evaluated_at: row.evaluated_at,
  };
}

function rowToExplainabilityTrace(row: RawTraceRow): ExplainabilityTrace {
  return {
    trace_id: row.trace_id,
    snapshot_id: row.snapshot_id,
    deal_id: row.deal_id,
    user_id: row.user_id,
    fragment_id: row.fragment_id,
    fragment_kind: row.fragment_kind,
    artifact_type: row.artifact_type as ExplainabilityTrace["artifact_type"],
    artifact_id: row.artifact_id,
    trace_depth: row.trace_depth,
    parent_trace_id: row.parent_trace_id,
    artifact_metadata: row.artifact_metadata,
    created_at: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

function makeError<T>(
  code: PersistenceError["code"],
  message: string,
  context: Record<string, unknown>,
): PersistenceResult<T> {
  return {
    ok: false,
    error: { code, message, context },
  };
}
