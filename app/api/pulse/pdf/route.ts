/**
 * GET /api/pulse/pdf?slug=2026-03-09&secret=...
 *
 * Generates a branded PDF using jsPDF (no Puppeteer/Chromium needed).
 * jsPDF runs entirely in Node — no binary dependencies, works on Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 30;

// ── Color palette
const C = {
  bg:        [8,  12,  20]  as [number,number,number],
  bgLight:   [13, 21,  36]  as [number,number,number],
  accent:    [99, 102, 241] as [number,number,number],  // indigo
  green:     [16, 185, 129] as [number,number,number],
  amber:     [245,158, 11]  as [number,number,number],
  red:       [239, 68,  68] as [number,number,number],
  blue:      [59, 130, 246] as [number,number,number],
  white:     [248,250, 252] as [number,number,number],
  muted:     [148,163, 184] as [number,number,number],
  faint:     [75,  85,  99] as [number,number,number],
  border:    [30,  41,  59] as [number,number,number],
};

function driColor(dri: number): [number,number,number] {
  if (dri < 1.0)   return C.green;
  if (dri <= 1.15) return C.blue;
  if (dri <= 1.30) return C.amber;
  return C.red;
}
function gapColor(gap: number): [number,number,number] {
  if (gap < 0)   return C.green;
  if (gap <= 15) return C.blue;
  if (gap <= 30) return C.amber;
  return C.red;
}
function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(v);
}
function fmtDateRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end   + "T12:00:00");
  return `${s.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
}

// Draw full-page dark background
function drawBackground(doc: jsPDF) {
  const [w, h] = [doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight()];
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, w, h, "F");
}

// Left accent bar
function drawAccent(doc: jsPDF, color: [number,number,number]) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...color);
  doc.rect(0, 0, 4, h, "F");
}

// Header bar with logo text + date
function drawHeader(doc: jsPDF, dateRange: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.bgLight);
  doc.rect(0, 0, w, 18, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(0, 18, w, 18);

  // NEXTAX in white
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text("NEXTAX", 10, 12);

  // AI in accent color
  doc.setTextColor(...C.accent);
  doc.text("AI", 10 + doc.getTextWidth("NEXTAX") + 0.5, 12);

  // Date range right-aligned
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.faint);
  doc.text(`SMB MARKET INTELLIGENCE  •  ${dateRange.toUpperCase()}`, w - 10, 12, { align: "right" });
}

// Footer bar
function drawFooter(doc: jsPDF, pageNum: number) {
  const [w, h] = [doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight()];
  doc.setFillColor(...C.bgLight);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(0, h - 12, w, h - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.faint);
  doc.text("NexTax.ai  |  Proprietary Market Intelligence", 10, h - 4);
  doc.text(`Page ${pageNum}  •  nextax.ai/deal-reality-check`, w - 10, h - 4, { align: "right" });
}

// Section label (small uppercase colored label)
function sectionLabel(doc: jsPDF, text: string, x: number, y: number, color: [number,number,number]) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...color);
  doc.text(text.toUpperCase(), x, y);
}

// Stat box: colored value + small label
function statBox(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, valueColor: [number,number,number]) {
  doc.setFillColor(...C.bgLight);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...valueColor);
  doc.text(value, x + w/2, y + h/2 - 1, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.faint);
  doc.text(label.toUpperCase(), x + w/2, y + h/2 + 6, { align: "center" });
}

// Horizontal bar chart row
function barRow(doc: jsPDF, x: number, y: number, totalW: number, label: string, value: number, maxVal: number, color: [number,number,number], suffix = "x") {
  const barW = totalW - 50;
  const fillW = Math.min((value / maxVal) * barW, barW);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(label, x, y + 4);
  // track
  doc.setFillColor(...C.border);
  doc.roundedRect(x, y + 6, barW, 5, 1, 1, "F");
  // fill
  doc.setFillColor(...color);
  doc.roundedRect(x, y + 6, fillW, 5, 1, 1, "F");
  // value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...color);
  doc.text(`${value.toFixed(2)}${suffix}`, x + barW + 4, y + 11);
}

// Industry table row
function industryRow(doc: jsPDF, x: number, y: number, w: number, label: string, gap: number, dri: number, isEven: boolean) {
  if (isEven) {
    doc.setFillColor(15, 23, 42);
    doc.rect(x, y - 4, w, 10, "F");
  }
  const gc = gapColor(gap);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.white);
  doc.text(label, x + 3, y + 2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gc);
  doc.text(`${gap > 0 ? "+" : ""}${gap}%`, x + w - 40, y + 2);
  doc.setTextColor(...driColor(dri));
  doc.text(dri.toFixed(2), x + w - 16, y + 2);
}

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

  try {
    const { data: report, error } = await supabase
      .from("weekly_reports").select("*").eq("slug", slug).single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const dri       = report.deal_reality_index || 1.0;
    const gap       = report.dri_gap_pct || 0;
    const col       = driColor(dri);
    const dateRange = fmtDateRange(report.week_starting, report.week_ending);
    const maxMult   = Math.max(report.avg_listing_multiple || 3, report.avg_sold_multiple || 3) * 1.15;

    // ── Initialize jsPDF (A4 landscape for wide layout, or portrait)
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW  = doc.internal.pageSize.getWidth();   // 210mm

    // ════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════
    drawBackground(doc);
    drawAccent(doc, col);
    drawHeader(doc, dateRange);

    // Hero section label
    sectionLabel(doc, "NexTax SMB Pulse Report", 10, 32, C.accent);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...C.white);
    doc.text("The SMB Deal", 10, 48);
    doc.text("Reality Index", 10, 60);

    // DRI ring (drawn as concentric circles)
    const cx = 160, cy = 58, r = 28, sw = 5;
    // Track circle
    doc.setDrawColor(...C.border);
    doc.setLineWidth(sw);
    doc.circle(cx, cy, r, "S");
    // Arc (approximate with colored circle overlay — jsPDF doesn't support arcs directly)
    // Draw filled arc sector using the DRI percentage
    const driPct = Math.min(Math.max((dri - 0.5) / 1.5, 0), 1);
    doc.setDrawColor(...col);
    doc.setLineWidth(sw);
    // Draw arc using small line segments
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + driPct * 2 * Math.PI;
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const a1 = startAngle + (i / steps) * (endAngle - startAngle);
      const a2 = startAngle + ((i + 1) / steps) * (endAngle - startAngle);
      if (a1 >= endAngle) break;
      doc.setDrawColor(...col);
      doc.setLineWidth(sw);
      doc.line(
        cx + r * Math.cos(a1), cy + r * Math.sin(a1),
        cx + r * Math.cos(a2), cy + r * Math.sin(a2)
      );
    }
    // DRI number in center
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...col);
    doc.text(dri.toFixed(2), cx, cy + 2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.faint);
    doc.text("DEAL REALITY INDEX", cx, cy + 8, { align: "center" });

    // Interpretation badge
    doc.setFillColor(...C.bgLight);
    doc.roundedRect(8, 68, 90, 10, 2, 2, "F");
    doc.setDrawColor(...col);
    doc.setLineWidth(0.3);
    doc.roundedRect(8, 68, 90, 10, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...col);
    doc.text(report.dri_interpretation || "Moderately Overpriced", 53, 74.5, { align: "center" });

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const subtitle = `SMB deals are currently priced ${Math.abs(gap)}% ${gap > 0 ? "above" : "below"} fair value based on ${(report.benchmarked_transactions||13053).toLocaleString()}+ closed transaction benchmarks and ${report.total_deals_analyzed} live listings.`;
    const lines = doc.splitTextToSize(subtitle, 130);
    doc.text(lines, 10, 86);

    // KPI strip
    const kpis = [
      { v: report.total_deals_analyzed.toString(), l: "Live Deals Analyzed",  c: C.white },
      { v: `${(report.benchmarked_transactions||13053).toLocaleString()}+`, l: "Closed Benchmarks", c: C.white },
      { v: "26",   l: "Industries Tracked",    c: C.white },
      { v: `${report.pct_deals_overpriced}%`, l: "Overpriced Listings", c: C.red },
    ];
    const kpiW = (PW - 20) / 4;
    kpis.forEach((k, i) => statBox(doc, 10 + i * kpiW, 102, kpiW - 3, 24, k.v, k.l, k.c));

    // Scale legend
    const scales = [
      { range: "< 1.0",     label: "Undervalued", color: C.green },
      { range: "1.0–1.15",  label: "Healthy",     color: C.blue  },
      { range: "1.15–1.30", label: "Overpriced",  color: C.amber },
      { range: "1.30+",     label: "High Risk",   color: C.red   },
    ];
    const scW = (PW - 20) / 4;
    scales.forEach((s, i) => {
      const sx = 10 + i * scW;
      doc.setFillColor(...s.color);
      doc.rect(sx, 132, scW - 3, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...s.color);
      doc.text(s.range, sx, 138);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...C.faint);
      doc.text(s.label, sx, 142);
    });

    // Trend if available
    if (report.dri_trend && report.dri_trend.length >= 2) {
      sectionLabel(doc, "DRI Trend (Last 4 Weeks)", 10, 154, C.faint);
      const trend = report.dri_trend;
      const tW = PW - 20, tH = 24, tX = 10, tY = 158;
      doc.setFillColor(...C.bgLight);
      doc.roundedRect(tX, tY, tW, tH, 2, 2, "F");

      const values = trend.map((t: any) => t.dri);
      const minV = Math.min(...values) - 0.05;
      const maxV = Math.max(...values) + 0.05;
      const range = maxV - minV || 0.1;

      // Fair value line
      const fairY = tY + tH - ((1.0 - minV) / range) * tH;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(tX + 4, fairY, tX + tW - 4, fairY);
      doc.setLineDashPattern([], 0);

      // Trend line
      const pts = values.map((v: number, i: number) => ({
        x: tX + 4 + (i / (values.length - 1)) * (tW - 8),
        y: tY + tH - ((v - minV) / range) * tH,
      }));
      doc.setDrawColor(...col);
      doc.setLineWidth(1);
      for (let i = 0; i < pts.length - 1; i++) {
        doc.line(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
      }
      // Dots + labels
      pts.forEach((p: {x:number,y:number}, i: number) => {
        doc.setFillColor(...driColor(values[i]));
        doc.circle(p.x, p.y, 1, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(...C.faint);
        doc.text(trend[i].week, p.x, tY + tH + 4, { align: "center" });
        doc.setTextColor(...driColor(values[i]));
        doc.text(values[i].toFixed(2), p.x, p.y - 2, { align: "center" });
      });
    }

    drawFooter(doc, 1);

    // ════════════════════════════════════════════════
    // PAGE 2 — MARKET SNAPSHOT + SENTIMENT
    // ════════════════════════════════════════════════
    doc.addPage();
    drawBackground(doc);
    drawAccent(doc, C.blue);
    drawHeader(doc, dateRange);

    sectionLabel(doc, "Market Snapshot", 10, 28, C.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.white);
    doc.text("What Sellers Want vs What Deals Close For", 10, 38);

    // Pricing bars
    const bY = 46;
    barRow(doc, 10, bY,      PW - 20, "Seller Expectations (Ask)", report.avg_listing_multiple || 2.8, maxMult, C.amber);
    barRow(doc, 10, bY + 18, PW - 20, "Market Reality (Closed)",   report.avg_sold_multiple    || 2.2, maxMult, C.green);

    // Pricing gap callout box
    doc.setFillColor(50, 20, 20);
    doc.roundedRect(10, 90, PW - 20, 18, 2, 2, "F");
    doc.setDrawColor(...C.red);
    doc.setLineWidth(0.3);
    doc.roundedRect(10, 90, PW - 20, 18, 2, 2, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(252, 165, 165);
    doc.text(`The average SMB listing is priced `, PW/2, 97, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...C.red);
    doc.text(`+${gap}% above fair value`, PW/2, 104, { align: "center" });

    // Sentiment distribution
    sectionLabel(doc, `Deal Pricing Distribution — ${report.total_deals_analyzed} Active Listings`, 10, 118, C.faint);
    const sentW = (PW - 20) / 3;
    [
      { label: "Overpriced",    pct: report.pct_deals_overpriced,  color: C.red   },
      { label: "Fairly Priced", pct: report.pct_deals_fair,        color: C.blue  },
      { label: "Undervalued",   pct: report.pct_deals_undervalued, color: C.green },
    ].forEach((item, i) => {
      const sx = 10 + i * sentW;
      doc.setFillColor(...C.bgLight);
      doc.roundedRect(sx, 122, sentW - 4, 28, 2, 2, "F");
      doc.setDrawColor(...item.color);
      doc.setLineWidth(0.3);
      doc.roundedRect(sx, 122, sentW - 4, 28, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...item.color);
      doc.text(`${item.pct}%`, sx + (sentW - 4) / 2, 136, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(item.label, sx + (sentW - 4) / 2, 144, { align: "center" });
    });

    drawFooter(doc, 2);

    // ════════════════════════════════════════════════
    // PAGE 3 — INDUSTRY HEATMAP
    // ════════════════════════════════════════════════
    doc.addPage();
    drawBackground(doc);
    drawAccent(doc, C.red);
    drawHeader(doc, dateRange);

    sectionLabel(doc, "Industry Heat Map", 10, 28, C.red);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.white);
    doc.text("Where Are Deals Over & Underpriced?", 10, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.faint);
    doc.text(`Based on ${report.total_deals_analyzed} active listings vs ${(report.benchmarked_transactions||13053).toLocaleString()}+ closed comps`, 10, 44);

    // Two column layout: overpriced | undervalued
    const colW = (PW - 24) / 2;

    // Overpriced header
    doc.setFillColor(60, 15, 15);
    doc.roundedRect(10, 50, colW, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.red);
    doc.text("🔴 MOST OVERPRICED", 10 + colW/2, 55.5, { align: "center" });

    // Undervalued header
    doc.setFillColor(10, 50, 35);
    doc.roundedRect(14 + colW, 50, colW, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.green);
    doc.text("🟢 MOST UNDERVALUED", 14 + colW + colW/2, 55.5, { align: "center" });

    // Table headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text("INDUSTRY", 13, 64);
    doc.text("GAP", 10 + colW - 26, 64);
    doc.text("DRI", 10 + colW - 8, 64);
    doc.text("INDUSTRY", 17 + colW, 64);
    doc.text("GAP", 14 + colW*2 - 26, 64);
    doc.text("DRI", 14 + colW*2 - 8, 64);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(10, 66, 10 + colW, 66);
    doc.line(14 + colW, 66, 14 + colW*2, 66);

    // Rows
    const overRows  = (report.most_overpriced  || []).slice(0, 8);
    const underRows = (report.most_undervalued || []).slice(0, 8);
    overRows.forEach((ind: any, i: number) => {
      industryRow(doc, 10, 72 + i * 11, colW, ind.label, ind.gap_pct, ind.dri, i % 2 === 1);
    });
    underRows.forEach((ind: any, i: number) => {
      industryRow(doc, 14 + colW, 72 + i * 11, colW, ind.label, ind.gap_pct, ind.dri, i % 2 === 1);
    });

    // Full table below
    const allInds = (report.all_industries || []).slice(0, 16);
    const tableY = 72 + Math.max(overRows.length, underRows.length) * 11 + 10;
    sectionLabel(doc, "All Industries — Sorted by DRI", 10, tableY, C.faint);

    // Table headers
    const cols = { industry: 10, dri: 110, gap: 130, askMult: 152, soldMult: 174, condition: 190 };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text("INDUSTRY", cols.industry + 2, tableY + 7);
    doc.text("DRI", cols.dri, tableY + 7);
    doc.text("GAP", cols.gap, tableY + 7);
    doc.text("ASK", cols.askMult, tableY + 7);
    doc.text("SOLD", cols.soldMult, tableY + 7);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(10, tableY + 9, PW - 10, tableY + 9);

    allInds.forEach((ind: any, i: number) => {
      const ry = tableY + 14 + i * 8;
      if (i % 2 === 0) {
        doc.setFillColor(15, 23, 42);
        doc.rect(10, ry - 4, PW - 20, 8, "F");
      }
      const dc = driColor(ind.dri);
      const gc2 = gapColor(ind.gap_pct);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.white);
      doc.text(ind.label || ind.industry, cols.industry + 2, ry);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dc);
      doc.text(ind.dri.toFixed(2), cols.dri, ry);
      doc.setTextColor(...gc2);
      doc.text(`${ind.gap_pct > 0 ? "+" : ""}${ind.gap_pct}%`, cols.gap, ry);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.muted);
      doc.text(ind.listing_multiple ? `${ind.listing_multiple}x` : "—", cols.askMult, ry);
      doc.text(ind.sold_multiple   ? `${ind.sold_multiple}x`   : "—", cols.soldMult, ry);
    });

    drawFooter(doc, 3);

    // ════════════════════════════════════════════════
    // PAGE 4 — OPPORTUNITIES + CTA
    // ════════════════════════════════════════════════
    doc.addPage();
    drawBackground(doc);
    drawAccent(doc, C.accent);
    drawHeader(doc, dateRange);

    sectionLabel(doc, "Buyer Intelligence", 10, 28, C.accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.white);
    doc.text("Deals Worth Looking At This Week", 10, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.faint);
    doc.text(`Filtered from ${report.total_deals_analyzed} active listings — Score 65+ with favorable pricing signals`, 10, 44);

    // Opportunities table
    const oppCols = { industry: 10, sde: 70, ask: 105, fv: 140, score: 168, signal: 182 };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    ["INDUSTRY","SDE","ASKING","FAIR VALUE","SCORE","SIGNAL"].forEach((h, i) => {
      const x = [oppCols.industry, oppCols.sde, oppCols.ask, oppCols.fv, oppCols.score, oppCols.signal][i];
      doc.text(h, x + 2, 52);
    });
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(10, 54, PW - 10, 54);

    (report.top_opportunities || []).slice(0, 6).forEach((opp: any, i: number) => {
      const ry = 60 + i * 10;
      if (i % 2 === 0) {
        doc.setFillColor(15, 23, 42);
        doc.rect(10, ry - 4, PW - 20, 10, "F");
      }
      const isOver  = opp.fair_value && opp.asking_price > opp.fair_value * 1.15;
      const isUnder = opp.fair_value && opp.asking_price < opp.fair_value * 0.85;
      const sigColor = isOver ? C.red : isUnder ? C.green : C.blue;
      const sigLabel = isOver ? "Overpriced" : isUnder ? "Undervalued" : "Fair Market";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.white);
      doc.text(opp.industry, oppCols.industry + 2, ry);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.muted);
      doc.text(fmt(opp.sde), oppCols.sde + 2, ry);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.white);
      doc.text(fmt(opp.asking_price), oppCols.ask + 2, ry);
      doc.setTextColor(196, 181, 253);
      doc.text(opp.fair_value ? fmt(opp.fair_value) : "—", oppCols.fv + 2, ry);
      doc.setTextColor(opp.score >= 70 ? C.green[0] : C.amber[0], opp.score >= 70 ? C.green[1] : C.amber[1], opp.score >= 70 ? C.green[2] : C.amber[2]);
      doc.text(String(opp.score), oppCols.score + 2, ry);
      doc.setFillColor(...sigColor);
      doc.roundedRect(oppCols.signal, ry - 4, 22, 7, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.bg);
      doc.text(sigLabel, oppCols.signal + 11, ry, { align: "center" });
    });

    // Pain index + CTA
    const painY = 60 + 6 * 10 + 8;
    doc.setFillColor(40, 30, 10);
    doc.roundedRect(10, painY, 90, 24, 2, 2, "F");
    doc.setDrawColor(...C.amber);
    doc.setLineWidth(0.3);
    doc.roundedRect(10, painY, 90, 24, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.amber);
    doc.text("🔥 BUYER PAIN INDEX", 55, painY + 7, { align: "center" });
    doc.setFontSize(20);
    doc.text(report.buyer_pain_index?.toFixed(2) || "—", 55, painY + 17, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(`Top concern: ${(report.top_pain_category||"").replace(/_/g," ")}`, 55, painY + 22, { align: "center" });

    // CTA box
    doc.setFillColor(20, 20, 50);
    doc.roundedRect(105, painY, PW - 115, 24, 2, 2, "F");
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.5);
    doc.roundedRect(105, painY, PW - 115, 24, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(`DRI is ${dri.toFixed(2)} — is your deal fairly priced?`, 105 + (PW - 115) / 2, painY + 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("10 seconds to a fair value check.", 105 + (PW - 115) / 2, painY + 14, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.accent);
    doc.text("nextax.ai/deal-reality-check →", 105 + (PW - 115) / 2, painY + 21, { align: "center" });

    drawFooter(doc, 4);

    // ── Output as buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Upload to Supabase Storage
    const fileName = `pulse-${slug}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("pulse-reports")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "PDF upload failed", details: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("pulse-reports").getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;

    // Update report
    await supabase.from("weekly_reports")
      .update({ pdf_url: pdfUrl, is_published: true })
      .eq("slug", slug);

    return NextResponse.json({ success: true, pdfUrl, slug });

  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json({
      error: "PDF generation failed",
      details: err?.message || String(err),
    }, { status: 500 });
  }
}
