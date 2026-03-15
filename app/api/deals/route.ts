import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadBenchmarkData,
  getFairValue,
  getDealRealityScore,
  getSizeBand,
  type BenchmarkDataset,
} from "@/lib/valuation-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// PRICING STATUS LABEL
// Derived from DRI (asking / fair value ratio).
// Uses same thresholds as getDealRealityScore() for consistency.
// ─────────────────────────────────────────────────────────────────────────────
function getPricingStatus(dri: number | null): {
  label: string;
  color: string;
  bg: string;
} {
  if (dri === null) return { label: "Unrated", color: "#6B7280", bg: "rgba(107,114,128,0.1)" };
  if (dri < 0.85) return { label: "Undervalued", color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  if (dri < 1.0)  return { label: "Below Market", color: "#34D399", bg: "rgba(52,211,153,0.1)" };
  if (dri <= 1.15) return { label: "Fair Market",  color: "#3B82F6", bg: "rgba(59,130,246,0.1)" };
  if (dri <= 1.30) return { label: "Overpriced",   color: "#F59E0B", bg: "rgba(245,158,11,0.1)" };
  return { label: "Highly Overpriced", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRICH A BATCH OF DEALS
// Runs valuation engine over each deal. Called after the Supabase query so
// the DB fetch and benchmark load happen in parallel via Promise.all.
// ─────────────────────────────────────────────────────────────────────────────
function enrichDeals(deals: any[], data: BenchmarkDataset) {
  return deals.map((deal) => {
    const sizeBand = getSizeBand(deal.revenue);
    const industryKey = deal.industry;

    // Fair value from engine hierarchy (DealStats → BizBuySell → listing → null)
    const fv = getFairValue(industryKey, sizeBand, deal.sde || 0, data);

    // Deal Reality Score (DRI for this specific deal)
    const drs = getDealRealityScore(
      deal.asking_price || 0,
      industryKey,
      sizeBand,
      deal.sde || 0,
      data
    );

    const pricingStatus = getPricingStatus(drs.dri);

    return {
      // ── All original deal_runs fields passed through unchanged
      ...deal,

      // ── Valuation engine enrichments (new derived fields)
      fairValue: fv.fairValue,                    // Estimated MVIC from benchmarks
      fairValueP25: fv.p25FairValue,              // Low end of range
      fairValueP75: fv.p75FairValue,              // High end of range
      benchmarkMultiple: fv.multiple,             // The multiple used for fair value
      benchmarkSource: fv.source,                 // "dstats_band" | "dstats_national" | "bizbuysell" | "listing"
      benchmarkConfidence: fv.confidence,         // "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT"

      // Deal Reality Index for this specific listing
      dri: drs.dri,                               // ask / fair value ratio
      driGapPct: drs.gapPct,                      // % premium over fair value (+/-)
      driCondition: drs.condition,                // "Undervalued" | "Healthy Market" | etc.

      // Pricing status label for UI badge
      pricingStatus: pricingStatus.label,
      pricingStatusColor: pricingStatus.color,
      pricingStatusBg: pricingStatus.bg,
    };
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const industry = url.searchParams.get("industry");
  const state = url.searchParams.get("state");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const minScore = url.searchParams.get("minScore");
  const sort = url.searchParams.get("sort") || "created_at";
  const order = url.searchParams.get("order") || "desc";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    // ── Run DB query and benchmark load in parallel
    const [queryResult, benchmarks] = await Promise.all([
      // Supabase query — unchanged from original
      (async () => {
        let query = supabase
          .from("deal_runs")
          .select("*", { count: "exact" })
          .eq("is_valid", true)
          .gt("revenue", 0)
          .gt("sde", 0)
          .gt("asking_price", 0);

        if (industry && industry !== "all") query = query.eq("industry", industry);
        if (state) query = query.eq("state", state);
        if (minPrice) query = query.gte("asking_price", parseFloat(minPrice));
        if (maxPrice) query = query.lte("asking_price", parseFloat(maxPrice));
        if (minScore) query = query.gte("overall_score", parseInt(minScore));

        const validSorts: Record<string, string> = {
          created_at: "created_at",
          asking_price: "asking_price",
          revenue: "revenue",
          overall_score: "overall_score",
          valuation_multiple: "valuation_multiple",
        };
        const sortCol = validSorts[sort] || "created_at";
        query = query.order(sortCol, { ascending: order === "asc" }).range(offset, offset + limit - 1);

        return query;
      })(),

      // Benchmark data — loaded once, used for all 30 deals on this page
      loadBenchmarkData(),

      // Industry counts — for sidebar filter (unchanged)
    ]);

    // Industry counts query (can't be in Promise.all above due to separate supabase call)
    const { data: industryCountData } = await supabase
      .from("deal_runs")
      .select("industry")
      .eq("is_valid", true)
      .gt("revenue", 0);

    const { data, count, error } = queryResult;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    (industryCountData || []).forEach((d: any) => {
      if (d.industry) counts[d.industry] = (counts[d.industry] || 0) + 1;
    });

    // ── Enrich deals with valuation engine derived fields
    const enrichedDeals = enrichDeals(data || [], benchmarks);

    return NextResponse.json({
      success: true,
      deals: enrichedDeals,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      industryCounts: counts,
    });

  } catch (error) {
    console.error("Deals browse error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
