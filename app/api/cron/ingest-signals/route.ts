import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This runs as a Vercel Cron Job every 6 hours
// vercel.json config: { "crons": [{ "path": "/api/cron/ingest-signals", "schedule": "0 */6 * * *" }] }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SEARCH_QUERIES = [
  "SMB acquisition deal analysis site:reddit.com",
  "buying a small business valuation site:reddit.com",
  "searchfund ETA acquisition 2025 2026",
  "small business acquisition due diligence",
  "SMB Twitter buying business deal",
  "business broker deal pricing overpriced",
  "HVAC plumbing roofing business for sale analysis",
  "SBA loan small business acquisition DSCR",
  "laundromat car wash business valuation multiple",
  "dental practice acquisition deal structure",
];

const PAIN_CATEGORIES = [
  "valuation", "financial_modeling", "diligence", "seller_addbacks",
  "dscr", "market_saturation", "competitive", "deal_structure",
];

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = `cron_${new Date().toISOString().split("T")[0]}_${Date.now().toString(36)}`;
  let totalIngested = 0;

  try {
    // Pick 3 random search queries per run to stay within limits
    const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    const queriesToRun = shuffled.slice(0, 3);

    for (const query of queriesToRun) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY || "",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{
              role: "user",
              content: `Search for: "${query}"

Find 5-10 recent discussions (last 30 days) about SMB acquisitions, business buying, deal analysis, or business valuations from Reddit, Twitter/X, or business forums.

For each discussion found, return a JSON array (no markdown, no backticks). Each object:
{
  "title": "post title or summary",
  "summary": "2-3 sentence summary of what's being discussed",
  "source_platform": "reddit" or "twitter" or "searchfunder" or "other",
  "source_url": "URL if available, otherwise null",
  "author": "username if visible, otherwise null",
  "industry": "matched industry key (hvac, dental, cleaning, etc) or null",
  "pain_category": one of: "valuation", "financial_modeling", "diligence", "seller_addbacks", "dscr", "market_saturation", "competitive", "deal_structure",
  "signal_type": one of: "question", "deal_share", "advice", "complaint", "success_story", "market_insight",
  "relevance_score": 0-100 (how relevant to SMB acquisition intelligence),
  "pain_intensity": 0-100 (how much pain/urgency is expressed),
  "buyer_intent": 0-100 (likelihood this person is actively buying a business),
  "sentiment": "bullish", "bearish", "neutral", "frustrated", or "excited",
  "topics": ["topic1", "topic2"],
  "mentioned_industries": ["hvac", "dental", etc],
  "ai_insight": "one sentence insight about what this signal means for the market",
  "content_opportunity": "suggested content topic to address this signal"
}

ONLY return the JSON array. No other text.`,
            }],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();

        // Extract text from response (may include tool use blocks)
        const textBlocks = data.content
          ?.filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("\n")
          .trim();

        if (!textBlocks) continue;

        // Parse JSON
        let signals;
        try {
          const cleaned = textBlocks.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          // Find the JSON array in the response
          const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            signals = JSON.parse(arrayMatch[0]);
          }
        } catch { continue; }

        if (!Array.isArray(signals)) continue;

        // Insert signals into Supabase
        for (const signal of signals) {
          if (!signal.title || !signal.summary) continue;
          if (signal.relevance_score < 30) continue; // Skip low-relevance

          // Dedup: check if similar title already exists (last 7 days)
          const { data: existing } = await supabase
            .from("community_signals")
            .select("id")
            .ilike("title", `%${signal.title.slice(0, 40)}%`)
            .gte("ingested_at", new Date(Date.now() - 7 * 86400000).toISOString())
            .limit(1)
            .single();

          if (existing) continue; // Skip duplicate

          await supabase.from("community_signals").insert({
            title: signal.title.slice(0, 500),
            summary: signal.summary.slice(0, 1000),
            source_platform: signal.source_platform || "other",
            source_url: signal.source_url || null,
            author: signal.author || null,
            industry: signal.industry || null,
            pain_category: PAIN_CATEGORIES.includes(signal.pain_category) ? signal.pain_category : "valuation",
            signal_type: signal.signal_type || "market_insight",
            relevance_score: Math.min(100, Math.max(0, signal.relevance_score || 50)),
            pain_intensity: Math.min(100, Math.max(0, signal.pain_intensity || 50)),
            buyer_intent: Math.min(100, Math.max(0, signal.buyer_intent || 30)),
            sentiment: signal.sentiment || "neutral",
            topics: Array.isArray(signal.topics) ? signal.topics.slice(0, 10) : [],
            mentioned_industries: Array.isArray(signal.mentioned_industries) ? signal.mentioned_industries.slice(0, 10) : [],
            ai_insight: signal.ai_insight?.slice(0, 500) || null,
            content_opportunity: signal.content_opportunity?.slice(0, 500) || null,
            original_date: new Date().toISOString(),
            batch_id: batchId,
          });

          totalIngested++;
        }
      } catch { /* Skip failed query, continue with next */ }
    }

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      queries_run: queriesToRun.length,
      signals_ingested: totalIngested,
    });
  } catch (error) {
    console.error("Signal ingestion error:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
