/**
 * app/api/cron/weekly-pulse/route.ts
 *
 * Runs every Monday at 1:00 AM EST.
 * Add to vercel.json:
 *   { "path": "/api/cron/weekly-pulse", "schedule": "0 6 * * 1" }
 *   (6 AM UTC = 1 AM EST)
 *
 * Does two things:
 *   1. Generates the weekly stats row in weekly_reports
 *   2. Triggers PDF generation and publishes the report
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nextax.ai";

  try {
    // Step 1: Generate weekly stats
    const generateRes = await fetch(`${baseUrl}/api/pulse/generate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.CRON_SECRET}` },
    });

    if (!generateRes.ok) {
      const err = await generateRes.text();
      return NextResponse.json({ error: "Generate failed", details: err }, { status: 500 });
    }

    const generateData = await generateRes.json();
    const { slug } = generateData;

    // Step 2: Generate PDF (runs in same request to stay within timeout)
    // Note: if PDF generation is too slow for 60s, move to a separate
    // triggered function or use a background job queue.
    const pdfRes = await fetch(
      `${baseUrl}/api/pulse/pdf?slug=${slug}&secret=${process.env.CRON_SECRET}`
    );

    const pdfData = pdfRes.ok ? await pdfRes.json() : { error: "PDF generation failed" };

    return NextResponse.json({
      success: true,
      slug,
      metrics: generateData.metrics,
      pdf: pdfData,
      reportUrl: `${baseUrl}/pulse/${slug}`,
    });

  } catch (err) {
    console.error("Weekly pulse cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
