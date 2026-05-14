// lib/intelligence/persistence/persistence-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Persistence Engine (Orchestrator)
//
// The single entry point for CP-9. Wraps the eight underlying modules
// (types, hash, builder, repository, replay, delta, ledger, tracker,
// memory) into a coherent class that the application layer uses.
//
// Mirrors the role narrative-engine.ts played for CP-8 — orchestrator
// over the synthesis and template modules. The application calls
// methods on this class; this class composes the underlying modules
// to do the actual work.
//
// Architectural commitments:
//
//   1. The engine does not own its database client. The caller passes
//      a SupabaseClient at construction time. Application code
//      controls auth state via the client.
//
//   2. The engine surfaces the most useful workflows as top-level
//      methods. Lower-level operations remain accessible via the
//      underlying repositories which are exposed as readonly fields.
//
//   3. Every public method returns PersistenceResult<T>. No thrown
//      exceptions for expected error conditions.
//
//   4. The engine does NOT introduce new persistence semantics. It
//      composes existing modules' operations. If a workflow can't be
//      expressed by composition, the underlying modules are extended,
//      not the engine.
//
//   5. Self-test at module load is unit-level (verifies wiring is
//      correct). Full integration tests live outside this file.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CPVersionManifest,
  EvaluationDelta,
  EvaluationSnapshot,
  EvaluationStateSummary,
  ExplainabilityLedger,
  ForwardReplayResult,
  HistoricalReplayResult,
  InstitutionalMemoryEvent,
  InstitutionalMemoryEventInsert,
  PersistenceResult,
  RecoveryPathHistoryEntry,
} from "./types";
import { PERSISTENCE_MODULE_VERSION, SCHEMA_VERSION } from "./types";
import {
  buildSnapshot,
} from "./snapshot-builder";
import type {
  SnapshotBuildContext,
  PipelineArtifacts,
  SnapshotBuilderOutput,
} from "./snapshot-builder";
import {
  createSnapshotRepository,
  SnapshotRepository,
} from "./snapshot-repository";
import {
  createInstitutionalMemoryRepository,
  InstitutionalMemoryRepository,
} from "./institutional-memory";
import {
  replayHistorical,
  replayForward,
  detectCPVersionDrift,
} from "./snapshot-replay";
import type {
  ForwardReplayInput,
} from "./snapshot-replay";
import {
  computeEvaluationDelta,
} from "./delta-engine";
import {
  buildExplainabilityLedger,
  compareExplainabilityLedgers,
  fetchExplainabilityLedger,
} from "./explainability-ledger";
import type {
  LedgerComparison,
} from "./explainability-ledger";
import {
  buildItemLifecycles,
  computeRecoveryLifecycleStats,
  computeRecoveryProgress,
  fetchDealRecoveryLifecycle,
  fetchOpenItemsForDeal,
  fetchRecoveryProgress,
  filterOpenLifecycles,
  filterRegressedLifecycles,
} from "./recovery-path-tracker";
import type {
  ItemLifecycle,
  RecoveryLifecycleStats,
  RecoveryProgress,
} from "./recovery-path-tracker";

export { PERSISTENCE_MODULE_VERSION, SCHEMA_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPE RE-EXPORTS
//
// Application code imports from this module; it should not need to
// reach into the underlying modules for types it commonly consumes.
// ─────────────────────────────────────────────────────────────────────────────

export type {
  EvaluationSnapshot,
  EvaluationStateSummary,
  EvaluationDelta,
  ExplainabilityLedger,
  HistoricalReplayResult,
  ForwardReplayResult,
  InstitutionalMemoryEvent,
  InstitutionalMemoryEventInsert,
  ItemLifecycle,
  RecoveryLifecycleStats,
  RecoveryProgress,
  RecoveryPathHistoryEntry,
  LedgerComparison,
  PersistenceResult,
  CPVersionManifest,
  PipelineArtifacts,
  SnapshotBuildContext,
  SnapshotBuilderOutput,
  ForwardReplayInput,
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOUND WORKFLOW RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of comparing two snapshots — bundles the structured delta
 * with the explainability ledger comparison.
 *
 * The delta tells you WHAT changed in posture/axes/recovery. The
 * ledger comparison tells you WHICH RULES stopped/started firing. The
 * two reads complement each other.
 */
export interface SnapshotComparison {
  readonly before_snapshot_id: string;
  readonly after_snapshot_id: string;
  readonly delta: EvaluationDelta;
  readonly ledger_comparison: LedgerComparison;
  readonly computed_at: string;
}

/**
 * Aggregated deal recovery health view — combines lifecycle records
 * with stats. Designed for dashboard primary read.
 */
export interface DealRecoveryHealth {
  readonly deal_id: string;
  readonly snapshot_count: number;
  readonly lifecycles: ReadonlyArray<ItemLifecycle>;
  readonly stats: RecoveryLifecycleStats;
  readonly open_items: ReadonlyArray<ItemLifecycle>;
  readonly regressed_items: ReadonlyArray<ItemLifecycle>;
  readonly computed_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistenceEngineConfig {
  readonly supabase: SupabaseClient;
}

/**
 * Construct a PersistenceEngine over a Supabase client.
 *
 * Application code typically creates one engine per request handler
 * (since the client is per-request when using user-scoped auth) and
 * dispatches all CP-9 operations through it.
 */
export function createPersistenceEngine(
  config: PersistenceEngineConfig,
): PersistenceEngine {
  return new PersistenceEngine(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE ENGINE CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class PersistenceEngine {
  /**
   * Underlying snapshot repository. Exposed as readonly for callers
   * that need lower-level operations not surfaced by engine methods
   * (e.g., bulk reads, custom queries).
   */
  public readonly snapshots: SnapshotRepository;

  /**
   * Underlying institutional memory repository.
   */
  public readonly memory: InstitutionalMemoryRepository;

  /**
   * Engine version string for diagnostic display.
   */
  public readonly version = PERSISTENCE_MODULE_VERSION;
  public readonly schema_version = SCHEMA_VERSION;

  constructor(config: PersistenceEngineConfig) {
    this.snapshots = createSnapshotRepository(config.supabase);
    this.memory = createInstitutionalMemoryRepository(config.supabase);
  }

  // ──────────────────────────────────────────────────────────────────
  // PRIMARY WORKFLOW: CREATE SNAPSHOT
  // ──────────────────────────────────────────────────────────────────

  /**
   * Build and write a new snapshot atomically.
   *
   * Composes:
   *   1. snapshot-builder.buildSnapshot — pure construction
   *   2. snapshots.writeSnapshot — atomic 4-table write via RPC
   *
   * If the snapshot has a parent, the parent's recovery items are
   * fetched first (for lifecycle status computation). Pass
   * `parent_snapshot_id=null` in the context for root snapshots.
   *
   * Returns the generated snapshot_id on success.
   */
  async createSnapshot(input: {
    readonly context: SnapshotBuildContext;
    readonly pipeline: PipelineArtifacts;
    readonly evaluated_at: string;
  }): Promise<PersistenceResult<string>> {
    // ── Step 1: fetch parent recovery items if applicable ──
    let parent_recovery = null;
    if (input.context.parent_snapshot_id !== null) {
      const parentResult = await this.snapshots.getParentRecoveryItemsContext(
        input.context.parent_snapshot_id,
      );
      if (!parentResult.ok) return parentResult;
      parent_recovery = parentResult.value;
    }

    // ── Step 2: build the snapshot bundle ──
    const buildResult = buildSnapshot({
      context: input.context,
      pipeline: input.pipeline,
      parent_recovery_items: parent_recovery,
      evaluated_at: input.evaluated_at,
    });
    if (!buildResult.ok) return buildResult;

    // ── Step 3: write the snapshot atomically ──
    return this.snapshots.writeSnapshot(buildResult.value);
  }

  // ──────────────────────────────────────────────────────────────────
  // REPLAY WORKFLOWS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Reconstruct the exact historical output stored at a snapshot.
   *
   * Pure read. No engine execution. Used for legal defensibility and
   * audit views.
   */
  async replayHistorical(
    snapshot_id: string,
  ): Promise<PersistenceResult<HistoricalReplayResult>> {
    return replayHistorical(this.snapshots, snapshot_id);
  }

  /**
   * Re-run the stored normalized inputs through the current engine
   * versions and write a new snapshot.
   *
   * Used for "did the engine improve?" and "would this deal now
   * pass?" queries. Returns the new snapshot wrapped with replay
   * metadata. Optionally computes a delta against the source.
   *
   * Note: this method automatically injects this engine's
   * computeEvaluationDelta as the delta computer when
   * input.compute_delta=true. Callers do not need to supply one
   * explicitly.
   */
  async replayForward(
    input: ForwardReplayInput,
  ): Promise<PersistenceResult<ForwardReplayResult>> {
    return replayForward(this.snapshots, input, computeEvaluationDelta);
  }

  // ──────────────────────────────────────────────────────────────────
  // COMPARISON WORKFLOWS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Compute the structured delta between two snapshots.
   *
   * Fetches both snapshots, then runs the delta engine. Pure
   * computation over the artifacts; no narrative.
   */
  async computeDelta(
    before_snapshot_id: string,
    after_snapshot_id: string,
  ): Promise<PersistenceResult<EvaluationDelta>> {
    const [beforeResult, afterResult] = await Promise.all([
      this.snapshots.getSnapshotById(before_snapshot_id),
      this.snapshots.getSnapshotById(after_snapshot_id),
    ]);
    if (!beforeResult.ok) return beforeResult;
    if (!afterResult.ok) return afterResult;

    return {
      ok: true,
      value: computeEvaluationDelta(beforeResult.value, afterResult.value),
    };
  }

  /**
   * Compare two snapshots: structured delta + ledger comparison in
   * one call.
   *
   * The two views complement each other:
   *   - delta: what changed in posture, axes, recovery
   *   - ledger comparison: which rules/components stopped/started firing
   *
   * Dashboards displaying "before vs after" should use this method
   * for a complete picture.
   */
  async compareSnapshots(
    before_snapshot_id: string,
    after_snapshot_id: string,
  ): Promise<PersistenceResult<SnapshotComparison>> {
    const [beforeResult, afterResult, beforeLedgerResult, afterLedgerResult] =
      await Promise.all([
        this.snapshots.getSnapshotById(before_snapshot_id),
        this.snapshots.getSnapshotById(after_snapshot_id),
        fetchExplainabilityLedger(this.snapshots, before_snapshot_id),
        fetchExplainabilityLedger(this.snapshots, after_snapshot_id),
      ]);

    if (!beforeResult.ok) return beforeResult;
    if (!afterResult.ok) return afterResult;
    if (!beforeLedgerResult.ok) return beforeLedgerResult;
    if (!afterLedgerResult.ok) return afterLedgerResult;

    const delta = computeEvaluationDelta(beforeResult.value, afterResult.value);
    const ledger_comparison = compareExplainabilityLedgers(
      beforeLedgerResult.value,
      afterLedgerResult.value,
    );

    return {
      ok: true,
      value: {
        before_snapshot_id,
        after_snapshot_id,
        delta,
        ledger_comparison,
        computed_at: new Date().toISOString(),
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // EXPLAINABILITY WORKFLOWS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Fetch the explainability ledger for a snapshot.
   *
   * Returns the graph view of fragment → artifact citations, ready
   * for "explain this fragment" and "where does rule X fire" UI
   * queries.
   */
  async getExplainabilityLedger(
    snapshot_id: string,
  ): Promise<PersistenceResult<ExplainabilityLedger>> {
    return fetchExplainabilityLedger(this.snapshots, snapshot_id);
  }

  // ──────────────────────────────────────────────────────────────────
  // RECOVERY WORKFLOWS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Fetch the full recovery lifecycle for a deal across all its
   * snapshots.
   *
   * Returns per-item lifecycle records (first appearance, last seen,
   * current status, regression history).
   */
  async getDealRecoveryLifecycle(
    deal_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<ItemLifecycle>>> {
    return fetchDealRecoveryLifecycle(this.snapshots, deal_id);
  }

  /**
   * Fetch currently-open recovery items for a deal (the dashboard's
   * "what's outstanding right now" view).
   */
  async getDealOpenItems(
    deal_id: string,
  ): Promise<PersistenceResult<ReadonlyArray<ItemLifecycle>>> {
    return fetchOpenItemsForDeal(this.snapshots, deal_id);
  }

  /**
   * Compute recovery progress between two snapshots — counts of
   * satisfied / persisted / new / regressed / evolved items.
   */
  async getRecoveryProgress(
    deal_id: string,
    from_snapshot_id: string,
    to_snapshot_id: string,
  ): Promise<PersistenceResult<RecoveryProgress>> {
    return fetchRecoveryProgress(
      this.snapshots,
      deal_id,
      from_snapshot_id,
      to_snapshot_id,
    );
  }

  /**
   * Aggregate deal recovery health — lifecycles + stats + open items
   * + regressed items, all in one call.
   *
   * Designed as the primary dashboard query. Returns a single
   * structured object ready for UI rendering.
   */
  async getDealRecoveryHealth(
    deal_id: string,
  ): Promise<PersistenceResult<DealRecoveryHealth>> {
    const lifecyclesResult = await this.getDealRecoveryLifecycle(deal_id);
    if (!lifecyclesResult.ok) return lifecyclesResult;

    // Count distinct snapshots referenced by the lifecycles
    const distinctSnapshots = new Set<string>();
    for (const lifecycle of lifecyclesResult.value) {
      for (const appearance of lifecycle.appearances) {
        distinctSnapshots.add(appearance.snapshot_id);
      }
    }

    const stats = computeRecoveryLifecycleStats(lifecyclesResult.value);
    const open_items = filterOpenLifecycles(lifecyclesResult.value);
    const regressed_items = filterRegressedLifecycles(lifecyclesResult.value);

    return {
      ok: true,
      value: {
        deal_id,
        snapshot_count: distinctSnapshots.size,
        lifecycles: lifecyclesResult.value,
        stats,
        open_items,
        regressed_items,
        computed_at: new Date().toISOString(),
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // INSTITUTIONAL MEMORY WORKFLOWS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Record an institutional memory event.
   */
  async recordEvent(
    event: InstitutionalMemoryEventInsert,
  ): Promise<PersistenceResult<string>> {
    return this.memory.recordEvent(event);
  }

  /**
   * Fetch events for a deal.
   */
  async getEventsForDeal(
    deal_id: string,
    options?: { readonly limit?: number },
  ): Promise<PersistenceResult<ReadonlyArray<InstitutionalMemoryEvent>>> {
    return this.memory.getEventsForDeal(deal_id, options);
  }

  // ──────────────────────────────────────────────────────────────────
  // DIAGNOSTIC HELPERS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Detect CP version drift between two manifests.
   *
   * Pure utility. Returns the keys (cp2..cp8) where versions differ.
   */
  detectCPVersionDrift = detectCPVersionDrift;

  /**
   * Build an explainability ledger from a trace array (no IO).
   *
   * Pure utility — useful when traces are already in hand from a
   * previous fetch.
   */
  buildLedger = buildExplainabilityLedger;

  /**
   * Build item lifecycles from history entries (no IO).
   *
   * Pure utility — useful when history rows are already in hand.
   */
  buildLifecycles = buildItemLifecycles;

  /**
   * Compute recovery progress between two history datasets (no IO).
   *
   * Pure utility for callers who have the data in hand.
   */
  computeRecoveryProgressFromHistory = computeRecoveryProgress;

  /**
   * Compute the structured delta between two snapshots (no IO).
   *
   * Pure utility — useful when both snapshots are already in hand.
   */
  computeDeltaFromSnapshots = computeEvaluationDelta;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LOAD SELF-TEST
//
// Wiring verification only. Confirms that:
//   - All imports resolve
//   - Type contracts are consistent
//   - The engine class can be instantiated
//   - Core methods are reachable
//
// Full integration tests run outside this file with a real Supabase
// client and exercise the database round-trips.
// ─────────────────────────────────────────────────────────────────────────────

function logSelfTestWarning(message: string): void {
  const g = globalThis as { console?: { error?: (m: string) => void } };
  if (g.console && typeof g.console.error === "function") {
    g.console.error(message);
  }
}

function runPersistenceEngineSelfTest(): boolean {
  try {
    // Verify the engine class can be instantiated without crashing
    // when given a stub-shaped client. We don't actually call any
    // methods that would hit the database.
    //
    // The stub satisfies the SupabaseClient type just well enough for
    // the constructor to complete. Real instantiation requires the
    // actual @supabase/supabase-js createClient.
    const stubClient = {} as unknown as SupabaseClient;
    const engine = new PersistenceEngine({ supabase: stubClient });

    // Wiring checks: every key method must exist and be a function
    const requiredMethods: ReadonlyArray<keyof PersistenceEngine> = [
      "createSnapshot",
      "replayHistorical",
      "replayForward",
      "computeDelta",
      "compareSnapshots",
      "getExplainabilityLedger",
      "getDealRecoveryLifecycle",
      "getDealOpenItems",
      "getRecoveryProgress",
      "getDealRecoveryHealth",
      "recordEvent",
      "getEventsForDeal",
    ];

    for (const methodName of requiredMethods) {
      const method = engine[methodName];
      if (typeof method !== "function") {
        logSelfTestWarning(
          `CP-9 persistence engine self-test failure: ${methodName} is not a function`,
        );
        return false;
      }
    }

    // Verify the version stamping
    if (engine.version !== PERSISTENCE_MODULE_VERSION) {
      logSelfTestWarning(
        `CP-9 persistence engine self-test failure: version mismatch (got ${engine.version}, expected ${PERSISTENCE_MODULE_VERSION})`,
      );
      return false;
    }

    if (engine.schema_version !== SCHEMA_VERSION) {
      logSelfTestWarning(
        `CP-9 persistence engine self-test failure: schema_version mismatch (got ${engine.schema_version}, expected ${SCHEMA_VERSION})`,
      );
      return false;
    }

    // Verify underlying repositories are constructed
    if (!engine.snapshots || !engine.memory) {
      logSelfTestWarning(
        "CP-9 persistence engine self-test failure: underlying repositories not initialized",
      );
      return false;
    }

    // Verify pure-function attachments
    if (typeof engine.detectCPVersionDrift !== "function") {
      logSelfTestWarning(
        "CP-9 persistence engine self-test failure: detectCPVersionDrift utility not attached",
      );
      return false;
    }

    // Smoke test the detectCPVersionDrift utility (it's pure)
    const drift = engine.detectCPVersionDrift(
      {
        cp2: "a", cp3: "a", cp4: "a", cp5: "a", cp6: "a", cp7: "a", cp8: "a",
      },
      {
        cp2: "a", cp3: "b", cp4: "a", cp5: "a", cp6: "c", cp7: "a", cp8: "a",
      },
    );
    if (drift.length !== 2 || !drift.includes("cp3") || !drift.includes("cp6")) {
      logSelfTestWarning(
        `CP-9 persistence engine self-test failure: detectCPVersionDrift returned unexpected result (${JSON.stringify(drift)})`,
      );
      return false;
    }

    return true;
  } catch (err) {
    logSelfTestWarning(
      `CP-9 persistence engine self-test crashed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

const _selfTestResult = runPersistenceEngineSelfTest();
if (!_selfTestResult) {
  logSelfTestWarning(
    `CP-9 persistence engine module loaded with self-test warnings (${PERSISTENCE_MODULE_VERSION})`,
  );
}
