// lib/intelligence/canonical/canonical-save-path.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — Phase D: Canonical Save Path (additive, write-time dedup guard)
//
// Called by /api/record-deal AFTER its existing deal_runs insert. It does NOT
// replace the deal_runs write — deal_runs continues exactly as today (preserving
// all FKs, the CP shadow write, and per-deal reads). This service ADDITIONALLY
// maintains the market-truth + analytical layers:
//
//   1. FIND-OR-CREATE the canonical deal by (user_id, fingerprint) — the write-time
//      dedup guard. If a canonical already exists for this fingerprint, REUSE it.
//      This closes the contamination path at the source: duplicate saves can still
//      land in deal_runs (harmless — nothing reads it for market data), but they
//      can NEVER mint a duplicate canonical deal, so DRI/benchmarks stay clean.
//   2. ENSURE a base scenario exists under that canonical (one per canonical).
//
// DISCIPLINE (same as the CP shadow write): best-effort, never throws into the
// save flow. A failure here must not break the user's deal save. Returns a result
// object the caller can log but need not act on.
//
// IMPORTANT: this service RECEIVES the already-computed fingerprint from record-deal
// (the same value written to deal_runs.fingerprint). It does NOT recompute it —
// one fingerprint source of truth, passed through, guarantees canonical dedup keys
// match the deal_runs row exactly.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";

// ── input: the market-truth fields, resolved by record-deal from the POST body ──
// (record-deal already parses these for the deal_runs insert; pass them through.)
export interface CanonicalSaveInput {
  deal_run_id: string;            // the deal_runs.id just inserted (id preservation: canonical.id = this on first create)
  user_id: string | null;        // nullable — legacy/imported listings may be ownerless
  fingerprint: string | null;    // the SAME fingerprint written to deal_runs (may be null)
  // market_truth_fields (canonical only — never scenario assumptions)
  industry: string | null;
  source_listing_price: number | null;        // = asking_price as listed
  original_seller_reported_revenue: number | null;
  original_seller_reported_sde: number | null;
  location_state?: string | null;
  listing_source?: string | null;
  source_url?: string | null;
}

export interface CanonicalSaveResult {
  ok: boolean;
  canonical_deal_id: string | null;
  base_scenario_id: string | null;
  action: "created_canonical" | "reused_canonical" | "skipped" | "error";
  detail?: string;
}

// derive the as-listed asking multiple where SDE is positive (market-truth field)
function askingMultiple(price: number | null, sde: number | null): number | null {
  if (price == null || sde == null || sde === 0) return null;
  return Math.round((price / sde) * 100) / 100;
}

/**
 * Maintain the canonical + base-scenario layers for a just-saved deal.
 * Best-effort: catches everything, returns a result, never throws.
 */
export async function maintainCanonicalAndBaseScenario(
  supabase: SupabaseClient,
  input: CanonicalSaveInput,
): Promise<CanonicalSaveResult> {
  try {
    // ── 1. FIND-OR-CREATE canonical by (user_id, fingerprint) ──
    // The dedup guard. Only attempt fingerprint-match when we HAVE a fingerprint;
    // a null fingerprint can't be deduped (each is its own opportunity).
    let canonicalId: string | null = null;
    let action: CanonicalSaveResult["action"] = "created_canonical";

    if (input.fingerprint != null && input.user_id != null) {
      const { data: existing, error: findErr } = await supabase
        .from("canonical_deals")
        .select("id")
        .eq("user_id", input.user_id)
        .eq("fingerprint", input.fingerprint)
        .limit(1)
        .maybeSingle();
      if (findErr) return { ok: false, canonical_deal_id: null, base_scenario_id: null, action: "error", detail: `find canonical: ${findErr.message}` };
      if (existing?.id) {
        canonicalId = existing.id;
        action = "reused_canonical"; // ← duplicate save collapsed; no new canonical
      }
    }

    if (canonicalId == null) {
      // Create the canonical deal. ID PRESERVATION: on first create, canonical.id =
      // the deal_run_id, matching the Phase A backfill convention so downstream FKs
      // (benchmark/evaluation snapshots keyed on the deal id) resolve to canonical.
      const { data: created, error: insErr } = await supabase
        .from("canonical_deals")
        .insert({
          id: input.deal_run_id,                  // id preservation
          user_id: input.user_id,
          fingerprint: input.fingerprint,
          industry: input.industry,
          source_listing_price: input.source_listing_price,
          original_seller_reported_revenue: input.original_seller_reported_revenue,
          original_seller_reported_sde: input.original_seller_reported_sde,
          original_asking_multiple: askingMultiple(input.source_listing_price, input.original_seller_reported_sde),
          location_state: input.location_state ?? null,
          listing_source: input.listing_source ?? null,
          source_url: input.source_url ?? null,
          benchmark_eligible: true,               // real saves are benchmark-eligible
          // ingest_timestamp + created_at default to now()
        })
        .select("id")
        .single();
      if (insErr) {
        // A unique-violation here means a concurrent save already created it — treat
        // as reuse, not error (re-find it). Otherwise surface.
        if (insErr.code === "23505") {
          const { data: race } = await supabase
            .from("canonical_deals").select("id")
            .eq("user_id", input.user_id ?? "")
            .eq("fingerprint", input.fingerprint ?? "")
            .limit(1).maybeSingle();
          canonicalId = race?.id ?? null;
          action = "reused_canonical";
        }
        if (canonicalId == null) {
          return { ok: false, canonical_deal_id: null, base_scenario_id: null, action: "error", detail: `create canonical: ${insErr.message}` };
        }
      } else {
        canonicalId = created.id;
      }
    }

    if (canonicalId == null) {
      return { ok: false, canonical_deal_id: null, base_scenario_id: null, action: "skipped", detail: "no canonical id resolved" };
    }

    // ── 2. ENSURE a base scenario exists (one per canonical) ──
    const { data: base, error: baseFindErr } = await supabase
      .from("deal_scenarios")
      .select("id")
      .eq("parent_canonical_deal_id", canonicalId)
      .eq("is_base", true)
      .limit(1)
      .maybeSingle();
    if (baseFindErr) return { ok: false, canonical_deal_id: canonicalId, base_scenario_id: null, action: "error", detail: `find base: ${baseFindErr.message}` };

    let baseScenarioId = base?.id ?? null;
    if (baseScenarioId == null) {
      const { data: newBase, error: baseInsErr } = await supabase
        .from("deal_scenarios")
        .insert({
          parent_canonical_deal_id: canonicalId,
          user_id: input.user_id,
          scenario_label: "Base scenario",
          is_base: true,
          scenario_origin: "derived_from_canonical",
          // base scenario starts as the as-listed working view (NOT market truth)
          revised_offer_price: input.source_listing_price,
          buyer_adjusted_sde: input.original_seller_reported_sde,
        })
        .select("id")
        .single();
      // one-base-per-canonical unique index means a race could 23505 here — treat as fine
      if (baseInsErr && baseInsErr.code !== "23505") {
        return { ok: false, canonical_deal_id: canonicalId, base_scenario_id: null, action: "error", detail: `create base: ${baseInsErr.message}` };
      }
      baseScenarioId = newBase?.id ?? null;
    }

    return { ok: true, canonical_deal_id: canonicalId, base_scenario_id: baseScenarioId, action };
  } catch (e) {
    // Never break the save flow.
    return { ok: false, canonical_deal_id: null, base_scenario_id: null, action: "error", detail: (e as Error).message };
  }
}
