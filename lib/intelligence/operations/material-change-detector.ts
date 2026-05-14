// lib/intelligence/operations/material-change-detector.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Material Change Detector
//
// Pure function over (EvaluationDelta from CP-9) + (ThresholdManifest)
// that emits structured MaterialChange[] records.
//
// Material change = a delta entry whose magnitude crosses a threshold
// configured on the manifest. Sub-threshold drift is noise; this
// detector is the filter between noise and signal.
//
// CONSTITUTIONAL INVARIANTS HONORED HERE:
//
//   Invariant #1 (Threshold Manifest) — every classification consults
//   the supplied manifest. No hardcoded threshold literals. Severity
//   counts are named manifest fields.
//
//   Invariant #3 (Observation Provenance) — every MaterialChange and
//   the bundled MaterialChangeReport carry ObservationProvenance.
//
//   Invariant #4 (No Aggregate Scores) — outputs are categorical and
//   structural. No blended severity numbers, no "deal impact score."
//   Severity is one of three enum values.
//
//   Invariant #5 Check 5 (No Nondeterminism) — `Date.now()` permitted
//   only for stamping provenance.computed_at. No Math.random anywhere.
//
// What this module does:
//
//   - Walks each category of EvaluationDelta
//   - For each entry, applies the relevant constitutional rule
//     (e.g., "band transition is material" or "score delta below
//     manifest threshold is informational only")
//   - Produces MaterialChange records with classified severity and
//     traceable artifact references
//
// What this module does NOT do:
//
//   - Predict future changes
//   - Score or rank changes (the impact-ranker module handles ranking
//     of unresolved ITEMS, not changes)
//   - Generate prose summaries
//   - Read from CP-9 directly — it consumes a pre-fetched delta
//
// Pure function — no IO. The orchestrator fetches snapshots, calls
// CP-9's delta engine, and passes the resulting EvaluationDelta here.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisDelta,
  BindingConstraintDelta,
  ClosestPathDelta,
  ComfortConditionDelta,
  CoverageGapDelta,
  EvaluationDelta,
  PostureDelta,
  RecoveryPriorityDelta,
  StructuralConcernDelta,
} from "../persistence/types";
import type {
  MaterialChange,
  MaterialChangeKind,
  MaterialChangeReport,
  MaterialChangeSeverity,
  ObservationProvenance,
  ThresholdManifest,
} from "./types";
import { OPERATIONS_MODULE_VERSION } from "./types";
import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";
import {
  assertBoundaryMetadata,
  BoundaryEnforcementError,
} from "./__boundary__/runtime-assertions";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export interface DetectMaterialChangesInput {
  readonly delta: EvaluationDelta;
  readonly thresholds: ThresholdManifest;
  /** ISO timestamp for provenance.computed_at. If omitted, Date.now() is used. */
  readonly computed_at?: string;
}

/**
 * Detect material changes between two snapshots, given a pre-computed
 * EvaluationDelta and a threshold manifest.
 *
 * Pure function. Same inputs → same outputs (except computed_at).
 *
 * Returns a MaterialChangeReport bundling all detected changes with
 * provenance. Sub-threshold entries are omitted entirely; only the
 * signal makes it through.
 */
export function detectMaterialChanges(
  input: DetectMaterialChangesInput,
): MaterialChangeReport {
  const { delta, thresholds, computed_at } = input;
  const provenance = buildProvenance(
    delta,
    thresholds,
    computed_at,
  );

  const changes: MaterialChange[] = [];

  // ── 1. Axis band crossings ──
  for (const axisDelta of delta.axis_deltas) {
    const change = classifyAxisDelta(axisDelta, thresholds, provenance);
    if (change) changes.push(change);
  }

  // ── 2. Posture state transitions ──
  for (const postureDelta of delta.posture_deltas) {
    const change = classifyPostureDelta(postureDelta, provenance);
    if (change) changes.push(change);
  }

  // ── 3. Binding constraint shifts ──
  const bindingChange = classifyBindingConstraintDelta(
    delta.binding_constraint_delta,
    provenance,
  );
  if (bindingChange) changes.push(bindingChange);

  // ── 4. Closest path shifts ──
  const closestChange = classifyClosestPathDelta(
    delta.closest_path_delta,
    provenance,
  );
  if (closestChange) changes.push(closestChange);

  // ── 5. Coverage gap emerged/resolved ──
  const coverageChanges = classifyCoverageGapDelta(
    delta.coverage_gap_delta,
    provenance,
  );
  for (const change of coverageChanges) changes.push(change);

  // ── 6. Comfort condition regressions ──
  for (const ccDelta of delta.comfort_condition_deltas) {
    const change = classifyComfortConditionDelta(ccDelta, provenance);
    if (change) changes.push(change);
  }

  // ── 7. Structural concern emerging ──
  for (const scDelta of delta.structural_concern_deltas) {
    const change = classifyStructuralConcernDelta(scDelta, provenance);
    if (change) changes.push(change);
  }

  // ── 8. Recovery priority evolved ──
  for (const rpDelta of delta.recovery_priority_deltas) {
    const change = classifyRecoveryPriorityDelta(rpDelta, provenance);
    if (change) changes.push(change);
  }

  // ── Sort for deterministic output ──
  changes.sort(materialChangeOrder);

  return {
    before_snapshot_id: delta.before_snapshot_id,
    after_snapshot_id: delta.after_snapshot_id,
    material_change_count: changes.length,
    changes,
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIS BAND CLASSIFICATION
//
// A band transition is always material (the band ladder is itself a
// significance threshold built into CP-5). Severity depends on how
// many band steps were crossed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered band rank for severity-step computation. Higher rank = farther
 * along the ladder. Used for counting transition magnitude only.
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

function bandRank(axis: string, band: string): number | null {
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
  return UNCERTAINTY_BAND_RANK[band] ?? null;
}

function classifyAxisDelta(
  axisDelta: AxisDelta,
  thresholds: ThresholdManifest,
  provenance: ObservationProvenance,
): MaterialChange | null {
  // Only band transitions are material. Score drift within the same
  // band is informational and omitted entirely (the threshold filter
  // is "did the band change?", not "did the score change?").
  if (axisDelta.band_transition === "unchanged") {
    return null;
  }

  const rankBefore = bandRank(axisDelta.axis, axisDelta.band_before);
  const rankAfter = bandRank(axisDelta.axis, axisDelta.band_after);
  let severity: MaterialChangeSeverity = "notable";

  if (rankBefore !== null && rankAfter !== null) {
    const stepCount = Math.abs(rankAfter - rankBefore);
    if (stepCount >= thresholds.material_band_change_severity_significant) {
      severity = "significant";
    } else if (stepCount >= thresholds.material_band_change_severity_notable) {
      severity = "notable";
    } else {
      severity = "informational";
    }
  }

  return {
    change_kind: "axis_band_crossed",
    severity,
    axis_or_dimension: axisDelta.axis,
    state_before: axisDelta.band_transition,
    state_after: null,
    band_before: axisDelta.band_before,
    band_after: axisDelta.band_after,
    personality_id: null,
    trace_to_artifacts: [
      {
        artifact_type: "axis_component",
        artifact_id: "axis." + axisDelta.axis,
      },
    ],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE STATE TRANSITIONS
//
// Any posture state change between two snapshots is notable by default.
// Cross-band transitions (decline → interested or vice versa) are
// significant. Cross-tier transitions of 1 step (cautious → interested,
// decline → cautious) are notable.
// ─────────────────────────────────────────────────────────────────────────────

const POSTURE_STATE_RANK: Record<string, number> = {
  decline: 0,
  cautious: 1,
  interested: 2,
};

function classifyPostureDelta(
  postureDelta: PostureDelta,
  provenance: ObservationProvenance,
): MaterialChange | null {
  if (postureDelta.state_transition === "unchanged") {
    return null;
  }

  const rankBefore = POSTURE_STATE_RANK[postureDelta.state_before];
  const rankAfter = POSTURE_STATE_RANK[postureDelta.state_after];

  let severity: MaterialChangeSeverity = "notable";
  if (rankBefore !== undefined && rankAfter !== undefined) {
    const stepCount = Math.abs(rankAfter - rankBefore);
    if (stepCount >= 2) {
      // decline ↔ interested — two-step jump, definitely significant
      severity = "significant";
    } else {
      severity = "notable";
    }
  }

  return {
    change_kind: "posture_state_changed",
    severity,
    axis_or_dimension: postureDelta.personality_id,
    state_before: postureDelta.state_before,
    state_after: postureDelta.state_after,
    band_before: null,
    band_after: null,
    personality_id: postureDelta.personality_id,
    trace_to_artifacts: [
      {
        artifact_type: "posture_state",
        artifact_id: "posture." + postureDelta.personality_id,
      },
    ],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BINDING CONSTRAINT SHIFT
//
// Any binding constraint movement is significant — this is the
// architecture's "primary blocker" indicator. Shift to a new axis
// means the deal's limiting factor has fundamentally changed.
// ─────────────────────────────────────────────────────────────────────────────

function classifyBindingConstraintDelta(
  bcDelta: BindingConstraintDelta,
  provenance: ObservationProvenance,
): MaterialChange | null {
  if (bcDelta.status === "unchanged") return null;

  // Axis shift is the most significant binding-constraint event.
  // Band shift or repairability shift is notable; emergence/resolution
  // is also significant.
  let severity: MaterialChangeSeverity;
  switch (bcDelta.status) {
    case "shifted_axis":
    case "emerged":
    case "resolved":
      severity = "significant";
      break;
    case "shifted_band":
    case "shifted_repairability":
      severity = "notable";
      break;
    default:
      severity = "informational";
  }

  return {
    change_kind: "binding_constraint_shifted",
    severity,
    axis_or_dimension: bcDelta.axis_after ?? bcDelta.axis_before ?? "unknown",
    state_before: bcDelta.status,
    state_after: null,
    band_before: bcDelta.band_before,
    band_after: bcDelta.band_after,
    personality_id: null,
    trace_to_artifacts: [
      {
        artifact_type: "axis_component",
        artifact_id:
          "binding_constraint." +
          (bcDelta.axis_after ?? bcDelta.axis_before ?? "unknown"),
      },
    ],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSEST PATH SHIFT
//
// Movement of the closest-recoverable-lender. Significant when the
// lender profile itself changes; notable when only the state changes.
// ─────────────────────────────────────────────────────────────────────────────

function classifyClosestPathDelta(
  cpDelta: ClosestPathDelta,
  provenance: ObservationProvenance,
): MaterialChange | null {
  if (cpDelta.status === "unchanged") return null;

  let severity: MaterialChangeSeverity;
  switch (cpDelta.status) {
    case "shifted_profile":
    case "shifted_both":
    case "newly_available":
    case "lost":
      severity = "significant";
      break;
    case "shifted_state":
      severity = "notable";
      break;
    default:
      severity = "informational";
  }

  const personality = cpDelta.personality_after ?? cpDelta.personality_before;
  return {
    change_kind: "closest_path_shifted",
    severity,
    axis_or_dimension: personality ?? "unknown",
    state_before: cpDelta.state_before,
    state_after: cpDelta.state_after,
    band_before: null,
    band_after: null,
    personality_id: personality,
    trace_to_artifacts: personality
      ? [{ artifact_type: "posture_state", artifact_id: "posture." + personality }]
      : [],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE GAP EMERGE / RESOLVE
//
// Coverage gap is the "no lender finds this deal financeable" state.
// Both emergence and resolution are significant.
// ─────────────────────────────────────────────────────────────────────────────

function classifyCoverageGapDelta(
  cgDelta: CoverageGapDelta,
  provenance: ObservationProvenance,
): ReadonlyArray<MaterialChange> {
  if (cgDelta.status === "persisted" || cgDelta.status === "unchanged_absent") {
    return [];
  }

  const kind: MaterialChangeKind =
    cgDelta.status === "emerged"
      ? "coverage_gap_emerged"
      : "coverage_gap_resolved";

  return [
    {
      change_kind: kind,
      severity: "significant",
      axis_or_dimension: "coverage_gap",
      state_before: cgDelta.status,
      state_after: null,
      band_before: null,
      band_after: null,
      personality_id: null,
      trace_to_artifacts: [
        {
          artifact_type: "coverage_gap_signal",
          artifact_id: "coverage_gap.deal",
        },
      ],
      provenance,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMFORT CONDITION REGRESSION
//
// A comfort condition going from satisfied → unsatisfied is the most
// important regression signal. Always significant — once-resolved
// concerns reopening is institutionally important.
// ─────────────────────────────────────────────────────────────────────────────

function classifyComfortConditionDelta(
  ccDelta: ComfortConditionDelta,
  provenance: ObservationProvenance,
): MaterialChange | null {
  if (ccDelta.status !== "regressed_unsatisfied") return null;

  return {
    change_kind: "comfort_condition_regressed",
    severity: "significant",
    axis_or_dimension: ccDelta.personality_id,
    state_before: "satisfied",
    state_after: "regressed_unsatisfied",
    band_before: null,
    band_after: null,
    personality_id: ccDelta.personality_id,
    trace_to_artifacts: [
      {
        artifact_type: "comfort_condition",
        artifact_id: ccDelta.comfort_condition_id,
      },
    ],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL CONCERN EMERGED
//
// A new structural concern is significant — these are the
// "no lender can absorb this" issues.
// ─────────────────────────────────────────────────────────────────────────────

function classifyStructuralConcernDelta(
  scDelta: StructuralConcernDelta,
  provenance: ObservationProvenance,
): MaterialChange | null {
  if (scDelta.status !== "new") return null;

  return {
    change_kind: "structural_concern_emerged",
    severity: "significant",
    axis_or_dimension: "structural_concern",
    state_before: null,
    state_after: "new",
    band_before: null,
    band_after: null,
    personality_id: null,
    trace_to_artifacts: [
      {
        artifact_type: "structural_concern",
        artifact_id: scDelta.concern_id,
      },
    ],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY PRIORITY EVOLVED
//
// A recovery priority whose ID shifted but addresses the same target
// is notable — the underlying concern persists but has been restated.
// ─────────────────────────────────────────────────────────────────────────────

function classifyRecoveryPriorityDelta(
  rpDelta: RecoveryPriorityDelta,
  provenance: ObservationProvenance,
): MaterialChange | null {
  if (rpDelta.status !== "evolved") return null;

  return {
    change_kind: "recovery_priority_evolved",
    severity: "notable",
    axis_or_dimension: "recovery_priority",
    state_before: "evolved",
    state_after: null,
    band_before: null,
    band_after: null,
    personality_id: null,
    trace_to_artifacts: [
      {
        artifact_type: "recovery_priority",
        artifact_id: rpDelta.priority_id,
      },
    ],
    provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ORDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort comparator producing deterministic ordering across material
 * changes. Ordering: severity (significant → notable → informational),
 * then change_kind, then axis_or_dimension. Same input → same output
 * order every time.
 */
const SEVERITY_RANK: Record<MaterialChangeSeverity, number> = {
  significant: 0,
  notable: 1,
  informational: 2,
};

const CHANGE_KIND_RANK: Record<MaterialChangeKind, number> = {
  binding_constraint_shifted: 0,
  closest_path_shifted: 1,
  coverage_gap_emerged: 2,
  coverage_gap_resolved: 3,
  comfort_condition_regressed: 4,
  structural_concern_emerged: 5,
  axis_band_crossed: 6,
  posture_state_changed: 7,
  recovery_priority_evolved: 8,
};

function materialChangeOrder(a: MaterialChange, b: MaterialChange): number {
  const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sevDiff !== 0) return sevDiff;
  const kindDiff =
    CHANGE_KIND_RANK[a.change_kind] - CHANGE_KIND_RANK[b.change_kind];
  if (kindDiff !== 0) return kindDiff;
  if (a.axis_or_dimension < b.axis_or_dimension) return -1;
  if (a.axis_or_dimension > b.axis_or_dimension) return 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the provenance record for material changes detected from a
 * single delta + manifest pair.
 *
 * `computed_at` is the only nondeterministic field — Date.now() is
 * permitted here by the boundary suite carveout for provenance
 * construction.
 */
function buildProvenance(
  delta: EvaluationDelta,
  thresholds: ThresholdManifest,
  computed_at?: string,
): ObservationProvenance {
  return {
    computed_at: computed_at ?? new Date(Date.now()).toISOString(),
    operations_version: OPERATIONS_MODULE_VERSION,
    threshold_manifest_id: thresholds.manifest_id,
    derived_from_snapshot_ids: [
      delta.before_snapshot_id,
      delta.after_snapshot_id,
    ],
    derived_from_event_ids: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA + SELF-TEST
//
// This module exports no new types beyond what types.ts already
// declares. BOUNDARY_METADATA is empty.
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/material-change-detector",
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
        `CP-10 material-change-detector BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();
