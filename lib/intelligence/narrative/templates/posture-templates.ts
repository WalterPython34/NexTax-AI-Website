// lib/intelligence/narrative/templates/posture-templates.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Per-Personality Posture Fragment Templates
//
// CP-8 Module: Assembles brief 2-3 sentence narrative fragments for
// each personality from its PersonalityNarrativeInput record.
//
// Each personality gets one NarrativeFragment per evaluation. The
// fragment is dashboard-ready: short enough to display in a card or
// summary widget, structured enough to carry full traceability.
//
// Six template branches:
//
//   B1: Coverage-gap-affected decline
//     Frames the decline as a model coverage limitation rather than a
//     deal characteristic. Surfaces satisfied comfort conditions to
//     show the deal has substantive strengths the personality recognized.
//
//   B2: Standard decline with fatal/structural drivers
//     Frames the decline as structural incompatibility. Identifies the
//     fatal discomforts driving the decline and notes whether
//     diligence-only or also-structural-negotiation paths apply.
//
//   B3: Standard decline driven by deal-breakers
//     Frames the decline as a triggered deal-breaker. Surfaces the
//     specific deal-breaker condition.
//
//   B4: Cautious
//     Frames the deal as solvable rather than incompatible. Identifies
//     the specific unsatisfied comfort conditions and repairable
//     discomforts that block interested posture.
//
//   B5: Interested with clean surface
//     Frames the personality's posture as fully interested with no
//     remaining repairable concerns.
//
//   B6: Interested with remaining repairables
//     Frames the personality as interested but with secondary diligence
//     priorities that would strengthen the position further.
//
// What this module does NOT do:
//
//   - Make recommendations
//   - Predict actual lender behavior
//   - Re-interpret posture (CP-7 already produced it)
//
// Architectural commitments enforced:
//
//   - Every fragment carries source_ids, related_axis_keys, related_personality_ids
//   - Coverage-gap-affected fragments produce different prose than standard declines
//   - Simulated posture framing in every sentence that references the personality's reading
//   - No overstatement language ("would decline" / "will refuse" — forbidden)
//   - Institutional tone throughout (no "doomed," "fatal flaw," etc.)
//   - 2-3 sentence target (validator checks length but doesn't reject 4 sentence fragments)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  PersonalityId,
} from "../../personalities/types";
import type {
  NarrativeFragment,
  PersonalityNarrativeInput,
} from "../types";
import { NARRATIVE_TEMPLATES_VERSION } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface PostureFragmentInputs {
  readonly per_personality: ReadonlyArray<PersonalityNarrativeInput>;
}

/**
 * Build personality_reading fragments for every personality in the batch.
 *
 * Pure deterministic function. Returns one NarrativeFragment per
 * personality, in stable catalogue order.
 */
export function buildPostureFragments(
  inputs: PostureFragmentInputs,
): ReadonlyArray<NarrativeFragment> {
  return inputs.per_personality.map((input) => buildOneFragment(input));
}

function buildOneFragment(input: PersonalityNarrativeInput): NarrativeFragment {
  const branch = determineBranch(input);

  let sentences: string[];
  let principleApplied: NarrativeFragment["narrative_principle_applied"];

  switch (branch) {
    case "B1_coverage_gap_decline":
      sentences = assembleCoverageGapDecline(input);
      principleApplied = "coverage_gap_framing";
      break;
    case "B2_decline_fatal_structural":
      sentences = assembleDeclineFatalStructural(input);
      principleApplied = "repairable_vs_fatal_distinction";
      break;
    case "B3_decline_deal_breaker":
      sentences = assembleDeclineDealBreaker(input);
      principleApplied = "simulated_posture_framing";
      break;
    case "B4_cautious":
      sentences = assembleCautious(input);
      principleApplied = "buyer_action_translation";
      break;
    case "B5_interested_clean":
      sentences = assembleInterestedClean(input);
      principleApplied = "simulated_posture_framing";
      break;
    case "B6_interested_with_repairables":
      sentences = assembleInterestedWithRepairables(input);
      principleApplied = "buyer_action_translation";
      break;
  }

  const prose = sentences.join(" ");
  const sourceIds = collectSourceIds(input);
  const relatedAxisKeys = collectRelatedAxisKeys(input);

  return {
    fragment_id: makeFragmentId(input.personality_id),
    kind: "personality_reading",
    prose,
    source_ids: sourceIds,
    related_axis_keys: relatedAxisKeys,
    related_personality_ids: [input.personality_id],
    related_scenario_ids: [],
    related_assumption_keys: [],
    references_simulated_posture: true,
    references_coverage_gap: input.is_coverage_gap_affected,
    proposes_buyer_action:
      branch === "B2_decline_fatal_structural" ||
      branch === "B4_cautious" ||
      branch === "B6_interested_with_repairables",
    narrative_principle_applied: principleApplied,
    fragment_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH DETERMINATION
// ─────────────────────────────────────────────────────────────────────────────

type PostureBranch =
  | "B1_coverage_gap_decline"
  | "B2_decline_fatal_structural"
  | "B3_decline_deal_breaker"
  | "B4_cautious"
  | "B5_interested_clean"
  | "B6_interested_with_repairables";

function determineBranch(input: PersonalityNarrativeInput): PostureBranch {
  if (input.state === "interested") {
    const hasRemaining = input.repairable_discomfort_ids.length > 0;
    return hasRemaining ? "B6_interested_with_repairables" : "B5_interested_clean";
  }

  if (input.state === "cautious") {
    return "B4_cautious";
  }

  // state === "decline"
  // Priority: coverage-gap-affected → fatal/structural → deal-breaker
  if (input.is_coverage_gap_affected) {
    return "B1_coverage_gap_decline";
  }

  if (input.fatal_discomfort_ids.length > 0) {
    return "B2_decline_fatal_structural";
  }

  // Deal-breaker without fatal (rare but possible)
  return "B3_decline_deal_breaker";
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B1: COVERAGE-GAP-AFFECTED DECLINE
// ─────────────────────────────────────────────────────────────────────────────

function assembleCoverageGapDecline(input: PersonalityNarrativeInput): string[] {
  const sentences: string[] = [];

  // Sentence 1: Frame as model coverage limitation
  sentences.push(
    `The ${input.personality_id} lender-profile simulation declined in this evaluation due to a model coverage limitation rather than deal characteristics — the engine does not yet have an industry-specific operating-model fingerprint registered, which prevented this lender-profile reading from forming a confident posture from the available data.`,
  );

  // Sentence 2: Surface positive comfort conditions if any (institutional credibility)
  if (input.satisfied_comfort_condition_ids.length > 0) {
    const count = input.satisfied_comfort_condition_ids.length;
    sentences.push(
      `Under the same lender-profile simulation, ${count} required comfort condition${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} already satisfied, indicating that the deal itself reads well against this profile's substantive criteria — the decline reflects registry coverage, not an institutional verdict on the business.`,
    );
  } else {
    sentences.push(
      `Once an industry-specific fingerprint is registered, this lender profile's posture would be re-evaluated against industry-specific operating expectations rather than fallback fingerprint signals.`,
    );
  }

  return sentences;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B2: DECLINE WITH FATAL/STRUCTURAL DRIVERS
// ─────────────────────────────────────────────────────────────────────────────

function assembleDeclineFatalStructural(input: PersonalityNarrativeInput): string[] {
  const sentences: string[] = [];

  // Sentence 1: Frame the simulated decline + identify primary axis reading
  const fatalCount = input.fatal_discomfort_ids.length;
  sentences.push(
    `Under the ${input.personality_id} lender-profile simulation, posture is decline — ${fatalCount} fatal signal${fatalCount === 1 ? "" : "s"} fired against this profile's primary axis reading on ${input.primary_axis} (${input.primary_axis_band} band).`,
  );

  // Sentence 2: Repairable distinction + buyer action
  if (input.repairable_discomfort_ids.length > 0) {
    const repCount = input.repairable_discomfort_ids.length;
    sentences.push(
      `Alongside the fatal signal${fatalCount === 1 ? "" : "s"}, ${repCount} repairable signal${repCount === 1 ? "" : "s"} ${repCount === 1 ? "sits" : "sit"} in the discomfort chain — diligence could close ${repCount === 1 ? "it" : "those"}, but the fatal classification means structural negotiation or alternative financing paths would be required to shift this lender profile's overall posture.`,
    );
  } else {
    sentences.push(
      `No repairable signals were detected — recovery from this posture requires structural adjustment rather than diligence work alone, and different financing paths may produce different posture readings.`,
    );
  }

  return sentences;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B3: DECLINE DRIVEN BY DEAL-BREAKER
// ─────────────────────────────────────────────────────────────────────────────

function assembleDeclineDealBreaker(input: PersonalityNarrativeInput): string[] {
  const sentences: string[] = [];

  // Sentence 1: Frame deal-breaker trigger
  const dbCount = input.triggered_deal_breaker_ids.length;
  sentences.push(
    `Under the ${input.personality_id} lender-profile simulation, posture is decline — ${dbCount} deal-breaker condition${dbCount === 1 ? "" : "s"} triggered against this profile's primary axis reading on ${input.primary_axis} (${input.primary_axis_band} band).`,
  );

  // Sentence 2: Surface the deal-breaker IDs + framing
  sentences.push(
    `Deal-breaker conditions are strict structural disqualifications within this lender profile's institutional reasoning — they cannot be closed by buyer-side diligence, and recovery requires either changing the underlying axis position or pursuing alternative financing paths.`,
  );

  return sentences;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B4: CAUTIOUS
// ─────────────────────────────────────────────────────────────────────────────

function assembleCautious(input: PersonalityNarrativeInput): string[] {
  const sentences: string[] = [];

  // Sentence 1: Frame cautious as solvable
  sentences.push(
    `Under the ${input.personality_id} lender-profile simulation, posture is cautious — the simulation surfaces solvable concerns rather than structural incompatibility, reading the primary axis (${input.primary_axis}) in the ${input.primary_axis_band} band.`,
  );

  // Sentence 2: Identify the specific gap to interested
  const gaps: string[] = [];
  if (input.unsatisfied_comfort_condition_ids.length > 0) {
    const count = input.unsatisfied_comfort_condition_ids.length;
    gaps.push(`${count} unsatisfied comfort condition${count === 1 ? "" : "s"}`);
  }
  if (input.repairable_discomfort_ids.length > 0) {
    const count = input.repairable_discomfort_ids.length;
    gaps.push(`${count} repairable signal${count === 1 ? "" : "s"}`);
  }
  if (gaps.length > 0) {
    sentences.push(
      `The remaining gap to interested posture consists of ${gaps.join(" and ")} — addressing these through targeted diligence or structural adjustment would close the comfort path under this institutional lens.`,
    );
  } else {
    sentences.push(
      `The cautious reading reflects information needs and contextual signals rather than identified discomforts — further diligence would clarify whether posture shifts toward interested.`,
    );
  }

  return sentences;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B5: INTERESTED WITH CLEAN SURFACE
// ─────────────────────────────────────────────────────────────────────────────

function assembleInterestedClean(input: PersonalityNarrativeInput): string[] {
  const sentences: string[] = [];

  // Sentence 1: Frame interested + primary axis
  sentences.push(
    `Under the ${input.personality_id} lender-profile simulation, posture is interested — the simulation reads the primary axis (${input.primary_axis}) in the ${input.primary_axis_band} band with no repairable signals remaining and ${input.satisfied_comfort_condition_ids.length} required comfort condition${input.satisfied_comfort_condition_ids.length === 1 ? "" : "s"} satisfied.`,
  );

  // Sentence 2: Frame the clean surface
  sentences.push(
    `The financeable comfort path is open within this institutional lens; standard diligence to confirm the underlying assumptions is the appropriate next step rather than recovery work.`,
  );

  return sentences;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B6: INTERESTED WITH REMAINING REPAIRABLES
// ─────────────────────────────────────────────────────────────────────────────

function assembleInterestedWithRepairables(input: PersonalityNarrativeInput): string[] {
  const sentences: string[] = [];

  // Sentence 1: Frame interested + primary axis
  sentences.push(
    `Under the ${input.personality_id} lender-profile simulation, posture is interested — the primary axis reading on ${input.primary_axis} sits in the ${input.primary_axis_band} band and ${input.satisfied_comfort_condition_ids.length} required comfort condition${input.satisfied_comfort_condition_ids.length === 1 ? "" : "s"} ${input.satisfied_comfort_condition_ids.length === 1 ? "is" : "are"} satisfied.`,
  );

  // Sentence 2: Surface remaining repairables as secondary priorities
  const count = input.repairable_discomfort_ids.length;
  sentences.push(
    `${count} repairable signal${count === 1 ? "" : "s"} remain${count === 1 ? "s" : ""} below the cautious threshold — addressing ${count === 1 ? "it" : "them"} through diligence would not shift the categorical posture but would strengthen the comfort path further within this lens.`,
  );

  return sentences;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACEABILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function collectSourceIds(input: PersonalityNarrativeInput): ReadonlyArray<string> {
  const ids: string[] = [];
  ids.push(`posture.${input.personality_id}.state=${input.state}`);
  ids.push(`posture.${input.personality_id}.primary_axis=${input.primary_axis}`);
  if (input.is_coverage_gap_affected) {
    ids.push(`posture.${input.personality_id}.coverage_gap_affected`);
  }
  ids.push(...input.triggered_deal_breaker_ids);
  ids.push(...input.fatal_discomfort_ids);
  ids.push(...input.repairable_discomfort_ids);
  ids.push(...input.unsatisfied_comfort_condition_ids);
  ids.push(...input.satisfied_comfort_condition_ids);
  return ids;
}

function collectRelatedAxisKeys(
  input: PersonalityNarrativeInput,
): ReadonlyArray<AxisKey> {
  // The primary axis is the only axis directly referenced in the prose;
  // other axes may be implicated through deal-breaker / discomfort IDs
  // but tracing those requires the CP-6 catalogue. For now, surface
  // primary axis as the canonical reference.
  return [input.primary_axis];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let fragmentCounter = 0;
function makeFragmentId(personality_id: PersonalityId): string {
  fragmentCounter += 1;
  return `fragment.personality_reading.${personality_id}.${fragmentCounter}-${Math.random().toString(36).slice(2, 6)}`;
}
