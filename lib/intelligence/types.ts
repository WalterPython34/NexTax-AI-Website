// lib/intelligence/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Underwriting Intelligence Engine — Type Contracts
//
// CP-2 Foundation — Shared types used by all intelligence modules.
//
// This file is intentionally exhaustive. Every type that crosses module
// boundaries is defined here. The five-axis model, the assumption taxonomy,
// the source hierarchy, the operating model fingerprints, and the lender
// personality architecture all express their type contracts in this file.
//
// Editing principle: every new type carries a comment explaining what it
// represents underwritingly, not just what it represents typographically.
// The type system is part of the doctrine.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VERSION
// ─────────────────────────────────────────────────────────────────────────────
// Every snapshot persists the registry version that produced it. When the
// engine evolves, snapshots remain interpretable because we can resolve them
// against the registry version they were generated under.

export const REGISTRY_VERSION = "cp2-v0.2.0";
export const FINGERPRINT_REGISTRY_VERSION = "cp2-v0.2.0";
export const RULE_CATALOG_VERSION = "unset-pending-cp3";
export const ASSUMPTION_TAXONOMY_VERSION = "cp2-v0.2.0";
export const SOURCE_TYPE_REGISTRY_VERSION = "cp2-v0.2.0";

// ─────────────────────────────────────────────────────────────────────────────
// THE FIVE AXES
// ─────────────────────────────────────────────────────────────────────────────
// Every deal produces five independent assessments. The engine never
// collapses these at the engine layer; presentation may collapse them.
// See Section 1 of the constitution.

export type AxisKey =
  | "financial_score"          // How strong do the numbers look on paper?
  | "durability_score"         // How likely is this profile to hold post-close?
  | "evidence_quality"         // How trustworthy are the inputs?
  | "assumption_fragility"     // How many things must remain true simultaneously?
  | "underwriting_uncertainty"; // How confidently can a conclusion be defended?

/**
 * Three sub-axes inside underwriting_uncertainty. The engine separates them
 * so the buyer knows what kind of investigation closes the gap.
 *
 * - data_uncertainty: conflicting signals, sparse comps, missing inputs
 * - structural_uncertainty: deal profile doesn't match the fingerprint
 * - model_uncertainty: the engine recognizes its own framework is incomplete
 *                     for this deal. Institutional humility. Not indecision.
 */
export type UncertaintySubAxisKey =
  | "data_uncertainty"
  | "structural_uncertainty"
  | "model_uncertainty";

// ─────────────────────────────────────────────────────────────────────────────
// CORE METRIC KEYS
// ─────────────────────────────────────────────────────────────────────────────
// Every metric the engine reasons about must appear in this union. Adding a
// metric requires explicit governance — the rule that references it must
// justify its addition.

export type MetricKey =
  // Profitability
  | "gross_margin_pct"
  | "sde_margin_pct"
  | "operating_margin_pct"
  | "ebitda_margin_pct"
  | "pretax_margin_pct"
  // Coverage
  | "dscr"
  | "int_coverage"
  | "pi_coverage"
  // Leverage
  | "debt_to_sde"
  | "debt_to_worth"
  | "ltv"
  // Liquidity
  | "current_ratio"
  | "quick_ratio"
  // Efficiency / cycle
  | "inventory_turnover"
  | "days_inventory_outstanding"
  | "ar_days"
  | "inventory_pct_assets"
  | "sales_to_assets"
  // Growth
  | "revenue_cagr_3yr"
  // Structural
  | "sources_uses_balance"
  | "working_capital_needed"
  // Derived
  | "capex_intensity_implied";

/**
 * What the metric measures. Higher-is-better metrics get one outlier
 * treatment; lower-is-better get the opposite; band metrics are good
 * in a range and concerning at extremes either direction.
 */
export type MetricDirectionality = "higher_is_better" | "lower_is_better" | "band";

/**
 * What the metric is used for. Drives suppression behavior in industry
 * fingerprints — a metric with "operational" category may be suppressed
 * for industries where the operational concept doesn't apply.
 */
export type MetricCategory =
  | "profitability"
  | "liquidity"
  | "leverage"
  | "efficiency"
  | "coverage"
  | "structure"
  | "growth"
  | "derived";

/**
 * How meaningful this metric typically is for the named consumer.
 * Used to weight the metric's contribution to the corresponding axis.
 */
export type RelevanceLevel = "high" | "medium" | "low" | "none";

/**
 * How confident the engine should be in this metric's signal for this deal.
 * - reliable: high-quality, low-noise indicator
 * - context_dependent: meaningful in some industries, noise in others
 * - low_confidence: the metric exists but its interpretation is fragile
 */
export type ConfidenceImpact = "reliable" | "context_dependent" | "low_confidence";

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE TYPE HIERARCHY (7-tier with 4-band rollup)
// ─────────────────────────────────────────────────────────────────────────────
// Institutional underwriting does not treat all evidence as equivalent.
// A bank statement is not a POS export is not an internal P&L is not a
// seller spreadsheet, even when each contains the same number.
//
// See Section 2 of the constitution.

export type SourceTypeKey =
  | "tax_returns"
  | "bank_statements"
  | "payroll_filings"
  | "pos_exports"
  | "internal_pnl"
  | "seller_spreadsheet"
  | "verbal_assertion";

export type SourceBand =
  | "verified"        // Third-party-produced or third-party-attested
  | "documented"      // System-generated but seller-reconciled
  | "seller_prepared" // Seller-controlled but auditable
  | "asserted";       // No documentation; hypothesis only

/**
 * Independence classification — distinct from band because the manipulation
 * risk profile matters more than the documentation form. POS exports are
 * seller-adjacent but operationally constrained; internal spreadsheets are
 * fully seller-controlled.
 *
 * This drives lender-personality fraud-risk weighting in CP-6.
 */
export type SourceIndependence =
  | "independent"        // tax_returns, bank_statements, payroll_filings
  | "semi_independent"   // pos_exports — system-generated but seller can reconcile
  | "seller_controlled"; // internal_pnl, seller_spreadsheet, verbal_assertion

export type SourceManipulability = "very_low" | "low" | "moderate" | "high" | "very_high";
export type SourceAuditability = "high" | "moderate" | "low" | "none";
export type SourceSurvivability = "high" | "moderate" | "low" | "none";

export interface SourceType {
  readonly key: SourceTypeKey;
  readonly name: string;
  readonly band: SourceBand;
  readonly independence: SourceIndependence;
  readonly manipulability: SourceManipulability;
  readonly auditability: SourceAuditability;
  readonly survivability: SourceSurvivability;
  /** 0-100. Anchors the evidence_source_strength sub-component. */
  readonly strength_score: number;
  /** Underwriting meaning of this source type. */
  readonly description: string;
  /** Metrics this source type typically supports. */
  readonly typical_for: ReadonlyArray<string>;
  /** Known weaknesses — what this source can't establish, where it can mislead. */
  readonly weakness_notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTION TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────
// Fifteen first-class assumptions. Every interaction rule, scenario, and
// durability calculation references assumptions from this fixed taxonomy.
// Dependency concentration analysis depends on this being finite.
//
// See Section 3 of the constitution.

export type AssumptionKey =
  | "add_back_integrity"
  | "revenue_quality"
  | "customer_retention"
  | "key_person_transferability"
  | "labor_retention"
  | "supplier_stability"
  | "working_capital_stability"
  | "inventory_behavior_stability"
  | "pricing_power"
  | "margin_sustainability"
  | "recurring_revenue_persistence"
  | "capex_stability"
  | "reimbursement_stability"
  | "covenant_headroom"
  | "transition_execution";

/**
 * Whether failure patterns for this assumption aggregate predictively across
 * deals. memory_pattern_relevant assumptions feed CP-9+ longitudinal queries.
 * deal_specific assumptions are meaningful for the deal but don't aggregate.
 *
 * Future refinement may decompose this into:
 *   longitudinal_relevant, clustering_relevant, lender_outcome_relevant,
 *   durability_relevant
 * but the current binary distinction is sufficient for CP-2.
 */
export type MemoryRole = "memory_pattern_relevant" | "deal_specific";

export interface Assumption {
  readonly key: AssumptionKey;
  readonly name: string;
  /** What the assumption states in plain underwriting language. */
  readonly definition: string;
  /** What goes wrong if the assumption fails. */
  readonly failure_consequence: string;
  /** How underwriting typically tests this assumption. */
  readonly typical_strength: string;
  /** Whether failure patterns aggregate across deals (memory layer eligibility). */
  readonly memory_role: MemoryRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCLUSION IMPORTANCE & FRAGILITY GRAPH
// ─────────────────────────────────────────────────────────────────────────────
// Fragility is not just dependency frequency. It is dependency criticality,
// layering, and clustering. The graph structure expresses this.
//
// CP-2 defines the types; CP-5 implements the graph construction. Every rule
// in CP-3 must declare its conclusions' importance so the graph can be built.

/**
 * How load-bearing a conclusion is for the overall verdict.
 */
export type ConclusionImportance =
  | "headline_conclusion"        // Moves the verdict
  | "supporting_conclusion"      // Shapes the verdict
  | "informational_observation"; // Present but not load-bearing

export interface AssumptionGraphNode {
  readonly assumption_key: AssumptionKey;
  /** Number of rules in this deal that depend on the assumption. */
  readonly rule_count: number;
  /** Number of conclusions in this deal that rest on the assumption. */
  readonly conclusion_count: number;
  /** Current evidence strength from the source-types layer (0-100). */
  readonly evidence_strength: number;
  /** Sum of conclusion-importance weights for dependent conclusions. */
  readonly criticality_weighted_count: number;
  /** Max chain length through dependent conclusions. */
  readonly layering_depth: number;
  /** Which of the five axes the assumption affects in this deal. */
  readonly axis_spread: ReadonlyArray<AxisKey>;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATING MODEL FINGERPRINTS
// ─────────────────────────────────────────────────────────────────────────────
// Twelve operating models. Each fingerprint encodes the institutional
// underwriting priors for that operating-model class.
//
// See Section 5 of the constitution.

export type OperatingModelKey =
  | "professional_services"
  | "healthcare_practice"
  | "field_service"
  | "consumer_service"
  | "asset_heavy_service"
  | "contractor"
  | "service_with_inventory"
  | "retail_inventory"
  | "manufacturing"
  | "ecommerce"
  | "restaurant"
  | "software";

export type IndustryKey =
  // professional_services
  | "cpa" | "marketing" | "engineering" | "staffing" | "insurance" | "realestatebrok" | "propertymanage"
  // healthcare_practice
  | "dentist" | "physician" | "medspa" | "veterinary" | "physicaltherapy" | "homehealth"
  // field_service
  | "landscaping" | "janitorial" | "pestcontrol" | "securitysystems"
  // consumer_service
  | "petcare" | "childcare" | "hairsalon" | "laundry"
  // asset_heavy_service
  | "selfstorage" | "carwash" | "fitness" | "trucking"
  // contractor
  | "hvac" | "plumbing" | "electrical" | "roofing" | "painting" | "otherspecconstr" | "remodeling"
  // service_with_inventory
  | "autorepair"
  // retail_inventory
  | "grocery" | "pharmacy" | "gasstation"
  // manufacturing
  | "signmaking" | "commercialprinting"
  // ecommerce
  | "ecommerce"
  // restaurant
  | "restaurant"
  // software
  | "saas";

// ─────────────────────────────────────────────────────────────────────────────
// METRIC RELEVANCE
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricRelevance {
  readonly metric_key: MetricKey;
  readonly display_name: string;
  readonly category: MetricCategory;
  readonly directionality: MetricDirectionality;
  /** Default normal range; null if industry-specific only. */
  readonly normal_range: { readonly low: number; readonly high: number } | null;
  readonly lender_relevance: RelevanceLevel;
  readonly diligence_relevance: RelevanceLevel;
  /** 0-1. How much this metric contributes to the durability_score axis. */
  readonly durability_weight: number;
  readonly confidence_impact: ConfidenceImpact;
  /** Minimum source type expected for material conclusions on this metric. */
  readonly expected_source_minimum: SourceTypeKey;
  /** Comment for human readers — why this metric matters. */
  readonly underwriting_intent: string;
}

/**
 * Per-industry override applied on top of the base MetricRelevance entry.
 * Optional fields override the default; absent fields preserve the default.
 */
export interface MetricRelevanceOverride {
  readonly metric_key: MetricKey;
  readonly industry_key: IndustryKey;
  readonly lender_relevance?: RelevanceLevel;
  readonly diligence_relevance?: RelevanceLevel;
  readonly durability_weight?: number;
  readonly confidence_impact?: ConfidenceImpact;
  readonly expected_source_minimum?: SourceTypeKey;
  /** Why this industry deviates from the metric's default. Required when overriding. */
  readonly rationale: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINGERPRINT STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

/** Stable identifier for a mismatch trigger. */
export type MismatchTriggerId = string;

/** Stable identifier for a structural uncertainty signal. */
export type UncertaintySignalId = string;

export interface MismatchTrigger {
  /** Stable ID — never rename. New triggers get new IDs; old ones preserved for memory. */
  readonly id: MismatchTriggerId;
  readonly description: string;
  /**
   * Whether this trigger fires on point-in-time metrics (static) or
   * multi-year patterns (trajectory). Trajectory triggers require multi-year
   * inputs in BenchmarkInputs; engine no-ops when unavailable.
   */
  readonly trigger_type: "static" | "trajectory";
  /**
   * Conceptual prior, statistical threshold, or both? Used by the rule engine
   * to decide which rule variant fires.
   */
  readonly basis: "conceptual" | "statistical" | "both";
  readonly severity_default: "high" | "medium" | "low";
}

export interface StructuralUncertaintySignal {
  readonly id: UncertaintySignalId;
  readonly description: string;
  /**
   * Whether triggering this signal escalates model_uncertainty (the engine
   * itself lacks framework) or structural_uncertainty (the deal doesn't fit
   * the fingerprint). Most modern-business signals escalate model_uncertainty.
   */
  readonly escalates: "model_uncertainty" | "structural_uncertainty";
  /** Point-magnitude added to the relevant sub-axis when this signal fires. */
  readonly escalation_points: number;
}

export interface ExpectedSourceStandard {
  readonly metric_or_input: string;
  readonly standard: string;
  /** Minimum source type below which an explicit flag fires. */
  readonly minimum_source: SourceTypeKey;
  /**
   * If true, source weaker than minimum triggers a fraud-risk signal in
   * the interaction layer (CP-3). If false, it only reduces evidence_quality.
   */
  readonly fraud_risk_flag_below_minimum: boolean;
}

export interface BenchmarkConfidenceNote {
  readonly metric: string;
  readonly confidence: "high" | "medium" | "low";
  readonly note: string;
}

export interface IndustryFingerprint {
  readonly key: OperatingModelKey;
  readonly display_name: string;
  readonly industries: ReadonlyArray<IndustryKey>;
  /** Plain-language definition of the operating model. */
  readonly definition: string;
  /** What the underwriter reads first when seeing a deal in this model. */
  readonly underwriter_reading: string;
  // ── Metrics by role ──
  readonly primary_metrics: ReadonlyArray<MetricKey>;
  readonly secondary_metrics: ReadonlyArray<MetricKey>;
  readonly suppressible_metrics: ReadonlyArray<MetricKey>;
  // ── Sensitivities by axis ──
  readonly durability_sensitive_metrics: ReadonlyArray<MetricKey>;
  readonly lender_sensitive_metrics: ReadonlyArray<MetricKey>;
  readonly uncertainty_sensitive_metrics: ReadonlyArray<MetricKey>;
  // ── Triggers and signals ──
  readonly static_mismatch_triggers: ReadonlyArray<MismatchTrigger>;
  readonly trajectory_mismatch_triggers: ReadonlyArray<MismatchTrigger>;
  readonly structural_uncertainty_signals: ReadonlyArray<StructuralUncertaintySignal>;
  // ── Source standards ──
  readonly expected_source_standards: ReadonlyArray<ExpectedSourceStandard>;
  // ── Expected behaviors ──
  /** Rule IDs from the CP-3 catalogue expected to apply to this model. */
  readonly expected_interaction_rule_ids: ReadonlyArray<string>;
  /** Normalization scenario IDs (from CP-4) expected to be diagnostic for this model. */
  readonly expected_scenario_ids: ReadonlyArray<string>;
  // ── Benchmark confidence ──
  readonly benchmark_confidence: ReadonlyArray<BenchmarkConfidenceNote>;
  // ── Failure modes ──
  readonly expected_failure_modes: ReadonlyArray<string>;
  // ── Fragility ──
  readonly fragility_typical_dependencies: ReadonlyArray<AssumptionKey>;
  /** Marker: is this the fallback fingerprint? */
  readonly is_fallback: boolean;
  /** When fallback is used, why. Empty string for non-fallback fingerprints. */
  readonly fallback_reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY-LEVEL OVERRIDES
// ─────────────────────────────────────────────────────────────────────────────
// Per-industry deviations from the operating-model prior. Driven by RMA
// data signal-by-signal.

export interface IndustryOverride {
  readonly industry_key: IndustryKey;
  readonly model_key: OperatingModelKey;
  readonly display_name: string;
  readonly naics_code: string;
  /** RMA-reported sample size. Drives small-sample evidence_quality penalty. */
  readonly rma_sample_size: number;
  /** RMA data year — drives recency penalty for 2021-22 industries. */
  readonly rma_data_year: string;
  readonly is_proxy_benchmark: boolean;
  readonly proxy_source_industry: IndustryKey | null;
  /** Engine-behavior modifications specific to this industry. */
  readonly behavior_modifications: ReadonlyArray<{
    readonly axis: AxisKey | "fingerprint_metric_threshold" | "rule_suppression";
    readonly modification: string;
    readonly rationale: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LENDER PERSONALITIES (CP-6+; type contract locked in CP-2)
// ─────────────────────────────────────────────────────────────────────────────

export type LenderPersonalityKey =
  | "cash_flow"
  | "collateral"
  | "covenant"
  | "growth_tolerant"
  | "recurring_revenue"
  | "asset_heavy";

export type ToleranceLevel = "low" | "moderate" | "high";

/**
 * Threshold modifiers a personality applies on top of base engine thresholds.
 * All fields optional. CP-6 implements; CP-2 locks the type contract so SBA
 * implementation in CP-6 doesn't hardcode assumptions that need rework later.
 */
export interface PersonalityThresholdModifiers {
  readonly min_evidence_quality?: number;
  readonly max_acceptable_uncertainty?: number;
  readonly min_scenario_clearance?: number;
  readonly valuation_multiple_tolerance?: number;
  readonly diligence_sequence_priority?: ReadonlyArray<AssumptionKey>;
}

export interface LenderPersonality {
  readonly key: LenderPersonalityKey;
  readonly name: string;
  readonly description: string;
  readonly primary_axes: ReadonlyArray<AxisKey>;
  readonly primary_assumptions: ReadonlyArray<AssumptionKey>;
  /** How the personality treats each source type relative to the default. */
  readonly source_weighting: string;
  readonly primary_scenarios: ReadonlyArray<string>;
  readonly fragility_tolerance: ToleranceLevel;
  readonly uncertainty_tolerance: ToleranceLevel;
  readonly typical_questions: ReadonlyArray<string>;
  readonly likely_conditions: ReadonlyArray<string>;
  /** Optional threshold modifiers — populated by CP-6+. */
  readonly threshold_modifiers?: PersonalityThresholdModifiers;
}

export type LenderProfileKey =
  | "sba"
  | "conventional"
  | "independent_sponsor"
  | "search_fund"
  | "pe_backed";

export interface LenderProfileComposition {
  readonly personality: LenderPersonalityKey;
  /** 0-1. All weights in a profile sum to 1.0. Validated at registry load. */
  readonly weight: number;
}

export interface LenderProfile {
  readonly key: LenderProfileKey;
  readonly name: string;
  readonly composition: ReadonlyArray<LenderProfileComposition>;
  readonly notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINGERPRINT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
// Fallback-aware resolution surface. The orchestrator never crashes on
// unknown industries — it degrades gracefully while explicitly escalating
// uncertainty.

export interface FingerprintResolution {
  readonly fingerprint: IndustryFingerprint;
  readonly industry_override: IndustryOverride | null;
  readonly is_fallback: boolean;
  /**
   * Why fallback was used (if it was). Empty string when industry resolved
   * to an explicit fingerprint.
   *
   * A fallback resolution is itself underwriting intelligence; the
   * orchestrator must surface this to the user.
   */
  readonly fallback_reason: string;
  /**
   * model_uncertainty escalation points applied on top of base when this
   * resolution is used. Zero for explicit fingerprints.
   */
  readonly model_uncertainty_escalation: number;
  /**
   * structural_uncertainty escalation points applied. Non-zero when industry
   * has overrides that materially deviate from the model prior.
   */
  readonly structural_uncertainty_escalation: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VALIDATION REPORTING
// ─────────────────────────────────────────────────────────────────────────────
// The registry validates itself at module load. Failures throw. The
// validation report is also exposed for operational tooling.

export interface RegistryValidationReport {
  readonly registry_version: string;
  readonly validated_at: string; // ISO timestamp
  readonly ok: boolean;
  readonly summary: {
    readonly assumptions_count: number;
    readonly source_types_count: number;
    readonly metric_relevance_count: number;
    readonly metric_overrides_count: number;
    readonly operating_models_count: number;
    readonly industries_mapped: number;
    readonly industries_with_overrides: number;
    readonly lender_personalities_count: number;
    readonly lender_profiles_count: number;
    readonly fingerprint_total_static_triggers: number;
    readonly fingerprint_total_trajectory_triggers: number;
    readonly fingerprint_total_uncertainty_signals: number;
    readonly fingerprint_total_source_standards: number;
    readonly fingerprint_total_failure_modes: number;
    readonly memory_pattern_relevant_assumptions: number;
    readonly deal_specific_assumptions: number;
  };
  readonly issues: ReadonlyArray<RegistryValidationIssue>;
}

export interface RegistryValidationIssue {
  readonly severity: "error" | "warning";
  readonly category:
    | "orphan_assumption_reference"
    | "orphan_metric_reference"
    | "orphan_industry_assignment"
    | "duplicate_id"
    | "unresolved_personality_reference"
    | "weight_sum_mismatch"
    | "circular_dependency"
    | "missing_required_field"
    | "type_violation";
  readonly location: string;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL UNCERTAINTY PRINCIPLE (narrative constant)
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the model_uncertainty framing. The narrative
// signals layer (CP-8) reads this constant when explaining model_uncertainty
// conclusions to users. Centralizing the framing prevents drift.

export const MODEL_UNCERTAINTY_PRINCIPLE = [
  "A system that knows where its framework weakens is more trustworthy than ",
  "one that projects false precision. model_uncertainty is not indecision — ",
  "it is recognition that the underwriting ontology itself may be incomplete ",
  "for this deal structure. That recognition is a feature, not a weakness.",
].join("");

export const SNAPSHOT_AS_MEMORY_PRINCIPLE = [
  "Snapshots are institutional underwriting observations, not historical ",
  "report archives. The long-term moat is not static benchmarking — it is ",
  "pattern accumulation across underwriting events.",
].join("");
