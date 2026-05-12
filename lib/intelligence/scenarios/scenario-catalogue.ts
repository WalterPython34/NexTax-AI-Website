// lib/intelligence/scenarios/scenario-catalogue.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Scenario Catalogue
//
// CP-4 Module: 11 scenarios across two families. Each scenario is a
// deterministic reframing of trailing financials under a specific
// underwriting assumption.
//
// Catalogue composition:
//   - 5 normalization scenarios: industry_normalized,
//     owner_replacement_normalized, capex_normalized,
//     addback_partial_recovery, churn_normalized
//   - 6 stress scenarios: lender_stress, buyer_downside_top_customer_loss,
//     buyer_downside_wage_inflation, buyer_downside_partner_departure,
//     working_capital_compressed, revenue_compression
//   - 0 structural_reinterpretation scenarios (reserved category;
//     validator emits warning if any are added before the future build)
//
// Design constraints honored:
//
//   1. Pure functions. Each scenario.evaluate(context) reads inputs +
//      fingerprint + RuleEngineResult, returns ScenarioOutput, never
//      modifies anything.
//
//   2. Layered applicability per CP-4 Q3:
//      - applies_to_models: empty array = applies to all
//      - applies_when: pure predicate
//      The engine handles the model gate; the scenario handles the
//      condition gate.
//
//   3. Scenarios read RuleEngineResult per CP-4 Q4. Each applies_when
//      predicate decides whether the scenario's underlying concern was
//      actually surfaced by the rule engine.
//
//   4. Primitives are called with explicit arguments. No engine
//      context is passed through.
//
//   5. Clearance is computed via the centralized evaluator with
//      per-scenario overrides where underwriting intent differs.
//
//   6. Every output carries all four mandatory reasoning fields plus
//      scenario_confidence_score (null in CP-4) and confidence_factors.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  OperatingModelKey,
} from "../types";
import type {
  ClearanceBasis,
  ClearanceThresholdOverrides,
  Scenario,
  ScenarioClearance,
  ScenarioEvaluationContext,
  ScenarioFamily,
  ScenarioOutput,
  ScenarioOutputId,
} from "./types";
import { SCENARIO_CATALOGUE_VERSION, isValidScenarioId } from "./types";
import {
  buildClearanceReason,
  combineClearances,
  evaluateCurrentRatioClearance,
  evaluateDscrClearance,
  evaluateMarginClearance,
  resolveThresholds,
} from "./clearance";
import {
  industryMedianMargin,
  industryNormalizedCapex,
  marginFromEarnings,
  ownerReplacementNormalization,
  partialAddbackRecovery,
  recomputeDscr,
  revenueCompression,
  suggestOwnerReplacementCost,
  topCustomerLoss,
  wageInflation,
  workingCapitalCompression,
} from "./adjustment-primitives";

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT-ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let outputCounter = 0;
function makeOutputId(scenario_id: string, evaluated_at: string): ScenarioOutputId {
  outputCounter += 1;
  return `${scenario_id}@${evaluated_at}#${outputCounter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT BUILDERS — APPLIED AND NOT-APPLIED
// ─────────────────────────────────────────────────────────────────────────────

function notAppliedOutput(args: {
  scenario: Scenario;
  context: ScenarioEvaluationContext;
  reason: string;
}): ScenarioOutput {
  return {
    output_id: makeOutputId(args.scenario.id, args.context.evaluated_at),
    scenario_id: args.scenario.id,
    scenario_name: args.scenario.name,
    family: args.scenario.family,
    applied: false,
    reason_not_applied: args.reason,
    adjustments: [],
    adjusted_inputs: {},
    clears: "not_applicable",
    clearance_basis: args.scenario.clearance_basis,
    clearance_reason: `Scenario did not apply: ${args.reason}`,
    scenario_confidence_score: null,
    confidence_factors: [],
    what_triggered: "Scenario applicability gates not satisfied.",
    what_changed: "No adjustments applied.",
    why_defensible: "n/a",
    what_would_change_result: args.reason,
    depends_on_assumptions: args.scenario.depends_on_assumptions,
    evaluated_at: args.context.evaluated_at,
    catalogue_version: SCENARIO_CATALOGUE_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Has any rule with the given ID prefix fired? */
function hasRuleFired(context: ScenarioEvaluationContext, prefix: string): boolean {
  return context.rule_engine_result.firings.some((f) => f.rule_id.startsWith(prefix));
}

/** Build confidence factors from the deal's source state. */
function buildConfidenceFactors(context: ScenarioEvaluationContext): ReadonlyArray<{
  factor: string;
  impact: "increases_confidence" | "decreases_confidence";
}> {
  const factors: Array<{ factor: string; impact: "increases_confidence" | "decreases_confidence" }> = [];
  const source = context.inputs.deal_source_type;
  if (source === "tax_returns" || source === "bank_statements") {
    factors.push({ factor: `Deal-level source is ${source} (verified band)`, impact: "increases_confidence" });
  } else if (source === "seller_spreadsheet" || source === "verbal_assertion") {
    factors.push({ factor: `Deal-level source is ${source} (asserted/seller-prepared)`, impact: "decreases_confidence" });
  }
  if (context.fingerprint_resolution.is_fallback) {
    factors.push({ factor: "Fallback fingerprint used (industry not in registry)", impact: "decreases_confidence" });
  } else if (context.fingerprint_resolution.model_uncertainty_escalation >= 10) {
    factors.push({ factor: "Proxy/recency-impaired fingerprint resolution", impact: "decreases_confidence" });
  } else {
    factors.push({ factor: "Operating-model fingerprint matched explicitly", impact: "increases_confidence" });
  }
  const overrideSampleSize = context.fingerprint_resolution.industry_override?.rma_sample_size;
  if (typeof overrideSampleSize === "number" && overrideSampleSize >= 200) {
    factors.push({ factor: `Industry has strong RMA sample (n=${overrideSampleSize})`, impact: "increases_confidence" });
  } else if (typeof overrideSampleSize === "number" && overrideSampleSize > 0 && overrideSampleSize < 100) {
    factors.push({ factor: `Industry has thin RMA sample (n=${overrideSampleSize})`, impact: "decreases_confidence" });
  }
  return factors;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIO_CATALOGUE: ReadonlyArray<Scenario> = [

  // ════════════════════════════════════════════════════════════════════════
  // NORMALIZATION FAMILY (5 scenarios)
  // ════════════════════════════════════════════════════════════════════════

  // ── N1. INDUSTRY NORMALIZED ──────────────────────────────────────────────
  {
    id: "scenario.normalization.industry_normalized",
    name: "Industry-normalized earnings",
    family: "normalization",
    description:
      "Replaces reported earnings margin with the industry median when " +
      "reported sits above the operating-model band. Tests whether the " +
      "deal survives a defensible baseline.",
    applies_to_models: ["contractor", "retail_inventory", "manufacturing", "field_service", "consumer_service", "professional_services", "asset_heavy_service"],
    applies_when: (context) => {
      // Only apply when at least one earnings-quality concern fired
      const earningsFired = hasRuleFired(context, "rule.earnings_quality.");
      const marginFired = hasRuleFired(context, "rule.margin.");
      if (!earningsFired && !marginFired) {
        return { applies: false, reason: "No earnings-quality or margin rules fired; industry normalization unnecessary." };
      }
      if (typeof context.inputs.revenue !== "number") {
        return { applies: false, reason: "Revenue not provided." };
      }
      if (typeof context.inputs.ebitda_margin_pct !== "number" && typeof context.inputs.sde_margin_pct !== "number") {
        return { applies: false, reason: "Neither EBITDA nor SDE margin provided." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["margin_sustainability", "add_back_integrity"],
    metrics_considered: ["ebitda_margin_pct", "sde_margin_pct", "dscr"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: { dscr_marginal: 1.30 },
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) {
        return notAppliedOutput({ scenario: this, context, reason: gate.reason });
      }

      // Use reported EBITDA margin or fall back to SDE margin
      const reportedMargin = context.inputs.ebitda_margin_pct ?? context.inputs.sde_margin_pct!;
      const model = context.fingerprint_resolution.fingerprint.key;

      // Industry-median margins (operating-model-typical from constitution Section 5)
      const medianByModel: Record<OperatingModelKey, number> = {
        contractor: 11,
        retail_inventory: 6,
        manufacturing: 10,
        field_service: 14,
        consumer_service: 16,
        professional_services: 18,
        asset_heavy_service: 22,
        service_with_inventory: 14,
        healthcare_practice: 18,
        ecommerce: 8,
        restaurant: 9,
        software: 18,
      };
      const median = medianByModel[model] ?? 12;

      // Only apply if reported is materially above median
      if (reportedMargin <= median + 2) {
        return notAppliedOutput({ scenario: this, context, reason: `Reported margin ${reportedMargin.toFixed(1)}% is at or near the ${model} median ${median}%; normalization adds nothing.` });
      }

      const marginResult = industryMedianMargin({
        revenue: context.inputs.revenue,
        reported_margin_pct: reportedMargin,
        industry_median_pct: median,
        rationale: `Reported margin of ${reportedMargin.toFixed(1)}% sits above ${model} median (${median}%). Industry-normalized baseline tests whether the deal survives at the typical operating level.`,
      });

      if (!marginResult.applicable || marginResult.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: marginResult.reason_if_inapplicable ?? "Margin primitive returned not-applicable." });
      }

      // Recompute DSCR against normalized earnings
      const dscrResult = recomputeDscr({
        adjusted_earnings: marginResult.value,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against industry-normalized earnings.",
      });

      const adjustedMarginPct = marginFromEarnings(marginResult.value, context.inputs.revenue);
      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];

      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`industry-normalized DSCR ${dscrResult.value.toFixed(2)}x`);
      }
      if (typeof adjustedMarginPct === "number") {
        clearances.push(evaluateMarginClearance(adjustedMarginPct, thresholds));
        metricDescriptions.push(`normalized margin ${adjustedMarginPct.toFixed(1)}%`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id,
        scenario_name: this.name,
        family: this.family,
        applied: true,
        reason_not_applied: null,
        adjustments: [marginResult.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          ebitda_margin_pct: adjustedMarginPct ?? undefined,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Earnings-quality or margin rule fired AND reported margin ${reportedMargin.toFixed(1)}% sits materially above ${model} median ${median}%.`,
        what_changed: `Reported margin ${reportedMargin.toFixed(1)}% → industry median ${median}%. DSCR recomputed against normalized earnings.`,
        why_defensible: `RMA-anchored industry median is the institutional underwriting baseline for this operating model. The normalization tests whether the deal survives when reported earnings are brought back to a defensible level.`,
        what_would_change_result: `Documentation that the elevated margin reflects durable structural advantages (service-mix concentration, pricing power) rather than ZIRP-era effects, addback inflation, or temporary cost deferral.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at,
        catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── N2. OWNER REPLACEMENT NORMALIZED ────────────────────────────────────
  {
    id: "scenario.normalization.owner_replacement_normalized",
    name: "Owner-replacement normalized earnings",
    family: "normalization",
    description:
      "Subtracts market-rate replacement compensation for the owner-operator " +
      "from SDE. Tests whether earnings hold when the buyer cannot or will " +
      "not operate the business themselves.",
    applies_to_models: [], // applies to all
    applies_when: (context) => {
      if (typeof context.inputs.sde !== "number") {
        return { applies: false, reason: "SDE not provided." };
      }
      // Apply when SDE margin is elevated OR when sole-proprietor signal fired
      const elevatedMargin = (context.inputs.sde_margin_pct ?? 0) > 18;
      const soleProprietorFired = hasRuleFired(context, "rule.margin.elevated_sde_with_sole_proprietor_signal");
      if (!elevatedMargin && !soleProprietorFired) {
        return { applies: false, reason: "Neither elevated SDE margin nor sole-proprietor signal present; owner replacement test not diagnostic." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["margin_sustainability", "key_person_transferability"],
    metrics_considered: ["sde_margin_pct", "dscr"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const replacementCost = suggestOwnerReplacementCost(context.fingerprint_resolution.fingerprint.key, context.inputs.revenue);
      const result = ownerReplacementNormalization({
        sde: context.inputs.sde,
        replacement_compensation: replacementCost,
        rationale: `Apply market-rate owner-replacement cost for ${context.fingerprint_resolution.fingerprint.display_name} operating model at this revenue scale.`,
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const dscrResult = recomputeDscr({
        adjusted_earnings: result.value,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against owner-replacement-normalized SDE.",
      });

      const adjustedMarginPct = marginFromEarnings(result.value, context.inputs.revenue);
      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`owner-replacement DSCR ${dscrResult.value.toFixed(2)}x`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          sde: result.value,
          sde_margin_pct: adjustedMarginPct ?? undefined,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Elevated SDE margin or sole-proprietor signal present; owner-replacement test is diagnostic.`,
        what_changed: `Subtracted $${replacementCost.toLocaleString()} owner-replacement compensation from SDE.`,
        why_defensible: `Most SBA-financed acquisitions require absentee-owner viability. Even owner-operated buyers should test whether earnings hold when paying market-rate operator compensation, since the same buyer may not remain in role indefinitely.`,
        what_would_change_result: `Lower replacement cost justified by industry/scale; owner relationships that the buyer will replicate without paid management; or post-close structure that retains the seller in an operating role.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── N3. CAPEX NORMALIZED ────────────────────────────────────────────────
  {
    id: "scenario.normalization.capex_normalized",
    name: "Industry-normalized maintenance capex",
    family: "normalization",
    description:
      "Applies an industry-typical maintenance capex charge to EBITDA. " +
      "Tests whether asset-heavy economics survive when D&A is replaced " +
      "with actual maintenance cash requirements.",
    applies_to_models: ["asset_heavy_service", "manufacturing", "service_with_inventory"],
    applies_when: (context) => {
      if (typeof context.inputs.ebitda !== "number" || typeof context.inputs.revenue !== "number") {
        return { applies: false, reason: "EBITDA or revenue not provided." };
      }
      // Apply unless EBITDA-to-operating gap rule already flagged the issue
      // (in which case the deal already shows asset-light variant)
      const ebitdaGapFired = hasRuleFired(context, "rule.mismatch.ebitda_operating_gap_thin");
      if (ebitdaGapFired) {
        return { applies: false, reason: "EBITDA-to-operating gap already flagged as thin; capex normalization redundant." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["capex_stability", "margin_sustainability"],
    metrics_considered: ["ebitda_margin_pct", "operating_margin_pct"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const model = context.fingerprint_resolution.fingerprint.key;
      // Industry-typical maintenance capex bands
      const capexByModel: Partial<Record<OperatingModelKey, number>> = {
        asset_heavy_service: 7,
        manufacturing: 4,
        service_with_inventory: 3,
      };
      const capexPct = capexByModel[model] ?? 5;

      const result = industryNormalizedCapex({
        ebitda: context.inputs.ebitda,
        revenue: context.inputs.revenue,
        capex_intensity_pct: capexPct,
        rationale: `${context.fingerprint_resolution.fingerprint.display_name} typically requires ${capexPct}% maintenance capex; EBITDA understates true cash cost of asset replacement.`,
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const dscrResult = recomputeDscr({
        adjusted_earnings: result.value,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against capex-normalized EBITDA.",
      });

      const adjustedMarginPct = marginFromEarnings(result.value, context.inputs.revenue);
      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`capex-normalized DSCR ${dscrResult.value.toFixed(2)}x`);
      }
      if (typeof adjustedMarginPct === "number") {
        clearances.push(evaluateMarginClearance(adjustedMarginPct, thresholds));
        metricDescriptions.push(`capex-normalized margin ${adjustedMarginPct.toFixed(1)}%`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          ebitda: result.value,
          ebitda_margin_pct: adjustedMarginPct ?? undefined,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Asset-heavy operating model where reported EBITDA may understate true maintenance cash requirements.`,
        what_changed: `Applied ${capexPct}% maintenance capex charge to EBITDA.`,
        why_defensible: `EBITDA excludes D&A but asset-heavy services consume real maintenance capex annually. Substituting industry-typical maintenance % converts EBITDA toward true cash-available-for-debt-service.`,
        what_would_change_result: `Recent capex receipts evidencing lower-than-typical maintenance requirements; or capital structure (seller note, deferred consideration) that absorbs near-term capex pressure.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── N4. ADDBACK PARTIAL RECOVERY ────────────────────────────────────────
  {
    id: "scenario.normalization.addback_partial_recovery",
    name: "Addback partial recovery (75% survives)",
    family: "normalization",
    description:
      "Assumes 25% of addbacks fail independent diligence. Tests whether " +
      "the deal survives at conservative-baseline SDE.",
    applies_to_models: [],
    applies_when: (context) => {
      if (typeof context.inputs.sde !== "number" || typeof context.inputs.addback_total !== "number") {
        return { applies: false, reason: "SDE or addback total not provided." };
      }
      const addbackConcernFired = hasRuleFired(context, "rule.earnings_quality.addback");
      if (!addbackConcernFired) {
        return { applies: false, reason: "No addback-quality rules fired; partial-recovery test not diagnostic." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["add_back_integrity"],
    metrics_considered: ["sde_margin_pct", "dscr"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const result = partialAddbackRecovery({
        sde: context.inputs.sde,
        addback_total: context.inputs.addback_total,
        recovery_rate: 0.75,
        rationale: "Conservative baseline: assume 25% of reported addbacks fail diligence review.",
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const dscrResult = recomputeDscr({
        adjusted_earnings: result.value,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against partially-recovered SDE.",
      });

      const adjustedMarginPct = marginFromEarnings(result.value, context.inputs.revenue);
      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`partial-recovery DSCR ${dscrResult.value.toFixed(2)}x`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          sde: result.value,
          sde_margin_pct: adjustedMarginPct ?? undefined,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `An addback-quality rule fired; partial recovery is the standard diligence-stress test.`,
        what_changed: `Stripped 25% of reported addbacks from SDE.`,
        why_defensible: `Conservative QoE practice frequently disallows 15-25% of seller-reported addbacks (personal expense reclassification, non-recurring items, missing documentation). This scenario tests survivability under that conservative baseline.`,
        what_would_change_result: `CPA-prepared addback schedule with tax-return-anchored line items demonstrating all addbacks are independently verifiable.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── N5. CHURN NORMALIZED ────────────────────────────────────────────────
  {
    id: "scenario.normalization.churn_normalized",
    name: "Industry-typical churn applied to recurring revenue",
    family: "normalization",
    description:
      "Applies industry-typical churn to the reported revenue base. Tests " +
      "whether software, subscription, or recurring-revenue businesses survive " +
      "at a defensible retention baseline.",
    applies_to_models: ["software"],
    applies_when: (context) => {
      if (typeof context.inputs.revenue !== "number") {
        return { applies: false, reason: "Revenue not provided." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["recurring_revenue_persistence", "customer_retention"],
    metrics_considered: ["revenue_cagr_3yr"],
    clearance_basis: "margin",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      // SaaS industry-typical net churn ~12% for SMB-sized recurring revenue
      const churnPct = 12;
      const result = revenueCompression({
        revenue: context.inputs.revenue,
        compression_pct: churnPct,
        rationale: `Apply ${churnPct}% industry-typical net churn to recurring revenue base.`,
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const dscrResult = recomputeDscr({
        adjusted_earnings: typeof context.inputs.sde_margin_pct === "number"
          ? result.value * (context.inputs.sde_margin_pct / 100)
          : undefined,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against churn-adjusted revenue base.",
      });

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`churn-normalized DSCR ${dscrResult.value.toFixed(2)}x`);
      } else {
        metricDescriptions.push(`adjusted revenue $${result.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
      }

      const clears = clearances.length > 0 ? combineClearances(clearances) : "clears_marginally";

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          revenue: result.value,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Software/recurring-revenue operating model; churn normalization is the central durability test.`,
        what_changed: `Compressed revenue by ${churnPct}% to reflect industry-typical net churn.`,
        why_defensible: `Software businesses without verified retention data are presumed to face industry-typical churn until proven otherwise. SMB SaaS net churn typically runs 10-15% absent specific cohort evidence.`,
        what_would_change_result: `Cohort-level retention export demonstrating net retention > 100%, or contractual commitments materially extending revenue durability.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // STRESS FAMILY (6 scenarios)
  // ════════════════════════════════════════════════════════════════════════

  // ── S1. LENDER STRESS ────────────────────────────────────────────────────
  {
    id: "scenario.stress.lender_stress",
    name: "Conservative lender stress",
    family: "stress",
    description:
      "Stricter clearance thresholds modeling how a conservative lender " +
      "evaluates coverage. Applies partial addback recovery and conservative " +
      "DSCR threshold (1.50x marginal, 1.30x compressed).",
    applies_to_models: [],
    applies_when: (context) => {
      if (typeof context.inputs.dscr !== "number" && typeof context.inputs.sde !== "number") {
        return { applies: false, reason: "Neither DSCR nor SDE provided." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["covenant_headroom", "margin_sustainability", "add_back_integrity"],
    metrics_considered: ["dscr", "current_ratio"],
    clearance_basis: "coverage",
    // Stricter thresholds reflecting conservative lender posture
    clearance_threshold_overrides: {
      dscr_comfortable: 1.75,
      dscr_marginal: 1.50,
      dscr_compressed: 1.30,
      dscr_failure: 1.20,
    },
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      // Apply partial addback recovery + working capital compression
      let earnings: number | undefined = context.inputs.sde;
      const records = [];

      if (typeof context.inputs.addback_total === "number") {
        const addbackResult = partialAddbackRecovery({
          sde: context.inputs.sde,
          addback_total: context.inputs.addback_total,
          recovery_rate: 0.65,
          rationale: "Lender stress: assume 35% of addbacks face independent challenge.",
        });
        if (addbackResult.applicable && addbackResult.value !== null) {
          earnings = addbackResult.value;
          records.push(addbackResult.record!);
        }
      }

      const dscrResult = recomputeDscr({
        adjusted_earnings: earnings,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against stressed earnings.",
      });
      if (dscrResult.record) records.push(dscrResult.record);

      const crResult = workingCapitalCompression({
        current_ratio: context.inputs.current_ratio,
        compression_factor: 0.85,
        rationale: "Lender stress: working capital compresses 15% under conservative assumptions.",
      });
      if (crResult.record) records.push(crResult.record);

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];

      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`lender-stress DSCR ${dscrResult.value.toFixed(2)}x`);
      }
      if (crResult.applicable && typeof crResult.value === "number") {
        clearances.push(evaluateCurrentRatioClearance(crResult.value, thresholds));
        metricDescriptions.push(`compressed current ratio ${crResult.value.toFixed(2)}`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: records,
        adjusted_inputs: {
          dscr: dscrResult.value ?? undefined,
          current_ratio: crResult.value ?? undefined,
          sde: earnings,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Coverage and/or earnings data present; conservative lender stress is a standard underwriting test.`,
        what_changed: `Reduced earnings via 35% addback challenge; compressed current ratio by 15%; applied stricter DSCR thresholds (1.50x marginal vs 1.30x baseline).`,
        why_defensible: `Conservative lenders model partial addback recovery and working capital compression as part of base underwriting. The scenario reflects how a strict cash-flow-focused lender would read the same numbers.`,
        what_would_change_result: `Lower addback risk (CPA-prepared QoE with bank-statement evidence); higher working capital cushion; or alternative capital structure (seller financing with standby provisions) that reduces lender-perceived risk.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── S2. BUYER DOWNSIDE — TOP CUSTOMER LOSS ──────────────────────────────
  {
    id: "scenario.stress.buyer_downside_top_customer_loss",
    name: "Top customer loss post-close",
    family: "stress",
    description:
      "Removes the top customer's revenue contribution. Tests whether the " +
      "deal survives concentration shock during transition.",
    applies_to_models: [],
    applies_when: (context) => {
      if (typeof context.inputs.revenue !== "number") {
        return { applies: false, reason: "Revenue not provided." };
      }
      if (typeof context.inputs.top_customer_pct !== "number") {
        return { applies: false, reason: "Top customer percentage not provided." };
      }
      if (context.inputs.top_customer_pct < 10) {
        return { applies: false, reason: `Top customer share ${context.inputs.top_customer_pct}% is below 10%; loss test not diagnostic.` };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["customer_retention", "transition_execution"],
    metrics_considered: ["dscr"],
    clearance_basis: "concentration",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const revResult = topCustomerLoss({
        revenue: context.inputs.revenue,
        top_customer_pct: context.inputs.top_customer_pct,
        retention_factor: 0,
        rationale: "Buyer-downside: top customer departs at close.",
      });
      if (!revResult.applicable || revResult.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: revResult.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      // Approximate SDE compression assuming margin holds on reduced base
      const sdeMargin = context.inputs.sde_margin_pct ?? 0;
      const adjustedSde = revResult.value * (sdeMargin / 100);

      const dscrResult = recomputeDscr({
        adjusted_earnings: adjustedSde,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against post-loss revenue base.",
      });

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`post-loss DSCR ${dscrResult.value.toFixed(2)}x`);
      }
      metricDescriptions.push(`revenue compressed by ${context.inputs.top_customer_pct}%`);

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [revResult.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          revenue: revResult.value,
          sde: adjustedSde,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Top customer ${context.inputs.top_customer_pct}% of revenue; loss test is structurally relevant.`,
        what_changed: `Removed top customer's revenue contribution (${context.inputs.top_customer_pct}%); SDE compressed proportionally.`,
        why_defensible: `Customer concentration risk is the most common post-close revenue compression source. Modeling full loss tests whether the deal survives the worst plausible outcome of unsuccessful transition.`,
        what_would_change_result: `Long-dated assignable contract with the top customer; demonstrated customer relationship transferability; earn-out structure tied to retention.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── S3. BUYER DOWNSIDE — WAGE INFLATION ─────────────────────────────────
  {
    id: "scenario.stress.buyer_downside_wage_inflation",
    name: "Wage inflation without offsetting pricing",
    family: "stress",
    description:
      "Applies 4% wage cost inflation as % of revenue with zero offsetting " +
      "pricing power. Tests labor-intensive operating models.",
    applies_to_models: ["consumer_service", "field_service", "contractor", "asset_heavy_service", "restaurant", "service_with_inventory"],
    applies_when: (context) => {
      if (typeof context.inputs.sde !== "number" || typeof context.inputs.revenue !== "number") {
        return { applies: false, reason: "SDE or revenue not provided." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["pricing_power", "labor_retention", "margin_sustainability"],
    metrics_considered: ["sde_margin_pct", "dscr"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const result = wageInflation({
        sde: context.inputs.sde,
        revenue: context.inputs.revenue,
        labor_inflation_pct: 4,
        rationale: "Buyer downside: 4% labor cost increase with no offsetting pricing power over the underwriting horizon.",
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const dscrResult = recomputeDscr({
        adjusted_earnings: result.value,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against wage-inflated SDE.",
      });

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`post-wage-inflation DSCR ${dscrResult.value.toFixed(2)}x`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          sde: result.value,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Labor-intensive operating model; wage-inflation downside is structurally relevant.`,
        what_changed: `Applied 4% labor cost increase as percentage of revenue without offsetting pricing.`,
        why_defensible: `Labor cost inflation has consistently outpaced consumer-pricing inflation in service businesses since 2022. Many service operating models cannot fully pass wage increases to customers within the underwriting horizon.`,
        what_would_change_result: `Documented pricing-power evidence (recent price increases absorbed by customers without volume loss); or labor cost mix that is structurally insulated (subcontractor-heavy, commission-only).`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── S4. BUYER DOWNSIDE — PARTNER DEPARTURE ──────────────────────────────
  {
    id: "scenario.stress.buyer_downside_partner_departure",
    name: "Partner / key-person departure post-close",
    family: "stress",
    description:
      "Applies revenue compression reflecting loss of a key partner or " +
      "principal. Specific to professional services where books-of-business " +
      "concentrate by partner.",
    applies_to_models: ["professional_services", "healthcare_practice"],
    applies_when: (context) => {
      if (typeof context.inputs.revenue !== "number") {
        return { applies: false, reason: "Revenue not provided." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["key_person_transferability", "customer_retention", "transition_execution"],
    metrics_considered: ["dscr"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      // Assume 20% revenue compression from partner / key-person departure
      const result = revenueCompression({
        revenue: context.inputs.revenue,
        compression_pct: 20,
        rationale: "Buyer downside: partner or key-person departs taking 20% of revenue.",
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const sdeMargin = context.inputs.sde_margin_pct ?? 0;
      const adjustedSde = result.value * (sdeMargin / 100);
      const dscrResult = recomputeDscr({
        adjusted_earnings: adjustedSde,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against partner-departure compressed revenue.",
      });

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`partner-departure DSCR ${dscrResult.value.toFixed(2)}x`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          revenue: result.value,
          sde: adjustedSde,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Professional-services or healthcare-practice operating model; partner-departure risk is structurally relevant.`,
        what_changed: `Compressed revenue by 20% to model partner / key-person departure with book of business.`,
        why_defensible: `In partner-driven service businesses, individual principals routinely carry 15-30% of revenue via personal relationships. Non-compete enforcement is imperfect; assignability is partial. The scenario tests survivability of this single largest transition risk.`,
        what_would_change_result: `Strong non-compete with documented enforcement track record; pre-close transition meeting with key clients; or earn-out structure that aligns seller's interests with successful transition.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── S5. WORKING CAPITAL COMPRESSED ──────────────────────────────────────
  {
    id: "scenario.stress.working_capital_compressed",
    name: "Working capital compression",
    family: "stress",
    description:
      "Applies 25% compression to current ratio modeling AR cycle extension " +
      "and AP terms tightening simultaneously.",
    applies_to_models: ["contractor", "manufacturing", "service_with_inventory", "retail_inventory"],
    applies_when: (context) => {
      if (typeof context.inputs.current_ratio !== "number") {
        return { applies: false, reason: "Current ratio not provided." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["working_capital_stability"],
    metrics_considered: ["current_ratio"],
    clearance_basis: "working_capital",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const result = workingCapitalCompression({
        current_ratio: context.inputs.current_ratio,
        compression_factor: 0.75,
        rationale: "Stress: AR cycle extends + AP tightens; current ratio compresses 25%.",
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);
      const clearance = evaluateCurrentRatioClearance(result.value, thresholds);
      const metricDescriptions = [`compressed current ratio ${result.value.toFixed(2)}`];

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!],
        adjusted_inputs: { current_ratio: result.value },
        clears: clearance,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `Working-capital-intensive operating model; compression test is structurally relevant.`,
        what_changed: `Compressed current ratio by 25% via combined AR extension and AP tightening pressures.`,
        why_defensible: `Working capital intensifies during transitions: customers test new ownership by stretching AR; suppliers tighten terms until they re-establish trust. The 25% compression reflects normal transition friction.`,
        what_would_change_result: `Working capital injection at close; demonstrated through-cycle WC stability via multi-year balance-sheet walk; or seller-financed working capital line.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },

  // ── S6. REVENUE COMPRESSION ─────────────────────────────────────────────
  {
    id: "scenario.stress.revenue_compression",
    name: "Generic revenue compression",
    family: "stress",
    description:
      "Applies 15% revenue compression to test general downside survivability. " +
      "Most useful when trajectory rules surface sustained decline or " +
      "volatility concerns.",
    applies_to_models: [],
    applies_when: (context) => {
      if (typeof context.inputs.revenue !== "number" || typeof context.inputs.sde !== "number") {
        return { applies: false, reason: "Revenue or SDE not provided." };
      }
      const trajectoryFired = hasRuleFired(context, "rule.trajectory.");
      if (!trajectoryFired) {
        return { applies: false, reason: "No trajectory rules fired; generic revenue compression not diagnostic." };
      }
      return { applies: true };
    },
    depends_on_assumptions: ["revenue_quality", "margin_sustainability"],
    metrics_considered: ["dscr"],
    clearance_basis: "coverage",
    clearance_threshold_overrides: null,
    evaluate(context) {
      const gate = this.applies_when(context);
      if (!gate.applies) return notAppliedOutput({ scenario: this, context, reason: gate.reason });

      const result = revenueCompression({
        revenue: context.inputs.revenue,
        compression_pct: 15,
        rationale: "Stress: 15% revenue decline reflecting downside trajectory.",
      });
      if (!result.applicable || result.value === null) {
        return notAppliedOutput({ scenario: this, context, reason: result.reason_if_inapplicable ?? "Primitive not-applicable." });
      }

      const sdeMargin = context.inputs.sde_margin_pct ?? 0;
      const adjustedSde = result.value * (sdeMargin / 100);
      const dscrResult = recomputeDscr({
        adjusted_earnings: adjustedSde,
        debt_to_sde: context.inputs.debt_to_sde,
        original_sde: context.inputs.sde,
        original_dscr: context.inputs.dscr,
        rationale: "Recompute coverage against compressed revenue.",
      });

      const thresholds = resolveThresholds(this.clearance_threshold_overrides);

      const clearances: ScenarioClearance[] = [];
      const metricDescriptions: string[] = [];
      if (dscrResult.applicable && typeof dscrResult.value === "number") {
        clearances.push(evaluateDscrClearance(dscrResult.value, thresholds));
        metricDescriptions.push(`post-compression DSCR ${dscrResult.value.toFixed(2)}x`);
      }

      const clears = combineClearances(clearances);

      return {
        output_id: makeOutputId(this.id, context.evaluated_at),
        scenario_id: this.id, scenario_name: this.name, family: this.family,
        applied: true, reason_not_applied: null,
        adjustments: [result.record!, ...(dscrResult.record ? [dscrResult.record] : [])],
        adjusted_inputs: {
          revenue: result.value,
          sde: adjustedSde,
          dscr: dscrResult.value ?? undefined,
        },
        clears,
        clearance_basis: this.clearance_basis,
        clearance_reason: buildClearanceReason({ clearance: clears, basis: this.clearance_basis, metric_descriptions: metricDescriptions }),
        scenario_confidence_score: null,
        confidence_factors: buildConfidenceFactors(context),
        what_triggered: `A trajectory rule fired; generic revenue-compression stress is diagnostic.`,
        what_changed: `Compressed revenue by 15% reflecting downside trajectory; SDE compressed proportionally.`,
        why_defensible: `When trajectory rules flag volatility, decline, or rapid margin expansion, the deal carries elevated revenue-durability risk. A 15% compression is a moderate stress reflecting recently-observed downside.`,
        what_would_change_result: `Decomposition of trajectory concerns showing identifiable, reversible causes; or contractual revenue commitments that materially insulate the trailing revenue base.`,
        depends_on_assumptions: this.depends_on_assumptions,
        evaluated_at: context.evaluated_at, catalogue_version: SCENARIO_CATALOGUE_VERSION,
      };
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioCatalogueAuditResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly scenario_count: number;
  readonly by_family: Record<ScenarioFamily, number>;
  readonly version: string;
}

export function validateScenarioCatalogue(): ScenarioCatalogueAuditResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  const seenIds = new Set<string>();
  const byFamily: Record<ScenarioFamily, number> = {
    normalization: 0,
    stress: 0,
    structural_reinterpretation: 0,
  };

  for (const s of SCENARIO_CATALOGUE) {
    if (seenIds.has(s.id)) {
      issues.push({ severity: "error", location: `scenario[${s.id}]`, message: `Duplicate scenario_id` });
    }
    seenIds.add(s.id);

    if (!isValidScenarioId(s.id)) {
      issues.push({ severity: "error", location: `scenario[${s.id}].id`, message: `Invalid scenario ID format` });
    }

    if (!s.name || s.name.trim().length < 5) {
      issues.push({ severity: "error", location: `scenario[${s.id}].name`, message: `Name missing or too short` });
    }
    if (!s.description || s.description.trim().length < 30) {
      issues.push({ severity: "error", location: `scenario[${s.id}].description`, message: `Description missing or too short` });
    }

    // Family must be one of the three valid values
    if (s.family !== "normalization" && s.family !== "stress" && s.family !== "structural_reinterpretation") {
      issues.push({ severity: "error", location: `scenario[${s.id}].family`, message: `Invalid family value: ${s.family}` });
    } else {
      byFamily[s.family] += 1;
    }

    // Structural reinterpretation reserved in CP-4
    if (s.family === "structural_reinterpretation") {
      issues.push({
        severity: "warning",
        location: `scenario[${s.id}]`,
        message: `Scenario declares structural_reinterpretation family — this category is RESERVED in CP-4. Future build only.`,
      });
    }

    // Lender-profile leakage check
    const haystack = (s.name + " " + s.description).toLowerCase();
    const lenderTerms = ["sba", "conventional bank", "search fund", "independent sponsor", "pe-backed", "pe_backed"];
    for (const term of lenderTerms) {
      if (haystack.includes(term)) {
        issues.push({ severity: "error", location: `scenario[${s.id}]`, message: `Possible lender-profile leakage: "${term}"` });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    scenario_count: SCENARIO_CATALOGUE.length,
    by_family: byFamily,
    version: SCENARIO_CATALOGUE_VERSION,
  };
}

function assertScenarioCatalogueValid(): void {
  const result = validateScenarioCatalogue();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(`Scenario catalogue validation failed (${SCENARIO_CATALOGUE_VERSION}):\n${errorList}`);
  }
}

assertScenarioCatalogueValid();

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getScenario(scenario_id: string): Scenario | null {
  return SCENARIO_CATALOGUE.find((s) => s.id === scenario_id) ?? null;
}

export function scenariosByFamily(family: ScenarioFamily): ReadonlyArray<Scenario> {
  return SCENARIO_CATALOGUE.filter((s) => s.family === family);
}

export function scenariosForModel(model: OperatingModelKey): ReadonlyArray<Scenario> {
  return SCENARIO_CATALOGUE.filter(
    (s) => s.applies_to_models.length === 0 || s.applies_to_models.includes(model),
  );
}

// Suppress unused-import warnings
const _suppress: AssumptionKey | undefined = undefined;
const _suppress2: ClearanceThresholdOverrides | undefined = undefined;
const _suppress3: ClearanceBasis | undefined = undefined;
void _suppress; void _suppress2; void _suppress3;
