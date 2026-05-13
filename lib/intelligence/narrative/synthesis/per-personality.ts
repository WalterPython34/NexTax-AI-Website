// lib/intelligence/narrative/synthesis/per-personality.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Per-Personality Narrative Input Synthesis
//
// CP-8 Module: Builds the structured PersonalityNarrativeInput record
// for each personality. These records feed the per-personality template
// that produces the brief 2-3 sentence paragraphs the dashboard renders.
//
// What this module computes:
//
//   Given the CP-7 batch posture result + the coverage-gap finding from
//   coverage-gap.ts, produce one PersonalityNarrativeInput per personality
//   in stable catalogue order. Each record carries:
//
//     - posture state (interested / cautious / decline)
//     - is_coverage_gap_affected flag (from coverage-gap synthesis)
//     - triggered_deal_breaker_ids
//     - fatal_discomfort_ids
//     - repairable_discomfort_ids
//     - unsatisfied_comfort_condition_ids
//     - satisfied_comfort_condition_ids (positive signal preservation)
//     - primary_axis: the personality's #1 priority axis + its reading
//
//   The structured input is auditable independently of any prose.
//   Templates read it to render the per-personality fragment.
//
// What this module does NOT do:
//
//   - Generate prose (per-personality-templates.ts handles that)
//   - Make recommendations or verdicts
//   - Re-interpret posture state — CP-7 already produced it
//
// Why this module exists separately from the template:
//
//   The structured synthesis layer is auditable independently. A
//   reviewer can inspect "what did the synthesis say about SBA?"
//   without rendering any prose. The template later renders that
//   structured input into language. Splitting these responsibilities
//   matches the constitutional commitment that synthesis is the
//   product and prose is presentation.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  AxisCompositionResult,
  AxisScore,
  UncertaintyAxisScore,
} from "../../axes/types";
import type {
  BatchSimulationResult,
} from "../../simulation/types";
import type {
  CoverageGapFinding,
  PersonalityNarrativeInput,
} from "../types";
import { isPersonalityCoverageGapAffected } from "./coverage-gap";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface PerPersonalityInputs {
  readonly axis_composition_result: AxisCompositionResult;
  readonly batch_posture_result: BatchSimulationResult;
  readonly coverage_gap_finding: CoverageGapFinding;
}

/**
 * Build PersonalityNarrativeInput records for each personality.
 *
 * Pure deterministic function. Returns one record per personality
 * present in the batch, in stable catalogue order (matches the
 * batch's entry order, which itself matches the catalogue).
 *
 * Each record carries the structured per-personality data templates
 * will render into prose. Records are independent of each other —
 * each personality's narrative input is computed from its own posture
 * plus the global coverage-gap finding.
 */
export function buildPerPersonalityInputs(
  inputs: PerPersonalityInputs,
): ReadonlyArray<PersonalityNarrativeInput> {
  const { axis_composition_result, batch_posture_result, coverage_gap_finding } = inputs;

  return batch_posture_result.entries.map((entry) => {
    const personality_id = entry.personality_id;
    const posture = entry.posture;

    // ── Determine the primary axis (priority position 1) ──
    const primaryAxis = posture.axis_priority_order_used[0];
    const primaryAxisScore = lookupAxisScore(axis_composition_result, primaryAxis);

    // ── Bucket discomforts by repairability ──
    const fatalDiscomforts = posture.discomfort_chain
      .filter((d) => d.repairability === "fatal")
      .map((d) => d.discomfort_source_id);
    const repairableDiscomforts = posture.discomfort_chain
      .filter((d) => d.repairability === "repairable")
      .map((d) => d.discomfort_source_id);

    // ── Coverage-gap-affected flag ──
    const isCoverageGapAffected = isPersonalityCoverageGapAffected(
      coverage_gap_finding,
      personality_id,
    );

    return {
      personality_id,
      personality_version: posture.personality_version,
      state: posture.state,
      is_coverage_gap_affected: isCoverageGapAffected,
      triggered_deal_breaker_ids: posture.triggered_deal_breakers,
      fatal_discomfort_ids: fatalDiscomforts,
      repairable_discomfort_ids: repairableDiscomforts,
      unsatisfied_comfort_condition_ids: posture.unsatisfied_comfort_conditions,
      satisfied_comfort_condition_ids: posture.satisfied_comfort_conditions,
      primary_axis: primaryAxis,
      primary_axis_score: primaryAxisScore.score,
      primary_axis_band: primaryAxisScore.band,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: AXIS LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

function lookupAxisScore(
  result: AxisCompositionResult,
  axis: AxisKey,
): AxisScore | UncertaintyAxisScore {
  switch (axis) {
    case "financial_score": return result.financial_score;
    case "durability_score": return result.durability_score;
    case "evidence_quality": return result.evidence_quality;
    case "assumption_fragility": return result.assumption_fragility;
    case "underwriting_uncertainty": return result.underwriting_uncertainty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarize one personality's narrative input for governance / debug
 * inspection. Returns plain-text lines.
 */
export function summarizePerPersonalityInput(
  input: PersonalityNarrativeInput,
): ReadonlyArray<string> {
  const lines: string[] = [];
  lines.push(`${input.personality_id}@${input.personality_version}`);
  lines.push(`  state: ${input.state}${input.is_coverage_gap_affected ? " (coverage-gap-affected)" : ""}`);
  lines.push(`  primary_axis: ${input.primary_axis} = ${input.primary_axis_score.toFixed(1)} (${input.primary_axis_band})`);
  lines.push(`  deal_breakers: ${input.triggered_deal_breaker_ids.length}`);
  lines.push(`  fatal_discomforts: ${input.fatal_discomfort_ids.length}`);
  lines.push(`  repairable_discomforts: ${input.repairable_discomfort_ids.length}`);
  lines.push(`  unsatisfied_comfort: ${input.unsatisfied_comfort_condition_ids.length}`);
  lines.push(`  satisfied_comfort: ${input.satisfied_comfort_condition_ids.length}`);
  return lines;
}
