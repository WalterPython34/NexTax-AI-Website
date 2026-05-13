// lib/intelligence/narrative/templates/headline-templates.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Executive Headline Templates
//
// CP-8 Module: Assembles the 4-6 sentence executive headline from
// structured synthesis findings.
//
// The headline is the buyer's top-level "what this deal is really
// about" read. It synthesizes:
//
//   - Binding constraint (the central structural issue)
//   - Closest path (the most plausible financing route)
//   - Coverage gap (model coverage framing when applicable)
//   - Structural concerns (negotiable vs fundamental)
//   - Top assumption concentration (where underwriting weight sits)
//
// Headline is BUILT, not GENERATED. Templates assemble sentences from
// synthesis findings deterministically. Same inputs → same headline.
//
// The headline structure is case-driven. Five primary cases:
//
//   CASE H1: Coverage gap dominant — the binding constraint is a model
//     coverage limitation rather than a deal characteristic. The
//     headline leads with that distinction so the buyer doesn't read
//     personality declines as institutional verdicts.
//
//   CASE H2: Clean deal — at least one personality is interested with
//     no fatal discomforts AND no fundamental structural concerns. The
//     headline frames the deal as financeable and surfaces secondary
//     diligence priorities.
//
//   CASE H3: All decline — no personality has open financeable comfort
//     path. The headline frames the structural reality, identifies
//     closest-to-recoverable personality, and surfaces the binding
//     constraint without dramatic language.
//
//   CASE H4: Partial decline with closest interested or cautious path —
//     some personalities reached interested or cautious posture. The
//     headline identifies the most plausible financing path, the
//     remaining gap to close it, and the binding constraint elsewhere.
//
//   CASE H5: All cautious — no personality declined but none reached
//     interested. The deal is universally solvable but no path is
//     currently open. The headline frames the cluster of unsatisfied
//     conditions.
//
// What this module does NOT do:
//
//   - Free-form prose generation
//   - Probability or recommendation language
//   - Re-interpret synthesis findings
//
// Architectural commitments enforced in templates:
//
//   - NEVER overstates simulated posture ("would decline" forbidden)
//   - Coverage gap framing applied when CoverageGapFinding flags it
//   - Closest path always surfaced (even when all_declined=true)
//   - Institutional tone (no "doomed," "disaster," etc.)
//   - 4-6 sentences enforced; sentence_count returned on the headline
//   - headline_source_synthesis_keys carries traceability
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  PersonalityId,
} from "../../personalities/types";
import type {
  AssumptionConcentrationFinding,
  BindingConstraintFinding,
  ClosestPathFinding,
  CoverageGapFinding,
  NarrativeHeadline,
  PersonalityNarrativeInput,
  StructuralConcern,
} from "../types";
import { NARRATIVE_TEMPLATES_VERSION } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface HeadlineAssemblyInputs {
  readonly binding_constraint: BindingConstraintFinding | null;
  readonly closest_path: ClosestPathFinding | null;
  readonly coverage_gap: CoverageGapFinding;
  readonly structural_concerns: ReadonlyArray<StructuralConcern>;
  readonly per_personality: ReadonlyArray<PersonalityNarrativeInput>;
  readonly top_assumption_concentrations: ReadonlyArray<AssumptionConcentrationFinding>;
}

/**
 * Build the executive headline. Always returns a NarrativeHeadline; the
 * empty-batch case (which would produce no headline) is handled
 * upstream by the narrative engine.
 *
 * The case dispatch determines structure; each case branch assembles a
 * 4-6 sentence headline from the synthesis findings.
 */
export function buildExecutiveHeadline(
  inputs: HeadlineAssemblyInputs,
): NarrativeHeadline {
  const headlineCase = determineHeadlineCase(inputs);

  let sentences: string[];
  let synthesisKeysUsed: string[];

  switch (headlineCase) {
    case "H1_coverage_gap_dominant":
      ({ sentences, synthesisKeysUsed } = assembleCoverageGapHeadline(inputs));
      break;
    case "H2_clean":
      ({ sentences, synthesisKeysUsed } = assembleCleanHeadline(inputs));
      break;
    case "H3_all_decline":
      ({ sentences, synthesisKeysUsed } = assembleAllDeclineHeadline(inputs));
      break;
    case "H4_partial_decline":
      ({ sentences, synthesisKeysUsed } = assemblePartialDeclineHeadline(inputs));
      break;
    case "H5_all_cautious":
      ({ sentences, synthesisKeysUsed } = assembleAllCautiousHeadline(inputs));
      break;
  }

  const prose = sentences.join(" ");

  // Collect referenced axis keys + personality IDs from the contributing findings
  const relatedAxisKeys = collectRelatedAxisKeys(inputs);
  const relatedPersonalityIds = collectRelatedPersonalityIds(inputs);

  return {
    headline_id: makeHeadlineId(),
    prose,
    headline_source_synthesis_keys: synthesisKeysUsed,
    related_axis_keys: relatedAxisKeys,
    related_personality_ids: relatedPersonalityIds,
    sentence_count: sentences.length,
    headline_version: NARRATIVE_TEMPLATES_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE DETERMINATION
// ─────────────────────────────────────────────────────────────────────────────

type HeadlineCase =
  | "H1_coverage_gap_dominant"
  | "H2_clean"
  | "H3_all_decline"
  | "H4_partial_decline"
  | "H5_all_cautious";

function determineHeadlineCase(inputs: HeadlineAssemblyInputs): HeadlineCase {
  const states = inputs.per_personality.map((p) => p.state);
  const interestedCount = states.filter((s) => s === "interested").length;
  const cautiousCount = states.filter((s) => s === "cautious").length;
  const declineCount = states.filter((s) => s === "decline").length;
  const totalPersonalities = states.length;

  // CASE H1: Coverage gap is the dominant driver
  // (the binding constraint is anchored on coverage gap markers, OR
  // half or more of the personalities are coverage-gap-affected)
  const coverageGapAffectedCount = inputs.per_personality.filter(
    (p) => p.is_coverage_gap_affected,
  ).length;
  if (
    inputs.coverage_gap.is_coverage_gap &&
    coverageGapAffectedCount >= Math.ceil(totalPersonalities / 2)
  ) {
    return "H1_coverage_gap_dominant";
  }

  // CASE H2: Clean deal — at least one interested, no fundamental concerns
  // (fundamental concerns being structural concerns where any contributing
  // discomfort is fatal AND not covered by the binding-constraint repairability)
  const hasFundamentalConcern = inputs.structural_concerns.some((sc) =>
    isFundamentalConcern(sc),
  );
  if (interestedCount > 0 && !hasFundamentalConcern && declineCount === 0) {
    return "H2_clean";
  }

  // CASE H3: All declined
  if (declineCount === totalPersonalities) {
    return "H3_all_decline";
  }

  // CASE H5: All cautious (no interested, no declined)
  if (cautiousCount === totalPersonalities) {
    return "H5_all_cautious";
  }

  // CASE H4: Partial decline (mixed posture with some declined)
  return "H4_partial_decline";
}

function isFundamentalConcern(sc: StructuralConcern): boolean {
  // Check the why_structural prose for the fundamental marker phrase
  // (set by structural-concerns.ts when severity = "fundamental")
  return sc.why_structural.toLowerCase().includes("fundamental rather than negotiable");
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE H1: COVERAGE GAP DOMINANT
// ─────────────────────────────────────────────────────────────────────────────

function assembleCoverageGapHeadline(
  inputs: HeadlineAssemblyInputs,
): { sentences: string[]; synthesisKeysUsed: string[] } {
  const sentences: string[] = [];
  const keys: string[] = ["coverage_gap"];

  // Sentence 1: Frame the coverage gap as the central driver
  sentences.push(
    `The dominant signal in this evaluation is a model coverage limitation rather than a deal characteristic.`,
  );

  // Sentence 2: Explain what the coverage gap means
  const affectedCount = inputs.coverage_gap.affected_personalities.length;
  const personalityFraming = affectedCount === 1
    ? "1 personality simulation"
    : `${affectedCount} personality simulations`;
  sentences.push(
    `${capitalize(personalityFraming)} could not form confident posture because the engine does not yet have an industry-specific operating-model fingerprint registered for this business type; the resulting personality readings reflect registry coverage rather than institutional verdicts on the business.`,
  );

  // Sentence 3: Surface the non-coverage-gap-driven posture readings if any
  const nonGapAffected = inputs.per_personality.filter((p) => !p.is_coverage_gap_affected);
  const nonGapInterested = nonGapAffected.filter((p) => p.state === "interested");
  if (nonGapInterested.length > 0) {
    const ids = nonGapInterested.map((p) => p.personality_id);
    sentences.push(
      `Outside the coverage-gap-affected simulations, ${formatPersonalityList(ids)} reached interested posture, indicating the underlying axis truth is workable when read through personalities whose triggers do not require industry-specific fingerprint coverage.`,
    );
    keys.push("per_personality");
  } else {
    sentences.push(
      `Outside the coverage-gap-affected simulations, posture readings reflect the deal's axis truth directly and can be read on their own merits independent of the registry limitation.`,
    );
    keys.push("per_personality");
  }

  // Sentence 4: Recommendation framing
  sentences.push(
    `Resolution path for the coverage-gap-affected personalities is registry expansion rather than buyer-side diligence; once an industry-specific fingerprint is registered, those personality postures would be re-evaluated against industry-specific operating expectations.`,
  );

  // Optional sentence 5: Top assumption concentration if it indicates a workable underwriting surface
  if (inputs.top_assumption_concentrations.length > 0) {
    const top = inputs.top_assumption_concentrations[0];
    sentences.push(
      `Underwriting weight in this evaluation concentrates on the ${top.assumption_name} assumption; that concentration is a deal-side diligence priority regardless of the registry limitation.`,
    );
    keys.push("top_assumption_concentrations");
  }

  return { sentences, synthesisKeysUsed: keys };
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE H2: CLEAN DEAL
// ─────────────────────────────────────────────────────────────────────────────

function assembleCleanHeadline(
  inputs: HeadlineAssemblyInputs,
): { sentences: string[]; synthesisKeysUsed: string[] } {
  const sentences: string[] = [];
  const keys: string[] = ["per_personality"];

  const interestedPersonalities = inputs.per_personality
    .filter((p) => p.state === "interested")
    .map((p) => p.personality_id);

  // Sentence 1: Frame the deal as financeable
  sentences.push(
    `The deal reads as financeable across the personality simulations: ${formatPersonalityList(interestedPersonalities)} reached interested posture, meaning at least one personality simulation sees a complete financeable comfort path under the current evidence and structure.`,
  );

  // Sentence 2: Identify the closest interested path detail (always emit; closest_path may be null)
  if (inputs.closest_path && inputs.closest_path.current_state === "interested") {
    sentences.push(
      `Among the interested simulations, the ${inputs.closest_path.personality_id} personality reading has the cleanest remaining surface.`,
    );
    keys.push("closest_path");
  } else if (interestedPersonalities.length > 0) {
    sentences.push(
      `Among the interested personality simulations, posture is clean across the modeled lenses with no fatal discomforts in any reading.`,
    );
  } else {
    sentences.push(
      `Within the personality simulations evaluated, no structural incompatibilities surfaced in this batch.`,
    );
  }

  // Sentence 3: Surface secondary diligence priorities if any repairable concerns remain (always emit)
  const totalRepairables = inputs.per_personality.reduce(
    (acc, p) => acc + p.repairable_discomfort_ids.length,
    0,
  );
  if (totalRepairables > 0) {
    sentences.push(
      `Secondary diligence priorities exist across the personality simulations — ${totalRepairables} repairable discomfort signal${totalRepairables === 1 ? "" : "s"} remain below the cautious threshold but would strengthen the financeable comfort path further.`,
    );
    keys.push("per_personality");
  } else {
    sentences.push(
      `No repairable discomfort signals remain across the personality simulations; the financeable comfort path reads clean under the modeled lenses.`,
    );
  }

  // Sentence 4: Top assumption concentration framing (institutional weight)
  if (inputs.top_assumption_concentrations.length > 0) {
    const top = inputs.top_assumption_concentrations[0];
    sentences.push(
      `Underwriting weight concentrates on the ${top.assumption_name} assumption; this assumption is well-positioned in the current deal structure but remains the natural focus of diligence prioritization across the personality simulations.`,
    );
    keys.push("top_assumption_concentrations");
  } else {
    sentences.push(
      `Underwriting weight distributes across the assumption surface without single-assumption concentration; diligence prioritization can target the highest-impact items rather than defending a concentrated assumption set.`,
    );
  }

  // Sentence 5: Buyer-action framing (always emit for H2)
  sentences.push(
    `The buyer's next step is not to address structural concerns but to confirm the underlying assumptions through standard diligence — the financeable comfort path is open across at least one personality simulation lens.`,
  );

  return { sentences, synthesisKeysUsed: keys };
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE H3: ALL DECLINE
// ─────────────────────────────────────────────────────────────────────────────

function assembleAllDeclineHeadline(
  inputs: HeadlineAssemblyInputs,
): { sentences: string[]; synthesisKeysUsed: string[] } {
  const sentences: string[] = [];
  const keys: string[] = ["per_personality"];

  // Sentence 1: Frame the institutional reality without drama
  sentences.push(
    `No personality simulation in this batch currently reads a financeable comfort path; the deal does not yet present a workable institutional posture across the modeled lenses under the present evidence and structure.`,
  );

  // Sentence 2: Identify the binding constraint
  if (inputs.binding_constraint) {
    const bc = inputs.binding_constraint;
    sentences.push(
      `The binding constraint is anchored on ${bc.axis} (${bc.band} band) and classified as ${bc.repairability}; ${bc.repairability === "repairable" ? "targeted diligence or evidence upgrade could shift the underlying reading" : "structural negotiation or alternative financing paths may be required to produce different posture readings"}.`,
    );
    keys.push("binding_constraint");
  }

  // Sentence 3: Surface closest-to-recoverable path
  if (inputs.closest_path) {
    sentences.push(
      `Among the four personality simulations, the ${inputs.closest_path.personality_id} reading is closest to recoverable, carrying ${inputs.closest_path.fatal_discomfort_count} fatal discomfort${inputs.closest_path.fatal_discomfort_count === 1 ? "" : "s"} and ${inputs.closest_path.repairable_discomfort_count} repairable signal${inputs.closest_path.repairable_discomfort_count === 1 ? "" : "s"} — a less concentrated structural drift than the other simulations.`,
    );
    keys.push("closest_path");
  }

  // Sentence 4: Translate into buyer action via top assumption concentration
  if (inputs.top_assumption_concentrations.length > 0) {
    const top = inputs.top_assumption_concentrations[0];
    if (top.unfavorable_count > 0 && top.favorable_count === 0) {
      sentences.push(
        `The deal's underwriting weight concentrates on the ${top.assumption_name} assumption with predominantly unfavorable dependent conclusions; substantiation work on this single assumption would cascade favorable shifts across multiple personality simulations simultaneously.`,
      );
    } else {
      sentences.push(
        `The deal's underwriting weight concentrates on the ${top.assumption_name} assumption; diligence work on this assumption is the highest-leverage action available to the buyer.`,
      );
    }
    keys.push("top_assumption_concentrations");
  }

  // Optional sentence 5: Structural concern context if a fundamental concern exists
  const fundamentalConcerns = inputs.structural_concerns.filter(isFundamentalConcern);
  if (fundamentalConcerns.length > 0) {
    sentences.push(
      `The buyer should treat ${fundamentalConcerns.length} structural concern${fundamentalConcerns.length === 1 ? "" : "s"} as fundamental rather than negotiable: structure changes alone are unlikely to produce different posture readings within the affected personalities.`,
    );
    keys.push("structural_concerns");
  }

  return { sentences, synthesisKeysUsed: keys };
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE H4: PARTIAL DECLINE
// ─────────────────────────────────────────────────────────────────────────────

function assemblePartialDeclineHeadline(
  inputs: HeadlineAssemblyInputs,
): { sentences: string[]; synthesisKeysUsed: string[] } {
  const sentences: string[] = [];
  const keys: string[] = ["per_personality"];

  const interestedIds = inputs.per_personality.filter((p) => p.state === "interested").map((p) => p.personality_id);
  const cautiousIds = inputs.per_personality.filter((p) => p.state === "cautious").map((p) => p.personality_id);
  const declineIds = inputs.per_personality.filter((p) => p.state === "decline").map((p) => p.personality_id);

  // Sentence 1: Frame the mixed-posture reality with explicit personality simulation framing
  const interestedClause = interestedIds.length > 0
    ? `${formatPersonalityList(interestedIds)} reached interested posture`
    : "no personality simulation reached interested posture";
  const cautiousClause = cautiousIds.length > 0
    ? `${formatPersonalityList(cautiousIds)} reached cautious posture`
    : null;
  const clauses = [interestedClause];
  if (cautiousClause) clauses.push(cautiousClause);
  clauses.push(`${formatPersonalityList(declineIds)} declined`);

  sentences.push(
    `Posture readings are mixed across the personality simulations: ${clauses.join(", ")} — meaning the deal's financeability depends materially on which institutional lens reads it.`,
  );

  // Sentence 2: Identify the closest path and framing
  if (inputs.closest_path) {
    const cp = inputs.closest_path;
    if (cp.current_state === "interested") {
      sentences.push(
        `The most plausible financing path is the ${cp.personality_id} reading, which sits cleanly at interested posture and represents an open financeable comfort path.`,
      );
    } else if (cp.current_state === "cautious") {
      sentences.push(
        `The most plausible financing path is the ${cp.personality_id} reading at cautious posture: ${cp.unsatisfied_required_count} unsatisfied comfort condition${cp.unsatisfied_required_count === 1 ? "" : "s"} and ${cp.repairable_discomfort_count} repairable discomfort${cp.repairable_discomfort_count === 1 ? "" : "s"} sit between the deal and interested.`,
      );
    } else {
      sentences.push(
        `Most plausible recovery path is the ${cp.personality_id} reading, currently at decline but closest to recoverable among the declining simulations.`,
      );
    }
    keys.push("closest_path");
  }

  // Sentence 3: Identify the binding constraint among the decliners
  if (inputs.binding_constraint) {
    const bc = inputs.binding_constraint;
    sentences.push(
      `Among the declining simulations, the binding constraint is anchored on ${bc.axis} (${bc.band} band), classified as ${bc.repairability} — ${bc.repairability === "repairable" ? "buyer-side diligence may shift this reading" : "structural negotiation or alternative financing paths may be required"}.`,
    );
    keys.push("binding_constraint");
  }

  // Sentence 4: Translate into action via top assumption
  if (inputs.top_assumption_concentrations.length > 0) {
    const top = inputs.top_assumption_concentrations[0];
    sentences.push(
      `Underwriting weight concentrates on the ${top.assumption_name} assumption; diligence on this assumption is the highest-leverage action to expand the set of personalities reading the deal as financeable.`,
    );
    keys.push("top_assumption_concentrations");
  }

  return { sentences, synthesisKeysUsed: keys };
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE H5: ALL CAUTIOUS
// ─────────────────────────────────────────────────────────────────────────────

function assembleAllCautiousHeadline(
  inputs: HeadlineAssemblyInputs,
): { sentences: string[]; synthesisKeysUsed: string[] } {
  const sentences: string[] = [];
  const keys: string[] = ["per_personality"];

  // Sentence 1: Frame the universal-solvability reality
  sentences.push(
    `Every personality simulation in this batch reads the deal as cautious — solvable rather than structurally incompatible, but with no personality currently presenting an open financeable comfort path.`,
  );

  // Sentence 2: Identify the closest path (the personality with shortest remaining gap)
  if (inputs.closest_path) {
    const cp = inputs.closest_path;
    sentences.push(
      `The most plausible path forward is the ${cp.personality_id} reading: ${cp.unsatisfied_required_count} unsatisfied comfort condition${cp.unsatisfied_required_count === 1 ? "" : "s"} and ${cp.repairable_discomfort_count} repairable discomfort${cp.repairable_discomfort_count === 1 ? "" : "s"} sit between the deal and interested posture under this institutional lens.`,
    );
    keys.push("closest_path");
  }

  // Sentence 3: Identify the binding constraint
  if (inputs.binding_constraint) {
    const bc = inputs.binding_constraint;
    sentences.push(
      `The shared binding constraint is anchored on ${bc.axis} (${bc.band} band), classified as ${bc.repairability}.`,
    );
    keys.push("binding_constraint");
  }

  // Sentence 4: Action framing
  if (inputs.top_assumption_concentrations.length > 0) {
    const top = inputs.top_assumption_concentrations[0];
    sentences.push(
      `Underwriting weight concentrates on the ${top.assumption_name} assumption; substantiation here is the highest-leverage action to convert cautious readings into interested ones across multiple personality simulations.`,
    );
    keys.push("top_assumption_concentrations");
  }

  return { sentences, synthesisKeysUsed: keys };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let headlineCounter = 0;
function makeHeadlineId(): string {
  headlineCounter += 1;
  return `headline-${Date.now()}-${headlineCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatPersonalityList(ids: ReadonlyArray<string>): string {
  if (ids.length === 0) return "no personality";
  if (ids.length === 1) return `the ${ids[0]} simulation`;
  if (ids.length === 2) return `the ${ids[0]} and ${ids[1]} simulations`;
  const allButLast = ids.slice(0, -1).join(", ");
  const last = ids[ids.length - 1];
  return `the ${allButLast}, and ${last} simulations`;
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function collectRelatedAxisKeys(inputs: HeadlineAssemblyInputs): ReadonlyArray<AxisKey> {
  const set = new Set<AxisKey>();
  if (inputs.binding_constraint) set.add(inputs.binding_constraint.axis);
  inputs.per_personality.forEach((p) => set.add(p.primary_axis));
  inputs.top_assumption_concentrations.forEach((a) => a.axis_spread.forEach((ax) => set.add(ax)));
  return Array.from(set);
}

function collectRelatedPersonalityIds(inputs: HeadlineAssemblyInputs): ReadonlyArray<PersonalityId> {
  const set = new Set<PersonalityId>();
  inputs.per_personality.forEach((p) => set.add(p.personality_id));
  if (inputs.closest_path) set.add(inputs.closest_path.personality_id);
  return Array.from(set);
}
