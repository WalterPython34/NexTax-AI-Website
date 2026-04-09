"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DealRun {
  id: string;
  tool_used: string;
  industry: string;
  revenue: number;
  sde: number;
  asking_price: number;
  valuation_multiple: number;
  dscr: number;
  monthly_payment: number;
  fair_value: number;
  recommended_offer_low: number;
  recommended_offer_high: number;
  overall_score: number;
  risk_level: string;
  valuation_score: number;
  debt_score: number;
  market_score: number;
  industry_score: number;
  operational_score: number;
  red_flags: string[];
  green_flags: string[];
  city: string | null;
  state: string | null;
  revenue_trend: string | null;
  customer_concentration: string | null;
  owner_operated: boolean;
  created_at: string;
  benchmark_sample_size: number | null;
  confidence_grade: string | null;
  gap_pct?: number;
  signal?: "overpriced" | "fair" | "opportunity";
}

interface DriSnapshot {
  id: string;
  industry_key: string;
  dri: number;
  gap_pct: number;
  condition: string;
  listing_multiple: number;
  cold_multiple: number | null;
  benchmark_source: string;
  listing_sample_size: number;
  deal_count: number;
  snapshot_date: string;
}

interface TrendingMultiple {
  industry_key: string;
  median_multiple: number;
  sample_size: number;
}

interface DashboardStats {
  dealsAnalyzed: number;
  dealsSaved: number;
  avgGapPct: number;
  bestScore: number;
  bestScoreDeal: string;
}

// ─── INDUSTRY LABELS ─────────────────────────────────────────────────────────

const IL: Record<string, string> = {
  laundromat:"Laundromat",hvac:"HVAC",landscaping:"Landscaping",carwash:"Car Wash",
  dental:"Dental Practice",gym:"Gym / Fitness",restaurant:"Restaurant",autorepair:"Auto Repair",
  cleaning:"Cleaning",ecommerce:"Ecommerce",saas:"SaaS",insurance:"Insurance Agency",
  plumbing:"Plumbing",roofing:"Roofing",petcare:"Pet Care",pharmacy:"Pharmacy",
  daycare:"Daycare",medspa:"Med Spa",accounting:"Accounting",electrical:"Electrical",
  healthcare:"Healthcare",transportation:"Transportation",printing:"Printing",storage:"Self-Storage",
  painting:"Painting",security:"Security",construction:"Construction",engineering:"Engineering",
  grocery:"Grocery",hairsalon:"Hair Salon",marketing:"Marketing Agency",pestcontrol:"Pest Control",
  physicaltherapy:"Physical Therapy",propertymanage:"Property Mgmt",realestatebrok:"Real Estate Brok.",
  remodeling:"Remodeling",seniorcare:"Senior Care",signmaking:"Sign Mfg.",staffing:"Staffing",veterinary:"Veterinary",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (!v && v !== 0) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}
function fmtFull(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function deriveSignal(g: number): "overpriced" | "fair" | "opportunity" {
  return g > 10 ? "overpriced" : g < -5 ? "opportunity" : "fair";
}
function sigCfg(s: string) {
  if (s === "overpriced")  return { color: "#D85A30", bg: "rgba(216,90,48,0.10)",  border: "rgba(216,90,48,0.20)",  label: "Overpriced",  dot: "#D85A30" };
  if (s === "opportunity") return { color: "#10B981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.20)", label: "Opportunity", dot: "#10B981" };
  return                          { color: "#3B82F6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.20)", label: "Fair Market", dot: "#3B82F6" };
}
function scoreCol(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : "#EF4444"; }
function condSig(c: string): "overpriced" | "fair" | "opportunity" {
  const l = (c || "").toLowerCase();
  return l.includes("over") || l.includes("seller") ? "overpriced" : l.includes("opport") || l.includes("buyer") || l.includes("under") ? "opportunity" : "fair";
}
function ago(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── UI ATOMS ────────────────────────────────────────────────────────────────

function Ring({ score, size = 36 }: { score: number; size?: number }) {
  const sw = 3, r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (score / 100) * c, col = scoreCol(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.28, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono',monospace" }}>{score}</div>
    </div>
  );
}

function Skel({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: "rgba(255,255,255,0.05)", animation: "pulse 1.5s ease-in-out infinite" }} />;
}

function StatCard({ label, value, sub, color = "#E2E8F0", glow, loading }: { label: string; value: string; sub?: string; color?: string; glow?: string; loading?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 140, padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: glow ? `0 0 24px ${glow}` : "none", position: "relative", overflow: "hidden" }}>
      {glow && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${glow},transparent)`, opacity: 0.6 }} />}
      <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>{label}</div>
      {loading ? <Skel h={26} w={60} /> : <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>}
      {sub && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: active ? "rgba(255,255,255,0.07)" : "transparent", color: active ? "#F1F5F9" : "#4B5563", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
      {label}
    </button>
  );
}

// ─── COMPARE PANEL ────────────────────────────────────────────────────────────

function Compare({ deals }: { deals: DealRun[] }) {
  const [ai, setAi] = useState(0);
  const [bi, setBi] = useState(Math.min(1, deals.length - 1));
  if (deals.length < 2) return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⇄</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", marginBottom: 6, fontFamily: "'Inter Tight',sans-serif" }}>Analyze 2+ deals to compare</div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Side-by-side comparison unlocks automatically once you have two deals in your history.</div>
      <a href="/deal-reality-check" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Analyze a Deal →</a>
    </div>
  );
  const a = deals[ai], b = deals[bi];
  const aGap = a.gap_pct ?? 0, bGap = b.gap_pct ?? 0;
  const aSig = a.signal ?? deriveSignal(aGap), bSig = b.signal ?? deriveSignal(bGap);
  const sel: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, outline: "none", width: "100%", appearance: "none" as any };
  const rows = [
    { label: "Score",       aV: String(a.overall_score), bV: String(b.overall_score), aC: scoreCol(a.overall_score), bC: scoreCol(b.overall_score) },
    { label: "Asking",      aV: fmtFull(a.asking_price), bV: fmtFull(b.asking_price), aC: "#E2E8F0", bC: "#E2E8F0" },
    { label: "Fair Value",  aV: fmtFull(a.fair_value),   bV: fmtFull(b.fair_value),   aC: "#10B981", bC: "#10B981" },
    { label: "Gap vs Mkt",  aV: (aGap > 0 ? "+" : "") + aGap + "%", bV: (bGap > 0 ? "+" : "") + bGap + "%", aC: aGap > 0 ? "#D85A30" : "#10B981", bC: bGap > 0 ? "#D85A30" : "#10B981" },
    { label: "Multiple",    aV: a.valuation_multiple.toFixed(2) + "x", bV: b.valuation_multiple.toFixed(2) + "x", aC: "#E2E8F0", bC: "#E2E8F0" },
    { label: "DSCR",        aV: a.dscr.toFixed(2), bV: b.dscr.toFixed(2), aC: a.dscr >= 1.25 ? "#10B981" : "#F97316", bC: b.dscr >= 1.25 ? "#10B981" : "#F97316" },
    { label: "Signal",      aV: sigCfg(aSig).label, bV: sigCfg(bSig).label, aC: sigCfg(aSig).color, bC: sigCfg(bSig).color },
  ];
  const gapDiff = Math.abs(aGap - bGap);
  const aLbl = IL[a.industry] || a.industry, bLbl = IL[b.industry] || b.industry;
  const insight = aGap > bGap ? `${aLbl} is priced ${gapDiff}% higher vs market than ${bLbl} — ${bLbl} has stronger pricing position.`
    : aGap < bGap ? `${bLbl} is priced ${gapDiff}% higher vs market than ${aLbl} — ${aLbl} has stronger pricing position.`
    : "Both deals sit at similar pricing positions relative to their respective market benchmarks.";
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Deal A</label>
          <select value={ai} onChange={(e) => setAi(Number(e.target.value))} style={sel}>{deals.map((d, i) => <option key={d.id} value={i}>{IL[d.industry] || d.industry} — {fmt(d.asking_price)}</option>)}</select>
        </div>
        <div style={{ textAlign: "center", fontSize: 18, color: "#4B5563", marginTop: 20 }}>⇄</div>
        <div>
          <label style={{ display: "block", fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Deal B</label>
          <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={sel}>{deals.map((d, i) => <option key={d.id} value={i}>{IL[d.industry] || d.industry} — {fmt(d.asking_price)}</option>)}</select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: "0 12px" }}>
        <div />
        <div style={{ padding: "8px 12px", borderRadius: "8px 8px 0 0", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderBottom: "none", fontSize: 12, fontWeight: 600, color: "#60A5FA", textAlign: "center" }}>{aLbl}</div>
        <div style={{ padding: "8px 12px", borderRadius: "8px 8px 0 0", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderBottom: "none", fontSize: 12, fontWeight: 600, color: "#A5B4FC", textAlign: "center" }}>{bLbl}</div>
        {rows.map((row, i) => (
          <React.Fragment key={row.label}>
            <div style={{ padding: "10px 0", fontSize: 11, color: "#6B7280", display: "flex", alignItems: "center", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>{row.label}</div>
            <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: row.aC, textAlign: "center", fontFamily: "'JetBrains Mono',monospace", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)", borderTop: "none", borderBottom: i < rows.length - 1 ? "none" : "1px solid rgba(59,130,246,0.1)" }}>{row.aV}</div>
            <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: row.bC, textAlign: "center", fontFamily: "'JetBrains Mono',monospace", background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)", borderTop: "none", borderBottom: i < rows.length - 1 ? "none" : "1px solid rgba(99,102,241,0.1)" }}>{row.bV}</div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", gap: 10 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
        <span style={{ fontSize: 13, color: "#FBBF24", lineHeight: 1.6 }}>{insight}</span>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const [activeTab, setActiveTab]   = useState("Dashboard");
  const [user, setUser]             = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [deals, setDeals]           = useState<DealRun[]>([]);
  const [dri, setDri]               = useState<DriSnapshot[]>([]);
  const [trending, setTrending]     = useState<TrendingMultiple[]>([]);
  const [stats, setStats]           = useState<DashboardStats | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingMkt, setLoadingMkt] = useState(true);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data?.user ?? null); setLoadingUser(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch user's deals from deal_runs
  const fetchDeals = useCallback(async (uid: string) => {
    setLoadingDeals(true);
    const { data, error } = await supabase
      .from("deal_runs")
      .select("id,tool_used,industry,revenue,sde,asking_price,valuation_multiple,dscr,monthly_payment,fair_value,recommended_offer_low,recommended_offer_high,overall_score,risk_level,valuation_score,debt_score,market_score,industry_score,operational_score,red_flags,green_flags,city,state,revenue_trend,customer_concentration,owner_operated,created_at,benchmark_sample_size,confidence_grade")
      .eq("lead_id", uid)
      .eq("is_valid", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) { console.error(error); setLoadingDeals(false); return; }

    const enriched: DealRun[] = (data || []).map((d) => {
      const gap_pct = d.fair_value > 0 ? Math.round(((d.asking_price - d.fair_value) / d.fair_value) * 100) : 0;
      return { ...d, gap_pct, signal: deriveSignal(gap_pct) };
    });
    setDeals(enriched);

    if (enriched.length > 0) {
      const avgGap  = Math.round(enriched.reduce((a, d) => a + (d.gap_pct ?? 0), 0) / enriched.length);
      const best    = enriched.reduce((a, b) => b.overall_score > a.overall_score ? b : a);
      setStats({ dealsAnalyzed: enriched.length, dealsSaved: enriched.filter(d => d.overall_score >= 60).length, avgGapPct: avgGap, bestScore: best.overall_score, bestScoreDeal: IL[best.industry] || best.industry });
    } else {
      setStats({ dealsAnalyzed: 0, dealsSaved: 0, avgGapPct: 0, bestScore: 0, bestScoreDeal: "—" });
    }
    setLoadingDeals(false);
  }, []);

  // Fetch market data from dri_snapshots + dealstats_benchmarks
  const fetchMarket = useCallback(async () => {
    setLoadingMkt(true);

    // Latest snapshot per industry from dri_snapshots
    const { data: driRaw } = await supabase
      .from("dri_snapshots")
      .select("id,industry_key,dri,gap_pct,condition,listing_multiple,cold_multiple,benchmark_source,listing_sample_size,deal_count,snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(120);

    const seen = new Set<string>();
    const latest: DriSnapshot[] = [];
    for (const r of (driRaw || [])) { if (!seen.has(r.industry_key)) { seen.add(r.industry_key); latest.push(r); } }
    setDri(latest.sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)));

    // Trending multiples from dealstats_benchmarks (national mid-band)
    const { data: bm } = await supabase
      .from("dealstats_benchmarks")
      .select("industry_key,median_multiple,sample_size")
      .is("state", null)
      .eq("size_band", "mid")
      .order("sample_size", { ascending: false })
      .limit(8);

    setTrending(bm || []);
    setLoadingMkt(false);
  }, []);

  useEffect(() => { if (user) fetchDeals(user.id); }, [user, fetchDeals]);
  useEffect(() => { fetchMarket(); }, [fetchMarket]);

  // Derived
  const opportunities = deals.filter(d => (d.gap_pct ?? 0) < -5).sort((a, b) => b.overall_score - a.overall_score).slice(0, 4);
  const overpricedDri = [...dri].sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0));
  const underpricedDri = [...dri].sort((a, b) => (a.gap_pct ?? 0) - (b.gap_pct ?? 0));
  const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div style={{ minHeight: "100vh", background: "#080C13", color: "#E2E8F0", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}select{cursor:pointer}select:focus{outline:none;border-color:rgba(99,102,241,0.5)!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        .fu{animation:fadeUp .3s ease-out forwards}.fd1{animation-delay:.05s;opacity:0}.fd2{animation-delay:.10s;opacity:0}.fd3{animation-delay:.15s;opacity:0}.fd4{animation-delay:.20s;opacity:0}.fd5{animation-delay:.25s;opacity:0}
        .dr:hover{background:rgba(255,255,255,0.025)!important}
        .cta:hover{opacity:0.88}
        .sec:hover{background:rgba(255,255,255,0.06)!important}
      `}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,12,19,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 32, flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em" }}>NexTax</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#6366F1", fontFamily: "'Inter Tight',sans-serif" }}>.AI</span>
          </div>
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {["Dashboard","My Deals","Compare","Market Intel","Settings"].map(t => (
              <Tab key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t)} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 11, color: "#818CF8", fontWeight: 600 }}>Free Plan</div>
            <div title={user?.email} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
              {loadingUser ? "…" : userInitial}
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 60px" }}>

        {/* NOT LOGGED IN */}
        {!loadingUser && !user && (
          <div style={{ margin: "24px 0", padding: "16px 20px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F59E0B", marginBottom: 2, fontFamily: "'Inter Tight',sans-serif" }}>Sign in to view your deals</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>Your deal history is tied to your Supabase Auth account.</div>
            </div>
            <a href="/login" style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Sign In →</a>
          </div>
        )}

        {/* HERO */}
        <div className="fu" style={{ padding: "36px 0 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>Deal Command Center</div>
            <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, margin: "0 0 8px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9", lineHeight: 1.15 }}>
              Your Deal Command Center
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", margin: 0, maxWidth: 460, lineHeight: 1.6 }}>
              Track, compare, and pressure test every deal before you commit capital.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="sec" style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Import Deal
            </button>
            <a href="/deal-reality-check" className="cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "opacity 0.15s" }}>
              <span style={{ fontSize: 15 }}>+</span> Analyze New Deal
            </a>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="fu fd1" style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
          <StatCard label="Deals Analyzed" value={stats ? String(stats.dealsAnalyzed) : "—"} sub="In your account" loading={loadingDeals} />
          <StatCard label="Deals Saved" value={stats ? String(stats.dealsSaved) : "—"} sub="Score ≥ 60" color="#60A5FA" glow="rgba(59,130,246,0.15)" loading={loadingDeals} />
          <StatCard label="Avg Pricing Gap" value={stats ? `${stats.avgGapPct > 0 ? "+" : ""}${stats.avgGapPct}%` : "—"} sub="vs market median" color={stats ? (stats.avgGapPct > 0 ? "#D85A30" : "#10B981") : "#E2E8F0"} glow={stats ? (stats.avgGapPct > 0 ? "rgba(216,90,48,0.12)" : "rgba(16,185,129,0.12)") : undefined} loading={loadingDeals} />
          <StatCard label="Best Score" value={stats ? String(stats.bestScore) : "—"} sub={stats?.bestScoreDeal} color="#10B981" glow="rgba(16,185,129,0.15)" loading={loadingDeals} />
        </div>

        {/* ── SECTION 1: MY DEALS ── */}
        <div className="fu fd2" style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9" }}>My Deals</h2>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Your saved deals and latest analysis from <code style={{ fontSize: 11, color: "#4B5563" }}>deal_runs</code></p>
            </div>
            <a href="/deal-reality-check" style={{ fontSize: 12, color: "#6366F1", fontWeight: 500, textDecoration: "none" }}>+ Analyze new deal →</a>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 1fr 1fr 68px 52px 110px 1fr", gap: "0 8px", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
              {["Deal","Industry","Asking","Fair Value","Gap","Score","Signal",""].map(h => (
                <div key={h} style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</div>
              ))}
            </div>

            {/* Loading */}
            {loadingDeals && [0,1,2].map(i => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 1fr 1fr 68px 52px 110px 1fr", gap: "0 8px", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                <Skel h={12} w="70%" /><Skel h={12} w="60%" /><Skel h={12} w="70%" /><Skel h={12} w="70%" /><Skel h={12} w={40} /><Skel h={34} w={34} /><Skel h={20} w={90} /><Skel h={26} w="80%" />
              </div>
            ))}

            {/* Empty */}
            {!loadingDeals && deals.length === 0 && (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", marginBottom: 6, fontFamily: "'Inter Tight',sans-serif" }}>No deals yet</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 18 }}>Analyze your first deal to get started — results auto-save to your account.</div>
                <a href="/deal-reality-check" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Analyze a Deal →</a>
              </div>
            )}

            {/* Rows */}
            {!loadingDeals && deals.map((deal, i) => {
              const gp = deal.gap_pct ?? 0;
              const sig = sigCfg(deal.signal ?? "fair");
              const loc = [deal.city, deal.state].filter(Boolean).join(", ");
              return (
                <div key={deal.id} className="dr" style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 1fr 1fr 68px 52px 110px 1fr", gap: "0 8px", padding: "14px 20px", borderBottom: i < deals.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center", background: "transparent", transition: "background 0.15s" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{IL[deal.industry] || deal.industry}</div>
                    <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>{deal.valuation_multiple.toFixed(2)}x · DSCR {deal.dscr.toFixed(2)}{loc ? ` · ${loc}` : ""}</div>
                    <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{ago(deal.created_at)} · {deal.tool_used === "risk_analyzer" ? "Full" : "Quick"}{deal.confidence_grade ? ` · ${deal.confidence_grade}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{IL[deal.industry] || deal.industry}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{fmt(deal.asking_price)}</div>
                  <div style={{ fontSize: 13, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{fmt(deal.fair_value)}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: gp > 0 ? "#D85A30" : "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{gp > 0 ? "+" : ""}{gp}%</div>
                  <Ring score={deal.overall_score} size={34} />
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: sig.bg, color: sig.color, border: `1px solid ${sig.border}` }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: sig.dot, display: "inline-block", flexShrink: 0 }} />{sig.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={`/deal-reality-check?run=${deal.id}`} style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94A3B8", fontSize: 11, fontWeight: 500, textDecoration: "none" }}>View</a>
                    <button onClick={() => setActiveTab("Compare")} style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>Compare</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 2: COMPARE ── */}
        <div className="fu fd3" style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9" }}>Compare Deals</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Side-by-side from your live <code style={{ fontSize: 11, color: "#4B5563" }}>deal_runs</code> history</p>
          </div>
          {loadingDeals ? (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#4B5563" }}>Loading your deals...</div>
            </div>
          ) : <Compare deals={deals} />}
        </div>

        {/* ── SECTIONS 3+4: MARKET + OPPORTUNITIES ── */}
        <div className="fu fd4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>

          {/* Market Signals — from dri_snapshots */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px" }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9" }}>Market Signals</h2>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Live from <code style={{ fontSize: 10, color: "#4B5563" }}>dri_snapshots</code> — where buyers overpay vs. opportunity</p>
            </div>

            {loadingMkt ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[0,1,2,3,4,5].map(i => <Skel key={i} h={32} />)}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14 }}>
                {dri.slice(0, 8).map(s => {
                  const ss = sigCfg(condSig(s.condition));
                  const barW = Math.min(100, Math.abs(s.gap_pct ?? 0) * 4 + 8);
                  return (
                    <div key={s.industry_key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: condSig(s.condition) === "overpriced" ? "rgba(216,90,48,0.04)" : condSig(s.condition) === "opportunity" ? "rgba(16,185,129,0.04)" : "rgba(59,130,246,0.04)" }}>
                      <div style={{ width: 108, fontSize: 12, color: "#C9D1D9", fontWeight: 500, flexShrink: 0 }}>{IL[s.industry_key] || s.industry_key}</div>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barW}%`, background: ss.dot, borderRadius: 2, transition: "width 0.8s ease" }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ss.color, fontFamily: "'JetBrains Mono',monospace", minWidth: 44, textAlign: "right" }}>
                        {(s.gap_pct ?? 0) > 0 ? "+" : ""}{(s.gap_pct ?? 0).toFixed(0)}%
                      </div>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: ss.bg, color: ss.color, minWidth: 76, textAlign: "center", flexShrink: 0 }}>{ss.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingMkt && dri.length > 0 && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(216,90,48,0.06)", border: "1px solid rgba(216,90,48,0.15)" }}>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Most Overpriced</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#D85A30", fontFamily: "'Inter Tight',sans-serif" }}>{IL[overpricedDri[0]?.industry_key] || overpricedDri[0]?.industry_key || "—"}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>+{(overpricedDri[0]?.gap_pct ?? 0).toFixed(0)}% above median</div>
                  </div>
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Best Opportunity</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981", fontFamily: "'Inter Tight',sans-serif" }}>{IL[underpricedDri[0]?.industry_key] || underpricedDri[0]?.industry_key || "—"}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{(underpricedDri[0]?.gap_pct ?? 0).toFixed(0)}% below median</div>
                  </div>
                </div>

                {/* Trending multiples from dealstats_benchmarks */}
                {trending.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Trending Multiples · DealStats</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {trending.slice(0, 5).map(t => (
                        <div key={t.industry_key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>{IL[t.industry_key] || t.industry_key}</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{t.median_multiple.toFixed(2)}x</span>
                            <span style={{ fontSize: 10, color: "#374151" }}>{t.sample_size} deals</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <a href="/market-intelligence" style={{ display: "block", padding: "10px 16px", borderRadius: 9, border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.06)", color: "#60A5FA", fontSize: 13, fontWeight: 500, textDecoration: "none", textAlign: "center" }}>
              Explore Full Market Intelligence →
            </a>
          </div>

          {/* Best Opportunities — from user's deal_runs */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px" }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9" }}>Best Opportunities</h2>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Your deals priced &gt;5% below market benchmarks</p>
            </div>

            {loadingDeals ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[0,1,2].map(i => <Skel key={i} h={64} />)}</div>
            ) : opportunities.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 4, fontFamily: "'Inter Tight',sans-serif" }}>No opportunities yet</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>Deals priced more than 5% below market appear here automatically.</div>
                <a href="/deal-reality-check" style={{ fontSize: 12, color: "#6366F1", textDecoration: "none" }}>Analyze more deals →</a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {opportunities.map((deal, i) => {
                  const gp = deal.gap_pct ?? 0;
                  return (
                    <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 12, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#10B981", flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 1 }}>{IL[deal.industry] || deal.industry}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>{fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · {ago(deal.created_at)}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{gp}%</div>
                        <div style={{ fontSize: 10, color: "#6B7280" }}>vs market</div>
                      </div>
                      <Ring score={deal.overall_score} size={34} />
                      <a href={`/deal-reality-check?run=${deal.id}`} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#34D399", fontSize: 11, fontWeight: 500, textDecoration: "none", flexShrink: 0 }}>View</a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DRI opportunity context from dri_snapshots */}
            {!loadingMkt && dri.filter(s => condSig(s.condition) === "opportunity").length > 0 && (
              <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Market Context (DRI Snapshots)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dri.filter(s => condSig(s.condition) === "opportunity").slice(0, 3).map(s => (
                    <div key={s.industry_key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{IL[s.industry_key] || s.industry_key}</span>
                        <span style={{ fontSize: 10, color: "#374151", marginLeft: 6 }}>{s.deal_count} listings</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>{(s.gap_pct ?? 0).toFixed(0)}%</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(16,185,129,0.1)", color: "#10B981" }}>DRI {s.dri?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 5: UPGRADE ── */}
        <div className="fu fd5" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(139,92,246,0.06) 100%)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 16, padding: "28px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.5),rgba(139,92,246,0.5),transparent)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", fontSize: 10, color: "#818CF8", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>⚡ Pro Feature</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9" }}>Unlock Full Underwriting</h2>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 18px", lineHeight: 1.6 }}>Go beyond surface-level comps with full decision-grade deal analysis.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 22 }}>
                {["DSCR modeling","Downside scenarios","Negotiation strategy","SBA loan estimates"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#C4B5FD" }}>
                    <span style={{ color: "#818CF8", fontSize: 12 }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="cta" style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" }}>Upgrade to Pro</button>
                <a href="/deal-check" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 9, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Run Full Analysis →</a>
              </div>
            </div>
            <div style={{ width: 210, flexShrink: 0, padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>Full Analysis Preview</div>
              {[
                { label: "Stress Test",  val: "−15% → 1.09x DSCR", warn: true },
                { label: "Negotiation",  val: "Anchor at $920K",    warn: false },
                { label: "SBA Eligible", val: "Yes — 1.41x DSCR",  warn: false },
                { label: "Walk-Away",    val: "$1.08M max",         warn: true },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>{r.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: r.warn ? "#F59E0B" : "#10B981", fontFamily: "'JetBrains Mono',monospace", filter: "blur(3.5px)", userSelect: "none" }}>{r.val}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 10, color: "#4B5563", textAlign: "center" }}>🔒 Upgrade to unlock</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
