// lib/intelligence/rules/rule-catalogue.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Interaction Rule Catalogue
//
// CP-3 Module: The initial catalogue of ~28 underwriting rules. Each rule
// is a pure function evaluating one structured observation against a deal.
//
// Editing principle: every rule encodes a specific underwriting question
// in plain language. The catalogue is institutional doctrine, not code
// optimization. Every rule must answer: "Why do you believe this?"
//
// Catalogue design constraints (per CP-3 decisions):
//
//   1. Rules are pure functions. No rule reads another rule's output.
//      Correlated patterns are detected post-evaluation in mismatch-patterns.ts.
//
//   2. Three firing classifications must remain distinct:
//      - statistically_atypical: outside expected band, question only
//      - structurally_suspicious: high-confidence multi-signal in single rule
//      - unsupported_by_evidence: claim rests on weak source
//
//   3. Three independent output streams (finding / uncertainty_escalation /
//      source_concern) never blend. Uncertainty never punishes durability.
//
//   4. Catalogue includes positive rules — credible strengths matter.
//
//   5. Missing data triggers source-upgrade recommendations or uncertainty
//      signals, not negative findings.
//
//   6. No lender-profile leakage. Rules reference axes, assumptions,
//      source types, and metrics only.
//
//   7. Hybrid-model deals get fewer rule firings (suppression), not
//      lower-confidence firings (degradation).
//
// Catalogue version: cp3-v0.1.0
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
  MetricKey,
  OperatingModelKey,
  SourceTypeKey,
} from "../types";
import type {
  Finding,
  FiringClassification,
  FiringId,
  FiringPolarity,
  FiringSeverity,
  ModelFitRequirement,
  Rule,
  RuleEvaluationContext,
  RuleFiring,
  SourceConcern,
  SourceUpgradeRecommendation,
  UncertaintyDelta,
} from "./types";
import { RULE_CATALOGUE_VERSION } from "./types";
import { ASSUMPTIONS, findUnknownAssumptionKeys } from "../assumption-taxonomy";
import { METRIC_RELEVANCE } from "../metric-relevance";
import { resolveSourceStrength, meetsSourceMinimum } from "../source-types";
import {
  generateBestRecommendation,
  generateRecommendations,
} from "./source-upgrade";

// ─────────────────────────────────────────────────────────────────────────────
// FIRING ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let firingCounter = 0;
/** Deterministic-enough for snapshot correlation while remaining unique per process. */
function makeFiringId(rule_id: string, evaluated_at: string): FiringId {
  firingCounter += 1;
  return `${rule_id}@${evaluated_at}#${firingCounter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRING CONSTRUCTOR
// ─────────────────────────────────────────────────────────────────────────────
// Helper to build a RuleFiring while preserving structural invariants.

interface FiringBuilderArgs {
  rule: Rule;
  context: RuleEvaluationContext;
  classification?: FiringClassification;
  severity?: FiringSeverity;
  polarity?: FiringPolarity;
  finding: Finding | null;
  uncertainty_escalation: UncertaintyDelta | null;
  source_concern: SourceConcern | null;
  what_triggered: string;
  why_it_matters: string;
  what_would_invalidate: string;
  evidence_to_increase_confidence?: ReadonlyArray<SourceUpgradeRecommendation>;
  references_trigger_ids?: ReadonlyArray<string>;
}

function buildFiring(args: FiringBuilderArgs): RuleFiring {
  return {
    firing_id: makeFiringId(args.rule.id, args.context.evaluated_at),
    rule_id: args.rule.id,
    rule_name: args.rule.name,
    classification: args.classification ?? args.rule.default_classification,
    polarity: args.polarity ?? args.rule.polarity,
    severity: args.severity ?? args.rule.default_severity,
    finding: args.finding,
    uncertainty_escalation: args.uncertainty_escalation,
    source_concern: args.source_concern,
    what_triggered: args.what_triggered,
    why_it_matters: args.why_it_matters,
    depends_on_assumptions: args.rule.depends_on_assumptions,
    evidence_to_increase_confidence: args.evidence_to_increase_confidence ?? [],
    what_would_invalidate: args.what_would_invalidate,
    fired_at: args.context.evaluated_at,
    catalogue_version: RULE_CATALOGUE_VERSION,
    references_trigger_ids: args.references_trigger_ids ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve metric source — fall back to deal-level source if no per-metric source declared. */
function metricSource(context: RuleEvaluationContext, metric: MetricKey): SourceTypeKey | "unknown" {
  const perMetric = context.inputs.metric_sources?.[metric];
  if (perMetric) return perMetric;
  if (context.inputs.deal_source_type) return context.inputs.deal_source_type;
  return "unknown";
}

/** True if all required values are present and numeric. */
function hasAll(values: ReadonlyArray<number | undefined | null>): boolean {
  return values.every((v) => typeof v === "number" && !isNaN(v));
}

/** Compute year-over-year basis points change in a margin. */
function bpsChange(current: number, prior: number): number {
  return Math.round((current - prior) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────
// 28 rules organized by category. Each rule is self-contained.
//
// Categories:
//   A. Earnings quality (4 rules)
//   B. Coverage and leverage (3 rules)
//   C. Working capital and liquidity (3 rules)
//   D. Customer concentration (2 rules)
//   E. Margin profile (4 rules)
//   F. Operating-model mismatch (3 rules)
//   G. Trajectory signals (3 rules)
//   H. Evidence quality (3 rules)
//   I. Positive / strength rules (3 rules)

export const RULE_CATALOGUE: ReadonlyArray<Rule> = [
  // ── A1. Earnings: high SDE margin in low-margin operating model ────────────
  {
    id: "rule.earnings_quality.elevated_sde_margin_in_band_model",
    name: "Elevated SDE margin in tight-band operating model",
    description:
      "Fires when SDE margin sits materially above the operating-model's expected band — common in contractor and retail_inventory models where the band is structurally narrow. Surfaces a question, not a conclusion.",
    applies_to_models: ["contractor", "retail_inventory", "manufacturing"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["add_back_integrity", "margin_sustainability"],
    reads_metrics: ["sde_margin_pct", "ebitda_margin_pct"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const sde = context.inputs.sde_margin_pct;
      if (typeof sde !== "number") return null;
      const model = context.fingerprint_resolution.fingerprint.key;

      // Operating-model-specific ceilings drawn from constitution Section 5
      const ceilings: Partial<Record<OperatingModelKey, number>> = {
        contractor: 16,
        retail_inventory: 12,
        manufacturing: 17,
      };
      const ceiling = ceilings[model];
      if (ceiling === undefined || sde <= ceiling) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.earnings_quality.elevated_sde_margin_in_band_model",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "neutral",
          axis_impact: [
            { axis: "evidence_quality", relative_magnitude: "medium" },
            { axis: "underwriting_uncertainty", relative_magnitude: "medium" },
          ],
          observation: `SDE margin of ${sde.toFixed(1)}% sits materially above the ${model} band ceiling of ${ceiling}%.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `SDE margin ${sde.toFixed(1)}% exceeds ${model} expected ceiling of ${ceiling}%.`,
        why_it_matters:
          `Operating models with tight margin bands rarely sustain SDE materially above the ceiling without one of: ` +
          `service-mix concentration not yet disclosed, owner compensation under-reported into the add-back schedule, ` +
          `or temporary pricing-power conditions. The deviation itself is not evidence of weakness — it is a question that ` +
          `requires diligence to resolve.`,
        what_would_invalidate:
          `Tax-return-anchored add-back schedule confirming each material add-back; service-vs-install mix disclosure ` +
          `(for contractor); explicit pricing history showing the elevated margin reflects durable conditions rather than ` +
          `a recent pricing event.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "addback_schedule",
          actual_source: metricSource(context, "sde_margin_pct"),
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── A2. Earnings: add-back concentration ──────────────────────────────────
  {
    id: "rule.earnings_quality.addback_concentration_high",
    name: "High add-back concentration on top line items",
    description:
      "Fires when add-back schedule shows excessive concentration on the largest individual add-back items. Single-line add-back concentration is structurally fragile.",
    applies_to_models: [], // applies to all
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["add_back_integrity"],
    reads_metrics: ["sde_margin_pct"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const concentration = context.inputs.addback_concentration_top_line_pct;
      if (typeof concentration !== "number") return null;
      if (concentration < 50) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.earnings_quality.addback_concentration_high",
      )!;

      const isHigh = concentration >= 70;
      return buildFiring({
        rule,
        context,
        severity: isHigh ? "high" : "medium",
        finding: {
          direction: "neutral",
          axis_impact: [
            { axis: "assumption_fragility", relative_magnitude: isHigh ? "high" : "medium" },
            { axis: "evidence_quality", relative_magnitude: "medium" },
          ],
          observation: `Top add-back line items account for ${concentration.toFixed(0)}% of the add-back schedule.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Top add-back items represent ${concentration.toFixed(0)}% of total adjustments.`,
        why_it_matters:
          `Concentrated add-back schedules create a single-point-of-failure dependency on add_back_integrity. If even one ` +
          `large add-back fails diligence, SDE compresses materially. Distributed add-backs are more resilient because ` +
          `individual challenges affect SDE marginally rather than structurally.`,
        what_would_invalidate:
          `Each material add-back independently verified via tax-return line items and bank-statement transactions. ` +
          `Documentation that the largest add-backs reflect genuinely owner-discretionary expenses rather than operating costs.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "addback_schedule",
          actual_source: metricSource(context, "sde_margin_pct"),
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── A3. Earnings: SDE backed by weak source ───────────────────────────────
  {
    id: "rule.earnings_quality.sde_weakly_sourced",
    name: "SDE rests on seller-controlled evidence only",
    description:
      "Fires when SDE is reported but the underlying source is seller_spreadsheet or weaker. SDE conclusions need verified-band sources.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["add_back_integrity"],
    reads_metrics: ["sde_margin_pct"],
    polarity: "concern",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      const sde = context.inputs.sde_margin_pct;
      if (typeof sde !== "number") return null;
      const source = metricSource(context, "sde_margin_pct");
      if (source === "unknown") return null; // separate rule handles unknown sources
      if (meetsSourceMinimum(source as SourceTypeKey, "tax_returns")) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.earnings_quality.sde_weakly_sourced",
      )!;

      const sourceStrength = resolveSourceStrength(source);
      const isVeryWeak = sourceStrength < 40;

      return buildFiring({
        rule,
        context,
        severity: isVeryWeak ? "high" : "medium",
        finding: null,
        uncertainty_escalation: null,
        source_concern: {
          affected_input: "sde",
          actual_source: source,
          expected_minimum_source: "tax_returns",
          evidence_quality_reduction_points: isVeryWeak ? 18 : 12,
          reason: `SDE relies on ${source} evidence; tax_returns is the expected minimum for earnings claims.`,
        },
        what_triggered: `SDE margin reported (${sde.toFixed(1)}%) but underlying evidence is ${source}, below the tax_returns minimum.`,
        why_it_matters:
          `SDE is the cash-flow signal that drives valuation and coverage analysis. When the underlying source is seller-controlled ` +
          `(internal P&L, spreadsheet) without tax-return anchoring, the engine cannot independently confirm that reported earnings ` +
          `reflect actual cash generation. This does not mean the SDE is wrong — it means the conclusion drawn from it carries ` +
          `evidence-quality uncertainty until verified.`,
        what_would_invalidate:
          `Three years of business tax returns showing gross receipts and expense detail consistent with the reported SDE. ` +
          `CPA-prepared quality-of-earnings analysis. Bank-statement reconciliation supporting the reported revenue.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "addback_schedule",
          actual_source: source,
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── A4. Earnings: missing addback detail ──────────────────────────────────
  {
    id: "rule.earnings_quality.addback_detail_missing",
    name: "Add-back detail not provided",
    description:
      "Fires when SDE is reported but no add-back schedule detail is provided. Cannot evaluate add-back integrity without the schedule.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["add_back_integrity"],
    reads_metrics: ["sde_margin_pct"],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "low",
    evaluate: (context) => {
      const sde = context.inputs.sde_margin_pct;
      const addbackTotal = context.inputs.addback_total;
      const addbackConcentration = context.inputs.addback_concentration_top_line_pct;
      if (typeof sde !== "number") return null;
      // Only fire if SDE is reported but neither addback detail field is present
      if (typeof addbackTotal === "number" || typeof addbackConcentration === "number") return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.earnings_quality.addback_detail_missing",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "data_uncertainty",
          escalation_points: 6,
          reason: "SDE reported without supporting add-back schedule detail; integrity cannot be assessed.",
        },
        source_concern: null,
        what_triggered: `SDE margin reported (${sde.toFixed(1)}%) without add-back schedule detail.`,
        why_it_matters:
          `SDE is computed from operating earnings plus owner-benefit add-backs. Without the schedule, the engine cannot ` +
          `assess whether add-backs are concentrated, whether they reflect genuinely owner-discretionary expenses, or whether ` +
          `they match tax-return evidence. The missing data is itself a diligence priority, not a conclusion about the business.`,
        what_would_invalidate:
          `Detailed add-back schedule line-by-line with corresponding tax-return categories and bank-statement evidence ` +
          `for material items.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "addback_schedule",
          actual_source: metricSource(context, "sde_margin_pct"),
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── B1. Coverage: DSCR below conservative threshold ───────────────────────
  {
    id: "rule.coverage.dscr_thin",
    name: "DSCR below conservative threshold",
    description: "Fires when DSCR is below 1.30x. Thin coverage is a structural concern regardless of model.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["covenant_headroom", "margin_sustainability"],
    reads_metrics: ["dscr"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "high",
    evaluate: (context) => {
      const dscr = context.inputs.dscr;
      if (typeof dscr !== "number") return null;
      if (dscr >= 1.30) return null;

      const rule = RULE_CATALOGUE.find((r) => r.id === "rule.coverage.dscr_thin")!;
      const isVeryThin = dscr < 1.15;
      return buildFiring({
        rule,
        context,
        severity: isVeryThin ? "high" : "medium",
        classification: isVeryThin ? "structurally_suspicious" : "statistically_atypical",
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "financial_score", relative_magnitude: isVeryThin ? "high" : "medium" },
            { axis: "durability_score", relative_magnitude: "medium" },
          ],
          observation: `Modeled DSCR of ${dscr.toFixed(2)}x sits below the 1.30x conservative threshold.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `DSCR ${dscr.toFixed(2)}x below 1.30x.`,
        why_it_matters:
          `DSCR below 1.30x leaves limited buffer against earnings volatility, scenario compression, or covenant ` +
          `pressure. A normalized-earnings scenario or a buyer-downside scenario can push thin DSCR below 1.0x, ` +
          `triggering technical default risk. This is independent of any single lender's posture — it is a structural ` +
          `signal that the capital structure has narrow margin for error.`,
        what_would_invalidate:
          `Either reduced acquisition debt (lowering debt service), confirmed earnings stability under normalization ` +
          `(supporting current DSCR), or seller financing structured to defer principal until DSCR widens.`,
      });
    },
  },

  // ── B2. Coverage: DSCR not provided but high leverage ─────────────────────
  {
    id: "rule.coverage.dscr_missing_with_leverage",
    name: "DSCR not available; leverage signal present",
    description:
      "Fires when DSCR is not provided but debt-to-SDE is elevated. Cannot assess coverage; surfaces as uncertainty rather than concern.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["covenant_headroom"],
    reads_metrics: ["dscr", "debt_to_sde"],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      const dscr = context.inputs.dscr;
      const debtToSde = context.inputs.debt_to_sde;
      if (typeof dscr === "number") return null;
      if (typeof debtToSde !== "number") return null;
      if (debtToSde < 3.5) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.coverage.dscr_missing_with_leverage",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "data_uncertainty",
          escalation_points: 10,
          reason: `Debt-to-SDE of ${debtToSde.toFixed(2)}x is elevated, but DSCR is not provided. Coverage cannot be evaluated.`,
        },
        source_concern: null,
        what_triggered: `Debt-to-SDE ${debtToSde.toFixed(2)}x without DSCR provided.`,
        why_it_matters:
          `Elevated leverage without coverage data leaves the engine unable to assess whether earnings adequately ` +
          `service the proposed debt. Filling this gap is a high-priority diligence item before any structural conclusion ` +
          `can be drawn.`,
        what_would_invalidate:
          `DSCR calculation provided based on proposed debt structure and trailing earnings; or confirmation that earnings ` +
          `materially exceed the implied debt service at this leverage level.`,
      });
    },
  },

  // ── B3. Coverage: negative net worth not flagged by model ────────────────
  {
    id: "rule.leverage.debt_to_worth_extreme",
    name: "Debt-to-worth extreme in industry where it is meaningful",
    description:
      "Fires when debt_to_worth is extreme (>5x or negative) AND the industry is one where this is structurally meaningful. Suppressed for industries where negative net worth is structurally typical (e.g., dentist).",
    applies_to_models: ["contractor", "manufacturing", "asset_heavy_service", "retail_inventory"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["working_capital_stability"],
    reads_metrics: ["debt_to_worth"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const dw = context.inputs.debt_to_worth;
      if (typeof dw !== "number") return null;
      if (dw >= 0 && dw <= 5) return null;

      const rule = RULE_CATALOGUE.find((r) => r.id === "rule.leverage.debt_to_worth_extreme")!;
      const desc = dw < 0 ? `negative (${dw.toFixed(2)})` : `${dw.toFixed(2)}x`;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "financial_score", relative_magnitude: "medium" },
          ],
          observation: `Debt-to-worth at ${desc} is structurally meaningful in this operating model.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Debt-to-worth ${desc}.`,
        why_it_matters:
          `In operating models with substantial physical assets (manufacturing, retail, asset-heavy services), debt-to-worth ` +
          `outside the 0-5x band reflects either thin equity cushion (positive extreme) or accumulated losses or material ` +
          `intangible-driven equity reduction (negative). Both are signals worth investigating before lender or scenario analysis.`,
        what_would_invalidate:
          `Balance-sheet reconciliation explaining the equity position; demonstration that the equity profile reflects ` +
          `accounting structure rather than operating-quality issues.`,
      });
    },
  },

  // ── C1. Working capital: current ratio low ────────────────────────────────
  {
    id: "rule.working_capital.current_ratio_thin",
    name: "Current ratio below operating model minimum",
    description:
      "Fires when current ratio falls below the operating model's typical floor. Working capital stress at close is a high-priority concern.",
    applies_to_models: [],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["working_capital_stability"],
    reads_metrics: ["current_ratio"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "high",
    evaluate: (context) => {
      const cr = context.inputs.current_ratio;
      if (typeof cr !== "number") return null;

      // Operating-model floors
      const model = context.fingerprint_resolution.fingerprint.key;
      const floors: Partial<Record<OperatingModelKey, number>> = {
        contractor: 1.2,
        retail_inventory: 1.5,
        manufacturing: 1.4,
        service_with_inventory: 1.3,
        professional_services: 1.0,
        healthcare_practice: 1.1,
        consumer_service: 0.9,
        field_service: 1.1,
        asset_heavy_service: 0.9,
      };
      const floor = floors[model] ?? 1.0;
      if (cr >= floor) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.working_capital.current_ratio_thin",
      )!;
      const isVeryThin = cr < floor * 0.7;

      return buildFiring({
        rule,
        context,
        severity: isVeryThin ? "high" : "medium",
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: isVeryThin ? "high" : "medium" },
            { axis: "financial_score", relative_magnitude: "medium" },
          ],
          observation: `Current ratio ${cr.toFixed(2)} sits below the ${model} model floor of ${floor.toFixed(2)}.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Current ratio ${cr.toFixed(2)} below ${model} floor ${floor.toFixed(2)}.`,
        why_it_matters:
          `Working capital below the operating-model floor indicates the business may not have sufficient short-term liquidity ` +
          `to absorb normal seasonality, AR cycle extension, or AP compression at close. Buyers absorbing the deal at this ` +
          `working-capital level often face cash crunches in months 3-9 post-close.`,
        what_would_invalidate:
          `Demonstrated working-capital trajectory showing the current snapshot is a temporary trough; explicit working-capital ` +
          `injection at close as part of the structure; trailing twelve-month working-capital walk confirming the position is stable.`,
      });
    },
  },

  // ── C2. Working capital: AR days elevated ─────────────────────────────────
  {
    id: "rule.working_capital.ar_days_elevated",
    name: "AR days elevated for operating model",
    description:
      "Fires when AR days extend beyond the operating model's typical range. Elevated AR signals collection deterioration or customer-credit-quality decline.",
    applies_to_models: ["contractor", "manufacturing", "healthcare_practice", "field_service"],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["working_capital_stability", "customer_retention"],
    reads_metrics: ["ar_days"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const ar = context.inputs.ar_days;
      if (typeof ar !== "number") return null;

      const model = context.fingerprint_resolution.fingerprint.key;
      const ceilings: Partial<Record<OperatingModelKey, number>> = {
        contractor: 75,
        manufacturing: 65,
        healthcare_practice: 60,
        field_service: 55,
      };
      const ceiling = ceilings[model];
      if (ceiling === undefined || ar <= ceiling) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.working_capital.ar_days_elevated",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: "medium" },
          ],
          observation: `AR days of ${ar.toFixed(0)} exceed the ${model} model ceiling of ${ceiling}.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `AR days ${ar.toFixed(0)} exceeds ${model} model ceiling ${ceiling}.`,
        why_it_matters:
          `Elevated AR days in this operating model typically reflects one of: deteriorating customer credit quality, ` +
          `disputed billings accumulating in AR (contractors), or payer-mix shifts toward slower-paying segments (healthcare). ` +
          `Each interpretation has different remediation, but all merit investigation.`,
        what_would_invalidate:
          `AR aging report demonstrating that elevated days reflect a specific identifiable cause (one large project payment, ` +
          `seasonal billing cycle, recent payer transition) rather than ongoing collection deterioration.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "ar_aging",
          actual_source: metricSource(context, "ar_days"),
          expected_minimum: "internal_pnl",
        }),
      });
    },
  },

  // ── C3. Working capital: working-capital absorption signal ────────────────
  {
    id: "rule.working_capital.absorption_with_revenue_growth",
    name: "Current ratio declining while revenue growing",
    description:
      "Fires when current_ratio is at the low end while revenue CAGR is high — classic working-capital absorption pattern.",
    applies_to_models: ["contractor", "manufacturing", "professional_services"],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["working_capital_stability"],
    reads_metrics: ["current_ratio", "revenue_cagr_3yr"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const cr = context.inputs.current_ratio;
      const cagr = context.inputs.revenue_cagr_3yr;
      if (!hasAll([cr, cagr])) return null;
      if (cr! >= 1.5) return null;
      if (cagr! < 15) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.working_capital.absorption_with_revenue_growth",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: "medium" },
          ],
          observation: `Current ratio ${cr!.toFixed(2)} combined with revenue CAGR ${cagr!.toFixed(1)}% suggests working-capital absorption.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Current ratio ${cr!.toFixed(2)} with revenue CAGR ${cagr!.toFixed(1)}%.`,
        why_it_matters:
          `Growing businesses typically need expanding working capital to fund AR and inventory growth. When current ratio is ` +
          `at the low end while growth is strong, the business may be operating under working-capital pressure that worsens ` +
          `as growth continues. Post-close, the buyer typically inherits this pressure plus the working-capital draw needed ` +
          `to fund continued growth.`,
        what_would_invalidate:
          `Working-capital walk demonstrating that recent expansion has been funded sustainably; or explicit working-capital ` +
          `injection planned at close to support the growth trajectory.`,
      });
    },
  },

  // ── D1. Customer concentration ────────────────────────────────────────────
  {
    id: "rule.concentration.top_customer_dominant",
    name: "Top customer concentration high",
    description:
      "Fires when the top customer represents an outsized share of revenue. Concentration is industry-agnostic underwriting concern.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["customer_retention", "recurring_revenue_persistence"],
    reads_metrics: [],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const top = context.inputs.top_customer_pct;
      if (typeof top !== "number") return null;
      if (top < 20) return null;

      const rule = RULE_CATALOGUE.find((r) => r.id === "rule.concentration.top_customer_dominant")!;
      const isExtreme = top >= 40;
      return buildFiring({
        rule,
        context,
        severity: isExtreme ? "high" : "medium",
        classification: isExtreme ? "structurally_suspicious" : "statistically_atypical",
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: isExtreme ? "high" : "medium" },
            { axis: "assumption_fragility", relative_magnitude: isExtreme ? "high" : "medium" },
          ],
          observation: `Top customer represents ${top.toFixed(0)}% of revenue.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Top customer = ${top.toFixed(0)}% of revenue.`,
        why_it_matters:
          `Single-customer concentration above 20% creates a single-point-of-failure dependency on the customer-retention assumption. ` +
          `Loss of the top customer post-close would compress revenue and likely coverage materially. Concentrations above 40% often ` +
          `make the deal effectively a bet on the customer relationship rather than the business itself.`,
        what_would_invalidate:
          `Long-dated contract with the top customer including assignability and notice provisions; documented customer ` +
          `relationship transferability to the buyer; meaningful earn-out tied to customer retention.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "customer_concentration",
          actual_source: metricSource(context, "revenue_cagr_3yr"),
          expected_minimum: "pos_exports",
        }),
      });
    },
  },

  // ── D2. Customer concentration: missing data ──────────────────────────────
  {
    id: "rule.concentration.disclosure_missing",
    name: "Customer concentration not disclosed",
    description:
      "Fires when neither top customer nor top-5 concentration is reported. The missing data is itself a signal worth flagging.",
    applies_to_models: ["professional_services", "field_service", "manufacturing", "contractor"],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["customer_retention"],
    reads_metrics: [],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      const top = context.inputs.top_customer_pct;
      const top5 = context.inputs.top_5_customer_pct;
      if (typeof top === "number" || typeof top5 === "number") return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.concentration.disclosure_missing",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "data_uncertainty",
          escalation_points: 8,
          reason: "Customer concentration not disclosed for an operating model where concentration risk is structurally meaningful.",
        },
        source_concern: null,
        what_triggered: `Neither top_customer_pct nor top_5_customer_pct provided.`,
        why_it_matters:
          `In operating models where customer concentration drives durability (professional services, field service, contractor, manufacturing), ` +
          `absence of concentration disclosure is itself a diligence priority. The business may have low concentration (favorable) or high concentration ` +
          `that the seller has not surfaced (concerning) — the engine cannot distinguish without the data.`,
        what_would_invalidate:
          `Customer-level revenue export covering 3 years showing top-5 customer percentage trajectory.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "customer_concentration",
          actual_source: "unknown",
          expected_minimum: "pos_exports",
        }),
      });
    },
  },

  // ── E1. Margin: gross margin outside contractor band ──────────────────────
  {
    id: "rule.margin.contractor_gross_margin_outside_band",
    name: "Contractor gross margin outside the 25-50% band",
    description:
      "Fires when contractor gross margin falls below 25% or above 50%. Below: pricing pressure. Above: service-mix concentration not yet disclosed.",
    applies_to_models: ["contractor"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["margin_sustainability", "pricing_power"],
    reads_metrics: ["gross_margin_pct"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const gm = context.inputs.gross_margin_pct;
      if (typeof gm !== "number") return null;
      if (gm >= 25 && gm <= 50) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.margin.contractor_gross_margin_outside_band",
      )!;
      const isLow = gm < 25;
      return buildFiring({
        rule,
        context,
        finding: {
          direction: "neutral",
          axis_impact: [
            { axis: "underwriting_uncertainty", relative_magnitude: "medium" },
          ],
          observation: `Contractor gross margin of ${gm.toFixed(1)}% sits ${isLow ? "below" : "above"} the typical 25-50% band.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Gross margin ${gm.toFixed(1)}% ${isLow ? "below 25%" : "above 50%"}.`,
        why_it_matters: isLow
          ? `Gross margin below 25% in contractor businesses typically signals material cost pressure, aggressive bidding for ` +
            `pipeline, or unfavorable contract structures. None are disqualifying — but each merits investigation before durability ` +
            `or lender posture is finalized.`
          : `Gross margin above 50% in contractors typically signals a service-heavy revenue mix masquerading as a traditional ` +
            `contractor profile. The same revenue can carry 8% or 18% EBITDA depending on service-vs-install split — the headline ` +
            `gross margin alone tells the underwriter very little.`,
        what_would_invalidate: isLow
          ? `Pricing history showing the current gross margin reflects a known pricing cycle position rather than structural issues.`
          : `Explicit service-vs-install revenue breakdown showing how the elevated gross margin maps to durable revenue streams.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "service_mix",
          actual_source: metricSource(context, "gross_margin_pct"),
          expected_minimum: "pos_exports",
        }),
      });
    },
  },

  // ── E2. Margin: EBITDA elevated in retail_inventory (true outlier) ────────
  {
    id: "rule.margin.retail_ebitda_above_ceiling",
    name: "Retail inventory EBITDA materially above category ceiling",
    description:
      "Fires when retail_inventory EBITDA margin exceeds 10% — well above the 4-7% category band. This is structurally suspicious in this model.",
    applies_to_models: ["retail_inventory"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["margin_sustainability", "add_back_integrity"],
    reads_metrics: ["ebitda_margin_pct"],
    polarity: "concern",
    default_classification: "structurally_suspicious",
    default_severity: "high",
    evaluate: (context) => {
      const ebitda = context.inputs.ebitda_margin_pct;
      if (typeof ebitda !== "number") return null;
      if (ebitda <= 10) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.margin.retail_ebitda_above_ceiling",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "evidence_quality", relative_magnitude: "high" },
            { axis: "underwriting_uncertainty", relative_magnitude: "high" },
          ],
          observation: `Retail-inventory EBITDA margin of ${ebitda.toFixed(1)}% is materially above the 4-7% category band ceiling.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Retail inventory EBITDA ${ebitda.toFixed(1)}% exceeds 10% (category typical 4-7%).`,
        why_it_matters:
          `Retail inventory businesses operate on thin margins by structural economics — volume × turnover × shrink. EBITDA materially above ` +
          `7% is rare and typically indicates one of: under-reported operating cost, owner compensation embedded in COGS, hybrid revenue ` +
          `mix (e.g., wholesale + retail), or accounting structure differing from RMA's classification. The deviation requires explicit explanation.`,
        what_would_invalidate:
          `Demonstration that the elevated EBITDA reflects a genuinely durable competitive position (e.g., specialty pharmacy with ` +
          `compounding revenue); explicit revenue-mix decomposition; or reconciliation of operating costs to category benchmarks.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "revenue",
          actual_source: metricSource(context, "ebitda_margin_pct"),
          expected_minimum: "pos_exports",
        }),
      });
    },
  },

  // ── E3. Margin: gross margin populated for service-only model ─────────────
  {
    id: "rule.margin.gross_margin_in_service_model",
    name: "Gross margin populated in service-only operating model",
    description:
      "Fires when gross margin is reported for an operating model where COGS is typically suppressed. May indicate hybrid revenue or data-entry error.",
    applies_to_models: ["professional_services", "field_service", "consumer_service"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["revenue_quality"],
    reads_metrics: ["gross_margin_pct"],
    polarity: "observation",
    default_classification: "statistically_atypical",
    default_severity: "low",
    evaluate: (context) => {
      const gm = context.inputs.gross_margin_pct;
      if (typeof gm !== "number") return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.margin.gross_margin_in_service_model",
      )!;
      const model = context.fingerprint_resolution.fingerprint.key;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "model_uncertainty",
          escalation_points: 5,
          reason: `Gross margin (${gm.toFixed(1)}%) populated in ${model} model where COGS is typically suppressed.`,
        },
        source_concern: null,
        what_triggered: `Gross margin reported (${gm.toFixed(1)}%) in ${model}.`,
        why_it_matters:
          `Service-only operating models typically do not have COGS in the RMA taxonomy, and the engine suppresses gross margin from primary ` +
          `analysis. When gross margin is populated, one of two things is likely: the business has a hybrid revenue stream (e.g., product sales ` +
          `alongside service revenue) the fingerprint doesn't capture, or the financial categorization differs from RMA's classification. ` +
          `Either way, the fingerprint match for this deal is partial.`,
        what_would_invalidate:
          `Revenue-mix decomposition showing service-vs-product split; alternatively, confirmation that gross margin was reported in error ` +
          `and should be excluded from analysis.`,
      });
    },
  },

  // ── E4. Margin: SDE margin in professional services with sole proprietor ──
  {
    id: "rule.margin.elevated_sde_with_sole_proprietor_signal",
    name: "Elevated SDE margin combined with sole-proprietor structural signal",
    description:
      "Fires when SDE margin exceeds 35% for a professional_services or consumer_service deal. Often signals owner compensation under-reported into the add-back schedule.",
    applies_to_models: ["professional_services", "consumer_service"],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["add_back_integrity"],
    reads_metrics: ["sde_margin_pct"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const sde = context.inputs.sde_margin_pct;
      if (typeof sde !== "number") return null;
      if (sde <= 35) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.margin.elevated_sde_with_sole_proprietor_signal",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "neutral",
          axis_impact: [
            { axis: "evidence_quality", relative_magnitude: "medium" },
          ],
          observation: `SDE margin of ${sde.toFixed(1)}% is elevated for this operating model.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `SDE margin ${sde.toFixed(1)}% exceeds 35% for service-model deal.`,
        why_it_matters:
          `SDE margins above 35% in service-heavy models often reflect aggressive owner-compensation add-backs that normalize away ` +
          `legitimate operating cost. The add-back schedule should be examined to confirm that what was added back genuinely reflects ` +
          `owner-discretionary expense rather than required operating compensation.`,
        what_would_invalidate:
          `Add-back schedule line-by-line with tax-return and payroll-filing evidence confirming that owner compensation reflected ` +
          `discretionary draws rather than required operating salaries.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "addback_schedule",
          actual_source: metricSource(context, "sde_margin_pct"),
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── F1. Operating-model mismatch: inventory in service business ───────────
  {
    id: "rule.mismatch.inventory_in_service_model",
    name: "Inventory percentage atypical for service operating model",
    description:
      "Fires when inventory_pct_assets exceeds the operating model's normal threshold. Suggests hybrid model or undisclosed product component.",
    applies_to_models: ["professional_services", "field_service", "consumer_service"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["revenue_quality"],
    reads_metrics: ["inventory_pct_assets"],
    polarity: "observation",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const inv = context.inputs.inventory_pct_assets;
      if (typeof inv !== "number") return null;
      const model = context.fingerprint_resolution.fingerprint.key;
      const ceilings: Partial<Record<OperatingModelKey, number>> = {
        professional_services: 5,
        field_service: 7,
        consumer_service: 12,
      };
      const ceiling = ceilings[model];
      if (ceiling === undefined || inv <= ceiling) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.mismatch.inventory_in_service_model",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "model_uncertainty",
          escalation_points: 8,
          reason: `Inventory at ${inv.toFixed(1)}% of assets exceeds the ${model} ceiling (${ceiling}%). Operating model fit is partial.`,
        },
        source_concern: null,
        what_triggered: `Inventory ${inv.toFixed(1)}% of assets exceeds ${model} ceiling ${ceiling}%.`,
        why_it_matters:
          `Substantial inventory in a service-classified business indicates the operating model the fingerprint assumes may not fully ` +
          `match the actual business. This is a model-uncertainty signal — the engine partially understands the business and the fingerprint's ` +
          `priors may not apply cleanly.`,
        what_would_invalidate:
          `Revenue-mix decomposition explaining the inventory holding (e.g., parts inventory for an in-house repair component); or ` +
          `confirmation that inventory was reported incorrectly.`,
      });
    },
  },

  // ── F2. Operating-model mismatch: EBITDA-to-operating gap suggests asset-light ──
  {
    id: "rule.mismatch.ebitda_operating_gap_thin",
    name: "EBITDA-to-operating-margin gap thin in asset-heavy model",
    description:
      "Fires when an asset-heavy operating model shows a thin gap between EBITDA and operating margin. Suggests asset-light variant or under-stated D&A.",
    applies_to_models: ["asset_heavy_service", "manufacturing"],
    model_fit_requirement: "fingerprint_match_required",
    depends_on_assumptions: ["capex_stability"],
    reads_metrics: ["ebitda_margin_pct", "operating_margin_pct"],
    polarity: "observation",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const ebitda = context.inputs.ebitda_margin_pct;
      const op = context.inputs.operating_margin_pct;
      if (!hasAll([ebitda, op])) return null;
      const gap = ebitda! - op!;
      if (gap >= 8) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.mismatch.ebitda_operating_gap_thin",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "model_uncertainty",
          escalation_points: 7,
          reason: `EBITDA-to-operating gap of ${gap.toFixed(1)}pp is thin for an asset-heavy model; D&A may be under-stated or operating model may be asset-light variant.`,
        },
        source_concern: null,
        what_triggered: `EBITDA-operating gap ${gap.toFixed(1)}pp (typical >8pp).`,
        why_it_matters:
          `In asset-heavy operating models, D&A is typically substantial and creates a meaningful gap between EBITDA and operating margin. ` +
          `A thin gap suggests either the business is an asset-light variant (e.g., trucking with leased fleet rather than owned), D&A is ` +
          `under-stated, or the asset structure has been mischaracterized. The fingerprint's expectations may not apply cleanly.`,
        what_would_invalidate:
          `Capex schedule and depreciation detail demonstrating the actual asset structure; explicit confirmation of asset-light vs ` +
          `asset-heavy operating profile.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "capex_history",
          actual_source: metricSource(context, "ebitda_margin_pct"),
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── F3. Operating-model mismatch: fallback fingerprint used ──────────────
  {
    id: "rule.mismatch.fallback_fingerprint_used",
    name: "Fallback fingerprint used (industry not in registry)",
    description:
      "Always fires when fingerprint resolution returned the fallback. Records the model_uncertainty escalation explicitly.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: [],
    reads_metrics: [],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      if (!context.fingerprint_resolution.is_fallback) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.mismatch.fallback_fingerprint_used",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "model_uncertainty",
          escalation_points: context.fingerprint_resolution.model_uncertainty_escalation || 25,
          reason: context.fingerprint_resolution.fallback_reason || "Industry not present in fingerprint registry.",
        },
        source_concern: null,
        what_triggered: `Fingerprint resolution used fallback: ${context.fingerprint_resolution.fallback_reason}`,
        why_it_matters:
          `No industry-specific fingerprint exists for this deal in the current registry. Without operating-model-specific priors, ` +
          `the engine applies generic service-model defaults. Mismatch detection, benchmark calibration, and operating-model interpretation ` +
          `are all less informative than they would be with an explicit fingerprint. The engine is partially understanding this deal and ` +
          `surfacing the partial understanding as model_uncertainty.`,
        what_would_invalidate:
          `Adding the industry to the fingerprint registry with RMA data coverage, operating-model assignment, and per-industry overrides ` +
          `(governance-reviewed addition).`,
      });
    },
  },

  // ── G1. Trajectory: revenue growth volatile ───────────────────────────────
  {
    id: "rule.trajectory.revenue_volatility_high",
    name: "Revenue trajectory shows material volatility",
    description:
      "Fires when year-over-year revenue changes show high volatility across the trajectory window. Surfaces when prior-year data is available.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["revenue_quality", "margin_sustainability"],
    reads_metrics: ["revenue_cagr_3yr"],
    polarity: "observation",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const r = context.inputs.revenue;
      const r1 = context.inputs.revenue_prior_year;
      const r2 = context.inputs.revenue_prior_prior_year;
      if (!hasAll([r, r1, r2])) return null;
      const yoy1 = (r! - r1!) / r1!;
      const yoy2 = (r1! - r2!) / r2!;
      const volatility = Math.abs(yoy1 - yoy2);
      if (volatility < 0.25) return null; // 25 percentage points YoY swing

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.trajectory.revenue_volatility_high",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "neutral",
          axis_impact: [
            { axis: "underwriting_uncertainty", relative_magnitude: "medium" },
          ],
          observation: `Year-over-year revenue change of ${(yoy1 * 100).toFixed(1)}% vs ${(yoy2 * 100).toFixed(1)}% shows volatility of ${(volatility * 100).toFixed(1)} percentage points.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Revenue volatility ${(volatility * 100).toFixed(1)}pp YoY.`,
        why_it_matters:
          `Volatile year-over-year revenue suggests either project-based revenue with timing concentration, one-time events ` +
          `affecting reported revenue, or genuine business volatility. Each interpretation matters differently for durability analysis. ` +
          `A stable three-year CAGR can mask underlying volatility that the engine should surface.`,
        what_would_invalidate:
          `Decomposition of revenue by year explaining the source of variation (project completions, large one-time contracts, ` +
          `customer additions/losses). Demonstration that the volatility reflects identifiable causes rather than unpredictable swings.`,
      });
    },
  },

  // ── G2. Trajectory: margin expansion suspiciously rapid ───────────────────
  {
    id: "rule.trajectory.margin_expansion_rapid",
    name: "EBITDA margin expanded rapidly over trajectory window",
    description:
      "Fires when EBITDA margin has expanded materially (>250bps/year) over the available trajectory. Often signals add-back inflation or one-time effects.",
    applies_to_models: ["contractor", "professional_services", "manufacturing", "healthcare_practice"],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["margin_sustainability", "add_back_integrity"],
    reads_metrics: ["ebitda_margin_pct"],
    polarity: "concern",
    default_classification: "statistically_atypical",
    default_severity: "medium",
    evaluate: (context) => {
      const e = context.inputs.ebitda_margin_pct;
      const e1 = context.inputs.ebitda_margin_prior_year;
      const e2 = context.inputs.ebitda_margin_prior_prior_year;
      if (!hasAll([e, e1, e2])) return null;
      const ann1 = bpsChange(e!, e1!);
      const ann2 = bpsChange(e1!, e2!);
      if (ann1 < 250 || ann2 < 250) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.trajectory.margin_expansion_rapid",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "neutral",
          axis_impact: [
            { axis: "evidence_quality", relative_magnitude: "medium" },
            { axis: "underwriting_uncertainty", relative_magnitude: "medium" },
          ],
          observation: `EBITDA margin expanded ${ann2}bps then ${ann1}bps over the trajectory window — sustained ${ann1}bps+/yr expansion.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `EBITDA margin expansion ${ann2}bps + ${ann1}bps sustained YoY.`,
        why_it_matters:
          `Sustained margin expansion above 250bps/year is statistically rare and typically reflects one of: add-back schedule changes that ` +
          `normalized earnings upward, one-time cost reduction events, mix shifts toward higher-margin work, or temporary pricing power. Each ` +
          `interpretation matters for whether the current margin is sustainable. The expansion itself is not evidence of manipulation — it is a ` +
          `question requiring diligence to resolve.`,
        what_would_invalidate:
          `Year-by-year decomposition of margin expansion attributing each ~100bps to a specific cause (cost program, mix shift, pricing change, ` +
          `add-back normalization). Demonstration that drivers are durable rather than transient.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "addback_schedule",
          actual_source: metricSource(context, "ebitda_margin_pct"),
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── G3. Trajectory: revenue declined two consecutive years ────────────────
  {
    id: "rule.trajectory.revenue_decline_sustained",
    name: "Revenue declined for two consecutive years",
    description:
      "Fires when revenue declined YoY in both of the prior two years. Sustained decline is a structural durability signal.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["revenue_quality", "margin_sustainability"],
    reads_metrics: [],
    polarity: "concern",
    default_classification: "structurally_suspicious",
    default_severity: "high",
    evaluate: (context) => {
      const r = context.inputs.revenue;
      const r1 = context.inputs.revenue_prior_year;
      const r2 = context.inputs.revenue_prior_prior_year;
      if (!hasAll([r, r1, r2])) return null;
      if (r! >= r1! || r1! >= r2!) return null;
      const totalDecline = ((r! - r2!) / r2!) * 100;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.trajectory.revenue_decline_sustained",
      )!;

      return buildFiring({
        rule,
        context,
        finding: {
          direction: "negative",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: "high" },
            { axis: "underwriting_uncertainty", relative_magnitude: "medium" },
          ],
          observation: `Revenue declined two consecutive years; cumulative decline of ${totalDecline.toFixed(1)}%.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Revenue declined YoY in both prior years; total decline ${totalDecline.toFixed(1)}%.`,
        why_it_matters:
          `Sustained two-year revenue decline indicates the business is losing scale rather than experiencing a one-time event. This is a ` +
          `multi-signal structural concern — durability is materially affected unless the decline can be attributed to identifiable, reversible causes ` +
          `(loss of one large customer, deliberate exit from low-margin work, etc.).`,
        what_would_invalidate:
          `Explicit attribution of the decline to identifiable causes; demonstration that revenue stabilized recently or that the buyer's ` +
          `thesis includes specific actions to reverse the trajectory.`,
      });
    },
  },

  // ── H1. Evidence: deal source weakly declared ─────────────────────────────
  {
    id: "rule.evidence.deal_source_weak",
    name: "Deal-level source declared as weak",
    description:
      "Fires when deal_source_type is seller_spreadsheet or verbal_assertion. All conclusions from the deal carry elevated source uncertainty.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: [],
    reads_metrics: [],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      const source = context.inputs.deal_source_type;
      if (!source) return null;
      if (meetsSourceMinimum(source, "internal_pnl")) return null;

      const rule = RULE_CATALOGUE.find((r) => r.id === "rule.evidence.deal_source_weak")!;

      return buildFiring({
        rule,
        context,
        severity: source === "verbal_assertion" ? "high" : "medium",
        finding: null,
        uncertainty_escalation: null,
        source_concern: {
          affected_input: "deal_financials",
          actual_source: source,
          expected_minimum_source: "internal_pnl",
          evidence_quality_reduction_points: source === "verbal_assertion" ? 25 : 15,
          reason: `All deal financials currently rest on ${source} evidence. The expected minimum for material conclusions is internal_pnl reconcilable to verified sources.`,
        },
        what_triggered: `Deal-level source = ${source}.`,
        why_it_matters:
          `When the deal-level evidence rests on seller-controlled sources without verification, every metric the engine reads carries source ` +
          `uncertainty. This does not mean the metrics are wrong — it means the conclusions drawn from them cannot be defended without ` +
          `supporting documentation. Source upgrade is the highest-leverage diligence action.`,
        what_would_invalidate:
          `Three years of tax returns, business bank statements, and accounting-system exports replacing the current evidence base.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "revenue",
          actual_source: source,
          expected_minimum: "bank_statements",
        }),
      });
    },
  },

  // ── H2. Evidence: deal source not declared ────────────────────────────────
  {
    id: "rule.evidence.deal_source_undeclared",
    name: "Deal-level source not declared",
    description:
      "Fires when neither deal_source_type nor metric_sources is provided. The engine cannot assess evidence quality.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: [],
    reads_metrics: [],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      if (context.inputs.deal_source_type) return null;
      if (context.inputs.metric_sources && Object.keys(context.inputs.metric_sources).length > 0) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.evidence.deal_source_undeclared",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: {
          sub_axis: "data_uncertainty",
          escalation_points: 12,
          reason: "No source-type information provided; evidence quality cannot be assessed.",
        },
        source_concern: null,
        what_triggered: `Neither deal_source_type nor metric_sources provided.`,
        why_it_matters:
          `Without source-type information, the engine assumes weakest-source conditions for all conclusions. Even strong-looking metrics ` +
          `cannot anchor underwriting decisions until the underlying source is identified. The missing data is itself a high-priority ` +
          `diligence action.`,
        what_would_invalidate:
          `Explicit declaration of the deal-level or per-metric source types underlying the reported financials.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "revenue",
          actual_source: "unknown",
          expected_minimum: "tax_returns",
        }),
      });
    },
  },

  // ── H3. Evidence: revenue source weaker than minimum ──────────────────────
  {
    id: "rule.evidence.revenue_source_below_minimum",
    name: "Revenue source below expected minimum",
    description:
      "Fires when revenue is reported but the per-metric source (or deal-level source) is below the expected minimum for the metric.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["revenue_quality"],
    reads_metrics: [],
    polarity: "observation",
    default_classification: "unsupported_by_evidence",
    default_severity: "medium",
    evaluate: (context) => {
      const r = context.inputs.revenue;
      if (typeof r !== "number") return null;
      const source = metricSource(context, "sde_margin_pct");
      if (source === "unknown") return null;
      if (meetsSourceMinimum(source as SourceTypeKey, "bank_statements")) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.evidence.revenue_source_below_minimum",
      )!;

      return buildFiring({
        rule,
        context,
        finding: null,
        uncertainty_escalation: null,
        source_concern: {
          affected_input: "revenue",
          actual_source: source,
          expected_minimum_source: "bank_statements",
          evidence_quality_reduction_points: 10,
          reason: `Revenue rests on ${source}; bank_statements is the expected minimum for material revenue claims.`,
        },
        what_triggered: `Revenue source = ${source}, below bank_statements minimum.`,
        why_it_matters:
          `Revenue is the foundation of every margin, coverage, and growth metric. When revenue's underlying source is below the expected minimum, ` +
          `every downstream metric inherits the source weakness. Strengthening this single input has compounding evidence-quality benefits.`,
        what_would_invalidate:
          `Twelve to twenty-four months of business bank statements with deposit reconciliation to reported revenue.`,
        evidence_to_increase_confidence: generateRecommendations({
          input_alias: "revenue",
          actual_source: source,
          expected_minimum: "bank_statements",
        }),
      });
    },
  },

  // ── I1. Strength: strong DSCR with verified source ────────────────────────
  {
    id: "rule.strength.dscr_strong_verified",
    name: "Strong DSCR supported by verified-band evidence",
    description:
      "Fires when DSCR is comfortably above 1.50x AND the underlying source is in the verified band. Credible coverage strength.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["margin_sustainability"],
    reads_metrics: ["dscr"],
    polarity: "strength",
    default_classification: "statistically_atypical",
    default_severity: "low",
    evaluate: (context) => {
      const dscr = context.inputs.dscr;
      if (typeof dscr !== "number") return null;
      if (dscr < 1.50) return null;
      const source = metricSource(context, "sde_margin_pct");
      if (source === "unknown") return null;
      if (!meetsSourceMinimum(source as SourceTypeKey, "bank_statements")) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.strength.dscr_strong_verified",
      )!;

      return buildFiring({
        rule,
        context,
        polarity: "strength",
        finding: {
          direction: "positive",
          axis_impact: [
            { axis: "financial_score", relative_magnitude: "medium" },
            { axis: "durability_score", relative_magnitude: "low" },
          ],
          observation: `DSCR ${dscr.toFixed(2)}x is comfortable, supported by ${source} evidence.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `DSCR ${dscr.toFixed(2)}x backed by ${source}.`,
        why_it_matters:
          `Coverage above 1.50x combined with verified-band evidence is a credible underwriting strength. The strength is independent of ` +
          `lender posture — the coverage buffer absorbs reasonable normalization scenarios, and the source supports the conclusion.`,
        what_would_invalidate:
          `Normalization scenarios that compress earnings materially (e.g., owner replacement cost added back into operating expense) ` +
          `bringing DSCR below 1.30x.`,
      });
    },
  },

  // ── I2. Strength: working capital strong relative to operating model ──────
  {
    id: "rule.strength.working_capital_robust",
    name: "Working capital robust relative to operating model",
    description:
      "Fires when current ratio is comfortably above the operating-model band — credible liquidity strength.",
    applies_to_models: ["contractor", "manufacturing", "retail_inventory", "service_with_inventory"],
    model_fit_requirement: "fingerprint_match_preferred",
    depends_on_assumptions: ["working_capital_stability"],
    reads_metrics: ["current_ratio"],
    polarity: "strength",
    default_classification: "statistically_atypical",
    default_severity: "low",
    evaluate: (context) => {
      const cr = context.inputs.current_ratio;
      if (typeof cr !== "number") return null;
      const model = context.fingerprint_resolution.fingerprint.key;
      const strongs: Partial<Record<OperatingModelKey, number>> = {
        contractor: 2.5,
        manufacturing: 2.5,
        retail_inventory: 2.5,
        service_with_inventory: 2.5,
      };
      const threshold = strongs[model];
      if (threshold === undefined || cr < threshold) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.strength.working_capital_robust",
      )!;

      return buildFiring({
        rule,
        context,
        polarity: "strength",
        finding: {
          direction: "positive",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: "medium" },
          ],
          observation: `Current ratio of ${cr.toFixed(2)} is comfortably above the ${model} typical range.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Current ratio ${cr.toFixed(2)} ≥ ${threshold} for ${model}.`,
        why_it_matters:
          `Robust working capital in a working-capital-intensive operating model is a meaningful durability strength. The business has buffer ` +
          `against AR cycle extension, seasonal compression, and operating disruption that would stress thinner balance sheets.`,
        what_would_invalidate:
          `Demonstration that the elevated current ratio reflects stranded cash or unproductive assets rather than active operating liquidity.`,
      });
    },
  },

  // ── I3. Strength: revenue growth consistent across trajectory ─────────────
  {
    id: "rule.strength.revenue_growth_consistent",
    name: "Revenue growth consistent across trajectory",
    description:
      "Fires when revenue grew in both of the prior two years with reasonable consistency — credible growth profile.",
    applies_to_models: [],
    model_fit_requirement: "model_agnostic",
    depends_on_assumptions: ["revenue_quality"],
    reads_metrics: ["revenue_cagr_3yr"],
    polarity: "strength",
    default_classification: "statistically_atypical",
    default_severity: "low",
    evaluate: (context) => {
      const r = context.inputs.revenue;
      const r1 = context.inputs.revenue_prior_year;
      const r2 = context.inputs.revenue_prior_prior_year;
      if (!hasAll([r, r1, r2])) return null;
      if (r! <= r1! || r1! <= r2!) return null;
      const yoy1 = (r! - r1!) / r1!;
      const yoy2 = (r1! - r2!) / r2!;
      // Require positive but not extreme growth (avoid double-counting volatile growth)
      if (yoy1 < 0.03 || yoy1 > 0.40) return null;
      if (yoy2 < 0.03 || yoy2 > 0.40) return null;
      const consistency = Math.abs(yoy1 - yoy2);
      if (consistency > 0.15) return null;

      const rule = RULE_CATALOGUE.find(
        (r) => r.id === "rule.strength.revenue_growth_consistent",
      )!;

      return buildFiring({
        rule,
        context,
        polarity: "strength",
        finding: {
          direction: "positive",
          axis_impact: [
            { axis: "durability_score", relative_magnitude: "medium" },
            { axis: "financial_score", relative_magnitude: "low" },
          ],
          observation: `Revenue grew ${(yoy2 * 100).toFixed(1)}% then ${(yoy1 * 100).toFixed(1)}% — consistent positive trajectory.`,
        },
        uncertainty_escalation: null,
        source_concern: null,
        what_triggered: `Revenue growth ${(yoy2 * 100).toFixed(1)}% + ${(yoy1 * 100).toFixed(1)}% YoY.`,
        why_it_matters:
          `Consistent year-over-year growth in the 3-40% band, without material volatility, is the most credible revenue trajectory profile ` +
          `for underwriting. The pattern suggests durable demand rather than project lumpiness or one-time events, and supports the assumption ` +
          `that trailing revenue reflects sustainable run-rate.`,
        what_would_invalidate:
          `Customer-attribution showing that growth concentrated in 1-2 large customer additions (concentration risk) or in revenue categories ` +
          `that are non-recurring (one-time projects, exit-of-inventory events).`,
      });
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface RuleCatalogueAuditResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly rule_count: number;
  readonly version: string;
}

/**
 * Static validation of the catalogue. Runs at module load and externally
 * callable for diagnostic tooling. Fails closed.
 */
export function validateRuleCatalogue(): RuleCatalogueAuditResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  // ── Unique rule IDs ─────────────────────────────────────────────────────
  const seenIds = new Set<string>();
  for (const rule of RULE_CATALOGUE) {
    if (seenIds.has(rule.id)) {
      issues.push({
        severity: "error",
        location: `rule[${rule.id}]`,
        message: `Duplicate rule_id`,
      });
    }
    seenIds.add(rule.id);
  }

  // ── ID format ──────────────────────────────────────────────────────────
  for (const rule of RULE_CATALOGUE) {
    if (!/^rule\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(rule.id)) {
      issues.push({
        severity: "error",
        location: `rule[${rule.id}].id`,
        message: `Rule ID must match rule.{category}.{specific}`,
      });
    }
  }

  // ── Assumption references must exist ───────────────────────────────────
  for (const rule of RULE_CATALOGUE) {
    const unknown = findUnknownAssumptionKeys(
      rule.depends_on_assumptions as ReadonlyArray<string>,
    );
    for (const a of unknown) {
      issues.push({
        severity: "error",
        location: `rule[${rule.id}].depends_on_assumptions`,
        message: `References unknown assumption_key: ${a}`,
      });
    }
  }

  // ── Metric references must exist ───────────────────────────────────────
  const knownMetrics = new Set<string>(METRIC_RELEVANCE.map((m) => m.metric_key));
  for (const rule of RULE_CATALOGUE) {
    for (const m of rule.reads_metrics) {
      if (!knownMetrics.has(m)) {
        issues.push({
          severity: "error",
          location: `rule[${rule.id}].reads_metrics`,
          message: `References unknown metric_key: ${m}`,
        });
      }
    }
  }

  // ── Lender profile leakage detection ───────────────────────────────────
  const lenderTerms = ["sba", "conventional bank", "search fund", "independent sponsor", "pe-backed", "pe_backed"];
  for (const rule of RULE_CATALOGUE) {
    const haystack = (rule.name + " " + rule.description).toLowerCase();
    for (const term of lenderTerms) {
      if (haystack.includes(term)) {
        issues.push({
          severity: "error",
          location: `rule[${rule.id}]`,
          message: `Possible lender-profile leakage: contains "${term}"`,
        });
      }
    }
  }

  // ── Name and description present ───────────────────────────────────────
  for (const rule of RULE_CATALOGUE) {
    if (!rule.name || rule.name.trim().length < 5) {
      issues.push({
        severity: "error",
        location: `rule[${rule.id}].name`,
        message: `Rule name missing or too short`,
      });
    }
    if (!rule.description || rule.description.trim().length < 30) {
      issues.push({
        severity: "error",
        location: `rule[${rule.id}].description`,
        message: `Rule description missing or too short (<30 chars)`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    rule_count: RULE_CATALOGUE.length,
    version: RULE_CATALOGUE_VERSION,
  };
}

function assertRuleCatalogueValid(): void {
  const result = validateRuleCatalogue();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Rule catalogue validation failed (${RULE_CATALOGUE_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertRuleCatalogueValid();

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getRule(rule_id: string): Rule | null {
  return RULE_CATALOGUE.find((r) => r.id === rule_id) ?? null;
}

export function rulesByCategory(category: string): ReadonlyArray<Rule> {
  return RULE_CATALOGUE.filter((r) => r.id.startsWith(`rule.${category}.`));
}

export function rulesForModel(model: OperatingModelKey): ReadonlyArray<Rule> {
  return RULE_CATALOGUE.filter(
    (r) => r.applies_to_models.length === 0 || r.applies_to_models.includes(model),
  );
}
