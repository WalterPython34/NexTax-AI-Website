// lib/normalizationEngine.ts
// NexTax Normalization Layer — V2
//
// Pipeline position:
//   Raw listing data
//     → normalizeDealFinancials()   ← this file
//       → scoreDeal()               (scoringEngine.ts)
//         → generateScoreExplanation()
//
// Unit contract (inherited from benchmark system):
//   ebitda_margin_pct / ebitdaMarginPct → decimal (0.121 = 12.1%)
//   All dollar inputs → raw numbers, no formatting
//
// V2 changes vs V1:
//   - Anomaly grouping: triple-identical = one critical event, not cascading pairwise hits
//   - Benchmark-family-specific margin ceilings (industry-aware, not just fraud-aware)
//   - usableSDE / valuationSDE / debtServiceSDE (normalized earnings for downstream scoring)
//   - Trust vs Attractiveness separation — documented and enforced in output shape
//   - Source quality flags with trust adjustments
//   - Structured NormalizationFlag with code/severity/title/message/deduction/field

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/** Raw financial inputs as received from a broker listing or user entry. */
export interface RawDealFinancials {
  revenue:  number;
  sde:      number;
  ebitda:   number;
  price:    number;
  inventory?: number | null;

  // Classification context
  benchmarkFamily?:          string | null;
  classificationConfidence?: number | null;  // 0–100
  benchmarkIsProxy?:         boolean;

  // Source quality — affects trust adjustment
  dataSource?: DataSourceType;

  // RMA benchmark data — accepts both camelCase (ScoreOutputs) and
  // snake_case (IndustryBenchmarks) for compatibility
  rmaBenchmarks?: {
    ebitdaMarginPct?:      number | null;
    ebitda_margin_pct?:    number | null;
    operatingMarginPct?:   number | null;
    operating_margin_pct?: number | null;
    currentRatio?:         number | null;
    current_ratio?:        number | null;
    leverageFlag?:         string | null;
    leverage_flag?:        string | null;
    coverageFlag?:         string | null;
    coverage_flag?:        string | null;
  } | null;
}

/**
 * The source of the raw data. Affects trust score.
 * "manual_entry"     = user typed into NexTax analyzer
 * "marketplace"      = scraped from BizBuySell, Flippa, etc.
 * "broker_teaser"    = one-page summary from broker
 * "cim"              = full Confidential Information Memorandum uploaded
 * "user_validated"   = user confirmed and adjusted fields after review
 */
export type DataSourceType =
  | "manual_entry"
  | "marketplace"
  | "broker_teaser"
  | "cim"
  | "user_validated";

/**
 * A detected anomaly — fully structured for UI rendering.
 * Every flag carries its own deduction so the UI can show precise attribution.
 */
export interface NormalizationFlag {
  code:      string;                                       // machine key: "TRIPLE_DUPLICATE_FINANCIALS"
  severity:  "info" | "caution" | "warning" | "critical";
  title:     string;                                       // short label for card/badge
  message:   string;                                       // professional explanation for UI
  deduction: number;                                       // trust points removed (0 for info/caution)
  field:     "earnings" | "margins" | "price" | "revenue" | "classification" | "benchmark" | "source";
}

/** A trust score deduction with its reason — kept separate for detailed breakdown display. */
export interface NormalizationAdjustment {
  reason:    string;
  deduction: number;
  source:    "input_anomaly" | "margin_plausibility" | "benchmark" | "classification" | "data_source";
}

/**
 * Normalized earnings — the core of V2.
 *
 * reportedSDE      = raw SDE as stated by broker/seller
 * benchmarkSDE     = revenue × benchmark ebitda_margin_pct (RMA-implied earnings)
 * usableSDE        = trust-adjusted SDE used for downstream scoring
 * valuationSDE     = SDE to use for fair value calculation
 * debtServiceSDE   = SDE to use for DSCR calculation (most conservative)
 *
 * Trust gating rules:
 *   trustScore >= 80  → usableSDE = reportedSDE  (trust the numbers)
 *   trustScore >= 60  → usableSDE = min(reported, benchmark)  (take the lower)
 *   trustScore < 60   → usableSDE = benchmarkSDE  (ignore stated, use implied)
 *
 * Separation: low trust ≠ bad business. A low-margin restaurant has high trust
 * (data is believable) but poor attractiveness. These must never be conflated.
 */
export interface NormalizedEarnings {
  reportedSDE:    number;         // verbatim from input
  benchmarkSDE:   number | null;  // null if no benchmark available
  usableSDE:      number;         // trust-gated; drives scoring
  valuationSDE:   number;         // = usableSDE (alias for clarity in valuation context)
  debtServiceSDE: number;         // = usableSDE (alias for clarity in DSCR context)
  earningsSource: "reported" | "blended" | "benchmark_implied";
}

/** Full normalized output. */
export interface NormalizedDealFinancials {
  // ── Raw inputs ─────────────────────────────────────────────────────────────
  raw: RawDealFinancials;

  // ── Derived margin ratios ──────────────────────────────────────────────────
  statedSdeMargin:       number | null;  // sde / revenue (decimal)
  statedEbitdaMargin:    number | null;  // ebitda / revenue (decimal)
  impliedMultiple:       number | null;  // price / sde
  benchmarkEbitdaMargin: number | null;  // from RMA (decimal)

  // ── Normalized earnings (the usable layer for scoring) ────────────────────
  earnings: NormalizedEarnings;

  // ── Trust (data quality) — separate from business attractiveness ───────────
  // Trust answers: "Can I rely on these numbers?"
  // Attractiveness (deal score) answers: "Do I want this business?"
  // These must NEVER be blended into one vague number.
  trustScore:      number;                    // 0–100, clamped 5–100
  confidenceLevel: "high" | "medium" | "low";

  // ── Structured output ──────────────────────────────────────────────────────
  flags:       NormalizationFlag[];
  adjustments: NormalizationAdjustment[];
  notes:       string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Benchmark-family-specific SDE margin warning ceilings.
 * Above warnAbove → caution flag (no deduction).
 * Above hardCeiling → warning/critical flag + deduction.
 * Universal absurdity ceiling (95%) is always applied regardless of family.
 *
 * Values are decimals (0.25 = 25%).
 */
const FAMILY_MARGIN_CEILINGS: Record<string, { warnAbove: number; hardCeiling: number; label: string }> = {
  food_beverage:        { warnAbove: 0.20, hardCeiling: 0.35, label: "restaurant / food service"         },
  field_services:       { warnAbove: 0.30, hardCeiling: 0.45, label: "field service"                     },
  specialty_trade:      { warnAbove: 0.32, hardCeiling: 0.48, label: "specialty trade"                   },
  auto_services:        { warnAbove: 0.30, hardCeiling: 0.50, label: "automotive service"                },
  healthcare_clinical:  { warnAbove: 0.40, hardCeiling: 0.60, label: "healthcare practice"               },
  behavioral_health:    { warnAbove: 0.35, hardCeiling: 0.55, label: "behavioral health practice"        },
  med_spa:              { warnAbove: 0.42, hardCeiling: 0.65, label: "med spa / aesthetic clinic"        },
  personal_services:    { warnAbove: 0.30, hardCeiling: 0.50, label: "personal service"                  },
  professional_services:{ warnAbove: 0.45, hardCeiling: 0.65, label: "professional service"              },
  asset_services:       { warnAbove: 0.50, hardCeiling: 0.70, label: "asset-based business"              },
  saas:                 { warnAbove: 0.60, hardCeiling: 0.85, label: "SaaS / recurring software"        },
  digital:              { warnAbove: 0.55, hardCeiling: 0.80, label: "digital business"                  },
  manufacturing:        { warnAbove: 0.28, hardCeiling: 0.45, label: "manufacturing"                     },
  retail:               { warnAbove: 0.18, hardCeiling: 0.32, label: "retail"                            },
  wholesale:            { warnAbove: 0.15, hardCeiling: 0.28, label: "wholesale / distribution"          },
};

// Universal fallback when family is unknown
const DEFAULT_CEILING = { warnAbove: 0.45, hardCeiling: 0.70, label: "business" };

/** Benchmark families that use a proxy RMA source. */
const PROXY_FAMILIES = new Set([
  "med_spa", "behavioral_health", "manufacturing", "retail", "wholesale",
]);

/** Source quality deductions. Positive = deduction from trust. */
const SOURCE_QUALITY_DEDUCTIONS: Record<DataSourceType, number> = {
  cim:            0,   // full financials — no penalty
  user_validated: 0,   // user confirmed — no penalty
  manual_entry:   0,   // direct input — no penalty (user is responsible)
  marketplace:    5,   // scraped listing — light penalty
  broker_teaser:  5,   // summary only — light penalty
};

const SOURCE_QUALITY_LABELS: Record<DataSourceType, string> = {
  cim:            "Full financials (CIM)",
  user_validated: "User-validated entry",
  manual_entry:   "Manual entry",
  marketplace:    "Marketplace listing",
  broker_teaser:  "Broker teaser summary",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function resolveEbitdaMargin(rma: RawDealFinancials["rmaBenchmarks"]): number | null {
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fmt(n: number): string {
  return `$${n.toLocaleString()}`;
}

function bmLabel(isProxy: boolean): string {
  return isProxy ? "closest available proxy benchmark" : "industry benchmark";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalizes raw deal financials, computes trust score, surfaces flags,
 * and produces usable earnings for downstream scoring.
 *
 * Key design principles:
 *  1. Anomaly grouping — one underlying defect → one flag family
 *  2. Industry-aware ceilings — not just a universal 95% fraud check
 *  3. usableSDE — trust-gated earnings that actually flow into valuation + DSCR
 *  4. Trust ≠ Attractiveness — low-margin restaurant has HIGH trust, LOW attractiveness
 *
 * @example
 * const n = normalizeDealFinancials({
 *   revenue: 800_000, sde: 180_000, ebitda: 160_000, price: 650_000,
 *   benchmarkFamily: "field_services", classificationConfidence: 92,
 *   benchmarkIsProxy: false, rmaBenchmarks: { ebitdaMarginPct: 0.121 },
 * });
 * // → n.earnings.usableSDE = 180_000 (trust >= 80, reported SDE used)
 * // → n.trustScore = 100, n.confidenceLevel = "high"
 */
export function normalizeDealFinancials(
  input: RawDealFinancials,
): NormalizedDealFinancials {
  const {
    revenue, sde, ebitda, price,
    benchmarkFamily          = null,
    classificationConfidence = null,
    benchmarkIsProxy         = false,
    dataSource               = "manual_entry",
    rmaBenchmarks            = null,
  } = input;

  const rev    = safe(revenue);
  const sdeV   = safe(sde);
  const ebitV  = safe(ebitda);
  const priceV = safe(price);

  // ── Derived ratios ─────────────────────────────────────────────────────────
  const statedSdeMargin    = rev > 0 ? sdeV  / rev : null;
  const statedEbitdaMargin = rev > 0 ? ebitV / rev : null;
  const impliedMultiple    = sdeV > 0 ? priceV / sdeV : null;
  const benchmarkEbitdaMargin = resolveEbitdaMargin(rmaBenchmarks);
  const hasBenchmark  = benchmarkEbitdaMargin !== null;
  const isProxy       = benchmarkIsProxy || PROXY_FAMILIES.has(benchmarkFamily ?? "");
  const familyCeiling = FAMILY_MARGIN_CEILINGS[benchmarkFamily ?? ""] ?? DEFAULT_CEILING;

  const flags:       NormalizationFlag[]      = [];
  const adjustments: NormalizationAdjustment[] = [];
  const notes:       string[]                 = [];
  let   trustScore = 100;

  // Helper: add a flag and matching adjustment together (keeps code DRY)
  function addFlag(flag: NormalizationFlag) {
    flags.push(flag);
    if (flag.deduction > 0) {
      adjustments.push({
        reason:    flag.message,
        deduction: flag.deduction,
        source:    flag.field === "earnings" || flag.field === "revenue" || flag.field === "price"
          ? "input_anomaly"
          : flag.field === "margins"
          ? "margin_plausibility"
          : flag.field === "benchmark"
          ? "benchmark"
          : flag.field === "source"
          ? "data_source"
          : "classification",
      });
      trustScore -= flag.deduction;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RULE A — Anomaly grouping: duplicate / identical financial fields
  //
  // Design: treat as a family, not individual pairwise checks.
  //   Triple-identical (all 3) → one critical event (-40), skip all pairwise checks.
  //   Pairwise (only 2 match) → individual warnings, do NOT double-count.
  //   SDE = EBITDA only → info (benign in simple owner-operator structures).
  //
  // Margin plausibility checks (Rule C) are then applied SEPARATELY to the
  // underlying stated margins — not skipped — since a 100% margin is a real
  // margin problem even if it was caused by a duplicate input.
  // However we skip margin ceiling checks when allIdentical = true to avoid
  // re-flagging the same root cause five different ways.
  // ═══════════════════════════════════════════════════════════════════════════

  const revEqSde    = rev > 0 && rev === sdeV;
  const revEqEbit   = rev > 0 && rev === ebitV;
  const sdeEqEbit   = sdeV > 0 && sdeV === ebitV;
  const allIdentical = revEqSde && revEqEbit && sdeV > 0;

  if (allIdentical) {
    // One critical event — do NOT also fire revEqSde and revEqEbit separately
    addFlag({
      code:      "TRIPLE_DUPLICATE_FINANCIALS",
      severity:  "critical",
      title:     "Identical Financial Fields",
      message:   `Revenue, SDE, and EBITDA are all reported as ${fmt(rev)}. This is characteristic of a data entry error or broker system auto-fill. Manual verification is required before advancing this deal.`,
      deduction: 40,
      field:     "earnings",
    });
  } else {
    // Only fire pairwise checks when NOT all-identical
    if (revEqSde) {
      addFlag({
        code:      "REVENUE_EQUALS_SDE",
        severity:  "warning",
        title:     "Revenue Equals SDE",
        message:   `Revenue and SDE are both reported as ${fmt(rev)}, implying a 100% SDE margin. This is not commercially plausible and likely reflects a data entry error. Request the seller's P&L before proceeding.`,
        deduction: 20,
        field:     "earnings",
      });
    }
    if (revEqEbit) {
      addFlag({
        code:      "REVENUE_EQUALS_EBITDA",
        severity:  "warning",
        title:     "Revenue Equals EBITDA",
        message:   `Revenue and EBITDA are both reported as ${fmt(rev)}, implying zero operating costs. This is characteristic of a data entry error. Request full financials.`,
        deduction: 20,
        field:     "earnings",
      });
    }
    if (sdeEqEbit && !revEqSde && !revEqEbit) {
      // Benign in owner-operator businesses — info only, no deduction
      addFlag({
        code:      "SDE_EQUALS_EBITDA",
        severity:  "info",
        title:     "SDE and EBITDA Identical",
        message:   "SDE and EBITDA are identical. This is sometimes valid in owner-operator businesses where the owner's compensation is fully added back. Verify that depreciation, amortization, and owner salary adjustments are correctly applied.",
        deduction: 0,
        field:     "earnings",
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RULE B — Impossible relationships
  // ═══════════════════════════════════════════════════════════════════════════

  if (priceV < 0) {
    addFlag({
      code:      "NEGATIVE_PRICE",
      severity:  "critical",
      title:     "Negative Asking Price",
      message:   "Asking price is negative. This is a data entry error and cannot be processed. Correct the price before scoring.",
      deduction: 30,
      field:     "price",
    });
  }

  if (rev === 0 && (sdeV > 0 || ebitV > 0)) {
    addFlag({
      code:      "ZERO_REVENUE_POSITIVE_EARNINGS",
      severity:  "critical",
      title:     "Zero Revenue with Positive Earnings",
      message:   "Revenue is reported as zero while SDE or EBITDA is positive. This is not commercially possible. Verify the revenue figure before proceeding.",
      deduction: 35,
      field:     "revenue",
    });
  }

  if (!allIdentical && ebitV > rev && rev > 0) {
    addFlag({
      code:      "EBITDA_EXCEEDS_REVENUE",
      severity:  "critical",
      title:     "EBITDA Exceeds Revenue",
      message:   `EBITDA (${fmt(ebitV)}) exceeds total revenue (${fmt(rev)}). This is not commercially possible. Verify both figures before scoring.`,
      deduction: 30,
      field:     "earnings",
    });
  }

  if (!allIdentical && sdeV > rev && rev > 0) {
    addFlag({
      code:      "SDE_EXCEEDS_REVENUE",
      severity:  "critical",
      title:     "SDE Exceeds Revenue",
      message:   `SDE (${fmt(sdeV)}) exceeds total revenue (${fmt(rev)}). This is not commercially possible without extraordinary add-backs. Request the full add-back schedule.`,
      deduction: 30,
      field:     "earnings",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RULE C — Margin plausibility
  //
  // Three layers:
  //   C1. Universal absurdity ceiling (>= 95%) — always applies
  //   C2. Industry-specific ceiling — family-aware, more nuanced
  //   C3. Benchmark comparison — requires RMA data
  //
  // Skip C2 and C3 when allIdentical = true (root cause already captured in Rule A).
  // C1 still runs on allIdentical cases because 100% margin is independently flaggable.
  //
  // Trust vs Attractiveness separation:
  //   C1 (impossible margin) → trust deduction
  //   C2 hard ceiling breach → trust deduction
  //   C2 warn ceiling breach → caution flag, NO deduction (attractiveness signal)
  //   C3 benchmark comparison → deduction only above 2× benchmark
  // ═══════════════════════════════════════════════════════════════════════════

  // C1. Universal ceiling — applies always, even when allIdentical
  if (statedSdeMargin !== null && statedSdeMargin >= 0.95 && !revEqSde) {
    addFlag({
      code:      "SDE_MARGIN_IMPLAUSIBLE",
      severity:  "critical",
      title:     "SDE Margin Above Plausible Ceiling",
      message:   `Stated SDE margin of ${pct(statedSdeMargin)} is at or above the universally implausible ceiling of 95%. This level is not achievable in any operating business. Verify all add-back items and request the full P&L.`,
      deduction: 30,
      field:     "margins",
    });
  }

  if (statedEbitdaMargin !== null && statedEbitdaMargin >= 0.95 && !revEqEbit) {
    addFlag({
      code:      "EBITDA_MARGIN_IMPLAUSIBLE",
      severity:  "critical",
      title:     "EBITDA Margin Above Plausible Ceiling",
      message:   `Stated EBITDA margin of ${pct(statedEbitdaMargin)} is at or above the universally implausible ceiling of 95%. This indicates missing cost line items or a data entry error. Manual review recommended.`,
      deduction: 30,
      field:     "margins",
    });
  }

  // C2. Industry-specific ceiling — skip if allIdentical (root cause already logged)
  if (!allIdentical && statedSdeMargin !== null && rev > 0) {
    const { warnAbove, hardCeiling, label } = familyCeiling;

    if (statedSdeMargin > hardCeiling && statedSdeMargin < 0.95) {
      // Hard ceiling breach — deduction, not just warning
      addFlag({
        code:      "SDE_MARGIN_ABOVE_INDUSTRY_CEILING",
        severity:  "warning",
        title:     "Above Industry Ceiling — SDE Margin",
        message:   `SDE margin of ${pct(statedSdeMargin)} exceeds the ${label} ceiling of ${pct(hardCeiling)}. This level of outperformance requires rigorous add-back substantiation. Request itemized adjustments from the seller's accountant.`,
        deduction: 15,
        field:     "margins",
      });
    } else if (statedSdeMargin > warnAbove && statedSdeMargin <= hardCeiling) {
      // Warn ceiling — informational only, no deduction (could be a strong business)
      // This is an ATTRACTIVENESS signal, not a TRUST signal.
      addFlag({
        code:      "SDE_MARGIN_ABOVE_INDUSTRY_NORM",
        severity:  "caution",
        title:     "Above Industry Norm — SDE Margin",
        message:   `SDE margin of ${pct(statedSdeMargin)} is above the typical ${label} range (up to ${pct(warnAbove)}). This may reflect legitimate operational efficiency or add-backs — confirm documentation.`,
        deduction: 0,
        field:     "margins",
      });
    }
  }

  // C3. Benchmark comparison — skip if allIdentical
  if (!allIdentical && hasBenchmark && statedSdeMargin !== null && rev > 0) {
    const ratio   = statedSdeMargin / benchmarkEbitdaMargin!;
    const dealPct = pct(statedSdeMargin);
    const bmPct   = pct(benchmarkEbitdaMargin!);
    const bm      = bmLabel(isProxy);

    if (ratio > 2.0) {
      addFlag({
        code:      "SDE_MARGIN_2X_ABOVE_BENCHMARK",
        severity:  "warning",
        title:     isProxy ? "Above Proxy Benchmark — Validate Add-Backs" : "Above Benchmark Range — Add-Back Scrutiny Required",
        message:   isProxy
          ? `SDE margin (${dealPct}) is ${ratio.toFixed(1)}× the ${bm} (${bmPct}). Because this benchmark is from a proxy industry, some premium is expected — however, this level warrants add-back documentation. Review add-backs and confirm whether elevated margins reflect true business economics.`
          : `SDE margin (${dealPct}) is ${ratio.toFixed(1)}× the ${bm} (${bmPct}). This level of outperformance requires rigorous add-back substantiation. Request itemized adjustments from the seller's accountant.`,
        deduction: 20,
        field:     "margins",
      });
    } else if (ratio > 1.4) {
      // Above benchmark but not extreme — attractiveness signal, no trust deduction
      addFlag({
        code:      "SDE_MARGIN_ABOVE_BENCHMARK",
        severity:  "caution",
        title:     isProxy ? "Above Proxy Benchmark" : "Above Industry Benchmark",
        message:   `SDE margin (${dealPct}) is ${Math.round(ratio * 100 - 100)}% above the ${bm} (${bmPct}). ${isProxy ? "Review add-backs in the context of this industry's typical economics." : "Elevated margins may reflect legitimate add-backs — confirm documentation."}`,
        deduction: 0,
        field:     "margins",
      });
    } else if (ratio < 0.6) {
      // Below benchmark — ATTRACTIVENESS flag, not a trust problem
      // Low-margin restaurant → high trust, low attractiveness. Do NOT deduct trust.
      addFlag({
        code:      "SDE_MARGIN_BELOW_BENCHMARK",
        severity:  "caution",
        title:     "Below Industry Benchmark",
        message:   `SDE margin (${dealPct}) is materially below the ${bm} (${bmPct}). This may indicate above-market owner compensation, excess overhead, or genuine underperformance. Investigate operating cost structure before advancing.`,
        deduction: 0,   // ← trust NOT deducted; this is an attractiveness signal
        field:     "margins",
      });
    } else {
      // In-line — positive signal
      notes.push(`SDE margin (${dealPct}) is consistent with the ${bm} (${bmPct}).`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RULE D — Benchmark availability and classification quality
  // ═══════════════════════════════════════════════════════════════════════════

  if (!hasBenchmark) {
    addFlag({
      code:      "BENCHMARK_UNAVAILABLE",
      severity:  "info",
      title:     "Benchmark Data Unavailable",
      message:   `No RMA benchmark data is available for this industry classification. Margin plausibility cannot be assessed against industry norms. Rely on comparables and seller documentation.`,
      deduction: 12,
      field:     "benchmark",
    });
  }

  if (isProxy && hasBenchmark) {
    notes.push("Benchmark data is sourced from the closest available RMA proxy. Interpret margin comparisons in the context of this industry's specific economics.");
    addFlag({
      code:      "PROXY_BENCHMARK_USED",
      severity:  "info",
      title:     "Closest Available Proxy Benchmark",
      message:   `No direct RMA benchmark exists for this industry classification. The closest available proxy is being used. Margin comparisons should be interpreted with appropriate context.`,
      deduction: 8,
      field:     "benchmark",
    });
  }

  if (classificationConfidence !== null && classificationConfidence < 80) {
    addFlag({
      code:      "LOW_CLASSIFICATION_CONFIDENCE",
      severity:  "caution",
      title:     "Classification Confidence Below Threshold",
      message:   `Industry classification confidence is ${classificationConfidence}/100, which is below the 80-point threshold for reliable benchmark comparison. Benchmark-derived adjustments should be treated as indicative only.`,
      deduction: 10,
      field:     "classification",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RULE E — Source quality
  // ═══════════════════════════════════════════════════════════════════════════

  const sourceDeduction = SOURCE_QUALITY_DEDUCTIONS[dataSource] ?? 0;
  if (sourceDeduction > 0) {
    addFlag({
      code:      "SOURCE_QUALITY_REDUCED",
      severity:  "info",
      title:     "Reduced Source Quality",
      message:   `Financial data originates from a ${SOURCE_QUALITY_LABELS[dataSource].toLowerCase()}. Summary-level inputs carry additional uncertainty relative to verified financials. Confidence adjusted accordingly.`,
      deduction: sourceDeduction,
      field:     "source",
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTE TRUST SCORE AND CONFIDENCE
  // ═══════════════════════════════════════════════════════════════════════════

  trustScore = clamp(Math.round(trustScore), 5, 100);

  const confidenceLevel: NormalizedDealFinancials["confidenceLevel"] =
    trustScore >= 85 ? "high"   :
    trustScore >= 65 ? "medium" : "low";

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZED EARNINGS (usable SDE for downstream scoring)
  //
  // Trust gating:
  //   >= 80  → reportedSDE   (trust the numbers)
  //   >= 60  → min(reported, benchmark)  (conservative blend)
  //   <  60  → benchmarkSDE  (discard stated, use RMA-implied)
  //
  // benchmarkSDE = revenue × benchmarkEbitdaMargin
  // null benchmarkSDE (no RMA) → always use reportedSDE regardless of trust
  // ═══════════════════════════════════════════════════════════════════════════

  const benchmarkSDE = hasBenchmark ? Math.round(rev * benchmarkEbitdaMargin!) : null;

  let usableSDE: number;
  let earningsSource: NormalizedEarnings["earningsSource"];

  if (!hasBenchmark || trustScore >= 80) {
    usableSDE     = sdeV;
    earningsSource = "reported";
  } else if (trustScore >= 60) {
    usableSDE     = Math.min(sdeV, benchmarkSDE!);
    earningsSource = sdeV <= benchmarkSDE! ? "reported" : "blended";
  } else {
    usableSDE     = benchmarkSDE!;
    earningsSource = "benchmark_implied";
  }

  if (earningsSource !== "reported") {
    notes.push(
      earningsSource === "blended"
        ? `Usable SDE (${fmt(usableSDE)}) reflects the lower of stated SDE and benchmark-implied SDE due to moderate trust score.`
        : `Usable SDE (${fmt(usableSDE)}) is derived from the benchmark-implied margin due to low trust score. Stated SDE (${fmt(sdeV)}) has been set aside pending manual review.`
    );
  }

  const earnings: NormalizedEarnings = {
    reportedSDE:    sdeV,
    benchmarkSDE,
    usableSDE,
    valuationSDE:   usableSDE,
    debtServiceSDE: usableSDE,
    earningsSource,
  };

  // ── Summary note ───────────────────────────────────────────────────────────
  if (notes.length === 0 && flags.every(f => f.severity === "info")) {
    notes.push("Financials passed all normalization checks. No material anomalies detected.");
  }

  return {
    raw:                  input,
    statedSdeMargin,
    statedEbitdaMargin,
    impliedMultiple,
    benchmarkEbitdaMargin,
    earnings,
    trustScore,
    confidenceLevel,
    flags,
    adjustments,
    notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizationSummary {
  trustLabel:          string;
  topFlags:            NormalizationFlag[];        // up to 3, sorted by severity
  topAdjustments:      NormalizationAdjustment[];  // up to 2, sorted by deduction
  blockHighConviction: boolean;
  earningsSummary:     string;  // one-line for the underwriting panel header
}

const SEVERITY_ORDER = { critical: 0, warning: 1, caution: 2, info: 3 };

/**
 * Returns a UI-ready summary for DealDetailPanel / UnderwritingPanel.
 */
export function getNormalizationSummaryForUI(
  n: NormalizedDealFinancials,
): NormalizationSummary {
  const { trustScore, confidenceLevel, flags, adjustments, earnings } = n;

  const trustLabel =
    confidenceLevel === "high"   ? `Trust Score: ${trustScore} — High Confidence`     :
    confidenceLevel === "medium" ? `Trust Score: ${trustScore} — Moderate Confidence`  :
                                   `Trust Score: ${trustScore} — Manual Review Recommended`;

  const topFlags = [...flags]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 3);

  const topAdjustments = [...adjustments]
    .sort((a, b) => b.deduction - a.deduction)
    .slice(0, 2);

  const earningsSummary =
    earnings.earningsSource === "reported"
      ? `Usable SDE: ${fmt(earnings.usableSDE)} (stated)`
      : earnings.earningsSource === "blended"
      ? `Usable SDE: ${fmt(earnings.usableSDE)} (conservative blend — stated was ${fmt(earnings.reportedSDE)})`
      : `Usable SDE: ${fmt(earnings.usableSDE)} (benchmark-implied — stated ${fmt(earnings.reportedSDE)} set aside)`;

  return {
    trustLabel,
    topFlags,
    topAdjustments,
    blockHighConviction: trustScore < 60,
    earningsSummary,
  };
}

// ── Conviction cap ────────────────────────────────────────────────────────────

export type ConvictionCap =
  | { capped: false }
  | { capped: true; maxVerdict: "Investigate" | "Pass / Needs Manual Review"; reason: string };

/**
 * Returns a verdict ceiling when data quality is too low for strong conviction.
 * Wire into dealVerdict() in buyer-dashboard.tsx after normalization.
 */
export function getConvictionCap(n: NormalizedDealFinancials): ConvictionCap {
  const { trustScore, flags } = n;

  if (trustScore < 45) {
    const critical = flags.find(f => f.severity === "critical");
    return {
      capped:     true,
      maxVerdict: "Pass / Needs Manual Review",
      reason:     critical
        ? `${critical.title} — Manual review required before advancing.`
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

// ═══════════════════════════════════════════════════════════════════════════════
// V2 INLINE TEST OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export const NORMALIZATION_TEST_CASES = {

  // ── Test 1: Clean landscaping ──────────────────────────────────────────────
  // SDE 18% vs RMA 12.1% → ratio 1.49 → SDE_MARGIN_ABOVE_BENCHMARK (caution, 0 deduction)
  // Also: 18% > warnAbove 30%? No. So no industry ceiling flag either.
  // Expected: trustScore 100 | high | usableSDE = 117_000 (reported)
  cleanLandscaping: normalizeDealFinancials({
    revenue: 650_000, sde: 117_000, ebitda: 105_000, price: 320_000,
    benchmarkFamily: "field_services", classificationConfidence: 92,
    benchmarkIsProxy: false, dataSource: "manual_entry",
    rmaBenchmarks: { ebitdaMarginPct: 0.121 },
  }),

  // ── Test 2: Med spa — revenue = sde = ebitda ──────────────────────────────
  // TRIPLE_DUPLICATE_FINANCIALS (-40) + PROXY_BENCHMARK_USED (-8)
  // Benchmark comparison skipped (allIdentical = true)
  // Expected: trustScore 52 | low | usableSDE = benchmark-implied (trust < 60)
  medSpaDuplicateValues: normalizeDealFinancials({
    revenue: 480_000, sde: 480_000, ebitda: 480_000, price: 1_200_000,
    benchmarkFamily: "med_spa", classificationConfidence: 92,
    benchmarkIsProxy: true, dataSource: "marketplace",
    rmaBenchmarks: { ebitdaMarginPct: 0.184 },
  }),
  // ✓ trustScore: 47 (100 - 40 - 8 - 5) | low
  // ✓ flags: [TRIPLE_DUPLICATE_FINANCIALS(crit), PROXY_BENCHMARK_USED(info), SOURCE_QUALITY_REDUCED(info)]
  // ✓ usableSDE: 480_000 × 0.184 = ~88_320 (benchmark-implied, trust < 60)
  // ✓ getConvictionCap → "Pass / Needs Manual Review"

  // ── Test 3: Restaurant low margin ─────────────────────────────────────────
  // SDE 4% vs RMA 8.2% → ratio 0.49 → SDE_MARGIN_BELOW_BENCHMARK (caution, 0 deduction)
  // Low-performing business ≠ bad data. Trust stays high.
  // Expected: trustScore 100 | high | usableSDE = 48_000 (reported)
  restaurantLowMargin: normalizeDealFinancials({
    revenue: 1_200_000, sde: 48_000, ebitda: 36_000, price: 95_000,
    benchmarkFamily: "food_beverage", classificationConfidence: 92,
    benchmarkIsProxy: false, dataSource: "broker_teaser",
    rmaBenchmarks: { ebitdaMarginPct: 0.082 },
  }),
  // ✓ trustScore: 95 (100 - 5 broker_teaser) | high
  // ✓ flags: [SDE_MARGIN_BELOW_BENCHMARK(caution, 0 deduction), SOURCE_QUALITY_REDUCED(info)]
  // ✓ usableSDE: 48_000 (reported — trust >= 80)
  // ✓ No conviction cap. Data is clean. Business attractiveness is separate.

  // ── Test 4: SaaS — no benchmark ───────────────────────────────────────────
  // 60% margin is plausible for SaaS but unverifiable.
  // SaaS hard ceiling is 85% — 60% is below warnAbove (60%) boundary: exactly at.
  // Actually: warnAbove for saas = 0.60 → 60% is AT the warn threshold → no family flag.
  // Expected: trustScore 88 | high | usableSDE = 252_000 (reported)
  saasNoBenchmark: normalizeDealFinancials({
    revenue: 420_000, sde: 252_000, ebitda: 231_000, price: 1_500_000,
    benchmarkFamily: "saas", classificationConfidence: 92,
    benchmarkIsProxy: false, dataSource: "cim",
    rmaBenchmarks: null,
  }),
  // ✓ trustScore: 88 (100 - 12 no benchmark) | high
  // ✓ flags: [BENCHMARK_UNAVAILABLE(info, -12)]
  // ✓ usableSDE: 252_000 (reported — trust >= 80)

  // ── Test 5: Retail plausible proxy ────────────────────────────────────────
  // SDE 14% vs proxy RMA 11% → ratio 1.27 → in-line → note only
  // Proxy deduction -8. Classification 85 = above 80 threshold.
  // Expected: trustScore 92 | high | usableSDE = 126_000 (reported)
  retailPlausibleMargins: normalizeDealFinancials({
    revenue: 900_000, sde: 126_000, ebitda: 108_000, price: 340_000, inventory: 85_000,
    benchmarkFamily: "retail", classificationConfidence: 85,
    benchmarkIsProxy: true, dataSource: "manual_entry",
    rmaBenchmarks: { ebitdaMarginPct: 0.11 },
  }),
  // ✓ trustScore: 92 (100 - 8 proxy) | high
  // ✓ flags: [PROXY_BENCHMARK_USED(info, -8)]
  // ✓ usableSDE: 126_000 (reported — trust >= 80)

  // ── Test 6: Mixed business — proxy + low confidence + inflated margins ─────
  // SDE 50% vs proxy 14% → ratio 3.57× → SDE_MARGIN_2X_ABOVE_BENCHMARK (-20)
  // Also: 50% > warnAbove(30%) and > hardCeiling(50%)? 50% == hardCeiling exactly → no hard ceiling flag.
  // Deductions: -20 (2× benchmark) + -8 (proxy) + -10 (low conf) = -38
  // Expected: trustScore 62 | low | usableSDE blended (trust 60-80: min(reported, benchmark))
  mixedBusinessWeakConfidence: normalizeDealFinancials({
    revenue: 550_000, sde: 275_000, ebitda: 220_000, price: 750_000,
    benchmarkFamily: "personal_services", classificationConfidence: 60,
    benchmarkIsProxy: true, dataSource: "broker_teaser",
    rmaBenchmarks: { ebitdaMarginPct: 0.14 },
  }),
  // ✓ trustScore: 57 (100 - 20 - 8 - 10 - 5 broker_teaser) | low
  // ✓ flags: [SDE_MARGIN_2X_ABOVE_BENCHMARK(warn,-20), PROXY_BENCHMARK_USED(info,-8),
  //           LOW_CLASSIFICATION_CONFIDENCE(caution,-10), SOURCE_QUALITY_REDUCED(info,-5)]
  // ✓ benchmarkSDE = 550_000 × 0.14 = 77_000
  // ✓ usableSDE = 77_000 (benchmark-implied, trust < 60)
  // ✓ getConvictionCap → "Pass / Needs Manual Review"

} as const;
