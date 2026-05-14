// lib/intelligence/persistence/snapshot-replay.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Snapshot Replay
//
// Two distinct replay modes, typed differently. They never share a
// return shape because they have different semantics:
//
//   Historical replay
//     Reconstruct the EXACT historical output from stored artifacts.
//     No re-computation. Returns the stored EvaluationSnapshot
//     verbatim. Used for: legal defensibility ("show me exactly what
//     the system produced on March 12"), audit, lender conversations
//     that reference a specific prior reading.
//
//   Forward replay
//     Run the stored raw inputs through current (or specified target)
//     engine versions. Returns a NEW EvaluationSnapshot flagged with
//     replay_origin=forward_replay and replay_source_snapshot_id
//     pointing to the source. Used for: "did the engine improve?"
//     "would this deal now pass?" "how does CP-3 v0.2 read it?"
//
// Architectural commitments:
//
//   1. Historical replay is a pure read. No engine execution. No
//      new snapshot written. The caller receives the stored bytes.
//
//   2. Forward replay writes a NEW snapshot. The original snapshot
//      is preserved unchanged. The new snapshot's
//      replay_source_snapshot_id points to the original. Lineage is
//      preserved.
//
//   3. Forward replay uses the stored normalized_engine_inputs, NOT
//      raw_input_payload re-normalized. The reason: CP-9 forward
//      replay is for engine-version comparison, holding inputs
//      constant. Re-normalization is a separate operation (future
//      checkpoint) that would re-process raw_input_payload through
//      current CP-2 normalizer.
//
//   4. The two operations have separate functions with separate
//      return types (HistoricalReplayResult vs ForwardReplayResult).
//      You cannot accidentally invoke one when meaning the other.
//
//   5. ForwardReplayResult carries an optional delta against the
//      source snapshot. The caller passes a delta-engine instance to
//      compute it; if no engine is supplied, delta is null.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveFingerprint } from "../industry-fingerprints";
import { evaluateRuleEngine } from "../rules/rule-engine";
import { evaluateScenarios } from "../scenarios/scenario-engine";
import { composeAxes } from "../axes/axis-engine";
import { simulateAllPostures } from "../simulation/simulator";
import { generateNarrative } from "../narrative/narrative-engine";
import type {
  CPVersionManifest,
  EvaluationDelta,
  EvaluationSnapshot,
  ForwardReplayResult,
  HistoricalReplayResult,
  PersistenceError,
  PersistenceResult,
  RawInputPayload,
} from "./types";
import { PERSISTENCE_MODULE_VERSION } from "./types";
import { buildSnapshot } from "./snapshot-builder";
import type {
  SnapshotBuildContext,
  PipelineArtifacts,
} from "./snapshot-builder";
import { SnapshotRepository } from "./snapshot-repository";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL REPLAY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reconstruct the exact historical output stored at the given
 * snapshot_id.
 *
 * Pure read. No engine execution. No new database row written.
 * Returns the stored EvaluationSnapshot verbatim along with a typed
 * result wrapper.
 *
 * Use this when you need defensible reproduction: "this is what the
 * system saw at this exact moment in time." The returned snapshot
 * has been stored with append-only immutability, so its bytes are
 * the same bytes that were committed at creation time.
 *
 * Errors:
 *   - snapshot_not_found: snapshot_id doesn't exist or RLS-hidden
 *   - rls_access_denied: caller cannot read this snapshot
 *   - unknown: unexpected database error
 */
export async function replayHistorical(
  repository: SnapshotRepository,
  snapshot_id: string,
): Promise<PersistenceResult<HistoricalReplayResult>> {
  const fetchResult = await repository.getSnapshotById(snapshot_id);
  if (!fetchResult.ok) return fetchResult;

  const result: HistoricalReplayResult = {
    mode: "historical_replay",
    source_snapshot_id: snapshot_id,
    snapshot: fetchResult.value,
    retrieved_at: new Date().toISOString(),
  };

  return { ok: true, value: result };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORWARD REPLAY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input for forward replay.
 */
export interface ForwardReplayInput {
  /** Snapshot whose normalized inputs will be re-run through the engine. */
  readonly source_snapshot_id: string;

  /**
   * CP version manifest to use for the replay. Application code
   * supplies the current versions; if reading a snapshot from an
   * older CP version, that drift is the point of forward replay.
   *
   * The version strings get stamped onto the new snapshot but
   * cannot change the engine code that executes — they're metadata
   * indicating WHICH engine version was loaded at replay time. To
   * actually run against a different engine version, the
   * application must load that version of the engine code.
   */
  readonly target_cp_versions: CPVersionManifest;

  /**
   * The user/team to attribute the new snapshot to. The forward
   * replay creates a new snapshot — it needs ownership.
   */
  readonly user_id: string;
  readonly team_id: string | null;

  /**
   * The evaluation_id for the new snapshot. Forward-replay snapshots
   * share a root_evaluation_id with their source but get fresh
   * evaluation_ids.
   */
  readonly new_evaluation_id: string;

  /**
   * Optional description for the lineage record. Defaults to
   * "forward_replay" change_reason without description.
   */
  readonly change_description?: string | null;

  /**
   * Optional caller-provided timestamp. Defaults to now().
   */
  readonly evaluated_at?: string;

  /**
   * If true, compute a delta against the source snapshot. Defaults
   * to false. Pass a delta engine via deltaComputer to enable.
   */
  readonly compute_delta?: boolean;
}

/**
 * Delta computer callable injected at the call site. Decouples
 * snapshot-replay from delta-engine to avoid circular imports.
 * delta-engine will provide an implementation; snapshot-replay only
 * holds the interface.
 */
export type DeltaComputer = (
  before: EvaluationSnapshot,
  after: EvaluationSnapshot,
) => EvaluationDelta;

/**
 * Run the stored normalized inputs through current engine versions
 * and produce a new snapshot.
 *
 * Process:
 *   1. Fetch the source snapshot
 *   2. Extract its normalized_engine_inputs and raw_input_payload
 *   3. Run the full CP-2..CP-8 pipeline against those inputs
 *   4. Build a new snapshot via snapshot-builder with:
 *        - replay_origin = "forward_replay"
 *        - replay_source_snapshot_id = source.snapshot_id
 *        - parent_snapshot_id = source.snapshot_id (lineage chain)
 *        - root_evaluation_id = source.lineage.root_evaluation_id
 *        - change_reason = "forward_replay"
 *   5. Write the new snapshot atomically via the repository
 *   6. Optionally compute a delta against the source
 *   7. Return a ForwardReplayResult
 *
 * The new snapshot is durable — it gets written to the database with
 * its own canonical hash. If the engine logic was deterministic and
 * unchanged, the new hash equals the source hash; if the engine
 * changed, the new hash differs (drift surfaces visibly).
 *
 * Errors:
 *   - snapshot_not_found: source snapshot doesn't exist
 *   - rls_access_denied: caller cannot read source or write new
 *   - hash_collision_within_deal: engine produced the same hash AND
 *     a snapshot with that hash already exists for this deal (very
 *     rare; only happens if forward-replaying an already-replayed
 *     snapshot with no engine change)
 *   - unknown: pipeline execution failed or unexpected database error
 */
export async function replayForward(
  repository: SnapshotRepository,
  input: ForwardReplayInput,
  deltaComputer?: DeltaComputer,
): Promise<PersistenceResult<ForwardReplayResult>> {
  // ── Step 1: Fetch the source snapshot ──
  const sourceResult = await repository.getSnapshotById(input.source_snapshot_id);
  if (!sourceResult.ok) return sourceResult;
  const source = sourceResult.value;

  // ── Step 2: Run the pipeline ──
  let pipeline: PipelineArtifacts;
  try {
    pipeline = runPipelineForReplay(source);
  } catch (err) {
    return makeError(
      "unknown",
      `forward replay pipeline execution failed: ${err instanceof Error ? err.message : String(err)}`,
      { source_snapshot_id: input.source_snapshot_id },
    );
  }

  // ── Step 3: Fetch parent recovery items for lineage diffing ──
  // The parent of the new snapshot IS the source snapshot.
  const parentRecoveryResult =
    await repository.getParentRecoveryItemsContext(input.source_snapshot_id);
  if (!parentRecoveryResult.ok) return parentRecoveryResult;

  const evaluated_at = input.evaluated_at ?? new Date().toISOString();

  // ── Step 4: Build the new snapshot ──
  const buildContext: SnapshotBuildContext = {
    evaluation_id: input.new_evaluation_id,
    deal_id: source.deal_id,
    user_id: input.user_id,
    team_id: input.team_id,
    cp_versions: input.target_cp_versions,
    raw_input_payload: source.raw_input_payload,
    normalized_engine_inputs: source.normalized_engine_inputs,
    replay_origin: "forward_replay",
    replay_source_snapshot_id: source.snapshot_id,
    parent_snapshot_id: source.snapshot_id,
    root_evaluation_id: source.lineage.root_evaluation_id,
    change_reason: "forward_replay",
    change_description:
      input.change_description ?? null,
    triggered_by: input.user_id,
    triggered_by_event_id: null,
  };

  const buildResult = buildSnapshot({
    context: buildContext,
    pipeline,
    parent_recovery_items: parentRecoveryResult.value,
    evaluated_at,
  });
  if (!buildResult.ok) return buildResult;

  // ── Step 5: Write the new snapshot ──
  const writeResult = await repository.writeSnapshot(buildResult.value);
  if (!writeResult.ok) return writeResult;
  const new_snapshot_id = writeResult.value;

  // ── Step 6: Fetch the newly-written snapshot back so we have a
  //    fully-populated EvaluationSnapshot (with the real snapshot_id
  //    and created_at from the database) ──
  const newSnapshotFetch = await repository.getSnapshotById(new_snapshot_id);
  if (!newSnapshotFetch.ok) return newSnapshotFetch;
  const newSnapshot = newSnapshotFetch.value;

  // ── Step 7: Optionally compute a delta ──
  let delta: EvaluationDelta | null = null;
  if (input.compute_delta && deltaComputer) {
    try {
      delta = deltaComputer(source, newSnapshot);
    } catch (err) {
      // Delta computation failure does NOT fail the replay — the
      // replay succeeded, the delta is informational. Log via the
      // context for diagnostic visibility but return success.
      return {
        ok: true,
        value: {
          mode: "forward_replay",
          source_snapshot_id: input.source_snapshot_id,
          target_cp_versions: input.target_cp_versions,
          source_cp_versions: source.cp_versions,
          snapshot: newSnapshot,
          delta: null,
          replayed_at: evaluated_at,
        },
      };
    }
  }

  // ── Step 8: Return the ForwardReplayResult ──
  const result: ForwardReplayResult = {
    mode: "forward_replay",
    source_snapshot_id: input.source_snapshot_id,
    target_cp_versions: input.target_cp_versions,
    source_cp_versions: source.cp_versions,
    snapshot: newSnapshot,
    delta,
    replayed_at: evaluated_at,
  };

  return { ok: true, value: result };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE EXECUTION FOR REPLAY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full CP-2..CP-8 pipeline against a source snapshot's
 * normalized inputs.
 *
 * IMPORTANT: this uses the LOADED engine code, which is whatever
 * version is currently linked at runtime. The target_cp_versions
 * field on the result is metadata — it does not switch engine code
 * dynamically. To run against a different engine version, the
 * application must deploy that version of the engine and re-execute.
 *
 * The pipeline reads the stored normalized_engine_inputs as the
 * engine inputs, NOT raw_input_payload. This is intentional: forward
 * replay holds inputs constant for engine-version comparison.
 * Re-normalization is a separate operation (future checkpoint).
 */
function runPipelineForReplay(source: EvaluationSnapshot): PipelineArtifacts {
  const normalized = source.normalized_engine_inputs;

  // The engine functions accept loose objects — we pass the stored
  // normalized inputs directly. They were valid CP-2 inputs at
  // snapshot creation time; they remain valid for replay.
  const inputs = normalized as unknown as Parameters<typeof evaluateRuleEngine>[0];
  const deal_source_type =
    typeof normalized.deal_source_type === "string"
      ? normalized.deal_source_type
      : "unknown";
  const industry_key =
    typeof normalized.industry_key === "string"
      ? normalized.industry_key
      : "unknown";

  const fingerprint_resolution = resolveFingerprint(industry_key);
  const rule_engine_result = evaluateRuleEngine(inputs, fingerprint_resolution);
  const scenario_evaluation_result = evaluateScenarios(
    inputs,
    fingerprint_resolution,
    rule_engine_result,
  );
  const axis_composition_result = composeAxes({
    rule_engine_result,
    scenario_evaluation_result,
    fingerprint_resolution,
    deal_source_type:
      deal_source_type as Parameters<typeof composeAxes>[0]["deal_source_type"],
  });
  const batch_posture_result = simulateAllPostures({
    axis_composition_result,
    scenario_evaluation_result,
  });
  const narrative_output = generateNarrative({
    axis_composition_result,
    scenario_evaluation_result,
    batch_posture_result,
  });

  return {
    fingerprint_resolution,
    rule_engine_result,
    scenario_evaluation_result,
    axis_composition_result,
    batch_posture_result,
    narrative_output,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect CP version drift between two version manifests.
 *
 * Returns the keys (cp2..cp8) where the versions differ. An empty
 * array means no drift — the manifests match exactly.
 *
 * This is a pure utility; the delta engine uses it to set version
 * drift warnings on individual delta entries. Snapshot-replay uses
 * it for diagnostic reporting.
 */
export function detectCPVersionDrift(
  a: CPVersionManifest,
  b: CPVersionManifest,
): ReadonlyArray<keyof CPVersionManifest> {
  const drift: Array<keyof CPVersionManifest> = [];
  const keys: Array<keyof CPVersionManifest> = [
    "cp2",
    "cp3",
    "cp4",
    "cp5",
    "cp6",
    "cp7",
    "cp8",
  ];
  for (const key of keys) {
    if (a[key] !== b[key]) drift.push(key);
  }
  return drift;
}

/**
 * Check whether two raw input payloads are byte-equal under canonical
 * JSON serialization.
 *
 * Exposed for callers that want to verify "the raw_input_payload of
 * the forward replay matches the source" — useful sanity check.
 */
export function rawInputsEqual(
  a: RawInputPayload,
  b: RawInputPayload,
): boolean {
  return JSON.stringify(canonicalSort(a)) === JSON.stringify(canonicalSort(b));
}

function canonicalSort(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalSort);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalSort(obj[key]);
  }
  return sorted;
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
