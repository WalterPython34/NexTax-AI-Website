"use client";

import { useState, useRef, useEffect } from "react";
import { GaugeChart, MetricCard, BarChart, CompetitorTable, SavedSearchesPanel } from "@/components/marketview";
import { CATEGORIES } from "@/lib/marketview/categories";
import { generatePDFReport } from "@/lib/marketview/pdf-generator";
import { saveSearch, getSavedSearches } from "@/lib/marketview/saved-searches";
import { AnalysisResult } from "@/types/marketview";

const RADIUS_OPTIONS = [5, 10, 20];
const AUTH_STORAGE_KEY = "marketview_auth";

export default function MarketViewPage() {
  // ─── Auth State ───
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ─── Analysis State ───
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [view, setView] = useState<"analyze" | "saved">("analyze");
  const [saveMessage, setSaveMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Check for existing auth on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) setIsAuthed(true);
    setCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    // Simple password check — the real password is set via NEXT_PUBLIC_MARKETVIEW_PASSWORD env var
    const correctPassword = process.env.NEXT_PUBLIC_MARKETVIEW_PASSWORD || "nexview2026";
    if (password === correctPassword) {
      setIsAuthed(true);
      localStorage.setItem(AUTH_STORAGE_KEY, "1");
      setAuthError("");
    } else {
      setAuthError("Invalid password");
    }
  };

  const handleLogout = () => {
    setIsAuthed(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const handleSave = () => {
    if (!results) return;
    saveSearch(results);
    setSaveMessage("Analysis saved!");
    setTimeout(() => setSaveMessage(""), 2500);
  };

  const handleExportPdf = async (data?: AnalysisResult) => {
    const target = data || results;
    if (!target) return;
    setExporting(true);
    try {
      await generatePDFReport(target);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExporting(false);
  };

  const handleLoadSavedSearch = (data: AnalysisResult) => {
    setResults(data);
    setAddress(data.metadata.address);
    setCategory(data.metadata.category);
    setRadius(data.metadata.radius);
    setActiveTab("overview");
    setView("analyze");
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const runAnalysis = async () => {
    if (!address || !category) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/marketview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, category, radius }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: AnalysisResult = await res.json();
      setResults(data);
      setActiveTab("overview");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const metrics = results?.metrics;
  const competitors = results?.competitors || [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "competitors", label: `Competitors (${competitors.length})` },
    { id: "distribution", label: "Distribution" },
  ];

  // ═══════════════════════════════════════════
  // AUTH GATE
  // ═══════════════════════════════════════════
  if (checkingAuth) return null;

  if (!isAuthed) {
    return (
      <div className="mv" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1a" }}>
        <div style={{ width: 380, padding: 32, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 16 }}>
              M
            </div>
            <div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>MarketView</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5, textTransform: "uppercase" as const }}>NexTax.AI Competitive Intelligence</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Access Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter password..."
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
            />
          </div>
          {authError && (
            <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 8 }}>{authError}</div>
          )}
          <button
            onClick={handleLogin}
            style={{ width: "100%", padding: "10px 0", borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "white", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}
          >
            Access MarketView
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN APP
  // ═══════════════════════════════════════════
  return (
    <div className="mv" style={{ minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0" }}>
      <style>{`
        .mv * { box-sizing: border-box; }
        .mv .card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
        .mv .card-hover:hover { border-color: rgba(255,255,255,0.12); }
        .mv .label-caps { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.3); }
        .mv .mono { font-family: 'JetBrains Mono', monospace; }
        .mv .fade-in { animation: mvFadeIn 0.4s ease; }
        @keyframes mvFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 14 }}>M</div>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>MarketView</h1>
              <p className="label-caps" style={{ fontSize: 10, margin: 0 }}>NexTax.AI Competitive Intelligence</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setView("analyze")} className="mono" style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, background: view === "analyze" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)", color: view === "analyze" ? "#60a5fa" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer" }}>Analyze</button>
              <button onClick={() => setView("saved")} className="mono" style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, background: view === "saved" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)", color: view === "saved" ? "#60a5fa" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>Saved ({typeof window !== "undefined" ? getSavedSearches().length : 0})</button>
            </div>
            {results && view === "analyze" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleSave} className="mono" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: saveMessage ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${saveMessage ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`, color: saveMessage ? "#22c55e" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>{saveMessage || "Save"}</button>
                <button onClick={() => handleExportPdf()} disabled={exporting} className="mono" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.6 : 1 }}>{exporting ? "Generating..." : "Export PDF"}</button>
              </div>
            )}
            <button onClick={handleLogout} className="mono" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)", cursor: "pointer" }}>Logout</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Saved Searches View */}
        {view === "saved" && (
          <div className="fade-in">
            <SavedSearchesPanel onLoadSearch={handleLoadSavedSearch} onExportPdf={handleExportPdf} />
          </div>
        )}

        {/* Analyze View */}
        {view === "analyze" && (
          <div>
            {/* Input Form */}
            <div className="card">
              <div className="label-caps" style={{ marginBottom: 16 }}>Analysis Parameters</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
                <div style={{ flex: "2 1 250px" }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Business Address</label>
                  <input type="text" placeholder="123 Main St, City, State" value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAnalysis()} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ flex: "1.5 1 200px" }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Business Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: category ? "#e2e8f0" : "rgba(255,255,255,0.25)", fontSize: 14, appearance: "none" as const }}>
                    <option value="" style={{ background: "#1a1f2e" }}>Select category...</option>
                    {CATEGORIES.map((c) => (<option key={c} value={c} style={{ background: "#1a1f2e" }}>{c}</option>))}
                  </select>
                </div>
                <div style={{ minWidth: 160 }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Search Radius</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {RADIUS_OPTIONS.map((r) => (
                      <button key={r} onClick={() => setRadius(r)} className="mono" style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, background: radius === r ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${radius === r ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`, color: radius === r ? "#60a5fa" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>{r}mi</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={runAnalysis} disabled={loading || !address || !category} style={{ marginTop: 16, width: "100%", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, background: loading || !address || !category ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #3b82f6, #6366f1)", color: loading || !address || !category ? "rgba(255,255,255,0.2)" : "white", cursor: loading || !address || !category ? "not-allowed" : "pointer", border: "none" }}>
                {loading ? "Analyzing Market..." : "Run Saturation Analysis"}
              </button>
              {error && (<div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 14 }}>{error}</div>)}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ marginTop: 32, textAlign: "center" as const }}>
                <div className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Geocoding → Pulling competitors → AI classification → Computing metrics</div>
              </div>
            )}

            {/* Results */}
            {results && metrics && (
              <div ref={resultsRef} style={{ marginTop: 32 }}>
                {/* Data sources */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" as const }}>
                  <span className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, letterSpacing: 1 }}>Data Sources:</span>
                  {results.metadata.dataSources.map((src) => (<span key={src} className="mono" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>{src}</span>))}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="mono" style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#3b82f6" : "transparent"}`, color: activeTab === tab.id ? "#e2e8f0" : "rgba(255,255,255,0.35)", cursor: "pointer", letterSpacing: 0.5 }}>{tab.label}</button>
                  ))}
                </div>

                {/* Overview */}
                {activeTab === "overview" && (
                  <div>
                    <div className="fade-in" style={{ display: "flex", gap: 16, flexWrap: "wrap" as const, marginBottom: 24 }}>
                      <div className="card" style={{ flex: "1 1 280px", display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
                        <div className="label-caps" style={{ marginBottom: 8 }}>Saturation Index</div>
                        <GaugeChart score={metrics.saturationScore} riskBand={metrics.riskBand} riskColor={metrics.riskColor} />
                      </div>
                      <div style={{ flex: "2 1 400px", display: "flex", flexDirection: "column" as const, gap: 12 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                          <MetricCard label="Total Competitors" value={metrics.totalCompetitors} sublabel={`${metrics.directCompetitors} direct`} accent="#60a5fa" />
                          <MetricCard label="Density / 10K" value={metrics.densityPer10k} sublabel="population ratio" accent="#f59e0b" />
                          <MetricCard label="Pop / Competitor" value={metrics.popPerCompetitor.toLocaleString()} sublabel={`~${(metrics.populationEstimate / 1000).toFixed(0)}K total pop`} />
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                          <MetricCard label="Avg Rating" value={metrics.avgRating} sublabel={`${metrics.avgReviews} avg reviews`} accent="#22c55e" />
                          <MetricCard label="Avg Est. Revenue" value={`$${(metrics.avgEstRevenue / 1000).toFixed(0)}K`} sublabel="per competitor" accent="#a78bfa" />
                          <MetricCard label="Market Revenue" value={`$${(metrics.totalEstRevenue / 1000000).toFixed(1)}M`} sublabel={`${radius}mi radius total`} accent="#f472b6" />
                        </div>
                      </div>
                    </div>
                    <div className="card" style={{ marginBottom: 24 }}><div className="label-caps" style={{ marginBottom: 16 }}>Competitor Classification</div><BarChart data={[{ label: "Direct", value: metrics.typeBreakdown.direct, color: "#ef4444" }, { label: "Indirect", value: metrics.typeBreakdown.indirect, color: "#eab308" }, { label: "Franchise", value: metrics.typeBreakdown.franchise, color: "#8b5cf6" }, { label: "Adjacent", value: metrics.typeBreakdown.adjacent, color: "#64748b" }]} /></div>
                    <div className="card" style={{ marginBottom: 24 }}><div className="label-caps" style={{ marginBottom: 16 }}>Market Tier Distribution</div><BarChart data={[{ label: "Premium", value: metrics.tierBreakdown.premium, color: "#f59e0b" }, { label: "Mid-Market", value: metrics.tierBreakdown.midMarket, color: "#3b82f6" }, { label: "Value", value: metrics.tierBreakdown.value, color: "#22c55e" }, { label: "Budget", value: metrics.tierBreakdown.budget, color: "#64748b" }]} /></div>
                    <div style={{ borderRadius: 12, padding: 24, background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))", border: "1px solid rgba(99,102,241,0.15)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 14 }}>◈</span><span className="label-caps">AI Strategic Assessment</span></div>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: 0 }}>{results.aiInsight}</p>
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {activeTab === "competitors" && (
                  <div className="fade-in card" style={{ padding: 0, overflow: "hidden" }}>
                    <CompetitorTable competitors={competitors} />
                  </div>
                )}

                {/* Distribution */}
                {activeTab === "distribution" && (
                  <div className="fade-in" style={{ display: "flex", flexDirection: "column" as const, gap: 24 }}>
                    <div className="card"><div className="label-caps" style={{ marginBottom: 16 }}>Rating Distribution</div><BarChart data={[{ label: "4.5 - 5.0", value: metrics.ratingDistribution.excellent, color: "#22c55e" }, { label: "4.0 - 4.4", value: metrics.ratingDistribution.good, color: "#84cc16" }, { label: "3.5 - 3.9", value: metrics.ratingDistribution.average, color: "#eab308" }, { label: "3.0 - 3.4", value: metrics.ratingDistribution.belowAverage, color: "#f97316" }, { label: "< 3.0", value: metrics.ratingDistribution.poor, color: "#ef4444" }]} /></div>
                    <div className="card"><div className="label-caps" style={{ marginBottom: 16 }}>Distance Distribution</div><BarChart data={[{ label: `0-${Math.round(radius * 0.25)}mi`, value: competitors.filter((c) => c.distance <= radius * 0.25).length, color: "#ef4444" }, { label: `${Math.round(radius * 0.25)}-${Math.round(radius * 0.5)}mi`, value: competitors.filter((c) => c.distance > radius * 0.25 && c.distance <= radius * 0.5).length, color: "#f97316" }, { label: `${Math.round(radius * 0.5)}-${Math.round(radius * 0.75)}mi`, value: competitors.filter((c) => c.distance > radius * 0.5 && c.distance <= radius * 0.75).length, color: "#eab308" }, { label: `${Math.round(radius * 0.75)}-${radius}mi`, value: competitors.filter((c) => c.distance > radius * 0.75).length, color: "#22c55e" }]} /></div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
                  <div className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>MarketView v1.0 — {results.metadata.dataSources.join(" + ")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={handleSave} className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", cursor: "pointer", background: "none", border: "none" }}>Save</button>
                    <button onClick={() => handleExportPdf()} className="mono" style={{ fontSize: 11, color: "rgba(139,92,246,0.6)", cursor: "pointer", background: "none", border: "none" }}>Export PDF</button>
                    <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{category} • {radius}mi • {new Date(results.metadata.analyzedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
