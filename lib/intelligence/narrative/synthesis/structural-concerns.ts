// lib/intelligence/narrative/synthesis/structural-concerns.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Structural Concerns Synthesis
//
// CP-8 Module: Surfaces fatal (non-repairable) discomforts across
// personalities with framing that distinguishes "hard to fix
// structurally" from "truly unfixable."
//
// This module is the complement of recovery-priorities.ts. Where
// recovery-priorities groups REPAIRABLE concerns into actionable
// priorities, this module groups FATAL concerns into structural
// concerns that diligence cannot resolve.
//
// What this module computes:
//
//   Given a batch posture result, identify every fatal discomfort
//   across personalities and group them by underlying structural
//   condition. Each StructuralConcern represents a class of
//   institutional incompatibility that buyer-side diligence cannot
//   close — though structural negotiation (deal structure, financing
//   path change, transaction restructure) might still produce
//   different posture readings.
//
// Why the "hard structurally" vs "truly unfixable" distinction matters:
//
//   Fatal discomforts come in two flavors:
//
//     A) Hard structurally (structurally negotiable):
//        - Coverage cushion below survivability threshold → could be
//          addressed by reducing leverage, increasing equity, or
//          changing the deal structure
//        - Fragility hotspot concentration → could be addressed by
//          scope reduction or carve-outs
//
//     B) Truly fundamental (no current path):
//        - Universal scenario failure → the business itself doesn't
//          survive any reasonable stress
//        - Catastrophic coverage signal → cash flow insufficient at
//          any leverage level
//        - Concerning durability band → through-cycle viability not
//          demonstrated
//
//   The distinction matters because buyer action differs:
//     - Hard structurally → "explore alternative deal structures"
//     - Truly fundamental → "the underlying business may not be financeable
//        at this purchase price under current evidence"
//
//   Templates render different prose for each case.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PersonalityId,
} from "../../personalities/types";
import type {
  BatchSimulationResult,
} from "../../simulation/types";
import type {
  StructuralConcern,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL CONDITION TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classification of structural condition severity. Two-tier:
 *
 *   "negotiable" — the underlying issue can potentially be addressed by
 *     deal-structure changes (different financing path, equity injection,
 *     earn-out structure, scope reduction). Buyer has structural options
 *     even when diligence cannot resolve the concern.
 *
 *   "fundamental" — the underlying issue indicates the business itself
 *     does not survive reasonable underwriting assumptions. No deal-
 *     structure change resolves it; the buyer's options are limited to
 *     price reduction, walking away, or accepting that the deal is not
 *     financeable under standard institutional terms.
 *
 * The distinction is encoded as a structural keyword classification
 * applied to the fatal discomfort ID and trigger explanation.
 */
type StructuralSeverity = "negotiable" | "fundamental";

/**
 * Substrings indicating a "fundamental" (truly unfixable) structural
 * concern. When any of these appear in a fatal discomfort's ID or
 * trigger explanation, the concern is classified as fundamental rather
 * than negotiable.
 *
 * These are reviewed alongside CP-6 catalogue when adding new fatal
 * discomforts. A fatal discomfort that doesn't match these keywords
 * defaults to "negotiable" — the conservative default since claiming
 * something is fundamental is the stronger statement.
 */
const FUNDAMENTAL_SEVERITY_MARKERS: ReadonlyArray<string> = [
  "universal_scenario_failure",
  "catastrophic_coverage",
  "durability_concerning",  // durability concerning band as deal-breaker
  "catastrophic",
];

// ─────────────────────────────────────────────────────────────────────────────
// CONCERN GROUPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a fatal discomfort ID to a stable "structural condition" key.
 * Discomforts with similar underlying conditions group together so the
 * narrative can present one StructuralConcern per condition rather than
 * one per personality (which would be noisy and redundant).
 *
 * Examples:
 *   sba.discomfort.lender_stress_failure → "scenario.lender_stress_failure"
 *   cashflow.discomfort.scenario_compression → "scenario.compression"
 *   bank.discomfort.collateral_insufficiency → "structure.collateral_insufficiency"
 *   seller.discomfort.fragility_hotspots → "fragility.hotspot_concentration"
 */
function inferStructuralCondition(discomfort_id: string): string {
  const lower = discomfort_id.toLowerCase();

  // Scenario-driven concerns
  if (lower.includes("lender_stress_failure") || lower.includes("lender_stress")) {
    return "scenario.lender_stress_failure";
  }
  if (lower.includes("scenario_compression")) {
    return "scenario.compression";
  }
  if (lower.includes("industry_normalized_failure") || lower.includes("industry_normalized")) {
    return "scenario.industry_normalized_failure";
  }
  if (lower.includes("partner_departure")) {
    return "scenario.partner_departure";
  }
  if (lower.includes("customer_loss")) {
    return "scenario.customer_loss";
  }

  // Coverage/financial concerns
  if (lower.includes("catastrophic_coverage") || lower.includes("catastrophic")) {
    return "financial.catastrophic_coverage";
  }
  if (lower.includes("collateral_insufficiency")) {
    return "structure.collateral_insufficiency";
  }

  // Fragility concerns
  if (lower.includes("fragility_hotspot") || lower.includes("fragility_concentration")) {
    return "fragility.hotspot_concentration";
  }

  // Universal failure
  if (lower.includes("universal_scenario_failure") || lower.includes("universal")) {
    return "scenario.universal_failure";
  }

  // Durability concerns
  if (lower.includes("durability_concerning") || lower.includes("durability")) {
    return "durability.through_cycle_viability";
  }

  // Fallback
  return `condition.${lower.replace(/[^a-z0-9]/g, "_")}`;
}

function severityForCondition(
  condition: string,
  contributing_discomfort_ids: ReadonlyArray<string>,
): StructuralSeverity {
  // Check the condition itself
  for (const marker of FUNDAMENTAL_SEVERITY_MARKERS) {
    if (condition.toLowerCase().includes(marker)) {
      return "fundamental";
    }
  }
  // Check contributing discomfort IDs
  for (const id of contributing_discomfort_ids) {
    const lower = id.toLowerCase();
    for (const marker of FUNDAMENTAL_SEVERITY_MARKERS) {
      if (lower.includes(marker)) {
        return "fundamental";
      }
    }
  }
  return "negotiable";
}

// ─────────────────────────────────────────────────────────────────────────────
// CONDITION DESCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable description for a structural condition. These are
 * rendered into prose by templates.
 */
function descriptionForCondition(condition: string): string {
  const descriptions: Record<string, string> = {
    "scenario.lender_stress_failure":
      "Lender stress scenario fails clearance: the deal does not survive what conservative institutional lenders model in their own underwriting (DSCR thresholds in the 1.30x–1.75x range under normalization).",
    "scenario.compression":
      "Scenario clearance compression: the deal shows material compression across multiple applied scenarios, indicating thinner safety margin than headline metrics suggest.",
    "scenario.industry_normalized_failure":
      "Industry-normalized scenario fails clearance: when earnings are normalized to industry-median operating economics, the deal does not survive — suggesting current margins carry non-durable elements.",
    "scenario.partner_departure":
      "Partner-departure / key-person scenario fails: in professional services and operator-dependent deals, the loss of the seller's personal relationships during transition produces unsupportable post-close economics.",
    "scenario.customer_loss":
      "Customer-loss scenario fails: post-close loss of the top customer relationship produces coverage compression that the structure cannot absorb.",
    "scenario.universal_failure":
      "Universal scenario failure: the deal does not survive any reasonable stress condition — the business itself cannot be modeled as financeable under standard institutional assumptions.",
    "financial.catastrophic_coverage":
      "Catastrophic coverage collapse: modeled cash flow drops below survivability thresholds. The structure cannot service debt at any reasonable leverage level under standard normalization.",
    "structure.collateral_insufficiency":
      "Collateral insufficiency combined with thin coverage: asset-light operating model provides limited fallback support when cash flow stresses, making the deal structurally less tolerable for personalities that rely on collateral.",
    "fragility.hotspot_concentration":
      "Concentrated fragility hotspots: multiple critical assumptions converge on overlapping conclusions, meaning multiple ways the deal could deviate from current operations simultaneously.",
    "durability.through_cycle_viability":
      "Through-cycle durability not demonstrated: the deal carries unacceptable cyclical or trajectory risk for personalities that require through-cycle survivability evidence.",
  };
  return (
    descriptions[condition] ??
    `Structural condition: ${condition.replace(/[._]/g, " ")}.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY_STRUCTURAL PROSE
// ─────────────────────────────────────────────────────────────────────────────

function buildWhyStructural(args: {
  readonly severity: StructuralSeverity;
  readonly condition: string;
  readonly affected_personalities: ReadonlyArray<PersonalityId>;
}): string {
  const personalityFraming = args.affected_personalities.length === 1
    ? `1 personality simulation`
    : `${args.affected_personalities.length} personality simulations`;

  if (args.severity === "fundamental") {
    return (
      `This concern is classified as fundamental rather than negotiable. ` +
      `The structural condition indicates that the underlying business does not survive standard underwriting assumptions across ${personalityFraming}; ` +
      `diligence work cannot close the concern, and deal-structure changes alone are unlikely to produce different posture readings. ` +
      `Resolution paths from this position are limited to material price reduction, walking away, or accepting that the deal is not financeable under standard institutional terms.`
    );
  }

  return (
    `This concern is classified as structurally negotiable rather than buyer-actionable through diligence. ` +
    `${personalityFraming} treat the underlying condition as fatal under the current deal shape — diligence alone cannot close it — but structural negotiation may still produce different posture readings. ` +
    `Options include changing the financing path, adjusting deal structure (equity contribution, earn-out, deferred consideration), reducing transaction scope (carve-outs), or pursuing alternative personality archetypes whose institutional reasoning treats the same condition as repairable rather than fatal.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface StructuralConcernsInputs {
  readonly batch_posture_result: BatchSimulationResult;
}

/**
 * Identify structural concerns across the batch posture result.
 *
 * Pure deterministic function. Returns an empty array when no fatal
 * discomforts exist across any personality (a fully repairable batch).
 *
 * Groups fatal discomforts by underlying structural condition. Each
 * group becomes one StructuralConcern record carrying:
 *   - the affected personalities
 *   - the contributing discomfort source IDs
 *   - severity classification (negotiable vs fundamental)
 *   - why_structural prose for templates
 *
 * Sorted by affected_personalities.length descending — concerns
 * spanning more personalities are surfaced first.
 */
export function identifyStructuralConcerns(
  inputs: StructuralConcernsInputs,
): ReadonlyArray<StructuralConcern> {
  const { batch_posture_result } = inputs;

  // ── Step 1: Collect all fatal discomforts + their personality context ──
  const fatalsByCondition = new Map<string, {
    personalities: Set<PersonalityId>;
    discomfort_ids: Set<string>;
  }>();

  // ALSO consider triggered deal-breakers that map to structural conditions
  // (e.g., conventional.deal_breaker.durability_concerning is structural
  // even though it's not in the discomfort_chain)
  for (const entry of batch_posture_result.entries) {
    for (const d of entry.posture.discomfort_chain) {
      if (d.repairability !== "fatal") continue;
      const condition = inferStructuralCondition(d.discomfort_source_id);
      if (!fatalsByCondition.has(condition)) {
        fatalsByCondition.set(condition, {
          personalities: new Set(),
          discomfort_ids: new Set(),
        });
      }
      const group = fatalsByCondition.get(condition)!;
      group.personalities.add(entry.personality_id);
      group.discomfort_ids.add(d.discomfort_source_id);
    }

    // Also factor in triggered deal-breakers — they're always structural
    for (const dbId of entry.posture.triggered_deal_breakers) {
      const condition = inferStructuralCondition(dbId);
      if (!fatalsByCondition.has(condition)) {
        fatalsByCondition.set(condition, {
          personalities: new Set(),
          discomfort_ids: new Set(),
        });
      }
      const group = fatalsByCondition.get(condition)!;
      group.personalities.add(entry.personality_id);
      group.discomfort_ids.add(dbId);
    }
  }

  if (fatalsByCondition.size === 0) return [];

  // ── Step 2: Build StructuralConcern records ──
  const concerns: StructuralConcern[] = [];
  let concernIndex = 0;

  for (const [condition, group] of fatalsByCondition.entries()) {
    const affectedPersonalities = Array.from(group.personalities);
    const contributingIds = Array.from(group.discomfort_ids);
    const severity = severityForCondition(condition, contributingIds);

    const description = descriptionForCondition(condition);
    const whyStructural = buildWhyStructural({
      severity,
      condition,
      affected_personalities: affectedPersonalities,
    });

    concerns.push({
      concern_id: `structural_concern.${concernIndex++}.${condition}`,
      description,
      affected_personalities: affectedPersonalities,
      source_ids: contributingIds,
      why_structural: whyStructural,
    });
  }

  // ── Step 3: Sort by personality breadth, then by id count ──
  concerns.sort((a, b) => {
    const personalityDelta = b.affected_personalities.length - a.affected_personalities.length;
    if (personalityDelta !== 0) return personalityDelta;
    return b.source_ids.length - a.source_ids.length;
  });

  return concerns;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a fatal discomfort as fundamental or negotiable. Exposed for
 * other synthesis modules that need to read severity directly.
 */
export function classifyFatalSeverity(discomfort_id: string): StructuralSeverity {
  const condition = inferStructuralCondition(discomfort_id);
  return severityForCondition(condition, [discomfort_id]);
}
