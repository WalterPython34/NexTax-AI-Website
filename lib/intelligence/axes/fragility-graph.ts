// lib/intelligence/axes/fragility-graph.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Assumption Fragility Graph Construction
//
// CP-5 Module: Builds the full assumption fragility graph from rule
// firings, pattern detections, and scenario outputs.
//
// The fragility graph is one of the most important differentiators in
// the engine. It is NOT a summary count. The value is in showing:
//
//   - assumption concentration   (rule_count, pattern_count, scenario_count)
//   - conclusion dependency      (conclusion_count, dependent_conclusions[])
//   - criticality weighting       (criticality_weighted_count)
//   - layering depth             (layering_depth)
//   - axis spread                (axis_spread)
//   - polarity composition       (favorable_dependent_count vs unfavorable)
//
// This is what enables the engine to say:
//   "Seven favorable conclusions depend on add-back integrity."
//
// That statement is structurally meaningful because:
//   1. It identifies the assumption (add_back_integrity)
//   2. It counts dependent conclusions (seven)
//   3. It surfaces polarity (favorable — the conclusions support the deal)
//   4. It implies the inverse — if add_back_integrity fails, seven
//      favorable conclusions evaporate simultaneously
//
// Module responsibilities:
//
//   1. Enumerate ALL conclusions in the engine output (rule firings +
//      pattern detections + scenario outputs)
//   2. For each conclusion, determine which assumptions it depends on,
//      its polarity, and its importance class
//   3. Build per-assumption nodes counting and characterizing the
//      dependent conclusions
//   4. Compute layering_depth (max chain length through conclusions)
//   5. Compute evidence_strength per assumption from source signals
//   6. Identify hotspots — assumptions where concentration, criticality,
//      or unfavorable polarity warrant attention
//   7. Build the edge list connecting assumptions → conclusions
//
// What this module does NOT do:
//
//   - Compute the assumption_fragility AXIS SCORE (that's compose-fragility.ts)
//   - Write to other axes (the graph is read-only by other composers)
//   - Apply per-component normalization (that's the composer's job)
//   - Generate narrative prose
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
  SourceTypeKey,
} from "../types";
import type {
  PatternDetection,
  RuleFiring,
} from "../rules/types";
import type {
  ScenarioOutput,
} from "../scenarios/types";
import type {
  AssumptionDependencyEdge,
  AssumptionFragilityGraph,
  AssumptionFragilityNode,
  ConclusionImportance,
  ConclusionReference,
} from "./types";
import { FRAGILITY_GRAPH_VERSION } from "./types";
import { ASSUMPTIONS } from "../assumption-taxonomy";
import { resolveSourceStrength } from "../source-types";

// ─────────────────────────────────────────────────────────────────────────────
// CONCLUSION ENUMERATION
// ─────────────────────────────────────────────────────────────────────────────
// Every rule firing, pattern detection, and scenario output that has at
// least one assumption dependency becomes a Conclusion in the graph.
// Findings without assumption dependencies (e.g., pure source concerns)
// are skipped — they belong to other axes.

interface InternalConclusion {
  readonly conclusion_id: string;
  readonly reference: ConclusionReference;
  readonly assumption_keys: ReadonlyArray<AssumptionKey>;
}

/**
 * Convert a RuleFiring into a ConclusionReference if it carries
 * assumption dependencies. Returns null when the firing has no
 * assumptions or no axis impact (pure observational firings).
 */
function conclusionFromFiring(firing: RuleFiring): InternalConclusion | null {
  if (firing.depends_on_assumptions.length === 0) return null;

  // Determine axes affected. Read from Finding.axis_impact if present;
  // otherwise the firing doesn't affect axes (e.g., pure uncertainty
  // signal) and shouldn't appear in the fragility graph.
  if (!firing.finding) return null;
  const axesAffected = firing.finding.axis_impact.map((i) => i.axis);
  if (axesAffected.length === 0) return null;

  // Determine importance:
  //   structurally_suspicious + concern → headline_conclusion
  //   high-severity concern or strength → supporting_conclusion
  //   medium-severity, observation, or non-load-bearing → informational_observation
  let importance: ConclusionImportance;
  if (firing.classification === "structurally_suspicious" && firing.polarity === "concern") {
    importance = "headline_conclusion";
  } else if (firing.severity === "high" && (firing.polarity === "concern" || firing.polarity === "strength")) {
    importance = "supporting_conclusion";
  } else {
    importance = "informational_observation";
  }

  // Determine polarity for graph purposes
  let polarity: "favorable" | "unfavorable" | "neutral";
  if (firing.polarity === "strength") polarity = "favorable";
  else if (firing.polarity === "concern") polarity = "unfavorable";
  else polarity = "neutral";

  return {
    conclusion_id: `conclusion.firing.${firing.firing_id}`,
    reference: {
      conclusion_id: `conclusion.firing.${firing.firing_id}`,
      source_type: "rule_firing",
      source_id: firing.rule_id,
      description: firing.what_triggered,
      importance,
      axes_affected: axesAffected,
      polarity,
    },
    assumption_keys: firing.depends_on_assumptions,
  };
}

/**
 * Convert a PatternDetection into a ConclusionReference. Patterns are
 * second-order signals; they always appear in the graph (no zero-axis
 * filter) because pattern detections inherently affect multiple axes.
 */
function conclusionFromPattern(pattern: PatternDetection): InternalConclusion | null {
  if (pattern.aggregated_assumptions.length === 0) return null;

  // Pattern detections are by definition multi-signal coherent concerns —
  // they qualify as headline_conclusion when high-severity, supporting
  // when medium, informational when low.
  let importance: ConclusionImportance;
  if (pattern.severity === "high") importance = "headline_conclusion";
  else if (pattern.severity === "medium") importance = "supporting_conclusion";
  else importance = "informational_observation";

  return {
    conclusion_id: `conclusion.pattern.${pattern.detection_id}`,
    reference: {
      conclusion_id: `conclusion.pattern.${pattern.detection_id}`,
      source_type: "pattern_detection",
      source_id: pattern.pattern_id,
      description: pattern.what_triggered,
      importance,
      axes_affected: pattern.aggregated_axes,
      polarity: "unfavorable", // patterns capture coherent concerns by design
    },
    assumption_keys: pattern.aggregated_assumptions,
  };
}

/**
 * Convert a ScenarioOutput into a ConclusionReference. Only applied
 * scenarios become conclusions; not_applicable scenarios add nothing
 * to the graph.
 */
function conclusionFromScenario(scenario: ScenarioOutput): InternalConclusion | null {
  if (!scenario.applied) return null;
  if (scenario.depends_on_assumptions.length === 0) return null;

  // Importance keyed off scenario clearance:
  //   fails (existential or coverage)        → headline_conclusion
  //   structurally_compressed               → supporting_conclusion
  //   clears_marginally / clears_comfortably → informational (positive)
  let importance: ConclusionImportance;
  let polarity: "favorable" | "unfavorable" | "neutral";
  switch (scenario.clears) {
    case "fails":
      importance = "headline_conclusion";
      polarity = "unfavorable";
      break;
    case "structurally_compressed":
      importance = "supporting_conclusion";
      polarity = "unfavorable";
      break;
    case "clears_marginally":
      importance = "informational_observation";
      polarity = "neutral";
      break;
    case "clears_comfortably":
      importance = "informational_observation";
      polarity = "favorable";
      break;
    case "not_applicable":
      return null;
  }

  // Axes affected: scenarios primarily affect durability and financial_score
  // through their clearance impact. Read from the scenario's clearance_basis
  // to infer.
  const axesAffected: AxisKey[] = [];
  switch (scenario.clearance_basis) {
    case "coverage":
      axesAffected.push("financial_score", "durability_score");
      break;
    case "margin":
      axesAffected.push("financial_score");
      break;
    case "working_capital":
      axesAffected.push("durability_score", "financial_score");
      break;
    case "concentration":
      axesAffected.push("durability_score");
      break;
    case "composite":
      axesAffected.push("financial_score", "durability_score");
      break;
  }

  return {
    conclusion_id: `conclusion.scenario.${scenario.output_id}`,
    reference: {
      conclusion_id: `conclusion.scenario.${scenario.output_id}`,
      source_type: "scenario_output",
      source_id: scenario.scenario_id,
      description: `${scenario.scenario_name}: ${scenario.clearance_reason}`,
      importance,
      axes_affected: axesAffected,
      polarity,
    },
    assumption_keys: scenario.depends_on_assumptions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE STRENGTH PER ASSUMPTION
// ─────────────────────────────────────────────────────────────────────────────
// Each assumption's evidence_strength is derived from the source-types
// supporting its dependent conclusions. If the underlying source is
// tax_returns, the assumption rests on strong evidence; if seller_spreadsheet
// or unknown, evidence is weak.
//
// The mapping below identifies which assumption keys map to which input
// types. Where multiple inputs support an assumption, the strongest
// source wins (we credit the verified path even if weaker paths exist).

const ASSUMPTION_INPUT_MAPPING: Partial<Record<AssumptionKey, ReadonlyArray<string>>> = {
  add_back_integrity: ["addback_schedule", "sde", "owner_compensation"],
  revenue_quality: ["revenue", "cash_receipts"],
  customer_retention: ["customer_concentration", "contract_status"],
  key_person_transferability: ["customer_concentration"],
  labor_retention: ["labor_cost", "headcount"],
  supplier_stability: [], // typically verbal at SMB scale
  working_capital_stability: ["ar_aging", "ar_days"],
  inventory_behavior_stability: ["inventory_detail"],
  pricing_power: ["revenue"],
  margin_sustainability: ["revenue", "sde", "addback_schedule"],
  recurring_revenue_persistence: ["contract_status", "revenue"],
  capex_stability: ["capex_history"],
  reimbursement_stability: ["payer_mix"],
  covenant_headroom: ["sde", "dscr_calculation"],
  transition_execution: [], // largely buyer-skill-dependent
};

/**
 * Compute evidence_strength (0-100) for an assumption based on the deal's
 * source profile.
 *
 * Strategy:
 *   - If deal_source_type is provided and the assumption has mapped inputs,
 *     use the deal source strength as a proxy (all inputs at this strength
 *     at minimum)
 *   - Otherwise return 50 (neutral — not strong, not weak)
 *
 * Future enhancement (CP-9+): use per-metric source mapping
 * (metric_sources) to compute per-input source strength precisely.
 */
function computeEvidenceStrength(
  assumption_key: AssumptionKey,
  deal_source_type: string | null,
): number {
  const mappedInputs = ASSUMPTION_INPUT_MAPPING[assumption_key];
  if (!mappedInputs || mappedInputs.length === 0) {
    // No mapped inputs — assumption is verbal/structural by nature
    return 30; // below neutral because it can't be verified through standard sources
  }
  if (!deal_source_type) {
    return 30; // unknown source — fall back to weak default
  }
  // Use the deal source strength as the floor for assumption evidence
  return resolveSourceStrength(deal_source_type as SourceTypeKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYERING DEPTH COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────
// Layering depth for an assumption = max chain length through dependent
// conclusions. In CP-5, conclusions don't formally chain (no rule depends
// on another rule's output by design), so layering depth is computed via:
//
//   depth = 1                    (the assumption itself)
//        + count of "secondary" axes affected (each is a downstream
//          axis impact)
//
// This is a forward-compatible approximation. CP-9+ may introduce
// explicit conclusion-on-conclusion chains via memory queries, at which
// point this function expands to do graph traversal.

function computeLayeringDepth(
  conclusions: ReadonlyArray<ConclusionReference>,
): number {
  if (conclusions.length === 0) return 0;

  // Count distinct axes affected across all dependent conclusions
  const allAxes = new Set<AxisKey>();
  for (const c of conclusions) {
    for (const a of c.axes_affected) {
      allAxes.add(a);
    }
  }
  // Max chain: the assumption itself + the axes it propagates through
  // Bounded at 5 (one per axis) for sanity.
  return Math.min(5, 1 + allAxes.size);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRITICALITY-WEIGHTED COUNT
// ─────────────────────────────────────────────────────────────────────────────

const IMPORTANCE_WEIGHT: Record<ConclusionImportance, number> = {
  headline_conclusion: 3,
  supporting_conclusion: 1.5,
  informational_observation: 0.5,
};

function computeCriticalityWeightedCount(
  conclusions: ReadonlyArray<ConclusionReference>,
): number {
  return conclusions.reduce((acc, c) => acc + IMPORTANCE_WEIGHT[c.importance], 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIS SPREAD
// ─────────────────────────────────────────────────────────────────────────────

function computeAxisSpread(
  conclusions: ReadonlyArray<ConclusionReference>,
): ReadonlyArray<AxisKey> {
  const seen = new Set<AxisKey>();
  for (const c of conclusions) {
    for (const a of c.axes_affected) {
      seen.add(a);
    }
  }
  return Array.from(seen);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOTSPOT DETECTION
// ─────────────────────────────────────────────────────────────────────────────
// An assumption is a hotspot when it concentrates risk such that its
// failure would materially compress the underwriting case.
//
// Hotspot criteria (any of):
//   1. conclusion_count >= 4 (concentration)
//   2. criticality_weighted_count >= 6 (severity-weighted concentration)
//   3. axis_spread.length >= 3 AND unfavorable_dependent_count >= 2
//      (cross-axis unfavorable spread)
//   4. unfavorable_dependent_count >= 3 (unfavorable cluster on one assumption)
//
// Hotspot status is NOT a verdict. It identifies WHERE the dependency
// concentration sits, which is what makes "Seven favorable conclusions
// depend on add-back integrity" meaningful — it surfaces the structure,
// not the conclusion about the deal.

interface HotspotEvaluation {
  readonly is_hotspot: boolean;
  readonly hotspot_explanation: string;
}

function evaluateHotspot(args: {
  assumption_name: string;
  conclusion_count: number;
  criticality_weighted_count: number;
  axis_spread_count: number;
  favorable_count: number;
  unfavorable_count: number;
}): HotspotEvaluation {
  const triggers: string[] = [];

  if (args.conclusion_count >= 4) {
    triggers.push(`${args.conclusion_count} conclusions concentrate here`);
  }
  if (args.criticality_weighted_count >= 6) {
    triggers.push(`criticality-weighted count ${args.criticality_weighted_count.toFixed(1)} reflects load-bearing dependency`);
  }
  if (args.axis_spread_count >= 3 && args.unfavorable_count >= 2) {
    triggers.push(`affects ${args.axis_spread_count} axes simultaneously with ${args.unfavorable_count} unfavorable conclusions`);
  }
  if (args.unfavorable_count >= 3) {
    triggers.push(`${args.unfavorable_count} unfavorable conclusions cluster on this assumption`);
  }

  if (triggers.length === 0) {
    return {
      is_hotspot: false,
      hotspot_explanation: `Not a fragility hotspot — ${args.conclusion_count} dependent conclusions, criticality-weighted ${args.criticality_weighted_count.toFixed(1)}, ${args.axis_spread_count} axes.`,
    };
  }

  return {
    is_hotspot: true,
    hotspot_explanation:
      `${args.assumption_name} is a fragility hotspot: ${triggers.join("; ")}. ` +
      `Diligence priority should reflect the concentration of dependencies on this single assumption.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildFragilityGraphArgs {
  readonly firings: ReadonlyArray<RuleFiring>;
  readonly pattern_detections: ReadonlyArray<PatternDetection>;
  readonly scenario_outputs: ReadonlyArray<ScenarioOutput>;
  readonly deal_source_type: string | null;
}

/**
 * Build the full assumption fragility graph. Pure function — same inputs
 * always produce same outputs.
 *
 * Process:
 *   1. Enumerate all conclusions from firings, patterns, scenarios
 *   2. For each assumption in the taxonomy, find dependent conclusions
 *   3. Compute per-assumption metrics (counts, importance, axis spread,
 *      polarity composition)
 *   4. Evaluate hotspot status
 *   5. Build edge list
 *   6. Compute summary statistics
 */
export function buildFragilityGraph(
  args: BuildFragilityGraphArgs,
): AssumptionFragilityGraph {
  // Step 1: enumerate conclusions
  const conclusions: InternalConclusion[] = [];
  for (const firing of args.firings) {
    const c = conclusionFromFiring(firing);
    if (c) conclusions.push(c);
  }
  for (const pattern of args.pattern_detections) {
    const c = conclusionFromPattern(pattern);
    if (c) conclusions.push(c);
  }
  for (const scenario of args.scenario_outputs) {
    const c = conclusionFromScenario(scenario);
    if (c) conclusions.push(c);
  }

  // Step 2-4: per-assumption analysis
  const nodes: AssumptionFragilityNode[] = [];
  const edges: AssumptionDependencyEdge[] = [];

  for (const assumption of ASSUMPTIONS) {
    // Find all conclusions that depend on this assumption
    const dependentInternal = conclusions.filter((c) =>
      c.assumption_keys.includes(assumption.key),
    );
    const dependentRefs = dependentInternal.map((c) => c.reference);

    // Count by source type
    const ruleCount = dependentRefs.filter((r) => r.source_type === "rule_firing").length;
    const patternCount = dependentRefs.filter((r) => r.source_type === "pattern_detection").length;
    const scenarioCount = dependentRefs.filter((r) => r.source_type === "scenario_output").length;

    // Polarity composition
    const favorableCount = dependentRefs.filter((r) => r.polarity === "favorable").length;
    const unfavorableCount = dependentRefs.filter((r) => r.polarity === "unfavorable").length;

    // Aggregates
    const criticalityWeightedCount = computeCriticalityWeightedCount(dependentRefs);
    const layeringDepth = computeLayeringDepth(dependentRefs);
    const axisSpread = computeAxisSpread(dependentRefs);
    const evidenceStrength = computeEvidenceStrength(assumption.key, args.deal_source_type);

    // Hotspot evaluation
    const hotspot = evaluateHotspot({
      assumption_name: assumption.name,
      conclusion_count: dependentRefs.length,
      criticality_weighted_count: criticalityWeightedCount,
      axis_spread_count: axisSpread.length,
      favorable_count: favorableCount,
      unfavorable_count: unfavorableCount,
    });

    nodes.push({
      assumption_key: assumption.key,
      assumption_name: assumption.name,
      rule_count: ruleCount,
      pattern_count: patternCount,
      scenario_count: scenarioCount,
      conclusion_count: dependentRefs.length,
      evidence_strength: evidenceStrength,
      criticality_weighted_count: criticalityWeightedCount,
      layering_depth: layeringDepth,
      axis_spread: axisSpread,
      dependent_conclusions: dependentRefs,
      favorable_dependent_count: favorableCount,
      unfavorable_dependent_count: unfavorableCount,
      is_hotspot: hotspot.is_hotspot,
      hotspot_explanation: hotspot.hotspot_explanation,
    });

    // Step 5: build edges. Each dependent conclusion produces an edge.
    // Primary vs secondary: headline_conclusion edges are primary; others are secondary.
    for (const ref of dependentRefs) {
      edges.push({
        from_assumption: assumption.key,
        to_conclusion_id: ref.conclusion_id,
        weight: ref.importance === "headline_conclusion" ? "primary" : "secondary",
      });
    }
  }

  // Step 6: summary statistics
  const summary = {
    total_nodes: nodes.length,
    hotspot_count: nodes.filter((n) => n.is_hotspot).length,
    max_conclusion_count: Math.max(0, ...nodes.map((n) => n.conclusion_count)),
    max_layering_depth: Math.max(0, ...nodes.map((n) => n.layering_depth)),
    assumptions_with_zero_dependencies: nodes.filter((n) => n.conclusion_count === 0).length,
    assumptions_with_unfavorable_only: nodes.filter(
      (n) => n.unfavorable_dependent_count > 0 && n.favorable_dependent_count === 0,
    ).length,
    assumptions_with_favorable_only: nodes.filter(
      (n) => n.favorable_dependent_count > 0 && n.unfavorable_dependent_count === 0,
    ).length,
    assumptions_with_mixed: nodes.filter(
      (n) => n.favorable_dependent_count > 0 && n.unfavorable_dependent_count > 0,
    ).length,
  };

  return {
    version: FRAGILITY_GRAPH_VERSION,
    nodes,
    edges,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the node for a given assumption from the graph. Returns null if
 * the assumption doesn't appear in the graph (which would be a graph
 * construction bug since ASSUMPTIONS always produces all 15 nodes).
 */
export function getFragilityNode(
  graph: AssumptionFragilityGraph,
  assumption_key: AssumptionKey,
): AssumptionFragilityNode | null {
  return graph.nodes.find((n) => n.assumption_key === assumption_key) ?? null;
}

/**
 * Return all hotspots in the graph, sorted by criticality_weighted_count
 * descending.
 */
export function getHotspots(
  graph: AssumptionFragilityGraph,
): ReadonlyArray<AssumptionFragilityNode> {
  return graph.nodes
    .filter((n) => n.is_hotspot)
    .slice()
    .sort((a, b) => b.criticality_weighted_count - a.criticality_weighted_count);
}

/**
 * Return assumptions where favorable conclusions concentrate without
 * counter-evidence. These are the "fragile strengths" — if the assumption
 * fails, multiple favorable conclusions evaporate.
 *
 * The constitution's example "Seven favorable conclusions depend on
 * add-back integrity" is exactly this query.
 */
export function getFavorableConcentrations(
  graph: AssumptionFragilityGraph,
  min_favorable_count = 3,
): ReadonlyArray<AssumptionFragilityNode> {
  return graph.nodes
    .filter(
      (n) =>
        n.favorable_dependent_count >= min_favorable_count &&
        n.unfavorable_dependent_count <= 1,
    )
    .slice()
    .sort((a, b) => b.favorable_dependent_count - a.favorable_dependent_count);
}

/**
 * Return assumptions where unfavorable conclusions concentrate. These
 * are the "fragility risks" — assumptions that the deal is structurally
 * leaning against.
 */
export function getUnfavorableConcentrations(
  graph: AssumptionFragilityGraph,
  min_unfavorable_count = 2,
): ReadonlyArray<AssumptionFragilityNode> {
  return graph.nodes
    .filter((n) => n.unfavorable_dependent_count >= min_unfavorable_count)
    .slice()
    .sort((a, b) => b.unfavorable_dependent_count - a.unfavorable_dependent_count);
}

// Suppress unused-import warnings
const _suppress_AssumptionDependencyEdge: AssumptionDependencyEdge | undefined = undefined;
void _suppress_AssumptionDependencyEdge;
