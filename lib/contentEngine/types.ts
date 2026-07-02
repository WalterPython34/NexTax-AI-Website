// lib/contentEngine/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — shared types (Stage 1).
//
// Doctrine (see docs/reddit-content-engine-stage0-plan.md, as amended at
// Stage 1 approval):
//   - Eligibility fails CLOSED: anything not positively marketplace-marked
//     is ineligible.
//   - k-anonymity is NECESSARY BUT NOT SUFFICIENT. It can only FORBID
//     single-deal mode; it never unlocks anything. The real protection is
//     aggressive suppression (no geography in any mode) plus composite mode.
//   - Every number a draft may contain traces to a fact-sheet entry with
//     explicit provenance. The LLM never does arithmetic.
//
// This module must stay transport-ignorant: no HTTP, browser, or React
// context anywhere in lib/contentEngine (API-Contract Principle 1).
// ─────────────────────────────────────────────────────────────────────────────

// ── Eligibility ──────────────────────────────────────────────────────────────

/** One predicate check, recorded whether it passed or failed. */
export interface EligibilityCheck {
  check: string;
  passed: boolean;
  reason: string | null; // populated when failed
}

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheck[];
  /** All failure reasons, empty when eligible. */
  reasons: string[];
}

/** Per-draft audit payload persisted to content_drafts.eligibility_snapshot. */
export interface EligibilitySnapshot {
  predicate_version: string;
  evaluated_at: string; // ISO timestamp
  deals: Array<{ deal_run_id: string; result: EligibilityResult }>;
}

// ── Topic triggers (corpus §6, restricted to fields marketplace rows carry) ──

export type TopicTier = "top" | "high";

export interface TopicTrigger {
  topic_key: string;
  tier: TopicTier;
  /** Which computed fields fired this trigger (audit trail). */
  triggered_by: string[];
}

// ── Anonymization ────────────────────────────────────────────────────────────

/**
 * The ONLY deal fields anonymization may see. Identifier fields (city, zip,
 * source_url, source_listing_id, raw_data, import_batch_id, business names,
 * exact created_at) are not representable here — sanitizeDealFacts strips
 * everything not on this shape. `state` is retained SOLELY as an input to
 * pool screening and is never emitted in any output fact.
 */
export interface SanitizedDealFacts {
  deal_run_id: string;
  industry: string | null;
  state: string | null; // screening input only — never emitted
  revenue: number | null;
  sde: number | null;
  reported_sde: number | null;
  usable_sde: number | null;
  asking_price: number | null;
  fair_value: number | null;
  monthly_payment: number | null;
  dscr: number | null;
  valuation_multiple: number | null;
  employees: number | null;
  years_in_business: number | null;
  confidence_score: string | null;
  normalization_trust_score: number | null;
}

export type DraftMode = "single_deal" | "composite";

/** Outcome of the mode decision. `suppress` = deal may not fuel any draft. */
export type ModeDecision = DraftMode | "suppress";

export interface KScreenResult {
  /** Pool rows sharing (industry, revenue rounded to 2sf) with the deal. */
  national_k: number | null;
  /** Eligible pool rows in the deal's industry. */
  industry_pool: number | null;
  /** True when the deal exceeds the p95 of its industry pool on any of
   *  revenue / sde / asking_price. Null = could not be computed (fail closed). */
  is_outlier: boolean | null;
}

export interface ModeDecisionResult {
  decision: ModeDecision;
  screen: KScreenResult;
  /** Human-readable audit reasons for the decision. */
  reasons: string[];
}

/** One anonymized, display-ready fact. */
export interface AnonymizedFact {
  key: string;
  /** The rounded/banded value (number for figures, string for bands). */
  value: number | string;
  /** Exactly what may appear in prose, e.g. "$1.2M", "1.44x". */
  display: string;
  /** Mandatory caveat that must accompany the fact in prose, if any. */
  qualifier: string | null;
  transform: string; // e.g. "round_2sf", "band", "round_2dp"
}

/** Audit payload persisted to content_drafts.anonymization. */
export interface AnonymizationDecision {
  mode: ModeDecision;
  screen: KScreenResult;
  reasons: string[];
  suppressed: string[]; // field classes suppressed (always includes geography)
  source_deal_count: number;
}

// ── Fact sheet ───────────────────────────────────────────────────────────────

export type FactProvenance =
  | {
      kind: "deal_field";
      deal_run_id: string;
      column: string;
      raw_value: number | string;
      transform: string;
    }
  | {
      kind: "derived";
      formula: string;
      inputs: Record<string, number>;
      /** deal_run_ids the inputs came from. */
      deal_run_ids: string[];
    }
  | {
      kind: "composite_aggregate";
      statistic: string; // e.g. "median", "count", "range"
      column: string;
      deal_run_ids: string[];
      transform: string;
    }
  | {
      kind: "corpus_constant";
      label: string;
    };

export interface FactSheetEntry {
  key: string;
  /** Exactly what may appear in prose. */
  display: string;
  /** Numeric value backing the display (null for purely categorical facts). */
  value: number | null;
  qualifier: string | null;
  provenance: FactProvenance;
}

/** Persisted to content_drafts.fact_sheet. */
export interface FactSheet {
  built_at: string; // ISO timestamp
  mode: DraftMode;
  entries: FactSheetEntry[];
}
