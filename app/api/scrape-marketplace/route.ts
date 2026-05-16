import { NextRequest, NextResponse } from "next/server";
import { CLAUDE_MODELS, ANTHROPIC_API_VERSION } from "@/lib/claude-models";

// Scrapes BizBuySell search result pages and extracts structured listing data
// Also supports Flippa and BizQuest
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, platform, pages_to_scrape } = body;
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }
    const maxPages = Math.min(pages_to_scrape || 1, 3); // Cap at 3 pages for Vercel timeout
    const allListings: Record<string, string>[] = [];
    const detectedPlatform = platform || detectPlatform(url);
    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = buildPageUrl(url, page, detectedPlatform);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6s per page fetch
        const res = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
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
    return NextResponse.json({
      success: true,
      platform: detectedPlatform,
      pages_scraped: maxPages,
      listings: allListings,
      count: allListings.length,
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
  if (url.includes("busin
