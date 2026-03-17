/**
 * GET /api/pulse/linkedin?slug=2026-03-09&secret=...
 *
 * Returns the report data as JSON so the browser-side carousel
 * page can render and download slides as a PDF using jsPDF.
 * No Puppeteer/Chromium needed — runs entirely in the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url    = new URL(req.url);
  const slug   = url.searchParams.get("slug");
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") || url.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const { data: report, error } = await supabase
    .from("weekly_reports").select("*").eq("slug", slug).single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    slug,
    report,
    carouselUrl: `https://nextax.ai/pulse/${slug}/carousel`,
    suggestedCaption: `The SMB Deal Reality Index is ${report.deal_reality_index?.toFixed(2)} this week — buyers are paying ${report.dri_gap_pct}% above fair value.\n\n${report.pct_deals_overpriced}% of listings are overpriced. Top industries to watch: ${(report.most_overpriced||[]).slice(0,3).map((i: any) => i.label).join(", ")}.\n\nSwipe to see the full breakdown →\n\nRun your deal: nextax.ai/deal-reality-check\n\n#SMBacquisitions #ETA #dealflow #businessacquisition #NexTaxAI`,
  });
}
