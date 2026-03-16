/**
 * /api/cron/ingest-signals
 *
 * Runs every 6 hours via Vercel cron (vercel.json: "0 */6 * * *")
 * Auth: CRON_SECRET via Bearer header or ?secret= query param
 *
 * Does three things each run:
 *   1. Ingests 1 new community signal via Claude web search
 *   2. Recomputes industry_listing_benchmarks from deal_runs
 *   3. [NEW] Writes a DRI snapshot row for each industry with benchmark data
 *   4. Cleans community_signals older than 90 days
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadBenchmarkData,
  getValuationMultiple,
} from "@/lib/valuation-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// maxDuration 60 keeps us within Vercel Pro function limit
export const maxDuration = 60;

const INDUSTRY_KEYS = [
  "laundromat","hvac","landscaping","carwash","dental","gym","restaurant",
  "autorepair","cleaning","ecommerce","saas","insurance","plumbing","roofing",
  "petcare","pharmacy","daycare","medspa","accounting","electrical","healthcare",
  "transportation","printing","storage","painting","security",
];

const SEARCH_QUERIES = [
  "small business acquisition challenges 2026 reddit",
  "buying a business SBA loan problems searchfunder",
  "SMB acquisition valuation questions reddit entrepreneur",
  "business broker deal fell through reasons 2026",
  "ETA entrepreneurship through acquisition struggles forum",
  "how to value a small business acquisition 2026",
  "seller financing deal structure questions acqui-hire",
  "DSCR small business loan denial reasons 2026",
  "due diligence red flags buying a business",
  "small business asking price too high negotiation",
  "HVAC business acquisition multiple valuation 2026",
  "restaurant acquisition risk factors reddit",
  "home services business buying checklist",
  "ecommerce brand acquisition due diligence",
  "accounting firm acquisition valuation multiple",
  "healthcare practice acquisition SBA financing",
  "landscaping business sale price multiples",
  "laundromat acquisition ROI analysis",
  "cleaning service business acquisition deal structure",
  "roofing company acquisition risks 2026",
];

// ── TASK 1: Ingest one community signal
async function ingestSignal(): Promise<{ ingested: boolean; title: string | null; reason: string }> {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  const prompt = `Search for a recent (last 7 days) Reddit post, Searchfunder thread, or forum discussion about: "${query}"

Find one highly relevant post from a real business buyer or searcher discussing pain points about SMB acquisitions.

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "exact post title",
  "summary": "2-3 sentence summary of the key question or problem",
  "platform": "reddit" or "searchfunder" or "twitter" or "other",
  "url": "direct URL if available or null",
  "pain_category": one of: "valuation" | "financial_modeling" | "diligence" | "seller_addbacks" | "dscr" | "market_saturation" | "competitive" | "deal_structure",
  "signal_type": one of: "question" | "deal_share" | "complaint" | "advice" | "success_story" | "market_insight",
  "sentiment": one of: "bullish" | "bearish" | "frustrated" | "excited" | "neutral",
  "industry": the most relevant industry key or null,
  "relevance_score": integer 0-100 (how relevant to SMB acquisition buyers),
  "pain_intensity": integer 0-100 (how much pain/frustration is expressed),
  "buyer_intent": integer 0-100 (likelihood the poster is actively buying a business),
  "topics": ["array", "of", "key", "topics"],
  "ai_insight": "one sentence about what this signal means for acquisition buyers",
  "content_opportunity": "one content idea NexTax could create to address this pain point"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return { ingested: false, title: null, reason: `Claude API error: ${res.status}` };

    const data = await res.json();
    const text = data.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ingested: false, title: null, reason: "No JSON in response" };

    const signal = JSON.parse(jsonMatch[0]);
    if (!signal.title || !signal.summary) return { ingested: false, title: null, reason: "Missing required fields" };

    // Dedup: exact title match in last 3 days
    const { data: existing } = await supabase
      .from("community_signals")
      .select("id")
      .eq("title", signal.title)
      .gte("ingested_at", new Date(Date.now() - 3 * 86400000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) return { ingested: false, title: signal.title, reason: "Duplicate" };

    const { error } = await supabase.from("community_signals").insert({
      title:              signal.title,
      summary:            signal.summary,
      source_platform:    signal.platform,
      source_url:         signal.url,
      pain_category:      signal.pain_category,
      signal_type:        signal.signal_type,
      sentiment:          signal.sentiment,
      industry:           signal.industry,
      relevance_score:    signal.relevance_score,
      pain_intensity:     signal.pain_intensity,
      buyer_intent:       signal.buyer_intent,
      topics:             signal.topics,
      ai_insight:         signal.ai_insight,
      content_opportunity: signal.content_opportunity,
      is_active:          true,
      ingested_at:        new Date().toISOString(),
      original_date:      new Date().toISOString(),
    });

    if (error) return { ingested: false, title: signal.title, reason: error.message };
    return { ingested: true, title: signal.title, reason: "Success" };
  } catch (e: any) {
    return { ingested: false, title: null, reason: e.message };
  }
}

// ── TASK 2: Recompute listing benchmarks
async function recomputeListingBenchmarks(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("compute_listing_benchmarks");
  return error ? { success: false, error: error.message } : { success: true };
}

// ── TASK 3: Write DRI snapshots for today
// Uses the valuation engine to compute DRI per industry and stores it in dri_snapshots.
// This replaces the simulated random-variance trend chart with real historical data.
async function writeDRISnapshots(): Promise<{ written: number; skipped: number }> {
  const today = new Date().toISOString().split("T")[0]; // "2026-03-15"

  // Load benchmarks and listing benchmarks in parallel
  const [benchmarkData, listingRes, dealCountRes] = await Promise.all([
    loadBenchmarkData(),
    supabase
      .from("industry_listing_benchmarks")
      .select("industry_key, median_multiple, sample_size")
      .is("state", null)
      .is("size_band", null),
    // Deal counts per industry for the snapshot
    supabase
      .from("deal_runs")
      .select("industry")
      .eq("is_valid", true),
  ]);

  const listingByIndustry: Record<string, { median_multiple: number; sample_size: number }> = {};
  (listingRes.data || []).forEach((r: any) => {
    if (r.industry_key) listingByIndustry[r.industry_key] = r;
  });

  const dealCounts: Record<string, number> = {};
  (dealCountRes.data || []).forEach((r: any) => {
    if (r.industry) dealCounts[r.industry] = (dealCounts[r.industry] || 0) + 1;
  });

  const snapshots: any[] = [];
  let skipped = 0;

  for (const key of INDUSTRY_KEYS) {
    const listing  = listingByIndustry[key];
    const vm       = getValuationMultiple(key, null, benchmarkData);  // national, no size band for DRI

    if (!listing?.median_multiple || !vm.multiple) { skipped++; continue; }

    const dri      = +(listing.median_multiple / vm.multiple).toFixed(4);
    const gapPct   = Math.round((dri - 1) * 100);
    const condition =
      dri < 1.0   ? "Undervalued" :
      dri <= 1.15 ? "Healthy Market" :
      dri <= 1.30 ? "Moderately Overpriced" :
                    "Highly Overpriced";

    snapshots.push({
      snapshot_date:       today,
      industry_key:        key,
      dri,
      gap_pct:             gapPct,
      condition,
      listing_multiple:    +listing.median_multiple.toFixed(4),
      sold_multiple:       +vm.multiple.toFixed(4),
      benchmark_source:    vm.source,
      listing_sample_size: listing.sample_size,
      sold_sample_size:    vm.sampleSize,
      deal_count:          dealCounts[key] || 0,
    });
  }

  if (snapshots.length === 0) return { written: 0, skipped };

  // Upsert — safe to re-run, UNIQUE(snapshot_date, industry_key) prevents doubles
  const { error } = await supabase
    .from("dri_snapshots")
    .upsert(snapshots, { onConflict: "snapshot_date,industry_key" });

  if (error) {
    console.error("DRI snapshot upsert error:", error);
    return { written: 0, skipped };
  }

  return { written: snapshots.length, skipped };
}

// ── TASK 4: Clean stale signals
async function cleanStaleSignals(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("community_signals")
    .delete()
    .lt("ingested_at", cutoff)
    .select("id");

  return { deleted: error ? 0 : (data?.length || 0) };
}

// ── MAIN HANDLER
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ||
                 new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  // Run tasks sequentially to stay within 60s limit
  results.signal    = await ingestSignal();
  results.benchmarks = await recomputeListingBenchmarks();
  results.dri       = await writeDRISnapshots();
  results.cleanup   = await cleanStaleSignals();

  console.log("Cron completed:", JSON.stringify(results));
  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
}
