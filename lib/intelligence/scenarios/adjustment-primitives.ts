// lib/intelligence/scenarios/adjustment-primitives.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Adjustment Primitives
//
// CP-4 Module: The shared mathematical layer beneath the scenario catalogue.
// Pure functions that perform single, well-defined adjustments. Scenarios
// compose these primitives with explicit arguments; primitives have no
// access to rule engine state or fingerprint context.
//
// Design constraints (CP-4 guardrails):
//
//   1. Pure mathematical predictability. No I/O, no module state, no
//      LLM-driven judgment, no probabilistic reasoning. Same inputs always
//      produce same outputs. Deterministic by construction.
//
//   2. No rule-engine coupling. Primitives take raw numbers and config,
//      return raw numbers. Scenarios decide WHICH primitive to call and
//      WHAT magnitude to use, but the primitive itself never reads
//      RuleEngineResult. This keeps the abstraction clean:
//        primitives = reusable math
//        scenarios  = underwriting interpretation
//
//   3. Single responsibility per primitive. Each function does ONE
//      adjustment. Composite scenarios call multiple primitives in
//      sequence rather than embedding multi-adjustment logic in one
//      primitive.
//
//   4. Auditable. Every primitive returns an AdjustmentRecord alongside
//      the adjusted value, so scenarios can attach the audit trail to
//      their outputs without reconstructing it.
//
//   5. Safe fallbacks. When required inputs are missing, primitives
//      return null rather than fabricating values. Scenarios then mark
//      themselves not_applicable rather than producing fictitious math.
//
// Naming convention for AdjustmentPrimitiveIds:
//   primitive.{category}.{specific}
//   primitive.addback.partial_recovery
//   primitive.capex.industry_normalized
//   primitive.revenue.top_customer_loss
// ─────────────────────────────────────────────────────────────────────────────

import type { OperatingModelKey } from "../types";
import type {
  AdjustmentPrimitiveId,
  AdjustmentRecord,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ADJUSTMENT RECORD BUILDER
// ─────────────────────────────────────────────────────────────────────────────

interface PrimitiveResult<T> {
  readonly value: T | null;
  readonly record: AdjustmentRecord | null;
  readonly applicable: boolean;
  readonly reason_if_inapplicable?: string;
}

function makeRecord(args: {
  primitive_id: AdjustmentPrimitiveId;
  metric_or_input: string;
  direction: "increase" | "decrease" | "replace";
  value_before: number | null;
  value_after: number | null;
  magnitude_description: string;
  rationale: string;
}): AdjustmentRecord {
  return {
    metric_or_input: args.metric_or_input,
    primitive_id: args.primitive_id,
    direction: args.direction,
    value_before: args.value_before,
    value_after: args.value_after,
    magnitude_description: args.magnitude_description,
    rationale: args.rationale,
  };
}

function notApplicable(reason: string): PrimitiveResult<number> {
  return {
    value: null,
    record: null,
    applicable: false,
    reason_if_inapplicable: reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDBACK PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partial addback recovery — assume a configurable fraction of reported
 * addbacks survives diligence review.
 *
 * Use case: industry_normalized and lender_stress scenarios both rely on
 * this primitive with different recovery_rate arguments. Conservative
 * underwriting assumes only 70-80% of addbacks survive; lender stress
 * may assume 50-60%.
 *
 * Inputs:
 *   - sde: reported SDE (required)
 *   - addback_total: reported total addbacks (required)
 *   - recovery_rate: fraction (0-1) of addbacks that survive (e.g., 0.7
 *     means 30% of addbacks are stripped out)
 *   - rationale: scenario-specific explanation
 *
 * Output: adjusted SDE = sde - (addback_total * (1 - recovery_rate))
 *
 * Returns not-applicable if sde or addback_total is missing.
 */
export function partialAddbackRecovery(args: {
  sde: number | undefined;
  addback_total: number | undefined;
  recovery_rate: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.sde !== "number") {
    return notApplicable("SDE not provided; addback recovery primitive cannot apply.");
  }
  if (typeof args.addback_total !== "number") {
    return notApplicable("Addback total not provided; addback recovery primitive cannot apply.");
  }
  if (args.recovery_rate < 0 || args.recovery_rate > 1) {
    return notApplicable(`recovery_rate must be 0-1, got ${args.recovery_rate}`);
  }

  const stripped = args.addback_total * (1 - args.recovery_rate);
  const adjustedSde = args.sde - stripped;
  const recoveryPct = (args.recovery_rate * 100).toFixed(0);

  return {
    value: adjustedSde,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.addback.partial_recovery",
      metric_or_input: "sde",
      direction: "decrease",
      value_before: args.sde,
      value_after: adjustedSde,
      magnitude_description: `Reduced SDE by $${stripped.toFixed(0)} (${recoveryPct}% of addbacks assumed to survive)`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNER REPLACEMENT PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Owner replacement normalization — subtract market-rate replacement cost
 * for the owner-operator from SDE to produce normalized EBITDA-equivalent.
 *
 * Use case: any scenario testing whether earnings hold up when the buyer
 * cannot run the business themselves (i.e., must employ a paid manager).
 *
 * Inputs:
 *   - sde: reported SDE
 *   - replacement_compensation: market-rate cost (typically $80k-$150k
 *     depending on industry and revenue scale; scenarios decide)
 *   - rationale
 *
 * Output: adjusted SDE = sde - replacement_compensation
 *
 * This is the most common normalization primitive across operating models.
 */
export function ownerReplacementNormalization(args: {
  sde: number | undefined;
  replacement_compensation: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.sde !== "number") {
    return notApplicable("SDE not provided; owner replacement normalization cannot apply.");
  }
  if (args.replacement_compensation < 0) {
    return notApplicable(`replacement_compensation must be non-negative, got ${args.replacement_compensation}`);
  }

  const adjustedSde = args.sde - args.replacement_compensation;

  return {
    value: adjustedSde,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.owner.replacement_normalization",
      metric_or_input: "sde",
      direction: "decrease",
      value_before: args.sde,
      value_after: adjustedSde,
      magnitude_description: `Subtracted $${args.replacement_compensation.toFixed(0)} owner-replacement cost from SDE`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPEX PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Industry-normalized maintenance capex — replace reported capex with an
 * industry-typical maintenance level. Used by capex_normalized scenarios
 * for asset-heavy operating models.
 *
 * Inputs:
 *   - ebitda: reported EBITDA (used to derive operating margin floor)
 *   - revenue: reported revenue
 *   - capex_intensity_pct: assumed maintenance capex as % of revenue
 *     (typical bands: 2-3% for manufacturing, 5-7% for asset-heavy
 *     services, 8-12% for fleet-intensive)
 *   - rationale
 *
 * Output: adjusted EBITDA = ebitda - (revenue * capex_intensity_pct / 100)
 *
 * This converts EBITDA toward operating-margin equivalent under the
 * assumption that reported D&A understates true maintenance capex.
 */
export function industryNormalizedCapex(args: {
  ebitda: number | undefined;
  revenue: number | undefined;
  capex_intensity_pct: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.ebitda !== "number") {
    return notApplicable("EBITDA not provided; capex normalization cannot apply.");
  }
  if (typeof args.revenue !== "number") {
    return notApplicable("Revenue not provided; capex normalization cannot apply.");
  }
  if (args.capex_intensity_pct < 0 || args.capex_intensity_pct > 30) {
    return notApplicable(`capex_intensity_pct must be 0-30, got ${args.capex_intensity_pct}`);
  }

  const capexCharge = args.revenue * (args.capex_intensity_pct / 100);
  const adjustedEbitda = args.ebitda - capexCharge;

  return {
    value: adjustedEbitda,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.capex.industry_normalized",
      metric_or_input: "ebitda",
      direction: "decrease",
      value_before: args.ebitda,
      value_after: adjustedEbitda,
      magnitude_description: `Applied ${args.capex_intensity_pct.toFixed(1)}% maintenance capex charge ($${capexCharge.toFixed(0)})`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top customer loss — subtract the largest customer's revenue contribution
 * from total revenue.
 *
 * Inputs:
 *   - revenue: reported revenue
 *   - top_customer_pct: top customer's share of revenue (typically 0-50)
 *   - retention_factor: optional. 0 = full loss; 0.5 = half loss; 1 = no
 *     loss. Defaults to 0 (full loss) but scenarios may soften this.
 *   - rationale
 *
 * Output: adjusted revenue = revenue * (1 - top_customer_pct/100 * (1 - retention_factor))
 */
export function topCustomerLoss(args: {
  revenue: number | undefined;
  top_customer_pct: number | undefined;
  retention_factor?: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.revenue !== "number") {
    return notApplicable("Revenue not provided; top customer loss primitive cannot apply.");
  }
  if (typeof args.top_customer_pct !== "number") {
    return notApplicable("Top customer percentage not provided; cannot model loss.");
  }
  const retention = args.retention_factor ?? 0;
  if (retention < 0 || retention > 1) {
    return notApplicable(`retention_factor must be 0-1, got ${retention}`);
  }
  if (args.top_customer_pct < 0 || args.top_customer_pct > 100) {
    return notApplicable(`top_customer_pct must be 0-100, got ${args.top_customer_pct}`);
  }

  const lossPct = (args.top_customer_pct / 100) * (1 - retention);
  const adjustedRevenue = args.revenue * (1 - lossPct);
  const lossAmt = args.revenue - adjustedRevenue;

  return {
    value: adjustedRevenue,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.revenue.top_customer_loss",
      metric_or_input: "revenue",
      direction: "decrease",
      value_before: args.revenue,
      value_after: adjustedRevenue,
      magnitude_description: `Removed $${lossAmt.toFixed(0)} (${(lossPct * 100).toFixed(1)}% of revenue) from top customer loss`,
      rationale: args.rationale,
    }),
  };
}

/**
 * Revenue compression — apply a percentage decline to reported revenue.
 *
 * Inputs:
 *   - revenue: reported revenue
 *   - compression_pct: % decline (e.g., 15 = 15% decline)
 *   - rationale
 */
export function revenueCompression(args: {
  revenue: number | undefined;
  compression_pct: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.revenue !== "number") {
    return notApplicable("Revenue not provided; revenue compression cannot apply.");
  }
  if (args.compression_pct < 0 || args.compression_pct > 100) {
    return notApplicable(`compression_pct must be 0-100, got ${args.compression_pct}`);
  }

  const adjustedRevenue = args.revenue * (1 - args.compression_pct / 100);

  return {
    value: adjustedRevenue,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.revenue.compression",
      metric_or_input: "revenue",
      direction: "decrease",
      value_before: args.revenue,
      value_after: adjustedRevenue,
      magnitude_description: `Applied ${args.compression_pct.toFixed(1)}% revenue compression`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARGIN PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Industry-median margin normalization — replace reported margin with the
 * industry median when reported sits above the band ceiling.
 *
 * Use case: industry_normalized scenarios. Tests whether the deal survives
 * when reported margin is brought back to the industry's typical level.
 *
 * Inputs:
 *   - revenue: reported revenue
 *   - reported_margin_pct: reported margin (e.g., SDE or EBITDA margin)
 *   - industry_median_pct: industry-typical margin for this metric
 *   - rationale
 *
 * Output: adjusted earnings = revenue * (industry_median_pct / 100)
 */
export function industryMedianMargin(args: {
  revenue: number | undefined;
  reported_margin_pct: number | undefined;
  industry_median_pct: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.revenue !== "number") {
    return notApplicable("Revenue not provided; industry median margin primitive cannot apply.");
  }
  if (typeof args.reported_margin_pct !== "number") {
    return notApplicable("Reported margin not provided.");
  }
  if (args.industry_median_pct < 0 || args.industry_median_pct > 100) {
    return notApplicable(`industry_median_pct must be 0-100, got ${args.industry_median_pct}`);
  }

  const adjustedEarnings = args.revenue * (args.industry_median_pct / 100);
  const originalEarnings = args.revenue * (args.reported_margin_pct / 100);

  return {
    value: adjustedEarnings,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.margin.industry_median",
      metric_or_input: "earnings_from_margin",
      direction: "replace",
      value_before: originalEarnings,
      value_after: adjustedEarnings,
      magnitude_description: `Replaced reported margin ${args.reported_margin_pct.toFixed(1)}% with industry median ${args.industry_median_pct.toFixed(1)}%`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COST INFLATION PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wage inflation — increase labor cost as % of revenue without offsetting
 * pricing power. Models the buyer_downside_wage_inflation scenario.
 *
 * Inputs:
 *   - sde: reported SDE
 *   - revenue: reported revenue
 *   - labor_inflation_pct: % increase in labor cost (e.g., 5 = 500bps
 *     increase as % of revenue)
 *   - rationale
 *
 * Output: adjusted SDE = sde - (revenue * labor_inflation_pct / 100)
 *
 * Models the case where labor cost rises by N% of revenue with zero
 * offsetting pricing.
 */
export function wageInflation(args: {
  sde: number | undefined;
  revenue: number | undefined;
  labor_inflation_pct: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.sde !== "number") {
    return notApplicable("SDE not provided; wage inflation primitive cannot apply.");
  }
  if (typeof args.revenue !== "number") {
    return notApplicable("Revenue not provided; wage inflation primitive cannot apply.");
  }
  if (args.labor_inflation_pct < 0 || args.labor_inflation_pct > 20) {
    return notApplicable(`labor_inflation_pct must be 0-20, got ${args.labor_inflation_pct}`);
  }

  const charge = args.revenue * (args.labor_inflation_pct / 100);
  const adjustedSde = args.sde - charge;

  return {
    value: adjustedSde,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.cost.wage_inflation",
      metric_or_input: "sde",
      direction: "decrease",
      value_before: args.sde,
      value_after: adjustedSde,
      magnitude_description: `Applied ${args.labor_inflation_pct.toFixed(1)}% labor cost increase ($${charge.toFixed(0)})`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recompute DSCR from adjusted earnings and existing debt service.
 *
 * Inputs:
 *   - adjusted_earnings: SDE or EBITDA after all prior adjustments
 *   - debt_to_sde: original debt-to-SDE ratio (used to back into debt service)
 *   - original_sde: original SDE (the denominator of debt_to_sde)
 *   - original_dscr: original DSCR (used as fallback if back-calculation fails)
 *   - rationale
 *
 * Output: adjusted DSCR = adjusted_earnings / implied_debt_service
 *
 * Strategy: if we have debt_to_sde and original_sde, we can derive the
 * implied total debt, then derive debt service via the original DSCR
 * relationship. This keeps debt service constant while earnings move.
 */
export function recomputeDscr(args: {
  adjusted_earnings: number | undefined;
  debt_to_sde: number | undefined;
  original_sde: number | undefined;
  original_dscr: number | undefined;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.adjusted_earnings !== "number") {
    return notApplicable("Adjusted earnings not provided; cannot recompute DSCR.");
  }
  if (typeof args.original_sde !== "number" || typeof args.original_dscr !== "number") {
    return notApplicable("Original SDE and DSCR required to back-derive debt service.");
  }
  if (args.original_dscr <= 0) {
    return notApplicable(`Original DSCR (${args.original_dscr}) must be positive.`);
  }

  // Back-derive implied debt service from original SDE / original DSCR
  const impliedDebtService = args.original_sde / args.original_dscr;
  if (impliedDebtService <= 0) {
    return notApplicable("Implied debt service derived as non-positive; cannot recompute.");
  }
  const adjustedDscr = args.adjusted_earnings / impliedDebtService;

  return {
    value: adjustedDscr,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.coverage.recompute_dscr",
      metric_or_input: "dscr",
      direction: "replace",
      value_before: args.original_dscr,
      value_after: adjustedDscr,
      magnitude_description: `Recomputed DSCR from adjusted earnings: ${args.original_dscr.toFixed(2)}x → ${adjustedDscr.toFixed(2)}x`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKING CAPITAL PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Working capital compression — apply downward pressure on current ratio
 * via extending AR cycle, compressing AP terms, or both.
 *
 * Inputs:
 *   - current_ratio: reported current ratio
 *   - ar_days: reported AR days (optional)
 *   - ar_extension_days: how many days AR is assumed to extend
 *   - compression_factor: multiplier applied to current ratio (e.g., 0.75
 *     = 25% reduction in current ratio)
 *   - rationale
 *
 * Output: adjusted current ratio = current_ratio * compression_factor
 *
 * Note: this primitive intentionally does NOT attempt to model balance-
 * sheet mechanics precisely. The compression factor is the scenario's
 * underwriting judgment about how much working capital deteriorates;
 * the primitive applies it deterministically.
 */
export function workingCapitalCompression(args: {
  current_ratio: number | undefined;
  compression_factor: number;
  rationale: string;
}): PrimitiveResult<number> {
  if (typeof args.current_ratio !== "number") {
    return notApplicable("Current ratio not provided; working capital compression cannot apply.");
  }
  if (args.compression_factor <= 0 || args.compression_factor > 1) {
    return notApplicable(`compression_factor must be 0-1, got ${args.compression_factor}`);
  }

  const adjustedCr = args.current_ratio * args.compression_factor;

  return {
    value: adjustedCr,
    applicable: true,
    record: makeRecord({
      primitive_id: "primitive.working_capital.compression",
      metric_or_input: "current_ratio",
      direction: "decrease",
      value_before: args.current_ratio,
      value_after: adjustedCr,
      magnitude_description: `Compressed current ratio by ${((1 - args.compression_factor) * 100).toFixed(0)}%: ${args.current_ratio.toFixed(2)} → ${adjustedCr.toFixed(2)}`,
      rationale: args.rationale,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARGIN/EARNINGS DERIVED CONVERSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute margin pct from earnings and revenue. Pure helper used by
 * scenarios that need to express adjusted earnings as a percentage.
 *
 * Returns null when revenue is missing or zero.
 */
export function marginFromEarnings(
  earnings: number | null,
  revenue: number | undefined,
): number | null {
  if (earnings === null) return null;
  if (typeof revenue !== "number" || revenue === 0) return null;
  return (earnings / revenue) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY OF PRIMITIVE IDS
// ─────────────────────────────────────────────────────────────────────────────
// Stable registry of all primitive IDs the catalogue can reference.
// Validators read this to confirm scenarios call known primitives.

export const KNOWN_PRIMITIVE_IDS: ReadonlyArray<AdjustmentPrimitiveId> = [
  "primitive.addback.partial_recovery",
  "primitive.owner.replacement_normalization",
  "primitive.capex.industry_normalized",
  "primitive.revenue.top_customer_loss",
  "primitive.revenue.compression",
  "primitive.margin.industry_median",
  "primitive.cost.wage_inflation",
  "primitive.coverage.recompute_dscr",
  "primitive.working_capital.compression",
];

/**
 * Suggest reasonable owner-replacement cost based on operating model
 * and revenue scale. Returns a default if the model is unrecognized.
 * Used by owner_replacement_normalized scenario.
 *
 * Not opinionated about exact dollar amounts — these are first-pass
 * defaults the scenario can override. Reflects rough market-rate
 * compensation for an industry-typical operator at the deal's revenue
 * scale.
 */
export function suggestOwnerReplacementCost(
  model: OperatingModelKey,
  revenue: number | undefined,
): number {
  const baseByModel: Record<OperatingModelKey, number> = {
    professional_services: 130000,
    healthcare_practice: 180000,
    field_service: 85000,
    consumer_service: 75000,
    asset_heavy_service: 95000,
    contractor: 105000,
    service_with_inventory: 90000,
    retail_inventory: 80000,
    manufacturing: 120000,
    ecommerce: 110000,
    restaurant: 70000,
    software: 150000,
  };
  const base = baseByModel[model] ?? 100000;

  // Lightly scale with revenue: smaller deals don't justify high
  // replacement comp; larger deals do. Linear scaling within a
  // bounded range.
  if (typeof revenue !== "number" || revenue <= 0) return base;
  if (revenue < 1_000_000) return Math.max(base * 0.75, 60000);
  if (revenue > 5_000_000) return Math.min(base * 1.4, 250000);
  return base;
}
