// app/api/benchmarks/route.ts
// Layer 3: Benchmark API — serves RMA data to the scoring engine
//
// GET /api/benchmarks?naics=561730
// GET /api/benchmarks?industry=landscaping
// GET /api/benchmarks?industry=landscaping&year=2025-26

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNaicsFromIndustry, getBenchmarkContext } from "@/lib/industryMappings";
import type { IndustryBenchmarks } from "@/lib/types/benchmarks";

// Re-export so callers can import the type from either location
export type { IndustryBenchmarks };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildBenchmarks(
  rows: { metric_name: string; metric_value: number }[],
  naicsCode:    string,
  industryName: string,
  year:         string,
): IndustryBenchmarks {
  const get = (key: string): number | null =>
    rows.find(r => r.metric_name === key)?.metric_value ?? null;

  const debtToEquity = get("debt_to_equity");
  const coverage     = get("interest_coverage");

  // leverage_flag: based on debt/worth ratio
  const leverage_flag: IndustryBenchmarks["leverage_flag"] =
    debtToEquity === null ? null :
    debtToEquity < 1.5   ? "low" :
    debtToEquity < 3.0   ? "moderate" : "high";

  // coverage_flag: based on EBIT/Interest ratio
  const coverage_flag: IndustryBenchmarks["coverage_flag"] =
    coverage === null ? null :
    coverage >= 3.0   ? "strong" :
    coverage >= 1.5   ? "adequate" : "weak";

  // ebitda_margin_pct is already stored as a decimal by the RMA import pipeline
  const ebitda_margin_pct = get("ebitda_margin_pct");

  return {
    naics_code:               naicsCode,
    industry_name:            industryName,
    year,
    operating_margin_pct:     get("operating_margin_pct"),
    pretax_margin_pct:        get("pretax_margin_pct"),
    ebitda_margin_pct,
    current_ratio:            get("current_ratio"),
    debt_to_equity:           debtToEquity,
    interest_coverage:        coverage,
    asset_turnover:           get("asset_turnover"),
    sales_to_working_capital: get("sales_to_working_capital"),
    return_on_assets:         get("return_on_assets"),
    total_revenue:            get("total_revenue"),
    total_assets:             get("total_assets"),
    implied_sde_margin:       ebitda_margin_pct, // best available SDE proxy from RMA
    leverage_flag,
    coverage_flag,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  let naicsCode     = searchParams.get("naics")?.trim()    ?? null;
  const industryKey = searchParams.get("industry")?.trim() ?? null;
  const year        = searchParams.get("year")?.trim()     ?? "2025-26";

  if (!naicsCode && industryKey) {
    naicsCode = getNaicsFromIndustry(industryKey);
  }

  if (!naicsCode) {
    return NextResponse.json(
      { error: "Provide ?naics=XXXXXX or ?industry=nextax_key" },
      { status: 400 }
    );
  }

  const { data: rows, error } = await supabase
    .from("rma_benchmarks")
    .select("metric_name, metric_value, industry_name, year")
    .eq("naics_code", naicsCode)
    .eq("year", year);

  if (error) {
    console.error("rma_benchmarks query error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const context = industryKey ? getBenchmarkContext(industryKey) : null;

  if (rows && rows.length > 0) {
    const benchmarks = buildBenchmarks(rows, naicsCode, rows[0].industry_name, year);
    return NextResponse.json({ ok: true, source: "rma_exact", benchmarks, context });
  }

  return NextResponse.json({
    ok:         true,
    source:     "no_data",
    benchmarks: null,
    context,
    message:    `No RMA data for NAICS ${naicsCode} / year ${year}`,
  });
}
