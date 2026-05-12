// lib/intelligence/axes/components.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Component Builders & Cap Enforcement
//
// CP-5 Module: Shared utilities every composer (compose-financial,
// compose-durability, compose-evidence, compose-fragility, compose-uncertainty)
// calls when building components and assembling AxisScore objects.
//
// Why centralized:
//
//   The five composers must produce structurally identical AxisScore
//   objects: same field shape, same cap enforcement, same band assignment,
//   same score clamping logic. Centralizing these utilities prevents
//   subtle drift between composers (e.g., one composer using a different
//   cap, or assigning bands at different thresholds).
//
//   The composer files remain separate for architectural enforcement
//   (no cross-axis contamination), but they share the same scaffolding.
//
// Module responsibilities:
//
//   1. Cap enforcement — `applyCap()` enforces soft cap or existential cap
//      based on the `existential_component` flag. Returns the capped
//      contribution AND a flag indicating whether the cap was hit (for
//      diagnostics).
//
//   2. Component construction — `buildComponent()` produces an
//      AxisComponent with validated structure. Fails loudly if sources
//      array is empty (per CP-5 guardrail: "If a component cannot
//      explain its source, it should not exist.").
//
//   3. Score assembly — `assembleAxisScore()` combines a baseline + an
//      array of components into a full AxisScore with clamping, band
//      assignment, and net_contribution calculation.
//
//   4. Band assignment — `assignStandardBand()`, `assignFragilityBand()`,
//      `assignUncertaintyBand()` map numeric scores to axis-specific
//      semantic bands.
//
//   5. Provenance helpers — `sourceFromFiring()`, `sourceFromPattern()`,
//      `sourceFromScenario()`, etc. build ComponentSource records from
//      upstream artifacts.
//
// This module has NO axis-specific logic — every composer can use every
// utility here. Axis-specific logic lives in the compose-*.ts files.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
} from "../types";
import type {
  PatternDetection,
  RuleFiring,
} from "../rules/types";
import type {
  ScenarioOutput,
} from "../scenarios/types";
import type {
  AxisBand,
  AxisComponent,
  AxisScore,
  ComponentSource,
  ComponentSourceType,
  FragilityBand,
  ReferencePopulation,
  StandardAxisBand,
  UncertaintyBand,
} from "./types";
import {
  AXIS_COMPOSITION_VERSION,
  BAND_CUTOFF_HIGH,
  BAND_CUTOFF_LOW,
  BAND_CUTOFF_MID,
  COMPONENT_EXISTENTIAL_CAP_NEGATIVE,
  COMPONENT_EXISTENTIAL_CAP_POSITIVE,
  COMPONENT_SOFT_CAP_NEGATIVE,
  COMPONENT_SOFT_CAP_POSITIVE,
  isValidComponentId,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CAP ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface CapResult {
  readonly raw_contribution: number;
  readonly capped_contribution: number;
  readonly cap_hit: boolean;
  readonly cap_applied: "soft" | "existential" | "none";
}

/**
 * Apply contribution cap based on whether the component is existential.
 *
 * Non-existential components are clamped to [-15, +15].
 * Existential components are clamped to [-35, +35].
 *
 * Returns the capped value AND diagnostics (raw value, whether cap was hit,
 * which cap was applied) so the composer can record cap-hits for downstream
 * inspection.
 */
export function applyCap(args: {
  raw_contribution: number;
  existential_component: boolean;
}): CapResult {
  const { raw_contribution, existential_component } = args;

  const upper = existential_component
    ? COMPONENT_EXISTENTIAL_CAP_POSITIVE
    : COMPONENT_SOFT_CAP_POSITIVE;
  const lower = existential_component
    ? COMPONENT_EXISTENTIAL_CAP_NEGATIVE
    : COMPONENT_SOFT_CAP_NEGATIVE;

  let capped = raw_contribution;
  let capHit = false;
  if (raw_contribution > upper) {
    capped = upper;
    capHit = true;
  } else if (raw_contribution < lower) {
    capped = lower;
    capHit = true;
  }

  return {
    raw_contribution,
    capped_contribution: capped,
    cap_hit: capHit,
    cap_applied: capHit
      ? existential_component
        ? "existential"
        : "soft"
      : "none",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildComponentArgs {
  readonly component_id: string;
  readonly axis: AxisKey;
  readonly name: string;
  readonly raw_contribution: number;
  readonly contribution_explanation: string;
  readonly reference_population: ReferencePopulation;
  readonly existential_component?: boolean;
  readonly sources: ReadonlyArray<ComponentSource>;
  readonly depends_on_assumptions?: ReadonlyArray<AssumptionKey>;
}

/**
 * Build an AxisComponent with cap enforcement and validation.
 *
 * Validation rules:
 *   - component_id must match the namespace convention
 *   - sources must be non-empty (CP-5 guardrail: components without
 *     provenance cannot exist)
 *   - contribution_explanation must be non-empty
 *
 * Throws on validation failure. This is intentional: malformed components
 * are programming bugs that should surface loudly, not be silently
 * tolerated.
 */
export function buildComponent(args: BuildComponentArgs): AxisComponent {
  if (!isValidComponentId(args.component_id)) {
    throw new Error(
      `buildComponent: invalid component_id "${args.component_id}". ` +
        `Must match component.{axis_short}.{specific}.`,
    );
  }
  if (args.sources.length === 0) {
    throw new Error(
      `buildComponent: component "${args.component_id}" has no sources. ` +
        `Components without provenance cannot exist (CP-5 guardrail).`,
    );
  }
  if (!args.contribution_explanation || args.contribution_explanation.trim().length === 0) {
    throw new Error(
      `buildComponent: component "${args.component_id}" has empty contribution_explanation.`,
    );
  }

  const cap = applyCap({
    raw_contribution: args.raw_contribution,
    existential_component: args.existential_component ?? false,
  });

  return {
    component_id: args.component_id,
    axis: args.axis,
    name: args.name,
    contribution: cap.capped_contribution,
    contribution_explanation: args.contribution_explanation,
    reference_population: args.reference_population,
    existential_component: args.existential_component ?? false,
    sources: args.sources,
    depends_on_assumptions: args.depends_on_assumptions ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE CLAMPING
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp a numeric value to [0, 100]. Used for axis score finalization. */
export function clampToAxisRange(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// BAND ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
// Three axis-specific band assignment functions. The numeric cutoffs are
// the same across all axes (BAND_CUTOFF_LOW = 30, BAND_CUTOFF_MID = 50,
// BAND_CUTOFF_HIGH = 70), but the SEMANTIC LABELS differ per axis because
// "high score is good" for financial/durability/evidence and "high score
// is concerning" for fragility/uncertainty.

/**
 * For axes where higher score is better (financial, durability, evidence).
 *   0-30:  concerning
 *   30-50: cautionary
 *   50-70: moderate
 *   70-100: strong
 */
export function assignStandardBand(score: number): StandardAxisBand {
  if (score < BAND_CUTOFF_LOW) return "concerning";
  if (score < BAND_CUTOFF_MID) return "cautionary";
  if (score < BAND_CUTOFF_HIGH) return "moderate";
  return "strong";
}

/**
 * For assumption_fragility where higher score is worse (more concentration).
 *   0-30:  low_concentration
 *   30-50: moderate_concentration
 *   50-70: elevated_concentration
 *   70-100: highly_concentrated
 */
export function assignFragilityBand(score: number): FragilityBand {
  if (score < BAND_CUTOFF_LOW) return "low_concentration";
  if (score < BAND_CUTOFF_MID) return "moderate_concentration";
  if (score < BAND_CUTOFF_HIGH) return "elevated_concentration";
  return "highly_concentrated";
}

/**
 * For underwriting_uncertainty where higher score is worse (less underwriteable).
 *   0-30:  low_uncertainty
 *   30-50: moderate_uncertainty
 *   50-70: elevated_uncertainty
 *   70-100: severe_uncertainty
 */
export function assignUncertaintyBand(score: number): UncertaintyBand {
  if (score < BAND_CUTOFF_LOW) return "low_uncertainty";
  if (score < BAND_CUTOFF_MID) return "moderate_uncertainty";
  if (score < BAND_CUTOFF_HIGH) return "elevated_uncertainty";
  return "severe_uncertainty";
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIS SCORE ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

export interface AssembleAxisScoreArgs {
  readonly axis: AxisKey;
  readonly baseline: number;
  readonly components: ReadonlyArray<AxisComponent>;
  readonly band_strategy: "standard" | "fragility" | "uncertainty";
}

/**
 * Assemble a full AxisScore from baseline + components.
 *
 * Formula:
 *   net_contribution = sum of component.contribution values
 *   raw_score = baseline + net_contribution
 *   score = clamp(raw_score, 0, 100)
 *   band = assignBand(score)  // using axis-specific band strategy
 *
 * The math is intentionally transparent. No weighting, no scaling, no
 * formula obscurity. The components ARE the score; the score is the sum.
 */
export function assembleAxisScore(args: AssembleAxisScoreArgs): AxisScore {
  const netContribution = args.components.reduce(
    (acc, c) => acc + c.contribution,
    0,
  );
  const rawScore = args.baseline + netContribution;
  const score = clampToAxisRange(rawScore);

  let band: AxisBand;
  switch (args.band_strategy) {
    case "standard":
      band = assignStandardBand(score);
      break;
    case "fragility":
      band = assignFragilityBand(score);
      break;
    case "uncertainty":
      band = assignUncertaintyBand(score);
      break;
  }

  return {
    axis: args.axis,
    score,
    band,
    baseline: args.baseline,
    components: args.components,
    net_contribution: netContribution,
    version: AXIS_COMPOSITION_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// Builders that turn upstream artifacts (rule firings, pattern detections,
// scenario outputs, fingerprint metadata) into ComponentSource records.
// Composers use these so the source-construction code doesn't drift across
// files.

export function sourceFromFiring(firing: {
  firing_id: string;
  rule_id: string;
  rule_name?: string;
  what_triggered?: string;
}): ComponentSource {
  return {
    type: "rule_firing",
    id: firing.firing_id,
    description: firing.what_triggered ?? firing.rule_name ?? firing.rule_id,
  };
}

export function sourceFromPattern(pattern: PatternDetection): ComponentSource {
  return {
    type: "pattern_detection",
    id: pattern.detection_id,
    description: `${pattern.pattern_name}: ${pattern.what_triggered}`,
  };
}

export function sourceFromScenario(scenario: ScenarioOutput): ComponentSource {
  return {
    type: "scenario_output",
    id: scenario.output_id,
    description: `${scenario.scenario_name}: clears=${scenario.clears}`,
  };
}

export function sourceFromSourceConcern(concern: {
  firing_id: string;
  affected_input: string;
  reason: string;
}): ComponentSource {
  return {
    type: "source_concern",
    id: concern.firing_id,
    description: `${concern.affected_input}: ${concern.reason}`,
  };
}

export function sourceFromUncertaintyDelta(delta: {
  firing_id: string;
  sub_axis: string;
  reason: string;
}): ComponentSource {
  return {
    type: "uncertainty_delta",
    id: delta.firing_id,
    description: `${delta.sub_axis}: ${delta.reason}`,
  };
}

export function sourceFromFingerprintSignal(args: {
  fingerprint_key: string;
  signal_description: string;
  signal_id?: string;
}): ComponentSource {
  return {
    type: "fingerprint_signal",
    id: args.signal_id ?? `fingerprint.${args.fingerprint_key}`,
    description: args.signal_description,
  };
}

export function sourceFromFragilityNode(args: {
  assumption_key: AssumptionKey;
  node_description: string;
}): ComponentSource {
  return {
    type: "fragility_signal",
    id: `fragility_node.${args.assumption_key}`,
    description: args.node_description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION-MAGNITUDE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// Map relative magnitudes (high/medium/low) to baseline numeric contributions
// before per-axis adjustment. Composers may scale these further; this just
// provides a consistent starting point.

export function magnitudeToContribution(
  relative_magnitude: "high" | "medium" | "low",
  direction: "positive" | "negative" | "neutral",
): number {
  if (direction === "neutral") return 0;
  const sign = direction === "positive" ? 1 : -1;
  switch (relative_magnitude) {
    case "high":
      return sign * 10;
    case "medium":
      return sign * 6;
    case "low":
      return sign * 3;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT-ID NAMESPACE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// Construct stable component IDs from short axis name + specific suffix.

const AXIS_SHORT_NAME: Record<AxisKey, string> = {
  financial_score: "financial",
  durability_score: "durability",
  evidence_quality: "evidence",
  assumption_fragility: "fragility",
  underwriting_uncertainty: "uncertainty",
};

export function buildComponentId(axis: AxisKey, specific: string): string {
  const shortName = AXIS_SHORT_NAME[axis];
  if (!shortName) {
    throw new Error(`Unknown axis key: ${axis}`);
  }
  // Sanitize specific suffix: lowercase, replace non-alphanumeric with underscore
  const sanitized = specific
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!/^[a-z]/.test(sanitized)) {
    throw new Error(
      `buildComponentId: specific suffix "${specific}" must start with a letter after sanitization.`,
    );
  }
  return `component.${shortName}.${sanitized}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentSummary {
  readonly total: number;
  readonly positive: number;
  readonly negative: number;
  readonly existential: number;
  readonly fingerprint_relative: number;
  readonly global: number;
}

export function summarizeComponents(
  components: ReadonlyArray<AxisComponent>,
): ComponentSummary {
  let positive = 0;
  let negative = 0;
  let existential = 0;
  let fingerprintRelative = 0;
  let global = 0;

  for (const c of components) {
    if (c.contribution > 0) positive += 1;
    if (c.contribution < 0) negative += 1;
    if (c.existential_component) existential += 1;
    if (c.reference_population === "this_fingerprint") fingerprintRelative += 1;
    if (c.reference_population === "all_fingerprints" || c.reference_population === "global_benchmark") {
      global += 1;
    }
  }

  return {
    total: components.length,
    positive,
    negative,
    existential,
    fingerprint_relative: fingerprintRelative,
    global,
  };
}

// Suppress unused-import warnings
const _suppress_RuleFiring: RuleFiring | undefined = undefined;
const _suppress_ComponentSourceType: ComponentSourceType | undefined = undefined;
void _suppress_RuleFiring;
void _suppress_ComponentSourceType;
