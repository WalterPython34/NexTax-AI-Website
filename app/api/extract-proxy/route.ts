/**
 * app/api/extract-proxy/route.ts
 *
 * Server-side proxy for Claude API calls from admin pages.
 * Accepts { prompt: string } and returns { content: string }
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept either { prompt } or { messages } shape
    const prompt = body.prompt || null;
    const messages = body.messages || (prompt ? [{ role: "user", content: prompt }] : null);

    if (!messages) {
      return NextResponse.json(
        { error: "prompt or messages required" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", res.status, errText);
      return NextResponse.json(
        { error: `Claude API error: ${res.status}`, details: errText },
        { status: 500 }
      );
    }

    const data = await res.json();
    const content = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") || "";

    return NextResponse.json({ content });

  } catch (err) {
    console.error("Extract proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
