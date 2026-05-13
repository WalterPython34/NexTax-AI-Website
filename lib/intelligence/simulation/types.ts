// lib/intelligence/simulation/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Simulator Type Contracts
//
// CP-7 Foundation. The simulator-internal types for posture derivation.
//
// Most output types (LenderPosture, PostureState) were already locked
// in CP-6. This file adds:
//
//   1. PatternEvaluationResult — the typed output of the pattern
//      evaluator (was the pattern detected? if not, why not?)
//
//   2. PostureDerivationTrace — the deterministic trace of how a posture
//      state was derived. Every state transition logged for explainability.
//
//   3. PostureSimulationBatch — the multi-personality input/output types
//      for simulateAllPostures().
//
//   4. SimulatorValidationResult — self-test result type.
//
// Architectural commitments enforced here (in addition to those CP-6
// already enforced via PersonalitySimulationInput):
//
//   - DETERMINISTIC ONLY. No probability fields, no confidence scores,
//     no likelihood percentages. The simulator emits categorical states
//     with structured traces.
//
//   - RECOVERY PATH SURFACE PRESERVED. The simulator outputs enough
//     structured data (triggered deal-breakers, discomfort chain with
//     repairability, unsatisfied comfort conditions, unmet information
//     needs) to support future CP-10+ recovery path intelligence.
//
//   - NO UPSTREAM MUTATION. The simulator reads axis_composition_result
//     and scenario_evaluation_result as inputs and produces LenderPosture
//     as output. It does not write back to either input. Type contracts
//     enforce this: inputs are readonly; the simulator's output is its
//     own typed structure.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisCompositionResult,
} from "../axes/types";
import type {
  ScenarioEvaluationResult,
} from "../scenarios/types";
import type {
  AxisDiscomfortPattern,
  ComfortConditionId,
  DealBreakerId,
  DiscomfortRepairability,
  DiscomfortSourceId,
  InformationNeedId,
  LenderPersonality,
  LenderPosture,
  PersonalityId,
  PostureState,
} from "../personalities/types";

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const SIMULATOR_VERSION = "cp7-v0.1.0";
export const PATTERN_EVALUATOR_VERSION = "cp7-v0.1.0";
export const POSTURE_DERIVATION_VERSION = "cp7-v0.1.0";

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN EVALUATION RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The result of evaluating one AxisDiscomfortPattern against an
 * AxisCompositionResult (plus ScenarioEvaluationResult for scenario
 * patterns).
 *
 * The evaluator is the single procedural surface where personality
 * declarations meet axis truth. Every deal-breaker trigger, every
 * discomfort source trigger, every comfort condition satisfied_when,
 * every information need missing_when flows through this evaluator.
 *
 * The result carries:
 *   - matched: boolean — did the pattern detect?
 *   - explanation: plain-language description of what the evaluator saw
 *   - observed_value: the actual axis score, band, or component ID that
 *     was checked (for diagnostic traceability)
 *   - expected_value: the threshold or condition the pattern declared
 *
 * Both observed_value and expected_value are stored as strings to keep
 * the evaluator's return type flat across all six pattern variants.
 * Downstream consumers may parse them when needed.
 */
export interface PatternEvaluationResult {
  readonly matched: boolean;
  readonly pattern_kind: AxisDiscomfortPattern["kind"];
  readonly explanation: string;
  readonly observed_value: string;
  readonly expected_value: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE DERIVATION TRACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A structured trace of how the posture state was derived, in execution
 * order. Each entry represents one step in the deterministic state
 * machine: which check ran, what it observed, whether the check pushed
 * the state in a particular direction.
 *
 * The trace is the architectural answer to "why is posture X?" — it's
 * an ordered audit log that a user can read to understand the
 * derivation. Per the DETERMINISTIC_POSTURE_PRINCIPLE: posture must
 * always be answerable as "Posture is X because these specific
 * conditions triggered in this specific order."
 */
export interface PostureDerivationStep {
  readonly step_index: number;
  readonly phase:
    | "information_needs_check"
    | "deal_breaker_check"
    | "discomfort_detection"
    | "comfort_condition_evaluation"
    | "state_derivation";
  readonly description: string;
  /** Stable IDs for whatever this step examined (deal-breaker IDs, etc.). */
  readonly examined_ids: ReadonlyArray<string>;
  /** Whether the step's outcome moves the state machine in a direction. */
  readonly outcome:
    | "neutral"          // step ran but didn't change state pressure
    | "pushes_decline"   // contributes pressure toward decline
    | "pushes_cautious"  // contributes pressure toward cautious
    | "supports_interested"; // positive signal supporting interested state
}

/**
 * Complete trace of one posture derivation. Lives alongside the
 * LenderPosture; not embedded in it because the trace can be large
 * and not all consumers need it.
 */
export interface PostureDerivationTrace {
  readonly posture_id: string;
  readonly personality_id: PersonalityId;
  readonly personality_version: string;
  readonly final_state: PostureState;
  readonly steps: ReadonlyArray<PostureDerivationStep>;
  /** Plain-language transition summary: "interested → cautious because X". */
  readonly transition_summary: string;
  readonly trace_version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE DERIVATION INPUTS (internal — what the state machine receives)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The structured input the state machine consumes after Phases 1-4 have
 * run their detections. The state machine itself reads these counts and
 * categorical signals and produces the categorical posture state.
 *
 * Internal type — not exported as part of the public CP-7 API. Lives
 * here because the derivation module imports it and the simulator
 * orchestrator constructs it.
 */
export interface PostureDerivationInputs {
  readonly triggered_deal_breakers: ReadonlyArray<DealBreakerId>;
  readonly triggered_discomforts: ReadonlyArray<{
    readonly discomfort_source_id: DiscomfortSourceId;
    readonly repairability: DiscomfortRepairability;
  }>;
  readonly unsatisfied_required_comfort_conditions: ReadonlyArray<ComfortConditionId>;
  readonly unsatisfied_other_comfort_conditions: ReadonlyArray<ComfortConditionId>;
  readonly satisfied_comfort_conditions: ReadonlyArray<ComfortConditionId>;
  readonly unmet_information_needs: ReadonlyArray<InformationNeedId>;
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input for batch simulation across all personalities. Used by
 * simulateAllPostures() — convenient for dashboard, PDF report, and
 * future lender-fit comparison.
 */
export interface BatchSimulationInput {
  readonly axis_composition_result: AxisCompositionResult;
  readonly scenario_evaluation_result: ScenarioEvaluationResult;
  /**
   * Optional subset of personalities to simulate. If null/undefined,
   * simulates all personalities in the catalogue.
   */
  readonly personality_ids?: ReadonlyArray<PersonalityId>;
}

/**
 * Output of batch simulation. Stable order matches the personality
 * catalogue order (or the subset order if personality_ids was provided).
 *
 * Each batch entry carries the posture plus its derivation trace.
 * The batch summary aggregates counts across personalities for
 * dashboard rollup.
 */
export interface BatchSimulationResult {
  readonly batch_id: string;
  readonly evaluated_at: string;
  readonly simulator_version: string;
  readonly axis_composition_evaluation_id: string;
  readonly entries: ReadonlyArray<{
    readonly personality_id: PersonalityId;
    readonly personality_version: string;
    readonly posture: LenderPosture;
    readonly derivation_trace: PostureDerivationTrace;
  }>;
  readonly summary: {
    readonly total_personalities_simulated: number;
    readonly interested_count: number;
    readonly cautious_count: number;
    readonly decline_count: number;
    readonly personalities_with_triggered_deal_breakers: number;
    readonly personalities_with_fatal_discomforts: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-PERSONALITY SIMULATION OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of one personality's simulation: the LenderPosture plus its
 * derivation trace. Public consumers receive both — the posture is the
 * primary output, the trace is the audit surface.
 */
export interface SinglePersonalitySimulationResult {
  readonly posture: LenderPosture;
  readonly derivation_trace: PostureDerivationTrace;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATOR VALIDATION RESULT (for self-test)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulatorValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<{
    readonly severity: "error" | "warning";
    readonly category:
      | "forbidden_probability_field"
      | "forbidden_state_value"
      | "missing_required_field"
      | "pattern_evaluator_misbehavior";
    readonly location: string;
    readonly message: string;
  }>;
  readonly version: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL PRINCIPLES (re-stated at the simulator boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The simulator-layer restatement of the deterministic posture
 * commitment from CP-6. Read by CP-8 narrative for framing
 * consistency.
 */
export const SIMULATOR_NEVER_EMITS_PROBABILITIES_PRINCIPLE = [
  "The CP-7 simulator emits categorical posture states (interested, ",
  "cautious, decline) with deterministic explanations. It NEVER emits ",
  "approval probabilities, decline likelihoods, confidence percentages, ",
  "or any other surface implying predictive precision the architecture ",
  "cannot defend. Posture is not a forecast — it is the deterministic ",
  "result of structured conditions evaluating against canonical truth. ",
  "If future business needs require probability surfaces (e.g., 'what ",
  "percentage of SBA lenders would actually fund this'), that is a ",
  "separately governance-reviewed module living downstream of posture, ",
  "consuming posture as one of many inputs, and labeled distinctly so ",
  "users cannot conflate it with structural posture.",
].join("");

/**
 * The simulator-layer restatement of the recovery-path-surface
 * commitment. Even when posture is decline, the simulator preserves
 * structured discomfort and comfort-condition data for future recovery
 * intelligence.
 */
export const POSTURE_PRESERVES_RECOVERY_SURFACE_PRINCIPLE = [
  "Every LenderPosture, regardless of state, preserves the structured ",
  "surface CP-10+ recovery path intelligence will read: which deal-breakers ",
  "triggered (and whether they have repairable equivalents), which ",
  "discomforts fired (with repairability classification), which comfort ",
  "conditions are unsatisfied (with required_for_interested status), which ",
  "information needs remain unmet. A 'decline' posture does not erase the ",
  "recovery surface — it identifies where structural incompatibility sits ",
  "and where repairable conditions remain. The user always knows what ",
  "would need to change for this personality to reach a different posture.",
].join("");

/**
 * The simulator's restatement of the truth-boundary commitment. CP-7
 * reads axis and scenario inputs; it does not recompute them.
 */
export const SIMULATOR_DOES_NOT_RECOMPUTE_TRUTH_PRINCIPLE = [
  "The simulator reads axis_composition_result and scenario_evaluation_result ",
  "as inputs. It does not recompute axis scores, regenerate the fragility ",
  "graph, re-evaluate rule firings, re-run scenarios, or reinterpret ",
  "evidence quality. The canonical truth was produced upstream by CP-2 ",
  "through CP-5; the simulator's job is to evaluate declarative personality ",
  "patterns against that truth, not to second-guess it. A simulator that ",
  "wanted to 're-weight' or 'adjust' axis scores would be structurally a ",
  "different module — the personality layer is interpretation, not ",
  "measurement.",
].join("");

// Suppress unused-import warnings
const _suppress_AxisDiscomfortPattern: AxisDiscomfortPattern | undefined = undefined;
const _suppress_LenderPersonality: LenderPersonality | undefined = undefined;
void _suppress_AxisDiscomfortPattern;
void _suppress_LenderPersonality;
