// lib/normalizationIntegration.ts
// Wiring layer between normalizationEngine → scoringEngine → UI
//
// This file does NOT modify scoringEngine.ts or normalizationEngine.ts directly.
// It provides helpers that the routes and dashboard use to:
//   1. Run normalization before scoring
//   2. Pass usableSDE (not raw SDE) into scoreDeal()
//   3. Build the DB payload with persisted normalization fields
//   4. Supply UI helpers for rendering trust/basis/conviction state

import {
  normalizeDealFinancials,
  getConvictionCap,
  type RawDealFinancials,
  type NormalizedDealFinancials,
  type DataSourceType,
} from "@/lib/normalizationEngine";

import { scoreDeal, type ScoreInputs, type ScoreOutputs } from "@/lib/scoringEngine";
import type { IndustryBenchmarks } from "@/lib/types/benchmarks";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NormalizedScoreInputs {
  // Core deal fields
  industry:   string;
  revenue:    number;
  sde:        number;         // stated SDE — used as fallback if normalization unavailable
  ebitda:     number;
  price:      number;
  inventory?: number | null;

  // Classification
  benchmarkFamily?:          string | null;
  classificationConfidence?: number | null;
  benchmarkIsProxy?:         boolean;

  // Debt terms
  debtPercent?:  number;
  interestRate?: number;
  termYears?:    number;

  // Benchmark and source
  benchmarks?:   IndustryBenchmarks | null;
  dataSource?:   DataSourceType;
}

export interface NormalizedScoreResult {
  // The final score outputs (computed using usableSDE)
  scores:      ScoreOutputs;

  // Normalization detail
  normalized:  NormalizedDealFinancials;

  // Which SDE was actually used
  usableSDE:   number;
  reportedSDE: number;

  // UI helpers
  basis:       ScoreBasisForUI;
  convictionCap: ReturnType<typeof getConvictionCap>;
}

export interface ScoreBasisForUI {
  earningsBasisUsed:    "reported" | "blended" | "benchmark_implied";
  benchmarkBasis:       "direct" | "proxy" | "none";
  convictionBlocked:    boolean;
  manualReviewRequired: boolean;
  trustScore:           number;
  confidenceLevel:      "high" | "medium" | "low";
  // Explanation bullets for scoreExplanation integration
  normalizationBullets: string[];
}

// ── Main integration function ─────────────────────────────────────────────────

/**
 * Full pipeline: normalize → score using usableSDE → return everything downstream needs.
 *
 * Backward-compatible: if normalization produces errors or is skipped,
 * falls back to raw SDE for all calculations.
 *
 * @example
 * const result = await runNormalizedScoring({
 *   industry: "landscaping", revenue: 650_000, sde: 117_000,
 *   ebitda: 105_000, price: 320_000,
 *   benchmarkFamily: "field_services", classificationConfidence: 92,
 *   benchmarks: rmaBenchmarks,
 * });
 * // result.usableSDE = 117_000 (trust=100, reported used)
 * // result.scores.fairValue based on usableSDE
 */
export function runNormalizedScoring(
  inputs: NormalizedScoreInputs,
): NormalizedScoreResult {
  const {
    industry, revenue, sde, ebitda, price, inventory,
    benchmarkFamily = null,
    classificationConfidence = null,
    benchmarkIsProxy = false,
    benchmarks = null,
    dataSource = "manual_entry",
  } = inputs;

  // ── Step 1: Normalize financials ────────────────────────────────────────────
  let normalized: NormalizedDealFinancials;
  try {
    const rawBenchmarks = benchmarks
      ? { ebitdaMarginPct: benchmarks.ebitda_margin_pct }
      : null;

    const rawInput: RawDealFinancials = {
      revenue, sde, ebitda, price, inventory,
      benchmarkFamily,
      classificationConfidence,
      benchmarkIsProxy,
      dataSource,
      rmaBenchmarks: rawBenchmarks,
    };
    normalized = normalizeDealFinancials(rawInput);
  } catch {
    // Fallback: if normalization fails for any reason, synthesize a neutral result
    normalized = _fallbackNormalized(sde, revenue, ebitda, price);
  }

  // ── Step 2: Extract usable SDE ──────────────────────────────────────────────
  const usableSDE   = normalized.earnings.usableSDE;
  const reportedSDE = normalized.earnings.reportedSDE;

  // ── Step 3: Score using usableSDE ───────────────────────────────────────────
  const scoreInput: ScoreInputs = {
    industry,
    revenue,
    sde:        usableSDE,   // ← KEY: usable earnings, not raw stated
    price,
    benchmarks,
  };
  const scores = scoreDeal(scoreInput);

  // ── Step 4: Build conviction cap ────────────────────────────────────────────
  const convictionCap = getConvictionCap(normalized);

  // ── Step 5: Build UI basis descriptor ──────────────────────────────────────
  const basis = buildScoreBasis(normalized, convictionCap);

  return { scores, normalized, usableSDE, reportedSDE, basis, convictionCap };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the basis descriptor for rendering in ScoreInsightsPanel,
 * UnderwritingPanel, and the Benchmark tab.
 */
export function getScoreBasisForUI(
  normalized: NormalizedDealFinancials,
): ScoreBasisForUI {
  const cap = getConvictionCap(normalized);
  return buildScoreBasis(normalized, cap);
}

function buildScoreBasis(
  n: NormalizedDealFinancials,
  cap: ReturnType<typeof getConvictionCap>,
): ScoreBasisForUI {
  const { earnings, trustScore, confidenceLevel } = n;

  const earningsBasisUsed = earnings.earningsSource;

  const hasBenchmark = earnings.benchmarkSDE !== null;
  const isProxy = n.raw.benchmarkIsProxy ||
    ["med_spa","behavioral_health","manufacturing","retail","wholesale"]
      .includes(n.raw.benchmarkFamily ?? "");

  const benchmarkBasis: ScoreBasisForUI["benchmarkBasis"] =
    !hasBenchmark ? "none" :
    isProxy       ? "proxy" : "direct";

  const manualReviewRequired = trustScore < 60 ||
    n.flags.some(f => f.severity === "critical");

  // ── Normalization bullets for score explanation ─────────────────────────────
  const bullets: string[] = [];

  if (earningsBasisUsed === "benchmark_implied") {
    bullets.push(
      `Trust-adjusted earnings used for valuation and debt service — ` +
      `reported SDE ($${n.earnings.reportedSDE.toLocaleString()}) set aside pending review`
    );
    bullets.push("Reported earnings exceeded the benchmark-supported range");
  } else if (earningsBasisUsed === "blended") {
    bullets.push(
      `Conservative earnings basis applied — usable SDE ($${n.earnings.usableSDE.toLocaleString()}) ` +
      `reflects the lower of reported and benchmark-implied earnings`
    );
  }

  if (benchmarkBasis === "proxy") {
    bullets.push("Closest available proxy benchmark applied — interpret margin comparisons with appropriate context");
  }

  if (cap.capped) {
    bullets.push(
      cap.maxVerdict === "Pass / Needs Manual Review"
        ? "Manual review required before a strong recommendation can be issued"
        : "Investigate financials before advancing — trust score below conviction threshold"
    );
  }

  const criticalFlag = n.flags.find(f => f.severity === "critical");
  if (criticalFlag) {
    bullets.push(`Input anomaly detected: ${criticalFlag.title}`);
  }

  return {
    earningsBasisUsed,
    benchmarkBasis,
    convictionBlocked:    cap.capped,
    manualReviewRequired,
    trustScore,
    confidenceLevel,
    normalizationBullets: bullets,
  };
}

// ── Supabase persistence payload ──────────────────────────────────────────────

/**
 * Returns the normalization fields to merge into a deal_runs INSERT or UPDATE.
 * Pass the spread into your Supabase insert alongside the existing score fields.
 *
 * @example
 * const normPayload = buildNormalizationPayload(result.normalized);
 * await supabase.from("deal_runs").insert({
 *   ...existingScoreFields,
 *   sde:       result.usableSDE,       // ← scoring used this
 *   ...normPayload,
 * });
 */
export function buildNormalizationPayload(
  normalized: NormalizedDealFinancials,
) {
  const { earnings, trustScore, confidenceLevel, flags, adjustments } = normalized;

  return {
    // Earnings audit trail
    reported_sde:              earnings.reportedSDE,
    reported_ebitda:           normalized.raw.ebitda,
    benchmark_implied_sde:     earnings.benchmarkSDE ?? null,
    usable_sde:                earnings.usableSDE,
    earnings_source:           earnings.earningsSource,

    // Trust
    normalization_trust_score:      trustScore,
    normalization_confidence_level: confidenceLevel,
    manual_review_required:         trustScore < 60 || flags.some(f => f.severity === "critical"),

    // Structured output for Underwriting Panel
    normalization_flags_json:       flags,
    normalization_adjustments_json: adjustments,

    // Benchmark context
    benchmark_is_proxy:    normalized.raw.benchmarkIsProxy ?? false,
    data_source_quality:   normalized.raw.dataSource ?? "manual_entry",
  };
}

// ── Verdict application with conviction cap ───────────────────────────────────

export type DealVerdict = "high_conviction" | "pursue" | "investigate" | "pass";

/**
 * Applies the conviction cap to a computed verdict.
 * Use AFTER dealVerdict() to enforce trust-based ceiling.
 *
 * @example
 * const raw     = dealVerdict(deal);         // existing function
 * const capped  = applyConvictionCap(raw, result.convictionCap);
 * // if trust < 60 → capped to "investigate" or "pass"
 */
export function applyConvictionCap(
  rawVerdict:    DealVerdict,
  convictionCap: ReturnType<typeof getConvictionCap>,
): DealVerdict {
  if (!convictionCap.capped) return rawVerdict;

  if (convictionCap.maxVerdict === "Pass / Needs Manual Review") {
    // Allow pass through but block high_conviction and pursue
    if (rawVerdict === "high_conviction" || rawVerdict === "pursue") return "investigate";
    return rawVerdict;
  }

  // maxVerdict = "Investigate"
  if (rawVerdict === "high_conviction" || rawVerdict === "pursue") return "investigate";
  return rawVerdict;
}

// ── Backward-compatible fallback ──────────────────────────────────────────────

function _fallbackNormalized(
  sde: number, revenue: number, ebitda: number, price: number,
): NormalizedDealFinancials {
  return {
    raw:                  { revenue, sde, ebitda, price },
    statedSdeMargin:      revenue > 0 ? sde / revenue : null,
    statedEbitdaMargin:   revenue > 0 ? ebitda / revenue : null,
    impliedMultiple:      sde > 0 ? price / sde : null,
    benchmarkEbitdaMargin: null,
    earnings: {
      reportedSDE:    sde,
      benchmarkSDE:   null,
      usableSDE:      sde,
      valuationSDE:   sde,
      debtServiceSDE: sde,
      earningsSource: "reported",
    },
    trustScore:      100,
    confidenceLevel: "high",
    flags:           [],
    adjustments:     [],
    notes:           ["Normalization unavailable — using stated SDE."],
  };
}
