// lib/normalizationEngine.ts
// NexTax Normalization Layer — V2 + Circuit Breaker (Phase 1)
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
//
// V2.1 circuit breaker: DELETED in E4 Phase 4. With earningsSource fixed at
// "reported" (v2 structural no-replacement) the breaker was unreachable.
// normalization_mode is "reported" by construction; the "stress_case" member
// of the type union is retained ONLY because legacy persisted rows carry it.

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

export type DataSourceType =
  | "manual_entry"
  | "marketplace"
  | "broker_teaser"
  | "cim"
  | "user_validated";

export interface NormalizationFlag {
  code:      string;
  severity:  "info" | "caution" | "warning" | "critical";
  title:     string;
  message:   string;
  deduction: number;
  field:     "earnings" | "margins" | "price" | "revenue" | "classification" | "benchmark" | "source";
}

export interface NormalizationAdjustment {
  reason:    string;
  deduction: number;
  source:    "input_anomaly" | "margin_plausibility" | "benchmark" | "classification" | "data_source";
}

export interface NormalizedEarnings {
  reportedSDE:    number;
  benchmarkSDE:   number | null;
  usableSDE:      number;
  valuationSDE:   number;
  debtServiceSDE: number;
  earningsSource: "reported" | "blended" | "benchmark_implied";
}

/** Full normalized output. */
export interface NormalizedDealFinancials {
  raw: RawDealFinancials;
  statedSdeMargin:       number | null;
  statedEbitdaMargin:    number | null;
  impliedMultiple:       number | null;
  benchmarkEbitdaMargin: number | null;
  earnings: NormalizedEarnings;
  trustScore:      number;
  confidenceLevel: "high" | "medium" | "low";
  flags:       NormalizationFlag[];
  adjustments: NormalizationAdjustment[];
  notes:       string[];
  // Circuit breaker / hybrid model fields (Phase 1)
  normalization_mode:       "reported" | "adjusted" | "stress_case";
  underwritten_sde:         number;
  sde_confidence:           number;
  investigation_required:   boolean;
  investigation_reasons:    string[];
  investigation_questions:  string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

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

const DEFAULT_CEILING = { warnAbove: 0.45, hardCeiling: 0.70, label: "business" };

const PROXY_FAMILIES = new Set([
  "med_spa", "behavioral_health", "manufacturing", "retail", "wholesale",
]);

const SOURCE_QUALITY_DEDUCTIONS: Record<DataSourceType, number> = {
  cim:            0,
  user_validated: 0,
  manual_entry:   0,
  marketplace:    5,
  broker_teaser:  5,
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
  // ═══════════════════════════════════════════════════════════════════════════

  const revEqSde    = rev > 0 && rev === sdeV;
  const revEqEbit   = rev > 0 && rev === ebitV;
  const sdeEqEbit   = sdeV > 0 && sdeV === ebitV;
  const allIdentical = revEqSde && revEqEbit && sdeV > 0;

  if (allIdentical) {
    addFlag({
      code:      "TRIPLE_DUPLICATE_FINANCIALS",
      severity:  "critical",
      title:     "Identical Financial Fields",
      message:   `Revenue, SDE, and EBITDA are all reported as ${fmt(rev)}. This is characteristic of a data entry error or broker system auto-fill. Manual verification is required before advancing this deal.`,
      deduction: 40,
      field:     "earnings",
    });
  } else {
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
  // ═══════════════════════════════════════════════════════════════════════════

  // C1. Universal ceiling
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

  // C2. Industry-specific ceiling
  if (!allIdentical && statedSdeMargin !== null && rev > 0) {
    const { warnAbove, hardCeiling, label } = familyCeiling;

    if (statedSdeMargin > hardCeiling && statedSdeMargin < 0.95) {
      addFlag({
        code:      "SDE_MARGIN_ABOVE_INDUSTRY_CEILING",
        severity:  "warning",
        title:     "Above Industry Ceiling — SDE Margin",
        message:   `SDE margin of ${pct(statedSdeMargin)} exceeds the ${label} ceiling of ${pct(hardCeiling)}. This level of outperformance requires rigorous add-back substantiation. Request itemized adjustments from the seller's accountant.`,
        deduction: 15,
        field:     "margins",
      });
    } else if (statedSdeMargin > warnAbove && statedSdeMargin <= hardCeiling) {
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

  // C3. Benchmark comparison
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
      addFlag({
        code:      "SDE_MARGIN_ABOVE_BENCHMARK",
        severity:  "caution",
        title:     isProxy ? "Above Proxy Benchmark" : "Above Industry Benchmark",
        message:   `SDE margin (${dealPct}) is ${Math.round(ratio * 100 - 100)}% above the ${bm} (${bmPct}). ${isProxy ? "Review add-backs in the context of this industry's typical economics." : "Elevated margins may reflect legitimate add-backs — confirm documentation."}`,
        deduction: 0,
        field:     "margins",
      });
    } else if (ratio < 0.6) {
      addFlag({
        code:      "SDE_MARGIN_BELOW_BENCHMARK",
        severity:  "caution",
        title:     "Below Industry Benchmark",
        message:   `SDE margin (${dealPct}) is materially below the ${bm} (${bmPct}). This may indicate above-market owner compensation, excess overhead, or genuine underperformance. Investigate operating cost structure before advancing.`,
        deduction: 0,
        field:     "margins",
      });
    } else {
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
  // NORMALIZED EARNINGS — v2 STRUCTURAL NO-REPLACEMENT (E4 Phase 1, score v2.0)
  //
  // Locked principle: reported financials are facts. AcquiFlow never silently
  // overwrites user-entered earnings. Divergence informs the confidence grade
  // and conviction cap (lib/investigationEngine.ts) — the single permitted
  // channel — and NEVER the earnings basis.
  //
  // usableSDE = reportedSDE, unconditionally. benchmarkSDE remains computed
  // as an observation value only (superseded for display by
  // industry_reference_sde from the E3 observation layer).
  //
  // The trust gate that previously lived here (>=80 reported / 60–79 blend /
  // <60 replace) is retired PERMANENTLY. The circuit breaker that followed it
  // was deleted in E4 Phase 4: with earningsSource fixed at "reported" its
  // condition could never be true, and usableSDE always equals reported SDE.
  // History: the trust gate, fed by a definitionally mismatched EBITDA-margin
  // basis, destroyed a legitimate deal for a SearchFunder user. Do not
  // reintroduce under any threshold.
  // ═══════════════════════════════════════════════════════════════════════════

  const benchmarkSDE = hasBenchmark ? Math.round(rev * benchmarkEbitdaMargin!) : null;

  const usableSDE: number = sdeV;
  const earningsSource: NormalizedEarnings["earningsSource"] = "reported";

  // [E4 P4] With usableSDE === reported SDE by construction, the mode is
  // always "reported" and the investigation fields are empty defaults. They
  // stay in the return object so the type and every consumer are unchanged.
  const normalization_mode: NormalizedDealFinancials["normalization_mode"] = "reported";
  const underwritten_sde = sdeV;
  const investigation_required = false;
  const investigation_reasons: string[] = [];
  const investigation_questions: string[] = [];
  const sde_confidence = trustScore;

  const earnings: NormalizedEarnings = {
    reportedSDE:    sdeV,
    benchmarkSDE,
    usableSDE,
    valuationSDE:   usableSDE,
    debtServiceSDE: usableSDE,
    earningsSource,
  };

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
    normalization_mode,
    underwritten_sde,
    sde_confidence,
    investigation_required,
    investigation_reasons,
    investigation_questions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizationSummary {
  trustLabel:          string;
  topFlags:            NormalizationFlag[];
  topAdjustments:      NormalizationAdjustment[];
  blockHighConviction: boolean;
  earningsSummary:     string;
}

const SEVERITY_ORDER = { critical: 0, warning: 1, caution: 2, info: 3 };

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

  cleanLandscaping: normalizeDealFinancials({
    revenue: 650_000, sde: 117_000, ebitda: 105_000, price: 320_000,
    benchmarkFamily: "field_services", classificationConfidence: 92,
    benchmarkIsProxy: false, dataSource: "manual_entry",
    rmaBenchmarks: { ebitdaMarginPct: 0.121 },
  }),

  medSpaDuplicateValues: normalizeDealFinancials({
    revenue: 480_000, sde: 480_000, ebitda: 480_000, price: 1_200_000,
    benchmarkFamily: "med_spa", classificationConfidence: 92,
    benchmarkIsProxy: true, dataSource: "marketplace",
    rmaBenchmarks: { ebitdaMarginPct: 0.184 },
  }),

  restaurantLowMargin: normalizeDealFinancials({
    revenue: 1_200_000, sde: 48_000, ebitda: 36_000, price: 95_000,
    benchmarkFamily: "food_beverage", classificationConfidence: 92,
    benchmarkIsProxy: false, dataSource: "broker_teaser",
    rmaBenchmarks: { ebitdaMarginPct: 0.082 },
  }),

  saasNoBenchmark: normalizeDealFinancials({
    revenue: 420_000, sde: 252_000, ebitda: 231_000, price: 1_500_000,
    benchmarkFamily: "saas", classificationConfidence: 92,
    benchmarkIsProxy: false, dataSource: "cim",
    rmaBenchmarks: null,
  }),

  retailPlausibleMargins: normalizeDealFinancials({
    revenue: 900_000, sde: 126_000, ebitda: 108_000, price: 340_000, inventory: 85_000,
    benchmarkFamily: "retail", classificationConfidence: 85,
    benchmarkIsProxy: true, dataSource: "manual_entry",
    rmaBenchmarks: { ebitdaMarginPct: 0.11 },
  }),

  mixedBusinessWeakConfidence: normalizeDealFinancials({
    revenue: 550_000, sde: 275_000, ebitda: 220_000, price: 750_000,
    benchmarkFamily: "personal_services", classificationConfidence: 60,
    benchmarkIsProxy: true, dataSource: "broker_teaser",
    rmaBenchmarks: { ebitdaMarginPct: 0.14 },
  }),

  // Extreme-margin test: marketing deal that triggered the beta failure.
  // [E4 P4] Post-v2 expectations: usableSDE = 792_000 (reported, always),
  // normalization_mode = "reported", investigation fields empty. Divergence
  // is surfaced through the confidence grade / observation layer instead.
  marketingCircuitBreaker: normalizeDealFinancials({
    revenue: 1_102_000, sde: 792_000, ebitda: 792_000, price: 3_300_000,
    benchmarkFamily: "professional_services", classificationConfidence: 85,
    benchmarkIsProxy: false, dataSource: "manual_entry",
    rmaBenchmarks: { ebitdaMarginPct: 0.06 },
  }),

} as const;
