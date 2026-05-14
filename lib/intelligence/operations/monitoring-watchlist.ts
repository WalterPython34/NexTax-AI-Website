// lib/intelligence/operations/monitoring-watchlist.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Monitoring Watchlist
//
// Two responsibilities:
//
//   1. CRUD over operations_watchlist_entries (mutable user
//      configuration; user-only RLS; three-scope abstraction).
//
//   2. Pull-only firing evaluation — given watchlist entries and the
//      operational primitives already detected for a snapshot
//      (MaterialChange[], StalledPath[], StructuralTrajectory[],
//      ReadinessClassification), match against each entry's
//      trigger_kind + scope and produce WatchlistFiring[].
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #2 (Scope Abstraction) — `deal` and `global` scopes
//   fully implemented for evaluation. `portfolio` scope CRUD works
//   (entries stored), but firing evaluation returns the typed
//   `portfolio_scope_not_yet_implemented` error code. Portfolio
//   filtering belongs to a future checkpoint.
//
//   Invariant #3 (Observation Provenance) — every firing carries
//   provenance. Firings are computed-on-demand, never stored.
//
//   Invariant #4 (No Aggregate Scores) — output is the firing list
//   (categorical). No "alert score" or "notification priority"
//   numeric field.
//
//   Invariant #5 (Boundary Enforcement) — module-load self-test
//   validates BOUNDARY_METADATA. No banned imports, no banned field
//   patterns, no nondeterminism beyond the carveout.
//
// Pull-only firing semantics:
//
//   Firings are NEVER stored in CP-10. They are computed each time
//   the user queries the watchlist. This means:
//     - No firings table needed
//     - No background workers
//     - No notification state tracking
//     - No race conditions on idempotency
//
//   The trade-off: the user must "pull" — the watchlist surfaces
//   what's true RIGHT NOW based on the latest snapshot + history.
//   Push semantics (background-fire-and-notify) can be added later
//   as an infrastructure concern outside CP-10.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type {
  MaterialChange,
  ObservationProvenance,
  OperationsError,
  OperationsErrorCode,
  OperationsResult,
  PortfolioFilter,
  ReadinessClassification,
  StalledPath,
  StructuralTrajectory,
  ThresholdManifest,
  WatchlistEntry,
  WatchlistEntryInsert,
  WatchlistFiring,
  WatchlistFiringPrimitive,
  WatchlistScopeKind,
  WatchlistTriggerKind,
} from "./types";
import { OPERATIONS_MODULE_VERSION } from "./types";
import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";
import {
  assertBoundaryMetadata,
  BoundaryEnforcementError,
} from "./__boundary__/runtime-assertions";

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

export function createWatchlistRepository(
  client: SupabaseClient,
): WatchlistRepository {
  return new WatchlistRepository(client);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class WatchlistRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ──────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Create a new watchlist entry for the calling user.
   *
   * RLS ensures user_id = auth.uid() at the database level. The
   * scope_consistency CHECK constraint rejects invalid
   * (scope_kind, deal_id, portfolio_filter) combinations.
   *
   * Returns the generated entry_id on success.
   */
  async createEntry(
    insert: WatchlistEntryInsert,
  ): Promise<OperationsResult<string>> {
    // Validate the insert payload before submission — gives a clearer
    // error message than the DB constraint violation
    const validation = validateEntryInsert(insert);
    if (!validation.ok) return validation;

    try {
      const { data, error } = await this.client
        .from("operations_watchlist_entries")
        .insert({
          user_id: insert.user_id,
          team_id: insert.team_id,
          scope_kind: insert.scope_kind,
          deal_id: insert.deal_id,
          portfolio_filter: insert.portfolio_filter,
          trigger_kind: insert.trigger_kind,
        })
        .select("entry_id")
        .single();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          scope_kind: insert.scope_kind,
          trigger_kind: insert.trigger_kind,
        });
      }
      if (!data || typeof data.entry_id !== "string") {
        return makeError("unknown", "create entry returned no entry_id", {
          scope_kind: insert.scope_kind,
        });
      }
      return { ok: true, value: data.entry_id };
    } catch (err) {
      return makeError(
        "unknown",
        "unexpected error creating watchlist entry: " +
          (err instanceof Error ? err.message : String(err)),
        {},
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────────────────────

  async getEntry(
    entry_id: string,
  ): Promise<OperationsResult<WatchlistEntry>> {
    try {
      const { data, error } = await this.client
        .from("operations_watchlist_entries")
        .select("*")
        .eq("entry_id", entry_id)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          entry_id,
        });
      }
      if (!data) {
        return makeError(
          "watchlist_entry_not_found",
          "watchlist entry " + entry_id + " not found (or RLS-hidden)",
          { entry_id },
        );
      }
      return { ok: true, value: rowToEntry(data) };
    } catch (err) {
      return makeError(
        "unknown",
        "unexpected error reading watchlist entry: " +
          (err instanceof Error ? err.message : String(err)),
        { entry_id },
      );
    }
  }

  /**
   * List the caller's watchlist entries.
   *
   * Options:
   *   - enabled_only: filter to enabled entries (default true)
   *   - deal_id: filter to entries scoped to a specific deal
   *   - scope_kind: filter by scope kind
   */
  async listEntries(options?: {
    readonly enabled_only?: boolean;
    readonly deal_id?: string;
    readonly scope_kind?: WatchlistScopeKind;
  }): Promise<OperationsResult<ReadonlyArray<WatchlistEntry>>> {
    try {
      let query = this.client
        .from("operations_watchlist_entries")
        .select("*")
        .order("created_at", { ascending: false });

      const enabledOnly = options?.enabled_only ?? true;
      if (enabledOnly) {
        query = query.eq("enabled", true);
      }
      if (options?.deal_id !== undefined) {
        query = query.eq("deal_id", options.deal_id);
      }
      if (options?.scope_kind !== undefined) {
        query = query.eq("scope_kind", options.scope_kind);
      }

      const { data, error } = await query;
      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawEntryRow>;
      return { ok: true, value: rows.map(rowToEntry) };
    } catch (err) {
      return makeError(
        "unknown",
        "unexpected error listing watchlist entries: " +
          (err instanceof Error ? err.message : String(err)),
        {},
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Update an existing watchlist entry. Only `enabled` and
   * `trigger_config` are mutable — scope_kind, deal_id,
   * portfolio_filter, and trigger_kind are NOT editable (changing
   * them would change the entry's identity; users should delete and
   * recreate instead).
   *
   * The updated_at trigger automatically stamps modification time.
   */
  async updateEntry(
    entry_id: string,
    updates: {
      readonly enabled?: boolean;
      readonly trigger_config?: Record<string, unknown>;
    },
  ): Promise<OperationsResult<true>> {
    if (
      updates.enabled === undefined &&
      updates.trigger_config === undefined
    ) {
      return { ok: true, value: true }; // no-op
    }

    try {
      const patch: Record<string, unknown> = {};
      if (updates.enabled !== undefined) patch.enabled = updates.enabled;
      if (updates.trigger_config !== undefined)
        patch.trigger_config = updates.trigger_config;

      const { error } = await this.client
        .from("operations_watchlist_entries")
        .update(patch)
        .eq("entry_id", entry_id);

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          entry_id,
        });
      }
      return { ok: true, value: true };
    } catch (err) {
      return makeError(
        "unknown",
        "unexpected error updating watchlist entry: " +
          (err instanceof Error ? err.message : String(err)),
        { entry_id },
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────

  async deleteEntry(entry_id: string): Promise<OperationsResult<true>> {
    try {
      const { error } = await this.client
        .from("operations_watchlist_entries")
        .delete()
        .eq("entry_id", entry_id);

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          entry_id,
        });
      }
      return { ok: true, value: true };
    } catch (err) {
      return makeError(
        "unknown",
        "unexpected error deleting watchlist entry: " +
          (err instanceof Error ? err.message : String(err)),
        { entry_id },
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRING EVALUATION
//
// Pure function — no IO. Caller fetches the entries (via repository)
// and the operational primitives (from the detector modules), then
// invokes this evaluator. The evaluator matches entries against
// primitives and produces firings.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluateFiringsInput {
  /**
   * The watchlist entries to evaluate. Caller is responsible for
   * filtering to enabled entries that scope to the given deal/snapshot.
   */
  readonly entries: ReadonlyArray<WatchlistEntry>;
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly thresholds: ThresholdManifest;
  /** Primitives detected for this snapshot (orchestrator pre-computes) */
  readonly material_changes: ReadonlyArray<MaterialChange>;
  readonly stalled_paths: ReadonlyArray<StalledPath>;
  readonly structural_trajectories: ReadonlyArray<StructuralTrajectory>;
  readonly readiness_classification: ReadinessClassification | null;
  readonly previous_readiness_classification: ReadinessClassification | null;
  readonly computed_at?: string;
}

/**
 * Evaluate watchlist entries against the operational primitives.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * Returns a list of firings, one per entry that matched at least one
 * primitive. Entries with no matches do not appear in the output.
 *
 * Each firing carries the FULL matched primitive (with its own
 * provenance) so the firing is self-contained for audit.
 *
 * Scope handling:
 *   - deal scope: evaluator confirms entry.deal_id === snapshot.deal_id;
 *     entries scoped to other deals are skipped entirely.
 *   - global scope: evaluator processes the entry against this
 *     snapshot's primitives.
 *   - portfolio scope: evaluator does NOT produce firings — portfolio
 *     filtering is reserved for a future checkpoint. Portfolio entries
 *     are silently skipped (not an error — caller can introspect via
 *     the returned `not_yet_implemented_portfolio_count` field).
 */
export interface EvaluateFiringsResult {
  readonly firings: ReadonlyArray<WatchlistFiring>;
  /**
   * Count of portfolio-scope entries that were skipped. Not an
   * error — informational only so the caller can warn users that
   * their portfolio entries aren't being evaluated yet.
   */
  readonly not_yet_implemented_portfolio_count: number;
  readonly provenance: ObservationProvenance;
}

export function evaluateFirings(
  input: EvaluateFiringsInput,
): EvaluateFiringsResult {
  const {
    entries,
    snapshot_id,
    deal_id,
    thresholds,
    material_changes,
    stalled_paths,
    structural_trajectories,
    readiness_classification,
    previous_readiness_classification,
    computed_at,
  } = input;

  const provenance = buildEvaluationProvenance(
    snapshot_id,
    thresholds,
    computed_at,
  );

  const firings: WatchlistFiring[] = [];
  let portfolioSkipped = 0;
  let firingCounter = 0;

  for (const entry of entries) {
    if (!entry.enabled) continue;

    // Scope handling
    if (entry.scope_kind === "portfolio") {
      portfolioSkipped += 1;
      continue;
    }
    if (entry.scope_kind === "deal" && entry.deal_id !== deal_id) {
      continue; // entry scoped to a different deal
    }
    // global scope: always applies to the given deal

    // Match against primitives based on trigger_kind
    const matchedPrimitives = matchTrigger(
      entry.trigger_kind,
      material_changes,
      stalled_paths,
      structural_trajectories,
      readiness_classification,
      previous_readiness_classification,
    );

    for (const primitive of matchedPrimitives) {
      firingCounter += 1;
      firings.push({
        firing_id: deterministicFiringId(
          entry.entry_id,
          snapshot_id,
          firingCounter,
        ),
        entry_id: entry.entry_id,
        fired_at: provenance.computed_at,
        detected_in_snapshot_id: snapshot_id,
        trigger_kind: entry.trigger_kind,
        detected_primitive: primitive,
        provenance,
      });
    }
  }

  // Deterministic ordering
  firings.sort(firingOrder);

  return {
    firings,
    not_yet_implemented_portfolio_count: portfolioSkipped,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER MATCHING
// ─────────────────────────────────────────────────────────────────────────────

function matchTrigger(
  trigger_kind: WatchlistTriggerKind,
  material_changes: ReadonlyArray<MaterialChange>,
  stalled_paths: ReadonlyArray<StalledPath>,
  structural_trajectories: ReadonlyArray<StructuralTrajectory>,
  readiness_classification: ReadinessClassification | null,
  previous_readiness_classification: ReadinessClassification | null,
): ReadonlyArray<WatchlistFiringPrimitive> {
  const primitives: WatchlistFiringPrimitive[] = [];

  switch (trigger_kind) {
    case "material_change": {
      // Fire on every notable+ material change (informational changes
      // do not fire — they're noise)
      for (const change of material_changes) {
        if (change.severity === "informational") continue;
        primitives.push({
          trigger_kind: "material_change",
          primitive: change,
        });
      }
      break;
    }

    case "stalled_path": {
      // Fire on every stalled path
      for (const path of stalled_paths) {
        primitives.push({
          trigger_kind: "stalled_path",
          primitive: path,
        });
      }
      break;
    }

    case "structural_worsening": {
      // Fire on each structural concern whose trajectory is worsening
      // or intermittent (both indicate negative direction)
      for (const traj of structural_trajectories) {
        if (
          traj.trajectory === "worsening" ||
          traj.trajectory === "intermittent"
        ) {
          primitives.push({
            trigger_kind: "structural_worsening",
            primitive: traj,
          });
        }
      }
      break;
    }

    case "readiness_state_change": {
      // Fire if the current classification differs from the previous
      if (
        readiness_classification !== null &&
        previous_readiness_classification !== null &&
        readiness_classification.classification !==
          previous_readiness_classification.classification
      ) {
        primitives.push({
          trigger_kind: "readiness_state_change",
          primitive: readiness_classification,
        });
      }
      break;
    }

    case "regression": {
      // Fire on regression-flavored material changes (comfort condition
      // regressed) and regression-flavored stalled paths
      for (const change of material_changes) {
        if (change.change_kind === "comfort_condition_regressed") {
          primitives.push({
            trigger_kind: "material_change",
            primitive: change,
          });
        }
      }
      for (const path of stalled_paths) {
        if (path.stall_reason === "regressed_after_satisfaction") {
          primitives.push({
            trigger_kind: "stalled_path",
            primitive: path,
          });
        }
      }
      break;
    }
  }

  return primitives;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC FIRING_ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic firing_id from entry_id + snapshot_id +
 * counter. Same inputs → same firing_id. The counter ensures
 * uniqueness when one entry fires multiple primitives.
 *
 * Format: "fire-{entry-short}-{snap-short}-{counter}"
 */
function deterministicFiringId(
  entry_id: string,
  snapshot_id: string,
  counter: number,
): string {
  const entryShort = entry_id.replace(/-/g, "").slice(0, 8);
  const snapShort = snapshot_id.replace(/-/g, "").slice(0, 8);
  return "fire-" + entryShort + "-" + snapShort + "-" + counter;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ORDERING
// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_RANK: Record<WatchlistTriggerKind, number> = {
  regression: 0,
  structural_worsening: 1,
  material_change: 2,
  stalled_path: 3,
  readiness_state_change: 4,
};

function firingOrder(a: WatchlistFiring, b: WatchlistFiring): number {
  const rankDiff =
    TRIGGER_RANK[a.trigger_kind] - TRIGGER_RANK[b.trigger_kind];
  if (rankDiff !== 0) return rankDiff;
  if (a.entry_id !== b.entry_id) return a.entry_id < b.entry_id ? -1 : 1;
  if (a.firing_id !== b.firing_id) return a.firing_id < b.firing_id ? -1 : 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validateEntryInsert(
  insert: WatchlistEntryInsert,
): OperationsResult<true> {
  // Scope consistency
  if (insert.scope_kind === "deal") {
    if (typeof insert.deal_id !== "string" || insert.deal_id.length === 0) {
      return makeError(
        "unknown",
        "deal-scope entries require non-empty deal_id",
        { scope_kind: "deal" },
      );
    }
    if (insert.portfolio_filter !== null) {
      return makeError(
        "unknown",
        "deal-scope entries must have portfolio_filter=null",
        { scope_kind: "deal" },
      );
    }
  } else if (insert.scope_kind === "portfolio") {
    if (insert.deal_id !== null) {
      return makeError(
        "unknown",
        "portfolio-scope entries must have deal_id=null",
        { scope_kind: "portfolio" },
      );
    }
    if (insert.portfolio_filter === null) {
      return makeError(
        "unknown",
        "portfolio-scope entries require portfolio_filter",
        { scope_kind: "portfolio" },
      );
    }
    if (!isValidPortfolioFilter(insert.portfolio_filter)) {
      return makeError(
        "unknown",
        "portfolio_filter must have filter_kind and filter_value_text",
        { scope_kind: "portfolio" },
      );
    }
  } else if (insert.scope_kind === "global") {
    if (insert.deal_id !== null) {
      return makeError(
        "unknown",
        "global-scope entries must have deal_id=null",
        { scope_kind: "global" },
      );
    }
    if (insert.portfolio_filter !== null) {
      return makeError(
        "unknown",
        "global-scope entries must have portfolio_filter=null",
        { scope_kind: "global" },
      );
    }
  } else {
    return makeError(
      "unknown",
      "scope_kind must be deal, portfolio, or global",
      { scope_kind: insert.scope_kind },
    );
  }

  return { ok: true, value: true };
}

function isValidPortfolioFilter(f: PortfolioFilter | null): boolean {
  if (f === null) return false;
  if (typeof f.filter_kind !== "string") return false;
  if (typeof f.filter_value_text !== "string") return false;
  const validKinds: ReadonlyArray<string> = [
    "industry_key",
    "axis_band",
    "trajectory",
    "related_event_type",
    "owner",
    "fingerprint_fallback",
    "readiness_classification",
  ];
  return validKinds.includes(f.filter_kind);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function buildEvaluationProvenance(
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
// POSTGRES ERROR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function mapPostgresError(error: PostgrestError): OperationsErrorCode {
  const code = error.code;
  if (code === "42501") return "rls_access_denied";
  if (code === "23514") return "unknown"; // check_violation — validation should catch
  if (code === "PGRST116") return "watchlist_entry_not_found";
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW ROW CONVERTER
// ─────────────────────────────────────────────────────────────────────────────

interface RawEntryRow {
  entry_id: string;
  user_id: string;
  team_id: string | null;
  scope_kind: string;
  deal_id: string | null;
  portfolio_filter: PortfolioFilter | null;
  trigger_kind: string;
  trigger_config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function rowToEntry(row: RawEntryRow): WatchlistEntry {
  return {
    entry_id: row.entry_id,
    user_id: row.user_id,
    team_id: row.team_id,
    scope_kind: row.scope_kind as WatchlistScopeKind,
    deal_id: row.deal_id,
    portfolio_filter: row.portfolio_filter,
    trigger_kind: row.trigger_kind as WatchlistTriggerKind,
    enabled: row.enabled,
    created_at: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HELPER
// ─────────────────────────────────────────────────────────────────────────────

function makeError<T>(
  code: OperationsError["code"],
  message: string,
  context: Record<string, unknown>,
): OperationsResult<T> {
  return {
    ok: false,
    error: { code, message, context },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA + SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/monitoring-watchlist",
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
        `CP-10 monitoring-watchlist BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
