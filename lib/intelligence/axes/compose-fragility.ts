// lib/intelligence/axes/compose-fragility.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Assumption Fragility Composer
//
// CP-5 Module: Computes assumption_fragility AxisScore.
//
// The assumption_fragility axis answers: "How many things must remain
// true simultaneously for the deal's conclusions to hold?"
//
// What this composer reads (and what it MUST NOT read):
//
//   PERMITTED INPUTS (FragilityComposerInputs):
//     - AssumptionFragilityGraph — pre-built by fragility-graph.ts from
//       firings + patterns + scenarios. The graph has already done the
//       heavy lifting of computing per-assumption metrics; this composer
//       reads those metrics and translates them into axis contributions.
//     - FingerprintResolution — used for contextual framing and one
//       fingerprint-relative component (assumption surface size varies
//       slightly by operating model)
//
//   FORBIDDEN INPUTS (type-enforced):
//     - Raw RuleFiring records (use the graph)
//     - Raw PatternDetection records (use the graph)
//     - Raw ScenarioOutput records (use the graph)
//     - SourceConcern records (those feed evidence_quality)
//     - UncertaintyDelta records (those feed underwriting_uncertainty)
//
// Why this composer reads the graph rather than the raw streams:
//
//   The graph IS the structural intelligence. The constitution treats
//   the graph as a first-class artifact, not an intermediate. By
//   reading the graph, this composer:
//     1. Avoids re-implementing assumption aggregation logic
//     2. Stays consistent with the fragility statements the engine
//        emits elsewhere ("seven favorable conclusions depend on
//        add_back_integrity")
//     3. Naturally separates fragility from the underlying signals —
//        the same RuleFiring contributes to multiple axes through
//        different lenses
//
// Per CP-5 guardrail: "Treat fragility as structure, not punishment.
// A high fragility score means 'many conclusions depend on concentrated
// assumptions.' It does not automatically mean 'bad deal.' Some fragile
// deals can still be attractive if the critical assumptions are highly
// verifiable."
//
// Components produced:
//
//   1. hotspot_concentration — count of hotspots weighted by criticality.
//      The headline fragility component. Higher = more concentration.
//   2. criticality_weighted_load — sum of criticality-weighted counts
//      across the graph. Captures total fragility load even when
//      distributed across many assumptions.
//   3. axis_spread_signal — how broadly the unfavorable conclusions
//      spread across axes. Wide spread on a single assumption indicates
//      cross-axis cascading risk.
//   4. favorable_concentration_signal — assumptions where favorable
//      conclusions concentrate. This is the "Seven favorable conclusions
//      depend on add-back integrity" structural risk: if the assumption
//      fails, multiple favorable conclusions evaporate simultaneously.
//      Counts as fragility because it represents structural concentration,
//      not because favorable conclusions are bad.
//   5. evidence_strength_average — weighted average evidence strength
//      across nodes with dependencies. Higher evidence reduces fragility
//      because critical assumptions are more verifiable.
//
// Existential component:
//   - critical_hotspot_overload — fires when 3+ hotspots have
//     criticality_weighted_count >= 10 AND axis_spread >= 4. This is the
//     structural-overload case where the deal has multiple load-bearing
//     assumptions each affecting multiple axes.
//
// Baseline: FRAGILITY_BASELINE = 25 (low-to-moderate fragility is the
// normal starting state. Fragility ACCUMULATES through concentration
// clusters, layered conclusions, and criticality-weighted dependencies.
// A baseline-25 deal carries the typical assumption load any operating
// business has; significant concentration moves toward "highly
// concentrated").
//
// Band strategy: "fragility" — higher score is worse (more concentration).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisComponent,
  AxisScore,
  FragilityComposerInputs,
} from "./types";
import { FRAGILITY_BASELINE } from "./types";
import {
  assembleAxisScore,
  buildComponent,
  buildComponentId,
  sourceFromFragilityNode,
} from "./components";
import { suggestReferencePopulation } from "./fingerprint-normalization";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY COMPOSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the assumption_fragility AxisScore.
 *
 * Pure function: same inputs always produce the same output.
 *
 * Process:
 *   1. Hotspot concentration — count of hotspots * average criticality
 *   2. Total criticality load — sum across all nodes
 *   3. Axis spread signal — max axis_spread on a single assumption
 *   4. Favorable concentration — assumptions where 3+ favorable conclusions cluster
 *   5. Evidence strength offset — high evidence reduces fragility
 *   6. Existential component when overload conditions met
 *   7. Assemble with FRAGILITY_BASELINE and fragility band strategy
 *
 * IMPORTANT: in the fragility axis, POSITIVE contributions INCREASE the
 * score (more fragility). NEGATIVE contributions DECREASE the score
 * (less fragility — e.g., strong evidence offsets concentration).
 *
 * This is the inverse direction of financial/durability/evidence axes
 * where positive contributions improve the score. The band assignment
 * function (`assignFragilityBand`) handles the inversion at the labeling
 * layer; consumers reading the band see "highly_concentrated" for high
 * scores, not "strong."
 */
export function composeAssumptionFragility(
  inputs: FragilityComposerInputs,
): AxisScore {
  const components: AxisComponent[] = [];

  // ── Component 1: Hotspot concentration (headline fragility signal) ──
  const hotspotComp = buildHotspotConcentrationComponent(inputs);
  if (hotspotComp) components.push(hotspotComp);

  // ── Component 2: Total criticality load ──
  const criticalityComp = buildCriticalityLoadComponent(inputs);
  if (criticalityComp) components.push(criticalityComp);

  // ── Component 3: Axis spread signal ──
  const axisSpreadComp = buildAxisSpreadComponent(inputs);
  if (axisSpreadComp) components.push(axisSpreadComp);

  // ── Component 4: Favorable concentration ──
  const favorableComp = buildFavorableConcentrationComponent(inputs);
  if (favorableComp) components.push(favorableComp);

  // ── Component 5: Evidence strength offset (negative — reduces fragility) ──
  const evidenceComp = buildEvidenceStrengthOffsetComponent(inputs);
  if (evidenceComp) components.push(evidenceComp);

  // ── Existential: critical hotspot overload ──
  const overloadComp = buildCriticalHotspotOverloadComponent(inputs);
  if (overloadComp) components.push(overloadComp);

  return assembleAxisScore({
    axis: "assumption_fragility",
    baseline: FRAGILITY_BASELINE,
    components,
    band_strategy: "fragility",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hotspot concentration — the headline fragility component.
 *
 * Hotspots are assumptions where dependency concentration meets the
 * fragility-graph criteria. The signal:
 *   - 0 hotspots → 0 contribution (low concentration is the baseline)
 *   - 1-2 hotspots → small positive contribution (+4 to +7)
 *   - 3-4 hotspots → moderate positive contribution (+9 to +12)
 *   - 5+ hotspots → caps at +15 (soft cap)
 *
 * Scaled by average criticality of the hotspots so that "3 hotspots
 * with criticality 25" produces more fragility than "3 hotspots with
 * criticality 6."
 */
function buildHotspotConcentrationComponent(
  inputs: FragilityComposerInputs,
): AxisComponent | null {
  const hotspots = inputs.graph.nodes.filter((n) => n.is_hotspot);
  if (hotspots.length === 0) return null;

  const avgCriticality =
    hotspots.reduce((acc, n) => acc + n.criticality_weighted_count, 0) / hotspots.length;

  // Base contribution: hotspot count scaled with criticality bump
  // Tuning:
  //   1 hotspot avg=6  → 4
  //   3 hotspots avg=10 → ~10
  //   6+ hotspots avg=15+ → caps at 15
  const countContribution = Math.min(12, hotspots.length * 2.5);
  const criticalityBump = avgCriticality >= 10 ? 3 : avgCriticality >= 6 ? 1.5 : 0;
  const rawContribution = countContribution + criticalityBump;

  const topHotspots = hotspots
    .slice()
    .sort((a, b) => b.criticality_weighted_count - a.criticality_weighted_count)
    .slice(0, 3);
  const topNames = topHotspots.map((h) => h.assumption_name).join(", ");

  return buildComponent({
    component_id: buildComponentId("assumption_fragility", "hotspot_concentration"),
    axis: "assumption_fragility",
    name: "Hotspot concentration",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${hotspots.length} assumption${hotspots.length === 1 ? "" : "s"} flagged as fragility hotspot${hotspots.length === 1 ? "" : "s"} ` +
      `(average criticality-weighted count ${avgCriticality.toFixed(1)}). ` +
      `Top hotspots: ${topNames}. ` +
      `Hotspot concentration indicates dependency clustering: the failure of one or more hotspot assumptions ` +
      `would invalidate multiple conclusions simultaneously.`,
    reference_population: suggestReferencePopulation({ signal_type: "fragility_concentration" }),
    existential_component: false,
    sources: topHotspots.map((h) =>
      sourceFromFragilityNode({
        assumption_key: h.assumption_key,
        node_description: `${h.assumption_name} hotspot — ${h.conclusion_count} conclusions, criticality ${h.criticality_weighted_count.toFixed(1)}, ${h.axis_spread.length} axes`,
      }),
    ),
    depends_on_assumptions: topHotspots.map((h) => h.assumption_key),
  });
}

/**
 * Total criticality load — captures fragility that may be distributed
 * across many assumptions without any single one being a hotspot.
 *
 * Uses the graph summary's max_conclusion_count and the total weighted
 * load. Distributed-but-substantial fragility still erodes durability.
 */
function buildCriticalityLoadComponent(
  inputs: FragilityComposerInputs,
): AxisComponent | null {
  // Sum criticality-weighted counts across all nodes
  const totalLoad = inputs.graph.nodes.reduce(
    (acc, n) => acc + n.criticality_weighted_count,
    0,
  );
  if (totalLoad === 0) return null;

  // Scale: < 10 → minimal, 10-25 → moderate (+3 to +5),
  // 25-50 → substantial (+5 to +9), > 50 → heavy (+9 to +12)
  let rawContribution: number;
  if (totalLoad < 10) rawContribution = totalLoad * 0.2; // 0-2
  else if (totalLoad < 25) rawContribution = 2 + (totalLoad - 10) * 0.2; // 2-5
  else if (totalLoad < 50) rawContribution = 5 + (totalLoad - 25) * 0.16; // 5-9
  else rawContribution = Math.min(12, 9 + (totalLoad - 50) * 0.06);

  // If we have a hotspot component already firing, suppress this one
  // when criticality load is moderate — avoid double-counting.
  const hotspots = inputs.graph.nodes.filter((n) => n.is_hotspot);
  if (hotspots.length >= 3 && totalLoad < 40) {
    // Hotspot component is doing the work; skip the redundant signal
    return null;
  }

  // Source from the top loaded nodes for provenance
  const topByLoad = inputs.graph.nodes
    .filter((n) => n.criticality_weighted_count > 0)
    .slice()
    .sort((a, b) => b.criticality_weighted_count - a.criticality_weighted_count)
    .slice(0, 3);

  return buildComponent({
    component_id: buildComponentId("assumption_fragility", "criticality_load"),
    axis: "assumption_fragility",
    name: "Total criticality load",
    raw_contribution: rawContribution,
    contribution_explanation:
      `Aggregate criticality-weighted dependency count across all assumptions: ${totalLoad.toFixed(1)}. ` +
      `Captures distributed fragility — the cumulative load of conclusions resting on the assumption surface, ` +
      `even when no single assumption qualifies as a hotspot.`,
    reference_population: "all_fingerprints",
    existential_component: false,
    sources: topByLoad.map((n) =>
      sourceFromFragilityNode({
        assumption_key: n.assumption_key,
        node_description: `${n.assumption_name} — ${n.conclusion_count} conclusions, criticality ${n.criticality_weighted_count.toFixed(1)}`,
      }),
    ),
    depends_on_assumptions: topByLoad.map((n) => n.assumption_key),
  });
}

/**
 * Axis spread signal — captures cross-axis cascading risk. When a single
 * assumption affects 4-5 axes, its failure cascades broadly.
 */
function buildAxisSpreadComponent(
  inputs: FragilityComposerInputs,
): AxisComponent | null {
  const nodesWithSpread = inputs.graph.nodes.filter((n) => n.axis_spread.length >= 3);
  if (nodesWithSpread.length === 0) return null;

  const maxSpread = Math.max(...nodesWithSpread.map((n) => n.axis_spread.length));
  const countSpread4Plus = nodesWithSpread.filter((n) => n.axis_spread.length >= 4).length;
  const countSpread5 = nodesWithSpread.filter((n) => n.axis_spread.length === 5).length;

  // Contribution:
  //   1 assumption with spread=3 → +1
  //   multiple assumptions with spread=4 → +3 to +5
  //   any assumption with spread=5 → +5 plus count bump
  let rawContribution = 0;
  rawContribution += countSpread5 * 3;
  rawContribution += countSpread4Plus * 1.5;
  rawContribution += Math.min(2, nodesWithSpread.length * 0.5);
  if (rawContribution < 1) return null;

  const topSpread = nodesWithSpread
    .slice()
    .sort((a, b) => b.axis_spread.length - a.axis_spread.length)
    .slice(0, 3);

  return buildComponent({
    component_id: buildComponentId("assumption_fragility", "axis_spread"),
    axis: "assumption_fragility",
    name: "Cross-axis cascading risk",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${nodesWithSpread.length} assumption${nodesWithSpread.length === 1 ? "" : "s"} affect 3+ axes simultaneously ` +
      `(max axis spread: ${maxSpread}; ${countSpread5} affecting all 5 axes). ` +
      `Wide axis spread means the failure of a single assumption cascades across the engine's dimensional readings, ` +
      `rather than being contained to one axis.`,
    reference_population: "all_fingerprints",
    existential_component: false,
    sources: topSpread.map((n) =>
      sourceFromFragilityNode({
        assumption_key: n.assumption_key,
        node_description: `${n.assumption_name} — ${n.axis_spread.length}-axis spread`,
      }),
    ),
    depends_on_assumptions: topSpread.map((n) => n.assumption_key),
  });
}

/**
 * Favorable concentration signal — assumptions where 3+ favorable
 * conclusions cluster. This is the "seven favorable conclusions depend
 * on add-back integrity" structural concentration the constitution
 * specifically called out.
 *
 * Counts as fragility because it represents concentration, NOT because
 * favorable conclusions are bad. The component explanation makes this
 * explicit.
 */
function buildFavorableConcentrationComponent(
  inputs: FragilityComposerInputs,
): AxisComponent | null {
  const favorableConcentrations = inputs.graph.nodes.filter(
    (n) =>
      n.favorable_dependent_count >= 3 &&
      n.unfavorable_dependent_count <= 1,
  );
  if (favorableConcentrations.length === 0) return null;

  const maxFavorable = Math.max(
    ...favorableConcentrations.map((n) => n.favorable_dependent_count),
  );

  // Contribution: scales with max favorable count, modestly
  //   3 favorable → +2
  //   5 favorable → +4
  //   7+ favorable → +6 to +8
  let rawContribution = Math.min(10, favorableConcentrations.length * 2 + maxFavorable * 0.5);

  const topNode = favorableConcentrations
    .slice()
    .sort((a, b) => b.favorable_dependent_count - a.favorable_dependent_count)[0];

  return buildComponent({
    component_id: buildComponentId("assumption_fragility", "favorable_concentration"),
    axis: "assumption_fragility",
    name: "Favorable-conclusion concentration",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${favorableConcentrations.length} assumption${favorableConcentrations.length === 1 ? "" : "s"} carry concentrated ` +
      `favorable conclusions (${maxFavorable} favorable conclusions on ${topNode.assumption_name}). ` +
      `This contributes to fragility because the failure of these assumptions would invalidate multiple favorable ` +
      `conclusions simultaneously — the deal's upside thesis concentrates on a small assumption surface. ` +
      `This is NOT a comment on favorable conclusions being undesirable; it identifies STRUCTURAL concentration.`,
    reference_population: suggestReferencePopulation({ signal_type: "fragility_concentration" }),
    existential_component: false,
    sources: favorableConcentrations.slice(0, 3).map((n) =>
      sourceFromFragilityNode({
        assumption_key: n.assumption_key,
        node_description: `${n.assumption_name} — ${n.favorable_dependent_count} favorable, ${n.unfavorable_dependent_count} unfavorable`,
      }),
    ),
    depends_on_assumptions: favorableConcentrations.slice(0, 3).map((n) => n.assumption_key),
  });
}

/**
 * Evidence strength offset — NEGATIVE contribution that reduces fragility
 * when critical assumptions have strong evidence backing.
 *
 * Per CP-5 guardrail: "Some fragile deals can still be attractive if the
 * critical assumptions are highly verifiable."
 *
 * Mechanism: compute the average evidence_strength across nodes with
 * dependencies, weighted by criticality. High weighted average reduces
 * fragility; low average has no effect (negative space — only the
 * positive contribution from concentration components stands).
 */
function buildEvidenceStrengthOffsetComponent(
  inputs: FragilityComposerInputs,
): AxisComponent | null {
  // Filter to nodes that actually carry dependencies
  const loadedNodes = inputs.graph.nodes.filter((n) => n.criticality_weighted_count > 0);
  if (loadedNodes.length === 0) return null;

  // Criticality-weighted average evidence strength
  const totalCriticality = loadedNodes.reduce((acc, n) => acc + n.criticality_weighted_count, 0);
  if (totalCriticality === 0) return null;

  const weightedSum = loadedNodes.reduce(
    (acc, n) => acc + n.evidence_strength * n.criticality_weighted_count,
    0,
  );
  const weightedAvgEvidence = weightedSum / totalCriticality;

  // Offset only kicks in when weighted evidence is meaningfully strong
  //   evidence < 50 → no offset (verbal/seller-spreadsheet evidence
  //     doesn't reduce fragility)
  //   evidence 50-70 → small negative (-2 to -4)
  //   evidence 70-90 → moderate negative (-4 to -7)
  //   evidence 90+ → strong negative (-7 to -10)
  if (weightedAvgEvidence < 50) return null;

  let rawContribution: number;
  if (weightedAvgEvidence < 70) rawContribution = -2 - (weightedAvgEvidence - 50) * 0.1;
  else if (weightedAvgEvidence < 90) rawContribution = -4 - (weightedAvgEvidence - 70) * 0.15;
  else rawContribution = -7 - Math.min(3, (weightedAvgEvidence - 90) * 0.3);

  const topByEvidence = loadedNodes
    .slice()
    .sort((a, b) => b.evidence_strength - a.evidence_strength)
    .slice(0, 3);

  return buildComponent({
    component_id: buildComponentId("assumption_fragility", "evidence_strength_offset"),
    axis: "assumption_fragility",
    name: "Evidence strength offset",
    raw_contribution: rawContribution,
    contribution_explanation:
      `Critical assumptions show criticality-weighted average evidence strength of ${weightedAvgEvidence.toFixed(0)}/100. ` +
      `Strong evidence on load-bearing assumptions reduces fragility because the assumptions are verifiable: ` +
      `even when conclusions concentrate, they rest on independently confirmable evidence rather than asserted ones. ` +
      `This negative contribution represents fragility offset, not absence of concentration.`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: topByEvidence.map((n) =>
      sourceFromFragilityNode({
        assumption_key: n.assumption_key,
        node_description: `${n.assumption_name} — evidence ${n.evidence_strength}/100`,
      }),
    ),
    depends_on_assumptions: topByEvidence.map((n) => n.assumption_key),
  });
}

/**
 * Critical hotspot overload (existential) — fires when:
 *   - 3+ hotspots exist AND
 *   - At least 2 of them have criticality_weighted_count >= 10 AND
 *   - At least 1 of them has axis_spread >= 4
 *
 * This is the structural-overload case: the deal carries multiple
 * load-bearing assumptions each affecting multiple axes. Single-assumption
 * failure would cascade broadly; multiple hotspots make the deal
 * structurally fragile in a way per-component soft caps cannot capture.
 */
function buildCriticalHotspotOverloadComponent(
  inputs: FragilityComposerInputs,
): AxisComponent | null {
  const hotspots = inputs.graph.nodes.filter((n) => n.is_hotspot);
  if (hotspots.length < 3) return null;

  const heavyHotspots = hotspots.filter((n) => n.criticality_weighted_count >= 10);
  if (heavyHotspots.length < 2) return null;

  const broadlyAffecting = hotspots.filter((n) => n.axis_spread.length >= 4);
  if (broadlyAffecting.length < 1) return null;

  const heaviest = heavyHotspots
    .slice()
    .sort((a, b) => b.criticality_weighted_count - a.criticality_weighted_count);

  return buildComponent({
    component_id: buildComponentId("assumption_fragility", "critical_hotspot_overload"),
    axis: "assumption_fragility",
    name: "Critical hotspot overload (existential)",
    raw_contribution: 18, // existential cap allows +35
    contribution_explanation:
      `${hotspots.length} fragility hotspots with ${heavyHotspots.length} carrying high criticality (${heavyHotspots.map((n) => n.assumption_name).join(", ")}) ` +
      `and ${broadlyAffecting.length} affecting 4+ axes. ` +
      `Multiple load-bearing assumptions with broad axis spread create structural overload that ordinary ` +
      `concentration components cannot capture. The deal's interpretive structure has too many simultaneous ` +
      `dependencies for ordinary diligence to address through narrow assumption verification.`,
    reference_population: "all_fingerprints",
    existential_component: true,
    sources: heaviest.slice(0, 5).map((n) =>
      sourceFromFragilityNode({
        assumption_key: n.assumption_key,
        node_description: `${n.assumption_name} — criticality ${n.criticality_weighted_count.toFixed(1)}, ${n.axis_spread.length}-axis spread`,
      }),
    ),
    depends_on_assumptions: heaviest.slice(0, 5).map((n) => n.assumption_key),
  });
}
