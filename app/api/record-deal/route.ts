// app/api/record-deal/route.ts
// PATCH E1/E2 — instrumented version. Base: b6be2c2 (deployed 2026-06-05).
// Changes vs deployed:
//   [E1] import logPipelineEvent; structured events for normalization,
//        insert failure, classification failure, CP shadow failure, Phase D failure.
//   [E1] normalization catch is no longer empty — error captured and logged.
//   [E2] normalization_status ('succeeded'|'failed'|'skipped') written on every insert.
// Everything else is unchanged from the deployed route.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// [E2 ROOT-CAUSE FIX] normalizeDealFinancials lives in normalizationEngine and was
// never re-exported by normalizationIntegration — importing it from the integration
// module yielded undefined at runtime (TypeError captured by pipeline_events).
// getConvictionCap was imported but unused in this route; dropped.
import { normalizeDealFinancials } from "@/lib/normalizationEngine";
import { buildNormalizationPayload } from "@/lib/normalizationIntegration";
import { applyDealClassification } from "@/lib/dealClassifier";
import { logPipelineEvent } from "@/lib/pipelineLogger"; // [E1]
// [E3] Divergence observations — computed and persisted, consumed by nothing until E4.
import { loadMarginReferences, computeDivergenceObservation } from "@/lib/divergenceObservation";
// [E4 P1] The single channel: divergence → confidence grade → conviction cap (v2.0)
import { deriveConfidenceGrade, applyConvictionCap } from "@/lib/investigationEngine";
import type { DivergenceBand, ReferenceQuality, ConfidenceGrade } from "@/lib/investigationEngine";
import { deriveVerdict } from "@/lib/dealVerdict";
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

    // ── Normalize financials before scoring ────────────────────────────────────
    // [E1/E2] Runs normalizeDealFinancials() to compute usableSDE, trustScore,
    // flags. Falls back to stated SDE if normalization is unavailable.
    // The save is STILL never blocked — but failure is now captured, logged to
    // pipeline_events, and recorded on the row via normalization_status.
    let normPayload: Record<string, unknown> = {};
    let normalizationStatus: "succeeded" | "failed" | "skipped" = "skipped";
    let normalizationError: unknown = undefined;

    const normInputsPresent =
      typeof revNum   === "number" && isFinite(revNum)   &&
      typeof sdeNum   === "number" && isFinite(sdeNum)   &&
      typeof priceNum === "number" && isFinite(priceNum);

    if (normInputsPresent) {
      try {
        const normalized = normalizeDealFinancials({
          revenue: revNum, sde: sdeNum, ebitda: safe(ebitda),
          price: priceNum,
          benchmarkFamily:          benchmark_family,
          classificationConfidence: classification_confidence,
          benchmarkIsProxy:         benchmark_is_proxy,
          dataSource:               data_source as any,
          rmaBenchmarks:            null, // benchmarks not fetched in this route (E3 — paused)
        });
        normPayload = buildNormalizationPayload(
          normalized,
          benchmark_source as "direct" | "proxy" | "fallback" | undefined ?? undefined,
        );
        normalizationStatus = "succeeded";
      } catch (e) {
        // [E1] No longer silent. Save proceeds; failure is recorded below.
        normalizationStatus = "failed";
        normalizationError  = e;
      }
    }
    // [E1] One structured event per save, regardless of outcome. Awaited so
    // Vercel cannot kill it; logPipelineEvent itself never throws.
    await logPipelineEvent(supabaseAdmin, {
      stage:  "normalization",
      status: normalizationStatus === "succeeded" ? "ok" : normalizationStatus,
      fingerprint,
      error:  normalizationError,
      detail: normalizationStatus === "succeeded"
        ? { keys_emitted: Object.keys(normPayload) }
        : { inputs_present: normInputsPresent, data_source, benchmark_family },
    });

    // ── [E3] Divergence observation (ingestion-only) ────────────────────────
    // Observations, never adjustments: reads industry_margin_reference,
    // computes band/percentile/reference figures, persists them on the row.
    // NOTHING consumes these columns until E4 (single-channel rule).
    // Non-blocking and fail-visible, same contract as normalization above.
    let divergencePayload: Record<string, unknown> = {};
    let divergenceStatus: "ok" | "failed" | "skipped" = "skipped";
    let divergenceError: unknown = undefined;
    if (normInputsPresent && industry) {
      try {
        const marginRefs = await loadMarginReferences(supabaseAdmin, industry);
        const observation = computeDivergenceObservation(
          { revenue: revNum, sde: sdeNum, industry },
          marginRefs
        );
        if (observation) {
          divergencePayload = { ...observation };
          divergenceStatus = "ok";
        }
        // observation === null → stays 'skipped' (plausibility window or empty reference)
      } catch (e) {
        divergenceStatus = "failed";
        divergenceError  = e;
      }
    }
    await logPipelineEvent(supabaseAdmin, {
      stage:  "divergence",
      status: divergenceStatus,
      fingerprint,
      error:  divergenceError,
      detail: divergenceStatus === "ok"
        ? {
            band:    (divergencePayload as { divergence_band?: string }).divergence_band,
            quality: (divergencePayload as { reference_source_quality?: string }).reference_source_quality,
            ref_n:   (divergencePayload as { reference_n?: number }).reference_n,
          }
        : { industry, inputs_present: normInputsPresent },
    });

    // ── [E4 P1] Server benchmark resolution (D8) ────────────────────────────
    // The server-resolved source GOVERNS; the client value is diagnostic.
    // Deterministic rule: dealstats_benchmarks national row (size_band null)
    // with sample_size >= 5 exists for this industry → 'direct'; else 'fallback'.
    let serverBenchmarkSource: "direct" | "fallback" = "fallback";
    try {
      const { data: dsRow } = await supabaseAdmin
        .from("dealstats_benchmarks")
        .select("sample_size")
        .eq("industry_key", industry)
        .is("size_band", null)
        .gte("sample_size", 5)
        .limit(1)
        .maybeSingle();
      if (dsRow) serverBenchmarkSource = "direct";
    } catch { /* resolution failure → 'fallback'; surfaced via the event below */ }

    const clientBenchmarkSource: string | null = benchmark_source ?? null;
    const benchmarkSourceMatch: boolean | null =
      clientBenchmarkSource !== null ? clientBenchmarkSource === serverBenchmarkSource : null;

    if (clientBenchmarkSource !== null && benchmarkSourceMatch === false) {
      await logPipelineEvent(supabaseAdmin, {
        stage: "benchmark_source_mismatch", status: "ok", fingerprint,
        detail: { client: clientBenchmarkSource, server: serverBenchmarkSource, industry },
      });
    }
    if (serverBenchmarkSource === "fallback") {
      // Weekly-reviewable early warning (the pharmacy lesson).
      await logPipelineEvent(supabaseAdmin, {
        stage: "benchmark_fallback", status: "ok", fingerprint, detail: { industry },
      });
    }

    // ── [E4 P1] Confidence grade → conviction cap → server verdict (D1/D2) ──
    // THE single channel. The cap consumes only the grade; the grade consumes
    // only divergence observations. verdict_pre_cap persists for audit recovery.
    const obs = divergencePayload as {
      divergence_band?: DivergenceBand;
      reference_source_quality?: ReferenceQuality;
      closed_lens_band?: DivergenceBand | null;
    };
    const confidenceGrade: ConfidenceGrade | null = deriveConfidenceGrade({
      divergenceBand:   obs.divergence_band ?? null,
      referenceQuality: obs.reference_source_quality ?? null,
      closedLensBand:   obs.closed_lens_band ?? null,
    });

    const manualReviewRequired =
      Boolean((normPayload as { manual_review_required?: boolean }).manual_review_required);
    const fairValueNum = typeof fair_value === "number" && isFinite(fair_value) ? fair_value : 0;
    const gapPctPre = fairValueNum > 0 ? ((priceNum - fairValueNum) / fairValueNum) * 100 : 0;

    const preCapVerdict = deriveVerdict({
      gap_pct:                gapPctPre,
      dscr:                   safe(dscr),
      overall_score:          safe(overall_score),
      risk_level:             risk_level ?? null,
      manual_review_required: manualReviewRequired,
    });
    const cap = applyConvictionCap(preCapVerdict, confidenceGrade);

    if (cap.capApplied) {
      await logPipelineEvent(supabaseAdmin, {
        stage: "verdict_cap", status: "ok", fingerprint,
        detail: {
          grade: confidenceGrade,
          pre_cap: preCapVerdict,
          post_cap: cap.finalVerdict,
          ceiling: cap.ceiling,
        },
      });
    }

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
      // [E2] Row-level status — makes normalization nulls explainable.
      // NULL = pre-Patch-E historical row; see pipeline_events for failures.
      normalization_status: normalizationStatus,
      // [E3] Methodology version: 'v2' on every new row, even when the
      // divergence observation itself was skipped (columns stay null and the
      // pipeline event says why). Historical rows remain null = v1 era.
      normalization_version: "v2",
      // [E4 P1] v2.0: server-authoritative verdict + single-channel grade.
      // Null grade (observation skipped) persists as null; verdict still
      // derives and persists (uncapped) so v2 rows are self-describing.
      score_version:           "v2.0",
      verdict:                 cap.finalVerdict,
      verdict_pre_cap:         preCapVerdict,
      confidence_grade:        confidenceGrade,
      client_benchmark_source: clientBenchmarkSource,
      server_benchmark_source: serverBenchmarkSource,
      benchmark_source_match:  benchmarkSourceMatch,
      // Normalization fields (spread — empty object is a no-op if normalization failed)
      ...normPayload,
      // [E3] Divergence observation fields (spread — empty object is a no-op
      // if skipped/failed; includes normalization_version 'v2' redundantly,
      // matching the explicit value above)
      ...divergencePayload,
    });
    if (error) {
      console.error("Deal record error:", error);
      // [E1] Insert failures were console-only; now queryable.
      await logPipelineEvent(supabaseAdmin, {
        stage: "insert", status: "failed", fingerprint, error,
        detail: { normalization_status: normalizationStatus },
      });
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
        applyDealClassification(justInserted.id).catch(err => {
          console.error("[record-deal] classification error:", err);
          // [E1] Best-effort event — fire-and-forget context, not awaited by design.
          void logPipelineEvent(supabaseAdmin, {
            stage: "classification", status: "failed", fingerprint,
            dealRunId: justInserted.id, error: err,
          });
        });
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
            // [E1] Structured record of shadow failures (awaited context).
            await logPipelineEvent(supabaseAdmin, {
              stage: "cp_shadow", status: "failed", fingerprint,
              dealRunId: inserted.id,
              detail: { cp_stage: shadow.stage, error_kind: shadow.error_kind, message: shadow.message },
            });
          }
        } else {
          console.log(
            `[record-deal] CP shadow skipped — insufficient inputs (deal ${inserted.id})`,
          );
          await logPipelineEvent(supabaseAdmin, {
            stage: "cp_shadow", status: "skipped", fingerprint, dealRunId: inserted.id,
          });
        }
      } catch (shadowErr) {
        // Catch even unexpected throws — the shadow write must NEVER affect
        // the save response.
        console.error("[record-deal] CP shadow write threw:", shadowErr);
        await logPipelineEvent(supabaseAdmin, {
          stage: "cp_shadow", status: "failed", fingerprint,
          dealRunId: inserted?.id ?? null, error: shadowErr,
        });
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
          // [E1] Structured record (awaited context).
          await logPipelineEvent(supabaseAdmin, {
            stage: "canonical", status: "failed", fingerprint,
            dealRunId: inserted.id,
            detail: { action: canonicalResult.action, canonical_detail: canonicalResult.detail },
          });
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
        await logPipelineEvent(supabaseAdmin, {
          stage: "canonical", status: "failed", fingerprint,
          dealRunId: inserted?.id ?? null, error: canonErr,
        });
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
      // [E4 P1 / D9] Server-authoritative verdict — the modal renders THIS,
      // never its own uncapped derivation.
      verdict:          cap.finalVerdict,
      verdict_pre_cap:  preCapVerdict,
      confidence_grade: confidenceGrade,
      verdict_meta: {
        capApplied:           cap.capApplied,
        ceiling:              cap.ceiling,
        verificationRequired: cap.verificationRequired,
      },
      deal: inserted ? { ...inserted, gap_pct, signal } : null,
    });
  } catch (error) {
    console.error("Record deal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
