// lib/intelligence/narrative/synthesis/assumption-concentration.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Assumption Concentration Synthesis
//
// CP-8 Module: Translates CP-5 fragility graph nodes into institutional
// prose about which assumptions carry the deal's underwriting weight.
//
// What this module computes:
//
//   Given the AxisCompositionResult (specifically its
//   assumption_fragility_graph), surface the most consequential
//   assumptions — those carrying the highest number of dependent
//   conclusions, spanning the broadest axis surface, or supporting
//   conclusions with the weakest evidence.
//
//   Each AssumptionConcentrationFinding becomes a narrative fragment:
//
//     Instead of "fragility score is 84," the synthesis says:
//
//     "Seven favorable conclusions across financial, durability, and
//      evidence axes rest on add-back integrity. The substantiation
//      strength supporting those conclusions is concerning, meaning
//      a single diligence finding on the add-back schedule cascades
//      across multiple underwriting axes simultaneously."
//
//   This is the SYNTHESIS_OVER_RECITATION_PRINCIPLE at the assumption
//   layer: scores describe the surface; this module translates the
//   underlying structure into institutional meaning.
//
// What this module does NOT do:
//
//   - Generate the final fragment prose (assumption templates render
//     the framing_description into a NarrativeFragment)
//   - Mutate the fragility graph
//   - Re-classify favorable / unfavorable conclusions
//
// Selection algorithm:
//
//   The fragility graph contains nodes for every assumption with at
//   least one dependent conclusion. We score each node by a combined
//   importance metric:
//
//     importance = conclusion_count
//                + (favorable_unfavorable_imbalance × 1)
//                + (axis_spread_count × 2)
//                + (concerning_evidence_strength_bonus)
//
//   The top N nodes by importance become AssumptionConcentrationFindings.
//   Default N=5 — institutionally informative without flooding.
//
//   We surface findings even when fragility is in low_concentration
//   band, because the buyer still benefits from knowing which assumptions
//   carry the most weight — even when the overall fragility surface is
//   manageable, the top assumptions are still worth diligence prioritization.
//
// Edge cases:
//
//   - Empty graph (deal with no assumptions tracked): returns empty array
//   - Graph with all single-conclusion nodes: still returns top-N findings,
//     framing notes that no single assumption dominates
//   - Highly concentrated graph: top N findings will all carry high counts;
//     framing notes the institutional implication
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisKey,
} from "../../types";
import type {
  AxisCompositionResult,
} from "../../axes/types";
import type {
  AssumptionConcentrationFinding,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of top assumption nodes to surface as findings. 5 is the
 * institutionally informative limit — enough to show the assumptions
 * carrying the most underwriting weight without flooding the narrative.
 */
export const TOP_ASSUMPTIONS_PER_FINDING = 5;

/**
 * Importance weights for the assumption-scoring formula.
 */
const CONCLUSION_COUNT_WEIGHT = 1;
const FAVORABLE_UNFAVORABLE_IMBALANCE_WEIGHT = 1;
const AXIS_SPREAD_WEIGHT = 2;
const WEAK_EVIDENCE_BONUS = 3;
const WEAK_EVIDENCE_THRESHOLD = 50; // evidence_strength below this gets bonus

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANCE SCORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute an assumption node's importance score for ranking purposes.
 *
 * Higher importance = more institutionally consequential to surface
 * as a narrative finding.
 *
 * The formula weights:
 *   - Total conclusion count (more dependents = more weight)
 *   - Imbalance between favorable and unfavorable conclusions
 *     (one-directional assumption carrying many conclusions is more
 *     consequential than a balanced one)
 *   - Axis spread (assumption affecting multiple axes is more
 *     consequential than one affecting just one axis)
 *   - Weak evidence bonus (assumption with weak evidence supporting
 *     many conclusions is the highest-priority concern)
 */
interface FragilityNode {
  readonly assumption_key: string;
  readonly assumption_name: string;
  readonly conclusion_count: number;
  readonly favorable_count: number;
  readonly unfavorable_count: number;
  readonly axis_spread: ReadonlyArray<AxisKey>;
  readonly evidence_strength: number;
}

function importanceScore(node: FragilityNode): number {
  const imbalance = Math.abs(node.favorable_count - node.unfavorable_count);
  const axisSpreadCount = node.axis_spread.length;

  let score =
    node.conclusion_count * CONCLUSION_COUNT_WEIGHT +
    imbalance * FAVORABLE_UNFAVORABLE_IMBALANCE_WEIGHT +
    axisSpreadCount * AXIS_SPREAD_WEIGHT;

  if (node.evidence_strength < WEAK_EVIDENCE_THRESHOLD) {
    score += WEAK_EVIDENCE_BONUS;
  }

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAMING PROSE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the institutional framing description for one assumption node.
 *
 * The framing translates the structural shape (N conclusions across M
 * axes with weak evidence) into language a buyer can read and act on.
 */
function buildFramingDescription(node: FragilityNode): string {
  const { conclusion_count, favorable_count, unfavorable_count, axis_spread } = node;

  const axisCount = axis_spread.length;
  const axisListing = formatAxisList(axis_spread);

  // ── Single-conclusion assumption (low fragility weight) ──
  if (conclusion_count === 1) {
    return (
      `The ${node.assumption_name} assumption supports a single underwriting conclusion. ` +
      `This is a contained dependency — diligence on this assumption affects one finding rather than cascading across the underwriting surface.`
    );
  }

  // ── Multi-conclusion assumption ──
  const concentrationLanguage = describeConcentration({
    conclusion_count,
    axis_count: axisCount,
  });

  const directionalityLanguage = describeDirectionality({
    favorable_count,
    unfavorable_count,
  });

  const evidenceLanguage = describeEvidenceContext(node.evidence_strength);

  const parts: string[] = [];

  parts.push(
    `${concentrationLanguage} on the ${node.assumption_name} assumption across ${axisListing}.`,
  );

  if (directionalityLanguage) {
    parts.push(directionalityLanguage);
  }

  if (evidenceLanguage) {
    parts.push(evidenceLanguage);
  }

  return parts.join(" ");
}

function describeConcentration(args: {
  conclusion_count: number;
  axis_count: number;
}): string {
  // Choose framing based on conclusion count and axis spread
  if (args.conclusion_count >= 6 && args.axis_count >= 3) {
    return `Multiple underwriting conclusions converge`;
  }
  if (args.conclusion_count >= 4) {
    return `Several underwriting conclusions rest`;
  }
  if (args.conclusion_count >= 2 && args.axis_count >= 2) {
    return `Multiple underwriting conclusions across distinct axes depend`;
  }
  return `${args.conclusion_count} underwriting conclusions rest`;
}

function describeDirectionality(args: {
  favorable_count: number;
  unfavorable_count: number;
}): string {
  if (args.favorable_count > 0 && args.unfavorable_count === 0) {
    return (
      `All dependent conclusions are favorable, meaning a diligence finding that erodes this assumption removes upside without unlocking any offsetting unfavorable conclusion — the asymmetry runs one direction.`
    );
  }
  if (args.unfavorable_count > 0 && args.favorable_count === 0) {
    return (
      `All dependent conclusions are unfavorable, meaning the assumption currently anchors negative signals — relaxing this assumption could potentially shift posture in a favorable direction.`
    );
  }
  // Both present
  const total = args.favorable_count + args.unfavorable_count;
  if (args.favorable_count / total >= 0.75) {
    return (
      `Dependent conclusions skew predominantly favorable, so erosion of this assumption removes more upside than it unlocks downside.`
    );
  }
  if (args.unfavorable_count / total >= 0.75) {
    return (
      `Dependent conclusions skew predominantly unfavorable, so reinforcement of this assumption could meaningfully shift posture downward in further analysis but is unlikely to broadly improve the underwriting read.`
    );
  }
  return ""; // balanced — no directionality framing
}

function describeEvidenceContext(evidence_strength: number): string {
  if (evidence_strength >= 80) {
    return (
      `Evidence supporting this assumption is strong, meaning the dependency surface is well-anchored — concentration on this assumption is structurally less concerning than concentration on weaker-supported assumptions.`
    );
  }
  if (evidence_strength >= 60) {
    return (
      `Evidence supporting this assumption is moderate; the dependency is not yet anchored in verified primary sources, leaving room for diligence work to either strengthen or unwind the concentration.`
    );
  }
  if (evidence_strength >= 40) {
    return (
      `Evidence supporting this assumption is cautionary, meaning the concentration of dependent conclusions sits on a documentary base that may not survive diligence stress.`
    );
  }
  return (
    `Evidence supporting this assumption is concerning, making the concentration of dependent conclusions a primary diligence priority — a single substantiation finding cascades across the underwriting surface.`
  );
}

function formatAxisList(axes: ReadonlyArray<AxisKey>): string {
  if (axes.length === 0) return "no axes";
  if (axes.length === 1) return `the ${axes[0]} axis`;
  if (axes.length === 2) return `the ${axes[0]} and ${axes[1]} axes`;
  const allButLast = axes.slice(0, -1).join(", ");
  const last = axes[axes.length - 1];
  return `the ${allButLast}, and ${last} axes`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY API
// ─────────────────────────────────────────────────────────────────────────────

export interface AssumptionConcentrationInputs {
  readonly axis_composition_result: AxisCompositionResult;
}

/**
 * Build AssumptionConcentrationFinding records from the fragility graph.
 *
 * Pure deterministic function. Returns up to TOP_ASSUMPTIONS_PER_FINDING
 * findings, sorted by importance score descending.
 *
 * Returns an empty array only when the fragility graph has no nodes
 * (no assumptions were tracked for this deal).
 */
export function buildAssumptionConcentrationFindings(
  inputs: AssumptionConcentrationInputs,
): ReadonlyArray<AssumptionConcentrationFinding> {
  const graph = inputs.axis_composition_result.assumption_fragility_graph;

  if (graph.nodes.length === 0) return [];

  // ── Step 1: Cast graph nodes into the typed shape and score them ──
  const scored = graph.nodes.map((rawNode) => {
    const node: FragilityNode = {
      assumption_key: rawNode.assumption_key,
      assumption_name: rawNode.assumption_name ?? rawNode.assumption_key,
      conclusion_count: rawNode.conclusion_count,
      favorable_count: rawNode.favorable_dependent_count,
      unfavorable_count: rawNode.unfavorable_dependent_count,
      axis_spread: rawNode.axis_spread,
      evidence_strength: rawNode.evidence_strength,
    };
    return {
      node,
      importance: importanceScore(node),
    };
  });

  // ── Step 2: Sort by importance descending ──
  scored.sort((a, b) => b.importance - a.importance);

  // ── Step 3: Take top N ──
  const topN = scored.slice(0, TOP_ASSUMPTIONS_PER_FINDING);

  // ── Step 4: Build findings ──
  return topN.map(({ node }) => ({
    assumption_key: node.assumption_key as AssumptionConcentrationFinding["assumption_key"],
    assumption_name: node.assumption_name,
    conclusion_count: node.conclusion_count,
    favorable_count: node.favorable_count,
    unfavorable_count: node.unfavorable_count,
    axis_spread: node.axis_spread,
    evidence_strength: node.evidence_strength,
    framing_description: buildFramingDescription(node),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarize one assumption concentration finding for governance / debug.
 */
export function summarizeAssumptionConcentration(
  finding: AssumptionConcentrationFinding,
): ReadonlyArray<string> {
  return [
    `${finding.assumption_key}: ${finding.assumption_name}`,
    `  conclusions: ${finding.conclusion_count} (${finding.favorable_count} favorable, ${finding.unfavorable_count} unfavorable)`,
    `  axis_spread: [${finding.axis_spread.join(", ")}]`,
    `  evidence_strength: ${finding.evidence_strength.toFixed(1)}`,
    `  framing:`,
    `    ${finding.framing_description}`,
  ];
}
