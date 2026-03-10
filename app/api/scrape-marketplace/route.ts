import { NextRequest, NextResponse } from "next/server";

// Scrapes BizBuySell search result pages and extracts structured listing data
// Also supports Flippa and BizQuest

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, platform, pages_to_scrape } = body;

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const maxPages = Math.min(pages_to_scrape || 5, 10); // Cap at 10 pages
    const allListings: Record<string, string>[] = [];
    const detectedPlatform = platform || detectPlatform(url);

    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = buildPageUrl(url, page, detectedPlatform);

      try {
        const res = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });

        if (!res.ok) break;
        const html = await res.text();

        let pageListings: Record<string, string>[] = [];

        if (detectedPlatform === "bizbuysell") {
          pageListings = parseBizBuySell(html);
        } else if (detectedPlatform === "bizquest") {
          pageListings = parseBizQuest(html);
        } else {
          // Generic extraction via AI
          pageListings = parseGenericHTML(html);
        }

        if (pageListings.length === 0) break; // No more results
        allListings.push(...pageListings);
      } catch {
        break; // Stop on fetch error
      }
    }

    // Now use Claude to enrich any listings that are missing fields
    let enrichedListings = allListings;
    if (allListings.length > 0 && allListings.some((l) => !l["Cash Flow"] && !l.cash_flow)) {
      enrichedListings = await enrichWithAI(allListings, detectedPlatform);
    }

    return NextResponse.json({
      success: true,
      platform: detectedPlatform,
      pages_scraped: maxPages,
      listings: enrichedListings,
      count: enrichedListings.length,
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json({ error: "Scraping failed" }, { status: 500 });
  }
}

// ─── PLATFORM DETECTION ──────────────────────────────────────────────────────

function detectPlatform(url: string): string {
  if (url.includes("bizbuysell.com")) return "bizbuysell";
  if (url.includes("bizquest.com")) return "bizquest";
  if (url.includes("flippa.com")) return "flippa";
  if (url.includes("businessbroker.net")) return "businessbroker";
  if (url.includes("acquire.com")) return "acquire";
  return "unknown";
}

function buildPageUrl(baseUrl: string, page: number, platform: string): string {
  if (page === 1) return baseUrl;
  if (platform === "bizbuysell") {
    // BizBuySell uses /2/ /3/ etc at end of URL
    const cleanUrl = baseUrl.replace(/\/\d+\/$/, "/").replace(/\/$/, "");
    return `${cleanUrl}/${page}/`;
  }
  // Generic: add page param
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}page=${page}`;
}

// ─── BIZBUYSELL PARSER ───────────────────────────────────────────────────────

function parseBizBuySell(html: string): Record<string, string>[] {
  const listings: Record<string, string>[] = [];

  // BizBuySell listings are in divs with class "listing" or similar patterns
  // Extract using regex patterns on the HTML structure

  // Pattern 1: Extract from listing cards
  // Title is in <h2> or <a> tags with class containing "title" or "listing"
  // Price and cash flow are in specific spans/divs

  // Split by listing boundaries — each listing has a "Contact" button
  const listingBlocks = html.split(/(?=<div[^>]*class="[^"]*listing[^"]*")/i);

  for (const block of listingBlocks) {
    if (block.length < 100) continue;

    const listing: Record<string, string> = {};

    // Extract title
    const titleMatch = block.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i)
      || block.match(/<h[23][^>]*>(?:<a[^>]*>)?([^<]+)/i);
    if (titleMatch) listing.Title = cleanText(titleMatch[1]);

    // Extract location
    const locationMatch = block.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})/);
    if (locationMatch) listing.Location = locationMatch[1];

    // Extract asking price — look for dollar amounts near "asking" or as the primary price
    const pricePatterns = [
      /\$([0-9,]+(?:\.\d+)?)\s*(?:<|$)/,
      /Asking[^$]*\$([0-9,]+)/i,
      /Price[^$]*\$([0-9,]+)/i,
    ];
    for (const pat of pricePatterns) {
      const m = block.match(pat);
      if (m && !listing["Asking Price"]) {
        const val = m[1].replace(/,/g, "");
        if (parseInt(val) > 10000) listing["Asking Price"] = val;
      }
    }

    // Extract cash flow
    const cfMatch = block.match(/Cash\s*Flow[^$]*\$([0-9,]+)/i)
      || block.match(/(?:SDE|Discretionary)[^$]*\$([0-9,]+)/i);
    if (cfMatch) listing["Cash Flow"] = cfMatch[1].replace(/,/g, "");

    // Extract gross revenue
    const revMatch = block.match(/(?:Gross\s*)?Revenue[^$]*\$([0-9,]+)/i)
      || block.match(/Sales[^$]*\$([0-9,]+)/i);
    if (revMatch) listing["Gross Revenue"] = revMatch[1].replace(/,/g, "");

    // Extract listing URL
    const urlMatch = block.match(/href="(\/[^"]*Business-Opportunity[^"]*)"/i)
      || block.match(/href="(\/[^"]*-for-sale[^"]*)"/i);
    if (urlMatch) listing.source_url = `https://www.bizbuysell.com${urlMatch[1]}`;

    // Only add if we got at least a title and a price
    if (listing.Title && (listing["Asking Price"] || listing["Cash Flow"])) {
      listing.source_platform = "BizBuySell";
      listings.push(listing);
    }
  }

  // Fallback: try to extract from JSON-LD structured data
  if (listings.length === 0) {
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonStr = match.replace(/<\/?script[^>]*>/gi, "").trim();
          const data = JSON.parse(jsonStr);
          if (Array.isArray(data)) {
            data.forEach((item: Record<string, unknown>) => {
              if (item.name && item.offers) {
                listings.push({
                  Title: String(item.name),
                  Location: String((item as Record<string, unknown>).addressLocality || "") + ", " + String((item as Record<string, unknown>).addressRegion || ""),
                  "Asking Price": String((item.offers as Record<string, unknown>)?.price || ""),
                  source_url: String(item.url || ""),
                  source_platform: "BizBuySell",
                });
              }
            });
          }
        } catch { /* skip invalid JSON */ }
      }
    }
  }

  // Second fallback: extract price/cashflow pairs from raw text
  if (listings.length === 0) {
    // Find all price + cash flow pairs
    const priceCfPattern = /\$([0-9,]+)\s*(?:<[^>]*>)*\s*Cash\s*Flow[:\s]*\$([0-9,]+)/gi;
    let match;
    while ((match = priceCfPattern.exec(html)) !== null) {
      const price = match[1].replace(/,/g, "");
      const cf = match[2].replace(/,/g, "");
      if (parseInt(price) > 10000) {
        listings.push({
          Title: "Listing",
          "Asking Price": price,
          "Cash Flow": cf,
          source_platform: "BizBuySell",
        });
      }
    }
  }

  return listings;
}

// ─── BIZQUEST PARSER ─────────────────────────────────────────────────────────

function parseBizQuest(html: string): Record<string, string>[] {
  // BizQuest has similar structure to BizBuySell
  return parseBizBuySell(html); // Reuse same parser — similar HTML patterns
}

// ─── GENERIC HTML PARSER ─────────────────────────────────────────────────────

function parseGenericHTML(html: string): Record<string, string>[] {
  const listings: Record<string, string>[] = [];

  // Extract all dollar amounts with surrounding context
  const dollarPattern = /(?:[\w\s]{0,30})\$([0-9,]+(?:\.\d+)?)/g;
  const prices: { amount: number; context: string }[] = [];
  let match;
  while ((match = dollarPattern.exec(html)) !== null) {
    const amount = parseInt(match[1].replace(/,/g, ""));
    if (amount >= 50000 && amount <= 50000000) {
      const start = Math.max(0, match.index - 200);
      const context = html.slice(start, match.index + match[0].length + 200).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      prices.push({ amount, context });
    }
  }

  return listings;
}

// ─── AI ENRICHMENT ───────────────────────────────────────────────────────────

async function enrichWithAI(listings: Record<string, string>[], platform: string): Promise<Record<string, string>[]> {
  // If we have partial data, use Claude to clean and structure it
  try {
    const sampleData = listings.slice(0, 30).map((l) =>
      Object.entries(l).map(([k, v]) => `${k}: ${v}`).join(" | ")
    ).join("\n");

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
          content: `You are a data normalization system. Clean and structure these ${platform} business listings into standardized JSON.

Return ONLY a JSON array. No markdown, no backticks, no explanation. Each object should have these fields (use null for missing):
- Title (string)
- Location (string, format "City, ST")
- Category (string, the business type/industry)
- "Asking Price" (number, no commas)
- "Cash Flow" (number, no commas, this is SDE)
- "Gross Revenue" (number, no commas, if available)
- Employees (number, if available)
- source_url (string, if available)

RAW LISTINGS:
${sampleData}`,
        }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("").trim();
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) => {
          const obj: Record<string, string> = {};
          Object.entries(item).forEach(([k, v]) => {
            if (v !== null && v !== undefined) obj[k] = String(v);
          });
          obj.source_platform = platform;
          return obj;
        });
      }
    }
  } catch { /* fall through to return originals */ }

  return listings;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").trim();
}
