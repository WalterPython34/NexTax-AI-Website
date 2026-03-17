/**
 * GET /api/pulse/pdf?slug=2026-03-09&secret=...
 * Generates a branded 4-page PDF using jsPDF.
 * No Puppeteer/Chromium — works on Vercel serverless.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 30;

const C = {
  bg:      [8,  12,  20]  as [number,number,number],
  bgCard:  [13, 21,  36]  as [number,number,number],
  bgRow:   [15, 23,  42]  as [number,number,number],
  green:   [16, 185, 129] as [number,number,number],
  amber:   [245,158, 11]  as [number,number,number],
  red:     [239, 68,  68] as [number,number,number],
  blue:    [59, 130, 246] as [number,number,number],
  indigo:  [99, 102, 241] as [number,number,number],
  purple:  [139, 92, 246] as [number,number,number],
  white:   [248,250, 252] as [number,number,number],
  light:   [226,232, 240] as [number,number,number],
  muted:   [148,163, 184] as [number,number,number],
  faint:   [75,  85,  99] as [number,number,number],
  border:  [30,  41,  59] as [number,number,number],
  darkRed: [60,  15,  15] as [number,number,number],
  darkGrn: [10,  50,  35] as [number,number,number],
  darkAmb: [50,  35,  10] as [number,number,number],
  darkInd: [20,  20,  50] as [number,number,number],
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
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
}
function fmtDateRange(start: string, end: string) {
  const s = new Date(start+"T12:00:00");
  const e = new Date(end+"T12:00:00");
  return `${s.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
}

const PW = 210; // A4 width mm

// ── Page scaffolding
function drawBg(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.bg); doc.rect(0,0,PW,h,"F");
}
function drawAccentBar(doc: jsPDF, color: [number,number,number]) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...color); doc.rect(0,0,4,h,"F");
}
function drawHeader(doc: jsPDF, dateRange: string) {
  doc.setFillColor(...C.bgCard); doc.rect(0,0,PW,18,"F");
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.line(0,18,PW,18);
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...C.white);
  doc.text("NEXTAX", 10, 12);
  doc.setTextColor(...C.indigo);
  doc.text("AI", 10+doc.getTextWidth("NEXTAX")+0.5, 12);
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.faint);
  doc.text(`SMB MARKET INTELLIGENCE  •  ${dateRange.toUpperCase()}`, PW-10, 12, {align:"right"});
}
function drawFooter(doc: jsPDF, pageNum: number) {
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.bgCard); doc.rect(0,h-12,PW,12,"F");
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3); doc.line(0,h-12,PW,h-12);
  doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...C.faint);
  doc.text("NexTax.ai  |  Proprietary Market Intelligence", 10, h-4);
  doc.text(`Page ${pageNum}  •  nextax.ai/deal-reality-check`, PW-10, h-4, {align:"right"});
}
function sectionLabel(doc: jsPDF, text: string, x: number, y: number, color: [number,number,number]) {
  doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...color);
  doc.text(text.toUpperCase(), x, y);
}

// Colored dot (replaces emoji)
function colorDot(doc: jsPDF, x: number, y: number, color: [number,number,number]) {
  doc.setFillColor(...color); doc.circle(x, y, 1.5, "F");
}

// Stat card with colored top border
function statCard(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, valueColor: [number,number,number], topBorder: [number,number,number]) {
  doc.setFillColor(...C.bgCard); doc.roundedRect(x,y,w,h,2,2,"F");
  doc.setFillColor(...topBorder); doc.rect(x,y,w,1.5,"F");
  doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.roundedRect(x,y,w,h,2,2,"S");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...valueColor);
  doc.text(value, x+w/2, y+h/2-1, {align:"center"});
  doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), x+w/2, y+h/2+6, {align:"center"});
}

// Bar row
function barRow(doc: jsPDF, x: number, y: number, totalW: number, label: string, value: number, maxVal: number, color: [number,number,number]) {
  const barW = totalW-52;
  const fillW = Math.min((value/maxVal)*barW, barW);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...C.light);
  doc.text(label, x, y+4);
  doc.setFillColor(...C.border); doc.roundedRect(x,y+6,barW,5,1,1,"F");
  doc.setFillColor(...color); doc.roundedRect(x,y+6,fillW,5,1,1,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...color);
  doc.text(`${value.toFixed(2)}x`, x+barW+4, y+11);
}

// Industry row in table
function industryRow(doc: jsPDF, x: number, y: number, w: number, label: string, gap: number, dri: number, isEven: boolean) {
  if (isEven) { doc.setFillColor(...C.bgRow); doc.rect(x,y-4,w,10,"F"); }
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...C.light);
  doc.text(label, x+3, y+2);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...gapColor(gap));
  doc.text(`${gap>0?"+":""}${gap}%`, x+w-40, y+2);
  doc.setTextColor(...driColor(dri));
  doc.text(dri.toFixed(2), x+w-14, y+2);
}

export async function GET(req: NextRequest) {
  const url    = new URL(req.url);
  const slug   = url.searchParams.get("slug");
  const secret = req.headers.get("authorization")?.replace("Bearer ","") || url.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({error:"Unauthorized"},{status:401});
  if (!slug) return NextResponse.json({error:"slug required"},{status:400});

  try {
    const {data:report,error} = await supabase.from("weekly_reports").select("*").eq("slug",slug).single();
    if (error||!report) return NextResponse.json({error:"Report not found"},{status:404});

    const dri        = report.deal_reality_index || 1.0;
    const gap        = report.dri_gap_pct || 0;
    const col        = driColor(dri);
    const dateRange  = fmtDateRange(report.week_starting, report.week_ending);
    // Always show at least 13,053 — the full DealStats + BizBuySell combined count
    const benchmarks = Math.max(report.benchmarked_transactions || 0, 13053);
    const maxMult    = Math.max(report.avg_listing_multiple||3, report.avg_sold_multiple||3)*1.15;

    const doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});

    // ════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════
    drawBg(doc); drawAccentBar(doc,col); drawHeader(doc,dateRange);

    // Section label
    sectionLabel(doc,"NexTax SMB Pulse Report",10,30,C.indigo);

    // Title
    doc.setFont("helvetica","bold"); doc.setFontSize(26); doc.setTextColor(...C.white);
    doc.text("The SMB Deal Reality Index",10,42);

    // DRI ring (arc via line segments)
    const cx=162,cy=58,r=26,sw=5;
    const driPct=Math.min(Math.max((dri-0.5)/1.5,0),1);
    const steps=80;
    const start=-Math.PI/2;
    const end=start+driPct*2*Math.PI;
    doc.setDrawColor(...C.border); doc.setLineWidth(sw); doc.circle(cx,cy,r,"S");
    doc.setDrawColor(...col); doc.setLineWidth(sw);
    for(let i=0;i<steps;i++){
      const a1=start+(i/steps)*(end-start);
      const a2=start+((i+1)/steps)*(end-start);
      if(a1>=end) break;
      doc.line(cx+r*Math.cos(a1),cy+r*Math.sin(a1),cx+r*Math.cos(a2),cy+r*Math.sin(a2));
    }
    doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(...col);
    doc.text(dri.toFixed(2),cx,cy+2,{align:"center"});
    doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(...C.muted);
    doc.text("DEAL REALITY INDEX",cx,cy+8,{align:"center"});

    // Interpretation badge
    doc.setFillColor(...C.bgCard); doc.roundedRect(8,66,94,10,2,2,"F");
    doc.setDrawColor(...col); doc.setLineWidth(0.4); doc.roundedRect(8,66,94,10,2,2,"S");
    doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(...col);
    doc.text(report.dri_interpretation||"Moderately Overpriced",55,72.5,{align:"center"});

    // Description — all white
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...C.light);
    const desc=`SMB deals are currently priced ${Math.abs(gap)}% ${gap>0?"above":"below"} fair value based on ${benchmarks.toLocaleString()}+ closed transaction benchmarks and ${report.total_deals_analyzed} live listings analyzed by NexTax.`;
    doc.text(doc.splitTextToSize(desc,130),10,85);

    // KPI strip — 4 cards
    const kW=(PW-20)/4;
    [
      {v:report.total_deals_analyzed.toString(),  l:"Live Deals Analyzed",           c:C.white,  b:C.indigo},
      {v:`${benchmarks.toLocaleString()}+`,        l:"Closed Transaction Benchmarks", c:C.white,  b:C.blue},
      {v:"26",                                     l:"Industries Tracked",            c:C.white,  b:C.green},
      {v:`${report.pct_deals_overpriced}%`,        l:"Overpriced Listings",           c:C.red,    b:C.red},
    ].forEach((k,i)=>statCard(doc,10+i*kW,100,kW-3,24,k.v,k.l,k.c,k.b));

    // DRI scale
    const scales=[
      {range:"< 1.0",    label:"Undervalued",   color:C.green},
      {range:"1.0–1.15", label:"Healthy",        color:C.blue},
      {range:"1.15–1.30",label:"Overpriced",     color:C.amber},
      {range:"1.30+",    label:"Highly Overpriced",color:C.red},
    ];
    scales.forEach((s,i)=>{
      const sx=10+i*(PW-20)/4;
      doc.setFillColor(...s.color); doc.rect(sx,130,(PW-20)/4-3,2.5,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...s.color);
      doc.text(s.range,sx,137);
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted);
      doc.text(s.label,sx,142);
    });

    // DRI Trend
    const trend = report.dri_trend||[];
    sectionLabel(doc,"DRI Trend (Last 4 Weeks)",10,152,C.faint);
    const tX=10,tY=156,tW=PW-20,tH=26;
    doc.setFillColor(...C.bgCard); doc.roundedRect(tX,tY,tW,tH,2,2,"F");

    if(trend.length>=2){
      const vals=trend.map((t:any)=>t.dri);
      const minV=Math.min(...vals)-0.05, maxV=Math.max(...vals)+0.05, rng=maxV-minV||0.1;
      const fairY=tY+tH-((1.0-minV)/rng)*tH;
      doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
      doc.setLineDashPattern([1,1],0); doc.line(tX+4,fairY,tX+tW-4,fairY); doc.setLineDashPattern([],0);
      const pts=vals.map((v:number,i:number)=>({
        x:tX+4+(i/(vals.length-1))*(tW-8),
        y:tY+tH-((v-minV)/rng)*tH,
      }));
      doc.setDrawColor(...col); doc.setLineWidth(1.2);
      for(let i=0;i<pts.length-1;i++) doc.line(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y);
      pts.forEach((p:{x:number,y:number},i:number)=>{
        doc.setFillColor(...driColor(vals[i])); doc.circle(p.x,p.y,1.2,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(...driColor(vals[i]));
        doc.text(vals[i].toFixed(2),p.x,p.y-2,{align:"center"});
        doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(...C.faint);
        doc.text(trend[i].week,p.x,tY+tH+4,{align:"center"});
      });
    } else {
      // Not enough data yet — show first reading
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
      doc.text("Building trend data — check back next week",tX+tW/2,tY+tH/2+1,{align:"center"});
      if(trend.length===1){
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...col);
        doc.text(`Week 1 baseline: DRI ${trend[0].dri.toFixed(2)}`,tX+tW/2,tY+tH/2+7,{align:"center"});
      }
    }

    drawFooter(doc,1);

    // ════════════════════════════════════════════════
    // PAGE 2 — MARKET SNAPSHOT
    // ════════════════════════════════════════════════
    doc.addPage(); drawBg(doc); drawAccentBar(doc,C.blue); drawHeader(doc,dateRange);

    sectionLabel(doc,"Market Snapshot",10,27,C.blue);
    doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...C.white);
    doc.text("What Sellers Want vs What Deals Close For",10,37);

    barRow(doc,10,44,PW-20,"Seller Expectations (Ask)",report.avg_listing_multiple||2.8,maxMult,C.amber);
    barRow(doc,10,62,PW-20,"Market Reality (Closed)",  report.avg_sold_multiple||2.2,  maxMult,C.green);

    // Gap callout
    doc.setFillColor(...C.darkRed); doc.roundedRect(10,82,PW-20,20,2,2,"F");
    doc.setDrawColor(...C.red); doc.setLineWidth(0.4); doc.roundedRect(10,82,PW-20,20,2,2,"S");
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(252,165,165);
    doc.text("The average SMB listing is priced",PW/2,89,{align:"center"});
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...C.red);
    doc.text(`+${gap}% above fair value this week`,PW/2,97,{align:"center"});

    // Sentiment — using text labels instead of emoji (jsPDF can't render emoji)
    sectionLabel(doc,`Deal Pricing Distribution — ${report.total_deals_analyzed} Active Listings`,10,112,C.light);
    const sW=(PW-20)/3;
    [
      {label:"Overpriced",   pct:report.pct_deals_overpriced,  color:C.red,   dark:C.darkRed, marker:"OVER"},
      {label:"Fairly Priced",pct:report.pct_deals_fair,        color:C.blue,  dark:[20,20,50] as [number,number,number], marker:"FAIR"},
      {label:"Under Value",  pct:report.pct_deals_undervalued, color:C.green, dark:C.darkGrn, marker:"UNDER"},
    ].forEach((item,i)=>{
      const sx=10+i*sW;
      doc.setFillColor(...item.dark); doc.roundedRect(sx,116,sW-4,32,2,2,"F");
      doc.setDrawColor(...item.color); doc.setLineWidth(0.4); doc.roundedRect(sx,116,sW-4,32,2,2,"S");
      // Colored tag at top instead of emoji
      doc.setFillColor(...item.color); doc.roundedRect(sx+4,119,18,5,1,1,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(5.5); doc.setTextColor(...C.bg);
      doc.text(item.marker,sx+13,122.5,{align:"center"});
      // Value
      doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(...item.color);
      doc.text(`${item.pct}%`,sx+(sW-4)/2,136,{align:"center"});
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
      doc.text(item.label,sx+(sW-4)/2,143,{align:"center"});
    });

    drawFooter(doc,2);

    // ════════════════════════════════════════════════
    // PAGE 3 — INDUSTRY HEATMAP
    // ════════════════════════════════════════════════
    doc.addPage(); drawBg(doc); drawAccentBar(doc,C.red); drawHeader(doc,dateRange);

    sectionLabel(doc,"Industry Heat Map",10,27,C.red);
    doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...C.white);
    doc.text("Where Are Deals Over & Underpriced?",10,37);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text(`Based on ${report.total_deals_analyzed} active listings vs ${benchmarks.toLocaleString()}+ closed comps`,10,43);

    const colW=(PW-24)/2;

    // Overpriced panel header — colored dot + text (no emoji)
    doc.setFillColor(...C.darkRed); doc.roundedRect(10,49,colW,8,1,1,"F");
    colorDot(doc,16,53.5,C.red);
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...C.red);
    doc.text("MOST OVERPRICED INDUSTRY THIS WEEK",21,54);

    // Undervalued panel header
    doc.setFillColor(...C.darkGrn); doc.roundedRect(14+colW,49,colW,8,1,1,"F");
    colorDot(doc,20+colW,53.5,C.green);
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...C.green);
    doc.text("BEST BUYING OPPORTUNITIES",25+colW,54);

    // Column headers
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...C.light);
    doc.text("INDUSTRY",13,63); doc.text("GAP",10+colW-26,63); doc.text("DRI",10+colW-8,63);
    doc.text("INDUSTRY",17+colW,63); doc.text("GAP",14+colW*2-26,63); doc.text("DRI",14+colW*2-8,63);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.line(10,65,10+colW,65); doc.line(14+colW,65,14+colW*2,65);

    const overRows =(report.most_overpriced ||[]).slice(0,7);
    const underRows=(report.most_undervalued||[]).slice(0,7);
    overRows.forEach ((ind:any,i:number)=>industryRow(doc,10,     71+i*11,colW,ind.label,ind.gap_pct,ind.dri,i%2===1));
    underRows.forEach((ind:any,i:number)=>industryRow(doc,14+colW,71+i*11,colW,ind.label,ind.gap_pct,ind.dri,i%2===1));

    // Full table
    const allInds=(report.all_industries||[]).slice(0,16);
    const tableY=71+Math.max(overRows.length,underRows.length)*11+8;
    sectionLabel(doc,"All Industries — Full Deal Reality Index (DRI) Rankings",10,tableY,C.light);

    const tCols={ind:10,dri:110,gap:130,ask:152,sold:174};
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...C.light);
    doc.text("INDUSTRY",tCols.ind+2,tableY+7);
    doc.text("DRI",tCols.dri,tableY+7);
    doc.text("GAP",tCols.gap,tableY+7);
    doc.text("ASK MULT",tCols.ask,tableY+7);
    doc.text("SOLD MULT",tCols.sold,tableY+7);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(10,tableY+9,PW-10,tableY+9);

    allInds.forEach((ind:any,i:number)=>{
      const ry=tableY+14+i*8;
      if(i%2===0){doc.setFillColor(...C.bgRow); doc.rect(10,ry-4,PW-20,8,"F");}
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.light);
      doc.text(ind.label||ind.industry,tCols.ind+2,ry);
      doc.setFont("helvetica","bold"); doc.setTextColor(...driColor(ind.dri));
      doc.text(ind.dri.toFixed(2),tCols.dri,ry);
      doc.setTextColor(...gapColor(ind.gap_pct));
      doc.text(`${ind.gap_pct>0?"+":""}${ind.gap_pct}%`,tCols.gap,ry);
      doc.setFont("helvetica","normal"); doc.setTextColor(...C.muted);
      doc.text(ind.listing_multiple?`${ind.listing_multiple}x`:"—",tCols.ask,ry);
      doc.text(ind.sold_multiple?`${ind.sold_multiple}x`:"—",tCols.sold,ry);
    });

    drawFooter(doc,3);

    // ════════════════════════════════════════════════
    // PAGE 4 — OPPORTUNITIES + BUYER PAIN + CTA
    // ════════════════════════════════════════════════
    doc.addPage(); drawBg(doc); drawAccentBar(doc,C.indigo); drawHeader(doc,dateRange);

    sectionLabel(doc,"Buyer Intelligence",10,27,C.indigo);
    doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...C.white);
    doc.text("Deals Worth Looking At This Week",10,37);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text(`Filtered from ${report.total_deals_analyzed} active listings — Score 65+ with favorable pricing signals`,10,43);

    // Opportunities table headers
    const oC={ind:10,sde:74,ask:106,fv:140,score:168,sig:180};
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...C.light);
    ["INDUSTRY","SDE","ASKING PRICE","FAIR VALUE","SCORE","SIGNAL"].forEach((h,i)=>{
      doc.text(h,[oC.ind,oC.sde,oC.ask,oC.fv,oC.score,oC.sig][i]+2,51);
    });
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(10,53,PW-10,53);

    (report.top_opportunities||[]).slice(0,5).forEach((opp:any,i:number)=>{
      const ry=59+i*10;
      if(i%2===0){doc.setFillColor(...C.bgRow); doc.rect(10,ry-4,PW-20,10,"F");}
      const isOver =opp.fair_value&&opp.asking_price>opp.fair_value*1.15;
      const isUnder=opp.fair_value&&opp.asking_price<opp.fair_value*0.85;
      const sc=isOver?C.red:isUnder?C.green:C.blue;
      const sl=isOver?"Overpriced":isUnder?"Undervalued":"Fair Market";
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...C.white);
      doc.text(opp.industry,oC.ind+2,ry);
      doc.setFont("helvetica","normal"); doc.setTextColor(...C.muted);
      doc.text(fmt(opp.sde),oC.sde+2,ry);
      doc.setFont("helvetica","bold"); doc.setTextColor(...C.white);
      doc.text(fmt(opp.asking_price),oC.ask+2,ry);
      doc.setTextColor(196,181,253);
      doc.text(opp.fair_value?fmt(opp.fair_value):"—",oC.fv+2,ry);
      const sColor=opp.score>=70?C.green:C.amber;
      doc.setTextColor(...sColor);
      doc.text(String(opp.score),oC.score+2,ry);
      // Signal badge
      doc.setFillColor(...sc); doc.roundedRect(oC.sig,ry-4,24,7,1,1,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.bg);
      doc.text(sl,oC.sig+12,ry,{align:"center"});
    });

    // Bottom two boxes
    const boxY=59+5*10+6;
    const boxH=52;  // increased to fit scale

    // ── BUYER PAIN INDEX BOX
    doc.setFillColor(...C.darkAmb); doc.roundedRect(10,boxY,92,boxH,2,2,"F");
    doc.setDrawColor(...C.amber); doc.setLineWidth(0.5); doc.roundedRect(10,boxY,92,boxH,2,2,"S");
    // Colored tag instead of emoji
    doc.setFillColor(...C.amber); doc.roundedRect(13,boxY+3,30,5.5,1,1,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.bg);
    doc.text("BUYER PAIN INDEX",28,boxY+7.2,{align:"center"});
    // Big value
    doc.setFont("helvetica","bold"); doc.setFontSize(24); doc.setTextColor(...C.amber);
    doc.text(report.buyer_pain_index?.toFixed(2)||"—",56,boxY+22,{align:"center"});
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    doc.text(`Top concern: ${(report.top_pain_category||"").replace(/_/g," ")}`,56,boxY+28,{align:"center"});
    doc.text(`Based on ${report.pain_signal_count||0} community signals`,56,boxY+33,{align:"center"});
    // Scale legend
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2); doc.line(13,boxY+37,98,boxY+37);
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...C.muted);
    doc.text("SCALE",13,boxY+41.5);
    const painScale=[
      {v:"1.0",l:"Balanced Market",c:C.green},
      {v:"1.3",l:"Seller Advantage",c:C.blue},
      {v:"1.6",l:"Buyer Pain",c:C.amber},
      {v:"2.0",l:"Frenzy",c:C.red},
    ];
    painScale.forEach((s,i)=>{
      const px=13+i*20;
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...s.c);
      doc.text(s.v,px,boxY+44);
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted);
      doc.text(s.l,px,boxY+49);
    });

    // ── CTA / DRI SUMMARY BOX
    const ctaX=106, ctaW=PW-ctaX-6;
    doc.setFillColor(...C.darkInd); doc.roundedRect(ctaX,boxY,ctaW,boxH,2,2,"F");
    doc.setDrawColor(...C.indigo); doc.setLineWidth(0.5); doc.roundedRect(ctaX,boxY,ctaW,boxH,2,2,"S");

    // This week in numbers label
    doc.setFillColor(...C.indigo); doc.roundedRect(ctaX+3,boxY+3,36,5.5,1,1,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.white);
    doc.text("THIS WEEK IN NUMBERS",ctaX+21,boxY+7.2,{align:"center"});

    // Stats
    const stats=[
      {label:"Market DRI",     value:`${dri.toFixed(2)}`},
      {label:"Avg ask multiple",value:`${(report.avg_listing_multiple||0).toFixed(2)}x`},
      {label:"Avg sold multiple",value:`${(report.avg_sold_multiple||0).toFixed(2)}x`},
      {label:"Pricing gap",    value:`+${gap}%`},
      {label:"Overpriced listings",value:`${report.pct_deals_overpriced}%`},
    ];
    stats.forEach((s,i)=>{
      const sy=boxY+14+i*5.5;
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
      doc.text(s.label,ctaX+4,sy);
      doc.setFont("helvetica","bold"); doc.setTextColor(...C.white);
      doc.text(s.value,ctaX+ctaW-4,sy,{align:"right"});
    });

    // CTA line
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.line(ctaX+4,boxY+43,ctaX+ctaW-4,boxY+43);
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...C.white);
    doc.text(`DRI is ${dri.toFixed(2)} — is your deal fairly priced?`,ctaX+ctaW/2,boxY+48,{align:"center"});
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.indigo);
    doc.text("nextax.ai/deal-reality-check",ctaX+ctaW/2,boxY+54,{align:"center"});

    drawFooter(doc,4);

    // ── Generate + upload
    const pdfBuffer=Buffer.from(doc.output("arraybuffer"));
    const fileName=`pulse-${slug}.pdf`;
    const {error:upErr}=await supabase.storage.from("pulse-reports")
      .upload(fileName,pdfBuffer,{contentType:"application/pdf",upsert:true});
    if(upErr) return NextResponse.json({error:"Upload failed",details:upErr.message},{status:500});

    const {data:urlData}=supabase.storage.from("pulse-reports").getPublicUrl(fileName);
    await supabase.from("weekly_reports")
      .update({pdf_url:urlData.publicUrl,is_published:true}).eq("slug",slug);

    return NextResponse.json({success:true,pdfUrl:urlData.publicUrl,slug});

  } catch(err:any){
    console.error("PDF error:",err);
    return NextResponse.json({error:"PDF generation failed",details:err?.message||String(err)},{status:500});
  }
}
