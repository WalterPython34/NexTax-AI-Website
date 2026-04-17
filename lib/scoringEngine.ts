// lib/scoringEngine.ts
// Layer 3 → Layer 4: benchmark-aware deal scoring
//
// Unit contract (critical — do not break):
//   ebitda_margin_pct, operating_margin_pct, pretax_margin_pct, return_on_assets
//     → stored as DECIMALS in rma_benchmarks (0.121 = 12.1%)
//     → the RMA import pipeline already divided by 100 before inserting
//   current_ratio, debt_to_equity, interest_coverage, asset_turnover
//     → stored as raw ratios (1.8, 2.4, 6.2) — no conversion needed
//
// V1 scope:
//   - RMA data used for: margin plausibility scoring + UI benchmark context
//   - Fair value still derived from legacy multiple range (hardcoded fallback)
//   - RMA does NOT produce fair value in V1 — no benchmark multiple source yet

import type { IndustryBenchmarks } from "@/lib/types/benchmarks";

// ── Hardcoded fallbacks (used when RMA unavailable) ───────────────────────────

const FALLBACK_MARGINS: Record<string, [number, number]> = {
  laundromat: [25, 40], hvac: [15, 30], landscaping: [10, 25], carwash: [25, 45],
  dental: [20, 40], gym: [15, 35], restaurant: [5, 15], autorepair: [15, 30],
  cleaning: [15, 30], ecommerce: [15, 35], saas: [60, 85], insurance: [20, 40],
  plumbing: [15, 30], roofing: [15, 30], petcare: [20, 40], pharmacy: [18, 30],
  daycare: [15, 30], medspa: [25, 45], accounting: [30, 55], electrical: [15, 30],
  healthcare: [15, 35], transportation: [10, 25], printing: [15, 30],
  storage: [40, 65], painting: [15, 30], security: [15, 30],
  signmaking: [15, 30], hairsalon: [15, 30], construction: [15, 30],
  grocery: [10, 15], pestcontrol: [20, 35], marketing: [20, 35],
  engineering: [20, 40], veterinary: [15, 30], realestatebrok: [15, 30],
  propertymanage: [20, 40], seniorcare: [10, 20], physicaltherapy: [20, 35],
  remodeling: [15, 25], staffing: [15, 25], gasstation: [3, 8],
};

const FALLBACK_MULTIPLES: Record<string, [number, number]> = {
  laundromat: [2.5, 4.0], hvac: [2.5, 4.5], landscaping: [1.5, 3.0],
  carwash: [3.0, 5.0], dental: [3.0, 5.5], gym: [2.0, 4.0],
  restaurant: [1.5, 3.0], autorepair: [2.0, 3.5], cleaning: [1.5, 3.0],
  ecommerce: [2.5, 4.5], saas: [3.0, 6.0], insurance: [2.0, 3.5],
  plumbing: [2.0, 4.0], roofing: [1.5, 3.5], petcare: [2.0, 4.0],
  pharmacy: [2.5, 4.0], daycare: [2.0, 4.0], medspa: [3.0, 5.0],
  accounting: [1.5, 3.5], electrical: [2.0, 4.0], healthcare: [3.0, 6.0],
  transportation: [2.0, 4.0], printing: [1.5, 3.0], storage: [4.0, 8.0],
  painting: [1.5, 3.0], security: [2.5, 4.5], signmaking: [1.9, 3.3],
  hairsalon: [1.1, 2.3], construction: [1.8, 3.2], grocery: [1.6, 3.3],
  pestcontrol: [2.0, 4.2], marketing: [1.8, 3.1], engineering: [1.8, 3.3],
  veterinary: [2.4, 4.1], realestatebrok: [1.7, 2.6], propertymanage: [1.9, 3.1],
  seniorcare: [2.0, 3.8], physicaltherapy: [1.6, 2.9], remodeling: [1.4, 2.7],
  staffing: [1.5, 3.0], gasstation: [2.5, 4.5],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreInputs {
  industry:   string;                    // nextax key e.g. "landscaping"
  revenue:    number;
  sde:        number;
  price:      number;
  benchmarks: IndustryBenchmarks | null; // null → full fallback mode
}

export interface ScoreOutputs {
  multiple:       number;
  dscr:           number;
  monthlyPayment: number;
  fairValue:      number;
  valScore:       number;
  debtScore:      number;
  marginScore:    number;
  overallScore:   number;
  riskLevel:      string;
  dataSource:     "rma" | "fallback";
  rmaBenchmarks: {
    ebitdaMarginPct:    number | null;
    operatingMarginPct: number | null;
    currentRatio:       number | null;
    debtToEquity:       number | null;
    interestCoverage:   number | null;
    leverageFlag:       string | null;
    coverageFlag:       string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true only when the benchmark object contains at least one
 * usable margin field. Guards against null, empty, or "no_data" responses.
 */
function hasUsableRmaBenchmarks(b: IndustryBenchmarks | null): b is IndustryBenchmarks {
  if (!b) return false;
  // ebitda_margin_pct is the primary field we use for scoring.
  // It is stored as a decimal (0.121) — a value of 0 is theoretically valid
  // but practically means no data, so we treat null and 0 the same way here.
  return typeof b.ebitda_margin_pct === "number" && b.ebitda_margin_pct > 0;
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function scoreDeal(inputs: ScoreInputs): ScoreOutputs {
  const { industry, revenue, sde, price, benchmarks } = inputs;

  const hasRma = hasUsableRmaBenchmarks(benchmarks);

  // ── Step 1: Multiple range (always from fallback in V1) ───────────────────
  // V1 does not use RMA to produce a fair value multiple — no benchmark
  // multiple source exists yet. Fair value stays anchored to the legacy
  // hardcoded ranges which are validated against DealStats transactions.
  const [lowM, highM] = FALLBACK_MULTIPLES[industry] ?? [2.0, 4.0];
  const midM = (lowM + highM) / 2;

  const multiple  = +(price / sde).toFixed(2);
  const fairValue = Math.round(sde * midM);

  // ── Step 2: Valuation score (against legacy multiple range) ───────────────
  let valScore: number;
  if (multiple <= midM) {
    valScore = Math.min(95, 70 + ((midM - multiple) / midM) * 50);
  } else if (multiple <= highM) {
    valScore = 70 - ((multiple - midM) / (highM - midM)) * 30;
  } else {
    valScore = Math.max(5, 40 - ((multiple - highM) / highM) * 60);
  }
  valScore = Math.round(Math.max(5, Math.min(98, valScore)));

  // ── Step 3: DSCR and debt service score ───────────────────────────────────
  const debtPct = 0.80, rate = 0.105, term = 10;
  const loan = price * debtPct;
  const mo = rate / 12, n = term * 12;
  const monthlyPayment =
    (loan * mo * Math.pow(1 + mo, n)) / (Math.pow(1 + mo, n) - 1);
  const annualDebt = monthlyPayment * 12;
  const dscr = +(sde / annualDebt).toFixed(2);

  let debtScore: number;
  if (dscr >= 2.0)       debtScore = 92;
  else if (dscr >= 1.5)  debtScore = 75 + (dscr - 1.5)  * 34;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0)  debtScore = 30 + (dscr - 1.0)  * 100;
  else                   debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  // ── Step 4: Margin plausibility score (RMA-powered when available) ─────────
  // Compares the deal's stated SDE margin against the RMA industry median
  // EBITDA margin. Flags when stated margins are implausibly high relative
  // to what RMA surveys show for the industry.
  //
  // Unit note: ebitda_margin_pct is stored as a decimal (0.121 = 12.1%).
  // No division by 100 needed here — it's already in the same unit as
  // dealMargin (sde / revenue).
  let marginScore = 55; // neutral baseline — used when RMA unavailable

  if (hasRma && revenue > 0) {
    const dealMargin    = sde / revenue;                       // e.g. 0.18 = 18%
    const rmaMedian     = benchmarks!.ebitda_margin_pct!;      // e.g. 0.121 = 12.1%
    const ratio         = dealMargin / rmaMedian;              // e.g. 1.49

    if (ratio >= 0.8 && ratio <= 1.4) {
      // Within 80–140% of RMA median — margins are plausible
      marginScore = 75 + Math.min(20, (1.0 - Math.abs(ratio - 1.0)) * 40);
    } else if (ratio > 1.4 && ratio <= 2.0) {
      // 40–100% above median — possible with owner add-backs, but flag it
      marginScore = 55 - (ratio - 1.4) * 30;
    } else if (ratio > 2.0) {
      // More than 2× industry median — high add-back scrutiny required
      marginScore = Math.max(10, 30 - (ratio - 2.0) * 20);
    } else {
      // Below median — underperformance or conservative add-backs
      marginScore = Math.max(20, 50 + ratio * 30);
    }
    marginScore = Math.round(Math.max(10, Math.min(95, marginScore)));
  }

  // ── Step 5: Composite score ────────────────────────────────────────────────
  // Weights shift slightly to make room for marginScore when RMA is present.
  // Without RMA, marginScore = 55 (neutral) so the result is near-identical
  // to the original formula: val×0.4 + debt×0.4 + 55×0.2.
  const overallScore = Math.round(
    valScore    * 0.35 +
    debtScore   * 0.35 +
    marginScore * 0.20 +
    55          * 0.10   // stable industry base
  );

  const riskLevel =
    overallScore >= 70 ? "Low" :
    overallScore >= 50 ? "Moderate" :
    overallScore >= 30 ? "High" : "Critical";

  // ── Step 6: dataSource — only "rma" when benchmarks actually used ──────────
  const dataSource: ScoreOutputs["dataSource"] = hasRma ? "rma" : "fallback";

  return {
    multiple,
    dscr,
    monthlyPayment,
    fairValue,
    valScore,
    debtScore,
    marginScore,
    overallScore,
    riskLevel,
    dataSource,
    rmaBenchmarks: hasRma ? {
      ebitdaMarginPct:    benchmarks!.ebitda_margin_pct,
      operatingMarginPct: benchmarks!.operating_margin_pct,
      currentRatio:       benchmarks!.current_ratio,
      debtToEquity:       benchmarks!.debt_to_equity,
      interestCoverage:   benchmarks!.interest_coverage,
      leverageFlag:       benchmarks!.leverage_flag,
      coverageFlag:       benchmarks!.coverage_flag,
    } : null,
  };
}

// ── SDE estimator ──────────────────────────────────────────────────────────────
// Used by bulk-import when no SDE/Cash Flow field is present in the raw listing.
// Replaces: const sde = revenue * (INDUSTRY_MARGINS[industry].mid / 100)

export function estimateSdeFromRevenue(
  revenue:    number,
  industry:   string,
  benchmarks: IndustryBenchmarks | null,
): { sde: number; source: "rma" | "fallback" } {
  // RMA ebitda_margin_pct is stored as a decimal — multiply directly.
  if (hasUsableRmaBenchmarks(benchmarks)) {
    return {
      sde:    Math.round(revenue * benchmarks.ebitda_margin_pct!),
      source: "rma",
    };
  }
  // Fallback: hardcoded midpoint margin (stored as whole percent → ÷100)
  const margins   = FALLBACK_MARGINS[industry] ?? [15, 30];
  const midMargin = (margins[0] + margins[1]) / 2 / 100;
  return {
    sde:    Math.round(revenue * midMargin),
    source: "fallback",
  };
}
