// lib/intelligence/operations/__boundary__/banned-field-patterns.ts
// ─────────────────────────────────────────────────────────────────────────────
// CP-10 Constitutional Boundary — Banned Field Name Patterns
//
// Belt-and-suspenders enforcement for Invariants #4 (No Aggregate
// Scores) and #5 Check 1 (No Probability Fields).
//
// PRIMARY DEFENSE: The PERMITTED_NUMERIC_FIELDS and PERMITTED_STRING_FIELDS
// allowlists. Any field not on those lists fails the boundary check.
//
// SECONDARY DEFENSE: This file. When a banned-pattern match fires, the
// error message names the constitutional category that was violated.
// Without this, the developer just sees "field not on allowlist" — they
// don't see WHY it was rejected.
//
// Banned-pattern matching runs BEFORE allowlist check. If a banned
// pattern matches, the error explicitly identifies the violated
// invariant.
// ─────────────────────────────────────────────────────────────────────────────

import { isPermittedNumericField } from "./permitted-numeric-fields";
import { isPermittedStringField } from "./permitted-string-fields";

/**
 * Banned numeric field name patterns. Any number field whose name
 * matches a pattern below fails with a CONSTITUTIONAL category
 * identifier in the error.
 *
 * Patterns are case-insensitive regular expressions.
 */
export const BANNED_NUMERIC_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly violated_invariant:
    | "no_probability_fields"
    | "no_aggregate_scores";
  readonly explanation: string;
}> = [
  // ── Probability surfaces (Invariant #5 Check 1) ──
  {
    pattern: /probability/i,
    violated_invariant: "no_probability_fields",
    explanation:
      "Field names containing 'probability' are constitutionally prohibited in CP-10. Probability surfaces belong to CP-11.",
  },
  {
    pattern: /likelihood/i,
    violated_invariant: "no_probability_fields",
    explanation:
      "Field names containing 'likelihood' are constitutionally prohibited in CP-10.",
  },
  {
    pattern: /confidence/i,
    violated_invariant: "no_probability_fields",
    explanation:
      "Field names containing 'confidence' suggest probability semantics; prohibited in CP-10.",
  },
  {
    pattern: /\bodds\b/i,
    violated_invariant: "no_probability_fields",
    explanation:
      "Field names containing 'odds' are probability semantics; prohibited.",
  },
  {
    pattern: /^chance_|_chance$|_chance_/i,
    violated_invariant: "no_probability_fields",
    explanation: "Field names containing 'chance' are probability semantics.",
  },
  {
    pattern: /certainty/i,
    violated_invariant: "no_probability_fields",
    explanation: "Certainty is a probability concept; prohibited.",
  },
  {
    pattern: /^expected_/i,
    violated_invariant: "no_probability_fields",
    explanation:
      "Field names beginning 'expected_' imply forecasting/probability; prohibited.",
  },
  {
    pattern: /^predicted_|_predicted_|_predicted$/i,
    violated_invariant: "no_probability_fields",
    explanation: "Predictions are CP-11 territory; prohibited in CP-10.",
  },
  {
    pattern: /^forecast_|_forecast_|_forecast$/i,
    violated_invariant: "no_probability_fields",
    explanation: "Forecasting is prohibited in CP-10.",
  },
  {
    pattern: /propensity/i,
    violated_invariant: "no_probability_fields",
    explanation: "Propensity is probability semantics; prohibited.",
  },
  {
    pattern: /percentile/i,
    violated_invariant: "no_probability_fields",
    explanation:
      "Percentiles imply cross-deal benchmarks; prohibited in CP-10.",
  },

  // ── Aggregate operational scores (Invariant #4) ──
  {
    pattern: /^overall_/i,
    violated_invariant: "no_aggregate_scores",
    explanation:
      "Field names beginning 'overall_' suggest blended aggregates; prohibited.",
  },
  {
    pattern: /^aggregate_/i,
    violated_invariant: "no_aggregate_scores",
    explanation: "Aggregate scores are prohibited in CP-10.",
  },
  {
    pattern: /^blended_/i,
    violated_invariant: "no_aggregate_scores",
    explanation: "Blended scores are prohibited in CP-10.",
  },
  {
    pattern: /^composite_/i,
    violated_invariant: "no_aggregate_scores",
    explanation: "Composite scores are prohibited in CP-10.",
  },
  {
    pattern: /^weighted_/i,
    violated_invariant: "no_aggregate_scores",
    explanation:
      "Weighted scores imply hidden weights; prohibited in CP-10. Use named multi-factor classifications instead.",
  },
  {
    pattern: /health_score|health_index/i,
    violated_invariant: "no_aggregate_scores",
    explanation:
      "Health scores are aggregate operational scores; explicitly prohibited.",
  },
  {
    pattern: /quality_score|quality_index/i,
    violated_invariant: "no_aggregate_scores",
    explanation: "Quality scores are aggregate; prohibited.",
  },
  {
    pattern: /operational_risk/i,
    violated_invariant: "no_aggregate_scores",
    explanation: "Operational risk indices are aggregates; prohibited.",
  },
  {
    pattern: /readiness_score|readiness_index/i,
    violated_invariant: "no_aggregate_scores",
    explanation:
      "Readiness score is aggregate; use categorical classification (decision_ready / evidence_insufficient / etc.) instead.",
  },
  {
    pattern: /deal_score|deal_quality|deal_health/i,
    violated_invariant: "no_aggregate_scores",
    explanation: "Deal-level aggregate scores are explicitly prohibited.",
  },
  {
    pattern: /recovery_progress_percentage|completion_percentage|complete_pct/i,
    violated_invariant: "no_aggregate_scores",
    explanation:
      "Recovery progress as a single percentage is an aggregate; use counts (satisfied_count / total_count) instead.",
  },
];

/**
 * Banned string field name patterns. These catch prose-generating
 * field names that the allowlist would already reject — but with a
 * clearer error message.
 */
export const BANNED_STRING_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly violated_invariant: "no_prose_artifacts";
  readonly explanation: string;
}> = [
  {
    pattern: /^narrative$|_narrative$|^narrative_/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Narrative fields produce prose; prohibited in CP-10. Use enum-classified status instead.",
  },
  {
    pattern: /^summary$|_summary$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Summary fields imply prose generation; prohibited in CP-10. Use structured counts/classifications.",
  },
  {
    pattern: /^headline$|_headline$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Headlines are buyer-facing prose; prohibited in CP-10. Belongs to presentation layer.",
  },
  {
    pattern: /^explanation$|_explanation$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Explanation fields produce prose; prohibited in CP-10. Use structured trace_to_supporting_evidence instead.",
  },
  {
    pattern: /^prose$|_prose$|_prose_/i,
    violated_invariant: "no_prose_artifacts",
    explanation: "Prose fields are explicitly prohibited in CP-10.",
  },
  {
    pattern: /^message$|^body$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Message/body fields suggest prose content; prohibited in CP-10.",
  },
  {
    pattern: /^content$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Content field implies free-form text; prohibited in CP-10.",
  },
  {
    pattern: /^sentence$|^paragraph$|_sentence$|_paragraph$/i,
    violated_invariant: "no_prose_artifacts",
    explanation: "Sentence/paragraph fields are prose; prohibited.",
  },
  {
    pattern: /human_readable/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "human_readable implies presentation prose; prohibited in CP-10. Presentation is a separate layer.",
  },
  {
    pattern: /^copy$|_copy$/i,
    violated_invariant: "no_prose_artifacts",
    explanation: "'Copy' is marketing/UI prose; prohibited in CP-10.",
  },
  {
    pattern: /^recommendation$|_recommendation$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "Recommendations as prose are prohibited. CP-10 ranks items by structured impact; recommendation language belongs to a future presentation layer.",
  },
  {
    pattern: /^next_action$|^suggested_action$|^advice$/i,
    violated_invariant: "no_prose_artifacts",
    explanation:
      "'Next action' and 'advice' are autonomous recommendation language; prohibited in CP-10.",
  },
];

/**
 * Result of checking a single field name.
 */
export interface FieldCheckResult {
  readonly ok: boolean;
  readonly violated_invariant?:
    | "no_probability_fields"
    | "no_aggregate_scores"
    | "no_prose_artifacts"
    | "not_on_allowlist";
  readonly explanation?: string;
}

/**
 * Check a numeric field name. Returns ok=true if permitted, ok=false
 * with violation details otherwise.
 *
 * Banned-pattern matching runs BEFORE allowlist check so the error
 * message identifies the specific constitutional category. If no
 * banned pattern matches but the field is not on the allowlist, the
 * error indicates "not_on_allowlist" — meaning the developer needs to
 * either rename the field or extend the allowlist (with governance
 * review).
 */
export function checkNumericFieldName(fieldName: string): FieldCheckResult {
  for (const ban of BANNED_NUMERIC_PATTERNS) {
    if (ban.pattern.test(fieldName)) {
      return {
        ok: false,
        violated_invariant: ban.violated_invariant,
        explanation: ban.explanation,
      };
    }
  }
  if (!isPermittedNumericField(fieldName)) {
    return {
      ok: false,
      violated_invariant: "not_on_allowlist",
      explanation: `Numeric field '${fieldName}' is not on PERMITTED_NUMERIC_FIELDS allowlist. Either rename to an existing permitted field or extend the allowlist with governance review.`,
    };
  }
  return { ok: true };
}

/**
 * Check a string field name. Same semantics as checkNumericFieldName.
 */
export function checkStringFieldName(fieldName: string): FieldCheckResult {
  for (const ban of BANNED_STRING_PATTERNS) {
    if (ban.pattern.test(fieldName)) {
      return {
        ok: false,
        violated_invariant: ban.violated_invariant,
        explanation: ban.explanation,
      };
    }
  }
  if (!isPermittedStringField(fieldName)) {
    return {
      ok: false,
      violated_invariant: "not_on_allowlist",
      explanation: `String field '${fieldName}' is not on PERMITTED_STRING_FIELDS allowlist. Either rename to an existing permitted field or extend the allowlist with governance review.`,
    };
  }
  return { ok: true };
}

/**
 * Banned-pattern allowlist version.
 */
export const BANNED_FIELD_PATTERNS_VERSION =
  "cp10-banned-fields-v0.1.0";
