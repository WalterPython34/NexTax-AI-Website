// lib/intelligence/operations/operations-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-10 Operations Engine (Orchestrator)
//
// Single entry point for the operational intelligence layer. Wraps:
//
//   - threshold-manifest (Invariant #1 anchor)
//   - material-change-detector
//   - stalled-path-detector
//   - structural-trajectory
//   - impact-ranker
//   - readiness-classifier
//   - monitoring-watchlist (CRUD + firing evaluator)
//   - deal-evolution-reader
//
// Plus a reference to CP-9's SnapshotRepository for data fetching.
//
// CONSTITUTIONAL INVARIANTS HONORED:
//
//   Invariant #1 (Threshold Manifest) — every query accepts an
//   optional threshold_manifest_id, defaulting to the platform
//   default. Same manifest used for every primitive in a single
//   query.
//
//   Invariant #2 (Scope Abstraction) — watchlist evaluation
//   distinguishes deal/portfolio/global; portfolio firings return
//   typed not_yet_implemented count.
//
//   Invariant #3 (Observation Provenance) — every primitive carries
//   its own provenance.
//
//   Invariant #4 (No Aggregate Scores) — orchestrator never blends
//   primitives into a numeric score. Bundled reports carry only
//   counts.
//
//   Invariant #5 (Boundary Enforcement) — module-load self-test
//   validates BOUNDARY_METADATA.
//
// Architectural commitments:
//
//   1. Engine does not own its database client. The caller passes
//      a SupabaseClient at construction.
//
//   2. Engine is stateless. Same query, same input, same output
//      (except provenance.computed_at).
//
//   3. Engine surfaces seven query methods matching the planned
//      CP-10 query surfaces, plus one compound bundle.
//
//   4. All engine methods return OperationsResult<T>.
//
//   5. Underlying repositories exposed as readonly for lower-level
//      access (CRUD on watchlist entries, manifest creation).
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";

// CP-9 dependencies
import type {
  EvaluationDelta,
  EvaluationSnapshot,
  EvaluationStateSummary,
  RecoveryPathHistoryEntry,
} from "../persistence/types";
import {
  createSnapshotRepository,
  SnapshotRepository,
} from "../persistence/snapshot-repository";
import { computeEvaluationDelta } from "../persistence/delta-engine";

// CP-10 dependencies
import type {
  DealEvolutionTrajectory,
  ImpactRankingReport,
  MaterialChangeReport,
  OperationsError,
  OperationsErrorCode,
  OperationsResult,
  ReadinessClassification,
  StalledPathReport,
  StructuralTrajectoryReport,
  ThresholdManifest,
  WatchlistEntry,
  WatchlistEntryInsert,
  WatchlistFiring,
} from "./types";
import {
  OPERATIONS_MODULE_VERSION,
  OPERATIONS_SCHEMA_VERSION,
} from "./types";
import {
  createThresholdManifestRepository,
  PLATFORM_DEFAULT_MANIFEST_ID,
  ThresholdManifestRepository,
} from "./threshold-manifest";
import { detectMaterialChanges } from "./material-change-detector";
import { detectStalledPaths } from "./stalled-path-detector";
import { classifyStructuralTrajectories } from "./structural-trajectory";
import { rankImpact } from "./impact-ranker";
import { classifyReadiness } from "./readiness-classifier";
import {
  createWatchlistRepository,
  evaluateFirings,
  WatchlistRepository,
} from "./monitoring-watchlist";
import {
  buildDealEvolution,
  type SnapshotEvaluationBundle,
} from "./deal-evolution-reader";
import type { BoundaryMetadata } from "./__boundary__/runtime-assertions";
import {
  assertBoundaryMetadata,
  BoundaryEnforcementError,
} from "./__boundary__/runtime-assertions";

export { OPERATIONS_MODULE_VERSION, OPERATIONS_SCHEMA_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPE RE-EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export type {
  MaterialChangeReport,
  ImpactRankingReport,
  StalledPathReport,
  StructuralTrajectoryReport,
  ReadinessClassification,
  DealEvolutionTrajectory,
  WatchlistEntry,
  WatchlistEntryInsert,
  WatchlistFiring,
  ThresholdManifest,
  OperationsError,
  OperationsErrorCode,
  OperationsResult,
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOUND REPORT SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OperationalSnapshotReport {
  readonly deal_id: string;
  readonly snapshot_id: string;
  readonly material_changes: MaterialChangeReport | null;
  readonly impact_ranking: ImpactRankingReport;
  readonly stalled_paths: StalledPathReport;
  readonly structural_trajectories: StructuralTrajectoryReport;
  readonly readiness: ReadinessClassification;
}

export interface DealWatchlistFiringsReport {
  readonly deal_id: string;
  readonly snapshot_id: string;
  readonly firings: ReadonlyArray<WatchlistFiring>;
  readonly not_yet_implemented_portfolio_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

export interface OperationsEngineConfig {
  readonly supabase: SupabaseClient;
}

export function createOperationsEngine(
  config: OperationsEngineConfig,
): OperationsEngine {
  return new OperationsEngine(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS ENGINE CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class OperationsEngine {
  public readonly snapshots: SnapshotRepository;
  public readonly manifests: ThresholdManifestRepository;
  public readonly watchlist: WatchlistRepository;
  public readonly version = OPERATIONS_MODULE_VERSION;
  public readonly schema_version = OPERATIONS_SCHEMA_VERSION;

  constructor(config: OperationsEngineConfig) {
    this.snapshots = createSnapshotRepository(config.supabase);
    this.manifests = createThresholdManifestRepository(config.supabase);
    this.watchlist = createWatchlistRepository(config.supabase);
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 1: MATERIAL CHANGES
  // ──────────────────────────────────────────────────────────────────

  async getMaterialChanges(input: {
    readonly snapshot_id: string;
    readonly threshold_manifest_id?: string;
  }): Promise<OperationsResult<MaterialChangeReport | null>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const snapResult = await this.snapshots.getSnapshotById(input.snapshot_id);
    if (!snapResult.ok) return mapPersistenceError(snapResult.error);
    const snapshot = snapResult.value;

    if (snapshot.lineage.parent_snapshot_id === null) {
      return { ok: true, value: null };
    }

    const parentResult = await this.snapshots.getSnapshotById(snapshot.lineage.parent_snapshot_id);
    if (!parentResult.ok) return mapPersistenceError(parentResult.error);

    const delta = computeEvaluationDelta(parentResult.value, snapshot);
    const report = detectMaterialChanges({ delta, thresholds });
    return { ok: true, value: report };
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 2: IMPACT RANKING
  // ──────────────────────────────────────────────────────────────────

  async getImpactRanking(input: {
    readonly deal_id: string;
    readonly snapshot_id: string;
    readonly threshold_manifest_id?: string;
    readonly reference_at?: string;
  }): Promise<OperationsResult<ImpactRankingReport>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const snapResult = await this.snapshots.getSnapshotById(input.snapshot_id);
    if (!snapResult.ok) return mapPersistenceError(snapResult.error);

    const ssResult = await this.snapshots.getStateSummary(input.snapshot_id);
    if (!ssResult.ok) return mapPersistenceError(ssResult.error);

    const historyResult = await this.fetchHistoryForDeal(input.deal_id);
    if (!historyResult.ok) return historyResult;

    const report = rankImpact({
      deal_id: input.deal_id,
      snapshot: snapResult.value,
      state_summary: ssResult.value,
      history: historyResult.value,
      thresholds,
      reference_at: input.reference_at,
    });
    return { ok: true, value: report };
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 3: STALLED PATHS
  // ──────────────────────────────────────────────────────────────────

  async getStalledPaths(input: {
    readonly deal_id: string;
    readonly threshold_manifest_id?: string;
    readonly reference_at?: string;
  }): Promise<OperationsResult<StalledPathReport>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const historyResult = await this.fetchHistoryForDeal(input.deal_id);
    if (!historyResult.ok) return historyResult;

    const report = detectStalledPaths({
      deal_id: input.deal_id,
      history: historyResult.value,
      thresholds,
      reference_at: input.reference_at,
    });
    return { ok: true, value: report };
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 4: STRUCTURAL TRAJECTORIES
  // ──────────────────────────────────────────────────────────────────

  async getStructuralTrajectories(input: {
    readonly deal_id: string;
    readonly threshold_manifest_id?: string;
  }): Promise<OperationsResult<StructuralTrajectoryReport>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const historyResult = await this.fetchHistoryForDeal(input.deal_id);
    if (!historyResult.ok) return historyResult;

    const report = classifyStructuralTrajectories({
      deal_id: input.deal_id,
      history: historyResult.value,
      thresholds,
    });
    return { ok: true, value: report };
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 5: READINESS CLASSIFICATION
  // ──────────────────────────────────────────────────────────────────

  async getReadinessClassification(input: {
    readonly snapshot_id: string;
    readonly threshold_manifest_id?: string;
  }): Promise<OperationsResult<ReadinessClassification>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const ssResult = await this.snapshots.getStateSummary(input.snapshot_id);
    if (!ssResult.ok) return mapPersistenceError(ssResult.error);

    const historyResult = await this.snapshots.getRecoveryPathHistory(input.snapshot_id);
    if (!historyResult.ok) return mapPersistenceError(historyResult.error);

    const classification = classifyReadiness({
      snapshot_id: input.snapshot_id,
      state_summary: ssResult.value,
      history_at_snapshot: historyResult.value,
      thresholds,
    });
    return { ok: true, value: classification };
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 6: DEAL EVOLUTION
  // ──────────────────────────────────────────────────────────────────

  async getDealEvolution(input: {
    readonly deal_id: string;
    readonly threshold_manifest_id?: string;
  }): Promise<OperationsResult<DealEvolutionTrajectory>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const chainResult = await this.snapshots.getSnapshotChainForDeal(input.deal_id);
    if (!chainResult.ok) return mapPersistenceError(chainResult.error);

    const bundles: SnapshotEvaluationBundle[] = [];
    for (const snapshot of chainResult.value) {
      const ssResult = await this.snapshots.getStateSummary(snapshot.snapshot_id);
      if (!ssResult.ok) return mapPersistenceError(ssResult.error);

      const histResult = await this.snapshots.getRecoveryPathHistory(snapshot.snapshot_id);
      if (!histResult.ok) return mapPersistenceError(histResult.error);

      bundles.push({
        snapshot,
        state_summary: ssResult.value,
        history_at_snapshot: histResult.value,
      });
    }

    const trajectory = buildDealEvolution({
      deal_id: input.deal_id,
      bundles,
      thresholds,
    });
    return { ok: true, value: trajectory };
  }

  // ──────────────────────────────────────────────────────────────────
  // QUERY SURFACE 7: WATCHLIST FIRING EVALUATION
  // ──────────────────────────────────────────────────────────────────

  async evaluateWatchlistForDeal(input: {
    readonly deal_id: string;
    readonly snapshot_id: string;
    readonly threshold_manifest_id?: string;
  }): Promise<OperationsResult<DealWatchlistFiringsReport>> {
    const manifestResult = await this.resolveManifest(input.threshold_manifest_id);
    if (!manifestResult.ok) return manifestResult;
    const thresholds = manifestResult.value;

    const entriesResult = await this.watchlist.listEntries({ enabled_only: true });
    if (!entriesResult.ok) return entriesResult;

    const [materialResult, stalledResult, structuralResult, readinessResult] =
      await Promise.all([
        this.getMaterialChanges({
          snapshot_id: input.snapshot_id,
          threshold_manifest_id: input.threshold_manifest_id,
        }),
        this.getStalledPaths({
          deal_id: input.deal_id,
          threshold_manifest_id: input.threshold_manifest_id,
        }),
        this.getStructuralTrajectories({
          deal_id: input.deal_id,
          threshold_manifest_id: input.threshold_manifest_id,
        }),
        this.getReadinessClassification({
          snapshot_id: input.snapshot_id,
          threshold_manifest_id: input.threshold_manifest_id,
        }),
      ]);
    if (!materialResult.ok) return materialResult;
    if (!stalledResult.ok) return stalledResult;
    if (!structuralResult.ok) return structuralResult;
    if (!readinessResult.ok) return readinessResult;

    const snapResult = await this.snapshots.getSnapshotById(input.snapshot_id);
    if (!snapResult.ok) return mapPersistenceError(snapResult.error);

    let previousReadiness: ReadinessClassification | null = null;
    if (snapResult.value.lineage.parent_snapshot_id !== null) {
      const prevResult = await this.getReadinessClassification({
        snapshot_id: snapResult.value.lineage.parent_snapshot_id,
        threshold_manifest_id: input.threshold_manifest_id,
      });
      if (prevResult.ok) previousReadiness = prevResult.value;
    }

    const firingsResult = evaluateFirings({
      entries: entriesResult.value,
      snapshot_id: input.snapshot_id,
      deal_id: input.deal_id,
      thresholds,
      material_changes: materialResult.value ? materialResult.value.changes : [],
      stalled_paths: stalledResult.value.stalled_paths,
      structural_trajectories: structuralResult.value.trajectories,
      readiness_classification: readinessResult.value,
      previous_readiness_classification: previousReadiness,
    });

    return {
      ok: true,
      value: {
        deal_id: input.deal_id,
        snapshot_id: input.snapshot_id,
        firings: firingsResult.firings,
        not_yet_implemented_portfolio_count:
          firingsResult.not_yet_implemented_portfolio_count,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // COMPOUND: OPERATIONAL SNAPSHOT
  // ──────────────────────────────────────────────────────────────────

  async getOperationalSnapshot(input: {
    readonly deal_id: string;
    readonly snapshot_id: string;
    readonly threshold_manifest_id?: string;
    readonly reference_at?: string;
  }): Promise<OperationsResult<OperationalSnapshotReport>> {
    const [
      materialResult,
      impactResult,
      stalledResult,
      structuralResult,
      readinessResult,
    ] = await Promise.all([
      this.getMaterialChanges({
        snapshot_id: input.snapshot_id,
        threshold_manifest_id: input.threshold_manifest_id,
      }),
      this.getImpactRanking({
        deal_id: input.deal_id,
        snapshot_id: input.snapshot_id,
        threshold_manifest_id: input.threshold_manifest_id,
        reference_at: input.reference_at,
      }),
      this.getStalledPaths({
        deal_id: input.deal_id,
        threshold_manifest_id: input.threshold_manifest_id,
        reference_at: input.reference_at,
      }),
      this.getStructuralTrajectories({
        deal_id: input.deal_id,
        threshold_manifest_id: input.threshold_manifest_id,
      }),
      this.getReadinessClassification({
        snapshot_id: input.snapshot_id,
        threshold_manifest_id: input.threshold_manifest_id,
      }),
    ]);

    if (!materialResult.ok) return materialResult;
    if (!impactResult.ok) return impactResult;
    if (!stalledResult.ok) return stalledResult;
    if (!structuralResult.ok) return structuralResult;
    if (!readinessResult.ok) return readinessResult;

    return {
      ok: true,
      value: {
        deal_id: input.deal_id,
        snapshot_id: input.snapshot_id,
        material_changes: materialResult.value,
        impact_ranking: impactResult.value,
        stalled_paths: stalledResult.value,
        structural_trajectories: structuralResult.value,
        readiness: readinessResult.value,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────────────────────────

  private async resolveManifest(
    manifest_id?: string,
  ): Promise<OperationsResult<ThresholdManifest>> {
    const id = manifest_id ?? PLATFORM_DEFAULT_MANIFEST_ID;
    return this.manifests.getManifestById(id);
  }

  private async fetchHistoryForDeal(
    deal_id: string,
  ): Promise<OperationsResult<ReadonlyArray<RecoveryPathHistoryEntry>>> {
    const chainResult = await this.snapshots.getSnapshotChainForDeal(deal_id);
    if (!chainResult.ok) return mapPersistenceError(chainResult.error);

    const all: RecoveryPathHistoryEntry[] = [];
    for (const snapshot of chainResult.value) {
      const histResult = await this.snapshots.getRecoveryPathHistory(snapshot.snapshot_id);
      if (!histResult.ok) return mapPersistenceError(histResult.error);
      for (const entry of histResult.value) all.push(entry);
    }
    return { ok: true, value: all };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MAPPING FROM CP-9 → CP-10
// ─────────────────────────────────────────────────────────────────────────────

function mapPersistenceError<T>(err: {
  readonly code: string;
  readonly message: string;
  readonly context: Record<string, unknown> | null;
}): OperationsResult<T> {
  let code: OperationsErrorCode;
  switch (err.code) {
    case "snapshot_not_found":
      code = "snapshot_not_found";
      break;
    case "rls_access_denied":
      code = "rls_access_denied";
      break;
    default:
      code = "cp9_read_error";
      break;
  }

  return {
    ok: false,
    error: {
      code,
      message: err.message,
      context: {
        ...(err.context ?? {}),
        cp9_error_code: err.code,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY METADATA + SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

export const BOUNDARY_METADATA: BoundaryMetadata = {
  module_name: "operations/operations-engine",
  module_version: OPERATIONS_MODULE_VERSION,
  types: [
    {
      type_name: "OperationalSnapshotReport",
      fields: [
        { field_name: "deal_id", type_category: "string" },
        { field_name: "snapshot_id", type_category: "string" },
      ],
    },
    {
      type_name: "DealWatchlistFiringsReport",
      fields: [
        { field_name: "deal_id", type_category: "string" },
        { field_name: "snapshot_id", type_category: "string" },
        {
          field_name: "not_yet_implemented_portfolio_count",
          type_category: "number",
        },
      ],
    },
  ],
};

function runSelfTest(): void {
  try {
    assertBoundaryMetadata(BOUNDARY_METADATA);
  } catch (err) {
    if (err instanceof BoundaryEnforcementError) {
      const g = globalThis as { console?: { error?: (m: string) => void } };
      g.console?.error?.(
        `CP-10 operations-engine BOUNDARY VIOLATION: ${err.message}`,
      );
      throw err;
    }
    throw err;
  }
}

runSelfTest();

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEPENDENCY MARKER
//
// EvaluationDelta, EvaluationSnapshot, and EvaluationStateSummary are
// imported because their types flow through the public API surface
// (via the wrapped detector/classifier functions). This marker keeps
// the imports "used" without affecting runtime behavior.
// ─────────────────────────────────────────────────────────────────────────────

type _CP9TypeFlow = {
  delta?: EvaluationDelta;
  snapshot?: EvaluationSnapshot;
  summary?: EvaluationStateSummary;
};
const _cp9TypeFlowMarker: _CP9TypeFlow = {};
void _cp9TypeFlowMarker;
