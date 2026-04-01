// lib/benchmarks/getLiveBenchmark.ts
// ============================================================
// Single source of truth for benchmark lookups across NexTax.AI
// Priority: exact industry+size_band → industry-only → reference fallback
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SizeBand =
  | 'under_500k'
  | '500k_1m'
  | '1m_3m'
  | '3m_10m'
  | '10m_plus';

export interface LiveBenchmark {
  industry_key: string;
  size_band: string;
  blended_benchmark_low: number;
  blended_benchmark_mid: number;
  blended_benchmark_high: number;
  listing_p50_sde_multiple: number | null;
  transaction_median_sde_multiple: number | null;
  reference_median_mvic_to_sde: number | null;
  listing_count: number;
  transaction_count: number;
  reference_sample_size: number;
  confidence_score: number;
  confidence_grade: 'HIGH' | 'MEDIUM' | 'LOW';
  benchmark_source: string;
  median_sde_margin: number | null;
  median_operating_margin: number | null;
  median_ebitda_margin: number | null;
  computed_at: string;
  notes: string | null;
  _fallback_level: 'exact' | 'industry_wide' | 'reference_only';
}

/**
 * Returns revenue-based size band string
 */
export function getSizeBand(revenue: number): SizeBand {
  if (revenue < 500_000)   return 'under_500k';
  if (revenue < 1_000_000) return '500k_1m';
  if (revenue < 3_000_000) return '1m_3m';
  if (revenue < 10_000_000) return '3m_10m';
  return '10m_plus';
}

/**
 * Primary lookup: industry + size_band → industry-only → reference fallback
 * Never throws — returns null if no data found anywhere.
 */
export async function getLiveBenchmark(
  industryKey: string,
  sizeBand: SizeBand
): Promise<LiveBenchmark | null> {
  const key = industryKey.toLowerCase().trim();

  // 1. Exact match: industry + size_band
  const { data: exact } = await supabase
    .from('industry_benchmarks_live')
    .select('*')
    .eq('industry_key', key)
    .eq('size_band', sizeBand)
    .single();

  if (exact && exact.blended_benchmark_mid) {
    return { ...exact, _fallback_level: 'exact' };
  }

  // 2. Industry-wide: best available size band for this industry
  const { data: industryRows } = await supabase
    .from('industry_benchmarks_live')
    .select('*')
    .eq('industry_key', key)
    .order('confidence_score', { ascending: false })
    .limit(1);

  if (industryRows && industryRows.length > 0 && industryRows[0].blended_benchmark_mid) {
    return { ...industryRows[0], _fallback_level: 'industry_wide' };
  }

  // 3. Reference-only fallback from dealstats_benchmarks
  const { data: ref } = await supabase
    .from('dealstats_benchmarks')
    .select('*')
    .eq('industry_key', key)
    .order('sample_size', { ascending: false })
    .limit(1)
    .single();

  if (ref && ref.median_mvic_to_sde) {
    // Construct a LiveBenchmark shape from reference data
    const mid = ref.median_mvic_to_sde;
    return {
      industry_key: key,
      size_band: sizeBand,
      blended_benchmark_low: ref.p25_mvic_to_sde ?? mid * 0.80,
      blended_benchmark_mid: mid,
      blended_benchmark_high: ref.p75_mvic_to_sde ?? mid * 1.20,
      listing_p50_sde_multiple: null,
      transaction_median_sde_multiple: null,
      reference_median_mvic_to_sde: mid,
      listing_count: 0,
      transaction_count: 0,
      reference_sample_size: ref.sample_size ?? 0,
      confidence_score: 20,
      confidence_grade: 'LOW',
      benchmark_source: 'reference_only',
      median_sde_margin: ref.median_sde_margin ?? null,
      median_operating_margin: ref.median_operating_margin ?? null,
      median_ebitda_margin: ref.median_ebitda_margin ?? null,
      computed_at: ref.computed_at ?? new Date().toISOString(),
      notes: 'reference_only_fallback',
      _fallback_level: 'reference_only',
    };
  }

  return null;
}

/**
 * Convenience: get benchmark from revenue + industry (auto-computes size band)
 */
export async function getLiveBenchmarkByRevenue(
  industryKey: string,
  revenue: number
): Promise<LiveBenchmark | null> {
  return getLiveBenchmark(industryKey, getSizeBand(revenue));
}
