import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let listingText = "";
    let listingUrl = "";
    let isPdf = false;
    let pdfBase64 = "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload (CIM PDF)
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("text") as string | null;
      const url = formData.get("url") as string | null;

      if (file && file.type === "application/pdf") {
        isPdf = true;
        const buffer = await file.arrayBuffer();
        pdfBase64 = Buffer.from(buffer).toString("base64");
      } else if (text) {
        listingText = text;
      } else if (url) {
        listingUrl = url;
      }
    } else {
      const body = await req.json();
      listingText = body.text || "";
      listingUrl = body.url || "";
    }

    // If URL provided, fetch the page content
    if (listingUrl && !listingText) {
      try {
        const pageRes = await fetch(listingUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; NexTaxBot/1.0)" },
        });
        if (pageRes.ok) {
          listingText = await pageRes.text();
          // Strip HTML tags for cleaner extraction
          listingText = listingText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
          listingText = listingText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
          listingText = listingText.replace(/<[^>]+>/g, " ");
          listingText = listingText.replace(/\s+/g, " ").trim();
          // Truncate to avoid token limits
          if (listingText.length > 8000) listingText = listingText.slice(0, 8000);
        }
      } catch {
        return NextResponse.json({ error: "Could not fetch URL" }, { status: 400 });
      }
    }

    if (!listingText && !isPdf) {
      return NextResponse.json({ error: "No listing content provided" }, { status: 400 });
    }

    // Build the extraction prompt
    const extractionPrompt = `You are a deal data extraction system for small business acquisitions. Extract financial and business data from the following listing.

Return ONLY valid JSON with no other text, no markdown, no backticks. Use this exact schema:

{
  "revenue": number or null,
  "sde": number or null,
  "ebitda": number or null,
  "asking_price": number or null,
  "industry": string or null,
  "industry_key": string or null,
  "city": string or null,
  "state": string or null,
  "employees": number or null,
  "years_in_business": number or null,
  "cash_flow": number or null,
  "inventory": number or null,
  "real_estate": boolean,
  "owner_operated": boolean,
  "summary": string,
  "confidence": "high" | "medium" | "low"
}

Rules:
- All financial numbers should be raw integers (e.g. 500000 not "500k" or "$500,000")
- For "industry_key" use one of: laundromat, hvac, landscaping, carwash, dental, gym, restaurant, autorepair, cleaning, ecommerce, saas, insurance, plumbing, roofing, petcare, pharmacy, daycare, medspa. Pick the closest match.
- If SDE is not explicitly stated but "cash flow" or "owner benefit" is, use that as SDE
- If EBITDA is given but not SDE, include EBITDA and set SDE to null
- "summary" should be a 1-sentence description of the business
- "confidence" reflects how complete the extracted data is
- If a field cannot be determined, use null`;

    // Build API call
    const messages: Array<{ role: string; content: unknown }> = [];

    if (isPdf) {
      messages.push({
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: extractionPrompt },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `${extractionPrompt}\n\nLISTING CONTENT:\n${listingText}`,
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: "AI extraction failed", details: error }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content
      ?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    // Parse JSON from response
    let extracted;
    try {
      // Strip any markdown fences if present
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Could not parse extraction results", raw: rawText }, { status: 500 });
    }

    return NextResponse.json({ success: true, extracted });
  } catch (error) {
    console.error("Listing extraction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
