// lib/normalizationEngine.ts
// NexTax Normalization Layer — V1
//
// Sits between raw broker/listing financials and the scoring engine.
// Does NOT mutate scoringEngine.ts, dealClassifier.ts, or benchmarks API.
//
// Pipeline position:
//   Raw listing data
//     → normalizeDealFinancials()   ← this file
//       → scoreDeal()               (scoringEngine.ts)
//         → generateScoreExplanation() (scoreExplanation.ts)
//
// Unit contract (inherited from benchmark system):
//   ebitda_margin_pct / ebitdaMarginPct → decimal (0.121 = 12.1%)
//   All dollar inputs → raw numbers (no formatting)

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw financial inputs as received from a broker listing or user entry. */
export interface RawDealFinancials {
  revenue:                 number;
  sde:                     number;
  ebitda:                  number;
  price:                   number;
  inventory?:              number | null;

  // Classification context (from dealClassifier.ts output)
  benchmarkFamily?:        string | null;
  classificationConfidence?: number | null;  // 0–100
  benchmarkIsProxy?:       boolean;

  // RMA benchmark data — accepts both camelCase (ScoreOutputs) and
  // snake_case (IndustryBenchmarks) shapes for maximum compatibility
  rmaBenchmarks?: {
    ebitdaMarginPct?:    number | null;  // camelCase (ScoreOutputs)
    ebitda_margin_pct?:  number | null;  // snake_case (IndustryBenchmarks)
    operatingMarginPct?: number | null;
    operating_margin_pct?: number | null;
    currentRatio?:       number | null;
    current_ratio?:      number | null;
    leverageFlag?:       string | null;
    leverage_flag?:      string | null;
    coverageFlag?:       string | null;
    coverage_flag?:      string | null;
  } | null;
}

/** Normalized output — preserves raw values, adds derived metrics. */
export interface NormalizedDealFinancials {
  // ── Raw inputs (preserved verbatim) ────────────────────────────────────────
  raw: RawDealFinancials;

  // ── Normalized / derived values ────────────────────────────────────────────
  statedSdeMargin:    number | null;  // sde / revenue (decimal)
  statedEbitdaMargin: number | null;  // ebitda / revenue (decimal)
  impliedMultiple:    number | null;  // price / sde
  benchmarkEbitdaMargin: number | null;  // from RMA (decimal), null if unavailable

  // ── Trust & confidence ─────────────────────────────────────────────────────
  trustScore:         number;   // 0–100, clamped to 5–100
  confidenceLevel:    "high" | "medium" | "low";

  // ── Structured output ──────────────────────────────────────────────────────
  flags:              NormalizationFlag[];
  adjustments:        NormalizationAdjustment[];
  notes:              string[];
}

/** A detected anomaly in the input data. */
export interface NormalizationFlag {
  code:     string;           // machine-readable key e.g. "DUPLICATE_VALUES"
  label:    string;           // short display label
  detail:   string;           // full professional explanation
  severity: "info" | "caution" | "warning" | "critical";
}

/** A trust score deduction with its reason. */
export interface NormalizationAdjustment {
  reason:    string;   // professional explanation
  deduction: number;   // positive number = points removed from trustScore
  source:    "input_anomaly" | "margin_plausibility" | "benchmark" | "classification";
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Resolve ebitdaMarginPct from either camelCase or snake_case shape. */
function resolveEbitdaMargin(
  rma: RawDealFinancials["rmaBenchmarks"],
): number | null {
  if (!rma) return null;
  const v = rma.ebitdaMarginPct ?? rma.ebitda_margin_pct ?? null;
  return typeof v === "number" && v > 0 ? v : null;
}

function safe(n: number | undefined | null): number {
  return typeof n === "number" && isFinite(n) ? n : 0;
}

function pct(decimal: number): string {
  return `${Math.round(decimal * 100)}%`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Proxy-aware benchmark label ───────────────────────────────────────────────

const PROXY_FAMILIES = new Set([
  "med_spa", "behavioral_health", "manufacturing", "retail", "wholesale",
]);

function benchmarkLabel(isProxy: boolean): string {
  return isProxy
    ? "closest available proxy benchmark"
    : "industry benchmark";
}

// ── Main normalization function ───────────────────────────────────────────────

/**
 * Normalizes raw deal financials, scores data trust, and surfaces flags.
 *
 * @example
 * const normalized = normalizeDealFinancials({
 *   revenue: 800_000, sde: 180_000, ebitda: 160_000, price: 650_000,
 *   benchmarkFamily: "field_services", classificationConfidence: 92,
 *   benchmarkIsProxy: false, rmaBenchmarks: { ebitdaMarginPct: 0.121 },
 * });
 */
export function normalizeDealFinancials(
  input: RawDealFinancials,
): NormalizedDealFinancials {
  const {
    revenue, sde, ebitda, price,
    inventory       = null,
    benchmarkFamily = null,
    classificationConfidence = null,
    benchmarkIsProxy = false,
    rmaBenchmarks    = null,
  } = input;

  const rev   = safe(revenue);
  const sdeV  = safe(sde);
  const ebitV = safe(ebitda);
  const priceV = safe(price);

  // ── Derived ratios ─────────────────────────────────────────────────────────
  const statedSdeMargin    = rev > 0 ? sdeV / rev   : null;
  const statedEbitdaMargin = rev > 0 ? ebitV / rev  : null;
  const impliedMultiple    = sdeV > 0 ? priceV / sdeV : null;
  const benchmarkEbitdaMargin = resolveEbitdaMargin(rmaBenchmarks);
  const hasBenchmark = benchmarkEbitdaMargin !== null;
  const isProxy = benchmarkIsProxy || PROXY_FAMILIES.has(benchmarkFamily ?? "");
  const bmLabel = benchmarkLabel(isProxy);

  const flags:       NormalizationFlag[]     = [];
  const adjustments: NormalizationAdjustment[] = [];
  const notes:       string[]               = [];

  let trustScore = 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // A. Duplicate-value detection
  // ═══════════════════════════════════════════════════════════════════════════

  const revEqSde   = rev > 0 && rev === sdeV;
  const revEqEbit  = rev > 0 && rev === ebitV;
  const sdeEqEbit  = sdeV > 0 && sdeV === ebitV;
  const allIdentical = revEqSde && revEqEbit && sdeV > 0;

  if (allIdentical) {
    flags.push({
      code:     "DUPLICATE_VALUES_ALL",
      label:    "Input Anomaly — All Values Identical",
      detail:   `Revenue, SDE, and EBITDA are all identical ($${rev.toLocaleString()}). This is characteristic of a data entry error or broker system auto-fill. Manual verification required before advancing.`,
      severity: "critical",
    });
    adjustments.push({
      reason:    "Revenue, SDE, and EBITDA are identical — input anomaly detected",
      deduction: 40,
      source:    "input_anomaly",
    });
    trustScore -= 40;
  } else {
    if (revEqSde) {
      flags.push({
        code:     "DUPLICATE_VALUES_REV_SDE",
        label:    "Input Anomaly — Revenue Equals SDE",
        detail:   "Revenue and SDE are identical, implying a 100% SDE margin. This is not commercially plausible and likely reflects a data entry error. Request the seller's P&L before proceeding.",
        severity: "warning",
      });
      adjustments.push({
        reason:    "Revenue equals SDE — 100% implied margin is not commercially plausible",
        deduction: 20,
        source:    "input_anomaly",
      });
      trustScore -= 20;
    }
    if (revEqEbit) {
      flags.push({
        code:     "DUPLICATE_VALUES_REV_EBITDA",
        label:    "Input Anomaly — Revenue Equals EBITDA",
        detail:   "Revenue and EBITDA are identical, implying zero operating costs. This is characteristic of a data entry error. Request full financials.",
        severity: "warning",
      });
      adjustments.push({
        reason:    "Revenue equals EBITDA — zero-cost implication is not commercially plausible",
        deduction: 20,
        source:    "input_anomaly",
      });
      trustScore -= 20;
    }
    if (sdeEqEbit && !revEqSde) {
      // SDE === EBITDA is less severe — can happen in simple owner-operator structures
      flags.push({
        code:     "DUPLICATE_VALUES_SDE_EBITDA",
        label:    "Note — SDE and EBITDA Identical",
        detail:   "SDE and EBITDA are identical. In owner-operator businesses this is sometimes valid (owner draws treated as profit), but verify that depreciation, amortization, and owner compensation adjustments are correctly applied.",
        severity: "info",
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B. Impossible relationships
  // ═══════════════════════════════════════════════════════════════════════════

  if (priceV < 0) {
    flags.push({
      code:     "NEGATIVE_PRICE",
      label:    "Input Anomaly — Negative Asking Price",
      detail:   "Asking price is negative. This is a data entry error and cannot be processed. Correct the price before scoring.",
      severity: "critical",
    });
    adjustments.push({ reason: "Negative asking price — input cannot be processed", deduction: 30, source: "input_anomaly" });
    trustScore -= 30;
  }

  if (rev === 0 && (sdeV > 0 || ebitV > 0)) {
    flags.push({
      code:     "ZERO_REVENUE_POSITIVE_EARNINGS",
      label:    "Input Anomaly — Zero Revenue with Positive Earnings",
      detail:   "Revenue is reported as zero while SDE or EBITDA is positive. This is not commercially possible. Verify the revenue figure before proceeding.",
      severity: "critical",
    });
    adjustments.push({ reason: "Zero revenue with positive earnings — data inconsistency", deduction: 35, source: "input_anomaly" });
    trustScore -= 35;
  }

  if (ebitV > rev && rev > 0) {
    flags.push({
      code:     "EBITDA_EXCEEDS_REVENUE",
      label:    "Input Anomaly — EBITDA Exceeds Revenue",
      detail:   `EBITDA ($${ebitV.toLocaleString()}) exceeds total revenue ($${rev.toLocaleString()}). This is not commercially possible. Verify both figures before scoring.`,
      severity: "critical",
    });
    adjustments.push({ reason: "EBITDA exceeds revenue — impossible relationship detected", deduction: 30, source: "input_anomaly" });
    trustScore -= 30;
  }

  if (sdeV > rev && rev > 0) {
    flags.push({
      code:     "SDE_EXCEEDS_REVENUE",
      label:    "Input Anomaly — SDE Exceeds Revenue",
      detail:   `SDE ($${sdeV.toLocaleString()}) exceeds total revenue ($${rev.toLocaleString()}). This is not commercially possible without extraordinary add-backs. Request full add-back schedule.`,
      severity: "critical",
    });
    adjustments.push({ reason: "SDE exceeds revenue — impossible relationship detected", deduction: 30, source: "input_anomaly" });
    trustScore -= 30;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // C. Margin plausibility
  // ═══════════════════════════════════════════════════════════════════════════

  // C1. Absolute ceiling checks (independent of benchmark)
  if (statedEbitdaMargin !== null && statedEbitdaMargin >= 0.95 && ebitV !== rev) {
    flags.push({
      code:     "EBITDA_MARGIN_IMPLAUSIBLE",
      label:    "Above Benchmark Range — EBITDA Margin",
      detail:   `Stated EBITDA margin of ${pct(statedEbitdaMargin)} is at or above the commercially plausible ceiling for any service business. This level typically indicates missing cost line items or data entry errors. Manual review recommended.`,
      severity: "critical",
    });
    adjustments.push({ reason: `EBITDA margin ${pct(statedEbitdaMargin)} exceeds plausible ceiling — input anomaly likely`, deduction: 30, source: "margin_plausibility" });
    trustScore -= 30;
  }

  if (statedSdeMargin !== null && statedSdeMargin >= 0.95 && sdeV !== rev) {
    flags.push({
      code:     "SDE_MARGIN_IMPLAUSIBLE",
      label:    "Above Benchmark Range — SDE Margin",
      detail:   `Stated SDE margin of ${pct(statedSdeMargin)} is at or above the commercially plausible ceiling. This level is not achievable in operating businesses outside of highly automated digital businesses. Verify all add-back items.`,
      severity: "critical",
    });
    adjustments.push({ reason: `SDE margin ${pct(statedSdeMargin)} exceeds plausible ceiling`, deduction: 30, source: "margin_plausibility" });
    trustScore -= 30;
  }

  // C2. Benchmark comparison (requires RMA data)
  if (hasBenchmark && statedSdeMargin !== null && rev > 0) {
    const ratio = statedSdeMargin / benchmarkEbitdaMargin!;
    const dealPct  = pct(statedSdeMargin);
    const bmPct    = pct(benchmarkEbitdaMargin!);

    if (ratio > 2.0) {
      const detail = isProxy
        ? `Stated SDE margin (${dealPct}) is more than 2× the ${bmLabel} (${bmPct}). Because this benchmark is a proxy for a different industry, some margin premium is expected — however, this level warrants add-back documentation. Review add-backs and confirm whether elevated margins reflect true business economics.`
        : `Stated SDE margin (${dealPct}) is more than 2× the ${bmLabel} (${bmPct}). This level of outperformance requires rigorous add-back substantiation. Request itemized adjustments from the seller's accountant.`;
      flags.push({
        code:     "SDE_MARGIN_ABOVE_2X_BENCHMARK",
        label:    isProxy ? "Above Proxy Benchmark — Validate Add-Backs" : "Above Benchmark Range — Add-Back Scrutiny Required",
        detail,
        severity: "warning",
      });
      adjustments.push({
        reason:    `SDE margin ${dealPct} is more than 2× the ${bmLabel} (${bmPct})`,
        deduction: 20,
        source:    "margin_plausibility",
      });
      trustScore -= 20;
    } else if (ratio > 1.4) {
      flags.push({
        code:     "SDE_MARGIN_ABOVE_BENCHMARK",
        label:    isProxy ? "Above Proxy Benchmark" : "Above Industry Benchmark",
        detail:   `Stated SDE margin (${dealPct}) is ${Math.round(ratio * 100 - 100)}% above the ${bmLabel} (${bmPct}). ${isProxy ? "Review add-backs in context of this industry's typical economics." : "Elevated margins may reflect legitimate add-backs — confirm documentation."}`,
        severity: "caution",
      });
    } else if (ratio < 0.6) {
      flags.push({
        code:     "SDE_MARGIN_BELOW_BENCHMARK",
        label:    "Below Benchmark Range",
        detail:   `Stated SDE margin (${dealPct}) is materially below the ${bmLabel} (${bmPct}). This may indicate above-market owner compensation, excess overhead, or genuine underperformance. Investigate operating cost structure before advancing.`,
        severity: "caution",
      });
    } else if (ratio >= 0.8 && ratio <= 1.4) {
      notes.push(`SDE margin (${dealPct}) is consistent with the ${bmLabel} (${bmPct}).`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // D. Benchmark availability and classification quality deductions
  // ═══════════════════════════════════════════════════════════════════════════

  if (!hasBenchmark) {
    flags.push({
      code:     "BENCHMARK_UNAVAILABLE",
      label:    "Benchmark Data Unavailable",
      detail:   "No RMA benchmark data is available for this industry classification. Margin plausibility cannot be assessed against industry norms. Rely on comparables and seller documentation.",
      severity: "info",
    });
    adjustments.push({ reason: "No benchmark data available — margin plausibility unverifiable", deduction: 12, source: "benchmark" });
    trustScore -= 12;
  }

  if (isProxy && hasBenchmark) {
    notes.push(`Benchmark data is sourced from the closest available proxy. Interpret margin comparisons in the context of this industry's specific economics.`);
    adjustments.push({ reason: "Proxy benchmark used — direct industry RMA data unavailable", deduction: 8, source: "benchmark" });
    trustScore -= 8;
  }

  if (classificationConfidence !== null && classificationConfidence < 80) {
    flags.push({
      code:     "LOW_CLASSIFICATION_CONFIDENCE",
      label:    "Classification Confidence Below Threshold",
      detail:   `Industry classification confidence is ${classificationConfidence}/100, which is below the threshold for reliable benchmark comparison. Benchmark-derived adjustments should be treated as indicative only.`,
      severity: "caution",
    });
    adjustments.push({ reason: `Classification confidence ${classificationConfidence}/100 — benchmark reliability reduced`, deduction: 10, source: "classification" });
    trustScore -= 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E. Clamp and compute confidence level
  // ═══════════════════════════════════════════════════════════════════════════

  trustScore = clamp(Math.round(trustScore), 5, 100);

  const confidenceLevel: NormalizedDealFinancials["confidenceLevel"] =
    trustScore >= 85 ? "high"   :
    trustScore >= 65 ? "medium" : "low";

  // ── Summary note ───────────────────────────────────────────────────────────
  if (notes.length === 0 && flags.length === 0) {
    notes.push("Financials passed all normalization checks. No anomalies detected.");
  }

  return {
    raw: input,
    statedSdeMargin,
    statedEbitdaMargin,
    impliedMultiple,
    benchmarkEbitdaMargin,
    trustScore,
    confidenceLevel,
    flags,
    adjustments,
    notes,
  };
}

// ── UI summary helper ─────────────────────────────────────────────────────────

export interface NormalizationSummary {
  trustLabel:          string;   // e.g. "Trust Score: 74 — Medium Confidence"
  topFlags:            NormalizationFlag[];          // up to 3 most severe
  topAdjustments:      NormalizationAdjustment[];    // up to 2 largest deductions
  blockHighConviction: boolean;  // true when data quality prevents strong verdicts
}

const SEVERITY_ORDER = { critical: 0, warning: 1, caution: 2, info: 3 };

/**
 * Returns a UI-ready summary of normalization results.
 * Suitable for display in DealDetailPanel or UnderwritingPanel.
 */
export function getNormalizationSummaryForUI(
  normalized: NormalizedDealFinancials,
): NormalizationSummary {
  const { trustScore, confidenceLevel, flags, adjustments } = normalized;

  const trustLabel =
    confidenceLevel === "high"   ? `Trust Score: ${trustScore} — High Confidence`   :
    confidenceLevel === "medium" ? `Trust Score: ${trustScore} — Moderate Confidence` :
                                   `Trust Score: ${trustScore} — Manual Review Recommended`;

  const topFlags = [...flags]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 3);

  const topAdjustments = [...adjustments]
    .sort((a, b) => b.deduction - a.deduction)
    .slice(0, 2);

  const blockHighConviction = trustScore < 60;

  return { trustLabel, topFlags, topAdjustments, blockHighConviction };
}

// ── Conviction cap helper ─────────────────────────────────────────────────────

export type ConvictionCap =
  | { capped: false }
  | { capped: true; maxVerdict: "Investigate" | "Pass / Needs Manual Review"; reason: string };

/**
 * Returns a verdict cap when data quality is too low to support strong conviction.
 * Wire into dealVerdict() in buyer-dashboard.tsx after trust score is available.
 *
 * @example
 * const cap = getConvictionCap(normalized);
 * if (cap.capped) {
 *   // Override verdict to cap.maxVerdict
 * }
 */
export function getConvictionCap(normalized: NormalizedDealFinancials): ConvictionCap {
  const { trustScore, flags } = normalized;

  if (trustScore < 45) {
    const criticalFlag = flags.find(f => f.severity === "critical");
    return {
      capped:     true,
      maxVerdict: "Pass / Needs Manual Review",
      reason:     criticalFlag
        ? `${criticalFlag.label} — Manual review required before advancing.`
        : `Trust score of ${trustScore} indicates significant data quality concerns. Manual review required.`,
    };
  }

  if (trustScore < 60) {
    return {
      capped:     true,
      maxVerdict: "Investigate",
      reason:     `Trust score of ${trustScore} indicates input anomalies or low benchmark confidence. Investigate financials before advancing.`,
    };
  }

  return { capped: false };
}

// ── V1 Inline test objects ────────────────────────────────────────────────────
// For development and CI validation. Remove or tree-shake in production.

export const NORMALIZATION_TEST_CASES = {

  // ── Test 1: Clean landscaping deal ────────────────────────────────────────
  // SDE margin 18% vs RMA 12.1% → ratio 1.49 → caution flag (no trust deduction)
  // Expected: trustScore 100, confidenceLevel "high", 1 caution flag (above benchmark)
  cleanLandscaping: normalizeDealFinancials({
    revenue:                 650_000,
    sde:                     117_000,   // 18% margin — slightly above field_services RMA
    ebitda:                  105_000,
    price:                   320_000,
    benchmarkFamily:         "field_services",
    classificationConfidence: 92,
    benchmarkIsProxy:        false,
    rmaBenchmarks:           { ebitdaMarginPct: 0.121 },
  }),
  // ✓ trustScore: 100 | confidenceLevel: "high"
  // ✓ flags: [SDE_MARGIN_ABOVE_BENCHMARK (caution — no deduction)]
  // ✓ notes: [] (caution flags don't block conviction)

  // ── Test 2: Med spa — revenue = sde = ebitda (critical anomaly) ───────────
  // Deductions: all-identical (-40) + above 2× proxy (-20) + proxy (-8) = -68
  // Expected: trustScore ~32, confidenceLevel "low", DUPLICATE_VALUES_ALL critical flag
  medSpaDuplicateValues: normalizeDealFinancials({
    revenue:                 480_000,
    sde:                     480_000,   // identical to revenue — critical anomaly
    ebitda:                  480_000,   // identical to revenue — critical anomaly
    price:                   1_200_000,
    benchmarkFamily:         "med_spa",
    classificationConfidence: 92,
    benchmarkIsProxy:        true,
    rmaBenchmarks:           { ebitdaMarginPct: 0.184 },
  }),
  // ✓ trustScore: ~32 | confidenceLevel: "low"
  // ✓ flags: [DUPLICATE_VALUES_ALL (critical), SDE_MARGIN_ABOVE_2X_BENCHMARK (warning)]
  // ✓ getConvictionCap → maxVerdict: "Pass / Needs Manual Review"

  // ── Test 3: Restaurant with very low margin ────────────────────────────────
  // SDE 4% vs RMA 8.2% → ratio 0.49 → below benchmark (caution, no deduction)
  // Expected: trustScore 100, confidenceLevel "high", 1 caution flag (below benchmark)
  // Note: low-performing business ≠ bad data quality. Trust is high; deal quality is low.
  restaurantLowMargin: normalizeDealFinancials({
    revenue:                 1_200_000,
    sde:                     48_000,    // 4% margin — below food_beverage RMA 8.2%
    ebitda:                  36_000,
    price:                   95_000,
    benchmarkFamily:         "food_beverage",
    classificationConfidence: 92,
    benchmarkIsProxy:        false,
    rmaBenchmarks:           { ebitdaMarginPct: 0.082 },
  }),
  // ✓ trustScore: 100 | confidenceLevel: "high"
  // ✓ flags: [SDE_MARGIN_BELOW_BENCHMARK (caution)]
  // ✓ No conviction cap — data is clean, business performance is separate

  // ── Test 4: SaaS with no RMA benchmark data ────────────────────────────────
  // Deductions: no benchmark (-12). SaaS 60% margin is plausible but unverifiable.
  // Expected: trustScore 88, confidenceLevel "high", BENCHMARK_UNAVAILABLE info flag
  saasNoBenchmark: normalizeDealFinancials({
    revenue:                 420_000,
    sde:                     252_000,   // 60% SDE margin — plausible for SaaS, unverifiable
    ebitda:                  231_000,
    price:                   1_500_000,
    benchmarkFamily:         "saas",
    classificationConfidence: 92,
    benchmarkIsProxy:        false,
    rmaBenchmarks:           null,      // no RMA data for SaaS
  }),
  // ✓ trustScore: 88 | confidenceLevel: "high"
  // ✓ flags: [BENCHMARK_UNAVAILABLE (info)]
  // ✓ notes: ["Margin plausibility cannot be assessed against industry norms"]

  // ── Test 5: Retail with plausible proxy margins ────────────────────────────
  // SDE 14% vs proxy RMA 11% → ratio 1.27 → in-line range → note, no flag
  // Deductions: proxy (-8). Classification confidence 85 = above 80 threshold.
  // Expected: trustScore 92, confidenceLevel "high", no flags, proxy note
  retailPlausibleMargins: normalizeDealFinancials({
    revenue:                 900_000,
    sde:                     126_000,   // 14% — in-line with proxy benchmark 11%
    ebitda:                  108_000,
    price:                   340_000,
    inventory:               85_000,
    benchmarkFamily:         "retail",
    classificationConfidence: 85,
    benchmarkIsProxy:        true,      // retail uses ecommerce RMA as closest proxy
    rmaBenchmarks:           { ebitdaMarginPct: 0.11 },
  }),
  // ✓ trustScore: 92 | confidenceLevel: "high"
  // ✓ flags: [] (proxy note goes to notes[], not flags[])
  // ✓ notes: ["SDE margin (14%) consistent with closest available proxy benchmark (11%)"]

  // ── Test 6: Mixed business — proxy + low confidence + inflated margins ─────
  // SDE 50% vs personal_services proxy 14% → ratio 3.6× → above 2× (-20)
  // Deductions: above 2× benchmark (-20) + low confidence (-10) + proxy (-8) = -38
  // Expected: trustScore ~62, confidenceLevel "low", 2+ flags
  mixedBusinessWeakConfidence: normalizeDealFinancials({
    revenue:                 550_000,
    sde:                     275_000,   // 50% margin — 3.6× above proxy benchmark
    ebitda:                  220_000,
    price:                   750_000,
    benchmarkFamily:         "personal_services",
    classificationConfidence: 60,       // mixed business confidence penalty applied
    benchmarkIsProxy:        true,      // using proxy benchmark
    rmaBenchmarks:           { ebitdaMarginPct: 0.14 },
  }),
  // ✓ trustScore: ~62 | confidenceLevel: "low"
  // ✓ flags: [SDE_MARGIN_ABOVE_2X_BENCHMARK (warning), LOW_CLASSIFICATION_CONFIDENCE (caution)]
  // ✓ getConvictionCap → maxVerdict: "Investigate"
} as const;
