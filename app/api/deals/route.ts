import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadBenchmarkData,
  getFairValue,
  getDealRealityScore,
  getValuationBenchmark,
  getSizeBand,
  type BenchmarkDataset,
} from "@/lib/valuation-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPricingStatus(dri: number | null): { label: string; color: string; bg: string } {
  if (dri === null) return { label: "Unrated", color: "#6B7280", bg: "rgba(107,114,128,0.1)" };
  if (dri < 0.85)  return { label: "Undervalued",      color: "#10B981", bg: "rgba(16,185,129,0.12)" };
  if (dri < 1.0)   return { label: "Below Market",     color: "#34D399", bg: "rgba(52,211,153,0.1)"  };
  if (dri <= 1.15) return { label: "Fair Market",      color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  };
  if (dri <= 1.30) return { label: "Overpriced",       color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  };
  return             { label: "Highly Overpriced",     color: "#EF4444", bg: "rgba(239,68,68,0.1)"   };
}

function enrichDeals(deals: any[], data: BenchmarkDataset) {
  return deals.map((deal) => {
    const sizeBand = getSizeBand(deal.revenue) ?? undefined;
    const industryKey = deal.industry;

    // Pull the full benchmark object so we can log QA metadata
    const benchmark = getValuationBenchmark(industryKey, sizeBand, data);

    const fv  = getFairValue(industryKey, sizeBand, deal.sde || 0, data);
    const drs = getDealRealityScore(deal.asking_price || 0, industryKey, sizeBand, deal.sde || 0, data);
    const ps  = getPricingStatus(drs.dri);

    return {
      ...deal,

      // ── User-facing valuation fields
      fairValue:           fv.fairValue,
      fairValueP25:        fv.p25FairValue,
      fairValueP75:        fv.p75FairValue,
      benchmarkMultiple:   fv.multiple,
      benchmarkSource:     fv.source,
      benchmarkConfidence: fv.confidence,
      dri:                 drs.dri,
      driGapPct:           drs.gapPct,
      driCondition:        drs.condition,
      pricingStatus:       ps.label,
      pricingStatusColor:  ps.color,
      pricingStatusBg:     ps.bg,

      // ── QA / debugging metadata (internal — not rendered by UI but available in API response)
      // Use these to verify the engine is picking the right source for each deal.
      _qa: {
        benchmarkSourceUsed:     benchmark.source,       // "dstats_band" | "dstats_national" | "bizbuysell" | "listing" | null
        benchmarkSizeBandUsed:   benchmark.sizeBand,     // e.g. "500k_1m" (null = national aggregate)
        benchmarkSampleSize:     benchmark.sampleSize,   // number of transactions behind this benchmark
        benchmarkMultipleUsed:   benchmark.medianSdeMultiple, // the actual multiple that drove fair value
        dealSizeBandInferred:    sizeBand ?? null,        // what size band we looked up for this deal
        fairValueComputed:       fv.fairValue,
        driComputed:             drs.dri,
        confidenceGrade:         benchmark.confidence,
      },
    };
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const industry   = url.searchParams.get("industry");
  const state      = url.searchParams.get("state");
  const minPrice   = url.searchParams.get("minPrice");
  const maxPrice   = url.searchParams.get("maxPrice");
  const minScore   = url.searchParams.get("minScore");
  const sort       = url.searchParams.get("sort")  || "created_at";
  const order      = url.searchParams.get("order") || "desc";
  const page       = parseInt(url.searchParams.get("page") || "1");
  const limit      = 30;
  const offset     = (page - 1) * limit;

  try {
    // DB query + benchmark load in parallel — no added latency
    const [queryResult, benchmarks] = await Promise.all([
      (async () => {
        let query = supabase
          .from("deal_runs")
          .select("*", { count: "exact" })
          .eq("is_valid", true)
          .gt("revenue", 0)
          .gt("sde", 0)
          .gt("asking_price", 0);

        if (industry && industry !== "all") query = query.eq("industry", industry);
        if (state)    query = query.eq("state", state);
        if (minPrice) query = query.gte("asking_price", parseFloat(minPrice));
        if (maxPrice) query = query.lte("asking_price", parseFloat(maxPrice));
        if (minScore) query = query.gte("overall_score", parseInt(minScore));

        const validSorts: Record<string, string> = {
          created_at: "created_at", asking_price: "asking_price",
          revenue: "revenue", overall_score: "overall_score", valuation_multiple: "valuation_multiple",
        };
        query = query
          .order(validSorts[sort] || "created_at", { ascending: order === "asc" })
          .range(offset, offset + limit - 1);

        return query;
      })(),
      loadBenchmarkData(),
    ]);

    const { data: industryCountData } = await supabase
      .from("deal_runs").select("industry").eq("is_valid", true).gt("revenue", 0);

    const { data, count, error } = queryResult;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const counts: Record<string, number> = {};
    (industryCountData || []).forEach((d: any) => {
      if (d.industry) counts[d.industry] = (counts[d.industry] || 0) + 1;
    });

    return NextResponse.json({
      success:        true,
      deals:          enrichDeals(data || [], benchmarks),
      total:          count || 0,
      page,
      totalPages:     Math.ceil((count || 0) / limit),
      industryCounts: counts,
    });

  } catch (error) {
    console.error("Deals browse error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
