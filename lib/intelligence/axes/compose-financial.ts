// lib/intelligence/axes/compose-financial.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Financial Score Composer
//
// CP-5 Module: Computes financial_score AxisScore.
//
// The financial_score axis answers: "How strong do the numbers look on paper?"
//
// What this composer reads (and what it MUST NOT read):
//
//   PERMITTED INPUTS:
//     - Findings with axis_impact.axis === "financial_score"
//       (extracted from RuleFiring.finding when axis_impact targets financial)
//     - ScenarioOutput.adjusted_inputs (for coverage-stressed signals)
//     - ScenarioOutput.clears (for clearance distribution)
//     - FingerprintResolution (for normalization baselines)
//
//   FORBIDDEN INPUTS (enforced by FinancialComposerInputs type):
//     - SourceConcern records — those feed evidence_quality, not financial
//     - UncertaintyDelta records — those feed underwriting_uncertainty
//     - The full AssumptionFragilityGraph — that feeds assumption_fragility
//
// Cross-axis contamination is structurally impossible: the input type
// doesn't carry source concerns or uncertainty deltas, so this file
// literally cannot reference them.
//
// Components produced (catalog):
//
//   1. coverage_signal — DSCR-based finding ("DSCR thin" rule firings, etc.)
//   2. leverage_signal — debt_to_sde / debt_to_worth findings
//   3. margin_strength — positive margin signals when findings show strength
//   4. margin_compression — negative margin signals
//   5. scenario_coverage_clearance — composite scenario-clearance contribution
//   6. revenue_trajectory — trajectory rule firings affecting financial signal
//
// Each component:
//   - Uses fingerprint-relative or global normalization per signal type
//   - Carries explicit provenance to upstream IDs
//   - Stays within soft cap unless flagged existential
//
// Baseline: FINANCIAL_BASELINE = 65 (most operating businesses start
// slightly above neutral). Components shift up for strength signals and
// down for concern signals.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisComponent,
  AxisScore,
  FinancialComposerInputs,
} from "./types";
import { FINANCIAL_BASELINE } from "./types";
import {
  assembleAxisScore,
  buildComponent,
  buildComponentId,
  magnitudeToContribution,
  sourceFromFiring,
  sourceFromScenario,
  summarizeComponents,
} from "./components";
import {
  normalizeScenarioClearance,
  suggestReferencePopulation,
} from "./fingerprint-normalization";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY COMPOSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the financial_score AxisScore.
 *
 * Pure function: same inputs always produce the same output.
 *
 * Process:
 *   1. Bucket findings by signal category (coverage / leverage / margin / trajectory)
 *   2. Convert each bucket to one component (positive or negative)
 *   3. Add scenario clearance component (fingerprint-relative)
 *   4. Assemble final AxisScore with FINANCIAL_BASELINE
 */
export function composeFinancialScore(inputs: FinancialComposerInputs): AxisScore {
  const components: AxisComponent[] = [];

  // Bucket findings by category by reading rule_id prefix.
  // Rule IDs follow the convention rule.{category}.{specific}, so we
  // can route findings to the appropriate component by their category.
  const coverageFindings = inputs.relevant_findings.filter(
    (f) => f.rule_id.startsWith("rule.coverage.") || f.rule_id.startsWith("rule.leverage."),
  );
  const leverageFindings = inputs.relevant_findings.filter(
    (f) => f.rule_id.startsWith("rule.leverage."),
  );
  const marginFindings = inputs.relevant_findings.filter(
    (f) => f.rule_id.startsWith("rule.margin.") || f.rule_id.startsWith("rule.earnings_quality."),
  );
  const trajectoryFindings = inputs.relevant_findings.filter(
    (f) => f.rule_id.startsWith("rule.trajectory."),
  );
  const strengthFindings = inputs.relevant_findings.filter(
    (f) => f.rule_id.startsWith("rule.strength."),
  );

  // ── Coverage component ──
  if (coverageFindings.length > 0) {
    const c = buildCoverageComponent(coverageFindings);
    if (c) components.push(c);
  }

  // ── Leverage component (subset of coverage findings if leverage-specific) ──
  if (leverageFindings.length > 0 && !coverageFindings.some((f) => leverageFindings.includes(f))) {
    const c = buildLeverageComponent(leverageFindings);
    if (c) components.push(c);
  }

  // ── Margin component ──
  if (marginFindings.length > 0) {
    const c = buildMarginComponent(marginFindings);
    if (c) components.push(c);
  }

  // ── Trajectory component ──
  if (trajectoryFindings.length > 0) {
    const c = buildTrajectoryComponent(trajectoryFindings);
    if (c) components.push(c);
  }

  // ── Strength rules — positive findings get their own component ──
  if (strengthFindings.length > 0) {
    const c = buildStrengthComponent(strengthFindings);
    if (c) components.push(c);
  }

  // ── Scenario clearance component (fingerprint-relative) ──
  const scenarioComp = buildScenarioClearanceComponent(inputs.scenario_outputs);
  if (scenarioComp) components.push(scenarioComp);

  // ── Existential signals ──
  // Catastrophic DSCR collapse: when one or more findings show DSCR < 1.0x
  // AND the rule classification is structurally_suspicious, treat as existential.
  const catastrophicCoverage = buildCatastrophicCoverageComponent(inputs.relevant_findings);
  if (catastrophicCoverage) components.push(catastrophicCoverage);

  return assembleAxisScore({
    axis: "financial_score",
    baseline: FINANCIAL_BASELINE,
    components,
    band_strategy: "standard",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coverage component — DSCR-related findings.
 * Aggregates all coverage findings into a single component with sources
 * from each firing. Soft-capped.
 */
function buildCoverageComponent(
  findings: FinancialComposerInputs["relevant_findings"],
): AxisComponent | null {
  if (findings.length === 0) return null;

  // Aggregate raw contribution from magnitudes
  const rawContribution = findings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );

  if (rawContribution === 0) return null;

  const negativeCount = findings.filter((f) => f.direction === "negative").length;
  const positiveCount = findings.filter((f) => f.direction === "positive").length;
  const ruleNames = findings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("financial_score", "coverage_signal"),
    axis: "financial_score",
    name: "Coverage signal",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${findings.length} coverage-related finding${findings.length === 1 ? "" : "s"} ` +
      `(${negativeCount} concern, ${positiveCount} strength): ${ruleNames}${findings.length > 3 ? "..." : ""}. ` +
      `Net contribution reflects severity-weighted aggregation across DSCR and leverage signals.`,
    reference_population: "global_benchmark", // DSCR thresholds are universal
    existential_component: false,
    sources: findings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Leverage component — debt_to_worth / debt_to_sde findings not already
 * counted in coverage.
 */
function buildLeverageComponent(
  findings: FinancialComposerInputs["relevant_findings"],
): AxisComponent | null {
  if (findings.length === 0) return null;
  const rawContribution = findings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = findings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("financial_score", "leverage_signal"),
    axis: "financial_score",
    name: "Leverage signal",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${findings.length} leverage finding${findings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Leverage signals are evaluated against global benchmarks (debt-to-SDE, debt-to-worth).`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: findings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Margin component — margin and earnings-quality findings affecting
 * financial signal. Includes negative concerns AND positive strengths.
 */
function buildMarginComponent(
  findings: FinancialComposerInputs["relevant_findings"],
): AxisComponent | null {
  if (findings.length === 0) return null;
  const rawContribution = findings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const negativeCount = findings.filter((f) => f.direction === "negative").length;
  const positiveCount = findings.filter((f) => f.direction === "positive").length;
  const ruleNames = findings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("financial_score", "margin_signal"),
    axis: "financial_score",
    name: positiveCount > negativeCount ? "Margin strength" : "Margin signal",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${findings.length} margin-related finding${findings.length === 1 ? "" : "s"} ` +
      `(${negativeCount} concern, ${positiveCount} strength): ${ruleNames}${findings.length > 3 ? "..." : ""}.`,
    reference_population: "this_fingerprint", // margin bands are fingerprint-specific
    existential_component: false,
    sources: findings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Trajectory component — multi-year findings affecting financial signal.
 */
function buildTrajectoryComponent(
  findings: FinancialComposerInputs["relevant_findings"],
): AxisComponent | null {
  if (findings.length === 0) return null;
  const rawContribution = findings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = findings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("financial_score", "trajectory_signal"),
    axis: "financial_score",
    name: "Revenue / earnings trajectory",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${findings.length} trajectory finding${findings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Trajectory signals reflect multi-year patterns rather than point-in-time metrics.`,
    reference_population: "this_fingerprint",
    existential_component: false,
    sources: findings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Strength component — positive rule firings (strength.* rules) that
 * affect financial signal. Preserved per CP-5 guardrail: "the engine
 * should not only subtract risk. It should recognize strength."
 */
function buildStrengthComponent(
  findings: FinancialComposerInputs["relevant_findings"],
): AxisComponent | null {
  if (findings.length === 0) return null;
  const rawContribution = findings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = findings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("financial_score", "credible_strengths"),
    axis: "financial_score",
    name: "Credible strengths",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${findings.length} positive-direction finding${findings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Credible strengths reflect verifiable favorable signals supported by evidence.`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: findings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Scenario clearance component — composite contribution from how the
 * deal's applied scenarios cleared.
 *
 * Uses fingerprint-relative normalization (scenarios are already
 * fingerprint-gated upstream).
 */
function buildScenarioClearanceComponent(
  scenarios: FinancialComposerInputs["scenario_outputs"],
): AxisComponent | null {
  // Only consider scenarios that affect financial signals
  const financialScenarios = scenarios.filter(
    (s) => s.clearance_basis === "coverage" || s.clearance_basis === "margin" || s.clearance_basis === "composite",
  );
  if (financialScenarios.length === 0) return null;

  const normalization = normalizeScenarioClearance(financialScenarios);

  // No applied scenarios → no signal
  if (normalization.total_applied === 0) return null;

  return buildComponent({
    component_id: buildComponentId("financial_score", "scenario_clearance"),
    axis: "financial_score",
    name: "Scenario clearance posture",
    raw_contribution: normalization.suggested_contribution,
    contribution_explanation: normalization.explanation,
    reference_population: suggestReferencePopulation({ signal_type: "scenario_clearance" }),
    existential_component: false,
    sources: financialScenarios
      .filter((s) => s.applied)
      .map((s) => sourceFromScenario(s)),
    depends_on_assumptions: [],
  });
}

/**
 * Catastrophic coverage existential component — fires only when a
 * structurally_suspicious DSCR rule fires AND raw DSCR observation
 * indicates collapse below 1.0x. This is one of the rare cases allowed
 * to exceed the soft cap.
 *
 * "Catastrophic DSCR collapse may legitimately dominate durability"
 * — but the financial_score is also dominated, so we apply it here too
 * with explicit existential flag.
 */
function buildCatastrophicCoverageComponent(
  findings: FinancialComposerInputs["relevant_findings"],
): AxisComponent | null {
  // Look for structurally_suspicious DSCR/coverage findings with high magnitude
  const catastrophic = findings.filter(
    (f) =>
      f.rule_id === "rule.coverage.dscr_thin" &&
      f.direction === "negative" &&
      f.relative_magnitude === "high",
  );

  if (catastrophic.length === 0) return null;

  return buildComponent({
    component_id: buildComponentId("financial_score", "catastrophic_coverage"),
    axis: "financial_score",
    name: "Existential coverage signal",
    raw_contribution: -20, // existential cap allows -35
    contribution_explanation:
      `Coverage finding with high-magnitude impact crosses the existential threshold: ` +
      `${catastrophic[0]?.rule_name ?? "DSCR collapse"}. ` +
      `This component is flagged existential because catastrophic coverage cannot be ` +
      `absorbed by ordinary diligence — the capital structure mathematics break down.`,
    reference_population: "global_benchmark",
    existential_component: true,
    sources: catastrophic.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/** Re-exported for orchestrator-level summary aggregation. */
export { summarizeComponents };
