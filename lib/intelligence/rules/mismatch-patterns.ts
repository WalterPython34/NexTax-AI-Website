// lib/intelligence/rules/mismatch-patterns.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Mismatch Pattern Catalogue
//
// CP-3 Module: Second-order intelligence over the rule engine's output.
// Patterns consume the unordered RuleFiring set after rule evaluation
// completes and detect coherent clusters that no single rule can see.
//
// Individual rule firings are first-order observations.
// Mismatch patterns are second-order interpretation.
//
// The constitution treats interaction intelligence as the real moat:
// "the most valuable output is not 'margin is above median.' It is 'margin
// profile, leverage tolerance, working capital behavior, and concentration
// profile conflict with the expected operating model.'"
//
// Design constraints honored:
//
//   1. Pure functions. Patterns read firings; never modify them.
//   2. No coupling to rule evaluation. Patterns evaluate AFTER rules return.
//   3. Stable IDs. Every pattern carries a longitudinal-correlation ID.
//   4. Personality-agnostic. No rule profile names anywhere.
//   5. Source for legitimate structurally_suspicious classifications.
//      Single isolated outliers stay statistically_atypical; clusters
//      escalate to structurally_suspicious.
//   6. Aggregated assumption + axis output for fragility graph (CP-5).
//
// Pattern catalogue version: cp3-v0.1.0
//
// The six patterns specified in CP-3 approval:
//   - earnings quality dependency cluster
//   - lender collateral tension cluster
//   - working capital pressure cluster
//   - operating-model mismatch cluster
//   - evidence insufficiency cluster
//   - transition fragility cluster
//
// Plus one bonus: revenue-quality-and-trajectory cluster (combines
// declining-trajectory rules with revenue-quality concerns).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AssumptionKey,
  AxisKey,
} from "../types";
import type {
  FiringSeverity,
  MismatchPattern,
  MismatchPatternId,
  PatternDetection,
  RuleFiring,
  RuleId,
} from "./types";
import { MISMATCH_PATTERN_CATALOGUE_VERSION } from "./types";

// Re-export for downstream consumers
export { MISMATCH_PATTERN_CATALOGUE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let detectionCounter = 0;
function makeDetectionId(pattern_id: string): string {
  detectionCounter += 1;
  return `${pattern_id}#${detectionCounter}@${new Date().toISOString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Union of assumption keys across the participating firings, preserving order
 * of first appearance.
 */
function aggregateAssumptions(firings: ReadonlyArray<RuleFiring>): ReadonlyArray<AssumptionKey> {
  const seen = new Set<string>();
  const out: AssumptionKey[] = [];
  for (const f of firings) {
    for (const a of f.depends_on_assumptions) {
      if (!seen.has(a)) {
        seen.add(a);
        out.push(a);
      }
    }
  }
  return out;
}

/**
 * Union of axes affected across participating firings.
 */
function aggregateAxes(firings: ReadonlyArray<RuleFiring>): ReadonlyArray<AxisKey> {
  const seen = new Set<string>();
  const out: AxisKey[] = [];
  for (const f of firings) {
    if (f.finding) {
      for (const impact of f.finding.axis_impact) {
        if (!seen.has(impact.axis)) {
          seen.add(impact.axis);
          out.push(impact.axis);
        }
      }
    }
  }
  return out;
}

/**
 * Filter the firing set to only those matching the participating rule IDs.
 */
function selectParticipating(
  firings: ReadonlyArray<RuleFiring>,
  participating_rule_ids: ReadonlyArray<RuleId>,
): ReadonlyArray<RuleFiring> {
  const wanted = new Set(participating_rule_ids);
  return firings.filter((f) => wanted.has(f.rule_id));
}

/**
 * Promote severity when multiple high-severity firings participate.
 * Severity is determined by the highest-severity firing AND the count.
 */
function inferSeverity(
  participating: ReadonlyArray<RuleFiring>,
  defaultSeverity: FiringSeverity,
): FiringSeverity {
  const highCount = participating.filter((f) => f.severity === "high").length;
  if (highCount >= 2) return "high";
  if (highCount === 1 && participating.length >= 3) return "high";
  return defaultSeverity;
}

/**
 * Standard PatternDetection builder. Centralizes the detection-shape
 * construction so individual patterns just declare what triggered and why.
 */
function buildDetection(args: {
  pattern: MismatchPattern;
  participating: ReadonlyArray<RuleFiring>;
  what_triggered: string;
  why_it_matters: string;
  severity?: FiringSeverity;
}): PatternDetection {
  return {
    detection_id: makeDetectionId(args.pattern.id),
    pattern_id: args.pattern.id,
    pattern_name: args.pattern.name,
    severity: args.severity ?? inferSeverity(args.participating, args.pattern.default_severity),
    participating_firing_ids: args.participating.map((f) => f.firing_id),
    aggregated_assumptions: aggregateAssumptions(args.participating),
    aggregated_axes: aggregateAxes(args.participating),
    what_triggered: args.what_triggered,
    why_it_matters: args.why_it_matters,
    detected_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PATTERN CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export const MISMATCH_PATTERN_CATALOGUE: ReadonlyArray<MismatchPattern> = [

  // ── 1. EARNINGS QUALITY DEPENDENCY CLUSTER ────────────────────────────────
  {
    id: "pattern.earnings_quality.dependency_cluster",
    name: "Earnings quality dependency cluster",
    description:
      "Multiple earnings-quality concerns concentrate. When elevated SDE margin, " +
      "add-back concentration, weak addback sourcing, or missing addback detail " +
      "co-occur, the deal's earnings story rests heavily on add_back_integrity.",
    participating_rule_ids: [
      "rule.earnings_quality.elevated_sde_margin_in_band_model",
      "rule.earnings_quality.addback_concentration_high",
      "rule.earnings_quality.sde_weakly_sourced",
      "rule.earnings_quality.addback_detail_missing",
      "rule.margin.elevated_sde_with_sole_proprietor_signal",
      "rule.trajectory.margin_expansion_rapid",
    ],
    minimum_firings_required: 2,
    default_severity: "high",
    why_it_matters:
      "When multiple earnings-quality signals fire together, the deal's valuation case rests on " +
      "a single point of failure: add_back_integrity. Diligence priority should escalate the " +
      "add-back schedule from a checklist item to a deal-defining workstream. A failure of the " +
      "add-back schedule under independent review would materially compress SDE, valuation multiple, " +
      "and coverage simultaneously.",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      const ruleNames = participating.map((f) => f.rule_name).join("; ");
      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `${participating.length} earnings-quality concerns concentrate simultaneously: ${ruleNames}.`,
        why_it_matters: this.why_it_matters,
      });
    },
  },

  // ── 2. LENDER COLLATERAL TENSION CLUSTER ──────────────────────────────────
  {
    id: "pattern.coverage.collateral_tension_cluster",
    name: "Lender collateral tension cluster",
    description:
      "Thin coverage signals combined with leverage signals indicate the capital structure " +
      "leans on collateral support rather than cash flow. Lenders with different personalities " +
      "(cash-flow vs collateral-focused) will read this dramatically differently.",
    participating_rule_ids: [
      "rule.coverage.dscr_thin",
      "rule.coverage.dscr_missing_with_leverage",
      "rule.leverage.debt_to_worth_extreme",
      "rule.working_capital.current_ratio_thin",
    ],
    minimum_firings_required: 2,
    default_severity: "high",
    why_it_matters:
      "When DSCR sits thin alongside elevated leverage or balance-sheet stress, the capital " +
      "structure has narrow margin against normalization scenarios. The deal's lender posture " +
      "becomes personality-dependent: cash-flow-focused lenders will struggle with this, while " +
      "collateral-focused lenders may proceed if asset coverage is strong. This is a structural " +
      "concern even before specific lender reactions are modeled (CP-7).",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      // Require at least one coverage-related firing (DSCR thin or missing)
      const hasCoverage = participating.some(
        (f) => f.rule_id === "rule.coverage.dscr_thin" ||
               f.rule_id === "rule.coverage.dscr_missing_with_leverage",
      );
      if (!hasCoverage) return null;

      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `Coverage stress combined with ${participating.length - 1} additional structural concerns ` +
          `(${participating.filter((f) => !f.rule_id.startsWith("rule.coverage.")).map((f) => f.rule_name).join(", ")}).`,
        why_it_matters: this.why_it_matters,
      });
    },
  },

  // ── 3. WORKING CAPITAL PRESSURE CLUSTER ───────────────────────────────────
  {
    id: "pattern.working_capital.pressure_cluster",
    name: "Working capital pressure cluster",
    description:
      "Multiple working-capital signals fire together. Indicates the business operates with " +
      "structurally thin working capital that the buyer would inherit.",
    participating_rule_ids: [
      "rule.working_capital.current_ratio_thin",
      "rule.working_capital.ar_days_elevated",
      "rule.working_capital.absorption_with_revenue_growth",
    ],
    minimum_firings_required: 2,
    default_severity: "high",
    why_it_matters:
      "Working capital stress is rarely a single-metric problem — it shows up as thin current ratio, " +
      "extending AR, AND growth-related absorption simultaneously. When multiple working-capital " +
      "signals co-fire, the buyer should expect cash crunches in months 3-9 post-close unless " +
      "an explicit working-capital injection is part of the structure. The working_capital_stability " +
      "assumption becomes a deal-defining dependency.",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `${participating.length} working-capital signals co-fire: ${participating.map((f) => f.rule_name).join("; ")}.`,
        why_it_matters: this.why_it_matters,
      });
    },
  },

  // ── 4. OPERATING-MODEL MISMATCH CLUSTER ───────────────────────────────────
  {
    id: "pattern.mismatch.operating_model_partial_fit",
    name: "Operating-model mismatch cluster",
    description:
      "Multiple structural-uncertainty signals indicate the fingerprint partially fits the deal. " +
      "Hybrid business model conditions accumulate — the engine recognizes its framework is " +
      "incomplete for this deal.",
    participating_rule_ids: [
      "rule.mismatch.inventory_in_service_model",
      "rule.mismatch.ebitda_operating_gap_thin",
      "rule.mismatch.fallback_fingerprint_used",
      "rule.margin.gross_margin_in_service_model",
      "rule.margin.contractor_gross_margin_outside_band",
    ],
    minimum_firings_required: 2,
    default_severity: "medium",
    why_it_matters:
      "When multiple operating-model mismatch signals co-fire, the deal is structurally hybrid " +
      "or otherwise outside the fingerprint's ontology. This is model_uncertainty made concrete: " +
      "the engine partially understands the business, the fingerprint's interaction rules apply " +
      "less reliably, and conclusions narrow to what can be defended without a full operating-model " +
      "match. This is institutional humility, not a weakness signal — it is a more trustworthy " +
      "engine output than forced confidence would be.",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `${participating.length} operating-model mismatch signals indicate partial fingerprint fit.`,
        why_it_matters: this.why_it_matters,
      });
    },
  },

  // ── 5. EVIDENCE INSUFFICIENCY CLUSTER ─────────────────────────────────────
  {
    id: "pattern.evidence.insufficiency_cluster",
    name: "Evidence insufficiency cluster",
    description:
      "Multiple evidence-quality concerns concentrate. The deal's underlying source base is " +
      "structurally weak across multiple inputs, not just one.",
    participating_rule_ids: [
      "rule.evidence.deal_source_weak",
      "rule.evidence.deal_source_undeclared",
      "rule.evidence.revenue_source_below_minimum",
      "rule.earnings_quality.sde_weakly_sourced",
      "rule.earnings_quality.addback_detail_missing",
      "rule.concentration.disclosure_missing",
    ],
    minimum_firings_required: 2,
    default_severity: "high",
    why_it_matters:
      "When evidence concerns concentrate across multiple inputs, the deal cannot be underwritten " +
      "with current data quality regardless of how favorable the headline metrics appear. The " +
      "highest-leverage action is source upgrade — converting the underlying evidence base from " +
      "seller-controlled to verified before further analysis. The engine is essentially saying: " +
      "'the metrics may be right, but we cannot defend conclusions drawn from them.'",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      // Require at least one core-deal evidence concern (not just supplemental)
      const hasCoreEvidence = participating.some(
        (f) => f.rule_id === "rule.evidence.deal_source_weak" ||
               f.rule_id === "rule.evidence.deal_source_undeclared" ||
               f.rule_id === "rule.evidence.revenue_source_below_minimum" ||
               f.rule_id === "rule.earnings_quality.sde_weakly_sourced",
      );
      if (!hasCoreEvidence) return null;

      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `${participating.length} evidence concerns concentrate; deal-level evidence base is weak.`,
        why_it_matters: this.why_it_matters,
      });
    },
  },

  // ── 6. TRANSITION FRAGILITY CLUSTER ───────────────────────────────────────
  {
    id: "pattern.transition.fragility_cluster",
    name: "Transition fragility cluster",
    description:
      "Customer concentration combined with key-person-dependent signals (high SDE margin in " +
      "service models, missing concentration disclosure, etc.) indicates fragile transition risk. " +
      "Deals where customer relationships and operational know-how sit with the seller carry " +
      "elevated transition_execution risk.",
    participating_rule_ids: [
      "rule.concentration.top_customer_dominant",
      "rule.concentration.disclosure_missing",
      "rule.margin.elevated_sde_with_sole_proprietor_signal",
      "rule.earnings_quality.elevated_sde_margin_in_band_model",
    ],
    minimum_firings_required: 2,
    default_severity: "high",
    why_it_matters:
      "Transition fragility is the combination of customer-relationship concentration and " +
      "operator-personal economics. When both signals co-fire, the buyer is effectively acquiring " +
      "a book of business that depends on the seller's continued involvement during transition. " +
      "The customer_retention and key_person_transferability assumptions become deal-defining, " +
      "and contract assignability, earn-out structure, and seller-transition incentives need to " +
      "be structured around this concentration.",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      // Require at least one concentration-related firing
      const hasConcentration = participating.some(
        (f) => f.rule_id === "rule.concentration.top_customer_dominant" ||
               f.rule_id === "rule.concentration.disclosure_missing",
      );
      if (!hasConcentration) return null;

      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `Customer concentration combined with ${participating.length - 1} additional transition-fragility signals.`,
        why_it_matters: this.why_it_matters,
      });
    },
  },

  // ── 7. REVENUE QUALITY + TRAJECTORY CLUSTER (bonus) ──────────────────────
  // The constitution treats revenue_quality as memory_pattern_relevant. This
  // pattern captures the combination of trajectory concerns with revenue-
  // quality concerns — historically the most predictive durability signal.
  {
    id: "pattern.revenue.quality_and_trajectory_cluster",
    name: "Revenue quality and trajectory cluster",
    description:
      "Revenue trajectory concerns (volatility, decline, rapid margin expansion) combine with " +
      "revenue-quality concerns. The pattern correlates strongly with post-close durability " +
      "compression historically.",
    participating_rule_ids: [
      "rule.trajectory.revenue_volatility_high",
      "rule.trajectory.margin_expansion_rapid",
      "rule.trajectory.revenue_decline_sustained",
      "rule.margin.elevated_sde_with_sole_proprietor_signal",
      "rule.earnings_quality.elevated_sde_margin_in_band_model",
      "rule.mismatch.inventory_in_service_model",
    ],
    minimum_firings_required: 2,
    default_severity: "high",
    why_it_matters:
      "Revenue trajectory irregularities combined with revenue-quality concerns are the classic " +
      "pre-cursor to durability compression. The pattern captures deals where the trailing " +
      "earnings story does not reflect a stable run-rate, regardless of the headline three-year " +
      "CAGR. This is exactly the kind of signal that becomes more valuable as the engine " +
      "accumulates outcome data — failure modes here are highly memory-pattern-relevant.",
    detect: function detect(firings) {
      const participating = selectParticipating(firings, this.participating_rule_ids);
      if (participating.length < this.minimum_firings_required) return null;

      // Require at least one trajectory-related firing
      const hasTrajectory = participating.some(
        (f) => f.rule_id.startsWith("rule.trajectory."),
      );
      if (!hasTrajectory) return null;

      return buildDetection({
        pattern: this,
        participating,
        what_triggered:
          `Revenue trajectory concerns combined with ${participating.length - 1} additional revenue-quality signals.`,
        why_it_matters: this.why_it_matters,
      });
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all patterns against an unordered firing set. Returns the list
 * of detections, never modifies the firing set.
 *
 * Pattern evaluation is post-rule-evaluation. Rules cannot read patterns;
 * patterns cannot influence rules.
 */
export function evaluateMismatchPatterns(
  firings: ReadonlyArray<RuleFiring>,
): ReadonlyArray<PatternDetection> {
  const detections: PatternDetection[] = [];
  for (const pattern of MISMATCH_PATTERN_CATALOGUE) {
    const detection = pattern.detect(firings);
    if (detection !== null) {
      detections.push(detection);
    }
  }
  return detections;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getMismatchPattern(pattern_id: MismatchPatternId): MismatchPattern | null {
  return MISMATCH_PATTERN_CATALOGUE.find((p) => p.id === pattern_id) ?? null;
}

export function patternsParticipatingRule(rule_id: RuleId): ReadonlyArray<MismatchPattern> {
  return MISMATCH_PATTERN_CATALOGUE.filter((p) =>
    p.participating_rule_ids.includes(rule_id),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface MismatchPatternCatalogueValidationResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly pattern_count: number;
  readonly version: string;
}

/**
 * Validate the pattern catalogue against:
 *   - unique pattern IDs
 *   - ID naming convention
 *   - minimum_firings_required >= 2 (single-firing detection should be a rule, not a pattern)
 *   - participating_rule_ids non-empty
 *   - participating_rule_ids reference real rules in the catalogue
 *   - why_it_matters has substantive content
 */
export function validateMismatchPatternCatalogue(args?: {
  known_rule_ids?: ReadonlyArray<string>;
}): MismatchPatternCatalogueValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];
  const knownRuleIds = args?.known_rule_ids ? new Set(args.known_rule_ids) : null;

  // Unique pattern IDs
  const seenIds = new Set<string>();
  for (const p of MISMATCH_PATTERN_CATALOGUE) {
    if (seenIds.has(p.id)) {
      issues.push({
        severity: "error",
        location: `pattern[${p.id}]`,
        message: `Duplicate pattern_id`,
      });
    }
    seenIds.add(p.id);
  }

  // ID naming convention
  for (const p of MISMATCH_PATTERN_CATALOGUE) {
    if (!/^pattern\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(p.id)) {
      issues.push({
        severity: "error",
        location: `pattern[${p.id}].id`,
        message: `Pattern ID must match pattern.{category}.{specific}`,
      });
    }
  }

  // minimum_firings_required must be at least 2
  for (const p of MISMATCH_PATTERN_CATALOGUE) {
    if (p.minimum_firings_required < 2) {
      issues.push({
        severity: "error",
        location: `pattern[${p.id}].minimum_firings_required`,
        message:
          `Pattern requires minimum_firings_required >= 2 — single-firing detections should be ` +
          `rules, not patterns. Got ${p.minimum_firings_required}.`,
      });
    }
  }

  // participating_rule_ids non-empty and stable-ID-formatted
  for (const p of MISMATCH_PATTERN_CATALOGUE) {
    if (p.participating_rule_ids.length === 0) {
      issues.push({
        severity: "error",
        location: `pattern[${p.id}].participating_rule_ids`,
        message: `participating_rule_ids must not be empty`,
      });
    }
    if (p.participating_rule_ids.length < p.minimum_firings_required) {
      issues.push({
        severity: "error",
        location: `pattern[${p.id}]`,
        message:
          `participating_rule_ids count (${p.participating_rule_ids.length}) is below ` +
          `minimum_firings_required (${p.minimum_firings_required}) — pattern can never detect.`,
      });
    }
    for (const rid of p.participating_rule_ids) {
      if (!/^rule\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(rid)) {
        issues.push({
          severity: "error",
          location: `pattern[${p.id}].participating_rule_ids`,
          message: `Invalid rule ID format: ${rid}`,
        });
      }
      // If known_rule_ids was provided, verify each participating rule exists
      if (knownRuleIds && !knownRuleIds.has(rid)) {
        issues.push({
          severity: "error",
          location: `pattern[${p.id}].participating_rule_ids`,
          message: `References unknown rule_id: ${rid}`,
        });
      }
    }
  }

  // why_it_matters has substantive content
  for (const p of MISMATCH_PATTERN_CATALOGUE) {
    if (!p.why_it_matters || p.why_it_matters.trim().length < 80) {
      issues.push({
        severity: "error",
        location: `pattern[${p.id}].why_it_matters`,
        message: "Pattern why_it_matters missing or too short (<80 chars)",
      });
    }
  }

  // Lender-profile leakage check
  const lenderTerms = ["sba", "conventional bank", "search fund", "independent sponsor", "pe-backed", "pe_backed"];
  for (const p of MISMATCH_PATTERN_CATALOGUE) {
    const haystack = (p.name + " " + p.description + " " + p.why_it_matters).toLowerCase();
    for (const term of lenderTerms) {
      if (haystack.includes(term)) {
        // "personalities" itself doesn't leak — only specific profile names
        // Allow phrasing about "lender personalities" generically since that's the abstraction layer
        if (term === "sba" && !haystack.includes(" sba ") && !haystack.includes("sba ")) continue;
        issues.push({
          severity: "error",
          location: `pattern[${p.id}]`,
          message: `Possible lender-profile leakage: contains "${term}"`,
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    pattern_count: MISMATCH_PATTERN_CATALOGUE.length,
    version: MISMATCH_PATTERN_CATALOGUE_VERSION,
  };
}

function assertMismatchPatternCatalogueValid(): void {
  const result = validateMismatchPatternCatalogue();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Mismatch pattern catalogue validation failed (${MISMATCH_PATTERN_CATALOGUE_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertMismatchPatternCatalogueValid();
