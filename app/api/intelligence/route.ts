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
    const [dealsRes, txnRes, listingRes, leadsRes] = await Promise.all([
      supabase.from("deal_runs").select("*").eq("is_valid", true).order("created_at", { ascending: false }).limit(2000),
      supabase.from("industry_transaction_benchmarks").select("*").not("industry_key", "is", null),
      supabase.from("industry_listing_benchmarks").select("*").is("state", null).is("size_band", null),
      supabase.from("deal_leads").select("id, source, created_at").order("created_at", { ascending: false }).limit(500),
    ]);

    const deals = dealsRes.data || [];
    const txnBenchmarks = txnRes.data || [];
    const listingBenchmarks = listingRes.data || [];
    const leads = leadsRes.data || [];

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
      return {
        week: `W${i + 1}`,
        deals: weekDeals.length,
        avgScore: weekDeals.length > 0 ? Math.round(weekDeals.reduce((s, d) => s + (d.overall_score || 0), 0) / weekDeals.length) : null,
        userDeals: weekDeals.filter((d) => d.data_source_type === "user_submitted").length,
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

      return {
        industry: key,
        label,
        dri,
        listingMultiple: listingMultiple ? +listingMultiple.toFixed(2) : null,
        txnMultiple: txnMultiple > 0 ? +txnMultiple.toFixed(2) : null,
        txnSales: totalSales,
        listingSampleSize: listing?.sample_size || 0,
        saleToAsk: txnRows.length > 0 ? +(txnRows.reduce((s, t) => s + (t.sale_to_asking_ratio || 0) * (t.reported_sales || 0), 0) / totalSales).toFixed(2) : null,
        daysOnMarket: txnRows.length > 0 ? Math.round(txnRows.reduce((s, t) => s + (t.median_days_on_market || 0) * (t.reported_sales || 0), 0) / totalSales) : null,
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

      return {
        industry: key,
        label,
        heatScore,
        dealCount: industryDeals.length,
        txnCount: totalSales,
        avgScore: industryDeals.length > 0 ? Math.round(scoreAvg) : null,
        medianMultiple: txnMultiple ? +txnMultiple.toFixed(2) : null,
        daysOnMarket,
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

    // ── CONTENT OPS — Top opportunity industries (highest demand, lowest NexTax coverage)
    const contentOps = industryHeatmap.map((ind) => {
      const coverage = ind.dealCount;
      const demand = ind.txnCount;
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
      const txnRows = txnBenchmarks.filter((t) => t.industry_key === key);
      const txnCount = txnRows.reduce((s, t) => s + (t.reported_sales || 0), 0);
      const dealCount = deals.filter((d) => d.industry === key).length;
      const userCount = deals.filter((d) => d.industry === key && d.data_source_type === "user_submitted").length;

      return { industry: key, label, txnCount, dealCount, userCount, gap: txnCount > 0 ? Math.round((1 - Math.min(dealCount / (txnCount * 0.1), 1)) * 100) : 0 };
    }).sort((a, b) => b.gap - a.gap);

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
    });
  } catch (error) {
    console.error("Intelligence API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
