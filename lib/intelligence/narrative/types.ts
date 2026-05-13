// lib/intelligence/narrative/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Narrative Layer Type Contracts
//
// CP-8 Foundation. The constitutional infrastructure for the narrative
// synthesis layer.
//
// CP-8 is where structured intelligence becomes commercially legible.
// The architecture has to refuse three failure modes:
//
//   1. Drift into smooth LLM-style prose that loses institutional
//      specificity
//   2. Overstatement of simulated posture as actual market outcomes
//   3. Structured data dump in prose form (transcription not synthesis)
//
// The narrative layer is structured synthesis followed by template
// rendering. The hard work is in synthesis modules that compute things
// like "what is the binding constraint on this deal?" — and templates
// render that finding into institutional prose.
//
// Architectural commitments enforced at the type level:
//
//   1. EVERY FRAGMENT CARRIES TRACEABILITY. NarrativeFragment requires
//      source_ids, related_axis_keys, and a fragment_kind. Empty source
//      lists cause validation failure. The structured trace IS the
//      product; prose is presentation.
//
//   2. STRUCTURED SYNTHESIS BEFORE PROSE. NarrativeSynthesis carries the
//      computed intelligence (binding constraint, closest path, repair
//      priorities) as typed data. Templates render this synthesis;
//      the synthesis is auditable independently.
//
//   3. HEADLINE IS DERIVED. The executive headline is built from
//      structured synthesis using template assembly, not free-form
//      generation. The headline traces to the synthesis it summarizes.
//
//   4. SIMULATED POSTURE FRAMING. Narrative posture readings carry
//      simulation_framing markers ensuring CP-8 templates never produce
//      "SBA would decline" language. The validator scans output for
//      forbidden phrases.
//
//   5. FALLBACK FINGERPRINT FRAMING. Coverage gap detection happens in
//      synthesis; templates produce coverage-gap-appropriate prose when
//      flagged. The validator verifies this distinction.
// ─────────────────────────────────────────────────────────────────────────────

import type { AxisKey } from "../types";
import type { ScenarioId } from "../scenarios/types";
import type {
  AssumptionKey,
} from "../types";
import type {
  PersonalityId,
  PostureState,
} from "../personalities/types";

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const NARRATIVE_ENGINE_VERSION = "cp8-v0.1.0";
export const NARRATIVE_SYNTHESIS_VERSION = "cp8-v0.1.0";
export const NARRATIVE_TEMPLATES_VERSION = "cp8-v0.1.0";

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT KIND TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every NarrativeFragment declares its kind. The taxonomy is closed —
 * adding a new kind requires updating type contracts AND templates.
 *
 * Kinds map to the canonical CP-8 sections:
 *
 *   - executive_headline: the synthesized 4-6 sentence top-level read
 *   - binding_constraint: which axis weakness is the central issue
 *   - posture_summary: cross-personality posture summary
 *   - personality_reading: per-personality 2-3 sentence brief
 *   - closest_path: which personality is closest to interested, why
 *   - recovery_priorities: which discomforts are repairable + path forward
 *   - structural_concerns: which discomforts are fatal + framing
 *   - coverage_gap_notice: framing when fallback fingerprint drove posture
 *   - axis_interpretation: per-axis prose explaining institutional meaning
 *   - assumption_concentration: fragility narrative
 */
export type NarrativeFragmentKind =
  | "executive_headline"
  | "binding_constraint"
  | "posture_summary"
  | "personality_reading"
  | "closest_path"
  | "recovery_priorities"
  | "structural_concerns"
  | "coverage_gap_notice"
  | "axis_interpretation"
  | "assumption_concentration";

// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE FRAGMENT — the primary output unit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A NarrativeFragment is a typed, traceable piece of synthesized prose.
 *
 * Every fragment carries mandatory traceability:
 *   - source_ids: stable IDs from CP-3/4/5/7 that drove this fragment
 *   - related_axis_keys: which axes the fragment discusses
 *   - related_personality_ids: which personalities the fragment references
 *   - related_scenario_ids: which CP-4 scenarios the fragment cites
 *   - related_assumption_keys: which CP-2 assumptions the fragment references
 *
 * Empty source_ids array is a validation failure. The structured trace
 * is the product; prose is presentation.
 *
 * Every fragment also carries simulation_framing markers that CP-8
 * validators check to ensure no overstatement language slipped in.
 */
export interface NarrativeFragment {
  readonly fragment_id: string;
  readonly kind: NarrativeFragmentKind;
  /** The synthesized prose. Must be non-empty; must not contain forbidden phrases. */
  readonly prose: string;

  // ── Mandatory traceability fields ──
  /** Upstream IDs (rule firings, patterns, scenarios, components, postures) that drove this fragment. Required and non-empty. */
  readonly source_ids: ReadonlyArray<string>;
  readonly related_axis_keys: ReadonlyArray<AxisKey>;
  readonly related_personality_ids: ReadonlyArray<PersonalityId>;
  readonly related_scenario_ids: ReadonlyArray<ScenarioId>;
  readonly related_assumption_keys: ReadonlyArray<AssumptionKey>;

  // ── Framing markers (read by validators) ──
  /** True when the fragment references simulated posture; forces framing checks. */
  readonly references_simulated_posture: boolean;
  /** True when the fragment discusses fallback fingerprint coverage; forces coverage-gap framing. */
  readonly references_coverage_gap: boolean;
  /** True when the fragment proposes buyer action; framework requires repairable/structural distinction. */
  readonly proposes_buyer_action: boolean;

  // ── Source narrative principle (which CP-8 commitment this fragment honors) ──
  readonly narrative_principle_applied: NarrativePrincipleKey;

  // ── Version ──
  readonly fragment_version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE PRINCIPLE KEYS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Which constitutional principle the fragment was built to honor.
 * Stored alongside the fragment so validators can verify that templates
 * are correctly applying the intended principle.
 */
export type NarrativePrincipleKey =
  | "binding_constraint_identification"
  | "simulated_posture_framing"
  | "coverage_gap_framing"
  | "repairable_vs_fatal_distinction"
  | "closest_path_surfacing"
  | "buyer_action_translation"
  | "synthesis_over_recitation"
  | "institutional_tone";

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED SYNTHESIS (deterministic computation; templates render this)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The "binding constraint" of a deal: the single axis or structural
 * condition that most constrains the deal's underwriting path.
 *
 * Computed deterministically from CP-5 axis scores + CP-7 posture
 * patterns. Templates render this finding into prose.
 */
export interface BindingConstraintFinding {
  /** The axis identified as the binding constraint. */
  readonly axis: AxisKey;
  /** Score and band on that axis (echoed for traceability). */
  readonly score: number;
  readonly band: string;
  /** Whether this constraint is repairable through diligence/evidence/structure. */
  readonly repairability: "repairable" | "structural";
  /** Stable IDs (components, hotspots, scenarios) that drive this constraint. */
  readonly driver_source_ids: ReadonlyArray<string>;
  /** Plain-language description of why this is the binding constraint. */
  readonly rationale: string;
}

/**
 * The "closest path" finding: which personality is closest to interested,
 * and what would need to change to get there.
 */
export interface ClosestPathFinding {
  /** Personality identified as closest to interested. */
  readonly personality_id: PersonalityId;
  /** Current posture state of that personality. */
  readonly current_state: PostureState;
  /** How many unsatisfied required-for-interested comfort conditions remain. */
  readonly unsatisfied_required_count: number;
  /** How many fatal discomforts triggered (zero means cautious is in reach). */
  readonly fatal_discomfort_count: number;
  /** How many repairable discomforts triggered. */
  readonly repairable_discomfort_count: number;
  /** IDs of unsatisfied comfort conditions (the specific path forward). */
  readonly unsatisfied_comfort_condition_ids: ReadonlyArray<string>;
  /** Source IDs for traceability. */
  readonly source_ids: ReadonlyArray<string>;
  /** Plain-language description. */
  readonly rationale: string;
  /**
   * True when no personality reached interested or cautious — every
   * personality declined. In that case, the closest path is "the
   * personality with the most repairable (non-fatal) decline reasons."
   */
  readonly all_declined: boolean;
}

/**
 * Recovery priorities: which discomforts are repairable across personalities,
 * grouped by what would resolve them.
 */
export interface RecoveryPriority {
  /** Stable ID for this priority group. */
  readonly priority_id: string;
  /** Human-readable label (e.g., "Tax-return-anchored evidence upgrade"). */
  readonly label: string;
  /** Which personalities would benefit if this is addressed. */
  readonly addresses_personalities: ReadonlyArray<PersonalityId>;
  /** Which specific discomfort source IDs this resolves. */
  readonly resolves_discomfort_ids: ReadonlyArray<string>;
  /** Which comfort condition IDs this would satisfy. */
  readonly satisfies_comfort_condition_ids: ReadonlyArray<string>;
  /** Plain-language description of the action. */
  readonly description: string;
  /** Estimated leverage (number of distinct discomforts/conditions addressed). */
  readonly leverage_count: number;
}

/**
 * Structural concerns: discomforts marked fatal, with framing that
 * distinguishes "this is hard to fix" from "this is unfixable."
 */
export interface StructuralConcern {
  readonly concern_id: string;
  readonly description: string;
  readonly affected_personalities: ReadonlyArray<PersonalityId>;
  readonly source_ids: ReadonlyArray<string>;
  /** Plain-language explanation of why this is structural, not repairable. */
  readonly why_structural: string;
}

/**
 * Coverage gap finding: when fallback fingerprint drove personality
 * posture. The synthesis sets this so templates know to apply
 * coverage-gap framing instead of "lender declined" framing.
 */
export interface CoverageGapFinding {
  readonly is_coverage_gap: boolean;
  /** Industry that wasn't in the registry. */
  readonly industry_key: string | null;
  /** Industry display name if known. */
  readonly industry_display_name: string | null;
  /** Which personalities had posture affected by the coverage gap. */
  readonly affected_personalities: ReadonlyArray<PersonalityId>;
  readonly explanation: string;
}

/**
 * Per-personality narrative input — the structured posture data feeding
 * the per-personality fragment template.
 */
export interface PersonalityNarrativeInput {
  readonly personality_id: PersonalityId;
  readonly personality_version: string;
  readonly state: PostureState;
  readonly is_coverage_gap_affected: boolean;
  readonly triggered_deal_breaker_ids: ReadonlyArray<string>;
  readonly fatal_discomfort_ids: ReadonlyArray<string>;
  readonly repairable_discomfort_ids: ReadonlyArray<string>;
  readonly unsatisfied_comfort_condition_ids: ReadonlyArray<string>;
  readonly satisfied_comfort_condition_ids: ReadonlyArray<string>;
  readonly primary_axis: AxisKey;
  readonly primary_axis_score: number;
  readonly primary_axis_band: string;
}

/**
 * Per-axis interpretation — synthesized institutional meaning of one axis.
 */
export interface AxisInterpretation {
  readonly axis: AxisKey;
  readonly score: number;
  readonly band: string;
  /** What this axis state means institutionally (not just the numeric reading). */
  readonly institutional_meaning: string;
  /** Component IDs that drove this reading. */
  readonly source_ids: ReadonlyArray<string>;
}

/**
 * Assumption concentration finding — fragility translated to institutional
 * language ("seven favorable conclusions depend on add-back integrity").
 */
export interface AssumptionConcentrationFinding {
  readonly assumption_key: AssumptionKey;
  readonly assumption_name: string;
  readonly conclusion_count: number;
  readonly favorable_count: number;
  readonly unfavorable_count: number;
  readonly axis_spread: ReadonlyArray<AxisKey>;
  readonly evidence_strength: number;
  readonly framing_description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL STRUCTURED SYNTHESIS RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The deterministic synthesis layer produces this structure. Templates
 * render fragments from it. The synthesis is independently auditable
 * even before any prose is generated.
 */
export interface NarrativeSynthesis {
  readonly evaluation_id: string;
  readonly synthesis_version: string;
  readonly binding_constraint: BindingConstraintFinding | null;
  readonly closest_path: ClosestPathFinding | null;
  readonly recovery_priorities: ReadonlyArray<RecoveryPriority>;
  readonly structural_concerns: ReadonlyArray<StructuralConcern>;
  readonly coverage_gap: CoverageGapFinding;
  readonly per_personality: ReadonlyArray<PersonalityNarrativeInput>;
  readonly per_axis: ReadonlyArray<AxisInterpretation>;
  readonly top_assumption_concentrations: ReadonlyArray<AssumptionConcentrationFinding>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE HEADLINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The executive headline is 4-6 sentence synthesized prose that explains
 * the deal's real underwriting story. Built from the structured synthesis
 * using template assembly — NOT free-form generation.
 *
 * The headline traces to the specific synthesis findings it summarizes
 * via headline_source_synthesis_keys.
 */
export interface NarrativeHeadline {
  readonly headline_id: string;
  readonly prose: string;
  /** Which synthesis findings the headline summarizes (e.g., "binding_constraint", "closest_path"). */
  readonly headline_source_synthesis_keys: ReadonlyArray<string>;
  /** Axes and personalities referenced in the headline. */
  readonly related_axis_keys: ReadonlyArray<AxisKey>;
  readonly related_personality_ids: ReadonlyArray<PersonalityId>;
  /** Sentence count for validation. */
  readonly sentence_count: number;
  readonly headline_version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL NARRATIVE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The CP-8 deliverable. Headline + structured fragments + the synthesis
 * that drove them.
 *
 * Consumers:
 *   - Dashboard: renders headline + selected fragments as summary tiles
 *   - PDF report: assembles fragments into report sections
 *   - CP-9 snapshot persistence: preserves the full structure
 *   - Future LLM polish layer (downstream, optional): consumes synthesis
 *     + headline as structured input to produce alternative prose
 */
export interface NarrativeOutput {
  readonly evaluation_id: string;
  readonly evaluated_at: string;
  readonly version: string;
  readonly headline: NarrativeHeadline;
  readonly fragments: ReadonlyArray<NarrativeFragment>;
  readonly synthesis: NarrativeSynthesis;
  readonly summary: {
    readonly fragment_count: number;
    readonly fragments_by_kind: Readonly<Record<NarrativeFragmentKind, number>>;
    readonly references_coverage_gap: boolean;
    readonly proposes_buyer_action_count: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORBIDDEN PROSE PATTERNS — read by validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Substrings that must NEVER appear in any fragment prose or headline.
 * The validator scans for these case-insensitively and fails closed
 * when any appear.
 *
 * Two categories:
 *   1. Overstatement (forecasting actual lender behavior)
 *   2. Score recitation as narrative (the "scores are not the narrative" rule)
 *
 * Note: the validator checks for these substrings outside of quoted/escaped
 * contexts. Templates should never produce these phrases organically.
 */
export const FORBIDDEN_OVERSTATEMENT_PHRASES: ReadonlyArray<string> = [
  "would decline",
  "will decline",
  "will refuse",
  "would refuse",
  "lenders will not",
  "lenders will refuse",
  "will be approved",
  "would be approved",
  "approval probability",
  "decline probability",
  "approval likelihood",
  "decline likelihood",
  "expected financing outcome",
  "guaranteed rejection",
  "guaranteed approval",
  "predicts approval",
  "predicts decline",
];

/**
 * Phrases that signal score recitation rather than synthesis. Pure
 * score restatements without interpretation fail this check.
 */
export const FORBIDDEN_DRAMATIC_PHRASES: ReadonlyArray<string> = [
  "doomed",
  "disaster",
  "terrible deal",
  "fatal flaw",
  "bad deal",
  "great deal",
  "amazing deal",
  "horrible",
  "catastrophe",
  "no chance",
];

/**
 * Required framing patterns when fragment references simulated posture.
 * At least one must appear in any fragment with references_simulated_posture=true.
 *
 * Two flavors of accepted framing:
 *
 *   Engine-internal (preserved for backward compatibility and for fragments
 *   that explicitly discuss the simulation mechanic):
 *     - "personality simulation" / "personality profile" / "interpretive lens"
 *     - "simulation surfaces" / "simulation produces" / "simulation yields"
 *     - "simulation withheld" / "simulation withholds"
 *     - "Under the" / "Within the"
 *
 *   Buyer-facing (preferred for executive headlines and per-personality
 *   fragments — reads more institutionally without losing the simulation
 *   distinction):
 *     - "lender-profile simulation" / "financing-path simulation"
 *     - "modeled lender profile" / "modeled financing path"
 *     - "modeled lenders" / "modeled financing"
 *     - "simulated lender"
 *
 * Templates can mix both vocabularies. The validator accepts either.
 */
export const REQUIRED_SIMULATION_FRAMING_PATTERNS: ReadonlyArray<string> = [
  // Engine-internal framing
  "personality simulation",
  "personality profile",
  "interpretive lens",
  "interpretive reading",
  "simulation surfaces",
  "personality reading",
  "simulated posture",
  "simulation produces",
  "simulation yields",
  "simulation withhe",         // catches "withheld" / "withholds"
  "simulation withholds",
  "under the",                 // "Under the SBA-lender personality..."
  "within the",                // "Within the seller-note interpretive lens..."

  // Buyer-facing framing (preferred for headlines + dashboard prose)
  "lender-profile simulation",
  "financing-path simulation",
  "modeled lender profile",
  "modeled financing path",
  "modeled lender",            // catches "modeled lenders"
  "modeled financing",
  "simulated lender",
];

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface NarrativeValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<NarrativeValidationIssue>;
  readonly summary: {
    readonly fragments_checked: number;
    readonly forbidden_phrase_hits: number;
    readonly missing_traceability_hits: number;
    readonly missing_framing_hits: number;
    readonly empty_prose_hits: number;
  };
  readonly version: string;
}

export interface NarrativeValidationIssue {
  readonly severity: "error" | "warning";
  readonly category:
    | "forbidden_overstatement_phrase"
    | "forbidden_dramatic_phrase"
    | "missing_simulation_framing"
    | "missing_coverage_gap_framing"
    | "missing_traceability"
    | "empty_prose"
    | "empty_source_ids"
    | "score_recitation_without_interpretation"
    | "headline_sentence_count_out_of_range";
  readonly location: string;
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL PRINCIPLES (re-stated for the narrative layer)
// ─────────────────────────────────────────────────────────────────────────────

export const NARRATIVE_IS_SYNTHESIS_NOT_RECITATION_PRINCIPLE = [
  "The narrative layer must SYNTHESIZE across structured layers into ",
  "actionable buyer insight, not recite the structured data in prose ",
  "form. A fragment that reads 'The durability score is 21 and the ",
  "fragility score is 84' is recitation, not synthesis. The same fragment ",
  "as synthesis: 'The deal's problem is not that the numbers fail ",
  "immediately; it is that too many favorable conclusions depend on ",
  "concentrated assumptions that do not survive normalization cleanly.' ",
  "Scores support narrative interpretation; they are not the narrative.",
].join("");

export const NARRATIVE_PROSE_IS_PRESENTATION_PRINCIPLE = [
  "The prose is presentation; the structured trace is the product. ",
  "Every NarrativeFragment carries source_ids, related_axis_keys, ",
  "related_personality_ids, related_scenario_ids, and related_assumption_keys. ",
  "A fragment without provenance cannot exist (validator enforces this). ",
  "Downstream consumers — dashboard, PDF report, future LLM polish — read ",
  "the structured trace alongside the prose, and the prose can be ",
  "regenerated from the synthesis at any time. The persistent product is ",
  "the structured intelligence, not the rendered text.",
].join("");

export const NARRATIVE_INSTITUTIONAL_TONE_PRINCIPLE = [
  "Narrative tone is institutional, not dramatic. Use language like ",
  "'financeable comfort path,' 'binding constraint,' 'repairable ",
  "discomfort,' 'survivability pressure,' 'evidence upgrade,' 'diligence ",
  "priority,' 'structural fragility.' Avoid language like 'disaster,' ",
  "'terrible deal,' 'fatal flaw,' 'doomed,' 'guaranteed rejection.' The ",
  "engine is institutional infrastructure, not editorial commentary. ",
  "Dramatic framing weakens the credibility of every conclusion the ",
  "engine produces.",
].join("");

export const NARRATIVE_SURFACES_CLOSEST_PATH_PRINCIPLE = [
  "Even when most personalities decline, the narrative must surface the ",
  "closest-to-interested personality and articulate what would shift its ",
  "posture. A buyer reading CP-8 output should never come away with 'no ",
  "path forward' — they should come away with 'the closest financing path ",
  "is X, and the specific conditions that would close its remaining ",
  "comfort loop are Y.' If every personality declines on structural ",
  "incompatibility (not just repairable concerns), the narrative says so ",
  "explicitly — but it still identifies which decline reasons are closest ",
  "to recoverable.",
].join("");
