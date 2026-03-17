/**
 * app/pulse/[id]/carousel/page.tsx
 *
 * Browser-side LinkedIn carousel generator.
 * Renders all 6 slides visually, then uses html2canvas + jsPDF
 * to export them as a single multi-page PDF the user can download
 * and upload to LinkedIn as a document post.
 *
 * Install: pnpm add html2canvas
 * (jsPDF already in package.json)
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function fmtDateRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end   + "T12:00:00");
  return `${s.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
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

// 1080×1350 slide wrapper — LinkedIn portrait format
function SlideWrapper({ num, accent, children, dateRange }: { num: number; accent: string; children: React.ReactNode; dateRange: string }) {
  return (
    <div style={{
      width: 1080, height: 1350, position: "relative", overflow: "hidden", flexShrink: 0,
      background: "linear-gradient(160deg,#080C14 0%,#0D1524 60%,#080C14 100%)",
      fontFamily: "'DM Sans', sans-serif", color: "#E2E8F0",
    }}>
      {/* Grid texture */}
      <div style={{ position:"absolute", inset:0, opacity:0.025,
        backgroundImage:"linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
        backgroundSize:"54px 54px" }} />
      {/* Left accent */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:6, background:accent }} />
      {/* Top bar */}
      <div style={{ position:"absolute", top:0, left:6, right:0, height:80, padding:"0 52px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        borderBottom:"1px solid rgba(255,255,255,0.07)", background:"rgba(0,0,0,0.25)" }}>
        <span style={{ fontSize:20, fontWeight:800, letterSpacing:"0.06em", color:"#fff" }}>
          NEXTAX<span style={{ background:"linear-gradient(135deg,#3DD68C,#22B8CF)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>AI</span>
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:13, color:"#4B5563", letterSpacing:"0.08em", fontFamily:"monospace" }}>
            {dateRange.toUpperCase()}
          </span>
          <span style={{ fontSize:12, color:"#374151", padding:"4px 10px", borderRadius:12,
            border:"1px solid rgba(255,255,255,0.08)" }}>{num} / 6</span>
        </div>
      </div>
      {/* Content */}
      <div style={{ position:"absolute", top:80, left:6, right:0, bottom:72, padding:"52px 56px 0" }}>
        {children}
      </div>
      {/* Bottom bar */}
      <div style={{ position:"absolute", bottom:0, left:6, right:0, height:72, padding:"0 52px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        borderTop:"1px solid rgba(255,255,255,0.06)", background:"rgba(0,0,0,0.25)" }}>
        <span style={{ fontSize:13, color:"#374151" }}>NexTax.ai | Proprietary Market Intelligence</span>
        <span style={{ fontSize:13, color:"#4B5563", fontFamily:"monospace" }}>nextax.ai/deal-reality-check</span>
      </div>
    </div>
  );
}

function Slides({ report }: { report: any }) {
  const dri = report.deal_reality_index || 1.0;
  const gap = report.dri_gap_pct || 0;
  const col = driColor(dri);
  const dateRange = fmtDateRange(report.week_starting, report.week_ending);
  const maxBar = Math.max(report.avg_listing_multiple||3, report.avg_sold_multiple||3) * 1.1;

  // DRI ring SVG
  const RS=300, SW=20, rad=(RS-SW)/2, circ=rad*2*Math.PI;
  const offset = circ - Math.min(Math.max((dri-0.5)/1.5,0),1)*circ;

  return (
    <>
      {/* SLIDE 1: Cover */}
      <SlideWrapper num={1} accent={`linear-gradient(180deg,${col} 0%,transparent 100%)`} dateRange={dateRange}>
        <div style={{ textAlign:"center", paddingTop:20 }}>
          <div style={{ fontSize:14, color:"#6366F1", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:28 }}>NexTax SMB Pulse Report</div>
          <div style={{ position:"relative", width:RS, height:RS, margin:"0 auto 36px" }}>
            <svg width={RS} height={RS} style={{ transform:"rotate(-90deg)" }}>
              <circle cx={RS/2} cy={RS/2} r={rad} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW}/>
              <circle cx={RS/2} cy={RS/2} r={rad} fill="none" stroke={col} strokeWidth={SW} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:76, fontWeight:800, color:col, lineHeight:1, fontFamily:"monospace" }}>{dri.toFixed(2)}</span>
              <span style={{ fontSize:12, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.15em", marginTop:8 }}>Deal Reality Index</span>
            </div>
          </div>
          <h1 style={{ fontFamily:"serif", fontSize:62, color:"#F8FAFC", lineHeight:1.05, marginBottom:24, fontWeight:400 }}>The SMB Deal<br/>Reality Index</h1>
          <div style={{ fontSize:26, fontWeight:700, color:col, marginBottom:20 }}>Buyers paying {gap>0?"+":""}{gap}% above fair value</div>
          <div style={{ display:"inline-block", padding:"12px 30px", borderRadius:30, border:`1px solid ${col}40`, background:`${col}12`, fontSize:17, color:col, fontWeight:600, marginBottom:28 }}>{report.dri_interpretation}</div>
          <div style={{ fontSize:16, color:"#4B5563", fontStyle:"italic" }}>Is your target deal a diamond or a disaster? →</div>
        </div>
      </SlideWrapper>

      {/* SLIDE 2: Why This Matters */}
      <SlideWrapper num={2} accent="linear-gradient(180deg,#6366F1 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{ fontSize:13, color:"#818CF8", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:18 }}>Why This Matters</div>
        <h2 style={{ fontFamily:"serif", fontSize:54, color:"#F8FAFC", lineHeight:1.05, marginBottom:36, fontWeight:400 }}>Most SMB Buyers<br/><em>Overpay</em></h2>
        <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:36 }}>
          {[
            [`${report.pct_deals_overpriced}%`, "of current listings are priced above fair value", "#EF4444"],
            [`${report.total_deals_analyzed}`, "live marketplace deals analyzed this week", "#E2E8F0"],
            [`${(report.benchmarked_transactions||13053).toLocaleString()}+`, "closed transactions used as benchmarks", "#E2E8F0"],
            ["26", "industries tracked across the US market", "#E2E8F0"],
          ].map(([val, label, color]) => (
            <div key={String(val)} style={{ display:"flex", alignItems:"center", gap:24, padding:"20px 28px", background:"rgba(255,255,255,0.03)", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize:38, fontWeight:800, color:String(color), minWidth:160, flexShrink:0, fontFamily:"monospace" }}>{val}</span>
              <span style={{ fontSize:17, color:"#94A3B8", lineHeight:1.4 }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:"22px 28px", background:"rgba(99,102,241,0.08)", borderRadius:12, border:"1px solid rgba(99,102,241,0.2)" }}>
          <p style={{ fontSize:17, color:"#C4B5FD", lineHeight:1.6 }}>
            The Deal Reality Index tracks the gap between what sellers <strong style={{ color:"#fff" }}>ask</strong> and what businesses actually <strong style={{ color:"#10B981" }}>close</strong> for — powered by {(report.benchmarked_transactions||13053).toLocaleString()}+ real transactions.
          </p>
        </div>
      </SlideWrapper>

      {/* SLIDE 3: Market Snapshot */}
      <SlideWrapper num={3} accent="linear-gradient(180deg,#F59E0B 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{ fontSize:13, color:"#F59E0B", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:18 }}>Market Snapshot</div>
        <h2 style={{ fontFamily:"serif", fontSize:50, color:"#F8FAFC", lineHeight:1.05, marginBottom:12, fontWeight:400 }}>What Sellers Want<br/>vs What Deals Close For</h2>
        <p style={{ fontSize:16, color:"#6B7280", marginBottom:48 }}>Based on {report.total_deals_analyzed} active listings vs {(report.benchmarked_transactions||13053).toLocaleString()}+ closed comps</p>
        <div style={{ marginBottom:48 }}>
          {[["Seller Expectations (Ask)", report.avg_listing_multiple||2.8, "#F59E0B"],["Market Reality (Closed)", report.avg_sold_multiple||2.2, "#10B981"]].map(([label, val, color]) => (
            <div key={String(label)} style={{ marginBottom:28 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
                <span style={{ fontSize:17, color:"#94A3B8" }}>{label}</span>
                <span style={{ fontSize:28, fontWeight:800, color:String(color), fontFamily:"monospace" }}>{(val as number).toFixed(2)}x</span>
              </div>
              <div style={{ height:16, background:"rgba(255,255,255,0.06)", borderRadius:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(((val as number)/maxBar)*100,100)}%`, background:String(color), borderRadius:8 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:28, background:"rgba(239,68,68,0.06)", borderRadius:14, border:"1px solid rgba(239,68,68,0.15)", marginBottom:24, textAlign:"center" }}>
          <p style={{ fontSize:22, color:"#FCA5A5", lineHeight:1.5 }}>
            The average SMB listing is priced
            <strong style={{ fontSize:32, color:"#EF4444", fontFamily:"monospace", display:"block", marginTop:8 }}>+{gap}% above fair value</strong>
            this week.
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          {[["Overpriced",report.pct_deals_overpriced+"%","#EF4444"],["Fair Market",report.pct_deals_fair+"%","#3B82F6"],["Undervalued",report.pct_deals_undervalued+"%","#10B981"]].map(([label,val,color])=>(
            <div key={String(label)} style={{ textAlign:"center", padding:"18px 12px", background:`${color}08`, borderRadius:10, border:`1px solid ${color}20` }}>
              <div style={{ fontSize:30, fontWeight:800, color:String(color), fontFamily:"monospace" }}>{val}</div>
              <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      </SlideWrapper>

      {/* SLIDE 4: Industry Heatmap */}
      <SlideWrapper num={4} accent="linear-gradient(180deg,#EF4444 0%,#10B981 50%,transparent 100%)" dateRange={dateRange}>
        <div style={{ fontSize:13, color:"#EF4444", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:18 }}>Industry Heat Map</div>
        <h2 style={{ fontFamily:"serif", fontSize:48, color:"#F8FAFC", lineHeight:1.05, marginBottom:32, fontWeight:400 }}>Who's Overpriced.<br/>Who's a Steal.</h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
          <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:14, padding:22 }}>
            <div style={{ fontSize:12, color:"#EF4444", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>🔴 Most Overpriced</div>
            {(report.most_overpriced||[]).slice(0,4).map((ind: any, i: number)=>(
              <div key={ind.industry} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize:15, fontWeight:600, color:"#E2E8F0" }}>{i+1}. {ind.label}</span>
                <span style={{ fontSize:17, fontWeight:700, color:gapColor(ind.gap_pct), fontFamily:"monospace" }}>+{ind.gap_pct}%</span>
              </div>
            ))}
          </div>
          <div style={{ background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.15)", borderRadius:14, padding:22 }}>
            <div style={{ fontSize:12, color:"#10B981", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>🟢 Most Undervalued</div>
            {(report.most_undervalued||[]).slice(0,4).map((ind: any, i: number)=>(
              <div key={ind.industry} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize:15, fontWeight:600, color:"#E2E8F0" }}>{i+1}. {ind.label}</span>
                <span style={{ fontSize:17, fontWeight:700, color:"#10B981", fontFamily:"monospace" }}>{ind.gap_pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:"18px 24px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize:15, color:"#6B7280", textAlign:"center" }}>
            Based on <strong style={{ color:"#E2E8F0" }}>{report.total_deals_analyzed} active marketplace listings</strong> vs {(report.benchmarked_transactions||13053).toLocaleString()}+ closed transaction benchmarks
          </p>
        </div>
      </SlideWrapper>

      {/* SLIDE 5: Top Opportunities */}
      <SlideWrapper num={5} accent="linear-gradient(180deg,#8B5CF6 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{ fontSize:13, color:"#A78BFA", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:18 }}>Buyer Intelligence</div>
        <h2 style={{ fontFamily:"serif", fontSize:48, color:"#F8FAFC", lineHeight:1.05, marginBottom:12, fontWeight:400 }}>Deals Worth Looking<br/>At This Week</h2>
        <p style={{ fontSize:15, color:"#6B7280", marginBottom:28 }}>Score 65+ with favorable pricing vs {(report.benchmarked_transactions||13053).toLocaleString()}+ closed comps</p>
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
          {(report.top_opportunities||[]).slice(0,5).map((opp: any, i: number)=>{
            const isOver  = opp.fair_value && opp.asking_price > opp.fair_value * 1.15;
            const isUnder = opp.fair_value && opp.asking_price < opp.fair_value * 0.85;
            const sc = isOver?"#EF4444":isUnder?"#10B981":"#3B82F6";
            const sl = isOver?"Overpriced":isUnder?"Undervalued":"Fair Market";
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:16, alignItems:"center", padding:"16px 20px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize:15, fontWeight:600, color:"#E2E8F0" }}>{opp.industry}</span>
                <span style={{ fontSize:13, color:"#94A3B8", fontFamily:"monospace" }}>{fmt(opp.sde)} SDE</span>
                <span style={{ fontSize:15, fontWeight:700, color:"#E2E8F0", fontFamily:"monospace" }}>{fmt(opp.asking_price)}</span>
                <span style={{ fontSize:11, fontWeight:600, color:sc, padding:"4px 10px", borderRadius:6, background:`${sc}15`, whiteSpace:"nowrap" }}>{sl}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"18px 24px", background:"rgba(139,92,246,0.06)", borderRadius:10, border:"1px solid rgba(139,92,246,0.15)" }}>
          <p style={{ fontSize:15, color:"#C4B5FD", textAlign:"center" }}>Fair values calculated using <strong style={{ color:"#fff" }}>DealStats closed transaction benchmarks</strong> — not listing averages</p>
        </div>
      </SlideWrapper>

      {/* SLIDE 6: CTA */}
      <SlideWrapper num={6} accent={`linear-gradient(180deg,${col} 0%,transparent 100%)`} dateRange={dateRange}>
        <div style={{ textAlign:"center", paddingTop:40 }}>
          <div style={{ fontSize:13, color:"#6366F1", fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:24 }}>Free Deal Analysis</div>
          <h2 style={{ fontFamily:"serif", fontSize:54, color:"#F8FAFC", lineHeight:1.1, marginBottom:20, fontWeight:400 }}>Is your target deal<br/>overpriced?</h2>
          <p style={{ fontSize:20, color:"#94A3B8", lineHeight:1.6, marginBottom:12, maxWidth:780, margin:"0 auto 12px" }}>
            The market DRI is <span style={{ fontSize:24, fontWeight:800, color:col, fontFamily:"monospace" }}>{dri.toFixed(2)}</span> — but your deal is unique.
          </p>
          <p style={{ fontSize:18, color:"#94A3B8", lineHeight:1.6, marginBottom:48 }}>
            Run it through the same engine used for this report. <strong style={{ color:"#E2E8F0" }}>10 seconds to a fair value check.</strong>
          </p>
          <div style={{ display:"inline-block", padding:"22px 52px", borderRadius:14, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", fontSize:22, fontWeight:700, color:"#fff", marginBottom:32, letterSpacing:"0.02em" }}>
            ⚡ Check My Deal Reality Score
          </div>
          <div style={{ fontSize:20, color:"#6366F1", fontWeight:600, marginBottom:48 }}>nextax.ai/deal-reality-check</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[["571+","Deals Analyzed"],["13K+","Closed Comps"],["26","Industries"]].map(([val,label])=>(
              <div key={String(val)} style={{ padding:"20px 16px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" }}>
                <div style={{ fontSize:30, fontWeight:800, color:"#E2E8F0", fontFamily:"monospace" }}>{val}</div>
                <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </SlideWrapper>
    </>
  );
}

export default function CarouselPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("weekly_reports").select("*").eq("slug", params.id).single()
      .then(({ data }) => { setReport(data); setLoading(false); });
  }, [params.id]);

  async function downloadCarousel() {
    if (!slidesRef.current || !report) return;
    setGenerating(true);
    setStatus("Loading libraries...");

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const slides = slidesRef.current.children;
      const doc = new jsPDF({ orientation: "portrait", unit: "px", format: [1080, 1350] });
      let first = true;

      for (let i = 0; i < slides.length; i++) {
        setStatus(`Rendering slide ${i + 1} of ${slides.length}...`);
        const canvas = await html2canvas(slides[i] as HTMLElement, {
          scale: 1,
          useCORS: true,
          backgroundColor: "#080C14",
          width: 1080,
          height: 1350,
        });
        const imgData = canvas.toDataURL("image/png");
        if (!first) doc.addPage();
        doc.addImage(imgData, "PNG", 0, 0, 1080, 1350);
        first = false;
      }

      setStatus("Saving PDF...");
      doc.save(`NexTax-SMB-Pulse-LinkedIn-${params.id}.pdf`);
      setStatus("✅ Downloaded! Upload to LinkedIn as a Document post.");
    } catch (err) {
      setStatus("Error generating carousel. Try again.");
      console.error(err);
    }
    setGenerating(false);
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#080C14", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280", fontFamily:"sans-serif" }}>
      Loading report...
    </div>
  );

  if (!report) return (
    <div style={{ minHeight:"100vh", background:"#080C14", display:"flex", alignItems:"center", justifyContent:"center", color:"#6B7280", fontFamily:"sans-serif" }}>
      Report not found.
    </div>
  );

  return (
    <div style={{ background:"#080C14", minHeight:"100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Sticky action bar */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(8,12,20,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <span style={{ fontSize:14, fontWeight:600, color:"#E2E8F0", fontFamily:"sans-serif" }}>
            LinkedIn Carousel — Week of {new Date(report.week_starting + "T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
          </span>
          <div style={{ fontSize:12, color:"#4B5563", marginTop:2 }}>6 slides • 1080×1350px • Upload as LinkedIn Document</div>
        </div>
        <button
          onClick={downloadCarousel}
          disabled={generating}
          style={{ padding:"10px 24px", borderRadius:8, background: generating ? "#374151" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", fontSize:13, fontWeight:700, border:"none", cursor: generating ? "default" : "pointer", fontFamily:"sans-serif" }}
        >
          {generating ? status : "↓ Download Carousel PDF"}
        </button>
      </div>

      {/* Caption suggestion */}
      <div style={{ maxWidth:1200, margin:"20px auto", padding:"0 24px" }}>
        <div style={{ padding:"16px 20px", background:"rgba(99,102,241,0.08)", borderRadius:10, border:"1px solid rgba(99,102,241,0.2)", marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#818CF8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8, fontFamily:"sans-serif" }}>Suggested LinkedIn Caption</div>
          <p style={{ fontSize:13, color:"#94A3B8", lineHeight:1.6, fontFamily:"sans-serif", whiteSpace:"pre-line" }}>
            {`The SMB Deal Reality Index is ${report.deal_reality_index?.toFixed(2)} this week — buyers are paying ${report.dri_gap_pct}% above fair value.\n\n${report.pct_deals_overpriced}% of listings are overpriced. Top industries to watch: ${(report.most_overpriced||[]).slice(0,3).map((i: any)=>i.label).join(", ")}.\n\nSwipe to see the full breakdown →\n\nRun your deal: nextax.ai/deal-reality-check\n\n#SMBacquisitions #ETA #dealflow #businessacquisition #NexTaxAI`}
          </p>
        </div>

        {/* Instructions */}
        <div style={{ padding:"14px 20px", background:"rgba(255,255,255,0.02)", borderRadius:8, border:"1px solid rgba(255,255,255,0.05)", marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#6B7280", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8, fontFamily:"sans-serif" }}>How to post on LinkedIn</div>
          <ol style={{ fontSize:12, color:"#6B7280", lineHeight:2, paddingLeft:16, fontFamily:"sans-serif" }}>
            <li>Click "Download Carousel PDF" above</li>
            <li>Go to LinkedIn → Create a post → Click the document icon (📄)</li>
            <li>Upload the downloaded PDF</li>
            <li>LinkedIn renders each page as a swipeable slide</li>
            <li>Paste the caption above and post!</li>
          </ol>
        </div>
      </div>

      {/* Slides preview — scaled down for viewing, actual size used for capture */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px 60px" }}>
        <div style={{ fontSize:12, color:"#4B5563", marginBottom:12, fontFamily:"sans-serif" }}>Preview (scaled) — actual export is 1080×1350px per slide</div>
        {/* Hidden full-size slides for html2canvas capture */}
        <div ref={slidesRef} style={{ position:"absolute", left:"-9999px", top:0, display:"flex", flexDirection:"column", gap:0 }}>
          <Slides report={report} />
        </div>
        {/* Visible scaled preview */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[1,2,3,4,5,6].map(n => (
            <div key={n} style={{ aspectRatio:"4/5", background:"rgba(255,255,255,0.025)", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", position:"relative" }}>
              <div style={{ position:"absolute", inset:0, transform:"scale(0.25)", transformOrigin:"top left", width:400, height:500 }}>
                {/* Placeholder label */}
              </div>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#4B5563", fontSize:12, fontFamily:"sans-serif" }}>
                Slide {n}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
