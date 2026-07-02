// lib/contentEngine/eligibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — §2.1 eligibility predicate (Stage 1).
//
// A deal may fuel a draft ONLY if it came through the public-marketplace
// ingest path (app/api/bulk-import/route.ts), which is the sole writer that
// sets tool_used='marketplace_import' + data_source_type='marketplace_supply'
// (always together, never separately) and never sets user_id/pending_email.
//
// FAIL-CLOSED GUARANTEE: this is a conjunction of positive matches evaluated
// row-by-row in pure code. A missing column, NULL, 'user_submitted', an
// unknown tool_used, or a future writer that forgets provenance all FAIL the
// match. There is no heuristic fallback and no override that widens
// eligibility. If the predicate cannot be evaluated, the deal is ineligible.
//
// Transport-ignorant: no HTTP/browser/React context. Callable from CLI/cron.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EligibilityCheck,
  EligibilityResult,
  EligibilitySnapshot,
  TopicTrigger,
} from "./types";

export const PREDICATE_VERSION = "2026-07-02.2";

/**
 * Platform owner. Verified against production 2026-07-02: 1,115 of 1,327
 * marketplace rows carry this user_id (dashboard backfill); the remaining
 * 212 have user_id NULL (current bulk-import behavior). Marketplace rows
 * with any OTHER user_id do not exist and would be ineligible.
 */
export const OWNER_USER_ID = "fd51b1c2-d682-4278-8b58-6abad29a2a07";

/**
 * Columns a caller MUST select for evaluateEligibility to run. Absence of
 * any of these keys on the row object is itself an eligibility failure
 * (we cannot confirm what we cannot see).
 */
export const ELIGIBILITY_COLUMNS = [
  "id",
  "tool_used",
  "data_source_type",
  "source_platform",
  "user_id",
  "pending_email",
  "is_valid",
] as const;

/** Extra columns candidate queries should select for triggers + anonymization. */
export const CANDIDATE_COLUMNS = [
  ...ELIGIBILITY_COLUMNS,
  "industry",
  "state",
  "revenue",
  "sde",
  "reported_sde",
  "usable_sde",
  "asking_price",
  "fair_value",
  "monthly_payment",
  "dscr",
  "valuation_multiple",
  "employees",
  "years_in_business",
  "confidence_score",
  "normalization_trust_score",
  "normalization_flags_json",
] as const;

// ── The predicate ────────────────────────────────────────────────────────────

type Check = {
  check: string;
  run: (row: Record<string, unknown>) => string | null; // null = pass
};

const CHECKS: Check[] = [
  {
    check: "tool_used_is_marketplace_import",
    run: (r) =>
      r.tool_used === "marketplace_import"
        ? null
        : `tool_used is ${JSON.stringify(r.tool_used)}, not 'marketplace_import'`,
  },
  {
    check: "data_source_type_is_marketplace_supply",
    run: (r) =>
      r.data_source_type === "marketplace_supply"
        ? null
        : `data_source_type is ${JSON.stringify(r.data_source_type)}, not 'marketplace_supply'`,
  },
  {
    check: "source_platform_present",
    run: (r) =>
      typeof r.source_platform === "string" && r.source_platform.trim().length > 0
        ? null
        : `source_platform is ${JSON.stringify(r.source_platform)}, expected non-empty string`,
  },
  {
    // Amended at Stage 2 (verified distribution 2026-07-02): marketplace rows
    // are either unowned (NULL) or dashboard-backfilled with the OWNER's id.
    // Any other user_id means a client/prospect touched the row → ineligible.
    check: "user_id_null_or_owner",
    run: (r) =>
      r.user_id === null || r.user_id === OWNER_USER_ID
        ? null
        : `user_id is ${JSON.stringify(r.user_id)}, expected null or owner`,
  },
  {
    check: "pending_email_is_null",
    run: (r) =>
      r.pending_email === null ? null : `pending_email is present, expected null`,
  },
  {
    check: "is_valid_true",
    run: (r) => (r.is_valid === true ? null : `is_valid is ${JSON.stringify(r.is_valid)}, expected true`),
  },
];

/**
 * Pure, fail-closed eligibility evaluation. The row must be a plain object
 * containing every ELIGIBILITY_COLUMNS key; anything else is ineligible.
 */
export function evaluateEligibility(row: unknown): EligibilityResult {
  const checks: EligibilityCheck[] = [];
  const reasons: string[] = [];

  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return {
      eligible: false,
      checks: [{ check: "row_is_object", passed: false, reason: "row is not a plain object" }],
      reasons: ["row is not a plain object"],
    };
  }
  const r = row as Record<string, unknown>;

  // Column presence — fail closed on anything we cannot see.
  for (const col of ELIGIBILITY_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(r, col)) {
      const reason = `column_missing:${col} — caller must select it`;
      checks.push({ check: `column_present:${col}`, passed: false, reason });
      reasons.push(reason);
    }
  }
  if (reasons.length > 0) return { eligible: false, checks, reasons };

  for (const c of CHECKS) {
    const reason = c.run(r);
    checks.push({ check: c.check, passed: reason === null, reason });
    if (reason !== null) reasons.push(reason);
  }

  return { eligible: reasons.length === 0, checks, reasons };
}

/**
 * Applies the predicate's conditions to a Supabase query builder so the DB
 * narrows the candidate set. This is an OPTIMIZATION ONLY — every returned
 * row must still pass evaluateEligibility() row-by-row (defense in depth;
 * the pure function is the authority, the query is not).
 */
export function applyEligibilityFilters<
  Q extends {
    eq: (col: string, val: unknown) => Q;
    is: (col: string, val: null) => Q;
    not: (col: string, op: string, val: null) => Q;
    or: (filters: string) => Q;
  },
>(query: Q): Q {
  return query
    .eq("tool_used", "marketplace_import")
    .eq("data_source_type", "marketplace_supply")
    .not("source_platform", "is", null)
    .or(`user_id.is.null,user_id.eq.${OWNER_USER_ID}`)
    .is("pending_email", null)
    .eq("is_valid", true);
}

/** Audit payload for content_drafts.eligibility_snapshot. */
export function buildEligibilitySnapshot(
  rows: Array<{ id: string } & Record<string, unknown>>,
): EligibilitySnapshot {
  return {
    predicate_version: PREDICATE_VERSION,
    evaluated_at: new Date().toISOString(),
    deals: rows.map((row) => ({
      deal_run_id: String(row.id),
      result: evaluateEligibility(row),
    })),
  };
}

// ── Topic triggers (corpus §6, restricted to fields marketplace rows carry) ──
//
// Marketplace-imported rows do NOT carry customer_concentration,
// owner_operated, revenue_trend, or working-capital/earnout fields (Stage 0
// audit §1.4), so those corpus topics are composite/editorial-only and have
// no per-deal trigger here. There is also no explicit owner-comp flag in the
// normalization engine; the phantom-SDE trigger keys on the inflated-SDE
// flag codes, which is what the engine actually computes.

const INFLATED_SDE_FLAG_CODES = new Set([
  "SDE_MARGIN_ABOVE_INDUSTRY_CEILING",
  "SDE_MARGIN_ABOVE_INDUSTRY_NORM",
  "SDE_MARGIN_2X_ABOVE_BENCHMARK",
  "SDE_MARGIN_ABOVE_BENCHMARK",
  "SDE_MARGIN_IMPLAUSIBLE",
]);

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

/**
 * Returns which draft topics this deal's COMPUTED fields can honestly fuel.
 * A deal with no triggers is not draft fuel (it can still count toward
 * composite pools). Only ever additive on present fields — never inferred.
 */
export function detectTopicTriggers(row: Record<string, unknown>): TopicTrigger[] {
  const triggers: TopicTrigger[] = [];

  const dscr = num(row.dscr);
  const monthlyPayment = num(row.monthly_payment);
  const reportedSde = num(row.reported_sde);
  const usableSde = num(row.usable_sde);

  // SBA structure / DSCR at asking — corpus TOP tier.
  if (dscr !== null && dscr > 0 && monthlyPayment !== null && monthlyPayment > 0) {
    triggers.push({ topic_key: "sba_dscr", tier: "top", triggered_by: ["dscr", "monthly_payment"] });
  }

  // Add-backs / SDE pressure-test — normalization haircut actually occurred.
  if (
    reportedSde !== null && usableSde !== null &&
    reportedSde > 0 && usableSde > 0 && usableSde < reportedSde
  ) {
    triggers.push({
      topic_key: "addbacks_sde_pressure",
      tier: "high",
      triggered_by: ["reported_sde", "usable_sde"],
    });
  }

  // Phantom SDE — inflated-SDE normalization flags present.
  const flags = row.normalization_flags_json;
  if (Array.isArray(flags)) {
    const hit = flags
      .map((f) => (f && typeof f === "object" ? (f as Record<string, unknown>).code : null))
      .filter((code): code is string => typeof code === "string" && INFLATED_SDE_FLAG_CODES.has(code));
    if (hit.length > 0) {
      triggers.push({ topic_key: "phantom_sde", tier: "high", triggered_by: hit });
    }
  }

  // Pre-LOI DSCR haircut scenarios — derivable when both inputs exist.
  if (usableSde !== null && usableSde > 0 && monthlyPayment !== null && monthlyPayment > 0) {
    triggers.push({
      topic_key: "preloi_haircut",
      tier: "high",
      triggered_by: ["usable_sde", "monthly_payment"],
    });
  }

  return triggers;
}
