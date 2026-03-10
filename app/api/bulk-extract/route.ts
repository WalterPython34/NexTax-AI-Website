import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, source_platform } = body;

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Please paste more content from the search results page." }, { status: 400 });
    }

    // Truncate to stay within token limits
    const truncated = text.slice(0, 20000);

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
        messages: [{
          role: "user",
          content: `You are a data extraction system. Extract ALL business-for-sale listings from this ${source_platform || "marketplace"} search results page content.

Return ONLY a JSON array with no other text, no markdown, no backticks. Each listing object should have:
{
  "Title": "string",
  "Location": "City, ST",
  "Category": "business type",
  "Asking Price": number (no commas, no $),
  "Cash Flow": number or null (no commas, no $),
  "Gross Revenue": number or null (no commas, no $),
  "Employees": number or null
}

Rules:
- Extract EVERY listing you can find. There may be 10-30+ listings.
- "Cash Flow" is the same as SDE or Seller's Discretionary Earnings
- All numbers should be plain integers: 450000 not "$450,000"
- If a field is not available, use null
- For Category, use the business type: HVAC, Restaurant, Cleaning, Dental, etc.
- If Location is not clear, use null

PAGE CONTENT:
${truncated}`,
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude extraction error:", err);
      return NextResponse.json({ error: "AI extraction failed" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content
      ?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    // Parse JSON
    let listings;
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      listings = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed:", rawText?.slice(0, 200));
      return NextResponse.json({ error: "Could not parse extraction results. Try pasting more of the page content." }, { status: 500 });
    }

    if (!Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json({ error: "No listings found in the pasted content." }, { status: 400 });
    }

    // Normalize: ensure all values are strings for the import pipeline
    const normalized = listings.map((l: Record<string, unknown>) => {
      const obj: Record<string, string> = {};
      Object.entries(l).forEach(([k, v]) => {
        if (v !== null && v !== undefined) obj[k] = String(v);
      });
      obj.source_platform = source_platform || "marketplace";
      return obj;
    });

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
