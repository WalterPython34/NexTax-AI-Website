// app/acquiflow-intel/_lib/marketFacts.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Institutional Read — Market Facts Reader (Phase / Step 3)
//
// Returns ONLY raw factual market/evidence context for the committee/intel
// layer. Queries the benchmark tables directly (does NOT call the operational
// /api/benchmark-lookup route) to remain firewall-clean and isolated.
//
// Replicates ONLY the proven raw-query + fallback-tier logic from
// /api/benchmark-lookup. DELIBERATELY EXCLUDES:
//   - confidence grades (HIGH/MEDIUM/LOW)
//   - adjusted weights, effective multiple ranges
//   - positioning conclusions / recommendation text
//   - DRI condition labels ("overpriced"/"undervalued")
//   - any score/verdict language
//   - licensed source NAMES in the returned facts (DealStats/RMA/BizBuySell)
//
// What it returns is factual context an institution would reference — the
// deal's own multiple positioned against the distribution of closed comparable
// transactions, the depth of data behind that, the listing-vs-closed spread
// computed only from raw multiples, and days-on-market. No conclusions.
//
// CONSTITUTIONAL: these facts are for the PRESENTATION layer only. They are
// NOT fed into CP. CP remains frozen and reasons independently.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Size-band logic (copied verbatim from benchmark-lookup) ──────────────────
function getSizeBand(revenue: number): string {
  if (revenue < 500000) return "under_500k";
  if (revenue < 1000000) return "500k_1m";
  if (revenue < 3000000) return "1m_3m";
  if (revenue < 10000000) return "3m_10m";
  return "10m_plus";
}

// Factual provenance label — describes WHICH match produced the closed-comp
// figures, as neutral provenance (not a confidence grade, not a verdict).
type ClosedCompBasis =
  | "industry_size_matched"   // dealstats_benchmarks row matched industry + size band
  | "industry_national"       // dealstats_benchmarks row matched industry (any size)
  | "unavailable";            // no closed-comp benchmark for this industry

type ListingBasis =
  | "state_size_matched"
  | "national_size_matched"
  | "state"
  | "national"
  | "unavailable";

export interface MarketFacts {
  // The deal's own asking multiple (asking_price / sde).
  deal_multiple: number | null;

  // Closed comparable transactions — distribution position + evidence depth.
  closed_comp_median: number | null;
  closed_comp_p25: number | null;
  closed_comp_p75: number | null;
  closed_comp_sample_size: number | null;
  closed_comp_basis: ClosedCompBasis; // factual provenance only

  // Where the deal multiple sits relative to the closed-comp distribution,
  // expressed factually (a quartile placement string, NOT a verdict). Computed
  // only from raw multiples. null when no closed-comp data.
  deal_vs_closed_position:
    | "below_p25"
    | "between_p25_median"
    | "between_median_p75"
    | "above_p75"
    | null;

  // Listing side — current asking multiples (raw), for the listing-vs-closed
  // spread. Computed only from raw multiples.
  listing_multiple: number | null;
  listing_basis: ListingBasis;
  listing_vs_closed_gap_pct: number | null; // (listing − closed_median)/closed_median × 100

  // Market activity — days on market (raw factual figure).
  median_days_on_market: number | null;

  // Aggregate evidence depth across sources (raw counts only).
  evidence_depth: {
    closed_comp_sample_size: number | null;
    listing_sample_size: number | null;
  };
}

const EMPTY_FACTS: MarketFacts = {
  deal_multiple: null,
  closed_comp_median: null,
  closed_comp_p25: null,
  closed_comp_p75: null,
  closed_comp_sample_size: null,
  closed_comp_basis: "unavailable",
  deal_vs_closed_position: null,
  listing_multiple: null,
  listing_basis: "unavailable",
  listing_vs_closed_gap_pct: null,
  median_days_on_market: null,
  evidence_depth: { closed_comp_sample_size: null, listing_sample_size: null },
};

function finite(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// ── Closed comps (dealstats_benchmarks) — raw facts only ─────────────────────
async function readClosedComps(
  supabase: SupabaseClient,
  industry: string,
  revenue: number,
): Promise<{
  median: number | null; p25: number | null; p75: number | null;
  sampleSize: number | null; basis: ClosedCompBasis;
}> {
  const sizeBand = getSizeBand(revenue);
  const { data, error } = await supabase
    .from("dealstats_benchmarks")
    .select("size_band, sample_size, median_mvic_to_sde, p25_mvic_to_sde, p75_mvic_to_sde")
    .eq("industry_key", industry);

  if (error || !data || data.length === 0) {
    return { median: null, p25: null, p75: null, sampleSize: null, basis: "unavailable" };
  }

  // Prefer size-band match (>=5 samples), then national/any-size (>=10), mirroring
  // the benchmark-lookup tier thresholds — but returning ONLY raw figures.
  const band = data.find((r: any) => r.size_band === sizeBand);
  const national = data.find((r: any) => !r.size_band);

  if (band && finite(band.sample_size) && band.sample_size >= 5 && finite(band.median_mvic_to_sde)) {
    return {
      median: finite(band.median_mvic_to_sde),
      p25: finite(band.p25_mvic_to_sde),
      p75: finite(band.p75_mvic_to_sde),
      sampleSize: finite(band.sample_size),
      basis: "industry_size_matched",
    };
  }
  if (national && finite(national.sample_size) && national.sample_size >= 10 && finite(national.median_mvic_to_sde)) {
    return {
      median: finite(national.median_mvic_to_sde),
      p25: finite(national.p25_mvic_to_sde),
      p75: finite(national.p75_mvic_to_sde),
      sampleSize: finite(national.sample_size),
      basis: "industry_national",
    };
  }
  return { median: null, p25: null, p75: null, sampleSize: null, basis: "unavailable" };
}

// ── Listing side (industry_listing_benchmarks) — raw multiple only ───────────
async function readListing(
  supabase: SupabaseClient,
  industry: string,
  state: string | null,
  revenue: number,
): Promise<{ multiple: number | null; sampleSize: number | null; basis: ListingBasis }> {
  const sizeBand = getSizeBand(revenue);
  const pick = (d: any, basis: ListingBasis, min: number) =>
    d && finite(d.sample_size) && d.sample_size >= min && finite(d.median_multiple)
      ? { multiple: finite(d.median_multiple), sampleSize: finite(d.sample_size), basis }
      : null;

  if (state) {
    const { data } = await supabase.from("industry_listing_benchmarks")
      .select("median_multiple, sample_size").eq("industry_key", industry).eq("state", state).eq("size_band", sizeBand).single();
    const hit = pick(data, "state_size_matched", 5); if (hit) return hit;
  }
  {
    const { data } = await supabase.from("industry_listing_benchmarks")
      .select("median_multiple, sample_size").eq("industry_key", industry).is("state", null).eq("size_band", sizeBand).single();
    const hit = pick(data, "national_size_matched", 5); if (hit) return hit;
  }
  if (state) {
    const { data } = await supabase.from("industry_listing_benchmarks")
      .select("median_multiple, sample_size").eq("industry_key", industry).eq("state", state).is("size_band", null).single();
    const hit = pick(data, "state", 5); if (hit) return hit;
  }
  {
    const { data } = await supabase.from("industry_listing_benchmarks")
      .select("median_multiple, sample_size").eq("industry_key", industry).is("state", null).is("size_band", null).single();
    const hit = pick(data, "national", 3); if (hit) return hit;
  }
  return { multiple: null, sampleSize: null, basis: "unavailable" };
}

// ── Days on market (industry_transaction_benchmarks) — raw figure only ───────
async function readDaysOnMarket(
  supabase: SupabaseClient,
  industry: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("industry_transaction_benchmarks")
    .select("median_days_on_market, reported_sales")
    .eq("industry_key", industry)
    .order("reported_sales", { ascending: false });
  if (error || !data || data.length === 0) return null;

  // Reported-sales-weighted average of days-on-market (raw arithmetic only).
  let sum = 0, w = 0;
  for (const r of data as any[]) {
    if (finite(r.median_days_on_market) && finite(r.reported_sales) && r.reported_sales > 0) {
      sum += r.median_days_on_market * r.reported_sales;
      w += r.reported_sales;
    }
  }
  if (w > 0) return Math.round(sum / w);
  const primary = (data as any[])[0];
  return finite(primary?.median_days_on_market);
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function readMarketFacts(
  supabase: SupabaseClient,
  deal: { industry: string | null; revenue: number | null; sde: number | null; asking_price: number | null; state?: string | null },
): Promise<MarketFacts> {
  const industry = (deal.industry ?? "").trim();
  const revenue = finite(deal.revenue);
  const sde = finite(deal.sde);
  const asking = finite(deal.asking_price);
  const state = deal.state ?? null;

  if (!industry || revenue == null) return EMPTY_FACTS;

  const dealMultiple = sde != null && sde !== 0 && asking != null ? +(asking / sde).toFixed(2) : null;

  const [closed, listing, dom] = await Promise.all([
    readClosedComps(supabase, industry, revenue),
    readListing(supabase, industry, state, revenue),
    readDaysOnMarket(supabase, industry),
  ]);

  // Deal-vs-closed position — factual quartile placement, computed from raw
  // multiples. NOT a verdict (no "overpriced"); just where the number sits.
  let position: MarketFacts["deal_vs_closed_position"] = null;
  if (dealMultiple != null && closed.median != null) {
    const p25 = closed.p25, p75 = closed.p75, med = closed.median;
    if (p25 != null && dealMultiple < p25) position = "below_p25";
    else if (p25 != null && dealMultiple < med) position = "between_p25_median";
    else if (p75 != null && dealMultiple <= p75) position = "between_median_p75";
    else if (p75 != null && dealMultiple > p75) position = "above_p75";
    else position = dealMultiple < med ? "between_p25_median" : "between_median_p75";
  }

  // Listing-vs-closed gap — raw multiples only.
  let gap: number | null = null;
  if (listing.multiple != null && closed.median != null && closed.median !== 0) {
    gap = +(((listing.multiple - closed.median) / closed.median) * 100).toFixed(1);
  }

  return {
    deal_multiple: dealMultiple,
    closed_comp_median: closed.median,
    closed_comp_p25: closed.p25,
    closed_comp_p75: closed.p75,
    closed_comp_sample_size: closed.sampleSize,
    closed_comp_basis: closed.basis,
    deal_vs_closed_position: position,
    listing_multiple: listing.multiple,
    listing_basis: listing.basis,
    listing_vs_closed_gap_pct: gap,
    median_days_on_market: dom,
    evidence_depth: {
      closed_comp_sample_size: closed.sampleSize,
      listing_sample_size: listing.sampleSize,
    },
  };
}
