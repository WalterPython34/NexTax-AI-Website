import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadBenchmarkData,
  getValuationMultiple,
  getSizeBand,
} from "@/lib/valuation-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

const INDUSTRY_KEYS = [
  // ── Original 26 ──────────────────────────────────────────────────────────
  "laundromat","hvac","landscaping","carwash","dental","gym","restaurant",
  "autorepair","cleaning","ecommerce","saas","insurance","plumbing","roofing",
  "petcare","pharmacy","daycare","medspa","accounting","electrical","healthcare",
  "transportation","printing","storage","painting","security",
  // ── New 15 ───────────────────────────────────────────────────────────────
  "signmaking","hairsalon","clothing","construction","grocery","pestcontrol",
  "marketing","engineering","veterinary","realestatebrok","propertymanage",
  "seniorcare","physicaltherapy","remodeling","staffing",
];

const SEARCH_QUERIES = [
  "small business acquisition challenges 2026 reddit",
  "buying a business SBA loan problems searchfunder",
  "SMB acquisition valuation questions reddit entrepreneur",
  "business broker deal fell through reasons 2026",
  "ETA entrepreneurship through acquisition struggles forum",
  "how to value a small business acquisition 2026",
  "seller financing deal structure questions",
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

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: Ingest one community signal
// ─────────────────────────────────────────────────────────────────────────────
async function ingestSignal(): Promise<{ ingested: boolean; title: string | null; reason: string }> {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  const now = new Date();
  const monthYear  = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const prevMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const prev2Month = new Date(now.getFullYear(), now.getMonth() - 2, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const prompt = `Search the web for a Reddit post, Searchfunder thread, or forum discussion about: "${query}"

Find the most relevant post from a real SMB acquisition buyer or seller discussing pain points, challenges, or insights. Prefer posts from ${monthYear} or ${prevMonth}, but if nothing recent is available, use the best post from ${prev2Month} or earlier — do NOT return null fields.

CRITICAL: You MUST return a real post with a real title. Never return null for title or summary.

Return ONLY a valid JSON object with no markdown formatting, no backticks, no explanation before or after:
{"title":"exact post title here","summary":"2-3 sentence summary of the post content","platform":"reddit or searchfunder or twitter or other","url":"direct URL to the post or null if not available","pain_category":"valuation or financial_modeling or diligence or seller_addbacks or dscr or market_saturation or competitive or deal_structure","signal_type":"question or deal_share or complaint or advice or success_story or market_insight","sentiment":"bullish or bearish or frustrated or excited or neutral","industry":"relevant industry key or null","relevance_score":75,"pain_intensity":70,"buyer_intent":65,"topics":["smb","acquisition"],"ai_insight":"one sentence insight for acquisition buyers","content_opportunity":"one content idea to address this pain"}`;

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
        stop_sequences: ["\n\nNote:", "\n\nPlease", "\n\nI ", "\n\nThis "],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return { ingested: false, title: null, reason: `Claude API error: ${res.status}` };

    const data = await res.json();

    const textBlocks = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text || "")
      .join("");

    if (!textBlocks) return { ingested: false, title: null, reason: "No text in response" };

    const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ingested: false, title: null, reason: "No JSON in response" };

    let signal: any;
    try {
      signal = JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0]
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      try {
        signal = JSON.parse(cleaned);
      } catch {
        return { ingested: false, title: null, reason: "JSON parse failed" };
      }
    }

    if (!signal.title || signal.title === "null" || signal.title.trim() === "") {
      return { ingested: false, title: null, reason: "Claude returned null title — no qualifying post found" };
    }
    if (!signal.summary || signal.summary.trim() === "") {
      return { ingested: false, title: signal.title, reason: "Missing summary" };
    }

    // Dedup: exact title match in last 3 days
    const { data: existing } = await supabase
      .from("community_signals")
      .select("id")
      .eq("title", signal.title)
      .gte("ingested_at", new Date(Date.now() - 3 * 86400000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return { ingested: false, title: signal.title, reason: "Duplicate" };
    }

    const safeInt = (v: any, fallback: number) =>
      typeof v === "number" ? Math.round(Math.max(0, Math.min(100, v))) : fallback;
    const safeStr = (v: any, fallback: string) =>
      typeof v === "string" && v.trim() ? v.trim() : fallback;
    const safeArr = (v: any) =>
      Array.isArray(v) ? v.filter((x: any) => typeof x === "string") : [];

    const { error } = await supabase.from("community_signals").insert({
      title:               signal.title.trim(),
      summary:             signal.summary.trim(),
      source_platform:     safeStr(signal.platform, "other"),
      source_url:          signal.url && signal.url !== "null" ? signal.url : null,
      pain_category:       safeStr(signal.pain_category, "valuation"),
      signal_type:         safeStr(signal.signal_type, "question"),
      sentiment:           safeStr(signal.sentiment, "neutral"),
      industry:            signal.industry && signal.industry !== "null" ? signal.industry : null,
      relevance_score:     safeInt(signal.relevance_score, 60),
      pain_intensity:      safeInt(signal.pain_intensity, 60),
      buyer_intent:        safeInt(signal.buyer_intent, 60),
      topics:              safeArr(signal.topics),
      ai_insight:          safeStr(signal.ai_insight, ""),
      content_opportunity: safeStr(signal.content_opportunity, ""),
      is_active:           true,
      ingested_at:         new Date().toISOString(),
      original_date:       new Date().toISOString(),
    });

    if (error) return { ingested: false, title: signal.title, reason: error.message };
    return { ingested: true, title: signal.title, reason: "Success" };

  } catch (e: any) {
    return { ingested: false, title: null, reason: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: Refresh live benchmark layer
// Replaces the old compute_listing_benchmarks() call.
// Calls the new refresh_industry_benchmarks_live() SQL function which blends:
//   deal_runs + dealstats_transactions + dealstats_benchmarks
// into industry_benchmarks_live. Safe to call repeatedly (upsert semantics).
// ─────────────────────────────────────────────────────────────────────────────
async function refreshLiveBenchmarks(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("refresh_industry_benchmarks_live");
  if (error) {
    console.error("[CRON Task 2] Live benchmark refresh error:", error.message);
    return { success: false, error: error.message };
  }
  console.log("[CRON Task 2] industry_benchmarks_live refreshed successfully");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Write DRI snapshot for today
// Reads from the updated loadBenchmarkData() which now includes Tier 0
// (industry_benchmarks_live) as the preferred benchmark source.
// ─────────────────────────────────────────────────────────────────────────────
async function writeDRISnapshots(): Promise<{ written: number; skipped: number }> {
  const today = new Date().toISOString().split("T")[0];

  const [benchmarkData, dealCountRes] = await Promise.all([
    // loadBenchmarkData now loads industry_benchmarks_live as Tier 0
    loadBenchmarkData(),
    supabase
      .from("deal_runs")
      .select("industry, revenue")
      .eq("is_valid", true),
  ]);

  // Count deals per industry
  const dealCounts: Record<string, number> = {};
  (dealCountRes.data || []).forEach((r: any) => {
    if (r.industry) dealCounts[r.industry] = (dealCounts[r.industry] || 0) + 1;
  });

  const snapshots: any[] = [];
  let skipped = 0;

  for (const key of INDUSTRY_KEYS) {
    // Use getValuationMultiple which now routes through Tier 0 first
    // Pass null for sizeBand here — DRI is a market-level snapshot, not deal-specific
    const vm = getValuationMultiple(key, null, benchmarkData);

    if (!vm.multiple) {
      skipped++;
      continue;
    }

    // Get the listing-side multiple from industry_benchmarks_live if available,
    // otherwise fall back to the old industry_listing_benchmarks approach
    const liveByBand = benchmarkData.live[key] || {};
    const liveBands = Object.values(liveByBand);

    let listingMultiple: number | null = null;
    let listingSampleSize = 0;

    if (liveBands.length > 0) {
      // Aggregate listing_p50 across all size bands, weighted by listing_count
      const totalListings = liveBands.reduce((s, r) => s + (r.listing_count || 0), 0);
      if (totalListings > 0) {
        listingMultiple = liveBands.reduce(
          (s, r) => s + (r.listing_p50_sde_multiple || 0) * (r.listing_count || 0), 0
        ) / totalListings;
        listingSampleSize = totalListings;
      }
    }

    // Fallback to old industry_listing_benchmarks if live layer has no listing data
    if (!listingMultiple) {
      const oldListing = benchmarkData.listing[key];
      if (oldListing?.median_multiple) {
        listingMultiple = oldListing.median_multiple;
        listingSampleSize = oldListing.sample_size || 0;
      }
    }

    if (!listingMultiple) {
      skipped++;
      continue;
    }

    const dri = +(listingMultiple / vm.multiple).toFixed(4);
    const gapPct = Math.round((dri - 1) * 100);
    const condition =
      dri < 1.0    ? "Undervalued"
      : dri <= 1.15 ? "Healthy Market"
      : dri <= 1.30 ? "Moderately Overpriced"
      :               "Highly Overpriced";

    snapshots.push({
      snapshot_date:       today,
      industry_key:        key,
      dri,
      gap_pct:             gapPct,
      condition,
      listing_multiple:    +listingMultiple.toFixed(4),
      sold_multiple:       +vm.multiple.toFixed(4),
      benchmark_source:    vm.source,
      listing_sample_size: listingSampleSize,
      sold_sample_size:    vm.sampleSize,
      deal_count:          dealCounts[key] || 0,
    });
  }

  if (snapshots.length === 0) return { written: 0, skipped };

  const { error } = await supabase
    .from("dri_snapshots")
    .upsert(snapshots, { onConflict: "snapshot_date,industry_key" });

  if (error) {
    console.error("[CRON Task 3] DRI snapshot error:", error);
    return { written: 0, skipped };
  }

  return { written: snapshots.length, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: Clean stale signals older than 90 days
// ─────────────────────────────────────────────────────────────────────────────
async function cleanStaleSignals(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("community_signals")
    .delete()
    .lt("ingested_at", cutoff)
    .select("id");
  return { deleted: error ? 0 : (data?.length || 0) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  results.signal     = await ingestSignal();
  results.benchmarks = await refreshLiveBenchmarks();   // ← now calls refresh_industry_benchmarks_live
  results.dri        = await writeDRISnapshots();        // ← now reads Tier 0 live data
  results.cleanup    = await cleanStaleSignals();

  console.log("Cron completed:", JSON.stringify(results));
  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
}
