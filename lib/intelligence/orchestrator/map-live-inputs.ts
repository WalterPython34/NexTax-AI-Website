// lib/intelligence/orchestrator/map-live-inputs.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow — Live Input Adapter (Phase 0, Shadow Mode)
//
// Maps the /api/record-deal POST body into the CP pipeline's RuleEngineInputs
// shape, so the orchestrator can run CP-2→CP-9 on real production deal inputs.
//
// This is the boundary where the two engines meet. It is a PURE FUNCTION:
// same body → same RuleEngineInputs. No IO, no engine calls.
//
// ── THREE LOCKED DECISIONS (do not change without Steve's sign-off) ──
//
//   1. DSCR: CP derives its OWN dscr from raw debt terms. We do NOT pass the
//      live engine's computed dscr. Shadow mode observes divergence; passing
//      the conclusion would make the snapshot echo computeModalScore instead
//      of computing independently. So we map purchase_price + total_debt and
//      let CP-3/CP-4 compute coverage themselves. We deliberately OMIT the
//      `dscr` input key.
//
//   2. Category 3 fields (prior-year trajectory, addbacks, balance-sheet
//      ratios) are OMITTED ENTIRELY. The live modal does not collect them.
//      We NEVER set a key to undefined — absent means the key is absent.
//      (Same discipline the CP-4 canonical-hash fix enforces on the output
//      side: undefined-valued keys break determinism. We hold the line on
//      the input side too.)
//
//   3. ebitda_margin_pct is derived from the RMA BENCHMARK margin (passed in
//      via resolved_benchmark_margin_pct), NOT from the deal's own reported
//      margin. The benchmark margin reflects RMA industry data — the more
//      defensible basis. If no benchmark margin is available, we omit the
//      key entirely (do NOT fall back to sde/revenue, which would inject the
//      deal's potentially-inflated own margin).
//
// ── WHAT THIS CONSUMES ──
//   Category 1 (raw inputs): industry, revenue, sde, asking_price,
//     top_customer_pct
//   Category 2 (debt terms, for CP to derive coverage): debt_percent,
//     interest_rate, term_years (+ asking_price for total_debt)
//
// ── WHAT THIS IGNORES (live engine conclusions — never fed to CP) ──
//   valuation_multiple, dscr, fair_value, overall_score, risk_level,
//   valuation_score, debt_score, market_score, industry_score, red_flags,
//   green_flags, evidence_profile, and the normalization outputs
//   (reported_sde, usable_sde, normalization_trust_score, benchmark_*).
//   These are what we COMPARE AGAINST, not what we compute FROM.
// ─────────────────────────────────────────────────────────────────────────────

import type { RuleEngineInputs } from "../rules/types";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SHAPE — the relevant subset of the /api/record-deal POST body
//
// Fields are typed loosely (string | number | null | undefined) because the
// body is JSON from the client and locale-formatted numerics arrive as
// strings. The adapter normalizes defensively.
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordDealBody {
  // Category 1 — raw inputs
  readonly industry?: string | null;
  readonly revenue?: number | string | null;
  readonly sde?: number | string | null;
  readonly asking_price?: number | string | null;
  readonly top_customer_pct?: number | string | null;

  // Category 2 — debt terms (for CP to derive its own coverage)
  readonly debt_percent?: number | string | null;
  readonly interest_rate?: number | string | null;
  readonly term_years?: number | string | null;

  // Source metadata (optional; informs CP-3 source-type rules if present)
  readonly benchmark_source?: string | null;
  readonly deal_source_type?: string | null;

  // Everything else in the body (live engine conclusions, normalization
  // outputs) is intentionally ignored. Index signature acknowledges they
  // exist without consuming them.
  readonly [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUXILIARY INPUTS
//
// The RMA benchmark margin used during live scoring. Per decision #3 this is
// the basis for ebitda_margin_pct. The caller (the shadow-write attachment)
// passes it from the same /api/benchmarks lookup the live scoring used.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdapterAuxInputs {
  /**
   * The RMA/DealStats benchmark EBITDA margin (as a percentage, e.g. 18.5)
   * resolved for this industry during live scoring. Used to derive
   * ebitda_margin_pct. If absent/null, ebitda_margin_pct is omitted.
   */
  readonly resolved_benchmark_margin_pct?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCALE NUMBER PARSING
//
// Live inputs arrive as locale-formatted strings ("1,500,000") OR as numbers.
// Returns a finite number, or null if unparseable/absent. Null means "omit
// the key" downstream — never produce an undefined-valued key.
// ─────────────────────────────────────────────────────────────────────────────

export function parseLocaleNumber(
  value: number | string | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  // Strip everything except digits, minus, and decimal point.
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a /api/record-deal body + aux inputs into CP RuleEngineInputs.
 *
 * Pure. Builds the output by conditionally including keys: a value that
 * parses to null is OMITTED, never set to undefined. This guarantees the
 * resulting object has no undefined-valued keys, satisfying the same
 * canonical-hash discipline the CP-4 fix enforces downstream.
 *
 * Decision #1: omits `dscr` — CP derives coverage from purchase_price +
 *   total_debt itself.
 * Decision #2: Category 3 fields are simply never added.
 * Decision #3: ebitda_margin_pct derives from the benchmark margin only.
 */
export function mapRecordDealBodyToRuleInputs(
  body: RecordDealBody,
  aux: AdapterAuxInputs = {},
): RuleEngineInputs {
  // Start with a mutable plain object; we add keys only when we have values.
  const out: Record<string, unknown> = {};

  // ── Category 1: raw inputs (direct maps) ──
  const industry = typeof body.industry === "string" ? body.industry.trim() : "";
  if (industry.length > 0) out.industry_key = industry;

  const revenue = parseLocaleNumber(body.revenue);
  if (revenue != null) out.revenue = revenue;

  const sde = parseLocaleNumber(body.sde);
  if (sde != null) out.sde = sde;

  const askingPrice = parseLocaleNumber(body.asking_price);
  if (askingPrice != null) out.purchase_price = askingPrice;

  const topCustomerPct = parseLocaleNumber(body.top_customer_pct);
  if (topCustomerPct != null) out.top_customer_pct = topCustomerPct;

  // ── Category 2: debt terms → let CP derive its own coverage ──
  // total_debt = asking_price × (debt_percent / 100). Requires both.
  const debtPercent = parseLocaleNumber(body.debt_percent);
  if (askingPrice != null && debtPercent != null) {
    const totalDebt = askingPrice * (debtPercent / 100);
    if (Number.isFinite(totalDebt)) out.total_debt = totalDebt;
  }
  // NOTE: we do NOT map dscr (decision #1) — CP computes it.
  // interest_rate and term_years are not RuleEngineInputs fields; CP-3/CP-4
  // derive coverage from total_debt + earnings against their own assumptions.
  // They remain available in raw_input_payload for audit but are not CP inputs.

  // ── Margins ──
  // sde_margin_pct: derived from the deal's own sde/revenue. This is the
  // deal's actual margin (acceptable — it's a direct ratio of given inputs,
  // not a conclusion). Omitted if either input is missing or revenue is 0.
  if (sde != null && revenue != null && revenue !== 0) {
    out.sde_margin_pct = (sde / revenue) * 100;
  }

  // ebitda_margin_pct: decision #3 — derive from the RMA BENCHMARK margin,
  // NOT the deal's own. Omitted entirely if no benchmark margin available.
  const benchMargin = aux.resolved_benchmark_margin_pct;
  if (benchMargin != null && Number.isFinite(benchMargin)) {
    out.ebitda_margin_pct = benchMargin;
  }

  // ── Source metadata (optional) ──
  // CP-3 reads deal_source_type for source-aware rules. Prefer an explicit
  // deal_source_type; fall back to benchmark_source as a coarse signal only
  // if it's a recognized source-type-like string. Omitted otherwise.
  const sourceType =
    typeof body.deal_source_type === "string" && body.deal_source_type.length > 0
      ? body.deal_source_type
      : null;
  if (sourceType != null) out.deal_source_type = sourceType;

  // ── Category 3 fields — DELIBERATELY OMITTED ──
  // revenue_prior_year, revenue_prior_prior_year, sde_prior_year,
  // sde_prior_prior_year, ebitda_margin_prior_year, addback_total,
  // addback_concentration_top_line_pct, current_ratio, quick_ratio, ar_days,
  // inventory_turnover, debt_to_worth, int_coverage, etc.
  // The live modal does not collect these. We never set them — not even to
  // undefined. CP runs on the partial inputs it gets (by design).

  return out as RuleEngineInputs;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION HELPER
//
// The orchestrator needs at minimum an industry_key to resolve a fingerprint
// and revenue/sde to compute anything meaningful. This helper lets the
// shadow-write attachment decide whether it's even worth firing the pipeline
// (skip silently if the deal is too sparse — shadow mode is best-effort).
// ─────────────────────────────────────────────────────────────────────────────

export function hasMinimumInputsForShadow(inputs: RuleEngineInputs): boolean {
  return (
    typeof inputs.industry_key === "string" &&
    inputs.industry_key.length > 0 &&
    typeof inputs.revenue === "number" &&
    typeof inputs.sde === "number"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0.5a — BENCHMARK ENRICHMENT (raw/computed operational metrics only)
//
// Overlays operational context from a `benchmark_snapshots` row onto the base
// (record-deal-derived) RuleEngineInputs. ADDITIVE and CONSTITUTIONALLY CLEAN:
//
//   - Reads ONLY raw/computed columns: `computed_ratios` and `financial_inputs`.
//   - NEVER reads `analysis_outputs` or `benchmark_results` (those hold the
//     legacy engine's CONCLUSIONS — financial_score, tension_indicator,
//     risk_flags, percentiles, normalized_sde — which are firewalled from CP
//     per the constitution and the two-systems reference doc).
//   - record-deal remains CANONICAL for deal identity (industry, revenue, sde,
//     purchase_price, debt terms). Benchmark enriches ONLY operational context
//     (liquidity, efficiency, margin detail, working-capital metrics).
//   - CP still derives its OWN dscr from raw debt terms — we do NOT map the
//     benchmark engine's dscr conclusion (locked decision #1).
//   - Omits absent values entirely (never undefined-valued keys), preserving
//     the CP-9 canonical-hash discipline.
//
// Best-effort: if the row is missing or malformed, the base inputs pass through
// unchanged (sparse fallback).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The subset of a `benchmark_snapshots` row this bridge is permitted to read.
 * Deliberately omits `analysis_outputs` and `benchmark_results` — reading them
 * is structurally impossible here, which is how the firewall is enforced.
 */
export interface BenchmarkSnapshotRawFields {
  readonly snapshot_id?: string | null;
  readonly computed_ratios?: Record<string, number | null> | null;
  readonly financial_inputs?: Record<string, unknown> | null;
}

/**
 * Overlay benchmark operational context onto base CP inputs.
 *
 * @param base       The record-deal-derived RuleEngineInputs (canonical identity).
 * @param benchmark  The raw/computed fields from the latest benchmark_snapshots row.
 * @returns A new RuleEngineInputs with operational enrichment overlaid. Pure.
 */
export function mergeBenchmarkEnrichment(
  base: RuleEngineInputs,
  benchmark: BenchmarkSnapshotRawFields | null | undefined,
): RuleEngineInputs {
  if (!benchmark) return base;

  const cr = benchmark.computed_ratios ?? {};
  const fi = benchmark.financial_inputs ?? {};

  // Start from a shallow copy of the canonical base.
  const out: Record<string, unknown> = { ...base };

  // ── Operational ratios from computed_ratios (benchmark wins for these) ──
  // Each only overlaid when present and finite. record-deal identity fields
  // (industry_key, revenue, sde, purchase_price, total_debt) are NOT touched
  // here — they remain whatever the base provided.
  overlayNumber(out, "gross_margin_pct", cr.gross_margin_pct);
  overlayNumber(out, "operating_margin_pct", cr.operating_margin_pct);
  overlayNumber(out, "sde_margin_pct", cr.sde_margin_pct);
  overlayNumber(out, "current_ratio", cr.current_ratio);
  overlayNumber(out, "inventory_turnover", cr.inventory_turnover);

  // NOTE: cr.dscr is deliberately NOT overlaid — CP derives its own DSCR from
  // raw debt terms (locked decision #1). The benchmark engine's dscr is a
  // conclusion we want CP to diverge from, not inherit.
  // NOTE: cr.days_inventory_outstanding has no direct RuleEngineInputs field;
  // it is intentionally not mapped.

  // ── Derived operational primitive: ar_days ──
  // ar_days = (accounts_receivable / revenue) * 365.
  // Deterministic, transparent, purely mathematical from raw balance-sheet
  // inputs — NOT a benchmark conclusion. Uses the benchmark row's raw revenue
  // and AR (the figures the ratio was computed against). Omitted if either is
  // missing or revenue is non-positive.
  const arRaw = toFiniteNumber(fi.accounts_receivable);
  const revForAr = toFiniteNumber(fi.revenue) ?? toFiniteNumber(base.revenue);
  if (arRaw != null && revForAr != null && revForAr > 0) {
    out.ar_days = (arRaw / revForAr) * 365;
  }

  // ── Raw balance-sheet / earnings inputs CP can consume directly ──
  // total_debt: record-deal derives this from debt_percent already; only fill
  // if the base lacks it (gap-fill, not overwrite of canonical debt terms).
  if (out.total_debt == null) {
    overlayNumber(out, "total_debt", toFiniteNumber(fi.total_debt));
  }

  return out as RuleEngineInputs;
}

/** Overlay a key with a value only if it is a finite number. Never sets undefined. */
function overlayNumber(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const n = toFiniteNumber(value);
  if (n != null) target[key] = n;
}

/** Coerce to a finite number, or null. */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKFILL ADAPTER — reconstruct base CP inputs from a stored deal_runs row
//
// The backfill path processes existing deals that were saved before the shadow
// write existed (or before benchmark enrichment was possible). It has no
// original POST body — instead it reads the deal_runs COLUMNS, which are what
// that body originally contained. Same locked decisions as the body adapter:
//   - CP derives its own DSCR (we map total_debt, not dscr)
//   - Category 3 fields omitted
//   - ebitda_margin_pct omitted (no benchmark margin here; enrichment adds margins)
//   - no undefined-valued keys
// ─────────────────────────────────────────────────────────────────────────────

/** The deal_runs columns the backfill reads. Loosely typed (DB row). */
export interface DealRunRow {
  readonly id?: string;
  readonly industry?: string | null;
  readonly revenue?: number | string | null;
  readonly sde?: number | string | null;
  readonly asking_price?: number | string | null;
  readonly debt_percent?: number | string | null;
  readonly interest_rate?: number | string | null;
  readonly term_years?: number | string | null;
  readonly customer_concentration?: number | string | null;
  readonly user_id?: string | null;
  readonly [key: string]: unknown;
}

/**
 * Reconstruct base RuleEngineInputs from a deal_runs row (backfill path).
 * Mirrors mapRecordDealBodyToRuleInputs but reads stored columns.
 */
export function mapDealRunRowToRuleInputs(row: DealRunRow): RuleEngineInputs {
  const out: Record<string, unknown> = {};

  const industry =
    typeof row.industry === "string" ? row.industry.trim() : "";
  if (industry.length > 0) out.industry_key = industry;

  const revenue = parseLocaleNumber(row.revenue);
  if (revenue != null) out.revenue = revenue;

  const sde = parseLocaleNumber(row.sde);
  if (sde != null) out.sde = sde;

  const askingPrice = parseLocaleNumber(row.asking_price);
  if (askingPrice != null) out.purchase_price = askingPrice;

  // customer_concentration on deal_runs maps to top_customer_pct.
  const concentration = parseLocaleNumber(row.customer_concentration);
  if (concentration != null) out.top_customer_pct = concentration;

  // total_debt = asking_price × debt_percent/100 (CP derives its own DSCR).
  const debtPercent = parseLocaleNumber(row.debt_percent);
  if (askingPrice != null && debtPercent != null) {
    const totalDebt = askingPrice * (debtPercent / 100);
    if (Number.isFinite(totalDebt)) out.total_debt = totalDebt;
  }

  // sde_margin_pct from the deal's own figures (direct ratio).
  if (sde != null && revenue != null && revenue !== 0) {
    out.sde_margin_pct = (sde / revenue) * 100;
  }

  return out as RuleEngineInputs;
}
