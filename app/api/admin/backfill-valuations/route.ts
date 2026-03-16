/**
 * /api/admin/backfill-valuations
 *
 * One-time backfill script: updates deal_runs with engine-computed valuation fields.
 * Safe to re-run — uses upsert logic (updates only, never deletes).
 * Processes in batches of 50 to stay within Vercel's 60s function timeout.
 *
 * Fields updated per deal:
 *   valuation_score         — recomputed against DealStats benchmarks
 *   fair_value              — engine fair value estimate (SDE × benchmark multiple)
 *   overall_score           — only updated if valuation_score change is material (>5 pts)
 *   benchmark_source_used   — "dstats_band" | "dstats_national" | "bizbuysell" | "listing"
 *   benchmark_size_band_used — e.g. "500k_1m"
 *   benchmark_sample_size   — number of transactions behind the benchmark
 *   benchmark_multiple_used — the actual SDE multiple used
 *   confidence_grade        — "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT"
 *
 * Fields intentionally NOT changed:
 *   debt_score, market_score, industry_score, operational_score — engine doesn't touch these
 *   industry_transaction_benchmarks — static BizBuySell 2025 annual report, leave alone
 *
 * Auth: requires CRON_SECRET header (same as cron job)
 * URL:  /api/admin/backfill-valuations?batch=1   (increment batch to page through)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadBenchmarkData,
  getFairValue,
  getDealRealityScore,
  getValuationBenchmark,
  getSizeBand,
} from "@/lib/valuation-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 50;

// Valuation score from DRI — mirrors the logic in deal-reality-check and deal-risk-analyzer
function computeValuationScore(dealMultiple: number, benchmarkMultiple: number): number {
  const mid  = benchmarkMultiple;
  const low  = benchmarkMultiple * 0.75;
  const high = benchmarkMultiple * 1.30;

  let score: number;
  if (dealMultiple <= mid * 0.85)    score = Math.min(95, 85 + (mid - dealMultiple) / mid * 20);
  else if (dealMultiple <= mid)      score = Math.min(90, 70 + (mid - dealMultiple) / mid * 40);
  else if (dealMultiple <= mid*1.15) score = 70 - ((dealMultiple - mid) / mid) * 50;
  else if (dealMultiple <= mid*1.30) score = 50 - ((dealMultiple - mid*1.15) / mid) * 60;
  else                               score = Math.max(5, 30 - ((dealMultiple - mid*1.30) / mid) * 50);

  return Math.round(Math.max(5, Math.min(98, score)));
}

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ||
                 new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = parseInt(new URL(req.url).searchParams.get("batch") || "1");
  const dryRun = new URL(req.url).searchParams.get("dry") === "true";
  const offset = (batch - 1) * BATCH_SIZE;

  try {
    // Load benchmarks once for the whole batch
    const [benchmarks, dealsRes] = await Promise.all([
      loadBenchmarkData(),
      supabase
        .from("deal_runs")
        .select("id, industry, revenue, sde, asking_price, valuation_score, overall_score, debt_score, market_score, industry_score, operational_score")
        .eq("is_valid", true)
        .gt("sde", 0)
        .gt("asking_price", 0)
        .order("created_at", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1),
    ]);

    const deals = dealsRes.data || [];
    if (deals.length === 0) {
      return NextResponse.json({ success: true, message: "No more deals to backfill", batch, processed: 0 });
    }

    const updates: any[] = [];
    const skipped: string[] = [];
    const log: any[] = [];

    for (const deal of deals) {
      const sizeBand   = getSizeBand(deal.revenue) ?? undefined;
      const benchmark  = getValuationBenchmark(deal.industry, sizeBand, benchmarks);
      const fv         = getFairValue(deal.industry, sizeBand, deal.sde, benchmarks);

      // Skip if no benchmark data at all
      if (!benchmark.medianSdeMultiple || !fv.fairValue) {
        skipped.push(deal.id);
        continue;
      }

      const dealMultiple    = deal.asking_price / deal.sde;
      const newValScore     = computeValuationScore(dealMultiple, benchmark.medianSdeMultiple);
      const oldValScore     = deal.valuation_score || 0;
      const valScoreDelta   = Math.abs(newValScore - oldValScore);

      // Recompute overall only if valuation score shifts materially (> 5 pts)
      // Preserves debt/market/industry/operational scores which the engine doesn't touch
      let newOverall = deal.overall_score;
      if (valScoreDelta > 5) {
        const debtScore       = deal.debt_score       || 50;
        const marketScore     = deal.market_score     || 50;
        const industryScore   = deal.industry_score   || 50;
        const operationalScore = deal.operational_score || 50;
        newOverall = Math.round(Math.max(5, Math.min(98,
          newValScore     * 0.25 +
          debtScore       * 0.25 +
          marketScore     * 0.15 +
          industryScore   * 0.15 +
          operationalScore * 0.20
        )));
      }

      const update = {
        id:                        deal.id,
        valuation_score:           newValScore,
        fair_value:                fv.fairValue,
        overall_score:             newOverall,
        // QA metadata columns — add these to deal_runs if they don't exist yet (see migration below)
        benchmark_source_used:     benchmark.source,
        benchmark_size_band_used:  benchmark.sizeBand,
        benchmark_sample_size:     benchmark.sampleSize,
        benchmark_multiple_used:   benchmark.medianSdeMultiple,
        confidence_grade:          benchmark.confidence,
      };

      updates.push(update);
      log.push({
        id:            deal.id,
        industry:      deal.industry,
        sizeBand:      sizeBand ?? "—",
        source:        benchmark.source,
        oldValScore,
        newValScore,
        delta:         valScoreDelta,
        oldOverall:    deal.overall_score,
        newOverall,
        fairValue:     fv.fairValue,
        confidence:    benchmark.confidence,
      });
    }

    // Write updates (skip in dry run mode)
    if (!dryRun && updates.length > 0) {
      const { error } = await supabase
        .from("deal_runs")
        .upsert(updates, { onConflict: "id" });

      if (error) {
        console.error("Backfill upsert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success:   true,
      batch,
      offset,
      processed: updates.length,
      skipped:   skipped.length,
      dryRun,
      nextBatch: deals.length === BATCH_SIZE ? batch + 1 : null,  // null = done
      log,       // full per-deal log for QA review
    });

  } catch (err) {
    console.error("Backfill error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
