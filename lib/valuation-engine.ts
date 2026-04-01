/**
 * NexTax Valuation Engine
 * ========================
 * Centralized benchmark lookup and fair value logic for all NexTax tools.
 *
 * Data source hierarchy (most → least precise):
 *   0. Live blended benchmark     — industry_benchmarks_live: blends deal_runs +
 *                                   dealstats_transactions + dealstats_benchmarks
 *                                   into a single computed layer. Refreshed every 6hrs.
 *   1. DealStats size-band specific  — individual closed SMB transactions, sliced by revenue band
 *   2. DealStats industry aggregate  — same dataset, national/all-sizes rollup
 *   3. BizBuySell 2025 annual report — pre-aggregated industry medians from closed-market report
 *   4. Listing-derived fallback      — computed from deal_runs asking prices (last resort)
 *
 * GOVERNANCE: Raw DealStats or BizBuySell records are never returned to API consumers.
 * All outputs are derived NexTax Market Intelligence metrics.
 *
 * MIGRATION NOTE: Tier 0 (industry_benchmarks_live) was added 2026-04.
 * Tiers 1–4 remain as fallbacks for industries not yet represented in the live layer.
 */

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BenchmarkSource =
  | "live_blended"     // industry_benchmarks_live — live computed blend (Tier 0)
  | "dstats_band"      // DealStats size-band specific — highest precision
  | "dstats_national"  // DealStats industry aggregate — broad sample
  | "bizbuysell"       // BizBuySell 2025 annual report — last external fallback
  | "listing"          // Computed from deal_runs listing prices — last resort
  | null;              // No data available

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export interface ValuationBenchmark {
  // Core valuation multiples
  medianSdeMultiple: number | null;
  p25SdeMultiple: number | null;
  p75SdeMultiple: number | null;
  medianRevenueMultiple: number | null;
  medianEbitdaMultiple: number | null;

  // Operational benchmarks
  medianRevenue: number | null;
  medianSde: number | null;
  medianEbitda: number | null;
  medianMvic: number | null;

  // Margin benchmarks
  medianSdeMargin: number | null;
  medianEbitdaMargin: number | null;
  medianOperatingMargin: number | null;

  // Metadata
  source: BenchmarkSource;
  confidence: ConfidenceLevel;
  sampleSize: number;
  sizeBand: string | null;
  industryKey: string;

  // Tier 0 extras — only populated when source === "live_blended"
  liveBenchmarkLow?: number | null;
  liveBenchmarkHigh?: number | null;
  liveBenchmarkSource?: string | null;
  liveConfidenceScore?: number | null;
}

export interface FairValueResult {
  fairValue: number | null;         // Estimated fair MVIC in dollars
  p25FairValue: number | null;      // Low end of range
  p75FairValue: number | null;      // High end of range
  multiple: number | null;          // The multiple used
  source: BenchmarkSource;
  confidence: ConfidenceLevel;
  sampleSize: number;
}

export interface DealRealityScore {
  dri: number | null;               // Deal Reality Index: ask / fair value
  gapPct: number | null;            // % premium over fair value
  condition: DRICondition | null;
  fairValue: number | null;
  askPrice: number;
  source: BenchmarkSource;
  confidence: ConfidenceLevel;
}

export type DRICondition =
  | "Undervalued"
  | "Healthy Market"
  | "Moderately Overpriced"
  | "Highly Overpriced";

// Internal row shapes — never exported to API consumers
interface DStatsRow {
  industry_key: string;
  size_band: string | null;
  sample_size: number;
  median_mvic_to_sde: number | null;
  median_mvic_to_revenue: number | null;
  median_mvic_to_ebitda: number | null;
  p25_mvic_to_sde: number | null;
  p75_mvic_to_sde: number | null;
  median_revenue: number | null;
  median_sde: number | null;
  median_ebitda: number | null;
  median_mvic: number | null;
  median_sde_margin: number | null;
  median_ebitda_margin: number | null;
  median_operating_margin: number | null;
}

interface BBRow {
  industry_key: string;
  reported_sales: number;
  cashflow_multiple_avg: number | null;
  median_sale_price: number | null;
  sale_to_asking_ratio: number | null;
  median_days_on_market: number | null;
}

interface ListingRow {
  industry_key: string;
  median_multiple: number | null;
  median_asking_price: number | null;
  sample_size: number;
}

// Tier 0: live blended benchmark row shape
interface LiveBenchmarkRow {
  industry_key: string;
  size_band: string;
  blended_benchmark_low: number | null;
  blended_benchmark_mid: number | null;
  blended_benchmark_high: number | null;
  listing_p50_sde_multiple: number | null;
  transaction_median_sde_multiple: number | null;
  reference_median_mvic_to_sde: number | null;
  reference_p25_mvic_to_sde: number | null;
  reference_p75_mvic_to_sde: number | null;
  listing_count: number;
  transaction_count: number;
  reference_sample_size: number;
  confidence_score: number;
  confidence_grade: string;
  benchmark_source: string;
  median_sde_margin: number | null;
  median_ebitda_margin: number | null;
  median_operating_margin: number | null;
  listing_median_revenue: number | null;
  listing_median_sde: number | null;
  naics_code: string | null;
  computed_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache structure
// Populated once per request via loadBenchmarkData() and passed to functions.
// This avoids redundant Supabase round-trips when many industries are processed.
// ─────────────────────────────────────────────────────────────────────────────

export interface BenchmarkDataset {
  // Tier 0: live blended benchmarks — { [industry_key]: { [size_band]: row } }
  live: Record<string, Record<string, LiveBenchmarkRow>>;

  // DealStats rows organized for fast lookup
  dstats: Record<string, {
    national: DStatsRow | null;
    byBand: Record<string, DStatsRow>;
  }>;

  // BizBuySell rows keyed by industry_key (multiple rows per industry = subsectors)
  bb: Record<string, BBRow[]>;

  // Listing benchmarks keyed by industry_key
  listing: Record<string, ListingRow>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA LOADER
// Call once at the top of any route that needs valuations, pass result down.
// ─────────────────────────────────────────────────────────────────────────────

export async function loadBenchmarkData(): Promise<BenchmarkDataset> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [liveRes, dstatsRes, bbRes, listingRes] = await Promise.all([
    // Tier 0: live blended benchmarks
    supabase.from("industry_benchmarks_live").select(
      "industry_key, size_band, " +
      "blended_benchmark_low, blended_benchmark_mid, blended_benchmark_high, " +
      "listing_p50_sde_multiple, transaction_median_sde_multiple, " +
      "reference_median_mvic_to_sde, reference_p25_mvic_to_sde, reference_p75_mvic_to_sde, " +
      "listing_count, transaction_count, reference_sample_size, " +
      "confidence_score, confidence_grade, benchmark_source, " +
      "median_sde_margin, median_ebitda_margin, median_operating_margin, " +
      "listing_median_revenue, listing_median_sde, naics_code, computed_at"
    ),
    // Tier 1+2: DealStats
    supabase.from("dealstats_benchmarks").select(
      "industry_key, size_band, sample_size, " +
      "median_mvic_to_sde, median_mvic_to_revenue, median_mvic_to_ebitda, " +
      "p25_mvic_to_sde, p75_mvic_to_sde, " +
      "median_revenue, median_sde, median_ebitda, median_mvic, " +
      "median_sde_margin, median_ebitda_margin, median_operating_margin"
    ),
    // Tier 3: BizBuySell
    supabase.from("industry_transaction_benchmarks").select(
      "industry_key, reported_sales, cashflow_multiple_avg, " +
      "median_sale_price, sale_to_asking_ratio, median_days_on_market"
    ).not("industry_key", "is", null),
    // Tier 4: Listing-derived fallback
    supabase.from("industry_listing_benchmarks").select(
      "industry_key, median_multiple, median_asking_price, sample_size"
    ).is("state", null).is("size_band", null),
  ]);

  // Organize Tier 0 live benchmarks: { [industry_key]: { [size_band]: row } }
  const live: BenchmarkDataset["live"] = {};
  for (const row of (liveRes.data || []) as LiveBenchmarkRow[]) {
    if (!row.industry_key || !row.size_band) continue;
    if (!live[row.industry_key]) live[row.industry_key] = {};
    live[row.industry_key][row.size_band] = row;
  }

  // Organize DealStats into fast lookup: { [industry_key]: { national, byBand } }
  const dstats: BenchmarkDataset["dstats"] = {};
  for (const row of (dstatsRes.data || []) as DStatsRow[]) {
    if (!row.industry_key) continue;
    if (!dstats[row.industry_key]) dstats[row.industry_key] = { national: null, byBand: {} };
    if (!row.size_band) {
      dstats[row.industry_key].national = row;
    } else {
      dstats[row.industry_key].byBand[row.size_band] = row;
    }
  }

  // Organize BizBuySell into { [industry_key]: rows[] }
  const bb: BenchmarkDataset["bb"] = {};
  for (const row of (bbRes.data || []) as BBRow[]) {
    if (!row.industry_key) continue;
    if (!bb[row.industry_key]) bb[row.industry_key] = [];
    bb[row.industry_key].push(row);
  }

  // Organize listing benchmarks into { [industry_key]: row }
  const listing: BenchmarkDataset["listing"] = {};
  for (const row of (listingRes.data || []) as ListingRow[]) {
    if (row.industry_key) listing[row.industry_key] = row;
  }

  return { live, dstats, bb, listing };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

export function getBenchmarkConfidence(
  sampleSize: number,
  fallbackLevel: "live_blended" | "dstats_band" | "dstats_national" | "bizbuysell" | "listing"
): ConfidenceLevel {
  // Live blended: maps directly from confidence_grade stored in the table
  // This overload is only used when building from live data without a stored grade
  if (fallbackLevel === "live_blended") {
    if (sampleSize >= 75) return "HIGH";
    if (sampleSize >= 50) return "MEDIUM";
    if (sampleSize >= 20) return "LOW";
    return "INSUFFICIENT";
  }
  // DealStats band-specific: tightest distribution, highest precision
  if (fallbackLevel === "dstats_band") {
    if (sampleSize >= 25) return "HIGH";
    if (sampleSize >= 10) return "MEDIUM";
    if (sampleSize >= 5)  return "LOW";
    return "INSUFFICIENT";
  }
  // DealStats national: larger sample but wider distribution
  if (fallbackLevel === "dstats_national") {
    if (sampleSize >= 50) return "HIGH";
    if (sampleSize >= 20) return "MEDIUM";
    if (sampleSize >= 10) return "LOW";
    return "INSUFFICIENT";
  }
  // BizBuySell: aggregate report, less granular
  if (fallbackLevel === "bizbuysell") {
    if (sampleSize >= 100) return "MEDIUM";
    if (sampleSize >= 30)  return "LOW";
    return "INSUFFICIENT";
  }
  // Listing-derived: least reliable (asking prices, not closed comps)
  return sampleSize >= 10 ? "LOW" : "INSUFFICIENT";
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: getValuationBenchmark
// Returns the full benchmark record for a given industry + size band.
// This is the single source of truth for all downstream valuation functions.
//
// Tier 0 (live_blended) is used when:
//   - confidence_grade is HIGH or MEDIUM
//   - blended_benchmark_mid is present
//   - The live row exists for the given industry+size_band
//
// Tier 0 is skipped (falls through to Tier 1) when:
//   - confidence_grade is LOW or missing
//   - No live row exists for the exact size_band (tries industry-wide live first)
// ─────────────────────────────────────────────────────────────────────────────

export function getValuationBenchmark(
  industryKey: string,
  sizeBand: string | null | undefined,
  data: BenchmarkDataset
): ValuationBenchmark {
  const liveByBand = data.live[industryKey] || {};
  const ds = data.dstats[industryKey];
  const bbRows = data.bb[industryKey] || [];
  const listingRow = data.listing[industryKey] || null;

  // ── Tier 0a: Live blended — exact size band match
  if (sizeBand && liveByBand[sizeBand]) {
    const row = liveByBand[sizeBand];
    if (row.blended_benchmark_mid && row.confidence_grade !== "LOW") {
      return buildFromLive(row, sizeBand, industryKey);
    }
  }

  // ── Tier 0b: Live blended — best available band for this industry
  // (use highest-confidence row when exact band is missing or LOW)
  const liveBands = Object.values(liveByBand);
  if (liveBands.length > 0) {
    const best = liveBands
      .filter(r => r.blended_benchmark_mid && r.confidence_grade !== "LOW")
      .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))[0];
    if (best) {
      return buildFromLive(best, best.size_band, industryKey);
    }
  }

  // ── Tier 1: DealStats size-band specific
  if (sizeBand && ds?.byBand?.[sizeBand]) {
    const row = ds.byBand[sizeBand];
    if (row.sample_size >= 5 && row.median_mvic_to_sde) {
      const confidence = getBenchmarkConfidence(row.sample_size, "dstats_band");
      return buildFromDStats(row, "dstats_band", confidence, sizeBand, industryKey);
    }
  }

  // ── Tier 2: DealStats industry-level aggregate
  if (ds?.national?.median_mvic_to_sde && ds.national.sample_size >= 10) {
    const row = ds.national;
    const confidence = getBenchmarkConfidence(row.sample_size, "dstats_national");
    return buildFromDStats(row, "dstats_national", confidence, null, industryKey);
  }

  // ── Tier 3: BizBuySell annual report (cashflow multiple)
  const bbSales = bbRows.reduce((s, t) => s + (t.reported_sales || 0), 0);
  if (bbSales > 0) {
    const bbMultiple = bbRows.reduce(
      (s, t) => s + (t.cashflow_multiple_avg || 0) * (t.reported_sales || 0), 0
    ) / bbSales;
    const confidence = getBenchmarkConfidence(bbSales, "bizbuysell");
    return {
      medianSdeMultiple: bbMultiple > 0 ? +bbMultiple.toFixed(2) : null,
      p25SdeMultiple: null,
      p75SdeMultiple: null,
      medianRevenueMultiple: null,
      medianEbitdaMultiple: null,
      medianRevenue: null,
      medianSde: null,
      medianEbitda: null,
      medianMvic: bbSales > 0
        ? Math.round(
            bbRows.reduce((s, t) => s + (t.median_sale_price || 0) * (t.reported_sales || 0), 0) / bbSales
          )
        : null,
      medianSdeMargin: null,
      medianEbitdaMargin: null,
      medianOperatingMargin: null,
      source: "bizbuysell",
      confidence,
      sampleSize: bbSales,
      sizeBand: null,
      industryKey,
    };
  }

  // ── Tier 4: Listing-derived fallback
  if (listingRow?.median_multiple && (listingRow.sample_size || 0) >= 5) {
    const confidence = getBenchmarkConfidence(listingRow.sample_size, "listing");
    return {
      medianSdeMultiple: +listingRow.median_multiple.toFixed(2),
      p25SdeMultiple: null,
      p75SdeMultiple: null,
      medianRevenueMultiple: null,
      medianEbitdaMultiple: null,
      medianRevenue: null,
      medianSde: null,
      medianEbitda: null,
      medianMvic: listingRow.median_asking_price
        ? Math.round(listingRow.median_asking_price)
        : null,
      medianSdeMargin: null,
      medianEbitdaMargin: null,
      medianOperatingMargin: null,
      source: "listing",
      confidence,
      sampleSize: listingRow.sample_size,
      sizeBand: null,
      industryKey,
    };
  }

  // ── No data available
  return nullBenchmark(industryKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// getValuationMultiple — convenience wrapper, returns just the SDE multiple
// ─────────────────────────────────────────────────────────────────────────────

export function getValuationMultiple(
  industryKey: string,
  sizeBand: string | null | undefined,
  data: BenchmarkDataset
): {
  multiple: number | null;
  p25: number | null;
  p75: number | null;
  source: BenchmarkSource;
  confidence: ConfidenceLevel;
  sampleSize: number;
} {
  const b = getValuationBenchmark(industryKey, sizeBand, data);
  return {
    multiple: b.medianSdeMultiple,
    p25: b.p25SdeMultiple,
    p75: b.p75SdeMultiple,
    source: b.source,
    confidence: b.confidence,
    sampleSize: b.sampleSize,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getFairValue — computes estimated MVIC from SDE using benchmark multiple
// ─────────────────────────────────────────────────────────────────────────────

export function getFairValue(
  industryKey: string,
  sizeBand: string | null | undefined,
  sde: number,
  data: BenchmarkDataset
): FairValueResult {
  if (!sde || sde <= 0) {
    return {
      fairValue: null, p25FairValue: null, p75FairValue: null,
      multiple: null, source: null, confidence: "INSUFFICIENT", sampleSize: 0,
    };
  }

  const b = getValuationBenchmark(industryKey, sizeBand, data);

  if (!b.medianSdeMultiple) {
    return {
      fairValue: null, p25FairValue: null, p75FairValue: null,
      multiple: null, source: b.source, confidence: "INSUFFICIENT", sampleSize: b.sampleSize,
    };
  }

  return {
    fairValue: Math.round(b.medianSdeMultiple * sde),
    p25FairValue: b.p25SdeMultiple ? Math.round(b.p25SdeMultiple * sde) : null,
    p75FairValue: b.p75SdeMultiple ? Math.round(b.p75SdeMultiple * sde) : null,
    multiple: b.medianSdeMultiple,
    source: b.source,
    confidence: b.confidence,
    sampleSize: b.sampleSize,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getDealRealityScore — computes DRI and condition for a single deal
// ─────────────────────────────────────────────────────────────────────────────

export function getDealRealityScore(
  askPrice: number,
  industryKey: string,
  sizeBand: string | null | undefined,
  sde: number,
  data: BenchmarkDataset
): DealRealityScore {
  const fv = getFairValue(industryKey, sizeBand, sde, data);

  if (!fv.fairValue || !askPrice || askPrice <= 0) {
    return {
      dri: null, gapPct: null, condition: null,
      fairValue: fv.fairValue, askPrice, source: fv.source, confidence: fv.confidence,
    };
  }

  const dri = +(askPrice / fv.fairValue).toFixed(2);
  const gapPct = Math.round((dri - 1) * 100);
  const condition: DRICondition =
    dri < 1.0    ? "Undervalued"
    : dri <= 1.15 ? "Healthy Market"
    : dri <= 1.3  ? "Moderately Overpriced"
    :               "Highly Overpriced";

  return { dri, gapPct, condition, fairValue: fv.fairValue, askPrice, source: fv.source, confidence: fv.confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// classifyDealSentiment — overpriced / fair / undervalued bucket
// ─────────────────────────────────────────────────────────────────────────────

export type SentimentBucket = "overpriced" | "fair" | "undervalued";

export function classifyDealSentiment(
  askPrice: number,
  sde: number,
  overallScore: number,
  industryKey: string,
  sizeBand: string | null | undefined,
  data: BenchmarkDataset
): SentimentBucket {
  const fv = getFairValue(industryKey, sizeBand, sde, data);

  if (fv.fairValue && askPrice > 0) {
    const ratio = askPrice / fv.fairValue;
    if (ratio > 1.15) return "overpriced";
    if (ratio < 0.85) return "undervalued";
    return "fair";
  }

  // Fallback: score-based bucketing
  if (overallScore < 40) return "overpriced";
  if (overallScore >= 70) return "undervalued";
  return "fair";
}

// ─────────────────────────────────────────────────────────────────────────────
// getSizeBand — infer size band from revenue (mirrors Supabase get_size_band())
// ─────────────────────────────────────────────────────────────────────────────

export function getSizeBand(revenue: number | null | undefined): string | null {
  if (!revenue || revenue <= 0) return null;
  if (revenue < 500_000)    return "under_500k";
  if (revenue < 1_000_000)  return "500k_1m";
  if (revenue < 3_000_000)  return "1m_3m";
  if (revenue < 10_000_000) return "3m_10m";
  return "10m_plus";
}

// ─────────────────────────────────────────────────────────────────────────────
// getBBMarketStats — BizBuySell-only stats (days on market, sale-to-ask)
// These metrics only exist in the BizBuySell layer — DealStats doesn't have them
// ─────────────────────────────────────────────────────────────────────────────

export function getBBMarketStats(
  industryKey: string,
  data: BenchmarkDataset
): {
  bbReportedSales: number;
  medianDaysOnMarket: number | null;
  saleToAsk: number | null;
  medianSalePrice: number | null;
} {
  const bbRows = data.bb[industryKey] || [];
  const bbSales = bbRows.reduce((s, t) => s + (t.reported_sales || 0), 0);
  if (bbSales === 0) {
    return { bbReportedSales: 0, medianDaysOnMarket: null, saleToAsk: null, medianSalePrice: null };
  }

  return {
    bbReportedSales: bbSales,
    medianDaysOnMarket: Math.round(
      bbRows.reduce((s, t) => s + (t.median_days_on_market || 0) * (t.reported_sales || 0), 0) / bbSales
    ),
    saleToAsk: +(
      bbRows.reduce((s, t) => s + (t.sale_to_asking_ratio || 0) * (t.reported_sales || 0), 0) / bbSales
    ).toFixed(2),
    medianSalePrice: Math.round(
      bbRows.reduce((s, t) => s + (t.median_sale_price || 0) * (t.reported_sales || 0), 0) / bbSales
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a ValuationBenchmark from a live blended row (Tier 0).
 * Maps confidence_grade string from DB → ConfidenceLevel type.
 */
function buildFromLive(
  row: LiveBenchmarkRow,
  sizeBand: string,
  industryKey: string
): ValuationBenchmark {
  const confidenceMap: Record<string, ConfidenceLevel> = {
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  };
  const confidence: ConfidenceLevel = confidenceMap[row.confidence_grade] ?? "LOW";

  // Total sample size = sum of all contributing sources
  const sampleSize =
    (row.listing_count || 0) +
    (row.transaction_count || 0) +
    (row.reference_sample_size || 0);

  return {
    medianSdeMultiple: row.blended_benchmark_mid
      ? +row.blended_benchmark_mid.toFixed(2)
      : null,
    p25SdeMultiple: row.reference_p25_mvic_to_sde
      ? +row.reference_p25_mvic_to_sde.toFixed(2)
      : row.blended_benchmark_low
      ? +row.blended_benchmark_low.toFixed(2)
      : null,
    p75SdeMultiple: row.reference_p75_mvic_to_sde
      ? +row.reference_p75_mvic_to_sde.toFixed(2)
      : row.blended_benchmark_high
      ? +row.blended_benchmark_high.toFixed(2)
      : null,
    medianRevenueMultiple: null,   // Not computed in live layer
    medianEbitdaMultiple: null,    // Not computed in live layer
    medianRevenue: row.listing_median_revenue
      ? Math.round(row.listing_median_revenue)
      : null,
    medianSde: row.listing_median_sde
      ? Math.round(row.listing_median_sde)
      : null,
    medianEbitda: null,
    medianMvic: null,
    medianSdeMargin: row.median_sde_margin
      ? +row.median_sde_margin.toFixed(3)
      : null,
    medianEbitdaMargin: row.median_ebitda_margin
      ? +row.median_ebitda_margin.toFixed(3)
      : null,
    medianOperatingMargin: row.median_operating_margin
      ? +row.median_operating_margin.toFixed(3)
      : null,
    source: "live_blended",
    confidence,
    sampleSize,
    sizeBand,
    industryKey,
    // Tier 0 extras for _qa transparency fields
    liveBenchmarkLow: row.blended_benchmark_low,
    liveBenchmarkHigh: row.blended_benchmark_high,
    liveBenchmarkSource: row.benchmark_source,
    liveConfidenceScore: row.confidence_score,
  };
}

function buildFromDStats(
  row: DStatsRow,
  source: "dstats_band" | "dstats_national",
  confidence: ConfidenceLevel,
  sizeBand: string | null,
  industryKey: string
): ValuationBenchmark {
  return {
    medianSdeMultiple: row.median_mvic_to_sde ? +row.median_mvic_to_sde.toFixed(2) : null,
    p25SdeMultiple: row.p25_mvic_to_sde ? +row.p25_mvic_to_sde.toFixed(2) : null,
    p75SdeMultiple: row.p75_mvic_to_sde ? +row.p75_mvic_to_sde.toFixed(2) : null,
    medianRevenueMultiple: row.median_mvic_to_revenue ? +row.median_mvic_to_revenue.toFixed(2) : null,
    medianEbitdaMultiple: row.median_mvic_to_ebitda ? +row.median_mvic_to_ebitda.toFixed(2) : null,
    medianRevenue: row.median_revenue ? Math.round(row.median_revenue) : null,
    medianSde: row.median_sde ? Math.round(row.median_sde) : null,
    medianEbitda: row.median_ebitda ? Math.round(row.median_ebitda) : null,
    medianMvic: row.median_mvic ? Math.round(row.median_mvic) : null,
    medianSdeMargin: row.median_sde_margin ? +row.median_sde_margin.toFixed(3) : null,
    medianEbitdaMargin: row.median_ebitda_margin ? +row.median_ebitda_margin.toFixed(3) : null,
    medianOperatingMargin: row.median_operating_margin ? +row.median_operating_margin.toFixed(3) : null,
    source,
    confidence,
    sampleSize: row.sample_size,
    sizeBand,
    industryKey,
  };
}

function nullBenchmark(industryKey: string): ValuationBenchmark {
  return {
    medianSdeMultiple: null, p25SdeMultiple: null, p75SdeMultiple: null,
    medianRevenueMultiple: null, medianEbitdaMultiple: null,
    medianRevenue: null, medianSde: null, medianEbitda: null, medianMvic: null,
    medianSdeMargin: null, medianEbitdaMargin: null, medianOperatingMargin: null,
    source: null, confidence: "INSUFFICIENT", sampleSize: 0, sizeBand: null, industryKey,
  };
}
