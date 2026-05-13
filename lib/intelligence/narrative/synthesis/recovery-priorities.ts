// lib/intelligence/narrative/synthesis/recovery-priorities.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Recovery Priorities Synthesis
//
// CP-8 Module: Deterministic computation of the highest-leverage
// recovery actions from repairable discomforts across personalities.
//
// This module turns "your deal has these problems" into "here's the
// highest-leverage thing to fix first."
//
// What this module computes:
//
//   Given a batch posture result, group all REPAIRABLE discomforts and
//   unsatisfied comfort conditions across personalities by their
//   addressing target. Each "priority group" represents a single
//   diligence action or evidence upgrade that, if completed, would
//   close multiple personality-level concerns simultaneously.
//
//   The leverage of a priority is the number of distinct personality
//   simulations it would meaningfully shift. A priority that closes
//   discomforts in 3 personalities has higher leverage than one that
//   closes a single discomfort in 1 personality.
//
// Why grouping matters:
//
//   A buyer reading "SBA wants tax-return-anchored adjustments AND
//   conventional bank wants documentation strength AND cashflow lender
//   wants multi-year margin trajectory" can easily miss that all three
//   are addressed by the same diligence action: upgrading evidence
//   from seller_spreadsheet to tax_returns.
//
//   This module identifies the addressing-target clusters so the
//   narrative can frame the recovery path as "the single highest-
//   leverage action is X, which would shift posture in three
//   personality simulations simultaneously."
//
// What this module does NOT do:
//
//   - Generate prose (templates render the priorities)
//   - Make recommendations ("you should pursue X first") — only ranks by
//     deterministic leverage count
//   - Estimate cost or effort — leverage is the only deterministic metric
//   - Mutate any upstream artifact
//
// Algorithm:
//
//   1. Iterate all batch entries; collect every repairable discomfort,
//      every unsatisfied comfort condition, and every unmet info need.
//
//   2. For each item, extract its "addressing target" — the structural
//      thing that would resolve it. Targets are stable keys derived
//      from upstream IDs:
//
//        - Discomforts/comfort conditions/info needs → addresses_target_id
//          extracted from CP-6 catalogue's addresses_source_ids OR
//          inferred from the ID itself
//
//   3. Group items by addressing target.
//
//   4. For each group, compute:
//        - leverage_count: distinct personalities affected
//        - resolves_discomfort_ids: which discomfort sources close
//        - satisfies_comfort_condition_ids: which comfort conditions close
//        - addresses_personalities: which personalities benefit
//
//   5. Sort by leverage_count descending, then by total items closed.
//
//   6. Return ranked list of RecoveryPriority records.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PersonalityId,
} from "../../personalities/types";
import type {
  BatchSimulationResult,
} from "../../simulation/types";
import type {
  RecoveryPriority,
} from "../types";
import { getPersonality } from "../../personalities/personality-registry";

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESSING-TARGET INFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The "addressing target" is the structural thing a diligence action,
 * source upgrade, or structural change would address. We extract this
 * from CP-6 catalogue's `addresses_source_ids` field where available,
 * and fall back to keyword-based inference from the discomfort/comfort/
 * info ID itself.
 *
 * Targets are stable keys (e.g., "evidence.deal_source_strength",
 * "durability.customer_concentration", "scenario.lender_stress").
 *
 * The keyword inference is intentionally conservative: when in doubt,
 * we use a generic per-personality target rather than risk merging
 * unrelated concerns.
 */
type AddressingTarget = string;

interface RawRecoveryItem {
  /** Unique ID of the upstream item (discomfort_source_id, comfort_condition_id, info_need_id). */
  readonly item_id: string;
  /** Personality the item belongs to. */
  readonly personality_id: PersonalityId;
  /** Item type for downstream classification. */
  readonly item_type: "discomfort" | "comfort_condition" | "info_need";
  /** Addressing target this item maps to. */
  readonly target: AddressingTarget;
}

/**
 * Generate a human-readable label for an addressing target. Labels are
 * used by templates and validators to render the priority's name.
 */
function labelForTarget(target: AddressingTarget): string {
  // Targets are namespaced strings. Convert to human-readable labels.
  const labels: Record<string, string> = {
    "evidence.upgrade_to_tax_returns": "Upgrade evidence base to tax-return-anchored sources",
    "evidence.documentation_strengthening": "Strengthen documentation across primary metrics",
    "evidence.addback_substantiation": "Substantiate add-back schedule with independent sources",
    "durability.customer_documentation": "Document customer concentration with contract visibility",
    "durability.customer_transferability": "Demonstrate customer relationship transferability",
    "durability.transition_mechanics": "Define transition mechanics and operator-replacement plan",
    "durability.working_capital_evidence": "Provide working-capital cycle evidence",
    "durability.operator_dependency_assessment": "Assess operator-dependency and replacement feasibility",
    "durability.recurring_revenue_evidence": "Provide recurring-revenue retention evidence",
    "financial.coverage_cushion": "Restructure to achieve coverage cushion above conservative threshold",
    "financial.dscr_improvement": "Adjust deal structure to improve post-close DSCR",
    "financial.margin_evidence": "Provide multi-year margin trajectory evidence",
    "scenario.lender_stress_clearance": "Address signals driving lender_stress scenario failure",
    "scenario.industry_normalized_clearance": "Address signals driving industry_normalized scenario failure",
    "scenario.partner_departure_clearance": "Address partner-departure / key-person transition risk",
    "scenario.customer_loss_clearance": "Address customer-loss scenario sensitivity",
    "fragility.assumption_concentration": "Reduce assumption concentration through evidence upgrade or scope reduction",
    "uncertainty.data_acquisition": "Acquire missing primary-analysis data",
    "uncertainty.fingerprint_coverage": "Awaiting industry-specific fingerprint registry expansion",
  };
  return labels[target] ?? `Address ${target.replace(/[._]/g, " ")}`;
}

/**
 * Infer the addressing target for a discomfort ID. Uses keyword matching
 * on the personality-namespaced ID.
 *
 * Examples:
 *   "sba.discomfort.unverifiable_adjustments" → "evidence.addback_substantiation"
 *   "seller.discomfort.transition_fragility" → "durability.transition_mechanics"
 *   "cashflow.discomfort.margin_volatility" → "financial.margin_evidence"
 */
function inferDiscomfortTarget(discomfort_id: string): AddressingTarget {
  const lower = discomfort_id.toLowerCase();

  // Coverage-gap discomforts route to the fingerprint coverage target
  if (lower.includes("fallback") || lower.includes("model_coverage")) {
    return "uncertainty.fingerprint_coverage";
  }

  // Evidence/documentation discomforts
  if (lower.includes("unverifiable_adjustment") || lower.includes("addback")) {
    return "evidence.addback_substantiation";
  }
  if (lower.includes("weak_documentation") || lower.includes("documentation")) {
    return "evidence.documentation_strengthening";
  }

  // Customer-related discomforts
  if (lower.includes("customer_transferability")) {
    return "durability.customer_transferability";
  }
  if (lower.includes("customer_concentration") || lower.includes("top_customer")) {
    return "durability.customer_documentation";
  }

  // Transition / operator discomforts
  if (lower.includes("transition_fragility")) {
    return "durability.transition_mechanics";
  }
  if (lower.includes("operator_dependency") || lower.includes("operator")) {
    return "durability.operator_dependency_assessment";
  }

  // Working capital
  if (lower.includes("working_capital") || lower.includes("collateral_insufficiency")) {
    return "durability.working_capital_evidence";
  }

  // Cyclicality / margin
  if (lower.includes("cyclicality")) {
    return "financial.margin_evidence";
  }
  if (lower.includes("margin_volatility") || lower.includes("margin")) {
    return "financial.margin_evidence";
  }

  // Coverage / DSCR / lender stress
  if (lower.includes("covenant_thinness") || lower.includes("dscr")) {
    return "financial.coverage_cushion";
  }
  if (lower.includes("lender_stress")) {
    return "scenario.lender_stress_clearance";
  }
  if (lower.includes("industry_normalized")) {
    return "scenario.industry_normalized_clearance";
  }
  if (lower.includes("partner_departure")) {
    return "scenario.partner_departure_clearance";
  }
  if (lower.includes("customer_loss")) {
    return "scenario.customer_loss_clearance";
  }

  // Scenario compression
  if (lower.includes("scenario_compression")) {
    return "scenario.industry_normalized_clearance";
  }

  // Fragility hotspots
  if (lower.includes("fragility_hotspot") || lower.includes("fragility_concentration")) {
    return "fragility.assumption_concentration";
  }

  // Recurring revenue
  if (lower.includes("recurring_revenue")) {
    return "durability.recurring_revenue_evidence";
  }

  // Fall back to a personality-specific target so we don't accidentally
  // merge unrelated concerns
  const parts = discomfort_id.split(".");
  return `personality_specific.${parts.slice(0, 2).join(".")}`;
}

/**
 * Infer the addressing target for a comfort condition ID. Uses similar
 * keyword matching plus the comfort condition's structural meaning.
 */
function inferComfortConditionTarget(comfort_id: string): AddressingTarget {
  const lower = comfort_id.toLowerCase();

  if (lower.includes("tax_return") || lower.includes("addback")) {
    return "evidence.upgrade_to_tax_returns";
  }
  if (lower.includes("dscr") || lower.includes("coverage_cushion") || lower.includes("post_close_dscr")) {
    return "financial.coverage_cushion";
  }
  if (lower.includes("contract_visibility") || lower.includes("customer")) {
    return "durability.customer_documentation";
  }
  if (lower.includes("transition_durability") || lower.includes("transition")) {
    return "durability.transition_mechanics";
  }
  if (lower.includes("manageable_fragility") || lower.includes("fragility")) {
    return "fragility.assumption_concentration";
  }
  if (lower.includes("working_capital")) {
    return "durability.working_capital_evidence";
  }
  if (lower.includes("durable_cash_flow") || lower.includes("cash_flow")) {
    return "financial.margin_evidence";
  }

  const parts = comfort_id.split(".");
  return `personality_specific.${parts.slice(0, 2).join(".")}`;
}

/**
 * Infer the addressing target for an information need ID.
 */
function inferInfoNeedTarget(info_id: string): AddressingTarget {
  const lower = info_id.toLowerCase();
  if (lower.includes("addback_schedule") || lower.includes("balance_sheet") || lower.includes("trajectory")) {
    return "uncertainty.data_acquisition";
  }
  if (lower.includes("buyer_operational")) {
    return "durability.operator_dependency_assessment";
  }
  return "uncertainty.data_acquisition";
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryPrioritiesInputs {
  readonly batch_posture_result: BatchSimulationResult;
}

/**
 * Compute ranked recovery priorities from the batch posture result.
 *
 * Pure deterministic function. Returns an empty array when no
 * repairable concerns exist anywhere in the batch (clean deal across
 * all personalities).
 *
 * The returned array is ordered by leverage_count descending. Templates
 * render the top priorities; the structured array is fully exposed for
 * dashboard / PDF / future LLM polish.
 */
export function computeRecoveryPriorities(
  inputs: RecoveryPrioritiesInputs,
): ReadonlyArray<RecoveryPriority> {
  const { batch_posture_result } = inputs;

  // ── Step 1: Collect all raw recovery items across personalities ──
  const rawItems: RawRecoveryItem[] = [];

  for (const entry of batch_posture_result.entries) {
    const personalityId = entry.personality_id;
    const personality = getPersonality(personalityId);
    if (!personality) continue; // shouldn't happen but defensive

    // 1a: Repairable discomforts only (fatals are structural, handled separately)
    for (const d of entry.posture.discomfort_chain) {
      if (d.repairability !== "repairable") continue;
      // Look up the discomfort source in the personality catalogue to
      // get its addresses_source_ids if available. Currently we use
      // keyword inference; future iterations can read addresses_source_ids
      // directly when CP-6 catalogue references are populated.
      const target = inferDiscomfortTarget(d.discomfort_source_id);
      rawItems.push({
        item_id: d.discomfort_source_id,
        personality_id: personalityId,
        item_type: "discomfort",
        target,
      });
    }

    // 1b: Unsatisfied comfort conditions
    for (const ccId of entry.posture.unsatisfied_comfort_conditions) {
      const target = inferComfortConditionTarget(ccId);
      rawItems.push({
        item_id: ccId,
        personality_id: personalityId,
        item_type: "comfort_condition",
        target,
      });
    }

    // 1c: Unmet information needs
    for (const infoId of entry.posture.unmet_information_needs) {
      const target = inferInfoNeedTarget(infoId);
      rawItems.push({
        item_id: infoId,
        personality_id: personalityId,
        item_type: "info_need",
        target,
      });
    }
  }

  if (rawItems.length === 0) return [];

  // ── Step 2: Group items by addressing target ──
  const groupsByTarget = new Map<AddressingTarget, RawRecoveryItem[]>();
  for (const item of rawItems) {
    if (!groupsByTarget.has(item.target)) {
      groupsByTarget.set(item.target, []);
    }
    groupsByTarget.get(item.target)!.push(item);
  }

  // ── Step 3: Build RecoveryPriority records ──
  const priorities: RecoveryPriority[] = [];
  let priorityIndex = 0;

  for (const [target, items] of groupsByTarget.entries()) {
    const distinctPersonalities = new Set<PersonalityId>(
      items.map((i) => i.personality_id),
    );

    const discomfortIds = items
      .filter((i) => i.item_type === "discomfort")
      .map((i) => i.item_id);
    const comfortIds = items
      .filter((i) => i.item_type === "comfort_condition")
      .map((i) => i.item_id);
    const infoIds = items
      .filter((i) => i.item_type === "info_need")
      .map((i) => i.item_id);

    const description = buildPriorityDescription({
      target,
      personality_count: distinctPersonalities.size,
      discomfort_count: discomfortIds.length,
      comfort_count: comfortIds.length,
      info_count: infoIds.length,
    });

    priorities.push({
      priority_id: `recovery_priority.${priorityIndex++}.${target}`,
      label: labelForTarget(target),
      addresses_personalities: Array.from(distinctPersonalities),
      resolves_discomfort_ids: discomfortIds,
      satisfies_comfort_condition_ids: comfortIds,
      description,
      // Leverage count is the unique-personalities-affected count, the
      // deterministic metric for "how broadly does this action shift posture?"
      leverage_count: distinctPersonalities.size,
    });
  }

  // ── Step 4: Sort by leverage_count desc, then by total items closed ──
  priorities.sort((a, b) => {
    if (a.leverage_count !== b.leverage_count) {
      return b.leverage_count - a.leverage_count;
    }
    const aTotal = a.resolves_discomfort_ids.length + a.satisfies_comfort_condition_ids.length;
    const bTotal = b.resolves_discomfort_ids.length + b.satisfies_comfort_condition_ids.length;
    return bTotal - aTotal;
  });

  return priorities;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIPTION PROSE
// ─────────────────────────────────────────────────────────────────────────────

interface DescriptionInputs {
  readonly target: AddressingTarget;
  readonly personality_count: number;
  readonly discomfort_count: number;
  readonly comfort_count: number;
  readonly info_count: number;
}

function buildPriorityDescription(inputs: DescriptionInputs): string {
  const parts: string[] = [];

  // Special framing for the fingerprint coverage target
  if (inputs.target === "uncertainty.fingerprint_coverage") {
    return (
      `This priority is gated by registry coverage rather than buyer action. ` +
      `${inputs.personality_count} personality simulation${inputs.personality_count === 1 ? "" : "s"} carry signals tied to ` +
      `the absence of an industry-specific fingerprint. Resolution requires the engine to register an industry-specific ` +
      `operating-model fingerprint; no buyer-side diligence action closes this signal.`
    );
  }

  const itemSummary: string[] = [];
  if (inputs.discomfort_count > 0) {
    itemSummary.push(
      `${inputs.discomfort_count} repairable discomfort${inputs.discomfort_count === 1 ? "" : "s"}`,
    );
  }
  if (inputs.comfort_count > 0) {
    itemSummary.push(
      `${inputs.comfort_count} unsatisfied comfort condition${inputs.comfort_count === 1 ? "" : "s"}`,
    );
  }
  if (inputs.info_count > 0) {
    itemSummary.push(
      `${inputs.info_count} unmet information need${inputs.info_count === 1 ? "" : "s"}`,
    );
  }

  const personalityFraming = inputs.personality_count === 1
    ? `1 personality simulation`
    : `${inputs.personality_count} personality simulations`;

  parts.push(
    `Addressing this priority closes ${itemSummary.join(", ")} across ${personalityFraming}.`,
  );

  if (inputs.personality_count >= 3) {
    parts.push(
      `High leverage: this single action would shift posture in ${inputs.personality_count} personality simulations simultaneously.`,
    );
  } else if (inputs.personality_count === 2) {
    parts.push(
      `Moderate leverage: the action addresses concerns in two distinct personality lenses.`,
    );
  } else {
    parts.push(
      `Targeted leverage: addresses concerns within a single personality lens.`,
    );
  }

  return parts.join(" ");
}
