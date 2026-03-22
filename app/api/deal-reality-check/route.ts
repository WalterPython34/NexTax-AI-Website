/**
 * POST /api/deal-reality-check
 *
 * Two modes:
 *  1. Structured pass-through: body contains { system, messages }
 *     → Forwards directly to Anthropic, returns { content: [...] }
 *  2. Legacy field-based: body contains individual deal fields
 *     → Builds prompt internally, returns { assessment: string }
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── MODE 1: Structured pass-through (new component format) ───────────────
    // Component sends { system: string, messages: [...] }
    if (body.system && body.messages) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: body.system,
          messages: body.messages,
        }),
      });

      const data = await response.json();
      // Return raw content array — component parses JSON from text blocks
      return NextResponse.json({ content: data.content || [] });
    }

    // ── MODE 2: Legacy field-based (old format, kept for backward compat) ────
    const {
      industry, multiple, benchmarkLow, benchmarkMid, benchmarkHigh,
      position, rangePct, dscr, margin, marginBenchmarkMid, dealScore,
      riskLevel, fairMid, nextStep, revenue, sde, askingPrice,
    } = body;

    const systemPrompt = `You are a senior M&A advisor writing pre-LOI underwriting memos for SMB acquisition buyers. Your output must be a single valid JSON object — no markdown, no backticks, no text before or after the JSON.`;

    const userPrompt = body.prompt || `Produce a deal screening memo for this ${industry} acquisition.

Deal: Asking ${askingPrice ? `$${Number(askingPrice).toLocaleString()}` : "undisclosed"}, SDE ${sde ? `$${Number(sde).toLocaleString()}` : "undisclosed"}, Revenue ${revenue ? `$${Number(revenue).toLocaleString()}` : "undisclosed"}
Multiple: ${Number(multiple).toFixed(2)}x | Market: ${Number(benchmarkLow).toFixed(2)}–${Number(benchmarkHigh).toFixed(2)}x (median ${Number(benchmarkMid).toFixed(2)}x)
Position: ${position} (${Math.abs(Number(rangePct))}% ${Number(rangePct) > 0 ? "above" : "below"} median)
DSCR: ${Number(dscr).toFixed(2)}x | Margin: ${Number(margin).toFixed(1)}% vs ${Number(marginBenchmarkMid).toFixed(1)}% industry median
Score: ${dealScore}/100 (${riskLevel}) | Next step: ${nextStep}

Return ONLY this JSON:
{"p1":"2-3 sentence pricing context paragraph","p2":"2-3 sentence business quality paragraph","p3":"2-3 sentence buyer interpretation paragraph"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();
    const raw = (data.content?.[0]?.text || "").replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();

    try { JSON.parse(raw); } catch {
      return NextResponse.json({ assessment: JSON.stringify({ p1: raw, p2: "", p3: "" }) });
    }

    return NextResponse.json({ assessment: raw });

  } catch (err) {
    console.error("Deal reality check API error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
