// lib/scoreExplanation.ts
// Generates human-readable score insight bullets for display in the UI.
// No technical jargon — written for buyers, not engineers.

import type { IndustryBenchmarks } from "@/lib/types/benchmarks";

// ── Fallback multiple ranges (mirrors scoringEngine.ts) ──────────────────────
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

export interface ScoreExplanationInputs {
  industry:         string;
  revenue:          number;
  sde:              number;
  multiple:         number;
  dscr:             number;
  benchmarks:       IndustryBenchmarks | null;
  benchmarkFamily?: string | null;
  // Normalization context — optional, backward compatible
  normalizationContext?: {
    earningsSource:   "reported" | "blended" | "benchmark_implied";
    trustScore:       number;
    reportedSDE:      number;
    usableSDE:        number;
    benchmarkSDE:     number | null;
    convictionBlocked: boolean;
    manualReview:     boolean;
    isProxy:          boolean;
  } | null;
  // Pre-built normalization bullets from normalizationIntegration.getScoreBasisForUI()
  normalizationBullets?: string[];
  earningsSource?:       "reported" | "blended" | "benchmark_implied";
  trustScore?:           number;
}

export interface ScoreExplanation {
  bullets:     string[];      // display-ready sentences, shown as bullet list
  hasInsights: boolean;       // false when no meaningful explanation exists
  severity:    "positive" | "neutral" | "caution" | "warning";
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Generates plain-English score insight bullets for display in the UI.
 *
 * @example
 * const explanation = generateScoreExplanation({
 *   industry: "landscaping", revenue: 500_000, sde: 62_000,
 *   multiple: 2.9, dscr: 1.4, benchmarks: rmaBenchmarks,
 * });
 * // → { bullets: ["EBITDA margin 12.4% is in line with..."], severity: "neutral" }
 */
export function generateScoreExplanation(
  inputs: ScoreExplanationInputs,
): ScoreExplanation {
  const {
    industry, revenue, sde, multiple, dscr, benchmarks,
    benchmarkFamily = null,
    normalizationBullets = [],
    reportedSDE,
    earningsSource = "reported",
    trustScore,
  } = inputs;

  const bullets: string[] = [];
  let severityScore = 0; // accumulate: positive = neg, caution = +1, warning = +2

  // ── 1. Margin plausibility (requires RMA data) ────────────────────────────
  // Proxy families (e.g. med_spa using physician RMA) use softer language.
  const PROXY_FAMILIES = new Set(["med_spa"]);
  const isProxy = PROXY_FAMILIES.has(benchmarkFamily ?? "");

  if (benchmarks?.ebitda_margin_pct && benchmarks.ebitda_margin_pct > 0 && revenue > 0) {
    const dealMarginPct  = Math.round((sde / revenue) * 100);
    const rmaMarginPct   = Math.round(benchmarks.ebitda_margin_pct * 100);
    const ratio          = (sde / revenue) / benchmarks.ebitda_margin_pct;
    const proxyLabel     = isProxy ? "proxy benchmark" : "industry typical";

    if (ratio > 1.4) {
      bullets.push(
        `Stated margin ${dealMarginPct}% vs ${proxyLabel} ~${rmaMarginPct}%`
      );
      if (isProxy) {
        // Nuanced — not a fraud flag. Med spa legitimately runs higher than physician proxy.
        bullets.push(
          "Margins exceed the closest available RMA proxy — review add-backs and confirm whether elevated margins reflect true business economics"
        );
        severityScore += 1; // caution, not warning
      } else if (ratio > 2.0) {
        bullets.push("Margin is more than 2× the industry median — high add-back scrutiny required");
        severityScore += 2;
      } else {
        bullets.push("Elevated margin may reflect legitimate owner add-backs — confirm documentation");
        severityScore += 1;
      }
    } else if (ratio < 0.8) {
      bullets.push(
        `Margin ${dealMarginPct}% is below the ${proxyLabel} ~${rmaMarginPct}% — potential underperformance or conservative add-backs`
      );
      severityScore += 1;
    } else {
      bullets.push(
        `Margin ${dealMarginPct}% is consistent with ${proxyLabel} (~${rmaMarginPct}%)`
      );
      severityScore -= 1; // positive signal
    }
  }

  // ── 1b. Normalization context bullets (inserted before DSCR when present) ──
  const nc = inputs.normalizationContext;
  if (nc) {
    if (nc.manualReview) {
      bullets.push("Manual review required — stated earnings could not be substantiated against available benchmarks");
      severityScore += 2;
    } else if (nc.earningsSource === "benchmark_implied") {
      bullets.push(
        `Trust-adjusted earnings used for valuation and DSCR — reported SDE ($${nc.reportedSDE.toLocaleString()}) set aside, benchmark-implied SDE ($${nc.usableSDE.toLocaleString()}) applied`
      );
      bullets.push("Reported earnings exceeded benchmark-supported range");
      severityScore += 2;
    } else if (nc.earningsSource === "blended") {
      bullets.push(
        `Conservative earnings blend applied — benchmark cap reduced effective SDE from $${nc.reportedSDE.toLocaleString()} to $${nc.usableSDE.toLocaleString()}`
      );
      severityScore += 1;
    }
    if (nc.isProxy && nc.earningsSource !== "reported") {
      bullets.push("Closest available proxy benchmark applied — interpret comparisons in industry context");
    }
    if (nc.convictionBlocked && !nc.manualReview) {
      bullets.push(`Trust score of ${nc.trustScore}/100 — investigate financials before advancing`);
      severityScore += 1;
    }
  }

  // ── 2. DSCR explanation ────────────────────────────────────────────────────
  if (dscr < 1.25) {
    bullets.push(
      `Debt coverage is tight at ${dscr.toFixed(2)}x — lender minimum is typically 1.25x`
    );
    severityScore += 2;
  } else if (dscr < 1.5) {
    bullets.push(
      `Debt coverage of ${dscr.toFixed(2)}x is acceptable but leaves limited buffer for downturns`
    );
    severityScore += 1;
  } else if (dscr >= 2.5) {
    bullets.push(
      `Strong debt coverage at ${dscr.toFixed(2)}x — well above lender minimums`
    );
    severityScore -= 1; // positive signal
  }

  // ── 3. Valuation explanation ───────────────────────────────────────────────
  const [lowM, highM] = FALLBACK_MULTIPLES[industry] ?? [2.0, 4.0];
  const midM = (lowM + highM) / 2;

  if (multiple > highM) {
    bullets.push(
      `Price of ${multiple.toFixed(2)}x earnings is above the typical range for this industry (${lowM}–${highM}x)`
    );
    severityScore += 2;
  } else if (multiple > midM) {
    bullets.push(
      `Price of ${multiple.toFixed(2)}x is in the upper half of the typical range (${lowM}–${highM}x)`
    );
    severityScore += 1;
  } else if (multiple < lowM) {
    bullets.push(
      `Price of ${multiple.toFixed(2)}x is below the typical range (${lowM}–${highM}x) — favorable entry point`
    );
    severityScore -= 1; // positive signal
  } else {
    bullets.push(
      `Price of ${multiple.toFixed(2)}x is within the typical market range (${lowM}–${highM}x)`
    );
  }

  // ── 4. Leverage context from RMA (bonus signal when available) ────────────
  if (benchmarks?.leverage_flag === "high") {
    bullets.push("Industry typically carries high leverage — factor into downside scenarios");
    severityScore += 1;
  } else if (benchmarks?.coverage_flag === "weak" && dscr >= 1.25) {
    bullets.push("Industry has thin interest coverage norms — negotiate conservative debt terms");
  }

  // ── Severity ──────────────────────────────────────────────────────────────
  // ── Normalization bullets: prepend before financial analysis bullets ──────
  // These explain WHY scoring used a different SDE from what was stated.
  const allBullets = [...normalizationBullets, ...bullets];

  // ── Trust score note ────────────────────────────────────────────────────────
  if (trustScore !== undefined && trustScore < 60) {
    allBullets.unshift(
      trustScore < 45
        ? `Manual review required before strong recommendation — trust score ${trustScore}/100`
        : `Investigate financials before advancing — trust score ${trustScore}/100`
    );
  }

  const severity: ScoreExplanation["severity"] =
    severityScore <= -2 ? "positive" :
    severityScore <= 0  ? "neutral"  :
    severityScore <= 2  ? "caution"  : "warning";

  return {
    bullets:     allBullets,
    hasInsights: allBullets.length > 0,
    severity:    trustScore !== undefined && trustScore < 60 ? "warning" : severity,
  };
}
