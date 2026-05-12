// lib/intelligence/axes/fingerprint-normalization.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Fingerprint Normalization
//
// CP-5 Module: Per-component normalization that protects against
// rule-density inflation across operating models.
//
// The problem this module solves:
//
//   Healthcare practices have 6 explicit rules in the catalogue and 5
//   industry overrides. Contractors have 8 trigger rules and the densest
//   expected_failure_modes list. Asset-heavy services have the EBITDA-
//   D&A normalization layer plus capex_normalized scenarios. Restaurants
//   have one fingerprint and limited overrides.
//
//   If durability_score were computed as "sum of negative rule firings /
//   total firings × 100", a contractor with 5 firings out of 28 applicable
//   rules would look worse than a restaurant with 2 firings out of 12
//   applicable rules — even when underlying business quality is identical.
//
//   Operating models with denser diagnostic surfaces would systematically
//   score lower simply because the engine knows more about them.
//
// The architectural response:
//
//   Per Q3 = (C), each AxisComponent declares its reference_population:
//     - this_fingerprint: measured against expected behavior of this
//       operating model. Used for rule-density-sensitive signals like
//       "how many of the fingerprint's expected interaction rules fired?"
//     - all_fingerprints: measured against universe of fingerprints
//     - global_benchmark: measured against absolute thresholds (e.g.,
//       source-type strength). NOT fingerprint-dependent.
//
//   This module provides the math for converting raw signals into
//   fingerprint-relative contributions when appropriate. Composers
//   decide per-component whether to apply fingerprint normalization
//   or use global thresholds.
//
// Module scope (intentionally narrow):
//
//   - Compute fingerprint-expected baselines for rule/scenario behavior
//   - Normalize raw signal magnitudes against those baselines
//   - Surface diagnostic info about what was normalized and how
//
// What this module does NOT do:
//
//   - Apply axis-specific composition logic (that's in compose-*.ts)
//   - Modify component contributions after the fact (immutability)
//   - Track normalization history beyond a single composition call
// ─────────────────────────────────────────────────────────────────────────────

import type {
  FingerprintResolution,
  OperatingModelKey,
} from "../types";
import type {
  PatternDetection,
  RuleFiring,
} from "../rules/types";
import type {
  ScenarioOutput,
} from "../scenarios/types";
import type {
  ReferencePopulation,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// FINGERPRINT EXPECTATIONS
// ─────────────────────────────────────────────────────────────────────────────
// What we expect a "typical" deal in each operating model to produce in
// terms of rule firings, pattern detections, and scenario applications.
// These expectations are baselines used to detect deviations.
//
// Numbers reflect the constitution's per-fingerprint expected_interaction_
// rule_ids and expected_scenario_ids lists, plus empirical observation of
// rule applicability across operating models. They are not arbitrary.
//
// Editing these numbers is a governance decision — they shape every
// component that uses fingerprint-relative normalization.

interface FingerprintExpectations {
  /** Expected rule firings for a healthy deal in this operating model. */
  readonly expected_firings_typical: number;
  /** Expected rule firings for a stressed deal in this operating model. */
  readonly expected_firings_stressed: number;
  /** Expected pattern detections for a healthy deal. */
  readonly expected_patterns_typical: number;
  /** Expected pattern detections for a stressed deal. */
  readonly expected_patterns_stressed: number;
  /** Expected scenarios applied for any deal in this operating model. */
  readonly expected_scenarios_applied: number;
}

const FINGERPRINT_EXPECTATIONS: Record<OperatingModelKey, FingerprintExpectations> = {
  professional_services: {
    expected_firings_typical: 2,
    expected_firings_stressed: 7,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 4,
  },
  healthcare_practice: {
    expected_firings_typical: 3,
    expected_firings_stressed: 8,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 4,
    expected_scenarios_applied: 5,
  },
  field_service: {
    expected_firings_typical: 2,
    expected_firings_stressed: 6,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 4,
  },
  consumer_service: {
    expected_firings_typical: 2,
    expected_firings_stressed: 6,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 4,
  },
  asset_heavy_service: {
    expected_firings_typical: 3,
    expected_firings_stressed: 8,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 4,
    expected_scenarios_applied: 5,
  },
  contractor: {
    expected_firings_typical: 3,
    expected_firings_stressed: 9,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 4,
    expected_scenarios_applied: 6,
  },
  service_with_inventory: {
    expected_firings_typical: 2,
    expected_firings_stressed: 6,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 4,
  },
  retail_inventory: {
    expected_firings_typical: 3,
    expected_firings_stressed: 7,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 5,
  },
  manufacturing: {
    expected_firings_typical: 2,
    expected_firings_stressed: 7,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 5,
  },
  ecommerce: {
    expected_firings_typical: 2,
    expected_firings_stressed: 6,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 4,
  },
  restaurant: {
    expected_firings_typical: 2,
    expected_firings_stressed: 5,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 2,
    expected_scenarios_applied: 4,
  },
  software: {
    expected_firings_typical: 2,
    expected_firings_stressed: 6,
    expected_patterns_typical: 0,
    expected_patterns_stressed: 3,
    expected_scenarios_applied: 5,
  },
};

/** Fallback expectations — used when fingerprint is fallback or unknown. */
const FALLBACK_EXPECTATIONS: FingerprintExpectations = {
  expected_firings_typical: 2,
  expected_firings_stressed: 6,
  expected_patterns_typical: 0,
  expected_patterns_stressed: 3,
  expected_scenarios_applied: 4,
};

/**
 * Look up expectations for a fingerprint. Falls back gracefully when
 * the resolution is itself a fallback.
 */
export function getFingerprintExpectations(
  resolution: FingerprintResolution,
): FingerprintExpectations {
  if (resolution.is_fallback) return FALLBACK_EXPECTATIONS;
  const exp = FINGERPRINT_EXPECTATIONS[resolution.fingerprint.key];
  return exp ?? FALLBACK_EXPECTATIONS;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-DENSITY NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export interface RuleDensityNormalizationResult {
  /** Raw count of negative-direction firings. */
  readonly raw_negative_firings: number;
  /** Raw count of positive-direction firings. */
  readonly raw_positive_firings: number;
  /** Fingerprint's typical baseline. */
  readonly fingerprint_typical: number;
  /** Fingerprint's stressed baseline. */
  readonly fingerprint_stressed: number;
  /**
   * Normalized signal: how far the deal sits from typical, scaled against
   * the stressed-baseline gap. Range typically -1 (better than typical)
   * to +2 (well past stressed baseline).
   *
   * Formula:
   *   gap = stressed - typical
   *   excess = negative_firings - typical
   *   normalized = excess / gap
   */
  readonly normalized_signal: number;
  /**
   * How much net contribution this normalization should produce. Scaled
   * to be cap-respectful: typical/expected behavior produces ~0 contribution;
   * stressed-baseline behavior produces ~-10 contribution; well-past-stressed
   * produces ~-15 (which hits the soft cap).
   */
  readonly suggested_contribution: number;
  /** Plain-language explanation of the normalization. */
  readonly explanation: string;
}

/**
 * Normalize negative rule-firing density against fingerprint expectations.
 *
 * Used by durability_score composition: instead of "5 negative firings →
 * -25 points", the engine asks "how does 5 firings compare to what we
 * expect for this fingerprint?" A healthcare practice with 5 firings is
 * approximately fingerprint-typical; a restaurant with 5 firings is
 * already stressed.
 */
export function normalizeRuleFiringDensity(
  firings: ReadonlyArray<RuleFiring>,
  resolution: FingerprintResolution,
): RuleDensityNormalizationResult {
  const expectations = getFingerprintExpectations(resolution);

  const negativeFirings = firings.filter(
    (f) => f.finding !== null && f.finding.direction === "negative",
  ).length;
  const positiveFirings = firings.filter(
    (f) => f.finding !== null && f.finding.direction === "positive",
  ).length;

  const typical = expectations.expected_firings_typical;
  const stressed = expectations.expected_firings_stressed;
  const gap = stressed - typical;
  // Guard: gap should always be positive given the expectations table; default to 1 if not.
  const safeGap = gap > 0 ? gap : 1;

  const excess = negativeFirings - typical;
  const normalizedSignal = excess / safeGap;

  // Suggested contribution scaling:
  //   normalized_signal = 0  (at typical baseline) → contribution = 0
  //   normalized_signal = 1  (at stressed baseline) → contribution = -10
  //   normalized_signal = 2  (well past stressed)  → contribution = -15 (caps)
  //   normalized_signal < 0  (below typical)       → contribution = +3 to +5
  let suggested: number;
  if (normalizedSignal <= 0) {
    // Below typical — small positive contribution recognizing fingerprint-typical health
    suggested = Math.min(5, Math.abs(normalizedSignal) * 5);
  } else {
    // Above typical — negative contribution scaled to stressed baseline
    suggested = -Math.min(15, normalizedSignal * 10);
  }

  const explanation = describeRuleDensity({
    fingerprint_name: resolution.fingerprint.display_name,
    negative_firings: negativeFirings,
    positive_firings: positiveFirings,
    typical,
    stressed,
    normalized_signal: normalizedSignal,
    is_fallback: resolution.is_fallback,
  });

  return {
    raw_negative_firings: negativeFirings,
    raw_positive_firings: positiveFirings,
    fingerprint_typical: typical,
    fingerprint_stressed: stressed,
    normalized_signal: normalizedSignal,
    suggested_contribution: suggested,
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN-DENSITY NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export interface PatternDensityNormalizationResult {
  readonly raw_pattern_count: number;
  readonly high_severity_count: number;
  readonly fingerprint_typical: number;
  readonly fingerprint_stressed: number;
  readonly normalized_signal: number;
  readonly suggested_contribution: number;
  readonly explanation: string;
}

/**
 * Normalize pattern detection density against fingerprint expectations.
 *
 * Patterns are second-order signals. A single high-severity pattern is
 * already meaningful; multiple patterns indicate deal-wide concentration.
 *
 * Patterns are weighted by severity: high-severity patterns count for 2,
 * medium for 1, low for 0.5. This prevents low-severity pattern noise
 * from inflating the signal.
 */
export function normalizePatternDensity(
  patterns: ReadonlyArray<PatternDetection>,
  resolution: FingerprintResolution,
): PatternDensityNormalizationResult {
  const expectations = getFingerprintExpectations(resolution);

  const highSeverity = patterns.filter((p) => p.severity === "high").length;
  const mediumSeverity = patterns.filter((p) => p.severity === "medium").length;
  const lowSeverity = patterns.filter((p) => p.severity === "low").length;

  // Severity-weighted count
  const weightedCount = highSeverity * 2 + mediumSeverity * 1 + lowSeverity * 0.5;

  const typical = expectations.expected_patterns_typical;
  const stressed = expectations.expected_patterns_stressed;
  const gap = stressed - typical;
  const safeGap = gap > 0 ? gap : 1;

  const normalizedSignal = (weightedCount - typical) / safeGap;

  // Patterns hit harder than individual rule firings; scale steeper.
  //   normalized = 0 (at typical) → contribution = 0
  //   normalized = 1 (at stressed) → contribution = -12
  //   normalized = 2 (well past)  → contribution = -15 (caps)
  let suggested: number;
  if (normalizedSignal <= 0) {
    suggested = 0;
  } else {
    suggested = -Math.min(15, normalizedSignal * 12);
  }

  const explanation = describePatternDensity({
    fingerprint_name: resolution.fingerprint.display_name,
    raw_count: patterns.length,
    high_severity: highSeverity,
    weighted_count: weightedCount,
    typical,
    stressed,
  });

  return {
    raw_pattern_count: patterns.length,
    high_severity_count: highSeverity,
    fingerprint_typical: typical,
    fingerprint_stressed: stressed,
    normalized_signal: normalizedSignal,
    suggested_contribution: suggested,
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO-CLEARANCE NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioClearanceNormalizationResult {
  readonly total_applied: number;
  readonly clears_comfortably: number;
  readonly clears_marginally: number;
  readonly structurally_compressed: number;
  readonly fails: number;
  /**
   * Net signal: positive when most applied scenarios clear; negative when
   * most fail or compress. Range typically -1 (all fail) to +1 (all clear
   * comfortably).
   */
  readonly clearance_index: number;
  readonly suggested_contribution: number;
  readonly explanation: string;
}

/**
 * Normalize scenario clearance distribution. Used by durability_score
 * composition — scenarios that fail or compress materially erode durability.
 *
 * Note: this normalization is NOT fingerprint-relative in the same way
 * rule density is, because scenario applicability already filters down
 * to scenarios that are diagnostic for this fingerprint. The reference
 * population for this signal is "scenarios that applied to this deal,"
 * which is itself fingerprint-shaped.
 *
 * Returns reference_population = "this_fingerprint" because the
 * applicability gates make the signal fingerprint-shaped.
 */
export function normalizeScenarioClearance(
  scenarios: ReadonlyArray<ScenarioOutput>,
): ScenarioClearanceNormalizationResult {
  const applied = scenarios.filter((s) => s.applied);
  const total = applied.length;

  const clearsComfortably = applied.filter((s) => s.clears === "clears_comfortably").length;
  const clearsMarginally = applied.filter((s) => s.clears === "clears_marginally").length;
  const structurallyCompressed = applied.filter((s) => s.clears === "structurally_compressed").length;
  const fails = applied.filter((s) => s.clears === "fails").length;

  // Weighted clearance index: comfortably=+1, marginally=+0.5, compressed=-0.5, fails=-1
  let clearanceIndex = 0;
  if (total > 0) {
    clearanceIndex =
      (clearsComfortably * 1 + clearsMarginally * 0.5 + structurallyCompressed * -0.5 + fails * -1) /
      total;
  }

  // Suggested contribution: scenario clearance is a substantial durability signal
  //   index =  1.0 (all clear comfortably) → +12
  //   index =  0.5 (mixed positive)       → +6
  //   index =  0.0 (mixed)                → 0
  //   index = -0.5 (mostly compressed)    → -10
  //   index = -1.0 (all fail)             → -15 (caps)
  let suggested: number;
  if (total === 0) {
    suggested = 0;
  } else {
    suggested = Math.max(-15, Math.min(12, clearanceIndex * 12));
  }

  const explanation = describeScenarioClearance({
    total,
    clears_comfortably: clearsComfortably,
    clears_marginally: clearsMarginally,
    structurally_compressed: structurallyCompressed,
    fails,
    clearance_index: clearanceIndex,
  });

  return {
    total_applied: total,
    clears_comfortably: clearsComfortably,
    clears_marginally: clearsMarginally,
    structurally_compressed: structurallyCompressed,
    fails,
    clearance_index: clearanceIndex,
    suggested_contribution: suggested,
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE-POPULATION SUGGESTION
// ─────────────────────────────────────────────────────────────────────────────
// Helper for composers: given the type of signal, suggest which
// reference_population it should declare. Composers can override.

export function suggestReferencePopulation(args: {
  signal_type:
    | "rule_density"
    | "pattern_density"
    | "scenario_clearance"
    | "source_strength"
    | "fingerprint_signal"
    | "fragility_concentration"
    | "uncertainty_escalation";
}): ReferencePopulation {
  switch (args.signal_type) {
    case "rule_density":
    case "pattern_density":
      return "this_fingerprint";
    case "scenario_clearance":
      return "this_fingerprint"; // scenarios are already fingerprint-gated
    case "source_strength":
      return "global_benchmark"; // source-type strength is universal
    case "fingerprint_signal":
      return "this_fingerprint"; // by definition fingerprint-specific
    case "fragility_concentration":
      return "all_fingerprints"; // criticality/layering are universal concepts
    case "uncertainty_escalation":
      return "all_fingerprints"; // most uncertainty signals are universal
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLANATION BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function describeRuleDensity(args: {
  fingerprint_name: string;
  negative_firings: number;
  positive_firings: number;
  typical: number;
  stressed: number;
  normalized_signal: number;
  is_fallback: boolean;
}): string {
  const fingerprintFraming = args.is_fallback
    ? "the fallback fingerprint baseline"
    : `the ${args.fingerprint_name} fingerprint's typical baseline (${args.typical} firings) and stressed baseline (${args.stressed} firings)`;

  if (args.normalized_signal <= 0) {
    return (
      `${args.negative_firings} negative firings is at or below ${fingerprintFraming}. ` +
      `This is fingerprint-typical behavior; the deal carries the diagnostic surface this operating model typically produces.`
    );
  } else if (args.normalized_signal < 1) {
    return (
      `${args.negative_firings} negative firings sits between typical (${args.typical}) and stressed (${args.stressed}) for ${fingerprintFraming}. ` +
      `The deal carries more diagnostic signal than the fingerprint median but has not reached the stressed baseline.`
    );
  } else {
    return (
      `${args.negative_firings} negative firings sits at or above the ${fingerprintFraming}'s stressed baseline (${args.stressed} firings). ` +
      `The deal's diagnostic surface is more concentrated than typical for this operating model.`
    );
  }
}

function describePatternDensity(args: {
  fingerprint_name: string;
  raw_count: number;
  high_severity: number;
  weighted_count: number;
  typical: number;
  stressed: number;
}): string {
  return (
    `${args.raw_count} patterns detected (${args.high_severity} high-severity); ` +
    `severity-weighted count ${args.weighted_count.toFixed(1)} against ${args.fingerprint_name}'s typical pattern baseline ${args.typical} and stressed baseline ${args.stressed}.`
  );
}

function describeScenarioClearance(args: {
  total: number;
  clears_comfortably: number;
  clears_marginally: number;
  structurally_compressed: number;
  fails: number;
  clearance_index: number;
}): string {
  if (args.total === 0) {
    return "No scenarios applied to this deal; clearance signal not informative.";
  }
  return (
    `${args.total} scenarios applied. ` +
    `${args.clears_comfortably} clear comfortably, ${args.clears_marginally} clear marginally, ` +
    `${args.structurally_compressed} structurally compressed, ${args.fails} fail. ` +
    `Weighted clearance index ${args.clearance_index.toFixed(2)} ` +
    `(range -1 to +1; positive = scenarios clear; negative = scenarios stress the deal).`
  );
}

// Suppress unused-import warnings
const _suppress_OperatingModelKey: OperatingModelKey | undefined = undefined;
void _suppress_OperatingModelKey;
