// lib/intelligence/scenarios/clearance.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Centralized Clearance Evaluator
//
// CP-4 Module: Single source of truth for "what counts as comfortable,
// marginal, structurally compressed, or failing" under any scenario.
// Centralized defaults; per-scenario overrides supported.
//
// Constitutional principle (CP-4 guardrail #1):
//   "Fails" means the scenario surfaces survivability pressure under
//   that assumption. It does NOT mean the deal is bad. The clearance
//   evaluator produces survivability framing; consumers (CP-5, CP-7,
//   CP-8) translate survivability into axis impact, lender posture, or
//   narrative — never directly into verdict.
//
// Why centralized:
//
//   Without a single evaluator, scenarios would each define "what is
//   failure" inconsistently. A DSCR of 1.18x would mean
//   "structurally_compressed" in one scenario and "fails" in another
//   purely because of definitional drift. Centralization prevents this.
//
//   Per-scenario overrides remain available because different scenarios
//   genuinely have different underwriting intent — lender_stress is
//   meant to be the strictest; industry_normalized tests defensible
//   baseline survivability. The override surface is structured
//   (ClearanceThresholdOverrides) so drift is auditable.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ClearanceBasis,
  ClearanceThresholdOverrides,
  ScenarioClearance,
} from "./types";
import { CLEARANCE_FRAMEWORK_VERSION } from "./types";

// Re-export for downstream consumers.
export { CLEARANCE_FRAMEWORK_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED DEFAULT THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────
// The default ladder a scenario uses when it declares no overrides.
//
// Higher values = healthier. The evaluator categorizes by walking down
// the ladder: if metric >= comfortable threshold → clears_comfortably,
// else if >= marginal → clears_marginally, else if >= compressed →
// structurally_compressed, else if >= failure → still structurally_compressed
// (just barely), else → fails.
//
// The four DSCR thresholds reflect the constitution's underwriting bands:
//   - 1.50x+: comfortable; absorbs reasonable normalization scenarios
//   - 1.30x: SBA-style conservative threshold
//   - 1.10x: structural compression; thin but operationally viable
//   - 1.00x: failure floor; below this is technical default territory

export const DEFAULT_DSCR_COMFORTABLE = 1.50;
export const DEFAULT_DSCR_MARGINAL = 1.30;
export const DEFAULT_DSCR_COMPRESSED = 1.10;
export const DEFAULT_DSCR_FAILURE = 1.00;

export const DEFAULT_CURRENT_RATIO_COMFORTABLE = 2.0;
export const DEFAULT_CURRENT_RATIO_MARGINAL = 1.5;
export const DEFAULT_CURRENT_RATIO_COMPRESSED = 1.1;
export const DEFAULT_CURRENT_RATIO_FAILURE = 0.9;

export const DEFAULT_MARGIN_COMFORTABLE_PCT = 15;
export const DEFAULT_MARGIN_MARGINAL_PCT = 10;
export const DEFAULT_MARGIN_COMPRESSED_PCT = 5;
export const DEFAULT_MARGIN_FAILURE_PCT = 0;

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve effective thresholds for a scenario. Centralized defaults
 * apply unless the scenario provided overrides for specific fields.
 *
 * Returns a non-partial object — every field is populated either from
 * the override (when present) or the default (when absent). Downstream
 * code never has to deal with "is this threshold defined?"
 */
export function resolveThresholds(
  overrides: ClearanceThresholdOverrides | null,
): {
  readonly dscr_comfortable: number;
  readonly dscr_marginal: number;
  readonly dscr_compressed: number;
  readonly dscr_failure: number;
  readonly current_ratio_comfortable: number;
  readonly current_ratio_marginal: number;
  readonly current_ratio_compressed: number;
  readonly current_ratio_failure: number;
  readonly margin_comfortable_pct: number;
  readonly margin_marginal_pct: number;
  readonly margin_compressed_pct: number;
  readonly margin_failure_pct: number;
} {
  return {
    dscr_comfortable: overrides?.dscr_comfortable ?? DEFAULT_DSCR_COMFORTABLE,
    dscr_marginal: overrides?.dscr_marginal ?? DEFAULT_DSCR_MARGINAL,
    dscr_compressed: overrides?.dscr_compressed ?? DEFAULT_DSCR_COMPRESSED,
    dscr_failure: overrides?.dscr_failure ?? DEFAULT_DSCR_FAILURE,
    current_ratio_comfortable: overrides?.current_ratio_comfortable ?? DEFAULT_CURRENT_RATIO_COMFORTABLE,
    current_ratio_marginal: overrides?.current_ratio_marginal ?? DEFAULT_CURRENT_RATIO_MARGINAL,
    current_ratio_compressed: overrides?.current_ratio_compressed ?? DEFAULT_CURRENT_RATIO_COMPRESSED,
    current_ratio_failure: overrides?.current_ratio_failure ?? DEFAULT_CURRENT_RATIO_FAILURE,
    margin_comfortable_pct: overrides?.margin_comfortable_pct ?? DEFAULT_MARGIN_COMFORTABLE_PCT,
    margin_marginal_pct: overrides?.margin_marginal_pct ?? DEFAULT_MARGIN_MARGINAL_PCT,
    margin_compressed_pct: overrides?.margin_compressed_pct ?? DEFAULT_MARGIN_COMPRESSED_PCT,
    margin_failure_pct: overrides?.margin_failure_pct ?? DEFAULT_MARGIN_FAILURE_PCT,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-METRIC CLEARANCE EVALUATORS
// ─────────────────────────────────────────────────────────────────────────────
// Pure ladder evaluators for one metric at a time. Composite clearance
// (used by scenarios touching multiple metrics) calls these and combines.

/**
 * DSCR ladder evaluation.
 *   value >= comfortable    → clears_comfortably
 *   value >= marginal       → clears_marginally
 *   value >= compressed     → structurally_compressed
 *   value >= failure        → structurally_compressed (just barely; the band
 *                              between failure and compressed is the "thin
 *                              compression" zone — still operationally viable)
 *   value <  failure        → fails
 */
export function evaluateDscrClearance(
  dscr: number,
  thresholds: ReturnType<typeof resolveThresholds>,
): ScenarioClearance {
  if (dscr >= thresholds.dscr_comfortable) return "clears_comfortably";
  if (dscr >= thresholds.dscr_marginal) return "clears_marginally";
  if (dscr >= thresholds.dscr_compressed) return "structurally_compressed";
  if (dscr >= thresholds.dscr_failure) return "structurally_compressed";
  return "fails";
}

/**
 * Current ratio ladder evaluation. Mirrors DSCR but with current_ratio
 * thresholds.
 */
export function evaluateCurrentRatioClearance(
  cr: number,
  thresholds: ReturnType<typeof resolveThresholds>,
): ScenarioClearance {
  if (cr >= thresholds.current_ratio_comfortable) return "clears_comfortably";
  if (cr >= thresholds.current_ratio_marginal) return "clears_marginally";
  if (cr >= thresholds.current_ratio_compressed) return "structurally_compressed";
  if (cr >= thresholds.current_ratio_failure) return "structurally_compressed";
  return "fails";
}

/**
 * Margin ladder evaluation (operating, SDE, or EBITDA — caller decides
 * which margin to pass).
 */
export function evaluateMarginClearance(
  margin_pct: number,
  thresholds: ReturnType<typeof resolveThresholds>,
): ScenarioClearance {
  if (margin_pct >= thresholds.margin_comfortable_pct) return "clears_comfortably";
  if (margin_pct >= thresholds.margin_marginal_pct) return "clears_marginally";
  if (margin_pct >= thresholds.margin_compressed_pct) return "structurally_compressed";
  if (margin_pct >= thresholds.margin_failure_pct) return "structurally_compressed";
  return "fails";
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE CLEARANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combine multiple single-metric clearances into a composite clearance.
 *
 * Rule: the composite is the WORST of the participating clearances. A
 * scenario that comfortably clears DSCR but fails on current ratio
 * cannot be reported as "clears" — the worst signal anchors the result.
 *
 * Ordering (worst to best): fails > structurally_compressed >
 * clears_marginally > clears_comfortably. not_applicable is filtered
 * out (a metric not in scope shouldn't drag the composite).
 */
export function combineClearances(
  clearances: ReadonlyArray<ScenarioClearance>,
): ScenarioClearance {
  const relevant = clearances.filter((c) => c !== "not_applicable");
  if (relevant.length === 0) return "not_applicable";

  // Walk from worst to best
  if (relevant.includes("fails")) return "fails";
  if (relevant.includes("structurally_compressed")) return "structurally_compressed";
  if (relevant.includes("clears_marginally")) return "clears_marginally";
  return "clears_comfortably";
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEARANCE EXPLANATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the human-readable clearance_reason string. Scenarios call this
 * after computing their clearance so the explanation is consistent
 * across the catalogue.
 *
 * Uses survivability vocabulary, never verdict vocabulary. "Fails" is
 * framed as "compresses below the survivability threshold," not "the
 * deal is bad under this scenario."
 */
export function buildClearanceReason(args: {
  clearance: ScenarioClearance;
  basis: ClearanceBasis;
  metric_descriptions: ReadonlyArray<string>; // e.g. ["adjusted DSCR 1.18x", "adjusted current ratio 1.05"]
}): string {
  const { clearance, basis, metric_descriptions } = args;
  const metrics = metric_descriptions.join("; ");

  switch (clearance) {
    case "clears_comfortably":
      return `Under this scenario, ${basis} signals remain in healthy territory (${metrics}). The deal absorbs the scenario with material buffer.`;
    case "clears_marginally":
      return `Under this scenario, ${basis} signals compress but remain within typical bands (${metrics}). The deal survives with thin buffer.`;
    case "structurally_compressed":
      return `Under this scenario, ${basis} signals compress materially but remain operationally viable (${metrics}). The deal is functioning under pressure, not failing.`;
    case "fails":
      return `Under this scenario, ${basis} signals compress below the survivability threshold (${metrics}). The scenario surfaces survivability pressure — diligence priority, not deal-quality verdict.`;
    case "not_applicable":
      return `Scenario did not apply to this deal: ${metrics}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface ClearanceFrameworkValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly version: string;
}

/**
 * Validate the centralized default ladder. Ensures the four-tier
 * ordering is internally consistent (comfortable > marginal > compressed
 * > failure) for each metric. Runs at module load.
 */
export function validateClearanceFramework(): ClearanceFrameworkValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  // DSCR ordering invariant
  if (
    !(DEFAULT_DSCR_COMFORTABLE > DEFAULT_DSCR_MARGINAL &&
      DEFAULT_DSCR_MARGINAL > DEFAULT_DSCR_COMPRESSED &&
      DEFAULT_DSCR_COMPRESSED > DEFAULT_DSCR_FAILURE)
  ) {
    issues.push({
      severity: "error",
      location: "dscr_thresholds",
      message: `DSCR ladder ordering broken: ${DEFAULT_DSCR_COMFORTABLE} > ${DEFAULT_DSCR_MARGINAL} > ${DEFAULT_DSCR_COMPRESSED} > ${DEFAULT_DSCR_FAILURE} must hold.`,
    });
  }

  // Current ratio ordering invariant
  if (
    !(DEFAULT_CURRENT_RATIO_COMFORTABLE > DEFAULT_CURRENT_RATIO_MARGINAL &&
      DEFAULT_CURRENT_RATIO_MARGINAL > DEFAULT_CURRENT_RATIO_COMPRESSED &&
      DEFAULT_CURRENT_RATIO_COMPRESSED > DEFAULT_CURRENT_RATIO_FAILURE)
  ) {
    issues.push({
      severity: "error",
      location: "current_ratio_thresholds",
      message: `Current ratio ladder ordering broken: ${DEFAULT_CURRENT_RATIO_COMFORTABLE} > ${DEFAULT_CURRENT_RATIO_MARGINAL} > ${DEFAULT_CURRENT_RATIO_COMPRESSED} > ${DEFAULT_CURRENT_RATIO_FAILURE} must hold.`,
    });
  }

  // Margin ordering invariant
  if (
    !(DEFAULT_MARGIN_COMFORTABLE_PCT > DEFAULT_MARGIN_MARGINAL_PCT &&
      DEFAULT_MARGIN_MARGINAL_PCT > DEFAULT_MARGIN_COMPRESSED_PCT &&
      DEFAULT_MARGIN_COMPRESSED_PCT > DEFAULT_MARGIN_FAILURE_PCT)
  ) {
    issues.push({
      severity: "error",
      location: "margin_thresholds",
      message: `Margin ladder ordering broken: ${DEFAULT_MARGIN_COMFORTABLE_PCT} > ${DEFAULT_MARGIN_MARGINAL_PCT} > ${DEFAULT_MARGIN_COMPRESSED_PCT} > ${DEFAULT_MARGIN_FAILURE_PCT} must hold.`,
    });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    version: CLEARANCE_FRAMEWORK_VERSION,
  };
}

function assertClearanceFrameworkValid(): void {
  const result = validateClearanceFramework();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Clearance framework validation failed (${CLEARANCE_FRAMEWORK_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertClearanceFrameworkValid();
