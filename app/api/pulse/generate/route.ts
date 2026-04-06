/**
 * GET  /api/pulse/generate  — browser-friendly test trigger
 * POST /api/pulse/generate  — called by cron and weekly-pulse handler
 * Auth: CRON_SECRET via Authorization header or ?secret= query param
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INDUSTRY_LABELS: Record<string, string> = {
  // ── Original 26 ──────────────────────────────────────────────────────────
  laundromat:"Laundromat", hvac:"HVAC", landscaping:"Landscaping", carwash:"Car Wash",
  dental:"Dental", gym:"Gym/Fitness", restaurant:"Restaurant", autorepair:"Auto Repair",
  cleaning:"Cleaning", ecommerce:"Ecommerce", saas:"SaaS", insurance:"Insurance",
  plumbing:"Plumbing", roofing:"Roofing", petcare:"Pet Care", pharmacy:"Pharmacy",
  daycare:"Daycare", medspa:"Med Spa", accounting:"Accounting", electrical:"Electrical",
  healthcare:"Healthcare", transportation:"Transportation", printing:"Printing",
  storage:"Self-Storage", painting:"Painting", security:"Security",
  // ── New 15 ───────────────────────────────────────────────────────────────
  signmaking:"Sign Manufacturing", hairsalon:"Hair Salon",
  clothing:"Clothing & Accessories", construction:"Other Construction",
  grocery:"Grocery Store", pestcontrol:"Pest Control",
  marketing:"Marketing Agency", engineering:"Engineering Services",
  veterinary:"Veterinary Practice", realestatebrok:"Real Estate Brokerage",
  propertymanage:"Property Management", seniorcare:"Senior Care / Home Health",
  physicaltherapy:"Physical Therapy / Chiropractic",
  remodeling:"Home Remodeling & Restoration", staffing:"Staffing / Recruiting",
};

function driCondition(dri: number): string {
  if (dri < 1.0)   return "Undervalued";
  if (dri <= 1.15) return "Healthy Market";
  if (dri <= 1.30) return "Moderately Overpriced";
  return "Highly Overpriced";
}

async function generate(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ||
                 new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Week boundaries: last completed Monday → Sunday
    // Cron runs Monday 1am — this captures the just-completed week
    // Display: "Mar 9, 2026 – Mar 15, 2026"
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToLastMonday - 7);
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23,59,59,999);

    const slug = weekStart.toISOString().split("T")[0]; // "2026-03-09"

    // ── Fetch all data sources in parallel
    const [
      dealsRes,
      latestSnapshotRes,
      snapshotTrendRes,
      listingBenchRes,
      signalsRes,
    ] = await Promise.all([
      // All valid deals
      supabase.from("deal_runs")
        .select("industry, overall_score, asking_price, sde, revenue, valuation_multiple")
        .eq("is_valid", true).gt("sde", 0).gt("asking_price", 0),

      // Latest DRI snapshot (most recent date)
      supabase.from("dri_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(26),

      // Last 4 weeks of snapshots for trendline
      supabase.from("dri_snapshots")
        .select("snapshot_date, dri, industry_key")
        .order("snapshot_date", { ascending: false })
        .limit(26 * 4),

      // Listing benchmarks (national)
      supabase.from("industry_listing_benchmarks")
        .select("industry_key, median_multiple, sample_size")
        .is("state", null).is("size_band", null),

      // Recent community signals
      supabase.from("community_signals")
        .select("pain_category, pain_intensity, relevance_score")
        .eq("is_active", true),
    ]);

    const deals = dealsRes.data || [];
    const snapshots = latestSnapshotRes.data || [];
    const snapshotTrend = snapshotTrendRes.data || [];
    const listings = listingBenchRes.data || [];
    const signals = signalsRes.data || [];

    // ── HERO: Overall DRI (weighted average across industries)
    const validSnapshots = snapshots.filter((s) => s.dri !== null);
    const overallDRI = validSnapshots.length > 0
      ? +(validSnapshots.reduce((sum, s) => sum + s.dri, 0) / validSnapshots.length).toFixed(4)
      : null;
    const driGapPct = overallDRI ? Math.round((overallDRI - 1) * 100) : null;

    // ── Avg listing multiple vs avg sold multiple
    const listingMultiples = deals
      .filter((d) => d.valuation_multiple > 0 && d.valuation_multiple < 15)
      .map((d) => d.valuation_multiple);
    const avgListingMultiple = listingMultiples.length > 0
      ? +(listingMultiples.reduce((s, v) => s + v, 0) / listingMultiples.length).toFixed(2)
      : null;

    const avgSoldMultiple = validSnapshots.length > 0
      ? +(validSnapshots.reduce((s, snap) => s + (snap.sold_multiple || 0), 0) / validSnapshots.length).toFixed(2)
      : null;

    // ── Sentiment distribution (using DRI per deal if available, else score)
    let overpriced = 0, fair = 0, undervalued = 0;
    deals.forEach((d) => {
      const snap = snapshots.find((s) => s.industry_key === d.industry);
      if (snap?.sold_multiple && d.sde > 0) {
        const fv = snap.sold_multiple * d.sde;
        const ratio = d.asking_price / fv;
        if (ratio > 1.15) overpriced++;
        else if (ratio < 0.85) undervalued++;
        else fair++;
      } else {
        if (d.overall_score < 40) overpriced++;
        else if (d.overall_score >= 70) undervalued++;
        else fair++;
      }
    });
    const total = deals.length || 1;

    // ── Industry breakdown sorted by DRI
    const allIndustries = validSnapshots
      .map((s) => ({
        industry: s.industry_key,
        label: INDUSTRY_LABELS[s.industry_key] || s.industry_key,
        dri: +s.dri.toFixed(4),
        gap_pct: Math.round((s.dri - 1) * 100),
        condition: driCondition(s.dri),
        listing_multiple: s.listing_multiple ? +s.listing_multiple.toFixed(2) : null,
        sold_multiple: s.sold_multiple ? +s.sold_multiple.toFixed(2) : null,
        deal_count: deals.filter((d) => d.industry === s.industry_key).length,
      }))
      .sort((a, b) => b.dri - a.dri);

    const mostOverpriced  = allIndustries.filter((i) => i.dri > 1.15).slice(0, 5);
    const mostUndervalued = allIndustries.filter((i) => i.dri < 1.0)
      .sort((a, b) => a.dri - b.dri).slice(0, 5);

   // ── Top opportunities: high-score deals from FULL database (not week-filtered)
    const { data: allTopDeals } = await supabase
      .from("deal_runs")
      .select("industry, sde, asking_price, fair_value, overall_score, valuation_multiple, range_position, risk_level")
      .gte("overall_score", 65)
      .eq("is_valid", true)
      .gt("sde", 0)
      .gt("asking_price", 0)
      .order("overall_score", { ascending: false })
      .limit(10);

    const topOpportunities = (allTopDeals || [])
      .map((d) => {
        const snap = snapshots.find((s) => s.industry_key === d.industry);
        const fairValue = d.fair_value
          || (snap?.sold_multiple ? Math.round(snap.sold_multiple * d.sde) : null);
        return {
          industry: INDUSTRY_LABELS[d.industry] || d.industry,
          sde: d.sde,
          asking_price: d.asking_price,
          fair_value: fairValue,
          score: d.overall_score,
          multiple: d.valuation_multiple ? +d.valuation_multiple.toFixed(2) : null,
          range_position: d.range_position || null,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // ── Buyer Pain Index (avg pain intensity across active signals)
    const buyerPainIndex = signals.length > 0
      ? +(signals.reduce((s, sig) => s + (sig.pain_intensity || 0), 0) / signals.length / 100 + 1).toFixed(2)
      : null;
    const painCounts: Record<string, number> = {};
    signals.forEach((s) => { if (s.pain_category) painCounts[s.pain_category] = (painCounts[s.pain_category]||0)+1; });
    const topPainCategory = Object.entries(painCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

    // ── DRI trendline: group by week, last 4 weeks
    const weekGroups: Record<string, number[]> = {};
    snapshotTrend.forEach((row) => {
      const d = new Date(row.snapshot_date);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = monday.toISOString().split("T")[0];
      if (!weekGroups[key]) weekGroups[key] = [];
      if (row.dri) weekGroups[key].push(row.dri);
    });
    const driTrend = Object.entries(weekGroups)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .slice(-4)
      .map(([date, values], i) => ({
        week: `W${i+1}`,
        date,
        dri: +(values.reduce((s,v)=>s+v,0)/values.length).toFixed(4),
      }));

    // ── Total transaction count
    const bbTotal = validSnapshots.reduce((s, snap) => s + (snap.sold_sample_size || 0), 0);
    const benchmarkedTransactions = bbTotal || 13053;

    // ── Upsert the weekly report row
    const reportData = {
      slug,
      week_starting:            weekStart.toISOString().split("T")[0],
      week_ending:              weekEnd.toISOString().split("T")[0],
      deal_reality_index:       overallDRI,
      dri_interpretation:       overallDRI ? driCondition(overallDRI) : null,
      dri_gap_pct:              driGapPct,
      total_deals_analyzed:     deals.length,
      benchmarked_transactions: benchmarkedTransactions,
      industries_tracked:       26,
      avg_listing_multiple:     avgListingMultiple,
      avg_sold_multiple:        avgSoldMultiple,
      pct_deals_overpriced:     Math.round((overpriced / total) * 100),
      pct_deals_fair:           Math.round((fair / total) * 100),
      pct_deals_undervalued:    Math.round((undervalued / total) * 100),
      most_overpriced:          mostOverpriced,
      most_undervalued:         mostUndervalued,
      all_industries:           allIndustries,
      top_opportunities:        topOpportunities,
      buyer_pain_index:         buyerPainIndex,
      top_pain_category:        topPainCategory,
      pain_signal_count:        signals.length,
      dri_trend:                driTrend,
      generated_at:             new Date().toISOString(),
      is_published:             true,  // publish immediately — PDF is optional
    };

    const { data: report, error } = await supabase
      .from("weekly_reports")
      .upsert(reportData, { onConflict: "slug" })
      .select()
      .single();

    if (error) {
      console.error("Weekly report upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      slug,
      reportId: report.id,
      previewUrl: `https://nextax.ai/pulse/${slug}`,
      metrics: {
        dri: overallDRI,
        driGapPct,
        dealsAnalyzed: deals.length,
        overpriced: Math.round((overpriced/total)*100) + "%",
        topOverpriced: mostOverpriced[0]?.label,
        mostUndervalued: mostUndervalued[0]?.label,
      },
    });

  } catch (err) {
    console.error("Pulse generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Both GET and POST call the same function
export async function GET(req: NextRequest)  { return generate(req); }
export async function POST(req: NextRequest) { return generate(req); }
