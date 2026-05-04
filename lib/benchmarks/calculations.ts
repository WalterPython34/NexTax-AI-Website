// lib/benchmarks/calculations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure financial math. No I/O, no side effects, no React.
//
// Every ratio returns RatioResult — never a fabricated number. If a required
// input is missing or zero (where division would NaN), we return
// { ok: false, value: null, reason: "..." } so the UI can show "—" or
// "insufficient data" instead of a misleading 0 or Infinity.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  BenchmarkInputs,
  CalculatedRatios,
  RatioResult,// lib/benchmarks/calculations.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure financial math. No I/O, no side effects, no React.
//
// Every ratio returns RatioResult — never a fabricated number. If a required
// input is missing or zero (where division would NaN), we return
// { ok: false, value: null, reason: "..." } so the UI can show "—" or
// "insufficient data" instead of a misleading 0 or Infinity.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  BenchmarkInputs,
  CalculatedRatios,
  RatioResult,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** True for finite numbers > 0. Catches null, undefined, NaN, Infinity, 0, negatives. */
function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** True for finite numbers >= 0. Use when 0 is a legitimate input (e.g. inventory for a service biz). */
function isNonNegative(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

const ok = (value: number): RatioResult => ({ ok: true, value });
const fail = (reason: string): RatioResult => ({ ok: false, value: null, reason });

// ── Income statement ratios ──────────────────────────────────────────────────

/**
 * Gross Margin = (Revenue - COGS) / Revenue
 * Returned as a percentage value (e.g. 35.2 means 35.2%, not 0.352).
 */
export function grossMarginPct(inputs: Pick<BenchmarkInputs, 'revenue' | 'cogs'>): RatioResult {
  if (!isPositive(inputs.revenue)) return fail('revenue is missing or zero');
  if (!isNonNegative(inputs.cogs)) return fail('COGS not provided');
  const margin = ((inputs.revenue - inputs.cogs) / inputs.revenue) * 100;
  return ok(margin);
}

/**
 * SDE Margin = SDE / Revenue
 * Percentage (e.g. 18.5 = 18.5%).
 */
export function sdeMarginPct(inputs: Pick<BenchmarkInputs, 'revenue' | 'sde'>): RatioResult {
  if (!isPositive(inputs.revenue)) return fail('revenue is missing or zero');
  if (typeof inputs.sde !== 'number' || !Number.isFinite(inputs.sde)) {
    return fail('SDE not provided');
  }
  return ok((inputs.sde / inputs.revenue) * 100);
}

/**
 * Operating Margin = (Revenue - COGS - Operating Expenses) / Revenue.
 * Percentage. Lower than SDE margin because it doesn't include owner add-backs.
 * This is the "lender view" of recurring profitability.
 */
export function operatingMarginPct(inputs: Pick<BenchmarkInputs, 'revenue' | 'cogs' | 'operating_expenses'>): RatioResult {
  if (!isPositive(inputs.revenue)) return fail('revenue is missing or zero');
  if (!isNonNegative(inputs.cogs)) return fail('COGS not provided');
  if (!isNonNegative(inputs.operating_expenses)) return fail('Operating expenses not provided');
  const operatingProfit = inputs.revenue - inputs.cogs - inputs.operating_expenses;
  return ok((operatingProfit / inputs.revenue) * 100);
}

// ── Liquidity ────────────────────────────────────────────────────────────────

/**
 * Current Assets = Cash + AR + Inventory.
 * Returns null if any component is missing — we don't fabricate.
 */
export function currentAssets(inputs: Pick<BenchmarkInputs, 'cash' | 'accounts_receivable' | 'inventory'>): number | null {
  const c = inputs.cash;
  const ar = inputs.accounts_receivable;
  const inv = inputs.inventory;
  if (!isNonNegative(c) || !isNonNegative(ar) || !isNonNegative(inv)) return null;
  return c + ar + inv;
}

/**
 * Current Liabilities = AP + (Total Debt × current portion).
 * For SMB acquisition diligence, the current portion of LTD is approximated as
 * one year of debt service principal. Without that detail, we use AP only and
 * note this as a limitation in the spec.
 */
export function currentLiabilities(inputs: Pick<BenchmarkInputs, 'accounts_payable'>): number | null {
  const ap = inputs.accounts_payable;
  if (!isNonNegative(ap)) return null;
  return ap;
}

/**
 * Current Ratio = Current Assets / Current Liabilities.
 */
export function currentRatio(inputs: BenchmarkInputs): RatioResult {
  const ca = currentAssets(inputs);
  const cl = currentLiabilities(inputs);
  if (ca === null) return fail('working capital data incomplete (need cash, AR, inventory)');
  if (cl === null) return fail('accounts payable not provided');
  if (cl === 0) return fail('current liabilities are zero — ratio undefined');
  return ok(ca / cl);
}

// ── Debt service ─────────────────────────────────────────────────────────────

/**
 * Annual debt service via standard PMT formula:
 *   PMT = P × [r(1+r)^n] / [(1+r)^n − 1]
 * Where r is the periodic (monthly) rate and n is total periods. Multiplied by
 * 12 to get annual debt service.
 *
 * Edge cases:
 *   - rate = 0 → PMT = principal / total_payments × 12 (interest-free loan)
 *   - any input missing → null
 */
export function annualDebtService(inputs: Pick<BenchmarkInputs, 'total_debt' | 'interest_rate_pct' | 'loan_term_years'>): RatioResult {
  const principal = inputs.total_debt;
  const ratePct   = inputs.interest_rate_pct;
  const termYrs   = inputs.loan_term_years;

  if (!isPositive(principal)) return fail('total debt missing');
  if (ratePct === null || ratePct === undefined || !Number.isFinite(ratePct) || ratePct < 0) {
    return fail('interest rate missing');
  }
  if (!isPositive(termYrs)) return fail('loan term missing');

  const monthlyRate = (ratePct / 100) / 12;
  const totalMonths = termYrs * 12;

  if (monthlyRate === 0) {
    return ok((principal / totalMonths) * 12);
  }

  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPmt = (principal * monthlyRate * factor) / (factor - 1);
  return ok(monthlyPmt * 12);
}

/**
 * DSCR = SDE / Annual Debt Service.
 * Higher is better; lender-typical floor is 1.25-1.30x.
 */
export function dscr(inputs: BenchmarkInputs): RatioResult {
  const sde = inputs.sde;
  if (typeof sde !== 'number' || !Number.isFinite(sde)) return fail('SDE not provided');
  const ads = annualDebtService(inputs);
  if (!ads.ok) return fail(`DSCR requires debt terms — ${ads.reason}`);
  if (ads.value === 0) return fail('annual debt service is zero — DSCR undefined');
  return ok(sde / ads.value);
}

// ── Operations ───────────────────────────────────────────────────────────────

/**
 * Inventory Turnover = COGS / Inventory.
 * For a service business with no inventory, we return insufficient data
 * rather than a misleading "infinite turnover."
 */
export function inventoryTurnover(inputs: Pick<BenchmarkInputs, 'cogs' | 'inventory'>): RatioResult {
  if (!isPositive(inputs.cogs)) return fail('COGS not provided');
  if (inputs.inventory === null || inputs.inventory === undefined) {
    return fail('inventory not provided');
  }
  if (!Number.isFinite(inputs.inventory) || inputs.inventory <= 0) {
    return fail('inventory is zero or negative — likely a service business');
  }
  return ok(inputs.cogs / inputs.inventory);
}

/**
 * Days Inventory Outstanding = 365 / Inventory Turnover.
 * Lower is better for most operating businesses.
 */
export function daysInventoryOutstanding(inputs: Pick<BenchmarkInputs, 'cogs' | 'inventory'>): RatioResult {
  const turn = inventoryTurnover(inputs);
  if (!turn.ok) return fail(`DIO requires inventory turnover — ${turn.reason}`);
  if (turn.value === 0) return fail('inventory turnover is zero — DIO undefined');
  return ok(365 / turn.value);
}

// ── Leverage / Solvency ──────────────────────────────────────────────────────

/**
 * Solvency Ratio = Total Assets / Total Liabilities.
 *
 * Limitation: we don't have full balance sheet from the seller in V1. We
 * approximate "total assets" with current assets only and "total liabilities"
 * with AP + total debt. This is a *partial* solvency picture and the UI
 * should label it as such, OR we could omit and return insufficient data.
 *
 * For V1 we return null + reason — better to show "—" than mislead.
 * The UI can hide this row entirely until V2 captures full BS data.
 */
export function solvencyRatio(_inputs: BenchmarkInputs): RatioResult {
  // Intentionally not calculated in V1. Full balance sheet needed.
  return fail('full balance sheet required (fixed assets, intangibles, LTD)');
}

/**
 * Debt-to-Equity = Debt / Equity.
 *
 * Per the build spec: in V1 we do NOT calculate this for the OPERATING
 * benchmark table because we don't have historical business equity. The
 * Deal Structure & Leverage card uses Debt-to-SDE instead, which is
 * structurally appropriate for acquisition financing analysis.
 *
 * Returns insufficient data here so the UI can hide the row cleanly.
 */
export function debtToEquity(_inputs: BenchmarkInputs): RatioResult {
  return fail('historical equity not available pre-acquisition (use Deal Structure card for buyer leverage)');
}

// ── Top-level: calculate everything in one call ──────────────────────────────

/**
 * Run the full ratio set against a deal's inputs. Each result independently
 * carries ok/fail status so the UI can render rows row-by-row, showing "—"
 * for ratios it can't compute.
 */
export function calculateAllRatios(inputs: BenchmarkInputs): CalculatedRatios {
  return {
    gross_margin_pct:           grossMarginPct(inputs),
    sde_margin_pct:             sdeMarginPct(inputs),
    operating_margin_pct:       operatingMarginPct(inputs),
    current_ratio:              currentRatio(inputs),
    dscr:                       dscr(inputs),
    inventory_turnover:         inventoryTurnover(inputs),
    days_inventory_outstanding: daysInventoryOutstanding(inputs),
    solvency_ratio:             solvencyRatio(inputs),
    debt_to_equity:             debtToEquity(inputs),
    annual_debt_service:        annualDebtService(inputs),
  };
}
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** True for finite numbers > 0. Catches null, undefined, NaN, Infinity, 0, negatives. */
function isPositive(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/** True for finite numbers >= 0. Use when 0 is a legitimate input (e.g. inventory for a service biz). */
function isNonNegative(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

const ok = (value: number): RatioResult => ({ ok: true, value });
const fail = (reason: string): RatioResult => ({ ok: false, value: null, reason });

// ── Income statement ratios ──────────────────────────────────────────────────

/**
 * Gross Margin = (Revenue - COGS) / Revenue
 * Returned as a percentage value (e.g. 35.2 means 35.2%, not 0.352).
 */
export function grossMarginPct(inputs: Pick<BenchmarkInputs, 'revenue' | 'cogs'>): RatioResult {
  if (!isPositive(inputs.revenue)) return fail('revenue is missing or zero');
  if (!isNonNegative(inputs.cogs)) return fail('COGS not provided');
  const margin = ((inputs.revenue - inputs.cogs) / inputs.revenue) * 100;
  return ok(margin);
}

/**
 * SDE Margin = SDE / Revenue
 * Percentage (e.g. 18.5 = 18.5%).
 */
export function sdeMarginPct(inputs: Pick<BenchmarkInputs, 'revenue' | 'sde'>): RatioResult {
  if (!isPositive(inputs.revenue)) return fail('revenue is missing or zero');
  if (typeof inputs.sde !== 'number' || !Number.isFinite(inputs.sde)) {
    return fail('SDE not provided');
  }
  return ok((inputs.sde / inputs.revenue) * 100);
}

// ── Liquidity ────────────────────────────────────────────────────────────────

/**
 * Current Assets = Cash + AR + Inventory.
 * Returns null if any component is missing — we don't fabricate.
 */
export function currentAssets(inputs: Pick<BenchmarkInputs, 'cash' | 'accounts_receivable' | 'inventory'>): number | null {
  const c = inputs.cash;
  const ar = inputs.accounts_receivable;
  const inv = inputs.inventory;
  if (!isNonNegative(c) || !isNonNegative(ar) || !isNonNegative(inv)) return null;
  return c + ar + inv;
}

/**
 * Current Liabilities = AP + (Total Debt × current portion).
 * For SMB acquisition diligence, the current portion of LTD is approximated as
 * one year of debt service principal. Without that detail, we use AP only and
 * note this as a limitation in the spec.
 */
export function currentLiabilities(inputs: Pick<BenchmarkInputs, 'accounts_payable'>): number | null {
  const ap = inputs.accounts_payable;
  if (!isNonNegative(ap)) return null;
  return ap;
}

/**
 * Current Ratio = Current Assets / Current Liabilities.
 */
export function currentRatio(inputs: BenchmarkInputs): RatioResult {
  const ca = currentAssets(inputs);
  const cl = currentLiabilities(inputs);
  if (ca === null) return fail('working capital data incomplete (need cash, AR, inventory)');
  if (cl === null) return fail('accounts payable not provided');
  if (cl === 0) return fail('current liabilities are zero — ratio undefined');
  return ok(ca / cl);
}

// ── Debt service ─────────────────────────────────────────────────────────────

/**
 * Annual debt service via standard PMT formula:
 *   PMT = P × [r(1+r)^n] / [(1+r)^n − 1]
 * Where r is the periodic (monthly) rate and n is total periods. Multiplied by
 * 12 to get annual debt service.
 *
 * Edge cases:
 *   - rate = 0 → PMT = principal / total_payments × 12 (interest-free loan)
 *   - any input missing → null
 */
export function annualDebtService(inputs: Pick<BenchmarkInputs, 'total_debt' | 'interest_rate_pct' | 'loan_term_years'>): RatioResult {
  const principal = inputs.total_debt;
  const ratePct   = inputs.interest_rate_pct;
  const termYrs   = inputs.loan_term_years;

  if (!isPositive(principal)) return fail('total debt missing');
  if (ratePct === null || ratePct === undefined || !Number.isFinite(ratePct) || ratePct < 0) {
    return fail('interest rate missing');
  }
  if (!isPositive(termYrs)) return fail('loan term missing');

  const monthlyRate = (ratePct / 100) / 12;
  const totalMonths = termYrs * 12;

  if (monthlyRate === 0) {
    return ok((principal / totalMonths) * 12);
  }

  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPmt = (principal * monthlyRate * factor) / (factor - 1);
  return ok(monthlyPmt * 12);
}

/**
 * DSCR = SDE / Annual Debt Service.
 * Higher is better; lender-typical floor is 1.25-1.30x.
 */
export function dscr(inputs: BenchmarkInputs): RatioResult {
  const sde = inputs.sde;
  if (typeof sde !== 'number' || !Number.isFinite(sde)) return fail('SDE not provided');
  const ads = annualDebtService(inputs);
  if (!ads.ok) return fail(`DSCR requires debt terms — ${ads.reason}`);
  if (ads.value === 0) return fail('annual debt service is zero — DSCR undefined');
  return ok(sde / ads.value);
}

// ── Operations ───────────────────────────────────────────────────────────────

/**
 * Inventory Turnover = COGS / Inventory.
 * For a service business with no inventory, we return insufficient data
 * rather than a misleading "infinite turnover."
 */
export function inventoryTurnover(inputs: Pick<BenchmarkInputs, 'cogs' | 'inventory'>): RatioResult {
  if (!isPositive(inputs.cogs)) return fail('COGS not provided');
  if (inputs.inventory === null || inputs.inventory === undefined) {
    return fail('inventory not provided');
  }
  if (!Number.isFinite(inputs.inventory) || inputs.inventory <= 0) {
    return fail('inventory is zero or negative — likely a service business');
  }
  return ok(inputs.cogs / inputs.inventory);
}

/**
 * Days Inventory Outstanding = 365 / Inventory Turnover.
 * Lower is better for most operating businesses.
 */
export function daysInventoryOutstanding(inputs: Pick<BenchmarkInputs, 'cogs' | 'inventory'>): RatioResult {
  const turn = inventoryTurnover(inputs);
  if (!turn.ok) return fail(`DIO requires inventory turnover — ${turn.reason}`);
  if (turn.value === 0) return fail('inventory turnover is zero — DIO undefined');
  return ok(365 / turn.value);
}

// ── Leverage / Solvency ──────────────────────────────────────────────────────

/**
 * Solvency Ratio = Total Assets / Total Liabilities.
 *
 * Limitation: we don't have full balance sheet from the seller in V1. We
 * approximate "total assets" with current assets only and "total liabilities"
 * with AP + total debt. This is a *partial* solvency picture and the UI
 * should label it as such, OR we could omit and return insufficient data.
 *
 * For V1 we return null + reason — better to show "—" than mislead.
 * The UI can hide this row entirely until V2 captures full BS data.
 */
export function solvencyRatio(_inputs: BenchmarkInputs): RatioResult {
  // Intentionally not calculated in V1. Full balance sheet needed.
  return fail('full balance sheet required (fixed assets, intangibles, LTD)');
}

/**
 * Debt-to-Equity = Debt / Equity.
 *
 * Per the build spec: in V1 we do NOT calculate this for the OPERATING
 * benchmark table because we don't have historical business equity. The
 * Deal Structure & Leverage card uses Debt-to-SDE instead, which is
 * structurally appropriate for acquisition financing analysis.
 *
 * Returns insufficient data here so the UI can hide the row cleanly.
 */
export function debtToEquity(_inputs: BenchmarkInputs): RatioResult {
  return fail('historical equity not available pre-acquisition (use Deal Structure card for buyer leverage)');
}

// ── Top-level: calculate everything in one call ──────────────────────────────

/**
 * Run the full ratio set against a deal's inputs. Each result independently
 * carries ok/fail status so the UI can render rows row-by-row, showing "—"
 * for ratios it can't compute.
 */
export function calculateAllRatios(inputs: BenchmarkInputs): CalculatedRatios {
  return {
    gross_margin_pct:           grossMarginPct(inputs),
    sde_margin_pct:             sdeMarginPct(inputs),
    current_ratio:              currentRatio(inputs),
    dscr:                       dscr(inputs),
    inventory_turnover:         inventoryTurnover(inputs),
    days_inventory_outstanding: daysInventoryOutstanding(inputs),
    solvency_ratio:             solvencyRatio(inputs),
    debt_to_equity:             debtToEquity(inputs),
    annual_debt_service:        annualDebtService(inputs),
  };
}
