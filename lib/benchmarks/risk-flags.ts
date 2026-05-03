// lib/benchmarks/risk-flags.ts
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic rule-based risk flag generator. NO AI. Every flag references
// a specific metric, threshold, and direction of deviation, per the spec.
//
// This module is intentionally narrow — it ONLY converts calculated ratios +
// benchmarks into flags and strengths. The AI layer (separate /api/benchmarks/
// interpret endpoint) reads these flags but never overrides them.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CalculatedRatios,
  MetricBenchmarkRow,
  RiskFlag,
  Strength,
  DealStructureInputs,
  DealStructureMetric,
  DealStructureAnalysis,
  DealStructureStatus,
  StatusColor,
} from './types';

// ── Threshold constants (from spec, V1) ──────────────────────────────────────

export const THRESHOLDS = {
  dscr: {
    risk:       1.30,   // < 1.30 → financing risk
    borderline: 1.50,   // 1.30 - 1.49 → borderline; >= 1.50 → strong
  },
  current_ratio: {
    liquidity_risk: 1.20,   // < 1.20 → liquidity risk
  },
  outlier: {
    high: 1.5,   // > 1.5x median → high outlier
    low:  0.75,  // < 0.75x median → low outlier
  },
  debt_to_sde: {
    conservative: 2.5,   // < 2.5 → Conservative
    normal:       3.5,   // 2.5 - 3.5 → Normal
    elevated:     4.5,   // 3.5 - 4.5 → Elevated; > 4.5 → Aggressive
  },
  ltv: {
    conservative: 0.65,  // < 65% → Conservative
    typical:      0.80,  // 65-80% → Typical
    high:         0.90,  // 80-90% → High; > 90% → Very High
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  // Format ratio with 2 decimals + 'x' suffix, e.g. 1.225 → "1.22x"
  ratio: (n: number) => `${n.toFixed(2)}x`,
  // Format as percent with 1 decimal, e.g. 28.456 → "28.5%"
  pct: (n: number) => `${n.toFixed(1)}%`,
  // Format dollar amount with no decimals
  money: (n: number) => `$${Math.round(n).toLocaleString()}`,
};

// ── OPERATING risk flag generators ───────────────────────────────────────────

/**
 * DSCR-based financing risk. Triggered against the lender threshold, not
 * against industry benchmarks (DSCR isn't an RMA metric).
 */
function dscrFlag(ratios: CalculatedRatios): RiskFlag | null {
  const r = ratios.dscr;
  if (!r.ok) return null;
  if (r.value < THRESHOLDS.dscr.risk) {
    return {
      severity: 'high',
      metric_key: 'dscr',
      message: `DSCR of ${fmt.ratio(r.value)} is below the ${fmt.ratio(THRESHOLDS.dscr.risk)} lender threshold — financing at risk.`,
      rule: 'dscr_below_sba_threshold',
    };
  }
  if (r.value < THRESHOLDS.dscr.borderline) {
    return {
      severity: 'medium',
      metric_key: 'dscr',
      message: `DSCR of ${fmt.ratio(r.value)} is in the borderline range (${fmt.ratio(THRESHOLDS.dscr.risk)}–${fmt.ratio(THRESHOLDS.dscr.borderline)}) — limited cushion under stress.`,
      rule: 'dscr_borderline',
    };
  }
  return null;
}

function dscrStrength(ratios: CalculatedRatios): Strength | null {
  const r = ratios.dscr;
  if (!r.ok) return null;
  if (r.value >= THRESHOLDS.dscr.borderline) {
    return {
      metric_key: 'dscr',
      message: `DSCR of ${fmt.ratio(r.value)} comfortably exceeds the ${fmt.ratio(THRESHOLDS.dscr.borderline)} lender comfort level.`,
    };
  }
  return null;
}

/**
 * Current ratio liquidity risk. Hard threshold (<1.20) per spec.
 */
function currentRatioFlag(ratios: CalculatedRatios): RiskFlag | null {
  const r = ratios.current_ratio;
  if (!r.ok) return null;
  if (r.value < THRESHOLDS.current_ratio.liquidity_risk) {
    return {
      severity: 'high',
      metric_key: 'current_ratio',
      message: `Current ratio of ${fmt.ratio(r.value)} is below ${fmt.ratio(THRESHOLDS.current_ratio.liquidity_risk)} — liquidity risk.`,
      rule: 'current_ratio_below_liquidity_floor',
    };
  }
  return null;
}

/**
 * Outlier detection on benchmarked metrics. Compares deal value to industry
 * median. >1.5x median = high outlier (suspicious for SDE margin); <0.75x
 * = low outlier (efficiency concern for inventory turnover).
 *
 * Note: this works off MetricBenchmarkRow because we need the benchmark
 * median to compare against. Skipped when no benchmark exists.
 */
function outlierFlags(rows: MetricBenchmarkRow[]): RiskFlag[] {
  const flags: RiskFlag[] = [];

  for (const row of rows) {
    if (row.deal_value === null || row.industry_median === null || row.industry_median === 0) continue;

    const ratio = row.deal_value / row.industry_median;

    // High outlier — only flag for metrics where "too high" is a credibility issue
    if (ratio > THRESHOLDS.outlier.high) {
      // SDE margin at 1.5x median → validation risk (inflated add-backs)
      if (row.metric_key === 'sde_margin_pct') {
        flags.push({
          severity: 'high',
          metric_key: row.metric_key,
          message: `SDE margin of ${fmt.pct(row.deal_value)} is ${ratio.toFixed(1)}x the industry median (${fmt.pct(row.industry_median)}) — validate add-backs.`,
          rule: 'sde_margin_high_outlier',
        });
      } else if (row.metric_key === 'gross_margin_pct') {
        flags.push({
          severity: 'medium',
          metric_key: row.metric_key,
          message: `Gross margin of ${fmt.pct(row.deal_value)} is ${ratio.toFixed(1)}x the industry median — confirm cost classification.`,
          rule: 'gross_margin_high_outlier',
        });
      }
    }

    // Low outlier — flag for metrics where "too low" is bad
    if (ratio < THRESHOLDS.outlier.low) {
      if (row.metric_key === 'inventory_turnover') {
        flags.push({
          severity: 'medium',
          metric_key: row.metric_key,
          message: `Inventory turnover of ${fmt.ratio(row.deal_value)} is ${ratio.toFixed(2)}x the industry median (${fmt.ratio(row.industry_median)}) — operational inefficiency.`,
          rule: 'inventory_turnover_low_outlier',
        });
      }
    }
  }

  return flags;
}

/**
 * Build operating-side flags from calculated ratios + benchmark rows.
 */
export function generateOperatingFlags(
  ratios: CalculatedRatios,
  benchmarkRows: MetricBenchmarkRow[],
): { flags: RiskFlag[]; strengths: Strength[] } {
  const flags: RiskFlag[] = [];
  const strengths: Strength[] = [];

  const dscrF = dscrFlag(ratios);
  if (dscrF) flags.push(dscrF);
  const dscrS = dscrStrength(ratios);
  if (dscrS) strengths.push(dscrS);

  const crF = currentRatioFlag(ratios);
  if (crF) flags.push(crF);

  flags.push(...outlierFlags(benchmarkRows));

  // Sort high → medium → low → info
  const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
  flags.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return { flags, strengths };
}

// ── DEAL STRUCTURE & LEVERAGE analysis ───────────────────────────────────────
// Per the build spec, this is a SEPARATE card with its own logic. We do NOT
// compare any of these to RMA. The thresholds are lender-rule-based.

/** True when a number is finite and > 0. */
const positive = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/** True when a number is finite and >= 0. */
const nonNeg = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0;

function dscrStructureMetric(inputs: DealStructureInputs): DealStructureMetric {
  if (!positive(inputs.sde) || !positive(inputs.annual_debt_service)) {
    return {
      key: 'dscr',
      label: 'DSCR',
      value: null,
      display: '—',
      status: 'Insufficient Data',
      status_color: null,
      explanation: 'Need SDE and annual debt service to compute coverage.',
    };
  }
  const v = inputs.sde / inputs.annual_debt_service;
  let status: DealStructureStatus;
  let color: StatusColor;
  let explanation: string;
  if (v < THRESHOLDS.dscr.risk) {
    status = 'Risk';
    color = 'red';
    explanation = `Below the ${fmt.ratio(THRESHOLDS.dscr.risk)} lender threshold — debt service uncovered.`;
  } else if (v < THRESHOLDS.dscr.borderline) {
    status = 'Borderline';
    color = 'yellow';
    explanation = `Limited cushion — coverage is thin if SDE compresses.`;
  } else {
    status = 'Strong';
    color = 'green';
    explanation = `Comfortable coverage — debt service well-supported by cash flow.`;
  }
  return { key: 'dscr', label: 'DSCR', value: v, display: fmt.ratio(v), status, status_color: color, explanation };
}

function debtToSdeMetric(inputs: DealStructureInputs): DealStructureMetric {
  const totalDebt = (inputs.senior_debt ?? 0) + (inputs.seller_note ?? 0);
  if (!positive(inputs.sde) || !positive(totalDebt)) {
    return {
      key: 'debt_to_sde',
      label: 'Debt / SDE',
      value: null,
      display: '—',
      status: 'Insufficient Data',
      status_color: null,
      explanation: 'Need senior debt + seller note + SDE to compute leverage.',
    };
  }
  const v = totalDebt / inputs.sde;
  let status: DealStructureStatus;
  let color: StatusColor;
  let explanation: string;
  if (v < THRESHOLDS.debt_to_sde.conservative) {
    status = 'Conservative';
    color = 'green';
    explanation = `Low leverage — significant equity buffer.`;
  } else if (v < THRESHOLDS.debt_to_sde.normal) {
    status = 'Normal';
    color = 'blue';
    explanation = `In line with typical SBA-financed acquisition leverage.`;
  } else if (v < THRESHOLDS.debt_to_sde.elevated) {
    status = 'Elevated';
    color = 'yellow';
    explanation = `Higher than typical — debt service consumes a meaningful share of SDE.`;
  } else {
    status = 'Aggressive';
    color = 'red';
    explanation = `Very high leverage — small SDE compression could break coverage.`;
  }
  return { key: 'debt_to_sde', label: 'Debt / SDE', value: v, display: fmt.ratio(v), status, status_color: color, explanation };
}

function ltvMetric(inputs: DealStructureInputs): DealStructureMetric {
  if (!positive(inputs.purchase_price) || !positive(inputs.senior_debt)) {
    return {
      key: 'ltv',
      label: 'Loan-to-Value',
      value: null,
      display: '—',
      status: 'Insufficient Data',
      status_color: null,
      explanation: 'Need purchase price and senior debt to compute LTV.',
    };
  }
  const v = inputs.senior_debt / inputs.purchase_price;
  let status: DealStructureStatus;
  let color: StatusColor;
  let explanation: string;
  if (v < THRESHOLDS.ltv.conservative) {
    status = 'Conservative';
    color = 'green';
    explanation = `Buyer is contributing significant equity — strong margin of safety.`;
  } else if (v < THRESHOLDS.ltv.typical) {
    status = 'Typical';
    color = 'blue';
    explanation = `Standard SBA-style LTV — acceptable to most lenders.`;
  } else if (v < THRESHOLDS.ltv.high) {
    status = 'High';
    color = 'yellow';
    explanation = `Senior lender is taking on more risk — may require additional collateral.`;
  } else {
    status = 'Very High';
    color = 'red';
    explanation = `Senior debt approaches the full purchase price — minimal equity cushion.`;
  }
  return { key: 'ltv', label: 'Loan-to-Value', value: v, display: `${(v * 100).toFixed(0)}%`, status, status_color: color, explanation };
}

/**
 * Sources & Uses balance check.
 *   Uses = Purchase Price + Working Capital Needed
 *   Sources = Buyer Equity + Senior Debt + Seller Note
 * Allow a 1% rounding tolerance.
 */
function sourcesUsesCheck(inputs: DealStructureInputs) {
  const purchase_price = nonNeg(inputs.purchase_price) ? inputs.purchase_price : 0;
  const buyer_equity = nonNeg(inputs.buyer_equity) ? inputs.buyer_equity : 0;
  const senior_debt = nonNeg(inputs.senior_debt) ? inputs.senior_debt : 0;
  const seller_note = nonNeg(inputs.seller_note) ? inputs.seller_note : 0;
  const wc = nonNeg(inputs.working_capital_needed) ? inputs.working_capital_needed : 0;

  const total_uses = purchase_price + wc;
  const total_sources = buyer_equity + senior_debt + seller_note;
  const tolerance = total_uses * 0.01;
  const balanced = Math.abs(total_uses - total_sources) <= Math.max(tolerance, 100);

  return {
    purchase_price,
    buyer_equity,
    senior_debt,
    seller_note,
    working_capital_needed: wc,
    total_uses,
    total_sources,
    balanced,
  };
}

function dealStructureFlags(metrics: DealStructureMetric[], sourcesUses: ReturnType<typeof sourcesUsesCheck>): RiskFlag[] {
  const flags: RiskFlag[] = [];

  for (const m of metrics) {
    if (m.status === 'Risk' || m.status === 'Aggressive' || m.status === 'Very High') {
      flags.push({
        severity: 'high',
        metric_key: m.key,
        message: `${m.label}: ${m.explanation}`,
        rule: `${m.key}_${m.status.toLowerCase().replace(/\s+/g, '_')}`,
      });
    } else if (m.status === 'Borderline' || m.status === 'Elevated' || m.status === 'High') {
      flags.push({
        severity: 'medium',
        metric_key: m.key,
        message: `${m.label}: ${m.explanation}`,
        rule: `${m.key}_${m.status.toLowerCase()}`,
      });
    }
  }

  if (!sourcesUses.balanced && sourcesUses.total_uses > 0) {
    const gap = sourcesUses.total_uses - sourcesUses.total_sources;
    flags.push({
      severity: 'medium',
      metric_key: 'sources_uses',
      message: `Sources & Uses don't balance — ${gap > 0 ? 'short' : 'over'} by ${fmt.money(Math.abs(gap))}.`,
      rule: 'sources_uses_unbalanced',
    });
  }

  return flags;
}

function dealStructureInterpretation(metrics: DealStructureMetric[]): string[] {
  const lines: string[] = [];

  // Pull out the named metrics
  const dscr = metrics.find(m => m.key === 'dscr');
  const dts  = metrics.find(m => m.key === 'debt_to_sde');
  const ltv  = metrics.find(m => m.key === 'ltv');

  if (dscr?.status === 'Risk') {
    lines.push('Coverage is below lender minimums — the deal as structured will struggle to qualify for senior debt.');
  } else if (dscr?.status === 'Borderline') {
    lines.push('Coverage is thin — small declines in earnings could break debt service.');
  } else if (dscr?.status === 'Strong') {
    lines.push('Cash flow comfortably supports proposed debt service.');
  }

  if (dts?.status === 'Aggressive') {
    lines.push('Total leverage is aggressive relative to earnings — limited margin for execution risk.');
  } else if (dts?.status === 'Conservative') {
    lines.push('Buyer is contributing material equity — leverage is well-supported.');
  }

  if (ltv?.status === 'Very High' || ltv?.status === 'High') {
    lines.push('Senior lender exposure is elevated — additional collateral or seller note carve-out may be required.');
  }

  // If everything is fine, give one overall positive line
  if (lines.length === 0) {
    lines.push('Deal structure metrics fall within typical lender comfort ranges.');
  }

  return lines;
}

/**
 * Top-level: build the full Deal Structure & Leverage analysis.
 */
export function analyzeDealStructure(inputs: DealStructureInputs): DealStructureAnalysis {
  const metrics: DealStructureMetric[] = [
    dscrStructureMetric(inputs),
    debtToSdeMetric(inputs),
    ltvMetric(inputs),
  ];
  const sources_uses = sourcesUsesCheck(inputs);
  const flags = dealStructureFlags(metrics, sources_uses);
  const interpretation = dealStructureInterpretation(metrics);

  return { metrics, sources_uses, flags, interpretation };
}
