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

// Task 1: Ingest one community signal
async function ingestSignal(): Promise<{ ingested: boolean; title: string | null; reason: string }> {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  // FIX 1: Broader, more flexible date window — last 90 days with preference for recent
  const now = new Date();
  const monthYear  = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const prevMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const prev2Month = new Date(now.getFullYear(), now.getMonth() - 2, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  // FIX 2: Rewritten prompt — instructs Claude to ALWAYS return a valid post,
  // never return null title. Fallback to best available if nothing perfectly recent.
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
        // FIX 3: stop_sequences prevents Claude from adding prose after the JSON
        stop_sequences: ["\n\nNote:", "\n\nPlease", "\n\nI ", "\n\nThis "],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return { ingested: false, title: null, reason: `Claude API error: ${res.status}` };

    const data = await res.json();

    // FIX 4: More robust text extraction — join ALL text blocks, not just filter
    const textBlocks = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text || "")
      .join("");

    if (!textBlocks) return { ingested: false, title: null, reason: "No text in response" };

    // FIX 5: More permissive JSON extraction — handles JSON buried in any surrounding text
    const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ingested: false, title: null, reason: "No JSON in response" };

    let signal: any;
    try {
      signal = JSON.parse(jsonMatch[0]);
    } catch {
      // FIX 6: Try cleaning the JSON before failing
      const cleaned = jsonMatch[0]
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ") // strip control chars
        .replace(/,\s*}/g, "}")                          // trailing commas
        .replace(/,\s*]/g, "]");
      try {
        signal = JSON.parse(cleaned);
      } catch {
        return { ingested: false, title: null, reason: "JSON parse failed" };
      }
    }

    // FIX 7: Validate with better error reporting — check each field
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

    // FIX 8: Sanitize numeric fields — Claude sometimes returns strings or nulls
    const safeInt  = (v: any, fallback: number) => typeof v === "number" ? Math.round(Math.max(0, Math.min(100, v))) : fallback;
    const safeStr  = (v: any, fallback: string) => (typeof v === "string" && v.trim()) ? v.trim() : fallback;
    const safeArr  = (v: any) => Array.isArray(v) ? v.filter((x: any) => typeof x === "string") : [];

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

// Task 2: Recompute listing benchmarks
async function recomputeListingBenchmarks(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc("compute_listing_benchmarks");
  return error ? { success: false, error: error.message } : { success: true };
}

// Task 3: Write DRI snapshot for today
async function writeDRISnapshots(): Promise<{ written: number; skipped: number }> {
  const today = new Date().toISOString().split("T")[0];

  const [benchmarkData, listingRes, dealCountRes] = await Promise.all([
    loadBenchmarkData(),
    supabase
      .from("industry_listing_benchmarks")
      .select("industry_key, median_multiple, sample_size")
      .is("state", null)
      .is("size_band", null),
    supabase
      .from("deal_runs")
      .select("industry")
      .eq("is_valid", true),
  ]);

  const listingByIndustry: Record<string, any> = {};
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
    const listing = listingByIndustry[key];
    const vm = getValuationMultiple(key, null, benchmarkData);

    if (!listing?.median_multiple || !vm.multiple) { skipped++; continue; }

    const dri = +(listing.median_multiple / vm.multiple).toFixed(4);
    const gapPct = Math.round((dri - 1) * 100);
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

  const { error } = await supabase
    .from("dri_snapshots")
    .upsert(snapshots, { onConflict: "snapshot_date,industry_key" });

  if (error) {
    console.error("DRI snapshot error:", error);
    return { written: 0, skipped };
  }

  return { written: snapshots.length, skipped };
}

// Task 4: Clean stale signals older than 90 days
async function cleanStaleSignals(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("community_signals")
    .delete()
    .lt("ingested_at", cutoff)
    .select("id");
  return { deleted: error ? 0 : (data?.length || 0) };
}

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  results.signal     = await ingestSignal();
  results.benchmarks = await recomputeListingBenchmarks();
  results.dri        = await writeDRISnapshots();
  results.cleanup    = await cleanStaleSignals();

  console.log("Cron completed:", JSON.stringify(results));
  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
}
