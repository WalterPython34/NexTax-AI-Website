import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAIN_CATEGORIES = [
  "valuation", "financial_modeling", "diligence", "seller_addbacks",
  "dscr", "market_saturation", "competitive", "deal_structure",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, url, platform, batchMode } = body;

    if (!content && !url) {
      return NextResponse.json({ error: "content or url is required" }, { status: 400 });
    }

    const inputText = content || url;
    const isBatch = batchMode === true;

    // Use Claude to classify the signal(s)
    const prompt = isBatch
      ? `Analyze the following collection of community posts/discussions about SMB acquisitions and business buying. Extract each distinct discussion or post as a separate signal.

For EACH post/discussion found, return a JSON array. Each object:
{
  "title": "post title or topic summary (max 100 chars)",
  "summary": "2-3 sentence summary of what's being discussed",
  "source_platform": "${platform || "other"}",
  "source_url": "${url || "null"}",
  "author": "username if visible, otherwise null",
  "industry": "matched industry key (hvac, dental, cleaning, landscaping, autorepair, plumbing, roofing, restaurant, ecommerce, saas, insurance, petcare, pharmacy, daycare, medspa, accounting, electrical, healthcare, transportation, printing, storage, painting, security, carwash, gym, laundromat) or null",
  "pain_category": one of: "valuation", "financial_modeling", "diligence", "seller_addbacks", "dscr", "market_saturation", "competitive", "deal_structure",
  "signal_type": one of: "question", "deal_share", "advice", "complaint", "success_story", "market_insight",
  "relevance_score": 0-100 (how relevant to SMB acquisition intelligence),
  "pain_intensity": 0-100 (how much pain/urgency is expressed),
  "buyer_intent": 0-100 (likelihood this person is actively buying a business),
  "sentiment": "bullish", "bearish", "neutral", "frustrated", or "excited",
  "topics": ["topic1", "topic2"],
  "mentioned_industries": ["hvac", "dental", etc],
  "ai_insight": "one sentence insight about what this signal means for the market",
  "content_opportunity": "suggested content topic NexTax could create to address this signal"
}

Content to analyze:
${inputText}

ONLY return the JSON array. No other text.`
      : `Analyze this community post/discussion about SMB acquisitions or business buying. Classify it as a market signal.

Return a single JSON object (no array, no markdown):
{
  "title": "post title or topic summary (max 100 chars)",
  "summary": "2-3 sentence summary of what's being discussed",
  "source_platform": "${platform || "other"}",
  "source_url": "${url || "null"}",
  "author": "username if visible, otherwise null",
  "industry": "matched industry key (hvac, dental, cleaning, landscaping, autorepair, plumbing, roofing, restaurant, ecommerce, saas, insurance, petcare, pharmacy, daycare, medspa, accounting, electrical, healthcare, transportation, printing, storage, painting, security, carwash, gym, laundromat) or null",
  "pain_category": one of: "valuation", "financial_modeling", "diligence", "seller_addbacks", "dscr", "market_saturation", "competitive", "deal_structure",
  "signal_type": one of: "question", "deal_share", "advice", "complaint", "success_story", "market_insight",
  "relevance_score": 0-100 (how relevant to SMB acquisition intelligence),
  "pain_intensity": 0-100 (how much pain/urgency is expressed),
  "buyer_intent": 0-100 (likelihood this person is actively buying a business),
  "sentiment": "bullish", "bearish", "neutral", "frustrated", or "excited",
  "topics": ["topic1", "topic2"],
  "mentioned_industries": ["hvac", "dental", etc],
  "ai_insight": "one sentence insight about what this signal means for the market",
  "content_opportunity": "suggested content topic NexTax could create to address this signal"
}

Content to analyze:
${inputText}

ONLY return the JSON object. No other text.`;

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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI classification failed" }, { status: 500 });
    }

    const data = await response.json();
    const textContent = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    if (!textContent) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse response
    let signals: Record<string, unknown>[];
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      signals = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw: textContent }, { status: 500 });
    }

    // Insert signals
    let inserted = 0;
    const results: { title: string; status: string }[] = [];

    for (const signal of signals) {
      if (!signal.title || !signal.summary) {
        results.push({ title: String(signal.title || "Unknown"), status: "skipped — missing title/summary" });
        continue;
      }

      // Dedup check
      const { data: existing } = await supabase
        .from("community_signals")
        .select("id")
        .eq("title", signal.title)
        .gte("ingested_at", new Date(Date.now() - 3 * 86400000).toISOString())
        .limit(1)
        .single();

      if (existing) {
        results.push({ title: String(signal.title), status: "skipped — duplicate" });
        continue;
      }

      const { error } = await supabase.from("community_signals").insert({
        title: String(signal.title).slice(0, 500),
        summary: String(signal.summary).slice(0, 1000),
        source_platform: String(signal.source_platform || platform || "other"),
        source_url: signal.source_url ? String(signal.source_url) : url || null,
        author: signal.author ? String(signal.author) : null,
        industry: signal.industry ? String(signal.industry) : null,
        pain_category: PAIN_CATEGORIES.includes(String(signal.pain_category)) ? String(signal.pain_category) : "valuation",
        signal_type: String(signal.signal_type || "market_insight"),
        relevance_score: Math.min(100, Math.max(0, Number(signal.relevance_score) || 50)),
        pain_intensity: Math.min(100, Math.max(0, Number(signal.pain_intensity) || 50)),
        buyer_intent: Math.min(100, Math.max(0, Number(signal.buyer_intent) || 30)),
        sentiment: String(signal.sentiment || "neutral"),
        topics: Array.isArray(signal.topics) ? signal.topics.slice(0, 10) : [],
        mentioned_industries: Array.isArray(signal.mentioned_industries) ? signal.mentioned_industries.slice(0, 10) : [],
        ai_insight: signal.ai_insight ? String(signal.ai_insight).slice(0, 500) : null,
        content_opportunity: signal.content_opportunity ? String(signal.content_opportunity).slice(0, 500) : null,
        original_date: new Date().toISOString(),
        batch_id: `manual_${new Date().toISOString().split("T")[0]}`,
      });

      if (error) {
        results.push({ title: String(signal.title), status: "error — " + error.message });
      } else {
        inserted++;
        results.push({ title: String(signal.title), status: "inserted" });
      }
    }

    return NextResponse.json({
      success: true,
      signals_found: signals.length,
      signals_inserted: inserted,
      results,
    });
  } catch (error) {
    console.error("Signal upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
