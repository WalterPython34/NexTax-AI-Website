// lib/intelligence/persistence/explainability-ledger.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — CP-9 Explainability Ledger
//
// Computed graph view of the explainability_traces rows for a snapshot.
// Pure projection of stored trace edges into two complementary index
// structures:
//
//   Forward chains (fragment → artifacts)
//     For "explain this fragment" UI. Given a NarrativeFragment, what
//     upstream artifacts support it?
//
//   Reverse chains (artifact → fragments)
//     For "where does this rule fire" UI. Given an upstream artifact
//     (rule firing, scenario outcome, comfort condition, etc.), which
//     fragments cite it?
//
// Architectural commitments:
//
//   1. The ledger is computed, not generated. It walks the typed
//      trace edges already produced by snapshot-builder. No prose.
//      No new content. Just structural projection.
//
//   2. The ledger is a read-only view. It does not write to the
//      database. Callers fetch traces via the repository and pass
//      them in; or use the convenience constructor that fetches
//      them itself.
//
//   3. The CP-8 fragment_id and CP-3/4/5 artifact IDs are exposed as
//      stable keys. The ledger does not reinterpret them; it just
//      organizes the edges.
//
//   4. depth=0 edges are produced by snapshot-builder (direct
//      fragment → source_id citations). depth>0 edges (multi-hop
//      traversal up through the artifact stack) are NOT computed at
//      this layer in CP-9 — the snapshot-builder emits only direct
//      edges. Future ledger extensions can chase deeper chains by
//      following artifact → component → rule → input metric, but
//      that requires CP-5 component tracing infrastructure which
//      lives outside this module.
//
//   5. Citation counts are exact. No sampling, no aggregation. The
//      ledger surfaces the full edge graph.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ArtifactType,
  ExplainabilityLedger,
  ExplainabilityTrace,
  LedgerArtifactCitations,
  LedgerArtifactNode,
  LedgerFragmentChain,
  PersistenceResult,
} from "./types";
import { PERSISTENCE_MODULE_VERSION } from "./types";
import { SnapshotRepository } from "./snapshot-repository";

export { PERSISTENCE_MODULE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API — BUILD FROM TRACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assemble an ExplainabilityLedger from a flat array of trace edges.
 *
 * Pure function. Input is the typed trace array as fetched from the
 * repository; output is the indexed graph view. Same input → same
 * output, every time.
 *
 * Two passes over the input:
 *   Pass 1: group by fragment_id → forward chains
 *   Pass 2: group by (artifact_type, artifact_id) → reverse chains
 *
 * Summary stats are computed in the same passes.
 */
export function buildExplainabilityLedger(
  snapshot_id: string,
  traces: ReadonlyArray<ExplainabilityTrace>,
): ExplainabilityLedger {
  // ── Pass 1: forward chains (fragment_id → artifacts grouped by depth) ──
  const fragmentChainsMap = new Map<
    string,
    {
      kind: string;
      directArtifacts: LedgerArtifactNode[];
      upstreamArtifacts: LedgerArtifactNode[];
      maxDepth: number;
    }
  >();

  for (const trace of traces) {
    let entry = fragmentChainsMap.get(trace.fragment_id);
    if (!entry) {
      entry = {
        kind: trace.fragment_kind,
        directArtifacts: [],
        upstreamArtifacts: [],
        maxDepth: 0,
      };
      fragmentChainsMap.set(trace.fragment_id, entry);
    }

    const node: LedgerArtifactNode = {
      artifact_type: trace.artifact_type,
      artifact_id: trace.artifact_id,
      artifact_metadata: trace.artifact_metadata,
    };

    if (trace.trace_depth === 0) {
      entry.directArtifacts.push(node);
    } else {
      entry.upstreamArtifacts.push(node);
    }
    if (trace.trace_depth > entry.maxDepth) {
      entry.maxDepth = trace.trace_depth;
    }
  }

  const fragment_chains: LedgerFragmentChain[] = [];
  for (const [fragment_id, entry] of fragmentChainsMap) {
    fragment_chains.push({
      fragment_id,
      fragment_kind: entry.kind,
      direct_artifacts: dedupeArtifactNodes(entry.directArtifacts),
      upstream_artifacts: dedupeArtifactNodes(entry.upstreamArtifacts),
      max_depth: entry.maxDepth,
    });
  }

  // Sort fragment chains by fragment_id for deterministic ordering
  fragment_chains.sort((a, b) =>
    a.fragment_id < b.fragment_id ? -1 : a.fragment_id > b.fragment_id ? 1 : 0,
  );

  // ── Pass 2: reverse chains ((artifact_type, artifact_id) → citing fragments) ──
  const citationsMap = new Map<
    string,
    {
      artifact_type: ArtifactType;
      artifact_id: string;
      citing_fragment_ids: Set<string>;
    }
  >();

  for (const trace of traces) {
    const key = artifactKey(trace.artifact_type, trace.artifact_id);
    let entry = citationsMap.get(key);
    if (!entry) {
      entry = {
        artifact_type: trace.artifact_type,
        artifact_id: trace.artifact_id,
        citing_fragment_ids: new Set<string>(),
      };
      citationsMap.set(key, entry);
    }
    entry.citing_fragment_ids.add(trace.fragment_id);
  }

  const artifact_citations: LedgerArtifactCitations[] = [];
  for (const [, entry] of citationsMap) {
    const citingIds = Array.from(entry.citing_fragment_ids).sort();
    artifact_citations.push({
      artifact_type: entry.artifact_type,
      artifact_id: entry.artifact_id,
      citing_fragment_ids: citingIds,
      citation_count: citingIds.length,
    });
  }

  // Sort artifact citations by (type, id) for deterministic ordering
  artifact_citations.sort((a, b) => {
    if (a.artifact_type !== b.artifact_type)
      return a.artifact_type < b.artifact_type ? -1 : 1;
    return a.artifact_id < b.artifact_id ? -1 : a.artifact_id > b.artifact_id ? 1 : 0;
  });

  // ── Summary statistics ──
  const uniqueFragments = fragment_chains.length;
  const uniqueArtifacts = artifact_citations.length;
  const maxDepth = fragment_chains.reduce(
    (acc, c) => (c.max_depth > acc ? c.max_depth : acc),
    0,
  );

  return {
    snapshot_id,
    computed_at: new Date().toISOString(),
    fragment_chains,
    artifact_citations,
    summary: {
      total_traces: traces.length,
      unique_fragments: uniqueFragments,
      unique_artifacts: uniqueArtifacts,
      max_trace_depth: maxDepth,
    },
    version: PERSISTENCE_MODULE_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY-AWARE CONVENIENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch traces for a snapshot and assemble the ledger in one call.
 *
 * Convenience for the common case. Equivalent to:
 *   const traces = await repo.getExplainabilityTraces(snapshot_id);
 *   if (!traces.ok) return traces;
 *   return { ok: true, value: buildExplainabilityLedger(snapshot_id, traces.value) };
 *
 * Errors propagate from the repository.
 */
export async function fetchExplainabilityLedger(
  repository: SnapshotRepository,
  snapshot_id: string,
): Promise<PersistenceResult<ExplainabilityLedger>> {
  const tracesResult = await repository.getExplainabilityTraces(snapshot_id);
  if (!tracesResult.ok) return tracesResult;
  return {
    ok: true,
    value: buildExplainabilityLedger(snapshot_id, tracesResult.value),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS (operate on an already-built ledger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the forward chain for a single fragment. Returns null if the
 * fragment has no trace edges in this ledger (which should not
 * happen for fragments emitted by the snapshot-builder, since every
 * fragment has at least one source_id).
 */
export function traceFragmentChain(
  ledger: ExplainabilityLedger,
  fragment_id: string,
): LedgerFragmentChain | null {
  for (const chain of ledger.fragment_chains) {
    if (chain.fragment_id === fragment_id) return chain;
  }
  return null;
}

/**
 * Get the reverse chain for a single artifact. Returns null if no
 * fragment cites this artifact.
 *
 * Useful for "show me everywhere rule X fires" UI flows.
 */
export function traceArtifactCitations(
  ledger: ExplainabilityLedger,
  artifact_type: ArtifactType,
  artifact_id: string,
): LedgerArtifactCitations | null {
  for (const c of ledger.artifact_citations) {
    if (c.artifact_type === artifact_type && c.artifact_id === artifact_id) {
      return c;
    }
  }
  return null;
}

/**
 * Filter the artifact citations to only those of a specific type.
 *
 * Common queries:
 *   - "all rule firings cited in this snapshot" → "rule_firing"
 *   - "all comfort conditions cited" → "comfort_condition"
 *   - "all axis components cited" → "axis_component"
 */
export function getArtifactCitationsByType(
  ledger: ExplainabilityLedger,
  artifact_type: ArtifactType,
): ReadonlyArray<LedgerArtifactCitations> {
  return ledger.artifact_citations.filter(
    (c) => c.artifact_type === artifact_type,
  );
}

/**
 * Return artifacts cited by more than `threshold` fragments. Useful
 * for surfacing "load-bearing" upstream artifacts — rules or
 * components that drive many fragments.
 *
 * Default threshold = 3; artifacts cited 4+ times are returned.
 */
export function getMostCitedArtifacts(
  ledger: ExplainabilityLedger,
  threshold = 3,
): ReadonlyArray<LedgerArtifactCitations> {
  return ledger.artifact_citations
    .filter((c) => c.citation_count > threshold)
    .slice()
    .sort((a, b) => b.citation_count - a.citation_count);
}

/**
 * Return fragments whose forward chains have no direct artifacts.
 *
 * This SHOULD always return an empty array — every fragment emitted
 * by CP-8 has source_ids. A non-empty result indicates either:
 *   - Stale data (traces from before a fragment was added)
 *   - A validator bypass (snapshot-builder failed to record some
 *     fragment's traces)
 *
 * Exposed for diagnostic use.
 */
export function getFragmentsWithoutDirectTraces(
  ledger: ExplainabilityLedger,
): ReadonlyArray<LedgerFragmentChain> {
  return ledger.fragment_chains.filter(
    (c) => c.direct_artifacts.length === 0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-SNAPSHOT QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare two ledgers and surface artifacts that gained or lost
 * citations between them. Useful for "which rules are newly
 * surfaced in this evaluation compared to the previous one?"
 *
 * Pure function on two ledgers. Does not fetch from the repository.
 *
 * Returns three lists:
 *   - newly_cited: artifacts cited in `after` but not in `before`
 *   - no_longer_cited: artifacts cited in `before` but not in `after`
 *   - changed_citation_count: artifacts cited in both, with
 *     different counts
 */
export interface LedgerComparison {
  readonly newly_cited: ReadonlyArray<LedgerArtifactCitations>;
  readonly no_longer_cited: ReadonlyArray<LedgerArtifactCitations>;
  readonly changed_citation_count: ReadonlyArray<{
    readonly artifact_type: ArtifactType;
    readonly artifact_id: string;
    readonly count_before: number;
    readonly count_after: number;
  }>;
}

export function compareExplainabilityLedgers(
  before: ExplainabilityLedger,
  after: ExplainabilityLedger,
): LedgerComparison {
  const beforeMap = new Map<string, LedgerArtifactCitations>();
  for (const c of before.artifact_citations) {
    beforeMap.set(artifactKey(c.artifact_type, c.artifact_id), c);
  }
  const afterMap = new Map<string, LedgerArtifactCitations>();
  for (const c of after.artifact_citations) {
    afterMap.set(artifactKey(c.artifact_type, c.artifact_id), c);
  }

  const newly_cited: LedgerArtifactCitations[] = [];
  const no_longer_cited: LedgerArtifactCitations[] = [];
  const changed_citation_count: LedgerComparison["changed_citation_count"][number][] = [];

  for (const [key, afterC] of afterMap) {
    const beforeC = beforeMap.get(key);
    if (!beforeC) {
      newly_cited.push(afterC);
    } else if (beforeC.citation_count !== afterC.citation_count) {
      changed_citation_count.push({
        artifact_type: afterC.artifact_type,
        artifact_id: afterC.artifact_id,
        count_before: beforeC.citation_count,
        count_after: afterC.citation_count,
      });
    }
  }

  for (const [key, beforeC] of beforeMap) {
    if (!afterMap.has(key)) no_longer_cited.push(beforeC);
  }

  return {
    newly_cited,
    no_longer_cited,
    changed_citation_count,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function artifactKey(type: ArtifactType, id: string): string {
  return `${type}::${id}`;
}

/**
 * Dedupe LedgerArtifactNode entries by (artifact_type, artifact_id).
 * A single fragment can have the same (type, id) edge appear multiple
 * times in the raw trace stream when multiple synthesis findings cite
 * the same source. The ledger collapses duplicates to a single edge
 * per (type, id) per fragment.
 *
 * Preserves the FIRST occurrence's metadata.
 */
function dedupeArtifactNodes(
  nodes: ReadonlyArray<LedgerArtifactNode>,
): LedgerArtifactNode[] {
  const seen = new Set<string>();
  const result: LedgerArtifactNode[] = [];
  for (const node of nodes) {
    const key = artifactKey(node.artifact_type, node.artifact_id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(node);
  }
  // Sort by (type, id) for deterministic ordering
  result.sort((a, b) => {
    if (a.artifact_type !== b.artifact_type)
      return a.artifact_type < b.artifact_type ? -1 : 1;
    return a.artifact_id < b.artifact_id ? -1 : a.artifact_id > b.artifact_id ? 1 : 0;
  });
  return result;
}
