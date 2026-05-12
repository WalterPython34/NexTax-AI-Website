// lib/intelligence/axes/compose-durability.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Durability Score Composer
//
// CP-5 Module: Computes durability_score AxisScore.
//
// The durability_score axis answers: "How likely is this profile to hold
// post-close?"
//
// What this composer reads (and what it MUST NOT read):
//
//   PERMITTED INPUTS (DurabilityComposerInputs):
//     - Findings with axis_impact.axis === "durability_score"
//     - PatternDetections (second-order signals from CP-3 mismatch patterns)
//     - ScenarioOutputs (CP-4 scenario clearance)
//     - FingerprintResolution
//
//   FORBIDDEN INPUTS (type-enforced):
//     - SourceConcern records → feed evidence_quality
//     - UncertaintyDelta records → feed underwriting_uncertainty
//     - Direct fragility graph access → assumption_fragility owns it
//
// Why durability gets the most aggressive normalization:
//
//   This is the axis where rule-density inflation would do the most
//   damage. Healthcare practices, contractors, and asset-heavy services
//   have denser diagnostic rulesets in the catalogue. Without
//   fingerprint-relative normalization, those operating models would
//   systematically score lower on durability simply because the engine
//   knows more about them — which would be a structural bug, not a
//   real signal.
//
//   Per CP-5 guardrails:
//     - Rule firing density: fingerprint-relative (this_fingerprint)
//     - Pattern density: fingerprint-relative (this_fingerprint)
//     - Scenario clearance: fingerprint-relative (already gated)
//     - Customer concentration: global (concentration % is universal)
//     - Working capital signals: this_fingerprint (bands are model-specific)
//     - Transition risk signals: global (transition mechanics are universal)
//
// Components produced:
//
//   1. rule_firing_density — fingerprint-normalized; the headline durability signal
//   2. pattern_concentration — fingerprint-normalized severity-weighted
//   3. scenario_clearance — composite from scenario engine output
//   4. customer_concentration_durability — global benchmark
//   5. working_capital_durability — this_fingerprint
//   6. transition_fragility — global benchmark
//   7. credible_strengths — positive findings preserved
//   8. revenue_trajectory_durability — multi-year revenue signals
//
// Plus existential components for catastrophic scenarios:
//   - catastrophic_scenario_failure — when ALL applied scenarios fail
//
// Baseline: DURABILITY_BASELINE = 60 (durability is structurally harder
// than financial appearance; deals earn higher durability through
// scenario clearance, low concentration, and resilient operating structure).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AxisComponent,
  AxisScore,
  DurabilityComposerInputs,
} from "./types";
import { DURABILITY_BASELINE } from "./types";
import {
  assembleAxisScore,
  buildComponent,
  buildComponentId,
  magnitudeToContribution,
  sourceFromFingerprintSignal,
  sourceFromFiring,
  sourceFromPattern,
  sourceFromScenario,
} from "./components";
import {
  normalizePatternDensity,
  normalizeRuleFiringDensity,
  normalizeScenarioClearance,
  suggestReferencePopulation,
} from "./fingerprint-normalization";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY COMPOSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the durability_score AxisScore.
 *
 * Pure function: same inputs always produce the same output.
 *
 * Process:
 *   1. Build rule firing density component (fingerprint-relative)
 *   2. Build pattern concentration component (fingerprint-relative,
 *      severity-weighted)
 *   3. Build scenario clearance component (fingerprint-relative, since
 *      scenarios are already fingerprint-gated)
 *   4. Build per-category durability components (concentration, working
 *      capital, transition)
 *   5. Build strength component for positive findings
 *   6. Add existential components when warranted
 *   7. Assemble final AxisScore with DURABILITY_BASELINE
 */
export function composeDurabilityScore(
  inputs: DurabilityComposerInputs,
): AxisScore {
  const components: AxisComponent[] = [];

  // ── Component 1: Rule firing density (FINGERPRINT-RELATIVE) ──
  // The headline defense against rule-density inflation. We reconstruct
  // a minimal firing shape from the durability-relevant findings so
  // normalizeRuleFiringDensity can read them.
  const ruleDensityComp = buildRuleFiringDensityComponent(inputs);
  if (ruleDensityComp) components.push(ruleDensityComp);

  // ── Component 2: Pattern concentration (FINGERPRINT-RELATIVE) ──
  const patternComp = buildPatternConcentrationComponent(inputs);
  if (patternComp) components.push(patternComp);

  // ── Component 3: Scenario clearance (FINGERPRINT-RELATIVE) ──
  const scenarioComp = buildScenarioClearanceComponent(inputs);
  if (scenarioComp) components.push(scenarioComp);

  // ── Component 4: Customer concentration (GLOBAL) ──
  const concentrationComp = buildConcentrationComponent(inputs);
  if (concentrationComp) components.push(concentrationComp);

  // ── Component 5: Working capital durability (FINGERPRINT-RELATIVE) ──
  const workingCapitalComp = buildWorkingCapitalComponent(inputs);
  if (workingCapitalComp) components.push(workingCapitalComp);

  // ── Component 6: Transition fragility signals (GLOBAL) ──
  const transitionComp = buildTransitionFragilityComponent(inputs);
  if (transitionComp) components.push(transitionComp);

  // ── Component 7: Revenue trajectory durability ──
  const trajectoryComp = buildTrajectoryDurabilityComponent(inputs);
  if (trajectoryComp) components.push(trajectoryComp);

  // ── Component 8: Credible strengths (positive findings) ──
  const strengthComp = buildStrengthComponent(inputs);
  if (strengthComp) components.push(strengthComp);

  // ── Existential: catastrophic scenario failure ──
  const catastrophicComp = buildCatastrophicScenarioComponent(inputs);
  if (catastrophicComp) components.push(catastrophicComp);

  return assembleAxisScore({
    axis: "durability_score",
    baseline: DURABILITY_BASELINE,
    components,
    band_strategy: "standard",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rule firing density component — the headline durability signal.
 * Fingerprint-relative normalization protects against rule-density
 * inflation: a contractor with 5 firings produces a different
 * contribution than a restaurant with 5 firings.
 *
 * Reconstructs a minimal firing shape from the durability findings to
 * feed normalizeRuleFiringDensity, which expects RuleFiring-shaped
 * inputs. Since findings are extracted from RuleFiring.finding upstream,
 * we know the underlying firing exists; we just need enough shape for
 * the normalizer.
 */
function buildRuleFiringDensityComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  if (inputs.relevant_findings.length === 0) return null;

  // Build minimal firing shapes — normalizer reads finding.direction only.
  const fakeFirings = inputs.relevant_findings.map((f) => ({
    finding: {
      direction: f.direction,
      axis_impact: [],
      observation: f.observation,
    },
    firing_id: f.firing_id,
    rule_id: f.rule_id,
    rule_name: f.rule_name,
    // Fill in remaining required RuleFiring fields with safe defaults
    classification: "statistically_atypical" as const,
    polarity: f.direction === "positive" ? "strength" : f.direction === "negative" ? "concern" : "observation",
    severity: "medium" as const,
    uncertainty_escalation: null,
    source_concern: null,
    what_triggered: f.observation,
    why_it_matters: "",
    depends_on_assumptions: [] as ReadonlyArray<never>,
    evidence_to_increase_confidence: [],
    what_would_invalidate: "",
    fired_at: "",
    catalogue_version: "",
    references_trigger_ids: [],
  })) as unknown as Parameters<typeof normalizeRuleFiringDensity>[0];

  const normalization = normalizeRuleFiringDensity(fakeFirings, inputs.fingerprint_resolution);

  // Skip the component when the normalized signal is exactly 0 — no
  // information to report.
  if (normalization.suggested_contribution === 0) return null;

  return buildComponent({
    component_id: buildComponentId("durability_score", "rule_firing_density"),
    axis: "durability_score",
    name: "Rule firing density (fingerprint-relative)",
    raw_contribution: normalization.suggested_contribution,
    contribution_explanation: normalization.explanation,
    reference_population: suggestReferencePopulation({ signal_type: "rule_density" }),
    existential_component: false,
    sources: inputs.relevant_findings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Pattern concentration component — fingerprint-relative severity-weighted
 * pattern density.
 */
function buildPatternConcentrationComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  if (inputs.pattern_detections.length === 0) return null;

  const normalization = normalizePatternDensity(
    inputs.pattern_detections,
    inputs.fingerprint_resolution,
  );

  if (normalization.suggested_contribution === 0) return null;

  return buildComponent({
    component_id: buildComponentId("durability_score", "pattern_concentration"),
    axis: "durability_score",
    name: "Pattern concentration (fingerprint-relative)",
    raw_contribution: normalization.suggested_contribution,
    contribution_explanation: normalization.explanation,
    reference_population: suggestReferencePopulation({ signal_type: "pattern_density" }),
    existential_component: false,
    sources: inputs.pattern_detections.map((p) => sourceFromPattern(p)),
    depends_on_assumptions: [],
  });
}

/**
 * Scenario clearance component — composite from how the deal's applied
 * scenarios cleared. Durability cares about all clearance bases, not
 * just coverage-driven ones.
 */
function buildScenarioClearanceComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  const normalization = normalizeScenarioClearance(inputs.scenario_outputs);
  if (normalization.total_applied === 0) return null;
  if (normalization.suggested_contribution === 0) return null;

  return buildComponent({
    component_id: buildComponentId("durability_score", "scenario_clearance"),
    axis: "durability_score",
    name: "Scenario clearance posture",
    raw_contribution: normalization.suggested_contribution,
    contribution_explanation: normalization.explanation,
    reference_population: suggestReferencePopulation({ signal_type: "scenario_clearance" }),
    existential_component: false,
    sources: inputs.scenario_outputs
      .filter((s) => s.applied)
      .map((s) => sourceFromScenario(s)),
    depends_on_assumptions: [],
  });
}

/**
 * Customer concentration component — global benchmark.
 * Concentration percentages mean the same thing across operating models,
 * so this is global, not fingerprint-relative.
 */
function buildConcentrationComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  const concentrationFindings = inputs.relevant_findings.filter(
    (f) => f.rule_id.startsWith("rule.concentration."),
  );
  if (concentrationFindings.length === 0) return null;

  const rawContribution = concentrationFindings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = concentrationFindings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("durability_score", "customer_concentration"),
    axis: "durability_score",
    name: "Customer concentration risk",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${concentrationFindings.length} concentration finding${concentrationFindings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Customer concentration is evaluated against universal underwriting thresholds rather than ` +
      `fingerprint-specific bands because concentration mechanics are operating-model-agnostic.`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: concentrationFindings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: ["customer_retention"],
  });
}

/**
 * Working capital durability component — fingerprint-relative since
 * current-ratio bands differ materially across operating models.
 */
function buildWorkingCapitalComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  const wcFindings = inputs.relevant_findings.filter((f) =>
    f.rule_id.startsWith("rule.working_capital."),
  );
  if (wcFindings.length === 0) return null;

  const rawContribution = wcFindings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = wcFindings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("durability_score", "working_capital_durability"),
    axis: "durability_score",
    name: "Working capital durability",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${wcFindings.length} working-capital finding${wcFindings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Working capital signals are evaluated against the ${inputs.fingerprint_resolution.fingerprint.display_name} ` +
      `operating model's expected bands, which differ materially from universal thresholds.`,
    reference_population: "this_fingerprint",
    existential_component: false,
    sources: wcFindings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: ["working_capital_stability"],
  });
}

/**
 * Transition fragility component — global benchmark. Captures signals
 * about transition risk that aren't customer concentration: sole-proprietor
 * signals, key-person dependencies, model mismatch indicators.
 */
function buildTransitionFragilityComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  // Capture findings that reflect transition fragility but aren't
  // already counted in concentration or working capital
  const transitionFindings = inputs.relevant_findings.filter(
    (f) =>
      f.rule_id === "rule.margin.elevated_sde_with_sole_proprietor_signal" ||
      f.rule_id.startsWith("rule.mismatch."),
  );
  if (transitionFindings.length === 0) return null;

  const rawContribution = transitionFindings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = transitionFindings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("durability_score", "transition_fragility"),
    axis: "durability_score",
    name: "Transition fragility signals",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${transitionFindings.length} transition-related finding${transitionFindings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Transition mechanics (operator dependency, model mismatch) are evaluated against universal patterns.`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: transitionFindings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: ["key_person_transferability", "transition_execution"],
  });
}

/**
 * Revenue trajectory durability — captures multi-year trajectory signals
 * affecting durability. Fingerprint-relative because what counts as
 * "elevated volatility" depends on operating-model norms.
 */
function buildTrajectoryDurabilityComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  const trajFindings = inputs.relevant_findings.filter((f) =>
    f.rule_id.startsWith("rule.trajectory."),
  );
  if (trajFindings.length === 0) return null;

  const rawContribution = trajFindings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution === 0) return null;

  const ruleNames = trajFindings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("durability_score", "trajectory_durability"),
    axis: "durability_score",
    name: "Revenue trajectory durability",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${trajFindings.length} trajectory finding${trajFindings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Trajectory patterns inform whether trailing financials reflect a sustainable run-rate.`,
    reference_population: "this_fingerprint",
    existential_component: false,
    sources: trajFindings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: ["revenue_quality", "margin_sustainability"],
  });
}

/**
 * Credible strengths component — preserves positive findings that
 * support durability. Per CP-5 guardrail: "the engine should not only
 * subtract risk. It should recognize strength."
 */
function buildStrengthComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  const strengthFindings = inputs.relevant_findings.filter(
    (f) =>
      f.rule_id.startsWith("rule.strength.") ||
      (f.direction === "positive"),
  );
  if (strengthFindings.length === 0) return null;

  const rawContribution = strengthFindings.reduce(
    (acc, f) => acc + magnitudeToContribution(f.relative_magnitude, f.direction),
    0,
  );
  if (rawContribution <= 0) return null;

  const ruleNames = strengthFindings.map((f) => f.rule_name).slice(0, 3).join(", ");

  return buildComponent({
    component_id: buildComponentId("durability_score", "credible_strengths"),
    axis: "durability_score",
    name: "Credible durability strengths",
    raw_contribution: rawContribution,
    contribution_explanation:
      `${strengthFindings.length} positive durability finding${strengthFindings.length === 1 ? "" : "s"}: ${ruleNames}. ` +
      `Verifiable favorable signals (consistent growth, working capital cushion, supported coverage).`,
    reference_population: "global_benchmark",
    existential_component: false,
    sources: strengthFindings.map((f) => sourceFromFiring(f)),
    depends_on_assumptions: [],
  });
}

/**
 * Catastrophic scenario failure (existential) — fires when 100% of
 * applied scenarios fail AND at least 3 scenarios applied. This is the
 * scenario equivalent of "every stress test breaks the deal."
 */
function buildCatastrophicScenarioComponent(
  inputs: DurabilityComposerInputs,
): AxisComponent | null {
  const applied = inputs.scenario_outputs.filter((s) => s.applied);
  if (applied.length < 3) return null;

  const allFail = applied.every((s) => s.clears === "fails");
  if (!allFail) return null;

  return buildComponent({
    component_id: buildComponentId("durability_score", "catastrophic_scenario"),
    axis: "durability_score",
    name: "Universal scenario failure (existential)",
    raw_contribution: -25, // existential cap allows -35
    contribution_explanation:
      `All ${applied.length} applied scenarios failed clearance. ` +
      `When every stress and normalization scenario breaks the deal, durability is structurally ` +
      `compromised in a way that cannot be absorbed by per-component soft caps. This component ` +
      `is flagged existential to reflect that the deal has no surviving stress posture.`,
    reference_population: "this_fingerprint",
    existential_component: true,
    sources: [
      ...applied.map((s) => sourceFromScenario(s)),
      sourceFromFingerprintSignal({
        fingerprint_key: inputs.fingerprint_resolution.fingerprint.key,
        signal_description: `Universal scenario failure on ${inputs.fingerprint_resolution.fingerprint.display_name}`,
      }),
    ],
    depends_on_assumptions: [],
  });
}
