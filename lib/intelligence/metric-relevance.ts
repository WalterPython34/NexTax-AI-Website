// lib/intelligence/metric-relevance.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Underwriting Intelligence Engine — Metric Relevance Registry
//
// CP-2 Module: Per-metric metadata declaring directionality, normal ranges,
// lender relevance, durability weighting, confidence behavior, and expected
// source minimums. Industry-specific overrides apply on top.
//
// Every metric the engine reasons about appears here. The metric-relevance
// layer is what makes per-industry interaction rules possible — a rule that
// asks "is gross margin meaningful for this deal?" gets its answer here
// rather than fabricating a default.
//
// See Section 5 of the Underwriting Constitution for per-fingerprint
// metric assignments. This module provides the underlying per-metric
// metadata that fingerprints reference by key.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MetricRelevance,
  MetricRelevanceOverride,
  MetricKey,
  IndustryKey,
} from "./types";
import { REGISTRY_VERSION } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BASE METRIC RELEVANCE TABLE
// ─────────────────────────────────────────────────────────────────────────────

export const METRIC_RELEVANCE: ReadonlyArray<MetricRelevance> = [
  // ── PROFITABILITY ─────────────────────────────────────────────────────────

  {
    metric_key: "gross_margin_pct",
    display_name: "Gross Margin",
    category: "profitability",
    directionality: "higher_is_better",
    normal_range: { low: 25, high: 65 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.7,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Gross margin tells the underwriter how much pricing power and " +
      "cost discipline the business has at the product/service level. For " +
      "service businesses with no COGS classification, this metric is " +
      "suppressed at the fingerprint level rather than defaulted.",
  },

  {
    metric_key: "sde_margin_pct",
    display_name: "SDE Margin",
    category: "profitability",
    directionality: "higher_is_better",
    normal_range: { low: 8, high: 30 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.85,
    confidence_impact: "reliable",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "SDE margin is the primary cash-flow signal for SBA-financeable SMB " +
      "deals. Add-back integrity (the assumption) is what makes this metric " +
      "trustworthy; the engine treats elevated SDE margin as a validation " +
      "outlier signal triggering normalization scenarios.",
  },

  {
    metric_key: "operating_margin_pct",
    display_name: "Operating Margin",
    category: "profitability",
    directionality: "higher_is_better",
    normal_range: { low: 4, high: 22 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.8,
    confidence_impact: "reliable",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "Operating margin is the more honest profitability signal than EBITDA " +
      "for asset-heavy businesses because it includes D&A as a true cost. " +
      "For service businesses with low D&A, operating margin and EBITDA " +
      "margin converge.",
  },

  {
    metric_key: "ebitda_margin_pct",
    display_name: "EBITDA Margin",
    category: "profitability",
    directionality: "higher_is_better",
    normal_range: { low: 6, high: 28 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.75,
    confidence_impact: "context_dependent",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "EBITDA margin is misleading for asset-heavy services because D&A " +
      "is real economic depreciation that EBITDA excludes. The engine " +
      "reads EBITDA in context — strong for SaaS, less informative for " +
      "self-storage where it inflates by 25-30 percentage points.",
  },

  {
    metric_key: "pretax_margin_pct",
    display_name: "Pretax Margin",
    category: "profitability",
    directionality: "higher_is_better",
    normal_range: { low: 3, high: 18 },
    lender_relevance: "medium",
    diligence_relevance: "medium",
    durability_weight: 0.6,
    confidence_impact: "reliable",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "Pretax margin captures the impact of interest expense on bottom-line " +
      "earnings. Useful for understanding pre-acquisition debt service " +
      "burden but less informative for new-buyer underwriting where the " +
      "capital structure is being replaced.",
  },

  // ── COVERAGE ──────────────────────────────────────────────────────────────

  {
    metric_key: "dscr",
    display_name: "DSCR",
    category: "coverage",
    directionality: "higher_is_better",
    normal_range: { low: 1.3, high: 3.0 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.9,
    confidence_impact: "context_dependent",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "Debt service coverage ratio is the central lender metric for SBA " +
      "and cash-flow-personality lenders. RMA reports DSCR as N/A for " +
      "twelve industries (small operators lack True DSCR's required " +
      "CurMatLTD structure); the engine downgrades DSCR confidence in " +
      "those industries and substitutes interest coverage.",
  },

  {
    metric_key: "int_coverage",
    display_name: "Interest Coverage",
    category: "coverage",
    directionality: "higher_is_better",
    normal_range: { low: 2.0, high: 12.0 },
    lender_relevance: "medium",
    diligence_relevance: "medium",
    durability_weight: 0.7,
    confidence_impact: "reliable",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "Interest coverage is the fallback coverage signal when DSCR is " +
      "unreliable. Available for all 41 industries in the RMA registry. " +
      "Less precise than DSCR for total debt service but more universally " +
      "comparable.",
  },

  {
    metric_key: "pi_coverage",
    display_name: "P&I Coverage",
    category: "coverage",
    directionality: "higher_is_better",
    normal_range: { low: 1.2, high: 2.5 },
    lender_relevance: "high",
    diligence_relevance: "medium",
    durability_weight: 0.75,
    confidence_impact: "reliable",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "Principal and interest coverage captures full debt service burden " +
      "(both interest and amortization). Closely related to DSCR but " +
      "calculated differently in RMA's methodology.",
  },

  // ── LEVERAGE ──────────────────────────────────────────────────────────────

  {
    metric_key: "debt_to_sde",
    display_name: "Debt-to-SDE",
    category: "leverage",
    directionality: "lower_is_better",
    normal_range: { low: 2.0, high: 4.5 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.85,
    confidence_impact: "reliable",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Total acquisition debt divided by buyer's SDE. The dominant leverage " +
      "signal for SBA deals because it captures structural exposure " +
      "post-close. Aggressive at >4.0x; coverage failure imminent at >5.5x.",
  },

  {
    metric_key: "debt_to_worth",
    display_name: "Debt-to-Worth",
    category: "leverage",
    directionality: "lower_is_better",
    normal_range: { low: 0.5, high: 2.5 },
    lender_relevance: "medium",
    diligence_relevance: "medium",
    durability_weight: 0.5,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Total debt divided by tangible net worth. Skewed by partner draws " +
      "in professional services and by practice loans in healthcare " +
      "(dentists routinely show negative net worth). The engine suppresses " +
      "this metric's mismatch triggers in industries where 'Neg NW' is " +
      "structurally typical.",
  },

  {
    metric_key: "ltv",
    display_name: "LTV",
    category: "leverage",
    directionality: "lower_is_better",
    normal_range: { low: 0.5, high: 0.85 },
    lender_relevance: "high",
    diligence_relevance: "medium",
    durability_weight: 0.7,
    confidence_impact: "reliable",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Loan-to-value against purchase price. Lender concern shifts from " +
      "coverage to recovery when LTV exceeds 0.85; collateral-personality " +
      "lenders weight this metric heaviest.",
  },

  // ── LIQUIDITY ─────────────────────────────────────────────────────────────

  {
    metric_key: "current_ratio",
    display_name: "Current Ratio",
    category: "liquidity",
    directionality: "band",
    normal_range: { low: 1.2, high: 2.5 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.65,
    confidence_impact: "reliable",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Current assets divided by current liabilities. Below 1.0 indicates " +
      "working capital stress; above 3.0 may indicate inefficient capital " +
      "deployment. The engine treats this as a band metric — extreme values " +
      "in either direction are signals.",
  },

  {
    metric_key: "quick_ratio",
    display_name: "Quick Ratio",
    category: "liquidity",
    directionality: "band",
    normal_range: { low: 0.8, high: 1.8 },
    lender_relevance: "medium",
    diligence_relevance: "medium",
    durability_weight: 0.55,
    confidence_impact: "reliable",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Current assets minus inventory, divided by current liabilities. " +
      "The 'inventory-free' liquidity signal. The gap between current and " +
      "quick ratio reveals inventory-as-percentage-of-current-assets, " +
      "useful for retail and manufacturing analysis.",
  },

  // ── EFFICIENCY / CYCLE ────────────────────────────────────────────────────

  {
    metric_key: "inventory_turnover",
    display_name: "Inventory Turnover",
    category: "efficiency",
    directionality: "higher_is_better",
    normal_range: { low: 4, high: 25 },
    lender_relevance: "medium",
    diligence_relevance: "high",
    durability_weight: 0.7,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "COGS divided by inventory. Suppressed for service businesses with " +
      "no inventory. Critical for retail_inventory and ecommerce models " +
      "where declining turnover signals slow-moving stock accumulation.",
  },

  {
    metric_key: "days_inventory_outstanding",
    display_name: "Days Inventory Outstanding",
    category: "efficiency",
    directionality: "lower_is_better",
    normal_range: { low: 15, high: 90 },
    lender_relevance: "medium",
    diligence_relevance: "high",
    durability_weight: 0.65,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Inverse of inventory turnover, expressed in days. Suppressed for " +
      "service businesses. Used alongside inventory turnover in retail " +
      "and manufacturing analysis.",
  },

  {
    metric_key: "ar_days",
    display_name: "AR Days",
    category: "efficiency",
    directionality: "lower_is_better",
    normal_range: { low: 15, high: 60 },
    lender_relevance: "medium",
    diligence_relevance: "high",
    durability_weight: 0.7,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Average days to collect receivables. Important for healthcare " +
      "(reimbursement cycle) and contractor (project payment) models. " +
      "Less informative for cash-collection businesses (restaurants, " +
      "consumer service).",
  },

  {
    metric_key: "inventory_pct_assets",
    display_name: "Inventory % of Assets",
    category: "efficiency",
    directionality: "band",
    normal_range: { low: 0, high: 40 },
    lender_relevance: "medium",
    diligence_relevance: "high",
    durability_weight: 0.6,
    confidence_impact: "reliable",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Inventory as percentage of total assets. The defining metric for " +
      "service_with_inventory and retail_inventory models. Useful as a " +
      "mismatch trigger — service businesses showing high inventory " +
      "percentage may have undisclosed product components.",
  },

  {
    metric_key: "sales_to_assets",
    display_name: "Sales-to-Assets",
    category: "efficiency",
    directionality: "higher_is_better",
    normal_range: { low: 1.5, high: 8.0 },
    lender_relevance: "medium",
    diligence_relevance: "medium",
    durability_weight: 0.6,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Revenue divided by total assets. The asset-productivity signal. " +
      "Particularly important for asset-heavy services (self-storage, " +
      "trucking, fitness) where declining asset utilization signals " +
      "capacity issues even when revenue is stable.",
  },

  // ── GROWTH ────────────────────────────────────────────────────────────────

  {
    metric_key: "revenue_cagr_3yr",
    display_name: "Revenue 3-Year CAGR",
    category: "growth",
    directionality: "higher_is_better",
    normal_range: { low: 0, high: 25 },
    lender_relevance: "medium",
    diligence_relevance: "high",
    durability_weight: 0.75,
    confidence_impact: "context_dependent",
    expected_source_minimum: "tax_returns",
    underwriting_intent:
      "Three-year compounded revenue growth. Growth-tolerant personalities " +
      "weight heaviest; cash-flow personalities use as context only. " +
      "Trajectory mismatch triggers fire when revenue CAGR is implausibly " +
      "high relative to the operating model band.",
  },

  // ── STRUCTURAL ────────────────────────────────────────────────────────────

  {
    metric_key: "sources_uses_balance",
    display_name: "Sources & Uses Balance",
    category: "structure",
    directionality: "band",
    normal_range: { low: -0.01, high: 0.01 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.8,
    confidence_impact: "reliable",
    expected_source_minimum: "seller_spreadsheet",
    underwriting_intent:
      "Sources of capital minus uses of capital, expressed as a percentage " +
      "of purchase price. Must balance to within 1%. Imbalance indicates " +
      "missing capital or unspent reserves — both structural concerns.",
  },

  {
    metric_key: "working_capital_needed",
    display_name: "Working Capital at Close",
    category: "structure",
    directionality: "band",
    normal_range: { low: 0, high: 0.15 },
    lender_relevance: "high",
    diligence_relevance: "high",
    durability_weight: 0.7,
    confidence_impact: "reliable",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Working capital required at close, expressed as percentage of " +
      "purchase price. Zero or unspecified working capital in a working-" +
      "capital-intensive business (contractor, manufacturing, staffing) " +
      "triggers an explicit structural concern.",
  },

  // ── DERIVED ───────────────────────────────────────────────────────────────

  {
    metric_key: "capex_intensity_implied",
    display_name: "Implied Capex Intensity",
    category: "derived",
    directionality: "band",
    normal_range: { low: 0.02, high: 0.10 },
    lender_relevance: "medium",
    diligence_relevance: "high",
    durability_weight: 0.7,
    confidence_impact: "context_dependent",
    expected_source_minimum: "internal_pnl",
    underwriting_intent:
      "Maintenance capex as percentage of revenue, derived from the gap " +
      "between EBITDA margin and operating margin. The single most " +
      "diagnostic metric for asset-heavy services — abnormally low values " +
      "signal capex deferral that will surface post-close.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY-SPECIFIC OVERRIDES
// ─────────────────────────────────────────────────────────────────────────────
// Per-industry deviations from the metric defaults. Each override declares
// its rationale — anonymous overrides are not permitted.

export const METRIC_OVERRIDES: ReadonlyArray<MetricRelevanceOverride> = [
  // ── DENTIST: DSCR confidence reduced (RMA reports N/A) ────────────────────
  {
    metric_key: "dscr",
    industry_key: "dentist",
    confidence_impact: "low_confidence",
    lender_relevance: "medium",
    rationale:
      "RMA reports DSCR as N/A for dentist (most practices don't carry " +
      "RMA's required CurMatLTD structure). The engine downgrades DSCR " +
      "confidence and substitutes interest coverage as the primary " +
      "coverage signal.",
  },
  {
    metric_key: "debt_to_worth",
    industry_key: "dentist",
    confidence_impact: "low_confidence",
    lender_relevance: "low",
    rationale:
      "Dentists routinely show negative net worth (practice loans against " +
      "future cash flow). Debt-to-worth is structurally meaningless for " +
      "this industry; debt-to-SDE is the primary leverage signal instead.",
  },

  // ── PHYSICIAN OFFICE: provider concentration overrides ────────────────────
  // Note: Physician Office DOES have RMA DSCR = 4.5x. No DSCR override.
  // The structural concern is provider concentration, not metric sparsity.

  // ── PEST CONTROL: DSCR N/A ────────────────────────────────────────────────
  {
    metric_key: "dscr",
    industry_key: "pestcontrol",
    confidence_impact: "low_confidence",
    rationale:
      "RMA reports DSCR as N/A for pest control (small sample for True " +
      "DSCR calculation). Interest coverage (11.9x median) used as primary " +
      "coverage signal.",
  },

  // ── BEAUTY SALONS: DSCR N/A, low sample ───────────────────────────────────
  {
    metric_key: "dscr",
    industry_key: "hairsalon",
    confidence_impact: "low_confidence",
    rationale:
      "RMA reports DSCR as N/A for beauty salons. Combined with small RMA " +
      "sample (n=92), coverage analysis relies on interest coverage rather " +
      "than DSCR.",
  },

  // ── CHILD CARE: DSCR N/A ──────────────────────────────────────────────────
  {
    metric_key: "dscr",
    industry_key: "childcare",
    confidence_impact: "low_confidence",
    rationale:
      "RMA reports DSCR as N/A for child care. Interest coverage (4.8x " +
      "median) used as primary coverage signal.",
  },

  // ── SELF-STORAGE: real-estate dominant ────────────────────────────────────
  {
    metric_key: "ebitda_margin_pct",
    industry_key: "selfstorage",
    confidence_impact: "low_confidence",
    durability_weight: 0.5,
    rationale:
      "EBITDA margin 52.8% is dramatically inflated by real-estate D&A. " +
      "The engine reads operating margin (40%) as the more honest signal. " +
      "EBITDA is preserved for completeness but weighted down.",
  },
  {
    metric_key: "ltv",
    industry_key: "selfstorage",
    lender_relevance: "high",
    durability_weight: 0.85,
    rationale:
      "Real-estate-dominant economics make LTV the primary lender metric " +
      "for self-storage. Collateral-personality lenders weight LTV " +
      "heaviest here.",
  },

  // ── VETERINARY: cash-pay with inventory anomaly ───────────────────────────
  {
    metric_key: "inventory_pct_assets",
    industry_key: "veterinary",
    confidence_impact: "context_dependent",
    rationale:
      "Inventory 6.4% reflects pharmaceutical and supply stock — atypical " +
      "for the healthcare_practice model but structurally correct for " +
      "veterinary. The 'inventory > 8%' mismatch trigger is recalibrated " +
      "to 'inventory > 10%' for this industry.",
  },

  // ── ECOMMERCE: data recency caveat affects all metrics ────────────────────
  {
    metric_key: "ebitda_margin_pct",
    industry_key: "ecommerce",
    confidence_impact: "low_confidence",
    rationale:
      "RMA data for ecommerce is 2021-22, predating substantial " +
      "post-2022 CAC inflation and platform-economics shift. EBITDA " +
      "margin confidence reduced across the category.",
  },
  {
    metric_key: "revenue_cagr_3yr",
    industry_key: "ecommerce",
    confidence_impact: "low_confidence",
    rationale:
      "2021-22 growth data reflects ZIRP-era ecommerce expansion that " +
      "has materially compressed since. Growth metrics for ecommerce " +
      "are interpreted with recency caveat.",
  },

  // ── SAAS / SOFTWARE: data recency, missing key metrics ────────────────────
  {
    metric_key: "ebitda_margin_pct",
    industry_key: "saas",
    confidence_impact: "low_confidence",
    rationale:
      "RMA data for SaaS is 2021-22, predating the 2023-2024 software " +
      "valuation compression. EBITDA margin reflects ZIRP-era economics. " +
      "Engine treats software metrics with explicit recency caveat.",
  },
  {
    metric_key: "revenue_cagr_3yr",
    industry_key: "saas",
    confidence_impact: "low_confidence",
    rationale:
      "Software growth in 2021-22 reflected ZIRP-era CAC and growth " +
      "assumptions. Post-2022 growth profiles differ materially.",
  },

  // ── PHARMACY: 2021-22 data + DIR fee shift ────────────────────────────────
  {
    metric_key: "ebitda_margin_pct",
    industry_key: "pharmacy",
    confidence_impact: "low_confidence",
    rationale:
      "2021-22 data predates substantial DIR fee and PBM margin " +
      "compression. Reimbursement_stability assumption weighted heavily " +
      "to compensate; EBITDA margin confidence reduced.",
  },

  // ── GAS STATION: 2021-22 data + traffic shifts ────────────────────────────
  {
    metric_key: "ebitda_margin_pct",
    industry_key: "gasstation",
    confidence_impact: "low_confidence",
    rationale:
      "2021-22 data predates substantial fuel-volume and tobacco-volume " +
      "shifts post-COVID. EBITDA margin confidence reduced.",
  },

  // ── RESTAURANT: large sample but bimodal ──────────────────────────────────
  {
    metric_key: "ebitda_margin_pct",
    industry_key: "restaurant",
    confidence_impact: "context_dependent",
    rationale:
      "RMA sample of 1,596 is the largest in the registry, but the " +
      "median masks a bimodal distribution (counter-service vs " +
      "full-service). EBITDA margin reads must be interpreted alongside " +
      "concept type.",
  },

  // ── CONTRACTORS: gross margin context dependency ──────────────────────────
  {
    metric_key: "gross_margin_pct",
    industry_key: "hvac",
    confidence_impact: "context_dependent",
    diligence_relevance: "high",
    rationale:
      "Service-vs-install mix drives gross margin profile. Same-revenue " +
      "HVAC businesses can have 30% or 50% gross margins based on mix. " +
      "Diligence relevance elevated to high; mix disclosure is the " +
      "standing question.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up base metric relevance by key. Returns null if unknown.
 */
export function getMetricRelevance(key: MetricKey): MetricRelevance | null {
  return METRIC_RELEVANCE.find((m) => m.metric_key === key) ?? null;
}

/**
 * Resolve metric relevance for a given metric in a given industry, applying
 * any industry-specific overrides on top of the base relevance.
 *
 * Fallback-aware: if no override exists, returns base unmodified.
 */
export function resolveMetricRelevance(
  metric_key: MetricKey,
  industry_key: IndustryKey,
): MetricRelevance | null {
  const base = getMetricRelevance(metric_key);
  if (!base) return null;

  const override = METRIC_OVERRIDES.find(
    (o) => o.metric_key === metric_key && o.industry_key === industry_key,
  );
  if (!override) return base;

  return {
    ...base,
    lender_relevance: override.lender_relevance ?? base.lender_relevance,
    diligence_relevance: override.diligence_relevance ?? base.diligence_relevance,
    durability_weight: override.durability_weight ?? base.durability_weight,
    confidence_impact: override.confidence_impact ?? base.confidence_impact,
    expected_source_minimum: override.expected_source_minimum ?? base.expected_source_minimum,
  };
}

/**
 * Return all industry-specific overrides for a given metric.
 */
export function metricOverridesForMetric(
  metric_key: MetricKey,
): ReadonlyArray<MetricRelevanceOverride> {
  return METRIC_OVERRIDES.filter((o) => o.metric_key === metric_key);
}

/**
 * Return all industry-specific overrides for a given industry.
 */
export function metricOverridesForIndustry(
  industry_key: IndustryKey,
): ReadonlyArray<MetricRelevanceOverride> {
  return METRIC_OVERRIDES.filter((o) => o.industry_key === industry_key);
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface MetricRelevanceValidationResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly metric_count: number;
  readonly override_count: number;
  readonly industries_with_overrides: number;
  readonly version: string;
}

export function validateMetricRelevance(): MetricRelevanceValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  // Check for duplicate metric_keys in base table
  const seenMetrics = new Set<string>();
  for (const m of METRIC_RELEVANCE) {
    if (seenMetrics.has(m.metric_key)) {
      issues.push({
        severity: "error",
        location: `metric_relevance[${m.metric_key}]`,
        message: `Duplicate metric_key: ${m.metric_key}`,
      });
    }
    seenMetrics.add(m.metric_key);
  }

  // Check durability_weight is 0-1
  for (const m of METRIC_RELEVANCE) {
    if (m.durability_weight < 0 || m.durability_weight > 1) {
      issues.push({
        severity: "error",
        location: `metric_relevance[${m.metric_key}].durability_weight`,
        message: `Durability weight must be 0-1, got ${m.durability_weight}`,
      });
    }
  }

  // Check normal_range coherence (low <= high)
  for (const m of METRIC_RELEVANCE) {
    if (m.normal_range && m.normal_range.low > m.normal_range.high) {
      issues.push({
        severity: "error",
        location: `metric_relevance[${m.metric_key}].normal_range`,
        message: `Normal range low (${m.normal_range.low}) > high (${m.normal_range.high})`,
      });
    }
  }

  // Every metric requires non-empty underwriting_intent
  for (const m of METRIC_RELEVANCE) {
    if (!m.underwriting_intent || m.underwriting_intent.trim().length < 30) {
      issues.push({
        severity: "error",
        location: `metric_relevance[${m.metric_key}].underwriting_intent`,
        message: "Underwriting intent missing or too short (<30 chars)",
      });
    }
  }

  // Every override must reference a known metric_key
  for (const o of METRIC_OVERRIDES) {
    if (!seenMetrics.has(o.metric_key)) {
      issues.push({
        severity: "error",
        location: `metric_override[${o.metric_key}::${o.industry_key}]`,
        message: `Override references unknown metric_key: ${o.metric_key}`,
      });
    }
  }

  // Every override must have rationale
  for (const o of METRIC_OVERRIDES) {
    if (!o.rationale || o.rationale.trim().length < 20) {
      issues.push({
        severity: "error",
        location: `metric_override[${o.metric_key}::${o.industry_key}].rationale`,
        message: "Override rationale missing or too short — anonymous overrides not permitted",
      });
    }
  }

  // No duplicate (metric_key, industry_key) pairs
  const seenPairs = new Set<string>();
  for (const o of METRIC_OVERRIDES) {
    const pair = `${o.metric_key}::${o.industry_key}`;
    if (seenPairs.has(pair)) {
      issues.push({
        severity: "error",
        location: `metric_override[${pair}]`,
        message: "Duplicate (metric_key, industry_key) override pair",
      });
    }
    seenPairs.add(pair);
  }

  const industriesWithOverrides = new Set(METRIC_OVERRIDES.map((o) => o.industry_key));

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    metric_count: METRIC_RELEVANCE.length,
    override_count: METRIC_OVERRIDES.length,
    industries_with_overrides: industriesWithOverrides.size,
    version: REGISTRY_VERSION,
  };
}

function assertMetricRelevanceValid(): void {
  const result = validateMetricRelevance();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Metric relevance registry validation failed (${REGISTRY_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertMetricRelevanceValid();
