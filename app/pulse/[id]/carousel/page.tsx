/**
 * app/pulse/[id]/carousel/page.tsx
 * LinkedIn carousel — browser-side rendering via html2canvas + jsPDF
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
  const s = new Date(start+"T12:00:00"), e = new Date(end+"T12:00:00");
  return `${s.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
}
function driColor(dri: number) {
  if (dri < 1.0) return "#10B981"; if (dri <= 1.15) return "#3B82F6";
  if (dri <= 1.30) return "#F59E0B"; return "#EF4444";
}
function gapColor(gap: number) {
  if (gap < 0) return "#10B981"; if (gap <= 15) return "#3B82F6";
  if (gap <= 30) return "#F59E0B"; return "#EF4444";
}

// Shared slide shell
function Slide({ num, accent, children, dateRange }: {
  num: number; accent: string; children: React.ReactNode; dateRange: string;
}) {
  return (
    <div style={{width:1080,height:1350,position:"relative",overflow:"hidden",flexShrink:0,
      background:"linear-gradient(160deg,#080C14 0%,#0D1524 60%,#080C14 100%)",
      fontFamily:"'DM Sans',sans-serif",color:"#E2E8F0"}}>
      <div style={{position:"absolute",inset:0,opacity:0.025,
        backgroundImage:"linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
        backgroundSize:"54px 54px"}} />
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:8,background:accent}} />
      {/* Header */}
      <div style={{position:"absolute",top:0,left:8,right:0,height:88,padding:"0 56px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:"1px solid rgba(255,255,255,0.1)",background:"rgba(0,0,0,0.3)"}}>
        <span style={{fontSize:22,fontWeight:800,letterSpacing:"0.06em",color:"#fff"}}>
          NEXTAX<span style={{color:"#3DD68C"}}>AI</span>
        </span>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:15,color:"#94A3B8",letterSpacing:"0.08em",fontFamily:"monospace"}}>
            {dateRange.toUpperCase()}
          </span>
          <span style={{fontSize:14,color:"#94A3B8",padding:"5px 14px",borderRadius:14,
            border:"1px solid rgba(255,255,255,0.15)"}}>{num} / 6</span>
        </div>
      </div>
      {/* Content */}
      <div style={{position:"absolute",top:88,left:8,right:0,bottom:80,padding:"48px 56px 0"}}>
        {children}
      </div>
      {/* Footer */}
      <div style={{position:"absolute",bottom:0,left:8,right:0,height:80,padding:"0 56px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderTop:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.3)"}}>
        <span style={{fontSize:14,color:"#6B7280"}}>NexTax.ai  |  Proprietary Market Intelligence</span>
        <span style={{fontSize:14,color:"#6B7280",fontFamily:"monospace"}}>nextax.ai/deal-reality-check</span>
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

  // DRI ring
  const RS=280, SW=20, rad=(RS-SW)/2, circ=rad*2*Math.PI;
  const ringOffset = circ - Math.min(Math.max((dri-0.5)/1.5,0),1)*circ;

  // Bar chart widths
  const maxMult = Math.max(report.avg_listing_multiple||3, report.avg_sold_multiple||3) * 1.1;
  const askPct  = Math.min(((report.avg_listing_multiple||2.8)/maxMult)*100,100);
  const soldPct = Math.min(((report.avg_sold_multiple||2.2)/maxMult)*100,100);

  return (
    <>
      {/* ══════════════════════════════════════════
          SLIDE 1 — COVER with DRI ring + KPI strip
      ══════════════════════════════════════════ */}
      <Slide num={1} accent={`linear-gradient(180deg,${col} 0%,transparent 100%)`} dateRange={dateRange}>
        <div style={{textAlign:"center",paddingTop:8}}>
          <div style={{fontSize:17,color:"#6366F1",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:20}}>NexTax SMB Pulse Report</div>

          {/* DRI ring */}
          <div style={{position:"relative",width:RS,height:RS,margin:"0 auto 16px"}}>
            <svg width={RS} height={RS} style={{transform:"rotate(-90deg)"}}>
              <circle cx={RS/2} cy={RS/2} r={rad} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={SW}/>
              <circle cx={RS/2} cy={RS/2} r={rad} fill="none" stroke={col} strokeWidth={SW}
                strokeDasharray={circ} strokeDashoffset={ringOffset} strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:4}}>
              <span style={{fontSize:96,fontWeight:800,color:col,lineHeight:1,fontFamily:"monospace"}}>
                {dri.toFixed(2)}
              </span>
              <span style={{fontSize:14,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.15em",
                marginTop:8}}>Deal Reality Index</span>
            </div>
          </div>

          <h1 style={{fontFamily:"Georgia,serif",fontSize:64,color:"#F8FAFC",lineHeight:1.05,
            marginBottom:20,fontWeight:400}}>The SMB Deal<br/>Reality Index</h1>
          <div style={{fontSize:28,fontWeight:700,color:col,marginBottom:20}}>
            Buyers paying {gap>0?"+":""}{gap}% above fair value
          </div>
          <div style={{display:"inline-block",padding:"12px 32px",borderRadius:32,
            border:`1px solid ${col}40`,background:`${col}12`,fontSize:19,color:col,fontWeight:600,marginBottom:28}}>
            {report.dri_interpretation}
          </div>

          {/* KPI strip */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {v:String(report.total_deals_analyzed),  l:"Live Deals Analyzed",           c:"#E2E8F0", b:"#6366F1"},
              {v:`${benchmarks.toLocaleString()}+`,     l:"Closed Transaction Benchmarks", c:"#E2E8F0", b:"#3B82F6"},
              {v:"26",                                  l:"Industries Tracked",            c:"#E2E8F0", b:"#10B981"},
              {v:`${report.pct_deals_overpriced}%`,    l:"Overpriced Listings",           c:"#EF4444", b:"#EF4444"},
            ].map((k)=>(
              <div key={k.l} style={{padding:"16px 8px",background:"rgba(255,255,255,0.04)",
                borderRadius:12,border:`1px solid ${k.b}30`,borderTop:`3px solid ${k.b}`,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:800,color:k.c,fontFamily:"monospace",lineHeight:1}}>{k.v}</div>
                <div style={{fontSize:12,color:"#6B7280",marginTop:6,textTransform:"uppercase",
                  letterSpacing:"0.06em",lineHeight:1.3}}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* DRI scale */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {[
              {range:"< 1.0",    label:"Undervalued",      color:"#10B981"},
              {range:"1.0–1.15", label:"Healthy",          color:"#3B82F6"},
              {range:"1.15–1.30",label:"Overpriced",       color:"#F59E0B"},
              {range:"1.30+",    label:"Highly Overpriced",color:"#EF4444"},
            ].map((s)=>(
              <div key={s.range} style={{textAlign:"center"}}>
                <div style={{height:4,background:s.color,borderRadius:2,marginBottom:5,opacity:0.8}}/>
                <div style={{fontSize:13,fontWeight:700,color:s.color,fontFamily:"monospace"}}>{s.range}</div>
                <div style={{fontSize:11,color:"#4B5563"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════════════
          SLIDE 2 — Why Buyers Overpay (educational)
      ══════════════════════════════════════════ */}
      <Slide num={2} accent="linear-gradient(180deg,#6366F1 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:10}}>
          <div style={{fontSize:16,color:"#818CF8",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:20}}>The Problem</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:72,color:"#F8FAFC",lineHeight:1.0,
            marginBottom:44,fontWeight:400}}>Why Buyers<br/><em>Overpay</em></h2>
          {[
            {point:"Sellers price based on hope, not data",       icon:"01"},
            {point:"Buyers lack access to real market comps",     icon:"02"},
            {point:"Brokers price high to leave room to negotiate",icon:"03"},
          ].map((item)=>(
            <div key={item.icon} style={{display:"flex",alignItems:"center",gap:32,
              padding:"28px 32px",background:"rgba(255,255,255,0.03)",borderRadius:16,
              border:"1px solid rgba(255,255,255,0.06)",marginBottom:18}}>
              <span style={{fontSize:44,fontWeight:800,color:"#6366F1",fontFamily:"monospace",
                lineHeight:1,flexShrink:0}}>{item.icon}</span>
              <span style={{fontSize:26,color:"#E2E8F0",lineHeight:1.4}}>{item.point}</span>
            </div>
          ))}
          <div style={{marginTop:32,padding:"28px 36px",background:"rgba(99,102,241,0.1)",
            borderRadius:16,border:"1px solid rgba(99,102,241,0.25)",textAlign:"center"}}>
            <p style={{fontSize:26,color:"#C4B5FD",lineHeight:1.5,fontWeight:600,margin:0}}>
              The Deal Reality Index measures the gap<br/>
              <span style={{color:"#fff"}}>between what sellers ask and what deals close for.</span>
            </p>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════════════
          SLIDE 3 — Market Snapshot with bars + distribution
      ══════════════════════════════════════════ */}
      <Slide num={3} accent="linear-gradient(180deg,#F59E0B 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:8}}>
          <div style={{fontSize:15,color:"#F59E0B",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:14}}>Market Snapshot</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:52,color:"#F8FAFC",lineHeight:1.05,
            marginBottom:28,fontWeight:400}}>Seller Expectations<br/>vs Market Reality</h2>

          {/* Two big multiples side by side */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            {[
              {label:"Seller Ask Multiple",  value:(report.avg_listing_multiple||2.8).toFixed(2)+"x", color:"#F59E0B"},
              {label:"Closed Deal Multiple", value:(report.avg_sold_multiple||2.2).toFixed(2)+"x",   color:"#10B981"},
            ].map((item)=>(
              <div key={item.label} style={{padding:"28px 20px",background:"rgba(255,255,255,0.03)",
                borderRadius:14,border:`1px solid ${item.color}20`,textAlign:"center"}}>
                <div style={{fontSize:80,fontWeight:800,color:item.color,fontFamily:"monospace",lineHeight:1}}>
                  {item.value}
                </div>
                <div style={{fontSize:15,color:"#94A3B8",marginTop:10,textTransform:"uppercase",
                  letterSpacing:"0.1em"}}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Bar graphs (visual only) */}
          <div style={{padding:"16px 20px",background:"rgba(255,255,255,0.02)",borderRadius:10,
            border:"1px solid rgba(255,255,255,0.05)",marginBottom:16}}>
            <div style={{marginBottom:10}}>
              <div style={{height:14,background:"rgba(255,255,255,0.06)",borderRadius:7,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${askPct}%`,background:"#F59E0B",borderRadius:7}}/>
              </div>
              <div style={{height:14,background:"rgba(255,255,255,0.06)",borderRadius:7,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${soldPct}%`,background:"#10B981",borderRadius:7}}/>
              </div>
            </div>
          </div>

          {/* Big gap % */}
          <div style={{padding:"22px",background:"rgba(239,68,68,0.06)",borderRadius:14,
            border:"1px solid rgba(239,68,68,0.2)",textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:80,fontWeight:800,color:"#EF4444",fontFamily:"monospace",lineHeight:1}}>
              +{gap}%
            </div>
            <div style={{fontSize:18,color:"#FCA5A5",marginTop:8}}>
              Average SMB listing premium over fair value this week
            </div>
          </div>

          {/* Deal pricing distribution bar */}
          <div style={{padding:"16px 20px",background:"rgba(255,255,255,0.02)",borderRadius:10,
            border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:13,color:"#6B7280",marginBottom:10,textTransform:"uppercase",
              letterSpacing:"0.08em"}}>Deal Pricing Distribution — {report.total_deals_analyzed} listings</div>
            <div style={{display:"flex",height:24,borderRadius:6,overflow:"hidden",gap:2}}>
              <div style={{width:`${report.pct_deals_overpriced}%`,background:"#EF4444",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:700,color:"#fff"}}>{report.pct_deals_overpriced}%</div>
              <div style={{width:`${report.pct_deals_fair}%`,background:"#3B82F6",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:700,color:"#fff"}}>{report.pct_deals_fair}%</div>
              <div style={{width:`${report.pct_deals_undervalued}%`,background:"#10B981",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:700,color:"#fff"}}>{report.pct_deals_undervalued}%</div>
            </div>
            <div style={{display:"flex",gap:16,marginTop:8}}>
              {[["#EF4444","Overpriced"],["#3B82F6","Fair Market"],["#10B981","Undervalued"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:10,height:10,borderRadius:2,background:c,flexShrink:0}}/>
                  <span style={{fontSize:12,color:"#6B7280"}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════════════
          SLIDE 4 — Heatmap + Opportunities
      ══════════════════════════════════════════ */}
      <Slide num={4} accent="linear-gradient(180deg,#EF4444 0%,#10B981 50%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:8}}>
          <div style={{fontSize:15,color:"#EF4444",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:14}}>Industry Heat Map</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:52,color:"#F8FAFC",lineHeight:1.0,
            marginBottom:20,fontWeight:400}}>Who's Overpriced.<br/>Who's a Steal.</h2>

          {/* Two column heat map */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",
              borderRadius:14,padding:"18px 22px"}}>
              <div style={{fontSize:14,color:"#EF4444",fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.1em",marginBottom:6}}>Most Overpriced</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0 12px",
                borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:6,marginBottom:6}}>
                <span style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>Industry</span>
                <span style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>DRI</span>
                <span style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>Gap</span>
              </div>
              {(report.most_overpriced||[]).slice(0,4).map((ind:any)=>(
                <div key={ind.industry} style={{display:"grid",gridTemplateColumns:"1fr auto auto",
                  gap:"0 12px",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:16,fontWeight:600,color:"#E2E8F0"}}>{ind.label}</span>
                  <span style={{fontSize:16,fontWeight:700,color:driColor(ind.dri),fontFamily:"monospace"}}>{ind.dri.toFixed(2)}</span>
                  <span style={{fontSize:20,fontWeight:800,color:gapColor(ind.gap_pct),fontFamily:"monospace"}}>+{ind.gap_pct}%</span>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.2)",
              borderRadius:14,padding:"18px 22px"}}>
              <div style={{fontSize:14,color:"#10B981",fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.1em",marginBottom:6}}>Best Opportunities</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0 12px",
                borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:6,marginBottom:6}}>
                <span style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>Industry</span>
                <span style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>DRI</span>
                <span style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>Gap</span>
              </div>
              {(report.most_undervalued||[]).slice(0,4).map((ind:any)=>(
                <div key={ind.industry} style={{display:"grid",gridTemplateColumns:"1fr auto auto",
                  gap:"0 12px",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:16,fontWeight:600,color:"#E2E8F0"}}>{ind.label}</span>
                  <span style={{fontSize:16,fontWeight:700,color:driColor(ind.dri),fontFamily:"monospace"}}>{ind.dri.toFixed(2)}</span>
                  <span style={{fontSize:20,fontWeight:800,color:"#10B981",fontFamily:"monospace"}}>{ind.gap_pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities section */}
          <div style={{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.15)",
            borderRadius:14,padding:"16px 20px"}}>
            <div style={{fontSize:14,color:"#818CF8",fontWeight:700,textTransform:"uppercase",
              letterSpacing:"0.08em",marginBottom:4,textAlign:"center"}}>Deals Worth Looking At This Week</div>
            <div style={{fontSize:12,color:"#4B5563",textAlign:"center",marginBottom:10}}>
              Score 65+ with favorable pricing signals
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto auto",gap:"0 10px",
              borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:6,marginBottom:6}}>
              {["Industry","SDE","Asking","Fair Value","Signal"].map(h=>(
                <span key={h} style={{fontSize:11,color:"#4B5563",textTransform:"uppercase"}}>{h}</span>
              ))}
            </div>
            {(report.top_opportunities||[]).slice(0,4).map((opp:any,i:number)=>{
              const isOver=opp.fair_value&&opp.asking_price>opp.fair_value*1.15;
              const isUnder=opp.fair_value&&opp.asking_price<opp.fair_value*0.85;
              const sc=isOver?"#EF4444":isUnder?"#10B981":"#3B82F6";
              const sl=isOver?"Over":isUnder?"Under":"Fair";
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto auto",
                  gap:"0 10px",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",
                  alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:600,color:"#E2E8F0"}}>{opp.industry}</span>
                  <span style={{fontSize:12,color:"#6B7280",fontFamily:"monospace"}}>{fmt(opp.sde)}</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#E2E8F0",fontFamily:"monospace"}}>{fmt(opp.asking_price)}</span>
                  <span style={{fontSize:12,color:"#C4B5FD",fontFamily:"monospace"}}>{opp.fair_value?fmt(opp.fair_value):"—"}</span>
                  <span style={{fontSize:11,fontWeight:700,color:sc,padding:"2px 8px",
                    borderRadius:4,background:`${sc}15`}}>{sl}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════════════
          SLIDE 5 — Buyer Pain + This Week in Numbers
      ══════════════════════════════════════════ */}
      <Slide num={5} accent="linear-gradient(180deg,#F59E0B 0%,transparent 100%)" dateRange={dateRange}>
        <div style={{paddingTop:8}}>
          <div style={{fontSize:15,color:"#F59E0B",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:14}}>Buyer Pain Index</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:54,color:"#F8FAFC",lineHeight:1.0,
            marginBottom:24,fontWeight:400}}>How Hard Is It<br/>to Find a Deal?</h2>

          {/* Big number — moved up, label below */}
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:140,fontWeight:800,color:"#F59E0B",lineHeight:1,
              fontFamily:"monospace",letterSpacing:"-0.02em",
              textShadow:"0 0 60px #F59E0B40"}}>
              {report.buyer_pain_index?.toFixed(2)||"—"}
            </div>
            <div style={{fontSize:18,color:"#94A3B8",textTransform:"uppercase",
              letterSpacing:"0.15em",marginTop:8}}>Buyer Pain Index</div>
          </div>

          {/* Scale */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {v:"1.0",l:"Balanced\nMarket",  c:"#10B981"},
              {v:"1.3",l:"Seller\nAdvantage", c:"#3B82F6"},
              {v:"1.6",l:"Buyer\nPain",       c:"#F59E0B"},
              {v:"2.0",l:"Frenzy",            c:"#EF4444"},
            ].map((s)=>(
              <div key={s.v} style={{padding:"16px 10px",background:"rgba(255,255,255,0.03)",
                borderRadius:12,border:`1px solid ${s.c}20`,textAlign:"center"}}>
                <div style={{fontSize:32,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
                <div style={{fontSize:13,color:"#6B7280",marginTop:5,whiteSpace:"pre-line",lineHeight:1.3}}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* This week in numbers */}
          <div style={{padding:"18px 24px",background:"rgba(99,102,241,0.07)",borderRadius:14,
            border:"1px solid rgba(99,102,241,0.2)"}}>
            <div style={{fontSize:13,color:"#818CF8",fontWeight:700,textTransform:"uppercase",
              letterSpacing:"0.1em",marginBottom:12,textAlign:"center"}}>This Week in Numbers</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px"}}>
              {[
                {label:"Market DRI",          value:`${dri.toFixed(2)}`},
                {label:"Avg ask multiple",    value:`${(report.avg_listing_multiple||0).toFixed(2)}x`},
                {label:"Avg sold multiple",   value:`${(report.avg_sold_multiple||0).toFixed(2)}x`},
                {label:"Pricing gap",         value:`+${gap}%`},
                {label:"Overpriced listings", value:`${report.pct_deals_overpriced}%`},
                {label:"Top buyer concern",   value:(report.top_pain_category||"").replace(/_/g," ")},
              ].map((item)=>(
                <div key={item.label} style={{display:"flex",justifyContent:"space-between",
                  borderBottom:"1px solid rgba(255,255,255,0.04)",paddingBottom:6}}>
                  <span style={{fontSize:13,color:"#6B7280"}}>{item.label}</span>
                  <span style={{fontSize:14,fontWeight:700,color:"#E2E8F0",fontFamily:"monospace",
                    textTransform:"capitalize"}}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════════════
          SLIDE 6 — CTA
      ══════════════════════════════════════════ */}
      <Slide num={6} accent={`linear-gradient(180deg,${col} 0%,transparent 100%)`} dateRange={dateRange}>
        <div style={{textAlign:"center",paddingTop:24}}>
          <div style={{fontSize:16,color:"#6366F1",fontWeight:600,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:28}}>Free Deal Analysis</div>

          <h2 style={{fontFamily:"Georgia,serif",fontSize:72,color:"#F8FAFC",lineHeight:1.05,
            marginBottom:24,fontWeight:400}}>Thinking about<br/>buying a business?</h2>

          <p style={{fontSize:26,color:"#94A3B8",lineHeight:1.6,marginBottom:20,
            maxWidth:860,margin:"0 auto 20px"}}>
            Run your deal through the same engine<br/>used in this report.
          </p>

          <div style={{fontSize:22,color:col,fontWeight:700,marginBottom:40,fontFamily:"monospace"}}>
            Market DRI this week: {dri.toFixed(2)}
          </div>

          {/* Clickable CTA button */}
          <a href="https://nextax.ai/deal-reality-check" target="_blank" rel="noopener noreferrer"
            style={{display:"inline-block",padding:"28px 64px",borderRadius:16,
              background:"linear-gradient(135deg,#6366F1,#8B5CF6)",textDecoration:"none",
              fontSize:28,fontWeight:700,color:"#fff",marginBottom:36,letterSpacing:"0.01em",
              lineHeight:1.4,boxShadow:"0 8px 32px rgba(99,102,241,0.4)"}}>
            Check My Deal Reality Score
          </a>

          <div style={{fontSize:22,color:"#6366F1",fontWeight:600,marginBottom:44}}>
            nextax.ai/deal-reality-check
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[
              [`${report.total_deals_analyzed}+`,"Deals Analyzed"],
              [`${Math.floor(benchmarks/1000)}K+`, "Closed Comps"],
              ["26","Industries"],
            ].map(([val,label])=>(
              <div key={String(val)} style={{padding:"22px 14px",background:"rgba(255,255,255,0.03)",
                borderRadius:14,border:"1px solid rgba(255,255,255,0.07)",textAlign:"center"}}>
                <div style={{fontSize:48,fontWeight:800,color:"#E2E8F0",fontFamily:"monospace",lineHeight:1}}>
                  {val}
                </div>
                <div style={{fontSize:15,color:"#6B7280",marginTop:6}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Slide>
    </>
  );
}

export default function CarouselPage({ params }: { params: { id: string } }) {
  const [report, setReport]         = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus]         = useState("");
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    supabase.from("weekly_reports").select("*").eq("slug",params.id).single()
      .then(({data})=>{ setReport(data); setLoading(false); });
  },[params.id]);

  async function downloadCarousel() {
    if (!slidesRef.current||!report) return;
    setGenerating(true); setStatus("Loading libraries...");
    try {
      const [{default:html2canvas},{jsPDF}] = await Promise.all([
        import("html2canvas"), import("jspdf"),
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
      setStatus("Saving...");
      doc.save(`NexTax-SMB-Pulse-LinkedIn-${params.id}.pdf`);
      setStatus("Downloaded! Upload to LinkedIn as a Document post.");
    } catch(err){ setStatus("Error — try again."); console.error(err); }
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

  const benchmarks = Math.max(report.benchmarked_transactions||0,13053);
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
          border:"1px solid rgba(99,102,241,0.2)",marginBottom:16}}>
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
            <li>Upload the PDF — LinkedIn renders each page as a swipeable slide</li>
            <li>Paste the caption above and post</li>
          </ol>
        </div>

        {/* Slide labels */}
        <div style={{fontSize:12,color:"#4B5563",marginBottom:10,fontFamily:"sans-serif"}}>6 slides</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:40}}>
          {["Cover + KPI Strip","Why Buyers Overpay","Ask vs Closed","Heatmap + Opportunities","Buyer Pain Index","CTA"].map((name,i)=>(
            <div key={i} style={{aspectRatio:"4/5",background:"rgba(255,255,255,0.025)",borderRadius:8,
              border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",
              justifyContent:"center",flexDirection:"column",gap:6}}>
              <div style={{fontSize:20,fontWeight:800,color:"#4B5563",fontFamily:"monospace"}}>{i+1}</div>
              <div style={{fontSize:11,color:"#374151",textAlign:"center",fontFamily:"sans-serif",padding:"0 8px"}}>{name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden full-size slides for capture */}
      <div ref={slidesRef} style={{position:"fixed",left:"-9999px",top:0,
        display:"flex",flexDirection:"column",pointerEvents:"none"}}>
        <AllSlides report={report} />
      </div>
    </div>
  );
}
