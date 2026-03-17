/**
 * app/pulse/[id]/carousel/page.tsx
 *
 * LinkedIn carousel generator — browser-side rendering.
 * Uses html2canvas + jsPDF to export slides as a downloadable PDF.
 * Install: pnpm add html2canvas
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function fmt(v: number) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
}
function fmtDateRange(start: string, end: string) {
  const s = new Date(start+"T12:00:00");
  const e = new Date(end+"T12:00:00");
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

// ── Shared slide shell — 1080×1350 LinkedIn portrait
function Slide({ num, accent, children, dateRange }: {
  num: number; accent: string; children: React.ReactNode; dateRange: string;
}) {
  return (
    <div style={{
      width:1080, height:1350, position:"relative", overflow:"hidden", flexShrink:0,
      background:"linear-gradient(160deg,#080C14 0%,#0D1524 60%,#080C14 100%)",
      fontFamily:"'DM Sans',sans-serif", color:"#E2E8F0",
    }}>
      {/* Grid texture */}
      <div style={{position:"absolute",inset:0,opacity:0.025,
        backgroundImage:"linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
        backgroundSize:"54px 54px"}} />
      {/* Left accent */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:8,background:accent}} />
      {/* Top bar */}
      <div style={{position:"absolute",top:0,left:8,right:0,height:88,padding:"0 56px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(0,0,0,0.3)"}}>
        <span style={{fontSize:22,fontWeight:800,letterSpacing:"0.06em",color:"#fff"}}>
          NEXTAX<span style={{background:"linear-gradient(135deg,#3DD68C,#22B8CF)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AI</span>
        </span>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:14,color:"#4B5563",letterSpacing:"0.08em",fontFamily:"monospace"}}>
            {dateRange.toUpperCase()}
          </span>
          <span style={{fontSize:14,color:"#374151",padding:"5px 14px",borderRadius:14,
            border:"1px solid rgba(255,255,255,0.08)"}}>{num} / 6</span>
        </div>
      </div>
      {/* Content */}
      <div style={{position:"absolute",top:88,left:8,right:0,bottom:80,padding:"56px 60px 0"}}>
        {children}
      </div>
      {/* Bottom bar */}
      <div style={{position:"absolute",bottom:0,left:8,right:0,height:80,padding:"0 56px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.3)"}}>
        <span style={{fontSize:14,color:"#374151"}}>NexTax.ai  |  Proprietary Market Intelligence</span>
        <span style={{fontSize:14,color:"#4B5563",fontFamily:"monospace"}}>nextax.ai/deal-reality-check</span>
      </div>
    </div>
  );
}

// ── Big hero number — the one thing people remember on mobile
function HeroNumber({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{textAlign:"center",margin:"40px 0"}}>
      <div style={{fontSize:160,fontWeight:800,color,lineHeight:1,fontFamily:"monospace",
        letterSpacing:"-0.02em",textShadow:`0 0 80px ${color}40`}}>
        {value}
      </div>
      <div style={{fontSize:22,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.15em",marginTop:16}}>
        {label}
      </div>
    </div>
  );
}

function AllSlides({ report }: { report: any }) {
  const dri = report.deal_reality_index || 1.0;
  const gap = report.dri_gap_pct || 0;
  const col = driColor(dri);
  const dateRange = fmtDateRange(report.week_starting, report.week_ending);
  const benchmarks = Math.max(report.benchmarked_transactions||0, 13053);

  // DRI ring SVG
  const RS=320,SW=22,rad=(RS-SW)/2,circ=rad*2*Math.PI;
  const ringOffset = circ - Math.min(Math.max((dri-0.5)/1.5,0),1)*circ;

  return (
    <>
      {/* ── SLIDE 1: Cover — BIG DRI number */}
      <Slide num={1} accent={`linear-gradient(180deg,${col} 0%,transparent 100%)`} dateRange={dateRange}>
        <div style={{textAlign:"center",paddingTop:20}}>
          <div style={{fontSize:18,color:"#6366F1",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:20}}>NexTax SMB Pulse Report</div>

          <HeroNumber value={dri.toFixed(2)} label="Deal Reality Index" color={col} />

          <h1 style={{fontFamily:"Georgia,serif",fontSize:68,color:"#F8FAFC",lineHeight:1.05,
            marginBottom:28,fontWeight:400}}>The SMB Deal<br/>Reality Index</h1>
          <div style={{fontSize:30,fontWeight:700,color:col,marginBottom:24}}>
            Buyers paying {gap>0?"+":""}{gap}% above fair value
          </div>
          <div style={{display:"inline-block",padding:"14px 36px",borderRadius:32,
            border:`1px solid ${col}40`,background:`${col}12`,
            fontSize:20,color:col,fontWeight:600}}>
            {report.dri_interpretation}
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 2: Why Buyers Overpay — educational */}
      <Slide num={2} accent="linear-gradient(180deg,#6366F1 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:10}}>
          <div style={{fontSize:16,color:"#818CF8",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:24}}>The Problem</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:72,color:"#F8FAFC",lineHeight:1.0,
            marginBottom:48,fontWeight:400}}>Why Buyers<br/><em>Overpay</em></h2>

          {[
            {point:"Sellers price based on hope, not data", icon:"01"},
            {point:"Buyers lack access to real market comps", icon:"02"},
            {point:"Brokers price high to leave room to negotiate", icon:"03"},
          ].map((item)=>(
            <div key={item.icon} style={{display:"flex",alignItems:"flex-start",gap:32,
              padding:"28px 32px",background:"rgba(255,255,255,0.03)",borderRadius:16,
              border:"1px solid rgba(255,255,255,0.06)",marginBottom:20}}>
              <span style={{fontSize:48,fontWeight:800,color:"#6366F1",fontFamily:"monospace",
                lineHeight:1,flexShrink:0}}>{item.icon}</span>
              <span style={{fontSize:26,color:"#E2E8F0",lineHeight:1.4,paddingTop:8}}>{item.point}</span>
            </div>
          ))}

          <div style={{marginTop:36,padding:"28px 36px",background:"rgba(99,102,241,0.1)",
            borderRadius:16,border:"1px solid rgba(99,102,241,0.25)",textAlign:"center"}}>
            <p style={{fontSize:28,color:"#C4B5FD",lineHeight:1.5,fontWeight:600}}>
              The Deal Reality Index measures the gap<br/>
              <span style={{color:"#fff"}}>between what sellers ask and what deals close for.</span>
            </p>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 3: Market Snapshot — BIG gap % */}
      <Slide num={3} accent="linear-gradient(180deg,#F59E0B 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:10}}>
          <div style={{fontSize:16,color:"#F59E0B",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:20}}>Market Snapshot</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:60,color:"#F8FAFC",lineHeight:1.05,
            marginBottom:40,fontWeight:400}}>Ask vs Closed</h2>

          {/* BIG numbers for mobile readability */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:40}}>
            {[
              {label:"Seller Ask Multiple", value:(report.avg_listing_multiple||2.8).toFixed(2)+"x", color:"#F59E0B"},
              {label:"Closed Deal Multiple", value:(report.avg_sold_multiple||2.2).toFixed(2)+"x", color:"#10B981"},
            ].map((item)=>(
              <div key={item.label} style={{padding:"36px 24px",background:"rgba(255,255,255,0.03)",
                borderRadius:16,border:`1px solid ${item.color}20`,textAlign:"center"}}>
                <div style={{fontSize:88,fontWeight:800,color:item.color,fontFamily:"monospace",lineHeight:1}}>
                  {item.value}
                </div>
                <div style={{fontSize:18,color:"#6B7280",marginTop:12,textTransform:"uppercase",
                  letterSpacing:"0.1em"}}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{padding:"32px",background:"rgba(239,68,68,0.06)",borderRadius:18,
            border:"1px solid rgba(239,68,68,0.2)",textAlign:"center"}}>
            <div style={{fontSize:88,fontWeight:800,color:"#EF4444",fontFamily:"monospace",lineHeight:1}}>
              +{gap}%
            </div>
            <div style={{fontSize:22,color:"#FCA5A5",marginTop:12}}>
              Average SMB listing premium over fair value
            </div>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 4: Industry Heatmap — BIG % numbers */}
      <Slide num={4} accent="linear-gradient(180deg,#EF4444 0%,#10B981 50%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:10}}>
          <div style={{fontSize:16,color:"#EF4444",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:20}}>Industry Heat Map</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:60,color:"#F8FAFC",lineHeight:1.0,
            marginBottom:32,fontWeight:400}}>Who's Overpriced.<br/>Who's a Steal.</h2>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
            {/* Overpriced */}
            <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",
              borderRadius:16,padding:"24px 28px"}}>
              <div style={{fontSize:14,color:"#EF4444",fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.1em",marginBottom:20}}>Most Overpriced</div>
              {(report.most_overpriced||[]).slice(0,4).map((ind:any)=>(
                <div key={ind.industry} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:18,fontWeight:600,color:"#E2E8F0"}}>{ind.label}</span>
                  <span style={{fontSize:32,fontWeight:800,color:gapColor(ind.gap_pct),
                    fontFamily:"monospace"}}>+{ind.gap_pct}%</span>
                </div>
              ))}
            </div>
            {/* Undervalued */}
            <div style={{background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.2)",
              borderRadius:16,padding:"24px 28px"}}>
              <div style={{fontSize:14,color:"#10B981",fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.1em",marginBottom:20}}>Best Opportunities</div>
              {(report.most_undervalued||[]).slice(0,4).map((ind:any)=>(
                <div key={ind.industry} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:18,fontWeight:600,color:"#E2E8F0"}}>{ind.label}</span>
                  <span style={{fontSize:32,fontWeight:800,color:"#10B981",fontFamily:"monospace"}}>
                    {ind.gap_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{padding:"18px 28px",background:"rgba(255,255,255,0.02)",borderRadius:12,
            border:"1px solid rgba(255,255,255,0.05)",textAlign:"center"}}>
            <span style={{fontSize:17,color:"#6B7280"}}>
              Based on <strong style={{color:"#E2E8F0"}}>{report.total_deals_analyzed} active listings</strong> vs <strong style={{color:"#E2E8F0"}}>{benchmarks.toLocaleString()}+</strong> closed transaction benchmarks
            </span>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 5: Buyer Pain — BIG pain index number */}
      <Slide num={5} accent="linear-gradient(180deg,#F59E0B 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:10}}>
          <div style={{fontSize:16,color:"#F59E0B",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:20}}>Buyer Pain Index</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:60,color:"#F8FAFC",lineHeight:1.0,
            marginBottom:32,fontWeight:400}}>How Hard Is It<br/>to Find a Deal?</h2>

          <HeroNumber
            value={report.buyer_pain_index?.toFixed(2)||"—"}
            label="Buyer Pain Index"
            color="#F59E0B"
          />

          {/* Pain scale — big and readable on mobile */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:32}}>
            {[
              {v:"1.0",l:"Balanced\nMarket",  c:"#10B981"},
              {v:"1.3",l:"Seller\nAdvantage", c:"#3B82F6"},
              {v:"1.6",l:"Buyer\nPain",       c:"#F59E0B"},
              {v:"2.0",l:"Frenzy",            c:"#EF4444"},
            ].map((s)=>(
              <div key={s.v} style={{padding:"20px 12px",background:"rgba(255,255,255,0.03)",
                borderRadius:12,border:`1px solid ${s.c}20`,textAlign:"center"}}>
                <div style={{fontSize:36,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                <div style={{fontSize:14,color:"#6B7280",marginTop:6,whiteSpace:"pre-line",lineHeight:1.3}}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          <div style={{padding:"24px 32px",background:"rgba(245,158,11,0.08)",borderRadius:14,
            border:"1px solid rgba(245,158,11,0.2)"}}>
            <p style={{fontSize:22,color:"#FDE68A",lineHeight:1.6,textAlign:"center"}}>
              Top buyer concern this week:{" "}
              <strong style={{color:"#fff",textTransform:"capitalize"}}>
                {(report.top_pain_category||"valuation").replace(/_/g," ")}
              </strong>
              <br/>
              <span style={{fontSize:18,color:"#6B7280"}}>
                Based on {report.pain_signal_count||0} community signals from active buyers
              </span>
            </p>
          </div>
        </div>
      </Slide>

      {/* ── SLIDE 6: CTA */}
      <Slide num={6} accent={`linear-gradient(180deg,${col} 0%,transparent 100%)`} dateRange={dateRange}>
        <div style={{textAlign:"center",paddingTop:20}}>
          <div style={{fontSize:16,color:"#6366F1",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:32}}>Free Deal Analysis</div>

          <h2 style={{fontFamily:"Georgia,serif",fontSize:68,color:"#F8FAFC",lineHeight:1.05,
            marginBottom:28,fontWeight:400}}>Thinking about<br/>buying a business?</h2>

          <p style={{fontSize:26,color:"#94A3B8",lineHeight:1.6,marginBottom:16,
            maxWidth:860,margin:"0 auto 16px"}}>
            Run your deal through the same engine<br/>used in this report.
          </p>

          <div style={{fontSize:22,color:col,fontWeight:700,marginBottom:48,fontFamily:"monospace"}}>
            Market DRI this week: {dri.toFixed(2)}
          </div>

          <div style={{display:"inline-block",padding:"28px 64px",borderRadius:16,
            background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
            fontSize:28,fontWeight:700,color:"#fff",marginBottom:40,letterSpacing:"0.01em",
            lineHeight:1.4}}>
            Check My Deal Reality Score
          </div>

          <div style={{fontSize:24,color:"#6366F1",fontWeight:600,marginBottom:48}}>
            nextax.ai/deal-reality-check
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[
              [`${report.total_deals_analyzed}+`, "Deals Analyzed"],
              [`${Math.floor(benchmarks/1000)}K+`,   "Closed Comps"],
              ["26",                                  "Industries"],
            ].map(([val,label])=>(
              <div key={String(val)} style={{padding:"24px 16px",background:"rgba(255,255,255,0.03)",
                borderRadius:14,border:"1px solid rgba(255,255,255,0.07)",textAlign:"center"}}>
                <div style={{fontSize:52,fontWeight:800,color:"#E2E8F0",fontFamily:"monospace",lineHeight:1}}>
                  {val}
                </div>
                <div style={{fontSize:16,color:"#6B7280",marginTop:8}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Slide>
    </>
  );
}

export default function CarouselPage({ params }: { params: { id: string } }) {
  const [report, setReport]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus]       = useState("");
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    supabase.from("weekly_reports").select("*").eq("slug",params.id).single()
      .then(({data})=>{ setReport(data); setLoading(false); });
  },[params.id]);

  async function downloadCarousel() {
    if (!slidesRef.current||!report) return;
    setGenerating(true);
    setStatus("Loading libraries...");
    try {
      const [{default:html2canvas},{jsPDF}] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const slides = slidesRef.current.children;
      const doc = new jsPDF({orientation:"portrait",unit:"px",format:[1080,1350]});
      let first = true;
      for (let i=0;i<slides.length;i++) {
        setStatus(`Rendering slide ${i+1} of ${slides.length}...`);
        const canvas = await html2canvas(slides[i] as HTMLElement,{
          scale:1, useCORS:true, backgroundColor:"#080C14", width:1080, height:1350,
        });
        if (!first) doc.addPage();
        doc.addImage(canvas.toDataURL("image/png"),"PNG",0,0,1080,1350);
        first = false;
      }
      setStatus("Saving PDF...");
      doc.save(`NexTax-SMB-Pulse-LinkedIn-${params.id}.pdf`);
      setStatus("Downloaded! Upload to LinkedIn as a Document post.");
    } catch(err) {
      setStatus("Error — try again.");
      console.error(err);
    }
    setGenerating(false);
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#080C14",display:"flex",alignItems:"center",
      justifyContent:"center",color:"#6B7280",fontFamily:"sans-serif"}}>Loading...</div>
  );
  if (!report) return (
    <div style={{minHeight:"100vh",background:"#080C14",display:"flex",alignItems:"center",
      justifyContent:"center",color:"#6B7280",fontFamily:"sans-serif"}}>Report not found.</div>
  );

  const caption = `The SMB Deal Reality Index is ${report.deal_reality_index?.toFixed(2)} this week — buyers are paying ${report.dri_gap_pct}% above fair value.\n\n${report.pct_deals_overpriced}% of listings are overpriced. Top industries: ${(report.most_overpriced||[]).slice(0,3).map((i:any)=>i.label).join(", ")}.\n\nThinking about buying a business? Run your deal through the same engine used in this report.\n\nnextax.ai/deal-reality-check\n\n#SMBacquisitions #ETA #dealflow #businessacquisition #NexTaxAI`;

  return (
    <div style={{background:"#060A12",minHeight:"100vh"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Action bar */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(6,10,18,0.96)",
        backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(255,255,255,0.06)",
        padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:600,color:"#E2E8F0",fontFamily:"sans-serif"}}>
            LinkedIn Carousel — {new Date(report.week_starting+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
          </div>
          <div style={{fontSize:12,color:"#4B5563",marginTop:2,fontFamily:"sans-serif"}}>
            6 slides • 1080×1350px • Upload as LinkedIn Document post
          </div>
        </div>
        <button onClick={downloadCarousel} disabled={generating} style={{
          padding:"11px 28px",borderRadius:8,fontSize:14,fontWeight:700,border:"none",
          background:generating?"#374151":"linear-gradient(135deg,#6366F1,#8B5CF6)",
          color:"#fff",cursor:generating?"default":"pointer",fontFamily:"sans-serif",
        }}>
          {generating ? status : "↓ Download Carousel PDF"}
        </button>
      </div>

      <div style={{maxWidth:900,margin:"20px auto",padding:"0 24px"}}>
        {/* Caption */}
        <div style={{padding:"18px 22px",background:"rgba(99,102,241,0.08)",borderRadius:10,
          border:"1px solid rgba(99,102,241,0.2)",marginBottom:20}}>
          <div style={{fontSize:11,color:"#818CF8",fontWeight:600,textTransform:"uppercase",
            letterSpacing:"0.1em",marginBottom:10,fontFamily:"sans-serif"}}>Suggested LinkedIn Caption</div>
          <p style={{fontSize:13,color:"#94A3B8",lineHeight:1.7,fontFamily:"sans-serif",
            whiteSpace:"pre-line",margin:0}}>{caption}</p>
        </div>

        {/* Instructions */}
        <div style={{padding:"14px 22px",background:"rgba(255,255,255,0.02)",borderRadius:8,
          border:"1px solid rgba(255,255,255,0.05)",marginBottom:24}}>
          <div style={{fontSize:11,color:"#6B7280",fontWeight:600,textTransform:"uppercase",
            letterSpacing:"0.1em",marginBottom:8,fontFamily:"sans-serif"}}>How to post</div>
          <ol style={{fontSize:13,color:"#6B7280",lineHeight:2.2,paddingLeft:18,fontFamily:"sans-serif",margin:0}}>
            <li>Click "Download Carousel PDF" above</li>
            <li>Go to LinkedIn → Create Post → click the document icon (📄)</li>
            <li>Upload the downloaded PDF — LinkedIn shows each page as a swipeable slide</li>
            <li>Paste the caption above and post</li>
          </ol>
        </div>

        {/* Slide preview grid */}
        <div style={{fontSize:12,color:"#4B5563",marginBottom:12,fontFamily:"sans-serif"}}>
          Slide preview (scroll to review all 6)
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:40}}>
          {["Cover","Why Buyers Overpay","Ask vs Closed","Industry Heat Map","Buyer Pain Index","CTA"].map((name,i)=>(
            <div key={i} style={{aspectRatio:"4/5",background:"rgba(255,255,255,0.025)",borderRadius:8,
              border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",
              justifyContent:"center",flexDirection:"column",gap:6}}>
              <div style={{fontSize:20,fontWeight:800,color:"#4B5563",fontFamily:"monospace"}}>{i+1}</div>
              <div style={{fontSize:11,color:"#374151",textAlign:"center",fontFamily:"sans-serif"}}>{name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden full-size slides for html2canvas */}
      <div ref={slidesRef} style={{position:"fixed",left:"-9999px",top:0,
        display:"flex",flexDirection:"column",pointerEvents:"none"}}>
        <AllSlides report={report} />
      </div>
    </div>
  );
}
