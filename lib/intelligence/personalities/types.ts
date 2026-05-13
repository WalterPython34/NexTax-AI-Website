// lib/intelligence/personalities/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Lender Personality Type Contracts
//
// CP-6 Foundation. The constitutional infrastructure for the first
// interpretive consumer of the five-axis output.
//
// This file is governance-reviewable institutional infrastructure. It
// defines what a "lender personality" CAN be — the shape of the data
// structures, the boundaries between interpretation and measurement,
// and the constitutional commitments that prevent personalities from
// drifting into shadow scoring systems.
//
// Key architectural commitments enforced at the type level:
//
//   1. PERSONALITIES ARE DECLARATIVE DATA, NOT PROCEDURAL CODE.
//      Every personality is a LenderPersonality record. There is no
//      method to override, no class to extend. The CP-7 simulator
//      reads these records and produces posture. This prevents the
//      "shadow scoring system" failure mode.
//
//   2. PERSONALITIES CONSUME AXES, NOT RULES.
//      PersonalitySimulationInput (consumed by CP-7) accepts
//      AxisCompositionResult — the canonical institutional truth
//      layer — and the personality declaration. It does NOT accept
//      RuleEngineResult or ScenarioEvaluationResult. Personalities
//      that want to react to specific rules do so by referencing
//      axis components or axis bands, NOT by reading firings directly.
//
//   3. ORDERED PRIORITY LISTS, NOT WEIGHTED SCORING.
//      Each personality declares axis_priority_order as an ordered
//      array. The simulator inspects axes in priority order, applying
//      deal-breakers and discomfort detection. No personality computes
//      a weighted_personality_score. The five-axis engine produces
//      truth; personalities interpret it.
//
//   4. STRICT DETERMINISTIC DEAL-BREAKERS.
//      Deal-breakers are typed conditions (specific axis bands,
//      specific component IDs, specific scenario clearances). No
//      probability distributions. Binary triggers.
//
//   5. THREE POSTURE STATES WITH FIRM BOUNDARIES.
//      interested / cautious / decline. The categorical state stays
//      simple; nuance lives in explanations and discomfort_chains
//      that CP-7 emits.
//
//   6. PER-PERSONALITY VERSIONING.
//      Each personality carries its own version string. CP-9 snapshot
//      persistence will use this to replay historical posture
//      correctly when personalities evolve.
//
//   7. THREE DISTINCT BOUNDARY CONCEPTS PER PERSONALITY:
//      - deal_breakers: "I cannot consider this deal if X is true"
//      - information_needs: "I need to see X before forming any view"
//      - required_comfort_conditions: "I need X satisfied before I
//        become comfortable with the structure"
//      Confusing these is a contract violation.
//
//   8. HYBRID DISCOMFORT STRUCTURE.
//      DiscomfortSource carries BOTH structured axis-pattern triggers
//      (machine-readable, for CP-7 simulation) AND free-form prose
//      (for CP-8 narrative). Both layers required.
//
//   9. REPAIRABLE vs FATAL DISCOMFORT.
//      Each discomfort source declares its repairability. Repairable
//      discomforts feed CP-10+ recovery-path intelligence as
//      "diligence can close this loop." Fatal discomforts feed
//      "this is structural incompatibility — no diligence resolves it."
//
//  10. PERSONALITIES NEVER MUTATE UPSTREAM TRUTH.
//      The simulator (CP-7) reads AxisCompositionResult; it produces
//      its own LenderPosture output. It does NOT write back to axis
//      scores, fragility nodes, or component contributions. Type
//      contracts enforce this: there is no setter, no mutation API.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../types";
import type {
  ScenarioEvaluationResult,
  ScenarioId,
} from "../scenarios/types";
import type {
  AxisBand,
  AxisCompositionResult,
} from "../axes/types";

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const PERSONALITY_CATALOGUE_VERSION = "cp6-v0.1.0";
export const PERSONALITY_TYPE_CONTRACT_VERSION = "cp6-v0.1.0";

// ─────────────────────────────────────────────────────────────────────────────
// STABLE IDS
// ─────────────────────────────────────────────────────────────────────────────

/** Stable identifier for a lender personality. */
export type PersonalityId =
  | "sba_lender"
  | "conventional_bank"
  | "seller_note"
  | "cashflow_lender";

/** Stable identifier for a deal-breaker condition. */
export type DealBreakerId = string;

/** Stable identifier for a discomfort source. */
export type DiscomfortSourceId = string;

/** Stable identifier for a comfort condition. */
export type ComfortConditionId = string;

/** Stable identifier for an information need. */
export type InformationNeedId = string;

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE VOCABULARY (CP-6 fixes three states; CP-7 emits them)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The three posture states a personality can hold on a deal.
 *
 *   interested — Personality sees a financeable path. Some discomfort
 *     may exist but the path forward is clear; diligence and structure
 *     close any remaining loops.
 *
 *   cautious — Personality sees solvable discomfort. The deal is not
 *     dismissed but the personality wants specific conditions satisfied
 *     before forming a confident view. Required comfort conditions
 *     are unmet but achievable.
 *
 *   decline — Personality sees structural incompatibility. A deal-breaker
 *     triggered, OR fatal discomfort sources cluster, OR required comfort
 *     conditions cannot realistically be satisfied. The personality is
 *     not a fit for this deal.
 *
 * The categorical state intentionally stays simple. CP-7 carries nuance
 * via the LenderPosture.explanation, discomfort_chain, and
 * unsatisfied_comfort_conditions fields. Do NOT expand this enum without
 * an explicit governance review — every additional state creates fuzzy
 * boundaries.
 */
export type PostureState = "interested" | "cautious" | "decline";

// ─────────────────────────────────────────────────────────────────────────────
// AXIS PRIORITY ORDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A personality's axis priority is an ordered array, NOT a weighted map.
 * The simulator inspects axes in this order. This preserves hierarchical
 * institutional reasoning ("Do I trust the numbers? Does coverage survive
 * stress?") over weighted-average computation.
 *
 * Must contain all five axis keys exactly once. The validator enforces
 * this. Length-5, no duplicates, no omissions.
 */
export type AxisPriorityOrder = ReadonlyArray<AxisKey>;

// ─────────────────────────────────────────────────────────────────────────────
// AXIS DISCOMFORT PATTERNS — STRUCTURED LAYER OF HYBRID DISCOMFORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A typed reference to an axis condition that triggers discomfort.
 * Personalities declare these structurally so CP-7 can deterministically
 * detect triggers; CP-8 narrative reads the parallel `description`
 * and `why_uncomfortable` free-form prose.
 *
 * Three subtypes capture the most common patterns:
 *
 *   axis_band — "evidence_quality.band === 'concerning'"
 *   axis_score_below — "financial_score.score < 50"
 *   component_present — "component.evidence.verbal_assertion_only is present"
 */
export type AxisDiscomfortPattern =
  | {
      readonly kind: "axis_band";
      readonly axis: AxisKey;
      readonly band: AxisBand;
    }
  | {
      readonly kind: "axis_score_below";
      readonly axis: AxisKey;
      readonly threshold: number;
    }
  | {
      readonly kind: "axis_score_above";
      readonly axis: AxisKey;
      readonly threshold: number;
    }
  | {
      readonly kind: "component_present";
      readonly component_id: string;
    }
  | {
      readonly kind: "scenario_clearance";
      readonly scenario_id: ScenarioId;
      readonly clears_at_worst: "fails" | "structurally_compressed" | "clears_marginally";
    }
  | {
      readonly kind: "fragility_hotspot_concentration";
      readonly min_hotspot_count: number;
    };

// ─────────────────────────────────────────────────────────────────────────────
// REPAIRABILITY — RESERVED + USED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discomfort comes in two structural categories:
 *
 *   repairable — diligence, source upgrade, structural negotiation, or
 *     operational change can close the discomfort loop. CP-10+ recovery
 *     path intelligence will read repairable discomforts to propose
 *     specific recovery actions.
 *
 *   fatal — structural incompatibility that no diligence resolves.
 *     Example: a personality structurally incompatible with verbal-
 *     assertion evidence will not be made comfortable by additional
 *     diligence — the entire evidence base needs to change. Fatal
 *     discomforts feed posture toward "decline" rather than "cautious."
 */
export type DiscomfortRepairability = "repairable" | "fatal";

// ─────────────────────────────────────────────────────────────────────────────
// COMFORT VELOCITY — RESERVED for CP-7+ use
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Different personalities reach comfort at different speeds. Declared
 * here per personality; CP-7+ buyer-guidance, lender-matchmaking, and
 * recovery-path intelligence will read this to sequence diligence and
 * propose negotiation strategy.
 *
 *   slow — Personality requires extensive documentation, verification,
 *     committee defensibility. Example: SBA. Comfort closure takes
 *     diligence weeks/months, not days.
 *
 *   moderate — Personality requires specific structural conditions and
 *     defensible evidence but not exhaustive verification. Example:
 *     conventional bank.
 *
 *   fast — Personality can become comfortable quickly when transition
 *     trust, customer continuity, and alignment incentives are visible.
 *     Example: seller financing. Comfort closure can happen in days
 *     once key conditions visible.
 *
 * CP-6 declares it; CP-7+ reads it. CP-6 itself does not derive
 * behavior from this field — it is reserved for downstream consumers.
 */
export type ComfortVelocity = "slow" | "moderate" | "fast";

// ─────────────────────────────────────────────────────────────────────────────
// TOLERANCE ASYMMETRY — RESERVED for CP-7+
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RESERVED. Future structured field on personality declarations for
 * tolerance asymmetry analysis. CP-6 ships discomfort_sources as the
 * implicit asymmetry surface (the discomforts listed encode intolerance;
 * the discomforts absent imply relative tolerance). CP-7+ may populate
 * this explicitly.
 *
 * Reference string format: "{personality_id}@{version}#asymmetry_id"
 */
export type ToleranceAsymmetryReference = string;

// ─────────────────────────────────────────────────────────────────────────────
// DEAL BREAKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A deal-breaker is a specific, deterministic, axis-traceable condition
 * that automatically triggers `decline` posture for this personality.
 *
 * Binary trigger. No probability. The simulator either detects the
 * condition or doesn't.
 *
 * Common types:
 *   - Specific axis band: "evidence_quality.band === 'concerning'"
 *   - Score below threshold: "financial_score.score < 30"
 *   - Component present: "verbal_assertion_only existential present"
 *
 * Each deal-breaker carries a why field for CP-8 narrative.
 */
export interface DealBreaker {
  readonly id: DealBreakerId;
  readonly name: string;
  readonly trigger: AxisDiscomfortPattern;
  readonly why_disqualifying: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOMFORT SOURCE (hybrid structure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A discomfort source is a structured trigger PLUS free-form narrative.
 * Both layers required.
 *
 * The structured `trigger` layer powers CP-7 simulation: deterministic
 * detection of which discomforts fire on a deal.
 *
 * The free-form `description` and `why_uncomfortable` layers power CP-8
 * narrative: explaining institutional discomfort to users in language
 * they emotionally understand.
 *
 * Repairability classification powers CP-7 posture derivation (fatal
 * pushes toward decline; repairable allows cautious) and CP-10+ recovery
 * path intelligence (repairable discomforts get recovery actions
 * proposed; fatal discomforts get "structural incompatibility" framing).
 */
export interface DiscomfortSource {
  readonly id: DiscomfortSourceId;
  readonly name: string;
  /** The structured trigger CP-7 can deterministically detect. */
  readonly trigger: AxisDiscomfortPattern;
  /** Plain-language description of what triggers the discomfort. */
  readonly description: string;
  /** Plain-language explanation of why this personality finds this uncomfortable. */
  readonly why_uncomfortable: string;
  /** Whether this discomfort can be closed by diligence/structure or is structural. */
  readonly repairability: DiscomfortRepairability;
  /**
   * Component or axis IDs that, if changed, would resolve this discomfort.
   * Used by CP-10+ recovery path intelligence.
   */
  readonly addresses_source_ids: ReadonlyArray<string>;
  /** Reserved for future asymmetry analysis. */
  readonly asymmetry_profile: ToleranceAsymmetryReference | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIRED COMFORT CONDITION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A required comfort condition is what closes the institutional discomfort
 * loop for this personality. Structurally distinct from deal-breakers
 * (which disqualify) and information needs (which gate primary analysis).
 *
 *   deal_breaker = "I cannot consider this if X"
 *   information_need = "I need to see X before I form any view"
 *   required_comfort_condition = "I need X satisfied before I become comfortable"
 *
 * The simulator (CP-7) checks comfort conditions against the axis
 * composition result. An unsatisfied comfort condition does NOT
 * automatically push posture to decline — it pushes posture to
 * cautious, with the unsatisfied conditions surfaced for the user.
 *
 * Comfort conditions are positive conditions: "I am comfortable when
 * X holds." They describe the closing of the loop, not the avoidance
 * of failure.
 */
export interface ComfortCondition {
  readonly id: ComfortConditionId;
  readonly name: string;
  /** Structured condition that, when satisfied, closes the discomfort loop. */
  readonly satisfied_when: AxisDiscomfortPattern;
  /** Plain-language description. */
  readonly description: string;
  /** Why this personality needs this satisfied. */
  readonly why_needed: string;
  /**
   * Whether this condition must be satisfied for `interested` posture,
   * or whether `cautious` is acceptable with this unsatisfied.
   */
  readonly required_for_interested: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// INFORMATION NEED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An information need is a primary-analysis gate: the personality
 * cannot form any view (interested/cautious/decline) until this
 * information is provided.
 *
 * Structurally upstream of both deal-breakers and comfort conditions.
 * A deal that fails to provide an information need produces a "data
 * insufficient" posture rather than a deal-quality judgment.
 *
 * In practice, information needs map to data that the engine itself
 * tracks via uncertainty escalations (data_uncertainty sub-axis).
 * Information needs reference specific axis conditions that, if true,
 * indicate the information is missing.
 */
export interface InformationNeed {
  readonly id: InformationNeedId;
  readonly name: string;
  /**
   * Pattern that, if detected, indicates the information is missing.
   * Typical: "data_uncertainty.score above 50" or
   * "component.uncertainty.missing_critical_data is present".
   */
  readonly missing_when: AxisDiscomfortPattern;
  readonly description: string;
  readonly why_needed: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO READING DECLARATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which CP-4 scenarios this personality cares most about. Personalities
 * declare scenario IDs they read; CP-7 simulation uses this to focus
 * posture derivation on personality-relevant scenarios.
 *
 * NOTE: this is a READ declaration, NOT a write. Personalities cannot
 * change CP-4 scenario clearance thresholds, cannot override scenario
 * outputs, cannot mutate clearance results. They simply declare which
 * scenarios their posture derivation pays attention to.
 */
export interface ScenarioReadingDeclaration {
  readonly scenario_id: ScenarioId;
  readonly weight: "primary" | "supporting" | "informational";
  readonly why_relevant: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PERSONALITY — TOP-LEVEL DECLARATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A complete lender personality declaration. Pure data, no methods.
 *
 * The CP-7 simulator reads these records and produces LenderPosture
 * outputs by applying the declarative rules deterministically. Editing
 * a personality requires editing the data structure; behavior changes
 * are auditable as data diffs.
 */
export interface LenderPersonality {
  readonly id: PersonalityId;
  /** Per-personality version string. CP-9 snapshot persistence reads this. */
  readonly version: string;
  /** Display name shown to users. */
  readonly display_name: string;
  /** Short archetype label (e.g., "SBA 7(a) acquisition lender"). */
  readonly archetype_label: string;
  /** Plain-language description of this lender personality. */
  readonly profile_description: string;
  /** The institutional reasoning style of this personality. */
  readonly reasoning_style: string;

  /** Ordered axis priority — five axes, no duplicates, no omissions. */
  readonly axis_priority_order: AxisPriorityOrder;

  /** Strict deterministic deal-breakers. Trigger automatic decline. */
  readonly deal_breakers: ReadonlyArray<DealBreaker>;

  /** Hybrid-structure discomfort sources. */
  readonly discomfort_sources: ReadonlyArray<DiscomfortSource>;

  /** Conditions that close the institutional discomfort loop. */
  readonly required_comfort_conditions: ReadonlyArray<ComfortCondition>;

  /** Information needs — primary-analysis gates. */
  readonly information_needs: ReadonlyArray<InformationNeed>;

  /** Scenarios this personality cares most about (read-only). */
  readonly scenario_reading: ReadonlyArray<ScenarioReadingDeclaration>;

  /** Comfort velocity — reserved for CP-7+ recovery-path intelligence. */
  readonly comfort_velocity: ComfortVelocity;

  /**
   * Plain-language summary of what this personality finds attractive
   * about deals. Read by CP-8 narrative; not used in CP-7 posture
   * derivation.
   */
  readonly attractive_signals_summary: string;

  /**
   * Plain-language summary of what this personality structurally
   * cannot accommodate. Read by CP-8 narrative.
   */
  readonly structural_incompatibilities_summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LENDER POSTURE — CP-7 OUTPUT (TYPE CONTRACT DECLARED HERE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The output a CP-7 simulator produces when running one personality
 * against one AxisCompositionResult. Declared here in CP-6 so the type
 * contract is locked before CP-7 implements the simulator.
 *
 * Constitutional commitment: this output is purely interpretive. It
 * does NOT contain axis scores (those live in AxisCompositionResult),
 * does NOT contain rule firings (those live in RuleEngineResult), does
 * NOT contain scenario outputs (those live in ScenarioEvaluationResult).
 *
 * LenderPosture is the personality's reaction to the canonical
 * institutional truth, NOT a re-measurement of it.
 */
export interface LenderPosture {
  readonly posture_id: string;
  readonly personality_id: PersonalityId;
  readonly personality_version: string;
  readonly axis_composition_evaluation_id: string;
  readonly evaluated_at: string;

  /** The categorical posture state. */
  readonly state: PostureState;
  /** Plain-language explanation of the posture. */
  readonly explanation: string;

  /** Deal-breakers detected on this deal (empty when none). */
  readonly triggered_deal_breakers: ReadonlyArray<DealBreakerId>;

  /** Discomfort sources detected on this deal, ordered by repairability. */
  readonly discomfort_chain: ReadonlyArray<{
    readonly discomfort_source_id: DiscomfortSourceId;
    readonly repairability: DiscomfortRepairability;
    readonly trigger_explanation: string;
  }>;

  /** Comfort conditions that are NOT satisfied on this deal. */
  readonly unsatisfied_comfort_conditions: ReadonlyArray<ComfortConditionId>;

  /** Comfort conditions that ARE satisfied (preserves positive signal). */
  readonly satisfied_comfort_conditions: ReadonlyArray<ComfortConditionId>;

  /** Information needs not yet met (data acquisition priorities). */
  readonly unmet_information_needs: ReadonlyArray<InformationNeedId>;

  /**
   * The axis priority order the personality used for this evaluation
   * (echoed for snapshot integrity).
   */
  readonly axis_priority_order_used: AxisPriorityOrder;

  /** Per-axis posture reading — what the personality saw on each axis. */
  readonly axis_readings: ReadonlyArray<{
    readonly axis: AxisKey;
    readonly priority_position: number; // 1-based position in priority order
    readonly score_observed: number;
    readonly band_observed: AxisBand;
    readonly personality_assessment: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATOR INPUT (CP-7 contract declared here)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input to the CP-7 simulator. Type-level enforcement of the constitutional
 * commitment that personalities consume AXES, not rules.
 *
 * The input carries:
 *   - personality declaration (the interpretive lens)
 *   - axis composition result (the canonical truth being interpreted)
 *   - scenario evaluation result (read-only scenario evidence for
 *     scenario_clearance pattern evaluation)
 *
 * It does NOT carry:
 *   - RuleEngineResult — personalities cannot read raw firings
 *   - FingerprintResolution as a separate input — already present in
 *     axis_composition_result.fingerprint_resolution
 *
 * Scenario evidence is included as read-only supporting input because
 * scenario clearance is a first-class trigger for personality discomfort
 * (e.g., "lender_stress scenario fails"). The simulator may ONLY read
 * scenario IDs and clearance states from this input. It may NOT mutate,
 * recompute, or reinterpret scenarios. The boundary:
 *
 *   - axis_composition_result is the canonical truth layer
 *   - scenario_evaluation_result is supporting evidence for one specific
 *     pattern kind (scenario_clearance triggers)
 *   - Both are read-only inputs; the simulator produces its own typed
 *     LenderPosture output without writing back
 *
 * The constitutional commitment still holds: the simulator cannot reach
 * into rule firings to "second-guess" axis scores; the truth IS the axis
 * output. Scenario clearances are not measurement re-runs — they are
 * pre-computed results from CP-4 that the personality reads as supporting
 * evidence for its declarative trigger conditions.
 */
export interface PersonalitySimulationInput {
  readonly personality: LenderPersonality;
  readonly axis_composition_result: AxisCompositionResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonalityCatalogueValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<PersonalityCatalogueValidationIssue>;
  readonly summary: {
    readonly personality_count: number;
    readonly total_deal_breakers: number;
    readonly total_discomfort_sources: number;
    readonly total_comfort_conditions: number;
    readonly fatal_discomforts: number;
    readonly repairable_discomforts: number;
  };
  readonly version: string;
}

export interface PersonalityCatalogueValidationIssue {
  readonly severity: "error" | "warning";
  readonly category:
    | "duplicate_personality_id"
    | "invalid_axis_priority_order"
    | "duplicate_deal_breaker_id"
    | "duplicate_discomfort_id"
    | "duplicate_comfort_condition_id"
    | "missing_axis_in_priority"
    | "duplicate_axis_in_priority"
    | "missing_required_field"
    | "scenario_reference_invalid";
  readonly location: string;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL NARRATIVE PRINCIPLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The architectural commitment that defines CP-6 and CP-7's relationship
 * to the upstream truth layer. Read by CP-8 narrative for framing
 * consistency.
 */
export const PERSONALITY_AS_INTERPRETIVE_CONSUMER_PRINCIPLE = [
  "A lender personality is an interpretive lens, not a measurement layer. ",
  "It accepts the five-axis output as canonical truth and reacts to it ",
  "according to declared institutional reasoning. It does not re-measure, ",
  "re-weight, or re-score the underlying axes. Different personalities ",
  "reading the same axis composition will reach different posture ",
  "conclusions because they prioritize axes differently and weigh ",
  "discomfort differently — never because they see different numbers.",
].join("");

/**
 * The architectural commitment about personality declaration shape.
 * Read by CP-8 narrative and governance reviewers.
 */
export const DECLARATIVE_PERSONALITY_PRINCIPLE = [
  "Personalities are declarative data, not procedural code. Each personality ",
  "is a LenderPersonality record: axis priorities, deal-breakers, discomfort ",
  "sources, comfort conditions, scenario reading. The CP-7 simulator reads ",
  "these records and produces posture deterministically. There is no override ",
  "method, no per-personality class, no embedded scoring formula. This ",
  "prevents the 'shadow scoring system' failure mode where personalities ",
  "silently embed reinterpretation logic that drifts from constitutional ",
  "truth.",
].join("");

/**
 * The architectural commitment about discomfort as institutional psychology.
 */
export const DISCOMFORT_AS_INSTITUTIONAL_PSYCHOLOGY_PRINCIPLE = [
  "Institutional underwriting is discomfort management, not just risk ",
  "quantification. Each personality declares discomfort sources structurally ",
  "(machine-readable triggers) and narratively (free-form prose). Some ",
  "discomforts are repairable through diligence; others are structurally ",
  "fatal. The distinction matters for posture derivation (fatal pushes ",
  "toward decline; repairable allows cautious) and for recovery-path ",
  "intelligence (repairable discomforts get recovery actions; fatal ",
  "discomforts get 'structural incompatibility' framing). A personality ",
  "with zero discomfort triggered moves toward interested; a personality ",
  "with concentrated fatal discomforts moves toward decline; the space ",
  "between is cautious.",
].join("");

/**
 * The architectural commitment about deterministic posture derivation.
 * Read by CP-7 simulator; this principle is the explicit rejection of
 * probabilistic posture modeling.
 *
 * Posture emerges DETERMINISTICALLY from:
 *   - triggered discomforts (count, severity, repairability)
 *   - unsatisfied comfort conditions (count, required_for_interested status)
 *   - axis sequencing (priority order traversal)
 *   - scenario survivability (clearance outcomes)
 *
 * Posture does NOT emerge from:
 *   - probability distributions
 *   - logistic regression
 *   - "73% chance lender accepts" style fake precision
 *   - learned scoring functions
 *   - any pseudo-credit-modeling that simulates predictive certainty
 *
 * The strength of this architecture is institutional coherence and
 * traceability. Each posture decision must be answerable through:
 *   "Posture moved to cautious because:
 *    - 3 of 4 repairable discomforts triggered
 *    - 2 of 3 required_for_interested comfort conditions unsatisfied
 *    - axis #2 in priority order (financial_score) reads in cautionary band"
 *
 * NOT through:
 *   "The model assigns 67% likelihood of cautious posture."
 *
 * That distinction is non-negotiable. A simulator that wants to emit
 * probabilities is structurally a different module that lives downstream
 * (CP-11+ commercial likelihood modeling, separately governance-reviewed,
 * NOT consuming the posture layer). The CP-7 simulator emits categorical
 * posture states with deterministic explanations.
 */
export const DETERMINISTIC_POSTURE_PRINCIPLE = [
  "Posture is derived deterministically from structured signals, not ",
  "probabilistically from learned scoring. The simulator examines triggered ",
  "discomforts, unsatisfied comfort conditions, axis sequencing, and ",
  "scenario survivability — and produces a categorical state (interested / ",
  "cautious / decline) with a traceable explanation. The simulator does ",
  "not emit probabilities, confidence scores, or any other surface that ",
  "implies predictive precision the engine cannot defend. The strength ",
  "of this layer is institutional coherence, not fake forecasting accuracy. ",
  "A posture decision must always be answerable in the form: 'Posture is X ",
  "because these specific discomforts triggered, these specific comfort ",
  "conditions are unsatisfied, this specific axis read in this specific ",
  "band.' Probabilistic posture modeling is reserved for a separate ",
  "downstream layer (CP-11+) with its own governance review — it is not ",
  "permitted to drift into the personality-simulation layer.",
].join("");

/**
 * RESERVED conceptual framework for CP-7+ posture progression and
 * future recovery-feasibility analysis.
 *
 * Posture progression is the ordered sequence a personality moves through
 * as discomforts accumulate, not a probability gradient:
 *
 *   interested → cautious → decline
 *
 * The progression is driven by countable conditions:
 *   - 0 fatal discomforts + 0 unsatisfied required comfort conditions +
 *     ≤1 repairable discomfort → interested
 *   - 0 fatal discomforts + 1+ unsatisfied required comfort conditions or
 *     2+ repairable discomforts → cautious
 *   - 1+ fatal discomforts OR triggered deal-breaker → decline
 *
 * These thresholds are illustrative; CP-7 will declare the exact rules
 * and they will be reviewed as constitutional decisions. The point here
 * is the SHAPE of derivation — countable structured conditions, not
 * trained classifiers.
 */
export const POSTURE_PROGRESSION_FRAMEWORK_NOTE = [
  "Posture progression is an ordered sequence (interested → cautious → ",
  "decline) driven by countable structural conditions: number of triggered ",
  "discomforts by repairability class, number of unsatisfied comfort ",
  "conditions by required_for_interested class, scenario clearance ",
  "outcomes for personality-relevant scenarios, and deal-breaker triggers. ",
  "Each transition between states must be explainable as a discrete ",
  "structural condition crossing, not as a probability threshold.",
].join("");

// ─────────────────────────────────────────────────────────────────────────────
// COMFORT CONCENTRATION — RESERVED for CP-10+
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RESERVED. Future concept for measuring how many independent things must
 * be true simultaneously for a deal to become financeable for a personality.
 *
 * Some deals require only one comfort condition to flip from cautious to
 * interested ("we just need tax-return-anchored adjustments"). Others
 * require six independent conditions satisfied simultaneously, each
 * involving its own diligence stream.
 *
 * The distinction matters enormously for:
 *   - buyer guidance (what's the shortest path to financeable?)
 *   - recovery path intelligence (what's the highest-leverage repair?)
 *   - lender matchmaking (which lender is closest to comfortable?)
 *   - probability-of-close estimation (not probability of posture —
 *     a separate downstream concept reserved for CP-11+)
 *
 * Comfort concentration is the count + dependency structure of
 * unsatisfied comfort conditions, weighted by their independence:
 *
 *   - Low concentration: 1-2 conditions, addressable via single diligence
 *     workstream (e.g., source upgrade resolves multiple conditions)
 *   - Moderate concentration: 3-4 conditions across 2 workstreams
 *   - High concentration: 5+ conditions across 3+ independent workstreams
 *
 * The future surface will likely live on a per-personality basis:
 *
 *   readonly comfort_concentration?: {
 *     readonly unsatisfied_count: number;
 *     readonly distinct_workstreams: number;
 *     readonly concentration_band: "low" | "moderate" | "high";
 *     readonly minimum_repair_path: ReadonlyArray<ComfortConditionId>;
 *   };
 *
 * Reserved as a concept now so that LenderPosture's
 * unsatisfied_comfort_conditions field carries the structured raw data
 * future concentration analysis can read.
 */
export type ComfortConcentrationBand = "low" | "moderate" | "high";

/**
 * RESERVED reference type for future comfort concentration analysis.
 * Reference format: "{personality_id}@{version}#concentration_id"
 */
export type ComfortConcentrationReference = string;
