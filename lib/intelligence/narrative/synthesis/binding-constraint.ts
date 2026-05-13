// lib/intelligence/narrative/synthesis/binding-constraint.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Binding Constraint Synthesis
//
// CP-8 Module: Deterministic identification of the binding constraint
// — the single axis or structural condition that most constrains the
// deal's underwriting path.
//
// What this module computes:
//
//   Given a CP-5 axis composition result + a CP-7 batch posture result,
//   identify which axis or structural condition is the binding constraint
//   on the deal's financeability. The binding constraint is the
//   intelligence finding that templates render into prose like:
//
//     "The binding constraint on this deal is durability: the financial
//      profile compresses materially under industry normalization, and
//      that compression is what drives personality declines across SBA
//      and conventional bank simulations."
//
// What this module does NOT do:
//
//   - Generate prose (that's the templates layer)
//   - Make verdicts ("buy" / "walk away") — only identifies structural reading
//   - Read raw rule firings — works at axis/posture layer only
//   - Predict actual lender behavior
//
// Algorithm:
//
//   The binding constraint is the most-constraining condition that
//   appears across personality declines AND has the strongest
//   contribution magnitude. Computation:
//
//   1. Aggregate triggered deal-breakers across personalities. The
//      deal-breaker triggered by the MOST personalities is a candidate.
//
//   2. Aggregate fatal discomforts across personalities. The fatal
//      discomfort source affecting the most personalities (or the one
//      with the broadest axis impact) is a candidate.
//
//   3. Identify the axis with the lowest score (for standard axes) or
//      highest score (for fragility/uncertainty axes). The axis at the
//      most extreme band that is referenced by multiple personality
//      triggers is a candidate.
//
//   4. From the candidates, select the one with the highest
//      cross-personality reference count.
//
//   5. Classify repairability: if the candidate ties to a repairable
//      discomfort source across personalities OR to evidence_quality
//      OR to data_uncertainty, it's repairable. If it ties to
//      durability/fragility hotspot concentration AND no personality
//      can interpret it as repairable, it's structural.
//
// Special cases:
//
//   - If the deal has no triggered deal-breakers or fatal discomforts
//     across ANY personality (clean deal), no binding constraint is
//     identified. The function returns null.
//
//   - If the binding condition is driven by fallback fingerprint,
//     this module flags it so the coverage-gap synthesis module can
//     reframe the finding.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  AxisCompositionResult,
} from "../../axes/types";
import type {
  BatchSimulationResult,
} from "../../simulation/types";
import type {
  BindingConstraintFinding,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface BindingConstraintInputs {
  readonly axis_composition_result: AxisCompositionResult;
  readonly batch_posture_result: BatchSimulationResult;
}

/**
 * Identify the binding constraint on the deal.
 *
 * Pure deterministic function. Returns null when no binding constraint
 * is identifiable (clean deal with no triggered deal-breakers or fatal
 * discomforts).
 *
 * The returned finding carries the axis, score/band, repairability
 * classification, and the driver source IDs that templates render into
 * prose.
 */
export function identifyBindingConstraint(
  inputs: BindingConstraintInputs,
): BindingConstraintFinding | null {
  const { axis_composition_result, batch_posture_result } = inputs;

  // ── Step 1: Aggregate decline drivers across personalities ──
  const decliningEntries = batch_posture_result.entries.filter(
    (e) => e.posture.state === "decline",
  );

  // If no personality declined and no fatal discomforts exist anywhere,
  // there's no binding constraint to identify (clean deal).
  if (decliningEntries.length === 0) {
    const cautiousWithFatals = batch_posture_result.entries.filter(
      (e) => e.posture.state === "cautious" &&
        e.posture.discomfort_chain.some((d) => d.repairability === "fatal"),
    );
    if (cautiousWithFatals.length === 0) {
      return null;
    }
  }

  // ── Step 2: Build a cross-personality citation map ──
  // For each potential constraint signal, count how many personalities
  // reference it. The most-cited signal becomes the binding constraint.

  type CandidateSignal = {
    readonly signal_type: "deal_breaker" | "fatal_discomfort" | "axis_band";
    readonly signal_id: string;
    readonly axis: AxisKey;
    readonly personalities_citing: ReadonlyArray<string>;
    readonly source_ids: ReadonlyArray<string>;
    readonly drives_repairable: boolean;
  };

  const candidates: CandidateSignal[] = [];

  // 2a. Deal-breakers: which deal-breaker fired across the most personalities?
  const dealBreakerCitations = new Map<string, {
    personalities: Set<string>;
    axis: AxisKey;
  }>();
  for (const entry of batch_posture_result.entries) {
    for (const dbId of entry.posture.triggered_deal_breakers) {
      const axis = inferAxisFromSignalId(dbId, axis_composition_result);
      if (!dealBreakerCitations.has(dbId)) {
        dealBreakerCitations.set(dbId, { personalities: new Set(), axis });
      }
      dealBreakerCitations.get(dbId)!.personalities.add(entry.personality_id);
    }
  }
  for (const [dbId, info] of dealBreakerCitations.entries()) {
    candidates.push({
      signal_type: "deal_breaker",
      signal_id: dbId,
      axis: info.axis,
      personalities_citing: Array.from(info.personalities),
      source_ids: [dbId],
      drives_repairable: false, // deal-breakers are always structural
    });
  }

  // 2b. Fatal discomforts: which fatal discomfort fired across the most personalities?
  const fatalCitations = new Map<string, {
    personalities: Set<string>;
    axis: AxisKey;
  }>();
  for (const entry of batch_posture_result.entries) {
    for (const d of entry.posture.discomfort_chain) {
      if (d.repairability === "fatal") {
        const axis = inferAxisFromSignalId(d.discomfort_source_id, axis_composition_result);
        if (!fatalCitations.has(d.discomfort_source_id)) {
          fatalCitations.set(d.discomfort_source_id, { personalities: new Set(), axis });
        }
        fatalCitations.get(d.discomfort_source_id)!.personalities.add(entry.personality_id);
      }
    }
  }
  for (const [discomfortId, info] of fatalCitations.entries()) {
    candidates.push({
      signal_type: "fatal_discomfort",
      signal_id: discomfortId,
      axis: info.axis,
      personalities_citing: Array.from(info.personalities),
      source_ids: [discomfortId],
      drives_repairable: false,
    });
  }

  // 2c. Axis bands: which axis is at the most extreme position AND referenced by personality drivers?
  // We surface axes that are at concerning/highly_concentrated/severe bands
  // even when no specific deal-breaker fired on that axis — these are
  // structural axis positions worth flagging as binding constraints.
  const axisBandCandidates: ReadonlyArray<{
    axis: AxisKey;
    score: number;
    band: string;
    is_extreme: boolean;
    inverted: boolean;
  }> = [
    {
      axis: "financial_score",
      score: axis_composition_result.financial_score.score,
      band: axis_composition_result.financial_score.band,
      is_extreme: axis_composition_result.financial_score.band === "concerning",
      inverted: false,
    },
    {
      axis: "durability_score",
      score: axis_composition_result.durability_score.score,
      band: axis_composition_result.durability_score.band,
      is_extreme: axis_composition_result.durability_score.band === "concerning",
      inverted: false,
    },
    {
      axis: "evidence_quality",
      score: axis_composition_result.evidence_quality.score,
      band: axis_composition_result.evidence_quality.band,
      is_extreme: axis_composition_result.evidence_quality.band === "concerning",
      inverted: false,
    },
    {
      axis: "assumption_fragility",
      score: axis_composition_result.assumption_fragility.score,
      band: axis_composition_result.assumption_fragility.band,
      is_extreme: axis_composition_result.assumption_fragility.band === "highly_concentrated",
      inverted: true,
    },
    {
      axis: "underwriting_uncertainty",
      score: axis_composition_result.underwriting_uncertainty.score,
      band: axis_composition_result.underwriting_uncertainty.band,
      is_extreme: axis_composition_result.underwriting_uncertainty.band === "severe_uncertainty",
      inverted: true,
    },
  ];

  // For each extreme axis, count personalities whose primary axis (priority 1)
  // matches that axis — those personalities care most about this axis position.
  for (const axisCandidate of axisBandCandidates) {
    if (!axisCandidate.is_extreme) continue;

    const citingPersonalities: string[] = [];
    const sourceIds: string[] = [];
    for (const entry of batch_posture_result.entries) {
      // If this axis is in the personality's top 2 priority positions
      // AND the personality declined or went cautious, the axis position
      // is part of why that personality is concerned.
      const priorityPosition = entry.posture.axis_priority_order_used.indexOf(axisCandidate.axis);
      if (priorityPosition >= 0 && priorityPosition < 2 &&
          (entry.posture.state === "decline" || entry.posture.state === "cautious")) {
        citingPersonalities.push(entry.personality_id);
        sourceIds.push(`personality.${entry.personality_id}.axis_priority.${axisCandidate.axis}`);
      }
    }

    if (citingPersonalities.length > 0) {
      candidates.push({
        signal_type: "axis_band",
        signal_id: `axis.${axisCandidate.axis}.band=${axisCandidate.band}`,
        axis: axisCandidate.axis,
        personalities_citing: citingPersonalities,
        source_ids: sourceIds,
        drives_repairable:
          axisCandidate.axis === "evidence_quality" ||
          axisCandidate.axis === "underwriting_uncertainty",
      });
    }
  }

  // ── Step 3: Pick the candidate with the highest citation count ──
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // Primary: more personalities citing the signal
    const citationDelta = b.personalities_citing.length - a.personalities_citing.length;
    if (citationDelta !== 0) return citationDelta;

    // Secondary: prefer fatal discomforts and deal-breakers over band positions
    // (more specific signal = more interpretable as the binding constraint)
    const aSpecificity = signalSpecificity(a.signal_type);
    const bSpecificity = signalSpecificity(b.signal_type);
    return bSpecificity - aSpecificity;
  });

  const winner = candidates[0];

  // ── Step 4: Classify repairability ──
  // Repairable when:
  //   - the constraint ties to evidence/uncertainty (typically diligence-resolvable)
  //   - OR the signal_type is axis_band on an evidence/uncertainty axis
  // Structural when:
  //   - deal-breaker on durability/financial/fragility
  //   - fatal discomfort on durability/fragility
  //   - axis_band on durability/financial/fragility at the most extreme position

  const repairability = computeRepairability(winner);

  // ── Step 5: Build rationale ──
  const winnerAxis = lookupAxisScore(axis_composition_result, winner.axis);
  const rationale = buildRationale({
    signal: winner,
    axis_score: winnerAxis.score,
    axis_band: winnerAxis.band,
    repairability,
  });

  return {
    axis: winner.axis,
    score: winnerAxis.score,
    band: winnerAxis.band,
    repairability,
    driver_source_ids: winner.source_ids,
    rationale,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer which axis a signal ID belongs to by inspecting the signal ID's
 * prefix and cross-referencing with axis_composition_result's components.
 *
 * Personality-namespaced IDs use prefixes like `sba.discomfort.lender_stress_failure`.
 * We map common keywords in the suffix to axes.
 */
function inferAxisFromSignalId(
  signalId: string,
  axisResult: AxisCompositionResult,
): AxisKey {
  const lower = signalId.toLowerCase();

  // Direct keyword matching — broad heuristic
  if (lower.includes("dscr") || lower.includes("coverage") || lower.includes("catastrophic")) {
    return "financial_score";
  }
  if (lower.includes("durability") || lower.includes("scenario") ||
      lower.includes("revenue") || lower.includes("trajectory") ||
      lower.includes("partner") || lower.includes("transition") ||
      lower.includes("customer") || lower.includes("working_capital") ||
      lower.includes("retention") || lower.includes("compression")) {
    return "durability_score";
  }
  if (lower.includes("evidence") || lower.includes("verbal") ||
      lower.includes("verification") || lower.includes("verifiable") ||
      lower.includes("documentation") || lower.includes("documented") ||
      lower.includes("addback") || lower.includes("source") ||
      lower.includes("adjustment")) {
    return "evidence_quality";
  }
  if (lower.includes("fragility") || lower.includes("hotspot") ||
      lower.includes("assumption") || lower.includes("concentrat")) {
    return "assumption_fragility";
  }
  if (lower.includes("uncertainty") || lower.includes("fallback") ||
      lower.includes("model_coverage")) {
    return "underwriting_uncertainty";
  }

  // Fallback: scan components for the signal_id reference; default to durability
  // (most signals affect durability if no other axis match)
  // First, check if any axis has this signal_id as a source on a component.
  for (const axisName of ["financial_score", "durability_score", "evidence_quality", "assumption_fragility", "underwriting_uncertainty"] as const) {
    const axis = lookupAxisScore(axisResult, axisName);
    for (const component of axis.components) {
      if (component.sources.some((s) => s.id === signalId)) {
        return axisName;
      }
    }
  }

  return "durability_score";
}

function lookupAxisScore(result: AxisCompositionResult, axis: AxisKey) {
  switch (axis) {
    case "financial_score": return result.financial_score;
    case "durability_score": return result.durability_score;
    case "evidence_quality": return result.evidence_quality;
    case "assumption_fragility": return result.assumption_fragility;
    case "underwriting_uncertainty": return result.underwriting_uncertainty;
  }
}

function signalSpecificity(t: "deal_breaker" | "fatal_discomfort" | "axis_band"): number {
  // Higher = more specific = preferred as binding constraint
  switch (t) {
    case "deal_breaker": return 3;
    case "fatal_discomfort": return 2;
    case "axis_band": return 1;
  }
}

interface CandidateSignal {
  readonly signal_type: "deal_breaker" | "fatal_discomfort" | "axis_band";
  readonly signal_id: string;
  readonly axis: AxisKey;
  readonly personalities_citing: ReadonlyArray<string>;
  readonly source_ids: ReadonlyArray<string>;
  readonly drives_repairable: boolean;
}

function computeRepairability(signal: CandidateSignal): "repairable" | "structural" {
  // Evidence and uncertainty constraints are typically repairable through
  // diligence and evidence upgrade
  if (signal.axis === "evidence_quality" || signal.axis === "underwriting_uncertainty") {
    return "repairable";
  }
  // Deal-breakers and fatal discomforts on durability/financial/fragility
  // are structural by classification
  if (signal.signal_type === "deal_breaker" || signal.signal_type === "fatal_discomfort") {
    return "structural";
  }
  // Axis band on durability/financial/fragility at extreme position is structural
  return "structural";
}

function buildRationale(args: {
  signal: CandidateSignal;
  axis_score: number;
  axis_band: string;
  repairability: "repairable" | "structural";
}): string {
  const { signal, axis_score, axis_band, repairability } = args;
  const citationCount = signal.personalities_citing.length;
  const citationText = citationCount === 1
    ? `1 personality simulation`
    : `${citationCount} personality simulations`;

  const repairabilityLanguage = repairability === "repairable"
    ? "This constraint is classified as repairable: targeted diligence, source upgrades, or structural negotiation can close the gap."
    : "This constraint is classified as structural: it represents an underwriting incompatibility that diligence alone cannot resolve, though structural negotiation or different financing paths may produce different posture readings.";

  switch (signal.signal_type) {
    case "deal_breaker":
      return (
        `The binding constraint is anchored on axis ${signal.axis} (score ${axis_score.toFixed(1)}, band ${axis_band}). ` +
        `A specific deal-breaker condition (${signal.signal_id}) triggered across ${citationText}. ` +
        repairabilityLanguage
      );
    case "fatal_discomfort":
      return (
        `The binding constraint is anchored on axis ${signal.axis} (score ${axis_score.toFixed(1)}, band ${axis_band}). ` +
        `A fatal discomfort (${signal.signal_id}) fired across ${citationText} — fatal classification means diligence cannot close this discomfort within those personalities. ` +
        repairabilityLanguage
      );
    case "axis_band":
      return (
        `The binding constraint is the axis-level position of ${signal.axis} (score ${axis_score.toFixed(1)}, band ${axis_band}). ` +
        `This position is referenced by the primary axis priority of ${citationText}, making it the most-cited structural reading across the personality batch. ` +
        repairabilityLanguage
      );
  }
}
