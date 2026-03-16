/**
 * GET /api/pulse/pdf?slug=2026-03-16
 * Generates a PDF from the pulse report HTML using @sparticuz/chromium + puppeteer-core.
 * Works on Vercel — full puppeteer does NOT work on Vercel serverless.
 *
 * Install: pnpm add @sparticuz/chromium puppeteer-core
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  const secret = new URL(req.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    // Fetch the report data
    const { data: report, error } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Build the full HTML document for Puppeteer
    // We render the component as a static HTML string server-side
    const html = buildReportHTML(report);

    // Launch Puppeteer with Sparticuz Chromium (Vercel-compatible)
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for fonts to load
    await page.waitForTimeout(1500);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    // Upload to Supabase Storage
    const fileName = `pulse-${slug}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pulse-reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "PDF upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("pulse-reports")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update report with PDF URL and publish
    await supabase
      .from("weekly_reports")
      .update({ pdf_url: pdfUrl, is_published: true })
      .eq("slug", slug);

    return NextResponse.json({ success: true, pdfUrl, slug });

  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}

// ── Renders the report as a self-contained HTML string
// Inlines all styles — no external CSS dependencies for Puppeteer
function buildReportHTML(report: any): string {
  const dri = report.deal_reality_index || 1.0;
  const gap = report.dri_gap_pct || 0;
  const col = dri < 1.0 ? "#10B981" : dri <= 1.15 ? "#3B82F6" : dri <= 1.30 ? "#F59E0B" : "#EF4444";

  function fmt(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }
  function fmtDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  function gapColor(g: number) {
    return g < 0 ? "#10B981" : g <= 15 ? "#3B82F6" : g <= 30 ? "#F59E0B" : "#EF4444";
  }
  function driColor(d: number) {
    return d < 1.0 ? "#10B981" : d <= 1.15 ? "#3B82F6" : d <= 1.30 ? "#F59E0B" : "#EF4444";
  }

  // DRI ring path calculation
  const ringSize = 160, ringStroke = 12;
  const radius = (ringSize - ringStroke) / 2;
  const circ = radius * 2 * Math.PI;
  const driPct = Math.min(Math.max((dri - 0.5) / 1.5, 0), 1);
  const ringOffset = circ - driPct * circ;

  const maxBar = Math.max(report.avg_listing_multiple || 3, report.avg_sold_multiple || 3) * 1.2;

  // Sparkline SVG
  function sparklineSVG() {
    const trend = report.dri_trend || [];
    if (trend.length < 2) return "<p style='color:#4B5563;font-size:12px'>Building trend data...</p>";
    const values = trend.map((t: any) => t.dri);
    const min = Math.min(...values) - 0.05;
    const max = Math.max(...values) + 0.05;
    const range = max - min || 0.1;
    const W = 280, H = 60;
    const points = values.map((v: number, i: number) => ({
      x: (i / (values.length - 1)) * (W - 20) + 10,
      y: H - ((v - min) / range) * (H - 16) - 8,
    }));
    const pathD = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const lastColor = driColor(values[values.length - 1]);
    const fairY = H - ((1.0 - min) / range) * (H - 16) - 8;
    return `<svg width="${W}" height="${H+20}" style="overflow:visible">
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${lastColor}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${lastColor}" stop-opacity="0"/>
      </linearGradient></defs>
      <line x1="10" y1="${fairY}" x2="${W-10}" y2="${fairY}" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4 3"/>
      <path d="${pathD} L ${points[points.length-1].x} ${H} L ${points[0].x} ${H} Z" fill="url(#sg)"/>
      <path d="${pathD}" fill="none" stroke="${lastColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((p: any, i: number) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${driColor(values[i])}"/>`).join("")}
      ${trend.map((t: any, i: number) => `<text x="${points[i].x}" y="${H+14}" text-anchor="middle" style="font-size:9px;fill:#4B5563;font-family:monospace">${t.week}</text>`).join("")}
    </svg>`;
  }

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#080C14;color:#E2E8F0;font-family:'DM Sans',sans-serif}
  .page{width:794px;min-height:1123px;padding:0 0 60px;position:relative;page-break-after:always;background:#080C14}
  .accent{position:absolute;left:0;top:0;bottom:0;width:4px}
  .header{padding:20px 48px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.06)}
  .mono{font-family:'JetBrains Mono',monospace}
  .serif{font-family:'DM Serif Display',serif;font-weight:400}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 14px;font-size:9px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04)}
  td{padding:9px 14px;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.03)}
  tr:nth-child(even){background:rgba(255,255,255,0.01)}
  .footer{position:absolute;bottom:0;left:0;right:0;padding:16px 48px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between}
  .footer span{font-size:10px;color:#374151}
</style>
</head><body>

<!-- PAGE 1: COVER -->
<div class="page" style="background:linear-gradient(160deg,#080C14 0%,#0D1524 50%,#080C14 100%)">
  <div class="accent" style="background:linear-gradient(180deg,${col} 0%,transparent 100%)"></div>
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff">N</div>
      <span style="font-size:14px;font-weight:600;letter-spacing:0.05em">NEXTAX<span style="color:#6366F1">.AI</span></span>
    </div>
    <span class="mono" style="font-size:11px;color:#4B5563;letter-spacing:0.1em">SMB MARKET INTELLIGENCE • WEEK OF ${fmtDate(report.week_starting).toUpperCase()}</span>
  </div>

  <div style="padding:64px 48px 48px;display:grid;grid-template-columns:1fr 280px;gap:48px;align-items:center">
    <div>
      <div style="font-size:11px;color:#6366F1;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:16px">NexTax SMB Pulse Report</div>
      <h1 class="serif" style="font-size:44px;color:#F8FAFC;line-height:1.1;margin-bottom:20px">The SMB Deal Reality Index</h1>
      <p style="font-size:15px;color:#94A3B8;line-height:1.7;max-width:460px;margin-bottom:28px">
        SMB deals are currently priced <strong style="color:${col}">${Math.abs(gap)}% ${gap > 0 ? "above" : "below"} fair value</strong> based on ${(report.benchmarked_transactions || 13053).toLocaleString()}+ closed transaction benchmarks and ${report.total_deals_analyzed} live listings analyzed by NexTax.
      </p>
      <div style="display:inline-block;padding:8px 20px;border-radius:24px;border:1px solid ${col}30;background:${col}10;font-size:13px;color:${col};font-weight:600;letter-spacing:0.05em">${report.dri_interpretation}</div>
    </div>
    <div style="text-align:center">
      <div style="position:relative;width:${ringSize}px;height:${ringSize}px;margin:0 auto 16px">
        <svg width="${ringSize}" height="${ringSize}" style="transform:rotate(-90deg)">
          <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${ringStroke}"/>
          <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${radius}" fill="none" stroke="${col}" stroke-width="${ringStroke}" stroke-dasharray="${circ}" stroke-dashoffset="${ringOffset}" stroke-linecap="round"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <span class="mono" style="font-size:44px;font-weight:800;color:${col};line-height:1">${dri.toFixed(2)}</span>
          <span style="font-size:9px;color:#6B7280;text-transform:uppercase;letter-spacing:0.15em;margin-top:4px">Deal Reality Index</span>
        </div>
      </div>
      <div style="font-size:13px;color:#94A3B8;line-height:1.5">Buyers paying<br>
        <span class="mono" style="font-size:20px;font-weight:700;color:${col}">${gap > 0 ? "+" : ""}${gap}%</span><br>vs fair value
      </div>
    </div>
  </div>

  <div style="margin:0 48px;padding:24px 32px;background:rgba(255,255,255,0.025);border-radius:12px;border:1px solid rgba(255,255,255,0.06);display:grid;grid-template-columns:repeat(4,1fr)">
    ${[
      ["Live Deals Analyzed", report.total_deals_analyzed.toLocaleString(), "#E2E8F0"],
      ["Closed Transaction Benchmarks", (report.benchmarked_transactions || 13053).toLocaleString() + "+", "#E2E8F0"],
      ["Industries Tracked", "26", "#E2E8F0"],
      ["Overpriced Listings", report.pct_deals_overpriced + "%", "#EF4444"],
    ].map(([label, value, color], i) => `
      <div style="padding:0 24px;${i > 0 ? "border-left:1px solid rgba(255,255,255,0.06);" : ""}text-align:center">
        <div class="mono" style="font-size:28px;font-weight:800;color:${color};line-height:1;margin-bottom:6px">${value}</div>
        <div style="font-size:10px;color:#4B5563;text-transform:uppercase;letter-spacing:0.08em">${label}</div>
      </div>`).join("")}
  </div>

  <div style="margin:28px 48px 0;display:flex;gap:6px">
    ${[["< 1.0","Undervalued","#10B981"],["1.0–1.15","Healthy","#3B82F6"],["1.15–1.30","Overpriced","#F59E0B"],["1.30+","Highly Overpriced","#EF4444"]]
      .map(([range, label, color]) => `
      <div style="flex:1;text-align:center">
        <div style="height:4px;background:${color};border-radius:2px;opacity:0.7;margin-bottom:5px"></div>
        <div class="mono" style="font-size:10px;color:${color};font-weight:700">${range}</div>
        <div style="font-size:9px;color:#4B5563">${label}</div>
      </div>`).join("")}
  </div>

  <div class="footer">
    <span>NexTax.ai | Proprietary Market Intelligence</span>
    <span class="mono">Week of ${fmtDate(report.week_starting)}</span>
  </div>
</div>

<!-- PAGE 2: MARKET SNAPSHOT -->
<div class="page">
  <div class="accent" style="background:linear-gradient(180deg,#3B82F6 0%,transparent 100%)"></div>
  <div style="padding:48px 48px 0">
    <div style="font-size:10px;color:#3B82F6;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">Market Snapshot</div>
    <h2 class="serif" style="font-size:36px;color:#F8FAFC;margin-bottom:32px">What Sellers Want vs What Deals Close For</h2>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
      <div style="padding:28px;background:rgba(255,255,255,0.025);border-radius:12px;border:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px">Valuation Multiple Comparison</div>
        ${["Seller Expectations (Ask)","Market Reality (Closed)"].map((label, i) => {
          const val = i === 0 ? (report.avg_listing_multiple || 2.8) : (report.avg_sold_multiple || 2.2);
          const color = i === 0 ? "#F59E0B" : "#10B981";
          const pct = Math.min((val / maxBar) * 100, 100);
          return `<div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:13px;color:#94A3B8">${label}</span>
              <span class="mono" style="font-size:14px;font-weight:700;color:${color}">${val.toFixed(2)}x</span>
            </div>
            <div style="height:10px;background:rgba(255,255,255,0.06);border-radius:5px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:5px"></div>
            </div>
          </div>`;
        }).join("")}
        <div style="margin-top:16px;padding:10px 14px;background:rgba(239,68,68,0.06);border-radius:8px;border:1px solid rgba(239,68,68,0.12)">
          <span style="font-size:12px;color:#FCA5A5">The average SMB listing is <strong style="color:#EF4444">${gap}% overpriced</strong> this week.</span>
        </div>
      </div>

      <div style="padding:28px;background:rgba(255,255,255,0.025);border-radius:12px;border:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px">DRI Trend (Last 4 Weeks)</div>
        ${sparklineSVG()}
        <div style="margin-top:20px;font-size:12px;color:#6B7280;line-height:1.5">
          ${(report.dri_trend && report.dri_trend.length >= 2 && report.dri_trend[report.dri_trend.length-1].dri > report.dri_trend[0].dri)
            ? "⬆ Overpricing pressure is rising. Negotiate harder."
            : "⬇ Market pricing is improving for buyers."}
        </div>
      </div>
    </div>

    <div style="padding:24px 28px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(255,255,255,0.05);margin-bottom:28px">
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px">Deal Pricing Distribution — ${report.total_deals_analyzed} Active Listings</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${[
          ["Overpriced", report.pct_deals_overpriced, "#EF4444", "📈"],
          ["Fairly Priced", report.pct_deals_fair, "#3B82F6", "⚖️"],
          ["Undervalued", report.pct_deals_undervalued, "#10B981", "📉"],
        ].map(([label, pct, color, icon]) => `
          <div style="text-align:center;padding:16px 12px;background:${color}08;border-radius:8px;border:1px solid ${color}20">
            <div style="font-size:20px;margin-bottom:6px">${icon}</div>
            <div class="mono" style="font-size:32px;font-weight:800;color:${color};line-height:1">${pct}%</div>
            <div style="font-size:11px;color:#6B7280;margin-top:4px">${label}</div>
          </div>`).join("")}
      </div>
    </div>
  </div>
  <div class="footer"><span>NexTax.ai | Proprietary Market Intelligence</span><span class="mono">Page 2</span></div>
</div>

<!-- PAGE 3: INDUSTRY HEATMAP -->
<div class="page">
  <div class="accent" style="background:linear-gradient(180deg,#EF4444 0%,#10B981 100%)"></div>
  <div style="padding:48px 48px 0">
    <div style="font-size:10px;color:#EF4444;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">Industry Heat Map</div>
    <h2 class="serif" style="font-size:36px;color:#F8FAFC;margin-bottom:8px">Where Are Deals Over &amp; Underpriced?</h2>
    <p style="font-size:13px;color:#6B7280;margin-bottom:28px">Based on ${report.total_deals_analyzed} active marketplace listings vs ${(report.benchmarked_transactions || 13053).toLocaleString()}+ closed transaction benchmarks.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.12);border-radius:12px;padding:20px 24px">
        <div style="font-size:10px;color:#EF4444;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px">🔴 Most Overpriced</div>
        ${(report.most_overpriced || []).slice(0,5).map((ind: any, i: number) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:12px;font-weight:600;color:#E2E8F0">${i+1}. ${ind.label}</span>
            <div style="text-align:right">
              <span class="mono" style="font-size:15px;font-weight:700;color:${gapColor(ind.gap_pct)}">+${ind.gap_pct}%</span>
              <div style="font-size:9px;color:#6B7280">DRI ${ind.dri.toFixed(2)}</div>
            </div>
          </div>`).join("")}
      </div>
      <div style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.12);border-radius:12px;padding:20px 24px">
        <div style="font-size:10px;color:#10B981;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px">🟢 Most Undervalued</div>
        ${(report.most_undervalued || []).slice(0,5).map((ind: any, i: number) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:12px;font-weight:600;color:#E2E8F0">${i+1}. ${ind.label}</span>
            <div style="text-align:right">
              <span class="mono" style="font-size:15px;font-weight:700;color:#10B981">${ind.gap_pct}%</span>
              <div style="font-size:9px;color:#6B7280">DRI ${ind.dri.toFixed(2)}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.05);overflow:hidden">
      <table>
        <thead><tr><th>Industry</th><th>DRI</th><th>Gap</th><th>Ask Multiple</th><th>Sold Multiple</th><th>Condition</th></tr></thead>
        <tbody>
          ${((report.most_overpriced || []).concat(report.most_undervalued || [])).slice(0, 10).map((ind: any) => `
            <tr>
              <td style="font-size:12px;color:#E2E8F0;font-weight:500">${ind.label}</td>
              <td class="mono" style="font-size:13px;font-weight:700;color:${driColor(ind.dri)}">${ind.dri.toFixed(2)}</td>
              <td class="mono" style="font-size:12px;font-weight:600;color:${gapColor(ind.gap_pct)}">${ind.gap_pct > 0 ? "+" : ""}${ind.gap_pct}%</td>
              <td class="mono" style="font-size:12px;color:#94A3B8">${ind.listing_multiple ? ind.listing_multiple + "x" : "—"}</td>
              <td class="mono" style="font-size:12px;color:#94A3B8">${ind.sold_multiple ? ind.sold_multiple + "x" : "—"}</td>
              <td style="font-size:10px;font-weight:500;color:${driColor(ind.dri)}">${ind.condition}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>
  <div class="footer"><span>NexTax.ai | Proprietary Market Intelligence</span><span class="mono">Page 3</span></div>
</div>

<!-- PAGE 4: OPPORTUNITIES + CTA -->
<div class="page">
  <div class="accent" style="background:linear-gradient(180deg,#6366F1 0%,transparent 100%)"></div>
  <div style="padding:48px 48px 0">
    <div style="font-size:10px;color:#818CF8;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">Buyer Intelligence</div>
    <h2 class="serif" style="font-size:36px;color:#F8FAFC;margin-bottom:8px">Deals Worth Looking At This Week</h2>
    <p style="font-size:13px;color:#6B7280;margin-bottom:24px">Filtered from ${report.total_deals_analyzed} active listings. Score 65+ with favorable pricing signals.</p>

    <div style="background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.05);overflow:hidden;margin-bottom:24px">
      <table>
        <thead><tr><th>Industry</th><th>SDE</th><th>Asking Price</th><th>Fair Value</th><th>Score</th><th>Signal</th></tr></thead>
        <tbody>
          ${(report.top_opportunities || []).slice(0,6).map((opp: any) => {
            const isOver = opp.fair_value && opp.asking_price > opp.fair_value * 1.15;
            const isUnder = opp.fair_value && opp.asking_price < opp.fair_value * 0.85;
            const signal = isOver ? "Overpriced" : isUnder ? "Undervalued" : "Fair Market";
            const sc = isOver ? "#EF4444" : isUnder ? "#10B981" : "#3B82F6";
            return `<tr>
              <td style="font-size:13px;font-weight:600;color:#E2E8F0">${opp.industry}</td>
              <td class="mono" style="font-size:12px;color:#94A3B8">${fmt(opp.sde)}</td>
              <td class="mono" style="font-size:12px;color:#E2E8F0;font-weight:600">${fmt(opp.asking_price)}</td>
              <td class="mono" style="font-size:12px;color:#C4B5FD">${opp.fair_value ? fmt(opp.fair_value) : "—"}</td>
              <td class="mono" style="font-size:14px;font-weight:800;color:${opp.score >= 70 ? "#10B981" : "#F59E0B"}">${opp.score}</td>
              <td><span style="font-size:10px;font-weight:600;color:${sc};padding:2px 8px;border-radius:4px;background:${sc}15">${signal}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
      <div style="padding:20px 24px;background:rgba(245,158,11,0.06);border-radius:10px;border:1px solid rgba(245,158,11,0.15)">
        <div style="font-size:10px;color:#F59E0B;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">🔥 Buyer Pain Index</div>
        <div class="mono" style="font-size:36px;font-weight:800;color:#F59E0B;line-height:1;margin-bottom:4px">${report.buyer_pain_index?.toFixed(2) || "—"}</div>
        <div style="font-size:12px;color:#94A3B8">Top concern: <strong style="color:#E2E8F0">${(report.top_pain_category || "").replace(/_/g," ")}</strong></div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Based on ${report.pain_signal_count} community signals</div>
      </div>
      <div style="padding:20px 24px;background:rgba(99,102,241,0.06);border-radius:10px;border:1px solid rgba(99,102,241,0.15)">
        <div style="font-size:10px;color:#818CF8;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">📊 This Week in Numbers</div>
        ${[["Avg ask multiple",(report.avg_listing_multiple||0).toFixed(2)+"x"],["Avg sold multiple",(report.avg_sold_multiple||0).toFixed(2)+"x"],["Pricing gap","+"+(gap)+"%"]]
          .map(([label,value])=>`
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12px;color:#6B7280">${label}</span>
            <span class="mono" style="font-size:13px;font-weight:600;color:#E2E8F0">${value}</span>
          </div>`).join("")}
      </div>
    </div>

    <div style="padding:28px 32px;background:linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(139,92,246,0.08) 100%);border-radius:14px;border:1px solid rgba(99,102,241,0.25);text-align:center">
      <p class="serif" style="font-size:18px;color:#E2E8F0;margin-bottom:10px;line-height:1.5">
        "The market average DRI is ${dri.toFixed(2)}, but your target deal is unique.<br>
        <em>Is it a diamond in the rough or a pricing disaster?</em>"
      </p>
      <p style="font-size:13px;color:#94A3B8;margin-bottom:18px">Run your target deal through the same engine used for this report. 10 seconds to a Fair Value check.</p>
      <div style="display:inline-block;padding:12px 32px;border-radius:10px;background:linear-gradient(135deg,#6366F1,#8B5CF6);font-size:15px;font-weight:700;color:#fff;letter-spacing:0.02em">
        Check My Deal Reality Score → nextax.ai/deal-reality-check
      </div>
    </div>
  </div>
  <div class="footer"><span>NexTax.ai | Proprietary Market Intelligence</span><span class="mono">Page 4 • nextax.ai</span></div>
</div>

</body></html>`;
}
