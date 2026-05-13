// lib/intelligence/simulation/posture-derivation.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Posture Derivation State Machine
//
// CP-7 Module: The deterministic state machine that produces categorical
// posture states from structured detection results.
//
// This module is constitutional logic. The rules here define WHEN a deal
// moves from interested → cautious → decline for any personality. The
// rules are countable, structured, and governance-reviewable.
//
// Architectural commitments enforced:
//
//   1. DETERMINISTIC ONLY. No probability calculation, no scoring
//      function, no learned classifier. The state machine evaluates a
//      fixed cascade of conditions and emits a categorical state.
//
//   2. THRESHOLD CONSTANTS EXPORTED. Every threshold in the state
//      machine is an exported constant with a documented rationale.
//      Editing a threshold is a governance decision visible as a data
//      diff. No magic numbers buried in function bodies.
//
//   3. ORDERED CASCADE. The state machine checks conditions in a fixed
//      order, with each transition producing a trace step. The trace
//      is the answer to "why is posture X?" — a structured audit log
//      that a user can read directly.
//
//   4. RECOVERY SURFACE PRESERVED. Even when posture is decline, the
//      state machine logs the conditions that drove the decline AND
//      the conditions that remain (which discomforts are repairable,
//      which comfort conditions are unsatisfied) — so CP-10+ recovery
//      path intelligence can read the structured surface.
//
//   5. SELLER_NOTE PROTECTION. Per the CP-6 commitment that seller_note
//      should not be over-conservative, evidence-weakness alone CANNOT
//      drive decline. The state machine reaches decline ONLY via
//      triggered deal-breakers OR fatal discomforts. The CP-6 catalogue
//      ensures seller_note's deal-breakers do not include evidence-
//      quality conditions; this module reinforces that by treating
//      evidence weakness as repairable discomfort by default.
//
// What this module does NOT do:
//
//   - Evaluate patterns (that's pattern-evaluator.ts)
//   - Read axis composition results directly (simulator orchestrator does)
//   - Generate prose explanations (only structured trace steps)
//   - Persist state across calls
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PostureState,
} from "../personalities/types";
import type {
  PostureDerivationInputs,
  PostureDerivationStep,
  PostureDerivationTrace,
} from "./types";
import { POSTURE_DERIVATION_VERSION } from "./types";

// Re-export
export { POSTURE_DERIVATION_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD CONSTANTS — governance-reviewable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of triggered repairable discomforts that pushes posture to cautious
 * even when no required comfort condition is unsatisfied.
 *
 * Rationale: a personality with 3 separate repairable concerns is institutionally
 * "not yet ready" even when no single comfort condition is unsatisfied.
 * Three independent concerns reflect real institutional caution — the file
 * has multiple repairable issues that need to clear in parallel.
 */
export const REPAIRABLE_DISCOMFORT_COUNT_FOR_CAUTIOUS = 3;

/**
 * Combined threshold: when fewer repairable discomforts (2) AND at least one
 * unmet information need exist, posture still moves to cautious.
 *
 * Rationale: per the Q3 refinement, "2 repairable + 1 unmet info need ≈
 * not ready, even if not declined." This mirrors real lender behavior where
 * data gaps compound the effect of repairable concerns.
 */
export const REPAIRABLE_DISCOMFORT_COUNT_WITH_INFO_GAPS = 2;
export const MIN_UNMET_INFO_NEEDS_FOR_COMBINED_CAUTIOUS = 1;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a posture state from structured detection results.
 *
 * Pure deterministic function. Same inputs always produce same output.
 *
 * Cascade order (the state machine):
 *
 *   1. ANY triggered deal-breaker        → decline
 *   2. ANY fatal discomfort               → decline
 *   3. ANY unsatisfied required_for_interested comfort condition  → cautious
 *   4. 3+ repairable discomforts          → cautious
 *   5. 2+ repairable + 1+ unmet info need → cautious
 *   6. Otherwise                          → interested
 *
 * Every step that runs is logged to the trace, including steps where
 * the check ran but the condition was not met. The trace is the audit
 * surface for "why is posture X?".
 */
export function derivePostureState(
  inputs: PostureDerivationInputs,
): {
  readonly state: PostureState;
  readonly steps: ReadonlyArray<PostureDerivationStep>;
  readonly transition_summary: string;
} {
  const steps: PostureDerivationStep[] = [];
  let stepIndex = 0;

  // ── Step 1: Information needs check ──
  steps.push({
    step_index: stepIndex++,
    phase: "information_needs_check",
    description: inputs.unmet_information_needs.length === 0
      ? "All information needs met."
      : `${inputs.unmet_information_needs.length} information need(s) unmet: ${inputs.unmet_information_needs.join(", ")}. ` +
        `Information gaps will compound with repairable discomforts in later checks.`,
    examined_ids: inputs.unmet_information_needs.slice(),
    outcome: inputs.unmet_information_needs.length === 0 ? "supports_interested" : "neutral",
  });

  // ── Step 2: Deal-breaker check ──
  if (inputs.triggered_deal_breakers.length > 0) {
    steps.push({
      step_index: stepIndex++,
      phase: "deal_breaker_check",
      description:
        `${inputs.triggered_deal_breakers.length} deal-breaker(s) triggered: ` +
        `${inputs.triggered_deal_breakers.join(", ")}. ` +
        `Any triggered deal-breaker drives the personality to decline. ` +
        `Subsequent checks run for diagnostic completeness but cannot change the final state.`,
      examined_ids: inputs.triggered_deal_breakers.slice(),
      outcome: "pushes_decline",
    });
  } else {
    steps.push({
      step_index: stepIndex++,
      phase: "deal_breaker_check",
      description: "No deal-breakers triggered.",
      examined_ids: [],
      outcome: "supports_interested",
    });
  }

  // ── Step 3: Discomfort detection summary ──
  const fatalDiscomforts = inputs.triggered_discomforts.filter(
    (d) => d.repairability === "fatal",
  );
  const repairableDiscomforts = inputs.triggered_discomforts.filter(
    (d) => d.repairability === "repairable",
  );

  if (fatalDiscomforts.length > 0) {
    steps.push({
      step_index: stepIndex++,
      phase: "discomfort_detection",
      description:
        `${fatalDiscomforts.length} fatal discomfort(s) triggered: ` +
        `${fatalDiscomforts.map((d) => d.discomfort_source_id).join(", ")}. ` +
        `Fatal discomforts represent structural incompatibilities that diligence cannot resolve; ` +
        `they drive the personality to decline.`,
      examined_ids: fatalDiscomforts.map((d) => d.discomfort_source_id),
      outcome: "pushes_decline",
    });
  } else if (repairableDiscomforts.length > 0) {
    steps.push({
      step_index: stepIndex++,
      phase: "discomfort_detection",
      description:
        `0 fatal discomforts. ${repairableDiscomforts.length} repairable discomfort(s) triggered: ` +
        `${repairableDiscomforts.map((d) => d.discomfort_source_id).join(", ")}. ` +
        `Repairable discomforts can be closed through diligence, structural changes, or evidence upgrades.`,
      examined_ids: repairableDiscomforts.map((d) => d.discomfort_source_id),
      outcome: repairableDiscomforts.length >= REPAIRABLE_DISCOMFORT_COUNT_FOR_CAUTIOUS
        ? "pushes_cautious"
        : "neutral",
    });
  } else {
    steps.push({
      step_index: stepIndex++,
      phase: "discomfort_detection",
      description: "No discomforts triggered — neither fatal nor repairable.",
      examined_ids: [],
      outcome: "supports_interested",
    });
  }

  // ── Step 4: Comfort condition evaluation ──
  steps.push({
    step_index: stepIndex++,
    phase: "comfort_condition_evaluation",
    description:
      `${inputs.satisfied_comfort_conditions.length} comfort condition(s) satisfied. ` +
      `${inputs.unsatisfied_required_comfort_conditions.length} required-for-interested condition(s) unsatisfied: ` +
      (inputs.unsatisfied_required_comfort_conditions.length > 0
        ? inputs.unsatisfied_required_comfort_conditions.join(", ")
        : "none") +
      `. ${inputs.unsatisfied_other_comfort_conditions.length} other condition(s) unsatisfied.`,
    examined_ids: [
      ...inputs.unsatisfied_required_comfort_conditions,
      ...inputs.unsatisfied_other_comfort_conditions,
    ],
    outcome: inputs.unsatisfied_required_comfort_conditions.length > 0
      ? "pushes_cautious"
      : inputs.satisfied_comfort_conditions.length > 0
        ? "supports_interested"
        : "neutral",
  });

  // ── Step 5: State derivation (the actual state machine) ──
  let state: PostureState;
  let transitionSummary: string;

  if (inputs.triggered_deal_breakers.length > 0) {
    state = "decline";
    transitionSummary =
      `Posture: decline. Driven by ${inputs.triggered_deal_breakers.length} triggered deal-breaker(s).`;
  } else if (fatalDiscomforts.length > 0) {
    state = "decline";
    transitionSummary =
      `Posture: decline. Driven by ${fatalDiscomforts.length} fatal discomfort(s); no deal-breakers triggered.`;
  } else if (inputs.unsatisfied_required_comfort_conditions.length > 0) {
    state = "cautious";
    transitionSummary =
      `Posture: cautious. ${inputs.unsatisfied_required_comfort_conditions.length} required-for-interested ` +
      `comfort condition(s) unsatisfied; no deal-breakers, no fatal discomforts.`;
  } else if (repairableDiscomforts.length >= REPAIRABLE_DISCOMFORT_COUNT_FOR_CAUTIOUS) {
    state = "cautious";
    transitionSummary =
      `Posture: cautious. ${repairableDiscomforts.length} repairable discomforts triggered ` +
      `(threshold ${REPAIRABLE_DISCOMFORT_COUNT_FOR_CAUTIOUS}); all required comfort conditions met.`;
  } else if (
    repairableDiscomforts.length >= REPAIRABLE_DISCOMFORT_COUNT_WITH_INFO_GAPS &&
    inputs.unmet_information_needs.length >= MIN_UNMET_INFO_NEEDS_FOR_COMBINED_CAUTIOUS
  ) {
    state = "cautious";
    transitionSummary =
      `Posture: cautious. ${repairableDiscomforts.length} repairable discomforts combined with ` +
      `${inputs.unmet_information_needs.length} unmet information need(s); ` +
      `data gaps compound repairable concerns.`;
  } else {
    state = "interested";
    transitionSummary =
      `Posture: interested. No deal-breakers, no fatal discomforts, no unsatisfied required comfort ` +
      `conditions, and discomfort/information signals stay below cautious thresholds.`;
  }

  steps.push({
    step_index: stepIndex++,
    phase: "state_derivation",
    description: transitionSummary,
    examined_ids: [],
    outcome:
      state === "decline"
        ? "pushes_decline"
        : state === "cautious"
          ? "pushes_cautious"
          : "supports_interested",
  });

  return { state, steps, transition_summary: transitionSummary };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACE ASSEMBLY HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap the derivation result in a full PostureDerivationTrace structure.
 * Used by the simulator orchestrator (file 4) to assemble the final
 * output.
 */
export function assemblePostureTrace(args: {
  readonly posture_id: string;
  readonly personality_id: PostureDerivationTrace["personality_id"];
  readonly personality_version: string;
  readonly final_state: PostureState;
  readonly steps: ReadonlyArray<PostureDerivationStep>;
  readonly transition_summary: string;
}): PostureDerivationTrace {
  return {
    posture_id: args.posture_id,
    personality_id: args.personality_id,
    personality_version: args.personality_version,
    final_state: args.final_state,
    steps: args.steps,
    transition_summary: args.transition_summary,
    trace_version: POSTURE_DERIVATION_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the derivation state machine at module load. Runs all four
 * transition paths against synthetic input to ensure each produces the
 * expected state.
 *
 * Fails closed at module load.
 */
function selfTestDerivation(): boolean {
  // Path 1: triggered deal-breaker → decline
  const path1 = derivePostureState({
    triggered_deal_breakers: ["test.deal_breaker.example"],
    triggered_discomforts: [],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: [],
    unmet_information_needs: [],
  });
  if (path1.state !== "decline") return false;

  // Path 2: fatal discomfort → decline
  const path2 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [{ discomfort_source_id: "test.d.fatal", repairability: "fatal" }],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: [],
    unmet_information_needs: [],
  });
  if (path2.state !== "decline") return false;

  // Path 3: unsatisfied required comfort condition → cautious
  const path3 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [],
    unsatisfied_required_comfort_conditions: ["test.c.required"],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: [],
    unmet_information_needs: [],
  });
  if (path3.state !== "cautious") return false;

  // Path 4: 3+ repairable discomforts → cautious
  const path4 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [
      { discomfort_source_id: "test.d.r1", repairability: "repairable" },
      { discomfort_source_id: "test.d.r2", repairability: "repairable" },
      { discomfort_source_id: "test.d.r3", repairability: "repairable" },
    ],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: [],
    unmet_information_needs: [],
  });
  if (path4.state !== "cautious") return false;

  // Path 5 (refinement): 2 repairable + 1 info gap → cautious
  const path5 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [
      { discomfort_source_id: "test.d.r1", repairability: "repairable" },
      { discomfort_source_id: "test.d.r2", repairability: "repairable" },
    ],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: [],
    unmet_information_needs: ["test.i.missing"],
  });
  if (path5.state !== "cautious") return false;

  // Path 6: clean → interested
  const path6 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: ["test.c.satisfied"],
    unmet_information_needs: [],
  });
  if (path6.state !== "interested") return false;

  // Path 7: 2 repairable, no info gaps → interested (NOT cautious)
  const path7 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [
      { discomfort_source_id: "test.d.r1", repairability: "repairable" },
      { discomfort_source_id: "test.d.r2", repairability: "repairable" },
    ],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: [],
    unmet_information_needs: [],
  });
  if (path7.state !== "interested") return false;

  // Path 8: fatal discomfort overrides comfort condition satisfaction
  const path8 = derivePostureState({
    triggered_deal_breakers: [],
    triggered_discomforts: [{ discomfort_source_id: "test.d.fatal", repairability: "fatal" }],
    unsatisfied_required_comfort_conditions: [],
    unsatisfied_other_comfort_conditions: [],
    satisfied_comfort_conditions: ["test.c.s1", "test.c.s2", "test.c.s3"],
    unmet_information_needs: [],
  });
  if (path8.state !== "decline") return false;

  return true;
}

if (!selfTestDerivation()) {
  throw new Error(
    `Posture derivation self-test failed at module load (${POSTURE_DERIVATION_VERSION}).`,
  );
}
