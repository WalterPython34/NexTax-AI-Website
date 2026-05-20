// lib/intelligence/orchestrator/run-cp-pipeline.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — CP Pipeline Orchestrator (Phase 0, Shadow Mode)
//
// Composes the frozen CP-2 through CP-8 modules into a single server-side
// entry point, builds the CP-9 snapshot, and persists it.
//
// CONSTITUTIONAL STATUS: this is NEW INTEGRATION GLUE, not an engine
// modification. It imports and CALLS the frozen pipeline functions in
// sequence. It introduces no new primitives, no new thresholds, no new
// classifications, no new scores. CP-2 through CP-10 remain frozen.
//
// PURPOSE (shadow mode): run the CP pipeline server-side on real production
// deal inputs AFTER the live (computeModalScore) evaluation completes, and
// persist a CP-9 snapshot. The two engines are NOT reconciled. Divergence is
// telemetry to observe, not a bug. computeModalScore stays user-facing.
//
// PIPELINE COMPOSITION (verified against frozen signatures):
//   resolveFingerprint(industry_key)                       → FingerprintResolution
//   evaluateRuleEngine(inputs, fingerprint)                → RuleEngineResult
//   evaluateScenarios(inputs, fingerprint, rule)           → ScenarioEvaluationResult
//   composeAxes({rule, scenario, fingerprint, source})     → AxisCompositionResult
//   simulateAllPostures({axis, scenario})                  → BatchSimulationResult
//   generateNarrative({axis, scenario, batch})             → NarrativeOutput
//   buildSnapshot({context, pipeline, parent, evaluated})  → SnapshotBuilderOutput
//   repository.writeSnapshot(output)                       → persisted
//
// ERROR DISCIPLINE: this function returns a structured result and does not
// throw for expected failure conditions. The caller (the /api/record-deal
// shadow attachment) wraps the whole call so that even an unexpected throw
// can never break the user-facing deal save.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";

// CP-2
import { resolveFingerprint } from "../industry-fingerprints";
// CP-3
import { evaluateRuleEngine } from "../rules/rule-engine";
import type { RuleEngineInputs } from "../rules/types";
// CP-4
import { evaluateScenarios } from "../scenarios/scenario-engine";
// CP-5
import { composeAxes } from "../axes/axis-engine";
// CP-6
import { simulateAllPostures } from "../simulation/simulator";
// CP-8
import { generateNarrative } from "../narrative/narrative-engine";
// CP-9
import { buildSnapshot } from "../persistence/snapshot-builder";
import type {
  SnapshotBuildContext,
  PipelineArtifacts,
} from "../persistence/snapshot-builder";
import { createSnapshotRepository } from "../persistence/snapshot-repository";
import type { CPVersionManifest } from "../persistence/types";

// ─────────────────────────────────────────────────────────────────────────────
// CP VERSION MANIFEST
//
// Recorded into every snapshot so the exact engine versions that produced an
// evaluation are auditable. These are the frozen module versions.
// ─────────────────────────────────────────────────────────────────────────────

export const CP_PIPELINE_VERSIONS: CPVersionManifest = {
  cp2: "cp2-v0.1.0",
  cp3: "cp3-v0.1.0",
  cp4: "cp4-v0.1.0",
  cp5: "cp5-v0.1.0",
  cp6: "cp6-v0.1.0",
  cp7: "cp7-v0.1.0",
  cp8: "cp8-v0.1.0",
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT / OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Everything the orchestrator needs to run the pipeline and persist a
 * snapshot for a single deal evaluation.
 *
 * `rule_inputs` is the already-mapped CP RuleEngineInputs (produced by the
 * separate input adapter — this module does not know about the live
 * /api/record-deal body shape). Keeping the adapter separate preserves the
 * boundary: the orchestrator composes the engine; the adapter translates
 * production inputs.
 */
export interface RunCpPipelineInput {
  // ── Identity / ownership (for the snapshot) ──
  readonly deal_id: string;
  readonly user_id: string;
  readonly team_id?: string | null;

  // ── The mapped CP inputs (from the adapter) ──
  readonly rule_inputs: RuleEngineInputs;

  // ── Raw input payload, stored verbatim on the snapshot for provenance ──
  // This is the original production input (e.g. the /api/record-deal body),
  // captured for audit/divergence analysis. It does NOT feed computation.
  readonly raw_input_payload: Record<string, unknown>;

  // ── Deal source type (used by CP-5 fragility graph) ──
  readonly deal_source_type?: string | null;

  // ── Evaluation identity ──
  // A stable engine-side evaluation id. For fresh shadow evaluations this is
  // also the root_evaluation_id and parent_snapshot_id is null.
  readonly evaluation_id: string;

  // ── Optional: who/what triggered this evaluation ──
  readonly triggered_by?: string | null;

  // ── Optional override for evaluated_at (defaults to now) ──
  readonly evaluated_at?: string;
}

export type RunCpPipelineResult =
  | {
      readonly ok: true;
      readonly snapshot_id: string;
      readonly canonical_evaluation_hash: string;
    }
  | {
      readonly ok: false;
      readonly stage: PipelineStage;
      readonly error_kind: string;
      readonly message: string;
    };

export type PipelineStage =
  | "fingerprint"
  | "rule_engine"
  | "scenarios"
  | "axes"
  | "simulation"
  | "narrative"
  | "build_snapshot"
  | "persist";

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full CP-2 → CP-9 pipeline for one deal and persist the snapshot.
 *
 * Returns a structured result. Does not throw for expected conditions
 * (fingerprint miss, build validation failure, persist error) — these come
 * back as { ok: false, stage, error_kind, message }.
 *
 * The caller is responsible for wrapping this in shadow-mode error isolation
 * so that no failure here can affect the user-facing save path.
 *
 * @param input  Mapped CP inputs + identity/lineage context.
 * @param supabase  A Supabase client (service-role in the shadow path; the
 *   ownership boundary is enforced upstream at the API layer, not here).
 */
export async function runCpPipelineAndPersist(
  input: RunCpPipelineInput,
  supabase: SupabaseClient,
): Promise<RunCpPipelineResult> {
  const evaluatedAt = input.evaluated_at ?? new Date().toISOString();
  const industryKey = input.rule_inputs.industry_key ?? "";

  // ── CP-2: Fingerprint resolution ──
  const fingerprintResolution = resolveFingerprint(industryKey);
  // resolveFingerprint always returns a resolution (with fallback flag) —
  // it does not throw. If the industry is unknown it resolves to a fallback
  // fingerprint, which is acceptable for shadow telemetry (we observe what CP
  // does with unknown industries too).

  // ── CP-3: Rule engine ──
  let ruleResult;
  try {
    ruleResult = evaluateRuleEngine(input.rule_inputs, fingerprintResolution);
  } catch (err) {
    return stageError("rule_engine", err);
  }

  // ── CP-4: Scenarios ──
  let scenarioResult;
  try {
    scenarioResult = evaluateScenarios(
      input.rule_inputs,
      fingerprintResolution,
      ruleResult,
    );
  } catch (err) {
    return stageError("scenarios", err);
  }

  // ── CP-5: Axis composition ──
  let axisResult;
  try {
    axisResult = composeAxes({
      rule_engine_result: ruleResult,
      scenario_evaluation_result: scenarioResult,
      fingerprint_resolution: fingerprintResolution,
      deal_source_type: input.deal_source_type ?? null,
    });
  } catch (err) {
    return stageError("axes", err);
  }

  // ── CP-6: Posture simulation ──
  let batchResult;
  try {
    batchResult = simulateAllPostures({
      axis_composition_result: axisResult,
      scenario_evaluation_result: scenarioResult,
    });
  } catch (err) {
    return stageError("simulation", err);
  }

  // ── CP-8: Narrative ──
  let narrativeOutput;
  try {
    narrativeOutput = generateNarrative({
      axis_composition_result: axisResult,
      scenario_evaluation_result: scenarioResult,
      batch_posture_result: batchResult,
    });
  } catch (err) {
    return stageError("narrative", err);
  }

  // ── CP-9: Build snapshot ──
  const pipeline: PipelineArtifacts = {
    fingerprint_resolution: fingerprintResolution,
    rule_engine_result: ruleResult,
    scenario_evaluation_result: scenarioResult,
    axis_composition_result: axisResult,
    batch_posture_result: batchResult,
    narrative_output: narrativeOutput,
  };

  const context: SnapshotBuildContext = {
    evaluation_id: input.evaluation_id,
    deal_id: input.deal_id,
    user_id: input.user_id,
    team_id: input.team_id ?? null,
    cp_versions: CP_PIPELINE_VERSIONS,
    raw_input_payload: input.raw_input_payload,
    normalized_engine_inputs: {
      ...input.rule_inputs,
      // NormalizedEngineInputs requires these two as non-optional strings.
      industry_key: industryKey,
      deal_source_type: input.deal_source_type ?? "unknown",
    },
    replay_origin: "original",
    replay_source_snapshot_id: null,
    parent_snapshot_id: null,
    root_evaluation_id: input.evaluation_id, // root: equals evaluation_id
    change_reason: "initial_evaluation",
    change_description: null,
    triggered_by: input.triggered_by ?? null,
    triggered_by_event_id: null,
  };

  const buildResult = buildSnapshot({
    context,
    pipeline,
    parent_recovery_items: null, // fresh shadow evaluation, no parent
    evaluated_at: evaluatedAt,
  });

  if (!buildResult.ok) {
    return {
      ok: false,
      stage: "build_snapshot",
      error_kind: buildResult.error.code,
      message: buildResult.error.message,
    };
  }

  // ── CP-9: Persist ──
  const repo = createSnapshotRepository(supabase);
  const writeResult = await repo.writeSnapshot(buildResult.value);
  if (!writeResult.ok) {
    return {
      ok: false,
      stage: "persist",
      error_kind: writeResult.error.code,
      message: writeResult.error.message,
    };
  }

  // writeSnapshot returns PersistenceResult<string> — value IS the snapshot_id.
  return {
    ok: true,
    snapshot_id: writeResult.value,
    canonical_evaluation_hash: buildResult.value.canonical_evaluation_hash,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function stageError(stage: PipelineStage, err: unknown): RunCpPipelineResult {
  return {
    ok: false,
    stage,
    error_kind: "pipeline_stage_threw",
    message: err instanceof Error ? err.message : String(err),
  };
}
