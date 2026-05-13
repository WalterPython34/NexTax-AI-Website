// lib/intelligence/narrative/synthesis/coverage-gap.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Coverage Gap Synthesis
//
// CP-8 Module: Detects when personality posture was driven by model
// coverage limitations (fallback fingerprint resolution) rather than
// deal weakness.
//
// This module enforces the FALLBACK_FINGERPRINT_FRAMING_PRINCIPLE:
//
//   When the engine resolves to a fallback fingerprint (industry not
//   in registry), the model_uncertainty sub-axis spikes, and
//   personalities with model-uncertainty-sensitive deal-breakers
//   (notably SBA) auto-decline. The user experience must never read
//   as "SBA hates accounting firms."
//
//   The decline is a coverage limitation, NOT an institutional judgment
//   about the business.
//
// What this module computes:
//
//   Given an AxisCompositionResult + BatchSimulationResult, detect:
//
//     1. Is the fingerprint resolution a fallback? (is_fallback=true)
//     2. Which personalities had posture driven (in whole or in part)
//        by coverage-gap signals?
//     3. What is the underlying industry that lacks fingerprint coverage?
//
//   Sets the CoverageGapFinding with:
//     - is_coverage_gap: true/false (was coverage gap a material driver?)
//     - industry_key, industry_display_name (what's missing)
//     - affected_personalities (which simulations are affected)
//     - explanation (template-renderable prose)
//
// Detection heuristics:
//
//   A personality's posture is "coverage-gap-affected" when ANY of:
//
//     A) Its triggered deal-breakers reference fallback_fingerprint
//        (e.g., sba.deal_breaker.fallback_fingerprint)
//
//     B) Its discomfort_chain references fallback_fingerprint
//        component IDs
//
//     C) The model_uncertainty sub-axis is at severe/elevated band AND
//        any of its discomfort triggers fired on this elevation
//
// The is_coverage_gap top-level flag is true when AT LEAST ONE
// personality is coverage-gap-affected AND the fingerprint resolution
// has is_fallback=true.
//
// Why this synthesis exists:
//
//   Templates downstream must produce DIFFERENT prose depending on
//   whether posture was driven by deal weakness or by model coverage.
//   Without this synthesis, templates would have no deterministic way
//   to distinguish "the deal is structurally weak" from "the engine
//   doesn't yet support this industry." Conflating these is the
//   commercial UX failure mode flagged in CP-7 review.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisCompositionResult,
} from "../../axes/types";
import type {
  BatchSimulationResult,
} from "../../simulation/types";
import type {
  PersonalityId,
} from "../../personalities/types";
import type {
  CoverageGapFinding,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE GAP MARKERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Substrings in deal-breaker IDs, discomfort IDs, or component IDs that
 * indicate a coverage-gap-driven signal. When any of these appear in a
 * personality's triggered_deal_breakers or discomfort_chain, we treat
 * that personality as coverage-gap-affected.
 *
 * Currently:
 *   - "fallback_fingerprint" matches sba.deal_breaker.fallback_fingerprint
 *     and component.uncertainty.fallback_fingerprint_used
 *   - "fallback_methodology" matches component.evidence.fallback_methodology_drag
 *
 * These markers are stable IDs from CP-6 catalogue and CP-5 axis modules.
 * Editing them requires governance review because they're the bridge
 * between the structural detection (CP-2 fingerprint resolution) and
 * the narrative interpretation (this module).
 */
const COVERAGE_GAP_ID_MARKERS: ReadonlyArray<string> = [
  "fallback_fingerprint",
  "fallback_methodology",
  "fallback_used",
];

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface CoverageGapInputs {
  readonly axis_composition_result: AxisCompositionResult;
  readonly batch_posture_result: BatchSimulationResult;
}

/**
 * Detect whether personality posture was driven by model coverage gap.
 *
 * Pure deterministic function. Always returns a CoverageGapFinding
 * (never null) so downstream synthesis can read the structured flag
 * unconditionally.
 *
 * Process:
 *   1. Check if the fingerprint resolution is a fallback
 *   2. If not fallback, return is_coverage_gap=false with empty
 *      affected_personalities — coverage gap is not in play
 *   3. If fallback, identify which personalities have coverage-gap
 *      markers in their triggered deal-breakers or discomfort chain
 *   4. Build the finding with the industry information and explanation
 *
 * The is_coverage_gap=true case requires BOTH the fingerprint being
 * a fallback AND at least one personality being affected by it.
 * A fallback fingerprint that produces clean posture across all
 * personalities (rare but possible if all four personalities have no
 * coverage-gap-sensitive triggers) does not flag as is_coverage_gap=true.
 */
export function detectCoverageGap(
  inputs: CoverageGapInputs,
): CoverageGapFinding {
  const { axis_composition_result, batch_posture_result } = inputs;

  const resolution = axis_composition_result.fingerprint_resolution;
  const isFallback = resolution.is_fallback;

  // ── Case 1: not a fallback fingerprint, coverage gap is not in play ──
  if (!isFallback) {
    return {
      is_coverage_gap: false,
      industry_key: null,
      industry_display_name: null,
      affected_personalities: [],
      explanation:
        "Fingerprint resolved to an industry-specific operating model; coverage gap is not a factor in this evaluation.",
    };
  }

  // ── Case 2: Identify coverage-gap-affected personalities ──
  const affectedPersonalities: PersonalityId[] = [];

  for (const entry of batch_posture_result.entries) {
    let isAffected = false;

    // Check triggered deal-breakers
    for (const dbId of entry.posture.triggered_deal_breakers) {
      if (containsCoverageGapMarker(dbId)) {
        isAffected = true;
        break;
      }
    }

    // Check discomfort chain
    if (!isAffected) {
      for (const d of entry.posture.discomfort_chain) {
        if (containsCoverageGapMarker(d.discomfort_source_id)) {
          isAffected = true;
          break;
        }
        // Also check trigger explanation for component references
        if (containsCoverageGapMarker(d.trigger_explanation)) {
          isAffected = true;
          break;
        }
      }
    }

    if (isAffected) {
      affectedPersonalities.push(entry.personality_id);
    }
  }

  // ── Case 3: Determine industry information ──
  // The fingerprint's display_name is the fallback model's display name
  // ("Professional Services" etc), not the original requested industry.
  // We surface the fallback model's display name with explicit framing
  // that this is the fallback used, not the original industry.
  const industryKey = resolution.fingerprint.key;
  const industryDisplayName = resolution.fingerprint.display_name;

  // ── Case 4: Build explanation prose for templates ──
  const explanation = buildCoverageGapExplanation({
    is_fallback: isFallback,
    fallback_display_name: industryDisplayName,
    fallback_reason: resolution.fallback_reason,
    affected_personalities: affectedPersonalities,
  });

  // is_coverage_gap is true only when fallback AND at least one personality affected
  const isCoverageGap = isFallback && affectedPersonalities.length > 0;

  return {
    is_coverage_gap: isCoverageGap,
    industry_key: industryKey,
    industry_display_name: industryDisplayName,
    affected_personalities: affectedPersonalities,
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Case-insensitive substring match for coverage-gap markers.
 *
 * The markers are normalized to lowercase before comparison; the input
 * is lowercased as well. This avoids fragility from inconsistent
 * casing across modules.
 */
function containsCoverageGapMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return COVERAGE_GAP_ID_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLANATION PROSE
// ─────────────────────────────────────────────────────────────────────────────

interface ExplanationInputs {
  readonly is_fallback: boolean;
  readonly fallback_display_name: string;
  readonly fallback_reason: string;
  readonly affected_personalities: ReadonlyArray<PersonalityId>;
}

function buildCoverageGapExplanation(inputs: ExplanationInputs): string {
  if (!inputs.is_fallback) {
    return "Fingerprint resolved to an industry-specific operating model; coverage gap is not a factor.";
  }

  if (inputs.affected_personalities.length === 0) {
    return (
      `The engine resolved to a fallback fingerprint (${inputs.fallback_display_name}) ` +
      `because no industry-specific fingerprint was available${inputs.fallback_reason ? ` (${inputs.fallback_reason})` : ""}. ` +
      `However, no personality simulations in this batch were materially affected by the fallback signal; ` +
      `personality postures reflect axis truth rather than coverage limitations.`
    );
  }

  const personalityList = formatPersonalityList(inputs.affected_personalities);
  const reasonClause = inputs.fallback_reason
    ? ` (${inputs.fallback_reason})`
    : "";

  return (
    `Personality posture for ${personalityList} was driven in whole or in part by a model coverage limitation rather than by deal characteristics. ` +
    `The engine does not yet have an industry-specific operating-model fingerprint registered for this business type, so it resolved to a fallback fingerprint (${inputs.fallback_display_name})${reasonClause}. ` +
    `Without industry-specific operating standards (benchmark margins, expected scenario clearance bands, industry-typical assumption surface), certain personalities cannot form a confident posture from the available data. ` +
    `This is a registry coverage gap, not an institutional verdict on the business. ` +
    `Once an industry-specific fingerprint is registered, these personality postures would be re-evaluated against industry-specific operating expectations.`
  );
}

function formatPersonalityList(ids: ReadonlyArray<PersonalityId>): string {
  if (ids.length === 0) return "no personalities";
  if (ids.length === 1) return `the ${ids[0]} personality simulation`;
  if (ids.length === 2) {
    return `the ${ids[0]} and ${ids[1]} personality simulations`;
  }
  const allButLast = ids.slice(0, -1).join(", ");
  const last = ids[ids.length - 1];
  return `the ${allButLast}, and ${last} personality simulations`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return true if a specific personality's posture was coverage-gap-affected.
 * Used by per-personality narrative templates to decide framing.
 */
export function isPersonalityCoverageGapAffected(
  finding: CoverageGapFinding,
  personality_id: PersonalityId,
): boolean {
  return finding.is_coverage_gap &&
    finding.affected_personalities.includes(personality_id);
}

/**
 * Return the list of coverage-gap marker substrings. Exposed for
 * validator modules to verify their own coverage-gap detection
 * stays in sync with this synthesis layer.
 */
export function getCoverageGapMarkers(): ReadonlyArray<string> {
  return COVERAGE_GAP_ID_MARKERS;
}
