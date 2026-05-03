// lib/benchmarks/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the Financial Benchmarks module.
//
// Two distinct domains modeled here:
//   1. RMA OPERATING BENCHMARKS — compares the deal's *operating* ratios
//      (margins, liquidity, efficiency) against industry distributions from
//      RMA Annual Statement Studies. Quartile-based percentile math.
//
//   2. DEAL STRUCTURE & LEVERAGE — evaluates the *proposed acquisition
//      structure* (purchase price, debt stack, equity contribution). These
//      metrics are NOT compared to RMA — they're rule-based lender thresholds
//      because RMA Debt/Worth measures historical business equity, not buyer
//      equity, and conflating the two destroys credibility.
// ─────────────────────────────────────────────────────────────────────────────

// ── Inputs ───────────────────────────────────────────────────────────────────

/**
 * What the user enters in the Financial Benchmarks tab. Most of this is
 * auto-populated from a saved deal; the post-NDA fields (working capital,
 * debt structure) are added by the user once they have the seller's books.
 */
export interface BenchmarkInputs {
  // Identity (auto-populated from saved deal)
  industry:        string;   // IndustryKey from your existing system
  naics_code?:     string;   // resolved from industry, used for RMA lookup

  // Income statement (auto-populated where possible)
  revenue:             number;
  cogs:                number | null;
  operating_expenses:  number | null;
  sde:                 number;   // or EBITDA — toggle in UI

  // Working capital (post-NDA)
  cash:                 number | null;
  accounts_receivable:  number | null;
  inventory:            number | null;
  accounts_payable:     number | null;

  // Debt structure (used for OPERATING DSCR — see also DealStructureInputs
  // for acquisition-structure DSCR which lives in its own card)
  total_debt:        number | null;
  interest_rate_pct: number | null;   // e.g. 10.5 for 10.5%
  loan_term_years:   number | null;   // e.g. 10

  // V1.1 optional
  capex?:        number;
  rent?:         number;
  owner_salary?: number;
}

/**
 * Acquisition structure inputs for the Deal Structure & Leverage card.
 * Completely separate from BenchmarkInputs because these are about the
 * proposed deal, not the underlying business.
 */
export interface DealStructureInputs {
  purchase_price:           number;
  buyer_equity:             number;
  senior_debt:              number;
  seller_note:              number;
  working_capital_needed:   number;
  sde:                      number;
  annual_debt_service:      number;   // computed PMT or user-provided
}

// ── RMA Benchmark data shape (matches Supabase rma_benchmarks rows) ─────────

export type Quartile = 'q1' | 'median' | 'q3';

export interface RmaBenchmarkRow {
  naics_code:      string;
  industry_name:   string;
  year:            string;
  metric_name:     string;
  metric_quartile: Quartile;
  metric_value:    number;
}

/**
 * Convenience shape: all three quartiles for one metric, looked up at runtime.
 */
export interface QuartileTriple {
  q1:     number | null;
  median: number | null;
  q3:     number | null;
}

// ── Calculated ratios (output of calculations.ts) ────────────────────────────

/**
 * Discriminated by ok flag. When ok=false, value is null and reason explains
 * why — e.g. "missing inventory data" or "revenue is zero". Never returns a
 * fabricated number.
 */
export type RatioResult =
  | { ok: true;  value: number; }
  | { ok: false; value: null;   reason: string };

export interface CalculatedRatios {
  gross_margin_pct:           RatioResult;
  sde_margin_pct:             RatioResult;
  current_ratio:              RatioResult;
  dscr:                       RatioResult;
  inventory_turnover:         RatioResult;
  days_inventory_outstanding: RatioResult;
  solvency_ratio:             RatioResult;
  debt_to_equity:             RatioResult;   // calculated only if data supports it
  annual_debt_service:        RatioResult;   // PMT helper
}

// ── Percentile output (output of percentile-engine.ts) ───────────────────────

/**
 * 'higher_is_better' — DSCR, margins, current ratio. Raw percentile = display.
 * 'lower_is_better'  — Debt/Worth, DIO, debt-to-equity. Display = 100 - raw.
 */
export type Direction = 'higher_is_better' | 'lower_is_better';

/**
 * Status labels match the spec exactly. Bands are based on the *display*
 * percentile (post-direction-flip), so "Strong" always means good.
 */
export type StatusLabel =
  | 'Bottom Quartile'
  | 'Below Median'
  | 'In Line'
  | 'Strong'
  | 'Outlier';

export type StatusColor = 'red' | 'yellow' | 'blue' | 'green';

/**
 * One row of the main benchmark table. Carries everything the UI needs to
 * render a row including the percentile bar segments.
 */
export interface MetricBenchmarkRow {
  metric_key:        string;          // internal key e.g. "current_ratio"
  metric_label:      string;          // display label e.g. "Current Ratio"
  deal_value:        number | null;
  industry_q1:       number | null;
  industry_median:   number | null;
  industry_q3:       number | null;
  raw_percentile:    number | null;   // 1-99 on raw scale (null if no data)
  display_percentile: number | null;  // post-direction-flip, used for status
  direction:         Direction;
  status:            StatusLabel | null;
  status_color:      StatusColor | null;
  insufficient_data: boolean;
  reason?:           string;          // populated when insufficient_data=true
}

// ── Risk flags (output of risk-flags.ts) ─────────────────────────────────────

export type RiskSeverity = 'high' | 'medium' | 'low' | 'info';

export interface RiskFlag {
  severity:    RiskSeverity;
  metric_key:  string;
  message:     string;          // e.g. "DSCR of 1.22x is below the 1.30x lender threshold"
  rule:        string;          // e.g. "dscr_below_sba_threshold"
}

export interface Strength {
  metric_key: string;
  message:    string;
}

// ── Deal Structure & Leverage outputs ────────────────────────────────────────

export type DealStructureStatus =
  // DSCR statuses
  | 'Risk' | 'Borderline' | 'Strong'
  // Debt/SDE statuses
  | 'Conservative' | 'Normal' | 'Elevated' | 'Aggressive'
  // LTV statuses
  | 'Typical' | 'High' | 'Very High'
  // Universal
  | 'Insufficient Data';

export interface DealStructureMetric {
  key:         'dscr' | 'debt_to_sde' | 'ltv';
  label:       string;
  value:       number | null;
  display:     string;        // formatted for UI e.g. "1.22x" or "—"
  status:      DealStructureStatus;
  status_color: StatusColor | null;
  explanation: string;        // one-line deterministic interpretation
}

export interface DealStructureAnalysis {
  metrics:        DealStructureMetric[];
  sources_uses:   {
    purchase_price:         number;
    buyer_equity:           number;
    senior_debt:            number;
    seller_note:            number;
    working_capital_needed: number;
    total_uses:             number;
    total_sources:          number;
    balanced:               boolean;
  };
  flags:          RiskFlag[];   // 2-3 leverage-specific flags
  interpretation: string[];     // 2-3 sentences in "What This Means" panel
}

// ── Top-level engine output ──────────────────────────────────────────────────

/**
 * Final structured output the API returns and the UI consumes. Mirrors the
 * spec's required JSON shape with extras for the table UI.
 */
export interface BenchmarkAnalysis {
  // Identity & context
  industry:       string;
  naics_code:     string | null;
  industry_name:  string | null;
  benchmark_year: string;
  generated_at:   string;        // ISO timestamp

  // Operating metrics (RMA-compared)
  financial_position: MetricBenchmarkRow[];

  // Deterministic flags (non-AI)
  risk_flags:        RiskFlag[];
  strengths:         Strength[];

  // Deal structure (separate domain)
  deal_structure?:   DealStructureAnalysis;

  // Score (0-100)
  financial_score:   number | null;
  score_drivers:     string[];   // top 3 contributing factors

  // For UI: which metrics had no benchmark data
  unsupported_metrics: string[];

  // AI-layer output is added separately by /api/benchmarks/interpret —
  // not part of the deterministic engine.
}
