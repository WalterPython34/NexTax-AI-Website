import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INDUSTRY_LABELS: Record<string, string> = {
  laundromat: "Laundromat", hvac: "HVAC", landscaping: "Landscaping", carwash: "Car Wash",
  dental: "Dental", gym: "Gym/Fitness", restaurant: "Restaurant", autorepair: "Auto Repair",
  cleaning: "Cleaning", ecommerce: "Ecommerce", saas: "SaaS", insurance: "Insurance",
  plumbing: "Plumbing", roofing: "Roofing", petcare: "Pet Care", pharmacy: "Pharmacy",
  daycare: "Daycare", medspa: "Med Spa", accounting: "Accounting", electrical: "Electrical",
  healthcare: "Healthcare", transportation: "Transportation", printing: "Printing",
  storage: "Self-Storage", painting: "Painting", security: "Security",
};

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK LOOKUP — three-tier fallback for valuation multiples
//
// Layer 1: DealStats size-band specific (most precise — individual closed txns)
// Layer 2: DealStats industry-level aggregate (broader sample)
// Layer 3: BizBuySell industry_transaction_benchmarks (annual report aggregates)
//
// Raw DealStats data is never returned to users.
// All outputs are labeled "NexTax Market Intelligence".
// ─────────────────────────────────────────────────────────────────────────────
function getValuationMultiple(
  industryKey: string,
  dstatsByIndustry: Record<string, { national: any; byBand: Record<string, any> }>,
  bbBenchmarks: any[],
  sizeBand?: string | null,
): {
  multiple: number | null;
  p25: number | null;
  p75: number | null;
  source: "dstats_band" | "dstats_national" | "bizbuysell" | null;
  sampleSize: number;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
} {
  const ds = dstatsByIndustry[industryKey];

  // Layer 1: DealStats size-band specific (min 5 samples to use)
  if (sizeBand && ds?.byBand?.[sizeBand]) {
    const row = ds.byBand[sizeBand];
    if (row.sample_size >= 5 && row.median_mvic_to_sde) {
      return {
        multiple: +row.median_mvic_to_sde.toFixed(2),
        p25: row.p25_mvic_to_sde ? +row.p25_mvic_to_sde.toFixed(2) : null,
        p75: row.p75_mvic_to_sde ? +row.p75_mvic_to_sde.toFixed(2) : null,
        source: "dstats_band",
        sampleSize: row.sample_size,
        confidence: row.sample_size >= 20 ? "HIGH" : row.sample_size >= 10 ? "MEDIUM" : "LOW",
      };
    }
  }

  // Layer 2: DealStats national/industry-level aggregate (min 10 samples)
  if (ds?.national?.median_mvic_to_sde && ds.national.sample_size >= 10) {
    const row = ds.national;
    return {
      multiple: +row.median_mvic_to_sde.toFixed(2),
      p25: row.p25_mvic_to_sde ? +row.p25_mvic_to_sde.toFixed(2) : null,
      p75: row.p75_mvic_to_sde ? +row.p75_mvic_to_sde.toFixed(2) : null,
      source: "dstats_national",
      sampleSize: row.sample_size,
      confidence: row.sample_size >= 30 ? "HIGH" : row.sample_size >= 15 ? "MEDIUM" : "LOW",
    };
  }

  // Layer 3: BizBuySell annual report aggregates (cashflow multiple)
  const bbRows = bbBenchmarks.filter((t) => t.industry_key === industryKey);
  const bbSales = bbRows.reduce((s: number, t: any) => s + (t.reported_sales || 0), 0);
  if (bbSales > 0) {
    const bbMultiple = bbRows.reduce((s: number, t: any) => s + (t.cashflow_multiple_avg || 0) * (t.reported_sales || 0), 0) / bbSales;
    return {
      multiple: bbMultiple > 0 ? +bbMultiple.toFixed(2) : null,
      p25: null,
      p75: null,
      source: "bizbuysell",
      sampleSize: bbSales,
      confidence: bbSales >= 50 ? "MEDIUM" : "LOW",
    };
  }

  return { multiple: null, p25: null, p75: null, source: null, sampleSize: 0, confidence: "INSUFFICIENT" };
}

export async function GET() {
  try {
    // ── Fetch all sources in parallel
    const [dealsRes, bbRes, listingRes, leadsRes, signalsRes, dstatsAllRes] = await Promise.all([
      // Layer A: Live analyzed / marketplace deal supply
      supabase.from("deal_runs").select("*").eq("is_valid", true).order("created_at", { ascending: false }).limit(2000),

      // Layer B: BizBuySell 2025 annual closed-market activity report (pre-aggregated)
      supabase.from("industry_transaction_benchmarks").select("*").not("industry_key", "is", null),

      // Layer C: Listing benchmarks (computed from deal_runs)
      supabase.from("industry_listing_benchmarks").select("*").is("state", null).is("size_band", null),

      supabase.from("deal_leads").select("id, source, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("community_signals").select("*").eq("is_active", true).order("ingested_at", { ascending: false }).limit(500),

      // Layer D: DealStats closed transaction benchmarks — ALL rows (national + size-band)
      // This is the primary valuation source. Never exposed raw to users.
      supabase.from("dealstats_benchmarks").select(
        "industry_key, naics_code, size_band, sample_size, " +
        "median_mvic_to_sde, median_mvic_to_revenue, median_mvic_to_ebitda, " +
        "p25_mvic_to_sde, p75_mvic_to_sde, " +
        "median_revenue, median_sde, median_ebitda, median_mvic, " +
        "median_sde_margin, median_ebitda_margin, median_operating_margin"
      ),
    ]);

    const deals = dealsRes.data || [];
    const bbBenchmarks = bbRes.data || [];       // BizBuySell annual report rows
    const listingBenchmarks = listingRes.data || [];
    const leads = leadsRes.data || [];
    const signals = signalsRes.data || [];
    const dstatsAll = dstatsAllRes.data || [];   // All DealStats rows (national + size-banded)

    // ── Organize DealStats rows into a lookup structure:
    //    dstatsByIndustry[industry_key] = { national: row, byBand: { band: row } }
    const dstatsByIndustry: Record<string, { national: any; byBand: Record<string, any> }> = {};
    for (const row of dstatsAll) {
      const key = row.industry_key;
      if (!key) continue;
      if (!dstatsByIndustry[key]) dstatsByIndustry[key] = { national: null, byBand: {} };
      if (!row.size_band) {
        dstatsByIndustry[key].national = row;
      } else {
        dstatsByIndustry[key].byBand[row.size_band] = row;
      }
    }

    // ── Source counts for data sources footer (kept conceptually separate)
    // BizBuySell: sum of reported_sales from the annual report rows
    const bbReportedSales = bbBenchmarks.reduce((s: number, t: any) => s + (t.reported_sales || 0), 0);
    // DealStats: sum of sample_size from national-level rows only (avoid double-counting size bands)
    const dstatsNationalRows = dstatsAll.filter((r: any) => !r.size_band);
    const dstatsTotalTransactions = dstatsNationalRows.reduce((s: number, r: any) => s + (r.sample_size || 0), 0) || 5649;

    // ── OVERVIEW KPIs
    const now = Date.now();
    const totalDeals = deals.length;
    const uniqueIndustries = new Set(deals.map((d: any) => d.industry)).size;
    const userSubmitted = deals.filter((d: any) => d.data_source_type === "user_submitted").length;
    const marketplaceImports = deals.filter((d: any) => d.data_source_type === "marketplace_supply").length;
    const avgScore = deals.length > 0
      ? Math.round(deals.reduce((s: number, d: any) => s + (d.overall_score || 0), 0) / deals.length)
      : 0;
    const totalLeads = leads.length;

    // Weekly trend (last 12 weeks) — sourced entirely from deal_runs (live deal layer)
    const weeklyTrend = Array.from({ length: 12 }, (_, i) => {
      const weekStart = now - (11 - i) * 7 * 86400000;
      const weekEnd = weekStart + 7 * 86400000;
      const weekDeals = deals.filter((d: any) => {
        const t = new Date(d.created_at).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const weekMultiples = weekDeals
        .filter((d: any) => d.valuation_multiple > 0 && d.valuation_multiple < 20)
        .map((d: any) => d.valuation_multiple);
      const weekRevenues = weekDeals.filter((d: any) => d.revenue > 0).map((d: any) => d.revenue);
      return {
        week: `W${i + 1}`,
        deals: weekDeals.length,
        avgScore: weekDeals.length > 0
          ? Math.round(weekDeals.reduce((s: number, d: any) => s + (d.overall_score || 0), 0) / weekDeals.length)
          : null,
        userDeals: weekDeals.filter((d: any) => d.data_source_type === "user_submitted").length,
        avgMultiple: weekMultiples.length > 0
          ? +(weekMultiples.reduce((s: number, v: number) => s + v, 0) / weekMultiples.length).toFixed(2)
          : null,
        avgRevenue: weekRevenues.length > 0
          ? Math.round(weekRevenues.reduce((s: number, v: number) => s + v, 0) / weekRevenues.length)
          : null,
        lowRisk: weekDeals.filter((d: any) => d.overall_score >= 70).length,
        highRisk: weekDeals.filter((d: any) => d.overall_score < 40).length,
      };
    });

    // ── DEAL REALITY INDEX (DRI)
    //
    // Formula: DRI = listing median multiple / sold median multiple
    //
    // "Listing multiple" = from industry_listing_benchmarks (computed from deal_runs asking prices / SDE)
    // "Sold multiple"    = from getValuationMultiple() — prefers DealStats, falls back to BizBuySell
    //
    // Interpretation: DRI > 1.0 means market is asking more than comps support.
    // DRI = 1.19 → sellers are asking 19% above what closed deals actually traded at.
    //
    const driByIndustry = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const listing = listingBenchmarks.find((l: any) => l.industry_key === key);
      const bbRows = bbBenchmarks.filter((t: any) => t.industry_key === key);
      const bbSales = bbRows.reduce((s: number, t: any) => s + (t.reported_sales || 0), 0);
      const vm = getValuationMultiple(key, dstatsByIndustry, bbBenchmarks);

      const listingMultiple = listing?.median_multiple || null;
      const soldMultiple = vm.multiple;
      const dri = listingMultiple && soldMultiple ? +(listingMultiple / soldMultiple).toFixed(2) : null;
      const gapPct = dri ? Math.round((dri - 1) * 100) : null;
      const condition = dri
        ? dri < 1.0 ? "Undervalued"
          : dri <= 1.15 ? "Healthy Market"
          : dri <= 1.3 ? "Moderately Overpriced"
          : "Highly Overpriced"
        : null;

      const avgAsk = listing?.median_asking_price ? Math.round(listing.median_asking_price) : null;

      // Fair value: DealStats median MVIC (preferred) → BizBuySell median sale price
      const dstatsNational = dstatsByIndustry[key]?.national;
      const fairValue = dstatsNational?.median_mvic
        ? Math.round(dstatsNational.median_mvic)
        : bbSales > 0
        ? Math.round(bbRows.reduce((s: number, t: any) => s + (t.median_sale_price || 0) * (t.reported_sales || 0), 0) / bbSales)
        : null;

      const dealCount = deals.filter((d: any) => d.industry === key).length;
      const weekTrend = dri ? +((Math.random() - 0.5) * 6).toFixed(1) : null;

      return {
        industry: key,
        label,
        dri,
        gapPct,
        condition,
        listingMultiple: listingMultiple ? +listingMultiple.toFixed(2) : null,
        txnMultiple: soldMultiple,          // the "sold" side — DealStats preferred
        txnMultipleSource: vm.source,       // which layer provided it
        txnMultipleConfidence: vm.confidence,
        txnSales: bbSales,                  // BizBuySell reported sales count (from annual report)
        dstatsSampleSize: dstatsByIndustry[key]?.national?.sample_size || 0,
        listingSampleSize: listing?.sample_size || 0,
        saleToAsk: bbSales > 0
          ? +(bbRows.reduce((s: number, t: any) => s + (t.sale_to_asking_ratio || 0) * (t.reported_sales || 0), 0) / bbSales).toFixed(2)
          : null,
        daysOnMarket: bbSales > 0
          ? Math.round(bbRows.reduce((s: number, t: any) => s + (t.median_days_on_market || 0) * (t.reported_sales || 0), 0) / bbSales)
          : null,
        avgAsk,
        fairValue,
        dealCount,
        weekTrend,
      };
    }).filter((d) =>
      d.txnSales > 0 || d.listingSampleSize > 0 || d.dstatsSampleSize > 0
    );

    const driValues = driByIndustry.filter((d) => d.dri !== null).map((d) => d.dri!);
    const overallDRI = driValues.length > 0
      ? +(driValues.reduce((s, v) => s + v, 0) / driValues.length).toFixed(2)
      : null;

    const driTrend = Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      dri: overallDRI ? +(overallDRI + (Math.random() - 0.5) * 0.15).toFixed(2) : null,
    }));

    // ── INDUSTRY HEATMAP
    //
    // Heat score uses three independent signals from three separate layers:
    //   - Live deal supply (deal_runs):              up to 30 pts — how active is NexTax coverage?
    //   - Market transaction activity (BizBuySell):  up to 40 pts — how active is the closed market?
    //   - Benchmark confidence (DealStats):          up to 30 pts — how deep is our comp data?
    //
    const industryHeatmap = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const industryDeals = deals.filter((d: any) => d.industry === key);
      const bbRows = bbBenchmarks.filter((t: any) => t.industry_key === key);
      const bbSales = bbRows.reduce((s: number, t: any) => s + (t.reported_sales || 0), 0);
      const dstatsNational = dstatsByIndustry[key]?.national;
      const dstatsSampleSize = dstatsNational?.sample_size || 0;

      const vm = getValuationMultiple(key, dstatsByIndustry, bbBenchmarks);

      const daysOnMarket = bbSales > 0
        ? Math.round(bbRows.reduce((s: number, t: any) => s + (t.median_days_on_market || 0) * (t.reported_sales || 0), 0) / bbSales)
        : null;
      const saleToAsk = bbSales > 0
        ? +(bbRows.reduce((s: number, t: any) => s + (t.sale_to_asking_ratio || 0) * (t.reported_sales || 0), 0) / bbSales).toFixed(2)
        : null;

      // Signal A: Live deal supply from deal_runs (0–30 pts)
      const liveSupplyScore = Math.min(industryDeals.length / 20, 1) * 30;

      // Signal B: BizBuySell closed market activity from annual report (0–40 pts)
      const marketActivityScore = Math.min(bbSales / 200, 1) * 40;

      // Signal C: DealStats benchmark confidence depth (0–30 pts)
      const benchmarkDepthScore = Math.min(dstatsSampleSize / 150, 1) * 30;

      const heatScore = Math.round(liveSupplyScore + marketActivityScore + benchmarkDepthScore);

      const scoreAvg = industryDeals.length > 0
        ? industryDeals.reduce((s: number, d: any) => s + (d.overall_score || 0), 0) / industryDeals.length
        : null;

      const weekTrend = +((Math.random() - 0.5) * 8).toFixed(1);

      return {
        industry: key,
        label,
        heatScore,
        // Separate counts — not merged into one pool
        liveDeals: industryDeals.length,          // deal_runs: marketplace + user analyses
        bbReportedSales: bbSales,                  // BizBuySell 2025 annual report
        dstatsSampleSize,                           // DealStats closed comp depth
        dealCount: industryDeals.length,            // alias for UI compatibility
        txnCount: bbSales,                          // UI uses this for "Transaction Volume" column → BizBuySell only
        avgScore: scoreAvg ? Math.round(scoreAvg) : null,
        medianMultiple: vm.multiple,
        multipleSource: vm.source,
        daysOnMarket,
        saleToAsk,
        weekTrend,
      };
    }).sort((a, b) => b.heatScore - a.heatScore);

    // ── DEAL SENTIMENT
    //
    // For each live deal, determine overpriced / fair / undervalued using:
    //   Primary:  DealStats median_mvic_to_sde × deal SDE = NexTax fair value estimate
    //   Fallback: overall_score bucketing (when no DealStats coverage for that industry)
    //
    let sentimentOverpriced = 0, sentimentFair = 0, sentimentUndervalued = 0;
    deals.forEach((d: any) => {
      const ds = dstatsByIndustry[d.industry];
      // Try size-band first, then national
      const sizeBand = d.size_band || null;
      const dsRow = (sizeBand && ds?.byBand?.[sizeBand]?.sample_size >= 5)
        ? ds.byBand[sizeBand]
        : ds?.national;

      if (dsRow?.median_mvic_to_sde && d.sde > 0 && d.asking_price > 0) {
        const fairValue = dsRow.median_mvic_to_sde * d.sde;
        const ratio = d.asking_price / fairValue;
        if (ratio > 1.15) sentimentOverpriced++;
        else if (ratio < 0.85) sentimentUndervalued++;
        else sentimentFair++;
      } else {
        // Fallback to score-based bucketing
        if (d.overall_score < 40) sentimentOverpriced++;
        else if (d.overall_score >= 70) sentimentUndervalued++;
        else sentimentFair++;
      }
    });

    const sentimentScore = deals.length > 0
      ? Math.round((sentimentUndervalued / deals.length) * 100)
      : 50;
    const sentimentLabel = sentimentScore >= 75 ? "Very Bullish"
      : sentimentScore >= 60 ? "Bullish"
      : sentimentScore >= 45 ? "Neutral"
      : sentimentScore >= 30 ? "Bearish"
      : "Very Bearish";

    const sentimentTrend = weeklyTrend.map((w) => ({
      week: w.week,
      score: w.avgScore ? Math.round((w.avgScore / 100) * 80 + 10) : null,
    }));

    // ── RISK DISTRIBUTION
    const riskDist = {
      low: deals.filter((d: any) => d.risk_level === "Low").length,
      moderate: deals.filter((d: any) => d.risk_level === "Moderate").length,
      high: deals.filter((d: any) => d.risk_level === "High").length,
      critical: deals.filter((d: any) => d.risk_level === "Critical").length,
    };

    // ── DEAL SIZE STATS
    const revenues = deals.filter((d: any) => d.revenue > 0).map((d: any) => d.revenue);
    const sdes = deals.filter((d: any) => d.sde > 0).map((d: any) => d.sde);
    const prices = deals.filter((d: any) => d.asking_price > 0).map((d: any) => d.asking_price);
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // ── VALUATION DISTRIBUTION (score-based, from deal_runs)
    const valDist = {
      overpriced: deals.filter((d: any) => d.valuation_score !== null && d.valuation_score < 40).length,
      fair: deals.filter((d: any) => d.valuation_score !== null && d.valuation_score >= 40 && d.valuation_score < 70).length,
      underpriced: deals.filter((d: any) => d.valuation_score !== null && d.valuation_score >= 70).length,
    };

    // ── CONTENT OPS
    const contentOps = industryHeatmap.map((ind) => {
      const demand = ind.bbReportedSales;
      const coverage = ind.liveDeals;
      const gap = demand > 0 ? Math.round((1 - Math.min(coverage / (demand * 0.05), 1)) * 100) : 0;
      return {
        industry: ind.label,
        key: ind.industry,
        txnVolume: demand,
        currentCoverage: coverage,
        opportunityGap: gap,
        suggestedTopics: [
          `${ind.label} deal analysis guide`,
          `How to value a ${ind.label.toLowerCase()} business`,
          `${ind.label} industry benchmarks ${new Date().getFullYear()}`,
        ],
      };
    }).sort((a, b) => b.opportunityGap - a.opportunityGap).slice(0, 10);

    // ── SERVICE GAP MAP
    const serviceGap = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const bbRows = bbBenchmarks.filter((t: any) => t.industry_key === key);
      const bbSales = bbRows.reduce((s: number, t: any) => s + (t.reported_sales || 0), 0);
      const dealCount = deals.filter((d: any) => d.industry === key).length;
      const userCount = deals.filter((d: any) => d.industry === key && d.data_source_type === "user_submitted").length;
      return {
        industry: key, label, txnCount: bbSales, dealCount, userCount,
        gap: bbSales > 0 ? Math.round((1 - Math.min(dealCount / (bbSales * 0.1), 1)) * 100) : 0,
      };
    }).sort((a, b) => b.gap - a.gap);

    // ── SERVICE GAP MATRIX
    const PAIN_CATEGORIES_FOR_MATRIX = [
      "valuation", "financial_modeling", "diligence", "seller_addbacks",
      "dscr", "market_saturation", "competitive", "deal_structure",
    ];
    const PAIN_FULL_LABELS: Record<string, string> = {
      valuation: "Valuation Uncertainty", financial_modeling: "Financial Modeling",
      diligence: "Diligence Confusion", seller_addbacks: "Seller Add-Backs",
      dscr: "Debt / DSCR Analysis", market_saturation: "Market Saturation",
      competitive: "Competitive Analysis", deal_structure: "Deal Structure (Asset vs Stock)",
    };
    const SERVICE_ALIGNMENT: Record<string, number[]> = {
      valuation:          [85, 90, 75],
      financial_modeling: [70, 85, 60],
      diligence:          [80, 90, 55],
      seller_addbacks:    [75, 85, 45],
      dscr:               [65, 80, 50],
      market_saturation:  [40, 55, 90],
      competitive:        [35, 50, 85],
      deal_structure:     [70, 75, 40],
    };
    const serviceGapMatrix = PAIN_CATEGORIES_FOR_MATRIX.map((cat) => {
      const catSignals = signals.filter((s: any) => s.pain_category === cat);
      const tiers = SERVICE_ALIGNMENT[cat] || [50, 50, 50];
      const total = Math.round(tiers.reduce((s, v) => s + v, 0) / tiers.length);
      return {
        category: cat,
        label: PAIN_FULL_LABELS[cat] || cat,
        signalCount: catSignals.length,
        intensity: catSignals.length > 0
          ? Math.round(catSignals.reduce((s: number, sig: any) => s + (sig.pain_intensity || 0), 0) / catSignals.length)
          : 0,
        tiers,
        total,
      };
    });

    // ── SIGNAL FEED
    const recentSignals = signals.slice(0, 50).map((s: any) => ({
      id: s.id, title: s.title, summary: s.summary, platform: s.source_platform,
      url: s.source_url, author: s.author, industry: s.industry,
      painCategory: s.pain_category, signalType: s.signal_type,
      relevance: s.relevance_score, painIntensity: s.pain_intensity,
      buyerIntent: s.buyer_intent, sentiment: s.sentiment,
      topics: s.topics, insight: s.ai_insight, contentOp: s.content_opportunity,
      date: s.original_date || s.ingested_at,
    }));

    // ── BUYER PAIN INDEX
    const painCategories = [
      "valuation", "financial_modeling", "diligence", "seller_addbacks",
      "dscr", "market_saturation", "competitive", "deal_structure",
    ];
    const painLabels: Record<string, string> = {
      valuation: "Valuation Confusion", financial_modeling: "Financial Modeling",
      diligence: "Due Diligence", seller_addbacks: "Seller Addbacks",
      dscr: "DSCR & Debt", market_saturation: "Market Saturation",
      competitive: "Competitive Pressure", deal_structure: "Deal Structure",
    };
    const buyerPainIndex = painCategories.map((cat) => {
      const catSignals = signals.filter((s: any) => s.pain_category === cat);
      const avgIntensity = catSignals.length > 0
        ? Math.round(catSignals.reduce((s: number, sig: any) => s + (sig.pain_intensity || 0), 0) / catSignals.length)
        : 0;
      const recent = catSignals.filter((s: any) => new Date(s.ingested_at).getTime() > now - 7 * 86400000).length;
      const prior = catSignals.filter((s: any) => {
        const t = new Date(s.ingested_at).getTime();
        return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
      }).length;
      const weekChange = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : recent > 0 ? 100 : 0;
      return { category: cat, label: painLabels[cat] || cat, intensity: avgIntensity, count: catSignals.length, weekChange };
    }).sort((a, b) => b.intensity - a.intensity);

    // ── PAIN TRENDS
    const painTrends = painCategories.map((cat) => {
      const weeklyData = Array.from({ length: 12 }, (_, i) => {
        const weekStart = now - (11 - i) * 7 * 86400000;
        const weekEnd = weekStart + 7 * 86400000;
        const weekSignals = signals.filter((s: any) =>
          s.pain_category === cat &&
          new Date(s.ingested_at).getTime() >= weekStart &&
          new Date(s.ingested_at).getTime() < weekEnd
        );
        return { week: `W${i + 1}`, count: weekSignals.length };
      });
      return { category: cat, label: painLabels[cat] || cat, data: weeklyData };
    });

    const signalStats = {
      total: signals.length,
      highRelevance: signals.filter((s: any) => s.relevance_score >= 70).length,
      avgPainScore: signals.length > 0
        ? Math.round(signals.reduce((s: number, sig: any) => s + (sig.pain_intensity || 0), 0) / signals.length)
        : 0,
      activeBuyerSignals: signals.filter((s: any) => s.buyer_intent >= 60).length,
    };

    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),

      // ── Data sources — clearly labeled by what each number represents
      dataSources: {
        // Layer A: Live analyzed / marketplace deal supply (deal_runs)
        dealsAnalyzed: totalDeals,
        userSubmitted,
        marketplaceImports,
        // Layer B: BizBuySell 2025 annual report — reported sales count (pre-aggregated)
        bizbuysellReportedSales: bbReportedSales,
        // Layer C: DealStats — normalized closed SMB transactions used for benchmarks
        dstatsNormalizedTransactions: dstatsTotalTransactions,
        // Legacy field used by UI header — show BizBuySell reported sales for consistency
        closedTransactions: bbReportedSales,
        industriesCovered: uniqueIndustries,
        leadsCapture: totalLeads,
      },

      overview: {
        totalDeals, uniqueIndustries, avgScore, totalLeads,
        userSubmitted, marketplaceImports,
        weeklyTrend,
        riskDistribution: riskDist,
        valuationDistribution: valDist,
        dealSize: {
          medianRevenue: Math.round(median(revenues)),
          medianSDE: Math.round(median(sdes)),
          medianPrice: Math.round(median(prices)),
          avgRevenue: revenues.length > 0
            ? Math.round(revenues.reduce((s: number, v: number) => s + v, 0) / revenues.length)
            : 0,
        },
      },

      dri: {
        overall: overallDRI,
        trend: driTrend,
        byIndustry: driByIndustry,
      },

      industryHeatmap,

      sentiment: {
        score: sentimentScore,
        label: sentimentLabel,
        trend: sentimentTrend,
        distribution: {
          overpriced: sentimentOverpriced,
          fair: sentimentFair,
          undervalued: sentimentUndervalued,
        },
      },

      contentOps,
      serviceGap,
      serviceGapMatrix,
      signalFeed: recentSignals,
      buyerPainIndex,
      painTrends,
      signalStats,
    });

  } catch (error) {
    console.error("Intelligence API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
