// app/api/record-deal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeDealFinancials, getConvictionCap, buildNormalizationPayload } from "@/lib/normalizationIntegration";
import { applyDealClassification } from "@/lib/dealClassifier";
import { readMarketFacts } from "@/app/acquiflow-intel/_lib/marketFacts";
// ── CP Shadow Mode (Phase 0) — additive snapshot generation ──────────────────
import { mapRecordDealBodyToRuleInputs, hasMinimumInputsForShadow, mergeBenchmarkEnrichment } from "@/lib/intelligence/orchestrator/map-live-inputs";
import { runCpPipelineAndPersist } from "@/lib/intelligence/orchestrator/run-cp-pipeline";
import { fetchLatestBenchmarkEnrichment } from "@/lib/intelligence/orchestrator/fetch-benchmark-enrichment";
// ── Phase D — canonical/scenario maintenance (additive, best-effort) ──────────
import { maintainCanonicalAndBaseScenario } from "@/lib/intelligence/canonical/canonical-save-path";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
function safe(n: unknown): number {
  return typeof n === "number" && isFinite(n) ? n : 0;
}
function generateFingerprint(
  industry: string,
  revenue: number,
  sde: number,
  price: number,
  state?: string
): string {
  return `${industry}_${Math.round(revenue / 1000)}k_${Math.round(sde / 1000)}k_${Math.round(price / 1000)}k_${state || "us"}`.toLowerCase();
}
function isValidDeal(revenue: number, sde: number, price: number): boolean {
  return (
    revenue >= 200000 &&
    sde >= 75000 &&
    price >= 150000 &&
    sde <= revenue &&
    price > 0 &&
    sde / revenue <= 0.9
  );
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tool_used,
      industry,
      revenue,
      sde,
      asking_price,
      debt_percent,
      interest_rate,
      term_years,
      city,
      state,
      zip_code,
      employees,
      years_in_business,
      revenue_trend,
      customer_concentration,
      owner_operated,
      has_real_estate,
      valuation_multiple,
      dscr,
      monthly_payment,
      fair_value,
      recommended_offer_low,
      recommended_offer_high,
      overall_score,
      risk_level,
      valuation_score,
      debt_score,
      market_score,
      industry_score,
      operational_score,
      red_flags,
      green_flags,
      // ── Auth fields ────────────────────────────────────────────────────────
      user_id = null,
      pending_email = null,
      // ── Normalization context (optional — sent by modal after V2 scoring) ──
      benchmark_family   = null,
      classification_confidence = null,
      benchmark_is_proxy = false,
      data_source        = "manual_entry",
      benchmark_source   = null,   // "direct" | "proxy" | "fallback" — sent by modal
      ebitda             = 0,
      // ── Evidence profile (optional — sent by modal for add-back + concentration basis)
      evidence_profile   = null,
    } = body;
    const revNum   = typeof revenue      === "string" ? parseFloat(revenue.replace(/,/g, ""))      : revenue;
    const sdeNum   = typeof sde          === "string" ? parseFloat(sde.replace(/,/g, ""))          : sde;
    const priceNum = typeof asking_price === "string" ? parseFloat(asking_price.replace(/,/g, "")) : asking_price;
    const fingerprint = generateFingerprint(industry, revNum, sdeNum, priceNum, state);
    const is_valid    = isValidDeal(revNum, sdeNum, priceNum);
    // ── Cluster logic (unchanged) ──────────────────────────────────────────────
    let cluster_id: string | null = null;
    if (is_valid) {
      const { data: existingCluster } = await supabaseAdmin
        .from("deal_clusters")
        .select("id, runs_count, median_revenue, median_sde, median_price, unique_tools")
        .eq("industry", industry)
        .gte("median_revenue", revNum * 0.9)
        .lte("median_revenue", revNum * 1.1)
        .gte("median_sde", sdeNum * 0.9)
        .lte("median_sde", sdeNum * 1.1)
        .gte("median_price", priceNum * 0.9)
        .lte("median_price", priceNum * 1.1)
        .eq("is_active", true)
        .order("last_seen", { ascending: false })
        .limit(1)
        .single();
      if (existingCluster) {
        cluster_id = existingCluster.id;
        const newCount = existingCluster.runs_count + 1;
        const tools = Array.from(new Set([...(existingCluster.unique_tools || []), tool_used]));
        const newMedianRevenue = (existingCluster.median_revenue * existingCluster.runs_count + revNum) / newCount;
        const newMedianSde     = (existingCluster.median_sde * existingCluster.runs_count + sdeNum) / newCount;
        const newMedianPrice   = (existingCluster.median_price * existingCluster.runs_count + priceNum) / newCount;
        await supabaseAdmin
          .from("deal_clusters")
          .update({
            runs_count:     newCount,
            median_revenue: Math.round(newMedianRevenue),
            median_sde:     Math.round(newMedianSde),
            median_price:   Math.round(newMedianPrice),
            median_multiple: +(newMedianPrice / newMedianSde).toFixed(2),
            median_dscr:    dscr,
            median_score:   overall_score,
            best_score:     Math.max(existingCluster.runs_count > 0 ? overall_score : 0, overall_score),
            worst_score:    Math.min(existingCluster.runs_count > 0 ? overall_score : 100, overall_score),
            unique_tools:   tools,
            last_seen:      new Date().toISOString(),
          })
          .eq("id", cluster_id);
      } else {
        const { data: newCluster } = await supabaseAdmin
          .from("deal_clusters")
          .insert({
            industry,
            state:           state || null,
            median_revenue:  revNum,
            median_sde:      sdeNum,
            median_price:    priceNum,
            median_multiple: +(priceNum / sdeNum).toFixed(2),
            median_dscr:     dscr,
            median_score:    overall_score,
            best_score:      overall_score,
            worst_score:     overall_score,
            runs_count:      1,
            unique_tools:    [tool_used],
          })
          .select("id")
          .single();
        cluster_id = newCluster?.id || null;
      }
    }

    // ── Patch D Phase 2B: Canonical valuation reference ──
// Server-authoritative: override any client-sent benchmark_source /
// benchmark_is_proxy. Read canonical market multiple from dealstats_benchmarks
// for persistence. This is the VALUATION-side anchor — distinct from the
// EARNINGS-side fields (usable_sde, benchmark_implied_sde) which remain
// driven by normalizeDealFinancials's null-benchmark path until Patch E.
let canonicalMarketMultiple: number | null = null;
let canonicalBenchmarkSource: "industry_size_matched" | "industry_national" | "fallback" = "fallback";
try {
  const facts = await readMarketFacts(supabaseAdmin, {
    industry: industry ?? null,
    revenue: revNum,
    sde: sdeNum,
    asking_price: priceNum,
    state: state ?? null,
  });
  if (facts.closed_comp_median !== null && facts.closed_comp_basis !== "unavailable") {
    canonicalMarketMultiple = facts.closed_comp_median;
    canonicalBenchmarkSource = facts.closed_comp_basis as typeof canonicalBenchmarkSource;
  }
  // else: canonical data unavailable for this industry — fallback values retained
} catch (e) {
  // Read failure → fallback. Logged but never blocks save.
  console.warn(`[record-deal] readMarketFacts failed for fingerprint ${fingerprint}:`, e instanceof Error ? e.message : String(e));
}

// These override the client-sent values for these two specific fields:
const serverBenchmarkSource = canonicalBenchmarkSource;
const serverBenchmarkIsProxy = canonicalBenchmarkSource === "fallback";
   
    // ── Patch D Phase 2B: Canonical valuation basis (server-authoritative) ─────
    // Override the client-sent benchmark_source / benchmark_is_proxy with values
    // derived from readMarketFacts (canonical closed-comp benchmarks). The client
    // currently computes these from SCORE_INDUSTRIES (which is non-canonical);
    // making them server-authoritative aligns creation-time scoring with the
    // canonical data path consumed by the workspace PDF, Intel memo, and the
    // Phase 3 dashboard surfaces. Also captures the canonical median for the
    // dedicated canonical_market_multiple column.
    //
    // NAMING DISCIPLINE: this overrides VALUATION-side fields only
    // (benchmark_source, benchmark_is_proxy, canonical_market_multiple).
    // EARNINGS-side fields (usable_sde, benchmark_implied_sde,
    // normalization_trust_score) remain driven by normalizeDealFinancials's
    // null-benchmark path until Patch E activates the SDE-margin-haircut
    // circuit. Do not confuse the two.
    let canonicalBenchmarkSource: "industry_size_matched" | "industry_national" | "fallback" = "fallback";
    let canonicalMarketMultiple: number | null = null;
    try {
      const facts = await readMarketFacts(supabaseAdmin, {
        industry:     industry ?? null,
        revenue:      revNum,
        sde:          sdeNum,
        asking_price: priceNum,
        state:        state ?? null,
      });
      if (facts.closed_comp_median !== null && facts.closed_comp_basis !== "unavailable") {
        canonicalBenchmarkSource = facts.closed_comp_basis as typeof canonicalBenchmarkSource;
        canonicalMarketMultiple  = facts.closed_comp_median;
      }
      // else: canonical data unavailable for this industry → "fallback" / null retained
    } catch (e) {
      console.warn(`[record-deal] readMarketFacts failed for fingerprint ${fingerprint}:`,
        e instanceof Error ? e.message : String(e));
      // Read failure → "fallback" / null retained. Never blocks the save.
    }
    const serverBenchmarkSource:  "industry_size_matched" | "industry_national" | "fallback" =
      canonicalBenchmarkSource;
    const serverBenchmarkIsProxy: boolean = canonicalBenchmarkSource === "fallback";

    // ── Normalize financials before scoring ────────────────────────────────────
    // Runs normalizeDealFinancials() to compute usableSDE, trustScore, flags.
    // Falls back to stated SDE if normalization is unavailable.
    // NOTE: rmaBenchmarks stays null — Patch E will feed canonical margins here.
    let normPayload = {};
    try {
      const normalized = normalizeDealFinancials({
        revenue: revNum, sde: sdeNum, ebitda: safe(ebitda),
        price: priceNum,
        benchmarkFamily:          benchmark_family,
        classificationConfidence: classification_confidence,
        benchmarkIsProxy:         serverBenchmarkIsProxy,  // ← was: benchmark_is_proxy (client-sent)
        dataSource:               data_source as any,
        rmaBenchmarks:            null, // benchmarks not fed to normalization in Phase 2B (Patch E)
      });
      normPayload = buildNormalizationPayload(
        normalized,
        serverBenchmarkSource,  // ← was: benchmark_source as ... (client-sent)
      );
    } catch { /* normalization is additive — never block a save */ }
    
    // ── Insert deal run ────────────────────────────────────────────────────────
    const { error } = await supabaseAdmin.from("deal_runs").insert({
      tool_used,
      industry,
      revenue:         revNum,
      sde:             sdeNum,
      asking_price:    priceNum,
      debt_percent:    debt_percent    || null,
      interest_rate:   interest_rate   || null,
      term_years:      term_years      || null,
      city:            city            || null,
      state:           state           || null,
      zip_code:        zip_code        || null,
      employees:       employees       || null,
      years_in_business: years_in_business || null,
      revenue_trend:   revenue_trend   || null,
      customer_concentration: customer_concentration || null,
      owner_operated:  owner_operated  ?? null,
      has_real_estate: has_real_estate ?? null,
      valuation_multiple,
      canonical_market_multiple: canonicalMarketMultiple,   // ← Phase 2B-i: NEW
      dscr,
      monthly_payment,
      fair_value,
      recommended_offer_low,
      recommended_offer_high,
      overall_score,
      risk_level,
      valuation_score,
      debt_score,
      market_score,
      industry_score,
      operational_score: operational_score || null,
      red_flags:        red_flags   || [],
      green_flags:      green_flags || [],
      evidence_profile: evidence_profile || null,
      fingerprint,
      cluster_id,
      is_valid,
      // Auth fields
      user_id,
      pending_email:  user_id ? null : pending_email,
      is_anonymous:   !user_id,
      // Normalization fields (spread — empty object is a no-op if normalization failed)
      ...normPayload,
    });
    if (error) {
      console.error("Deal record error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    // ── Classification — fire-and-forget after successful insert ───────────────
    // Runs async so it never blocks the response.
    // Writes to: model_type, sub_model, benchmark_family, classification_confidence
    // on the deal_runs row via applyDealClassification(dealId).
    {
      const { data: justInserted } = await supabaseAdmin
        .from("deal_runs").select("id").eq("fingerprint", fingerprint)
        .order("created_at", { ascending: false }).limit(1).single();
      if (justInserted?.id) {
        applyDealClassification(justInserted.id).catch(err =>
          console.error("[record-deal] classification error:", err)
        );
      }
    }
    // Fetch the inserted row so callers get the full scored deal object back.
    // This powers the AnalyzeDealModal instant results display + dashboard state update.
    const { data: inserted } = await supabaseAdmin
      .from("deal_runs")
      .select(
        "id, tool_used, industry, asking_price, fair_value, valuation_multiple, " +
        "dscr, overall_score, risk_level, city, state, created_at, confidence_grade, " +
        "revenue, sde, red_flags, green_flags, recommended_offer_low, recommended_offer_high, " +
        "valuation_score, debt_score, market_score, industry_score, monthly_payment, " +
        "interest_rate, term_years, debt_percent, " +
        "evidence_profile, normalization_trust_score"
      )
      .eq("fingerprint", fingerprint)
      .eq("industry", industry)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    // ── CP SHADOW WRITE (Phase 0, shadow mode) ─────────────────────────────────
    // Additive, isolated, AWAITED, never-throwing. Runs the CP-2→CP-9 pipeline
    // server-side and persists a snapshot to evaluation_snapshots. Does NOT
    // affect the user-facing save: computeModalScore stays canonical, the
    // deal_runs insert above is authoritative, and any failure here is caught
    // and logged without altering the response.
    //
    // v1 deliberately AWAITS (not fire-and-forget) so Vercel cannot kill the
    // task when the response returns. Accepts small latency for reliability.
    //
    // Skips anonymous deals (no owner to gate reads against) and deals lacking
    // the minimum inputs the pipeline needs. Omits ebitda_margin_pct because
    // this route has no numeric RMA benchmark margin available; the adapter
    // handles the omission and CP runs on partial inputs by design.
    if (inserted?.id && user_id) {
      try {
        const baseInputs = mapRecordDealBodyToRuleInputs(body, {});

        // ── Phase 0.5a: opportunistic benchmark enrichment (best-effort) ──
        // If a benchmark_snapshots row exists for this deal, overlay its
        // raw/computed operational metrics (liquidity, efficiency, margins,
        // ar_days). record-deal stays canonical for identity + debt terms; CP
        // still derives its own DSCR. If none exists or the fetch fails, we
        // fall back to the sparse base inputs. Benchmark CONCLUSIONS
        // (financial_score, tension_indicator, percentiles, normalized_sde)
        // are never read — the fetch selects only raw/computed columns.
        const benchmark = await fetchLatestBenchmarkEnrichment(inserted.id, supabaseAdmin);
        const ruleInputs = mergeBenchmarkEnrichment(baseInputs, benchmark);
        const enrichmentSource = benchmark?.snapshot_id ?? null;

        if (hasMinimumInputsForShadow(ruleInputs)) {
          const shadow = await runCpPipelineAndPersist(
            {
              deal_id: inserted.id,
              user_id,
              rule_inputs: ruleInputs,
              raw_input_payload: {
                ...body,
                // Provenance: record which benchmark snapshot (if any) enriched
                // this CP snapshot, for audit/divergence analysis.
                _cp_enrichment_benchmark_snapshot_id: enrichmentSource,
              },
              deal_source_type: ruleInputs.deal_source_type ?? null,
              evaluation_id: inserted.id, // root evaluation for this fresh deal
              triggered_by: user_id,
            },
            supabaseAdmin,
          );
          if (shadow.ok) {
            console.log(
              `[record-deal] CP shadow snapshot written: ${shadow.snapshot_id} (deal ${inserted.id})` +
                (enrichmentSource
                  ? ` [enriched from benchmark ${enrichmentSource}]`
                  : ` [sparse — no benchmark snapshot]`),
            );
          } else {
            console.error(
              `[record-deal] CP shadow write failed at stage '${shadow.stage}' (${shadow.error_kind}): ${shadow.message}`,
            );
          }
        } else {
          console.log(
            `[record-deal] CP shadow skipped — insufficient inputs (deal ${inserted.id})`,
          );
        }
      } catch (shadowErr) {
        // Catch even unexpected throws — the shadow write must NEVER affect
        // the save response.
        console.error("[record-deal] CP shadow write threw:", shadowErr);
      }
    }

     // ── PHASE D: maintain canonical_deals + base scenario (ADDITIVE, best-effort) ──
    // Closes the contamination path at the source: a duplicate fingerprint REUSES the
    // canonical instead of minting a new one, so DRI/benchmarks (which read canonical)
    // stay clean even though deal_runs may hold the dupe. The deal_runs insert above is
    // unchanged and authoritative; this NEVER alters the response. fingerprint is the
    // SAME value written to deal_runs (computed at line 89, in scope here).
    if (inserted?.id) {
      try {
        const canonicalResult = await maintainCanonicalAndBaseScenario(supabaseAdmin, {
          deal_run_id: inserted.id,
          user_id: user_id ?? null,                 // local in scope (nullable)
          fingerprint,                              // local in scope — same as deal_runs
          industry: inserted.industry ?? null,
          source_listing_price: inserted.asking_price ?? null,
          original_seller_reported_revenue: inserted.revenue ?? null,
          original_seller_reported_sde: inserted.sde ?? null,
          location_state: inserted.state ?? null,
        });
        if (!canonicalResult.ok) {
          console.error("[record-deal] PHASE_D_CANONICAL_FAILURE " + JSON.stringify({
            deal_run_id: inserted.id, action: canonicalResult.action, detail: canonicalResult.detail,
          }));
        } else {
          console.log("[record-deal] CANONICAL_SAVE " + JSON.stringify({
            deal_run_id: inserted.id,
            canonical_deal_id: canonicalResult.canonical_deal_id,
            base_scenario_id: canonicalResult.base_scenario_id,
            action: canonicalResult.action,         // 'created_canonical' | 'reused_canonical'
          }));
        }
      } catch (canonErr) {
        // Absolute backstop — canonical maintenance must NEVER break the save flow.
        console.error("[record-deal] PHASE_D_CANONICAL_THREW:", canonErr);
      }
    }
    
    // Derive gap_pct and signal for immediate UI use
    const gap_pct = inserted?.fair_value && inserted.fair_value > 0
      ? Math.round(((inserted.asking_price - inserted.fair_value) / inserted.fair_value) * 100)
      : 0;
    const signal =
      gap_pct > 10  ? "overpriced" :
      gap_pct < -5  ? "opportunity" :
      "fair";
    return NextResponse.json({
      success: true,
      cluster_id,
      fingerprint,
      is_valid,
      deal: inserted ? { ...inserted, gap_pct, signal } : null,
    });
  } catch (error) {
    console.error("Record deal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
