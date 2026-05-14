// lib/intelligence/operations/threshold-manifest.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Threshold Manifest Repository
//
// Append-only wrapper around operations_threshold_manifests. Matches
// CP-9's repository pattern: typed methods, OperationsResult<T> return
// shape, RLS-respecting reads, no mutation methods exposed.
//
// CONSTITUTIONAL INVARIANTS ENFORCED HERE:
//
//   Invariant #1 (Threshold Manifest) — every CP-10 primitive
//   references a manifest_id. This module is the only path that
//   produces or retrieves them. Once created, a manifest cannot be
//   modified (DB trigger enforces this at the row level; the typed
//   API exposes no update/delete methods).
//
//   Invariant #5 (Boundary Enforcement) — module-load self-test
//   validates BOUNDARY_METADATA. No banned imports, no banned field
//   patterns, no nondeterministic API usage outside the carveout
//   (Date.now is permitted for stamping created_at and computed_at).
//
// Manifest_id derivation:
//   - Platform defaults: semantic version string (e.g.,
//     "cp10-defaults-v0.1.0"). Stable across deployments.
//   - User manifests: SHA-256 hash of canonical-JSON-serialized
//     threshold values, prefixed "mft-". Same threshold configuration
//     → same manifest_id (deduplication).
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from "crypto";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type {
  OperationsError,
  OperationsErrorCode,
  OperationsResult,
  ThresholdManifest,
  ThresholdManifestInsert,
} from "./types";
import { OPERATIONS_MODULE_VERSION } from "./types";
import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";
import {
  assertBoundaryMetadata,
  BoundaryEnforcementError,
} from "./__boundary__/runtime-assertions";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The semantic manifest_id of the platform-shipped default manifest.
 * Matches the seed inserted by the CP-10 SQL migration.
 *
 * CP-10 modules that need a manifest without specifying one use this
 * id. The default manifest carries the same threshold values defined
 * in DEFAULT_THRESHOLD_MANIFEST_VALUES below.
 */
export const PLATFORM_DEFAULT_MANIFEST_ID = "cp10-defaults-v0.1.0";

/**
 * The threshold values carried by the platform default manifest.
 *
 * These values MUST match the SQL seed in the CP-10 migration. The
 * `cp10-defaults-v0.1.0` string is the binding contract — both this
 * constant and the SQL insert must reference it; tests verify
 * agreement.
 *
 * Pure constant. Available offline (no DB query needed). Useful for
 * testing, fallback logic, and as the source-of-truth reference when
 * computing what threshold values the platform defaults should carry.
 */
export const DEFAULT_THRESHOLD_MANIFEST_VALUES: ThresholdManifest = {
  manifest_id: PLATFORM_DEFAULT_MANIFEST_ID,
  version: PLATFORM_DEFAULT_MANIFEST_ID,
  schema_version: 1,
  created_at: "2026-05-14T00:00:00.000Z", // bookkeeping; actual server value used at DB level

  // Stalled path detection
  stalled_days_default: 14,
  stalled_snapshots_default: 3,

  // Chronic classification
  chronic_snapshot_threshold: 3,
  chronic_days_threshold: 30,

  // Regression detection
  regression_window_days: 30,

  // Material change classification
  material_score_delta_threshold: 8,
  material_band_change_severity_significant: 2,
  material_band_change_severity_notable: 1,

  // Structural trajectory
  worsening_window_snapshots: 3,
  intermittent_oscillation_threshold: 2,

  // Impact ranking
  critical_personality_breadth: 3,
  high_personality_breadth: 2,

  // Readiness classification
  readiness_min_evidence_score: 50,
  readiness_min_interested_count: 1,
  readiness_max_structural_concern_count: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

export function createThresholdManifestRepository(
  client: SupabaseClient,
): ThresholdManifestRepository {
  return new ThresholdManifestRepository(client);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class ThresholdManifestRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // ──────────────────────────────────────────────────────────────────
  // READ API
  // ──────────────────────────────────────────────────────────────────

  /**
   * Fetch the platform default manifest.
   *
   * Returns the manifest with id PLATFORM_DEFAULT_MANIFEST_ID.
   * Available to every user via RLS (is_platform_default = true).
   */
  async getDefaultManifest(): Promise<OperationsResult<ThresholdManifest>> {
    return this.getManifestById(PLATFORM_DEFAULT_MANIFEST_ID);
  }

  /**
   * Fetch a manifest by its id.
   *
   * RLS returns:
   *   - The manifest if is_platform_default = true (visible to all)
   *   - The manifest if user_id = auth.uid() (visible to owner)
   *   - manifest_not_found otherwise
   */
  async getManifestById(
    manifest_id: string,
  ): Promise<OperationsResult<ThresholdManifest>> {
    try {
      const { data, error } = await this.client
        .from("operations_threshold_manifests")
        .select("*")
        .eq("manifest_id", manifest_id)
        .maybeSingle();

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          manifest_id,
        });
      }
      if (!data) {
        return makeError(
          "manifest_not_found",
          `threshold manifest ${manifest_id} not found (or RLS-hidden)`,
          { manifest_id },
        );
      }

      return { ok: true, value: rowToManifest(data) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error fetching manifest: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { manifest_id },
      );
    }
  }

  /**
   * List all manifests visible to the current user (their own + platform
   * defaults), newest first.
   */
  async listVisibleManifests(): Promise<
    OperationsResult<ReadonlyArray<ThresholdManifest>>
  > {
    try {
      const { data, error } = await this.client
        .from("operations_threshold_manifests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
        });
      }

      const rows = (data ?? []) as ReadonlyArray<RawManifestRow>;
      return { ok: true, value: rows.map(rowToManifest) };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error listing manifests: ${
          err instanceof Error ? err.message : String(err)
        }`,
        {},
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // WRITE API
  // ──────────────────────────────────────────────────────────────────

  /**
   * Create a new user-owned threshold manifest.
   *
   * The manifest_id is computed as the SHA-256 hash of the canonical
   * JSON of the threshold values, prefixed with "mft-". Same
   * threshold configuration → same manifest_id (deduplication).
   *
   * If a manifest with the computed id already exists (i.e., the user
   * is creating an identical configuration), returns the existing
   * manifest_id with ok=true. This is idempotent by design — manifests
   * are immutable and content-addressable.
   *
   * Validates threshold relationships before insert:
   *   - high_personality_breadth <= critical_personality_breadth
   *   - All counts non-negative
   *   - intermittent_oscillation_threshold > 0
   *   - worsening_window_snapshots > 0
   *
   * Returns the new manifest_id on success.
   */
  async createManifest(
    user_id: string,
    team_id: string | null,
    values: ThresholdManifestInsert,
  ): Promise<OperationsResult<string>> {
    // Validate threshold relationships
    const validation = validateThresholdValues(values);
    if (!validation.ok) return validation;

    // Compute content-derived manifest_id
    const manifest_id = computeManifestId(values);

    // Idempotency check — if a manifest with this id already exists,
    // return it rather than failing on conflict
    const existing = await this.getManifestById(manifest_id);
    if (existing.ok) {
      // Manifest exists; if it's not owned by this user, that's still
      // fine — the content is identical, and content-addressable
      // manifests don't carry ownership semantics.
      return { ok: true, value: manifest_id };
    }
    // If error is anything other than manifest_not_found, propagate
    if (existing.error.code !== "manifest_not_found") {
      return existing;
    }

    try {
      const { error } = await this.client
        .from("operations_threshold_manifests")
        .insert({
          manifest_id,
          version: values.version,
          schema_version: values.schema_version,
          user_id,
          team_id,
          is_platform_default: false,
          stalled_days_default: values.stalled_days_default,
          stalled_snapshots_default: values.stalled_snapshots_default,
          chronic_snapshot_threshold: values.chronic_snapshot_threshold,
          chronic_days_threshold: values.chronic_days_threshold,
          regression_window_days: values.regression_window_days,
          material_score_delta_threshold:
            values.material_score_delta_threshold,
          material_band_change_severity_significant:
            values.material_band_change_severity_significant,
          material_band_change_severity_notable:
            values.material_band_change_severity_notable,
          worsening_window_snapshots: values.worsening_window_snapshots,
          intermittent_oscillation_threshold:
            values.intermittent_oscillation_threshold,
          critical_personality_breadth: values.critical_personality_breadth,
          high_personality_breadth: values.high_personality_breadth,
          readiness_min_evidence_score: values.readiness_min_evidence_score,
          readiness_min_interested_count:
            values.readiness_min_interested_count,
          readiness_max_structural_concern_count:
            values.readiness_max_structural_concern_count,
        });

      if (error) {
        // Race condition: another transaction inserted the same
        // manifest_id between our existence check and our insert.
        // Treat as idempotent success.
        if (error.code === "23505") {
          return { ok: true, value: manifest_id };
        }
        return makeError(mapPostgresError(error), error.message, {
          pg_code: error.code,
          manifest_id,
        });
      }

      return { ok: true, value: manifest_id };
    } catch (err) {
      return makeError(
        "unknown",
        `unexpected error creating manifest: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { manifest_id },
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // NO UPDATE / DELETE METHODS
  //
  // Manifests are append-only. The DB trigger rejects mutations; the
  // typed API exposes no methods to invoke them.
  // ──────────────────────────────────────────────────────────────────
}

// ─────────────────────────────────────────────────────────────────────────────
// MANIFEST_ID COMPUTATION
//
// Content-derived deterministic hash. Same threshold values → same id.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the deterministic manifest_id for a set of threshold values.
 *
 * Uses canonical JSON serialization (keys sorted, numbers normalized)
 * + SHA-256 + "mft-" prefix. Identical inputs always produce the same
 * id regardless of order.
 *
 * Pure function. No nondeterminism.
 */
export function computeManifestId(values: ThresholdManifestInsert): string {
  const canonicalInput = {
    version: values.version,
    schema_version: values.schema_version,
    stalled_days_default: values.stalled_days_default,
    stalled_snapshots_default: values.stalled_snapshots_default,
    chronic_snapshot_threshold: values.chronic_snapshot_threshold,
    chronic_days_threshold: values.chronic_days_threshold,
    regression_window_days: values.regression_window_days,
    material_score_delta_threshold: values.material_score_delta_threshold,
    material_band_change_severity_significant:
      values.material_band_change_severity_significant,
    material_band_change_severity_notable:
      values.material_band_change_severity_notable,
    worsening_window_snapshots: values.worsening_window_snapshots,
    intermittent_oscillation_threshold:
      values.intermittent_oscillation_threshold,
    critical_personality_breadth: values.critical_personality_breadth,
    high_personality_breadth: values.high_personality_breadth,
    readiness_min_evidence_score: values.readiness_min_evidence_score,
    readiness_min_interested_count: values.readiness_min_interested_count,
    readiness_max_structural_concern_count:
      values.readiness_max_structural_concern_count,
  };

  const json = canonicalJSON(canonicalInput);
  const hash = createHash("sha256");
  hash.update(json, "utf8");
  return "mft-" + hash.digest("hex").slice(0, 32);
}

/**
 * Canonical JSON: sorted keys at every level for stable string
 * comparison. Same algorithm as CP-9 canonicalizeForHash.
 */
function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJSON).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map(
    (k) =>
      JSON.stringify(k) +
      ":" +
      canonicalJSON((value as Record<string, unknown>)[k]),
  );
  return "{" + pairs.join(",") + "}";
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate threshold value relationships before insert.
 *
 * Mirrors the CHECK constraints in the SQL migration. Catching here
 * gives a clearer error message than the database constraint violation.
 */
function validateThresholdValues(
  values: ThresholdManifestInsert,
): OperationsResult<true> {
  const nonNegFields: ReadonlyArray<{ name: string; value: number }> = [
    { name: "stalled_days_default", value: values.stalled_days_default },
    {
      name: "stalled_snapshots_default",
      value: values.stalled_snapshots_default,
    },
    {
      name: "chronic_snapshot_threshold",
      value: values.chronic_snapshot_threshold,
    },
    {
      name: "chronic_days_threshold",
      value: values.chronic_days_threshold,
    },
    { name: "regression_window_days", value: values.regression_window_days },
    {
      name: "material_score_delta_threshold",
      value: values.material_score_delta_threshold,
    },
    {
      name: "material_band_change_severity_significant",
      value: values.material_band_change_severity_significant,
    },
    {
      name: "material_band_change_severity_notable",
      value: values.material_band_change_severity_notable,
    },
    {
      name: "readiness_min_evidence_score",
      value: values.readiness_min_evidence_score,
    },
    {
      name: "readiness_min_interested_count",
      value: values.readiness_min_interested_count,
    },
    {
      name: "readiness_max_structural_concern_count",
      value: values.readiness_max_structural_concern_count,
    },
  ];

  for (const f of nonNegFields) {
    if (!Number.isInteger(f.value) || f.value < 0) {
      return makeError(
        "invalid_threshold_manifest",
        `threshold ${f.name} must be a non-negative integer; got ${f.value}`,
        { field: f.name, value: f.value },
      );
    }
  }

  const positiveFields: ReadonlyArray<{ name: string; value: number }> = [
    {
      name: "worsening_window_snapshots",
      value: values.worsening_window_snapshots,
    },
    {
      name: "intermittent_oscillation_threshold",
      value: values.intermittent_oscillation_threshold,
    },
    {
      name: "critical_personality_breadth",
      value: values.critical_personality_breadth,
    },
    {
      name: "high_personality_breadth",
      value: values.high_personality_breadth,
    },
    { name: "schema_version", value: values.schema_version },
  ];

  for (const f of positiveFields) {
    if (!Number.isInteger(f.value) || f.value <= 0) {
      return makeError(
        "invalid_threshold_manifest",
        `threshold ${f.name} must be a positive integer; got ${f.value}`,
        { field: f.name, value: f.value },
      );
    }
  }

  if (
    values.high_personality_breadth > values.critical_personality_breadth
  ) {
    return makeError(
      "invalid_threshold_manifest",
      `high_personality_breadth (${values.high_personality_breadth}) must not exceed critical_personality_breadth (${values.critical_personality_breadth})`,
      {
        high: values.high_personality_breadth,
        critical: values.critical_personality_breadth,
      },
    );
  }

  if (typeof values.version !== "string" || values.version.length === 0) {
    return makeError(
      "invalid_threshold_manifest",
      "version must be a non-empty string",
      { received: typeof values.version },
    );
  }

  return { ok: true, value: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTGRES ERROR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function mapPostgresError(error: PostgrestError): OperationsErrorCode {
  const code = error.code;
  const message = (error.message || "").toLowerCase();

  if (code === "42501") return "rls_access_denied";
  if (code === "P0001") {
    if (message.includes("append-only") || message.includes("not permitted")) {
      return "invalid_threshold_manifest";
    }
    return "unknown";
  }
  if (code === "23505") {
    // Conflict on manifest_id — but createManifest handles this as
    // idempotent success before reaching this mapper. If we get here,
    // it's an unexpected conflict.
    return "unknown";
  }
  if (code === "23514") return "invalid_threshold_manifest";
  if (code === "PGRST116") return "manifest_not_found";

  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW ROW SHAPE + CONVERTER
// ─────────────────────────────────────────────────────────────────────────────

interface RawManifestRow {
  manifest_id: string;
  version: string;
  schema_version: number;
  user_id: string | null;
  team_id: string | null;
  is_platform_default: boolean;
  stalled_days_default: number;
  stalled_snapshots_default: number;
  chronic_snapshot_threshold: number;
  chronic_days_threshold: number;
  regression_window_days: number;
  material_score_delta_threshold: number;
  material_band_change_severity_significant: number;
  material_band_change_severity_notable: number;
  worsening_window_snapshots: number;
  intermittent_oscillation_threshold: number;
  critical_personality_breadth: number;
  high_personality_breadth: number;
  readiness_min_evidence_score: number;
  readiness_min_interested_count: number;
  readiness_max_structural_concern_count: number;
  created_at: string;
}

function rowToManifest(row: RawManifestRow): ThresholdManifest {
  return {
    manifest_id: row.manifest_id,
    version: row.version,
    schema_version: row.schema_version,
    created_at: row.created_at,
    stalled_days_default: row.stalled_days_default,
    stalled_snapshots_default: row.stalled_snapshots_default,
    chronic_snapshot_threshold: row.chronic_snapshot_threshold,
    chronic_days_threshold: row.chronic_days_threshold,
    regression_window_days: row.regression_window_days,
    material_score_delta_threshold: row.material_score_delta_threshold,
    material_band_change_severity_significant:
      row.material_band_change_severity_significant,
    material_band_change_severity_notable:
      row.material_band_change_severity_notable,
    worsening_window_snapshots: row.worsening_window_snapshots,
    intermittent_oscillation_threshold: row.intermittent_oscillation_threshold,
    critical_personality_breadth: row.critical_personality_breadth,
    high_personality_breadth: row.high_personality_breadth,
    readiness_min_evidence_score: row.readiness_min_evidence_score,
    readiness_min_interested_count: row.readiness_min_interested_count,
    readiness_max_structural_concern_count:
      row.readiness_max_structural_concern_count,
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
//
// This module exports no new types beyond what types.ts already
// declares. BOUNDARY_METADATA below covers the module-local
// boundary surface (the public API has no new field-bearing types
// to validate).
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/threshold-manifest",
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
        `CP-10 threshold-manifest module BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
