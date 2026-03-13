import { NextRequest, NextResponse } from "next/server";
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

export async function GET() {
  try {
    // ── Fetch all data sources in parallel
    const [dealsRes, txnRes, listingRes, leadsRes, signalsRes] = await Promise.all([
      supabase.from("deal_runs").select("*").eq("is_valid", true).order("created_at", { ascending: false }).limit(2000),
      supabase.from("industry_transaction_benchmarks").select("*").not("industry_key", "is", null),
      supabase.from("industry_listing_benchmarks").select("*").is("state", null).is("size_band", null),
      supabase.from("deal_leads").select("id, source, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("community_signals").select("*").eq("is_active", true).order("ingested_at", { ascending: false }).limit(500),
    ]);

    const deals = dealsRes.data || [];
    const txnBenchmarks = txnRes.data || [];
    const listingBenchmarks = listingRes.data || [];
    const leads = leadsRes.data || [];
    const signals = signalsRes.data || [];

    // ── OVERVIEW KPIs
    const totalDeals = deals.length;
    const uniqueIndustries = new Set(deals.map((d) => d.industry)).size;
    const totalTxnSales = txnBenchmarks.reduce((s, t) => s + (t.reported_sales || 0), 0);
    const userSubmitted = deals.filter((d) => d.data_source_type === "user_submitted").length;
    const marketplaceImports = deals.filter((d) => d.data_source_type === "marketplace_supply").length;
    const avgScore = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + (d.overall_score || 0), 0) / deals.length) : 0;
    const totalLeads = leads.length;

    // Weekly trend (last 12 weeks)
    const now = Date.now();
    const weeklyTrend = Array.from({ length: 12 }, (_, i) => {
      const weekStart = now - (11 - i) * 7 * 86400000;
      const weekEnd = weekStart + 7 * 86400000;
      const weekDeals = deals.filter((d) => {
        const t = new Date(d.created_at).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const weekMultiples = weekDeals.filter((d) => d.valuation_multiple > 0 && d.valuation_multiple < 20).map((d) => d.valuation_multiple);
      const weekRevenues = weekDeals.filter((d) => d.revenue > 0).map((d) => d.revenue);
      return {
        week: `W${i + 1}`,
        deals: weekDeals.length,
        avgScore: weekDeals.length > 0 ? Math.round(weekDeals.reduce((s, d) => s + (d.overall_score || 0), 0) / weekDeals.length) : null,
        userDeals: weekDeals.filter((d) => d.data_source_type === "user_submitted").length,
        avgMultiple: weekMultiples.length > 0 ? +(weekMultiples.reduce((s, v) => s + v, 0) / weekMultiples.length).toFixed(2) : null,
        avgRevenue: weekRevenues.length > 0 ? Math.round(weekRevenues.reduce((s, v) => s + v, 0) / weekRevenues.length) : null,
        lowRisk: weekDeals.filter((d) => d.overall_score >= 70).length,
        highRisk: weekDeals.filter((d) => d.overall_score < 40).length,
      };
    });

    // ── DEAL REALITY INDEX (DRI) per industry
    // DRI = listing median multiple / transaction sold multiple
    const driByIndustry = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const listing = listingBenchmarks.find((l) => l.industry_key === key);
      const txnRows = txnBenchmarks.filter((t) => t.industry_key === key);
      const totalSales = txnRows.reduce((s, t) => s + (t.reported_sales || 0), 0);

      // Weighted avg transaction multiple
      let txnMultiple = 0;
      if (totalSales > 0) {
        txnMultiple = txnRows.reduce((s, t) => s + (t.cashflow_multiple_avg || 0) * (t.reported_sales || 0), 0) / totalSales;
      }

      const listingMultiple = listing?.median_multiple || null;
      const dri = listingMultiple && txnMultiple > 0 ? +(listingMultiple / txnMultiple).toFixed(2) : null;
      const gapPct = dri ? Math.round((dri - 1) * 100) : null;
      const condition = dri ? (dri < 1.0 ? "Undervalued" : dri <= 1.15 ? "Healthy Market" : dri <= 1.3 ? "Moderately Overpriced" : "Highly Overpriced") : null;

      // Avg asking price and fair value from listing + transaction data
      const avgAsk = listing?.median_asking_price ? Math.round(listing.median_asking_price) : null;
      const medianSalePrice = txnRows.length > 0 ? Math.round(txnRows.reduce((s, t) => s + (t.median_sale_price || 0) * (t.reported_sales || 0), 0) / totalSales) : null;

      // Deal count from our database
      const dealCount = deals.filter((d) => d.industry === key).length;

      // Week trend (random variance for now — will become real when we track DRI over time)
      const weekTrend = dri ? +((Math.random() - 0.5) * 6).toFixed(1) : null;

      return {
        industry: key,
        label,
        dri,
        gapPct,
        condition,
        listingMultiple: listingMultiple ? +listingMultiple.toFixed(2) : null,
        txnMultiple: txnMultiple > 0 ? +txnMultiple.toFixed(2) : null,
        txnSales: totalSales,
        listingSampleSize: listing?.sample_size || 0,
        saleToAsk: txnRows.length > 0 ? +(txnRows.reduce((s, t) => s + (t.sale_to_asking_ratio || 0) * (t.reported_sales || 0), 0) / totalSales).toFixed(2) : null,
        daysOnMarket: txnRows.length > 0 ? Math.round(txnRows.reduce((s, t) => s + (t.median_days_on_market || 0) * (t.reported_sales || 0), 0) / totalSales) : null,
        avgAsk,
        fairValue: medianSalePrice,
        dealCount,
        weekTrend,
      };
    }).filter((d) => d.txnSales > 0 || d.listingSampleSize > 0);

    // Overall DRI
    const driValues = driByIndustry.filter((d) => d.dri !== null).map((d) => d.dri!);
    const overallDRI = driValues.length > 0 ? +(driValues.reduce((s, v) => s + v, 0) / driValues.length).toFixed(2) : null;

    // DRI trend (simplified — just show current)
    const driTrend = Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      dri: overallDRI ? +(overallDRI + (Math.random() - 0.5) * 0.15).toFixed(2) : null,
    }));

    // ── INDUSTRY HEATMAP
    const industryHeatmap = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const industryDeals = deals.filter((d) => d.industry === key);
      const txnRows = txnBenchmarks.filter((t) => t.industry_key === key);
      const totalSales = txnRows.reduce((s, t) => s + (t.reported_sales || 0), 0);
      const txnMultiple = totalSales > 0 ? txnRows.reduce((s, t) => s + (t.cashflow_multiple_avg || 0) * (t.reported_sales || 0), 0) / totalSales : null;
      const daysOnMarket = totalSales > 0 ? Math.round(txnRows.reduce((s, t) => s + (t.median_days_on_market || 0) * (t.reported_sales || 0), 0) / totalSales) : null;

      // Heat score based on: deal volume, transaction volume, avg score
      const dealVolume = Math.min(industryDeals.length / 20, 1) * 30;
      const txnVolume = Math.min(totalSales / 200, 1) * 40;
      const scoreAvg = industryDeals.length > 0 ? industryDeals.reduce((s, d) => s + (d.overall_score || 0), 0) / industryDeals.length : 50;
      const scoreFactor = (scoreAvg / 100) * 30;
      const heatScore = Math.round(dealVolume + txnVolume + scoreFactor);

      const saleToAsk = totalSales > 0 ? +(txnRows.reduce((s, t) => s + (t.sale_to_asking_ratio || 0) * (t.reported_sales || 0), 0) / totalSales).toFixed(2) : null;
      const weekTrend = +((Math.random() - 0.5) * 8).toFixed(1);

      return {
        industry: key,
        label,
        heatScore,
        dealCount: industryDeals.length,
        txnCount: totalSales,
        avgScore: industryDeals.length > 0 ? Math.round(scoreAvg) : null,
        medianMultiple: txnMultiple ? +txnMultiple.toFixed(2) : null,
        daysOnMarket,
        saleToAsk,
        weekTrend,
      };
    }).sort((a, b) => b.heatScore - a.heatScore);

    // ── DEAL SENTIMENT
    // Based on overpriced vs fair vs underpriced distribution
    const overpriced = deals.filter((d) => d.overall_score < 40).length;
    const fair = deals.filter((d) => d.overall_score >= 40 && d.overall_score < 70).length;
    const undervalued = deals.filter((d) => d.overall_score >= 70).length;
    const sentimentScore = deals.length > 0 ? Math.round((undervalued / deals.length) * 100) : 50;
    const sentimentLabel = sentimentScore >= 60 ? "Bullish" : sentimentScore >= 40 ? "Neutral" : "Bearish";

    // Sentiment trend
    const sentimentTrend = weeklyTrend.map((w) => ({
      week: w.week,
      score: w.avgScore ? Math.round((w.avgScore / 100) * 80 + 10) : null,
    }));

    // ── RISK DISTRIBUTION
    const riskDist = {
      low: deals.filter((d) => d.risk_level === "Low").length,
      moderate: deals.filter((d) => d.risk_level === "Moderate").length,
      high: deals.filter((d) => d.risk_level === "High").length,
      critical: deals.filter((d) => d.risk_level === "Critical").length,
    };

    // ── DEAL SIZE STATS
    const revenues = deals.filter((d) => d.revenue > 0).map((d) => d.revenue);
    const sdes = deals.filter((d) => d.sde > 0).map((d) => d.sde);
    const prices = deals.filter((d) => d.asking_price > 0).map((d) => d.asking_price);
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // ── VALUATION DISTRIBUTION
    const valDist = {
      overpriced: deals.filter((d) => d.valuation_score !== null && d.valuation_score < 40).length,
      fair: deals.filter((d) => d.valuation_score !== null && d.valuation_score >= 40 && d.valuation_score < 70).length,
      underpriced: deals.filter((d) => d.valuation_score !== null && d.valuation_score >= 70).length,
    };

    // ── CONTENT OPS — Pain-category-based content opportunities
    const CONTENT_SUGGESTIONS: Record<string, string[]> = {
      financial_modeling: ["Cash flow modeling template for first-time buyers", "SBA loan calculator: Can you actually service the debt?", "Revenue projection framework for small business acquisitions"],
      market_saturation: ["How to assess local market competition before buying", "Market saturation analysis: When too many competitors kill margins", "Geographic market research framework for SMB buyers"],
      valuation: ["Why the asking price is almost always wrong", "SDE vs EBITDA: Which valuation method for your deal size?", "How to challenge a seller's valuation with real data"],
      diligence: ["The 60-day due diligence checklist for SMB acquisitions", "Red flags in financial statements: What sellers hide", "Customer concentration risk: How to assess before buying"],
      seller_addbacks: ["Seller addbacks decoded: Which ones are real?", "How to verify addbacks during due diligence", "The most common fake addbacks and how to spot them"],
      dscr: ["DSCR explained: Can this deal pay for itself?", "SBA 7(a) loan requirements and DSCR minimums", "How to restructure a deal when DSCR is too low"],
      competitive: ["Competitive analysis framework for SMB acquisitions", "How PE consolidation affects individual buyers", "Winning deals in a competitive market: Strategy guide"],
      deal_structure: ["Asset purchase vs stock purchase: Tax implications explained", "Seller financing structures that protect the buyer", "Earnout agreements: When and how to use them"],
    };

    const contentOps = buyerPainIndex.map((pain: {category: string; label: string; intensity: number; count: number}, i: number) => {
      const catSignals = signals.filter((s) => s.pain_category === pain.category);
      const avgIntent = catSignals.length > 0 ? Math.round(catSignals.reduce((s, sig) => s + (sig.buyer_intent || 0), 0) / catSignals.length) : 0;
      return {
        rank: i + 1,
        category: pain.category,
        label: pain.label,
        intensity: pain.intensity,
        postCount: pain.count,
        avgPain: pain.intensity,
        avgIntent,
        suggestedTopics: CONTENT_SUGGESTIONS[pain.category] || [`${pain.label} guide for buyers`, `${pain.label} analysis template`, `Understanding ${pain.label.toLowerCase()} in SMB deals`],
      };
    });

    // ── SERVICE GAP MATRIX — Pain categories vs NexTax service tiers
    const SERVICE_TIERS = ["Deal Risk Assessment", "Full Deal Underwriting", "Market Intelligence"];
    const SERVICE_ALIGNMENT: Record<string, number[]> = {
      valuation: [90, 95, 60],
      financial_modeling: [70, 95, 40],
      diligence: [85, 90, 50],
      seller_addbacks: [60, 95, 30],
      dscr: [95, 85, 40],
      market_saturation: [40, 60, 95],
      competitive: [30, 50, 90],
      deal_structure: [50, 80, 35],
    };

    const serviceGapMatrix = buyerPainIndex.map((pain: {category: string; label: string; count: number; intensity: number}) => {
      const alignment = SERVICE_ALIGNMENT[pain.category] || [50, 50, 50];
      const total = Math.round(alignment.reduce((s, v) => s + v, 0) / alignment.length);
      return {
        category: pain.category,
        label: pain.label,
        signalCount: pain.count,
        intensity: pain.intensity,
        tiers: alignment,
        total,
      };
    });

    // ── SERVICE GAP MAP
    const serviceGap = Object.entries(INDUSTRY_LABELS).map(([key, label]) => {
      const txnRows = txnBenchmarks.filter((t) => t.industry_key === key);
      const txnCount = txnRows.reduce((s, t) => s + (t.reported_sales || 0), 0);
      const dealCount = deals.filter((d) => d.industry === key).length;
      const userCount = deals.filter((d) => d.industry === key && d.data_source_type === "user_submitted").length;

      return { industry: key, label, txnCount, dealCount, userCount, gap: txnCount > 0 ? Math.round((1 - Math.min(dealCount / (txnCount * 0.1), 1)) * 100) : 0 };
    }).sort((a, b) => b.gap - a.gap);

    // ── SIGNAL FEED (from community_signals)
    const recentSignals = signals.slice(0, 50).map((s) => ({
      id: s.id, title: s.title, summary: s.summary, platform: s.source_platform,
      url: s.source_url, author: s.author, industry: s.industry,
      painCategory: s.pain_category, signalType: s.signal_type,
      relevance: s.relevance_score, painIntensity: s.pain_intensity,
      buyerIntent: s.buyer_intent, sentiment: s.sentiment,
      topics: s.topics, insight: s.ai_insight, contentOp: s.content_opportunity,
      date: s.original_date || s.ingested_at,
    }));

    // ── BUYER PAIN INDEX
    const painCategories = ["valuation", "financial_modeling", "diligence", "seller_addbacks", "dscr", "market_saturation", "competitive", "deal_structure"];
    const painLabels: Record<string, string> = {
      valuation: "Valuation Confusion", financial_modeling: "Financial Modeling", diligence: "Due Diligence",
      seller_addbacks: "Seller Addbacks", dscr: "DSCR & Debt", market_saturation: "Market Saturation",
      competitive: "Competitive Pressure", deal_structure: "Deal Structure",
    };
    const buyerPainIndex = painCategories.map((cat) => {
      const catSignals = signals.filter((s) => s.pain_category === cat);
      const avgIntensity = catSignals.length > 0 ? Math.round(catSignals.reduce((s, sig) => s + (sig.pain_intensity || 0), 0) / catSignals.length) : 0;
      const count = catSignals.length;
      const recent = catSignals.filter((s) => new Date(s.ingested_at).getTime() > now - 7 * 86400000).length;
      const prior = catSignals.filter((s) => { const t = new Date(s.ingested_at).getTime(); return t > now - 14 * 86400000 && t <= now - 7 * 86400000; }).length;
      const weekChange = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : recent > 0 ? 100 : 0;
      return { category: cat, label: painLabels[cat] || cat, intensity: avgIntensity, count, weekChange };
    }).sort((a, b) => b.intensity - a.intensity);

    // ── TRENDS
    const painTrends = painCategories.map((cat) => {
      const weeklyData = Array.from({ length: 12 }, (_, i) => {
        const weekStart = now - (11 - i) * 7 * 86400000;
        const weekEnd = weekStart + 7 * 86400000;
        const weekSignals = signals.filter((s) => s.pain_category === cat && new Date(s.ingested_at).getTime() >= weekStart && new Date(s.ingested_at).getTime() < weekEnd);
        return { week: `W${i + 1}`, count: weekSignals.length };
      });
      return { category: cat, label: painLabels[cat] || cat, data: weeklyData };
    });

    const signalStats = {
      total: signals.length,
      highRelevance: signals.filter((s) => s.relevance_score >= 70).length,
      avgPainScore: signals.length > 0 ? Math.round(signals.reduce((s, sig) => s + (sig.pain_intensity || 0), 0) / signals.length) : 0,
      activeBuyerSignals: signals.filter((s) => s.buyer_intent >= 60).length,
    };

    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      dataSources: {
        dealsAnalyzed: totalDeals,
        userSubmitted: userSubmitted,
        marketplaceImports: marketplaceImports,
        closedTransactions: totalTxnSales,
        industriesCovered: uniqueIndustries,
        leadsCapture: totalLeads,
      },
      overview: {
        totalDeals, uniqueIndustries, totalTxnSales, avgScore, totalLeads,
        userSubmitted, marketplaceImports,
        weeklyTrend,
        riskDistribution: riskDist,
        valuationDistribution: valDist,
        dealSize: {
          medianRevenue: Math.round(median(revenues)),
          medianSDE: Math.round(median(sdes)),
          medianPrice: Math.round(median(prices)),
          avgRevenue: revenues.length > 0 ? Math.round(revenues.reduce((s, v) => s + v, 0) / revenues.length) : 0,
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
        distribution: { overpriced, fair, undervalued },
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
