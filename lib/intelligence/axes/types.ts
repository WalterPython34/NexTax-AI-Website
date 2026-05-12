// lib/intelligence/axes/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Axis Composition Type Contracts
//
// CP-5 Foundation. Every type that crosses the boundary between the axis
// composer and downstream consumers (CP-7 lender simulation, CP-8 narrative
// prose, CP-9 snapshot persistence, dashboard tiles, PDF reports) lives here.
//
// This file is constitutional infrastructure. The five-axis output is the
// product surface; the type contracts here define what that surface CAN say.
// Editing these types changes what conclusions the engine is capable of
// drawing.
//
// Key architectural commitments enforced at the type level:
//
//   1. NO HIDDEN MASTER SCORE. The five axes never compose into an overall
//      score, deal score, blended score, acquisition score, or composite
//      score. The five-axis model IS the product. Composite posture
//      indicators live downstream (CP-7 lender simulation, CP-8 narrative);
//      none are emitted by CP-5.
//
//   2. COMPONENT-TRACEABLE SCORES. Every numeric contribution to an axis
//      score traces back to a stable ID — a rule firing, pattern detection,
//      scenario output, source concern, or fingerprint signal. Components
//      without source provenance cannot exist (validator enforces this).
//
//   3. PER-COMPONENT NORMALIZATION. Each component declares its reference
//      population (this_fingerprint / all_fingerprints / global_benchmark)
//      so rule-density inflation doesn't accidentally penalize operating
//      models with denser diagnostic rulesets.
//
//   4. SOFT CAPS WITH EXISTENTIAL OVERRIDE. Ordinary components carry a
//      soft cap so no single signal can overpower the dimensional reading.
//      Truly existential signals (fallback fingerprint, catastrophic DSCR
//      collapse) may carry `existential_component: true` and exceed the cap.
//
//   5. NO CROSS-AXIS CONTAMINATION. Each axis is composed by a dedicated
//      function that receives ONLY the input streams it's permitted to read.
//      The file boundaries between compose-financial.ts, compose-durability.ts,
//      compose-evidence.ts, compose-fragility.ts, and compose-uncertainty.ts
//      are themselves architectural enforcement.
//
//   6. POSITIVE COMPONENTS PRESERVED. The engine recognizes strength as
//      well as risk. Components may carry positive or negative contributions.
//      Direct sign convention: positive contributions appear positive,
//      negative contributions appear negative.
//
//   7. SEPARATE MEASUREMENT FROM JUDGMENT. CP-5 measures dimensional
//      posture. It does not say buy / walk-away / approved / rejected. That
//      language lives in narrative (CP-8), lender simulation (CP-7), and
//      buyer judgment.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
  FingerprintResolution,
  UncertaintySubAxisKey,
} from "../types";
import type {
  PatternDetection,
  RuleEngineResult,
  RuleFiring,
} from "../rules/types";
import type {
  ScenarioEvaluationResult,
  ScenarioOutput,
} from "../scenarios/types";

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const AXIS_ENGINE_VERSION = "cp5-v0.1.0";
export const AXIS_COMPOSITION_VERSION = "cp5-v0.1.0";
export const FRAGILITY_GRAPH_VERSION = "cp5-v0.1.0";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL BASELINES
// ─────────────────────────────────────────────────────────────────────────────
// Each axis begins at a baseline that components shift up or down. Baselines
// are exported constants with rationale, not magic numbers. Changing a
// baseline is a governance decision that affects every deal evaluated under
// this version of the engine.

/**
 * Financial baseline begins slightly above neutral (65) because most
 * businesses entering the engine are viable operating businesses with
 * demonstrated revenue and operating cash flow. The baseline does NOT
 * assume institutional quality — it assumes the entity has survived to
 * the point of being for sale. Negative components (thin DSCR, elevated
 * leverage, margin compression) move the score down; positive components
 * (strong coverage, robust working capital, evidence-backed margins) move
 * it up.
 */
export const FINANCIAL_BASELINE = 65;

/**
 * Durability baseline (60) sits below the financial baseline because
 * durability is structurally harder than raw financial appearance. A deal
 * may show strong trailing financials but fail durability tests due to
 * concentration, transition risk, or scenario compression. Deals need to
 * earn higher durability through scenario clearance, low concentration,
 * and resilient operating structure.
 */
export const DURABILITY_BASELINE = 60;

/**
 * Evidence quality baseline (55) reflects that most SMB deals begin with
 * incomplete or seller-controlled information. Starting slightly above
 * neutral avoids assuming fraud while still requiring evidence upgrades
 * to reach "strong." Tax-return + bank-statement anchored deals will
 * move up materially; verbal-assertion-only deals will move down.
 */
export const EVIDENCE_BASELINE = 55;

/**
 * Fragility baseline (25) reflects that low-to-moderate fragility is the
 * normal starting state. Fragility should ACCUMULATE structurally — through
 * concentration clusters, layered conclusions, and criticality-weighted
 * dependencies — rather than begin elevated. A baseline-25 deal carries
 * the typical assumption load any operating business has; significant
 * concentration moves the score up toward "highly concentrated."
 */
export const FRAGILITY_BASELINE = 25;

/**
 * Uncertainty baseline (20) reflects that most deals begin "underwriteable
 * until complexity emerges." The engine escalates uncertainty based on
 * missing evidence, fingerprint mismatch, hybrid business models,
 * conflicting signals, sparse benchmarks, and model incompleteness — not
 * because uncertainty is presumed by default. A baseline-20 deal can be
 * underwritten with normal diligence; significant escalation moves toward
 * "severe uncertainty."
 */
export const UNCERTAINTY_BASELINE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION CAPS
// ─────────────────────────────────────────────────────────────────────────────
// Soft caps prevent any single ordinary component from overpowering an axis.
// Components flagged `existential_component: true` may exceed the cap.
//
// The cap values reflect "what's the largest single signal that should be
// allowed to move an axis on its own?" For most components, ±15 points is
// already a significant signal; existential components (fallback fingerprint,
// catastrophic coverage collapse) may legitimately move scores by ±25 or more.

export const COMPONENT_SOFT_CAP_POSITIVE = 15;
export const COMPONENT_SOFT_CAP_NEGATIVE = -15;

/**
 * Existential cap — applied only when a component carries
 * `existential_component: true`. Beyond this, even existential components
 * are capped (to prevent runaway scoring on edge cases).
 */
export const COMPONENT_EXISTENTIAL_CAP_POSITIVE = 35;
export const COMPONENT_EXISTENTIAL_CAP_NEGATIVE = -35;

// ─────────────────────────────────────────────────────────────────────────────
// AXIS-SPECIFIC SEMANTIC BANDS
// ─────────────────────────────────────────────────────────────────────────────
// Band labels are axis-specific rather than reusing generic emotional framing.
// "Concerning" makes sense for financial_score; "highly concentrated" makes
// sense for fragility; "severe uncertainty" makes sense for the uncertainty
// axis. The labels describe the axis state, not impose verdict language.

/** Score-to-band thresholds. Same numeric cutoffs across all axes (0-30, 30-50, 50-70, 70-100). */
export const BAND_CUTOFF_LOW = 30;
export const BAND_CUTOFF_MID = 50;
export const BAND_CUTOFF_HIGH = 70;

/**
 * For axes where higher score is better (financial, durability, evidence).
 * Standard ladder: concerning / cautionary / moderate / strong.
 */
export type StandardAxisBand =
  | "concerning"
  | "cautionary"
  | "moderate"
  | "strong";

/**
 * For assumption_fragility where higher score is worse (more concentration).
 */
export type FragilityBand =
  | "low_concentration"
  | "moderate_concentration"
  | "elevated_concentration"
  | "highly_concentrated";

/**
 * For underwriting_uncertainty where higher score is worse (less underwriteable).
 */
export type UncertaintyBand =
  | "low_uncertainty"
  | "moderate_uncertainty"
  | "elevated_uncertainty"
  | "severe_uncertainty";

/**
 * Union of all band values. Used in AxisScore.band field where the axis
 * determines which set of labels applies.
 */
export type AxisBand = StandardAxisBand | FragilityBand | UncertaintyBand;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SOURCE PROVENANCE
// ─────────────────────────────────────────────────────────────────────────────
// Every axis component must trace back to a source. Components without
// provenance fail validation. The source type union enumerates every
// upstream surface the axis composer is permitted to read.

export type ComponentSourceType =
  | "rule_firing"           // a RuleFiring's Finding field
  | "pattern_detection"     // a PatternDetection
  | "scenario_output"       // a ScenarioOutput
  | "source_concern"        // a RuleFiring's SourceConcern field
  | "uncertainty_delta"     // a RuleFiring's UncertaintyDelta field
  | "fingerprint_signal"    // fingerprint metadata (fallback, proxy, recency)
  | "source_upgrade"        // a SourceUpgradeRecommendation
  | "fragility_signal";     // an AssumptionGraphNode

export interface ComponentSource {
  readonly type: ComponentSourceType;
  /** Stable ID from the originating module (RuleId, FiringId, ScenarioId, etc.) */
  readonly id: string;
  /** Plain-language description of what the source captured. */
  readonly description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-COMPONENT NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
// Q3 = (C) per-component declaration. Each component declares the reference
// population its contribution is measured against. This protects against
// rule-density inflation across operating models with different diagnostic
// granularity.

export type ReferencePopulation =
  | "this_fingerprint"      // measured against expected behavior of this operating model
  | "all_fingerprints"      // measured against universe of fingerprints
  | "global_benchmark";     // measured against absolute thresholds (e.g., source-type strength)

// ─────────────────────────────────────────────────────────────────────────────
// AXIS COMPONENT — the primary explanatory surface
// ─────────────────────────────────────────────────────────────────────────────
// "Components are the real product. Every axis score must be traceable to
//  rule firing IDs, pattern IDs, scenario IDs, source concern IDs, fingerprint
//  metadata. If a component cannot explain its source, it should not exist."

export interface AxisComponent {
  /** Stable identifier — namespace: component.{axis_short}.{specific} */
  readonly component_id: string;
  /** Which axis this component contributes to. */
  readonly axis: AxisKey;
  /** Human-readable name. */
  readonly name: string;
  /**
   * Direct sign convention (Q2 = A): positive contributions appear positive,
   * negative contributions appear negative. The number is added directly to
   * the axis score (after capping).
   */
  readonly contribution: number;
  /**
   * Plain-language explanation of why this component contributes what it
   * contributes. Read by users; the score is the summary, this is the
   * answer to "why?"
   */
  readonly contribution_explanation: string;
  /** Per-component normalization declaration (Q3 = C). */
  readonly reference_population: ReferencePopulation;
  /** Whether this component is allowed to exceed the soft cap. */
  readonly existential_component: boolean;
  /** Upstream IDs the component traces back to. Required and non-empty. */
  readonly sources: ReadonlyArray<ComponentSource>;
  /** Assumptions this component depends on. Empty for most components. */
  readonly depends_on_assumptions: ReadonlyArray<AssumptionKey>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIS SCORE
// ─────────────────────────────────────────────────────────────────────────────

export interface AxisScore {
  readonly axis: AxisKey;
  /**
   * 0-100 numeric summary. The number is presentation, not authority.
   * Users read the band for framing and the components for the answer.
   */
  readonly score: number;
  /** Axis-specific semantic band. */
  readonly band: AxisBand;
  /** The baseline this axis started at (FINANCIAL_BASELINE, etc.). */
  readonly baseline: number;
  /** Components that shaped the score. The primary explanatory surface. */
  readonly components: ReadonlyArray<AxisComponent>;
  /**
   * Net sum of capped contributions (score = baseline + net_contribution,
   * clamped to 0-100). Exposed for diagnostic transparency.
   */
  readonly net_contribution: number;
  /** Per-axis catalogue version for snapshot correlation. */
  readonly version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNDERWRITING UNCERTAINTY (composite + three sub-axes)
// ─────────────────────────────────────────────────────────────────────────────
// The constitution defines underwriting_uncertainty as a composite of three
// sub-axes: data_uncertainty, structural_uncertainty, model_uncertainty.
// CP-5 emits all four (composite + three sub-axis scores) so downstream
// consumers can read either level.

export interface UncertaintyAxisScore extends AxisScore {
  readonly sub_axes: {
    readonly data_uncertainty: AxisScore;
    readonly structural_uncertainty: AxisScore;
    readonly model_uncertainty: AxisScore;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL FIVE-AXIS RESULT
// ─────────────────────────────────────────────────────────────────────────────
// The CP-5 deliverable. Five independent first-class axes, plus the
// assumption fragility graph (read by compose-fragility.ts but exposed as
// a first-class artifact for CP-7+ consumers).
//
// NOTE: this interface intentionally does NOT contain an overall_score,
// composite_score, or any blended axis. The five axes stay independent
// forever.

export interface AxisCompositionResult {
  readonly evaluation_id: string;
  readonly evaluated_at: string;
  readonly version: string;
  readonly fingerprint_resolution: FingerprintResolution;

  // ── The five axes ──
  readonly financial_score: AxisScore;
  readonly durability_score: AxisScore;
  readonly evidence_quality: AxisScore;
  readonly assumption_fragility: AxisScore;
  readonly underwriting_uncertainty: UncertaintyAxisScore;

  // ── The fragility graph (first-class artifact, not just an axis component) ──
  readonly assumption_fragility_graph: AssumptionFragilityGraph;

  // ── Diagnostic summary ──
  readonly summary: {
    readonly total_components: number;
    readonly positive_components: number;
    readonly negative_components: number;
    readonly existential_components: number;
    readonly fingerprint_relative_components: number;
    readonly global_components: number;
    readonly fragility_node_count: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTION FRAGILITY GRAPH (full graph per Q4 = A)
// ─────────────────────────────────────────────────────────────────────────────
// The fragility graph is one of the most important differentiators in the
// engine. It is NOT a summary count. The value is in showing assumption
// concentration, conclusion dependency, criticality weighting, layering
// depth, and axis spread — enabling statements like "Seven favorable
// conclusions depend on add-back integrity."

export type ConclusionImportance =
  | "headline_conclusion"          // moves the verdict
  | "supporting_conclusion"        // shapes the verdict
  | "informational_observation";   // present but not load-bearing

/**
 * A conclusion is an inference the engine drew that depends on an
 * assumption. Conclusions originate from rule firings, pattern detections,
 * or scenario outputs.
 */
export interface ConclusionReference {
  readonly conclusion_id: string;
  readonly source_type: "rule_firing" | "pattern_detection" | "scenario_output";
  readonly source_id: string;          // RuleId, MismatchPatternId, ScenarioId
  readonly description: string;
  readonly importance: ConclusionImportance;
  readonly axes_affected: ReadonlyArray<AxisKey>;
  /** Whether the conclusion is favorable, unfavorable, or neutral toward the deal. */
  readonly polarity: "favorable" | "unfavorable" | "neutral";
}

/**
 * Edge in the dependency graph: an assumption supports a conclusion.
 */
export interface AssumptionDependencyEdge {
  readonly from_assumption: AssumptionKey;
  readonly to_conclusion_id: string;
  /** Weight reflecting how load-bearing the assumption is for this conclusion. */
  readonly weight: "primary" | "secondary";
}

/**
 * Per-assumption node in the fragility graph. The constitution's full
 * AssumptionGraphNode shape — every field populated, not just counts.
 */
export interface AssumptionFragilityNode {
  readonly assumption_key: AssumptionKey;
  readonly assumption_name: string;
  /** Number of rule firings + pattern detections + scenarios that depend on this assumption. */
  readonly rule_count: number;
  readonly pattern_count: number;
  readonly scenario_count: number;
  /** Number of distinct conclusions that rest on this assumption. */
  readonly conclusion_count: number;
  /** Current evidence strength for this assumption (0-100). */
  readonly evidence_strength: number;
  /** Sum of conclusion-importance weights for dependent conclusions. */
  readonly criticality_weighted_count: number;
  /** Max chain length through dependent conclusions. */
  readonly layering_depth: number;
  /** Which axes the assumption affects in this deal. */
  readonly axis_spread: ReadonlyArray<AxisKey>;
  /** Conclusions that depend on this assumption — direct references for explainability. */
  readonly dependent_conclusions: ReadonlyArray<ConclusionReference>;
  /** How many of the dependent conclusions are favorable vs unfavorable. */
  readonly favorable_dependent_count: number;
  readonly unfavorable_dependent_count: number;
  /** Whether this assumption is identified as a fragility hotspot for this deal. */
  readonly is_hotspot: boolean;
  /** Plain-language explanation of why (or why not) this assumption is a hotspot. */
  readonly hotspot_explanation: string;
}

/**
 * The full fragility graph for one deal. Nodes + edges + summary statistics.
 */
export interface AssumptionFragilityGraph {
  readonly version: string;
  readonly nodes: ReadonlyArray<AssumptionFragilityNode>;
  readonly edges: ReadonlyArray<AssumptionDependencyEdge>;
  readonly summary: {
    readonly total_nodes: number;
    readonly hotspot_count: number;
    readonly max_conclusion_count: number;
    readonly max_layering_depth: number;
    readonly assumptions_with_zero_dependencies: number;
    readonly assumptions_with_unfavorable_only: number;
    readonly assumptions_with_favorable_only: number;
    readonly assumptions_with_mixed: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSER INPUT TYPES — enforces no-cross-axis-contamination at type level
// ─────────────────────────────────────────────────────────────────────────────
// Each composer receives ONLY the input streams its axis is allowed to read.
// The file boundaries and these typed inputs together enforce architectural
// separation. A composer function that wanted to read source_concerns to
// compute financial_score would have to add a parameter — which the
// orchestrator wouldn't pass — making cross-contamination structurally
// impossible.

/** Input contract for compose-financial.ts. */
export interface FinancialComposerInputs {
  /** All findings whose axis_impact includes "financial_score". */
  readonly relevant_findings: ReadonlyArray<{
    readonly firing_id: string;
    readonly rule_id: string;
    readonly rule_name: string;
    readonly direction: "positive" | "negative" | "neutral";
    readonly observation: string;
    readonly relative_magnitude: "high" | "medium" | "low";
  }>;
  readonly scenario_outputs: ReadonlyArray<ScenarioOutput>;
  readonly fingerprint_resolution: FingerprintResolution;
}

/** Input contract for compose-durability.ts. */
export interface DurabilityComposerInputs {
  readonly relevant_findings: ReadonlyArray<{
    readonly firing_id: string;
    readonly rule_id: string;
    readonly rule_name: string;
    readonly direction: "positive" | "negative" | "neutral";
    readonly observation: string;
    readonly relative_magnitude: "high" | "medium" | "low";
  }>;
  readonly pattern_detections: ReadonlyArray<PatternDetection>;
  readonly scenario_outputs: ReadonlyArray<ScenarioOutput>;
  readonly fingerprint_resolution: FingerprintResolution;
}

/** Input contract for compose-evidence.ts. */
export interface EvidenceComposerInputs {
  readonly source_concerns: ReadonlyArray<{
    readonly firing_id: string;
    readonly rule_id: string;
    readonly affected_input: string;
    readonly actual_source: string;
    readonly expected_minimum_source: string;
    readonly evidence_quality_reduction_points: number;
    readonly reason: string;
  }>;
  readonly fingerprint_resolution: FingerprintResolution;
  /** Source-upgrade ID hints; used to credit confirmed strong sources where present. */
  readonly deal_source_type: string | null;
}

/** Input contract for compose-fragility.ts. */
export interface FragilityComposerInputs {
  readonly graph: AssumptionFragilityGraph;
  readonly fingerprint_resolution: FingerprintResolution;
}

/** Input contract for compose-uncertainty.ts. */
export interface UncertaintyComposerInputs {
  readonly uncertainty_escalations: ReadonlyArray<{
    readonly firing_id: string;
    readonly rule_id: string;
    readonly sub_axis: UncertaintySubAxisKey;
    readonly escalation_points: number;
    readonly reason: string;
  }>;
  readonly fingerprint_resolution: FingerprintResolution;
  readonly suppressed_rule_ids: ReadonlyArray<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL ORCHESTRATOR INPUT
// ─────────────────────────────────────────────────────────────────────────────

export interface AxisCompositionInput {
  readonly rule_engine_result: RuleEngineResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
  readonly fingerprint_resolution: FingerprintResolution;
  /** Raw inputs — used by fragility graph to compute evidence_strength per assumption. */
  readonly deal_source_type: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AxisEngineValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<{
    readonly severity: "error" | "warning";
    readonly category:
      | "missing_baseline"
      | "invalid_band_threshold"
      | "missing_component_source"
      | "cap_violation"
      | "negative_score"
      | "above_max_score";
    readonly location: string;
    readonly message: string;
  }>;
  readonly version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: COMPONENT-ID VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Component ID format: component.{axis_short}.{specific}
 *   axis_short ∈ { financial, durability, evidence, fragility, uncertainty }
 */
export function isValidComponentId(id: string): boolean {
  return /^component\.(financial|durability|evidence|fragility|uncertainty)\.[a-z][a-z0-9_]*$/.test(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE PRINCIPLES
// ─────────────────────────────────────────────────────────────────────────────
// Constants the narrative layer (CP-8) reads for framing consistency.

export const FIVE_AXIS_INDEPENDENCE_PRINCIPLE = [
  "The five axes are independent dimensional readings, not components of an ",
  "overall score. financial_score does not feed evidence_quality. ",
  "underwriting_uncertainty does not punish durability_score. Each axis is ",
  "an independent reading the user must integrate themselves. The engine ",
  "refuses to collapse them into a single number because doing so would ",
  "destroy the multidimensional structure that institutional underwriting ",
  "requires.",
].join("");

export const COMPONENTS_OVER_SCORES_PRINCIPLE = [
  "Components are the real product. The numeric score is a summary; the ",
  "band is the framing; the components are the answer to 'why?'. Users ",
  "challenging an axis score should be directed to the component list, not ",
  "to an opaque formula. Every component traces to specific rule firings, ",
  "pattern detections, scenario outputs, or fingerprint signals — and ",
  "every component can be independently inspected and challenged.",
].join("");

export const FRAGILITY_AS_STRUCTURE_PRINCIPLE = [
  "High fragility means 'many conclusions depend on concentrated ",
  "assumptions.' It does not automatically mean 'bad deal.' Some fragile ",
  "deals can still be attractive if the critical assumptions are highly ",
  "verifiable. The narrative layer should frame fragility as structural ",
  "concentration, not punishment — and pair fragility readings with ",
  "evidence-upgrade paths that reduce the fragility.",
].join("");

// Suppress unused-import warnings
const _suppress_AssumptionKey: AssumptionKey | undefined = undefined;
const _suppress_RuleFiring: RuleFiring | undefined = undefined;
void _suppress_AssumptionKey;
void _suppress_RuleFiring;
