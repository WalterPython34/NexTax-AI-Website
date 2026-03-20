import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, source_platform } = body;

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "No content provided." }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `Extract ALL business-for-sale listings from the text below. Each listing has a title, location, revenue, profit/cash flow, asking price, and sometimes team size and year established.

Return ONLY a valid JSON array — no markdown, no explanation, no backticks.

Each object must have these exact keys:
{
  "Title": "business name/description",
  "Location": "City, State or just State",
  "Category": "inferred type e.g. Auto Repair, Painting, Cleaning",
  "Asking Price": number (digits only, no $ or commas),
  "Cash Flow": number or null (Annual Profit or SDE),
  "Gross Revenue": number or null (Annual Revenue),
  "Employees": number or null,
  "Year Established": number or null
}

Rules:
- Extract EVERY listing — there are ${text.split('Asking Price').length - 1} listings based on "Asking Price" count
- Numbers as plain integers: 1500000 not "$1,500,000"
- If asking price has two values (e.g. "1,300,000 without real estate 1,000,000") use the lower number
- Null for any missing field
- Category: infer from title (Auto Repair, Painting, Cleaning Service, Dry Cleaning, etc.)

TEXT:
${text.slice(0, 15000)}`,
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude error:", response.status, err);
      return NextResponse.json({ error: `AI extraction failed (${response.status})` }, { status: 500 });
    }

    const data = await response.json();
    const rawText = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("").trim();

    // Strip markdown fences if present
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);

    if (!match) {
      console.error("No JSON array in response:", rawText.slice(0, 300));
      return NextResponse.json(
        { error: "Could not parse AI response. Try pasting fewer listings at once." },
        { status: 500 }
      );
    }

    let listings: Record<string, unknown>[];
    try {
      listings = JSON.parse(match[0]);
    } catch (e) {
      console.error("JSON parse error:", e);
      return NextResponse.json(
        { error: "Malformed JSON from AI. Try again." },
        { status: 500 }
      );
    }

    if (!Array.isArray(listings)) {
      return NextResponse.json(
        { error: "AI did not return a list of listings." },
        { status: 500 }
      );
    }

    // Normalize — ensure numbers are numbers, add source platform
    const normalized = listings.map((l) => ({
      Title:            String(l.Title || ""),
      Location:         String(l.Location || ""),
      Category:         String(l.Category || ""),
      "Asking Price":   Number(l["Asking Price"]) || null,
      "Cash Flow":      l["Cash Flow"] != null ? Number(l["Cash Flow"]) : null,
      "Gross Revenue":  l["Gross Revenue"] != null ? Number(l["Gross Revenue"]) : null,
      Employees:        l.Employees != null ? Number(l.Employees) : null,
      "Year Established": l["Year Established"] != null ? Number(l["Year Established"]) : null,
      source_platform:  source_platform || "marketplace",
    }));

    return NextResponse.json({
      success: true,
      listings: normalized,
      count: normalized.length,
    });

  } catch (error) {
    console.error("Bulk extract error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
