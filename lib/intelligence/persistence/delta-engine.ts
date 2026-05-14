// lib/intelligence/persistence/delta-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Delta Engine
//
// Computes a structured EvaluationDelta from two snapshots. Pure
// function: deterministic over the same input pair.
//
// Architectural commitment locked in advance:
//   THE DELTA ENGINE NEVER COMPARES PROSE.
//
// Only structured artifacts are compared:
//   - per-axis score and band transitions
//   - per-personality posture transitions
//   - fragility nodes resolved/persisted/new
//   - recovery priorities (with target-aware matching for evolved IDs)
//   - comfort conditions (per personality, with regression detection)
//   - information needs (per personality)
//   - structural concerns
//   - coverage gap state
//   - binding constraint shift (axis / band / repairability)
//   - closest path shift (personality / state)
//   - CP version drift per affected dimension
//
// Narrative deltas (if needed by UI) are derived downstream by running
// CP-8 templates over this structured delta. The delta engine emits
// data; presentation reads data. Same architectural pattern as CP-7
// → CP-8.
//
// Why this matters:
//   - Prose comparisons are noisy. A CP-8 polish pass that changes
//     "personality simulation" to "lender-profile simulation" would
//     create thousands of false-positive delta entries.
//   - Structured comparisons are stable. The same logical state
//     produces the same structured delta regardless of how the prose
//     is rendered.
//   - Legal defensibility: "the deal's durability_score improved from
//     21 to 48" is provable from structured artifacts. "The headline
//     paragraph reads differently now" is not.
//
// Version-drift handling:
//   Every per-axis and per-posture delta carries a version_drift_warning
//   boolean. True when the relevant CP version differs between the two
//   snapshots. The caller can choose to suppress those warnings or
//   surface them prominently — the delta itself just exposes the fact.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EvaluationSnapshot,
  EvaluationDelta,
  AxisDelta,
  PostureDelta,
  FragilityNodeDelta,
  RecoveryPriorityDelta,
  ComfortConditionDelta,
  InformationNeedDelta,
  StructuralConcernDelta,
  CoverageGapDelta,
  BindingConstraintDelta,
  ClosestPathDelta,
  RecoveryStatus,
  CPVersionManifest,
} from "./types";
import { PERSISTENCE_MODULE_VERSION } from "./types";
import { detectCPVersionDrift } from "./snapshot-replay";
import type {
  AxisKey,
} from "../types";
import type {
  PersonalityId,
} from "../personalities/types";
import type {
  BindingConstraintFinding,
  ClosestPathFinding,
  CoverageGapFinding,
  PersonalityNarrativeInput,
  RecoveryPriority,
  StructuralConcern,
} from "../narrative/types";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// BAND ORDERING UTILITIES
//
// Three band ladders, each with its own direction:
//
//   StandardAxisBand: concerning < cautionary < moderate < strong
//     Higher rank = better. Used by financial_score, durability_score,
//     evidence_quality.
//
//   FragilityBand: low < moderate < elevated < highly_concentrated
//     Higher rank = worse. Used by assumption_fragility.
//
//   UncertaintyBand: low < moderate < elevated < severe
//     Higher rank = worse. Used by underwriting_uncertainty.
//
// The delta engine needs to know, for each axis:
//   - Which band ladder applies?
//   - Did the band improve, degrade, or stay the same?
//
// We encode this knowledge here in a single place. Future CP-5
// extensions that add new axes must be reflected here too.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Direction in which higher score is "better."
 *
 *   "higher_is_better": financial_score, durability_score, evidence_quality
 *     - higher band rank → improved
 *   "higher_is_worse": assumption_fragility, underwriting_uncertainty
 *     - higher band rank → degraded
 */
type AxisDirection = "higher_is_better" | "higher_is_worse";

const AXIS_DIRECTIONS: Record<AxisKey, AxisDirection> = {
  financial_score: "higher_is_better",
  durability_score: "higher_is_better",
  evidence_quality: "higher_is_better",
  assumption_fragility: "higher_is_worse",
  underwriting_uncertainty: "higher_is_worse",
};

/**
 * Band ranks for each ladder. Higher rank = farther up the ladder.
 * Combined with axis direction, this tells us whether a transition
 * improved or degraded.
 */
const STANDARD_BAND_RANK: Record<string, number> = {
  concerning: 0,
  cautionary: 1,
  moderate: 2,
  strong: 3,
};

const FRAGILITY_BAND_RANK: Record<string, number> = {
  low_concentration: 0,
  moderate_concentration: 1,
  elevated_concentration: 2,
  highly_concentrated: 3,
};

const UNCERTAINTY_BAND_RANK: Record<string, number> = {
  low_uncertainty: 0,
  moderate_uncertainty: 1,
  elevated_uncertainty: 2,
  severe_uncertainty: 3,
};

/**
 * Compute the band ladder rank for a given axis-band pair. Returns
 * null when the band is unrecognized (defensive — shouldn't happen
 * with valid CP-5 artifacts).
 */
function bandRank(axis: AxisKey, band: string): number | null {
  if (
    axis === "financial_score" ||
    axis === "durability_score" ||
    axis === "evidence_quality"
  ) {
    return STANDARD_BAND_RANK[band] ?? null;
  }
  if (axis === "assumption_fragility") {
    return FRAGILITY_BAND_RANK[band] ?? null;
  }
  // underwriting_uncertainty
  return UNCERTAINTY_BAND_RANK[band] ?? null;
}

/**
 * Classify a band transition as improved / degraded / unchanged.
 *
 * Combines rank comparison with axis direction:
 *   higher_is_better + rank went up → improved
 *   higher_is_better + rank went down → degraded
 *   higher_is_worse + rank went up → degraded
 *   higher_is_worse + rank went down → improved
 *   same rank → unchanged
 */
function classifyBandTransition(
  axis: AxisKey,
  band_before: string,
  band_after: string,
): AxisDelta["band_transition"] {
  if (band_before === band_after) return "unchanged";
  const rankBefore = bandRank(axis, band_before);
  const rankAfter = bandRank(axis, band_after);
  if (rankBefore === null || rankAfter === null) return "unchanged";
  if (rankBefore === rankAfter) return "unchanged";

  const movedUp = rankAfter > rankBefore;
  const direction = AXIS_DIRECTIONS[axis];
  if (direction === "higher_is_better") {
    return movedUp ? "improved" : "degraded";
  }
  // higher_is_worse
  return movedUp ? "degraded" : "improved";
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE STATE TRANSITION
//
// State ladder: decline < cautious < interested. Higher = better.
// ─────────────────────────────────────────────────────────────────────────────

const POSTURE_STATE_RANK: Record<"decline" | "cautious" | "interested", number> = {
  decline: 0,
  cautious: 1,
  interested: 2,
};

function classifyPostureTransition(
  before: "interested" | "cautious" | "decline",
  after: "interested" | "cautious" | "decline",
): PostureDelta["state_transition"] {
  if (before === after) return "unchanged";
  const rankBefore = POSTURE_STATE_RANK[before];
  const rankAfter = POSTURE_STATE_RANK[after];
  if (rankAfter > rankBefore) return "improved";
  return "degraded";
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION DRIFT MAPPING
//
// Each delta dimension is "owned" by one or more CP versions. When
// those CP versions differ between snapshots, the dimension carries
// a version_drift_warning.
//
// Mapping:
//   axis deltas → CP-5 (axis composition)
//   posture deltas → CP-6 (personality catalogue) + CP-7 (simulator)
//   fragility deltas → CP-5
//   recovery / comfort / structural / coverage_gap / binding /
//     closest_path → CP-8 (narrative synthesis)
//
// We use this to set version_drift_warning on each per-axis and
// per-posture delta entry; the overall cp_version_drift array on
// the result carries the union of all drifted keys.
// ─────────────────────────────────────────────────────────────────────────────

function isAxisVersionDrifted(
  before: CPVersionManifest,
  after: CPVersionManifest,
): boolean {
  return before.cp5 !== after.cp5;
}

function isPostureVersionDrifted(
  before: CPVersionManifest,
  after: CPVersionManifest,
): boolean {
  return before.cp6 !== after.cp6 || before.cp7 !== after.cp7;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a structured delta between two snapshots.
 *
 * Pure function. Order matters: `before` is the earlier state,
 * `after` is the later. The result describes what changed in moving
 * from before to after.
 *
 * No IO. No narrative. Structured artifacts only.
 *
 * If the snapshots have different CP versions, the delta still
 * computes (per the B2 decision: compare with explicit warnings).
 * Per-dimension drift flags surface which axes / postures are
 * affected. The caller decides how to present that.
 */
export function computeEvaluationDelta(
  before: EvaluationSnapshot,
  after: EvaluationSnapshot,
): EvaluationDelta {
  const driftedKeys = detectCPVersionDrift(
    before.cp_versions,
    after.cp_versions,
  );

  const beforeArtifacts = before.artifact_payload;
  const afterArtifacts = after.artifact_payload;
  const beforeSynthesis = beforeArtifacts.narrative_output.synthesis;
  const afterSynthesis = afterArtifacts.narrative_output.synthesis;

  const axisVersionDrifted = isAxisVersionDrifted(
    before.cp_versions,
    after.cp_versions,
  );
  const postureVersionDrifted = isPostureVersionDrifted(
    before.cp_versions,
    after.cp_versions,
  );

  // ── Axis deltas (5 always present) ──
  const axisKeys: ReadonlyArray<AxisKey> = [
    "financial_score",
    "durability_score",
    "evidence_quality",
    "assumption_fragility",
    "underwriting_uncertainty",
  ];

  const axis_deltas: AxisDelta[] = axisKeys.map((axis) => {
    const beforeScore = beforeArtifacts.axis_composition_result[axis];
    const afterScore = afterArtifacts.axis_composition_result[axis];
    return {
      axis,
      score_before: beforeScore.score,
      score_after: afterScore.score,
      score_delta: afterScore.score - beforeScore.score,
      band_before: beforeScore.band,
      band_after: afterScore.band,
      band_transition: classifyBandTransition(
        axis,
        beforeScore.band,
        afterScore.band,
      ),
      version_drift_warning: axisVersionDrifted,
    };
  });

  // ── Posture deltas (one per personality, matched by personality_id) ──
  const posture_deltas: PostureDelta[] = computePostureDeltas(
    beforeSynthesis.per_personality,
    afterSynthesis.per_personality,
    postureVersionDrifted,
  );

  // ── Fragility node deltas ──
  const fragility_node_deltas: FragilityNodeDelta[] =
    computeFragilityNodeDeltas(
      beforeArtifacts.axis_composition_result.assumption_fragility_graph.nodes,
      afterArtifacts.axis_composition_result.assumption_fragility_graph.nodes,
    );

  // ── Recovery priority deltas (with target-aware matching for evolved IDs) ──
  const recovery_priority_deltas: RecoveryPriorityDelta[] =
    computeRecoveryPriorityDeltas(
      beforeSynthesis.recovery_priorities,
      afterSynthesis.recovery_priorities,
    );

  // ── Comfort condition deltas (per personality) ──
  const comfort_condition_deltas: ComfortConditionDelta[] =
    computeComfortConditionDeltas(
      beforeSynthesis.per_personality,
      afterSynthesis.per_personality,
    );

  // ── Information need deltas (per personality) ──
  // Information needs are not on PersonalityNarrativeInput; they live
  // on the simulator's posture entries. Pull from batch_posture_result.
  const information_need_deltas: InformationNeedDelta[] =
    computeInformationNeedDeltas(
      beforeArtifacts.batch_posture_result,
      afterArtifacts.batch_posture_result,
    );

  // ── Structural concern deltas ──
  const structural_concern_deltas: StructuralConcernDelta[] =
    computeStructuralConcernDeltas(
      beforeSynthesis.structural_concerns,
      afterSynthesis.structural_concerns,
    );

  // ── Coverage gap delta ──
  const coverage_gap_delta = computeCoverageGapDelta(
    beforeSynthesis.coverage_gap,
    afterSynthesis.coverage_gap,
  );

  // ── Binding constraint delta ──
  const binding_constraint_delta = computeBindingConstraintDelta(
    beforeSynthesis.binding_constraint,
    afterSynthesis.binding_constraint,
  );

  // ── Closest path delta ──
  const closest_path_delta = computeClosestPathDelta(
    beforeSynthesis.closest_path,
    afterSynthesis.closest_path,
  );

  // ── Summary statistics ──
  const summary = summarize({
    axis_deltas,
    posture_deltas,
    fragility_node_deltas,
    recovery_priority_deltas,
    comfort_condition_deltas,
    structural_concern_deltas,
  });

  return {
    delta_id: makeDeltaId(before.snapshot_id, after.snapshot_id),
    computed_at: new Date().toISOString(),
    before_snapshot_id: before.snapshot_id,
    after_snapshot_id: after.snapshot_id,
    before_evaluated_at: before.created_at,
    after_evaluated_at: after.created_at,
    cp_version_drift: driftedKeys,
    schema_version_drift: before.schema_version !== after.schema_version,
    axis_deltas,
    posture_deltas,
    fragility_node_deltas,
    recovery_priority_deltas,
    comfort_condition_deltas,
    information_need_deltas,
    structural_concern_deltas,
    coverage_gap_delta,
    binding_constraint_delta,
    closest_path_delta,
    summary,
    version: PERSISTENCE_MODULE_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE DELTAS
// ─────────────────────────────────────────────────────────────────────────────

function computePostureDeltas(
  before: ReadonlyArray<PersonalityNarrativeInput>,
  after: ReadonlyArray<PersonalityNarrativeInput>,
  version_drifted: boolean,
): PostureDelta[] {
  const beforeById = new Map<PersonalityId, PersonalityNarrativeInput>();
  for (const p of before) beforeById.set(p.personality_id, p);

  const results: PostureDelta[] = [];
  for (const afterP of after) {
    const beforeP = beforeById.get(afterP.personality_id);
    if (!beforeP) continue; // new personality (rare; only if CP-6 expands)

    results.push({
      personality_id: afterP.personality_id,
      state_before: beforeP.state,
      state_after: afterP.state,
      state_transition: classifyPostureTransition(beforeP.state, afterP.state),
      coverage_gap_before: beforeP.is_coverage_gap_affected,
      coverage_gap_after: afterP.is_coverage_gap_affected,
      fatal_count_before: beforeP.fatal_discomfort_ids.length,
      fatal_count_after: afterP.fatal_discomfort_ids.length,
      repairable_count_before: beforeP.repairable_discomfort_ids.length,
      repairable_count_after: afterP.repairable_discomfort_ids.length,
      version_drift_warning: version_drifted,
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAGILITY NODE DELTAS
// ─────────────────────────────────────────────────────────────────────────────

interface MinimalFragilityNode {
  readonly assumption_key: string;
  readonly assumption_name: string;
  readonly dependent_conclusions?: ReadonlyArray<unknown>;
  readonly evidence_strength?: number | null;
}

function computeFragilityNodeDeltas(
  beforeNodes: ReadonlyArray<MinimalFragilityNode>,
  afterNodes: ReadonlyArray<MinimalFragilityNode>,
): FragilityNodeDelta[] {
  const beforeMap = new Map<string, MinimalFragilityNode>();
  for (const n of beforeNodes) beforeMap.set(n.assumption_key, n);
  const afterMap = new Map<string, MinimalFragilityNode>();
  for (const n of afterNodes) afterMap.set(n.assumption_key, n);

  const results: FragilityNodeDelta[] = [];
  const allKeys = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);

  for (const key of allKeys) {
    const beforeNode = beforeMap.get(key);
    const afterNode = afterMap.get(key);

    let status: "resolved" | "persisted" | "new";
    if (beforeNode && !afterNode) status = "resolved";
    else if (!beforeNode && afterNode) status = "new";
    else status = "persisted";

    const name = afterNode?.assumption_name ?? beforeNode?.assumption_name ?? key;

    results.push({
      assumption_key: key,
      assumption_name: name,
      status,
      conclusion_count_before:
        beforeNode?.dependent_conclusions?.length ?? null,
      conclusion_count_after:
        afterNode?.dependent_conclusions?.length ?? null,
      evidence_strength_before: beforeNode?.evidence_strength ?? null,
      evidence_strength_after: afterNode?.evidence_strength ?? null,
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY PRIORITY DELTAS (target-aware matching for evolved IDs)
// ─────────────────────────────────────────────────────────────────────────────

function computeRecoveryPriorityDeltas(
  before: ReadonlyArray<RecoveryPriority>,
  after: ReadonlyArray<RecoveryPriority>,
): RecoveryPriorityDelta[] {
  // Build maps both by priority_id (exact match) and by extracted
  // addresses_target (for evolved-id matching). Same logic as
  // snapshot-builder uses for recovery_path_history status.
  const beforeById = new Map<string, RecoveryPriority>();
  const beforeByTarget = new Map<string, RecoveryPriority>();
  for (const p of before) {
    beforeById.set(p.priority_id, p);
    const target = extractTargetIdFromPriorityId(p.priority_id);
    if (target !== null) beforeByTarget.set(target, p);
  }

  const afterById = new Map<string, RecoveryPriority>();
  const afterByTarget = new Map<string, RecoveryPriority>();
  for (const p of after) {
    afterById.set(p.priority_id, p);
    const target = extractTargetIdFromPriorityId(p.priority_id);
    if (target !== null) afterByTarget.set(target, p);
  }

  const results: RecoveryPriorityDelta[] = [];
  const processedTargets = new Set<string>();

  // Items in after: matched (persisted), matched-by-target (evolved), or new (open)
  for (const afterP of after) {
    const target = extractTargetIdFromPriorityId(afterP.priority_id);
    const directMatch = beforeById.get(afterP.priority_id);
    const targetMatch = target !== null ? beforeByTarget.get(target) : undefined;

    let status: RecoveryStatus;
    let leverage_before: number | null;
    if (directMatch) {
      status = "persisted";
      leverage_before = directMatch.leverage_count ?? null;
    } else if (targetMatch) {
      status = "evolved";
      leverage_before = targetMatch.leverage_count ?? null;
      if (target !== null) processedTargets.add(target);
    } else {
      status = "open";
      leverage_before = null;
    }

    results.push({
      priority_id: afterP.priority_id,
      label: afterP.label,
      status,
      leverage_count_before: leverage_before,
      leverage_count_after: afterP.leverage_count ?? null,
    });
  }

  // Items in before with no current match (and no evolved match) → satisfied
  for (const beforeP of before) {
    if (afterById.has(beforeP.priority_id)) continue;
    const target = extractTargetIdFromPriorityId(beforeP.priority_id);
    // If a current item already addresses this target, the evolved row
    // above covers it; don't double-emit.
    if (target !== null && processedTargets.has(target)) continue;
    // If a current item maps to the same target under a different ID
    // (and we haven't yet flagged it), still skip the satisfied emission
    if (target !== null && afterByTarget.has(target)) continue;

    results.push({
      priority_id: beforeP.priority_id,
      label: beforeP.label,
      status: "satisfied",
      leverage_count_before: beforeP.leverage_count ?? null,
      leverage_count_after: null,
    });
  }

  return results;
}

function extractTargetIdFromPriorityId(priority_id: string): string | null {
  const match = priority_id.match(/^recovery_priority\.\d+\.(.+)$/);
  return match ? match[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMFORT CONDITION DELTAS (per personality)
// ─────────────────────────────────────────────────────────────────────────────

function computeComfortConditionDeltas(
  before: ReadonlyArray<PersonalityNarrativeInput>,
  after: ReadonlyArray<PersonalityNarrativeInput>,
): ComfortConditionDelta[] {
  const beforeByPersonality = new Map<PersonalityId, PersonalityNarrativeInput>();
  for (const p of before) beforeByPersonality.set(p.personality_id, p);

  const results: ComfortConditionDelta[] = [];

  for (const afterP of after) {
    const beforeP = beforeByPersonality.get(afterP.personality_id);
    if (!beforeP) continue;

    const beforeSatisfied = new Set(beforeP.satisfied_comfort_condition_ids);
    const beforeUnsatisfied = new Set(beforeP.unsatisfied_comfort_condition_ids);
    const afterSatisfied = new Set(afterP.satisfied_comfort_condition_ids);
    const afterUnsatisfied = new Set(afterP.unsatisfied_comfort_condition_ids);

    const allConditions = new Set<string>([
      ...beforeSatisfied,
      ...beforeUnsatisfied,
      ...afterSatisfied,
      ...afterUnsatisfied,
    ]);

    for (const cc of allConditions) {
      const wasSatisfied = beforeSatisfied.has(cc);
      const wasUnsatisfied = beforeUnsatisfied.has(cc);
      const isSatisfied = afterSatisfied.has(cc);
      const isUnsatisfied = afterUnsatisfied.has(cc);

      // Decide status — five mutually-exclusive cases
      let status: ComfortConditionDelta["status"] | null = null;
      if (!wasSatisfied && !wasUnsatisfied && isUnsatisfied) {
        status = "new_unsatisfied";
      } else if (wasUnsatisfied && isSatisfied) {
        status = "newly_satisfied";
      } else if (wasSatisfied && isSatisfied) {
        status = "persisted_satisfied";
      } else if (wasUnsatisfied && isUnsatisfied) {
        status = "persisted_unsatisfied";
      } else if (wasSatisfied && isUnsatisfied) {
        status = "regressed_unsatisfied";
      }

      if (status === null) continue; // not a state we care about

      results.push({
        comfort_condition_id: cc,
        personality_id: afterP.personality_id,
        status,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// INFORMATION NEED DELTAS
// ─────────────────────────────────────────────────────────────────────────────

function computeInformationNeedDeltas(
  before: { readonly entries: ReadonlyArray<{ readonly personality_id: string; readonly posture: { readonly unmet_information_needs: ReadonlyArray<string> } }> },
  after: { readonly entries: ReadonlyArray<{ readonly personality_id: string; readonly posture: { readonly unmet_information_needs: ReadonlyArray<string> } }> },
): InformationNeedDelta[] {
  const beforeByPersonality = new Map<string, Set<string>>();
  for (const entry of before.entries) {
    beforeByPersonality.set(
      entry.personality_id,
      new Set(entry.posture.unmet_information_needs),
    );
  }

  const results: InformationNeedDelta[] = [];

  for (const entry of after.entries) {
    const beforeNeeds = beforeByPersonality.get(entry.personality_id) ?? new Set<string>();
    const afterNeeds = new Set(entry.posture.unmet_information_needs);
    const allNeeds = new Set<string>([...beforeNeeds, ...afterNeeds]);

    for (const need of allNeeds) {
      const wasOpen = beforeNeeds.has(need);
      const isOpen = afterNeeds.has(need);

      let status: "satisfied" | "persisted" | "new";
      if (wasOpen && !isOpen) status = "satisfied";
      else if (!wasOpen && isOpen) status = "new";
      else status = "persisted";

      results.push({
        info_need_id: need,
        personality_id: entry.personality_id as PersonalityId,
        status,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL CONCERN DELTAS
// ─────────────────────────────────────────────────────────────────────────────

function computeStructuralConcernDeltas(
  before: ReadonlyArray<StructuralConcern>,
  after: ReadonlyArray<StructuralConcern>,
): StructuralConcernDelta[] {
  const beforeById = new Map<string, StructuralConcern>();
  for (const c of before) beforeById.set(c.concern_id, c);
  const afterById = new Map<string, StructuralConcern>();
  for (const c of after) afterById.set(c.concern_id, c);

  const allIds = new Set<string>([...beforeById.keys(), ...afterById.keys()]);
  const results: StructuralConcernDelta[] = [];

  for (const id of allIds) {
    const beforeC = beforeById.get(id);
    const afterC = afterById.get(id);

    let status: "resolved" | "persisted" | "new";
    if (beforeC && !afterC) status = "resolved";
    else if (!beforeC && afterC) status = "new";
    else status = "persisted";

    const description =
      afterC?.description ?? beforeC?.description ?? "(no description)";

    results.push({
      concern_id: id,
      description,
      status,
      affected_personalities_before: beforeC?.affected_personalities ?? [],
      affected_personalities_after: afterC?.affected_personalities ?? [],
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE GAP DELTA
// ─────────────────────────────────────────────────────────────────────────────

function computeCoverageGapDelta(
  before: CoverageGapFinding,
  after: CoverageGapFinding,
): CoverageGapDelta {
  let status: CoverageGapDelta["status"];
  if (before.is_coverage_gap && after.is_coverage_gap) {
    status = "persisted";
  } else if (!before.is_coverage_gap && after.is_coverage_gap) {
    status = "emerged";
  } else if (before.is_coverage_gap && !after.is_coverage_gap) {
    status = "resolved";
  } else {
    status = "unchanged_absent";
  }

  return {
    status,
    affected_personalities_before: before.affected_personalities ?? [],
    affected_personalities_after: after.affected_personalities ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BINDING CONSTRAINT DELTA
// ─────────────────────────────────────────────────────────────────────────────

function computeBindingConstraintDelta(
  before: BindingConstraintFinding | null,
  after: BindingConstraintFinding | null,
): BindingConstraintDelta {
  let status: BindingConstraintDelta["status"];

  if (!before && !after) {
    status = "unchanged";
  } else if (!before && after) {
    status = "emerged";
  } else if (before && !after) {
    status = "resolved";
  } else if (before && after) {
    if (before.axis !== after.axis) status = "shifted_axis";
    else if (before.band !== after.band) status = "shifted_band";
    else if (before.repairability !== after.repairability)
      status = "shifted_repairability";
    else status = "unchanged";
  } else {
    status = "unchanged";
  }

  return {
    status,
    axis_before: before?.axis ?? null,
    axis_after: after?.axis ?? null,
    band_before: before?.band ?? null,
    band_after: after?.band ?? null,
    repairability_before: before?.repairability ?? null,
    repairability_after: after?.repairability ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSEST PATH DELTA
// ─────────────────────────────────────────────────────────────────────────────

function computeClosestPathDelta(
  before: ClosestPathFinding | null,
  after: ClosestPathFinding | null,
): ClosestPathDelta {
  let status: ClosestPathDelta["status"];

  if (!before && !after) {
    status = "unchanged";
  } else if (!before && after) {
    status = "newly_available";
  } else if (before && !after) {
    status = "lost";
  } else if (before && after) {
    const profileChanged = before.personality_id !== after.personality_id;
    const stateChanged = before.current_state !== after.current_state;
    if (profileChanged && stateChanged) status = "shifted_both";
    else if (profileChanged) status = "shifted_profile";
    else if (stateChanged) status = "shifted_state";
    else status = "unchanged";
  } else {
    status = "unchanged";
  }

  return {
    status,
    personality_before: before?.personality_id ?? null,
    personality_after: after?.personality_id ?? null,
    state_before: before?.current_state ?? null,
    state_after: after?.current_state ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

function summarize(deltas: {
  axis_deltas: ReadonlyArray<AxisDelta>;
  posture_deltas: ReadonlyArray<PostureDelta>;
  fragility_node_deltas: ReadonlyArray<FragilityNodeDelta>;
  recovery_priority_deltas: ReadonlyArray<RecoveryPriorityDelta>;
  comfort_condition_deltas: ReadonlyArray<ComfortConditionDelta>;
  structural_concern_deltas: ReadonlyArray<StructuralConcernDelta>;
}): EvaluationDelta["summary"] {
  return {
    axes_improved: deltas.axis_deltas.filter(
      (a) => a.band_transition === "improved",
    ).length,
    axes_degraded: deltas.axis_deltas.filter(
      (a) => a.band_transition === "degraded",
    ).length,
    postures_improved: deltas.posture_deltas.filter(
      (p) => p.state_transition === "improved",
    ).length,
    postures_degraded: deltas.posture_deltas.filter(
      (p) => p.state_transition === "degraded",
    ).length,
    fragility_nodes_resolved: deltas.fragility_node_deltas.filter(
      (f) => f.status === "resolved",
    ).length,
    fragility_nodes_new: deltas.fragility_node_deltas.filter(
      (f) => f.status === "new",
    ).length,
    comfort_conditions_newly_satisfied:
      deltas.comfort_condition_deltas.filter(
        (c) => c.status === "newly_satisfied",
      ).length,
    comfort_conditions_regressed: deltas.comfort_condition_deltas.filter(
      (c) => c.status === "regressed_unsatisfied",
    ).length,
    recovery_priorities_satisfied: deltas.recovery_priority_deltas.filter(
      (r) => r.status === "satisfied",
    ).length,
    recovery_priorities_new: deltas.recovery_priority_deltas.filter(
      (r) => r.status === "open",
    ).length,
    structural_concerns_resolved: deltas.structural_concern_deltas.filter(
      (s) => s.status === "resolved",
    ).length,
    structural_concerns_new: deltas.structural_concern_deltas.filter(
      (s) => s.status === "new",
    ).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELTA ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic delta_id from the snapshot pair. Same pair → same
 * delta_id. Format: "delta::{before_id}::{after_id}". Not stored in
 * the database (the delta itself isn't stored), but useful as a
 * cache key.
 */
function makeDeltaId(before_id: string, after_id: string): string {
  return `delta::${before_id}::${after_id}`;
}
