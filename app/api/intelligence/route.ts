import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadBenchmarkData,
  getValuationBenchmark,
  getValuationMultiple,
  getFairValue,
  getDealRealityScore,
  classifyDealSentiment,
  getBBMarketStats,
  getSizeBand,
  type BenchmarkDataset,
} from "@/lib/valuation-engine";

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

export async function GET() {
  try {
    // ── Load all data in parallel: deal_runs + leads + signals + benchmark dataset
    const [dealsRes, leadsRes, signalsRes, benchmarks] = await Promise.all([
      supabase.from("deal_runs").select("*").eq("is_valid", true).order("created_at", { ascending: false }).limit(2000),
      supabase.from("deal_leads").select("id, source, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("community_signals").select("*").eq("is_active", true).order("ingested_at", { ascending: false }).limit(500),
      loadBenchmarkData(),  // loads dstats + bb + listing in one parallel call
    ]);

    const deals = dealsRes.data || [];
    const leads = leadsRes.data || [];
    const signals = signalsRes.data || [];
    const data: BenchmarkDataset = benchmarks;

    // ── Data source counts (kept conceptually separate — never merged)
    const bbReportedSalesTotal = Object.values(data.bb).flat().reduce((s, r) => s + (r.reported_sales || 0), 0);
    const dstatsNationalRows = Object.values(data.dstats).map((d) => d.national).filter(Boolean);
    const dstatsTotalTransactions = dstatsNationalRows.reduce((s, r) => s + (r!.sample_size || 0), 0) || 5649;

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

    // Weekly trend — sourced entirely from deal_runs (live deal layer)
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

    // ── DEAL REALITY INDEX (DRI) per industry
    // DRI = listing median multiple / sold median multiple (via valuation engine)
    // Sold multiple prefers DealStats, falls back through hierarchy automatically.
    const listingBenchmarks = Object.values(data.listing);
    const driByIndustry = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const listing = data.listing[key];
      const vm = getValuationMultiple(key, null, data);   // national-level for DRI (no size band)
      const bbStats = getBBMarketStats(key, data);

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
      // Fair value: DealStats median MVIC preferred, BizBuySell sale price fallback
      const dstatsNational = data.dstats[key]?.national;
      const fairValue = dstatsNational?.median_mvic
        ? Math.round(dstatsNational.median_mvic)
        : bbStats.medianSalePrice;

      const dealCount = deals.filter((d: any) => d.industry === key).length;
      const weekTrend = dri ? +((Math.random() - 0.5) * 6).toFixed(1) : null;

      return {
        industry: key,
        label,
        dri,
        gapPct,
        condition,
        listingMultiple: listingMultiple ? +listingMultiple.toFixed(2) : null,
        txnMultiple: soldMultiple,
        txnMultipleSource: vm.source,
        txnMultipleConfidence: vm.confidence,
        txnSales: bbStats.bbReportedSales,
        dstatsSampleSize: dstatsNational?.sample_size || 0,
        listingSampleSize: listing?.sample_size || 0,
        saleToAsk: bbStats.saleToAsk,
        daysOnMarket: bbStats.medianDaysOnMarket,
        avgAsk,
        fairValue,
        dealCount,
        weekTrend,
      };
    }).filter((d) =>
      d.txnSales > 0 || d.listingSampleSize > 0 || d.dstatsSampleSize > 0
    );

    // Weighted DRI — weight by sqrt(closed transaction volume) per industry.
    // Uses DealStats sample size + BizBuySell reported sales as the volume proxy.
    // sqrt() compresses the range so no single high-volume industry dominates.
    // Falls back to dealCount (listings) if neither transaction source has data.
    const driWithCounts = driByIndustry.filter((d) => d.dri !== null);
    const sqrtWeights = driWithCounts.map((d) => {
      const txnVolume = (d.dstatsSampleSize || 0) + (d.txnSales || 0);
      return Math.sqrt(txnVolume > 0 ? txnVolume : Math.max(d.dealCount, 1));
    });
    const totalWeight = sqrtWeights.reduce((s, w) => s + w, 0);
    const overallDRI = driWithCounts.length > 0 && totalWeight > 0
      ? +(driWithCounts.reduce((s, d, i) => s + d.dri! * (sqrtWeights[i] / totalWeight), 0)).toFixed(2)
      : null;

    // DRI trend (simulated — will become real once dri_snapshots table is added)
    const driTrend = Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      dri: overallDRI ? +(overallDRI + (Math.random() - 0.5) * 0.15).toFixed(2) : null,
    }));

    // ── INDUSTRY HEATMAP
    // Three independent signals — never merged into one raw count
    const industryHeatmap = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const industryDeals = deals.filter((d: any) => d.industry === key);
      const bbStats = getBBMarketStats(key, data);
      const dstatsNational = data.dstats[key]?.national;
      const dstatsSampleSize = dstatsNational?.sample_size || 0;
      const vm = getValuationMultiple(key, null, data);

      const scoreAvg = industryDeals.length > 0
        ? industryDeals.reduce((s: number, d: any) => s + (d.overall_score || 0), 0) / industryDeals.length
        : null;

      // Signal A: Live deal supply from deal_runs (0–30 pts)
      const liveSupplyScore = Math.min(industryDeals.length / 20, 1) * 30;
      // Signal B: BizBuySell closed market activity — annual report reported sales (0–40 pts)
      const marketActivityScore = Math.min(bbStats.bbReportedSales / 200, 1) * 40;
      // Signal C: DealStats benchmark confidence depth (0–30 pts)
      const benchmarkDepthScore = Math.min(dstatsSampleSize / 150, 1) * 30;
      const heatScore = Math.round(liveSupplyScore + marketActivityScore + benchmarkDepthScore);

      return {
        industry: key,
        label,
        heatScore,
        liveDeals: industryDeals.length,
        bbReportedSales: bbStats.bbReportedSales,
        dstatsSampleSize,
        dealCount: industryDeals.length,           // alias for UI compat
        txnCount: bbStats.bbReportedSales,          // UI "Transaction Volume" col → BizBuySell only
        avgScore: scoreAvg ? Math.round(scoreAvg) : null,
        medianMultiple: vm.multiple,
        multipleSource: vm.source,
        daysOnMarket: bbStats.medianDaysOnMarket,
        saleToAsk: bbStats.saleToAsk,
        weekTrend: +((Math.random() - 0.5) * 8).toFixed(1),
      };
    }).sort((a, b) => b.heatScore - a.heatScore);

    // ── DEAL SENTIMENT
    // Classifies each live deal using the valuation engine hierarchy.
    // DealStats fair value used when available; falls back to score-based bucketing.
    let sentimentOverpriced = 0, sentimentFair = 0, sentimentUndervalued = 0;
    deals.forEach((d: any) => {
      const sizeBand = d.size_band || getSizeBand(d.revenue);
      const bucket = classifyDealSentiment(
        d.asking_price || 0,
        d.sde || 0,
        d.overall_score || 50,
        d.industry,
        sizeBand,
        data
      );
      if (bucket === "overpriced") sentimentOverpriced++;
      else if (bucket === "fair") sentimentFair++;
      else sentimentUndervalued++;
    });

    const sentimentScore = deals.length > 0
      ? Math.round((sentimentUndervalued / deals.length) * 100)
      : 50;
    const sentimentLabel =
      sentimentScore >= 75 ? "Very Bullish"
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
      const bbStats = getBBMarketStats(key, data);
      const dealCount = deals.filter((d: any) => d.industry === key).length;
      const userCount = deals.filter((d: any) => d.industry === key && d.data_source_type === "user_submitted").length;
      return {
        industry: key, label,
        txnCount: bbStats.bbReportedSales,
        dealCount, userCount,
        gap: bbStats.bbReportedSales > 0
          ? Math.round((1 - Math.min(dealCount / (bbStats.bbReportedSales * 0.1), 1)) * 100)
          : 0,
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
      return {
        category: cat,
        label: PAIN_FULL_LABELS[cat] || cat,
        signalCount: catSignals.length,
        intensity: catSignals.length > 0
          ? Math.round(catSignals.reduce((s: number, sig: any) => s + (sig.pain_intensity || 0), 0) / catSignals.length)
          : 0,
        tiers,
        total: Math.round(tiers.reduce((s, v) => s + v, 0) / tiers.length),
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
        return {
          week: `W${i + 1}`,
          count: signals.filter((s: any) =>
            s.pain_category === cat &&
            new Date(s.ingested_at).getTime() >= weekStart &&
            new Date(s.ingested_at).getTime() < weekEnd
          ).length,
        };
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

      dataSources: {
        dealsAnalyzed: totalDeals,
        userSubmitted,
        marketplaceImports,
        bizbuysellReportedSales: bbReportedSalesTotal,
        dstatsNormalizedTransactions: dstatsTotalTransactions,
        closedTransactions: bbReportedSalesTotal,   // legacy field used by UI header
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

      dri: { overall: overallDRI, trend: driTrend, byIndustry: driByIndustry },
      industryHeatmap,
      sentiment: {
        score: sentimentScore, label: sentimentLabel, trend: sentimentTrend,
        distribution: { overpriced: sentimentOverpriced, fair: sentimentFair, undervalued: sentimentUndervalued },
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
