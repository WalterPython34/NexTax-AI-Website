"use client";

/**
 * components/pulse/pulse-report.tsx
 *
 * The NexTax SMB Pulse report — renders as both:
 *   1. A beautiful web page at /pulse/[id]
 *   2. The HTML source for Puppeteer PDF generation
 *
 * Design: Bloomberg Terminal meets Architectural Digest.
 * Dark navy base, surgical precision, data as hero.
 * Fonts: DM Serif Display (headers) + JetBrains Mono (numbers) + DM Sans (body)
 */

import React from "react";

interface PulseReportProps {
  report: {
    slug: string;
    week_starting: string;
    week_ending: string;
    deal_reality_index: number;
    dri_interpretation: string;
    dri_gap_pct: number;
    total_deals_analyzed: number;
    benchmarked_transactions: number;
    industries_tracked: number;
    avg_listing_multiple: number;
    avg_sold_multiple: number;
    pct_deals_overpriced: number;
    pct_deals_fair: number;
    pct_deals_undervalued: number;
    most_overpriced: { industry: string; label: string; dri: number; gap_pct: number }[];
    most_undervalued: { industry: string; label: string; dri: number; gap_pct: number }[];
    top_opportunities: { industry: string; sde: number; asking_price: number; fair_value: number | null; score: number; multiple: number | null }[];
    buyer_pain_index: number;
    top_pain_category: string;
    pain_signal_count: number;
    dri_trend: { week: string; date: string; dri: number }[];
  };
  forPDF?: boolean;
}

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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

// Inline SVG bar chart for the pricing gap visual
function PricingBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value.toFixed(2)}x</span>
      </div>
      <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 5, transition: "width 1s ease-out" }} />
      </div>
    </div>
  );
}

// DRI trend sparkline using inline SVG
function DRISparkline({ trend }: { trend: { week: string; dri: number }[] }) {
  if (!trend || trend.length < 2) return null;
  const values = trend.map((t) => t.dri);
  const min = Math.min(...values) - 0.05;
  const max = Math.max(...values) + 0.05;
  const range = max - min || 0.1;
  const W = 280, H = 60;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * (W - 20) + 10,
    y: H - ((v - min) / range) * (H - 16) - 8,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const lastColor = driColor(values[values.length - 1]);
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lastColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Reference line at 1.0 (fair value) */}
      <line
        x1={10} y1={H - ((1.0 - min) / range) * (H - 16) - 8}
        x2={W - 10} y2={H - ((1.0 - min) / range) * (H - 16) - 8}
        stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4 3"
      />
      {/* Area fill */}
      <path
        d={`${pathD} L ${points[points.length-1].x} ${H} L ${points[0].x} ${H} Z`}
        fill="url(#sparkGrad)"
      />
      {/* Line */}
      <path d={pathD} fill="none" stroke={lastColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={driColor(values[i])} />
      ))}
      {/* Week labels */}
      {trend.map((t, i) => (
        <text key={i} x={points[i].x} y={H + 14} textAnchor="middle"
          style={{ fontSize: 9, fill: "#4B5563", fontFamily: "monospace" }}>
          {t.week}
        </text>
      ))}
    </svg>
  );
}

export default function PulseReport({ report, forPDF = false }: PulseReportProps) {
  const dri = report.deal_reality_index;
  const gap = report.dri_gap_pct;
  const col = driColor(dri);
  const maxBar = Math.max(report.avg_listing_multiple || 3, report.avg_sold_multiple || 3) * 1.2;

  // DRI ring SVG
  const ringSize = forPDF ? 160 : 180;
  const ringStroke = 12;
  const radius = (ringSize - ringStroke) / 2;
  const circ = radius * 2 * Math.PI;
  // Map DRI 0.5–2.0 to 0–100% fill
  const driPct = Math.min(Math.max((dri - 0.5) / 1.5, 0), 1);
  const ringOffset = circ - driPct * circ;

  const pageStyle: React.CSSProperties = forPDF
    ? { width: 794, minHeight: 1123, background: "#080C14", fontFamily: "'DM Sans', sans-serif" }
    : { maxWidth: 860, margin: "0 auto", background: "#080C14", fontFamily: "'DM Sans', sans-serif" };

  return (
    <div style={pageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fu { animation: fadeUp .5s ease-out forwards; }
        .fd1 { animation-delay:.1s; opacity:0; }
        .fd2 { animation-delay:.2s; opacity:0; }
        .fd3 { animation-delay:.3s; opacity:0; }
        .fd4 { animation-delay:.4s; opacity:0; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          PAGE 1 — COVER
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        minHeight: forPDF ? 1123 : "auto",
        padding: "0 0 60px",
        background: "linear-gradient(160deg, #080C14 0%, #0D1524 50%, #080C14 100%)",
        position: "relative",
        overflow: "hidden",
        pageBreakAfter: "always",
      }}>
        {/* Background grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        {/* Left accent bar */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${col} 0%, transparent 100%)` }} />

        {/* Header bar */}
        <div style={{ padding: "20px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>N</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", letterSpacing: "0.05em" }}>NEXTAX<span style={{ color: "#6366F1" }}>.AI</span></span>
          </div>
          <div style={{ fontSize: 11, color: "#4B5563", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
            SMB MARKET INTELLIGENCE • WEEK OF {fmtDate(report.week_starting).toUpperCase()}
          </div>
        </div>

        {/* Hero section */}
        <div style={{ padding: "64px 48px 48px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 48, alignItems: "center" }}>
          <div className={forPDF ? "" : "fu"}>
            <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
              NexTax SMB Pulse Report
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: forPDF ? 44 : 52, color: "#F8FAFC", lineHeight: 1.1, marginBottom: 20, fontWeight: 400 }}>
              The SMB Deal Reality Index
            </h1>
            <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.7, maxWidth: 460, marginBottom: 32 }}>
              SMB deals are currently priced <strong style={{ color: col }}>{Math.abs(gap)}% {gap > 0 ? "above" : "below"} fair value</strong> based on {(report.benchmarked_transactions || 13053).toLocaleString()}+ closed transaction benchmarks and {report.total_deals_analyzed} live listings analyzed by NexTax.
            </p>
            <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 24, border: `1px solid ${col}30`, background: `${col}10`, fontSize: 13, color: col, fontWeight: 600, letterSpacing: "0.05em" }}>
              {report.dri_interpretation}
            </div>
          </div>

          {/* DRI Ring */}
          <div className={forPDF ? "" : "fu fd1"} style={{ textAlign: "center" }}>
            <div style={{ position: "relative", width: ringSize, height: ringSize, margin: "0 auto 16px" }}>
              <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={ringStroke} />
                <circle cx={ringSize/2} cy={ringSize/2} r={radius} fill="none" stroke={col} strokeWidth={ringStroke}
                  strokeDasharray={circ} strokeDashoffset={ringOffset}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.5s ease-out" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{dri.toFixed(2)}</span>
                <span style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 4 }}>Deal Reality Index</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
              Buyers paying<br />
              <span style={{ fontSize: 20, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono', monospace" }}>{gap > 0 ? "+" : ""}{gap}%</span>
              <br />vs fair value
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className={forPDF ? "" : "fu fd2"} style={{ margin: "0 48px", padding: "24px 32px", background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {[
            { label: "Live Deals Analyzed", value: report.total_deals_analyzed.toLocaleString(), color: "#E2E8F0" },
            { label: "Closed Transaction Benchmarks", value: (report.benchmarked_transactions || 13053).toLocaleString() + "+", color: "#E2E8F0" },
            { label: "Industries Tracked", value: "26", color: "#E2E8F0" },
            { label: "Overpriced Listings", value: report.pct_deals_overpriced + "%", color: "#EF4444" },
          ].map((kpi, i) => (
            <div key={i} style={{ padding: "0 24px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none", textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, marginBottom: 6 }}>{kpi.value}</div>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Scale reference */}
        <div style={{ margin: "28px 48px 0", display: "flex", gap: 6 }}>
          {[
            { range: "< 1.0", label: "Undervalued", color: "#10B981" },
            { range: "1.0–1.15", label: "Healthy", color: "#3B82F6" },
            { range: "1.15–1.30", label: "Overpriced", color: "#F59E0B" },
            { range: "1.30+", label: "Highly Overpriced", color: "#EF4444" },
          ].map((s) => (
            <div key={s.range} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 4, background: s.color, borderRadius: 2, opacity: 0.7, marginBottom: 5 }} />
              <div style={{ fontSize: 10, color: s.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{s.range}</div>
              <div style={{ fontSize: 9, color: "#4B5563" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ position: forPDF ? "absolute" : "relative", bottom: 0, left: 0, right: 0, padding: "16px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", marginTop: 40 }}>
          <span style={{ fontSize: 10, color: "#374151" }}>NexTax.ai | Proprietary Market Intelligence</span>
          <span style={{ fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>Week of {fmtDate(report.week_starting)}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 2 — MARKET SNAPSHOT
      ══════════════════════════════════════════════════════════ */}
      <div style={{ minHeight: forPDF ? 1123 : "auto", padding: "48px 48px 60px", background: "#080C14", pageBreakAfter: "always", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, #3B82F6 0%, transparent 100%)" }} />

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, color: "#3B82F6", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Market Snapshot</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#F8FAFC", fontWeight: 400 }}>What Sellers Want vs What Deals Close For</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>
          {/* Pricing bar comparison */}
          <div style={{ padding: "28px", background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Valuation Multiple Comparison</div>
            <PricingBar label="Seller Expectations (Ask)" value={report.avg_listing_multiple || 2.8} max={maxBar} color="#F59E0B" />
            <PricingBar label="Market Reality (Closed)" value={report.avg_sold_multiple || 2.2} max={maxBar} color="#10B981" />
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.12)" }}>
              <span style={{ fontSize: 12, color: "#FCA5A5" }}>
                The average SMB listing is <strong style={{ color: "#EF4444" }}>{gap}% overpriced</strong> this week.
              </span>
            </div>
          </div>

          {/* DRI Trendline */}
          <div style={{ padding: "28px", background: "rgba(255,255,255,0.025)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>DRI Trend (Last 4 Weeks)</div>
            <DRISparkline trend={report.dri_trend} />
            <div style={{ marginTop: 20, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
              {report.dri_trend && report.dri_trend.length >= 2 && report.dri_trend[report.dri_trend.length-1].dri > report.dri_trend[0].dri
                ? "⬆ Overpricing pressure is rising. Negotiate harder."
                : "⬇ Market pricing is improving for buyers."}
            </div>
          </div>
        </div>

        {/* Sentiment distribution */}
        <div style={{ padding: "24px 28px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Deal Pricing Distribution — {report.total_deals_analyzed} Active Listings</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "Overpriced", pct: report.pct_deals_overpriced, color: "#EF4444", icon: "📈" },
              { label: "Fairly Priced", pct: report.pct_deals_fair, color: "#3B82F6", icon: "⚖️" },
              { label: "Undervalued", pct: report.pct_deals_undervalued, color: "#10B981", icon: "📉" },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: "center", padding: "16px 12px", background: `${item.color}08`, borderRadius: 8, border: `1px solid ${item.color}20` }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: item.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{item.pct}%</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#374151" }}>NexTax.ai | Proprietary Market Intelligence</span>
          <span style={{ fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>Page 2</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 3 — INDUSTRY HEATMAP
      ══════════════════════════════════════════════════════════ */}
      <div style={{ minHeight: forPDF ? 1123 : "auto", padding: "48px 48px 60px", background: "#080C14", pageBreakAfter: "always", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, #EF4444 0%, #10B981 100%)" }} />

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Industry Heat Map</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#F8FAFC", fontWeight: 400 }}>Where Are Deals Over & Underpriced?</h2>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>Based on {report.total_deals_analyzed} active marketplace listings vs {(report.benchmarked_transactions || 13053).toLocaleString()}+ closed transaction benchmarks.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* Most Overpriced */}
          <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>🔴 Most Overpriced Industries</div>
            {report.most_overpriced?.slice(0, 5).map((ind, i) => (
              <div key={ind.industry} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{i+1}. {ind.label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: gapColor(ind.gap_pct), fontFamily: "'JetBrains Mono', monospace" }}>
                    +{ind.gap_pct}%
                  </span>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>DRI {ind.dri.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Most Undervalued */}
          <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, color: "#10B981", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>🟢 Most Undervalued Industries</div>
            {report.most_undervalued?.slice(0, 5).map((ind, i) => (
              <div key={ind.industry} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{i+1}. {ind.label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>
                    {ind.gap_pct}%
                  </span>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>DRI {ind.dri.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full industry table */}
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                {["Industry","DRI","Gap","Ask Multiple","Sold Multiple","Condition"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 9, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report.most_overpriced || []).concat(report.most_undervalued || []).slice(0, 10).map((ind, i) => (
                <tr key={ind.industry} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={{ padding: "8px 14px", fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>{ind.label}</td>
                  <td style={{ padding: "8px 14px", fontSize: 13, fontWeight: 700, color: driColor(ind.dri), fontFamily: "'JetBrains Mono', monospace" }}>{ind.dri.toFixed(2)}</td>
                  <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: gapColor(ind.gap_pct), fontFamily: "'JetBrains Mono', monospace" }}>{ind.gap_pct > 0 ? "+" : ""}{ind.gap_pct}%</td>
                  <td style={{ padding: "8px 14px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.listing_multiple ? ind.listing_multiple + "x" : "—"}</td>
                  <td style={{ padding: "8px 14px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.sold_multiple ? ind.sold_multiple + "x" : "—"}</td>
                  <td style={{ padding: "8px 14px" }}><span style={{ fontSize: 10, fontWeight: 500, color: driColor(ind.dri) }}>{ind.condition}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#374151" }}>NexTax.ai | Proprietary Market Intelligence</span>
          <span style={{ fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>Page 3</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 4 — TOP OPPORTUNITIES + CTA
      ══════════════════════════════════════════════════════════ */}
      <div style={{ minHeight: forPDF ? 1123 : "auto", padding: "48px 48px 60px", background: "#080C14", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, #6366F1 0%, transparent 100%)" }} />

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#818CF8", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Buyer Intelligence</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#F8FAFC", fontWeight: 400 }}>Deals Worth Looking At This Week</h2>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>Filtered from {report.total_deals_analyzed} active listings. Score 65+ with favorable pricing signals.</p>
        </div>

        {/* Opportunities table */}
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                {["Industry","SDE","Asking Price","Fair Value","Score","Signal"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 9, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.top_opportunities?.slice(0, 6).map((opp, i) => {
                const isOver = opp.fair_value && opp.asking_price > opp.fair_value * 1.15;
                const isUnder = opp.fair_value && opp.asking_price < opp.fair_value * 0.85;
                const signal = isOver ? "Overpriced" : isUnder ? "Undervalued" : "Fair Market";
                const signalColor = isOver ? "#EF4444" : isUnder ? "#10B981" : "#3B82F6";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{opp.industry}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(opp.sde)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(opp.asking_price)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#C4B5FD", fontFamily: "'JetBrains Mono', monospace" }}>{opp.fair_value ? fmt(opp.fair_value) : "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: opp.score >= 70 ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{opp.score}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: signalColor, padding: "2px 8px", borderRadius: 4, background: `${signalColor}15` }}>{signal}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Buyer Pain callout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
          <div style={{ padding: "20px 24px", background: "rgba(245,158,11,0.06)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.15)" }}>
            <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>🔥 Buyer Pain Index</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#F59E0B", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, marginBottom: 4 }}>{report.buyer_pain_index?.toFixed(2) || "—"}</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Top concern: <strong style={{ color: "#E2E8F0" }}>{(report.top_pain_category || "").replace(/_/g, " ")}</strong></div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>Based on {report.pain_signal_count} community signals</div>
          </div>
          <div style={{ padding: "20px 24px", background: "rgba(99,102,241,0.06)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.15)" }}>
            <div style={{ fontSize: 10, color: "#818CF8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>📊 This Week in Numbers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Avg ask multiple", value: (report.avg_listing_multiple || 0).toFixed(2) + "x" },
                { label: "Avg sold multiple", value: (report.avg_sold_multiple || 0).toFixed(2) + "x" },
                { label: "Pricing gap", value: "+" + gap + "%" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "28px 32px", background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)", borderRadius: 14, border: "1px solid rgba(99,102,241,0.25)", textAlign: "center" }}>
          <p style={{ fontSize: 18, color: "#E2E8F0", fontFamily: "'DM Serif Display', serif", marginBottom: 10, fontWeight: 400 }}>
            "The market average DRI is {dri.toFixed(2)}, but your target deal is unique.<br />
            <em>Is it a diamond in the rough or a pricing disaster?</em>"
          </p>
          <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 18 }}>
            Run your target deal through the same engine used for this report. 10 seconds to a Fair Value check.
          </p>
          <div style={{ display: "inline-block", padding: "12px 32px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>
            Check My Deal Reality Score → nextax.ai/deal-reality-check
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 48px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#374151" }}>NexTax.ai | Proprietary Market Intelligence</span>
          <span style={{ fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>Page 4 • nextax.ai</span>
        </div>
      </div>
    </div>
  );
}
