// lib/intelligence/persistence/snapshot-builder.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Snapshot Builder
//
// Composition layer. Given raw pipeline outputs and lineage context,
// produces four parallel artifacts that all reference the same logical
// snapshot:
//
//   1. EvaluationSnapshotInsert      — the canonical snapshot row
//   2. EvaluationStateSummaryInsert  — denormalized projection for dashboards
//   3. RecoveryPathHistoryInsert[]   — per-item lifecycle records
//   4. ExplainabilityTraceInsert[]   — fragment → upstream artifact edges
//
// Snapshot status (status field on recovery_path_history) is computed
// against an optional parent snapshot's recovery items, which the
// caller passes in. When parent_recovery_items is null (initial
// snapshot), all items are status="open".
//
// The builder is PURE — no IO, no Supabase calls. The repository
// module (snapshot-repository.ts) takes the BuilderOutput and writes
// it transactionally.
//
// Architectural commitments enforced here:
//
//   1. CP version manifest validation — all 7 keys must be present and
//      non-empty. Mirrors the SQL check constraint.
//
//   2. Canonical hash computation — invokes computeCanonicalEvaluationHash
//      with the appropriate inputs. The hash anchors replay verification.
//
//   3. Replay origin consistency — when replay_origin != "original",
//      replay_source_snapshot_id is required. Mirrors the SQL check
//      constraint.
//
//   4. Lineage requirement — every snapshot has a typed lineage block.
//      Root snapshots have parent_snapshot_id=null and root_evaluation_id
//      equal to evaluation_id.
//
//   5. "other" change_reason requires change_description — semantic
//      enforcement (the schema can't enforce this without a CHECK that
//      reads two columns, which is gnarly).
//
//   6. The builder DOES NOT write to the database. The repository owns
//      transactional writes (snapshot + summary + traces + recovery
//      records inserted atomically).
//
//   7. The builder DOES NOT compute deltas against the parent snapshot
//      for full pipeline state — that's the delta engine's job. The
//      builder only computes recovery item lifecycle status because
//      that lives on each recovery_path_history row.
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
  FingerprintResolution,
  AxisKey,
} from "../types";
import type {
  PersonalityId,
} from "../personalities/types";
import type {
  NarrativeOutput,
  RecoveryPriority,
  AssumptionConcentrationFinding,
} from "../narrative/types";
import {
  computeCanonicalEvaluationHash,
} from "./snapshot-hash";
import {
  PERSISTENCE_MODULE_VERSION,
  SCHEMA_VERSION,
  CP_VERSION_KEYS,
} from "./types";
import type {
  CanonicalHashInput,
  CPVersionManifest,
  CanonicalSnapshotPayload,
  ChangeReason,
  EvaluationLineage,
  EvaluationSnapshotInsert,
  EvaluationStateSummaryInsert,
  ExplainabilityTraceInsert,
  NormalizedEngineInputs,
  PersistenceError,
  PersistenceResult,
  RawInputPayload,
  RecoveryItemKind,
  RecoveryPathHistoryInsert,
  RecoveryStatus,
  ReplayOrigin,
  ArtifactType,
} from "./types";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SHAPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lineage context for building a snapshot. The caller controls:
 *   - whether this is a root snapshot (parent_snapshot_id=null) or a
 *     descendant
 *   - what triggered the evaluation
 *   - which user/team owns the resulting record
 *
 * The builder validates this context (e.g., "other" change_reason
 * requires change_description) and propagates it onto the snapshot.
 */
export interface SnapshotBuildContext {
  // ── Identity / ownership ──
  readonly evaluation_id: string;       // engine-side stable ID
  readonly deal_id: string;
  readonly user_id: string;
  readonly team_id: string | null;

  // ── CP version manifest at the moment of evaluation ──
  readonly cp_versions: CPVersionManifest;

  // ── Inputs ──
  readonly raw_input_payload: RawInputPayload;
  readonly normalized_engine_inputs: NormalizedEngineInputs;

  // ── Replay origin (default "original" for fresh evaluations) ──
  readonly replay_origin: ReplayOrigin;
  readonly replay_source_snapshot_id: string | null;

  // ── Lineage ──
  readonly parent_snapshot_id: string | null;
  readonly root_evaluation_id: string;   // same as evaluation_id for root snapshots
  readonly change_reason: ChangeReason;
  readonly change_description: string | null;
  readonly triggered_by: string | null;
  readonly triggered_by_event_id: string | null;
}

/**
 * Pipeline artifacts produced by CP-2 through CP-8.
 */
export interface PipelineArtifacts {
  readonly fingerprint_resolution: FingerprintResolution;
  readonly rule_engine_result: RuleEngineResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
  readonly axis_composition_result: AxisCompositionResult;
  readonly batch_posture_result: BatchSimulationResult;
  readonly narrative_output: NarrativeOutput;
}

/**
 * Parent snapshot's recovery items, used to compute lifecycle status
 * (open / persisted / satisfied / regressed / evolved).
 *
 * Pass null for initial (root) snapshots — all items will be status="open".
 *
 * The shape is the lightweight identity-only projection needed for
 * status diffing; full item payloads from the parent are not required.
 */
export interface ParentRecoveryItemsContext {
  readonly parent_snapshot_id: string;
  readonly items: ReadonlyArray<{
    readonly item_kind: RecoveryItemKind;
    readonly item_id: string;
    readonly addresses_target_id: string | null;
    readonly first_seen_snapshot_id: string | null;
    /** Whether this item was "satisfied" (resolved) at the parent snapshot. */
    readonly was_satisfied_at_parent: boolean;
  }>;
}

/**
 * Input to buildSnapshot. Everything the builder needs in one place.
 */
export interface SnapshotBuildInput {
  readonly context: SnapshotBuildContext;
  readonly pipeline: PipelineArtifacts;
  /** Optional parent's recovery items for lifecycle diffing. */
  readonly parent_recovery_items: ParentRecoveryItemsContext | null;
  /** ISO timestamp for the evaluated_at field on the state summary. */
  readonly evaluated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT SHAPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The four parallel inserts that the repository writes transactionally.
 *
 * All four reference the same logical snapshot. The snapshot's
 * canonical_evaluation_hash anchors all of them.
 */
export interface SnapshotBuilderOutput {
  readonly snapshot: EvaluationSnapshotInsert;
  readonly state_summary: EvaluationStateSummaryInsert;
  readonly recovery_path_history: ReadonlyArray<RecoveryPathHistoryInsert>;
  readonly explainability_traces: ReadonlyArray<ExplainabilityTraceInsert>;
  /**
   * The canonical hash, exposed separately for diagnostic use even
   * though it's also embedded in snapshot.canonical_evaluation_hash.
   */
  readonly canonical_evaluation_hash: string;
  readonly builder_version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a complete snapshot artifact bundle from pipeline outputs.
 *
 * Returns a PersistenceResult — on validation failure, the result
 * carries a typed PersistenceError describing what went wrong.
 *
 * Validations performed:
 *   - CP version manifest has all 7 required keys (cp2..cp8) and each
 *     is a non-empty string
 *   - replay_origin consistency: original → replay_source_snapshot_id
 *     must be null; non-original → must be non-null
 *   - change_reason="other" requires non-empty change_description
 *   - lineage root: if parent_snapshot_id is null, root_evaluation_id
 *     must equal evaluation_id
 *
 * No IO is performed. The repository writes the result.
 */
export function buildSnapshot(
  input: SnapshotBuildInput,
): PersistenceResult<SnapshotBuilderOutput> {
  // ── Step 1: Validate the context ──
  const validation = validateBuildContext(input.context);
  if (!validation.ok) return validation;

  // ── Step 2: Assemble the canonical artifact payload ──
  const artifactPayload: CanonicalSnapshotPayload = {
    fingerprint_resolution: input.pipeline.fingerprint_resolution,
    rule_engine_result: input.pipeline.rule_engine_result,
    scenario_evaluation_result: input.pipeline.scenario_evaluation_result,
    axis_composition_result: input.pipeline.axis_composition_result,
    batch_posture_result: input.pipeline.batch_posture_result,
    narrative_output: input.pipeline.narrative_output,
  };

  // ── Step 3: Compute the canonical evaluation hash ──
  const hashInput: CanonicalHashInput = {
    schema_version: SCHEMA_VERSION,
    cp_versions: input.context.cp_versions,
    normalized_engine_inputs: input.context.normalized_engine_inputs,
    fingerprint_resolution: input.pipeline.fingerprint_resolution,
    rule_engine_result: input.pipeline.rule_engine_result,
    scenario_evaluation_result: input.pipeline.scenario_evaluation_result,
    axis_composition_result: input.pipeline.axis_composition_result,
    batch_posture_result: input.pipeline.batch_posture_result,
  };

  let canonicalHash: string;
  try {
    canonicalHash = computeCanonicalEvaluationHash(hashInput);
  } catch (err) {
    return makeError(
      "unknown",
      `canonical hash computation failed: ${err instanceof Error ? err.message : String(err)}`,
      { evaluation_id: input.context.evaluation_id },
    );
  }

  if (!/^[a-f0-9]{64}$/.test(canonicalHash)) {
    return makeError(
      "hash_format_invalid",
      `canonical hash format invalid (expected 64-char lowercase hex)`,
      { computed_hash: canonicalHash },
    );
  }

  // ── Step 4: Assemble the lineage block ──
  const lineage: EvaluationLineage = {
    parent_snapshot_id: input.context.parent_snapshot_id,
    root_evaluation_id: input.context.root_evaluation_id,
    change_reason: input.context.change_reason,
    change_description: input.context.change_description,
    triggered_by: input.context.triggered_by,
    triggered_by_event_id: input.context.triggered_by_event_id,
  };

  // ── Step 5: Build the snapshot insert ──
  const snapshot: EvaluationSnapshotInsert = {
    evaluation_id: input.context.evaluation_id,
    deal_id: input.context.deal_id,
    user_id: input.context.user_id,
    team_id: input.context.team_id,
    schema_version: SCHEMA_VERSION,
    cp_versions: input.context.cp_versions,
    canonical_evaluation_hash: canonicalHash,
    replay_origin: input.context.replay_origin,
    replay_source_snapshot_id: input.context.replay_source_snapshot_id,
    raw_input_payload: input.context.raw_input_payload,
    normalized_engine_inputs: input.context.normalized_engine_inputs,
    artifact_payload: artifactPayload,
    lineage,
  };

  // ── Step 6: Build the state summary ──
  const stateSummary = buildStateSummary({
    snapshot_id: "__pending__",                  // repository fills this in after insert
    deal_id: input.context.deal_id,
    user_id: input.context.user_id,
    team_id: input.context.team_id,
    pipeline: input.pipeline,
    evaluated_at: input.evaluated_at,
  });

  // ── Step 7: Build recovery path history records ──
  const recoveryHistory = buildRecoveryPathHistory({
    snapshot_id: "__pending__",
    deal_id: input.context.deal_id,
    user_id: input.context.user_id,
    pipeline: input.pipeline,
    parent_recovery: input.parent_recovery_items,
    evaluated_at: input.evaluated_at,
  });

  // ── Step 8: Build explainability trace edges ──
  const explainabilityTraces = buildExplainabilityTraces({
    snapshot_id: "__pending__",
    deal_id: input.context.deal_id,
    user_id: input.context.user_id,
    pipeline: input.pipeline,
  });

  return {
    ok: true,
    value: {
      snapshot,
      state_summary: stateSummary,
      recovery_path_history: recoveryHistory,
      explainability_traces: explainabilityTraces,
      canonical_evaluation_hash: canonicalHash,
      builder_version: PERSISTENCE_MODULE_VERSION,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validateBuildContext(
  ctx: SnapshotBuildContext,
): PersistenceResult<true> {
  // ── CP version manifest: all 7 keys present and non-empty ──
  const missingKeys: string[] = [];
  const versionsRecord = ctx.cp_versions as unknown as Record<string, unknown>;
  for (const key of CP_VERSION_KEYS) {
    const value = versionsRecord[key];
    if (typeof value !== "string" || value.length === 0) {
      missingKeys.push(key);
    }
  }
  if (missingKeys.length > 0) {
    return makeError(
      "cp_versions_missing_keys",
      `cp_versions manifest is missing or empty: ${missingKeys.join(", ")}`,
      { missing_keys: missingKeys },
    );
  }

  // ── Replay origin consistency ──
  if (ctx.replay_origin === "original") {
    if (ctx.replay_source_snapshot_id !== null) {
      return makeError(
        "replay_source_required",
        `replay_origin='original' requires replay_source_snapshot_id=null (got: ${ctx.replay_source_snapshot_id})`,
        { replay_origin: ctx.replay_origin, replay_source_snapshot_id: ctx.replay_source_snapshot_id },
      );
    }
  } else {
    if (ctx.replay_source_snapshot_id === null) {
      return makeError(
        "replay_source_required",
        `replay_origin='${ctx.replay_origin}' requires non-null replay_source_snapshot_id`,
        { replay_origin: ctx.replay_origin },
      );
    }
  }

  // ── "other" change_reason requires non-empty change_description ──
  if (ctx.change_reason === "other") {
    if (
      typeof ctx.change_description !== "string" ||
      ctx.change_description.trim().length === 0
    ) {
      return makeError(
        "unknown",
        `change_reason='other' requires a non-empty change_description`,
        { change_reason: ctx.change_reason },
      );
    }
  }

  // ── Lineage root consistency ──
  if (ctx.parent_snapshot_id === null) {
    // Root snapshot: root_evaluation_id should equal evaluation_id
    if (ctx.root_evaluation_id !== ctx.evaluation_id) {
      return makeError(
        "unknown",
        `root snapshot (parent_snapshot_id=null) requires root_evaluation_id to equal evaluation_id`,
        {
          evaluation_id: ctx.evaluation_id,
          root_evaluation_id: ctx.root_evaluation_id,
        },
      );
    }
  }

  return { ok: true, value: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE SUMMARY ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

interface StateSummaryAssemblyInputs {
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly user_id: string;
  readonly team_id: string | null;
  readonly pipeline: PipelineArtifacts;
  readonly evaluated_at: string;
}

/**
 * Build the denormalized EvaluationStateSummaryInsert from pipeline outputs.
 *
 * All fields come from the pipeline; the builder does NOT recompute
 * anything. The summary is a pure projection.
 */
function buildStateSummary(
  inputs: StateSummaryAssemblyInputs,
): EvaluationStateSummaryInsert {
  const { pipeline } = inputs;
  const synthesis = pipeline.narrative_output.synthesis;

  // ── Binding constraint surface ──
  const binding = synthesis.binding_constraint;
  const dominantConstraintAxis = binding?.axis ?? null;
  const dominantConstraintBand = binding?.band ?? null;
  const dominantConstraintRepairability =
    binding?.repairability ?? null;

  // ── Highest-impact axis: pick the axis with the most extreme score ──
  // For non-uncertainty axes, lowest score = highest "fragility";
  // for fragility/uncertainty, highest score = worse.
  // The constitutional reading is just "which axis is the lead driver."
  // Use the binding constraint axis if present; otherwise the worst-band axis.
  const highestFragilityAxis: AxisKey | null = binding?.axis ?? null;

  // ── Posture distribution ──
  const interestedCount = synthesis.per_personality.filter(
    (p) => p.state === "interested",
  ).length;
  const cautiousCount = synthesis.per_personality.filter(
    (p) => p.state === "cautious",
  ).length;
  const declineCount = synthesis.per_personality.filter(
    (p) => p.state === "decline",
  ).length;

  // ── Closest recoverable lender profile ──
  const closest = synthesis.closest_path;
  const closestRecoverableProfile: PersonalityId | null =
    closest?.personality_id ?? null;
  const closestRecoverableState: "interested" | "cautious" | "decline" | null =
    closest?.current_state ?? null;
  const closestRecoverableAllDeclined: boolean | null =
    closest?.all_declined ?? null;

  // ── Signal counts ──
  let fatalSignalCount = 0;
  let repairableSignalCount = 0;
  let dealBreakerCount = 0;
  let unresolvedComfort = 0;
  let satisfiedComfort = 0;
  for (const p of synthesis.per_personality) {
    fatalSignalCount += p.fatal_discomfort_ids.length;
    repairableSignalCount += p.repairable_discomfort_ids.length;
    dealBreakerCount += p.triggered_deal_breaker_ids.length;
    unresolvedComfort += p.unsatisfied_comfort_condition_ids.length;
    satisfiedComfort += p.satisfied_comfort_condition_ids.length;
  }

  const unresolvedRecoveryPriorities = synthesis.recovery_priorities.length;

  // ── Coverage gap ──
  const isCoverageGap = synthesis.coverage_gap.is_coverage_gap;
  const coverageGapAffectedCount =
    synthesis.coverage_gap.affected_personalities.length;

  // ── Fingerprint ──
  const fingerprintKey = pipeline.fingerprint_resolution.fingerprint.key;
  const fingerprintIsFallback = pipeline.fingerprint_resolution.is_fallback;

  // ── Top assumption concentration ──
  const topAssumption: AssumptionConcentrationFinding | null =
    synthesis.top_assumption_concentrations.length > 0
      ? synthesis.top_assumption_concentrations[0]
      : null;
  const topAssumptionKey = topAssumption?.assumption_key ?? null;
  const topAssumptionEvidenceBand = topAssumption
    ? bucketEvidenceStrength(topAssumption.evidence_strength)
    : null;

  // ── Axis scores ──
  const axisComp = pipeline.axis_composition_result;

  return {
    snapshot_id: inputs.snapshot_id,
    deal_id: inputs.deal_id,
    user_id: inputs.user_id,
    team_id: inputs.team_id,
    dominant_constraint_axis: dominantConstraintAxis,
    dominant_constraint_band: dominantConstraintBand,
    dominant_constraint_repairability: dominantConstraintRepairability,
    highest_fragility_axis: highestFragilityAxis,
    interested_count: interestedCount,
    cautious_count: cautiousCount,
    decline_count: declineCount,
    closest_recoverable_profile: closestRecoverableProfile,
    closest_recoverable_state: closestRecoverableState,
    closest_recoverable_all_declined: closestRecoverableAllDeclined,
    fatal_signal_count: fatalSignalCount,
    repairable_signal_count: repairableSignalCount,
    deal_breaker_count: dealBreakerCount,
    unresolved_comfort_conditions: unresolvedComfort,
    satisfied_comfort_conditions: satisfiedComfort,
    unresolved_recovery_priorities: unresolvedRecoveryPriorities,
    is_coverage_gap: isCoverageGap,
    coverage_gap_affected_count: coverageGapAffectedCount,
    fingerprint_key: fingerprintKey,
    fingerprint_is_fallback: fingerprintIsFallback,
    top_assumption_key: topAssumptionKey,
    top_assumption_evidence_band: topAssumptionEvidenceBand,
    financial_score: axisComp.financial_score.score,
    durability_score: axisComp.durability_score.score,
    evidence_quality: axisComp.evidence_quality.score,
    assumption_fragility: axisComp.assumption_fragility.score,
    underwriting_uncertainty: axisComp.underwriting_uncertainty.score,
    evaluated_at: inputs.evaluated_at,
  };
}

/**
 * Bucket evidence_strength score into the four bands used by the
 * state summary (mirrors per-axis synthesis band thresholds).
 */
function bucketEvidenceStrength(
  score: number,
): "strong" | "moderate" | "cautionary" | "concerning" {
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  if (score >= 40) return "cautionary";
  return "concerning";
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY PATH HISTORY ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

interface RecoveryHistoryAssemblyInputs {
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly user_id: string;
  readonly pipeline: PipelineArtifacts;
  readonly parent_recovery: ParentRecoveryItemsContext | null;
  readonly evaluated_at: string;
}

/**
 * Build recovery_path_history rows for every recovery item present in
 * the current snapshot, PLUS "satisfied" rows for items present in the
 * parent but absent from the current snapshot.
 *
 * Status computation (relative to parent):
 *   - open: present here, not in parent (and no parent item with same target)
 *   - persisted: same item_id present in both
 *   - satisfied: present in parent, not here (and no child item with same target)
 *   - regressed: present here AND was satisfied in parent
 *   - evolved: present here under a different item_id but same
 *     addresses_target_id as a parent item
 *
 * Initial snapshot (parent_recovery = null): all current items are "open".
 *
 * The evolved status matters for recovery_priority items specifically,
 * because CP-8 emits IDs of the form "recovery_priority.{index}.{target}"
 * where the index can shift between snapshots even when the underlying
 * target is the same. Without evolved detection, the same logical
 * recovery action would appear as "satisfied + new" — semantically
 * misleading.
 */
function buildRecoveryPathHistory(
  inputs: RecoveryHistoryAssemblyInputs,
): ReadonlyArray<RecoveryPathHistoryInsert> {
  const { pipeline, parent_recovery, evaluated_at } = inputs;
  const synthesis = pipeline.narrative_output.synthesis;
  const results: RecoveryPathHistoryInsert[] = [];

  // ── Track current items by their (kind, id) compound key AND by
  //    their (kind, addresses_target_id) for evolved-target diffing ──
  const currentItemKeys = new Set<string>();
  const currentItemsByTarget = new Map<string, string>(); // "kind::target" → current item_id
  const itemKeyOf = (kind: RecoveryItemKind, id: string) => `${kind}::${id}`;
  const targetKeyOf = (kind: RecoveryItemKind, target: string) => `${kind}::${target}`;

  // ── Parent item lookup ──
  const parentItemsByKey = new Map<
    string,
    ParentRecoveryItemsContext["items"][number]
  >();
  const parentItemsByTarget = new Map<
    string,
    ParentRecoveryItemsContext["items"][number]
  >();
  if (parent_recovery) {
    for (const item of parent_recovery.items) {
      parentItemsByKey.set(itemKeyOf(item.item_kind, item.item_id), item);
      if (item.addresses_target_id !== null) {
        parentItemsByTarget.set(
          targetKeyOf(item.item_kind, item.addresses_target_id),
          item,
        );
      }
    }
  }

  // ── 1. Recovery priorities ──
  for (const priority of synthesis.recovery_priorities) {
    const key = itemKeyOf("recovery_priority", priority.priority_id);
    currentItemKeys.add(key);
    const target = extractTargetIdFromPriorityId(priority.priority_id);
    if (target !== null) {
      currentItemsByTarget.set(targetKeyOf("recovery_priority", target), priority.priority_id);
    }

    const directParentItem = parentItemsByKey.get(key);
    const targetParentItem = target !== null
      ? parentItemsByTarget.get(targetKeyOf("recovery_priority", target))
      : undefined;

    // Status priority:
    //   1. Same item_id in parent → regressed/persisted via computeStatus
    //   2. Different item_id but same target → evolved
    //   3. No parent match → open
    let status: RecoveryStatus;
    let firstSeen: string | null;
    if (directParentItem) {
      status = computeStatus(directParentItem);
      firstSeen = directParentItem.first_seen_snapshot_id;
    } else if (targetParentItem) {
      status = "evolved";
      firstSeen = targetParentItem.first_seen_snapshot_id;
    } else {
      status = "open";
      firstSeen = inputs.snapshot_id;
    }

    results.push({
      snapshot_id: inputs.snapshot_id,
      deal_id: inputs.deal_id,
      user_id: inputs.user_id,
      item_kind: "recovery_priority",
      item_id: priority.priority_id,
      item_label: priority.label,
      status,
      related_personality_ids: priority.addresses_personalities,
      related_axis_keys: [],
      addresses_target_id: target,
      first_seen_snapshot_id: firstSeen,
      last_seen_snapshot_id: inputs.snapshot_id,
      resolved_at_snapshot_id: null,
      item_payload: serializeRecoveryPriorityPayload(priority),
      evaluated_at,
    });
  }

  // ── 2. Comfort conditions (unsatisfied — open work) ──
  for (const personality of synthesis.per_personality) {
    for (const ccId of personality.unsatisfied_comfort_condition_ids) {
      const key = itemKeyOf("comfort_condition", ccId);
      currentItemKeys.add(key);
      const parentItem = parentItemsByKey.get(key);
      const status = computeStatus(parentItem);

      results.push({
        snapshot_id: inputs.snapshot_id,
        deal_id: inputs.deal_id,
        user_id: inputs.user_id,
        item_kind: "comfort_condition",
        item_id: ccId,
        item_label: null,
        status,
        related_personality_ids: [personality.personality_id],
        related_axis_keys: [personality.primary_axis],
        addresses_target_id: null,
        first_seen_snapshot_id: parentItem?.first_seen_snapshot_id ?? inputs.snapshot_id,
        last_seen_snapshot_id: inputs.snapshot_id,
        resolved_at_snapshot_id: null,
        item_payload: { personality_id: personality.personality_id },
        evaluated_at,
      });
    }
  }

  // ── 3. Repairable discomforts ──
  for (const personality of synthesis.per_personality) {
    for (const dId of personality.repairable_discomfort_ids) {
      const key = itemKeyOf("repairable_discomfort", dId);
      currentItemKeys.add(key);
      const parentItem = parentItemsByKey.get(key);
      const status = computeStatus(parentItem);

      results.push({
        snapshot_id: inputs.snapshot_id,
        deal_id: inputs.deal_id,
        user_id: inputs.user_id,
        item_kind: "repairable_discomfort",
        item_id: dId,
        item_label: null,
        status,
        related_personality_ids: [personality.personality_id],
        related_axis_keys: [personality.primary_axis],
        addresses_target_id: null,
        first_seen_snapshot_id: parentItem?.first_seen_snapshot_id ?? inputs.snapshot_id,
        last_seen_snapshot_id: inputs.snapshot_id,
        resolved_at_snapshot_id: null,
        item_payload: { personality_id: personality.personality_id },
        evaluated_at,
      });
    }
  }

  // ── 4. Structural concerns ──
  for (const concern of synthesis.structural_concerns) {
    const key = itemKeyOf("structural_concern", concern.concern_id);
    currentItemKeys.add(key);
    const parentItem = parentItemsByKey.get(key);
    const status = computeStatus(parentItem);

    results.push({
      snapshot_id: inputs.snapshot_id,
      deal_id: inputs.deal_id,
      user_id: inputs.user_id,
      item_kind: "structural_concern",
      item_id: concern.concern_id,
      item_label: concern.description.length > 200
        ? concern.description.slice(0, 200) + "..."
        : concern.description,
      status,
      related_personality_ids: concern.affected_personalities,
      related_axis_keys: [],
      addresses_target_id: null,
      first_seen_snapshot_id: parentItem?.first_seen_snapshot_id ?? inputs.snapshot_id,
      last_seen_snapshot_id: inputs.snapshot_id,
      resolved_at_snapshot_id: null,
      item_payload: {
        why_structural: concern.why_structural,
      },
      evaluated_at,
    });
  }

  // ── 5. Add "satisfied" rows for parent items absent from current,
  //    EXCEPT when an item with the same target_id is already present
  //    in the current snapshot (in which case the new item carries
  //    status="evolved" and we don't double-emit) ──
  if (parent_recovery) {
    for (const parentItem of parent_recovery.items) {
      const key = itemKeyOf(parentItem.item_kind, parentItem.item_id);
      if (currentItemKeys.has(key)) continue;

      // Skip if already terminated in parent
      if (parentItem.was_satisfied_at_parent) continue;

      // Skip if a current item addresses the same target (evolved case
      // is handled by the current item's status="evolved" row)
      if (
        parentItem.addresses_target_id !== null &&
        currentItemsByTarget.has(
          targetKeyOf(parentItem.item_kind, parentItem.addresses_target_id),
        )
      ) {
        continue;
      }

      // Was present in parent, no current item references it → satisfied
      results.push({
        snapshot_id: inputs.snapshot_id,
        deal_id: inputs.deal_id,
        user_id: inputs.user_id,
        item_kind: parentItem.item_kind,
        item_id: parentItem.item_id,
        item_label: null,
        status: "satisfied",
        related_personality_ids: [],
        related_axis_keys: [],
        addresses_target_id: parentItem.addresses_target_id,
        first_seen_snapshot_id: parentItem.first_seen_snapshot_id,
        last_seen_snapshot_id: inputs.snapshot_id,
        resolved_at_snapshot_id: inputs.snapshot_id,
        item_payload: null,
        evaluated_at,
      });
    }
  }

  return results;
}

function computeStatus(
  parentItem: ParentRecoveryItemsContext["items"][number] | undefined,
): RecoveryStatus {
  if (!parentItem) return "open";
  if (parentItem.was_satisfied_at_parent) return "regressed";
  return "persisted";
}

/**
 * Extract the addressing target from a recovery priority ID.
 *
 * CP-8 recovery_priorities emit IDs of the form:
 *   "recovery_priority.{index}.{target_key}"
 *
 * We extract everything after the second '.' as the target key. If the
 * pattern doesn't match, return null (the field is nullable in the
 * schema).
 */
function extractTargetIdFromPriorityId(priority_id: string): string | null {
  const match = priority_id.match(/^recovery_priority\.\d+\.(.+)$/);
  return match ? match[1] : null;
}

/**
 * Build a JSON-safe summary payload for a recovery priority. Avoids
 * embedding the full RecoveryPriority structure (which would duplicate
 * data already in the snapshot's artifact_payload). Stores just the
 * fields most useful for at-a-glance dashboard queries.
 */
function serializeRecoveryPriorityPayload(
  priority: RecoveryPriority,
): Record<string, unknown> {
  return {
    label: priority.label,
    leverage_count: priority.leverage_count,
    resolves_discomfort_ids: priority.resolves_discomfort_ids,
    satisfies_comfort_condition_ids: priority.satisfies_comfort_condition_ids,
    addresses_personalities: priority.addresses_personalities,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLAINABILITY TRACE ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

interface ExplainabilityAssemblyInputs {
  readonly snapshot_id: string;
  readonly deal_id: string;
  readonly user_id: string;
  readonly pipeline: PipelineArtifacts;
}

/**
 * Build explainability_traces edges. For each narrative fragment, emit
 * one trace edge per source_id at depth=0 (direct citation).
 *
 * Deeper trace depths (depth > 0) are populated by the dedicated
 * explainability-ledger module when traversing upstream artifacts; the
 * builder produces only the depth-0 edges that come directly from the
 * fragment's source_ids array.
 *
 * The artifact_type for each edge is inferred from the source_id prefix:
 *   "rule.*"             → rule_firing
 *   "pattern.*"          → rule_firing (pattern detections are rule-layer)
 *   "scenario.*"         → scenario_outcome
 *   "component.*"        → axis_component
 *   "comfort.*"          → comfort_condition
 *   "comfort_condition.*"→ comfort_condition
 *   "discomfort.*"       → discomfort
 *   "deal_breaker.*"     → deal_breaker
 *   "assumption.*"       → assumption_concentration
 *   "fragility.*"        → fragility_node
 *   "fingerprint.*"      → fingerprint_signal
 *   "input.*"            → input_metric
 *   "posture.*"          → posture_state
 *   "recovery_priority.*"→ recovery_priority
 *   "structural_concern.*"→ structural_concern
 *   "coverage_gap.*"     → coverage_gap_signal
 *   "axis.*"             → axis_component
 *
 * Conservative fallback: any source_id that doesn't match a known
 * prefix is classified as "input_metric" (the most innocuous bucket).
 */
function buildExplainabilityTraces(
  inputs: ExplainabilityAssemblyInputs,
): ReadonlyArray<ExplainabilityTraceInsert> {
  const fragments = inputs.pipeline.narrative_output.fragments;
  const traces: ExplainabilityTraceInsert[] = [];

  for (const fragment of fragments) {
    for (const sourceId of fragment.source_ids) {
      const artifactType = classifySourceId(sourceId);
      traces.push({
        snapshot_id: inputs.snapshot_id,
        deal_id: inputs.deal_id,
        user_id: inputs.user_id,
        fragment_id: fragment.fragment_id,
        fragment_kind: fragment.kind,
        artifact_type: artifactType,
        artifact_id: sourceId,
        trace_depth: 0,
        parent_trace_id: null,
        artifact_metadata: null,
      });
    }
  }

  // Headline traces — explicit edges to per-axis and per-personality
  // synthesis findings that the headline drew from
  const headline = inputs.pipeline.narrative_output.headline;
  for (const axisKey of headline.related_axis_keys) {
    traces.push({
      snapshot_id: inputs.snapshot_id,
      deal_id: inputs.deal_id,
      user_id: inputs.user_id,
      fragment_id: headline.headline_id,
      fragment_kind: "executive_headline",
      artifact_type: "axis_component",
      artifact_id: `axis.${axisKey}`,
      trace_depth: 0,
      parent_trace_id: null,
      artifact_metadata: null,
    });
  }
  for (const personalityId of headline.related_personality_ids) {
    traces.push({
      snapshot_id: inputs.snapshot_id,
      deal_id: inputs.deal_id,
      user_id: inputs.user_id,
      fragment_id: headline.headline_id,
      fragment_kind: "executive_headline",
      artifact_type: "posture_state",
      artifact_id: `posture.${personalityId}`,
      trace_depth: 0,
      parent_trace_id: null,
      artifact_metadata: null,
    });
  }

  return traces;
}

/**
 * Classify a source_id into an ArtifactType by prefix matching.
 *
 * Order matters: more specific prefixes are checked first.
 */
function classifySourceId(sourceId: string): ArtifactType {
  const id = sourceId.toLowerCase();

  // Most specific prefixes first
  if (id.startsWith("recovery_priority.")) return "recovery_priority";
  if (id.startsWith("structural_concern.")) return "structural_concern";
  if (id.startsWith("coverage_gap.")) return "coverage_gap_signal";
  if (id.startsWith("binding_constraint.")) return "axis_component";
  if (id.startsWith("comfort_condition.")) return "comfort_condition";
  if (id.startsWith("comfort.")) return "comfort_condition";
  if (id.startsWith("deal_breaker.")) return "deal_breaker";
  if (id.startsWith("discomfort.")) return "discomfort";
  if (id.startsWith("fragility.")) return "fragility_node";
  if (id.startsWith("assumption.")) return "assumption_concentration";
  if (id.startsWith("fingerprint.")) return "fingerprint_signal";
  if (id.startsWith("posture.")) return "posture_state";
  if (id.startsWith("scenario.")) return "scenario_outcome";
  if (id.startsWith("component.")) return "axis_component";
  if (id.startsWith("axis.")) return "axis_component";
  if (id.startsWith("rule.")) return "rule_firing";
  if (id.startsWith("pattern.")) return "rule_firing";
  if (id.startsWith("input.")) return "input_metric";

  // Conservative fallback
  return "input_metric";
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HELPERS
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
