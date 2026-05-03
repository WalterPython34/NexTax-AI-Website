// lib/benchmarks/percentile-engine.ts
// ─────────────────────────────────────────────────────────────────────────────
// Quartile interpolation: maps a deal's metric value to a percentile (1-99)
// using piecewise linear interpolation between Q1, median, and Q3.
//
// All inputs are assumed to be on the RAW numeric scale (Q1 < median < Q3).
// Direction handling (whether higher or lower is "good") happens at the
// status-label step, NOT in the percentile math. This keeps the math clean
// and matches the spec on page 10.
//
// Example flow:
//   Debt/Worth = 0.6, q1=0.6, median=1.4, q3=5.0
//   → raw_percentile = 25 (at Q1)
//   → direction = lower_is_better
//   → display_percentile = 100 - 25 = 75 (Strong, because low debt is good)
//   → status = "Strong"
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Direction,
  QuartileTriple,
  StatusLabel,
  StatusColor,
} from './types';

// ── Direction map ────────────────────────────────────────────────────────────
// Mirrors the importer script's direction map but indexed by the metric_key
// our calculations module uses (snake_case), not the raw RMA labels.

export const METRIC_DIRECTIONS: Record<string, Direction> = {
  // Higher is better
  gross_margin_pct:   'higher_is_better',
  sde_margin_pct:     'higher_is_better',
  current_ratio:      'higher_is_better',
  dscr:               'higher_is_better',
  inventory_turnover: 'higher_is_better',
  solvency_ratio:     'higher_is_better',
  // Lower is better
  days_inventory_outstanding: 'lower_is_better',
  debt_to_equity:             'lower_is_better',
};

// ── Mapping our calculated metric keys → RMA metric_name in Supabase ─────────
//
// The Supabase rma_benchmarks table stores raw RMA labels like
// "EBITDA/Sales" and "Current". Our calculations layer uses snake_case keys.
// This map bridges them so the engine can look up benchmarks by metric.

export const METRIC_TO_RMA_NAME: Record<string, string> = {
  sde_margin_pct:             'EBITDA/Sales',                  // closest RMA proxy for SDE margin
  current_ratio:              'Current',
  inventory_turnover:         'Cost of Sales / Inventory',     // RMA's COGS/Inv = inventory turnover
  days_inventory_outstanding: 'Cost of Sales / Inventory',     // same source, transformed via 365/turnover
  // gross_margin_pct: RMA doesn't publish this directly per industry — leave unmapped
  // dscr: not in RMA — uses lender thresholds, not industry distribution
  // solvency_ratio: not in RMA — calculated from full BS
  // debt_to_equity: 'Debt / Worth' — would map but spec says not to compare in V1
};

// ── Status bands (display percentile → label + color) ────────────────────────

export function statusFromDisplayPercentile(p: number): { label: StatusLabel; color: StatusColor } {
  if (p < 25) return { label: 'Bottom Quartile', color: 'red' };
  if (p < 40) return { label: 'Below Median',    color: 'yellow' };
  if (p < 60) return { label: 'In Line',         color: 'blue' };
  if (p < 75) return { label: 'Strong',          color: 'green' };
  return        { label: 'Outlier',         color: 'green' };
  // Note: "Outlier" can be GOOD (rare upside) or BAD (margin too high → suspicious).
  // The risk-flags module separately decides whether an outlier needs validation;
  // here we only assign a band label.
}

// ── Core percentile interpolation ────────────────────────────────────────────

/**
 * Maps a deal value to its raw percentile in the industry distribution
 * defined by Q1, median, Q3.
 *
 * Returns null when:
 *   - value is missing or non-finite
 *   - benchmark data is incomplete (any quartile null)
 *   - quartiles aren't strictly ordered (data integrity issue)
 *
 * The output is clamped to [1, 99] so we never imply 0% or 100% confidence.
 */
export function rawPercentile(value: number | null, q: QuartileTriple): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (q.q1 === null || q.median === null || q.q3 === null) return null;
  if (!Number.isFinite(q.q1) || !Number.isFinite(q.median) || !Number.isFinite(q.q3)) return null;

  // Validate quartile ordering. If RMA data is corrupt, refuse to compute
  // rather than emit a garbage percentile.
  if (!(q.q1 <= q.median && q.median <= q.q3)) return null;

  let p: number;

  if (value <= q.q1) {
    // Below Q1: scale from 1 to 25 based on how far below Q1.
    // If q1 is positive, use proportional scaling. If q1 is 0 or negative,
    // fall back to a flat 5 (well below the bottom quartile).
    if (q.q1 <= 0) {
      p = value <= q.q1 ? 5 : 25;
    } else {
      p = 25 * (value / q.q1);
    }
  } else if (value <= q.median) {
    // Q1 to median: linearly interpolate 25-50
    const span = q.median - q.q1;
    p = span === 0 ? 50 : 25 + 25 * ((value - q.q1) / span);
  } else if (value <= q.q3) {
    // Median to Q3: linearly interpolate 50-75
    const span = q.q3 - q.median;
    p = span === 0 ? 75 : 50 + 25 * ((value - q.median) / span);
  } else {
    // Above Q3: scale from 75 toward 99 with diminishing returns.
    // The spec uses (Q3 * 0.5) as the upper-tail width. We cap at 99 to
    // avoid implying exact 100 — there's always more tail.
    const tailWidth = q.q3 * 0.5;
    if (tailWidth <= 0) {
      p = 99;
    } else {
      p = 75 + 25 * ((value - q.q3) / tailWidth);
    }
  }

  // Clamp to [1, 99]
  return Math.max(1, Math.min(99, p));
}

/**
 * Apply directional flipping. For "lower is better" metrics, a low raw
 * percentile (deal value low in distribution) is GOOD, so we flip it to a
 * high display percentile. This way "Strong" always means good in the UI.
 */
export function displayPercentile(raw: number | null, direction: Direction): number | null {
  if (raw === null) return null;
  if (direction === 'lower_is_better') return 100 - raw;
  return raw;
}

/**
 * Convenience: end-to-end transform from value + benchmarks + direction →
 * { raw_percentile, display_percentile, status_label, status_color }.
 */
export function computePercentileWithStatus(
  value: number | null,
  q: QuartileTriple,
  direction: Direction,
): {
  raw_percentile: number | null;
  display_percentile: number | null;
  status_label: StatusLabel | null;
  status_color: StatusColor | null;
} {
  const raw = rawPercentile(value, q);
  if (raw === null) {
    return { raw_percentile: null, display_percentile: null, status_label: null, status_color: null };
  }
  const display = displayPercentile(raw, direction);
  if (display === null) {
    return { raw_percentile: raw, display_percentile: null, status_label: null, status_color: null };
  }
  const { label, color } = statusFromDisplayPercentile(display);
  return {
    raw_percentile: Math.round(raw),
    display_percentile: Math.round(display),
    status_label: label,
    status_color: color,
  };
}

// ── 10-segment percentile bar generator (for UI) ─────────────────────────────

/**
 * Convert a display percentile to a 10-element array of segment colors.
 * Used by the UI to render the segmented bar described in the spec.
 *
 * Each segment is filled if the percentile is at or above its threshold.
 * Segment color is determined by the segment's position (0-25 red, etc.)
 * NOT by the percentile band — that's how you get a visual gradient like
 *   ▓(red)▓(red)▓(yellow)▓(yellow)▓(yellow)▓(blue)... ░░░░
 * for a 65th percentile reading.
 */
export const SEGMENT_COLORS: StatusColor[] = [
  'red', 'red',           // 0-20
  'yellow', 'yellow', 'yellow',  // 20-50
  'blue', 'blue',         // 50-70
  'green', 'green', 'green',     // 70-100
];

export function percentileBarSegments(displayPct: number | null): {
  filled: boolean;
  color: StatusColor;
}[] {
  return SEGMENT_COLORS.map((color, i) => {
    const segmentMax = (i + 1) * 10;
    const filled = displayPct !== null && displayPct >= segmentMax - 5; // segment fills when pct >= midpoint
    return { filled, color };
  });
}
