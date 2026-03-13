"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, AreaChart, Area } from "recharts";

function fmt(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
function driColor(d: number) { return d < 1.0 ? "#10B981" : d <= 1.15 ? "#3B82F6" : d <= 1.3 ? "#F59E0B" : "#EF4444"; }
function driLabel(d: number) { return d < 1.0 ? "Undervalued" : d <= 1.15 ? "Fair Market" : d <= 1.3 ? "Overpriced" : "Highly Overpriced"; }
function sc(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444"; }
const PAIN_COLORS: Record<string, string> = { valuation: "#EF4444", financial_modeling: "#F59E0B", diligence: "#3B82F6", seller_addbacks: "#8B5CF6", dscr: "#F97316", market_saturation: "#EC4899", competitive: "#14B8A6", deal_structure: "#6366F1" };

const TABS = [
  { id: "overview", label: "Overview", icon: "⊙" },
  { id: "dri", label: "Deal Reality Index", icon: "📉" },
  { id: "signals", label: "Signal Feed", icon: "⚡" },
  { id: "pain", label: "Buyer Pain Index", icon: "🔥" },
  { id: "sentiment", label: "Deal Sentiment", icon: "🎯" },
  { id: "heatmap", label: "Industry Heatmap", icon: "🏭" },
  { id: "trends", label: "Trends", icon: "📈" },
  { id: "content", label: "Content Ops", icon: "🎯" },
  { id: "gaps", label: "Service Gap Map", icon: "📊" },
];

function ScoreRing({ score, size = 120, sw = 7, label }: { score: number; size?: number; sw?: number; label?: string }) {
  const r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (score / 100) * c, col = sc(score);
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</span>
        {label && <span style={{ fontSize: 8, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MarketIntelligenceEngine() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");
  const [signalFilter, setSignalFilter] = useState("all");
  const [signalSearch, setSignalSearch] = useState("");
  const [signalSort, setSignalSort] = useState("relevance");
  const [signalMinScore, setSignalMinScore] = useState(0);
  const [signalPainFilter, setSignalPainFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/intelligence");
        if (!res.ok) throw new Error("Failed to load");
        const d = await res.json();
        if (d.success) setData(d);
        else setError("Failed to load intelligence data");
      } catch { setError("Failed to connect to intelligence engine"); }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>N</div>
        <div style={{ color: "#818CF8", fontSize: 14 }}>Loading intelligence data...</div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#EF4444", fontSize: 14 }}>{error || "No data available"}</div>
    </div>
  );

  const { overview, dri, industryHeatmap, sentiment, contentOps, serviceGap, dataSources, lastUpdated, signalFeed, buyerPainIndex, painTrends, signalStats } = data;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease-out forwards}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .live-dot{animation:pulse 2s infinite}
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 60px" }}>
        {/* Header */}
        <div className="fu" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>N</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#E2E8F0" }}>Market Intelligence Engine</h1>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                <span className="live-dot" style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "#10B981", marginRight: 6 }} />
                LIVE DATA • {dataSources.dealsAnalyzed} deals • {dataSources.closedTransactions.toLocaleString()} closed transactions • {signalStats?.total || 0} community signals
              </div>
            </div>
          </div>
          <div style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: 12, color: "#10B981", fontWeight: 500 }}>
            ● {dataSources.industriesCovered} industries
          </div>
        </div>

        {/* Tabs */}
        <div className="fu" style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", whiteSpace: "nowrap",
              background: activeTab === tab.id ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === tab.id ? "#818CF8" : "#6B7280",
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer", transition: "all 0.2s",
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="fu">
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "High-Signal Posts", value: signalStats?.highRelevance || 0, sub: "Score ≥ 70", color: "#10B981" },
                { label: "Avg Pain Score", value: signalStats?.avgPainScore || 0, sub: "Across all signals", color: "#F59E0B" },
                { label: "Top Gap Category", value: buyerPainIndex?.[0]?.label || "—", sub: "Highest opportunity", color: "#8B5CF6", isText: true },
                { label: "Active Buyer Signals", value: signalStats?.activeBuyerSignals || 0, sub: "Intent ≥ 60", color: "#EF4444" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 18px" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{kpi.label}</div>
                  <div style={{ fontSize: kpi.isText ? 20 : 32, fontWeight: 700, color: kpi.color, fontFamily: kpi.isText ? "'Instrument Serif', serif" : "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: "#4B5563", marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Trend + Distribution Row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Pain Point Trends (12 Weeks)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={overview.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="week" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="deals" stroke="#818CF8" fill="rgba(99,102,241,0.08)" strokeWidth={2.5} name="All Deals" />
                    <Area type="monotone" dataKey="userDeals" stroke="#10B981" fill="rgba(16,185,129,0.06)" strokeWidth={1.5} name="User Analyses" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "#818CF8" }}>● All deals</span>
                  <span style={{ fontSize: 10, color: "#10B981" }}>● User analyses</span>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Signal Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name: "Underpriced", value: sentiment.distribution.undervalued, fill: "#10B981" },
                      { name: "Fair", value: sentiment.distribution.fair, fill: "#3B82F6" },
                      { name: "Overpriced", value: sentiment.distribution.overpriced, fill: "#EF4444" },
                    ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" />
                    <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, fontSize: 10 }}>
                  <span style={{ color: "#10B981" }}>● Under</span>
                  <span style={{ color: "#3B82F6" }}>● Fair</span>
                  <span style={{ color: "#EF4444" }}>● Over</span>
                </div>
              </div>
            </div>

            {/* Bottom Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {[
                { label: "Deals Analyzed", value: overview.totalDeals },
                { label: "User Analyses", value: overview.userSubmitted },
                { label: "Marketplace", value: overview.marketplaceImports },
                { label: "Median Revenue", value: fmt(overview.dealSize.medianRevenue) },
                { label: "Median SDE", value: fmt(overview.dealSize.medianSDE) },
                { label: "Avg Score", value: overview.avgScore },
              ].map((s) => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                  <div style={{ fontSize: 8, color: "#6B7280", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DEAL REALITY INDEX TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "dri" && (
          <div className="fu">
            {/* DRI Hero */}
            <div style={{ textAlign: "center", padding: "36px 24px", marginBottom: 20, borderRadius: 16, background: dri.overall ? `radial-gradient(ellipse at center, ${driColor(dri.overall)}08 0%, rgba(255,255,255,0.02) 70%)` : "rgba(255,255,255,0.025)", border: dri.overall ? `1px solid ${driColor(dri.overall)}25` : "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>NexTax Deal Reality Index</div>
              {dri.overall ? (
                <>
                  <div style={{ fontSize: 72, fontWeight: 800, color: driColor(dri.overall), fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{dri.overall.toFixed(2)}</div>
                  <div style={{ display: "inline-block", padding: "4px 18px", borderRadius: 20, background: `${driColor(dri.overall)}18`, border: `1px solid ${driColor(dri.overall)}30`, fontSize: 13, fontWeight: 700, color: driColor(dri.overall), marginTop: 8 }}>{driLabel(dri.overall)}</div>
                  <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>The average SMB deal is priced <span style={{ fontWeight: 700, color: driColor(dri.overall), fontFamily: "'JetBrains Mono', monospace" }}>{Math.round((dri.overall - 1) * 100)}%</span> above sold value</div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: "#6B7280" }}>Import more listing data to compute the DRI</div>
              )}
            </div>

            {/* Scale Bar */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 10 }}>Index Scale</div>
              <div style={{ display: "flex", gap: 3 }}>
                {[
                  { range: "< 1.0", label: "Undervalued", color: "#10B981", pct: 15 },
                  { range: "1.0–1.15", label: "Healthy", color: "#3B82F6", pct: 25 },
                  { range: "1.15–1.30", label: "Moderately Overpriced", color: "#F59E0B", pct: 30 },
                  { range: "1.30+", label: "Highly Overpriced", color: "#EF4444", pct: 30 },
                ].map((s) => (
                  <div key={s.range} style={{ flex: s.pct }}>
                    <div style={{ height: 8, background: s.color, borderRadius: 4, opacity: 0.7, marginBottom: 6 }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.range}</div>
                    <div style={{ fontSize: 9, color: "#6B7280" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {dri.overall && (
                <div style={{ position: "relative", height: 20, marginTop: 4 }}>
                  <div style={{ position: "absolute", left: `${Math.min(95, Math.max(5, ((dri.overall - 0.85) / 0.65) * 100))}%`, transform: "translateX(-50%)" }}>
                    <div style={{ width: 2, height: 12, background: driColor(dri.overall), margin: "0 auto" }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: driColor(dri.overall), fontFamily: "'JetBrains Mono', monospace" }}>{dri.overall.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* DRI Trend */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: "0 0 4px" }}>DRI Trend (12 Weeks)</h3>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>How the deal pricing gap is moving over time</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dri.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0.8, 1.6]} tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                  <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} />
                  <Area type="monotone" dataKey="dri" stroke={dri.overall ? driColor(dri.overall) : "#818CF8"} fill={dri.overall ? `${driColor(dri.overall)}15` : "rgba(99,102,241,0.1)"} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Most Overpriced vs Closest to Fair */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, color: "#EF4444", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>🔴 Most Overpriced Industries</div>
                {dri.byIndustry.filter((d: {dri: number | null}) => d.dri !== null).sort((a: {dri: number}, b: {dri: number}) => b.dri - a.dri).slice(0, 5).map((ind: {label: string; dri: number; gapPct: number; dealCount: number}, i: number) => (
                  <div key={ind.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{i + 1}. {ind.label}</span>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>{ind.dealCount} deals</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: driColor(ind.dri), fontFamily: "'JetBrains Mono', monospace" }}>{ind.dri.toFixed(2)}</span>
                      <div style={{ fontSize: 10, color: "#EF4444" }}>+{ind.gapPct}% gap</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, color: "#10B981", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>🟢 Closest to Fair Value</div>
                {dri.byIndustry.filter((d: {dri: number | null}) => d.dri !== null).sort((a: {dri: number}, b: {dri: number}) => Math.abs(a.dri - 1) - Math.abs(b.dri - 1)).slice(0, 5).map((ind: {label: string; dri: number; gapPct: number; dealCount: number}, i: number) => (
                  <div key={ind.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{i + 1}. {ind.label}</span>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>{ind.dealCount} deals</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: driColor(ind.dri), fontFamily: "'JetBrains Mono', monospace" }}>{ind.dri.toFixed(2)}</span>
                      <div style={{ fontSize: 10, color: "#10B981" }}>+{ind.gapPct}% gap</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Industry DRI Table */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Industry Detail</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    {["Industry", "DRI", "Gap", "Avg Ask", "Fair Value", "Deals", "Trend", "Condition"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {dri.byIndustry.sort((a: {dri: number | null}, b: {dri: number | null}) => (b.dri || 0) - (a.dri || 0)).map((ind: {industry: string; label: string; dri: number | null; gapPct: number | null; avgAsk: number | null; fairValue: number | null; dealCount: number; weekTrend: number | null; condition: string | null; listingMultiple: number | null; txnMultiple: number | null; saleToAsk: number | null; daysOnMarket: number | null; txnSales: number}) => (
                      <tr key={ind.industry} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 10px", fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>{ind.label}</td>
                        <td style={{ padding: "8px 10px" }}>{ind.dri ? <span style={{ fontSize: 14, fontWeight: 700, color: driColor(ind.dri), fontFamily: "'JetBrains Mono', monospace" }}>{ind.dri.toFixed(2)}</span> : <span style={{ color: "#4B5563" }}>—</span>}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: ind.gapPct !== null ? (ind.gapPct > 20 ? "#EF4444" : ind.gapPct > 10 ? "#F59E0B" : "#10B981") : "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>{ind.gapPct !== null ? `+${ind.gapPct}%` : "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.avgAsk ? `$${Math.round(ind.avgAsk / 1000)}k` : "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.fairValue ? `$${Math.round(ind.fairValue / 1000)}k` : "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.dealCount}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: ind.weekTrend !== null ? (ind.weekTrend > 0 ? "#EF4444" : "#10B981") : "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>{ind.weekTrend !== null ? `${ind.weekTrend > 0 ? "▲" : "▼"} ${Math.abs(ind.weekTrend)}%` : "—"}</td>
                        <td style={{ padding: "8px 10px" }}>{ind.condition ? <span style={{ fontSize: 11, fontWeight: 500, color: ind.condition === "Healthy Market" ? "#10B981" : ind.condition === "Moderately Overpriced" ? "#F59E0B" : ind.condition === "Highly Overpriced" ? "#EF4444" : "#3B82F6" }}>{ind.condition}</span> : <span style={{ color: "#4B5563" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SIGNAL FEED TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "signals" && (() => {
          const PAIN_LABELS: Record<string, string> = { valuation: "Valuation Uncertainty", financial_modeling: "Financial Modeling", diligence: "Diligence Confusion", seller_addbacks: "Seller Add-Backs", dscr: "Debt / DSCR Analysis", market_saturation: "Market Saturation", competitive: "Competitive Analysis", deal_structure: "Deal Structure (Asset vs Stock)" };
          const painCounts: Record<string, number> = {};
          (signalFeed || []).forEach((s: {painCategory: string}) => { if (s.painCategory) painCounts[s.painCategory] = (painCounts[s.painCategory] || 0) + 1; });

          const filtered = (signalFeed || [])
            .filter((s: {platform: string; title: string; summary: string; relevance: number; painCategory: string}) => {
              if (signalFilter !== "all" && s.platform !== signalFilter) return false;
              if (signalPainFilter !== "all" && s.painCategory !== signalPainFilter) return false;
              if (s.relevance < signalMinScore) return false;
              if (signalSearch && !s.title.toLowerCase().includes(signalSearch.toLowerCase()) && !s.summary.toLowerCase().includes(signalSearch.toLowerCase())) return false;
              return true;
            })
            .sort((a: Record<string, number>, b: Record<string, number>) => {
              if (signalSort === "relevance") return (b.relevance || 0) - (a.relevance || 0);
              if (signalSort === "pain") return (b.painIntensity || 0) - (a.painIntensity || 0);
              if (signalSort === "intent") return (b.buyerIntent || 0) - (a.buyerIntent || 0);
              return 0;
            });

          return (
          <div className="fu">
            {/* Search + Sort + Filters Bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <input type="text" placeholder="Search posts..." value={signalSearch} onChange={(e) => setSignalSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13, outline: "none" }} />
              <select value={signalSort} onChange={(e) => setSignalSort(e.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#E2E8F0", fontSize: 12, outline: "none", cursor: "pointer" }}>
                <option value="relevance">Sort: Signal Score</option>
                <option value="pain">Sort: Pain Score</option>
                <option value="intent">Sort: Buyer Intent</option>
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
                <span>Min Score: {signalMinScore}</span>
                <input type="range" min={0} max={80} step={10} value={signalMinScore} onChange={(e) => setSignalMinScore(parseInt(e.target.value))} style={{ width: 100, accentColor: "#818CF8" }} />
              </div>
            </div>

            {/* Pain Category Chips */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              <button onClick={() => setSignalPainFilter("all")} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: signalPainFilter === "all" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: signalPainFilter === "all" ? "#818CF8" : "#6B7280", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                All <span style={{ fontSize: 10, opacity: 0.7 }}>{signalFeed?.length || 0}</span>
              </button>
              {Object.entries(PAIN_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setSignalPainFilter(signalPainFilter === key ? "all" : key)} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: signalPainFilter === key ? `${PAIN_COLORS[key] || "#6366F1"}20` : "rgba(255,255,255,0.04)", color: signalPainFilter === key ? PAIN_COLORS[key] || "#818CF8" : "#6B7280", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  {label} <span style={{ fontSize: 10, opacity: 0.7 }}>{painCounts[key] || 0}</span>
                </button>
              ))}
            </div>

            {/* Platform Filters */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {["all", "reddit", "twitter", "searchfunder"].map((f) => (
                <button key={f} onClick={() => setSignalFilter(f)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: signalFilter === f ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: signalFilter === f ? "#818CF8" : "#6B7280", fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
              ))}
            </div>

            {/* Post Count */}
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>Showing {Math.min(filtered.length, 30)} of {filtered.length} posts</div>

            {/* Signal Cards */}
            <div>
              {filtered.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.025)", borderRadius: 12 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
                  <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 8 }}>{(signalFeed || []).length === 0 ? "No community signals yet" : "No signals match your filters"}</div>
                  {(signalFeed || []).length === 0 && <div style={{ fontSize: 12, color: "#4B5563" }}>The cron job runs every 6 hours to auto-collect discussions. First batch will appear within 6 hours of deployment.</div>}
                </div>
              ) : (
                filtered.slice(0, 30).map((sig: {id: string; title: string; summary: string; platform: string; url: string | null; relevance: number; painIntensity: number; buyerIntent: number; sentiment: string; industry: string | null; painCategory: string; signalType: string; insight: string | null; date: string; topics: string[]}) => (
                  <div key={sig.id} style={{ display: "flex", gap: 0, marginBottom: 10, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Left Color Bar */}
                    <div style={{ width: 4, flexShrink: 0, background: PAIN_COLORS[sig.painCategory] || "#6366F1" }} />

                    {/* Main Content */}
                    <div style={{ flex: 1, padding: "14px 18px" }}>
                      {/* Top Meta Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#818CF8", fontWeight: 500 }}>{sig.platform === "reddit" ? "r/" : sig.platform === "twitter" ? "@" : ""}{sig.platform}</span>
                        <span style={{ fontSize: 10, color: "#4B5563" }}>•</span>
                        <span style={{ fontSize: 10, color: "#4B5563" }}>{new Date(sig.date).toLocaleDateString()}</span>
                        <span style={{ fontSize: 10, color: "#4B5563" }}>•</span>
                        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 600, background: sig.sentiment === "bullish" || sig.sentiment === "excited" ? "rgba(16,185,129,0.15)" : sig.sentiment === "bearish" || sig.sentiment === "frustrated" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: sig.sentiment === "bullish" || sig.sentiment === "excited" ? "#10B981" : sig.sentiment === "bearish" || sig.sentiment === "frustrated" ? "#EF4444" : "#F59E0B" }}>
                          {sig.signalType === "question" ? "Seeking Advice" : sig.signalType === "deal_share" ? "Deal Share" : sig.signalType === "advice" ? "Advice" : sig.signalType === "complaint" ? "Frustrated" : sig.signalType === "success_story" ? "Success Story" : "Market Insight"}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", marginBottom: 4, lineHeight: 1.3 }}>
                        {sig.url ? <a href={sig.url} target="_blank" rel="noopener" style={{ color: "#E2E8F0", textDecoration: "none" }}>{sig.title}</a> : sig.title}
                      </div>

                      {/* Summary */}
                      <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, marginBottom: 8 }}>{sig.summary}</div>

                      {/* Tags Row */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {sig.painCategory && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500, background: `${PAIN_COLORS[sig.painCategory] || "#6366F1"}15`, color: PAIN_COLORS[sig.painCategory] || "#6366F1" }}>{PAIN_LABELS[sig.painCategory] || sig.painCategory}</span>}
                        {sig.industry && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, background: "rgba(99,102,241,0.08)", color: "#818CF8" }}>{sig.industry}</span>}
                      </div>

                      {/* AI Insight */}
                      {sig.insight && <div style={{ fontSize: 11, color: "#4B5563", marginTop: 6, fontStyle: "italic" }}>💡 {sig.insight}</div>}
                    </div>

                    {/* Right Score Panel */}
                    <div style={{ width: 90, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 8px", borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: sc(sig.relevance), fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{sig.relevance}</div>
                      <div style={{ fontSize: 8, color: "#6B7280", textTransform: "uppercase", marginBottom: 8 }}>Signal</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: sc(sig.buyerIntent), fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: 4, background: `${sc(sig.buyerIntent)}15` }}>{sig.buyerIntent}</div>
                          <div style={{ fontSize: 7, color: "#6B7280", textTransform: "uppercase", marginTop: 2 }}>Intent</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: sc(sig.painIntensity), fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: 4, background: `${sc(sig.painIntensity)}15` }}>{sig.painIntensity}</div>
                          <div style={{ fontSize: 7, color: "#6B7280", textTransform: "uppercase", marginTop: 2 }}>Pain</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BUYER PAIN INDEX TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "pain" && (
          <div className="fu">
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Pain Categories — Ranked by Intensity</h3>
                {(!buyerPainIndex || buyerPainIndex.length === 0) ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#6B7280" }}>Pain index populates as signals are ingested.</div>
                ) : buyerPainIndex.map((pain: {category: string; label: string; intensity: number; count: number; weekChange: number}, i: number) => (
                  <div key={pain.category} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 8, background: i === 0 ? "rgba(239,68,68,0.04)" : "transparent", marginBottom: 4 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#374151", fontFamily: "'JetBrains Mono', monospace", minWidth: 24 }}>{i + 1}</div>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: PAIN_COLORS[pain.category] || "#6B7280", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{pain.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: PAIN_COLORS[pain.category] || sc(pain.intensity), fontFamily: "'JetBrains Mono', monospace" }}>{pain.intensity}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: pain.weekChange > 0 ? "#EF4444" : pain.weekChange < 0 ? "#10B981" : "#6B7280" }}>
                            {pain.weekChange > 0 ? `↑${pain.weekChange}%` : pain.weekChange < 0 ? `↓${Math.abs(pain.weekChange)}%` : "—"}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pain.intensity}%`, background: PAIN_COLORS[pain.category] || sc(pain.intensity), borderRadius: 3, transition: "width 0.8s ease-out" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>{pain.count} signals</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Pain Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={buyerPainIndex || []} layout="vertical">
                    <XAxis type="number" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#C9D1D9", fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="intensity" radius={[0, 4, 4, 0]}>
                      {(buyerPainIndex || []).map((p: {category: string}, i: number) => <Cell key={i} fill={PAIN_COLORS[p.category] || "#6366F1"} fillOpacity={0.7} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DEAL SENTIMENT TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "sentiment" && (
          <div className="fu">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 20 }}>
              <div style={{ textAlign: "center", padding: "36px 24px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Market Optimism</div>
                <ScoreRing score={sentiment.score} size={140} sw={9} label="optimism" />
                <div style={{ fontSize: 18, fontWeight: 700, color: sentiment.label === "Bullish" ? "#10B981" : sentiment.label === "Neutral" ? "#F59E0B" : "#EF4444", marginTop: 8 }}>{sentiment.label}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 22px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: "0 0 4px" }}>Sentiment Trend (12 Weeks)</h3>
                <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>Optimism score based on deal quality distribution</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={sentiment.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="week" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#818CF8" fill="rgba(99,102,241,0.1)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Undervalued Deals", value: sentiment.distribution.undervalued, color: "#10B981", icon: "📈" },
                { label: "Fairly Priced", value: sentiment.distribution.fair, color: "#3B82F6", icon: "⚖️" },
                { label: "Overpriced Deals", value: sentiment.distribution.overpriced, color: "#EF4444", icon: "📉" },
              ].map((s) => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* INDUSTRY HEATMAP TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "heatmap" && (
          <div className="fu">
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Industry Activity Heatmap</h3>
              <ResponsiveContainer width="100%" height={Math.max(400, industryHeatmap.length * 28)}>
                <BarChart data={industryHeatmap} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "#C9D1D9", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="heatScore" radius={[0, 6, 6, 0]} name="Heat Score">
                    {industryHeatmap.map((_: unknown, i: number) => <Cell key={i} fill={i < 3 ? "#10B981" : i < 8 ? "#F59E0B" : i < 15 ? "#6366F1" : "#374151"} fillOpacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Industry Detail</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    {["Industry", "Heat", "Deals", "Txn Vol", "Avg Score", "Median Mult", "DOM"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {industryHeatmap.map((ind: {industry: string; label: string; heatScore: number; dealCount: number; txnCount: number; avgScore: number | null; medianMultiple: number | null; daysOnMarket: number | null}) => (
                      <tr key={ind.industry} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 10px", fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>{ind.label}</td>
                        <td style={{ padding: "8px 10px", fontSize: 14, fontWeight: 700, color: ind.heatScore >= 60 ? "#10B981" : ind.heatScore >= 30 ? "#F59E0B" : "#6B7280", fontFamily: "'JetBrains Mono', monospace" }}>{ind.heatScore}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.dealCount}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.txnCount.toLocaleString()}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: ind.avgScore ? sc(ind.avgScore) : "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>{ind.avgScore || "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.medianMultiple ? ind.medianMultiple + "x" : "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.daysOnMarket || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TRENDS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "trends" && (
          <div className="fu">
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", margin: "0 0 4px" }}>Deal Analysis Volume</h3>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>All deals vs user-submitted analyses over 12 weeks</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={overview.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="deals" stroke="#10B981" fill="rgba(16,185,129,0.08)" strokeWidth={2} name="All Deals" />
                  <Area type="monotone" dataKey="userDeals" stroke="#F59E0B" fill="rgba(245,158,11,0.06)" strokeWidth={1.5} name="User Analyses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px" }}>Pain Category Trends (12 Weeks)</h3>
            {(!painTrends || painTrends.length === 0) ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#6B7280", fontSize: 13, background: "rgba(255,255,255,0.025)", borderRadius: 12 }}>Trends populate as signals accumulate over time.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {painTrends.map((trend: {category: string; label: string; data: {week: string; count: number}[]}) => (
                  <div key={trend.category} style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: PAIN_COLORS[trend.category] || "#6366F1" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#C9D1D9" }}>{trend.label}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={trend.data}>
                        <XAxis dataKey="week" tick={{ fill: "#4B5563", fontSize: 8 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Area type="monotone" dataKey="count" stroke={PAIN_COLORS[trend.category] || "#818CF8"} fill={`${PAIN_COLORS[trend.category] || "#818CF8"}15`} strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CONTENT OPS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "content" && (
          <div className="fu">
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 4px" }}>Content Opportunities</h3>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>Industries with high transaction demand but low NexTax coverage — biggest content gaps to fill</p>
              {(contentOps || []).map((op: {industry: string; key: string; txnVolume: number; currentCoverage: number; opportunityGap: number; suggestedTopics: string[]}, i: number) => (
                <div key={op.key} style={{ padding: "16px 18px", borderRadius: 12, background: i < 3 ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)", border: i < 3 ? "1px solid rgba(16,185,129,0.1)" : "1px solid rgba(255,255,255,0.04)", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0" }}>{op.industry}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: op.opportunityGap > 70 ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{op.opportunityGap}% gap</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#6B7280", marginBottom: 8 }}>
                    <span>{op.txnVolume.toLocaleString()} closed sales</span>
                    <span>{op.currentCoverage} in NexTax database</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${op.opportunityGap}%`, background: op.opportunityGap > 70 ? "#10B981" : "#F59E0B", borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {op.suggestedTopics.map((t: string) => (
                      <span key={t} style={{ padding: "3px 10px", borderRadius: 6, background: "rgba(99,102,241,0.08)", fontSize: 10, color: "#818CF8" }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SERVICE GAP MAP TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "gaps" && (
          <div className="fu">
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 4px" }}>Service Gap Analysis</h3>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>Market transaction demand vs NexTax data coverage. Red = high demand, low coverage</p>
              <ResponsiveContainer width="100%" height={Math.max(400, (serviceGap || []).length * 28)}>
                <BarChart data={(serviceGap || []).slice(0, 26)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "#C9D1D9", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="gap" radius={[0, 6, 6, 0]} name="Coverage Gap %">
                    {(serviceGap || []).slice(0, 26).map((_: unknown, i: number) => <Cell key={i} fill={i < 5 ? "#EF4444" : i < 12 ? "#F59E0B" : "#10B981"} fillOpacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gap Detail Table */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Coverage Detail</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    {["Industry", "Gap %", "Txn Demand", "NexTax Deals", "User Analyses", "Priority"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(serviceGap || []).map((g: {industry: string; label: string; gap: number; txnCount: number; dealCount: number; userCount: number}) => (
                      <tr key={g.industry} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 10px", fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>{g.label}</td>
                        <td style={{ padding: "8px 10px", fontSize: 14, fontWeight: 700, color: g.gap > 70 ? "#EF4444" : g.gap > 40 ? "#F59E0B" : "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{g.gap}%</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{g.txnCount.toLocaleString()}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{g.dealCount}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{g.userCount}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: g.gap > 70 ? "rgba(239,68,68,0.1)" : g.gap > 40 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", color: g.gap > 70 ? "#EF4444" : g.gap > 40 ? "#F59E0B" : "#10B981" }}>{g.gap > 70 ? "HIGH" : g.gap > 40 ? "MEDIUM" : "LOW"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Data Sources Footer */}
        <div style={{ marginTop: 28, padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Data Sources</div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                {dataSources.dealsAnalyzed} deals analyzed • {dataSources.closedTransactions.toLocaleString()} closed transactions (BizBuySell 2025) • {signalStats?.total || 0} community signals • {dataSources.industriesCovered} industries
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#4B5563" }}>Updated {new Date(lastUpdated).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
