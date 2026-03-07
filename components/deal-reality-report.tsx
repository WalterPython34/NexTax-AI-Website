"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ReportData {
  week_start: string;
  week_end: string;
  total_runs: number;
  unique_deals: number;
  reality_check_runs: number;
  risk_analyzer_runs: number;
  avg_revenue: number;
  avg_sde: number;
  avg_price: number;
  median_revenue: number;
  median_sde: number;
  median_price: number;
  avg_asking_multiple: number;
  avg_fair_multiple: number;
  overpricing_gap_pct: number;
  pct_overpriced: number;
  pct_underpriced: number;
  pct_fair: number;
  pct_low_risk: number;
  pct_moderate_risk: number;
  pct_high_risk: number;
  pct_critical_risk: number;
  avg_dscr: number;
  median_dscr: number;
  avg_score?: number;
  median_score?: number;
  industry_breakdown: Record<string, { count: number; avg_score: number; avg_multiple: number; avg_dscr: number }>;
  highest_risk_industry: string | null;
  lowest_risk_industry: string | null;
  most_analyzed_industry: string | null;
  is_live?: boolean;
}

// ─── SYNTHETIC SEED DATA (Phase 1 — before real volume) ─────────────────────

function generateSyntheticReport(): ReportData {
  const rng = (s: number) => { let x = s; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; };
  const r = rng(Date.now() % 10000 + 42);

  const industries: Record<string, { count: number; avg_score: number; avg_multiple: number; avg_dscr: number }> = {};
  const industryList = [
    { id: "cleaning", s: 54, m: 3.1, d: 1.42 }, { id: "hvac", s: 67, m: 2.8, d: 1.58 },
    { id: "laundromat", s: 62, m: 3.4, d: 1.35 }, { id: "restaurant", s: 41, m: 2.9, d: 1.18 },
    { id: "landscaping", s: 58, m: 2.2, d: 1.45 }, { id: "carwash", s: 55, m: 3.8, d: 1.31 },
    { id: "dental", s: 64, m: 4.1, d: 1.52 }, { id: "autorepair", s: 61, m: 2.6, d: 1.48 },
    { id: "ecommerce", s: 49, m: 3.5, d: 1.25 }, { id: "gym", s: 47, m: 3.2, d: 1.22 },
    { id: "plumbing", s: 66, m: 2.7, d: 1.55 }, { id: "insurance", s: 68, m: 2.4, d: 1.62 },
  ];

  let totalRuns = 0;
  industryList.forEach((ind) => {
    const count = Math.round(8 + r() * 25);
    totalRuns += count;
    industries[ind.id] = {
      count,
      avg_score: Math.round(ind.s + (r() - 0.5) * 10),
      avg_multiple: +(ind.m + (r() - 0.5) * 0.4).toFixed(2),
      avg_dscr: +(ind.d + (r() - 0.5) * 0.2).toFixed(2),
    };
  });

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    week_start: weekStart.toISOString().split("T")[0],
    week_end: now.toISOString().split("T")[0],
    total_runs: totalRuns,
    unique_deals: Math.round(totalRuns * 0.35),
    reality_check_runs: Math.round(totalRuns * 0.82),
    risk_analyzer_runs: Math.round(totalRuns * 0.18),
    avg_revenue: 890000 + Math.round(r() * 200000),
    avg_sde: 245000 + Math.round(r() * 60000),
    avg_price: 780000 + Math.round(r() * 180000),
    median_revenue: 720000 + Math.round(r() * 150000),
    median_sde: 210000 + Math.round(r() * 50000),
    median_price: 650000 + Math.round(r() * 120000),
    avg_asking_multiple: +(3.0 + r() * 0.6).toFixed(2),
    avg_fair_multiple: 2.5,
    overpricing_gap_pct: +(20 + r() * 18).toFixed(1),
    pct_overpriced: +(55 + r() * 12).toFixed(1),
    pct_underpriced: +(6 + r() * 6).toFixed(1),
    pct_fair: +(28 + r() * 10).toFixed(1),
    pct_low_risk: +(10 + r() * 8).toFixed(1),
    pct_moderate_risk: +(48 + r() * 10).toFixed(1),
    pct_high_risk: +(28 + r() * 8).toFixed(1),
    pct_critical_risk: +(4 + r() * 4).toFixed(1),
    avg_dscr: +(1.32 + r() * 0.15).toFixed(2),
    median_dscr: +(1.28 + r() * 0.12).toFixed(2),
    avg_score: Math.round(52 + r() * 10),
    median_score: Math.round(50 + r() * 8),
    industry_breakdown: industries,
    highest_risk_industry: "restaurant",
    lowest_risk_industry: "insurance",
    most_analyzed_industry: "cleaning",
    is_live: false,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
function pct(v: number) { return v.toFixed(1) + "%"; }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " "); }

const INDUSTRY_LABELS: Record<string, string> = {
  cleaning: "Cleaning", hvac: "HVAC", laundromat: "Laundromat", restaurant: "Restaurant",
  landscaping: "Landscaping", carwash: "Car Wash", dental: "Dental", autorepair: "Auto Repair",
  ecommerce: "Ecommerce", gym: "Gym/Fitness", plumbing: "Plumbing", insurance: "Insurance",
  saas: "SaaS", roofing: "Roofing", petcare: "Pet Care", pharmacy: "Pharmacy",
  daycare: "Daycare", medspa: "Med Spa",
};

const RISK_COLORS = { Low: "#10B981", Moderate: "#F59E0B", High: "#F97316", Critical: "#EF4444" };

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DealRealityReport() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingSynthetic, setUsingSynthetic] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch("/api/deal-report");
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
        } else {
          // Fallback to synthetic data
          setReport(generateSyntheticReport());
          setUsingSynthetic(true);
        }
      } catch {
        setReport(generateSyntheticReport());
        setUsingSynthetic(true);
      }
      setLoading(false);
    }
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0F17", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#818CF8", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading report data...</div>
      </div>
    );
  }

  if (!report) return null;

  // Prepare chart data
  const industryData = Object.entries(report.industry_breakdown)
    .map(([id, data]) => ({ name: INDUSTRY_LABELS[id] || capitalize(id), ...data }))
    .sort((a, b) => b.count - a.count);

  const riskPieData = [
    { name: "Low", value: +report.pct_low_risk, color: RISK_COLORS.Low },
    { name: "Moderate", value: +report.pct_moderate_risk, color: RISK_COLORS.Moderate },
    { name: "High", value: +report.pct_high_risk, color: RISK_COLORS.High },
    { name: "Critical", value: +report.pct_critical_risk, color: RISK_COLORS.Critical },
  ].filter((d) => d.value > 0);

  const valuationPieData = [
    { name: "Overpriced", value: +report.pct_overpriced, color: "#EF4444" },
    { name: "Fair", value: +report.pct_fair, color: "#10B981" },
    { name: "Underpriced", value: +report.pct_underpriced, color: "#3B82F6" },
  ].filter((d) => d.value > 0);

  const weekLabel = new Date(report.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + new Date(report.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease-out forwards}
      `}</style>

      {/* Header */}
      <div style={{ padding: "40px 24px 32px", textAlign: "center", background: "radial-gradient(ellipse at center top, rgba(16,185,129,0.06) 0%, transparent 60%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", fontSize: 12, color: "#34D399", fontWeight: 600, marginBottom: 16 }}>
          📊 Weekly Market Intelligence
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 8px", fontFamily: "'Instrument Serif', serif", background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Deal Reality Report
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>{weekLabel}</p>
        {usingSynthetic && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#F59E0B", padding: "4px 12px", borderRadius: 6, background: "rgba(245,158,11,0.08)", display: "inline-block" }}>
            Showing projected data — live data populates as deals are analyzed
          </div>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" }}>

        {/* Top-Line KPIs */}
        <div className="fu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Deals Analyzed", value: report.total_runs.toLocaleString(), accent: "#10B981" },
            { label: "Unique Deals", value: report.unique_deals.toLocaleString(), accent: "#3B82F6" },
            { label: "Avg Overpricing", value: pct(report.overpricing_gap_pct), accent: "#EF4444" },
            { label: "Median DSCR", value: report.median_dscr.toFixed(2), accent: "#F59E0B" },
            { label: "Avg Multiple", value: report.avg_asking_multiple + "x", accent: "#8B5CF6" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: kpi.accent, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Industry Signals */}
        <div className="fu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Highest Risk Industry", value: INDUSTRY_LABELS[report.highest_risk_industry || ""] || capitalize(report.highest_risk_industry || ""), color: "#EF4444", icon: "🚩" },
            { label: "Lowest Risk Industry", value: INDUSTRY_LABELS[report.lowest_risk_industry || ""] || capitalize(report.lowest_risk_industry || ""), color: "#10B981", icon: "✅" },
            { label: "Most Analyzed", value: INDUSTRY_LABELS[report.most_analyzed_industry || ""] || capitalize(report.most_analyzed_industry || ""), color: "#818CF8", icon: "🔍" },
          ].map((sig) => (
            <div key={sig.label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{sig.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: sig.color, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{sig.icon}</span> {sig.value}
              </div>
            </div>
          ))}
        </div>

        {/* Deal Size & Valuation */}
        <div className="fu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>📏 Deal Size</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { l: "Avg Revenue", v: fmt(report.avg_revenue) },
                { l: "Median Revenue", v: fmt(report.median_revenue) },
                { l: "Avg SDE", v: fmt(report.avg_sde) },
                { l: "Median SDE", v: fmt(report.median_sde) },
                { l: "Avg Price", v: fmt(report.avg_price) },
                { l: "Median Price", v: fmt(report.median_price) },
              ].map((m) => (
                <div key={m.l}>
                  <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>{m.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>⚖️ Valuation Analysis</h3>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={valuationPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="none">
                    {valuationPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => pct(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              {valuationPieData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#8896A6" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  {d.name}: {pct(d.value)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>🎯 Risk Distribution</h3>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" stroke="none">
                  {riskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Low Risk", pct: report.pct_low_risk, color: RISK_COLORS.Low },
                { label: "Moderate Risk", pct: report.pct_moderate_risk, color: RISK_COLORS.Moderate },
                { label: "High Risk", pct: report.pct_high_risk, color: RISK_COLORS.High },
                { label: "Critical Risk", pct: report.pct_critical_risk, color: RISK_COLORS.Critical },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${r.pct}%`, background: r.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, color: r.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", minWidth: 40 }}>{pct(+r.pct)}</span>
                  <span style={{ fontSize: 11, color: "#8896A6" }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>🏭 Industry Breakdown</h3>
          <ResponsiveContainer width="100%" height={Math.max(280, industryData.length * 28)}>
            <BarChart data={industryData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#4B5563" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#6366F1" fillOpacity={0.6} radius={[0, 4, 4, 0]} name="Deals Analyzed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Industry Table */}
        <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>📋 Industry Detail</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Industry", "Deals", "Avg Score", "Avg Multiple", "Avg DSCR"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: "#6B7280", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {industryData.map((ind) => (
                <tr key={ind.name}>
                  <td style={{ padding: "8px 12px", fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>{ind.name}</td>
                  <td style={{ padding: "8px 12px", fontSize: 13, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.count}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ind.avg_score >= 60 ? "#10B981" : ind.avg_score >= 40 ? "#F59E0B" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>{ind.avg_score}</span>
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 13, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{ind.avg_multiple}x</td>
                  <td style={{ padding: "8px 12px", fontSize: 13, color: ind.avg_dscr >= 1.25 ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{ind.avg_dscr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Data Source Footer */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 500 }}>Data Source</div>
          <p style={{ fontSize: 12, color: "#8896A6", margin: "0 0 8px", lineHeight: 1.5 }}>
            Aggregated from the NexTax Deal Intelligence Platform. Includes Deal Reality Check submissions, Deal Risk Analyzer submissions, and anonymized underwriting analyses. Deals below $200K revenue, $75K SDE, or $150K asking price are excluded.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 11, color: "#6B7280" }}>Reality Check: {report.reality_check_runs} runs</span>
            <span style={{ fontSize: 11, color: "#6B7280" }}>Risk Analyzer: {report.risk_analyzer_runs} runs</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <a href="/deal-reality-check" style={{ padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            ⚡ Check Your Deal
          </a>
          <a href="/deal-check" style={{ padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #6366F1)", color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            🔎 Full Risk Analysis
          </a>
        </div>
      </div>
    </div>
  );
}
