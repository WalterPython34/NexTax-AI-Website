"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DealPageData {
  deal_address: string;
  slug: string;
  industry: string;
  industry_label: string;
  city: string | null;
  state: string | null;
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
  operational_score: number | null;
  deal_dri: number | null;
  red_flags: string[];
  green_flags: string[];
  ai_insight: string | null;
  community_avg_score: number | null;
  community_top_score: number | null;
  community_lowest_score: number | null;
  community_percentile: number | null;
  similar_deals_count: number | null;
  demand_level: string | null;
  buyer_interest_rank: number | null;
  competition_level: string | null;
  votes_good: number;
  votes_overpriced: number;
  votes_risky: number;
  view_count: number;
  share_count: number;
  created_at: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
function sc(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444"; }
function riskGrad(l: string) { return l === "Low" ? "linear-gradient(135deg,#065F46,#10B981)" : l === "Moderate" ? "linear-gradient(135deg,#92400E,#F59E0B)" : l === "High" ? "linear-gradient(135deg,#9A3412,#F97316)" : "linear-gradient(135deg,#991B1B,#EF4444)"; }
function driLabel(d: number) { return d < 1.0 ? "Undervalued" : d <= 1.15 ? "Fair Market" : d <= 1.3 ? "Overpriced" : "Highly Overpriced"; }
function driColor(d: number) { return d < 1.0 ? "#10B981" : d <= 1.15 ? "#3B82F6" : d <= 1.3 ? "#F59E0B" : "#EF4444"; }

function ScoreRing({ score, size = 120, sw = 7 }: { score: number; size?: number; sw?: number }) {
  const r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (score / 100) * c, col = sc(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 8, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Score</span>
      </div>
    </div>
  );
}

function SBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const col = sc(score);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "#C9D1D9", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><span>{icon}</span>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: col, borderRadius: 2, transition: "width 0.8s ease-out" }} />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DealIntelligencePage({ slug }: { slug: string }) {
  const [deal, setDeal] = useState<DealPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);
  const [votes, setVotes] = useState({ good: 0, overpriced: 0, risky: 0 });
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    async function fetchDeal() {
      try {
        const res = await fetch(`/api/deal/${slug}`);
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        const data = await res.json();
        if (data.deal) {
          setDeal(data.deal);
          setVotes({ good: data.deal.votes_good, overpriced: data.deal.votes_overpriced, risky: data.deal.votes_risky });
        } else { setNotFound(true); }
      } catch { setNotFound(true); }
      setLoading(false);
    }
    fetchDeal();
  }, [slug]);

  const handleVote = async (type: "good" | "overpriced" | "risky") => {
    if (voted) return;
    const fp = `${navigator.userAgent}-${screen.width}`.replace(/\s/g, "").slice(0, 64);
    try {
      const res = await fetch(`/api/deal/${slug}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote_type: type, voter_fingerprint: fp }),
      });
      const data = await res.json();
      if (data.success) {
        setVotes(data.votes);
        setVoted(type);
      } else if (res.status === 409) { setVoted("already"); }
    } catch { /* non-blocking */ }
  };

  const handleShare = (platform: string) => {
    const url = `https://nextax.ai/deal/${slug}`;
    const text = deal ? `Check out this ${deal.industry_label} deal — scored ${deal.overall_score}/100 (${deal.risk_level} Risk) on NexTax.` : "";
    if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "linkedin") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "reddit") window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, "_blank");
    else { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    setShareOpen(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#818CF8", fontSize: 14 }}>Loading deal intelligence...</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#0B0F17", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#E2E8F0" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Deal Not Found</h1>
      <p style={{ color: "#6B7280", marginBottom: 24 }}>This deal address doesn't exist or has been removed.</p>
      <a href="/deal-reality-check" style={{ padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>⚡ Analyze Your Own Deal</a>
    </div>
  );

  if (!deal) return null;

  const totalVotes = votes.good + votes.overpriced + votes.risky;
  const dri = deal.deal_dri || (deal.fair_value > 0 ? +(deal.asking_price / deal.fair_value).toFixed(2) : null);
  const location = [deal.city, deal.state].filter(Boolean).join(", ");
  const dealUrl = `nextax.ai/deal/${slug}`;

  const scoreData = [
    { name: "Valuation", score: deal.valuation_score, icon: "⚖️" },
    { name: "Debt", score: deal.debt_score, icon: "🏦" },
    { name: "Market", score: deal.market_score, icon: "📈" },
    { name: "Industry", score: deal.industry_score, icon: "🏭" },
    ...(deal.operational_score ? [{ name: "Operational", score: deal.operational_score, icon: "⚙️" }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease-out forwards}
      `}</style>

      {/* Header Bar */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>N</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>NexTax.AI</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>{deal.deal_address}</span>
          <span style={{ fontSize: 10, color: "#374151" }}>•</span>
          <span style={{ fontSize: 11, color: "#4B5563" }}>{deal.view_count} views</span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* Deal Identity */}
        <div className="fu" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 6, background: "rgba(99,102,241,0.1)", color: "#818CF8", fontWeight: 500 }}>Deal Intelligence Page</span>
            <span style={{ fontSize: 11, color: "#4B5563" }}>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, margin: "0 0 6px", fontFamily: "'Instrument Serif', serif", color: "#E2E8F0" }}>
            {location ? `${location} ` : ""}{deal.industry_label}
          </h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#8896A6" }}>
            <span>Revenue: <span className="font-mono font-semibold" style={{ color: "#E2E8F0" }}>{fmt(deal.revenue)}</span></span>
            <span>SDE: <span className="font-mono font-semibold" style={{ color: "#E2E8F0" }}>{fmt(deal.sde)}</span></span>
            <span>Ask: <span className="font-mono font-semibold" style={{ color: "#E2E8F0" }}>{fmt(deal.asking_price)}</span></span>
          </div>
        </div>

        {/* Score + DRI Hero */}
        <div className="fu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <ScoreRing score={deal.overall_score} size={130} sw={8} />
            </div>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 16, background: riskGrad(deal.risk_level), fontSize: 12, fontWeight: 700, color: "#fff" }}>{deal.risk_level} Risk</div>
          </div>
          {dri && (
            <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${driColor(dri)}25`, borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Deal Reality Index</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: driColor(dri), fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{dri.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: driColor(dri), fontWeight: 600, marginTop: 4 }}>{driLabel(dri)}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{Math.round((dri - 1) * 100)}% {dri >= 1 ? "above" : "below"} fair value</div>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="fu" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { l: "Multiple", v: deal.valuation_multiple?.toFixed(2) + "x" },
            { l: "DSCR", v: deal.dscr?.toFixed(2) },
            { l: "Monthly Debt", v: fmt(deal.monthly_payment || 0) },
            { l: "Fair Value", v: fmt(deal.fair_value || 0) },
          ].map((m) => (
            <div key={m.l} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
              <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* Investor Valuation Range */}
        {deal.recommended_offer_low && deal.recommended_offer_high && (
          <div className="fu" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>💰 What Would Pros Pay?</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>Recommended Offer</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.recommended_offer_low)} – {fmt(deal.recommended_offer_high)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>Asking Price</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: deal.valuation_multiple > 3.5 ? "#EF4444" : "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.asking_price)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Breakdown */}
        <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px" }}>Risk Breakdown</h3>
          {scoreData.map((s) => <SBar key={s.name} label={s.name} score={s.score} icon={s.icon} />)}
        </div>

        {/* Red/Green Flags */}
        {(deal.red_flags.length > 0 || deal.green_flags.length > 0) && (
          <div className="fu" style={{ display: "grid", gridTemplateColumns: deal.red_flags.length > 0 && deal.green_flags.length > 0 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 16 }}>
            {deal.red_flags.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>🚩 Red Flags</div>
                {deal.red_flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.5, marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid rgba(239,68,68,0.2)" }}>{f}</div>)}
              </div>
            )}
            {deal.green_flags.length > 0 && (
              <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>✅ Green Flags</div>
                {deal.green_flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#6EE7B7", lineHeight: 1.5, marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid rgba(16,185,129,0.2)" }}>{f}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Community Intelligence */}
        {deal.similar_deals_count && (
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 4px" }}>📊 Community Intelligence</h3>
            <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 12px" }}>Compared to {deal.similar_deals_count} similar {deal.industry_label.toLowerCase()} deals</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { l: "This Deal", v: deal.overall_score, c: sc(deal.overall_score) },
                { l: "Average", v: deal.community_avg_score, c: "#94A3B8" },
                { l: "Best", v: deal.community_top_score, c: "#10B981" },
                { l: "Worst", v: deal.community_lowest_score, c: "#EF4444" },
              ].map((m) => (
                <div key={m.l} style={{ textAlign: "center", padding: "8px 6px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.c, fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                  <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.l}</div>
                </div>
              ))}
            </div>
            {deal.community_percentile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${deal.community_percentile}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace" }}>Top {100 - deal.community_percentile}%</span>
              </div>
            )}
          </div>
        )}

        {/* AI Insight */}
        {deal.ai_insight && (
          <div className="fu" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 600 }}>🤖 AI Assessment</div>
            <p style={{ margin: 0, fontSize: 13, color: "#C4B5FD", lineHeight: 1.65 }}>{deal.ai_insight}</p>
          </div>
        )}

        {/* ═══ COMMUNITY VOTE ═══ */}
        <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", margin: "0 0 4px" }}>What do you think of this deal?</h3>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>Cast your vote — results are public</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { type: "good" as const, label: "Good Deal", icon: "👍", color: "#10B981", count: votes.good },
              { type: "overpriced" as const, label: "Overpriced", icon: "💸", color: "#F59E0B", count: votes.overpriced },
              { type: "risky" as const, label: "Too Risky", icon: "⚠️", color: "#EF4444", count: votes.risky },
            ].map((v) => {
              const isSelected = voted === v.type;
              const pct = totalVotes > 0 ? Math.round((v.count / totalVotes) * 100) : 0;
              return (
                <button key={v.type} onClick={() => handleVote(v.type)} disabled={!!voted}
                  style={{
                    padding: "14px 10px", borderRadius: 10, border: isSelected ? `2px solid ${v.color}` : "1px solid rgba(255,255,255,0.08)",
                    background: isSelected ? `${v.color}15` : "rgba(255,255,255,0.02)",
                    cursor: voted ? "default" : "pointer", textAlign: "center",
                    fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                  }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{v.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? v.color : "#C9D1D9", marginBottom: 2 }}>{v.label}</div>
                  {(voted || totalVotes > 0) && (
                    <div style={{ fontSize: 18, fontWeight: 800, color: v.color, fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</div>
                  )}
                  <div style={{ fontSize: 10, color: "#6B7280" }}>{v.count} votes</div>
                </button>
              );
            })}
          </div>
          {voted === "already" && <div style={{ fontSize: 12, color: "#6B7280", textAlign: "center" }}>You've already voted on this deal.</div>}
        </div>

        {/* Share + CTA */}
        <div className="fu" style={{ display: "flex", gap: 10, marginBottom: 14, position: "relative" }}>
          <button onClick={() => setShareOpen(!shareOpen)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            📤 Share This Deal
          </button>
          <a href="/deal-reality-check" style={{ flex: 1, padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            ⚡ Analyze Your Deal
          </a>
        </div>
        {shareOpen && (
          <div className="fu" style={{ background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { p: "twitter", label: "🐦 Share on Twitter / X" },
              { p: "linkedin", label: "💼 Share on LinkedIn" },
              { p: "reddit", label: "📣 Share on Reddit" },
              { p: "copy", label: copied ? "✅ Copied!" : "📋 Copy Deal Link" },
            ].map((s) => (
              <button key={s.p} onClick={() => handleShare(s.p)} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>{s.label}</button>
            ))}
          </div>
        )}

        {/* Deal Address Footer */}
        <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 8 }}>
          <div style={{ fontSize: 10, color: "#4B5563", marginBottom: 4 }}>Deal Address</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>{dealUrl}</div>
          <p style={{ fontSize: 10, color: "#374151", marginTop: 8 }}>Analysis powered by NexTax Deal Intelligence Platform. Not financial advice.</p>
        </div>
      </div>
    </div>
  );
}
