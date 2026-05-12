// lib/intelligence/rules/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Rule Engine Type Contracts
//
// CP-3 Foundation. Every type that crosses the boundary between the rule
// engine and downstream consumers (CP-4 scenarios, CP-5 axis composition,
// CP-7 lender simulation, CP-8 narrative prose) is defined here.
//
// Editing principle: every type encodes a constitutional guardrail. The
// type system is part of the doctrine — bypassing the types is bypassing
// the constitution.
//
// Key guardrails enforced at the type level:
//
//   1. Statistical priors don't become automatic truths. Every firing
//      carries an explicit FiringClassification (statistically_atypical /
//      structurally_suspicious / unsupported_by_evidence). Downstream
//      consumers cannot conflate these categories.
//
//   2. Explainability at every layer. RuleFiring requires the five
//      explanatory fields (what_triggered, why_it_matters, depends_on,
//      evidence_to_increase, what_would_invalidate). Validation enforces
//      non-empty content.
//
//   3. Uncertainty is additive, not punitive. A firing populates one or
//      more of three independent output streams (finding, uncertainty_
//      escalation, source_concern). These streams never blend into a
//      single axis at the rule layer.
//
//   4. Stable IDs for longitudinal intelligence. RuleId, FiringId,
//      SourceUpgradeId, MismatchPatternId all branded as nominal types.
//
//   5. Operating-model humility. Rules declare ModelFitRequirement and
//      are suppressed (not weakened) when fingerprint doesn't fit.
//
//   6. No lender-profile leakage. Rules reference only axes, assumptions,
//      source types, and metrics. Personality types intentionally not
//      imported here.
//
//   7. Evidence upgrade paths. Every rule firing can produce one or more
//      SourceUpgradeRecommendation objects with stable IDs.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
  IndustryFingerprint,
  IndustryKey,
  MetricKey,
  OperatingModelKey,
  SourceTypeKey,
  UncertaintySubAxisKey,
  FingerprintResolution,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const RULE_ENGINE_VERSION = "cp3-v0.1.0";
export const RULE_CATALOGUE_VERSION = "cp3-v0.1.0";
export const MISMATCH_PATTERN_CATALOGUE_VERSION = "cp3-v0.1.0";
export const SOURCE_UPGRADE_CATALOGUE_VERSION = "cp3-v0.1.0";

// ─────────────────────────────────────────────────────────────────────────────
// FIRING CLASSIFICATION — GUARDRAIL #1
// ─────────────────────────────────────────────────────────────────────────────
// Statistical priors do not become automatic truths. Every rule firing
// declares which category its conclusion falls into.

/**
 * Three categories of rule firing. Downstream consumers MUST treat these
 * differently. Conflating them is a contract violation.
 *
 *   statistically_atypical — A metric or pattern sits outside the expected
 *   band defined by the operating-model fingerprint. This is a question
 *   surfaced, not a conclusion drawn. By itself, this firing does not move
 *   durability_score. It may inform diligence priorities and source-upgrade
 *   recommendations.
 *
 *   structurally_suspicious — Multiple correlated signals form a coherent
 *   concern. This classification is reserved for either (a) a single rule
 *   that explicitly requires multi-signal confirmation, or (b) a mismatch
 *   pattern detected post-evaluation in mismatch-patterns.ts. A single
 *   statistical outlier should generally NOT escalate to this category.
 *
 *   unsupported_by_evidence — The claim underlying the firing rests on
 *   source_types weaker than the rule's expected minimum. This is an
 *   evidence-quality concern, not a durability concern. The firing must
 *   carry at least one SourceUpgradeRecommendation.
 */
export type FiringClassification =
  | "statistically_atypical"
  | "structurally_suspicious"
  | "unsupported_by_evidence";

export type FiringSeverity = "high" | "medium" | "low";

/**
 * Rule polarity — whether the firing reflects a concern, a strength, or
 * a neutral observation. The constitution requires the catalogue to
 * include positive rules: evidence-supported margin strength, durable
 * recurring revenue, etc.
 */
export type FiringPolarity =
  | "concern"        // negative signal — increases caution
  | "strength"       // positive signal — credible favorable observation
  | "observation";   // neutral — neither favorable nor unfavorable

// ─────────────────────────────────────────────────────────────────────────────
// MODEL-FIT REQUIREMENT — GUARDRAIL #5
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How a rule responds to fingerprint uncertainty. Hybrid businesses get
 * fewer rule firings, not lower-confidence ones — the engine prefers
 * partial understanding over confident misclassification.
 *
 *   fingerprint_match_required — Rule is suppressed entirely when the
 *   fingerprint resolved to fallback or when proxy/recency penalties
 *   exceed the threshold. The suppression itself is captured as a
 *   model_uncertainty signal.
 *
 *   fingerprint_match_preferred — Rule fires but classification is
 *   downgraded one level (e.g., structurally_suspicious -> statistically_
 *   atypical) when fingerprint match is uncertain.
 *
 *   model_agnostic — Rule applies regardless of fingerprint fit.
 *   Reserved for rules that read source-type strength, internal
 *   consistency, or other model-independent signals.
 */
export type ModelFitRequirement =
  | "fingerprint_match_required"
  | "fingerprint_match_preferred"
  | "model_agnostic";

// ─────────────────────────────────────────────────────────────────────────────
// STABLE IDS — GUARDRAIL #4
// ─────────────────────────────────────────────────────────────────────────────
// IDs follow the {module}.{category}.{specific} convention:
//   rule.earnings_quality.addback_concentration_high
//   pattern.contractor.elevated_margin_with_mix_opacity
//   upgrade.addback.bank_statements
// Renaming requires governance. Deletion requires keeping the ID reserved.

/** Stable identifier for a rule in the catalogue. */
export type RuleId = string;

/** Per-firing UUID, generated at firing time. Joins to snapshot rows. */
export type FiringId = string;

/** Stable identifier for a source-upgrade recommendation. */
export type SourceUpgradeId = string;

/** Stable identifier for a mismatch pattern. */
export type MismatchPatternId = string;

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED BENCHMARK INPUTS — Q4 DECISION
// ─────────────────────────────────────────────────────────────────────────────
// Optional extension fields the rule engine reads. Existing BenchmarkInputs
// users (the rest of AcquiFlow) are not affected — all new fields are
// optional. Rules that need missing data no-op cleanly and may emit a
// missing-input uncertainty signal or source-upgrade recommendation.

/**
 * Minimum BenchmarkInputs subset the rule engine reads. The actual
 * AcquiFlow BenchmarkInputs type is a superset; this interface declares
 * only what CP-3 cares about. Decouples CP-3 from the AcquiFlow input
 * schema's full surface.
 */
export interface RuleEngineInputs {
  // ── Core financials (existing AcquiFlow shape, all optional at this layer) ──
  readonly industry_key?: string;
  readonly revenue?: number;
  readonly sde?: number;
  readonly ebitda?: number;
  readonly purchase_price?: number;
  readonly total_debt?: number;
  readonly debt_to_sde?: number;
  readonly dscr?: number;
  readonly current_ratio?: number;
  readonly quick_ratio?: number;
  readonly inventory_pct_assets?: number;
  readonly inventory_turnover?: number;
  readonly ar_days?: number;
  readonly sales_to_assets?: number;
  readonly debt_to_worth?: number;
  readonly int_coverage?: number;
  readonly gross_margin_pct?: number;
  readonly ebitda_margin_pct?: number;
  readonly operating_margin_pct?: number;
  readonly sde_margin_pct?: number;
  readonly revenue_cagr_3yr?: number;

  // ── Addback details (rule engine reads these for earnings-quality rules) ──
  readonly addback_total?: number;
  readonly addback_concentration_top_line_pct?: number;

  // ── Customer concentration (rules read these where provided) ──
  readonly top_customer_pct?: number;
  readonly top_5_customer_pct?: number;

  // ── Source metadata (new in CP-3 per Q4) ──
  readonly deal_source_type?: SourceTypeKey;
  readonly metric_sources?: Partial<Record<MetricKey, SourceTypeKey>>;

  // ── Trajectory inputs (new in CP-3 per Q4) ──
  readonly revenue_prior_year?: number;
  readonly revenue_prior_prior_year?: number;
  readonly sde_prior_year?: number;
  readonly sde_prior_prior_year?: number;
  readonly ebitda_margin_prior_year?: number;
  readonly ebitda_margin_prior_prior_year?: number;
}

/**
 * Full input envelope to the rule engine — inputs plus resolved fingerprint.
 * The fingerprint resolution is done upstream (orchestrator); the rule engine
 * never re-resolves industries.
 */
export interface RuleEvaluationContext {
  readonly inputs: RuleEngineInputs;
  readonly fingerprint_resolution: FingerprintResolution;
  /** Resolution timestamp — used for FiringId generation and snapshot correlation. */
  readonly evaluated_at: string; // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE FIRING — THE PRIMARY OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A Finding affects one or more axes positively or negatively. This is
 * the only stream that can move durability_score or financial_score.
 * Uncertainty escalations and source concerns NEVER write to these axes.
 *
 *   axis_impact — which axes this finding affects and the direction.
 *   evidence_strength_required — what source-type minimum the finding
 *     assumes; if actual source is weaker, the finding may be downgraded
 *     to unsupported_by_evidence in the rule firing.
 */
export interface Finding {
  readonly direction: "positive" | "negative" | "neutral";
  readonly axis_impact: ReadonlyArray<{
    readonly axis: AxisKey;
    /** Relative magnitude hint for CP-5; not a final score delta. */
    readonly relative_magnitude: "high" | "medium" | "low";
  }>;
  /** Plain-language description of what the engine observed. */
  readonly observation: string;
}

/**
 * An UncertaintyDelta can ONLY increase one of the three uncertainty
 * sub-axes. It never writes to durability_score, financial_score, or
 * evidence_quality.
 *
 * This is the type-level enforcement of refinement #3: uncertainty is
 * additive, not punitive.
 */
export interface UncertaintyDelta {
  readonly sub_axis: UncertaintySubAxisKey;
  readonly escalation_points: number; // always positive, never negative
  readonly reason: string;
}

/**
 * A SourceConcern can ONLY decrease evidence_quality. Never writes to
 * durability or financial scores.
 */
export interface SourceConcern {
  readonly affected_input: string;
  readonly actual_source: SourceTypeKey | "unknown";
  readonly expected_minimum_source: SourceTypeKey;
  readonly evidence_quality_reduction_points: number; // always positive (magnitude of decrease)
  readonly reason: string;
}

/**
 * A SourceUpgradeRecommendation is the future-facing companion to a
 * SourceConcern. It identifies the fastest path to closing the gap.
 *
 * CP-3 ships the shape with magnitude fields null. CP-5 populates the
 * uncertainty/evidence_quality reduction estimates after building the
 * propagation math.
 */
export interface SourceUpgradeRecommendation {
  readonly upgrade_id: SourceUpgradeId;
  readonly from_source: SourceTypeKey | "unknown";
  readonly to_source: SourceTypeKey;
  /** What input/metric this upgrade would strengthen. */
  readonly applies_to_input: string;
  /** Plain-language diligence action — what the buyer should request. */
  readonly diligence_action: string;
  /** Populated in CP-5; null in CP-3. */
  readonly estimated_uncertainty_reduction: number | null;
  /** Populated in CP-5; null in CP-3. */
  readonly estimated_evidence_quality_increase: number | null;
}

/**
 * The primary output of the rule engine. A list of these is what
 * downstream consumers read.
 *
 * Required explainability fields (guardrail #2):
 *   - what_triggered: factual statement of which condition matched
 *   - why_it_matters: underwriting interpretation
 *   - depends_on_assumptions: structured list (not free text)
 *   - evidence_to_increase_confidence: structured upgrade paths
 *   - what_would_invalidate: explicit refutation conditions
 *
 * A rule firing without all five fields fails registry validation.
 */
export interface RuleFiring {
  readonly firing_id: FiringId;
  readonly rule_id: RuleId;
  readonly rule_name: string;
  readonly classification: FiringClassification;
  readonly polarity: FiringPolarity;
  readonly severity: FiringSeverity;

  // ── Independent output streams (guardrail #3) ──
  // Any combination of these may be populated. Never blended.
  readonly finding: Finding | null;
  readonly uncertainty_escalation: UncertaintyDelta | null;
  readonly source_concern: SourceConcern | null;

  // ── Explainability surface (guardrail #2) ──
  readonly what_triggered: string;
  readonly why_it_matters: string;
  readonly depends_on_assumptions: ReadonlyArray<AssumptionKey>;
  readonly evidence_to_increase_confidence: ReadonlyArray<SourceUpgradeRecommendation>;
  readonly what_would_invalidate: string;

  // ── Provenance ──
  readonly fired_at: string; // ISO timestamp
  readonly catalogue_version: string;
  /** Trigger IDs from the fingerprint this firing references. */
  readonly references_trigger_ids: ReadonlyArray<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE DEFINITION (the catalogue entry)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What a Rule is, structurally. The catalogue is an array of these.
 *
 * Each Rule is a pure function: given a RuleEvaluationContext, it returns
 * either null (rule didn't fire) or a RuleFiring. Rules NEVER read other
 * rules' outputs; correlations are detected post-evaluation by
 * mismatch-patterns.ts.
 */
export interface Rule {
  readonly id: RuleId;
  readonly name: string;
  /** Short description for catalogue browsing / documentation. */
  readonly description: string;
  /** Which operating models this rule applies to. Empty array = all models. */
  readonly applies_to_models: ReadonlyArray<OperatingModelKey>;
  /** Whether the rule fires on fallback / proxy fingerprints. */
  readonly model_fit_requirement: ModelFitRequirement;
  /** Which assumptions this rule's firings depend on. Validates against ASSUMPTIONS. */
  readonly depends_on_assumptions: ReadonlyArray<AssumptionKey>;
  /** Which metrics this rule reads. Validates against METRIC_RELEVANCE. */
  readonly reads_metrics: ReadonlyArray<MetricKey>;
  /** Default polarity for this rule's firings. */
  readonly polarity: FiringPolarity;
  /** Default classification for this rule's firings. Specific firings may downgrade. */
  readonly default_classification: FiringClassification;
  /** Default severity. */
  readonly default_severity: FiringSeverity;
  /** Pure evaluation function. Returns null when rule doesn't fire. */
  readonly evaluate: (context: RuleEvaluationContext) => RuleFiring | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MISMATCH PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A correlated cluster of rule firings forming a coherent concern.
 * Mismatch patterns are evaluated post-rule-evaluation against the
 * unordered firing set. They cannot influence individual rule outputs.
 *
 * Patterns are second-order intelligence. The constitution is explicit
 * that interactions are insight; this is where that lives.
 */
export interface MismatchPattern {
  readonly id: MismatchPatternId;
  readonly name: string;
  readonly description: string;
  /** Which rule IDs participate in this pattern. */
  readonly participating_rule_ids: ReadonlyArray<RuleId>;
  /**
   * Minimum number of participating rules that must have fired for the
   * pattern to detect.
   */
  readonly minimum_firings_required: number;
  /** Default severity when the pattern is detected. */
  readonly default_severity: FiringSeverity;
  /** Plain-language explanation of why this cluster matters. */
  readonly why_it_matters: string;
  /**
   * Pure detection function. Receives the unordered firing set, returns
   * a PatternDetection or null. Never modifies the firing set.
   */
  readonly detect: (firings: ReadonlyArray<RuleFiring>) => PatternDetection | null;
}

/**
 * The output of a successful mismatch-pattern detection.
 *
 * Detections are emitted alongside rule firings to downstream consumers
 * (CP-5 axis composition, CP-8 narrative). They are the primary path
 * for legitimate structurally_suspicious classifications.
 */
export interface PatternDetection {
  readonly detection_id: string; // UUID
  readonly pattern_id: MismatchPatternId;
  readonly pattern_name: string;
  readonly severity: FiringSeverity;
  /** The firings that triggered this detection (by firing_id). */
  readonly participating_firing_ids: ReadonlyArray<FiringId>;
  /** Aggregated assumptions across participating firings. Drives fragility graph. */
  readonly aggregated_assumptions: ReadonlyArray<AssumptionKey>;
  /** Aggregated axes affected across participating firings. */
  readonly aggregated_axes: ReadonlyArray<AxisKey>;
  readonly what_triggered: string;
  readonly why_it_matters: string;
  readonly detected_at: string; // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE ENGINE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The full output of one rule-engine evaluation. This is what gets
 * persisted in snapshot rows and consumed by CP-5+.
 */
export interface RuleEngineResult {
  readonly evaluation_id: string; // UUID
  readonly evaluated_at: string;
  readonly catalogue_version: string;
  readonly pattern_catalogue_version: string;
  readonly fingerprint_resolution: FingerprintResolution;

  /** All rule firings, in catalogue order. */
  readonly firings: ReadonlyArray<RuleFiring>;
  /** Rule IDs that were suppressed due to model-fit requirements. */
  readonly suppressed_rule_ids: ReadonlyArray<RuleId>;
  /** All detected mismatch patterns. */
  readonly pattern_detections: ReadonlyArray<PatternDetection>;

  /**
   * Summary signals — derived from firings and detections, not authoritative.
   * Downstream modules compute their own axis scores; these counts are
   * provenance/diagnostics only.
   */
  readonly summary: {
    readonly total_firings: number;
    readonly concerns: number;
    readonly strengths: number;
    readonly observations: number;
    readonly statistically_atypical: number;
    readonly structurally_suspicious: number;
    readonly unsupported_by_evidence: number;
    readonly total_pattern_detections: number;
    readonly suppressed_rules: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface RuleCatalogueValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<RuleCatalogueValidationIssue>;
  readonly summary: {
    readonly rule_count: number;
    readonly pattern_count: number;
    readonly source_upgrade_count: number;
    readonly concerns_count: number;
    readonly strengths_count: number;
    readonly observations_count: number;
    readonly rules_with_assumption_dependencies: number;
    readonly rules_with_source_upgrades: number;
    readonly fingerprint_match_required_count: number;
    readonly fingerprint_match_preferred_count: number;
    readonly model_agnostic_count: number;
  };
  readonly version: string;
}

export interface RuleCatalogueValidationIssue {
  readonly severity: "error" | "warning";
  readonly category:
    | "duplicate_rule_id"
    | "duplicate_pattern_id"
    | "duplicate_source_upgrade_id"
    | "orphan_assumption_reference"
    | "orphan_metric_reference"
    | "orphan_rule_reference_in_pattern"
    | "lender_profile_leakage"
    | "missing_explainability_field"
    | "missing_source_upgrade_for_unsupported_classification"
    | "invalid_id_format";
  readonly location: string;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ID-FORMAT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stable ID format: {module}.{category}.{specific}
 *   - lowercase letters, digits, underscores
 *   - exactly 2 dots (3 segments)
 *   - each segment non-empty
 */
export function isValidStableId(id: string): boolean {
  return /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(id);
}
