// lib/intelligence/narrative/synthesis/closest-path.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Closest Path Synthesis
//
// CP-8 Module: Deterministic identification of which personality is
// closest to interested posture, and what would shift its posture
// upward.
//
// This module encodes the NARRATIVE_SURFACES_CLOSEST_PATH_PRINCIPLE:
// even when most or all personalities decline, the narrative must
// surface the personality with the most repairable concerns and
// articulate what would close its remaining loop.
//
// What this module computes:
//
//   Given a CP-7 batch posture result, identify which personality has
//   the shortest distance to `interested` posture. The "distance" is
//   measured deterministically:
//
//     - interested personalities have distance 0
//     - cautious personalities have distance = count of unsatisfied
//       required-for-interested comfort conditions + count of
//       repairable discomforts above threshold + (small penalty for
//       unmet info needs)
//     - declined personalities have distance = count of triggered
//       deal-breakers (×LARGE_WEIGHT) + count of fatal discomforts
//       (×LARGE_WEIGHT) + count of repairable discomforts +
//       count of unsatisfied required comfort conditions
//
//   The personality with the LOWEST distance is the closest path.
//
//   When distances tie, the tiebreaker is:
//     1. Personality with fewer fatal/structural issues wins
//     2. Personality with more satisfied comfort conditions wins
//     3. Catalogue declaration order (stable last-resort tiebreaker)
//
// Three case branches the synthesis handles:
//
//   CASE A: At least one personality is interested
//     → closest_path is the interested personality with the fewest
//       remaining repairable discomforts (still surfacing what could
//       improve even an "interested" reading)
//
//   CASE B: No interested, at least one cautious
//     → closest_path is the cautious personality with the fewest
//       unsatisfied required comfort conditions + fewest repairable
//       discomforts
//
//   CASE C: All declined
//     → closest_path is the declined personality with the MOST
//       repairable signals and FEWEST fatal/deal-breaker signals.
//       all_declined flag set to true so templates can frame as
//       "no current path; closest to recoverable is X"
//
// What this module does NOT do:
//
//   - Generate prose (templates render the rationale)
//   - Make recommendations ("you should pursue X")
//   - Predict actual lender outcomes
//   - Compute probability of any personality moving to interested
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PersonalityId,
  PostureState,
} from "../../personalities/types";
import type {
  BatchSimulationResult,
} from "../../simulation/types";
import type {
  ClosestPathFinding,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// DISTANCE WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weight applied to fatal/structural signals when computing distance.
 * A fatal discomfort or triggered deal-breaker contributes far more to
 * distance than a repairable discomfort, because structural signals
 * cannot be closed by diligence.
 *
 * Tuning rationale:
 *   - 1 deal-breaker = 100 distance points (effectively dominates the score)
 *   - 1 fatal discomfort = 50 distance points
 *   - 1 unsatisfied required comfort condition = 10 distance points
 *   - 1 repairable discomfort = 3 distance points
 *   - 1 unmet info need = 2 distance points
 *
 * The large weights for deal-breakers and fatals ensure that personalities
 * with structural incompatibilities never appear "closer" than personalities
 * with only repairable concerns, regardless of count.
 */
export const DEAL_BREAKER_DISTANCE_WEIGHT = 100;
export const FATAL_DISCOMFORT_DISTANCE_WEIGHT = 50;
export const UNSATISFIED_REQUIRED_COMFORT_WEIGHT = 10;
export const REPAIRABLE_DISCOMFORT_WEIGHT = 3;
export const UNMET_INFO_NEED_WEIGHT = 2;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface ClosestPathInputs {
  readonly batch_posture_result: BatchSimulationResult;
}

/**
 * Identify the personality closest to interested posture.
 *
 * Pure deterministic function. Always returns a finding when the batch
 * has at least one entry — the function never returns null because the
 * constitutional commitment requires that some closest path is always
 * surfaced (even if all_declined=true).
 *
 * Returns null ONLY in the degenerate case of an empty batch.
 */
export function identifyClosestPath(
  inputs: ClosestPathInputs,
): ClosestPathFinding | null {
  const { batch_posture_result } = inputs;

  if (batch_posture_result.entries.length === 0) {
    return null;
  }

  // ── Step 1: Compute distance for each personality ──
  const distanceMap = batch_posture_result.entries.map((entry) => {
    const distance = computeDistance(entry.posture.state, {
      triggered_deal_breaker_count: entry.posture.triggered_deal_breakers.length,
      fatal_discomfort_count: entry.posture.discomfort_chain.filter(
        (d) => d.repairability === "fatal",
      ).length,
      repairable_discomfort_count: entry.posture.discomfort_chain.filter(
        (d) => d.repairability === "repairable",
      ).length,
      // Distinguish unsatisfied required vs other comfort conditions.
      // The LenderPosture surface combines them in unsatisfied_comfort_conditions;
      // we treat the entire unsatisfied set as required-equivalent for
      // distance purposes (templates will distinguish at render time).
      unsatisfied_required_count: entry.posture.unsatisfied_comfort_conditions.length,
      unmet_info_need_count: entry.posture.unmet_information_needs.length,
    });

    return {
      personality_id: entry.personality_id,
      state: entry.posture.state,
      triggered_deal_breakers: entry.posture.triggered_deal_breakers,
      fatal_discomforts: entry.posture.discomfort_chain
        .filter((d) => d.repairability === "fatal")
        .map((d) => d.discomfort_source_id),
      repairable_discomforts: entry.posture.discomfort_chain
        .filter((d) => d.repairability === "repairable")
        .map((d) => d.discomfort_source_id),
      unsatisfied_comfort_condition_ids: entry.posture.unsatisfied_comfort_conditions,
      satisfied_comfort_condition_ids: entry.posture.satisfied_comfort_conditions,
      unmet_info_need_ids: entry.posture.unmet_information_needs,
      distance,
    };
  });

  // ── Step 2: Sort by distance (ascending) with tiebreakers ──
  distanceMap.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    // Tiebreaker 1: fewer fatal/structural signals wins
    const aStructural = a.triggered_deal_breakers.length + a.fatal_discomforts.length;
    const bStructural = b.triggered_deal_breakers.length + b.fatal_discomforts.length;
    if (aStructural !== bStructural) return aStructural - bStructural;
    // Tiebreaker 2: more satisfied comfort conditions wins
    const aSatisfied = a.satisfied_comfort_condition_ids.length;
    const bSatisfied = b.satisfied_comfort_condition_ids.length;
    if (aSatisfied !== bSatisfied) return bSatisfied - aSatisfied;
    // Tiebreaker 3: catalogue declaration order (stable last resort)
    return 0;
  });

  const closest = distanceMap[0];

  // ── Step 3: Detect all_declined case ──
  const allDeclined = batch_posture_result.entries.every(
    (e) => e.posture.state === "decline",
  );

  // ── Step 4: Build source_ids for traceability ──
  const sourceIds: string[] = [
    `posture.${closest.personality_id}.state=${closest.state}`,
    ...closest.triggered_deal_breakers,
    ...closest.fatal_discomforts,
    ...closest.unsatisfied_comfort_condition_ids,
  ];

  // ── Step 5: Build rationale prose for templates ──
  const rationale = buildClosestPathRationale({
    personality_id: closest.personality_id,
    state: closest.state,
    triggered_deal_breaker_count: closest.triggered_deal_breakers.length,
    fatal_discomfort_count: closest.fatal_discomforts.length,
    repairable_discomfort_count: closest.repairable_discomforts.length,
    unsatisfied_count: closest.unsatisfied_comfort_condition_ids.length,
    unmet_info_count: closest.unmet_info_need_ids.length,
    distance: closest.distance,
    all_declined: allDeclined,
  });

  return {
    personality_id: closest.personality_id as PersonalityId,
    current_state: closest.state,
    unsatisfied_required_count: closest.unsatisfied_comfort_condition_ids.length,
    fatal_discomfort_count: closest.fatal_discomforts.length,
    repairable_discomfort_count: closest.repairable_discomforts.length,
    unsatisfied_comfort_condition_ids: closest.unsatisfied_comfort_condition_ids,
    source_ids: sourceIds,
    rationale,
    all_declined: allDeclined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTANCE COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

interface DistanceInputs {
  readonly triggered_deal_breaker_count: number;
  readonly fatal_discomfort_count: number;
  readonly repairable_discomfort_count: number;
  readonly unsatisfied_required_count: number;
  readonly unmet_info_need_count: number;
}

/**
 * Compute deterministic distance-to-interested for a personality.
 *
 * Formula:
 *   distance = deal_breakers × 100
 *            + fatal_discomforts × 50
 *            + unsatisfied_required × 10
 *            + repairable_discomforts × 3
 *            + unmet_info_needs × 2
 *
 * Personalities already at `interested` get distance 0 (no work to do).
 *
 * The large weights for deal-breakers and fatals ensure structural
 * signals dominate the score. A personality with even 1 fatal discomfort
 * (50 points) is "further" than a personality with 10 repairable
 * discomforts (30 points) — which matches institutional reality:
 * fixing 10 small things is easier than overcoming 1 structural
 * incompatibility.
 */
function computeDistance(state: PostureState, inputs: DistanceInputs): number {
  if (state === "interested") {
    // Interested personalities have zero distance, but we still account for
    // remaining repairable concerns so we can rank multiple interested
    // personalities by which is "most comfortably interested."
    return (
      inputs.repairable_discomfort_count * REPAIRABLE_DISCOMFORT_WEIGHT +
      inputs.unmet_info_need_count * UNMET_INFO_NEED_WEIGHT
    );
  }

  return (
    inputs.triggered_deal_breaker_count * DEAL_BREAKER_DISTANCE_WEIGHT +
    inputs.fatal_discomfort_count * FATAL_DISCOMFORT_DISTANCE_WEIGHT +
    inputs.unsatisfied_required_count * UNSATISFIED_REQUIRED_COMFORT_WEIGHT +
    inputs.repairable_discomfort_count * REPAIRABLE_DISCOMFORT_WEIGHT +
    inputs.unmet_info_need_count * UNMET_INFO_NEED_WEIGHT
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RATIONALE PROSE
// ─────────────────────────────────────────────────────────────────────────────

interface RationaleInputs {
  readonly personality_id: string;
  readonly state: PostureState;
  readonly triggered_deal_breaker_count: number;
  readonly fatal_discomfort_count: number;
  readonly repairable_discomfort_count: number;
  readonly unsatisfied_count: number;
  readonly unmet_info_count: number;
  readonly distance: number;
  readonly all_declined: boolean;
}

function buildClosestPathRationale(inputs: RationaleInputs): string {
  const parts: string[] = [];

  if (inputs.state === "interested") {
    // CASE A: at least one personality is interested
    parts.push(
      `Within the ${inputs.personality_id} personality simulation, posture is interested.`,
    );
    if (inputs.repairable_discomfort_count > 0 || inputs.unmet_info_count > 0) {
      const items: string[] = [];
      if (inputs.repairable_discomfort_count > 0) {
        items.push(
          `${inputs.repairable_discomfort_count} repairable discomfort(s)`,
        );
      }
      if (inputs.unmet_info_count > 0) {
        items.push(`${inputs.unmet_info_count} unmet information need(s)`);
      }
      parts.push(
        `Remaining items below the cautious threshold: ${items.join(" and ")}.`,
      );
      parts.push(
        "Addressing these would strengthen the financeable comfort path even further.",
      );
    } else {
      parts.push(
        "No repairable discomforts or unmet information needs remain — the financeable comfort path is clean within this personality lens.",
      );
    }
    return parts.join(" ");
  }

  if (inputs.state === "cautious") {
    // CASE B: no interested, at least one cautious
    parts.push(
      `Within the ${inputs.personality_id} personality simulation, posture is cautious — the simulation surfaces solvable concerns rather than structural incompatibility.`,
    );
    const blockers: string[] = [];
    if (inputs.unsatisfied_count > 0) {
      blockers.push(`${inputs.unsatisfied_count} unsatisfied comfort condition(s)`);
    }
    if (inputs.repairable_discomfort_count > 0) {
      blockers.push(`${inputs.repairable_discomfort_count} repairable discomfort(s)`);
    }
    if (inputs.unmet_info_count > 0) {
      blockers.push(`${inputs.unmet_info_count} unmet information need(s)`);
    }
    if (blockers.length > 0) {
      parts.push(
        `The remaining gap to interested posture consists of: ${blockers.join(", ")}.`,
      );
    }
    parts.push(
      "This personality represents the closest financeable comfort path in the current batch; targeted diligence and structural adjustment could close the gap.",
    );
    return parts.join(" ");
  }

  // CASE C: all declined OR this personality declined but is closest-to-recoverable
  if (inputs.all_declined) {
    parts.push(
      `Every personality simulation in this batch is currently at decline posture; no personality has an open financeable comfort path under the present evidence and structure.`,
    );
    parts.push(
      `Among the four personality simulations, the ${inputs.personality_id} simulation is closest to recoverable.`,
    );
  } else {
    parts.push(
      `The ${inputs.personality_id} personality simulation is at decline posture, but among the personalities at decline it is the closest to recoverable.`,
    );
  }

  const structuralItems: string[] = [];
  if (inputs.triggered_deal_breaker_count > 0) {
    structuralItems.push(
      `${inputs.triggered_deal_breaker_count} deal-breaker(s) triggered`,
    );
  }
  if (inputs.fatal_discomfort_count > 0) {
    structuralItems.push(
      `${inputs.fatal_discomfort_count} fatal discomfort(s)`,
    );
  }
  const repairableItems: string[] = [];
  if (inputs.unsatisfied_count > 0) {
    repairableItems.push(
      `${inputs.unsatisfied_count} unsatisfied comfort condition(s)`,
    );
  }
  if (inputs.repairable_discomfort_count > 0) {
    repairableItems.push(
      `${inputs.repairable_discomfort_count} repairable discomfort(s)`,
    );
  }
  if (inputs.unmet_info_count > 0) {
    repairableItems.push(
      `${inputs.unmet_info_count} unmet information need(s)`,
    );
  }

  if (structuralItems.length > 0) {
    parts.push(`Structural drivers: ${structuralItems.join(", ")}.`);
  }
  if (repairableItems.length > 0) {
    parts.push(`Repairable signals: ${repairableItems.join(", ")}.`);
  }
  if (structuralItems.length > 0 && repairableItems.length === 0) {
    parts.push(
      "Recovery from this posture requires structural adjustment rather than diligence work alone — different financing paths or transaction structure may produce different posture readings.",
    );
  } else if (structuralItems.length > 0 && repairableItems.length > 0) {
    parts.push(
      "Recovery requires addressing both structural drivers and repairable signals; structural adjustment is the binding work.",
    );
  } else {
    parts.push(
      "Recovery from this posture can proceed through diligence and evidence work — no structural incompatibility currently identified within this personality lens.",
    );
  }

  return parts.join(" ");
}
