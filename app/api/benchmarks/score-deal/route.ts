// app/api/benchmarks/score-deal/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Financial Benchmarking endpoint.
//
// POST /api/benchmarks/score-deal
//   body: { inputs: BenchmarkInputs, deal_structure?: DealStructureInputs }
//   returns: BenchmarkAnalysis (no AI interpretation)
//
// Pipeline order (per spec — DO NOT REORDER):
//   1. Validate inputs
//   2. Resolve NAICS from industry key
//   3. Fetch RMA quartile rows for that NAICS
//   4. Calculate all financial ratios
//   5. Map ratios → benchmark rows (with quartiles, percentiles, status)
//   6. Generate deterministic risk flags + strengths
//   7. Run Deal Structure & Leverage analysis (separate domain)
//   8. Compute financial_score from the above
//   9. Return structured JSON
//
// AI interpretation is a SEPARATE endpoint (/api/benchmarks/interpret) that
// runs only when the user clicks "Generate Interpretation". This endpoint
// is fast, cacheable, and credit-free.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNaicsFromIndustry } from "@/lib/industryMappings";
import { calculateAllRatios } from "@/lib/benchmarks/calculations";
import {
  computePercentileWithStatus,
  classifyOutlier,
  METRIC_DIRECTIONS,
  METRIC_TO_RMA_NAME,
} from "@/lib/benchmarks/percentile-engine";
import {
  generateOperatingFlags,
  analyzeDealStructure,
} from "@/lib/benchmarks/risk-flags";
import type {
  BenchmarkInputs,
  DealStructureInputs,
  BenchmarkAnalysis,
  MetricBenchmarkRow,
  CalculatedRatios,
  RatioResult,
  Quartile,
  QuartileTriple,
} from "@/lib/benchmarks/types";

const DEFAULT_BENCHMARK_YEAR = "2025-26";

// Lazy-initialize the Supabase client so this module remains importable in
// environments where the env vars aren't yet loaded (e.g. test runners).
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── Metric label registry ────────────────────────────────────────────────────
// Display labels for the UI. Kept in the route so we don't duplicate them
// across modules; the engine only knows internal keys.

const METRIC_LABELS: Record<string, string> = {
  gross_margin_pct:           "Gross Margin",
  sde_margin_pct:             "SDE Margin",
  current_ratio:              "Current Ratio",
  dscr:                       "DSCR",
  inventory_turnover:         "Inventory Turnover",
  days_inventory_outstanding: "Days Inventory Outstanding",
  solvency_ratio:             "Solvency Ratio",
  debt_to_equity:             "Debt-to-Equity",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a RatioResult to (value, reason). */
function unwrap(r: RatioResult): { value: number | null; reason: string | null } {
  return r.ok ? { value: r.value, reason: null } : { value: null, reason: r.reason };
}

/** Build a QuartileTriple from raw RMA rows for a single metric. */
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

/**
 * Composite financial score (0-100). Weighted average of:
 *   - Profitability (SDE margin percentile) — 30%
 *   - DSCR strength — 30%
 *   - Liquidity (current ratio percentile) — 20%
 *   - Operational efficiency (inventory turnover percentile) — 20%
 *
 * Each component contributes its display percentile if available; missing
 * components are dropped and weights renormalize. If no components are
 * computable, returns null.
 *
 * DSCR scoring: not a percentile (RMA doesn't carry DSCR). We map the
 * absolute value to a 0-100 scale based on lender thresholds.
 */
function computeFinancialScore(
  rows: MetricBenchmarkRow[],
  ratios: CalculatedRatios,
): { score: number | null; drivers: string[] } {
  const components: { weight: number; score: number; label: string }[] = [];

  const sde = rows.find(r => r.metric_key === "sde_margin_pct");
  if (sde && sde.display_percentile !== null) {
    components.push({ weight: 30, score: sde.display_percentile, label: "Profitability" });
  }

  // DSCR: scoring on absolute thresholds, not percentile
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

  // Top 3 contributing factors by weighted contribution
  const drivers = [...components]
    .sort((a, b) => (b.weight * b.score) - (a.weight * a.score))
    .slice(0, 3)
    .map(c => `${c.label} (${Math.round(c.score)})`);

  return { score, drivers };
}

// ── Build a MetricBenchmarkRow for one metric ────────────────────────────────

/**
 * Sanity check: if the RMA median for an inventory metric is wildly out of
 * line with the deal's value (>10x apart), the industry sample is too small
 * to be meaningful (typical for service businesses where most firms report
 * UND). Suppress the comparison rather than emit a misleading outlier flag.
 */
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

function buildBenchmarkRow(
  metric_key: string,
  ratio: RatioResult,
  benchmarksByMetric: Map<string, QuartileTriple>,
): MetricBenchmarkRow {
  const direction = METRIC_DIRECTIONS[metric_key] ?? "higher_is_better";
  const rmaName = METRIC_TO_RMA_NAME[metric_key];
  const triple = rmaName ? benchmarksByMetric.get(rmaName) : undefined;

  const { value: dealValue, reason: ratioReason } = unwrap(ratio);

  // Special handling for DIO: derive from inventory turnover quartiles by transform
  let q1 = triple?.q1 ?? null;
  let median = triple?.median ?? null;
  let q3 = triple?.q3 ?? null;

  if (metric_key === "days_inventory_outstanding" && triple) {
    // RMA gives us COGS/Inventory (turnover). DIO = 365 / turnover. Flip
    // because the relationship is inverted: high turnover → low DIO.
    q1 = triple.q3 !== null && triple.q3 > 0 ? 365 / triple.q3 : null;       // best DIO (low days)
    median = triple.median !== null && triple.median > 0 ? 365 / triple.median : null;
    q3 = triple.q1 !== null && triple.q1 > 0 ? 365 / triple.q1 : null;       // worst DIO (high days)
  }

  // If we have a deal value but no benchmark, return data-but-no-comparison
  if (dealValue !== null && (q1 === null || median === null || q3 === null)) {
    return {
      metric_key,
      metric_label: METRIC_LABELS[metric_key] ?? metric_key,
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
      insufficient_data: true,
      reason: rmaName ? "insufficient benchmark data for this industry" : "no industry benchmark for this metric",
    };
  }

  // No deal value at all
  if (dealValue === null) {
    return {
      metric_key,
      metric_label: METRIC_LABELS[metric_key] ?? metric_key,
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
      insufficient_data: true,
      reason: ratioReason ?? "deal value not provided",
    };
  }

  // Full path: deal value + benchmark triple → percentile + status
  // BUT: bail out for inventory metrics if the industry sample is implausibly
  // sparse (typical for service businesses where most firms report UND).
  if (isImplausibleInventoryComparison(metric_key, dealValue, median!)) {
    return {
      metric_key,
      metric_label: METRIC_LABELS[metric_key] ?? metric_key,
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
      insufficient_data: true,
      reason: "industry sample too sparse for meaningful comparison (likely service business)",
    };
  }

  const result = computePercentileWithStatus(
    dealValue,
    { q1, median, q3 },
    direction,
  );

  const outlier_kind = classifyOutlier(metric_key, dealValue, median, result.display_percentile);

  return {
    metric_key,
    metric_label: METRIC_LABELS[metric_key] ?? metric_key,
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
    insufficient_data: false,
  };
}

// ── Input validation ─────────────────────────────────────────────────────────

function validateInputs(body: any): { ok: true; inputs: BenchmarkInputs; deal_structure?: DealStructureInputs } | { ok: false; error: string } {
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

  // Coerce nullable numerics to null if absent
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

  return { ok: true, inputs, deal_structure };
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const v = validateInputs(body);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }
    const { inputs, deal_structure } = v;

    // Step 1: Resolve NAICS
    const naics_code = inputs.naics_code ?? getNaicsFromIndustry(inputs.industry) ?? null;

    // Step 2: Fetch RMA quartile rows
    const benchmark_year = DEFAULT_BENCHMARK_YEAR;
    const benchmarksByMetric = new Map<string, QuartileTriple>();
    let industry_name: string | null = null;

    if (naics_code) {
      const supabase = getSupabase();
      const { data: rmaRows, error } = await supabase
        .from("rma_benchmarks")
        .select("metric_name, metric_quartile, metric_value, industry_name")
        .eq("naics_code", naics_code)
        .eq("year", benchmark_year)
        .in("metric_quartile", ["q1", "median", "q3"]);

      if (error) {
        console.error("[score-deal] RMA fetch error:", error);
        // Don't fail — proceed without benchmarks. Each row will report
        // "insufficient benchmark data" individually.
      } else if (rmaRows && rmaRows.length > 0) {
        industry_name = rmaRows[0].industry_name ?? null;

        // Group by metric_name
        const byMetric = new Map<string, { metric_quartile: Quartile; metric_value: number }[]>();
        for (const row of rmaRows) {
          if (!["q1", "median", "q3"].includes(row.metric_quartile)) continue;
          if (typeof row.metric_value !== "number") continue;
          const arr = byMetric.get(row.metric_name) ?? [];
          arr.push({ metric_quartile: row.metric_quartile as Quartile, metric_value: row.metric_value });
          byMetric.set(row.metric_name, arr);
        }
        for (const [name, rows] of byMetric.entries()) {
          benchmarksByMetric.set(name, buildQuartileTriple(rows));
        }
      }
    }

    // Step 3: Calculate ratios
    const ratios = calculateAllRatios(inputs);

    // Step 4: Build benchmark rows
    const metricsToReport = [
      "gross_margin_pct",
      "sde_margin_pct",
      "current_ratio",
      "dscr",
      "inventory_turnover",
      "days_inventory_outstanding",
    ];

    const financial_position: MetricBenchmarkRow[] = metricsToReport.map(key => {
      const ratio = ratios[key as keyof CalculatedRatios];
      return buildBenchmarkRow(key, ratio, benchmarksByMetric);
    });

    // Step 5: Risk flags + strengths (operating side)
    const { flags: risk_flags, strengths } = generateOperatingFlags(ratios, financial_position);

    // Step 6: Deal Structure & Leverage (separate domain)
    let deal_structure_analysis;
    if (deal_structure) {
      // If user didn't supply annual_debt_service but we computed one from
      // operating debt terms, use that as fallback.
      if ((!deal_structure.annual_debt_service || deal_structure.annual_debt_service === 0)
          && ratios.annual_debt_service.ok) {
        deal_structure.annual_debt_service = ratios.annual_debt_service.value;
      }
      deal_structure_analysis = analyzeDealStructure(deal_structure);
    }

    // Step 7: Composite score
    const { score: financial_score, drivers: score_drivers } = computeFinancialScore(financial_position, ratios);

    // Step 8: Identify metrics where we couldn't compute anything useful
    const unsupported_metrics = financial_position
      .filter(r => r.insufficient_data)
      .map(r => r.metric_key);

    const analysis: BenchmarkAnalysis = {
      industry: inputs.industry,
      naics_code,
      industry_name,
      benchmark_year,
      generated_at: new Date().toISOString(),
      financial_position,
      risk_flags,
      strengths,
      deal_structure: deal_structure_analysis,
      financial_score,
      score_drivers,
      unsupported_metrics,
    };

    return NextResponse.json({ ok: true, analysis });
  } catch (err: any) {
    console.error("[score-deal] uncaught error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
