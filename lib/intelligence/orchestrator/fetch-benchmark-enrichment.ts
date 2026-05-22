// lib/intelligence/orchestrator/fetch-benchmark-enrichment.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — Benchmark Enrichment Fetch (Phase 0.5a, Shadow Mode)
//
// Best-effort read of the latest `benchmark_snapshots` row for a deal, to
// enrich CP shadow inputs with raw/computed operational context.
//
// CONSTITUTIONAL FIREWALL ENFORCED AT THE QUERY LEVEL:
//   This fetch SELECTs ONLY the raw/computed columns —
//     snapshot_id, computed_ratios, financial_inputs
//   It NEVER selects `analysis_outputs` or `benchmark_results`, which hold the
//   legacy engine's CONCLUSIONS (financial_score, tension_indicator,
//   risk_flags, percentiles, normalized_sde). Because those columns are never
//   even fetched, there is no path by which a benchmark conclusion can reach
//   CP. The firewall is structural, not just disciplinary.
//
// SEMANTICS:
//   - Latest row by created_at, regardless of is_saved. (is_saved=false rows
//     are still real computed analyses; the flag only means the user clicked
//     "save" in the UI. Latest-wins is correct for opportunistic enrichment.)
//   - Best-effort: ANY error, or no row, returns null → caller falls back to
//     sparse CP inputs. Never throws into the shadow-write path.
//   - Read-only. Does not write, does not trigger re-evaluation.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BenchmarkSnapshotRawFields } from "./map-live-inputs";

/**
 * Fetch the latest benchmark_snapshots raw/computed fields for a deal.
 *
 * @param dealId    The deal_runs.id (same id the CP snapshot is keyed by).
 * @param supabase  A Supabase client (service-role in the shadow path).
 * @returns The raw/computed fields, or null if none / on any error.
 */
export async function fetchLatestBenchmarkEnrichment(
  dealId: string,
  supabase: SupabaseClient,
): Promise<BenchmarkSnapshotRawFields | null> {
  try {
    const { data, error } = await supabase
      .from("benchmark_snapshots")
      // FIREWALL: only raw/computed columns. Never analysis_outputs /
      // benchmark_results (those carry conclusions forbidden in CP).
      .select("snapshot_id, computed_ratios, financial_inputs")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Best-effort: log and fall back to sparse. Never throw.
      // eslint-disable-next-line no-console
      console.warn(
        `[cp-enrichment] benchmark fetch error for deal ${dealId} (falling back to sparse):`,
        error.message,
      );
      return null;
    }
    if (!data) return null;

    return {
      snapshot_id: data.snapshot_id ?? null,
      computed_ratios:
        (data.computed_ratios as Record<string, number | null> | null) ?? null,
      financial_inputs:
        (data.financial_inputs as Record<string, unknown> | null) ?? null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[cp-enrichment] benchmark fetch threw for deal ${dealId} (falling back to sparse):`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
