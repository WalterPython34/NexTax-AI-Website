// lib/intelligence/scenarios/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Normalization Scenarios Type Contracts
//
// CP-4 Foundation. Every type that crosses the boundary between the scenario
// engine and downstream consumers (CP-5 axis composition, CP-7 lender
// simulation, CP-8 narrative prose, CP-9 snapshot persistence) lives here.
//
// Editing principle: every type encodes a constitutional guardrail. The
// scenario engine produces deterministic reframings of trailing financials;
// the type system enforces that these reframings cannot accidentally
// behave like predictive forecasts, verdicts, or generative judgments.
//
// Key guardrails enforced at the type level:
//
//   1. Three scenario families remain structurally distinct:
//      - normalization: defensible baseline reframings
//      - stress: downside survivability tests
//      - structural_reinterpretation: ontology reframings (RESERVED — no
//        catalogue entries in CP-4; future implementation)
//
//   2. Scenario confidence is a first-class field. Every output declares
//      its trustworthiness as data alongside the math.
//
//   3. Five-level clearance ladder preserves nuance:
//      clears_comfortably / clears_marginally / structurally_compressed /
//      fails / not_applicable
//
//   4. Scenario interactions are reserved (no catalogue entries; type
//      contract locked for future detection logic).
//
//   5. Clearance durability decomposition reserved (recovery_feasibility,
//      operational_reversibility, financing_survivability).
//
//   6. Scenarios are deterministic. No probability weighting, no Monte
//      Carlo, no generative assumptions. CP-4 is single-period reframing,
//      not predictive modeling.
//
// "Fails" means: the scenario surfaces survivability pressure under that
// assumption. It does NOT mean: the deal is bad. The narrative layer
// (CP-8) reads clearance as survivability framing, never as verdict.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
  FingerprintResolution,
  MetricKey,
  OperatingModelKey,
} from "../types";
import type {
  RuleEngineInputs,
  RuleEngineResult,
} from "../rules/types";

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIO_ENGINE_VERSION = "cp4-v0.1.0";
export const SCENARIO_CATALOGUE_VERSION = "cp4-v0.1.0";
export const CLEARANCE_FRAMEWORK_VERSION = "cp4-v0.1.0";

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO FAMILY — GUARDRAIL #1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The three scenario families. Each answers a structurally distinct
 * underwriting question. The catalogue validator enforces that scenarios
 * declare exactly one family.
 *
 *   normalization — "What would this business look like under defensible
 *   baseline assumptions?" These are underwriting reframings, not downside
 *   cases. Examples: owner replacement cost normalization, maintenance
 *   capex normalization, industry-median margin normalization.
 *
 *   stress — "What happens if downside conditions occur?" These are
 *   downside survivability tests. Examples: top customer loss, wage
 *   inflation, revenue compression, lender stress scenarios.
 *
 *   structural_reinterpretation — RESERVED. "What if the economic reality
 *   implied by the evidence is different from the seller framing?" These
 *   are ontology reframings: addbacks partially unsupported, recurring
 *   revenue partially non-recurring, maintenance revenue actually project
 *   revenue, EBITDA inflated by deferred maintenance. CP-4 reserves this
 *   category at the type level but ships ZERO catalogue entries. The
 *   catalogue validator emits a warning if any scenario declares this
 *   family in CP-4.
 *
 * Naming convention: scenario.{family}.{specific}
 *   scenario.normalization.industry_normalized
 *   scenario.stress.lender_stress
 *   scenario.structural_reinterpretation.recurring_revenue_reclassified (future)
 */
export type ScenarioFamily =
  | "normalization"
  | "stress"
  | "structural_reinterpretation";

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CLEARANCE — GUARDRAIL #3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Five-level clearance ladder. The middle category (structurally_compressed)
 * preserves the distinction between temporary compression and structural
 * failure. The constitution requires this nuance — DSCR compressing from
 * 1.9x to 1.18x is materially different from DSCR collapsing below 1.0x.
 *
 *   clears_comfortably — Adjusted metrics remain healthy. The scenario
 *   passes with material buffer.
 *
 *   clears_marginally — Adjusted metrics survive but compress within
 *   typical bands. The scenario passes with thin buffer.
 *
 *   structurally_compressed — Adjusted metrics compress materially but
 *   remain operationally viable. The deal is "wounded but functioning"
 *   under this scenario. NOT a failure verdict.
 *
 *   fails — Adjusted metrics drop below structural survivability
 *   thresholds (e.g., DSCR < 1.0x, working capital < 0). The scenario
 *   surfaces survivability pressure, not deal-quality verdict.
 *
 *   not_applicable — Scenario didn't apply to this deal. Reason carried
 *   in the output's reason_not_applied field.
 */
export type ScenarioClearance =
  | "clears_comfortably"
  | "clears_marginally"
  | "structurally_compressed"
  | "fails"
  | "not_applicable";

/**
 * What metric the clearance evaluation primarily considered. Some scenarios
 * are coverage-driven (DSCR), others margin-driven (SDE or operating
 * margin), others working-capital-driven (current ratio + AR cycle).
 */
export type ClearanceBasis =
  | "coverage"          // DSCR is the primary clearance signal
  | "margin"            // operating or SDE margin
  | "working_capital"   // current ratio + AR cycle
  | "concentration"     // post-loss revenue
  | "composite";        // multiple signals combined

/**
 * Per-scenario threshold override surface. Centralized defaults live in
 * clearance.ts; scenarios may override any subset of thresholds when
 * underwriting intent requires it.
 *
 * Threshold semantics:
 *   - Higher numeric DSCR is healthier
 *   - Higher current_ratio is healthier
 *   - Higher SDE margin is healthier (but contextual)
 *
 * If a threshold field is absent (undefined), the centralized default
 * applies. The clearance evaluator never silently substitutes a different
 * default — explicit override or explicit default.
 */
export interface ClearanceThresholdOverrides {
  readonly dscr_comfortable?: number;
  readonly dscr_marginal?: number;
  readonly dscr_compressed?: number;
  readonly dscr_failure?: number;
  readonly current_ratio_comfortable?: number;
  readonly current_ratio_marginal?: number;
  readonly current_ratio_compressed?: number;
  readonly current_ratio_failure?: number;
  readonly margin_comfortable_pct?: number;
  readonly margin_marginal_pct?: number;
  readonly margin_compressed_pct?: number;
  readonly margin_failure_pct?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STABLE IDS
// ─────────────────────────────────────────────────────────────────────────────

/** Stable identifier for a scenario in the catalogue. */
export type ScenarioId = string;

/** Per-output UUID, generated at scenario evaluation time. */
export type ScenarioOutputId = string;

/** Stable identifier for an adjustment primitive. */
export type AdjustmentPrimitiveId = string;

/** Stable identifier for a scenario interaction (RESERVED for future). */
export type ScenarioInteractionId = string;

// ─────────────────────────────────────────────────────────────────────────────
// ADJUSTMENT RECORDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single adjustment applied within a scenario. Scenarios may apply
 * multiple adjustments. Each adjustment is auditable: what changed,
 * by how much, and why.
 */
export interface AdjustmentRecord {
  readonly metric_or_input: string;
  readonly primitive_id: AdjustmentPrimitiveId;
  readonly direction: "increase" | "decrease" | "replace";
  /** Original value before adjustment (number, or null if not applicable). */
  readonly value_before: number | null;
  /** Value after adjustment. */
  readonly value_after: number | null;
  /** Plain-language description of the magnitude. */
  readonly magnitude_description: string;
  /** Why this adjustment is defensible. */
  readonly rationale: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUSTED INPUTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The scenario-adjusted version of RuleEngineInputs. Same shape; the
 * values reflect the scenario's adjustments. Downstream consumers (CP-5)
 * may run rule evaluation against these adjusted inputs to compute
 * scenario-stressed firings — but that's a CP-5 decision, not a CP-4
 * output.
 *
 * Only a subset of fields appears here because most scenarios only adjust
 * a few metrics. Unadjusted fields are absent (not zero, not the original).
 * Consumers should overlay this against the original inputs as a partial
 * patch rather than treating it as a full replacement.
 */
export interface ScenarioAdjustedInputs {
  readonly revenue?: number;
  readonly sde?: number;
  readonly ebitda?: number;
  readonly sde_margin_pct?: number;
  readonly ebitda_margin_pct?: number;
  readonly operating_margin_pct?: number;
  readonly gross_margin_pct?: number;
  readonly dscr?: number;
  readonly int_coverage?: number;
  readonly current_ratio?: number;
  readonly debt_to_sde?: number;
  readonly ar_days?: number;
  readonly inventory_turnover?: number;
  readonly addback_total?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEARANCE DURABILITY DECOMPOSITION — GUARDRAIL #5 (RESERVED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A clearance has dimensions beyond pass/fail. A deal may fail lender
 * stress but remain operationally durable; or clear financially while
 * requiring unrealistic operational perfection. CP-4 reserves the type
 * contract; future builds populate the fields.
 *
 * Until populated, consumers read the unitary `clears` field as
 * authoritative. When decomposition becomes first-class, these three
 * dimensions complement (not replace) the unitary clearance.
 */
export type ClearanceDimension =
  | "robust"          // dimension comfortably survives the scenario
  | "viable"          // dimension survives with effort/discipline
  | "constrained"    // dimension survives only under favorable conditions
  | "compromised";    // dimension cannot survive the scenario

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO OUTPUT — THE PRIMARY DELIVERABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The output of evaluating one scenario against one deal. A list of these
 * is what CP-5+ reads.
 *
 * Required reasoning fields (per CP-4 guardrails):
 *   - what_triggered: which condition led the engine to apply this scenario
 *   - what_changed: which adjustments were applied
 *   - why_defensible: why these adjustments are defensible underwriting moves
 *   - what_would_change_result: what would alter the clearance outcome
 *
 * Scenarios without all four fields fail catalogue validation.
 *
 * scenario_confidence_score is null in CP-4. CP-5 or later populates it
 * using propagation math; CP-4 ships only the descriptive factors.
 */
export interface ScenarioOutput {
  readonly output_id: ScenarioOutputId;
  readonly scenario_id: ScenarioId;
  readonly scenario_name: string;
  readonly family: ScenarioFamily;

  // ── Applicability ──
  readonly applied: boolean;
  readonly reason_not_applied: string | null;

  // ── Adjustments and adjusted state ──
  readonly adjustments: ReadonlyArray<AdjustmentRecord>;
  readonly adjusted_inputs: ScenarioAdjustedInputs;

  // ── Clearance ──
  readonly clears: ScenarioClearance;
  readonly clearance_basis: ClearanceBasis;
  readonly clearance_reason: string;

  // ── Scenario confidence (first-class field; null in CP-4 per guardrail #2) ──
  readonly scenario_confidence_score: number | null;
  readonly confidence_factors: ReadonlyArray<{
    readonly factor: string;
    readonly impact: "increases_confidence" | "decreases_confidence";
  }>;

  // ── Explainability surface (mandatory) ──
  readonly what_triggered: string;
  readonly what_changed: string;
  readonly why_defensible: string;
  readonly what_would_change_result: string;
  readonly depends_on_assumptions: ReadonlyArray<AssumptionKey>;

  // ── Future decomposition (RESERVED per guardrail #5) ──
  readonly recovery_feasibility?: ClearanceDimension;
  readonly operational_reversibility?: ClearanceDimension;
  readonly financing_survivability?: ClearanceDimension;

  // ── Provenance ──
  readonly evaluated_at: string;
  readonly catalogue_version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO INTERACTIONS — GUARDRAIL #4 (RESERVED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-scenario interaction detection. RESERVED for future build.
 *
 * Some scenario combinations are independently survivable but jointly
 * catastrophic: wage inflation alone may clear; customer loss alone may
 * clear; together they collapse. CP-4 reserves the type contract;
 * detection logic ships in a future checkpoint.
 *
 * The scenario engine in CP-4 always emits `scenario_interactions: []`.
 * No detection function is called. Adding interactions in the future is
 * a non-breaking change because consumers handle the empty array case.
 */
export interface ScenarioInteraction {
  readonly interaction_id: ScenarioInteractionId;
  readonly participating_scenario_ids: ReadonlyArray<ScenarioId>;
  /** Severity of the interaction effect on overall survivability. */
  readonly severity: "high" | "medium" | "low";
  readonly what_triggered: string;
  readonly why_it_matters: string;
  /** Aggregated assumptions across participating scenarios. */
  readonly aggregated_assumptions: ReadonlyArray<AssumptionKey>;
  /** Aggregated axes affected. */
  readonly aggregated_axes: ReadonlyArray<AxisKey>;
  readonly detected_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO EVALUATION INPUT/OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full context passed to scenario evaluators. Scenarios get the deal's
 * raw inputs, the resolved fingerprint, AND the rule engine result so
 * they can condition applicability on which rules fired (per CP-4 Q4).
 */
export interface ScenarioEvaluationContext {
  readonly inputs: RuleEngineInputs;
  readonly fingerprint_resolution: FingerprintResolution;
  /** Full rule engine result. Scenarios may read firings, patterns, suppressions. */
  readonly rule_engine_result: RuleEngineResult;
  readonly evaluated_at: string;
}

/**
 * Full result of one scenario engine evaluation.
 *
 * scenario_interactions ships as [] in CP-4 (reserved per guardrail #4).
 * Consumers that iterate or aggregate over it handle the empty case
 * gracefully today; future builds populate the array without breaking
 * the contract.
 */
export interface ScenarioEvaluationResult {
  readonly evaluation_id: string;
  readonly evaluated_at: string;
  readonly catalogue_version: string;
  readonly engine_version: string;

  /** Every scenario in the catalogue produces an output. Inapplicable scenarios produce applied=false. */
  readonly outputs: ReadonlyArray<ScenarioOutput>;

  /** RESERVED — always empty in CP-4. */
  readonly scenario_interactions: ReadonlyArray<ScenarioInteraction>;

  /** Diagnostic summary counts. Downstream modules compute their own scores. */
  readonly summary: {
    readonly total_scenarios_evaluated: number;
    readonly applied_count: number;
    readonly not_applicable_count: number;
    readonly clears_comfortably: number;
    readonly clears_marginally: number;
    readonly structurally_compressed: number;
    readonly fails: number;
    readonly normalization_count: number;
    readonly stress_count: number;
    readonly structural_reinterpretation_count: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DEFINITION (the catalogue entry)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per CP-4 Q3 (layered applicability): each scenario declares:
 *   - applies_to_models: which operating models the scenario applies to
 *     (empty array = applies to all)
 *   - applies_when: a pure predicate that reads the evaluation context
 *
 * The engine handles the model gate. The scenario handles the
 * condition gate.
 *
 * Per CP-4 Q4 (scenarios read RuleEngineResult): applies_when receives
 * the full context including the rule engine result.
 *
 * Per CP-4 Q2 (pure adjustment primitives): scenarios call primitives
 * with explicit arguments; primitives have no engine context.
 */
export interface Scenario {
  readonly id: ScenarioId;
  readonly name: string;
  readonly family: ScenarioFamily;
  readonly description: string;

  // ── Applicability gates ──
  readonly applies_to_models: ReadonlyArray<OperatingModelKey>;
  readonly applies_when: (context: ScenarioEvaluationContext) =>
    | { readonly applies: true }
    | { readonly applies: false; readonly reason: string };

  // ── Assumption dependencies ──
  readonly depends_on_assumptions: ReadonlyArray<AssumptionKey>;

  // ── Metrics primarily considered ──
  readonly metrics_considered: ReadonlyArray<MetricKey>;

  // ── Clearance basis and overrides ──
  readonly clearance_basis: ClearanceBasis;
  readonly clearance_threshold_overrides: ClearanceThresholdOverrides | null;

  // ── Pure evaluation function ──
  readonly evaluate: (context: ScenarioEvaluationContext) => ScenarioOutput;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioCatalogueValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<ScenarioCatalogueValidationIssue>;
  readonly summary: {
    readonly scenario_count: number;
    readonly normalization_count: number;
    readonly stress_count: number;
    readonly structural_reinterpretation_count: number;
    readonly scenarios_with_overrides: number;
    readonly scenarios_referencing_rules: number;
    readonly model_agnostic_count: number;
  };
  readonly version: string;
}

export interface ScenarioCatalogueValidationIssue {
  readonly severity: "error" | "warning";
  readonly category:
    | "duplicate_scenario_id"
    | "invalid_id_format"
    | "missing_reasoning_field"
    | "orphan_assumption_reference"
    | "orphan_metric_reference"
    | "invalid_family"
    | "structural_reinterpretation_reserved"
    | "no_applicable_clearance_basis";
  readonly location: string;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ID-FORMAT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scenario ID format: scenario.{family}.{specific}
 *   - family must be one of: normalization, stress, structural_reinterpretation
 *   - specific is lowercase letters, digits, underscores
 *
 * Examples:
 *   scenario.normalization.industry_normalized
 *   scenario.stress.lender_stress
 *   scenario.structural_reinterpretation.recurring_revenue_reclassified (future)
 */
export function isValidScenarioId(id: string): boolean {
  return /^scenario\.(normalization|stress|structural_reinterpretation)\.[a-z][a-z0-9_]*$/.test(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE PRINCIPLES (constitutional constants)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Survivability framing principle — CP-8 narrative reads this when
 * generating prose about scenario failures.
 */
export const SURVIVABILITY_FRAMING_PRINCIPLE = [
  "Scenario clearance results describe survivability under specific ",
  "assumptions, not deal quality verdicts. 'Fails' means the scenario ",
  "surfaces survivability pressure under that assumption — it does not ",
  "mean the deal is bad. The framing is always counterfactual: 'if this ",
  "condition held, the deal would compress/survive/struggle.' Verdict ",
  "lives in axis composition (CP-5), lender simulation (CP-7), and ",
  "buyer judgment — never in the scenario engine.",
].join("");

/**
 * Determinism principle — the scenario engine produces pure, reproducible
 * reframings. Same inputs always produce same outputs (modulo timestamps).
 */
export const SCENARIO_DETERMINISM_PRINCIPLE = [
  "Scenarios are deterministic reframings of trailing financials under ",
  "specific underwriting assumptions. No probability weighting, no Monte ",
  "Carlo, no generative judgment, no LLM-driven reasoning at evaluation ",
  "time. Adjustments are explicit math; rationale fields are static ",
  "registry content; the same inputs always produce the same outputs.",
].join("");

// Suppress unused-import warnings for fields that downstream consumers
// reach for via this types module.
const _suppress: MetricKey | undefined = undefined;
void _suppress;
