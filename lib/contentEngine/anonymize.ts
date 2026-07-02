// lib/contentEngine/anonymize.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — §2.2 anonymization (Stage 1).
//
// DOCTRINE (as corrected at Stage 1 approval): k-anonymity is NECESSARY BUT
// NOT SUFFICIENT. The k computed here runs over OUR eligible pool, which is
// only a proxy for the true re-identification universe (all public listings).
// Therefore k can only FORBID single-deal mode — it never unlocks anything.
// The real protections are:
//   1. SUPPRESSION — geography (state, city, zip) is suppressed in EVERY
//      mode. Identifier fields are not even representable past sanitization.
//   2. COMPOSITE MODE — anything unusual folds into an aggregate across ≥3
//      deals, framed as a pattern.
// All decisions fail closed: missing inputs → suppress.
//
// Transport-ignorant: no HTTP/browser/React context.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AnonymizationDecision,
  AnonymizedFact,
  KScreenResult,
  ModeDecisionResult,
  SanitizedDealFacts,
} from "./types";

// ── Thresholds ───────────────────────────────────────────────────────────────
// Screens FORBID; they never permit. Tightening any of these can only make
// the engine more conservative.

/** Below this many same-(industry, revenue_2sf) deals, single-deal mode is forbidden. */
export const MIN_K_SINGLE = 3;
/** Below this many same-industry deals in the pool, single-deal mode is forbidden. */
export const MIN_INDUSTRY_POOL = 5;
/** A composite draft must aggregate at least this many deals. */
export const MIN_COMPOSITE_POOL = 3;
/** Outlier screen percentile within the industry pool. */
export const OUTLIER_PERCENTILE = 0.95;

/**
 * Field classes suppressed in every mode. Documented for the audit payload;
 * enforcement is structural — sanitizeDealFacts never lets identifiers
 * through, and no emitter in this module outputs geography.
 */
export const ALWAYS_SUPPRESSED = [
  "geography (state, city, zip) — all modes",
  "source_url / source_listing_id / raw_data",
  "business name / free-text descriptors",
  "import_batch_id / exact created_at",
] as const;

export const DSCR_STANDARD_TERMS_QUALIFIER =
  "at standard SBA terms (80% financed / 10.5% / 10yr) — actual terms may differ";

// ── Sanitization ─────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Reduces a deal_runs row to the whitelisted numeric/categorical fields.
 * Identifiers (city, zip, source_url, source_listing_id, raw_data, batch id,
 * timestamps) are structurally absent from the output type. `state` survives
 * ONLY as a pool-screening input and is never emitted as a fact.
 */
export function sanitizeDealFacts(row: Record<string, unknown>): SanitizedDealFacts {
  return {
    deal_run_id: String(row.id ?? ""),
    industry: str(row.industry),
    state: str(row.state),
    revenue: num(row.revenue),
    sde: num(row.sde),
    reported_sde: num(row.reported_sde),
    usable_sde: num(row.usable_sde),
    asking_price: num(row.asking_price),
    fair_value: num(row.fair_value),
    monthly_payment: num(row.monthly_payment),
    dscr: num(row.dscr),
    valuation_multiple: num(row.valuation_multiple),
    employees: num(row.employees),
    years_in_business: num(row.years_in_business),
    confidence_score: str(row.confidence_score),
    normalization_trust_score: num(row.normalization_trust_score),
  };
}

// ── Rounding / banding transforms ────────────────────────────────────────────

/** Rounds to 2 significant figures. Returns null for non-positive input. */
export function round2sf(n: number | null): number | null {
  if (n === null || !isFinite(n) || n <= 0) return null;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / magnitude) * magnitude;
}

export function roundDscr(n: number | null): number | null {
  if (n === null || !isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function roundMultiple(n: number | null): number | null {
  if (n === null || !isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}

export function bandEmployees(n: number | null): string | null {
  if (n === null || !isFinite(n) || n <= 0) return null;
  if (n <= 5) return "1-5 employees";
  if (n <= 10) return "6-10 employees";
  if (n <= 25) return "11-25 employees";
  if (n <= 50) return "26-50 employees";
  return "50+ employees";
}

export function bandYears(n: number | null): string | null {
  if (n === null || !isFinite(n) || n <= 0) return null;
  if (n < 5) return "under 5 years old";
  if (n < 10) return "5-10 years old";
  if (n < 20) return "10-20 years old";
  return "20+ years old";
}

/** "$1.2M" / "$750K" / "$900" display for an already-rounded value. */
export function displayMoney(rounded: number | null): string | null {
  if (rounded === null || !isFinite(rounded) || rounded <= 0) return null;
  if (rounded >= 1_000_000) {
    const m = rounded / 1_000_000;
    return `$${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (rounded >= 1_000) {
    const k = rounded / 1_000;
    return `$${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${rounded}`;
}

// ── Pool screening ───────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export function median(values: number[]): number | null {
  const v = values.filter((n) => isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Computes the forbidding screens for one deal against the eligible pool.
 * Any input that cannot be computed yields null (which decideDraftMode
 * treats as a failure — fail closed).
 */
export function computeKScreen(
  deal: SanitizedDealFacts,
  pool: SanitizedDealFacts[],
): KScreenResult {
  if (!deal.industry || deal.revenue === null) {
    return { national_k: null, industry_pool: null, is_outlier: null };
  }

  const industryPool = pool.filter((d) => d.industry === deal.industry);
  const dealRev2sf = round2sf(deal.revenue);
  const nationalK = industryPool.filter(
    (d) => d.revenue !== null && round2sf(d.revenue) === dealRev2sf,
  ).length;

  // Outlier screen: only computable with a big enough industry pool.
  let isOutlier: boolean | null = null;
  if (industryPool.length >= MIN_INDUSTRY_POOL) {
    isOutlier = false;
    for (const col of ["revenue", "sde", "asking_price"] as const) {
      const dealVal = deal[col];
      if (dealVal === null) continue;
      const values = industryPool
        .map((d) => d[col])
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);
      const p95 = percentile(values, OUTLIER_PERCENTILE);
      if (p95 !== null && dealVal > p95) isOutlier = true;
    }
  }

  return { national_k: nationalK, industry_pool: industryPool.length, is_outlier: isOutlier };
}

/**
 * Decides what mode (if any) may use this deal. FAIL CLOSED:
 *   - unscreenable → suppress
 *   - thin industry pool → composite if possible, else suppress
 *   - low k or outlier → composite if possible, else suppress
 *   - all screens pass → single_deal PERMITTED (with geography still
 *     suppressed; passing screens never adds disclosure)
 */
export function decideDraftMode(
  deal: SanitizedDealFacts,
  pool: SanitizedDealFacts[],
): ModeDecisionResult {
  const screen = computeKScreen(deal, pool);
  const reasons: string[] = [];

  const industryPool = screen.industry_pool ?? 0;
  const compositePossible = industryPool >= MIN_COMPOSITE_POOL;
  const fallback = (why: string): ModeDecisionResult => {
    reasons.push(why);
    if (compositePossible) {
      reasons.push(`industry pool ${industryPool} >= ${MIN_COMPOSITE_POOL} — composite permitted`);
      return { decision: "composite", screen, reasons };
    }
    reasons.push(`industry pool ${industryPool} < ${MIN_COMPOSITE_POOL} — suppressed entirely`);
    return { decision: "suppress", screen, reasons };
  };

  if (screen.national_k === null || screen.industry_pool === null) {
    return fallback("screen not computable (missing industry or revenue) — fail closed");
  }
  if (screen.industry_pool < MIN_INDUSTRY_POOL) {
    return fallback(`industry pool ${screen.industry_pool} < ${MIN_INDUSTRY_POOL}`);
  }
  if (screen.is_outlier === null) {
    return fallback("outlier screen not computable — fail closed");
  }
  if (screen.is_outlier) {
    return fallback(`deal exceeds p${OUTLIER_PERCENTILE * 100} of its industry pool`);
  }
  if (screen.national_k < MIN_K_SINGLE) {
    return fallback(`national k ${screen.national_k} < ${MIN_K_SINGLE} on (industry, revenue_2sf)`);
  }

  reasons.push(
    "all forbidding screens passed — single-deal permitted (geography remains suppressed; " +
      "k is necessary, not sufficient)",
  );
  return { decision: "single_deal", screen, reasons };
}

// ── Fact emission ────────────────────────────────────────────────────────────

function pushMoney(
  facts: AnonymizedFact[],
  key: string,
  raw: number | null,
  qualifier: string | null = null,
): void {
  const rounded = round2sf(raw);
  const display = displayMoney(rounded);
  if (rounded === null || display === null) return;
  facts.push({ key, value: rounded, display, qualifier, transform: "round_2sf" });
}

/**
 * Emits the display-ready facts for a single-deal draft. Geography is never
 * emitted. At most ONE of employees/years appears (years preferred) — never
 * both, to keep the quasi-identifier surface minimal.
 */
export function anonymizeSingleDeal(deal: SanitizedDealFacts): AnonymizedFact[] {
  const facts: AnonymizedFact[] = [];

  if (deal.industry) {
    facts.push({ key: "industry", value: deal.industry, display: deal.industry, qualifier: null, transform: "verbatim_category" });
  }
  pushMoney(facts, "revenue", deal.revenue);
  pushMoney(facts, "reported_sde", deal.reported_sde);
  pushMoney(facts, "usable_sde", deal.usable_sde);
  if (deal.reported_sde === null && deal.usable_sde === null) pushMoney(facts, "sde", deal.sde);
  pushMoney(facts, "asking_price", deal.asking_price);
  pushMoney(facts, "fair_value", deal.fair_value);
  pushMoney(facts, "monthly_payment", deal.monthly_payment);

  const dscr = roundDscr(deal.dscr);
  if (dscr !== null) {
    facts.push({
      key: "dscr",
      value: dscr,
      display: `${dscr.toFixed(2)}x`,
      qualifier: DSCR_STANDARD_TERMS_QUALIFIER,
      transform: "round_2dp",
    });
  }

  const multiple = roundMultiple(deal.valuation_multiple);
  if (multiple !== null) {
    facts.push({ key: "valuation_multiple", value: multiple, display: `${multiple.toFixed(1)}x`, qualifier: null, transform: "round_1dp" });
  }

  // Age XOR headcount — never both.
  const years = bandYears(deal.years_in_business);
  const emp = bandEmployees(deal.employees);
  if (years !== null) {
    facts.push({ key: "years_in_business", value: years, display: years, qualifier: null, transform: "band" });
  } else if (emp !== null) {
    facts.push({ key: "employees", value: emp, display: emp, qualifier: null, transform: "band" });
  }

  return facts;
}

const COMPOSITE_QUALIFIER =
  "aggregate across multiple scored deals — a pattern, not a specific business";

/**
 * Emits aggregate facts for a composite draft over >= MIN_COMPOSITE_POOL
 * deals. Medians only, rounded like single-deal figures. Industry appears
 * only when uniform across the pool. No geography, ever. Returns null when
 * the pool is too small (fail closed — caller must not draft).
 */
export function anonymizeComposite(deals: SanitizedDealFacts[]): AnonymizedFact[] | null {
  if (!Array.isArray(deals) || deals.length < MIN_COMPOSITE_POOL) return null;
  const facts: AnonymizedFact[] = [];

  facts.push({
    key: "deal_count",
    value: deals.length,
    display: `${deals.length} deals`,
    qualifier: COMPOSITE_QUALIFIER,
    transform: "count",
  });

  const industries = new Set(deals.map((d) => d.industry).filter(Boolean));
  if (industries.size === 1) {
    const industry = [...industries][0] as string;
    facts.push({ key: "industry", value: industry, display: industry, qualifier: null, transform: "verbatim_category" });
  }

  const aggregate = (key: string, col: keyof SanitizedDealFacts) => {
    const values = deals.map((d) => d[col]).filter((v): v is number => typeof v === "number");
    if (values.length < MIN_COMPOSITE_POOL) return;
    const med = median(values);
    const rounded = round2sf(med);
    const display = displayMoney(rounded);
    if (rounded === null || display === null) return;
    facts.push({ key: `median_${key}`, value: rounded, display, qualifier: COMPOSITE_QUALIFIER, transform: "median_round_2sf" });
  };
  aggregate("revenue", "revenue");
  aggregate("usable_sde", "usable_sde");
  aggregate("asking_price", "asking_price");

  const dscrValues = deals.map((d) => d.dscr).filter((v): v is number => typeof v === "number");
  if (dscrValues.length >= MIN_COMPOSITE_POOL) {
    const med = roundDscr(median(dscrValues));
    if (med !== null) {
      facts.push({
        key: "median_dscr",
        value: med,
        display: `${med.toFixed(2)}x`,
        qualifier: `${COMPOSITE_QUALIFIER}; ${DSCR_STANDARD_TERMS_QUALIFIER}`,
        transform: "median_round_2dp",
      });
    }
  }

  return facts;
}

/** Audit payload for content_drafts.anonymization. */
export function buildAnonymizationDecision(
  mode: ModeDecisionResult,
  sourceDealCount: number,
): AnonymizationDecision {
  return {
    mode: mode.decision,
    screen: mode.screen,
    reasons: mode.reasons,
    suppressed: [...ALWAYS_SUPPRESSED],
    source_deal_count: sourceDealCount,
  };
}
