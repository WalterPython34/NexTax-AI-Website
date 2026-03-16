/**
 * GET /api/pulse/linkedin?slug=2026-03-09&secret=...
 *
 * Generates 6 LinkedIn carousel slides as a ZIP of PNG images.
 * Each slide is 1080×1350px (LinkedIn portrait 4:5 format).
 * Download the ZIP, extract, upload all 6 PNGs to LinkedIn as a document post.
 *
 * Install: pnpm add archiver @types/archiver
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

const SLIDE_W = 1080;
const SLIDE_H = 1350;

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function fmtDateRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end   + "T12:00:00");
  const mo = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  const dy = (d: Date) => d.getDate();
  const yr = (d: Date) => d.getFullYear();
  return `${mo(s)} ${dy(s)} – ${mo(e)} ${dy(e)}, ${yr(e)}`;
}
function driColor(dri: number) {
  if (dri < 1.0)   return "#10B981";
  if (dri <= 1.15) return "#3B82F6";
  if (dri <= 1.30) return "#F59E0B";
  return "#EF4444";
}
function gapColor(gap: number) {
  if (gap < 0)   return "#10B981";
  if (gap <= 15) return "#3B82F6";
  if (gap <= 30) return "#F59E0B";
  return "#EF4444";
}

// Shared wrapper: top bar + left accent + bottom bar + grid texture
function slide(num: number, accent: string, content: string, dateRange: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;background:#080C14;
    font-family:'DM Sans',sans-serif;color:#E2E8F0}
  .mono{font-family:'JetBrains Mono',monospace}
  .serif{font-family:'DM Serif Display',serif;font-weight:400}
  .bar{height:12px;border-radius:6px}
</style>
</head><body>
<div style="width:${SLIDE_W}px;height:${SLIDE_H}px;position:relative;overflow:hidden;
  background:linear-gradient(160deg,#080C14 0%,#0D1524 60%,#080C14 100%)">

  <!-- Grid texture -->
  <div style="position:absolute;inset:0;opacity:0.025;
    background-image:linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px);
    background-size:54px 54px"></div>

  <!-- Left accent -->
  <div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:${accent}"></div>

  <!-- Top bar -->
  <div style="position:absolute;top:0;left:6px;right:0;height:80px;padding:0 52px;
    display:flex;justify-content:space-between;align-items:center;
    border-bottom:1px solid rgba(255,255,255,0.07);background:rgba(0,0,0,0.25)">
    <span style="font-size:20px;font-weight:800;letter-spacing:0.06em;color:#fff">
      NEXTAX<span style="background:linear-gradient(135deg,#3DD68C,#22B8CF);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">AI</span>
    </span>
    <div style="display:flex;align-items:center;gap:16px">
      <span class="mono" style="font-size:13px;color:#4B5563;letter-spacing:0.08em">
        ${dateRange.toUpperCase()}
      </span>
      <span style="font-size:12px;color:#374151;padding:4px 10px;border-radius:12px;
        border:1px solid rgba(255,255,255,0.08)">${num} / 6</span>
    </div>
  </div>

  <!-- Content area -->
  <div style="position:absolute;top:80px;left:6px;right:0;bottom:72px;padding:52px 56px 0">
    ${content}
  </div>

  <!-- Bottom bar -->
  <div style="position:absolute;bottom:0;left:6px;right:0;height:72px;
    padding:0 52px;display:flex;justify-content:space-between;align-items:center;
    border-top:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.25)">
    <span style="font-size:13px;color:#374151">NexTax.ai | Proprietary Market Intelligence</span>
    <span class="mono" style="font-size:13px;color:#4B5563">nextax.ai/deal-reality-check</span>
  </div>
</div>
</body></html>`;
}

function buildAllSlides(r: any): string[] {
  const dri     = r.deal_reality_index || 1.0;
  const gap     = r.dri_gap_pct || 0;
  const col     = driColor(dri);
  const dateRange = fmtDateRange(r.week_starting, r.week_ending);
  const maxBar  = Math.max(r.avg_listing_multiple || 3, r.avg_sold_multiple || 3) * 1.1;

  // DRI ring
  const RS = 300, SW = 20, rad = (RS - SW) / 2;
  const circ = rad * 2 * Math.PI;
  const offset = circ - Math.min(Math.max((dri - 0.5) / 1.5, 0), 1) * circ;

  // ── SLIDE 1: Cover
  const s1 = slide(1, `linear-gradient(180deg,${col} 0%,transparent 100%)`, `
    <div style="text-align:center;padding-top:20px">
      <div style="font-size:14px;color:#6366F1;font-weight:600;letter-spacing:0.2em;
        text-transform:uppercase;margin-bottom:28px">NexTax SMB Pulse Report</div>

      <div style="position:relative;width:${RS}px;height:${RS}px;margin:0 auto 36px">
        <svg width="${RS}" height="${RS}" style="transform:rotate(-90deg)">
          <circle cx="${RS/2}" cy="${RS/2}" r="${rad}" fill="none"
            stroke="rgba(255,255,255,0.06)" stroke-width="${SW}"/>
          <circle cx="${RS/2}" cy="${RS/2}" r="${rad}" fill="none"
            stroke="${col}" stroke-width="${SW}" stroke-dasharray="${circ}"
            stroke-dashoffset="${offset}" stroke-linecap="round"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;
          align-items:center;justify-content:center">
          <span class="mono" style="font-size:76px;font-weight:800;color:${col};line-height:1">${dri.toFixed(2)}</span>
          <span style="font-size:12px;color:#6B7280;text-transform:uppercase;
            letter-spacing:0.15em;margin-top:8px">Deal Reality Index</span>
        </div>
      </div>

      <h1 class="serif" style="font-size:62px;color:#F8FAFC;line-height:1.05;margin-bottom:24px">
        The SMB Deal<br>Reality Index
      </h1>
      <div style="font-size:26px;font-weight:700;color:${col};margin-bottom:20px">
        Buyers paying ${gap > 0 ? "+" : ""}${gap}% above fair value
      </div>
      <div style="display:inline-block;padding:12px 30px;border-radius:30px;
        border:1px solid ${col}40;background:${col}12;
        font-size:17px;color:${col};font-weight:600;margin-bottom:28px">
        ${r.dri_interpretation}
      </div>
      <div style="font-size:16px;color:#4B5563;font-style:italic">
        Is your target deal a diamond or a disaster? →
      </div>
    </div>
  `, dateRange);

  // ── SLIDE 2: Why This Matters
  const s2 = slide(2, "linear-gradient(180deg,#6366F1 0%,transparent 100%)", `
    <div style="font-size:13px;color:#818CF8;font-weight:600;letter-spacing:0.2em;
      text-transform:uppercase;margin-bottom:18px">Why This Matters</div>
    <h2 class="serif" style="font-size:54px;color:#F8FAFC;line-height:1.05;margin-bottom:36px">
      Most SMB Buyers<br><em>Overpay</em>
    </h2>
    <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:36px">
      ${[
        [`${r.pct_deals_overpriced}%`, "of current listings are priced above fair value", "#EF4444"],
        [`${r.total_deals_analyzed}`, "live marketplace deals analyzed this week", "#E2E8F0"],
        [`${(r.benchmarked_transactions||13053).toLocaleString()}+`, "closed transactions used as benchmarks", "#E2E8F0"],
        ["26", "industries tracked across the US market", "#E2E8F0"],
      ].map(([val, label, color]) => `
        <div style="display:flex;align-items:center;gap:24px;padding:20px 28px;
          background:rgba(255,255,255,0.03);border-radius:12px;
          border:1px solid rgba(255,255,255,0.06)">
          <span class="mono" style="font-size:38px;font-weight:800;color:${color};
            min-width:160px;flex-shrink:0">${val}</span>
          <span style="font-size:17px;color:#94A3B8;line-height:1.4">${label}</span>
        </div>`).join("")}
    </div>
    <div style="padding:22px 28px;background:rgba(99,102,241,0.08);border-radius:12px;
      border:1px solid rgba(99,102,241,0.2)">
      <p style="font-size:17px;color:#C4B5FD;line-height:1.6">
        The Deal Reality Index tracks the gap between what sellers <strong style="color:#fff">ask</strong>
        and what businesses actually <strong style="color:#10B981">close</strong> for —
        powered by ${(r.benchmarked_transactions||13053).toLocaleString()}+ real transactions.
      </p>
    </div>
  `, dateRange);

  // ── SLIDE 3: Market Snapshot — Ask vs Sold
  const askPct  = Math.min(((r.avg_listing_multiple||2.8) / maxBar) * 100, 100);
  const soldPct = Math.min(((r.avg_sold_multiple||2.2)   / maxBar) * 100, 100);
  const s3 = slide(3, "linear-gradient(180deg,#F59E0B 0%,transparent 100%)", `
    <div style="font-size:13px;color:#F59E0B;font-weight:600;letter-spacing:0.2em;
      text-transform:uppercase;margin-bottom:18px">Market Snapshot</div>
    <h2 class="serif" style="font-size:50px;color:#F8FAFC;line-height:1.05;margin-bottom:12px">
      What Sellers Want<br>vs What Deals Close For
    </h2>
    <p style="font-size:16px;color:#6B7280;margin-bottom:48px">
      Based on ${r.total_deals_analyzed} active listings vs ${(r.benchmarked_transactions||13053).toLocaleString()}+ closed comps
    </p>

    <div style="margin-bottom:48px">
      ${[
        ["Seller Expectations (Ask)", r.avg_listing_multiple||2.8, "#F59E0B", askPct],
        ["Market Reality (Closed)",   r.avg_sold_multiple||2.2,   "#10B981", soldPct],
      ].map(([label, val, color, pct]) => `
        <div style="margin-bottom:28px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
            <span style="font-size:17px;color:#94A3B8">${label}</span>
            <span class="mono" style="font-size:28px;font-weight:800;color:${color}">${(val as number).toFixed(2)}x</span>
          </div>
          <div style="height:16px;background:rgba(255,255,255,0.06);border-radius:8px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:8px"></div>
          </div>
        </div>`).join("")}
    </div>

    <div style="padding:28px;background:rgba(239,68,68,0.06);border-radius:14px;
      border:1px solid rgba(239,68,68,0.15);margin-bottom:24px">
      <p style="font-size:22px;color:#FCA5A5;line-height:1.5;text-align:center">
        The average SMB listing is priced
        <strong style="font-size:32px;color:#EF4444;font-family:'JetBrains Mono',monospace;
          display:block;margin-top:8px">+${gap}% above fair value</strong>
        this week.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      ${[
        ["Overpriced", r.pct_deals_overpriced+"%", "#EF4444"],
        ["Fair Market", r.pct_deals_fair+"%", "#3B82F6"],
        ["Undervalued", r.pct_deals_undervalued+"%", "#10B981"],
      ].map(([label, val, color]) => `
        <div style="text-align:center;padding:18px 12px;background:${color}08;
          border-radius:10px;border:1px solid ${color}20">
          <div class="mono" style="font-size:30px;font-weight:800;color:${color}">${val}</div>
          <div style="font-size:13px;color:#6B7280;margin-top:4px">${label}</div>
        </div>`).join("")}
    </div>
  `, dateRange);

  // ── SLIDE 4: Industry Heatmap
  const overpriced  = (r.most_overpriced  || []).slice(0, 4);
  const undervalued = (r.most_undervalued || []).slice(0, 4);
  const s4 = slide(4, "linear-gradient(180deg,#EF4444 0%,#10B981 50%,transparent 100%)", `
    <div style="font-size:13px;color:#EF4444;font-weight:600;letter-spacing:0.2em;
      text-transform:uppercase;margin-bottom:18px">Industry Heat Map</div>
    <h2 class="serif" style="font-size:48px;color:#F8FAFC;line-height:1.05;margin-bottom:32px">
      Who's Overpriced.<br>Who's a Steal.
    </h2>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <!-- Most Overpriced -->
      <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);
        border-radius:14px;padding:22px">
        <div style="font-size:12px;color:#EF4444;font-weight:600;text-transform:uppercase;
          letter-spacing:0.1em;margin-bottom:16px">🔴 Most Overpriced</div>
        ${overpriced.map((ind: any, i: number) => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:15px;font-weight:600;color:#E2E8F0">${i+1}. ${ind.label}</span>
            <span class="mono" style="font-size:17px;font-weight:700;
              color:${gapColor(ind.gap_pct)}">+${ind.gap_pct}%</span>
          </div>`).join("")}
      </div>
      <!-- Most Undervalued -->
      <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);
        border-radius:14px;padding:22px">
        <div style="font-size:12px;color:#10B981;font-weight:600;text-transform:uppercase;
          letter-spacing:0.1em;margin-bottom:16px">🟢 Most Undervalued</div>
        ${undervalued.map((ind: any, i: number) => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:15px;font-weight:600;color:#E2E8F0">${i+1}. ${ind.label}</span>
            <span class="mono" style="font-size:17px;font-weight:700;color:#10B981">${ind.gap_pct}%</span>
          </div>`).join("")}
      </div>
    </div>

    <div style="padding:18px 24px;background:rgba(255,255,255,0.02);border-radius:10px;
      border:1px solid rgba(255,255,255,0.05)">
      <p style="font-size:15px;color:#6B7280;text-align:center">
        Based on <strong style="color:#E2E8F0">${r.total_deals_analyzed} active marketplace listings</strong>
        vs ${(r.benchmarked_transactions||13053).toLocaleString()}+ closed transaction benchmarks
      </p>
    </div>
  `, dateRange);

  // ── SLIDE 5: Top Opportunities
  const opps = (r.top_opportunities || []).slice(0, 5);
  const s5 = slide(5, "linear-gradient(180deg,#8B5CF6 0%,transparent 100%)", `
    <div style="font-size:13px;color:#A78BFA;font-weight:600;letter-spacing:0.2em;
      text-transform:uppercase;margin-bottom:18px">Buyer Intelligence</div>
    <h2 class="serif" style="font-size:48px;color:#F8FAFC;line-height:1.05;margin-bottom:12px">
      Deals Worth Looking<br>At This Week
    </h2>
    <p style="font-size:15px;color:#6B7280;margin-bottom:28px">
      Score 65+ with favorable pricing vs ${(r.benchmarked_transactions||13053).toLocaleString()}+ closed comps
    </p>

    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
      ${opps.map((opp: any) => {
        const isOver  = opp.fair_value && opp.asking_price > opp.fair_value * 1.15;
        const isUnder = opp.fair_value && opp.asking_price < opp.fair_value * 0.85;
        const sigColor = isOver ? "#EF4444" : isUnder ? "#10B981" : "#3B82F6";
        const sigLabel = isOver ? "Overpriced" : isUnder ? "Undervalued" : "Fair Market";
        return `
        <div style="display:grid;grid-template-columns:1fr auto auto auto;
          gap:16px;align-items:center;padding:16px 20px;
          background:rgba(255,255,255,0.03);border-radius:10px;
          border:1px solid rgba(255,255,255,0.06)">
          <span style="font-size:15px;font-weight:600;color:#E2E8F0">${opp.industry}</span>
          <span class="mono" style="font-size:13px;color:#94A3B8">${fmt(opp.sde)} SDE</span>
          <span class="mono" style="font-size:15px;font-weight:700;color:#E2E8F0">${fmt(opp.asking_price)}</span>
          <span style="font-size:11px;font-weight:600;color:${sigColor};padding:4px 10px;
            border-radius:6px;background:${sigColor}15;white-space:nowrap">${sigLabel}</span>
        </div>`;
      }).join("")}
    </div>

    <div style="padding:18px 24px;background:rgba(139,92,246,0.06);border-radius:10px;
      border:1px solid rgba(139,92,246,0.15)">
      <p style="font-size:15px;color:#C4B5FD;text-align:center">
        Fair values calculated using <strong style="color:#fff">DealStats closed transaction benchmarks</strong>
        — not listing averages
      </p>
    </div>
  `, dateRange);

  // ── SLIDE 6: CTA
  const s6 = slide(6, `linear-gradient(180deg,${col} 0%,transparent 100%)`, `
    <div style="text-align:center;padding-top:40px">
      <div style="font-size:13px;color:#6366F1;font-weight:600;letter-spacing:0.2em;
        text-transform:uppercase;margin-bottom:24px">Free Deal Analysis</div>

      <h2 class="serif" style="font-size:54px;color:#F8FAFC;line-height:1.1;margin-bottom:20px">
        Is your target deal<br>overpriced?
      </h2>

      <p style="font-size:20px;color:#94A3B8;line-height:1.6;margin-bottom:12px;max-width:780px;margin-left:auto;margin-right:auto">
        The market DRI is <span class="mono" style="font-size:24px;font-weight:800;
          color:${col}">${dri.toFixed(2)}</span> —
        but your deal is unique.
      </p>
      <p style="font-size:18px;color:#94A3B8;line-height:1.6;margin-bottom:48px">
        Run it through the same engine used for this report.
        <strong style="color:#E2E8F0">10 seconds to a fair value check.</strong>
      </p>

      <div style="display:inline-block;padding:22px 52px;border-radius:14px;
        background:linear-gradient(135deg,#6366F1,#8B5CF6);
        font-size:22px;font-weight:700;color:#fff;margin-bottom:32px;letter-spacing:0.02em">
        ⚡ Check My Deal Reality Score
      </div>

      <div style="font-size:20px;color:#6366F1;font-weight:600;margin-bottom:48px">
        nextax.ai/deal-reality-check
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${[
          ["571+", "Deals Analyzed"],
          ["13K+", "Closed Comps"],
          ["26", "Industries"],
        ].map(([val, label]) => `
          <div style="padding:20px 16px;background:rgba(255,255,255,0.03);
            border-radius:10px;border:1px solid rgba(255,255,255,0.06);text-align:center">
            <div class="mono" style="font-size:30px;font-weight:800;color:#E2E8F0">${val}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:4px">${label}</div>
          </div>`).join("")}
      </div>
    </div>
  `, dateRange);

  return [s1, s2, s3, s4, s5, s6];
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

    const chromium  = (await import("@sparticuz/chromium-min")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    const execPath = await chromium.executablePath();
    console.log("Chromium execPath:", execPath);
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
      defaultViewport: { width: SLIDE_W, height: SLIDE_H, deviceScaleFactor: 2 },
      executablePath: execPath,
      headless: true,
    });

    const slides = buildAllSlides(report);
    const pngBuffers: Buffer[] = [];

    for (const html of slides) {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.waitForTimeout(800);
      const buf = await page.screenshot({ type: "png", fullPage: false });
      pngBuffers.push(buf as Buffer);
      await page.close();
    }

    await browser.close();

    // Build ZIP with archiver
    const archiver = (await import("archiver")).default;
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("data",  (chunk: Buffer) => chunks.push(chunk));
      archive.on("end",   resolve);
      archive.on("error", reject);

      pngBuffers.forEach((buf, i) => {
        archive.append(buf, { name: `slide-${i + 1}.png` });
      });
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);
    const fileName  = `pulse-linkedin-${slug}.zip`;

    // Upload ZIP to Supabase Storage
    await supabase.storage.from("pulse-reports").upload(fileName, zipBuffer, {
      contentType: "application/zip", upsert: true,
    });

    const { data: urlData } = supabase.storage.from("pulse-reports").getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      slug,
      downloadUrl:  urlData.publicUrl,
      slideCount:   pngBuffers.length,
      instructions: [
        "1. Download the ZIP file",
        "2. Extract — you'll have slide-1.png through slide-6.png",
        "3. On LinkedIn: Create Post → Document → Upload all 6 PNGs",
        "4. LinkedIn renders them as a swipeable carousel",
        "5. Use the suggested caption below",
      ],
      suggestedCaption: `The SMB Deal Reality Index is ${report.deal_reality_index?.toFixed(2)} this week — buyers are paying ${report.dri_gap_pct}% above fair value.\n\n${report.pct_deals_overpriced}% of listings are overpriced. The top industries to watch: ${(report.most_overpriced||[]).slice(0,3).map((i: any)=>i.label).join(", ")}.\n\nSwipe to see the full market breakdown → \n\nRun your deal: nextax.ai/deal-reality-check\n\n#SMBacquisitions #ETA #dealflow #businessacquisition #NexTaxAI`,
    });

  } catch (err) {
    console.error("LinkedIn carousel error:", err);
    return NextResponse.json({ error: "Carousel generation failed" }, { status: 500 });
  }
}
