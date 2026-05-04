// lib/benchmarks/interactions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Interaction-layer logic. Reads the OUTPUT of the deterministic engine
// (financial_position rows, risk_flags, deal_structure metrics) and produces
// second-order observations:
//
//   - Tension indicator   — conflicting signals (strong DSCR + high LTV, etc.)
//   - Sensitivity insight — what happens to DSCR if the SDE outlier resolves
//   - Risk interactions   — e.g. "strong DSCR may be dependent on overstated SDE"
//   - LTV explanations    — context-aware leverage commentary
//   - Score dependencies  — fragility callouts for the financial score
//
// Pure functions, no I/O. Designed to run AFTER risk-flags.ts has executed.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  BenchmarkInputs,
  CalculatedRatios,
  DealStructureAnalysis,
  InteractionInsight,
  MetricBenchmarkRow,
  RiskFlag,
  SensitivityAnalysis,
  Strength,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  ratio: (n: number) => `${n.toFixed(2)}x`,
  pct:   (n: number) => `${n.toFixed(1)}%`,
};

const findRow = (rows: MetricBenchmarkRow[], key: string) =>
  rows.find(r => r.metric_key === key);

/**
 * Find the RMA-sourced row for a metric. Important for SDE margin where
 * we may have parallel rows from RMA (lender view) and DealStats (market view) —
 * risk flags and sensitivity should anchor on the RMA row.
 */
const findRmaRow = (rows: MetricBenchmarkRow[], key: string) =>
  rows.find(r => r.metric_key === key && r.benchmark_source === 'rma');

// ── 1. Sensitivity Analysis ──────────────────────────────────────────────────
// When SDE margin is a validation outlier (>1.5x industry median), recalculate
// DSCR using a normalized SDE (industry median margin × revenue) so the user
// can see what happens to debt coverage if the add-backs don't hold up.

export function generateSensitivity(
  inputs: BenchmarkInputs,
  ratios: CalculatedRatios,
  rows: MetricBenchmarkRow[],
): SensitivityAnalysis | null {
  // Anchor on the RMA-sourced SDE row (lender view). DealStats agreement is
  // factored into the message wording but doesn't suppress the analysis —
  // a lender will still want to see the sensitivity even if market data agrees.
  const sdeRow = findRmaRow(rows, 'sde_margin_pct');
  if (!sdeRow || sdeRow.outlier_kind !== 'validation') return null;
  if (sdeRow.industry_median === null || sdeRow.deal_value === null) return null;

  // Check whether DealStats market view agrees (deal in line with observed
  // transactions) — if so, the framing changes meaningfully.
  const marketRow = rows.find(r =>
    r.metric_key === 'sde_margin_pct' && r.benchmark_source === 'dealstats'
  );
  const marketAgrees =
    marketRow?.median_only === false &&
    marketRow?.display_percentile !== null &&
    marketRow.display_percentile !== undefined &&
    marketRow.display_percentile >= 25 &&
    marketRow.display_percentile <= 75;

  if (!ratios.annual_debt_service.ok) {
    const normalized_sde = (sdeRow.industry_median / 100) * inputs.revenue;
    return {
      source_metric: 'sde_margin_pct',
      reported_value: sdeRow.deal_value,
      industry_median: sdeRow.industry_median,
      normalized_sde,
      reported_sde: inputs.sde,
      normalized_dscr: null,
      reported_dscr: ratios.dscr.ok ? ratios.dscr.value : null,
      insight: marketAgrees
        ? `SDE is elevated vs. financial-statement industry data, but in line with observed transactions. Owner add-backs appear normal for actual SMB deals — should still be validated for lender underwriting.`
        : `SDE appears elevated relative to industry. Normalized to the ${fmt.pct(sdeRow.industry_median)} industry median, SDE would be ${fmtMoney(normalized_sde)} — meaningfully lower than the reported ${fmtMoney(inputs.sde)}.`,
    };
  }

  const normalized_sde = (sdeRow.industry_median / 100) * inputs.revenue;
  const annual_ds = ratios.annual_debt_service.value;
  const normalized_dscr = annual_ds > 0 ? normalized_sde / annual_ds : null;
  const reported_dscr = ratios.dscr.ok ? ratios.dscr.value : null;

  let insight: string;
  if (marketAgrees && normalized_dscr !== null && reported_dscr !== null) {
    // Most informative case: market validates the SDE, but lender stress
    // test still matters.
    if (normalized_dscr < 1.30) {
      insight = `Owner add-backs appear normal vs. observed transactions, but lender stress test against financial-statement peers takes DSCR from ${fmt.ratio(reported_dscr)} to ${fmt.ratio(normalized_dscr)} — below the 1.30x threshold. Validate add-backs to satisfy underwriting.`;
    } else if (normalized_dscr < 1.50) {
      insight = `Owner add-backs appear normal vs. observed transactions. Even under lender stress, DSCR holds at ${fmt.ratio(normalized_dscr)} — borderline but not breaking.`;
    } else {
      insight = `Owner add-backs appear normal vs. observed transactions, and even under lender stress DSCR holds at ${fmt.ratio(normalized_dscr)}. Sensitivity is contained.`;
    }
  } else if (normalized_dscr !== null && reported_dscr !== null) {
    if (normalized_dscr < 1.30) {
      insight = `SDE appears elevated relative to industry. If normalized to peer levels, DSCR would decline from ${fmt.ratio(reported_dscr)} to ${fmt.ratio(normalized_dscr)} — below the ${fmt.ratio(1.30)} lender threshold, potentially impacting financing viability.`;
    } else if (normalized_dscr < 1.50) {
      insight = `SDE appears elevated relative to industry. If normalized, DSCR would decline from ${fmt.ratio(reported_dscr)} to ${fmt.ratio(normalized_dscr)} — into the borderline coverage zone.`;
    } else {
      insight = `SDE appears elevated relative to industry. Even with normalized SDE, DSCR would remain at ${fmt.ratio(normalized_dscr)} — coverage holds up under stress, though the validation question still applies.`;
    }
  } else {
    insight = `SDE appears elevated relative to industry. Recommend validating add-backs before relying on reported earnings.`;
  }

  return {
    source_metric: 'sde_margin_pct',
    reported_value: sdeRow.deal_value,
    industry_median: sdeRow.industry_median,
    normalized_sde,
    reported_sde: inputs.sde,
    normalized_dscr,
    reported_dscr,
    insight,
  };
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// ── 2. Risk Interaction Logic ────────────────────────────────────────────────
// Cross-domain rules that look at multiple metrics together.

export function generateInteractionInsights(
  ratios: CalculatedRatios,
  rows: MetricBenchmarkRow[],
  ds: DealStructureAnalysis | undefined,
): InteractionInsight[] {
  const insights: InteractionInsight[] = [];

  // Rule: SDE validation outlier (per RMA / financial-statement view) + DSCR > 2.0
  // → "Strong DSCR may be dependent on elevated SDE"
  const sdeRow = findRmaRow(rows, 'sde_margin_pct');
  const isSdeValidation = sdeRow?.outlier_kind === 'validation';
  if (isSdeValidation && ratios.dscr.ok && ratios.dscr.value > 2.0) {
    insights.push({
      severity: 'high',
      rule: 'sde_outlier_dscr_dependency',
      message: `Strong DSCR (${fmt.ratio(ratios.dscr.value)}) may be dependent on elevated SDE. If add-backs are overstated, debt coverage could compress materially.`,
      metrics: ['sde_margin_pct', 'dscr'],
    });
  }

  // Rule: Enhanced LTV explanation when LTV > 80%
  // (always renders alongside the existing LTV status — adds nuance)
  const ltvMetric = ds?.metrics.find(m => m.key === 'ltv');
  const ltvValue = ltvMetric?.value ?? null;
  if (ltvValue !== null && ltvValue > 0.80) {
    // Add a stronger explanation when the deal also has strong cash flow
    const hasStrongDscr = ratios.dscr.ok && ratios.dscr.value >= 1.50;
    insights.push({
      severity: ltvValue > 0.90 ? 'high' : 'medium',
      rule: 'high_ltv_with_context',
      message: hasStrongDscr
        ? `Despite strong cash flow, leverage remains high relative to purchase price (LTV ${(ltvValue * 100).toFixed(0)}%) — increasing lender risk exposure if earnings compress.`
        : `Leverage is high relative to purchase price (LTV ${(ltvValue * 100).toFixed(0)}%) — limited equity cushion for the senior lender.`,
      metrics: ['ltv', 'dscr'],
    });
  }

  return insights;
}

// ── 3. Tension Indicator ─────────────────────────────────────────────────────
// Surfaces conflicting signals at the top of the analysis. Returns null if
// the deal is internally consistent (all-good, all-bad, or middle-ground).

export function generateTensionIndicator(
  ratios: CalculatedRatios,
  rows: MetricBenchmarkRow[],
  ds: DealStructureAnalysis | undefined,
  insights: InteractionInsight[],
): string | null {
  const sdeRow = findRmaRow(rows, 'sde_margin_pct');
  const isSdeValidation = sdeRow?.outlier_kind === 'validation';
  const hasStrongDscr = ratios.dscr.ok && ratios.dscr.value >= 1.50;

  const ltvMetric = ds?.metrics.find(m => m.key === 'ltv');
  const ltvValue = ltvMetric?.value ?? null;
  const isHighLtv = ltvValue !== null && ltvValue > 0.80;

  const dtsMetric = ds?.metrics.find(m => m.key === 'debt_to_sde');
  const isAggressiveLeverage = dtsMetric?.status === 'Aggressive';

  // Trigger conditions:
  //   - Strong DSCR + validation outlier (cash flow looks great BUT it's suspicious)
  //   - Strong DSCR + high LTV (cash flow is fine BUT structure is risky)
  //   - Strong DSCR + aggressive Debt/SDE
  //   - Validation outlier + high LTV (suspicious earnings + thin equity)
  const conflicts: string[] = [];
  if (hasStrongDscr && isSdeValidation) conflicts.push('cash-flow strength is dependent on elevated SDE');
  if (hasStrongDscr && isHighLtv)       conflicts.push('strong coverage paired with high senior-debt exposure');
  if (hasStrongDscr && isAggressiveLeverage) conflicts.push('strong coverage paired with aggressive total leverage');
  if (isSdeValidation && isHighLtv)     conflicts.push('elevated SDE combined with thin equity cushion');

  if (conflicts.length === 0) return null;

  // Build a single concise message
  if (conflicts.length === 1) {
    return `Mixed signals: ${conflicts[0]}. Further diligence required.`;
  }
  return `Mixed signals: strong cash flow metrics vs structural or quality risks (${conflicts.length} conflicts identified). Further diligence required.`;
}

// ── 4. Score Risk Dependencies ───────────────────────────────────────────────
// What would break the financial score if challenged. Different from drivers
// (positive contributors); these highlight fragility.

export function generateScoreDependencies(
  ratios: CalculatedRatios,
  rows: MetricBenchmarkRow[],
  ds: DealStructureAnalysis | undefined,
  sensitivity: SensitivityAnalysis | null,
  financial_score: number | null,
): string[] {
  if (financial_score === null) return [];

  const deps: string[] = [];

  // SDE accuracy is the biggest single dependency when it's outlier-classified
  const sdeRow = findRmaRow(rows, 'sde_margin_pct');
  if (sdeRow?.outlier_kind === 'validation') {
    if (sensitivity?.normalized_dscr !== null && sensitivity?.normalized_dscr !== undefined && sensitivity.normalized_dscr < 1.30) {
      deps.push('Score highly dependent on SDE accuracy — coverage falls below lender threshold if normalized');
    } else {
      deps.push('Score highly dependent on SDE accuracy — validation outlier on margins');
    }
  }

  // DSCR strength when sources & uses don't balance — fragile
  if (ratios.dscr.ok && ratios.dscr.value >= 1.50 && ds && !ds.sources_uses.balanced) {
    deps.push('Cash flow score depends on a deal structure that does not currently balance');
  }

  // High LTV undermines leverage component of the score
  const ltvMetric = ds?.metrics.find(m => m.key === 'ltv');
  if (ltvMetric?.status === 'Very High' || ltvMetric?.status === 'High') {
    deps.push('Leverage risk elevated despite strong DSCR — score does not fully capture LTV exposure');
  }

  // Aggressive Debt/SDE is a distinct dependency
  const dtsMetric = ds?.metrics.find(m => m.key === 'debt_to_sde');
  if (dtsMetric?.status === 'Aggressive') {
    deps.push('Total debt load is aggressive relative to earnings — small SDE compression could break coverage');
  }

  // Liquidity dependency: if current ratio is the score's main contributor
  // but accounts payable could spike
  const crRow = findRow(rows, 'current_ratio');
  const sdeRmaRow = findRmaRow(rows, 'sde_margin_pct');
  if (crRow?.outlier_kind === 'strong' && (!sdeRmaRow?.deal_value || sdeRmaRow.deal_value < (sdeRmaRow.industry_median ?? 0))) {
    deps.push('Liquidity score elevated by working-capital position; underlying profitability is below industry');
  }

  return deps;
}

// ── 5. Top-level orchestrator ────────────────────────────────────────────────
// Single entry point the API route calls.

export interface InteractionLayerInput {
  inputs: BenchmarkInputs;
  ratios: CalculatedRatios;
  rows: MetricBenchmarkRow[];
  ds: DealStructureAnalysis | undefined;
  financial_score: number | null;
}

export interface InteractionLayerOutput {
  tension_indicator: string | null;
  interaction_insights: InteractionInsight[];
  sensitivity: SensitivityAnalysis | null;
  score_risk_dependencies: string[];
}

export function runInteractionLayer(input: InteractionLayerInput): InteractionLayerOutput {
  const sensitivity = generateSensitivity(input.inputs, input.ratios, input.rows);
  const interaction_insights = generateInteractionInsights(input.ratios, input.rows, input.ds);
  const tension_indicator = generateTensionIndicator(input.ratios, input.rows, input.ds, interaction_insights);
  const score_risk_dependencies = generateScoreDependencies(
    input.ratios, input.rows, input.ds, sensitivity, input.financial_score,
  );

  return {
    tension_indicator,
    interaction_insights,
    sensitivity,
    score_risk_dependencies,
  };
}
