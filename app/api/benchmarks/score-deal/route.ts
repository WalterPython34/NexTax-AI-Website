// app/api/benchmarks/score-deal/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Financial Benchmarking endpoint.
//
// POST /api/benchmarks/score-deal
//   body: { inputs: BenchmarkInputs, deal_structure?: DealStructureInputs }
//   returns: BenchmarkAnalysis
//
// Benchmark sources:
//   - 'rma'       (financial-statement industry data, quartile-based)
//   - 'dealstats' (observed transaction data, quartile-computed on the fly)
//
// Source mapping rules:
//   gross_margin_pct        → no benchmark (gross margin not consistently tracked)
//   sde_margin_pct          → TWO rows (RMA + DealStats) — distinct lender vs market views
//   operating_margin_pct    → DealStats only (RMA doesn't store operating margin directly)
//   current_ratio           → RMA only
//   dscr                    → no industry benchmark (lender threshold based)
//   inventory_turnover      → RMA only
//   days_inventory_outstanding → RMA only (transformed from inventory turnover)
//
// AI interpretation is a SEPARATE endpoint (/api/benchmarks/interpret).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNaicsFromIndustry } from "@/lib/industryMappings";
import { calculateAllRatios } from "@/lib/benchmarks/calculations";
import {
  computePercentileWithStatus,
  classifyOutlier,
  directionalCompare,
  METRIC_DIRECTIONS,
  METRIC_TO_RMA_NAME,
} from "@/lib/benchmarks/percentile-engine";
import {
  generateOperatingFlags,
  analyzeDealStructure,
} from "@/lib/benchmarks/risk-flags";
import { runInteractionLayer } from "@/lib/benchmarks/interactions";
import type {
  BenchmarkInputs,
  DealStructureInputs,
  BenchmarkAnalysis,
  MetricBenchmarkRow,
  CalculatedRatios,
  RatioResult,
  Quartile,
  QuartileTriple,
  BenchmarkSource,
} from "@/lib/benchmarks/types";

const DEFAULT_BENCHMARK_YEAR = "2025-26";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Metric labels ────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  gross_margin_pct:           "Gross Margin",
  sde_margin_pct:             "SDE Margin",
  operating_margin_pct:       "Operating Margin",
  current_ratio:              "Current Ratio",
  dscr:                       "DSCR",
  inventory_turnover:         "Inventory Turnover",
  days_inventory_outstanding: "Days Inventory Outstanding",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function unwrap(r: RatioResult): { value: number | null; reason: string | null } {
  return r.ok ? { value: r.value, reason: null } : { value: null, reason: r.reason };
}

function buildQuartileTriple(
  rows: { metric_quartile: Quartile; metric_value: number }[],
): QuartileTriple {
  const triple: QuartileTriple = { q1: null, median: null, q3: null };
  for (const r of rows) {
    if (r.metric_quartile === "q1")     triple.q1 = r.metric_value;
    if (r.metric_quartile === "median") triple.median = r.metric_value;
    if (r.metric_quartile === "q3")     triple.q3 = r.metric_value;
  }
  return triple;
}

// ── Score computation ────────────────────────────────────────────────────────

function computeFinancialScore(
  rows: MetricBenchmarkRow[],
  ratios: CalculatedRatios,
): { score: number | null; drivers: string[] } {
  const components: { weight: number; score: number; label: string }[] = [];

  // Profitability — prefer the RMA SDE margin row (lender view)
  const sdeRma = rows.find(r => r.metric_key === "sde_margin_pct" && r.benchmark_source === "rma");
  if (sdeRma && sdeRma.display_percentile !== null) {
    components.push({ weight: 30, score: sdeRma.display_percentile, label: "Profitability" });
  }

  if (ratios.dscr.ok) {
    const v = ratios.dscr.value;
    let dscrScore: number;
    if (v < 1.0)        dscrScore = 10;
    else if (v < 1.30)  dscrScore = 30;
    else if (v < 1.50)  dscrScore = 60;
    else if (v < 2.00)  dscrScore = 85;
    else                 dscrScore = 95;
    components.push({ weight: 30, score: dscrScore, label: "DSCR coverage" });
  }

  const cr = rows.find(r => r.metric_key === "current_ratio");
  if (cr && cr.display_percentile !== null) {
    components.push({ weight: 20, score: cr.display_percentile, label: "Liquidity" });
  }

  const turn = rows.find(r => r.metric_key === "inventory_turnover");
  if (turn && turn.display_percentile !== null) {
    components.push({ weight: 20, score: turn.display_percentile, label: "Operational efficiency" });
  }

  if (components.length === 0) {
    return { score: null, drivers: [] };
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedSum = components.reduce((s, c) => s + c.weight * c.score, 0);
  const score = Math.round(weightedSum / totalWeight);

  const drivers = [...components]
    .sort((a, b) => (b.weight * b.score) - (a.weight * a.score))
    .slice(0, 3)
    .map(c => `${c.label} (${Math.round(c.score)})`);

  return { score, drivers };
}

// ── Implausible inventory detection ──────────────────────────────────────────

function isImplausibleInventoryComparison(
  metric_key: string,
  deal_value: number,
  median: number,
): boolean {
  if (metric_key !== "inventory_turnover" && metric_key !== "days_inventory_outstanding") return false;
  if (median <= 0 || deal_value <= 0) return false;
  const ratio = Math.max(deal_value / median, median / deal_value);
  return ratio > 10;
}

// ── Build a MetricBenchmarkRow ───────────────────────────────────────────────

interface BuildRowArgs {
  metric_key: string;
  metric_label_override?: string;     // e.g. "SDE Margin (vs Market)"
  ratio: RatioResult;
  benchmark_source: BenchmarkSource;
  triple: QuartileTriple | null;      // null if no benchmark for this row
}

function buildBenchmarkRow(args: BuildRowArgs): MetricBenchmarkRow {
  const { metric_key, metric_label_override, ratio, benchmark_source, triple } = args;
  const direction = METRIC_DIRECTIONS[metric_key] ?? "higher_is_better";
  const { value: dealValue, reason: ratioReason } = unwrap(ratio);
  const label = metric_label_override ?? METRIC_LABELS[metric_key] ?? metric_key;

  // Special handling for DIO: derive from inventory turnover quartiles
  let q1 = triple?.q1 ?? null;
  let median = triple?.median ?? null;
  let q3 = triple?.q3 ?? null;

  if (metric_key === "days_inventory_outstanding" && triple) {
    q1 = triple.q3 !== null && triple.q3 > 0 ? 365 / triple.q3 : null;
    median = triple.median !== null && triple.median > 0 ? 365 / triple.median : null;
    q3 = triple.q1 !== null && triple.q1 > 0 ? 365 / triple.q1 : null;
  }

  // No deal value → insufficient
  if (dealValue === null) {
    return {
      metric_key,
      metric_label: label,
      benchmark_source,
      deal_value: null,
      industry_q1: q1,
      industry_median: median,
      industry_q3: q3,
      raw_percentile: null,
      display_percentile: null,
      direction,
      status: null,
      status_color: null,
      outlier_kind: null,
      median_only: false,
      insufficient_data: true,
      reason: ratioReason ?? "deal value not provided",
    };
  }

  // Have a deal value but no benchmark at all
  if (median === null) {
    return {
      metric_key,
      metric_label: label,
      benchmark_source: null,
      deal_value: dealValue,
      industry_q1: null,
      industry_median: null,
      industry_q3: null,
      raw_percentile: null,
      display_percentile: null,
      direction,
      status: null,
      status_color: null,
      outlier_kind: null,
      median_only: false,
      insufficient_data: true,
      reason: metric_key === "gross_margin_pct"
        ? "Industry benchmark not available for this metric — gross margin not consistently tracked across data sources."
        : "Industry benchmark not available for this metric.",
    };
  }

  // Have median but no quartiles — directional comparison only
  if (q1 === null || q3 === null) {
    const dir = directionalCompare(dealValue, median, direction);
    return {
      metric_key,
      metric_label: label,
      benchmark_source,
      deal_value: dealValue,
      industry_q1: null,
      industry_median: median,
      industry_q3: null,
      raw_percentile: null,
      display_percentile: null,
      direction,
      status: dir?.status ?? null,
      status_color: dir?.color ?? null,
      outlier_kind: null,         // outlier kind only meaningful with full quartiles
      median_only: true,
      insufficient_data: false,
    };
  }

  // Sanity check for inventory metrics
  if (isImplausibleInventoryComparison(metric_key, dealValue, median)) {
    return {
      metric_key,
      metric_label: label,
      benchmark_source,
      deal_value: dealValue,
      industry_q1: q1,
      industry_median: median,
      industry_q3: q3,
      raw_percentile: null,
      display_percentile: null,
      direction,
      status: null,
      status_color: null,
      outlier_kind: null,
      median_only: false,
      insufficient_data: true,
      reason: "Industry sample too sparse for meaningful comparison (likely service business).",
    };
  }

  // Full quartile path
  const result = computePercentileWithStatus(
    dealValue,
    { q1, median, q3 },
    direction,
  );

  const outlier_kind = classifyOutlier(metric_key, dealValue, median, result.display_percentile);

  return {
    metric_key,
    metric_label: label,
    benchmark_source,
    deal_value: dealValue,
    industry_q1: q1,
    industry_median: median,
    industry_q3: q3,
    raw_percentile: result.raw_percentile,
    display_percentile: result.display_percentile,
    direction,
    status: result.status_label,
    status_color: result.status_color,
    outlier_kind,
    median_only: false,
    insufficient_data: false,
  };
}

// ── DealStats: compute quartiles on-the-fly ──────────────────────────────────

interface DealStatsBenchmarks {
  industry_key: string;
  sample_size: number;
  sde_margin: QuartileTriple;
  operating_margin: QuartileTriple;
}

async function fetchDealStatsBenchmarks(
  industry_key: string,
): Promise<DealStatsBenchmarks | null> {
  const supabase = getSupabase();

  // Two queries: one for SDE margin, one for operating margin. Compute on
  // server side using percentile_cont. Returns null if no rows or query fails.
  // We use rpc in case Supabase doesn't allow inline percentile_cont via REST;
  // simpler approach: pull the raw values and compute in JS (works with 8K rows).

  const { data, error } = await supabase
    .from("dealstats_transactions")
    .select("sde_margin_pct, operating_margin_pct")
    .eq("industry_key", industry_key);

  if (error || !data || data.length === 0) {
    if (error) console.error("[score-deal] dealstats fetch error:", error);
    return null;
  }

  // Filter & sort
  const sdeValues = data
    .map(r => r.sde_margin_pct)
    .filter((v: any) => typeof v === "number" && Number.isFinite(v))
    .sort((a: number, b: number) => a - b);

  const opValues = data
    .map(r => r.operating_margin_pct)
    .filter((v: any) => typeof v === "number" && Number.isFinite(v))
    .sort((a: number, b: number) => a - b);

  return {
    industry_key,
    sample_size: data.length,
    sde_margin:        quartilesFromSorted(sdeValues),
    operating_margin:  quartilesFromSorted(opValues),
  };
}

/** Compute Q1/median/Q3 from a pre-sorted array. Returns nulls if too few samples. */
function quartilesFromSorted(sorted: number[]): QuartileTriple {
  if (sorted.length < 30) {
    // Need at least 30 samples for meaningful quartiles. Below that, even
    // median is iffy. Return all-null and the row will fall through to
    // "insufficient benchmark data".
    return { q1: null, median: null, q3: null };
  }
  return {
    q1:     percentile(sorted, 0.25),
    median: percentile(sorted, 0.50),
    q3:     percentile(sorted, 0.75),
  };
}

/** Linear interpolation percentile (matches PostgreSQL's percentile_cont). */
function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── Input validation ─────────────────────────────────────────────────────────

function validateInputs(body: any): { ok: true; inputs: BenchmarkInputs; deal_structure?: DealStructureInputs; deal_id?: string; user_id?: string; client_run_id?: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "request body must be JSON object" };
  }
  if (!body.inputs || typeof body.inputs !== "object") {
    return { ok: false, error: "inputs object required" };
  }
  const i = body.inputs;
  if (!i.industry || typeof i.industry !== "string") {
    return { ok: false, error: "inputs.industry required (string)" };
  }
  if (typeof i.revenue !== "number" || !Number.isFinite(i.revenue)) {
    return { ok: false, error: "inputs.revenue required (number)" };
  }
  if (typeof i.sde !== "number" || !Number.isFinite(i.sde)) {
    return { ok: false, error: "inputs.sde required (number)" };
  }

  const inputs: BenchmarkInputs = {
    industry: i.industry,
    naics_code: typeof i.naics_code === "string" ? i.naics_code : undefined,
    revenue: i.revenue,
    cogs: typeof i.cogs === "number" ? i.cogs : null,
    operating_expenses: typeof i.operating_expenses === "number" ? i.operating_expenses : null,
    sde: i.sde,
    cash: typeof i.cash === "number" ? i.cash : null,
    accounts_receivable: typeof i.accounts_receivable === "number" ? i.accounts_receivable : null,
    inventory: typeof i.inventory === "number" ? i.inventory : null,
    accounts_payable: typeof i.accounts_payable === "number" ? i.accounts_payable : null,
    total_debt: typeof i.total_debt === "number" ? i.total_debt : null,
    interest_rate_pct: typeof i.interest_rate_pct === "number" ? i.interest_rate_pct : null,
    loan_term_years: typeof i.loan_term_years === "number" ? i.loan_term_years : null,
    capex: typeof i.capex === "number" ? i.capex : undefined,
    rent: typeof i.rent === "number" ? i.rent : undefined,
    owner_salary: typeof i.owner_salary === "number" ? i.owner_salary : undefined,
  };

  let deal_structure: DealStructureInputs | undefined;
  if (body.deal_structure && typeof body.deal_structure === "object") {
    const d = body.deal_structure;
    deal_structure = {
      purchase_price:         typeof d.purchase_price === "number" ? d.purchase_price : 0,
      buyer_equity:           typeof d.buyer_equity === "number" ? d.buyer_equity : 0,
      senior_debt:            typeof d.senior_debt === "number" ? d.senior_debt : 0,
      seller_note:            typeof d.seller_note === "number" ? d.seller_note : 0,
      working_capital_needed: typeof d.working_capital_needed === "number" ? d.working_capital_needed : 0,
      sde:                    typeof d.sde === "number" ? d.sde : inputs.sde,
      annual_debt_service:    typeof d.annual_debt_service === "number" ? d.annual_debt_service : 0,
    };
  }

  return {
    ok: true,
    inputs,
    deal_structure,
    deal_id: typeof body.deal_id === "string" ? body.deal_id : undefined,
    user_id: typeof body.user_id === "string" ? body.user_id : undefined,
    client_run_id: typeof body.client_run_id === "string" ? body.client_run_id : undefined,
  };
}

// ── Snapshot persistence (fire-and-forget) ───────────────────────────────────

/** Bucket revenue into a coarse band for analytics. Mirrors snapshots route. */
function revenueBand(revenue: number | null | undefined): string | null {
  if (typeof revenue !== "number" || !Number.isFinite(revenue) || revenue <= 0) return null;
  if (revenue < 500_000)    return "<500K";
  if (revenue < 1_000_000)  return "500K-1M";
  if (revenue < 2_500_000)  return "1M-2.5M";
  if (revenue < 5_000_000)  return "2.5M-5M";
  if (revenue < 10_000_000) return "5M-10M";
  return "10M+";
}

/**
 * Insert a snapshot row. Best-effort: errors are logged but never propagated
 * to the analysis response. Snapshot persistence is a moat-building side
 * effect, never a blocker.
 *
 * Returns the new snapshot_id on success, null on any failure.
 */
async function persistSnapshot(args: {
  deal_id: string;
  user_id: string;
  inputs: BenchmarkInputs;
  deal_structure_inputs?: DealStructureInputs;
  ratios: CalculatedRatios;
  analysis: BenchmarkAnalysis;
  client_run_id?: string;
}): Promise<string | null> {
  try {
    const supabase = getSupabase();

    // financial_inputs combines operating + structural inputs the user typed,
    // so a future reload can rehydrate the form completely.
    const financial_inputs = {
      ...args.inputs,
      // Embed the deal-structure inputs alongside so reload is one-shot
      _deal_structure_inputs: args.deal_structure_inputs ?? null,
    };

    // computed_ratios: flatten RatioResult shapes to value-or-null for easier
    // analytics queries later (no JSONB navigation needed for common cases).
    const flatRatios: Record<string, number | null> = {};
    for (const [key, r] of Object.entries(args.ratios)) {
      flatRatios[key] = r.ok ? r.value : null;
    }

    const { data, error } = await supabase
      .from("benchmark_snapshots")
      .insert({
        deal_id:        args.deal_id,
        user_id:        args.user_id,
        industry:       args.inputs.industry ?? null,
        naics_code:     args.analysis.naics_code ?? args.inputs.naics_code ?? null,
        revenue_band:   revenueBand(args.inputs.revenue),
        view_type:      "buyer_adjusted",
        is_saved:       false,
        financial_inputs,
        computed_ratios: flatRatios,
        benchmark_results: args.analysis.financial_position,
        analysis_outputs: {
          tension_indicator:        args.analysis.tension_indicator,
          financial_score:          args.analysis.financial_score,
          score_drivers:            args.analysis.score_drivers,
          score_risk_dependencies:  args.analysis.score_risk_dependencies,
          risk_flags:               args.analysis.risk_flags,
          strengths:                args.analysis.strengths,
          interaction_insights:     args.analysis.interaction_insights,
          sensitivity:              args.analysis.sensitivity ?? null,
          unsupported_metrics:      args.analysis.unsupported_metrics,
          generated_at:             args.analysis.generated_at,
        },
        deal_structure: args.analysis.deal_structure ?? null,
        client_run_id:  args.client_run_id ?? null,
        generated_at:   args.analysis.generated_at,
      })
      .select("snapshot_id")
      .single();

    if (error) {
      console.error("[score-deal] snapshot insert failed:", error);
      return null;
    }
    return data?.snapshot_id ?? null;
  } catch (err: any) {
    console.error("[score-deal] snapshot uncaught:", err);
    return null;
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const v = validateInputs(body);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }
    const { inputs, deal_structure, deal_id, user_id, client_run_id } = v;

    // Step 1: Resolve NAICS
    const naics_code = inputs.naics_code ?? getNaicsFromIndustry(inputs.industry) ?? null;

    // Step 2: Fetch RMA quartile rows + DealStats benchmarks in parallel
    const benchmark_year = DEFAULT_BENCHMARK_YEAR;
    const rmaByMetric = new Map<string, QuartileTriple>();
    let industry_name: string | null = null;

    const [rmaResult, dealStatsResult] = await Promise.all([
      // RMA fetch
      naics_code
        ? (async () => {
            const supabase = getSupabase();
            return supabase
              .from("rma_benchmarks")
              .select("metric_name, metric_quartile, metric_value, industry_name")
              .eq("naics_code", naics_code)
              .eq("year", benchmark_year)
              .in("metric_quartile", ["q1", "median", "q3"]);
          })()
        : Promise.resolve({ data: null, error: null }),
      // DealStats fetch
      fetchDealStatsBenchmarks(inputs.industry),
    ]);

    if (rmaResult.error) {
      console.error("[score-deal] RMA fetch error:", rmaResult.error);
    } else if (rmaResult.data && rmaResult.data.length > 0) {
      industry_name = rmaResult.data[0].industry_name ?? null;
      const byMetric = new Map<string, { metric_quartile: Quartile; metric_value: number }[]>();
      for (const row of rmaResult.data) {
        if (!["q1", "median", "q3"].includes(row.metric_quartile)) continue;
        if (typeof row.metric_value !== "number") continue;
        const arr = byMetric.get(row.metric_name) ?? [];
        arr.push({ metric_quartile: row.metric_quartile as Quartile, metric_value: row.metric_value });
        byMetric.set(row.metric_name, arr);
      }
      for (const [name, rows] of byMetric.entries()) {
        rmaByMetric.set(name, buildQuartileTriple(rows));
      }
    }

    // Step 3: Calculate ratios
    const ratios = calculateAllRatios(inputs);

    // Step 4: Build benchmark rows — order matches the spec (UI displays in this order)
    const financial_position: MetricBenchmarkRow[] = [];

    // Gross Margin — no benchmark in V1
    financial_position.push(buildBenchmarkRow({
      metric_key: "gross_margin_pct",
      ratio: ratios.gross_margin_pct,
      benchmark_source: null,
      triple: null,
    }));

    // SDE Margin — TWO rows (RMA + DealStats)
    const sdeRmaTriple = rmaByMetric.get("EBITDA/Sales") ?? null;
    financial_position.push(buildBenchmarkRow({
      metric_key: "sde_margin_pct",
      metric_label_override: "SDE Margin (vs Industry)",
      ratio: ratios.sde_margin_pct,
      benchmark_source: "rma",
      triple: sdeRmaTriple,
    }));

    if (dealStatsResult && dealStatsResult.sde_margin.median !== null) {
      financial_position.push(buildBenchmarkRow({
        metric_key: "sde_margin_pct",
        metric_label_override: "SDE Margin (vs Market)",
        ratio: ratios.sde_margin_pct,
        benchmark_source: "dealstats",
        triple: dealStatsResult.sde_margin,
      }));
    }

    // Operating Margin — DealStats only
    if (dealStatsResult && dealStatsResult.operating_margin.median !== null) {
      financial_position.push(buildBenchmarkRow({
        metric_key: "operating_margin_pct",
        ratio: ratios.operating_margin_pct,
        benchmark_source: "dealstats",
        triple: dealStatsResult.operating_margin,
      }));
    } else {
      // Still show the row with the deal value but no benchmark
      financial_position.push(buildBenchmarkRow({
        metric_key: "operating_margin_pct",
        ratio: ratios.operating_margin_pct,
        benchmark_source: null,
        triple: null,
      }));
    }

    // Current Ratio — RMA only
    financial_position.push(buildBenchmarkRow({
      metric_key: "current_ratio",
      ratio: ratios.current_ratio,
      benchmark_source: "rma",
      triple: rmaByMetric.get("Current") ?? null,
    }));

    // DSCR — no industry benchmark (lender threshold based)
    financial_position.push(buildBenchmarkRow({
      metric_key: "dscr",
      ratio: ratios.dscr,
      benchmark_source: null,
      triple: null,
    }));

    // Inventory Turnover & DIO — RMA only
    const turnoverTriple = rmaByMetric.get("Cost of Sales / Inventory") ?? null;
    financial_position.push(buildBenchmarkRow({
      metric_key: "inventory_turnover",
      ratio: ratios.inventory_turnover,
      benchmark_source: "rma",
      triple: turnoverTriple,
    }));
    financial_position.push(buildBenchmarkRow({
      metric_key: "days_inventory_outstanding",
      ratio: ratios.days_inventory_outstanding,
      benchmark_source: "rma",
      triple: turnoverTriple,
    }));

    // Step 5: Risk flags + strengths (operating side)
    // Important: pass only the RMA SDE row to the flag generator, not the
    // DealStats row. Risk flags should reflect the lender perspective.
    const flagInputRows = financial_position.filter(r =>
      !(r.metric_key === "sde_margin_pct" && r.benchmark_source === "dealstats")
    );
    const { flags: risk_flags, strengths } = generateOperatingFlags(ratios, flagInputRows);

    // Step 6: Deal Structure & Leverage
    let deal_structure_analysis;
    if (deal_structure) {
      if ((!deal_structure.annual_debt_service || deal_structure.annual_debt_service === 0)
          && ratios.annual_debt_service.ok) {
        deal_structure.annual_debt_service = ratios.annual_debt_service.value;
      }
      deal_structure_analysis = analyzeDealStructure(deal_structure);
    }

    // Step 7: Composite score
    const { score: financial_score, drivers: score_drivers } = computeFinancialScore(financial_position, ratios);

    // Step 8: Interaction layer (uses RMA-based rows for cross-domain inferences)
    const interactionOutput = runInteractionLayer({
      inputs,
      ratios,
      rows: flagInputRows,        // same filter — RMA perspective
      ds: deal_structure_analysis,
      financial_score,
    });

    // Step 9: Identify metrics with no useful benchmark
    const unsupported_metrics = financial_position
      .filter(r => r.insufficient_data)
      .map(r => r.metric_key);

    const analysis: BenchmarkAnalysis = {
      industry: inputs.industry,
      naics_code,
      industry_name,
      benchmark_year,
      generated_at: new Date().toISOString(),
      tension_indicator: interactionOutput.tension_indicator,
      financial_position,
      risk_flags,
      strengths,
      interaction_insights: interactionOutput.interaction_insights,
      sensitivity: interactionOutput.sensitivity ?? undefined,
      deal_structure: deal_structure_analysis,
      financial_score,
      score_drivers,
      score_risk_dependencies: interactionOutput.score_risk_dependencies,
      unsupported_metrics,
    };

    // Step 10: Persist snapshot (best-effort; doesn't affect analysis response).
    // Only attempts persistence when both deal_id and user_id were provided —
    // anonymous test calls (e.g. DevTools fetches without auth) skip the
    // database write but still get the full analysis back.
    let snapshot_id: string | null = null;
    if (deal_id && user_id) {
      snapshot_id = await persistSnapshot({
        deal_id,
        user_id,
        inputs,
        deal_structure_inputs: deal_structure,
        ratios,
        analysis,
        client_run_id,
      });
    }

    return NextResponse.json({ ok: true, analysis, snapshot_id });
  } catch (err: any) {
    console.error("[score-deal] uncaught error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
